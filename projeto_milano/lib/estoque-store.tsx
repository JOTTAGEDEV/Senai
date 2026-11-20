"use client";

import { useDados } from "./dados";
import { gerarId } from "./format";
import type { StatusVeiculo, Veiculo, VeiculoInput } from "./types";

/** Atalho para as telas do estoque, em cima do provedor geral de dados (lib/dados.tsx). */
export function useEstoque() {
  const d = useDados();
  const agora = () => new Date().toISOString();

  return {
    veiculos: d.veiculos,
    carregando: d.carregando,
    obter: (id: string) => d.veiculos.find((v) => v.id === id),
    adicionar: (dados: VeiculoInput): Veiculo => {
      const novo: Veiculo = { ...dados, interessados: 0, id: gerarId(), criadoEm: agora(), atualizadoEm: agora() };
      void d.inserir("veiculos", novo);
      return novo;
    },
    atualizar: (id: string, dados: VeiculoInput) => {
      // "interessados" é calculado a partir dos leads; não grava o valor calculado
      const { interessados: _calc, ...resto } = dados;
      void _calc;
      void d.atualizar<Veiculo>("veiculos", id, { ...resto, atualizadoEm: agora() });
    },
    remover: (id: string) => void d.remover("veiculos", id),
    duplicar: (id: string) => {
      const original = d.veiculos.find((v) => v.id === id);
      if (!original) return undefined;
      const copia: Veiculo = {
        ...original,
        id: gerarId(),
        placa: "",
        status: "preparacao",
        destaque: false,
        interessados: 0,
        dataEntrada: agora().slice(0, 10),
        fotos: original.fotos.map((f) => ({ ...f, id: gerarId() })),
        criadoEm: agora(),
        atualizadoEm: agora(),
      };
      void d.inserir("veiculos", copia);
      return copia;
    },
    mudarStatus: (id: string, status: StatusVeiculo) =>
      void d.atualizar<Veiculo>("veiculos", id, { status, atualizadoEm: agora() }),
    restaurarExemplos: () => void d.restaurarExemplos(),
  };
}
