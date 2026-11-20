"use client";

import { useRouter } from "next/navigation";
import { Bot, CalendarCheck, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    // Sem back-end ainda: qualquer e-mail/senha entra no painel
    router.push("/estoque");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex">
        <Logo claro />
        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">
            Seu WhatsApp atendendo, qualificando e agendando — mesmo com a loja fechada.
          </h1>
          <ul className="space-y-4 text-zinc-300">
            <li className="flex gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-marca-500" />
              IA responde os clientes com base no seu estoque real.
            </li>
            <li className="flex gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-marca-500" />
              Todas as conversas num lugar só, com etiquetas e temperatura do lead.
            </li>
            <li className="flex gap-3">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-marca-500" />
              Visitas e test-drives marcados automaticamente.
            </li>
          </ul>
        </div>
        <p className="text-xs text-zinc-500">© {new Date().getFullYear()} Milano Multimarcas</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <form onSubmit={entrar} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Entrar no painel</h2>
            <p className="mt-1 text-sm text-zinc-500">Use o e-mail cadastrado pela loja.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="rotulo">E-mail</label>
              <input id="email" type="email" required className="campo" placeholder="voce@milano.com.br" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="senha" className="rotulo">Senha</label>
              <input id="senha" type="password" required className="campo" placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>
          <button type="submit" className="botao-primario w-full py-2.5">Entrar</button>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Versão de demonstração: qualquer e-mail e senha entram.
          </p>
        </form>
      </section>
    </main>
  );
}
