// O vendedor responde pelo painel: a mensagem sai pelo WhatsApp oficial da loja.
// Chamado pelo navegador com o login do usuário (Authorization: Bearer <jwt>).
import { admin, comoUsuario, CORS, json, ok } from "../_shared/supabase.ts";
import type { CredenciaisWhatsApp, Lead } from "../_shared/tipos.ts";
import { enviarTexto, ErroWhatsApp } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ erro: "Faça login" }, 401);

  const { leadId, texto } = (await req.json().catch(() => ({}))) as { leadId?: string; texto?: string };
  if (!leadId || !texto?.trim()) return json({ erro: "leadId e texto são obrigatórios" }, 400);

  // 1) Quem é o usuário e de qual empresa (com o RLS: só enxerga o lead se for da empresa dele)
  const usuario = comoUsuario(authorization);
  const { data: auth } = await usuario.auth.getUser();
  if (!auth.user) return json({ erro: "Sessão inválida" }, 401);
  const lead = (await usuario.from("leads").select("*").eq("id", leadId).maybeSingle()).data as Lead | null;
  if (!lead) return json({ erro: "Conversa não encontrada" }, 404);
  const membro = (await usuario.from("membros").select("nome").eq("user_id", auth.user.id).single()).data;

  // 2) Credenciais do WhatsApp (só o servidor lê)
  const db = admin();
  const whatsapp = (await db.from("empresa_whatsapp").select("*").eq("empresa_id", lead.empresa_id).maybeSingle()).data as CredenciaisWhatsApp | null;
  if (!whatsapp) return json({ erro: "WhatsApp da loja ainda não está conectado." }, 400);

  // 3) Envia e registra
  try {
    const waId = await enviarTexto(whatsapp.phone_number_id, whatsapp.access_token, lead.telefone, texto.trim());
    const agora = new Date().toISOString();
    ok(await db.from("mensagens").insert({
      empresa_id: lead.empresa_id,
      lead_id: lead.id,
      autor: "vendedor",
      autor_nome: membro?.nome || auth.user.email?.split("@")[0] || "Vendedor",
      texto: texto.trim(),
      wa_message_id: waId,
    }));
    await db.from("leads").update({ atendente: "humano", nao_lidas: 0, ultima_mensagem_em: agora }).eq("id", lead.id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ErroWhatsApp) {
      // 131047: passou de 24h desde a última mensagem do cliente → só com template aprovado
      const codigo = (e.detalhe as { error?: { code?: number } })?.error?.code;
      const erro = codigo === 131047
        ? "Já passaram 24h desde a última mensagem do cliente. A Meta só permite mensagem modelo (template) aprovada."
        : "O WhatsApp recusou a mensagem.";
      return json({ erro, detalhe: e.detalhe }, 502);
    }
    console.error(e);
    return json({ erro: "Falha ao enviar" }, 500);
  }
});
