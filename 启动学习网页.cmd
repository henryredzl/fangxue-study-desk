@echo off
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 or newer is needed to run the study desk.
  pause
  exit /b 1
)
node "%~dp0server.cjs" --open
if errorlevel 1 pause
