"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Users } from "lucide-react";
import { FormularioVeiculo } from "@/components/estoque/FormularioVeiculo";
import { StatusBadge } from "@/components/estoque/StatusBadge";
import { useEstoque } from "@/lib/estoque-store";
import { diasDesde, nomeCompleto, textoDias } from "@/lib/format";
import type { Veiculo, VeiculoInput } from "@/lib/types";

export default function EditarVeiculoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { obter, atualizar, carregando } = useEstoque();
  const veiculo = obter(id);

  if (carregando) {
    return (
      <div className="grid place-items-center py-24 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className="cartao p-8 text-center">
        <p className="font-medium text-zinc-900">Carro não encontrado</p>
        <Link href="/estoque" className="botao-secundario mt-4">Voltar ao estoque</Link>
      </div>
    );
  }

  // Remove os campos de controle antes de passar para o formulário
  const dados: VeiculoInput = { ...veiculo };
  delete (dados as Partial<Veiculo>).id;
  delete (dados as Partial<Veiculo>).criadoEm;
  delete (dados as Partial<Veiculo>).atualizadoEm;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/estoque" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ChevronLeft className="h-4 w-4" /> Estoque
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{nomeCompleto(veiculo)}</h1>
          <StatusBadge status={veiculo.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          <span>{textoDias(diasDesde(veiculo.dataEntrada))} no estoque</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {veiculo.interessados} interessado(s)
          </span>
        </p>
      </div>
      <FormularioVeiculo
        key={veiculo.id}
        inicial={dados}
        textoBotao="Salvar alterações"
        onSalvar={(novos) => {
          atualizar(veiculo.id, novos);
          router.push("/estoque");
        }}
      />
    </div>
  );
}
