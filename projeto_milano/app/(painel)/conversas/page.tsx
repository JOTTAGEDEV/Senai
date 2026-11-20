import { EmBreve } from "@/components/EmBreve";

export default function Pagina() {
  return (
    <EmBreve
      titulo="Conversas"
      itens={["Caixa de entrada estilo WhatsApp com todas as conversas", "Botões Assumir conversa (a IA para) e Devolver para IA", "Lateral com resumo da IA, temperatura e etiquetas", "Indicação de quem respondeu cada mensagem: IA ou vendedor"]}
    />
  );
}
