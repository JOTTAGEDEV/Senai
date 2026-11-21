# Milano Multimarcas — Painel com IA no WhatsApp

Sistema de atendimento da Milano Multimarcas (Palhoça/SC): a IA responde os clientes no WhatsApp oficial, consulta o estoque, agenda visitas e classifica os leads; a loja acompanha tudo num painel.

## Rodar

```bash
cd projeto_milano
npm install
npm run dev
```

Abra http://localhost:3000.

- **Sem configurar nada**: modo demonstração — qualquer e-mail/senha entra, dados de exemplo, IA simulada (dá para "simular" um cliente escrevendo e ver a IA responder).
- **Para ligar de verdade** (Supabase + WhatsApp + IA): siga o [BACKEND.md](./BACKEND.md).

## Telas

| Tela | O que faz |
|---|---|
| **Dashboard** | Números do dia, alertas (lead quente sem resposta, carro parado), funil, carros mais procurados, assuntos, próximas visitas |
| **Conversas** | Caixa de entrada estilo WhatsApp, IA/vendedor, botões Assumir e Devolver para IA, painel lateral com resumo e etiquetas |
| **Leads** | Lista com filtros por temperatura, etapa, etiqueta e vendedor; ficha completa do cliente |
| **Estoque** | Lista com filtros e resumo; cadastro completo do carro com até 15 fotos (capa, ordem, 3 para a IA) |
| **Agenda** | Visitas e test-drives por dia, marcados pela IA ou manualmente |
| **Configurações** | Dados da loja, quando a IA atende, horário da loja, regras da IA, vendedores, conexão |

## Estrutura

```
app/                       telas (Next.js App Router)
  login/
  (painel)/dashboard, conversas, leads, estoque, agenda, configuracoes
components/                peças das telas
lib/
  dados.tsx                estado do painel (usado por todas as telas)
  fonte-dados.ts           de onde vêm os dados: navegador (demo) ou Supabase
  ia-simulada.ts           IA de mentira para o modo demonstração
  crm.ts, constants.ts     listas e regras (etapas, etiquetas, status, horário da IA)
  types.ts                 tipos (Veiculo, Lead, Mensagem, Agendamento...)
supabase/
  migrations/              banco de dados
  functions/               servidor: webhook do WhatsApp, IA atendente, IA analista, envio pelo painel
BACKEND.md                 passo a passo para ligar tudo
```

## Logo e dados da loja

Logo original em `public/logo-milano-original.gif`, redesenhada em vetor em `components/Logo.tsx`. Cores: grafite, verde e vermelho da bandeira italiana.
Endereço (de anúncios públicos): Rua Caetano Silveira de Matos, 2371 – Centro, Palhoça/SC. WhatsApp, Instagram e horário: confirmar com a loja (editável em Configurações).

O estoque de exemplo usa modelos reais dos anúncios da loja; km, opcionais, status, leads e conversas são fictícios.

## Testes

```bash
npm run lint && npx tsc --noEmit                    # painel
cd supabase/functions && deno test --allow-env tests/   # servidor
```
