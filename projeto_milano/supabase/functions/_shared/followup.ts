// Regras do follow-up automático (usadas pela função ia-followup e pelos testes).
import { momentoLocal } from "./horario.ts";
import { type Empresa, FOLLOWUP_PADRAO } from "./tipos.ts";

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Dentro da janela de envio e num dia em que a loja abre? */
export function podeEnviarAgora(empresa: Empresa, agora = new Date()): boolean {
  const cfg = { ...FOLLOWUP_PADRAO, ...empresa.ia.followup };
  const m = momentoLocal(agora);
  if (!empresa.ia.horarios?.[m.diaSemana]?.aberto) return false;
  return m.minutos >= minutos(cfg.abre) && m.minutos < minutos(cfg.fecha);
}

export function instrucaoFollowup(dias: number, numero: number, maximo: number): string {
  return [
    `O cliente não responde há ${dias} dias. Escreva agora UMA mensagem de follow-up para retomar a conversa (follow-up ${numero} de ${maximo}).`,
    "Retome o assunto que ele estava vendo (o carro, a visita, a troca ou o financiamento), de forma natural e curta, como um vendedor atencioso.",
    "Se for falar do carro, confira antes com buscar_veiculos se ele continua disponível. Se foi vendido, ofereça opções parecidas.",
    "Termine com uma pergunta simples (ex.: se quer agendar uma visita). Sem pressão, sem desconto, sem inventar nada.",
    numero >= maximo ? "Esta é a última tentativa: deixe claro que a loja fica à disposição quando ele quiser." : "",
  ].filter(Boolean).join(" ");
}

