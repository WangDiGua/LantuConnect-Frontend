@echo off
setlocal

chcp 65001 >nul
set "LANG=zh_CN.UTF-8"

cd /d "%~dp0"
title LantuConnect Frontend - Restart Dev Server

echo [restart-project] workspace: %CD%
echo [restart-project] restarting managed dev server with UTF-8 console...
echo.

node scripts\dev-server.mjs restart-run %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [restart-project] server exited with code %EXIT_CODE%
  pause
)

exit /b %EXIT_CODE%
