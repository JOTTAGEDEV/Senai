import { LOJA } from "@/lib/loja";

export function Logo({ claro = false }: { claro?: boolean }) {
  if (LOJA.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={LOJA.logoUrl} alt={LOJA.nome} className="h-9 w-auto max-w-[180px] object-contain" />
    );
  }

  return (
    <div className="flex items-center gap-2.5" aria-label={LOJA.nome}>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-marca-600 text-lg font-black text-white">
        {LOJA.nomeCurto.charAt(0)}
      </div>
      <div className="leading-tight">
        <p className={`text-sm font-bold tracking-wide ${claro ? "text-white" : "text-zinc-900"}`}>{LOJA.nomeCurto}</p>
        <p className={`text-[11px] uppercase tracking-[0.18em] ${claro ? "text-zinc-400" : "text-zinc-500"}`}>
          {LOJA.complemento}
        </p>
      </div>
    </div>
  );
}
