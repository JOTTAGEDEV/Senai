# Back-end — como ligar o sistema de verdade

O painel funciona em dois modos:

| Modo | Quando | Dados | IA |
|---|---|---|---|
| **Demonstração** | sem `.env.local` | no navegador (IndexedDB) | simulada |
| **Real** | com as variáveis do Supabase | banco Supabase, login, tempo real | Claude Haiku 5.5 + WhatsApp oficial |

## Como funciona

```
Cliente no WhatsApp
      │
      ▼
Meta (WhatsApp Cloud API) ──POST──▶ Edge Function whatsapp-webhook
                                       │ 1. confere a assinatura da Meta
                                       │ 2. salva a mensagem e cria/atualiza o lead
                                       │ 3. espera 8 s (o cliente pode mandar mais mensagens)
                                       │ 4. se a IA deve atender: chama o Claude com ferramentas
                                       │      buscar_veiculos · enviar_fotos · horarios_livres
                                       │      agendar_visita · chamar_vendedor
                                       ▼
                               resposta sai pelo WhatsApp + fica salva no banco
                                       │
Painel (Next.js) ◀── tempo real ───────┘

pg_cron (a cada 5 min) ──▶ Edge Function ia-analista
                              lê conversas paradas há 10 min e preenche:
                              temperatura, etiquetas, resumo, próxima ação, carro, dados do cliente

Vendedor responde no painel ──▶ Edge Function enviar-mensagem ──▶ WhatsApp
```

| Arquivo | O que é |
|---|---|
| `supabase/migrations/20261120000000_inicial.sql` | Tabelas, segurança por loja (RLS), tempo real, bucket de fotos |
| `supabase/functions/whatsapp-webhook` | Recebe mensagens da Meta e faz a IA responder |
| `supabase/functions/enviar-mensagem` | Vendedor responde pelo painel |
| `supabase/functions/ia-analista` | Classifica os leads (temperatura, etiquetas, resumo) |
| `supabase/functions/_shared/ia.ts` | Prompt e ferramentas da IA atendente |
| `supabase/functions/tests` | Testes (sem internet e sem custo) |

---

## Projeto já criado

| | |
|---|---|
| Projeto Supabase | `milano-multimarcas` (ref `tobmcmqluydaxrdxsxbi`, região São Paulo) |
| URL | `https://tobmcmqluydaxrdxsxbi.supabase.co` |
| Webhook para a Meta | `https://tobmcmqluydaxrdxsxbi.supabase.co/functions/v1/whatsapp-webhook` |
| Feito | Passo 1 (banco + ajustes dos advisors) e Passo 4 (as 3 funções publicadas) |
| Falta | Passo 2 (usuário da loja), secrets do Passo 4, Passo 5 (Meta) e Passo 6 (cron) |

Nos comandos abaixo, `SEU_REF` = `tobmcmqluydaxrdxsxbi`.

## Passo 1 — Banco de dados (Supabase)

1. Em [supabase.com](https://supabase.com), crie um projeto (região **São Paulo**, `sa-east-1`, para ficar mais rápido no Brasil).
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/migrations/20261120000000_inicial.sql` e clique em **Run**.
   - Ou pelo terminal: `npx supabase link --project-ref SEU_REF` e `npx supabase db push`.

## Passo 2 — Usuário da loja

1. **Authentication → Users → Add user**: crie o e-mail e a senha da dona da loja.
2. No **SQL Editor**:
   ```sql
   select public.cadastrar_loja('dona@milano.com.br', 'Milano Multimarcas', 'Nome da dona');
   ```
   Guarde o `id` que aparece: é o id da empresa.
3. Para cada vendedor que vai entrar no painel: crie o usuário em Authentication e rode
   ```sql
   select public.adicionar_membro('vendedor@milano.com.br', 'ID-DA-EMPRESA', 'vendedor', 'Carlos');
   ```

## Passo 3 — Painel

```bash
cd projeto_milano
cp .env.example .env.local      # preencha URL e chave (Project Settings → API)
npm install
npm run dev
```
Entre com o e-mail e a senha do passo 2. A partir daqui o painel já funciona com banco de verdade (estoque, leads, agenda, configurações, fotos no Storage). Falta só o WhatsApp e a IA.

## Passo 4 — Funções do servidor (Edge Functions)

```bash
npx supabase login
npx supabase link --project-ref SEU_REF
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy ia-analista --no-verify-jwt
npx supabase functions deploy enviar-mensagem

npx supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  WHATSAPP_VERIFY_TOKEN=uma-frase-secreta-qualquer \
  WHATSAPP_APP_SECRET=app-secret-do-app-da-meta \
  CRON_SECRET=outra-frase-secreta
```

- `ANTHROPIC_API_KEY`: crie em [console.anthropic.com](https://console.anthropic.com) → API Keys. Coloque um **limite de gasto** lá.
- `WHATSAPP_VERIFY_TOKEN`: você inventa; vai digitar igual na Meta (passo 5).
- `WHATSAPP_APP_SECRET`: no app da Meta → App settings → Basic → App secret.

Opcionais: `IA_MODELO` (padrão `claude-haiku-5-5`), `IA_ESPERA_MS` (padrão 8000), `ANALISTA_ESPERA_MIN` (padrão 10), `WHATSAPP_GRAPH_VERSION` (padrão `v23.0`).

## Passo 5 — WhatsApp oficial (Meta)

1. Em [business.facebook.com](https://business.facebook.com), use o Meta Business **da loja** (com o CNPJ dela) e cadastre o **cartão da loja** no WhatsApp Manager — a Meta cobra a loja diretamente.
2. Em [developers.facebook.com](https://developers.facebook.com): **Create App → Business**, adicione o produto **WhatsApp** e conecte o número da loja.
3. Gere um **token permanente**: Business Settings → System users → Add → gerar token com `whatsapp_business_messaging` e `whatsapp_business_management`.
4. **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://SEU_REF.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: o mesmo `WHATSAPP_VERIFY_TOKEN`
   - Em **Webhook fields**, assine **messages**.
5. Ligue o número à empresa no **SQL Editor** (o token fica numa tabela que o navegador nunca lê):
   ```sql
   insert into public.empresa_whatsapp (empresa_id, phone_number_id, access_token)
   values ('ID-DA-EMPRESA', 'PHONE_NUMBER_ID', 'TOKEN_PERMANENTE');
   ```
   O `PHONE_NUMBER_ID` aparece em WhatsApp → API Setup.

Pronto: mande uma mensagem para o número da loja fora do horário (ou com a IA em "Sempre") e veja a resposta chegar e aparecer no painel.

## Passo 6 — IA analista a cada 5 minutos

1. **Database → Extensions**: ative `pg_cron` e `pg_net`.
2. No **SQL Editor**:
   ```sql
   select cron.schedule(
     'ia-analista',
     '*/5 * * * *',
     $$ select net.http_post(
          url := 'https://SEU_REF.supabase.co/functions/v1/ia-analista',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'MESMO_CRON_SECRET'),
          body := '{}'::jsonb
        ) $$
   );
   ```

## Testes

```bash
cd supabase/functions
deno test --allow-env tests/
```
Testa horários, leitura e assinatura do webhook, que a IA nunca vê dados internos (preço mínimo, custo, placa, observações), e o fluxo completo da IA (buscar carro → agendar → responder no WhatsApp) com Anthropic e WhatsApp falsos.

## Segurança

- Cada usuário só vê os dados da própria loja (RLS em todas as tabelas, testado).
- O token do WhatsApp fica na tabela `empresa_whatsapp`, sem acesso pelo navegador.
- O webhook só aceita POSTs assinados pela Meta (`X-Hub-Signature-256`).
- A IA recebe só os campos públicos do carro.
- Fotos: cada loja só grava na própria pasta do bucket.

## Ainda não feito (próximas fases)

- **Teste com as APIs reais**: o código foi testado com Anthropic e WhatsApp simulados. No primeiro uso real, acompanhe os logs em Edge Functions → Logs.
- Mensagens fora da janela de 24h (lembrete de visita, retomada) precisam de **templates aprovados** pela Meta — ainda não implementado.
- Áudio do cliente não é transcrito (a IA vê “[o cliente enviou um áudio]” e pode chamar o vendedor).
- Fotos enviadas pelo cliente (ex.: carro da troca) não são baixadas para o painel.
- Aviso no WhatsApp do vendedor quando um lead fica quente.
- Painel de consumo/custo da IA (os dados já são gravados na tabela `uso_ia`).
