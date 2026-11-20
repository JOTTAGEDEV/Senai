// "Testar IA" do painel: conversa com a IA de verdade usando o estoque da loja,
// sem mandar nada pelo WhatsApp e sem gravar agendamentos (modo teste).
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { ErroGemini } from "../_shared/gemini.ts";
import { escolherProvedor, provedoresDisponiveis, registrarUso, responderCliente } from "../_shared/ia.ts";
import { admin, comoUsuario, CORS, json, ok } from "../_shared/supabase.ts";
import type { Empresa, Lead, Mensagem, Veiculo } from "../_shared/tipos.ts";

interface Pedido {
  conversa?: { autor: "cliente" | "ia"; texto: string }[];
  /** "anthropic" ou "gemini" (opcional) */
  provedor?: string;
  /** Só perguntar quais IAs estão configuradas */
  status?: boolean;
  /** Chaves coladas no painel (opcional). Usadas só nesta resposta; nada é guardado. */
  chaves?: { anthropic?: string; gemini?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ erro: "Faça login" }, 401);
  const usuario = comoUsuario(authorization);
  const { data: auth } = await usuario.auth.getUser();
  if (!auth.user) return json({ erro: "Sessão inválida" }, 401);
  const membro = (await usuario.from("membros").select("empresa_id").eq("user_id", auth.user.id).maybeSingle()).data;
  if (!membro) return json({ erro: "Usuário sem loja" }, 403);

  const { conversa = [], provedor: pedido, status, chaves: brutas } = (await req.json().catch(() => ({}))) as Pedido;
  if (status) return json({ disponiveis: provedoresDisponiveis(), padrao: escolherProvedor() });

  const limpa = (c?: string) => (typeof c === "string" && c.trim().length > 10 && c.trim().length < 300 ? c.trim() : undefined);
  const chaves = { anthropic: limpa(brutas?.anthropic), gemini: limpa(brutas?.gemini) };
  const provedor = escolherProvedor(pedido, chaves);
  if (!provedor) {
    return json({ erro: "Nenhuma chave de IA configurada. Coloque ANTHROPIC_API_KEY ou GEMINI_API_KEY em Supabase → Edge Functions → Secrets." }, 503);
  }
  const ultimas = conversa.filter((m) => m.texto?.trim()).slice(-30);
  if (!ultimas.length || ultimas.at(-1)!.autor !== "cliente") return json({ erro: "Envie uma mensagem de cliente" }, 400);

  const db = admin();
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
    if (e instanceof Anthropic.AuthenticationError) return json({ erro: "A chave da Anthropic é inválida. Confira o ANTHROPIC_API_KEY." }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ erro: "Limite de uso da IA atingido. Tente de novo em instantes." }, 429);
    if (e instanceof Anthropic.APIError) return json({ erro: `A IA respondeu com erro ${e.status}: ${e.message}` }, 502);
    console.error(e);
    return json({ erro: "Falha ao gerar a resposta" }, 500);
  }
});
