import { STATUS } from "@/lib/constants";
import type { StatusVeiculo } from "@/lib/types";

export function StatusBadge({ status }: { status: StatusVeiculo }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.ponto}`} />
      {s.rotulo}
    </span>
  );
}
