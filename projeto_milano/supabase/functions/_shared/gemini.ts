// Google Gemini (API REST "generateContent"). Alternativa ao Claude, escolhida por IA_PROVEDOR
// ou automaticamente quando só GEMINI_API_KEY estiver configurada.
// Docs: https://ai.google.dev/gemini-api/docs/function-calling

export const GEMINI_MODELO = Deno.env.get("GEMINI_MODELO") ?? "gemini-3-flash-preview";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

export interface ParteGemini {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
}
export interface ConteudoGemini {
  role: "user" | "model";
  parts: ParteGemini[];
}
export interface RespostaGemini {
  candidates?: { content?: ConteudoGemini; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number };
}

export class ErroGemini extends Error {
  constructor(public status: number, public detalhe: string) {
    super(`Gemini respondeu ${status}: ${detalhe.slice(0, 500)}`);
  }
}

// Raciocínio "low": o padrão do Gemini 3 é "high", que gasta muitos tokens de saída (os mais caros)
// e deixa a resposta no WhatsApp mais lenta. Atendimento de loja não precisa de mais que isso.
const NIVEL_RACIOCINIO = Deno.env.get("GEMINI_RACIOCINIO") ?? "low";

export async function gerarGemini(corpo: Record<string, unknown>, chaveInformada?: string): Promise<RespostaGemini> {
  const chave = chaveInformada || Deno.env.get("GEMINI_API_KEY") || "";
  const config = (corpo.generationConfig ?? {}) as Record<string, unknown>;
  const r = await fetch(`${API}/${GEMINI_MODELO}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      ...corpo,
      generationConfig: { thinkingConfig: { thinkingLevel: NIVEL_RACIOCINIO }, ...config },
    }),
  });
  const texto = await r.text();
  if (!r.ok) throw new ErroGemini(r.status, texto);
  return JSON.parse(texto) as RespostaGemini;
}

/**
 * O Gemini aceita um subconjunto do JSON Schema (formato OpenAPI):
 * sem "additionalProperties", sem tipo em lista e sem null dentro de enum.
 * Converte `type: ["string", "null"]` em `type: "string", nullable: true`.
 */
// deno-lint-ignore no-explicit-any
export function esquemaParaGemini(s: any): any {
  if (Array.isArray(s)) return s.map(esquemaParaGemini);
  if (!s || typeof s !== "object") return s;
  // deno-lint-ignore no-explicit-any
  const saida: any = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "additionalProperties" || k === "strict") continue;
    if (k === "type" && Array.isArray(v)) {
      saida.type = v.find((t) => t !== "null");
      if (v.includes("null")) saida.nullable = true;
    } else if (k === "enum" && Array.isArray(v)) {
      saida.enum = v.filter((x) => x !== null);
    } else if (k === "properties" && v && typeof v === "object") {
      saida.properties = Object.fromEntries(Object.entries(v).map(([nome, p]) => [nome, esquemaParaGemini(p)]));
    } else {
      saida[k] = esquemaParaGemini(v);
    }
  }
  return saida;
}

/** Texto final da resposta (ignora os "pensamentos" do modelo). */
export function textoGemini(conteudo?: ConteudoGemini): string {
  return (conteudo?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("\n")
    .trim();
}
