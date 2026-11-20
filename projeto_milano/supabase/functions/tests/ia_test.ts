// Testes do back-end sem internet e sem custo: banco em memória, Anthropic e WhatsApp falsos.
// Rodar: cd supabase/functions && deno test --allow-env tests/
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { horariosLivres, iaDeveAtender, momentoLocal } from "../_shared/horario.ts";
import { montarHistorico, responderCliente, veiculoPublico } from "../_shared/ia.ts";
import type { ConfigIA, Empresa, Lead, Mensagem, Veiculo } from "../_shared/tipos.ts";
import { assinaturaValida, lerWebhook } from "../_shared/whatsapp.ts";

Deno.env.set("ANTHROPIC_API_KEY", "teste");

/* ---------------- banco falso (só o que as funções usam) ---------------- */

type Linha = Record<string, unknown>;
class Consulta {
  private filtros: ((l: Linha) => boolean)[] = [];
  private acao: "select" | "insert" | "update" = "select";
  private valores: Linha | Linha[] | null = null;
  private limite = Infinity;
  private ordem: { col: string; asc: boolean } | null = null;
  constructor(private banco: Record<string, Linha[]>, private tabela: string) {}
  select() { return this; }
  insert(v: Linha | Linha[]) { this.acao = "insert"; this.valores = v; return this; }
  update(v: Linha) { this.acao = "update"; this.valores = v; return this; }
  eq(c: string, v: unknown) { this.filtros.push((l) => l[c] === v); return this; }
  neq(c: string, v: unknown) { this.filtros.push((l) => l[c] !== v); return this; }
  gte(c: string, v: string) { this.filtros.push((l) => String(l[c]) >= v); return this; }
  lt(c: string, v: string) { this.filtros.push((l) => String(l[c]) < v); return this; }
  in(c: string, vs: unknown[]) { this.filtros.push((l) => vs.includes(l[c])); return this; }
  order(col: string, o: { ascending: boolean }) { this.ordem = { col, asc: o.ascending }; return this; }
  limit(n: number) { this.limite = n; return this; }
  single() { return this.executar(true); }
  maybeSingle() { return this.executar(true, true); }
  then<T>(ok: (r: { data: unknown; error: { message: string } | null }) => T) { return this.executar(false).then(ok); }
  private async executar(um: boolean, talvez = false) {
    const linhas = (this.banco[this.tabela] ??= []);
    if (this.acao === "insert") {
      const novas = (Array.isArray(this.valores) ? this.valores : [this.valores!]).map((v) => ({ id: crypto.randomUUID(), criada_em: new Date().toISOString(), ...v }));
      linhas.push(...novas);
      return { data: um ? novas[0] : novas, error: null };
    }
    const alvo = linhas.filter((l) => this.filtros.every((f) => f(l)));
    if (this.acao === "update") {
      alvo.forEach((l) => Object.assign(l, this.valores));
      return { data: alvo, error: null };
    }
    let r = [...alvo];
    if (this.ordem) r.sort((a, b) => (String(a[this.ordem!.col]) < String(b[this.ordem!.col]) ? -1 : 1) * (this.ordem!.asc ? 1 : -1));
    r = r.slice(0, this.limite);
    if (um) return r[0] || talvez ? { data: r[0] ?? null, error: null } : { data: null, error: { message: "não encontrado" } };
    return { data: r, error: null };
  }
}
function bancoFalso(dados: Record<string, Linha[]>) {
  return { from: (t: string) => new Consulta(dados, t) } as unknown as Parameters<typeof responderCliente>[0]["db"];
}

/* ---------------- dados ---------------- */

const horarios: ConfigIA["horarios"] = [
  { aberto: false, abre: "08:30", fecha: "18:00" },
  ...Array.from({ length: 5 }, () => ({ aberto: true, abre: "08:30", fecha: "18:00" })),
  { aberto: true, abre: "08:30", fecha: "12:30" },
];
const empresa: Empresa = {
  id: "emp1", nome: "Milano Multimarcas", endereco: "Rua Caetano Silveira de Matos, 2371 – Centro", cidade: "Palhoça", uf: "SC",
  whatsapp: "", instagram: "",
  ia: { modo: "fora_horario", horarios, podeInformarPreco: true, podeAgendar: true, enviaFotos: true, tom: "amigavel", instrucoes: "", boasVindas: "Olá!" },
};
const taos = {
  id: "v-taos", empresa_id: "emp1", marca: "Volkswagen", modelo: "Taos", versao: "250 TSI", ano_fabricacao: 2024, ano_modelo: 2024, cor: "Preto",
  carroceria: "SUV", km: 18500, cambio: "Automático", combustivel: "Flex", motor: "1.4 Turbo", portas: 4, opcionais: ["Multimídia"], tipo: "seminovo",
  conservacao: "excelente", checklist: { unicoDono: true, leilaoSinistro: false }, garantia_meses: 6, preco: 154900, fipe: 160000, aceita_troca: true,
  aceita_financiamento: true, descricao: "", instrucoes_ia: "", fotos: [], video_url: "", links: {}, status: "disponivel", destaque: true,
  preco_minimo: 140000, custo_compra: 120000, placa: "ABC1D23", observacoes_internas: "pneu ruim",
} as unknown as Veiculo;

/* ---------------- testes simples ---------------- */

Deno.test("horário: IA atende só fora do expediente (São Paulo)", () => {
  const quartaMeioDia = new Date("2026-11-18T15:00:00Z"); // 12:00 em SP
  const quartaNoite = new Date("2026-11-18T23:30:00Z"); // 20:30 em SP
  const domingo = new Date("2026-11-22T15:00:00Z");
  assertEquals(momentoLocal(quartaMeioDia).hora, "12:00");
  assertEquals(iaDeveAtender(empresa.ia, quartaMeioDia), false);
  assertEquals(iaDeveAtender(empresa.ia, quartaNoite), true);
  assertEquals(iaDeveAtender(empresa.ia, domingo), true);
  assertEquals(iaDeveAtender({ ...empresa.ia, modo: "sempre" }, quartaMeioDia), true);
  assertEquals(iaDeveAtender({ ...empresa.ia, modo: "desligado" }, quartaNoite), false);
});

Deno.test("horário: horários livres respeitam expediente, ocupação e antecedência", () => {
  const agora = new Date("2026-11-18T23:30:00Z");
  const livresQui = horariosLivres(empresa.ia, "2026-11-19", ["2026-11-19T13:30:00.000Z"], 1, agora); // 10:30 SP ocupado
  assertEquals(livresQui[0], "08:30");
  assert(!livresQui.includes("10:30"));
  assertEquals(livresQui.at(-1), "16:30"); // última visita de 1h antes das 18:00
  assertEquals(horariosLivres(empresa.ia, "2026-11-22", [], 1, agora), []); // domingo fechado
  assertEquals(horariosLivres(empresa.ia, "2026-11-21", [], 1, agora), ["08:30", "09:30", "10:30", "11:30"]); // sábado meio período
});

Deno.test("webhook: lê mensagens e confere a assinatura da Meta", async () => {
  const payload = {
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: "123" },
      contacts: [{ wa_id: "5548999990001", profile: { name: "João" } }],
      messages: [
        { id: "wamid.1", from: "5548999990001", timestamp: "1763500000", type: "text", text: { body: "Tem Taos?" } },
        { id: "wamid.2", from: "5548999990001", timestamp: "1763500001", type: "audio" },
      ],
    } }] }],
  };
  const lidas = lerWebhook(payload);
  assertEquals(lidas.length, 2);
  assertEquals(lidas[0].nome, "João");
  assertEquals(lidas[0].texto, "Tem Taos?");
  assertStringIncludes(lidas[1].texto, "áudio");
  assertEquals(lerWebhook({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "1" }, statuses: [{}] } }] }] }).length, 0);

  const corpo = JSON.stringify(payload);
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode("segredo"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hex = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo))), (b) => b.toString(16).padStart(2, "0")).join("");
  assert(await assinaturaValida(corpo, `sha256=${hex}`, "segredo"));
  assert(!(await assinaturaValida(corpo, `sha256=${hex}`, "outro")));
  assert(!(await assinaturaValida(corpo + " ", `sha256=${hex}`, "segredo")));
  assert(!(await assinaturaValida(corpo, null, "segredo")));
});

Deno.test("IA: nunca vê preço mínimo, custo, placa nem observações internas", () => {
  const publico = JSON.stringify(veiculoPublico(taos, true));
  for (const segredo of ["140000", "120000", "ABC1D23", "pneu ruim"]) assert(!publico.includes(segredo), segredo);
  assertStringIncludes(publico, "154900");
  assertStringIncludes(JSON.stringify(veiculoPublico(taos, false)), "informado pelo vendedor");
});

Deno.test("IA: histórico começa pelo cliente e junta mensagens seguidas", () => {
  const m = (autor: Mensagem["autor"], texto: string): Mensagem => ({ id: crypto.randomUUID(), lead_id: "l", autor, autor_nome: "Carlos", texto, midia_url: null, wa_message_id: null, criada_em: "" });
  const h = montarHistorico([m("vendedor", "Oi!"), m("cliente", "oi"), m("cliente", "tem taos?"), m("sistema", "x"), m("ia", "Tem sim")]);
  assertEquals(h.map((x) => x.role), ["user", "assistant"]);
  assertEquals(h[0].content, "oi\ntem taos?");
});

/* ---------------- fluxo completo com APIs falsas ---------------- */

Deno.test("IA: busca no estoque, agenda a visita e responde no WhatsApp", async () => {
  const lead = {
    id: "lead1", empresa_id: "emp1", nome: "João", telefone: "5548999990001", veiculo_id: null, interesse: "", temperatura: "morno",
    importancia: "normal", etapa: "atendimento", etiquetas: [], resumo: "", proxima_acao: "", dados: {}, atendente: "ia", vendedor_id: null,
    nao_lidas: 1, ultima_mensagem_em: "", analisado_em: null,
  } as Lead;
  const dados: Record<string, Linha[]> = {
    leads: [lead as unknown as Linha],
    mensagens: [],
    agendamentos: [],
    vendedores: [{ id: "vend1", empresa_id: "emp1", nome: "Carlos", ativo: true }],
    veiculos: [taos as unknown as Linha],
  };

  // Respostas que a "Anthropic" vai dar, em ordem
  const roteiro = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "buscar_veiculos", input: { texto: "taos", carroceria: null, preco_maximo: null, cambio: null } }] },
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t2", name: "agendar_visita", input: { data: "2026-11-19", hora: "10:30", tipo: "visita", veiculo_id: "v-taos", nome_cliente: null, observacao: "" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Pronto, João! Visita marcada amanhã às 10h30 com o Carlos ✅" }] },
  ];
  const pedidosIA: { messages: { role: string; content: unknown }[]; tools: unknown[]; output_config: unknown; model: string }[] = [];
  const enviadosWhatsApp: unknown[] = [];

  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    const corpo = JSON.parse(String(init?.body ?? (entrada instanceof Request ? await entrada.text() : "{}")));
    if (url.includes("api.anthropic.com")) {
      pedidosIA.push(corpo);
      const passo = roteiro.shift()!;
      return new Response(JSON.stringify({
        id: "msg_" + pedidosIA.length, type: "message", role: "assistant", model: corpo.model, stop_sequence: null,
        usage: { input_tokens: 1000, output_tokens: 50, cache_read_input_tokens: 800 }, ...passo,
      }), { status: 200, headers: { "content-type": "application/json", "request-id": "req_teste" } });
    }
    if (url.includes("graph.facebook.com")) {
      enviadosWhatsApp.push(corpo);
      return new Response(JSON.stringify({ messages: [{ id: "wamid.resposta" }] }), { status: 200 });
    }
    throw new Error("URL inesperada: " + url);
  }) as typeof fetch;

  try {
    const historico: Mensagem[] = [
      { id: "m1", lead_id: "lead1", autor: "cliente", autor_nome: "João", texto: "Tem o Taos? Posso ir amanhã 10h30?", midia_url: null, wa_message_id: "wamid.1", criada_em: "" },
    ];
    const r = await responderCliente(
      { db: bancoFalso(dados), empresa, lead, whatsapp: { empresa_id: "emp1", phone_number_id: "123", access_token: "tok" }, veiculos: [taos], agora: new Date("2026-11-18T23:30:00Z") },
      historico,
    );

    // Resposta enviada pelo WhatsApp
    assertEquals(r.texto, "Pronto, João! Visita marcada amanhã às 10h30 com o Carlos ✅");
    assertEquals(enviadosWhatsApp.length, 1);
    assertEquals((enviadosWhatsApp[0] as { to: string }).to, "5548999990001");

    // Agendamento criado com vendedor e horário certos (10:30 SP = 13:30 UTC)
    assertEquals(dados.agendamentos.length, 1);
    assertEquals(dados.agendamentos[0].inicio, "2026-11-19T13:30:00.000Z");
    assertEquals(dados.agendamentos[0].vendedor_id, "vend1");
    assertEquals(dados.agendamentos[0].origem, "ia");
    assertEquals(dados.leads[0].etapa, "visita");
    assertEquals(dados.leads[0].temperatura, "quente");

    // Mensagem da IA salva no banco
    assertEquals(dados.mensagens.filter((m) => m.autor === "ia").length, 1);

    // O pedido para a IA: modelo barato, esforço baixo, ferramentas, e o resultado da busca sem dados internos
    assertEquals(pedidosIA[0].model, "claude-haiku-5-5");
    assertEquals(pedidosIA[0].output_config, { effort: "low" });
    assertEquals(pedidosIA[0].tools.length, 5);
    const resultadoBusca = JSON.stringify(pedidosIA[1].messages.at(-1));
    assertStringIncludes(resultadoBusca, "154900");
    assert(!resultadoBusca.includes("140000"));
    assertEquals(r.uso.entrada, 3000);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

Deno.test("IA: pedido de desconto passa para o vendedor", async () => {
  const lead = { id: "lead2", empresa_id: "emp1", nome: "Marina", telefone: "5548988880000", etapa: "atendimento", atendente: "ia", vendedor_id: null, etiquetas: [], dados: {} } as unknown as Lead;
  const dados: Record<string, Linha[]> = { leads: [lead as unknown as Linha], mensagens: [], agendamentos: [], vendedores: [], veiculos: [] };
  const roteiro = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "chamar_vendedor", input: { motivo: "Pediu desconto à vista no Taos" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Vou chamar um vendedor para falar de valores com você!" }] },
  ];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    if (url.includes("anthropic")) {
      const corpo = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: corpo.model, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 }, ...roteiro.shift() }), { headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }));
  }) as typeof fetch;
  try {
    await responderCliente(
      { db: bancoFalso(dados), empresa, lead, whatsapp: { empresa_id: "emp1", phone_number_id: "123", access_token: "tok" }, veiculos: [] },
      [{ id: "m1", lead_id: "lead2", autor: "cliente", autor_nome: "", texto: "faz por 140 à vista?", midia_url: null, wa_message_id: null, criada_em: "" }],
    );
    assertEquals(dados.leads[0].atendente, "humano");
    assertEquals(dados.leads[0].importancia, "importante");
    assert(dados.mensagens.some((m) => m.autor === "sistema"));
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

Deno.test("IA: modo teste não envia WhatsApp nem grava nada", async () => {
  const lead = { id: "teste", empresa_id: "emp1", nome: "", telefone: "", etapa: "atendimento", atendente: "ia", vendedor_id: null, veiculo_id: null, etiquetas: [], dados: {} } as unknown as Lead;
  const comFotos = { ...taos, fotos: [{ id: "f1", src: "https://x/1.webp", enviarIA: true }, { id: "f2", src: "https://x/2.webp", enviarIA: false }] } as unknown as Veiculo;
  const dados: Record<string, Linha[]> = { leads: [], mensagens: [], agendamentos: [], vendedores: [{ id: "vend1", empresa_id: "emp1", nome: "Carlos", ativo: true }], veiculos: [] };
  const roteiro = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "enviar_fotos", input: { veiculo_id: "v-taos" } }] },
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t2", name: "agendar_visita", input: { data: "2026-11-19", hora: "10:30", tipo: "visita", veiculo_id: "v-taos", nome_cliente: null, observacao: "" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Mandei as fotos e marquei amanhã às 10h30!" }] },
  ];
  let whatsapp = 0;
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    if (url.includes("graph.facebook.com")) whatsapp++;
    const corpo = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: corpo.model, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 }, ...roteiro.shift() }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const fotos: string[] = [];
    const r = await responderCliente(
      { db: bancoFalso(dados), empresa, lead, whatsapp: { empresa_id: "emp1", phone_number_id: "", access_token: "" }, veiculos: [comFotos], teste: true, fotosTeste: fotos, agora: new Date("2026-11-18T23:30:00Z") },
      [{ id: "m1", lead_id: "teste", autor: "cliente", autor_nome: "", texto: "manda foto do taos e marca amanhã 10h30", midia_url: null, wa_message_id: null, criada_em: "" }],
    );
    assertEquals(r.texto, "Mandei as fotos e marquei amanhã às 10h30!");
    assertEquals(fotos, ["https://x/1.webp"]);
    assertEquals(whatsapp, 0);
    assertEquals(dados.agendamentos.length, 0);
    assertEquals(dados.mensagens.length, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

Deno.test("Gemini: chama ferramenta, devolve thought signature e responde (modo teste)", async () => {
  Deno.env.set("GEMINI_API_KEY", "teste-gemini");
  const { esquemaParaGemini } = await import("../_shared/gemini.ts");
  const convertido = esquemaParaGemini({ type: "object", properties: { a: { type: ["string", "null"], enum: ["x", null] } }, required: ["a"], additionalProperties: false });
  assertEquals(convertido, { type: "object", properties: { a: { type: "string", nullable: true, enum: ["x"] } }, required: ["a"] });

  const lead = { id: "teste", empresa_id: "emp1", nome: "", telefone: "", etapa: "atendimento", atendente: "ia", vendedor_id: null, veiculo_id: null, etiquetas: [], dados: {} } as unknown as Lead;
  const pedidos: Record<string, unknown>[] = [];
  const roteiro = [
    { candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ functionCall: { name: "buscar_veiculos", args: { texto: "taos" } }, thoughtSignature: "assinatura-123" }] } }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 20 } },
    { candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: "pensando...", thought: true }, { text: "Temos o Taos 2024 por R$ 154.900!" }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 30, thoughtsTokenCount: 10 } },
  ];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    assertStringIncludes(url, "generativelanguage.googleapis.com");
    assertEquals(new Headers(init?.headers).get("x-goog-api-key"), "teste-gemini");
    pedidos.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify(roteiro.shift()), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const dados: Record<string, Linha[]> = { leads: [], mensagens: [], agendamentos: [], vendedores: [], veiculos: [] };
    const r = await responderCliente(
      { db: bancoFalso(dados), empresa, lead, whatsapp: { empresa_id: "emp1", phone_number_id: "", access_token: "" }, veiculos: [taos], teste: true, fotosTeste: [], provedor: "gemini" },
      [{ id: "m1", lead_id: "teste", autor: "cliente", autor_nome: "", texto: "tem taos?", midia_url: null, wa_message_id: null, criada_em: "" }],
    );
    assertEquals(r.provedor, "gemini");
    assertEquals(r.texto, "Temos o Taos 2024 por R$ 154.900!");
    assertEquals(r.uso.entrada, 1900);
    // Na 2ª chamada o histórico leva a chamada do modelo (com a assinatura) e o resultado da ferramenta
    const conteudos = pedidos[1].contents as { role: string; parts: Record<string, unknown>[] }[];
    assertEquals(conteudos.map((c) => c.role), ["user", "model", "user"]);
    assertEquals(conteudos[1].parts[0].thoughtSignature, "assinatura-123");
    const resultado = JSON.stringify(conteudos[2].parts[0]);
    assertStringIncludes(resultado, "154900");
    assert(!resultado.includes("140000"));
    const ferramentas = JSON.stringify(pedidos[0].tools);
    assert(!ferramentas.includes("additionalProperties"));
  } finally {
    globalThis.fetch = fetchOriginal;
    Deno.env.delete("GEMINI_API_KEY");
  }
});
