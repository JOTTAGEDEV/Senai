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

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
        aria-label="Ações"
        aria-expanded={aberto}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {aberto && (
        <div className="vidro-forte absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl py-1 text-white/80">
          <Link href={`/estoque/${veiculo.id}`} className={item}>
            <Pencil className="h-4 w-4 text-white/35" /> Editar
          </Link>
          <button
            type="button"
            className={item}
            onClick={() => {
              duplicar(veiculo.id);
              setAberto(false);
            }}
          >
            <Copy className="h-4 w-4 text-white/35" /> Duplicar
          </button>
          <div className="my-1 border-t border-white/10" />
          <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">Mudar status</p>
          {(Object.keys(STATUS) as StatusVeiculo[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={veiculo.status === s}
              className={`${item} disabled:font-medium disabled:text-white`}
              onClick={() => {
                mudarStatus(veiculo.id, s);
                setAberto(false);
              }}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS[s].ponto}`} />
              {STATUS[s].rotulo}
              {veiculo.status === s && <span className="ml-auto text-xs text-white/35">atual</span>}
            </button>
          ))}
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            className={`${item} text-rose-300 hover:bg-rose-500/15`}
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
