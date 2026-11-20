"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, EyeOff, Lock, Sparkles, Star } from "lucide-react";
import {
  CAMBIOS,
  CARROCERIAS,
  CHECKLIST_ITENS,
  COMBUSTIVEIS,
  CONSERVACOES,
  CORES,
  MARCAS,
  MOTORES,
  OPCIONAIS,
  STATUS,
  TIPOS,
} from "@/lib/constants";
import { formatarKm, formatarPreco } from "@/lib/format";
import type { StatusVeiculo, VeiculoInput } from "@/lib/types";
import { GerenciadorFotos } from "./GerenciadorFotos";

interface Props {
  inicial: VeiculoInput;
  textoBotao: string;
  onSalvar: (dados: VeiculoInput) => void;
}

type Erros = Partial<Record<"marca" | "modelo" | "preco" | "anos", string>>;

function validar(v: VeiculoInput): Erros {
  const erros: Erros = {};
  if (!v.marca) erros.marca = "Escolha a marca";
  if (!v.modelo.trim()) erros.modelo = "Informe o modelo";
  if (!v.preco || v.preco <= 0) erros.preco = "Informe o preço anunciado";
  if (v.anoModelo < v.anoFabricacao) erros.anos = "O ano modelo não pode ser menor que o de fabricação";
  return erros;
}

function capitalizar(frase: string): string {
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

export function FormularioVeiculo({ inicial, textoBotao, onSalvar }: Props) {
  const [v, setV] = useState<VeiculoInput>(inicial);
  // Os erros só aparecem depois da primeira tentativa de salvar, e somem assim que o campo é corrigido
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const erros: Erros = tentouSalvar ? validar(v) : {};

  function campo<K extends keyof VeiculoInput>(chave: K, valor: VeiculoInput[K]) {
    setV((atual) => ({ ...atual, [chave]: valor }));
  }

  function numero(texto: string): number {
    const n = Number(texto);
    return Number.isNaN(n) ? 0 : n;
  }

  function numeroOuNulo(texto: string): number | null {
    if (texto.trim() === "") return null;
    const n = Number(texto);
    return Number.isNaN(n) ? null : n;
  }

  function alternarOpcional(nome: string) {
    campo(
      "opcionais",
      v.opcionais.includes(nome) ? v.opcionais.filter((o) => o !== nome) : [...v.opcionais, nome],
    );
  }

  function gerarDescricao() {
    // Simulação local. Quando o back-end existir, isto chama a IA de verdade.
    const condicao = CONSERVACOES.find((c) => c.valor === v.conservacao)?.rotulo.toLowerCase();
    const destaques = CHECKLIST_ITENS.filter((i) => !i.alerta && v.checklist[i.chave]).map((i) => i.rotulo.toLowerCase());
    const partes = [
      `${[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")} ${v.anoFabricacao}/${v.anoModelo}`.trim() +
        (v.cor ? `, cor ${v.cor.toLowerCase()}` : "") +
        `, com ${formatarKm(v.km)}.`,
      capitalizar(
        [v.cambio && `câmbio ${v.cambio.toLowerCase()}`, v.motor && `motor ${v.motor}`, v.combustivel && `combustível ${v.combustivel.toLowerCase()}`]
          .filter(Boolean)
          .join(", "),
      ) + ".",
      condicao ? `Estado de conservação ${condicao}.` : "",
      destaques.length ? `Diferenciais: ${destaques.join(", ")}.` : "",
      v.opcionais.length ? `Itens: ${v.opcionais.slice(0, 8).join(", ")}${v.opcionais.length > 8 ? " e mais" : ""}.` : "",
      v.garantiaMeses > 0 ? `Garantia de ${v.garantiaMeses} meses.` : "",
      v.aceitaFinanciamento || v.aceitaTroca
        ? capitalizar(
            [v.aceitaFinanciamento && "financiamos", v.aceitaTroca && "aceitamos seu carro na troca"].filter(Boolean).join(" e "),
          ) + "."
        : "",
    ];
    campo("descricao", partes.filter(Boolean).join(" "));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentouSalvar(true);
    if (Object.keys(validar(v)).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    onSalvar({ ...v, modelo: v.modelo.trim(), versao: v.versao.trim(), placa: v.placa.toUpperCase().trim() });
  }

  const anoAtual = new Date().getFullYear();
  const abaixoFipe = v.fipe && v.preco && v.preco < v.fipe ? v.fipe - v.preco : 0;

  return (
    <form onSubmit={enviar} className="space-y-6 pb-24" noValidate>
      {Object.keys(erros).length > 0 && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          Corrija os campos destacados: {Object.values(erros).join(" · ")}
        </div>
      )}

      {/* IDENTIFICAÇÃO */}
      <Secao titulo="Identificação" descricao="Os dados básicos que o cliente pergunta primeiro.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="rotulo" htmlFor="marca">Marca *</label>
            <select id="marca" className={`campo ${erros.marca ? "border-rose-400/50" : ""}`} value={v.marca} onChange={(e) => campo("marca", e.target.value)}>
              <option value="">Selecione</option>
              {MARCAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="modelo">Modelo *</label>
            <input id="modelo" className={`campo ${erros.modelo ? "border-rose-400/50" : ""}`} placeholder="Ex.: Onix" value={v.modelo} onChange={(e) => campo("modelo", e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="versao">Versão</label>
            <input id="versao" className="campo" placeholder="Ex.: LTZ 1.0 Turbo" value={v.versao} onChange={(e) => campo("versao", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo" htmlFor="anoFab">Ano fabricação</label>
              <input id="anoFab" type="number" min={1950} max={anoAtual + 1} className={`campo ${erros.anos ? "border-rose-400/50" : ""}`} value={v.anoFabricacao} onChange={(e) => campo("anoFabricacao", numero(e.target.value))} />
            </div>
            <div>
              <label className="rotulo" htmlFor="anoMod">Ano modelo</label>
              <input id="anoMod" type="number" min={1950} max={anoAtual + 2} className={`campo ${erros.anos ? "border-rose-400/50" : ""}`} value={v.anoModelo} onChange={(e) => campo("anoModelo", numero(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="rotulo" htmlFor="cor">Cor</label>
            <select id="cor" className="campo" value={v.cor} onChange={(e) => campo("cor", e.target.value)}>
              <option value="">Selecione</option>
              {CORES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="carroceria">Carroceria</label>
            <select id="carroceria" className="campo" value={v.carroceria} onChange={(e) => campo("carroceria", e.target.value)}>
              <option value="">Selecione</option>
              {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo flex items-center gap-1.5" htmlFor="placa">
              Placa <Interno />
            </label>
            <input id="placa" className="campo uppercase" maxLength={8} placeholder="ABC1D23" value={v.placa} onChange={(e) => campo("placa", e.target.value)} />
          </div>
        </div>
      </Secao>

      {/* TÉCNICO */}
      <Secao titulo="Dados técnicos">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="rotulo" htmlFor="km">Quilometragem</label>
            <input id="km" type="number" min={0} step={100} inputMode="numeric" className="campo" value={v.km} onChange={(e) => campo("km", numero(e.target.value))} />
          </div>
          <div>
            <label className="rotulo" htmlFor="cambio">Câmbio</label>
            <select id="cambio" className="campo" value={v.cambio} onChange={(e) => campo("cambio", e.target.value)}>
              <option value="">Selecione</option>
              {CAMBIOS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="combustivel">Combustível</label>
            <select id="combustivel" className="campo" value={v.combustivel} onChange={(e) => campo("combustivel", e.target.value)}>
              {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="motor">Motor</label>
            <select id="motor" className="campo" value={v.motor} onChange={(e) => campo("motor", e.target.value)}>
              <option value="">Selecione</option>
              {MOTORES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="portas">Portas</label>
            <select id="portas" className="campo" value={v.portas} onChange={(e) => campo("portas", numero(e.target.value))}>
              <option value={2}>2 portas</option>
              <option value={4}>4 portas</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <p className="rotulo">Opcionais</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OPCIONAIS.map((o) => (
              <Caixa key={o} marcado={v.opcionais.includes(o)} onChange={() => alternarOpcional(o)}>
                {o}
              </Caixa>
            ))}
          </div>
        </div>
      </Secao>

      {/* CONDIÇÃO */}
      <Secao titulo="Condição" descricao="A IA usa estes itens como argumento de venda.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="rotulo">Tipo</p>
            <Segmentado opcoes={TIPOS} valor={v.tipo} onChange={(t) => campo("tipo", t)} />
          </div>
          <div>
            <p className="rotulo">Estado de conservação</p>
            <Segmentado opcoes={CONSERVACOES} valor={v.conservacao} onChange={(c) => campo("conservacao", c)} />
          </div>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKLIST_ITENS.map((item) => (
            <Caixa
              key={item.chave}
              marcado={v.checklist[item.chave]}
              alerta={item.alerta}
              onChange={() => campo("checklist", { ...v.checklist, [item.chave]: !v.checklist[item.chave] })}
            >
              {item.rotulo}
            </Caixa>
          ))}
        </div>
        {v.checklist.leilaoSinistro && (
          <p className="mt-3 flex gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            A IA vai informar com transparência que o carro tem passagem por leilão/sinistro, se o cliente perguntar.
          </p>
        )}
        <div className="mt-6 max-w-xs">
          <label className="rotulo" htmlFor="garantia">Garantia (meses)</label>
          <input id="garantia" type="number" min={0} max={60} className="campo" value={v.garantiaMeses} onChange={(e) => campo("garantiaMeses", numero(e.target.value))} />
        </div>
      </Secao>

      {/* PREÇO */}
      <Secao titulo="Preço">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="rotulo" htmlFor="preco">Preço anunciado (R$) *</label>
            <input id="preco" type="number" min={0} step={100} inputMode="numeric" className={`campo ${erros.preco ? "border-rose-400/50" : ""}`} value={v.preco || ""} onChange={(e) => campo("preco", numero(e.target.value))} />
          </div>
          <div>
            <label className="rotulo" htmlFor="fipe">Valor FIPE (R$)</label>
            <input id="fipe" type="number" min={0} step={100} inputMode="numeric" className="campo" value={v.fipe ?? ""} onChange={(e) => campo("fipe", numeroOuNulo(e.target.value))} />
          </div>
          <div>
            <label className="rotulo flex items-center gap-1.5" htmlFor="minimo">
              Preço mínimo (R$) <Interno />
            </label>
            <input id="minimo" type="number" min={0} step={100} inputMode="numeric" className="campo" value={v.precoMinimo ?? ""} onChange={(e) => campo("precoMinimo", numeroOuNulo(e.target.value))} />
          </div>
          <div>
            <label className="rotulo flex items-center gap-1.5" htmlFor="custo">
              Custo de compra (R$) <Interno />
            </label>
            <input id="custo" type="number" min={0} step={100} inputMode="numeric" className="campo" value={v.custoCompra ?? ""} onChange={(e) => campo("custoCompra", numeroOuNulo(e.target.value))} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {abaixoFipe > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-300">
              {formatarPreco(abaixoFipe)} abaixo da FIPE — a IA usa isso como argumento
            </span>
          )}
          {v.custoCompra && v.preco > 0 && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">
              Margem: {formatarPreco(v.preco - v.custoCompra)} ({Math.round(((v.preco - v.custoCompra) / v.preco) * 100)}%)
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
          <Caixa marcado={v.aceitaFinanciamento} onChange={() => campo("aceitaFinanciamento", !v.aceitaFinanciamento)}>
            Aceita financiamento
          </Caixa>
          <Caixa marcado={v.aceitaTroca} onChange={() => campo("aceitaTroca", !v.aceitaTroca)}>
            Aceita carro na troca
          </Caixa>
        </div>
      </Secao>

      {/* DESCRIÇÃO */}
      <Secao titulo="Descrição e instruções">
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="rotulo mb-0" htmlFor="descricao">Descrição pública</label>
              <button type="button" onClick={gerarDescricao} className="botao-fantasma px-2 py-1 text-xs text-rose-300">
                <Sparkles className="h-3.5 w-3.5" /> Gerar descrição com IA
              </button>
            </div>
            <textarea id="descricao" rows={4} className="campo" placeholder="O que o cliente vai ler sobre este carro" value={v.descricao} onChange={(e) => campo("descricao", e.target.value)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="rotulo flex items-center gap-1.5" htmlFor="instrucoes">
                Instruções para a IA sobre este carro
              </label>
              <textarea id="instrucoes" rows={3} className="campo" placeholder="Ex.: destacar que é o mais econômico do estoque" value={v.instrucoesIA} onChange={(e) => campo("instrucoesIA", e.target.value)} />
            </div>
            <div>
              <label className="rotulo flex items-center gap-1.5" htmlFor="obs">
                Observações internas <Interno />
              </label>
              <textarea id="obs" rows={3} className="campo" placeholder="Ex.: pneu traseiro precisa trocar" value={v.observacoesInternas} onChange={(e) => campo("observacoesInternas", e.target.value)} />
            </div>
          </div>
        </div>
      </Secao>

      {/* FOTOS */}
      <Secao titulo="Fotos" descricao="Até 15 fotos. Escolha até 3 para a IA enviar no WhatsApp — cada foto enviada conta como uma mensagem na Meta.">
        <GerenciadorFotos fotos={v.fotos} onChange={(fotos) => campo("fotos", fotos)} />
        <div className="mt-6 max-w-xl">
          <label className="rotulo" htmlFor="video">Link de vídeo</label>
          <input id="video" type="url" className="campo" placeholder="YouTube, Instagram ou Google Drive" value={v.videoUrl} onChange={(e) => campo("videoUrl", e.target.value)} />
        </div>
      </Secao>

      {/* LINKS */}
      <Secao titulo="Links dos anúncios" descricao="A IA envia o link em vez de mandar todas as fotos.">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["site", "Site da loja"],
              ["olx", "OLX"],
              ["webmotors", "Webmotors"],
              ["instagram", "Instagram"],
            ] as const
          ).map(([chave, rotulo]) => (
            <div key={chave}>
              <label className="rotulo" htmlFor={`link-${chave}`}>{rotulo}</label>
              <input id={`link-${chave}`} type="url" className="campo" placeholder="https://" value={v.links[chave]} onChange={(e) => campo("links", { ...v.links, [chave]: e.target.value })} />
            </div>
          ))}
        </div>
      </Secao>

      {/* STATUS */}
      <Secao titulo="Status e destaque">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(STATUS) as StatusVeiculo[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => campo("status", s)}
              className={`rounded-lg border p-3 text-left transition ${
                v.status === s ? "border-marca-500/60 bg-marca-500/15 ring-2 ring-marca-500/20" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className={`h-2 w-2 rounded-full ${STATUS[s].ponto}`} />
                {STATUS[s].rotulo}
                {s === "oculto" && <EyeOff className="h-3.5 w-3.5 text-white/35" />}
              </span>
              <span className="mt-1 block text-xs text-white/50">{STATUS[s].descricaoIA}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <Caixa marcado={v.destaque} onChange={() => campo("destaque", !v.destaque)}>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" /> Destaque / promoção (a IA oferece primeiro)
            </span>
          </Caixa>
          <div>
            <label className="rotulo" htmlFor="entrada">Data de entrada no estoque</label>
            <input id="entrada" type="date" className="campo" value={v.dataEntrada} onChange={(e) => campo("dataEntrada", e.target.value)} />
          </div>
        </div>
      </Secao>

      {/* BARRA FIXA */}
      <div className="vidro-forte fixed bottom-3 left-3 right-3 z-20 rounded-2xl lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/estoque" className="botao-secundario">Cancelar</Link>
          <button type="submit" className="botao-primario">{textoBotao}</button>
        </div>
      </div>
    </form>
  );
}

/* ---------- peças do formulário ---------- */

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-white/50">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Interno() {
  return (
    <span title="A IA não vê este campo" className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/50">
      <Lock className="h-2.5 w-2.5" /> interno
    </span>
  );
}

function Caixa({
  marcado,
  onChange,
  alerta,
  children,
}: {
  marcado: boolean;
  onChange: () => void;
  alerta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
        marcado
          ? alerta
            ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
            : "border-marca-500/40 bg-marca-500/15 text-white"
          : "border-white/10 text-white/70 hover:bg-white/5"
      }`}
    >
      <input type="checkbox" checked={marcado} onChange={onChange} className="h-4 w-4 accent-marca-600" />
      {children}
    </label>
  );
}

function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-white/10 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          aria-pressed={valor === o.valor}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            valor === o.valor ? "bg-white/20 text-white shadow-sm ring-1 ring-white/20" : "text-white/60 hover:text-white"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
