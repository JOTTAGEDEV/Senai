import { EmBreve } from "@/components/EmBreve";

export default function Pagina() {
  return (
    <EmBreve
      titulo="Dashboard"
      itens={["Números do dia: conversas novas, respondidas pela IA, leads quentes, visitas marcadas", "Funil do mês: novo → interessado → visita → negociando → vendido", "Carros mais procurados e assuntos mais perguntados", "Alertas: leads quentes sem resposta, carros parados há muito tempo"]}
    />
  );
}
