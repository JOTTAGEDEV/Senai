// Follow-up automático: retoma a conversa com clientes que pararam de responder há alguns dias.
//
// Regras (ConfigIA.followup, ajustáveis no painel → Configurações):
// - só para quem JÁ conversou com a loja (nunca contato frio) e ainda não comprou nem desistiu;
// - depois de `dias` dias sem mensagem, no máximo `maximo` follow-ups por cliente (zera se ele responder);
// - só dentro da janela de horário (`abre`–`fecha`) e nos dias em que a loja abre;
// - poucos por vez e com intervalo entre um e outro (parece gente, e protege o número);
// - a IA escreve uma mensagem diferente para cada cliente, a partir da conversa.
// Na API oficial da Meta, mensagem fora da janela de 24h exige modelo aprovado: por isso só roda na Evolution/Z-API.
//
// Roda pelo pg_cron (ex.: a cada 15 min). Protegida pelo cabeçalho x-cron-secret.
import { emSegundoPlano, iguais } from "../_shared/atendimento.ts";
import { canal } from "../_shared/canal.ts";
import { instrucaoFollowup, podeEnviarAgora } from "../_shared/followup.ts";
import { registrarUso, responderCliente } from "../_shared/ia.ts";
import { admin, json, ok } from "../_shared/supabase.ts";
import { type CredenciaisWhatsApp, type Empresa, FOLLOWUP_PADRAO, type Lead, type Mensagem, type Veiculo } from "../_shared/tipos.ts";

const POR_RODADA = Number(Deno.env.get("FOLLOWUP_POR_RODADA") ?? 3);
const INTERVALO_MIN_S = 20;
const INTERVALO_MAX_S = 45;

async function aguardar(min: number, max: number) {
  await new Promise((r) => setTimeout(r, (min + Math.random() * (max - min)) * 1000));
}

async function rodada() {
  const db = admin();
  const empresas = ok(await db.from("empresas").select("*")) as Empresa[];
  const resumo: Record<string, unknown>[] = [];

  for (const empresa of empresas) {
    const cfg = { ...FOLLOWUP_PADRAO, ...empresa.ia?.followup };
    if (!cfg.ativo) continue;
    if (!podeEnviarAgora(empresa)) {
      resumo.push({ empresa: empresa.id, pulou: "fora da janela de envio" });
      continue;
    }
    const whatsapp = (await db.from("empresa_whatsapp").select("*").eq("empresa_id", empresa.id).maybeSingle()).data as CredenciaisWhatsApp | null;
    if (!whatsapp) continue;
    if (!canal(whatsapp).textoLivreForaDaJanela) {
      resumo.push({ empresa: empresa.id, pulou: "API oficial da Meta exige mensagem modelo aprovada" });
      continue;
    }

    const leads = ok(await db.rpc("leads_para_followup", { p_empresa: empresa.id, p_dias: cfg.dias, p_maximo: cfg.maximo, p_limite: POR_RODADA })) as Lead[];
    if (!leads.length) continue;
    const veiculos = ok(await db.from("veiculos").select("*").eq("empresa_id", empresa.id).in("status", ["disponivel", "reservado", "preparacao"])) as Veiculo[];

    for (const [i, lead] of leads.entries()) {
      if (i > 0) await aguardar(INTERVALO_MIN_S, INTERVALO_MAX_S);
      // Reserva o lead antes de enviar (duas rodadas ao mesmo tempo não mandam em dobro)
      const reservado = (await db
        .from("leads")
        .update({ ultimo_followup_em: new Date().toISOString() })
        .eq("id", lead.id)
        .eq("followups_enviados", lead.followups_enviados ?? 0)
        .select("id")).data;
      if (!reservado?.length) continue;

      const numero = (lead.followups_enviados ?? 0) + 1;
      const historico = (
        ok(await db.from("mensagens").select("*").eq("lead_id", lead.id).order("criada_em", { ascending: false }).limit(40)) as Mensagem[]
      ).reverse();
      try {
        const { texto, uso } = await responderCliente(
          { db, empresa, lead, whatsapp, veiculos, instrucaoInterna: instrucaoFollowup(cfg.dias, numero, cfg.maximo) },
          historico,
        );
        await registrarUso(db, empresa.id, "atendente", uso);
        await db.from("leads").update({ followups_enviados: numero }).eq("id", lead.id);
        if (texto) {
          await db.from("mensagens").insert({
            empresa_id: empresa.id,
            lead_id: lead.id,
            autor: "sistema",
            texto: `Follow-up automático ${numero} de ${cfg.maximo} enviado (cliente sem responder há ${cfg.dias}+ dias).`,
          });
        }
        resumo.push({ lead: lead.id, enviado: Boolean(texto), numero });
      } catch (e) {
        console.error("Falha no follow-up", lead.id, e);
        resumo.push({ lead: lead.id, erro: e instanceof Error ? e.message.slice(0, 200) : String(e) });
      }
    }
  }
  console.log("Follow-up:", JSON.stringify(resumo));
  return resumo;
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get("CRON_SECRET");
  if (!segredo || !iguais(req.headers.get("x-cron-secret") ?? "", segredo)) return json({ erro: "Não autorizado" }, 401);
  // Responde na hora (o pg_net desiste rápido) e continua em segundo plano
  await emSegundoPlano([rodada().catch((e) => console.error("Erro na rodada de follow-up", e))]);
  return json({ ok: true });
});
