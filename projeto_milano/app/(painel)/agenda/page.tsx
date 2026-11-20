import { EmBreve } from "@/components/EmBreve";

export default function Pagina() {
  return (
    <EmBreve
      titulo="Agenda"
      itens={["Visitas e test-drives por dia e por vendedor", "Agendamentos feitos pela IA aparecem automaticamente", "Lembrete para o cliente na véspera"]}
    />
  );
}
