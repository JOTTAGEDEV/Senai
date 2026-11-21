/**
 * Fundo das telas (referência "AE Glass"): quase preto com a logo de vidro da JL Devs
 * no centro, folhas reais de costela-de-adão nos cantos (foto Burst/Shopify, uso comercial livre)
 * e objetos 3D flutuando atrás do vidro — anel de cobre, cruz de cápsulas azuis e pentágono
 * dourado com brilho. Só decoração (aria-hidden).
 */
"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type Estilo = CSSProperties & { "--tempo"?: string; "--giro"?: string };

function Anel({ tamanho }: { tamanho: string }) {
  return (
    <svg viewBox="0 0 120 120" style={{ width: tamanho, height: tamanho }}>
      <defs>
        <linearGradient id="an-cobre" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe2c2" />
          <stop offset="0.25" stopColor="#d08a52" />
          <stop offset="0.5" stopColor="#7a3f1f" />
          <stop offset="0.75" stopColor="#e3a46e" />
          <stop offset="1" stopColor="#5a2c14" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="60" rx="46" ry="50" fill="none" stroke="url(#an-cobre)" strokeWidth="9" />
      <ellipse cx="57" cy="56" rx="46" ry="50" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="60 260" />
    </svg>
  );
}

function Cruz({ tamanho }: { tamanho: string }) {
  const capsula: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "100%",
    height: "26%",
    borderRadius: "9999px",
    background: "linear-gradient(180deg, #bfdbfe 0%, #60a5fa 30%, #2563eb 60%, #1e3a8a 100%)",
    boxShadow: "inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -6px 10px rgba(0,0,0,0.35), 0 16px 40px -14px rgba(37,99,235,0.7)",
  };
  return (
    <div style={{ position: "relative", width: tamanho, height: tamanho }}>
      <span style={{ ...capsula, transform: "translate(-50%, -50%) rotate(40deg)" }} />
      <span style={{ ...capsula, transform: "translate(-50%, -50%) rotate(-50deg)" }} />
    </div>
  );
}

/** Logo da JL Devs (letras de vidro verde, recortadas do arquivo original) como peça principal do fundo. */
function LogoJL({ destaque }: { destaque: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/jl-logo.webp"
      alt=""
      draggable={false}
      style={{
        width: destaque ? "min(50vw, 700px)" : "min(38vw, 540px)",
        maxWidth: "none",
        height: "auto",
        opacity: destaque ? 1 : 0.55,
        filter: destaque
          ? "drop-shadow(0 30px 60px rgba(132,204,22,0.35)) drop-shadow(0 0 40px rgba(163,230,53,0.18))"
          : "brightness(0.8) saturate(0.9) drop-shadow(0 30px 60px rgba(132,204,22,0.25))",
      }}
    />
  );
}

/** Folha real (foto recortada do fundo preto). `girar` espelha para o canto oposto. */
function Planta({ altura, girar = false, apagada = false }: { altura: string; girar?: boolean; apagada?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/planta-monstera.webp"
      alt=""
      draggable={false}
      style={{
        height: altura,
        width: "auto",
        maxWidth: "none",
        transform: girar ? "rotate(180deg)" : undefined,
        opacity: apagada ? 0.6 : 0.9,
        filter: "saturate(1.1) drop-shadow(0 0 40px rgba(132,204,22,0.15))",
      }}
    />
  );
}

function Pentagono({ tamanho }: { tamanho: string }) {
  return (
    <svg viewBox="0 0 120 120" style={{ width: tamanho, height: tamanho, filter: "drop-shadow(0 0 10px rgba(251,191,36,0.55)) drop-shadow(0 0 24px rgba(245,158,11,0.35))" }}>
      <defs>
        <linearGradient id="pe-ouro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.4" stopColor="#f5c046" />
          <stop offset="0.7" stopColor="#b7791f" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <polygon points="60,10 108,45 90,102 30,102 12,45" fill="none" stroke="url(#pe-ouro)" strokeWidth="7" strokeLinejoin="round" />
    </svg>
  );
}

const OBJETOS: { el: React.ReactNode; estilo: Estilo }[] = [
  { el: <Anel tamanho="min(16vw, 200px)" />, estilo: { top: "4%", right: "10%", "--tempo": "15s", "--giro": "18deg" } },
  { el: <Cruz tamanho="min(15vw, 190px)" />, estilo: { bottom: "14%", right: "6%", "--tempo": "14s", "--giro": "10deg" } },
  { el: <Pentagono tamanho="min(13vw, 160px)" />, estilo: { top: "38%", left: "3%", "--tempo": "16s", "--giro": "-12deg" } },
  { el: <Anel tamanho="min(8vw, 100px)" />, estilo: { bottom: "6%", left: "4%", opacity: 0.8, "--tempo": "12s", "--giro": "-25deg" } },
];

export function FundoVidro() {
  // No login a logo fica atrás do cartão "Entrar" (lado direito), como na referência;
  // nas telas do painel fica no centro, mais suave, para não atrapalhar a leitura.
  const login = usePathname()?.startsWith("/login") ?? false;
  const posicaoLogo: Estilo = login
    ? { top: "50%", left: "71%", translate: "-50% -50%", "--tempo": "18s", "--giro": "-3deg" }
    : { top: "55%", left: "58%", translate: "-50% -50%", "--tempo": "18s", "--giro": "-3deg" };
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* plantas nos cantos: entram pela borda da tela */}
      <div className="absolute left-0 top-0">
        <Planta altura="min(80vh, 760px)" apagada={login} />
      </div>
      <div className="absolute bottom-0 right-0">
        <Planta altura="min(72vh, 680px)" girar />
      </div>
      <div className="flutuar absolute" style={posicaoLogo}>
        <LogoJL destaque={login} />
      </div>
      {OBJETOS.map((o, i) => (
        <div key={i} className="flutuar absolute" style={o.estilo}>
          {o.el}
        </div>
      ))}
      {/* véu muito leve para não brigar com o texto */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,10,12,0.55)_100%)]" />
    </div>
  );
}
