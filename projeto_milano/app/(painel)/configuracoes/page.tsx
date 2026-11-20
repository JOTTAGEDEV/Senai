"use client";

import { useState } from "react";
import { Bot, CheckCircle2, CircleDashed, MapPin, Plus, RotateCcw, Save, Store, Trash2, Users, Wifi } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Carregando } from "@/components/crm/ui";
import { DIAS_SEMANA, iaDeveAtender } from "@/lib/crm";
import { useDados } from "@/lib/dados";
import type { ConfigIA, ConfigLoja, ModoIA, Vendedor } from "@/lib/types";

export default function ConfiguracoesPage() {
  const { carregando, config } = useDados();
  if (carregando) return <Carregando />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-white/50">Dados da loja, regras da IA, vendedores e conexão com o WhatsApp.</p>
      </div>
      <DadosLoja key={`loja-${config.id}`} config={config} />
      <ConfiguracaoIA key={`ia-${config.id}`} config={config} />
      <Vendedores />
      <Conexao />
    </div>
  );
}

function Secao({ id, icone, titulo, descricao, children }: { id?: string; icone: React.ReactNode; titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section id={id} className="cartao scroll-mt-6 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-marca-500/15 text-rose-400">{icone}</div>
        <div>
          <h2 className="text-base font-semibold text-white">{titulo}</h2>
          <p className="text-sm text-white/50">{descricao}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function BotaoSalvar({ salvo, alterado }: { salvo: boolean; alterado: boolean }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-3">
      {salvo && !alterado && (
        <span className="flex items-center gap-1 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Salvo
        </span>
      )}
      <button type="submit" disabled={!alterado} className="botao-primario">
        <Save className="h-4 w-4" /> Salvar
      </button>
    </div>
  );
}

/* ---------------- Dados da loja ---------------- */

function DadosLoja({ config }: { config: ConfigLoja }) {
  const { atualizar } = useDados();
  const [form, setForm] = useState({
    nome: config.nome,
    endereco: config.endereco,
    cidade: config.cidade,
    uf: config.uf,
    whatsapp: config.whatsapp,
    instagram: config.instagram,
  });
  const [salvo, setSalvo] = useState(false);
  const alterado = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== config[k]);
  const campo = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [k]: e.target.value });
      setSalvo(false);
    },
  });

  return (
    <Secao icone={<Store className="h-5 w-5" />} titulo="Dados da loja" descricao="A IA usa estes dados para responder endereço e contato.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await atualizar<ConfigLoja>("configuracoes", config.id, form);
          setSalvo(true);
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="rotulo" htmlFor="l-nome">Nome</label>
              <input id="l-nome" className="campo" required {...campo("nome")} />
            </div>
            <div className="sm:col-span-2">
              <label className="rotulo" htmlFor="l-end">Endereço</label>
              <input id="l-end" className="campo" {...campo("endereco")} />
            </div>
            <div>
              <label className="rotulo" htmlFor="l-cid">Cidade</label>
              <input id="l-cid" className="campo" {...campo("cidade")} />
            </div>
            <div>
              <label className="rotulo" htmlFor="l-uf">UF</label>
              <input id="l-uf" className="campo uppercase" maxLength={2} {...campo("uf")} />
            </div>
            <div>
              <label className="rotulo flex items-center gap-1.5" htmlFor="l-wpp">
                WhatsApp {!form.whatsapp && <Pendente />}
              </label>
              <input id="l-wpp" className="campo" placeholder="(48) 99999-0000" {...campo("whatsapp")} />
            </div>
            <div>
              <label className="rotulo flex items-center gap-1.5" htmlFor="l-insta">
                Instagram {!form.instagram && <Pendente />}
              </label>
              <input id="l-insta" className="campo" placeholder="@milanomultimarcas" {...campo("instagram")} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid h-28 place-items-center rounded-2xl bg-black/40 ring-1 ring-inset ring-white/10 backdrop-blur-md">
              <Logo claro className="h-16" />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.nome}, ${form.endereco}, ${form.cidade} ${form.uf}`)}`}
              target="_blank"
              rel="noreferrer"
              className="botao-secundario w-full"
            >
              <MapPin className="h-4 w-4" /> Ver no mapa
            </a>
          </div>
        </div>
        <BotaoSalvar salvo={salvo} alterado={alterado} />
      </form>
    </Secao>
  );
}

function Pendente() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-300">
      <CircleDashed className="h-3 w-3" /> a confirmar
    </span>
  );
}

/* ---------------- IA ---------------- */

const MODOS: { valor: ModoIA; rotulo: string; descricao: string }[] = [
  { valor: "fora_horario", rotulo: "Fora do horário", descricao: "A IA atende quando a loja está fechada. Durante o expediente, os vendedores." },
  { valor: "sempre", rotulo: "Sempre (24h)", descricao: "A IA responde todas as mensagens. Vendedores assumem quando quiserem." },
  { valor: "desligado", rotulo: "Desligada", descricao: "Só os vendedores respondem." },
];

function ConfiguracaoIA({ config }: { config: ConfigLoja }) {
  const { atualizar } = useDados();
  const [ia, setIa] = useState<ConfigIA>(config.ia);
  const [salvo, setSalvo] = useState(false);
  const alterado = JSON.stringify(ia) !== JSON.stringify(config.ia);
  const mudar = (alteracoes: Partial<ConfigIA>) => {
    setIa({ ...ia, ...alteracoes });
    setSalvo(false);
  };
  const atendendoAgora = iaDeveAtender(ia);

  return (
    <Secao id="ia" icone={<Bot className="h-5 w-5" />} titulo="Inteligência artificial" descricao="Quando a IA atende e o que ela pode fazer.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await atualizar<ConfigLoja>("configuracoes", config.id, { ia });
          setSalvo(true);
        }}
        className="space-y-6"
      >
        <div>
          <p className="rotulo">Quando a IA atende</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => mudar({ modo: m.valor })}
                aria-pressed={ia.modo === m.valor}
                className={`rounded-lg border p-3 text-left transition ${ia.modo === m.valor ? "border-marca-500/60 bg-marca-500/15 ring-2 ring-marca-500/20" : "border-white/10 hover:bg-white/5"}`}
              >
                <span className="block text-sm font-medium text-white">{m.rotulo}</span>
                <span className="mt-1 block text-xs text-white/50">{m.descricao}</span>
              </button>
            ))}
          </div>
          <p className={`mt-2 text-sm ${atendendoAgora ? "text-white" : "text-white/50"}`}>
            Agora: {atendendoAgora ? "🤖 a IA está atendendo" : "👤 os vendedores estão atendendo"}
          </p>
        </div>

        <div>
          <p className="rotulo">Horário da loja</p>
          <div className="overflow-hidden rounded-lg border border-white/10">
            {ia.horarios.map((h, i) => (
              <div key={DIAS_SEMANA[i]} className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2 last:border-0">
                <label className="flex w-32 items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-marca-600"
                    checked={h.aberto}
                    onChange={(e) => mudar({ horarios: ia.horarios.map((x, j) => (j === i ? { ...x, aberto: e.target.checked } : x)) })}
                  />
                  {DIAS_SEMANA[i]}
                </label>
                {h.aberto ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input type="time" className="campo w-28 py-1" value={h.abre} aria-label={`${DIAS_SEMANA[i]} abre`} onChange={(e) => mudar({ horarios: ia.horarios.map((x, j) => (j === i ? { ...x, abre: e.target.value } : x)) })} />
                    <span className="text-white/35">até</span>
                    <input type="time" className="campo w-28 py-1" value={h.fecha} aria-label={`${DIAS_SEMANA[i]} fecha`} onChange={(e) => mudar({ horarios: ia.horarios.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)) })} />
                  </div>
                ) : (
                  <span className="text-sm text-white/35">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["podeInformarPreco", "Pode informar preços"],
              ["podeAgendar", "Pode agendar visitas"],
              ["enviaFotos", "Pode enviar fotos dos carros"],
            ] as const
          ).map(([chave, rotulo]) => (
            <label key={chave} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${ia[chave] ? "border-marca-500/40 bg-marca-500/15" : "border-white/10"}`}>
              <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={ia[chave]} onChange={() => mudar({ [chave]: !ia[chave] })} />
              {rotulo}
            </label>
          ))}
        </div>
        <p className="-mt-3 text-xs text-white/50">A IA nunca dá desconto e nunca inventa carro ou preço: ela só usa o que está no estoque.</p>

        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <div>
            <label className="rotulo" htmlFor="ia-tom">Tom de voz</label>
            <select id="ia-tom" className="campo" value={ia.tom} onChange={(e) => mudar({ tom: e.target.value as ConfigIA["tom"] })}>
              <option value="formal">Formal</option>
              <option value="amigavel">Amigável</option>
              <option value="descontraido">Descontraído</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="ia-boas">Mensagem de boas-vindas</label>
            <input id="ia-boas" className="campo" value={ia.boasVindas} onChange={(e) => mudar({ boasVindas: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="ia-inst">Regras da loja para a IA</label>
          <textarea id="ia-inst" rows={5} className="campo" value={ia.instrucoes} onChange={(e) => mudar({ instrucoes: e.target.value })} placeholder="Uma regra por linha" />
        </div>
        <BotaoSalvar salvo={salvo} alterado={alterado} />
      </form>
    </Secao>
  );
}

/* ---------------- Vendedores ---------------- */

function Vendedores() {
  const { vendedores, inserir, atualizar, remover } = useDados();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  return (
    <Secao icone={<Users className="h-5 w-5" />} titulo="Vendedores" descricao="Quem recebe os leads e os avisos de cliente quente.">
      <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
        {vendedores.length === 0 && <li className="p-4 text-sm text-white/50">Nenhum vendedor cadastrado.</li>}
        {vendedores.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className={`flex-1 text-sm font-medium ${v.ativo ? "text-white" : "text-white/35 line-through"}`}>{v.nome}</span>
            <span className="text-xs text-white/50">{v.telefone}</span>
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={v.ativo} onChange={() => atualizar<Vendedor>("vendedores", v.id, { ativo: !v.ativo })} />
              Ativo
            </label>
            <button
              onClick={() => confirm(`Remover ${v.nome}?`) && remover("vendedores", v.id)}
              className="rounded-md p-1.5 text-white/35 hover:bg-rose-500/15 hover:text-rose-300"
              aria-label={`Remover ${v.nome}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          await inserir<Vendedor>("vendedores", { id: crypto.randomUUID(), nome: nome.trim(), telefone: telefone.replace(/\D/g, ""), ativo: true });
          setNome("");
          setTelefone("");
        }}
      >
        <input className="campo" placeholder="Nome do vendedor" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do vendedor" />
        <input className="campo sm:w-56" placeholder="WhatsApp (para avisos)" value={telefone} onChange={(e) => setTelefone(e.target.value)} aria-label="WhatsApp do vendedor" />
        <button type="submit" className="botao-secundario shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>
    </Secao>
  );
}

/* ---------------- Conexão ---------------- */

function Conexao() {
  const { modo, restaurarExemplos } = useDados();
  return (
    <Secao icone={<Wifi className="h-5 w-5" />} titulo="Conexão" descricao="Banco de dados, WhatsApp oficial (Meta) e IA.">
      {modo === "local" ? (
        <div className="space-y-4 text-sm">
          <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-amber-100">
            <strong>Modo demonstração.</strong> Os dados ficam só neste navegador e as respostas da IA são simuladas. Para ligar o sistema de
            verdade (Supabase + WhatsApp + IA), siga o guia <code className="rounded bg-white/10 px-1">projeto_milano/BACKEND.md</code>.
          </p>
          <button
            onClick={() => confirm("Apagar tudo o que foi feito na demonstração e voltar aos dados de exemplo?") && restaurarExemplos()}
            className="botao-secundario"
          >
            <RotateCcw className="h-4 w-4" /> Restaurar dados de exemplo
          </button>
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          <Item ok texto="Banco de dados Supabase conectado" />
          <Item texto="WhatsApp: as mensagens chegam pelo webhook (função whatsapp-webhook). Veja o guia BACKEND.md para conectar o número." />
          <Item texto="IA: configurada no servidor (função whatsapp-webhook + ia-analista) com a chave ANTHROPIC_API_KEY." />
        </ul>
      )}
    </Secao>
  );
}

function Item({ ok, texto }: { ok?: boolean; texto: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />}
      <span className="text-white/70">{texto}</span>
    </li>
  );
}
