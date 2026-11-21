"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Bot, CalendarDays, Car, Clock, Phone, Plus, UserRound } from "lucide-react";
import { Carregando } from "@/components/crm/ui";
import { STATUS_AGENDAMENTO, formatarTelefone } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import type { Agendamento, Lead, StatusAgendamento, TipoAgendamento } from "@/lib/types";

export default function AgendaPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Agenda />
    </Suspense>
  );
}

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const chaveDia = (iso: string) => inicioDoDia(new Date(iso)).toISOString();

function Agenda() {
  const { agendamentos, veiculos, vendedores, leads, atualizar, carregando } = useDados();
  const params = useSearchParams();
  const router = useRouter();
  const leadNovo = params.get("novo");
  const [formAberto, setFormAberto] = useState(Boolean(leadNovo));
  const [vendedor, setVendedor] = useState("");
  const [mostrarPassados, setMostrarPassados] = useState(false);

  const grupos = useMemo(() => {
    const hoje = inicioDoDia(new Date()).getTime();
    const lista = agendamentos
      .filter((a) => (vendedor ? a.vendedorId === vendedor : true))
      .filter((a) => (mostrarPassados ? true : new Date(a.inicio).getTime() >= hoje))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    const mapa = new Map<string, Agendamento[]>();
    for (const a of lista) {
      const k = chaveDia(a.inicio);
      mapa.set(k, [...(mapa.get(k) ?? []), a]);
    }
    return [...mapa.entries()];
  }, [agendamentos, vendedor, mostrarPassados]);

  const hojeKey = inicioDoDia(new Date()).toISOString();
  const doDia = agendamentos.filter((a) => chaveDia(a.inicio) === hojeKey && a.status !== "cancelado").length;
  const proximos7 = agendamentos.filter((a) => {
    const t = new Date(a.inicio).getTime();
    return t >= Date.now() && t < Date.now() + 7 * 86_400_000 && a.status !== "cancelado";
  }).length;
  const pelaIA = agendamentos.filter((a) => a.origem === "ia").length;

  function fecharForm() {
    setFormAberto(false);
    if (leadNovo) router.replace("/agenda");
  }

  if (carregando) return <Carregando />;

  const tituloDia = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.round((inicioDoDia(d).getTime() - inicioDoDia(new Date()).getTime()) / 86_400_000);
    const nome = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    return diff === 0 ? `Hoje · ${nome}` : diff === 1 ? `Amanhã · ${nome}` : nome.charAt(0).toUpperCase() + nome.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agenda</h1>
          <p className="text-sm text-white/50">Visitas e test-drives. Os marcados pela IA aparecem aqui sozinhos.</p>
        </div>
        <button onClick={() => setFormAberto(true)} className="botao-primario">
          <Plus className="h-4 w-4" /> Novo agendamento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Numero rotulo="Hoje" valor={doDia} />
        <Numero rotulo="Próximos 7 dias" valor={proximos7} />
        <Numero rotulo="Marcados pela IA" valor={pelaIA} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className="campo w-48" value={vendedor} onChange={(e) => setVendedor(e.target.value)} aria-label="Filtrar por vendedor">
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={mostrarPassados} onChange={(e) => setMostrarPassados(e.target.checked)} />
          Mostrar passados
        </label>
      </div>

      {grupos.length === 0 ? (
        <div className="cartao flex flex-col items-center gap-2 p-12 text-center text-sm text-white/50">
          <CalendarDays className="h-8 w-8 text-white/25" />
          Nenhum agendamento.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="mb-2 text-sm font-semibold text-white/80">{tituloDia(dia)}</h2>
              <div className="cartao divide-y divide-white/10">
                {itens.map((a) => {
                  const v = veiculos.find((x) => x.id === a.veiculoId);
                  const vend = vendedores.find((x) => x.id === a.vendedorId);
                  return (
                    <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 sm:w-24">
                        <Clock className="h-4 w-4 text-white/40" />
                        <span className="text-lg font-semibold tabular-nums text-white">
                          {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                          {a.clienteNome}
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/70">
                            {a.tipo === "test-drive" ? "Test-drive" : "Visita"}
                          </span>
                          {a.origem === "ia" && (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 text-[11px] text-emerald-200">
                              <Bot className="h-3 w-3" /> pela IA
                            </span>
                          )}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {formatarTelefone(a.telefone)}</span>
                          {v && <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" /> {v.marca} {v.modelo} {v.anoModelo}</span>}
                          <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {vend?.nome ?? "Sem vendedor"}</span>
                        </p>
                        {a.observacao && <p className="mt-1 text-xs text-white/60">{a.observacao}</p>}
                      </div>
                      <select
                        className={`rounded-full border-0 px-3 py-1 text-xs font-medium ring-1 ring-inset [&>option]:bg-zinc-900 [&>option]:text-white ${STATUS_AGENDAMENTO[a.status].classe}`}
                        value={a.status}
                        onChange={(e) => atualizar<Agendamento>("agendamentos", a.id, { status: e.target.value as StatusAgendamento })}
                        aria-label="Status do agendamento"
                      >
                        {(Object.keys(STATUS_AGENDAMENTO) as StatusAgendamento[]).map((s) => (
                          <option key={s} value={s}>{STATUS_AGENDAMENTO[s].rotulo}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {formAberto && <FormAgendamento lead={leads.find((l) => l.id === leadNovo)} fechar={fecharForm} />}
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="cartao p-4">
      <p className="text-xs font-medium text-white/50">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{valor}</p>
    </div>
  );
}

function FormAgendamento({ lead, fechar }: { lead?: Lead; fechar: () => void }) {
  const { inserir, atualizar, veiculos, vendedores } = useDados();
  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [nome, setNome] = useState(lead?.nome ?? "");
  const [telefone, setTelefone] = useState(lead?.telefone ?? "");
  const [tipo, setTipo] = useState<TipoAgendamento>("visita");
  const [data, setData] = useState(amanha);
  const [hora, setHora] = useState("10:00");
  const [veiculoId, setVeiculoId] = useState(lead?.veiculoId ?? "");
  const [vendedorId, setVendedorId] = useState(lead?.vendedorId ?? "");
  const [observacao, setObservacao] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const inicio = new Date(`${data}T${hora}:00`).toISOString();
    await inserir<Agendamento>("agendamentos", {
      id: crypto.randomUUID(),
      leadId: lead?.id ?? null,
      clienteNome: nome.trim(),
      telefone: telefone.replace(/\D/g, ""),
      veiculoId: veiculoId || null,
      tipo,
      inicio,
      vendedorId: vendedorId || null,
      status: "agendado",
      origem: "manual",
      observacao: observacao.trim(),
      criadoEm: new Date().toISOString(),
    });
    if (lead && (lead.etapa === "novo" || lead.etapa === "atendimento" || lead.etapa === "qualificado")) {
      await atualizar<Lead>("leads", lead.id, { etapa: "visita" });
    }
    fechar();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={fechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="vidro-forte w-full max-w-lg space-y-4 rounded-3xl p-5">
        <h2 className="text-base font-semibold text-white">Novo agendamento</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="ag-nome">Cliente</label>
            <input id="ag-nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="ag-tel">WhatsApp</label>
            <input id="ag-tel" className="campo" required value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" />
          </div>
          <div>
            <label className="rotulo" htmlFor="ag-tipo">Tipo</label>
            <select id="ag-tipo" className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAgendamento)}>
              <option value="visita">Visita</option>
              <option value="test-drive">Test-drive</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="ag-vend">Vendedor</label>
            <select id="ag-vend" className="campo" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
              <option value="">Sem vendedor</option>
              {vendedores.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="ag-data">Data</label>
            <input id="ag-data" type="date" className="campo" required value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="ag-hora">Horário</label>
            <input id="ag-hora" type="time" className="campo" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="ag-carro">Carro</label>
            <select id="ag-carro" className="campo" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
              <option value="">Nenhum carro específico</option>
              {veiculos.filter((v) => v.status !== "vendido" && v.status !== "oculto").map((v) => (
                <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.anoModelo}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="ag-obs">Observação</label>
            <input id="ag-obs" className="campo" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: trazer o carro da troca" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={fechar} className="botao-secundario">Cancelar</button>
          <button type="submit" className="botao-primario">Agendar</button>
        </div>
      </form>
    </div>
  );
}
