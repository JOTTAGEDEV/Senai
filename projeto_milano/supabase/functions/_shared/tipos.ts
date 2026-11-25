// Formatos das linhas do banco usados pelas funções (snake_case, como no Postgres).

export type ModoIA = "sempre" | "fora_horario" | "desligado";

export interface HorarioDia {
  aberto: boolean;
  abre: string; // "08:30"
  fecha: string; // "18:00"
}

export interface ConfigFollowup {
  ativo: boolean;
  dias: number; // dias sem resposta do cliente antes de mandar
  maximo: number; // follow-ups por cliente (zera quando ele responde)
  abre: string; // janela de envio, ex. "10:00"
  fecha: string; // ex. "18:00"
}

export interface ConfigIA {
  modo: ModoIA;
  horarios: HorarioDia[]; // 0 = domingo
  podeInformarPreco: boolean;
  podeAgendar: boolean;
  enviaFotos: boolean;
  tom: "formal" | "amigavel" | "descontraido";
  instrucoes: string;
  boasVindas: string;
  followup?: ConfigFollowup;
}

export const FOLLOWUP_PADRAO: ConfigFollowup = { ativo: false, dias: 3, maximo: 2, abre: "10:00", fecha: "18:00" };

export interface Empresa {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  instagram: string;
  ia: ConfigIA;
}

export type ProvedorWhatsApp = "meta" | "evolution" | "zapi";

/**
 * Como falar com o WhatsApp da loja.
 * - meta: phone_number_id + access_token (API oficial)
 * - evolution: api_url + instancia + access_token (apikey do servidor)
 * - zapi: instancia (id) + access_token (token da instância) + client_token (token de segurança da conta)
 */
export interface CredenciaisWhatsApp {
  empresa_id: string;
  provedor?: ProvedorWhatsApp; // ausente = meta (registros antigos)
  phone_number_id: string | null;
  access_token: string;
  api_url?: string;
  instancia?: string;
  client_token?: string;
  webhook_token?: string;
}

export interface Foto {
  id: string;
  src: string;
  enviarIA: boolean;
}

export interface Veiculo {
  id: string;
  empresa_id: string;
  marca: string;
  modelo: string;
  versao: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor: string;
  carroceria: string;
  km: number;
  cambio: string;
  combustivel: string;
  motor: string;
  portas: number;
  opcionais: string[];
  tipo: string;
  conservacao: string;
  checklist: Record<string, boolean>;
  garantia_meses: number;
  preco: number;
  fipe: number | null;
  aceita_troca: boolean;
  aceita_financiamento: boolean;
  descricao: string;
  instrucoes_ia: string;
  fotos: Foto[];
  video_url: string;
  links: Record<string, string>;
  status: string;
  destaque: boolean;
}

export interface Lead {
  id: string;
  empresa_id: string;
  nome: string;
  telefone: string;
  veiculo_id: string | null;
  interesse: string;
  temperatura: "quente" | "morno" | "frio";
  importancia: "importante" | "normal" | "baixa";
  etapa: "novo" | "atendimento" | "qualificado" | "visita" | "negociando" | "vendido" | "perdido";
  etiquetas: string[];
  resumo: string;
  proxima_acao: string;
  dados: Record<string, string>;
  atendente: "ia" | "humano";
  vendedor_id: string | null;
  nao_lidas: number;
  ultima_mensagem_em: string;
  analisado_em: string | null;
  followups_enviados?: number;
  ultimo_followup_em?: string | null;
}

export interface Mensagem {
  id: string;
  lead_id: string;
  autor: "cliente" | "ia" | "vendedor" | "sistema";
  autor_nome: string;
  texto: string;
  midia_url: string | null;
  wa_message_id: string | null;
  criada_em: string;
}

export interface Agendamento {
  id: string;
  inicio: string;
  status: string;
  vendedor_id: string | null;
}

export interface Vendedor {
  id: string;
  nome: string;
  ativo: boolean;
}

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
] as const;

export const ORDEM_ETAPAS: Lead["etapa"][] = ["novo", "atendimento", "qualificado", "visita", "negociando", "vendido"];
