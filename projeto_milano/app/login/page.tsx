"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Bot, CalendarCheck, Lock, Mail, MapPin, MessageCircle } from "lucide-react";
import { AssinaturaJL } from "@/components/AssinaturaJL";
import { Logo } from "@/components/Logo";
import { entrar } from "@/lib/auth";
import { ENDERECO_COMPLETO, LOJA } from "@/lib/loja";
import { SUPABASE_ATIVO } from "@/lib/supabase";

const RECURSOS = [
  { icone: Bot, titulo: "IA no WhatsApp", texto: "Responde com o estoque real, 24h." },
  { icone: MessageCircle, titulo: "Leads organizados", texto: "Temperatura, etiquetas e resumo." },
  { icone: CalendarCheck, titulo: "Agenda automática", texto: "Visitas e test-drives marcados." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const falha = await entrar(email, senha);
    setEnviando(false);
    if (falha) {
      setErro(falha);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#0b0b10] text-white">
      {/* Fundo: luzes desfocadas (estilo iOS) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#ce2b37] opacity-40 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-[#009246] opacity-30 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-[#4f46e5] opacity-25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <Logo claro className="h-12 sm:h-14" />
          <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-xl sm:inline-flex">
            Painel da loja
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Apresentação */}
          <section className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Seu WhatsApp vendendo,
                <span className="block bg-gradient-to-r from-white via-white/80 to-white/50 bg-clip-text text-transparent">
                  mesmo com a loja fechada.
                </span>
              </h1>
              <p className="max-w-md text-base text-white/60">
                Atendimento com IA, leads, estoque e agenda da {LOJA.nome} num lugar só.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <Icone className="mb-3 h-5 w-5 text-white/80" />
                  <p className="text-sm font-medium">{titulo}</p>
                  <p className="mt-0.5 text-xs text-white/50">{texto}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Cartão de vidro */}
          <section className="w-full max-w-md justify-self-center lg:justify-self-end">
            <form
              onSubmit={aoEnviar}
              className="space-y-5 rounded-[28px] border border-white/15 bg-white/[0.08] p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl backdrop-saturate-150 sm:p-8"
            >
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
                <p className="mt-1 text-sm text-white/55">Use o e-mail cadastrado pela loja.</p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="sr-only">E-mail</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition focus-within:border-white/40 focus-within:bg-black/30">
                    <Mail className="h-4 w-4 shrink-0 text-white/40" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="voce@milano.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Senha</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition focus-within:border-white/40 focus-within:bg-black/30">
                    <Lock className="h-4 w-4 shrink-0 text-white/40" />
                    <input
                      id="senha"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                    />
                  </span>
                </label>
              </div>

              {erro && <p className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition hover:bg-white/90 disabled:opacity-60"
              >
                {enviando ? "Entrando..." : "Entrar no painel"}
                {!enviando && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
              </button>

              {!SUPABASE_ATIVO && (
                <p className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  Modo demonstração: qualquer e-mail e senha entram.
                </p>
              )}
            </form>
          </section>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {ENDERECO_COMPLETO}
          </p>
          <AssinaturaJL />
        </footer>
      </div>
    </main>
  );
}
