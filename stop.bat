@echo off
title TalentMatrix - Stop Platform Services
cd /d "%~dp0"

echo =======================================================================
echo              STOPPING TALENTMATRIX PLATFORM SERVICES
echo =======================================================================
echo.

echo Terminating active processes on ports 3001 and 5173...

powershell -Command "Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo.
echo [OK] All TalentMatrix servers on ports 3001 and 5173 have been stopped.
echo.
ping 127.0.0.1 -n 3 >nul
