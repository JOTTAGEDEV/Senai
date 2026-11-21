import type {
  ConfigIA,
  ConfigLoja,
  Etapa,
  HorarioDia,
  Importancia,
  StatusAgendamento,
  Temperatura,
} from "./types";
import { LOJA } from "./loja";

export const TEMPERATURAS: Record<Temperatura, { rotulo: string; classe: string }> = {
  quente: { rotulo: "Quente", classe: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
  morno: { rotulo: "Morno", classe: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  frio: { rotulo: "Frio", classe: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
};

export const IMPORTANCIAS: Record<Importancia, string> = {
  importante: "Importante",
  normal: "Normal",
  baixa: "Não importante",
};

export const ETAPAS: { valor: Etapa; rotulo: string }[] = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "atendimento", rotulo: "Em atendimento" },
  { valor: "qualificado", rotulo: "Qualificado" },
  { valor: "visita", rotulo: "Visita marcada" },
  { valor: "negociando", rotulo: "Negociando" },
  { valor: "vendido", rotulo: "Vendido" },
  { valor: "perdido", rotulo: "Perdido" },
];

export const ROTULO_ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.valor, e.rotulo])) as Record<Etapa, string>;

/** Etiquetas que a IA analista pode colocar (e o vendedor pode corrigir) */
export const ETIQUETAS = [
  "Financiamento",
  "À vista",
  "Tem carro na troca",
  "Pediu fotos",
  "Pediu desconto",
  "Urgente",
  "Quer test-drive",
  "Reclamação",
  "Pós-venda",
];

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, { rotulo: string; classe: string }> = {
  agendado: { rotulo: "Agendado", classe: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  confirmado: { rotulo: "Confirmado", classe: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  realizado: { rotulo: "Realizado", classe: "bg-white/10 text-white/70 ring-white/20" },
  faltou: { rotulo: "Faltou", classe: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  cancelado: { rotulo: "Cancelado", classe: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
};

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function dia(aberto: boolean, abre = "08:30", fecha = "18:00"): HorarioDia {
  return { aberto, abre, fecha };
}

export function configIAPadrao(): ConfigIA {
  return {
    modo: "fora_horario",
    horarios: [dia(false), dia(true), dia(true), dia(true), dia(true), dia(true), dia(true, "08:30", "12:30")],
    podeInformarPreco: true,
    podeAgendar: true,
    enviaFotos: true,
    tom: "amigavel",
    instrucoes:
      "Nunca dar desconto: diga que o vendedor pode negociar pessoalmente.\nFinanciamento: coletar entrada desejada e parcela que cabe no bolso; quem simula é o vendedor.\nCarro na troca: pedir modelo, ano, km e fotos; quem avalia é o vendedor.",
    boasVindas: "Olá! Aqui é a assistente virtual da Milano Multimarcas 🚗 Como posso te ajudar?",
  };
}

export function configLojaPadrao(): ConfigLoja {
  return {
    id: "loja",
    nome: LOJA.nome,
    endereco: LOJA.endereco,
    cidade: LOJA.cidade,
    uf: LOJA.uf,
    whatsapp: LOJA.whatsapp,
    instagram: LOJA.instagram,
    ia: configIAPadrao(),
  };
}

/** A IA deve atender agora? (mesma regra usada no back-end) */
export function iaDeveAtender(config: ConfigIA, agora = new Date()): boolean {
  if (config.modo === "desligado") return false;
  if (config.modo === "sempre") return true;
  const h = config.horarios[agora.getDay()];
  if (!h?.aberto) return true;
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const [ha, ma] = h.abre.split(":").map(Number);
  const [hf, mf] = h.fecha.split(":").map(Number);
  const dentro = minutos >= ha * 60 + ma && minutos < hf * 60 + mf;
  return !dentro;
}

export function formatarTelefone(t: string): string {
  const d = t.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export function tempoRelativo(iso: string, agora = Date.now()): string {
  const s = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `${d} dias`;
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
