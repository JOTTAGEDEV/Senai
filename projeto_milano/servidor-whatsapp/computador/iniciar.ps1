# Sobe o servidor do WhatsApp neste computador.
# Uso (PowerShell, dentro desta pasta):  .\iniciar.ps1 -Endereco "https://SEU-DOMINIO.ngrok-free.app"
param([Parameter(Mandatory = $true)][string]$Endereco)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Instale o Docker Desktop primeiro: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
  exit 1
}

$Endereco = $Endereco.TrimEnd("/")
if (-not (Test-Path .env)) {
  $chave = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N").Substring(0, 16)
  $senha = [guid]::NewGuid().ToString("N")
  "ENDERECO=$Endereco`nAPI_KEY=$chave`nDB_SENHA=$senha" | Set-Content -Encoding ascii .env
} else {
  (Get-Content .env) -replace '^ENDERECO=.*', "ENDERECO=$Endereco" | Set-Content -Encoding ascii .env
}

docker compose up -d
$chave = ((Get-Content .env) | Where-Object { $_ -like "API_KEY=*" }) -replace '^API_KEY=', ''

Write-Host ""
Write-Host "======================================================================"
Write-Host " Servidor do WhatsApp no ar neste computador!"
Write-Host ""
Write-Host "   Endereço: $Endereco"
Write-Host "   Chave:    $chave"
Write-Host ""
Write-Host " Próximo passo: rode o SQL do guia no Supabase (com esse endereço e essa"
Write-Host " chave) e depois:  .\conectar.ps1 -Webhook '<URL do webhook>'"
Write-Host " Não mande a chave em chat nem em print. Ela fica salva no arquivo .env."
Write-Host "======================================================================"
