"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Car,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  Users,
  X,
} from "lucide-react";
import { sair, useUsuario } from "@/lib/auth";
import { iniciais } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import { LOJA } from "@/lib/loja";
import { Logo } from "./Logo";

const ITENS = [
  { href: "/dashboard", rotulo: "Dashboard", icone: LayoutDashboard },
  { href: "/conversas", rotulo: "Conversas", icone: MessageCircle },
  { href: "/leads", rotulo: "Leads", icone: Users },
  { href: "/estoque", rotulo: "Estoque", icone: Car },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

function Navegacao({ aoClicar }: { aoClicar?: () => void }) {
  const caminho = usePathname();
  const { leads } = useDados();
  const naoLidas = leads.reduce((soma, l) => soma + (l.naoLidas > 0 ? 1 : 0), 0);
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {ITENS.map(({ href, rotulo, icone: Icone }) => {
        const ativo = caminho === href || caminho.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={aoClicar}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              ativo ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icone className={`h-4.5 w-4.5 ${ativo ? "text-marca-500" : ""}`} />
            {rotulo}
            {href === "/conversas" && naoLidas > 0 && (
              <span className="ml-auto rounded-full bg-milano-verde px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {naoLidas}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Rodape() {
  const { usuario } = useUsuario();
  const { modo } = useDados();
  const router = useRouter();
  const nome = usuario?.nome ?? "";
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 px-1">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
          {iniciais(nome) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{nome}</p>
          <p className="truncate text-xs text-zinc-500">{modo === "local" ? "Modo demonstração" : usuario?.email}</p>
        </div>
        <button
          onClick={async () => {
            await sair();
            router.push("/login");
          }}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra superior no celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-milano-fundo px-4 py-3 lg:hidden">
        <Logo claro className="h-10" />
        <button
          onClick={() => setAberto(true)}
          className="rounded-md p-2 text-zinc-300 hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Menu lateral fixo no computador */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 bg-milano-fundo p-4 lg:flex">
        <div className="space-y-2 px-1 pt-1">
          <Logo claro />
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" /> {LOJA.cidade} · {LOJA.uf}
          </p>
        </div>
        <Navegacao />
        <Rodape />
      </aside>

      {/* Gaveta no celular */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-milano-fundo p-4">
            <div className="flex items-center justify-between px-1 pt-1">
              <Logo claro />
              <button
                onClick={() => setAberto(false)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Navegacao aoClicar={() => setAberto(false)} />
            <Rodape />
          </aside>
        </div>
      )}
    </>
  );
}
