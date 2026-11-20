/**
 * Fundo das telas (referência "AE Glass"): quase preto com objetos 3D coloridos
 * flutuando atrás do vidro — cristal roxo, anel de cobre, esfera roxa metálica,
 * cruz de cápsulas azuis e pentágono dourado com brilho. Só decoração (aria-hidden).
 */
import type { CSSProperties } from "react";

type Estilo = CSSProperties & { "--tempo"?: string; "--giro"?: string };

function Cristal({ tamanho }: { tamanho: string }) {
  return (
    <svg viewBox="0 0 100 120" style={{ width: tamanho, height: "auto" }}>
      <defs>
        <linearGradient id="cr-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8b4fe" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="cr-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id="cr-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7e22ce" />
          <stop offset="1" stopColor="#2e1065" />
        </linearGradient>
      </defs>
      {/* metade de cima */}
      <polygon points="50,0 8,58 46,66" fill="url(#cr-a)" />
      <polygon points="50,0 46,66 92,56" fill="url(#cr-b)" />
      {/* metade de baixo */}
      <polygon points="8,58 46,66 50,120" fill="url(#cr-c)" />
      <polygon points="46,66 92,56 50,120" fill="#3b0764" />
      <polygon points="50,0 30,30 46,66" fill="#fff" opacity="0.18" />
    </svg>
  );
}

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

function Esfera({ tamanho }: { tamanho: string }) {
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: "9999px",
        background:
          "radial-gradient(circle at 32% 28%, #e9d5ff 0%, #a78bfa 14%, #6d28d9 38%, #312e81 62%, #0b0820 88%)",
        boxShadow: "inset -18px -22px 40px rgba(0,0,0,0.55), inset 10px 10px 30px rgba(255,255,255,0.12), 0 30px 60px -20px rgba(109,40,217,0.6)",
      }}
    />
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
  { el: <Cristal tamanho="min(15vw, 190px)" />, estilo: { top: "6%", left: "34%", "--tempo": "13s", "--giro": "-8deg" } },
  { el: <Anel tamanho="min(16vw, 200px)" />, estilo: { top: "4%", right: "10%", "--tempo": "15s", "--giro": "18deg" } },
  { el: <Esfera tamanho="min(20vw, 260px)" />, estilo: { bottom: "4%", left: "30%", "--tempo": "17s" } },
  { el: <Cruz tamanho="min(15vw, 190px)" />, estilo: { bottom: "14%", right: "6%", "--tempo": "14s", "--giro": "10deg" } },
  { el: <Pentagono tamanho="min(13vw, 160px)" />, estilo: { top: "38%", left: "3%", "--tempo": "16s", "--giro": "-12deg" } },
  { el: <Esfera tamanho="min(7vw, 90px)" />, estilo: { top: "52%", right: "34%", opacity: 0.75, "--tempo": "11s" } },
  { el: <Anel tamanho="min(8vw, 100px)" />, estilo: { bottom: "6%", left: "4%", opacity: 0.8, "--tempo": "12s", "--giro": "-25deg" } },
];

export function FundoVidro() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
