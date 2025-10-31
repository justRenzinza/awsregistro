# ================================
# restore.ps1 — Restaura o backup AWSRegistro.backup no PostgreSQL local
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\db\restore.ps1 -Password "1234"
# ================================

param (
	[string]$Password
)

# Caminhos e variáveis
$Database = "awsregistro"
$User = "postgres"
$BackupFile = ".\db\backups\AWSRegistro.backup"
$PgRestorePath = "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"

Write-Host '🔹 Iniciando restauração do banco de dados...' -ForegroundColor Cyan

# Verifica se o arquivo existe
if (-Not (Test-Path $BackupFile)) {
	Write-Host "❌ Arquivo de backup não encontrado: $BackupFile" -ForegroundColor Red
	exit 1
}

# Verifica se o pg_restore existe
if (-Not (Test-Path $PgRestorePath)) {
	Write-Host "❌ pg_restore não encontrado em: $PgRestorePath" -ForegroundColor Red
	Write-Host 'Verifique se o PostgreSQL está instalado em "C:\Program Files\PostgreSQL\18\bin\"' -ForegroundColor Yellow
	exit 1
}

# Define a senha de forma temporária
$env:PGPASSWORD = $Password

# Executa o restore
& "$PgRestorePath" `
	--host "localhost" `
	--port "5432" `
	--username $User `
	--dbname $Database `
	--verbose `
	$BackupFile

# Limpa a variável de senha
Remove-Item Env:\PGPASSWORD

Write-Host '✅ Restauração concluída (verifique se não houve erros acima).' -ForegroundColor Green
