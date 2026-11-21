import { get, set } from "idb-keyval";
import { configLojaPadrao } from "./crm";
import { VEICULOS_EXEMPLO } from "./mock-data";
import { AGENDAMENTOS_EXEMPLO, LEADS_EXEMPLO, MENSAGENS_EXEMPLO, VENDEDORES_EXEMPLO } from "./mock-crm";
import { SUPABASE_ATIVO, supabase } from "./supabase";
import type { Foto } from "./types";

/**
 * Uma "fonte de dados" esconde de onde os dados vêm.
 * - Local: navegador (IndexedDB), com dados de exemplo — para demonstração.
 * - Supabase: banco de verdade, com login, tempo real e fotos no Storage.
 * As telas só conversam com a interface abaixo.
 */
export type Tabela = "veiculos" | "leads" | "mensagens" | "agendamentos" | "vendedores" | "configuracoes";

type Registro = { id: string } & Record<string, unknown>;

export interface FonteDados {
  modo: "local" | "supabase";
  listar<T>(tabela: Tabela): Promise<T[]>;
  inserir(tabela: Tabela, item: Registro): Promise<void>;
  atualizar(tabela: Tabela, id: string, alteracoes: Record<string, unknown>): Promise<void>;
  remover(tabela: Tabela, id: string): Promise<void>;
  /** Avisa quando a tabela mudar (outra aba, outro usuário ou o WhatsApp). Retorna a função para parar. */
  ouvir(tabela: Tabela, aoMudar: () => void): () => void;
  /** Envia mensagem de um vendedor para o cliente (no Supabase, sai pelo WhatsApp). */
  enviarMensagem(leadId: string, texto: string): Promise<void>;
  restaurarExemplos(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Local (IndexedDB)                                                    */
/* ------------------------------------------------------------------ */

const EXEMPLOS: Record<Tabela, () => Registro[]> = {
  veiculos: () => VEICULOS_EXEMPLO as unknown as Registro[],
  leads: () => LEADS_EXEMPLO as unknown as Registro[],
  mensagens: () => MENSAGENS_EXEMPLO as unknown as Registro[],
  agendamentos: () => AGENDAMENTOS_EXEMPLO as unknown as Registro[],
  vendedores: () => VENDEDORES_EXEMPLO as unknown as Registro[],
  configuracoes: () => [configLojaPadrao()] as unknown as Registro[],
};

const TABELAS = Object.keys(EXEMPLOS) as Tabela[];

function criarFonteLocal(): FonteDados {
  const chave = (t: Tabela) => `milano:v3:${t}`;
  const cache = new Map<Tabela, Registro[]>();
  const ouvintes = new Map<Tabela, Set<() => void>>();
  const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("milano-dados") : null;

  const avisar = (t: Tabela, remoto = false) => {
    ouvintes.get(t)?.forEach((f) => f());
    if (!remoto) canal?.postMessage(t);
  };
  if (canal) {
    canal.onmessage = (e: MessageEvent<Tabela>) => {
      cache.delete(e.data);
      avisar(e.data, true);
    };
  }

  async function ler(t: Tabela): Promise<Registro[]> {
    if (cache.has(t)) return cache.get(t)!;
    let dados = await get<Registro[]>(chave(t)).catch(() => undefined);
    if (!dados) {
      dados = structuredClone(EXEMPLOS[t]());
      await set(chave(t), dados).catch(() => undefined);
    }
    cache.set(t, dados);
    return dados;
  }

  async function gravar(t: Tabela, dados: Registro[]) {
    cache.set(t, dados);
    await set(chave(t), dados);
    avisar(t);
  }

  return {
    modo: "local",
    async listar<T>(t: Tabela) {
      return (await ler(t)) as unknown as T[];
    },
    async inserir(t, item) {
      await gravar(t, [item, ...(await ler(t))]);
    },
    async atualizar(t, id, alteracoes) {
      await gravar(t, (await ler(t)).map((r) => (r.id === id ? { ...r, ...alteracoes } : r)));
    },
    async remover(t, id) {
      await gravar(t, (await ler(t)).filter((r) => r.id !== id));
    },
    ouvir(t, aoMudar) {
      if (!ouvintes.has(t)) ouvintes.set(t, new Set());
      ouvintes.get(t)!.add(aoMudar);
      return () => ouvintes.get(t)?.delete(aoMudar);
    },
    async enviarMensagem(leadId, texto) {
      // Na demonstração a mensagem só é registrada (não sai para o WhatsApp)
      const agora = new Date().toISOString();
      await this.inserir("mensagens", {
        id: crypto.randomUUID(),
        leadId,
        autor: "vendedor",
        autorNome: "Você",
        texto,
        midiaUrl: null,
        criadaEm: agora,
      });
      await this.atualizar("leads", leadId, { atendente: "humano", ultimaMensagemEm: agora, naoLidas: 0 });
    },
    async restaurarExemplos() {
      for (const t of TABELAS) {
        cache.delete(t);
        await set(chave(t), structuredClone(EXEMPLOS[t]()));
        avisar(t);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Supabase                                                             */
/* ------------------------------------------------------------------ */

const TABELA_SQL: Record<Tabela, string> = {
  veiculos: "veiculos",
  leads: "leads",
  mensagens: "mensagens",
  agendamentos: "agendamentos",
  vendedores: "vendedores",
  configuracoes: "empresas",
};

// Campos cujo nome não segue a regra simples (sigla "IA" no fim)
const EXCECOES_SNAKE: Record<string, string> = { instrucoesIA: "instrucoes_ia" };
const EXCECOES_CAMEL: Record<string, string> = Object.fromEntries(Object.entries(EXCECOES_SNAKE).map(([c, s]) => [s, c]));

const paraSnake = (s: string) => EXCECOES_SNAKE[s] ?? s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
const paraCamel = (s: string) => EXCECOES_CAMEL[s] ?? s.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());

/** Converte só as chaves do primeiro nível (colunas). Campos JSON por dentro ficam como estão. */
function paraLinha(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [paraSnake(k), v]));
}
function deLinha(linha: Record<string, unknown>): Registro {
  const { empresa_id: _empresa, ...resto } = linha;
  void _empresa;
  return Object.fromEntries(Object.entries(resto).map(([k, v]) => [paraCamel(k), v])) as Registro;
}

function criarFonteSupabase(): FonteDados {
  const sb = supabase();
  let empresaId: string | null = null;
  // Trocou de conta na mesma aba: esquece a empresa guardada
  sb.auth.onAuthStateChange(() => {
    empresaId = null;
  });

  async function idEmpresa(): Promise<string> {
    if (empresaId) return empresaId;
    const { data, error } = await sb.from("empresas").select("id").limit(1).single();
    if (error) throw error;
    empresaId = data.id as string;
    return empresaId;
  }

  /** Fotos novas chegam como data URL: sobem para o Storage e viram link público. */
  async function subirFotos(veiculoId: string, fotos: Foto[] | undefined): Promise<Foto[] | undefined> {
    if (!fotos) return fotos;
    const empresa = await idEmpresa();
    return Promise.all(
      fotos.map(async (f) => {
        if (!f.src.startsWith("data:")) return f;
        const blob = await (await fetch(f.src)).blob();
        const extensao = blob.type.split("/")[1] ?? "webp";
        const caminho = `${empresa}/${veiculoId}/${f.id}.${extensao}`;
        const { error } = await sb.storage.from("fotos").upload(caminho, blob, { contentType: blob.type, upsert: false });
        if (error) throw error;
        const { data } = sb.storage.from("fotos").getPublicUrl(caminho);
        return { ...f, src: data.publicUrl };
      }),
    );
  }

  async function preparar(t: Tabela, id: string, dados: Record<string, unknown>) {
    if (t === "veiculos" && "fotos" in dados) {
      return { ...dados, fotos: await subirFotos(id, dados.fotos as Foto[]) };
    }
    return dados;
  }

  return {
    modo: "supabase",
    async listar<T>(t: Tabela) {
      // Mensagens: as 1000 mais RECENTES (o Supabase devolve no máximo 1000 linhas por consulta)
      if (t === "mensagens") {
        const { data, error } = await sb.from("mensagens").select("*").order("criada_em", { ascending: false }).limit(1000);
        if (error) throw error;
        return (data ?? []).reverse().map(deLinha) as unknown as T[];
      }
      const { data, error } = await sb.from(TABELA_SQL[t]).select("*").limit(1000);
      if (error) throw error;
      return (data ?? []).map(deLinha) as unknown as T[];
    },
    async inserir(t, item) {
      const dados = await preparar(t, item.id, item);
      const { error } = await sb.from(TABELA_SQL[t]).insert(paraLinha(dados));
      if (error) throw error;
    },
    async atualizar(t, id, alteracoes) {
      const dados = await preparar(t, id, alteracoes);
      const { error } = await sb.from(TABELA_SQL[t]).update(paraLinha(dados)).eq("id", id);
      if (error) throw error;
    },
    async remover(t, id) {
      const { error } = await sb.from(TABELA_SQL[t]).delete().eq("id", id);
      if (error) throw error;
    },
    ouvir(t, aoMudar) {
      const canal = sb
        .channel(`mudancas-${t}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: TABELA_SQL[t] }, () => aoMudar())
        .subscribe();
      return () => {
        sb.removeChannel(canal);
      };
    },
    async enviarMensagem(leadId, texto) {
      const { error } = await sb.functions.invoke("enviar-mensagem", { body: { leadId, texto } });
      if (error) throw error;
    },
    async restaurarExemplos() {
      throw new Error("No modo Supabase os dados de exemplo não são usados.");
    },
  };
}

let fonte: FonteDados | null = null;

export function fonteDados(): FonteDados {
  if (!fonte) fonte = SUPABASE_ATIVO ? criarFonteSupabase() : criarFonteLocal();
  return fonte;
}
