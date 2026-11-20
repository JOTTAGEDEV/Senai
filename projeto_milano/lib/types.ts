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
  dataUrl: string;
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
