/** Crédito "Desenvolvido por JL Devs" (rodapé do login e do menu). */
export function AssinaturaJL({ compacto = false }: { compacto?: boolean }) {
  return (
    <p className={`flex items-center gap-1.5 ${compacto ? "text-[10px]" : "text-xs"} text-white/45`}>
      Desenvolvido por
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-2 py-0.5 font-semibold tracking-wide text-white/85 backdrop-blur-md">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-[5px] bg-gradient-to-br from-sky-400 to-indigo-500 text-[8px] font-black leading-none text-white">
          JL
        </span>
        JL Devs
      </span>
    </p>
  );
}
