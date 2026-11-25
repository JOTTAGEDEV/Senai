// Leitura dos webhooks dos provedores não oficiais (Evolution API e Z-API) para o formato único `Lida`.
// Os formatos variam entre versões, então a leitura aceita os nomes de campo mais comuns e ignora o resto.
import type { Lida } from "./atendimento.ts";

// deno-lint-ignore no-explicit-any
type Qualquer = any;

function rotulo(tipo: string, fromMe: boolean, detalhe = ""): string {
  const cliente: Record<string, string> = {
    foto: "[o cliente enviou uma foto]",
    video: "[o cliente enviou um vídeo]",
    audio: "[o cliente enviou um áudio]",
    figurinha: "[figurinha]",
    documento: "[o cliente enviou um documento]",
    contato: "[o cliente enviou um contato]",
  };
  const base = fromMe ? `[${tipo}]` : cliente[tipo] ?? `[${tipo}]`;
  return detalhe ? `[${tipo}] ${detalhe}` : base;
}

function quandoISO(v: unknown): string {
  let n = typeof v === "object" && v !== null ? Number((v as { low?: number }).low) : Number(v);
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
  if (n < 1e12) n *= 1000; // segundos → milissegundos
  return new Date(n).toISOString();
}

/* ---------------- Evolution API (Baileys) ---------------- */

const EVOLUTION_IGNORAR = new Set([
  "reactionMessage",
  "protocolMessage",
  "pollUpdateMessage",
  "senderKeyDistributionMessage",
  "messageContextInfo",
  "editedMessage",
  "keepInChatMessage",
]);

function textoEvolution(msg: Qualquer, tipo: string, fromMe: boolean): string {
  if (!msg) return "";
  // mensagens "embrulhadas" (temporárias, visualização única)
  for (const k of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"]) {
    if (msg[k]?.message) {
      const dentro = msg[k].message;
      return textoEvolution(dentro, Object.keys(dentro)[0] ?? "", fromMe);
    }
  }
  if (EVOLUTION_IGNORAR.has(tipo)) return "";
  if (typeof msg.conversation === "string") return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage) return rotulo("foto", fromMe, msg.imageMessage.caption ?? "");
  if (msg.videoMessage) return rotulo("video", fromMe, msg.videoMessage.caption ?? "");
  if (msg.audioMessage) return rotulo("audio", fromMe);
  if (msg.documentMessage) return rotulo("documento", fromMe, msg.documentMessage.fileName ?? msg.documentMessage.caption ?? "");
  if (msg.stickerMessage) return rotulo("figurinha", fromMe);
  if (msg.locationMessage) return `[localização] ${msg.locationMessage.name ?? `${msg.locationMessage.degreesLatitude}, ${msg.locationMessage.degreesLongitude}`}`;
  if (msg.contactMessage || msg.contactsArrayMessage) return rotulo("contato", fromMe, msg.contactMessage?.displayName ?? "");
  if (msg.buttonsResponseMessage) return msg.buttonsResponseMessage.selectedDisplayText ?? "";
  if (msg.listResponseMessage) return msg.listResponseMessage.title ?? "";
  if (msg.templateButtonReplyMessage) return msg.templateButtonReplyMessage.selectedDisplayText ?? "";
  if (msg.interactiveResponseMessage?.body?.text) return msg.interactiveResponseMessage.body.text;
  return "";
}

/** Um item de `messages.upsert` da Evolution → Lida (ou null para ignorar: grupos, status, reações...). */
export function lerEvolution(d: Qualquer): Lida | null {
  const key = d?.key ?? {};
  let jid = String(key.remoteJid ?? "");
  if (!jid || /@g\.us$|@broadcast$|@newsletter$/.test(jid) || jid === "status@broadcast") return null;
  if (jid.endsWith("@lid")) {
    const alt = key.remoteJidAlt ?? key.senderPn ?? d?.senderPn ?? key.participantPn;
    if (alt && !String(alt).endsWith("@lid")) jid = String(alt);
  }
  const de = jid.endsWith("@lid") ? `lid:${jid.split("@")[0]}` : jid.split("@")[0].split(":")[0].replace(/\D/g, "");
  if (!de || de === "lid:") return null;
  const fromMe = Boolean(key.fromMe);
  const msg = d?.message ?? {};
  const tipo = String(d?.messageType ?? Object.keys(msg)[0] ?? "");
  const texto = textoEvolution(msg, tipo, fromMe).trim();
  if (!texto) return null;
  return { de, nome: fromMe ? "" : String(d?.pushName ?? ""), texto, waId: String(key.id ?? ""), quando: quandoISO(d?.messageTimestamp), fromMe };
}

/** Corpo do webhook da Evolution → lista de mensagens (aceita objeto único ou lista). */
export function lerWebhookEvolution(p: Qualquer): { evento: string; instancia: string; lidas: Lida[] } {
  const evento = String(p?.event ?? "").toLowerCase().replace(/_/g, ".");
  const instancia = String(p?.instance ?? p?.instanceName ?? "");
  if (evento !== "messages.upsert") return { evento, instancia, lidas: [] };
  const dados = Array.isArray(p?.data) ? p.data : Array.isArray(p?.data?.messages) ? p.data.messages : [p?.data];
  return { evento, instancia, lidas: dados.map(lerEvolution).filter((x: Lida | null): x is Lida => x !== null) };
}

/* ---------------- Z-API ---------------- */

/** Corpo do webhook "ao receber" da Z-API → Lida (ou null para ignorar). */
export function lerZapi(p: Qualquer): Lida | null {
  if (!p || (p.type && p.type !== "ReceivedCallback")) return null;
  if (p.isGroup || p.isNewsletter || p.broadcast || p.isStatusReply) return null;
  const de = String(p.phone ?? "").replace(/\D/g, "");
  if (!de) return null;
  const fromMe = Boolean(p.fromMe);
  let texto = "";
  if (p.text?.message) texto = p.text.message;
  else if (p.image) texto = rotulo("foto", fromMe, p.image.caption ?? "");
  else if (p.video) texto = rotulo("video", fromMe, p.video.caption ?? "");
  else if (p.audio) texto = rotulo("audio", fromMe);
  else if (p.document) texto = rotulo("documento", fromMe, p.document.fileName ?? p.document.title ?? "");
  else if (p.sticker) texto = rotulo("figurinha", fromMe);
  else if (p.location) texto = `[localização] ${p.location.name ?? `${p.location.latitude}, ${p.location.longitude}`}`;
  else if (p.contact) texto = rotulo("contato", fromMe, p.contact.displayName ?? "");
  else if (p.buttonsResponseMessage) texto = p.buttonsResponseMessage.message ?? "";
  else if (p.listResponseMessage) texto = p.listResponseMessage.title ?? p.listResponseMessage.message ?? "";
  texto = String(texto).trim();
  if (!texto) return null; // reação, mensagem apagada etc.
  return {
    de,
    nome: fromMe ? "" : String(p.senderName ?? p.chatName ?? ""),
    texto,
    waId: String(p.messageId ?? ""),
    quando: quandoISO(p.momment ?? p.moment),
    fromMe,
    fromApi: Boolean(p.fromApi),
  };
}
