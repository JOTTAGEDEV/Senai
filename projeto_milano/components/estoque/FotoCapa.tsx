import { Car } from "lucide-react";
import type { Foto } from "@/lib/types";

/** Mostra a primeira foto (capa) ou um ícone quando o carro ainda não tem foto */
export function FotoCapa({ fotos, className = "" }: { fotos: Foto[]; className?: string }) {
  const capa = fotos[0];
  if (!capa) {
    return (
      <div className={`grid place-items-center bg-zinc-100 text-zinc-400 ${className}`}>
        <Car className="h-1/2 w-1/2 max-h-8 max-w-8" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={capa.dataUrl} alt="" className={`object-cover ${className}`} />
  );
}
