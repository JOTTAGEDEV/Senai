"use client";

import { useId } from "react";
import { LOJA } from "@/lib/loja";

/**
 * Logo da Milano Multimarcas redesenhada em vetor a partir do arquivo original
 * (public/logo-milano-original.gif, 104×52 px), para ficar nítida em qualquer tamanho.
 *
 * - `claro`: está sobre fundo escuro (menu lateral, tela de login).
 * - Sem `claro`: desenha a logo dentro de uma placa escura, como no original.
 */
export function Logo({ claro = false, className = "h-12" }: { claro?: boolean; className?: string }) {
  // ids únicos: o mesmo logo aparece várias vezes na página (menu do celular e do computador)
  const id = useId().replace(/:/g, "");
  const prata = `prata-${id}`;
  const vermelho = `vermelho-${id}`;
  const svg = (
    <svg viewBox="0 0 260 82" className={`w-auto max-w-full self-start ${className}`} role="img" aria-label={LOJA.nome}>
      <defs>
        <linearGradient id={prata} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4e4e7" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </linearGradient>
        <linearGradient id={vermelho} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ce2b37" />
          <stop offset="100%" stopColor="#ce2b37" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* MILANO */}
      <text
        x="130"
        y="47"
        textAnchor="middle"
        fill={`url(#${prata})`}
        style={{ fontFamily: "var(--font-cinzel), 'Times New Roman', serif", fontSize: 50, fontWeight: 600, letterSpacing: 2 }}
      >
        MILANO
      </text>

      {/* Faixa tricolor */}
      <polygon points="6,53 96,53 96,62 14,62" fill="#009246" />
      <polygon points="96,53 170,53 170,61.5 96,62" fill="#f4f4f5" />
      <polygon points="170,53 254,54.5 170,61.5" fill={`url(#${vermelho})`} />

      {/* Multimarcas */}
      <text
        x="252"
        y="76"
        textAnchor="end"
        fill="#d4d4d8"
        style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1.5 }}
      >
        Multimarcas
      </text>
    </svg>
  );

  if (claro) return svg;
  return <div className="inline-flex rounded-xl bg-milano-fundo px-3 py-2">{svg}</div>;
}
