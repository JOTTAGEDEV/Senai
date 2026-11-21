// DeepSeek (API no formato da OpenAI: /chat/completions com "tools").
// O mesmo código serve para outras IAs compatíveis (Qwen, Kimi, MiniMax, Mistral, Groq, OpenRouter...):
// basta trocar DEEPSEEK_BASE_URL e DEEPSEEK_MODELO nos secrets.
// Docs: https://api-docs.deepseek.com

export const DEEPSEEK_MODELO = Deno.env.get("DEEPSEEK_MODELO") ?? "deepseek-flash";
const BASE = (Deno.env.get("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com").replace(/\/+$/, "");

export interface ChamadaOA {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface MensagemOA {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ChamadaOA[];
  tool_call_id?: string;
  /** Raciocínio do modelo (modo "thinking"): precisa voltar junto nas rodadas de ferramenta. */
  reasoning_content?: string;
}
export interface RespostaOA {
  choices?: { message?: MensagemOA; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

export class ErroDeepSeek extends Error {
  constructor(public status: number, public detalhe: string) {
    super(`DeepSeek respondeu ${status}: ${detalhe.slice(0, 500)}`);
  }
}

export async function gerarDeepSeek(corpo: Record<string, unknown>, chaveInformada?: string): Promise<RespostaOA> {
  const chave = chaveInformada || Deno.env.get("DEEPSEEK_API_KEY") || "";
  const r = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
    body: JSON.stringify({ model: DEEPSEEK_MODELO, ...corpo }),
  });
  const texto = await r.text();
  if (!r.ok) throw new ErroDeepSeek(r.status, texto);
  return JSON.parse(texto) as RespostaOA;
}

export function usoDeepSeek(r: RespostaOA) {
  return {
    entrada: r.usage?.prompt_tokens ?? 0,
    saida: r.usage?.completion_tokens ?? 0,
    cache: r.usage?.prompt_cache_hit_tokens ?? r.usage?.prompt_tokens_details?.cached_tokens ?? 0,
  };
}
