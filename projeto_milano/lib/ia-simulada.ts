import { ENDERECO_COMPLETO } from "./loja";
import { DIAS_SEMANA } from "./crm";
import { formatarKm, formatarPreco } from "./format";
import type { ConfigLoja, Lead, Temperatura, Veiculo } from "./types";

/**
 * IA de MENTIRA, só para a demonstração sem back-end.
 * No modo Supabase quem responde é a IA de verdade (supabase/functions/_shared/ia.ts).
 */

const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function acharVeiculos(texto: string, veiculos: Veiculo[]): Veiculo[] {
  const t = normalizar(texto);
  const ativos = veiculos.filter((v) => v.status === "disponivel" || v.status === "reservado" || v.status === "preparacao");
  const porModelo = ativos.filter((v) => t.includes(normalizar(v.modelo)) || t.includes(normalizar(v.marca)));
  if (porModelo.length) return porModelo;
  const carroceria = ["suv", "hatch", "seda", "picape"].find((c) => t.includes(c));
  if (carroceria) return ativos.filter((v) => normalizar(v.carroceria).startsWith(carroceria));
  return [];
}

function descrever(v: Veiculo, comPreco: boolean): string {
  const base = `${v.marca} ${v.modelo} ${v.versao} ${v.anoFabricacao}/${v.anoModelo}, ${v.cor.toLowerCase()}, ${formatarKm(v.km)}`;
  const preco = comPreco ? ` por ${formatarPreco(v.preco)}` : "";
  const status = v.status === "reservado" ? " (está reservado no momento)" : v.status === "preparacao" ? " (fica pronto nos próximos dias)" : "";
  return base + preco + status;
}

export interface RespostaSimulada {
  texto: string;
  alteracoesLead: Partial<Lead>;
}

export function responderSimulado(mensagem: string, lead: Lead, veiculos: Veiculo[], config: ConfigLoja): RespostaSimulada {
  const t = normalizar(mensagem);
  const etiquetas = new Set(lead.etiquetas);
  let temperatura: Temperatura = lead.temperatura;
  const alteracoes: Partial<Lead> = {};
  const primeiroNome = lead.nome.split(" ")[0];

  if (/financ|parcel|entrada/.test(t)) etiquetas.add("Financiamento");
  if (/a vista|avista/.test(t)) etiquetas.add("À vista");
  if (/troca/.test(t)) etiquetas.add("Tem carro na troca");
  if (/foto|video/.test(t)) etiquetas.add("Pediu fotos");
  if (/desconto|baixar|menor preco/.test(t)) etiquetas.add("Pediu desconto");
  if (/test.?drive/.test(t)) etiquetas.add("Quer test-drive");
  if (/urgente|hoje|essa semana/.test(t)) etiquetas.add("Urgente");

  let texto: string;
  const encontrados = acharVeiculos(mensagem, veiculos);

  if (/desconto|baixar|menor preco/.test(t)) {
    texto = "Condições especiais são negociadas direto com o vendedor 😉 Quer que eu peça para um vendedor te chamar?";
    temperatura = "quente";
  } else if (/endereco|onde fica|localiza/.test(t)) {
    texto = `Estamos na ${ENDERECO_COMPLETO}. Quer agendar uma visita?`;
  } else if (/horario|abre|fecha|funciona/.test(t)) {
    const dias = config.ia.horarios
      .map((h, i) => (h.aberto ? `${DIAS_SEMANA[i]}: ${h.abre}–${h.fecha}` : null))
      .filter(Boolean)
      .join(" · ");
    texto = `Nosso horário: ${dias}. Mas pode me chamar a qualquer hora por aqui!`;
  } else if (/visita|agendar|agenda|test.?drive|passar ai|ir ai/.test(t)) {
    texto = config.ia.podeAgendar
      ? "Claro! Qual dia e horário ficam melhores para você? Atendemos de segunda a sábado."
      : "Vou pedir para um vendedor combinar o melhor horário com você.";
    temperatura = "quente";
    alteracoes.etapa = "qualificado";
  } else if (/financ|parcel|entrada/.test(t)) {
    texto = "Trabalhamos com financiamento sim! Quanto você pensa em dar de entrada e qual parcela cabe no seu bolso? Com isso o vendedor já prepara a simulação.";
    temperatura = temperatura === "frio" ? "morno" : temperatura;
  } else if (/troca/.test(t)) {
    texto = "Aceitamos seu carro na troca! Me conta modelo, ano e quilometragem — se puder, manda umas fotos para a avaliação.";
  } else if (encontrados.length) {
    const lista = encontrados.slice(0, 3).map((v) => `• ${descrever(v, config.ia.podeInformarPreco)}`).join("\n");
    texto = `Temos sim, ${primeiroNome}! 🚗\n${lista}\nQuer que eu te mande fotos ou prefere agendar uma visita?`;
    alteracoes.veiculoId = encontrados[0].id;
    alteracoes.interesse = `${encontrados[0].marca} ${encontrados[0].modelo}`;
    if (temperatura === "frio") temperatura = "morno";
  } else if (/oi|ola|bom dia|boa tarde|boa noite/.test(t) && t.length < 25) {
    texto = config.ia.boasVindas;
  } else {
    texto = "Entendi! Vou verificar e um vendedor já te responde. Enquanto isso, procura algum modelo ou faixa de preço?";
  }

  alteracoes.etiquetas = [...etiquetas];
  alteracoes.temperatura = temperatura;
  if (lead.etapa === "novo") alteracoes.etapa = alteracoes.etapa ?? "atendimento";
  return { texto, alteracoesLead: alteracoes };
}
