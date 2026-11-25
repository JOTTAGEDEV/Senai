#!/usr/bin/env bash
# Cria a conexão "milano" na Evolution API, liga o webhook do painel e mostra o QR Code
# para ler com o WhatsApp Business da loja (Aparelhos conectados → Conectar um aparelho).
# Uso:  bash conectar.sh "https://<projeto>.supabase.co/functions/v1/whatsapp-evolution?token=..."
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a
WEBHOOK="${1:?Passe a URL do webhook (o SQL do guia devolve ela)}"
INST="${INSTANCIA:-milano}"
API="https://$DOMINIO"
H=(-H "apikey: $API_KEY" -H "Content-Type: application/json")
EVENTOS='["MESSAGES_UPSERT","CONNECTION_UPDATE"]'

echo "==> Criando a conexão \"$INST\"…"
curl -sS "${H[@]}" -X POST "$API/instance/create" -d "{
  \"instanceName\": \"$INST\", \"integration\": \"WHATSAPP-BAILEYS\", \"qrcode\": true,
  \"groupsIgnore\": true, \"rejectCall\": false, \"alwaysOnline\": false, \"readMessages\": false, \"syncFullHistory\": false,
  \"webhook\": { \"url\": \"$WEBHOOK\", \"byEvents\": false, \"base64\": false, \"events\": $EVENTOS }
}" | jq -r '.instance.status // .response.message // .' || true

echo "==> Ligando o webhook do painel…"
curl -sS "${H[@]}" -X POST "$API/webhook/set/$INST" -d "{
  \"webhook\": { \"enabled\": true, \"url\": \"$WEBHOOK\", \"byEvents\": false, \"base64\": false, \"events\": $EVENTOS }
}" | jq -c '.' || true
curl -sS "${H[@]}" -X POST "$API/settings/set/$INST" -d '{
  "rejectCall": false, "groupsIgnore": true, "alwaysOnline": false, "readMessages": false, "readStatus": false, "syncFullHistory": false
}' >/dev/null || true

echo "==> Abra o WhatsApp Business da loja → ⋮ → Aparelhos conectados → Conectar um aparelho"
for i in $(seq 1 12); do
  estado=$(curl -sS "${H[@]}" "$API/instance/connectionState/$INST" | jq -r '.instance.state // .state // empty')
  if [ "$estado" = "open" ]; then echo; echo "✅ WhatsApp conectado!"; exit 0; fi
  codigo=$(curl -sS "${H[@]}" "$API/instance/connect/$INST" | jq -r '.code // empty')
  if [ -n "$codigo" ]; then
    clear; echo "Leia este QR Code com o WhatsApp da loja (ele troca a cada 30 s):"; echo
    qrencode -t ANSIUTF8 "$codigo"
  else
    echo "Aguardando o QR Code… (estado: ${estado:-desconhecido})"
  fi
  sleep 30
done
echo "Não conectou a tempo. Rode de novo: bash conectar.sh \"$WEBHOOK\""
echo "Ou abra $API/manager (entre com o endereço e a chave) e conecte por lá."
exit 1
