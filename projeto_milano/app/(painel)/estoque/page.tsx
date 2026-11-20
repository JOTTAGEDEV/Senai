"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Car, Loader2, Plus, RotateCcw, Search, Star, Users } from "lucide-react";
import { FotoCapa } from "@/components/estoque/FotoCapa";
import { MenuAcoes } from "@/components/estoque/MenuAcoes";
import { StatusBadge } from "@/components/estoque/StatusBadge";
import { CARROCERIAS, DIAS_PARADO_ALERTA, STATUS } from "@/lib/constants";
import { useEstoque } from "@/lib/estoque-store";
import { diasDesde, formatarKm, formatarPreco, textoDias } from "@/lib/format";
import type { StatusVeiculo, Veiculo } from "@/lib/types";

type Ordem = "recentes" | "preco-asc" | "preco-desc" | "parados" | "interessados";

const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "preco-asc", rotulo: "Menor preço" },
  { valor: "preco-desc", rotulo: "Maior preço" },
  { valor: "parados", rotulo: "Mais tempo parado" },
  { valor: "interessados", rotulo: "Mais interessados" },
];

function ordenar(lista: Veiculo[], ordem: Ordem): Veiculo[] {
  const copia = [...lista];
  switch (ordem) {
    case "preco-asc":
      return copia.sort((a, b) => a.preco - b.preco);
    case "preco-desc":
      return copia.sort((a, b) => b.preco - a.preco);
    case "parados":
      return copia.sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada));
    case "interessados":
      return copia.sort((a, b) => b.interessados - a.interessados);
    default:
      return copia.sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  }
}

export default function EstoquePage() {
  const { veiculos, carregando, restaurarExemplos } = useEstoque();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusVeiculo | "todos" | "ativos">("ativos");
  const [marca, setMarca] = useState("");
  const [carroceria, setCarroceria] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  const marcasNoEstoque = useMemo(
    () => Array.from(new Set(veiculos.map((v) => v.marca).filter(Boolean))).sort(),
    [veiculos],
  );

  const resumo = useMemo(() => {
    const ativos = veiculos.filter((v) => v.status !== "vendido" && v.status !== "oculto");
    return {
      disponiveis: veiculos.filter((v) => v.status === "disponivel").length,
      reservados: veiculos.filter((v) => v.status === "reservado").length,
      preparacao: veiculos.filter((v) => v.status === "preparacao").length,
      parados: ativos.filter((v) => diasDesde(v.dataEntrada) >= DIAS_PARADO_ALERTA).length,
      valorTotal: ativos.reduce((soma, v) => soma + v.preco, 0),
    };
  }, [veiculos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = veiculos.filter((v) => {
      if (status === "ativos" && (v.status === "vendido" || v.status === "oculto")) return false;
      if (status !== "todos" && status !== "ativos" && v.status !== status) return false;
      if (marca && v.marca !== marca) return false;
      if (carroceria && v.carroceria !== carroceria) return false;
      if (termo) {
        const texto = `${v.marca} ${v.modelo} ${v.versao} ${v.cor} ${v.placa} ${v.anoModelo}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
    return ordenar(lista, ordem);
  }, [veiculos, busca, status, marca, carroceria, ordem]);

  if (carregando) {
    return (
      <div className="grid place-items-center py-24 text-white/35">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Estoque</h1>
          <p className="text-sm text-white/50">A IA consulta esta lista para responder os clientes.</p>
        </div>
        <Link href="/estoque/novo" className="botao-primario">
          <Plus className="h-4 w-4" /> Adicionar carro
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Resumo rotulo="Disponíveis" valor={resumo.disponiveis} ponto={STATUS.disponivel.ponto} />
        <Resumo rotulo="Reservados" valor={resumo.reservados} ponto={STATUS.reservado.ponto} />
        <Resumo rotulo="Em preparação" valor={resumo.preparacao} ponto={STATUS.preparacao.ponto} />
        <Resumo
          rotulo={`Parados +${DIAS_PARADO_ALERTA} dias`}
          valor={resumo.parados}
          alerta={resumo.parados > 0}
          onClick={() => {
            setStatus("ativos");
            setOrdem("parados");
          }}
        />
        <div className="cartao col-span-2 p-4 lg:col-span-1">
          <p className="text-xs font-medium text-white/50">Valor em estoque</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatarPreco(resumo.valorTotal)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="cartao flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            className="campo pl-9"
            placeholder="Buscar por modelo, versão, cor, placa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar no estoque"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
          <select className="campo lg:w-40" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrar por status">
            <option value="ativos">Ativos</option>
            <option value="todos">Todos os status</option>
            {(Object.keys(STATUS) as StatusVeiculo[]).map((s) => (
              <option key={s} value={s}>{STATUS[s].rotulo}</option>
            ))}
          </select>
          <select className="campo lg:w-44" value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Filtrar por marca">
            <option value="">Todas as marcas</option>
            {marcasNoEstoque.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="campo lg:w-36" value={carroceria} onChange={(e) => setCarroceria(e.target.value)} aria-label="Filtrar por carroceria">
            <option value="">Carroceria</option>
            {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="campo lg:w-44" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
            {ORDENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Car className="h-10 w-10 text-white/25" />
          <p className="font-medium text-white">
            {veiculos.length === 0 ? "Nenhum carro cadastrado ainda" : "Nenhum carro encontrado com esses filtros"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/estoque/novo" className="botao-primario">
              <Plus className="h-4 w-4" /> Adicionar carro
            </Link>
            {veiculos.length === 0 && (
              <button onClick={restaurarExemplos} className="botao-secundario">
                <RotateCcw className="h-4 w-4" /> Carregar exemplos
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Tabela (computador) */}
          <div className="cartao hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/50">
                <tr>
                  <th className="rounded-tl-xl px-4 py-3">Carro</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">No estoque</th>
                  <th className="px-4 py-3">Interessados</th>
                  <th className="rounded-tr-xl px-4 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtrados.map((v) => {
                  const dias = diasDesde(v.dataEntrada);
                  const parado = dias >= DIAS_PARADO_ALERTA && v.status !== "vendido";
                  return (
                    <tr key={v.id} className="transition hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link href={`/estoque/${v.id}`} className="flex items-center gap-3">
                          <FotoCapa fotos={v.fotos} className="h-12 w-16 shrink-0 rounded-md" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium text-white">
                              {v.marca} {v.modelo}
                              {v.destaque && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Destaque" />}
                            </p>
                            <p className="truncate text-xs text-white/50">
                              {[v.versao, `${v.anoFabricacao}/${v.anoModelo}`, formatarKm(v.km), v.cambio].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{formatarPreco(v.preco)}</p>
                        {v.fipe && v.preco < v.fipe && (
                          <p className="text-xs text-emerald-300">abaixo da FIPE</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${parado ? "font-medium text-amber-300" : "text-white/60"}`}>
                          {parado && <AlertTriangle className="h-3.5 w-3.5" />}
                          {textoDias(dias)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Interessados n={v.interessados} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MenuAcoes veiculo={v} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartões (celular) */}
          <div className="grid gap-3 md:hidden">
            {filtrados.map((v) => {
              const dias = diasDesde(v.dataEntrada);
              const parado = dias >= DIAS_PARADO_ALERTA && v.status !== "vendido";
              return (
                <div key={v.id} className="cartao flex gap-3 p-3">
                  <Link href={`/estoque/${v.id}`} className="shrink-0">
                    <FotoCapa fotos={v.fotos} className="h-20 w-24 rounded-md" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/estoque/${v.id}`} className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-white">
                          {v.marca} {v.modelo}
                          {v.destaque && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                        </p>
                        <p className="truncate text-xs text-white/50">
                          {v.anoFabricacao}/{v.anoModelo} · {formatarKm(v.km)}
                        </p>
                      </Link>
                      <MenuAcoes veiculo={v} />
                    </div>
                    <p className="mt-1 font-semibold text-white">{formatarPreco(v.preco)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <StatusBadge status={v.status} />
                      <span className={parado ? "font-medium text-amber-300" : "text-white/50"}>{textoDias(dias)}</span>
                      <Interessados n={v.interessados} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/50">
            Mostrando {filtrados.length} de {veiculos.length} carros. Os dados ficam salvos neste navegador até o back-end ser ligado.
          </p>
        </>
      )}
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
  ponto,
  alerta,
  onClick,
}: {
  rotulo: string;
  valor: number;
  ponto?: string;
  alerta?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`cartao p-4 text-left ${alerta ? "border-amber-400/40 bg-amber-500/15" : ""} ${onClick ? "transition hover:shadow-md" : ""}`}
    >
      <p className={`flex items-center gap-1.5 text-xs font-medium ${alerta ? "text-amber-200" : "text-white/50"}`}>
        {ponto && <span className={`h-2 w-2 rounded-full ${ponto}`} />}
        {alerta && <AlertTriangle className="h-3.5 w-3.5" />}
        {rotulo}
      </p>
      <p className={`mt-1 text-xl font-semibold ${alerta ? "text-amber-100" : "text-white"}`}>{valor}</p>
    </Tag>
  );
}

function Interessados({ n }: { n: number }) {
  if (n === 0) return <span className="text-white/35">—</span>;
  const quente = n >= 5;
  return (
    <span className={`inline-flex items-center gap-1 ${quente ? "font-medium text-rose-300" : "text-white/60"}`}>
      <Users className="h-3.5 w-3.5" />
      {n} {quente && "🔥"}
    </span>
  );
}
