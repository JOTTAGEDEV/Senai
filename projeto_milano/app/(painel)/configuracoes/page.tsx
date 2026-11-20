import { CheckCircle2, CircleDashed, MapPin, Store } from "lucide-react";
import { EmBreve } from "@/components/EmBreve";
import { Logo } from "@/components/Logo";
import { LOJA } from "@/lib/loja";

const PENDENTE = "A confirmar com a loja";

export default function ConfiguracoesPage() {
  const dados: { rotulo: string; valor: string; confirmado: boolean }[] = [
    { rotulo: "Nome", valor: LOJA.nome, confirmado: true },
    { rotulo: "Endereço", valor: LOJA.endereco, confirmado: true },
    { rotulo: "Cidade", valor: `${LOJA.cidade} / ${LOJA.uf}`, confirmado: true },
    { rotulo: "WhatsApp", valor: LOJA.whatsapp || PENDENTE, confirmado: !!LOJA.whatsapp },
    { rotulo: "Instagram", valor: LOJA.instagram || PENDENTE, confirmado: !!LOJA.instagram },
    { rotulo: "Horário de funcionamento", valor: LOJA.horario || PENDENTE, confirmado: !!LOJA.horario },
    { rotulo: "Logo oficial", valor: LOJA.logoUrl ? "Configurada" : PENDENTE, confirmado: !!LOJA.logoUrl },
  ];

  return (
    <div className="space-y-6">
      <section className="cartao p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-marca-50 text-marca-600">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Dados da loja</h1>
            <p className="text-sm text-zinc-500">A IA usa estes dados para responder endereço, horário e contato.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <dl className="divide-y divide-zinc-100">
            {dados.map((d) => (
              <div key={d.rotulo} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-sm text-zinc-500">{d.rotulo}</dt>
                <dd className={`flex items-center gap-1.5 text-sm ${d.confirmado ? "font-medium text-zinc-900" : "text-amber-700"}`}>
                  {d.confirmado ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4" />}
                  {d.valor}
                </dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3">
            <div className="grid h-28 place-items-center rounded-lg bg-milano-fundo">
              <Logo claro className="h-16" />
            </div>
            {LOJA.logoUrl && (
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOJA.logoUrl} alt="Logo original" className="h-8 rounded" />
                Arquivo original (redesenhado em vetor acima)
              </p>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${LOJA.nome}, ${LOJA.endereco}, ${LOJA.cidade} ${LOJA.uf}`)}`}
              target="_blank"
              rel="noreferrer"
              className="botao-secundario w-full"
            >
              <MapPin className="h-4 w-4" /> Ver no mapa
            </a>
          </div>
        </div>
      </section>

      <EmBreve
        titulo="Outras configurações"
        itens={[
          "Horário em que a IA atende",
          "Regras da loja: o que a IA pode e não pode fazer",
          "Vendedores e permissões",
          "Conexão com o WhatsApp (Meta)",
        ]}
      />
    </div>
  );
}
