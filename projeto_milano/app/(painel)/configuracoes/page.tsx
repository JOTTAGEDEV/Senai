import { EmBreve } from "@/components/EmBreve";

export default function Pagina() {
  return (
    <EmBreve
      titulo="Configurações"
      itens={["Horário em que a IA atende", "Regras da loja: o que a IA pode e não pode fazer", "Vendedores e permissões", "Conexão com o WhatsApp (Meta)"]}
    />
  );
}
