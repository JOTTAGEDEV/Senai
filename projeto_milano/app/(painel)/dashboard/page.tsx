"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Bot, CalendarDays, Car, Flame, MessageCircle, UserRound } from "lucide-react";
import { Carregando, TemperaturaBadge } from "@/components/crm/ui";
import { DIAS_PARADO_ALERTA } from "@/lib/constants";
import { ETAPAS, tempoRelativo } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import { diasDesde, formatarPreco } from "@/lib/format";
import type { Mensagem } from "@/lib/types";

const HORA = 3_600_000;

export default function DashboardPage() {
  const { leads, mensagens, agendamentos, veiculos, carregando, config } = useDados();

  const dados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const deHoje = (iso: string) => new Date(iso) >= hoje;

    const ultimaPorLead = new Map<string, Mensagem>();
    for (const m of mensagens) {
      const atual = ultimaPorLead.get(m.leadId);
      if (!atual || m.criadaEm > atual.criadaEm) ultimaPorLead.set(m.leadId, m);
    }

    const abertos = leads.filter((l) => l.etapa !== "vendido" && l.etapa !== "perdido");
    const conversasHoje = new Set(mensagens.filter((m) => m.autor === "cliente" && deHoje(m.criadaEm)).map((m) => m.leadId)).size;
    const respostasIAHoje = mensagens.filter((m) => m.autor === "ia" && deHoje(m.criadaEm)).length;
    const respostasHoje = mensagens.filter((m) => (m.autor === "ia" || m.autor === "vendedor") && deHoje(m.criadaEm)).length;
    const quentes = abertos.filter((l) => l.temperatura === "quente");
    const esperandoHumano = abertos.filter((l) => l.atendente === "humano" && ultimaPorLead.get(l.id)?.autor === "cliente");
    const visitas7 = agendamentos.filter((a) => {
      const t = new Date(a.inicio).getTime();
      return t >= Date.now() && t < Date.now() + 7 * 24 * HORA && a.status !== "cancelado";
    });

    // Funil: quantos leads chegaram em cada etapa (quem está numa etapa já passou pelas anteriores)
    const ordem = ETAPAS.filter((e) => e.valor !== "perdido").map((e) => e.valor);
    const funil = ordem.map((etapa, i) => ({
      rotulo: ETAPAS.find((e) => e.valor === etapa)!.rotulo,
      valor: leads.filter((l) => l.etapa !== "perdido" && ordem.indexOf(l.etapa) >= i).length,
    }));
    const perdidos = leads.filter((l) => l.etapa === "perdido").length;

    const maisProcurados = [...veiculos]
      .filter((v) => v.status !== "oculto")
      .sort((a, b) => b.interessados - a.interessados)
      .slice(0, 5)
      .map((v) => ({ id: v.id, rotulo: `${v.marca} ${v.modelo} ${v.anoModelo}`, valor: v.interessados }));

    const contagemEtiquetas = new Map<string, number>();
    for (const l of leads) for (const e of l.etiquetas) contagemEtiquetas.set(e, (contagemEtiquetas.get(e) ?? 0) + 1);
    const assuntos = [...contagemEtiquetas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([rotulo, valor]) => ({ rotulo, valor }));

    const alertas: { texto: string; href: string; tipo: "lead" | "carro" }[] = [];
    for (const l of quentes) {
      const ultima = ultimaPorLead.get(l.id);
      if (ultima?.autor === "cliente" && Date.now() - new Date(ultima.criadaEm).getTime() > 2 * HORA) {
        alertas.push({ texto: `${l.nome} (🔥 quente) está sem resposta há ${tempoRelativo(ultima.criadaEm)}`, href: `/conversas?lead=${l.id}`, tipo: "lead" });
      } else if (!l.vendedorId) {
        alertas.push({ texto: `${l.nome} está quente e ainda não tem vendedor`, href: `/conversas?lead=${l.id}`, tipo: "lead" });
      }
    }
    for (const v of veiculos) {
      const dias = diasDesde(v.dataEntrada);
      if (v.status === "disponivel" && dias >= DIAS_PARADO_ALERTA) {
        alertas.push({ texto: `${v.marca} ${v.modelo} parado há ${dias} dias — considere promoção`, href: `/estoque/${v.id}`, tipo: "carro" });
      }
    }

    const proximas = [...visitas7].sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 4);

    return {
      conversasHoje,
      respostasIAHoje,
      pctIA: respostasHoje ? Math.round((respostasIAHoje / respostasHoje) * 100) : 0,
      quentes,
      esperandoHumano,
      visitas7: visitas7.length,
      funil,
      perdidos,
      maisProcurados,
      assuntos,
      alertas,
      proximas,
    };
  }, [leads, mensagens, agendamentos, veiculos]);

  if (carregando) return <Carregando />;

  const saudacao = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="texto-metal text-4xl font-extrabold italic tracking-tight">{saudacao}!</h1>
        <p className="text-sm text-white/50">
          Resumo de hoje da {config.nome}. A IA está {config.ia.modo === "desligado" ? "desligada" : config.ia.modo === "sempre" ? "atendendo 24h" : "atendendo fora do horário da loja"}.
        </p>
      </div>

      {/* Números do dia */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador icone={<MessageCircle className="h-4 w-4" />} rotulo="Conversas hoje" valor={dados.conversasHoje} href="/conversas" />
        <Indicador icone={<Bot className="h-4 w-4" />} rotulo="Respostas da IA hoje" valor={dados.respostasIAHoje} detalhe={dados.pctIA ? `${dados.pctIA}% das respostas` : undefined} />
        <Indicador icone={<Flame className="h-4 w-4" />} rotulo="Leads quentes" valor={dados.quentes.length} href="/leads" />
        <Indicador icone={<CalendarDays className="h-4 w-4" />} rotulo="Visitas (7 dias)" valor={dados.visitas7} href="/agenda" />
        <Indicador
          icone={<UserRound className="h-4 w-4" />}
          rotulo="Esperando vendedor"
          valor={dados.esperandoHumano.length}
          alerta={dados.esperandoHumano.length > 0}
          href="/conversas"
        />
      </div>

      {/* Alertas */}
      {dados.alertas.length > 0 && (
        <section className="cartao p-5 ring-1 ring-inset ring-amber-400/25">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Atenção
          </h2>
          <ul className="space-y-1.5">
            {dados.alertas.map((a) => (
              <li key={a.texto}>
                <Link href={a.href} className="flex items-center gap-2 text-sm text-amber-100/90 hover:text-white hover:underline">
                  {a.tipo === "lead" ? <UserRound className="h-3.5 w-3.5 shrink-0" /> : <Car className="h-3.5 w-3.5 shrink-0" />}
                  {a.texto}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Funil de vendas" subtitulo={`Leads que chegaram em cada etapa · ${dados.perdidos} perdidos`}>
          <Barras itens={dados.funil} unidade="leads" />
        </Cartao>
        <Cartao titulo="Leads quentes" subtitulo="Prontos para fechar — priorize estes" acao={<Link href="/leads" className="text-xs text-white/60 hover:text-white">Ver todos</Link>}>
          {dados.quentes.length === 0 ? (
            <p className="text-sm text-white/50">Nenhum lead quente agora.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {dados.quentes.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link href={`/conversas?lead=${l.id}`} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/5">
                    <TemperaturaBadge t={l.temperatura} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{l.nome}</p>
                      <p className="truncate text-xs text-white/50">{l.proximaAcao || l.resumo}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-white/35">{tempoRelativo(l.ultimaMensagemEm)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao titulo="Carros mais procurados" subtitulo="Leads em aberto interessados em cada carro" acao={<Link href="/estoque" className="text-xs text-white/60 hover:text-white">Estoque</Link>}>
          <Barras itens={dados.maisProcurados} unidade="interessados" />
        </Cartao>
        <Cartao titulo="Assuntos mais frequentes" subtitulo="Etiquetas colocadas pela IA nas conversas">
          {dados.assuntos.length === 0 ? <p className="text-sm text-white/50">Sem etiquetas ainda.</p> : <Barras itens={dados.assuntos} unidade="leads" />}
        </Cartao>
      </div>

      <Cartao titulo="Próximos agendamentos" acao={<Link href="/agenda" className="text-xs text-white/60 hover:text-white">Agenda</Link>}>
        {dados.proximas.length === 0 ? (
          <p className="text-sm text-white/50">Nenhuma visita nos próximos 7 dias.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dados.proximas.map((a) => {
              const v = veiculos.find((x) => x.id === a.veiculoId);
              return (
                <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-medium capitalize text-white/50">
                    {new Date(a.inicio).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
                    {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{a.clienteNome}</p>
                  <p className="text-xs text-white/50">
                    {a.tipo === "test-drive" ? "Test-drive" : "Visita"}
                    {v ? ` · ${v.modelo}` : ""}
                    {v ? ` · ${formatarPreco(v.preco)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function Indicador({
  icone,
  rotulo,
  valor,
  detalhe,
  alerta,
  href,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
  detalhe?: string;
  alerta?: boolean;
  href?: string;
}) {
  const conteudo = (
    <>
      <p className={`flex items-center gap-1.5 text-xs font-medium ${alerta ? "text-amber-200" : "text-white/55"}`}>
        {icone}
        {rotulo}
      </p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${alerta ? "text-amber-100" : "text-white"}`}>{valor}</p>
      {detalhe && <p className="text-[11px] text-white/50">{detalhe}</p>}
    </>
  );
  const classe = `cartao block p-4 ${alerta ? "ring-1 ring-inset ring-amber-400/40 bg-amber-500/10" : ""} ${href ? "transition hover:-translate-y-0.5 hover:bg-white/[0.09]" : ""}`;
  return href ? <Link href={href} className={classe}>{conteudo}</Link> : <div className={classe}>{conteudo}</div>;
}

function Cartao({ titulo, subtitulo, acao, children }: { titulo: string; subtitulo?: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="cartao min-w-0 p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">{titulo}</h2>
          {subtitulo && <p className="text-xs text-white/50">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Barras horizontais de uma série só: rótulo à esquerda, valor em texto à direita. */
function Barras({ itens, unidade }: { itens: { rotulo: string; valor: number }[]; unidade: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i.rotulo} className="group grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm" title={`${i.rotulo}: ${i.valor} ${unidade}`}>
          <span className="truncate text-white/75">{i.rotulo}</span>
          <span className="h-2.5 rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-white/70 to-white shadow-[0_0_12px_rgba(255,255,255,0.25)] transition-[width] group-hover:from-marca-500 group-hover:to-marca-400"
              style={{ width: `${(i.valor / max) * 100}%`, minWidth: i.valor > 0 ? 6 : 0 }}
            />
          </span>
          <span className="text-right font-medium tabular-nums text-white">{i.valor}</span>
        </li>
      ))}
    </ul>
  );
}
