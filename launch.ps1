# TalentMatrix One-Click PowerShell Launcher
Set-Location -Path $PSScriptRoot

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "             TALENTMATRIX ENTERPRISE PLATFORM LAUNCHER                 " -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Clear ports 3001 & 5173
Write-Host "[1/4] Clearing existing processes on ports 3001 and 5173..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# 2. Check dependencies
Write-Host "[2/4] Checking server & client dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$PSScriptRoot\server\node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Gray
    Start-Process npm -ArgumentList "install" -WorkingDirectory "$PSScriptRoot\server" -Wait -NoNewWindow
}
if (-not (Test-Path "$PSScriptRoot\client\node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Gray
    Start-Process npm -ArgumentList "install" -WorkingDirectory "$PSScriptRoot\client" -Wait -NoNewWindow
}

# 3. Start Backend
Write-Host "[3/4] Launching Backend Server on http://localhost:3001..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$PSScriptRoot\server`" && npm run dev"

Start-Sleep -Seconds 2

# 4. Start Frontend
Write-Host "[4/4] Launching Frontend Client on http://localhost:5173..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$PSScriptRoot\client`" && npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "       TALENTMATRIX PLATFORM IS RUNNING AND READY TO USE!              " -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""

Start-Process "http://localhost:5173"
