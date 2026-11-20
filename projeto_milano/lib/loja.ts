/**
 * Dados da loja. Fonte: anúncios públicos da Milano Multimarcas (LitoralCar / Mercado Livre).
 * Logo: arquivo original em public/logo-milano-original.gif, redesenhada em vetor em components/Logo.tsx.
 */
export const LOJA = {
  nome: "Milano Multimarcas",
  nomeCurto: "MILANO",
  complemento: "Multimarcas",
  endereco: "Rua Caetano Silveira de Matos, 2371 – Centro",
  cidade: "Palhoça",
  uf: "SC",
  logoUrl: "/logo-milano-original.gif",
  // Ainda não confirmados — preencher com a loja
  whatsapp: "",
  instagram: "",
  horario: "",
};

export const ENDERECO_COMPLETO = `${LOJA.endereco}, ${LOJA.cidade}/${LOJA.uf}`;
