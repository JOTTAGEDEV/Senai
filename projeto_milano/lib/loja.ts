/**
 * Dados da loja. Fonte: anúncios públicos da Milano Multimarcas (LitoralCar / Mercado Livre).
 * Para usar a logo oficial: salve o arquivo em `public/logo-milano.png` e troque `logoUrl` por "/logo-milano.png".
 */
export const LOJA = {
  nome: "Milano Multimarcas",
  nomeCurto: "MILANO",
  complemento: "Multimarcas",
  endereco: "Rua Caetano Silveira de Matos, 2371 – Centro",
  cidade: "Palhoça",
  uf: "SC",
  logoUrl: null as string | null,
  // Ainda não confirmados — preencher com a loja
  whatsapp: "",
  instagram: "",
  horario: "",
};

export const ENDERECO_COMPLETO = `${LOJA.endereco}, ${LOJA.cidade}/${LOJA.uf}`;
