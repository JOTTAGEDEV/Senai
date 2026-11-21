import { Bot, UserRound } from "lucide-react";
import { ROTULO_ETAPA, TEMPERATURAS, iniciais } from "@/lib/crm";
import type { Atendente, Etapa, Temperatura } from "@/lib/types";

const CORES_TEMPERATURA: Record<Temperatura, string> = {
  quente: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  morno: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  frio: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
};

export function TemperaturaBadge({ t }: { t: Temperatura }) {
  const info = TEMPERATURAS[t];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES_TEMPERATURA[t]}`}>
      <span aria-hidden>{info.emoji}</span>
      {info.rotulo}
    </span>
  );
}

const CORES_ETAPA: Record<Etapa, string> = {
  novo: "bg-white/10 text-white/75 ring-white/15",
  atendimento: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  qualificado: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
  visita: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  negociando: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  vendido: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  perdido: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
};

export function EtapaBadge({ e }: { e: Etapa }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES_ETAPA[e]}`}>
      {ROTULO_ETAPA[e]}
    </span>
  );
}

export function AtendenteBadge({ a }: { a: Atendente }) {
  return a === "ia" ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
      <Bot className="h-3 w-3" /> IA atendendo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-inset ring-emerald-400/30">
      <UserRound className="h-3 w-3" /> Vendedor
    </span>
  );
}

const CORES_AVATAR = [
  "bg-rose-500/20 text-rose-200 ring-rose-400/20",
  "bg-sky-500/20 text-sky-200 ring-sky-400/20",
  "bg-amber-500/20 text-amber-200 ring-amber-400/20",
  "bg-emerald-500/20 text-emerald-200 ring-emerald-400/20",
  "bg-violet-500/20 text-violet-200 ring-violet-400/20",
  "bg-zinc-500/20 text-zinc-200 ring-zinc-400/20",
];

export function Avatar({ nome, tamanho = "h-10 w-10 text-sm" }: { nome: string; tamanho?: string }) {
  const indice = [...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length;
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-semibold ring-1 ${tamanho} ${CORES_AVATAR[indice]}`}>
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
        ativo ? "border-rose-400/30 bg-rose-500/20 text-rose-100" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function Carregando() {
  return (
    <div className="grid place-items-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
    </div>
  );
}
