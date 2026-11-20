import { Bot, UserRound } from "lucide-react";
import { ROTULO_ETAPA, TEMPERATURAS, iniciais } from "@/lib/crm";
import type { Atendente, Etapa, Temperatura } from "@/lib/types";

export function TemperaturaBadge({ t }: { t: Temperatura }) {
  const info = TEMPERATURAS[t];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${info.classe}`}>
      <span aria-hidden>{info.emoji}</span>
      {info.rotulo}
    </span>
  );
}

const CORES_ETAPA: Record<Etapa, string> = {
  novo: "bg-zinc-100 text-zinc-700",
  atendimento: "bg-sky-50 text-sky-700",
  qualificado: "bg-indigo-50 text-indigo-700",
  visita: "bg-violet-50 text-violet-700",
  negociando: "bg-amber-50 text-amber-800",
  vendido: "bg-emerald-50 text-emerald-700",
  perdido: "bg-rose-50 text-rose-700",
};

export function EtapaBadge({ e }: { e: Etapa }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${CORES_ETAPA[e]}`}>
      {ROTULO_ETAPA[e]}
    </span>
  );
}

export function AtendenteBadge({ a }: { a: Atendente }) {
  return a === "ia" ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
      <Bot className="h-3 w-3" /> IA atendendo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
      <UserRound className="h-3 w-3" /> Vendedor
    </span>
  );
}

const CORES_AVATAR = ["bg-rose-100 text-rose-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800", "bg-zinc-200 text-zinc-800"];

export function Avatar({ nome, tamanho = "h-10 w-10 text-sm" }: { nome: string; tamanho?: string }) {
  const indice = [...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length;
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-semibold ${tamanho} ${CORES_AVATAR[indice]}`}>
      {iniciais(nome) || "?"}
    </div>
  );
}

export function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        ativo ? "border-marca-200 bg-marca-50 text-marca-700" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

export function Carregando() {
  return (
    <div className="grid place-items-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
    </div>
  );
}
