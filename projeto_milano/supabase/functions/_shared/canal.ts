// Canal de envio do WhatsApp da loja. O resto do sistema só chama canal(cred).enviarTexto(...),
// sem saber se por trás está a API oficial da Meta, a Evolution API (servidor próprio, QR Code)
// ou a Z-API (serviço pago, QR Code).
import type { CredenciaisWhatsApp, ProvedorWhatsApp } from "./tipos.ts";
import { enviarImagem as metaImagem, enviarTexto as metaTexto, ErroWhatsApp } from "./whatsapp.ts";

export interface Canal {
  provedor: ProvedorWhatsApp;
  /** Pode mandar texto livre fora da janela de 24h? (na Meta só com modelo aprovado) */
  textoLivreForaDaJanela: boolean;
  enviarTexto(para: string, texto: string): Promise<string | null>;
  enviarImagem(para: string, link: string, legenda?: string): Promise<string | null>;
}

const ZAPI_URL = (Deno.env.get("ZAPI_URL") ?? "https://api.z-api.io").replace(/\/+$/, "");

/** Erro de um provedor não oficial no mesmo formato do erro da Meta (para explicarErroWhatsApp). */
function erro(status: number, codigo: number, mensagem: string): ErroWhatsApp {
  return new ErroWhatsApp(status, { error: { code: codigo, message: mensagem.slice(0, 400) } });
}

function classificar(status: number, corpo: unknown): ErroWhatsApp {
  const texto = typeof corpo === "string" ? corpo : JSON.stringify(corpo ?? "");
  if (/"exists"\s*:\s*false|not.{0,20}whatsapp|n[aã]o possui whatsapp/i.test(texto)) return erro(status, 9003, texto);
  if (status === 404 || /connection closed|not connected|disconnected|desconectad|instance.{0,30}(not found|does not exist)/i.test(texto)) {
    return erro(status, 9001, texto);
  }
  return erro(status, status, texto);
}

async function postar(url: string, cabecalhos: Record<string, string>, corpo: unknown): Promise<unknown> {
  let r: Response;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...cabecalhos }, body: JSON.stringify(corpo) });
  } catch (e) {
    throw erro(0, 9002, e instanceof Error ? e.message : String(e));
  }
  const texto = await r.text();
  let json: unknown = texto;
  try {
    json = JSON.parse(texto);
  } catch { /* resposta em texto */ }
  if (!r.ok) throw classificar(r.status, json);
  return json;
}

/** Evolution: o lead pode estar guardado como "lid:123" quando o WhatsApp esconde o número. */
function destinoEvolution(para: string): string {
  return para.startsWith("lid:") ? `${para.slice(4)}@lid` : para.replace(/\D/g, "");
}

export function canal(cred: CredenciaisWhatsApp): Canal {
  const provedor = cred.provedor ?? "meta";

  if (provedor === "evolution") {
    const base = (cred.api_url ?? "").replace(/\/+$/, "");
    const inst = encodeURIComponent(cred.instancia ?? "");
    const cab = { apikey: cred.access_token };
    const id = (r: unknown) => (r as { key?: { id?: string } })?.key?.id ?? null;
    return {
      provedor,
      textoLivreForaDaJanela: true,
      async enviarTexto(para, texto) {
        return id(await postar(`${base}/message/sendText/${inst}`, cab, { number: destinoEvolution(para), text: texto }));
      },
      async enviarImagem(para, link, legenda) {
        const tipo = /\.png(\?|$)/i.test(link) ? "image/png" : /\.webp(\?|$)/i.test(link) ? "image/webp" : "image/jpeg";
        return id(await postar(`${base}/message/sendMedia/${inst}`, cab, {
          number: destinoEvolution(para),
          mediatype: "image",
          mimetype: tipo,
          media: link,
          caption: legenda ?? "",
          fileName: `foto.${tipo.split("/")[1]}`,
        }));
      },
    };
  }

  if (provedor === "zapi") {
    const base = `${ZAPI_URL}/instances/${encodeURIComponent(cred.instancia ?? "")}/token/${encodeURIComponent(cred.access_token)}`;
    const cab: Record<string, string> = cred.client_token ? { "Client-Token": cred.client_token } : {};
    const id = (r: unknown) => {
      const x = r as { messageId?: string; id?: string; zaapId?: string };
      return x?.messageId ?? x?.id ?? x?.zaapId ?? null;
    };
    return {
      provedor,
      textoLivreForaDaJanela: true,
      async enviarTexto(para, texto) {
        return id(await postar(`${base}/send-text`, cab, { phone: para.replace(/\D/g, ""), message: texto }));
      },
      async enviarImagem(para, link, legenda) {
        return id(await postar(`${base}/send-image`, cab, { phone: para.replace(/\D/g, ""), image: link, caption: legenda ?? "" }));
      },
    };
  }

  // Meta (API oficial)
  return {
    provedor: "meta",
    textoLivreForaDaJanela: false,
    enviarTexto: (para, texto) => metaTexto(cred.phone_number_id ?? "", cred.access_token, para, texto),
    enviarImagem: (para, link, legenda) => metaImagem(cred.phone_number_id ?? "", cred.access_token, para, link, legenda),
  };
}
