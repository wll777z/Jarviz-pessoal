# Execução do plano docs/plano-3.0.md
Spec: docs/especificacao-3.0.md
Fase 1: baseline concluído; npm ci, check e 6 testes aprovados.
Decisão: branch local na máquina isolada existente, sem novo projeto/worktree e sem push/deploy.
Decisão: navegador como fallback; Piper opcional instalado/configurado pelo usuário, sem baixar modelo automaticamente.
Decisão: armazenamento JSON atômico e limitado equivale à memória local nesta versão, sem dependência de banco.
Interfaces: transporte IA recebe config/messages/tools; ferramentas web devolvem conteúdo e fontes; memória separa conversas e notas; TTS recebe texto e caminhos explícitos. Backend integra os módulos e mantém autorização.

Fases 2–4 implementadas: speech-controller, presets, Piper opcional/cache, web SSRF/RSS/clima, transporte OpenRouter/fallback/contexto limitado/intenção. Testes unitários passaram com fontes e processos simulados.
Fases 5–7 implementadas: conversação/push-to-talk, captura pontual com consentimento/catálogo visual, memória JSON limitada e ferramentas de diagnóstico Windows. Integração backend passou; navegador ampliado em validação.
Decisão: navegação pública usa transporte HTTPS com DNS fixado; proxies configurados são recusados explicitamente por este adaptador, sem contornar política. Rede deste ambiente não valida consultas públicas ao vivo.
Decisão: conversação half-duplex com interrupção pelo microfone/push-to-talk; reconhecimento local e palavra de ativação não são oferecidos sem modelos adicionais.
Decisão: resumo de contexto é extrativo e identifica omissões; não adiciona chamadas pagas para resumir. Tokens não são transmitidos em streaming nesta versão; áudio é segmentado com pré-síntese.
Autorização posterior do usuário: ao terminar, pode enviar ao GitHub. Publicar branch de trabalho, sem merge automático ou deploy.

Revisão final independente realizada: seis achados importantes e nenhum crítico. Regressões RED reproduziram data/hora, credenciais multilinha, nota esquecida no prompt, cancelamento Piper, captura reenviada após erro e retomada de conversação. Correções em uma passagem; testes Node e navegador novamente verdes (contagem final no relatório).
Correções adicionais de requisito: capacidade de memória configurável; descarte de expirados também em disco; testes do transporte HTTPS simulado com DNS fixado/redirects/tamanho.
Limitações aceitas e explícitas: texto sem streaming de tokens; interrupção espontânea sem botão não implementada; CPU sem percentual; motores locais reais, Windows e APIs externas precisam de validação na máquina/conta do usuário. Não apresentar esses itens como executados.

Fase 8 concluída quanto à implementação e validação disponível: npm ci/check aprovados, Node 24/24 e Chromium 2/2 aprovados. Smoke de produção aprovado. Limitações e decisões no relatório validation-3.0.md; validação Windows/API/Piper real permanece externa.
