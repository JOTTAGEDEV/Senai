"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Eye, EyeOff, KeyRound, RotateCcw, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import { useDados } from "@/lib/dados";
import { responderSimulado } from "@/lib/ia-simulada";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

type Provedor = "anthropic" | "gemini" | "deepseek";
interface Fala {
  autor: "cliente" | "ia" | "erro";
  texto: string;
  fotos?: string[];
  detalhe?: string;
}

const PROVEDORES: Provedor[] = ["anthropic", "gemini", "deepseek"];
const NOMES: Record<Provedor, string> = { anthropic: "Claude (Anthropic)", gemini: "Gemini (Google)", deepseek: "DeepSeek" };
const CHAVE_LOCAL = "milano:chaves-teste";

type Chaves = Record<Provedor, string>;
const SEM_CHAVES: Chaves = { anthropic: "", gemini: "", deepseek: "" };

function lerChaves(): Chaves {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? "{}");
    return { anthropic: salvo.anthropic ?? "", gemini: salvo.gemini ?? "", deepseek: salvo.deepseek ?? "" };
  } catch {
    return { ...SEM_CHAVES };
  }
}
const SUGESTOES = ["Oi, tem SUV automático até 150 mil?", "Quanto está o Taos?", "Manda foto da Ranger", "Aceita meu carro na troca?", "Faz um desconto à vista?", "Posso ir amanhã às 10h?"];

const leadTeste: Lead = {
  id: "teste", nome: "Cliente teste", telefone: "", veiculoId: null, interesse: "", temperatura: "morno", importancia: "normal",
  etapa: "atendimento", etiquetas: [], resumo: "", proximaAcao: "", dados: {}, atendente: "ia", vendedorId: null, naoLidas: 0,
  motivoPerda: "", ultimaMensagemEm: "", analisadoEm: null, criadoEm: "",
};

async function lerErro(erro: unknown): Promise<{ erro: string; detalhe?: string }> {
  const contexto = (erro as { context?: Response })?.context;
  if (contexto && typeof contexto.json === "function") {
    const corpo = await contexto.json().catch(() => null);
    if (corpo?.erro) return { erro: corpo.erro, detalhe: corpo.detalhe };
  }
  return { erro: erro instanceof Error ? erro.message : String(erro) };
}

export default function TestarIAPage() {
  const { modo, veiculos, config } = useDados();
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [disponiveis, setDisponiveis] = useState<Provedor[] | null>(null);
  const [provedor, setProvedor] = useState<Provedor | "">("");
  const [chaves, setChaves] = useState<Chaves>(SEM_CHAVES);
  const [mostrarChaves, setMostrarChaves] = useState(false);
  const [painelChaves, setPainelChaves] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const salvas = lerChaves();
    setChaves(salvas);
    if (!PROVEDORES.some((p) => salvas[p])) setPainelChaves(true);
  }, []);

  function mudarChave(qual: Provedor, valor: string) {
    const novas = { ...chaves, [qual]: valor.trim() };
    setChaves(novas);
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(novas));
    } catch {
      /* navegador sem armazenamento: a chave vale só nesta aba */
    }
    if (valor.trim() && !provedor) setProvedor(qual);
  }

  useEffect(() => {
    if (modo !== "supabase") return;
    supabase()
      .functions.invoke("testar-ia", { body: { status: true } })
      .then(({ data }) => {
        setDisponiveis(data?.disponiveis ?? []);
        if (data?.padrao) setProvedor(data.padrao);
      })
      .catch(() => setDisponiveis([]));
  }, [modo]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [falas, pensando]);

  async function enviar(mensagem: string) {
    const t = mensagem.trim();
    if (!t || pensando) return;
    setTexto("");
    const conversa = [...falas.filter((f) => f.autor !== "erro"), { autor: "cliente" as const, texto: t }];
    setFalas((f) => [...f, { autor: "cliente", texto: t }]);
    setPensando(true);
    try {
      if (modo === "local") {
        await new Promise((r) => setTimeout(r, 700));
        const r = responderSimulado(t, leadTeste, veiculos, config);
        setFalas((f) => [...f, { autor: "ia", texto: r.texto }]);
        return;
      }
      const { data, error } = await supabase().functions.invoke("testar-ia", {
        body: {
          conversa: conversa.map((f) => ({ autor: f.autor, texto: f.texto })),
          provedor: provedor || undefined,
          chaves: { anthropic: chaves.anthropic || undefined, gemini: chaves.gemini || undefined, deepseek: chaves.deepseek || undefined },
        },
      });
      if (error) {
        const e = await lerErro(error);
        setFalas((f) => [...f, { autor: "erro", texto: e.erro, detalhe: e.detalhe }]);
        return;
      }
      setFalas((f) => [...f, { autor: "ia", texto: data.texto ?? "(sem resposta)", fotos: data.fotos }]);
    } finally {
      setPensando(false);
    }
  }

  // IAs que dá para usar: as configuradas no servidor + as chaves coladas aqui
  const opcoes = PROVEDORES.filter((p) => disponiveis?.includes(p) || chaves[p]);
  const semChave = modo === "supabase" && disponiveis !== null && opcoes.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col gap-4 lg:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Sparkles className="h-6 w-6 text-rose-400" /> Testar IA
          </h1>
          <p className="text-sm text-white/50">
            Escreva como se fosse um cliente. {modo === "local" ? "Modo demonstração: respostas simuladas." : "A IA responde de verdade com o estoque — nada é enviado pelo WhatsApp nem gravado."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modo === "supabase" && opcoes.length > 0 && (
            <select className="campo w-48 py-1.5" value={provedor || opcoes[0]} onChange={(e) => setProvedor(e.target.value as Provedor)} aria-label="Qual IA">
              {opcoes.map((p) => <option key={p} value={p}>{NOMES[p]}</option>)}
            </select>
          )}
          <button onClick={() => setPainelChaves((a) => !a)} className="botao-secundario px-3 py-1.5" aria-expanded={painelChaves}>
            <KeyRound className="h-4 w-4" /> Chaves
          </button>
          <button onClick={() => setFalas([])} className="botao-secundario px-3 py-1.5" disabled={!falas.length}>
            <RotateCcw className="h-4 w-4" /> Limpar
          </button>
        </div>
      </div>

      {painelChaves && (
        <section className="cartao space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Chaves de API para teste</h2>
              <p className="text-xs text-white/50">
                Ficam salvas só neste navegador e vão junto com cada pergunta de teste. O servidor usa a chave só naquela resposta e não guarda.
                Para o WhatsApp de verdade, cadastre a chave no Supabase (Edge Functions → Secrets).
              </p>
            </div>
            <button onClick={() => setMostrarChaves((m) => !m)} className="botao-fantasma shrink-0 px-2 py-1 text-xs" aria-label={mostrarChaves ? "Ocultar chaves" : "Mostrar chaves"}>
              {mostrarChaves ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {(
            [
              ["anthropic", "Anthropic (Claude)", "sk-ant-...", "console.anthropic.com → API Keys"],
              ["gemini", "Google (Gemini)", "AIza...", "aistudio.google.com → Get API key"],
              ["deepseek", "DeepSeek", "sk-...", "platform.deepseek.com → API keys"],
            ] as const
          ).map(([qual, rotulo, exemplo, onde]) => (
            <div key={qual}>
              <label className="rotulo flex items-center justify-between" htmlFor={`chave-${qual}`}>
                <span>{rotulo}</span>
                <span className="text-[11px] font-normal text-white/35">{onde}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id={`chave-${qual}`}
                  type={mostrarChaves ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  className="campo font-mono text-xs"
                  placeholder={exemplo}
                  value={chaves[qual]}
                  onChange={(e) => mudarChave(qual, e.target.value)}
                />
                {chaves[qual] && (
                  <button onClick={() => mudarChave(qual, "")} className="botao-secundario shrink-0 px-2.5" aria-label={`Apagar chave ${rotulo}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {modo === "local" && (
            <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">No modo demonstração (sem Supabase) as chaves não são usadas: as respostas são simuladas.</p>
          )}
        </section>
      )}

      {semChave && !painelChaves && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
          Nenhuma chave de IA disponível. Clique em <strong>Chaves</strong> e cole a da Anthropic, do Google ou do DeepSeek para testar.
        </div>
      )}

      <div className="cartao flex-1 space-y-3 overflow-y-auto p-4">
        {falas.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-white/50">
            <Bot className="h-10 w-10 text-white/35" />
            <p>Comece com uma pergunta de cliente:</p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(s)} disabled={semChave} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80 shadow-sm backdrop-blur-md hover:bg-white/20 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {falas.map((f, i) =>
          f.autor === "erro" ? (
            <div key={i} className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
              {f.texto}
              {f.detalhe && <p className="mt-1 break-all font-mono text-[11px] text-rose-300">{f.detalhe}</p>}
            </div>
          ) : (
            <div key={i} className={`flex ${f.autor === "cliente" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${f.autor === "cliente" ? "rounded-tl-none border border-white/10 bg-white/10 text-white" : "rounded-tr-none border border-emerald-400/20 bg-emerald-500/20 text-emerald-50"}`}>
                <p className={`mb-0.5 flex items-center gap-1 text-[11px] font-semibold ${f.autor === "cliente" ? "text-white/50" : "text-emerald-200"}`}>
                  {f.autor === "cliente" ? <UserRound className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  {f.autor === "cliente" ? "Você (cliente)" : "Assistente IA"}
                </p>
                {f.fotos && f.fotos.length > 0 && (
                  <div className="mb-1.5 grid grid-cols-3 gap-1">
                    {f.fotos.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{f.texto}</p>
              </div>
            </div>
          ),
        )}
        {pensando && (
          <div className="flex justify-end">
            <div className="rounded-lg rounded-tr-none border border-emerald-400/20 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100 shadow-sm">digitando…</div>
          </div>
        )}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
        className="flex gap-2"
      >
        <input
          className="campo"
          placeholder="Escreva como se fosse o cliente..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={semChave}
          aria-label="Mensagem de teste"
        />
        <button type="submit" disabled={!texto.trim() || pensando || semChave} className="botao-primario shrink-0" aria-label="Enviar">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
