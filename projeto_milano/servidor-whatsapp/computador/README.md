# Servidor do WhatsApp num computador (Windows)

Use quando não der para usar a Oracle Cloud. O computador roda o servidor do WhatsApp (Evolution API) e o
**ngrok** dá um endereço fixo na internet para o painel falar com ele, sem mexer no roteador.

**Importante:** o computador precisa ficar **ligado 24 horas**, com internet. Se ele desligar, a IA para de
responder até ele voltar (as mensagens dos clientes continuam chegando no celular da loja normalmente).

## 1. Prepare o computador (uma vez só)

1. Instale o **Docker Desktop**: <https://www.docker.com/products/docker-desktop/>. Na instalação, deixe marcado
   **Use WSL 2**. Reinicie se ele pedir. Abra o Docker Desktop e, em **Settings → General**, marque
   **Start Docker Desktop when you sign in**.
2. Configure o Windows para **não suspender**: **Configurações → Sistema → Energia → Suspender: Nunca**.
3. Crie uma conta grátis no **ngrok**: <https://dashboard.ngrok.com/signup>.
   - Em **Getting Started → Setup & Installation**, baixe o ngrok para Windows e rode o comando
     `ngrok config add-authtoken ...` que aparece lá (no PowerShell).
   - Em **Domains**, clique em **+ New Domain** para pegar o seu **domínio fixo grátis**
     (algo como `nome-aleatorio.ngrok-free.app`). Anote.

## 2. Suba o servidor

Abra o **PowerShell** dentro desta pasta (`servidor-whatsapp\computador`) e rode, trocando pelo seu domínio:

```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1 -Endereco "https://SEU-DOMINIO.ngrok-free.app"
```

Ele mostra o **Endereço** e a **Chave**. Guarde a chave (não mande em chat nem em print).

## 3. Ligue o ngrok (fica rodando sempre)

Para o ngrok ligar sozinho junto com o Windows, rode **uma vez** no PowerShell **como administrador**
(troque o domínio e use o caminho do arquivo de configuração que o `ngrok config add-authtoken` mostrou):

```powershell
ngrok service install --config "$env:LOCALAPPDATA\ngrok\ngrok.yml"
```

E acrescente no fim desse arquivo `ngrok.yml` (abra com o Bloco de Notas):

```yaml
tunnels:
  whatsapp:
    proto: http
    addr: 8080
    domain: SEU-DOMINIO.ngrok-free.app
```

Depois: `ngrok service start`. Para testar sem instalar o serviço, dá para rodar só
`ngrok http --url=SEU-DOMINIO.ngrok-free.app 8080` (mas aí ele para quando fechar a janela).

## 4. Ligue o servidor ao painel

No Supabase do projeto, abra **SQL Editor → New query**, cole o comando abaixo trocando `ENDERECO` e `CHAVE`
pelo endereço e pela chave do passo 2 (mantenha as aspas simples) e clique em **Run**:

```sql
insert into public.empresa_whatsapp (empresa_id, provedor, api_url, instancia, access_token, phone_number_id)
values ('d0bf0426-7490-4d70-aa91-c054952f82a6', 'evolution', 'ENDERECO', 'milano', 'CHAVE', null)
on conflict (empresa_id) do update
  set provedor = 'evolution', api_url = excluded.api_url, instancia = 'milano',
      access_token = excluded.access_token, phone_number_id = null
returning 'https://tobmcmqluydaxrdxsxbi.supabase.co/functions/v1/whatsapp-evolution?token=' || webhook_token as url_do_webhook;
```

O resultado é a **URL do webhook** (segredo: não mande em chat).

## 5. Conecte o WhatsApp da loja

```powershell
powershell -ExecutionPolicy Bypass -File .\conectar.ps1 -Webhook "URL_DO_WEBHOOK"
```

Vai abrir uma imagem com o **QR Code**. No celular da loja: **WhatsApp Business → ⋮ (ou Configurações) →
Aparelhos conectados → Conectar um aparelho** e leia o código. Quando aparecer **WhatsApp conectado!**, mande
uma mensagem de outro número para a loja e veja se chega no painel.

## Problemas comuns

- **`docker` não é reconhecido** → o Docker Desktop não está instalado ou não está aberto.
- **O QR Code não aparece** → espere 1 minuto (o servidor demora para subir na primeira vez) e rode o passo 5 de novo.
- **A mensagem chega no painel mas a IA não responde no WhatsApp** → o ngrok não está rodando.
  Abra <https://SEU-DOMINIO.ngrok-free.app> no navegador: tem que aparecer uma página da Evolution API.
- **Depois de reiniciar o PC nada funciona** → abra o Docker Desktop e confira o serviço do ngrok (`ngrok service start`).
- **Ver erros do servidor** → `docker compose logs --tail=80 evolution` dentro desta pasta.
