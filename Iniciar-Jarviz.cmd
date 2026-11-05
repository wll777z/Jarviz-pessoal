@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 24 LTS de https://nodejs.org e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major < 24 || (major === 24 && minor < 5)) process.exit(1)"
if errorlevel 1 (
  echo O Jarviz requer Node.js 24.5 ou superior. Atualize em https://nodejs.org.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:3210 no Microsoft Edge ou Chrome.
echo Selecione o provedor e cadastre sua chave na interface. Nunca publique a chave no GitHub.
node --use-env-proxy --use-system-ca server/server.mjs --open
pause
