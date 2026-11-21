"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import { PainelLead } from "@/components/crm/PainelLead";
import { AtendenteBadge, Avatar, Carregando, EtapaBadge, TemperaturaBadge } from "@/components/crm/ui";
import { ETAPAS, ETIQUETAS, TEMPERATURAS, formatarTelefone, tempoRelativo } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import type { Etapa, Temperatura } from "@/lib/types";

export default function LeadsPage() {
  const { leads, veiculos, vendedores, carregando } = useDados();
  const [busca, setBusca] = useState("");
  const [temperatura, setTemperatura] = useState<Temperatura | "">("");
  const [etapa, setEtapa] = useState<Etapa | "abertos" | "">("abertos");
  const [etiqueta, setEtiqueta] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const abertos = leads.filter((l) => l.etapa !== "vendido" && l.etapa !== "perdido");
    return {
      quente: abertos.filter((l) => l.temperatura === "quente").length,
      morno: abertos.filter((l) => l.temperatura === "morno").length,
      frio: abertos.filter((l) => l.temperatura === "frio").length,
    };
  }, [leads]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (temperatura && l.temperatura !== temperatura) return false;
        if (etapa === "abertos" && (l.etapa === "vendido" || l.etapa === "perdido")) return false;
        if (etapa && etapa !== "abertos" && l.etapa !== etapa) return false;
        if (etiqueta && !l.etiquetas.includes(etiqueta)) return false;
        if (vendedor === "nenhum" && l.vendedorId) return false;
        if (vendedor && vendedor !== "nenhum" && l.vendedorId !== vendedor) return false;
        if (termo && !`${l.nome} ${l.telefone} ${l.interesse} ${l.resumo}`.toLowerCase().includes(termo)) return false;
        return true;
      })
      .sort((a, b) => {
        const peso = { quente: 0, morno: 1, frio: 2 } as const;
        return peso[a.temperatura] - peso[b.temperatura] || b.ultimaMensagemEm.localeCompare(a.ultimaMensagemEm);
      });
  }, [leads, busca, temperatura, etapa, etiqueta, vendedor]);

  const aberto = leads.find((l) => l.id === abertoId);
  const nomeVeiculo = (id: string | null) => {
    const v = veiculos.find((x) => x.id === id);
    return v ? `${v.modelo} ${v.anoModelo}` : null;
  };
  const nomeVendedor = (id: string | null) => vendedores.find((v) => v.id === id)?.nome;

  if (carregando) return <Carregando />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Leads</h1>
        <p className="text-sm text-white/50">Todos os clientes que chamaram no WhatsApp. A IA classifica; você pode corrigir.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(TEMPERATURAS) as Temperatura[]).map((t) => (
          <button
            key={t}
            onClick={() => setTemperatura(temperatura === t ? "" : t)}
            aria-pressed={temperatura === t}
            className={`cartao p-4 text-left transition hover:bg-white/10 ${temperatura === t ? "ring-2 ring-white/50" : ""}`}
          >
            <p className="text-xs font-medium text-white/50">
              {TEMPERATURAS[t].emoji} {TEMPERATURAS[t].rotulo}s
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">{contagem[t]}</p>
            <p className="text-[11px] text-white/35">em aberto</p>
          </button>
        ))}
      </div>

      <div className="cartao flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input className="campo pl-9" placeholder="Buscar nome, telefone ou assunto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar lead" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
          <select className="campo lg:w-44" value={etapa} onChange={(e) => setEtapa(e.target.value as typeof etapa)} aria-label="Etapa">
            <option value="abertos">Em aberto</option>
            <option value="">Todas as etapas</option>
            {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </select>
          <select className="campo lg:w-40" value={temperatura} onChange={(e) => setTemperatura(e.target.value as Temperatura | "")} aria-label="Temperatura">
            <option value="">Temperatura</option>
            {(Object.keys(TEMPERATURAS) as Temperatura[]).map((t) => <option key={t} value={t}>{TEMPERATURAS[t].rotulo}</option>)}
          </select>
          <select className="campo lg:w-44" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} aria-label="Etiqueta">
            <option value="">Etiqueta</option>
            {ETIQUETAS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select className="campo lg:w-40" value={vendedor} onChange={(e) => setVendedor(e.target.value)} aria-label="Vendedor">
            <option value="">Vendedor</option>
            <option value="nenhum">Sem vendedor</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao p-12 text-center text-sm text-white/50">Nenhum lead com esses filtros.</div>
      ) : (
        <div className="cartao divide-y divide-white/10 overflow-hidden">
          {filtrados.map((l) => (
            <button key={l.id} onClick={() => setAbertoId(l.id)} className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-white/5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 lg:w-64">
                <Avatar nome={l.nome} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{l.nome}</p>
                  <p className="text-xs text-white/50">{formatarTelefone(l.telefone)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 lg:w-56">
                <TemperaturaBadge t={l.temperatura} />
                <EtapaBadge e={l.etapa} />
                {l.importancia === "importante" && <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-400/30">Importante</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-white/70">{l.resumo || <span className="text-white/35">Sem resumo ainda</span>}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {nomeVeiculo(l.veiculoId) && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white/80">🚗 {nomeVeiculo(l.veiculoId)}</span>}
                  {l.etiquetas.map((e) => (
                    <span key={e} className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-200">{e}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-white/50 lg:w-48 lg:flex-col lg:items-end lg:gap-1">
                <AtendenteBadge a={l.atendente} />
                <span>{nomeVendedor(l.vendedorId) ?? "Sem vendedor"} · {tempoRelativo(l.ultimaMensagemEm)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-white/50">{filtrados.length} de {leads.length} leads</p>

      {aberto && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAbertoId(null)} />
          <aside className="vidro-forte absolute inset-y-2 right-2 w-[min(24rem,calc(100%-1rem))] overflow-y-auto rounded-3xl p-5">
            <div className="mb-4 flex items-start gap-3">
              <Avatar nome={aberto.nome} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{aberto.nome}</p>
                <Link href={`/conversas?lead=${aberto.id}`} className="inline-flex items-center gap-1 text-xs text-rose-300 hover:underline">
                  <MessageCircle className="h-3 w-3" /> Abrir conversa
                </Link>
              </div>
              <button onClick={() => setAbertoId(null)} className="rounded-full p-1 text-white/70 hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <PainelLead lead={aberto} />
          </aside>
        </div>
      )}
    </div>
  );
}
