// O que acontece quando chega uma mensagem no WhatsApp da loja, seja qual for o provedor
// (Meta, Evolution API ou Z-API): salvar, atualizar o lead e, se for o caso, a IA responder.
import { iaDeveAtender } from "./horario.ts";
import { registrarUso, responderCliente } from "./ia.ts";
import { admin, ok } from "./supabase.ts";
import type { CredenciaisWhatsApp, Empresa, Lead, Mensagem, Veiculo } from "./tipos.ts";
import { explicarErroWhatsApp, type FalhaEntrega } from "./whatsapp.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Espera o cliente terminar de digitar (várias mensagens seguidas viram uma resposta só). */
const ESPERA_MS = Number(Deno.env.get("IA_ESPERA_MS") ?? 8000);
/** Quanto esperar antes de decidir se uma mensagem "da loja" foi o sistema ou um vendedor pelo celular. */
const ESPERA_ECO_MS = Number(Deno.env.get("ECO_ESPERA_MS") ?? 6000);

/** Mensagem já lida do provedor, num formato único. */
export interface Lida {
  de: string; // telefone do cliente (só dígitos, com DDI) ou "lid:..." quando o WhatsApp esconde o número
  nome: string;
  texto: string;
  waId: string; // id da mensagem no WhatsApp (evita duplicar)
  quando: string; // ISO
  fromMe?: boolean; // mandada pelo número da loja (celular ou sistema)
  fromApi?: boolean; // o provedor garante que saiu pelo sistema (Z-API)
}

/** Continua o trabalho depois de responder 200 ao provedor (que reenvia se demorar). */
export function emSegundoPlano(tarefas: Promise<unknown>[]): Promise<unknown> {
  const todas = Promise.allSettled(tarefas);
  if (typeof EdgeRuntime !== "undefined") {
    EdgeRuntime.waitUntil(todas);
    return Promise.resolve();
  }
  return todas;
}

/** Comparação em tempo constante (não revela o segredo pelo tempo de resposta). */
export function iguais(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diferenca = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diferenca |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diferenca === 0;
}

async function leadDoTelefone(empresaId: string, telefone: string, nome: string, quando: string, atendente: "ia" | "humano") {
  const db = admin();
  const existente = (await db.from("leads").select("id,nome,atendente").eq("empresa_id", empresaId).eq("telefone", telefone).maybeSingle()).data as
    | Pick<Lead, "id" | "nome" | "atendente">
    | null;
  if (existente) return existente;
  const criado = await db
    .from("leads")
    .insert({ empresa_id: empresaId, telefone, nome, etapa: atendente === "ia" ? "novo" : "atendimento", atendente, ultima_mensagem_em: quando })
    .select("id,nome,atendente")
    .single();
  if (!criado.error) return criado.data as Pick<Lead, "id" | "nome" | "atendente">;
  // Duas mensagens ao mesmo tempo podem criar o lead em paralelo: busca de novo
  return ok(await db.from("leads").select("id,nome,atendente").eq("empresa_id", empresaId).eq("telefone", telefone).single()) as Pick<
    Lead,
    "id" | "nome" | "atendente"
  >;
}

/** Mensagem do cliente: salva, conta como não lida e devolve o id para a IA responder depois. */
export async function salvarMensagemCliente(empresaId: string, m: Lida): Promise<{ leadId: string; mensagemId: string } | null> {
  const db = admin();
  const lead = await leadDoTelefone(empresaId, m.de, m.nome, m.quando, "ia");
  const inserida = await db
    .from("mensagens")
    .insert({ empresa_id: empresaId, lead_id: lead.id, autor: "cliente", autor_nome: m.nome, texto: m.texto, wa_message_id: m.waId || null, criada_em: m.quando })
    .select("id")
    .single();
  if (inserida.error) {
    if (inserida.error.code === "23505") return null; // o provedor reenviou uma mensagem que já temos
    throw new Error(inserida.error.message);
  }
  // Incremento atômico de não lidas (e zera os follow-ups: o cliente voltou a falar)
  ok(await db.rpc("registrar_mensagem_cliente", { p_lead: lead.id, p_quando: m.quando, p_nome: m.nome ?? "" }));
  return { leadId: lead.id, mensagemId: inserida.data.id as string };
}

/**
 * Mensagem que saiu do número da loja. Se não foi o sistema que mandou (IA, follow-up ou painel),
 * foi um vendedor pelo celular: registra no painel e a IA para de responder esse cliente.
 */
export async function registrarMensagemDaLoja(empresaId: string, m: Lida): Promise<void> {
  if (m.fromApi) return; // o provedor já diz que saiu pelo sistema
  await new Promise((r) => setTimeout(r, ESPERA_ECO_MS)); // dá tempo do sistema gravar o que ele mesmo enviou
  const db = admin();
  if (m.waId) {
    const jaTem = (await db.from("mensagens").select("id").eq("wa_message_id", m.waId).maybeSingle()).data;
    if (jaTem) return;
  }
  const lead = await leadDoTelefone(empresaId, m.de, "", m.quando, "humano");
  const inserida = await db.from("mensagens").insert({
    empresa_id: empresaId,
    lead_id: lead.id,
    autor: "vendedor",
    autor_nome: "Vendedor (celular)",
    texto: m.texto,
    wa_message_id: m.waId || null,
    criada_em: m.quando,
  });
  if (inserida.error?.code === "23505") return;
  await db.from("leads").update({ atendente: "humano", nao_lidas: 0, ultima_mensagem_em: m.quando }).eq("id", lead.id);
}

/** A Meta avisou que não conseguiu entregar uma mensagem nossa: mostra o motivo na conversa. */
export async function registrarFalha(f: FalhaEntrega) {
  const db = admin();
  const enviada = (await db.from("mensagens").select("lead_id,empresa_id").eq("wa_message_id", f.waId).maybeSingle()).data;
  if (!enviada) return;
  await db.from("mensagens").insert({ empresa_id: enviada.empresa_id, lead_id: enviada.lead_id, autor: "sistema", texto: explicarErroWhatsApp(f.codigo, f.erro) });
}

/** Espera o cliente parar de digitar e, se for a vez da IA, responde. */
export async function responderDepois(leadId: string, mensagemId: string) {
  await new Promise((r) => setTimeout(r, ESPERA_MS));
  const db = admin();

  // Só responde se esta ainda for a última mensagem do cliente (senão, a mais nova cuida disso)
  const ultima = (
    await db.from("mensagens").select("id").eq("lead_id", leadId).eq("autor", "cliente").order("criada_em", { ascending: false }).order("id", { ascending: false }).limit(1).single()
  ).data;
  if (ultima?.id !== mensagemId) return;

  const lead = ok(await db.from("leads").select("*").eq("id", leadId).single()) as Lead;
  if (lead.atendente !== "ia") return; // um vendedor assumiu

  const empresa = ok(await db.from("empresas").select("*").eq("id", lead.empresa_id).single()) as Empresa;
  if (!iaDeveAtender(empresa.ia)) return; // loja aberta e modo "fora do horário", ou IA desligada

  const whatsapp = ok(await db.from("empresa_whatsapp").select("*").eq("empresa_id", empresa.id).single()) as CredenciaisWhatsApp;
  const veiculos = ok(await db.from("veiculos").select("*").eq("empresa_id", empresa.id).in("status", ["disponivel", "reservado", "preparacao"])) as Veiculo[];
  const historico = (
    ok(await db.from("mensagens").select("*").eq("lead_id", leadId).order("criada_em", { ascending: false }).limit(40)) as Mensagem[]
  ).reverse();

  try {
    const { uso } = await responderCliente({ db, empresa, lead, whatsapp, veiculos }, historico);
    await registrarUso(db, empresa.id, "atendente", uso);
  } catch (e) {
    console.error("Erro da IA ao responder", leadId, e);
    // Se a IA falhar, avisa no painel para um vendedor assumir
    await db.from("leads").update({ atendente: "humano", importancia: "importante" }).eq("id", leadId);
    await db.from("mensagens").insert({
      empresa_id: empresa.id,
      lead_id: leadId,
      autor: "sistema",
      texto: "A IA teve um problema para responder. Um vendedor precisa assumir esta conversa.",
    });
  }
}

/** Trata uma lista de mensagens de um provedor: cliente → salva e agenda a IA; loja → registra o vendedor. */
export async function processarMensagens(empresaId: string, lidas: Lida[]): Promise<{ falhou: boolean; tarefas: Promise<unknown>[] }> {
  const tarefas: Promise<unknown>[] = [];
  let falhou = false;
  for (const m of lidas) {
    try {
      if (m.fromMe) {
        tarefas.push(registrarMensagemDaLoja(empresaId, m).catch((e) => console.error("Erro ao registrar mensagem da loja", m.waId, e)));
        continue;
      }
      const salvo = await salvarMensagemCliente(empresaId, m);
      if (salvo) tarefas.push(responderDepois(salvo.leadId, salvo.mensagemId));
    } catch (e) {
      falhou = true;
      console.error("Erro ao salvar mensagem", m.waId, e);
    }
  }
  return { falhou, tarefas };
}
