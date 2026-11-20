"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { STATUS } from "@/lib/constants";
import { useEstoque } from "@/lib/estoque-store";
import type { StatusVeiculo, Veiculo } from "@/lib/types";

export function MenuAcoes({ veiculo }: { veiculo: Veiculo }) {
  const { duplicar, mudarStatus, remover } = useEstoque();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="Ações"
        aria-expanded={aberto}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {aberto && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <Link href={`/estoque/${veiculo.id}`} className={item}>
            <Pencil className="h-4 w-4 text-zinc-400" /> Editar
          </Link>
          <button
            type="button"
            className={item}
            onClick={() => {
              duplicar(veiculo.id);
              setAberto(false);
            }}
          >
            <Copy className="h-4 w-4 text-zinc-400" /> Duplicar
          </button>
          <div className="my-1 border-t border-zinc-100" />
          <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Mudar status</p>
          {(Object.keys(STATUS) as StatusVeiculo[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={veiculo.status === s}
              className={`${item} disabled:font-medium disabled:text-zinc-900`}
              onClick={() => {
                mudarStatus(veiculo.id, s);
                setAberto(false);
              }}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS[s].ponto}`} />
              {STATUS[s].rotulo}
              {veiculo.status === s && <span className="ml-auto text-xs text-zinc-400">atual</span>}
            </button>
          ))}
          <div className="my-1 border-t border-zinc-100" />
          <button
            type="button"
            className={`${item} text-rose-600 hover:bg-rose-50`}
            onClick={() => {
              if (confirm(`Excluir ${veiculo.marca} ${veiculo.modelo} do estoque?`)) remover(veiculo.id);
              setAberto(false);
            }}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}
