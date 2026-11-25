#!/usr/bin/env bash
# Instala o servidor do WhatsApp (Evolution API) numa VM Ubuntu nova (Oracle Cloud, etc.).
# Uso:  bash instalar.sh
# No fim mostra o ENDEREÇO e a CHAVE do servidor (guarde a chave; não mande em chat).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Instalando Docker…"
if ! command -v docker >/dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y docker.io docker-compose-v2 curl openssl qrencode jq
  sudo usermod -aG docker "$USER" || true
else
  sudo apt-get install -y qrencode jq curl openssl >/dev/null
fi

echo "==> Liberando as portas 80 e 443 no firewall da VM…"
# As imagens Ubuntu da Oracle vêm com regras de iptables que bloqueiam tudo menos o SSH.
for porta in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$porta" -m state --state NEW -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -p tcp --dport "$porta" -m state --state NEW -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

if [ ! -f .env ]; then
  IP=$(curl -fsS https://api.ipify.org)
  DOMINIO="${IP//./-}.sslip.io"   # endereço com HTTPS grátis, sem precisar comprar domínio
  {
    echo "DOMINIO=$DOMINIO"
    echo "API_KEY=$(openssl rand -hex 24)"
    echo "DB_SENHA=$(openssl rand -hex 16)"
  } > .env
  chmod 600 .env
fi
set -a; source .env; set +a

echo "==> Subindo os serviços…"
sudo docker compose up -d

echo "==> Esperando o servidor responder em https://$DOMINIO …"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "https://$DOMINIO/"; then break; fi
  sleep 5
done

cat <<FIM

======================================================================
 Servidor do WhatsApp no ar!

   Endereço: https://$DOMINIO
   Chave:    $API_KEY

 Próximo passo: no Supabase (SQL Editor) rode o comando do guia com
 esse endereço e essa chave. Ele devolve a URL do webhook. Depois:

   bash conectar.sh "<URL do webhook>"

 A chave também fica salva em: $(pwd)/.env
======================================================================
FIM
