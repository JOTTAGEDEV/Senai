// WhatsApp Cloud API (Meta). Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const VERSAO = Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v23.0";
const GRAPH = `https://graph.facebook.com/${VERSAO}`;

export class ErroWhatsApp extends Error {
  constructor(public status: number, public detalhe: unknown) {
    super(`WhatsApp respondeu ${status}: ${JSON.stringify(detalhe)}`);
  }
}

async function enviar(phoneNumberId: string, token: string, corpo: Record<string, unknown>): Promise<string | null> {
  const resposta = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...corpo }),
  });
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroWhatsApp(resposta.status, json);
  return (json as { messages?: { id: string }[] }).messages?.[0]?.id ?? null;
}

export function enviarTexto(phoneNumberId: string, token: string, para: string, texto: string) {
  return enviar(phoneNumberId, token, { to: para, type: "text", text: { body: texto, preview_url: true } });
}

export function enviarImagem(phoneNumberId: string, token: string, para: string, link: string, legenda?: string) {
  return enviar(phoneNumberId, token, { to: para, type: "image", image: { link, ...(legenda ? { caption: legenda } : {}) } });
}

/** Confere se o POST veio mesmo da Meta (cabeçalho X-Hub-Signature-256 = HMAC-SHA256 do corpo com o App Secret). */
export async function assinaturaValida(corpo: string, cabecalho: string | null, appSecret: string): Promise<boolean> {
  if (!cabecalho?.startsWith("sha256=")) return false;
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo)));
  const esperado = Array.from(assinatura, (b) => b.toString(16).padStart(2, "0")).join("");
  const recebido = cabecalho.slice("sha256=".length);
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diferenca === 0;
}

/* ---------- Leitura do webhook ---------- */

export interface MensagemRecebida {
  phoneNumberId: string;
  waId: string; // id da mensagem (para não duplicar)
  de: string; // telefone do cliente (só dígitos)
  nome: string; // nome do perfil no WhatsApp
  texto: string;
  quando: string; // ISO
}

interface ValorWebhook {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: {
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: { body?: string };
    image?: { caption?: string };
    video?: { caption?: string };
    document?: { caption?: string; filename?: string };
    button?: { text?: string };
    interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
    location?: { latitude?: number; longitude?: number; name?: string };
  }[];
}

const IGNORAR = new Set(["reaction", "unsupported", "system", "ephemeral", "request_welcome"]);

/** Extrai as mensagens de clientes de um POST do webhook (ignora status de entrega e reações). */
export function lerWebhook(payload: unknown): MensagemRecebida[] {
  const saida: MensagemRecebida[] = [];
  const entradas = (payload as { entry?: { changes?: { value?: ValorWebhook }[] }[] })?.entry ?? [];
  for (const entrada of entradas) {
    for (const mudanca of entrada.changes ?? []) {
      const v = mudanca.value;
      const phoneNumberId = v?.metadata?.phone_number_id;
      if (!v || !phoneNumberId) continue;
      for (const m of v.messages ?? []) {
        if (IGNORAR.has(m.type)) continue; // reações, avisos do sistema etc. não são conversa
        const contato = v.contacts?.find((c) => c.wa_id === m.from) ?? v.contacts?.[0];
        saida.push({
          phoneNumberId,
          waId: m.id,
          de: m.from.replace(/\D/g, ""),
          nome: contato?.profile?.name ?? "",
          texto: textoDaMensagem(m),
          quando: new Date(Number(m.timestamp) * 1000).toISOString(),
        });
      }
    }
  }
  return saida;
}

function textoDaMensagem(m: NonNullable<ValorWebhook["messages"]>[number]): string {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "image":
      return m.image?.caption ? `[foto] ${m.image.caption}` : "[o cliente enviou uma foto]";
    case "video":
      return m.video?.caption ? `[vídeo] ${m.video.caption}` : "[o cliente enviou um vídeo]";
    case "audio":
      return "[o cliente enviou um áudio]";
    case "document":
      return `[documento] ${m.document?.filename ?? ""}`.trim();
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    case "location":
      return `[localização] ${m.location?.name ?? `${m.location?.latitude}, ${m.location?.longitude}`}`;
    case "sticker":
      return "[figurinha]";
    default:
      return `[mensagem do tipo ${m.type}]`;
  }
}
