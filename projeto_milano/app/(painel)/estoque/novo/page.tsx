"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FormularioVeiculo } from "@/components/estoque/FormularioVeiculo";
import { veiculoVazio } from "@/lib/constants";
import { useEstoque } from "@/lib/estoque-store";

export default function NovoVeiculoPage() {
  const router = useRouter();
  const { adicionar } = useEstoque();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/estoque" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ChevronLeft className="h-4 w-4" /> Estoque
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Adicionar carro</h1>
      </div>
      <FormularioVeiculo
        inicial={veiculoVazio()}
        textoBotao="Salvar carro"
        onSalvar={(dados) => {
          adicionar(dados);
          router.push("/estoque");
        }}
      />
    </div>
  );
}
