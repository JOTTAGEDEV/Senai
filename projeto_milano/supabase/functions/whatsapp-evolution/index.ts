// Webhook da Evolution API (WhatsApp conectado por QR Code num servidor próprio).
// URL configurada na Evolution: https://<projeto>.supabase.co/functions/v1/whatsapp-evolution?token=<webhook_token>
// Evento usado: MESSAGES_UPSERT. Grupos, status e reações são ignorados.
import { emSegundoPlano, iguais, processarMensagens } from "../_shared/atendimento.ts";
import { lerWebhookEvolution } from "../_shared/provedores.ts";
import { admin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const payload = await req.json().catch(() => null);
  if (!payload) return new Response("JSON inválido", { status: 400 });

  const { evento, instancia, lidas } = lerWebhookEvolution(payload);
  if (!instancia) return new Response("Sem instância", { status: 400 });

  const cred = (await admin().from("empresa_whatsapp").select("empresa_id,webhook_token").eq("provedor", "evolution").eq("instancia", instancia).maybeSingle()).data;
  if (!cred || !token || !iguais(token, cred.webhook_token as string)) return new Response("Não autorizado", { status: 401 });

  if (evento === "connection.update") {
    console.log("Conexão do WhatsApp", instancia, JSON.stringify(payload?.data ?? {}).slice(0, 200));
    return new Response("ok");
  }
  if (!lidas.length) return new Response("ok");

  const { falhou, tarefas } = await processarMensagens(cred.empresa_id as string, lidas);
  await emSegundoPlano(tarefas);
  return falhou ? new Response("Erro ao salvar", { status: 500 }) : new Response("ok");
});
