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
    <main className="relative isolate min-h-dvh overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        {/* Barra superior em pílula de vidro */}
        <header className="vidro flex items-center justify-between rounded-full py-2 pl-5 pr-2">
          <Logo claro className="h-9 sm:h-10" />
          <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            Painel da loja
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
          {/* Apresentação */}
          <section className="space-y-8">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs font-medium text-white/75 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.6)]" />
                {LOJA.nome} · {LOJA.cidade}/{LOJA.uf}
              </p>
              <h1 className="texto-metal text-4xl font-extrabold italic leading-[1.05] tracking-[-0.02em] sm:text-6xl">
                Seu WhatsApp vendendo, mesmo com a loja fechada.
              </h1>
              <p className="max-w-md text-base text-white/65 sm:text-lg">Atendimento com IA, leads, estoque e agenda num lugar só.</p>
            </div>
            <ul className="hidden gap-3 sm:grid sm:grid-cols-3">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="vidro p-4">
                  <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                    <Icone className="h-4.5 w-4.5 text-white" />
                  </span>
                  <p className="text-sm font-semibold">{titulo}</p>
                  <p className="mt-0.5 text-xs text-white/55">{texto}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Cartão de login em vidro */}
          <section className="w-full max-w-md justify-self-center lg:justify-self-end">
            <form onSubmit={aoEnviar} className="vidro space-y-5 rounded-[32px] p-7 sm:p-9">
              <div>
                <h2 className="texto-metal text-3xl font-extrabold italic tracking-tight">Entrar</h2>
                <p className="mt-1 text-sm text-white/55">Use o e-mail cadastrado pela loja.</p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="sr-only">E-mail</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/25 px-4 py-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition focus-within:border-white/40 focus-within:bg-black/35 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]">
                    <Mail className="h-4 w-4 shrink-0 text-white/45" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="voce@milano.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Senha</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/25 px-4 py-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition focus-within:border-white/40 focus-within:bg-black/35 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]">
                    <Lock className="h-4 w-4 shrink-0 text-white/45" />
                    <input
                      id="senha"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
                    />
                  </span>
                </label>
              </div>

              {erro && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-100">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-[15px] font-semibold text-zinc-900 shadow-[0_12px_30px_-10px_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.12)] transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
              >
                {enviando ? "Entrando..." : "Entrar no painel"}
                {!enviando && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
              </button>

              {!SUPABASE_ATIVO && (
                <p className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-100">
                  Modo demonstração: qualquer e-mail e senha entram.
                </p>
              )}
            </form>
          </section>
        </div>

        {/* Rodapé em pílula de vidro */}
        <footer className="vidro flex flex-col items-center justify-between gap-2 rounded-3xl px-5 py-3 text-xs text-white/55 sm:flex-row sm:rounded-full">
          <p className="flex items-center gap-1.5 text-center">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {ENDERECO_COMPLETO}
          </p>
          <AssinaturaJL />
        </footer>
      </div>
    </main>
  );
}
