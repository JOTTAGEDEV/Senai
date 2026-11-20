export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-marca-600 text-lg font-black text-white">
        M
      </div>
      <div className="leading-tight">
        <p className={`text-sm font-bold tracking-wide ${claro ? "text-white" : "text-zinc-900"}`}>MILANO</p>
        <p className={`text-[11px] uppercase tracking-[0.18em] ${claro ? "text-zinc-400" : "text-zinc-500"}`}>
          Multimarcas
        </p>
      </div>
    </div>
  );
}
