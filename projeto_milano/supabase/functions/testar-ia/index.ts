// "Testar IA" do painel: conversa com a IA de verdade usando o estoque da loja,
// sem mandar nada pelo WhatsApp e sem gravar agendamentos (modo teste).
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { ErroDeepSeek } from "../_shared/deepseek.ts";
import { ErroGemini } from "../_shared/gemini.ts";
import { escolherProvedor, provedoresDisponiveis, registrarUso, responderCliente } from "../_shared/ia.ts";
import { admin, comoUsuario, CORS, json, ok } from "../_shared/supabase.ts";
import type { Empresa, Lead, Mensagem, Veiculo } from "../_shared/tipos.ts";

const LIMITE_CARACTERES = 4000;
const LIMITE_POR_HORA = 60;

interface Pedido {
  conversa?: { autor: "cliente" | "ia"; texto: string }[];
  /** "anthropic", "gemini" ou "deepseek" (opcional) */
  provedor?: string;
  /** Só perguntar quais IAs estão configuradas */
  status?: boolean;
  /** Chaves coladas no painel (opcional). Usadas só nesta resposta; nada é guardado. */
  chaves?: { anthropic?: string; gemini?: string; deepseek?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ erro: "Faça login" }, 401);
  const usuario = comoUsuario(authorization);
  const { data: auth } = await usuario.auth.getUser();
  if (!auth.user) return json({ erro: "Sessão inválida" }, 401);
  const membro = (await usuario.from("membros").select("empresa_id,papel").eq("user_id", auth.user.id).maybeSingle()).data;
  if (!membro) return json({ erro: "Usuário sem loja" }, 403);
  if (membro.papel !== "dono") return json({ erro: "Só o dono da loja pode usar o Testar IA." }, 403);

  const { conversa = [], provedor: pedido, status, chaves: brutas } = (await req.json().catch(() => ({}))) as Pedido;
  if (status) return json({ disponiveis: provedoresDisponiveis(), padrao: escolherProvedor() });

  const limpa = (c?: string) => (typeof c === "string" && c.trim().length > 10 && c.trim().length < 300 ? c.trim() : undefined);
  const chaves = { anthropic: limpa(brutas?.anthropic), gemini: limpa(brutas?.gemini), deepseek: limpa(brutas?.deepseek) };
  const provedor = escolherProvedor(pedido, chaves);
  if (!provedor) {
    return json({ erro: "Nenhuma chave de IA configurada. Cole uma chave em Chaves ou coloque ANTHROPIC_API_KEY, GEMINI_API_KEY ou DEEPSEEK_API_KEY em Supabase → Edge Functions → Secrets." }, 503);
  }
  // Só mensagens válidas, e no máximo LIMITE_CARACTERES no total (corta as mais antigas)
  const validas = (Array.isArray(conversa) ? conversa : []).filter(
    (m) => m && (m.autor === "cliente" || m.autor === "ia") && typeof m.texto === "string" && m.texto.trim(),
  );
  const ultimas: typeof validas = [];
  let total = 0;
  for (const m of validas.slice(-30).reverse()) {
    total += m.texto.length;
    if (total > LIMITE_CARACTERES && ultimas.length) break;
    ultimas.unshift({ autor: m.autor, texto: m.texto.slice(0, LIMITE_CARACTERES) });
  }
  if (!ultimas.length || ultimas.at(-1)!.autor !== "cliente") return json({ erro: "Envie uma mensagem de cliente" }, 400);

  const db = admin();

  // Limite de uso: no máximo LIMITE_POR_HORA testes por hora por loja
  const umaHora = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", membro.empresa_id)
    .eq("tipo", "teste")
    .gte("criado_em", umaHora);
  if ((count ?? 0) >= LIMITE_POR_HORA) {
    return json({ erro: `Limite de ${LIMITE_POR_HORA} testes por hora atingido. Tente de novo mais tarde.` }, 429);
  }
  const empresa = ok(await db.from("empresas").select("*").eq("id", membro.empresa_id).single()) as Empresa;
  const veiculos = ok(
    await db.from("veiculos").select("*").eq("empresa_id", empresa.id).in("status", ["disponivel", "reservado", "preparacao"]),
  ) as Veiculo[];

  const lead = {
    id: "teste",
    empresa_id: empresa.id,
    nome: "",
    telefone: "",
    veiculo_id: null,
    interesse: "",
    temperatura: "morno",
    importancia: "normal",
    etapa: "atendimento",
    etiquetas: [],
    resumo: "",
    proxima_acao: "",
    dados: {},
    atendente: "ia",
    vendedor_id: null,
    nao_lidas: 0,
    ultima_mensagem_em: new Date().toISOString(),
    analisado_em: null,
  } as Lead;
  const historico: Mensagem[] = ultimas.map((m, i) => ({
    id: String(i),
    lead_id: "teste",
    autor: m.autor === "cliente" ? "cliente" : "ia",
    autor_nome: "",
    texto: m.texto,
    midia_url: null,
    wa_message_id: null,
    criada_em: new Date().toISOString(),
  }));

  const fotos: string[] = [];
  try {
    const { texto, uso } = await responderCliente(
      { db, empresa, lead, whatsapp: { empresa_id: empresa.id, phone_number_id: "", access_token: "" }, veiculos, teste: true, fotosTeste: fotos, provedor, chaves },
      historico,
    );
    await registrarUso(db, empresa.id, "teste", uso);
    return json({ texto, fotos, uso, provedor });
  } catch (e) {
    if (e instanceof ErroGemini) {
      const erro = e.status === 400 || e.status === 403 ? "A chave do Gemini é inválida ou não tem acesso a esse modelo." : e.status === 429 ? "Limite de uso do Gemini atingido. Tente de novo em instantes." : `O Gemini respondeu com erro ${e.status}.`;
      return json({ erro, detalhe: e.detalhe.slice(0, 300) }, 502);
    }
    if (e instanceof ErroDeepSeek) {
      const erro = e.status === 401 ? "A chave do DeepSeek é inválida." : e.status === 402 ? "A conta do DeepSeek está sem saldo. Coloque créditos em platform.deepseek.com." : e.status === 429 ? "Limite de uso do DeepSeek atingido. Tente de novo em instantes." : `O DeepSeek respondeu com erro ${e.status}.`;
      return json({ erro, detalhe: e.detalhe.slice(0, 300) }, 502);
    }
    if (e instanceof Anthropic.AuthenticationError) return json({ erro: "A chave da Anthropic é inválida. Confira o ANTHROPIC_API_KEY." }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ erro: "Limite de uso da IA atingido. Tente de novo em instantes." }, 429);
    if (e instanceof Anthropic.APIError) return json({ erro: `A IA respondeu com erro ${e.status}: ${e.message}` }, 502);
    console.error(e);
    return json({ erro: "Falha ao gerar a resposta" }, 500);
  }
});
