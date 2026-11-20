/** Crédito "Desenvolvido por JL Devs" (rodapé do login e do menu). Usa a logo oficial (public/jl-mini.webp). */
export function AssinaturaJL({ compacto = false }: { compacto?: boolean }) {
  return (
    <p className={`flex items-center gap-1.5 ${compacto ? "text-[10px]" : "text-xs"} text-white/50`}>
      Desenvolvido por
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-0.5 pl-0.5 pr-2.5 font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jl-mini.webp" alt="" className={`${compacto ? "h-3" : "h-3.5"} w-auto drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]`} />
        JL Devs
      </span>
    </p>
  );
}
