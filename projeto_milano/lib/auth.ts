"use client";

import { useEffect, useState } from "react";
import { SUPABASE_ATIVO, supabase } from "./supabase";

export interface Usuario {
  email: string;
  nome: string;
}

const DEMO: Usuario = { email: "demo@milano", nome: "Dona da loja" };

/** Usuário logado. No modo demonstração, sempre há um usuário fictício. */
export function useUsuario(): { usuario: Usuario | null; carregando: boolean } {
  const [usuario, setUsuario] = useState<Usuario | null>(SUPABASE_ATIVO ? null : DEMO);
  const [carregando, setCarregando] = useState(SUPABASE_ATIVO);

  useEffect(() => {
    if (!SUPABASE_ATIVO) return;
    const sb = supabase();
    const aplicar = (email?: string | null, nome?: string) =>
      setUsuario(email ? { email, nome: nome || email.split("@")[0] } : null);

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      aplicar(u?.email, u?.user_metadata?.nome as string | undefined);
      setCarregando(false);
    });
    const { data } = sb.auth.onAuthStateChange((_evento, sessao) => {
      aplicar(sessao?.user.email, sessao?.user.user_metadata?.nome as string | undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { usuario, carregando };
}

export async function entrar(email: string, senha: string): Promise<string | null> {
  if (!SUPABASE_ATIVO) return null;
  const { error } = await supabase().auth.signInWithPassword({ email, password: senha });
  if (!error) return null;
  return error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message;
}

export async function sair(): Promise<void> {
  if (SUPABASE_ATIVO) await supabase().auth.signOut();
}
