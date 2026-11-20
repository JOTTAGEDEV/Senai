"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useUsuario } from "@/lib/auth";
import { useDados } from "@/lib/dados";

/** Só mostra o painel para quem está logado (no modo Supabase). */
export function Protecao({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useUsuario();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  if (carregando || !usuario) {
    return (
      <div className="grid min-h-dvh place-items-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}

/** Faixa de aviso quando algo falha ao salvar/carregar. */
export function AvisoErro() {
  const { erro } = useDados();
  if (!erro) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Não foi possível salvar ou carregar dados: <span className="font-mono text-xs">{erro}</span>
      </p>
    </div>
  );
}
