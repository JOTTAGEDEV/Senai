"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, CalendarPlus, Car, MessageCircle, Phone, Sparkles } from "lucide-react";
import { ETAPAS, ETIQUETAS, IMPORTANCIAS, TEMPERATURAS, formatarTelefone, tempoRelativo } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import { formatarPreco } from "@/lib/format";
import type { DadosLead, Etapa, Importancia, Lead, Temperatura } from "@/lib/types";
import { Chip } from "./ui";

const CAMPOS_DADOS: { chave: keyof DadosLead; rotulo: string }[] = [
  { chave: "orcamento", rotulo: "Orçamento" },
  { chave: "pagamento", rotulo: "Pagamento" },
  { chave: "entrada", rotulo: "Entrada" },
  { chave: "carroTroca", rotulo: "Carro na troca" },
  { chave: "cidade", rotulo: "Cidade" },
  { chave: "melhorHorario", rotulo: "Melhor horário" },
];

/** Detalhes e etiquetas do lead. A IA analista preenche; o vendedor pode corrigir. */
export function PainelLead({ lead, mostrarLinkConversa = false }: { lead: Lead; mostrarLinkConversa?: boolean }) {
  const { atualizar, veiculos, vendedores } = useDados();
  const veiculo = veiculos.find((v) => v.id === lead.veiculoId);
  const salvar = (alteracoes: Partial<Lead>) => atualizar<Lead>("leads", lead.id, alteracoes);

  return (
    <div className="space-y-5 text-sm" key={lead.id}>
      <div className="flex flex-wrap items-center gap-2 text-zinc-600">
        <Phone className="h-3.5 w-3.5" />
        <a href={`https://wa.me/${lead.telefone}`} target="_blank" rel="noreferrer" className="hover:underline">
          {formatarTelefone(lead.telefone)}
        </a>
        <span className="text-zinc-300">·</span>
        <span>cliente há {tempoRelativo(lead.criadoEm)}</span>
      </div>

      {mostrarLinkConversa && (
        <Link href={`/conversas?lead=${lead.id}`} className="botao-secundario w-full">
          <MessageCircle className="h-4 w-4" /> Abrir conversa
        </Link>
      )}

      {/* Resumo da IA */}
      <Bloco titulo="Resumo da IA" icone={<Sparkles className="h-3.5 w-3.5 text-marca-600" />}>
        <TextoEditavel valor={lead.resumo} placeholder="A IA escreve um resumo da conversa aqui" onSalvar={(resumo) => salvar({ resumo })} linhas={3} />
        <p className="mt-2 text-xs font-medium text-zinc-500">Próxima ação</p>
        <TextoEditavel valor={lead.proximaAcao} placeholder="Ex.: ligar hoje à tarde" onSalvar={(proximaAcao) => salvar({ proximaAcao })} linhas={1} />
        {lead.analisadoEm && <p className="mt-1 text-[11px] text-zinc-400">Analisado há {tempoRelativo(lead.analisadoEm)}</p>}
      </Bloco>

      {/* Temperatura */}
      <Bloco titulo="Temperatura">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(TEMPERATURAS) as Temperatura[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => salvar({ temperatura: t })}
              aria-pressed={lead.temperatura === t}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                lead.temperatura === t ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {TEMPERATURAS[t].emoji} {TEMPERATURAS[t].rotulo}
            </button>
          ))}
        </div>
      </Bloco>

      {/* Etapa, importância, vendedor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`etapa-${lead.id}`}>Etapa</label>
          <select id={`etapa-${lead.id}`} className="campo py-1.5" value={lead.etapa} onChange={(e) => salvar({ etapa: e.target.value as Etapa })}>
            {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`imp-${lead.id}`}>Importância</label>
          <select id={`imp-${lead.id}`} className="campo py-1.5" value={lead.importancia} onChange={(e) => salvar({ importancia: e.target.value as Importancia })}>
            {(Object.keys(IMPORTANCIAS) as Importancia[]).map((i) => <option key={i} value={i}>{IMPORTANCIAS[i]}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`vend-${lead.id}`}>Vendedor responsável</label>
          <select id={`vend-${lead.id}`} className="campo py-1.5" value={lead.vendedorId ?? ""} onChange={(e) => salvar({ vendedorId: e.target.value || null })}>
            <option value="">Sem vendedor</option>
            {vendedores.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
        {lead.etapa === "perdido" && (
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">Motivo da perda</label>
            <TextoEditavel valor={lead.motivoPerda} placeholder="Ex.: achou caro, comprou em outro lugar" onSalvar={(motivoPerda) => salvar({ motivoPerda })} linhas={1} />
          </div>
        )}
      </div>

      {/* Etiquetas */}
      <Bloco titulo="Etiquetas">
        <div className="flex flex-wrap gap-1.5">
          {ETIQUETAS.map((e) => (
            <Chip
              key={e}
              ativo={lead.etiquetas.includes(e)}
              onClick={() =>
                salvar({ etiquetas: lead.etiquetas.includes(e) ? lead.etiquetas.filter((x) => x !== e) : [...lead.etiquetas, e] })
              }
            >
              {e}
            </Chip>
          ))}
        </div>
      </Bloco>

      {/* Carro de interesse */}
      <Bloco titulo="Carro de interesse" icone={<Car className="h-3.5 w-3.5 text-zinc-400" />}>
        <select className="campo py-1.5" value={lead.veiculoId ?? ""} onChange={(e) => salvar({ veiculoId: e.target.value || null })} aria-label="Carro de interesse">
          <option value="">Nenhum carro específico</option>
          {veiculos.filter((v) => v.status !== "oculto").map((v) => (
            <option key={v.id} value={v.id}>
              {v.marca} {v.modelo} {v.anoModelo} — {formatarPreco(v.preco)}
            </option>
          ))}
        </select>
        {veiculo && (
          <Link href={`/estoque/${veiculo.id}`} className="mt-1.5 inline-block text-xs text-marca-700 hover:underline">
            Ver ficha do {veiculo.modelo}
          </Link>
        )}
        <p className="mt-2 text-xs font-medium text-zinc-500">O que procura</p>
        <TextoEditavel valor={lead.interesse} placeholder="Ex.: SUV automático até 120 mil" onSalvar={(interesse) => salvar({ interesse })} linhas={1} />
      </Bloco>

      {/* Dados extraídos */}
      <Bloco titulo="Dados do cliente" icone={<Bot className="h-3.5 w-3.5 text-zinc-400" />}>
        <dl className="grid grid-cols-2 gap-2">
          {CAMPOS_DADOS.map(({ chave, rotulo }) => (
            <div key={chave}>
              <dt className="text-[11px] text-zinc-500">{rotulo}</dt>
              <dd>
                <TextoEditavel
                  valor={lead.dados[chave] ?? ""}
                  placeholder="—"
                  linhas={1}
                  compacto
                  onSalvar={(v) => salvar({ dados: { ...lead.dados, [chave]: v } })}
                />
              </dd>
            </div>
          ))}
        </dl>
      </Bloco>

      <Link href={`/agenda?novo=${lead.id}`} className="botao-secundario w-full">
        <CalendarPlus className="h-4 w-4" /> Agendar visita / test-drive
      </Link>
    </div>
  );
}

function Bloco({ titulo, icone, children }: { titulo: string; icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {icone}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/** Campo que salva ao sair (blur) — sem botão "Salvar". */
function TextoEditavel({
  valor,
  placeholder,
  onSalvar,
  linhas,
  compacto,
}: {
  valor: string;
  placeholder: string;
  onSalvar: (v: string) => void;
  linhas: number;
  compacto?: boolean;
}) {
  const [texto, setTexto] = useState(valor);
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    // valor mudou por fora (ex.: a IA atualizou): acompanha
    setAnterior(valor);
    setTexto(valor);
  }
  const classe = compacto
    ? "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none hover:border-zinc-200 focus:border-marca-500 focus:bg-white"
    : "campo resize-none";
  const salvar = () => texto.trim() !== valor && onSalvar(texto.trim());
  return linhas > 1 ? (
    <textarea rows={linhas} className={classe} value={texto} placeholder={placeholder} onChange={(e) => setTexto(e.target.value)} onBlur={salvar} />
  ) : (
    <input
      className={classe}
      value={texto}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
