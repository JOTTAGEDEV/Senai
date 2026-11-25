// Recebe as mensagens do WhatsApp (Meta) e faz a IA responder.
//
// GET  → verificação do webhook pela Meta (hub.challenge)
// POST → mensagens novas: salva no banco, atualiza o lead e agenda a resposta da IA
//
// Secrets necessários: WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET e a chave de uma IA
// (DEEPSEEK_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY; IA_PROVEDOR escolhe se houver mais de uma)
import { emSegundoPlano, processarMensagens, registrarFalha } from "../_shared/atendimento.ts";
import { admin } from "../_shared/supabase.ts";
import { assinaturaValida, lerFalhas, lerWebhook } from "../_shared/whatsapp.ts";

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

  // Mensagens nossas que a Meta não conseguiu entregar: registra para aparecer no painel
  for (const falha of lerFalhas(payload)) {
    console.error("Falha de entrega no WhatsApp", JSON.stringify(falha));
    await registrarFalha(falha).catch((e) => console.error("Erro ao registrar falha", e));
  }

  // Agrupa as mensagens por número da loja (phone_number_id → empresa)
  const tarefas: Promise<unknown>[] = [];
  let falhou = false;
  const porNumero = new Map<string, ReturnType<typeof lerWebhook>>();
  for (const m of lerWebhook(payload)) porNumero.set(m.phoneNumberId, [...(porNumero.get(m.phoneNumberId) ?? []), m]);
  for (const [phoneNumberId, lista] of porNumero) {
    const cred = (await admin().from("empresa_whatsapp").select("empresa_id").eq("phone_number_id", phoneNumberId).maybeSingle()).data;
    if (!cred) {
      console.warn("Número sem empresa cadastrada:", phoneNumberId);
      continue;
    }
    const r = await processarMensagens(cred.empresa_id as string, lista);
    falhou ||= r.falhou;
    tarefas.push(...r.tarefas);
  }

  // Responde 200 já (a Meta reenvia se demorar); a IA continua em segundo plano.
  // Se alguma mensagem não foi salva, devolve erro para a Meta reenviar (as salvas não duplicam).
  await emSegundoPlano(tarefas);
  if (falhou) return new Response("Erro ao salvar", { status: 500 });
  return new Response("ok");
});
