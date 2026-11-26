# Servidor do WhatsApp na Oracle Cloud

Este guia instala o servidor do WhatsApp do Milano em uma máquina virtual (VM) da Oracle Cloud e conecta o WhatsApp Business da loja ao painel. Tenha acesso à sua conta Oracle Cloud, à pasta `projeto_milano` no Windows e ao celular principal da loja.

## 1. Crie a rede e a VM grátis

1. Entre no [Console da Oracle Cloud](https://cloud.oracle.com/) e selecione a **região principal** da sua conta. É nessa região que você pode usar as VMs Always Free.
2. No menu, abra **Rede → Redes virtuais na nuvem** (**Networking → Virtual Cloud Networks**). Clique em **Iniciar assistente de VCN** e escolha **Criar VCN com conectividade à Internet**. Dê um nome à rede, como `rede-milano`, e conclua. O assistente cria a sub-rede pública e a rota para a internet.
3. Abra **Compute → Instâncias** e clique em **Criar instância**. Dê um nome à VM, como `whatsapp-milano`.
4. Em **Imagem e formato** (**Image and shape**), escolha **Canonical Ubuntu 24.04 LTS** para **Arm (aarch64)** e o formato **Ampere `VM.Standard.A1.Flex`**. Confira a indicação **Always Free Eligible**. Use **1 OCPU e 6 GB de memória** se houver essa capacidade disponível na sua cota. Mantenha o tamanho padrão do disco de inicialização dentro da cota gratuita.
5. Em **Rede** (**Networking**), escolha a VCN do passo 2, selecione a **sub-rede pública** e habilite **Atribuir endereço IPv4 público**.
6. Em **Chaves SSH**, escolha **Gerar um par de chaves SSH** e baixe a **chave privada**. Guarde o arquivo `.key` no seu computador. Você vai usá-lo para acessar a VM.
7. Clique em **Criar**. Quando o status mudar para **Em execução** (**Running**), anote o **IPv4 público** que aparece nos detalhes da instância.

[Tutorial da Oracle para criar uma VM](https://docs.oracle.com/en-us/iaas/Content/Compute/tutorials/first-linux-instance/overview.htm) · [Limites Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

## 2. Libere as portas 80 e 443 na VCN

1. No Console da Oracle, abra **Rede → Redes virtuais na nuvem** e clique na VCN da VM.
2. Abra a **sub-rede pública** da VM, vá a **Listas de segurança** (**Security Lists**) e clique na lista associada à sub-rede. Se você usou o assistente com as opções padrão, ela é a **Default Security List** da sua VCN.
3. Em **Regras de entrada** (**Ingress Rules**), clique em **Adicionar regras de entrada** e salve estas duas regras. Deixe a caixa **Stateless** desmarcada nas duas.

   | Tipo de origem | CIDR de origem | Protocolo | Porta de origem | Porta de destino |
   | --- | --- | --- | --- | --- |
   | CIDR | `0.0.0.0/0` | TCP | Todas | `80` (HTTP) |
   | CIDR | `0.0.0.0/0` | TCP | Todas | `443` (HTTPS) |

4. Confira se há uma regra de entrada **TCP 22** que permite o SSH do seu computador. A lista padrão já inclui SSH. Se precisar adicionar uma regra, use seu IP público seguido de `/32` no CIDR de origem, porta de origem **Todas** e porta de destino `22`.

[Como abrir HTTP e HTTPS na lista de segurança da Oracle](https://docs.oracle.com/en/learn/publish-webserver-using-oci/)

## 3. Entre por SSH pelo PowerShell

Abra o **PowerShell** no Windows. Troque o caminho pelo da chave privada baixada e o IP pelo **IPv4 público** da VM.

```powershell
$ChaveSsh = 'C:\caminho\ssh-key.key'
$IpVm = 'IP_PUBLICO_DA_VM'
ssh -i $ChaveSsh "ubuntu@$IpVm"
```

Na primeira conexão, o SSH pode pedir que você confirme o servidor. Confira se o IP mostrado é o da sua VM e digite `yes`. Quando aparecer o terminal do Ubuntu, digite `exit` para voltar ao PowerShell e copiar a pasta.

## 4. Copie a pasta e instale o servidor

No **mesmo PowerShell**, entre na pasta `projeto_milano` do seu computador. Copie a pasta `servidor-whatsapp` inteira, com o `Caddyfile`, o `docker-compose.yml` e os dois scripts. Depois entre novamente na VM.

```powershell
Set-Location 'C:\caminho\projeto_milano'
scp -i $ChaveSsh -r .\servidor-whatsapp "ubuntu@${IpVm}:/home/ubuntu/"
ssh -i $ChaveSsh "ubuntu@$IpVm"
```

Agora, no **terminal da VM**, rode os três comandos abaixo. O `sed` ajusta as quebras de linha dos scripts copiados do Windows para que o Ubuntu consiga executá-los.

```bash
cd ~/servidor-whatsapp
sed -i 's/\r$//' instalar.sh conectar.sh
bash instalar.sh
```

O script instala o Docker, abre as portas 80 e 443 no firewall do Ubuntu e inicia o servidor. Isso pode levar alguns minutos.

No fim, **guarde o Endereço e a Chave** que aparecem. O endereço começa com `https://` e termina em `.sslip.io`. Abra-o no navegador para confirmar que responde sem erro de certificado. A chave também fica no arquivo `.env` da VM. Guarde-a em um local privado e evite compartilhá-la em mensagens ou prints.

## 5. Configure o webhook e leia o QR Code

1. Gere a **URL do webhook** ligando o servidor ao painel. No Supabase do projeto, abra **SQL Editor → New query**, cole o comando abaixo, troque `ENDERECO` e `CHAVE` pelo endereço e pela chave do passo 4 (mantenha as aspas simples) e clique em **Run**:

   ```sql
   insert into public.empresa_whatsapp (empresa_id, provedor, api_url, instancia, access_token, phone_number_id)
   values ('d0bf0426-7490-4d70-aa91-c054952f82a6', 'evolution', 'ENDERECO', 'milano', 'CHAVE', null)
   on conflict (empresa_id) do update
     set provedor = 'evolution', api_url = excluded.api_url, instancia = 'milano',
         access_token = excluded.access_token, phone_number_id = null
   returning 'https://tobmcmqluydaxrdxsxbi.supabase.co/functions/v1/whatsapp-evolution?token=' || webhook_token as url_do_webhook;
   ```

   O resultado é a **URL completa do webhook**. Copie tudo, inclusive o trecho `?token=...`. Ela é um segredo: não mande em chat nem em print.
2. No terminal da VM, dentro de `~/servidor-whatsapp`, rode o comando abaixo e substitua `<URL do webhook>` pela URL completa. Mantenha as aspas.

   ```bash
   bash conectar.sh "<URL do webhook>"
   ```

3. No **celular principal da loja**, abra o **WhatsApp Business**. No Android, toque nos **três pontos (⋮)**. No iPhone, abra **Configurações**.
4. Toque em **Aparelhos conectados** (ou **Dispositivos conectados**) e em **Conectar um aparelho** (ou **Conectar dispositivo**). Aponte a câmera para o QR Code que apareceu no terminal.
5. Aguarde a mensagem **WhatsApp conectado!** no terminal. Para conferir se o webhook está funcionando, envie uma mensagem de outro número para a loja e veja se ela chega ao painel.

[Ajuda do WhatsApp Business sobre conectar um dispositivo por QR Code](https://faq.whatsapp.com/878854700132604/?cms_platform=android&locale=pt_BR)

## Problemas comuns

- **A Oracle mostra `Out of host capacity`.** Tente outro domínio de disponibilidade na mesma região, se houver. Se continuar sem capacidade, tente novamente mais tarde.
- **O PowerShell não reconhece `ssh` ou `scp`.** Instale o **Cliente OpenSSH** nos **Recursos opcionais** do Windows e reabra o PowerShell. [Guia da Microsoft](https://learn.microsoft.com/pt-br/windows-server/administration/openssh/openssh_install_firstuse)
- **O SSH dá `Connection timed out` ou o `scp` não conecta.** Confira se a VM está em execução, se você está usando o IPv4 público e se a lista de segurança da sub-rede permite TCP 22 do seu IP. Confira também a rota da sub-rede pública para o **Internet Gateway**.
- **O SSH dá `Permission denied (publickey)`.** Confirme o usuário `ubuntu` e selecione o arquivo da chave privada baixada ao criar essa VM. Se o SSH reclamar que a chave está acessível a outros usuários, abra **Propriedades → Segurança → Avançado** no arquivo e deixe o acesso apenas para o seu usuário do Windows.
- **O Bash mostra `command not found` com `\r` ou um erro de sintaxe logo no começo.** Rode a linha com `sed` do passo 4 na VM e repita o comando que falhou.
- **O endereço não abre ou o navegador reclama do certificado.** Confirme se o endereço `sslip.io` corresponde ao IPv4 público atual e se as duas regras TCP, 80 e 443, estão na lista de segurança da sub-rede pública. Na VM, dentro de `~/servidor-whatsapp`, rode `sudo docker compose ps` e `sudo docker compose logs --tail=80 caddy evolution` para ver o estado e os erros dos serviços.
- **O QR Code expirou ou não apareceu.** O script tenta atualizar o código a cada 30 segundos. Leia o código mais recente. Se o script encerrar, rode `bash conectar.sh` de novo com a mesma URL. Você também pode abrir o endereço do servidor com `/manager` no fim, entrar com o endereço e a chave e conectar por lá.
- **O WhatsApp conectou, mas as mensagens não chegam ao painel.** Confira se a URL é a do projeto Supabase da loja e se o `?token=...` foi copiado inteiro. Peça ao responsável pelo painel para verificar se a função `whatsapp-evolution` está publicada e se a conexão está cadastrada como `milano`.
