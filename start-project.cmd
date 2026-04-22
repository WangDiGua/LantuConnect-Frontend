@echo off
setlocal

chcp 65001 >nul
set "LANG=zh_CN.UTF-8"

cd /d "%~dp0"
title LantuConnect Frontend - Dev Server

echo [start-project] workspace: %CD%
echo [start-project] launching frontend dev server with UTF-8 console...
echo.

node scripts\dev-server.mjs run %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [start-project] server exited with code %EXIT_CODE%
  pause
)

exit /b %EXIT_CODE%
