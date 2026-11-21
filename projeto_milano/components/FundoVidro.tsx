/**
 * Fundo das telas (referência "AE Glass"): quase preto com a logo de vidro da JL Devs
 * no centro e folhas reais de costela-de-adão nos cantos (foto Burst/Shopify, uso comercial livre).
 * Só decoração (aria-hidden).
 */
"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type Estilo = CSSProperties & { "--tempo"?: string; "--giro"?: string };

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
      {/* véu muito leve para não brigar com o texto */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,10,12,0.55)_100%)]" />
    </div>
  );
}
