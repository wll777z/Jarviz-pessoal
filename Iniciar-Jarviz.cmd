@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 24 LTS de https://nodejs.org e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 (
  echo O Jarviz requer Node.js 24 ou superior.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:3210 no Microsoft Edge ou Chrome.
echo Selecione o provedor e cadastre sua chave na interface. Nunca publique a chave no GitHub.
node server/server.mjs --open
pause
