const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("pt-BR");

export function formatarPreco(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return brl.format(valor);
}

export function formatarKm(km: number): string {
  return `${numero.format(km)} km`;
}

export function diasDesde(dataISO: string): number {
  const inicio = new Date(dataISO + "T00:00:00");
  const diff = Date.now() - inicio.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function textoDias(dias: number): string {
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

export function nomeCompleto(v: { marca: string; modelo: string; versao: string }): string {
  return [v.marca, v.modelo, v.versao].filter(Boolean).join(" ");
}

export function gerarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Converte "62.900" / "62900,50" digitado pelo usuário em número */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/[^\d,]/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isNaN(n) ? null : n;
}
