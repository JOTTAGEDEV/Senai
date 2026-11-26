# Memória do projeto — Painel Milano Multimarcas (JL Devs)

> Este arquivo é a "memória" do projeto para o Claude (e outras IAs). Atualize quando algo importante mudar.
> **Nunca** escreva aqui chaves, tokens ou senhas.

## Quem e o quê
- **Cliente:** Milano Multimarcas, loja de carros em Palhoça/SC. Contato: a dona da loja (não citar o nome dela em material público).
- **Fornecedor:** JL Devs (o usuário). Ainda **não tem CNPJ** (por isso não dá para virar parceiro/Tech Provider da Meta).
- **Colaborador:** Lucas (amigo) também mexe no repositório — cada um na sua branch, juntar por pull request, e só um publica.
- **Combinado comercial:** projeto ~R$ 1.100 fixo + ~R$ 197/mês (IA/infra). Taxas do WhatsApp quem paga é a loja.
- **Usuário:** fala português, prefere explicações simples e passo a passo; quer **economizar uso do Claude**
  (usa o Codex no Windows dele para tarefas paralelas). Nunca pedir para colar chave/token no chat:
  usar o formulário seguro (request_credential) ou o SQL Editor/Secrets do Supabase.

## O produto
Painel (SaaS) para a loja: conversas do WhatsApp, IA que atende **só fora do horário**, leads (quente/morno/frio,
etapas, etiquetas, resumo da IA), estoque com até 15 fotos por carro, agenda (visita/test-drive), dashboard,
configurações e tela **Testar IA**. Visual "Liquid Glass" escuro, logo da JL Devs no fundo e selo "Desenvolvido por JL Devs".

## Onde está tudo
- **Repositório:** `jottagedev/senai`, pasta `projeto_milano/`. Branch de trabalho: `claude/gracious-keller-n5votd`
  (a `main` recebeu o merge do PR #2; trabalho novo ainda está na branch).
- **Site (Vercel):** https://milano-painel.vercel.app — projeto `nz-dev2/milano-painel`.
  Publicar: `cd projeto_milano && VERCEL_TELEMETRY_DISABLED=1 npx --yes vercel@65.12.0 --token proxyinjected deploy --prod --yes`
  (o token real é injetado pelo proxy da sessão na nuvem). Deploy automático pelo GitHub **falha** porque o Root
  Directory da Vercel não está em `projeto_milano` — ignorar ou o usuário ajusta nas Settings.
- **Supabase:** projeto `milano-multimarcas`, ref `tobmcmqluydaxrdxsxbi` (sa-east-1). Empresa Milano no banco:
  `d0bf0426-7490-4d70-aa91-c054952f82a6`. **Não mexer** no outro projeto Supabase do usuário (tabela `prospects`).
  Publicar funções (o token real é injetado pelo proxy; exporte antes um marcador falso no formato `sbp_` + 40 zeros
  em `SUPABASE_ACCESS_TOKEN`):
  `cd projeto_milano && npx --yes supabase@3.1.0 functions deploy NOME --project-ref tobmcmqluydaxrdxsxbi --use-api --yes`
  Migrações: `supabase/migrations/` (aplicar com o MCP da Supabase `apply_migration`).
- **Testes do back-end:** `cd projeto_milano/supabase/functions && deno test --allow-env tests/` (20 testes).
  Front: `npx tsc --noEmit && npm run lint && npm run build`.

## Back-end (Supabase Edge Functions)
- `whatsapp-webhook` (Meta oficial), `whatsapp-evolution` e `whatsapp-zapi` (WhatsApp por QR Code; segurança: `?token=` na URL),
  `enviar-mensagem` (vendedor responde pelo painel), `testar-ia`, `ia-analista` (classifica leads), `ia-followup`.
- `_shared/canal.ts`: envio por provedor (meta/evolution/zapi) — tabela `empresa_whatsapp.provedor`.
- `_shared/atendimento.ts`: recebe mensagem, IA responde depois de 8 s; mensagem enviada **pelo celular da loja**
  (fromMe) vira "Vendedor (celular)" e a IA para naquele cliente.
- **IA:** DeepSeek (`IA_PROVEDOR=deepseek`, modelo `deepseek-flash`) — também aceita Claude e Gemini (raciocínio "low").
  Secrets ficam em Supabase → Edge Functions → Secrets (DEEPSEEK_API_KEY, IA_PROVEDOR, WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET, CRON_SECRET). O verify token atual é curto demais — trocar antes da entrega.
- **Follow-up:** só para quem já conversou, não vendido/perdido; depois de N dias (padrão 3), máx. 2 por cliente,
  janela 10h–18h nos dias em que a loja abre, 3 por rodada com 20–45 s de intervalo. Configurável no painel
  (Configurações → IA). Vem **desligado**. Na Meta oficial não roda (fora de 24h exige template pago).
- **pg_cron:** `ia-analista` a cada 5 min e `ia-followup` a cada 15 min, chamando `public.chamar_funcao_cron`, que lê o
  segredo do Vault `cron_secret`. **Pendente:** o usuário rodar `select vault.create_secret('<CRON_SECRET>', 'cron_secret');`.

## WhatsApp — situação
- **Meta oficial (teste):** app "Milano" no portfólio JL devs, número de teste +1 555 183-3994 (Phone Number ID
  1384831954720888, WABA 4660756944201786), webhook configurado e funcionando. Limitações: número de teste só responde
  para a lista "Para" e **não entrega para celulares do Brasil** (erro 130497).
- **Decisão da loja:** não quer pagar as taxas da Meta → usar **WhatsApp por QR Code** (não oficial, risco de bloqueio
  baixo porque só responde/faz follow-up com quem já conversou). A loja usa **WhatsApp Business** e continua usando no celular.
- **Oracle Cloud:** o cadastro do usuário foi recusado → **não usar**. Kit em `servidor-whatsapp/` (Linux) fica como opção.
- **Caminho atual:** Evolution API v2.3.7 num **computador Windows** (Docker Desktop + ngrok com domínio fixo grátis):
  kit em `servidor-whatsapp/computador/` (`iniciar.ps1`, `conectar.ps1`, README). Alternativa paga e simples: **Z-API**
  (já suportada no código). Formatos da Evolution/Z-API foram escritos sem a documentação (sites bloqueados na nuvem):
  conferir no primeiro teste real.

## Pendências
1. Usuário: criar o segredo `cron_secret` no Vault (liga analista e follow-up).
2. Usuário: subir o servidor (computador Windows ou Z-API), rodar o SQL do guia, ler o QR Code; depois testar
   uma mensagem real e ligar o follow-up no painel.
3. Antes de entregar para a loja: limpar dados de teste (conversas, test-drive de teste, agendamentos [TESTE]),
   trocar tokens provisórios, Vercel no plano pago (uso comercial), chave da IA na conta certa.
4. Ideia em aberto: integrar com o CRM da loja (usuário vai descobrir qual é).

## Outros entregáveis
- Reel do Instagram "IA para lojas de carros" (sem nome da loja/cliente): `projeto_reel_ia_carros/`
  (`reel-ia-carros.mp4`, capa, legenda; narração gerada via Speko voz "Caio").
