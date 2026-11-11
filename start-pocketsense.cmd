@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies missing. Please run npm ci first.
  pause
  exit /b 1
)
call npm.cmd run dev -- --open
pause
