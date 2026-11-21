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
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { sair, useUsuario } from "@/lib/auth";
import { iniciais } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import { LOJA } from "@/lib/loja";
import { AssinaturaJL } from "./AssinaturaJL";
import { Logo } from "./Logo";

const ITENS = [
  { href: "/dashboard", rotulo: "Dashboard", icone: LayoutDashboard },
  { href: "/conversas", rotulo: "Conversas", icone: MessageCircle },
  { href: "/leads", rotulo: "Leads", icone: Users },
  { href: "/estoque", rotulo: "Estoque", icone: Car },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/testar-ia", rotulo: "Testar IA", icone: Sparkles },
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
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
              ativo
                ? "border-white/20 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_-8px_rgba(0,0,0,0.6)]"
                : "border-transparent text-white/60 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Icone className={`h-4.5 w-4.5 ${ativo ? "text-white" : ""}`} />
            {rotulo}
            {href === "/conversas" && naoLidas > 0 && (
              <span className="ml-auto rounded-full bg-emerald-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]">
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
    <div className="border-t border-white/10 pt-3">
      <div className="flex items-center gap-3 px-1">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          {iniciais(nome) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{nome}</p>
          <p className="truncate text-xs text-white/45">{modo === "local" ? "Modo demonstração" : usuario?.email}</p>
        </div>
        <button
          onClick={async () => {
            await sair();
            router.push("/login");
          }}
          className="rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-center">
        <AssinaturaJL compacto />
      </div>
    </div>
  );
}

export function Sidebar() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra superior no celular */}
      <div className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
      <header className="vidro flex items-center justify-between rounded-full py-1.5 pl-4 pr-1.5">
        <Logo claro className="h-9" />
        <button
          onClick={() => setAberto(true)}
          className="rounded-full p-2.5 text-white/80 hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      </div>

      {/* Menu lateral fixo no computador */}
      <aside className="vidro fixed inset-y-3 left-3 z-30 hidden w-56 flex-col gap-5 rounded-[28px] p-3.5 lg:flex">
        <div className="space-y-2 px-1.5 pt-1.5">
          <Logo claro />
          <p className="flex items-center gap-1 text-xs text-white/45">
            <MapPin className="h-3 w-3" /> {LOJA.cidade} · {LOJA.uf}
          </p>
        </div>
        <Navegacao />
        <Rodape />
      </aside>

      {/* Gaveta no celular */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <aside className="vidro-forte absolute inset-y-3 left-3 flex w-64 flex-col gap-5 rounded-[28px] p-4">
            <div className="flex items-center justify-between px-1 pt-1">
              <Logo claro />
              <button
                onClick={() => setAberto(false)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10"
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
