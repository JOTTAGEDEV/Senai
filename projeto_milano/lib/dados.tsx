"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { configLojaPadrao, iaDeveAtender } from "./crm";
import { fonteDados, type Tabela } from "./fonte-dados";
import { responderSimulado } from "./ia-simulada";
import type { Agendamento, ConfigLoja, Lead, Mensagem, Veiculo, Vendedor } from "./types";

interface Estado {
  veiculos: Veiculo[];
  leads: Lead[];
  mensagens: Mensagem[];
  agendamentos: Agendamento[];
  vendedores: Vendedor[];
  configuracoes: ConfigLoja[];
}

const VAZIO: Estado = { veiculos: [], leads: [], mensagens: [], agendamentos: [], vendedores: [], configuracoes: [] };
const TABELAS = Object.keys(VAZIO) as Tabela[];

interface DadosContexto extends Omit<Estado, "configuracoes"> {
  config: ConfigLoja;
  modo: "local" | "supabase";
  carregando: boolean;
  erro: string | null;
  inserir: <T extends { id: string }>(tabela: Tabela, item: T) => Promise<void>;
  atualizar: <T>(tabela: Tabela, id: string, alteracoes: Partial<T>) => Promise<void>;
  remover: (tabela: Tabela, id: string) => Promise<void>;
  /** Vendedor responde pelo painel (a IA para naquela conversa) */
  enviarComoVendedor: (leadId: string, texto: string) => Promise<void>;
  /** Só na demonstração: simula o cliente mandando mensagem no WhatsApp */
  simularCliente: (leadId: string, texto: string) => Promise<void>;
  restaurarExemplos: () => Promise<void>;
}

const Contexto = createContext<DadosContexto | null>(null);

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const fonte = useMemo(() => fonteDados(), []);
  const [estado, setEstado] = useState<Estado>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const estadoRef = useRef(estado);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const recarregar = useCallback(
    async (t: Tabela) => {
      try {
        const lista = await fonte.listar(t);
        setEstado((e) => ({ ...e, [t]: lista }));
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    [fonte],
  );

  useEffect(() => {
    let ativo = true;
    Promise.all(TABELAS.map((t) => fonte.listar(t).then((lista) => [t, lista] as const)))
      .then((pares) => {
        if (ativo) setEstado(Object.fromEntries(pares) as unknown as Estado);
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => ativo && setCarregando(false));
    const pararTodos = TABELAS.map((t) => fonte.ouvir(t, () => recarregar(t)));
    return () => {
      ativo = false;
      pararTodos.forEach((parar) => parar());
    };
  }, [fonte, recarregar]);

  const valor = useMemo<DadosContexto>(() => {
    const executar = async (t: Tabela, acao: () => Promise<void>) => {
      try {
        await acao();
        setErro(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      } finally {
        await recarregar(t);
      }
    };

    const inserir = async <T extends { id: string }>(t: Tabela, item: T) => {
      setEstado((e) => ({ ...e, [t]: [item, ...(e[t] as unknown as T[])] }));
      await executar(t, () => fonte.inserir(t, item as unknown as { id: string } & Record<string, unknown>));
    };
    const atualizar = async <T,>(t: Tabela, id: string, alteracoes: Partial<T>) => {
      setEstado((e) => ({
        ...e,
        [t]: (e[t] as unknown as { id: string }[]).map((r) => (r.id === id ? { ...r, ...alteracoes } : r)),
      }));
      await executar(t, () => fonte.atualizar(t, id, alteracoes as Record<string, unknown>));
    };
    const remover = async (t: Tabela, id: string) => {
      setEstado((e) => ({ ...e, [t]: (e[t] as unknown as { id: string }[]).filter((r) => r.id !== id) }));
      await executar(t, () => fonte.remover(t, id));
    };

    const config = estado.configuracoes[0] ?? configLojaPadrao();

    // Interessados por carro = leads abertos que perguntaram dele (+ base dos dados de exemplo)
    const abertos = estado.leads.filter((l) => l.etapa !== "vendido" && l.etapa !== "perdido");
    const veiculos = estado.veiculos.map((v) => ({
      ...v,
      interessados: (v.interessados ?? 0) + abertos.filter((l) => l.veiculoId === v.id).length,
    }));

    return {
      ...estado,
      veiculos,
      config,
      modo: fonte.modo,
      carregando,
      erro,
      inserir,
      atualizar,
      remover,
      async enviarComoVendedor(leadId, texto) {
        await executar("mensagens", () => fonte.enviarMensagem(leadId, texto));
        await recarregar("leads");
      },
      async simularCliente(leadId, texto) {
        const agora = new Date().toISOString();
        const lead = estadoRef.current.leads.find((l) => l.id === leadId);
        if (!lead) return;
        await inserir<Mensagem>("mensagens", {
          id: crypto.randomUUID(),
          leadId,
          autor: "cliente",
          autorNome: lead.nome,
          texto,
          midiaUrl: null,
          criadaEm: agora,
        });
        await atualizar<Lead>("leads", leadId, { ultimaMensagemEm: agora, naoLidas: lead.naoLidas + 1 });

        if (lead.atendente !== "ia" || !iaDeveAtender(config.ia)) return;
        // Simula o tempo de resposta da IA
        await new Promise((r) => setTimeout(r, 1200));
        const atual = estadoRef.current;
        const leadAtual = atual.leads.find((l) => l.id === leadId) ?? lead;
        if (leadAtual.atendente !== "ia") return;
        const resposta = responderSimulado(texto, leadAtual, atual.veiculos, config);
        const quando = new Date().toISOString();
        await inserir<Mensagem>("mensagens", {
          id: crypto.randomUUID(),
          leadId,
          autor: "ia",
          autorNome: "Assistente IA",
          texto: resposta.texto,
          midiaUrl: null,
          criadaEm: quando,
        });
        await atualizar<Lead>("leads", leadId, {
          ...resposta.alteracoesLead,
          ultimaMensagemEm: quando,
          analisadoEm: quando,
        });
      },
      async restaurarExemplos() {
        await fonte.restaurarExemplos();
        await Promise.all(TABELAS.map(recarregar));
      },
    };
  }, [estado, carregando, erro, fonte, recarregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useDados precisa estar dentro de <DadosProvider>");
  return ctx;
}
