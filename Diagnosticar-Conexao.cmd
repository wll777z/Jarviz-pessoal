@echo off
setlocal
cd /d "%~dp0"
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major < 24 || (major === 24 && minor < 5)) process.exit(1)"
if errorlevel 1 (
  echo Instale Node.js 24.5 ou superior em https://nodejs.org.
  pause
  exit /b 1
)
node --use-env-proxy --use-system-ca scripts/diagnose-network.mjs
pause
