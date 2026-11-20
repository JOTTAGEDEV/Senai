"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";
import { gerarId } from "./format";
import { VEICULOS_EXEMPLO } from "./mock-data";
import type { StatusVeiculo, Veiculo, VeiculoInput } from "./types";

/**
 * Estoque guardado no próprio navegador (IndexedDB) enquanto não existe back-end.
 * Quando ligarmos o Supabase, só esta camada muda; as telas continuam iguais.
 */
const CHAVE = "milano:veiculos:v2";

interface EstoqueContexto {
  veiculos: Veiculo[];
  carregando: boolean;
  obter: (id: string) => Veiculo | undefined;
  adicionar: (dados: VeiculoInput) => Veiculo;
  atualizar: (id: string, dados: VeiculoInput) => void;
  remover: (id: string) => void;
  duplicar: (id: string) => Veiculo | undefined;
  mudarStatus: (id: string, status: StatusVeiculo) => void;
  restaurarExemplos: () => void;
}

const Contexto = createContext<EstoqueContexto | null>(null);

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    get<Veiculo[]>(CHAVE)
      .then((salvos) => {
        if (ativo) setVeiculos(salvos ?? VEICULOS_EXEMPLO);
      })
      .catch(() => {
        if (ativo) setVeiculos(VEICULOS_EXEMPLO);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const salvar = useCallback((proximo: Veiculo[]) => {
    setVeiculos(proximo);
    set(CHAVE, proximo).catch((erro) => console.error("Falha ao salvar estoque", erro));
  }, []);

  const valor = useMemo<EstoqueContexto>(() => {
    const agora = () => new Date().toISOString();
    return {
      veiculos,
      carregando,
      obter: (id) => veiculos.find((v) => v.id === id),
      adicionar: (dados) => {
        const novo: Veiculo = { ...dados, id: gerarId(), criadoEm: agora(), atualizadoEm: agora() };
        salvar([novo, ...veiculos]);
        return novo;
      },
      atualizar: (id, dados) => {
        salvar(veiculos.map((v) => (v.id === id ? { ...v, ...dados, atualizadoEm: agora() } : v)));
      },
      remover: (id) => salvar(veiculos.filter((v) => v.id !== id)),
      duplicar: (id) => {
        const original = veiculos.find((v) => v.id === id);
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
        salvar([copia, ...veiculos]);
        return copia;
      },
      mudarStatus: (id, status) => {
        salvar(veiculos.map((v) => (v.id === id ? { ...v, status, atualizadoEm: agora() } : v)));
      },
      restaurarExemplos: () => salvar(VEICULOS_EXEMPLO),
    };
  }, [veiculos, carregando, salvar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstoque() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useEstoque precisa estar dentro de <EstoqueProvider>");
  return ctx;
}
