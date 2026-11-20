import { EmBreve } from "@/components/EmBreve";

export default function Pagina() {
  return (
    <EmBreve
      titulo="Leads"
      itens={["Tabela com todos os clientes e filtros", "Temperatura: quente, morno, frio", "Etiquetas: financiamento, troca, à vista, urgente...", "Etapa do funil e próxima ação sugerida pela IA"]}
    />
  );
}
