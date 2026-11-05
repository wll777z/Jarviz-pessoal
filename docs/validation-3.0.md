# JARVIZ 3.0 — relatório técnico de validação

## Resultado e ambiente

Evolução do repositório existente, preservando HUD, funcionamento local, chave OpenRouter e controles de aprovação. Ambiente de execução: Linux, Node.js 24, Chromium headless. Não houve instalação/download automático de modelos de voz ou STT. Não houve execução no Windows do usuário nem uso de suas chaves.

Comandos realmente executados na validação final:

- `npm ci`: aprovado, sem dependências de produção adicionais.
- `npm run check`: sintaxe de todos os módulos públicos, servidor e scripts aprovada.
- `npm test`: **24 aprovados, 0 falhas, 0 ignorados**.
- `python3 tests/browser.py`: **2 cenários amplos aprovados**, cobrindo interface funcional e prévia estática, com fluxos internos de voz, memória, visão, permissões e conversação.
- Smoke separado da entrada de produção: iniciou em loopback com perfil temporário, respondeu sessão e serviu speech-controller; sem credenciais externas.

Os testes de rede, IA, captura e Web Speech usam provedores/objetos controlados. O teste Piper inicia um CLI simulado e valida WAV/cache/cancelamento; não comprova qualidade ou velocidade de uma voz neural real.

## Entrega por fase

| Fase | Arquivos principais | Implementação e verificação | Limitação material |
|---|---|---|---|
| 1 — confiabilidade | server/server.mjs, scripts/check.mjs, testes | Baseline 6/6; diagnóstico, respostas vazias e proteção de chaves preservados | APIs reais exigem conta/rede do usuário |
| 2 — voz | speech-controller.mjs, voice-selection.mjs, server/tts.mjs | Presets, resumo oral separado, segmentos, cancelamento, próxima síntese antecipada, cache Piper e fallback; testes de fila e subprocesso | Piper/modelo reais não instalados; vozes Windows dependem do dispositivo |
| 3 — internet | server/web.mjs, tools.mjs | RSS atual, páginas, links/datas, clima e relógio; testes de DNS fixado, redirects privados e tamanho | Consultas públicas ao vivo não validadas; adaptador recusa proxy configurado |
| 4 — inteligência | server/openrouter.mjs, server.mjs | Modelo alternativo gratuito, orçamento de ferramentas, seleção por intenção, catálogo, contexto extrativo, latências | Sem streaming de tokens; qualidade factual do modelo não pode ser garantida |
| 5 — conversação | app.js, speech-controller.mjs | Conversação opt-in, transcrição final automática, push-to-talk, pausa durante fala e retomada após aprovação/Stop | Half-duplex; interrupção espontânea sem botão e STT local não implementados |
| 6 — visão/memória | server/vision.mjs, memory.mjs, app.js | Captura pontual/arquivo, prévia, consentimento, catálogo visual, memória persistente opt-in, retomada, exclusão, retenção e capacidade configurável | Testes usam imagem artificial e captura simulada; funcionamento real depende do navegador/modelo |
| 7 — Windows | server/tools.mjs | Busca limitada, memória/CPU identificada/disco, processos/rede por consultas fixas; testes de pasta e diagnóstico multiplataforma | PowerShell, abertura/processos Windows e som não executados aqui; CPU não tem percentual instantâneo |
| 8 — finalização | README, docs, testes, exportador | Suíte completa, revisão independente e regressões dos seis achados corrigidas; pacote local preparado | Publicação é branch de revisão, sem merge/deploy automático |

## Revisão independente e correções

1. Data/hora: sombreamento de `answer()` reproduzido com HTTP 400; nome local corrigido. Regressão confirma duas chamadas e resposta textual sem aprovação.
2. Credenciais multilinha: persistência indevida reproduzida; parágrafos com indícios de credenciais são omitidos conservadoramente. Regressão verifica ausência do valor no arquivo.
3. Nota esquecida: prompt mantinha última nota removida; prompt agora é reconstruído em cada chamada. Regressão confirma nota ausente.
4. Piper cancelado: processo sem permissão emitia erro sem handler; checagem de cancelamento e listeners corrigidos. Subprocesso isolado deixa de emitir erro não tratado.
5. Captura após erro: imagem antiga era reenviada após falha de aprovação; dados de imagem são retirados logo após a chamada autorizada e em encerramento com erro. Regressão verifica nova pergunta sem captura.
6. Retomada de conversa: reconhecimento não reiniciava após aprovação com voz desabilitada ou Stop; callbacks e finally corrigidos. Cenário Chromium verifica a nova chamada de start e encerramento explícito.

Cada problema teve reprodução falhando antes da correção; a suíte completa ficou verde depois da passagem de correções. Nenhum achado Critical permaneceu; não houve re-review usado como substituto dos testes.

## Decisões e custos

- Workspace existente e branch local, sem novo projeto/worktree. Preserva o contexto do usuário; publicação em branch exige revisão/merge posterior para atualizar main.
- Piper opcional, navegador como fallback e nenhum download de modelo automático. Evita dependências grandes; voz neural específica só funciona após instalação/configuração manual e licença adequada.
- Memória JSON atômica, limitada e de instância única. Sem dependência de banco; não usar vários servidores simultâneos no mesmo perfil. Capacidade 1–20 MiB (padrão 5), retenção 1–365 dias; contagens continuam limitadas a 20 conversas/120 mensagens e 100 notas.
- Transporte de páginas HTTPS direto com DNS fixado; proxy configurado é recusado explicitamente. Não contorna política, mas pesquisa não funciona nesse tipo de rede sem conector futuro.
- Reconhecimento half-duplex, com interrupção pelo botão/push-to-talk. Evita transcrever a própria fala; não oferece barge-in espontâneo ou STT offline.
- Contexto resumido por extração e áudio segmentado. Não adiciona custo de sumarização; pode perder nuances de mensagens antigas e não fornece streaming de texto.

## Piper: avaliação e proveniência

Documentação consultada: https://github.com/OHF-Voice/piper1-gpl, commit `10880972db9e0aca101fed350eadf8f49deefe9f`, README, docs/CLI.md, docs/VOICES.md, src/piper/__main__.py e COPYING. O motor é GPL-3.0; modelos têm MODEL_CARD próprio. Flags com underscores são aliases documentados. A documentação alerta para custo de carregar o modelo a cada processo. Este adaptador usa cache de áudio e pré-síntese, mas não mantém modelo residente.

Navegador/Windows foi mantido pela disponibilidade e ausência de instalação de modelos. Outros motores neurais/STT não foram embutidos: exigiriam downloads, avaliação de licença e validação adicional. Não foi copiada ou clonada voz de ator nem baixada gravação protegida.

## O que ainda precisa ser testado no computador do usuário

Consulte VALIDAR-WINDOWS.md. Permanecem não executados aqui: som real e vozes instaladas, modelo Piper real, permissões reais de captura/microfone, ações específicas do Windows, OpenRouter autenticada e pesquisa/clima públicos ao vivo. Ausência de validação não foi convertida em alegação de funcionamento confirmado.

## Correção posterior — Opera GX e núcleo
Adicionados gravação explícita, anexo/normalização WAV, prévia e consentimento, modelo com entrada de áudio via mesma chave OpenRouter e descarte de mídia do contexto. Reconhecimento sem resultado mostra aviso; inicialização concorrente do gravador é bloqueada e reset encerra stream/anexo. Movimento do núcleo ganhou override explícito da redução de movimento e pulsação mais visível ao falar. Validação: 26 testes Node e 2 cenários Chromium aprovados, incluindo WAV sintético e gravação simulada. Microfone físico no Opera GX e API real de áudio não foram testados aqui; compatibilidade e gratuidade do modelo de áudio precisam ser verificadas na conta do usuário.
