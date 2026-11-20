import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Se as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY existirem,
 * o painel usa o Supabase de verdade. Sem elas, roda em modo demonstração (dados no navegador).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const SUPABASE_ATIVO = Boolean(url && chave);

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!SUPABASE_ATIVO) throw new Error("Supabase não configurado");
  if (!cliente) cliente = createClient(url, chave);
  return cliente;
}
