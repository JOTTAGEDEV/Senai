// Webhook da Z-API ("ao receber" e "ao enviar pelo celular").
// URL configurada na Z-API: https://<projeto>.supabase.co/functions/v1/whatsapp-zapi?token=<webhook_token>
import { emSegundoPlano, iguais, processarMensagens } from "../_shared/atendimento.ts";
import { lerZapi } from "../_shared/provedores.ts";
import { admin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const payload = await req.json().catch(() => null);
  if (!payload) return new Response("JSON inválido", { status: 400 });

  const instancia = String(payload.instanceId ?? "");
  if (!instancia) return new Response("Sem instância", { status: 400 });
  const cred = (await admin().from("empresa_whatsapp").select("empresa_id,webhook_token").eq("provedor", "zapi").eq("instancia", instancia).maybeSingle()).data;
  if (!cred || !token || !iguais(token, cred.webhook_token as string)) return new Response("Não autorizado", { status: 401 });

  const lida = lerZapi(payload);
  if (!lida) return new Response("ok");

  const { falhou, tarefas } = await processarMensagens(cred.empresa_id as string, [lida]);
  await emSegundoPlano(tarefas);
  return falhou ? new Response("Erro ao salvar", { status: 500 }) : new Response("ok");
});
