import type { Conservacao, StatusVeiculo, TipoVeiculo, VeiculoInput } from "./types";

export const MARCAS = [
  "Chevrolet",
  "Fiat",
  "Ford",
  "Honda",
  "Hyundai",
  "Jeep",
  "Nissan",
  "Peugeot",
  "Renault",
  "Toyota",
  "Volkswagen",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Mitsubishi",
  "Citroën",
  "Kia",
  "BYD",
  "Caoa Chery",
  "Outra",
];

export const CARROCERIAS = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Perua", "Cupê", "Conversível", "Utilitário", "Moto", "Motorhome", "Náutica", "Patinete elétrico"];
export const CAMBIOS = ["Manual", "Automático", "CVT", "Automatizado"];
export const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"];
export const MOTORES = ["1.0", "1.0 Turbo", "1.3", "1.4", "1.4 Turbo", "1.5", "1.6", "1.8", "2.0", "2.0 Turbo", "2.8 Diesel", "3.0+", "Elétrico"];
export const CORES = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Marrom", "Bege", "Verde", "Amarelo", "Laranja", "Outra"];

export const OPCIONAIS = [
  "Ar-condicionado",
  "Direção elétrica",
  "Vidros elétricos",
  "Travas elétricas",
  "Multimídia",
  "Android Auto / Apple CarPlay",
  "Câmera de ré",
  "Sensor de estacionamento",
  "Banco de couro",
  "Teto solar",
  "Chave presencial",
  "Piloto automático",
  "Rodas de liga leve",
  "Airbag",
  "Freios ABS",
  "Controle de estabilidade",
  "Faróis de LED",
  "Ar digital",
];

export const TIPOS: { valor: TipoVeiculo; rotulo: string }[] = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "seminovo", rotulo: "Seminovo" },
  { valor: "usado", rotulo: "Usado" },
];

export const CONSERVACOES: { valor: Conservacao; rotulo: string }[] = [
  { valor: "excelente", rotulo: "Excelente" },
  { valor: "otimo", rotulo: "Ótimo" },
  { valor: "bom", rotulo: "Bom" },
  { valor: "regular", rotulo: "Regular" },
];

export const STATUS: Record<
  StatusVeiculo,
  { rotulo: string; descricaoIA: string; classe: string; ponto: string }
> = {
  disponivel: {
    rotulo: "Disponível",
    descricaoIA: "A IA oferece normalmente",
    classe: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    ponto: "bg-emerald-500",
  },
  reservado: {
    rotulo: "Reservado",
    descricaoIA: "A IA avisa que está reservado e oferece parecidos",
    classe: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    ponto: "bg-amber-500",
  },
  preparacao: {
    rotulo: "Em preparação",
    descricaoIA: "A IA avisa que chega em breve",
    classe: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
    ponto: "bg-sky-500",
  },
  vendido: {
    rotulo: "Vendido",
    descricaoIA: "A IA não oferece e sugere parecidos",
    classe: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
    ponto: "bg-rose-500",
  },
  oculto: {
    rotulo: "Oculto",
    descricaoIA: "Não aparece para a IA",
    classe: "bg-white/10 text-white/60 ring-white/15",
    ponto: "bg-zinc-400",
  },
};

export const CHECKLIST_ITENS: { chave: keyof VeiculoInput["checklist"]; rotulo: string; alerta?: boolean }[] = [
  { chave: "unicoDono", rotulo: "Único dono" },
  { chave: "ipvaPago", rotulo: "IPVA pago / licenciado" },
  { chave: "revisoesConcessionaria", rotulo: "Revisões na concessionária" },
  { chave: "manualChaveReserva", rotulo: "Manual e chave reserva" },
  { chave: "laudoAprovado", rotulo: "Laudo cautelar aprovado" },
  { chave: "leilaoSinistro", rotulo: "Passagem por leilão / sinistro", alerta: true },
];

export const MAX_FOTOS = 15;
export const MAX_FOTOS_IA = 3;
export const DIAS_PARADO_ALERTA = 60;

export function veiculoVazio(): VeiculoInput {
  const hoje = new Date();
  return {
    marca: "",
    modelo: "",
    versao: "",
    anoFabricacao: hoje.getFullYear(),
    anoModelo: hoje.getFullYear(),
    cor: "",
    placa: "",
    carroceria: "",
    km: 0,
    cambio: "",
    combustivel: "Flex",
    motor: "",
    portas: 4,
    opcionais: [],
    tipo: "usado",
    conservacao: "bom",
    checklist: {
      unicoDono: false,
      ipvaPago: false,
      revisoesConcessionaria: false,
      manualChaveReserva: false,
      laudoAprovado: false,
      leilaoSinistro: false,
    },
    garantiaMeses: 3,
    preco: 0,
    precoMinimo: null,
    custoCompra: null,
    fipe: null,
    aceitaTroca: true,
    aceitaFinanciamento: true,
    descricao: "",
    observacoesInternas: "",
    instrucoesIA: "",
    fotos: [],
    videoUrl: "",
    links: { olx: "", webmotors: "", site: "", instagram: "" },
    status: "disponivel",
    destaque: false,
    dataEntrada: hoje.toISOString().slice(0, 10),
    interessados: 0,
  };
}
