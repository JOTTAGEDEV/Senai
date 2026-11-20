// Recebe as mensagens do WhatsApp (Meta) e faz a IA responder.
//
// GET  → verificação do webhook pela Meta (hub.challenge)
// POST → mensagens novas: salva no banco, atualiza o lead e agenda a resposta da IA
//
// Secrets necessários: WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, ANTHROPIC_API_KEY
import { iaDeveAtender } from "../_shared/horario.ts";
import { registrarUso, responderCliente } from "../_shared/ia.ts";
import { admin, ok } from "../_shared/supabase.ts";
import type { CredenciaisWhatsApp, Empresa, Lead, Mensagem, Veiculo } from "../_shared/tipos.ts";
import { assinaturaValida, lerWebhook, type MensagemRecebida } from "../_shared/whatsapp.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Espera o cliente terminar de digitar (várias mensagens seguidas viram uma resposta só). */
const ESPERA_MS = Number(Deno.env.get("IA_ESPERA_MS") ?? 8000);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const verificado =
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    return verificado ? new Response(url.searchParams.get("hub.challenge") ?? "") : new Response("Token inválido", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });

  const corpo = await req.text();
  const segredo = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!segredo || !(await assinaturaValida(corpo, req.headers.get("x-hub-signature-256"), segredo))) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const recebidas = lerWebhook(payload);
  const tarefas: Promise<unknown>[] = [];
  let falhou = false;
  for (const m of recebidas) {
    try {
      const salvo = await salvarMensagem(m);
      if (salvo) tarefas.push(responderDepois(salvo.leadId, salvo.mensagemId));
    } catch (e) {
      falhou = true;
      console.error("Erro ao salvar mensagem", m.waId, e);
    }
  }

  // Responde 200 já (a Meta reenvia se demorar); a IA continua em segundo plano
  const segundoPlano = Promise.allSettled(tarefas);
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(segundoPlano);
  else await segundoPlano;
  // Se alguma mensagem não foi salva, devolve erro para a Meta reenviar
  // (as que já foram salvas não duplicam: wa_message_id é único).
  if (falhou) return new Response("Erro ao salvar", { status: 500 });
  return new Response("ok");
});

async function salvarMensagem(m: MensagemRecebida): Promise<{ leadId: string; mensagemId: string } | null> {
  const db = admin();
  const cred = (await db.from("empresa_whatsapp").select("empresa_id").eq("phone_number_id", m.phoneNumberId).maybeSingle()).data;
  if (!cred) {
    console.warn("Número sem empresa cadastrada:", m.phoneNumberId);
    return null;
  }
  const empresaId = cred.empresa_id as string;

  // Lead: um por telefone
  let lead = (await db.from("leads").select("id,nome,nao_lidas").eq("empresa_id", empresaId).eq("telefone", m.de).maybeSingle()).data as
    | Pick<Lead, "id" | "nome" | "nao_lidas">
    | null;
  if (!lead) {
    const criado = await db
      .from("leads")
      .insert({ empresa_id: empresaId, telefone: m.de, nome: m.nome, etapa: "novo", atendente: "ia", ultima_mensagem_em: m.quando })
      .select("id,nome,nao_lidas")
      .single();
    if (criado.error) {
      // Duas mensagens ao mesmo tempo podem criar o lead em paralelo: busca de novo
      lead = ok(await db.from("leads").select("id,nome,nao_lidas").eq("empresa_id", empresaId).eq("telefone", m.de).single());
    } else {
      lead = criado.data;
    }
  }

  const inserida = await db
    .from("mensagens")
    .insert({ empresa_id: empresaId, lead_id: lead!.id, autor: "cliente", autor_nome: m.nome, texto: m.texto, wa_message_id: m.waId, criada_em: m.quando })
    .select("id")
    .single();
  if (inserida.error) {
    if (inserida.error.code === "23505") return null; // a Meta reenviou uma mensagem que já temos
    throw new Error(inserida.error.message);
  }

  // Incremento atômico de não lidas (mensagens simultâneas não perdem contagem)
  ok(await db.rpc("registrar_mensagem_cliente", { p_lead: lead!.id, p_quando: m.quando, p_nome: m.nome ?? "" }));

  return { leadId: lead!.id, mensagemId: inserida.data.id as string };
}

async function responderDepois(leadId: string, mensagemId: string) {
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
