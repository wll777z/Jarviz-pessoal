# Jarviz Pessoal 3.0 — plano de execução e diagnóstico inicial

## Escopo

Aplicar o documento enviado ao projeto existente em `/workspace/Jarviz-pessoal`. Preservar HUD, chave OpenRouter, aprovações, validação de arquivos e execução local. Não realizar deploy, push ou merge nesta missão. Não baixar modelos pesados automaticamente. Não exigir serviços pagos ou chave de voz.

## Evidência inicial

- Repositório sem alterações locais ao iniciar esta missão.
- `package.json` exige Node.js 24 e declara a versão 0.2.0.
- `voice-selection.mjs` seleciona vozes do navegador; ainda não há TTS neural local, segmentação nem cache de áudio.
- `app.js` usa reconhecimento não contínuo, com `continuous = false`; não há captura de tela.
- `server/server.mjs` mantém a conversa somente em memória; não há SQLite, pesquisa web, seleção de modelo alternativo ou recuperação de contexto.
- As ferramentas existentes em `server/tools.mjs` operam arquivos e PowerShell mediante aprovação, com restrições de caminhos e credenciais.
- Os dois anexos recebidos são idênticos.

Esses itens confirmam capacidades ausentes por inspeção; não comprovam qualidade de voz ou erros de modelos no Windows.

## Bloqueio inicial — resolvido

A tentativa de executar `npm ci`, `npm run check` e `npm test` foi impedida antes de rodar: a revisão automática de aprovação atingiu o limite de uso da sessão. A mensagem esclarece que a revisão não pôde ser concluída; não classifica o comando como inseguro. Não contornar esse bloqueio com outros executores, agentes ou permissões.

O documento exige testes de referência antes de alterar os arquivos do projeto. Por isso este plano foi salvo fora do repositório; nenhuma implementação é apresentada como concluída ou testada.

## Fase 1 — diagnóstico e confiabilidade

- Executar os três comandos de referência após restabelecer o limite.
- Registrar separadamente instalação, sintaxe, testes Node e testes Chromium existentes.
- Extrair transporte OpenRouter de `server/server.mjs` para `server/openrouter.mjs`, preservando `createJarviz()` e injeção de provedores nos testes.
- Cobrir autenticação, respostas vazias, chamadas inválidas, timeout, cotas e mensagens sem chaves.
- Criar registro de resultados por fase em `docs/validation-3.0.md`.

## Fase 2 — voz

- Criar `speech-controller.mjs` com fila, geração de cancelamento, segmentação, fala curta e texto integral separado.
- Expandir `voice-selection.mjs` com presets Clássico, Rápido, Português e Personalizado; velocidade inicial 1.15 e pitch compatível com cada motor.
- Avaliar documentação/licença atual do Piper antes de fixar sua interface. Adaptador opcional em `server/tts.mjs`, com executável e modelo locais indicados pelo usuário, sem downloads automáticos.
- Se viável, gerar WAV em cache limitado, sintetizar próximo segmento antecipadamente e cancelar subprocessos iniciados pelo adaptador.
- Manter fallback do navegador, indicação do motor real e erro visível quando não existir voz neural instalada.
- Testar seleção, segmentação, fila, cancelamento, duplicação e cache; não afirmar que ouviu a voz no Windows sem execução real.

## Fase 3 — internet

- Criar `server/web.mjs`: transporte HTTP limitado, DNS público validado e fixado na conexão, verificação TLS, redirects revalidados, timeout e limite de bytes.
- Rejeitar URLs com credenciais, esquemas inseguros, localhost, redes privadas e endereços IPv4/IPv6 especiais.
- Implementar pesquisa com fonte gratuita documentada/RSS, datas e links preservados; deixar clara a abrangência da fonte.
- Expor `web_search`, `extract_webpage_text`, `open_webpage` e `get_current_datetime`; avaliar clima por fonte pública documentada.
- Tratar conteúdo externo como dados não confiáveis e manter consentimento para envio de informações do computador.
- Testar com respostas simuladas, redirects, falhas de DNS, conteúdo excessivo e bloqueios SSRF.

## Fase 4 — inteligência

- Consultar capacidades dos modelos via API documentada, com cache e mensagens de indisponibilidade.
- Configurar principal e alternativo gratuitos; impedir fallback pago sem autorização explícita.
- Retentar apenas erros transitórios, com limite; não retentar autenticação ou executar ferramentas novamente após ação aplicada.
- Limitar etapas por turno e chamadas de ferramentas. Preservar identificadores de tool calls e fluxo de aprovação.
- Adotar o prompt solicitado, distinguir fontes verificadas de conhecimento interno e resumir contexto antigo sem inventar memória.
- Registrar latências de provedor/ferramentas sem conteúdo privado ou chaves.

## Fase 5 — conversação

- Acrescentar modo conversação opt-in e push-to-talk em `app.js`.
- Estados explícitos: escuta, transcrição, requisição, síntese, reprodução e interrupção.
- Não captar/transcrever a própria fala; retomar escuta somente durante sessão autorizada.
- Permitir parar sessão, cancelar fala e enviar transcrição automaticamente apenas nesse modo.
- Investigar reconhecimento local opcional sem instalar modelos grandes ou remover fallback do navegador.

## Fase 6 — visão e memória

- Captura pontual por `getDisplayMedia()` somente após clique do usuário, com prévia; encerrar todas as tracks imediatamente após captura.
- Consentimento separado antes do envio da imagem à OpenRouter; validar formato, dimensões/tamanho e suporte visual do modelo.
- Criar `server/memory.mjs` com SQLite do Node ou armazenamento equivalente justificado; separar histórico e memórias explícitas.
- Fornecer listar, guardar, esquecer, apagar histórico e desativar memória, com retenção/limites.
- Não persistir automaticamente credenciais, tokens ou screenshots. Controlar recuperação para que conversas antigas não reapliquem ações.
- Testar permissões, cancelamento de captura, modelos sem visão, persistência, exclusão e retenção.

## Fase 7 — Windows

- Expandir `server/tools.mjs` com diagnóstico somente de leitura e busca limitada na pasta autorizada.
- Consultas de CPU/memória/disco/rede/processos devem usar APIs nativas ou scripts fixos; não interpolar código do modelo em diagnósticos.
- Separar consultas de modificações sem retirar a aprovação de ações sensíveis.
- Preservar ferramentas existentes e os limites de comandos, declarando que processos filhos podem sobreviver ao timeout do PowerShell.
- Validar as operações dependentes do Windows na máquina apropriada; registrar como não executadas quando indisponível.

## Fase 8 — integração e entrega

- Integrar os painéis no HUD existente, com responsividade e acessibilidade.
- Servir/exportar apenas módulos públicos explicitamente permitidos.
- Executar `npm ci`, `npm run check`, `npm test` e a suíte de navegador atualizada.
- Revisar privacidade, permissões, fallback, cancelamentos e preservação da configuração existente.
- Entregar ZIP local e relatório técnico com resultados reais por fase, requisitos externos e limitações.
- Não publicar sem nova autorização.

Após nova autorização do usuário, instalação, sintaxe e testes iniciais foram executados com sucesso e a implementação prosseguiu. O bloqueio acima registra o estado inicial, não o estado final.
