/** Crédito "Desenvolvido por JL Devs" (rodapé do login e do menu). Selo provisório até chegar a logo oficial. */
export function AssinaturaJL({ compacto = false }: { compacto?: boolean }) {
  return (
    <p className={`flex items-center gap-1.5 ${compacto ? "text-[10px]" : "text-xs"} text-white/50`}>
      Desenvolvido por
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-0.5 pl-0.5 pr-2.5 font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-[8px] font-black leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
          JL
        </span>
        JL Devs
      </span>
    </p>
  );
}
