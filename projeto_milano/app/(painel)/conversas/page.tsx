"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, Info, MessageCirclePlus, Search, Send, UserRound, X } from "lucide-react";
import { PainelLead } from "@/components/crm/PainelLead";
import { AtendenteBadge, Avatar, Carregando, TemperaturaBadge } from "@/components/crm/ui";
import { formatarTelefone, iaDeveAtender, tempoRelativo } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import type { Lead, Mensagem } from "@/lib/types";

type Filtro = "todas" | "nao-lidas" | "ia" | "humano" | "quentes";

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "nao-lidas", rotulo: "Não lidas" },
  { valor: "quentes", rotulo: "🔥 Quentes" },
  { valor: "ia", rotulo: "IA" },
  { valor: "humano", rotulo: "Vendedor" },
];

export default function ConversasPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conversas />
    </Suspense>
  );
}

function Conversas() {
  const { leads, mensagens, carregando, atualizar, config, modo } = useDados();
  const params = useSearchParams();
  const router = useRouter();
  const selecionadoId = params.get("lead");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [novaConversa, setNovaConversa] = useState(false);

  const ultimaPorLead = useMemo(() => {
    const mapa = new Map<string, Mensagem>();
    for (const m of mensagens) {
      const atual = mapa.get(m.leadId);
      if (!atual || m.criadaEm > atual.criadaEm) mapa.set(m.leadId, m);
    }
    return mapa;
  }, [mensagens]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (filtro === "nao-lidas" && l.naoLidas === 0) return false;
        if (filtro === "ia" && l.atendente !== "ia") return false;
        if (filtro === "humano" && l.atendente !== "humano") return false;
        if (filtro === "quentes" && l.temperatura !== "quente") return false;
        if (termo && !`${l.nome} ${l.telefone} ${l.interesse}`.toLowerCase().includes(termo)) return false;
        return true;
      })
      .sort((a, b) => b.ultimaMensagemEm.localeCompare(a.ultimaMensagemEm));
  }, [leads, busca, filtro]);

  const selecionado = leads.find((l) => l.id === selecionadoId) ?? null;

  // Ao abrir uma conversa, zera as não lidas
  useEffect(() => {
    if (selecionado && selecionado.naoLidas > 0) void atualizar<Lead>("leads", selecionado.id, { naoLidas: 0 });
  }, [selecionado, atualizar]);

  const abrir = (id: string | null) => router.replace(id ? `/conversas?lead=${id}` : "/conversas", { scroll: false });

  if (carregando) return <Carregando />;

  const iaAgora = iaDeveAtender(config.ia);

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-57px)] overflow-hidden border-zinc-200 bg-white sm:-mx-6 lg:-mx-8 lg:-my-8 lg:h-dvh">
      {/* LISTA */}
      <aside className={`flex w-full shrink-0 flex-col border-r border-zinc-200 md:w-80 ${selecionado ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-zinc-900">Conversas</h1>
            {modo === "local" && (
              <button onClick={() => setNovaConversa(true)} className="botao-fantasma px-2 py-1 text-xs" title="Simular um cliente novo chamando no WhatsApp">
                <MessageCirclePlus className="h-4 w-4" /> Simular cliente
              </button>
            )}
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
              config.ia.modo === "desligado" ? "bg-zinc-100 text-zinc-600" : iaAgora ? "bg-zinc-900 text-white" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <Bot className="h-3.5 w-3.5 shrink-0" />
            {config.ia.modo === "desligado"
              ? "IA desligada"
              : iaAgora
                ? "IA atendendo agora"
                : "Loja aberta: a IA volta a atender quando a loja fechar"}
            <Link href="/configuracoes#ia" className="ml-auto underline-offset-2 hover:underline">
              Ajustar
            </Link>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input className="campo py-1.5 pl-8" placeholder="Buscar nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar conversa" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  filtro === f.valor ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {lista.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">Nenhuma conversa.</li>}
          {lista.map((l) => {
            const ultima = ultimaPorLead.get(l.id);
            return (
              <li key={l.id}>
                <button
                  onClick={() => abrir(l.id)}
                  className={`flex w-full gap-3 border-b border-zinc-100 px-3 py-3 text-left transition ${
                    l.id === selecionadoId ? "bg-zinc-100" : "hover:bg-zinc-50"
                  }`}
                >
                  <Avatar nome={l.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${l.naoLidas ? "font-semibold text-zinc-900" : "font-medium text-zinc-800"}`}>{l.nome}</p>
                      <span className={`shrink-0 text-[11px] ${l.naoLidas ? "font-semibold text-milano-verde" : "text-zinc-400"}`}>
                        {tempoRelativo(l.ultimaMensagemEm)}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
                      {ultima?.autor === "ia" && <Bot className="h-3 w-3 shrink-0" />}
                      {ultima?.autor === "vendedor" && <UserRound className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{ultima?.texto ?? "—"}</span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <TemperaturaBadge t={l.temperatura} />
                      {l.atendente === "humano" && <span className="text-[11px] text-emerald-700">vendedor</span>}
                      {l.naoLidas > 0 && (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-milano-verde px-1 text-[11px] font-semibold text-white">
                          {l.naoLidas}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* CHAT */}
      <section className={`min-w-0 flex-1 flex-col ${selecionado ? "flex" : "hidden md:flex"}`}>
        {selecionado ? (
          <Chat lead={selecionado} voltar={() => abrir(null)} abrirDetalhes={() => setDetalhesAbertos(true)} />
        ) : (
          <div className="grid flex-1 place-items-center bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            <div>
              <MessageCirclePlus className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              Escolha uma conversa ao lado.
            </div>
          </div>
        )}
      </section>

      {/* DETALHES */}
      {selecionado && (
        <>
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-zinc-200 p-4 xl:block">
            <PainelLead lead={selecionado} />
          </aside>
          {detalhesAbertos && (
            <div className="fixed inset-0 z-40 xl:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setDetalhesAbertos(false)} />
              <aside className="absolute inset-y-0 right-0 w-[min(22rem,100%)] overflow-y-auto bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-zinc-900">{selecionado.nome}</p>
                  <button onClick={() => setDetalhesAbertos(false)} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Fechar detalhes">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <PainelLead lead={selecionado} />
              </aside>
            </div>
          )}
        </>
      )}

      {novaConversa && <NovaConversa fechar={() => setNovaConversa(false)} abrir={abrir} />}
    </div>
  );
}

function Chat({ lead, voltar, abrirDetalhes }: { lead: Lead; voltar: () => void; abrirDetalhes: () => void }) {
  const { mensagens, atualizar, enviarComoVendedor, simularCliente, modo } = useDados();
  const [texto, setTexto] = useState("");
  const [comoCliente, setComoCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const doLead = useMemo(
    () => mensagens.filter((m) => m.leadId === lead.id).sort((a, b) => a.criadaEm.localeCompare(b.criadaEm)),
    [mensagens, lead.id],
  );

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [doLead.length, lead.id]);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto("");
    setEnviando(true);
    if (comoCliente) await simularCliente(lead.id, t);
    else await enviarComoVendedor(lead.id, t);
    setEnviando(false);
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2.5 sm:px-4">
        <button onClick={voltar} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 md:hidden" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar nome={lead.nome} tamanho="h-9 w-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{lead.nome}</p>
          <p className="truncate text-xs text-zinc-500">{formatarTelefone(lead.telefone)}</p>
        </div>
        <span className="hidden sm:block">
          <AtendenteBadge a={lead.atendente} />
        </span>
        {lead.atendente === "ia" ? (
          <button onClick={() => atualizar<Lead>("leads", lead.id, { atendente: "humano" })} className="botao-primario px-3 py-1.5 text-xs">
            Assumir
          </button>
        ) : (
          <button onClick={() => atualizar<Lead>("leads", lead.id, { atendente: "ia" })} className="botao-secundario px-3 py-1.5 text-xs">
            <Bot className="h-3.5 w-3.5" /> Devolver para IA
          </button>
        )}
        <button onClick={abrirDetalhes} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 xl:hidden" aria-label="Detalhes do lead">
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#f0ebe4] px-3 py-4 sm:px-6">
        {doLead.map((m, i) => {
          const dia = new Date(m.criadaEm).toLocaleDateString("pt-BR");
          const diaAnterior = i > 0 ? new Date(doLead[i - 1].criadaEm).toLocaleDateString("pt-BR") : null;
          return (
            <div key={m.id}>
              {dia !== diaAnterior && (
                <p className="my-3 text-center">
                  <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-zinc-500 shadow-sm">{dia}</span>
                </p>
              )}
              <Bolha m={m} />
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      <form onSubmit={enviar} className="border-t border-zinc-200 bg-white p-3">
        {modo === "local" && (
          <div className="mb-2 flex gap-1 text-xs">
            <button type="button" onClick={() => setComoCliente(false)} className={`rounded-full px-2.5 py-1 ${!comoCliente ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
              Responder como vendedor
            </button>
            <button type="button" onClick={() => setComoCliente(true)} className={`rounded-full px-2.5 py-1 ${comoCliente ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>
              Simular mensagem do cliente
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            placeholder={comoCliente ? `Escreva como se fosse ${lead.nome.split(" ")[0]}...` : "Escreva uma mensagem"}
            className="campo max-h-32 min-h-[40px] resize-none"
            aria-label="Mensagem"
          />
          <button type="submit" disabled={!texto.trim() || enviando} className="botao-primario h-10 w-10 shrink-0 p-0" aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </div>
        {!comoCliente && lead.atendente === "ia" && (
          <p className="mt-1.5 text-[11px] text-zinc-500">Ao responder, você assume a conversa e a IA para de responder este cliente.</p>
        )}
        {comoCliente && (
          <p className="mt-1.5 text-[11px] text-zinc-500">Demonstração: simula o cliente escrevendo no WhatsApp para ver a IA responder.</p>
        )}
      </form>
    </>
  );
}

function Bolha({ m }: { m: Mensagem }) {
  const hora = new Date(m.criadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (m.autor === "sistema") {
    return <p className="text-center text-[11px] text-zinc-500">{m.texto}</p>;
  }
  const doCliente = m.autor === "cliente";
  return (
    <div className={`flex ${doCliente ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm shadow-sm sm:max-w-[70%] ${
          doCliente ? "rounded-tl-none bg-white text-zinc-900" : m.autor === "ia" ? "rounded-tr-none bg-[#dcf8c6] text-zinc-900" : "rounded-tr-none bg-[#d1e7ff] text-zinc-900"
        }`}
      >
        {!doCliente && (
          <p className={`mb-0.5 flex items-center gap-1 text-[11px] font-semibold ${m.autor === "ia" ? "text-emerald-800" : "text-sky-800"}`}>
            {m.autor === "ia" ? <Bot className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
            {m.autorNome || (m.autor === "ia" ? "Assistente IA" : "Vendedor")}
          </p>
        )}
        {m.midiaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.midiaUrl} alt="" className="mb-1 max-h-56 rounded" />
        )}
        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
        <p className="mt-0.5 text-right text-[10px] text-zinc-500">{hora}</p>
      </div>
    </div>
  );
}

function NovaConversa({ fechar, abrir }: { fechar: () => void; abrir: (id: string) => void }) {
  const { inserir, simularCliente, modo } = useDados();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("Oi, vocês têm SUV automático?");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const agora = new Date().toISOString();
    const id = crypto.randomUUID();
    await inserir<Lead>("leads", {
      id,
      nome: nome.trim() || "Cliente",
      telefone: "55" + telefone.replace(/\D/g, ""),
      veiculoId: null,
      interesse: "",
      temperatura: "morno",
      importancia: "normal",
      etapa: "novo",
      etiquetas: [],
      resumo: "",
      proximaAcao: "",
      dados: {},
      atendente: "ia",
      vendedorId: null,
      naoLidas: 0,
      motivoPerda: "",
      ultimaMensagemEm: agora,
      analisadoEm: null,
      criadoEm: agora,
    });
    fechar();
    abrir(id);
    await simularCliente(id, mensagem.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={fechar}>
      <form onSubmit={criar} onClick={(e) => e.stopPropagation()} className="cartao w-full max-w-md space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Simular cliente novo</h2>
          <p className="text-sm text-zinc-500">
            {modo === "local"
              ? "Cria uma conversa como se um cliente tivesse chamado no WhatsApp, para ver a IA atendendo."
              : "No modo real, as conversas chegam sozinhas pelo WhatsApp. Use isto só para testes."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="nc-nome">Nome</label>
            <input id="nc-nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Carla" />
          </div>
          <div>
            <label className="rotulo" htmlFor="nc-tel">WhatsApp</label>
            <input id="nc-tel" className="campo" required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="48 99999-0000" inputMode="tel" />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="nc-msg">Primeira mensagem</label>
          <textarea id="nc-msg" className="campo" rows={2} required value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={fechar} className="botao-secundario">Cancelar</button>
          <button type="submit" className="botao-primario">Criar conversa</button>
        </div>
      </form>
    </div>
  );
}
