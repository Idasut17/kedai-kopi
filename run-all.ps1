$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ===== PILIH YANG MAU DINYALAKAN =====
$startNodeApi    = $true    # backend Node/Express di folder "server"
$startFrontend   = $true    # frontend statis (live-server)
$startLaravelApi = $false   # backend Laravel (php artisan serve)
$startLaravelVite= $false   # Vite untuk Laravel (npm run dev di laravel-app)

Write-Host "Project root: $root"

if ($startNodeApi) {
  Write-Host "Starting Node API (server)..."
  Start-Process -WorkingDirectory "$root\server" -FilePath "cmd.exe" -ArgumentList "/c", "npm install && npm run dev"
}

if ($startLaravelApi) {
  Write-Host "Starting Laravel API (php artisan serve)..."
  Start-Process -WorkingDirectory "$root\server\laravel-api\laravel-app" -FilePath "cmd.exe" -ArgumentList "/c", "php artisan serve --host=127.0.0.1 --port=8000"
}

if ($startLaravelVite) {
  Write-Host "Starting Laravel Vite (npm run dev)..."
  Start-Process -WorkingDirectory "$root\server\laravel-api\laravel-app" -FilePath "cmd.exe" -ArgumentList "/c", "npm install && npm run dev"
}

if ($startFrontend) {
  Write-Host "Starting Frontend static server (npx live-server)..."
  Start-Process -WorkingDirectory "$root" -FilePath "cmd.exe" -ArgumentList "/c", "npx --yes live-server . --port=5500"
}

Write-Host ""
Write-Host "Done. Cek terminal yang terbuka:" 
Write-Host "- Frontend  : http://127.0.0.1:5500"
Write-Host "- Node API  : sesuai PORT di server\\.env (contoh: http://127.0.0.1:3002)"
Write-Host "- Laravel   : http://127.0.0.1:8000 (jika diaktifkan)"
