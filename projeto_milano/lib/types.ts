export type TipoVeiculo = "novo" | "seminovo" | "usado";
export type Conservacao = "excelente" | "otimo" | "bom" | "regular";
export type StatusVeiculo =
  | "disponivel"
  | "reservado"
  | "preparacao"
  | "vendido"
  | "oculto";

export interface Foto {
  id: string;
  src: string;
  /** Se true, esta foto é uma das (no máximo 3) que a IA envia no WhatsApp */
  enviarIA: boolean;
}

export interface Checklist {
  unicoDono: boolean;
  ipvaPago: boolean;
  revisoesConcessionaria: boolean;
  manualChaveReserva: boolean;
  laudoAprovado: boolean;
  leilaoSinistro: boolean;
}

export interface Links {
  olx: string;
  webmotors: string;
  site: string;
  instagram: string;
}

export interface Veiculo {
  id: string;
  // Identificação
  marca: string;
  modelo: string;
  versao: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  placa: string;
  carroceria: string;
  // Técnico
  km: number;
  cambio: string;
  combustivel: string;
  motor: string;
  portas: number;
  opcionais: string[];
  // Condição
  tipo: TipoVeiculo;
  conservacao: Conservacao;
  checklist: Checklist;
  garantiaMeses: number;
  // Preço
  preco: number;
  precoMinimo: number | null;
  custoCompra: number | null;
  fipe: number | null;
  aceitaTroca: boolean;
  aceitaFinanciamento: boolean;
  // Descrição
  descricao: string;
  observacoesInternas: string;
  instrucoesIA: string;
  // Mídia
  fotos: Foto[];
  videoUrl: string;
  links: Links;
  // Status
  status: StatusVeiculo;
  destaque: boolean;
  dataEntrada: string; // yyyy-mm-dd
  /** Quantidade de leads que perguntaram deste carro (dado de exemplo por enquanto) */
  interessados: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type VeiculoInput = Omit<Veiculo, "id" | "criadoEm" | "atualizadoEm">;

/* ---------------- CRM: leads, mensagens, agenda ---------------- */

export type Temperatura = "quente" | "morno" | "frio";
export type Importancia = "importante" | "normal" | "baixa";
export type Etapa = "novo" | "atendimento" | "qualificado" | "visita" | "negociando" | "vendido" | "perdido";
export type Atendente = "ia" | "humano";

export interface DadosLead {
  orcamento?: string;
  pagamento?: string; // financiamento, à vista...
  entrada?: string;
  carroTroca?: string;
  cidade?: string;
  melhorHorario?: string;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string; // só dígitos, com DDI: 5548999990000
  veiculoId: string | null;
  interesse: string; // texto livre: "SUV automático até 120 mil"
  temperatura: Temperatura;
  importancia: Importancia;
  etapa: Etapa;
  etiquetas: string[];
  resumo: string;
  proximaAcao: string;
  dados: DadosLead;
  atendente: Atendente;
  vendedorId: string | null;
  naoLidas: number;
  motivoPerda: string;
  ultimaMensagemEm: string; // ISO
  analisadoEm: string | null;
  criadoEm: string;
}

export type AutorMensagem = "cliente" | "ia" | "vendedor" | "sistema";

export interface Mensagem {
  id: string;
  leadId: string;
  autor: AutorMensagem;
  autorNome: string;
  texto: string;
  midiaUrl: string | null;
  criadaEm: string;
}

export type TipoAgendamento = "visita" | "test-drive";
export type StatusAgendamento = "agendado" | "confirmado" | "realizado" | "faltou" | "cancelado";

export interface Agendamento {
  id: string;
  leadId: string | null;
  clienteNome: string;
  telefone: string;
  veiculoId: string | null;
  tipo: TipoAgendamento;
  inicio: string; // ISO
  vendedorId: string | null;
  status: StatusAgendamento;
  origem: "ia" | "manual";
  observacao: string;
  criadoEm: string;
}

export interface Vendedor {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
}

export type ModoIA = "sempre" | "fora_horario" | "desligado";

export interface HorarioDia {
  aberto: boolean;
  abre: string; // "08:00"
  fecha: string; // "18:00"
}

export interface ConfigIA {
  modo: ModoIA;
  /** 0 = domingo ... 6 = sábado */
  horarios: HorarioDia[];
  podeInformarPreco: boolean;
  podeAgendar: boolean;
  enviaFotos: boolean;
  tom: "formal" | "amigavel" | "descontraido";
  instrucoes: string;
  boasVindas: string;
}

export interface ConfigLoja {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  instagram: string;
  ia: ConfigIA;
}
