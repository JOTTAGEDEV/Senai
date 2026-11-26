# Cria a conexão "milano", liga o webhook do painel e abre o QR Code para ler com o WhatsApp da loja.
# Uso:  .\conectar.ps1 -Webhook "https://<projeto>.supabase.co/functions/v1/whatsapp-evolution?token=..."
param([Parameter(Mandatory = $true)][string]$Webhook, [string]$Instancia = "milano")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$cfg = @{}; Get-Content .env | ForEach-Object { $k, $v = $_ -split '=', 2; $cfg[$k] = $v }
$api = "http://localhost:8080"
$h = @{ apikey = $cfg["API_KEY"] }
$eventos = @("MESSAGES_UPSERT", "CONNECTION_UPDATE")

function Chamar($metodo, $caminho, $corpo) {
  try {
    if ($corpo) { return Invoke-RestMethod -Method $metodo -Uri "$api$caminho" -Headers $h -ContentType "application/json" -Body ($corpo | ConvertTo-Json -Depth 5) }
    return Invoke-RestMethod -Method $metodo -Uri "$api$caminho" -Headers $h
  } catch { Write-Host "  (aviso) $caminho -> $($_.Exception.Message)" -ForegroundColor Yellow; return $null }
}

Write-Host "==> Criando a conexão '$Instancia'..."
Chamar POST "/instance/create" @{ instanceName = $Instancia; integration = "WHATSAPP-BAILEYS"; qrcode = $true; groupsIgnore = $true; rejectCall = $false; alwaysOnline = $false; readMessages = $false; syncFullHistory = $false; webhook = @{ url = $Webhook; byEvents = $false; base64 = $false; events = $eventos } } | Out-Null
Write-Host "==> Ligando o webhook do painel..."
Chamar POST "/webhook/set/$Instancia" @{ webhook = @{ enabled = $true; url = $Webhook; byEvents = $false; base64 = $false; events = $eventos } } | Out-Null
Chamar POST "/settings/set/$Instancia" @{ rejectCall = $false; groupsIgnore = $true; alwaysOnline = $false; readMessages = $false; readStatus = $false; syncFullHistory = $false } | Out-Null

Write-Host "==> No celular da loja: WhatsApp Business > Aparelhos conectados > Conectar um aparelho"
$arquivo = Join-Path $PSScriptRoot "qrcode.png"
for ($i = 0; $i -lt 12; $i++) {
  $estado = (Chamar GET "/instance/connectionState/$Instancia" $null)
  if ($estado.instance.state -eq "open" -or $estado.state -eq "open") { Write-Host "`nWhatsApp conectado!" -ForegroundColor Green; Remove-Item $arquivo -ErrorAction SilentlyContinue; exit 0 }
  $qr = Chamar GET "/instance/connect/$Instancia" $null
  if ($qr.base64) {
    [IO.File]::WriteAllBytes($arquivo, [Convert]::FromBase64String(($qr.base64 -replace '^data:image/\w+;base64,', '')))
    Start-Process $arquivo
    Write-Host "QR Code aberto na tela (ele troca a cada 30 s). Leia com o celular da loja."
  } else { Write-Host "Aguardando o QR Code..." }
  Start-Sleep -Seconds 30
}
Write-Host "Não conectou a tempo. Rode de novo o mesmo comando." -ForegroundColor Yellow
exit 1
