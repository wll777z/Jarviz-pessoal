# MISSÃO: JARVIZ PESSOAL 3.0 — RECONSTRUÇÃO DA INTELIGÊNCIA, VOZ E CAPACIDADES

Você é um engenheiro sênior de software, especialista em agentes de IA, sistemas de voz em tempo real, Node.js, integração com Windows, inteligência artificial e segurança.

Sua missão é analisar, corrigir e evoluir o projeto existente **Jarviz-pessoal-main** para transformar o atual assistente em um assistente pessoal muito mais inteligente, rápido, natural e funcional.

**ATENÇÃO: Não crie um projeto novo. Trabalhe diretamente sobre os arquivos existentes. Preserve a identidade visual, funcionalidades e estrutura do JARVIZ.**

## 1. DIAGNÓSTICO DO PROJETO

Arquivos principais identificados:

- `app.js`: interface, chat, síntese e reconhecimento de voz.
- `voice-selection.mjs`: seleção de vozes.
- `server/server.mjs`: backend, conexão OpenRouter, prompt do sistema, ferramentas e autorização.
- `server/tools.mjs`: ações e operações no Windows.
- `index.html`: interface e configurações.
- `styles.css`: identidade visual HUD.
- `server/*.test.mjs`: testes automatizados.
- `README.md`: instruções de instalação.

Problemas identificados:

1. Voz lenta, artificial e diferente do estilo desejado.
2. Ausência de ferramenta nativa de pesquisa na internet.
3. Respostas inconsistentes dependendo do modelo gratuito.
4. Nenhuma capacidade real de interpretar a tela.
5. Reconhecimento de voz sem conversa contínua.
6. Histórico perdido ao reiniciar o servidor.
7. Diagnósticos insuficientes quando a IA falha.
8. Falta de arquitetura para escolher ferramentas conforme a intenção.
9. Respostas longas lidas integralmente, aumentando o tempo de fala.
10. Poucas ferramentas para um assistente pessoal avançado.

Antes de alterar arquivos, confirme os problemas por inspeção e execute os testes existentes.

## 2. NOVO SISTEMA DE VOZ — PRIORIDADE MÁXIMA

O objetivo é obter uma voz semelhante ao estilo cinematográfico do J.A.R.V.I.S. de Homem de Ferro: masculina, britânica, elegante, natural, clara, confiante e rápida.

### Requisitos

- Substituir ou complementar a síntese simples do navegador por um motor neural TTS.
- Priorizar soluções gratuitas e compatíveis com Windows 10/11.
- Avaliar Piper TTS local e outras alternativas gratuitas de acordo com qualidade, licença, requisitos e disponibilidade.
- Oferecer uma voz masculina britânica neural, se disponível.
- Oferecer voz em português brasileiro com personalidade equivalente.
- Não prometer timbre idêntico ao original.
- Permitir utilizar uma voz licenciada autorizada pelo usuário, caso ele forneça os recursos necessários.
- Não baixar gravações protegidas nem clonar a voz de um ator sem autorização.
- Preservar a opção atual do navegador como fallback.

Configuração inicial recomendada:

- Velocidade: 1.15x.
- Tom: natural, levemente grave.
- Ritmo: ágil.
- Pausas: curtas e naturais.
- Estilo: educado, confiante e tecnológico.
- Entonação: natural, sem monotonia robótica.

Importante: as opções de velocidade e pitch devem ser ajustadas ao motor utilizado. Não assumir que valores produzem o mesmo resultado em motores diferentes.

### Melhorias de reprodução

Implementar:

1. Reprodução de fala em segmentos curtos.
2. Síntese antecipada da próxima frase.
3. Cache local de áudios frequentes.
4. Interrupção imediata quando o usuário começar a falar.
5. Cancelamento correto de tarefas de áudio.
6. Fila de reprodução controlada.
7. Evitar falas duplicadas.
8. Indicador visual de síntese e reprodução.
9. Tratamento de erros com fallback.
10. Botão para testar diferentes vozes.
11. Separação entre texto completo e texto preparado para fala.
12. Início de reprodução assim que houver um segmento disponível.

Criar presets:

- JARVIZ Clássico: britânico, confiante e natural.
- JARVIZ Rápido: respostas objetivas e ágeis.
- JARVIZ Português: voz masculina brasileira.
- Personalizado: velocidade, voz, pitch e estilo ajustáveis.

Se nenhuma voz neural adequada estiver disponível, mostrar claramente a limitação e manter um fallback funcional.

## 3. INTERNET REAL E PESQUISA ATUALIZADA

O JARVIZ precisa pesquisar informações recentes sem depender exclusivamente do conhecimento interno do modelo.

Implementar ferramentas:

- `web_search`
- `open_webpage`
- `extract_webpage_text`
- `get_current_datetime`
- `get_weather`, quando existir fonte apropriada

### Comportamento

Quando o usuário perguntar:

"Jarviz, qual é a notícia mais importante de hoje?"

O assistente deverá:

1. Identificar que a pergunta depende de informação atual.
2. Consultar uma fonte externa disponível.
3. Selecionar resultados relevantes.
4. Verificar as datas das publicações.
5. Produzir resposta resumida.
6. Exibir os links das fontes.
7. Ler oralmente um resumo objetivo.

Quando o usuário perguntar sobre programação, documentação ou atualizações de software, utilizar pesquisa sempre que necessário.

### Implementação

Avaliar opções gratuitas como:

- Provedores de pesquisa com camada gratuita.
- Fontes RSS públicas.
- APIs públicas documentadas.
- Consulta a páginas web por HTTP.
- Navegação local controlada com Playwright, se necessário.

Escolher soluções que realmente funcionem, respeitando limites, termos de uso e requisitos de configuração.

Não fingir que resultados de pesquisa foram obtidos quando não foram.

Implementar proteção contra SSRF, acesso indevido à rede local, URLs perigosas, redirecionamentos inseguros e conteúdo malicioso.

Usar timeouts, limites de download e tratamento de conteúdo não confiável.

### Resultado esperado

O assistente deve conseguir responder perguntas atuais quando uma ferramenta de pesquisa estiver disponível e funcionando.

Se a rede falhar, deve explicar o problema específico sem inventar informações.

## 4. INTELIGÊNCIA E QUALIDADE DAS RESPOSTAS

Reestruturar a integração com OpenRouter.

Objetivos:

- Respostas mais corretas.
- Melhor interpretação de perguntas.
- Menos respostas genéricas.
- Uso adequado das ferramentas.
- Redução de alucinações.
- Melhor desempenho em conversas longas.
- Recuperação de erros de modelos.

Implementar:

1. Verificação da compatibilidade do modelo com ferramentas.
2. Configuração de modelo principal e alternativo.
3. Fallback controlado para erros temporários.
4. Diagnóstico de cota, rede e autenticação.
5. Melhor gerenciamento do histórico.
6. Resumo de contexto quando necessário.
7. Tratamento de respostas vazias e tool calls inválidas.
8. Fluxo de múltiplas etapas para perguntas complexas.
9. Limite configurável de execuções de ferramentas.
10. Diferenciação entre conhecimento do modelo e informação verificada.

Não utilizar modelos pagos sem autorização explícita.

Preservar a configuração de OpenRouter existente.

### Novo comportamento do assistente

O JARVIZ deve:

- Responder diretamente à pergunta.
- Pesquisar quando faltar informação atual.
- Usar ferramentas disponíveis em vez de negar capacidade sem verificar.
- Explicar claramente quando não puder executar algo.
- Nunca afirmar que realizou ações sem confirmação.
- Não inventar notícias, arquivos, resultados ou estados do Windows.
- Ser objetivo durante conversas por voz.
- Ser detalhado quando o usuário solicitar explicações.
- Fazer perguntas de esclarecimento somente quando realmente necessário.

## 5. VISÃO DE TELA E INTERPRETAÇÃO VISUAL

Adicionar capacidade opcional para o assistente interpretar informações visíveis no computador.

Implementar:

- Captura pontual da tela.
- Captura de janela selecionada, quando possível.
- Envio de imagem para modelo com capacidade visual.
- Descrição de elementos na tela.
- Identificação de mensagens de erro.
- Ajuda com aplicativos.
- Orientação sobre botões e menus visíveis.

A captura deve ser iniciada pelo usuário ou mediante autorização explícita.

Nunca capturar continuamente de maneira oculta.

Nunca enviar imagens a um provedor externo sem consentimento.

Mostrar quando uma imagem está sendo analisada.

Se o modelo configurado não aceitar imagens, mostrar uma mensagem explicando o motivo e oferecer alternativa compatível.

## 6. CONVERSAÇÃO POR VOZ MAIS NATURAL

Evoluir o reconhecimento atual do navegador.

Implementar um modo conversação opcional:

- Ativar microfone mediante interação explícita.
- Detectar término da fala.
- Enviar transcrição automaticamente no modo conversação.
- Receber a resposta.
- Reproduzir áudio.
- Permitir interrupção.
- Evitar que o microfone transcreva a própria voz do JARVIZ.
- Controlar estado de escuta e reprodução.
- Encerrar a sessão pelo botão.
- Respeitar permissões do microfone.

Adicionar indicador de microfone ativo.

Investigar reconhecimento local gratuito para reduzir dependência do navegador, mas preservar fallback.

Adicionar modo push-to-talk.

Não implementar gravação oculta.

## 7. MEMÓRIA PESSOAL PERSISTENTE

Implementar memória local utilizando SQLite ou armazenamento equivalente adequado.

Permitir:

- Recuperar conversas anteriores.
- Guardar preferências autorizadas.
- Consultar informações que o usuário pediu para guardar.
- Esquecer informações mediante solicitação.
- Excluir histórico.
- Desativar memória.
- Visualizar informações salvas.

Separar histórico de conversa e memória de longo prazo.

Não armazenar automaticamente senhas, tokens ou credenciais.

Implementar limites de armazenamento e retenção configuráveis.

## 8. INTEGRAÇÃO MAIS INTELIGENTE COM WINDOWS

Preservar as ferramentas já existentes.

Avaliar novas ferramentas para:

- Consultar estado do sistema.
- Ver uso de memória e CPU.
- Verificar espaço disponível em disco.
- Listar aplicativos em execução.
- Consultar informações básicas da rede.
- Localizar arquivos na pasta autorizada.
- Organizar pastas.
- Abrir aplicativos autorizados.
- Ler arquivos suportados.
- Analisar erros de programas.

Separar operações somente de leitura de ações que alteram o computador.

Manter aprovação explícita para operações sensíveis e modificações no sistema.

Nunca executar comandos arbitrários ocultos.

Preservar validação de caminhos e proteção de credenciais.

Não executar o assistente como administrador por padrão.

## 9. PERSONALIDADE DO JARVIZ

Atualizar o prompt de sistema.

Identidade desejada:

"Você é JARVIZ, um assistente pessoal inteligente, sofisticado e eficiente.

Sua comunicação é natural, educada, confiante e objetiva.

Você ajuda seu usuário com programação, pesquisas, organização, estudos, produtividade e tarefas autorizadas no computador.

Você prioriza respostas corretas e utiliza ferramentas quando necessário.

Ao receber uma pergunta sobre fatos recentes, pesquisa antes de responder, desde que a ferramenta esteja disponível.

Ao receber uma pergunta sobre a tela, verifica se existe autorização e capacidade visual.

Você nunca inventa resultados de ferramentas.

Você diferencia claramente informações confirmadas, estimativas e limitações.

Sua fala é elegante, com humor discreto, sem exageros.

Você responde em português brasileiro por padrão.

Você evita explicações longas em áudio quando uma resposta curta resolve a pergunta.

Você nunca executa ações perigosas ou sensíveis sem as autorizações necessárias."

Esse prompt é uma base de personalidade, não uma substituição das regras de segurança e ferramentas do servidor.

## 10. INTERFACE

Preservar a identidade visual futurista atual.

Adicionar de maneira consistente:

- Painel de conexão com internet.
- Indicador do modelo de IA.
- Indicador do mecanismo de voz.
- Seletor de vozes.
- Configurações de velocidade e tom.
- Status do microfone.
- Modo conversação.
- Indicador de análise de tela.
- Histórico e memória.
- Links das fontes consultadas.
- Indicadores de erros de ferramentas.

Não redesenhar completamente a interface.

Manter responsividade, acessibilidade e bom desempenho.

## 11. DESEMPENHO

Investigar e reduzir:

- Tempo até a primeira resposta.
- Tempo até o primeiro áudio.
- Atraso no reconhecimento de voz.
- Chamadas desnecessárias à IA.
- Tamanho excessivo do histórico enviado.
- Repetição de pesquisas.
- Travamentos da interface.

Adicionar medições de latência.

Dar prioridade à resposta parcial e ao áudio incremental quando a API utilizada permitir.

Não sacrificar precisão apenas para responder mais rápido.

## 12. TESTES E VALIDAÇÃO

Antes de concluir, executar:

- `npm ci`
- `npm run check`
- `npm test`

Adicionar testes para:

1. Seleção de voz.
2. Configurações de áudio.
3. Cancelamento e interrupção de fala.
4. Pesquisa na internet com fontes simuladas.
5. Falha de conexão.
6. Fallback de modelo.
7. Uso correto de ferramentas.
8. Permissão para capturar tela.
9. Memória persistente.
10. Controle de ações no Windows.
11. Proteção de chaves e credenciais.
12. Erros do backend.
13. Compatibilidade com navegadores suportados.

Validar no Windows as funcionalidades dependentes do sistema operacional.

Utilizar mocks quando não houver acesso a APIs externas.

Não declarar que um teste foi aprovado se não tiver sido executado.

## 13. RESTRIÇÕES IMPORTANTES

- Não recriar o projeto.
- Não remover funcionalidades existentes.
- Não expor chaves.
- Não publicar dados pessoais.
- Não adicionar serviços pagos obrigatórios.
- Não criar dependências enormes sem justificativa.
- Não baixar modelos pesados automaticamente.
- Considerar computadores com 16 GB de RAM e pouco espaço disponível.
- Preservar funcionamento local.
- Não realizar deploy sem autorização.
- Não fazer merge automático.
- Não implementar escuta ou captura de tela ocultas.
- Não prometer reprodução exata de uma voz protegida.
- Manter documentação clara.

## 14. ORDEM DE EXECUÇÃO

Executar em fases verificáveis:

**FASE 1 — Diagnóstico e confiabilidade**
Revisar backend, integração OpenRouter, configuração, erros e testes.

**FASE 2 — Voz**
Implementar motor TTS aprimorado, perfil britânico, velocidade adequada e áudio incremental.

**FASE 3 — Pesquisa na internet**
Adicionar pesquisa real, leitura de fontes e respostas atualizadas.

**FASE 4 — Inteligência**
Melhorar prompt, escolha de ferramentas, fallback e qualidade das respostas.

**FASE 5 — Conversação**
Implementar reconhecimento e resposta por voz mais naturais.

**FASE 6 — Visão e memória**
Adicionar análise visual autorizada e memória persistente.

**FASE 7 — Integração Windows**
Expandir ferramentas seguras e funções de diagnóstico.

**FASE 8 — Finalização**
Executar testes, corrigir regressões, atualizar documentação e registrar resultados.

Ao final de cada fase, apresentar arquivos alterados, problemas corrigidos, testes executados, limitações e pendências.

Se alguma integração depender de configuração externa, deixar a implementação preparada, documentar os requisitos e manter um fallback funcional.

## RESULTADO FINAL ESPERADO

Quero um JARVIZ que:

- Converse comigo naturalmente.
- Tenha voz masculina britânica cinematográfica, quando disponível.
- Fale mais rápido, sem parecer artificial.
- Consiga pesquisar informações atuais.
- Responda perguntas com muito mais precisão.
- Entenda melhor o que estou pedindo.
- Consiga interpretar minha tela quando eu autorizar.
- Lembre de informações autorizadas.
- Ajude com programação e Windows.
- Funcione de maneira estável, sem depender obrigatoriamente de serviços pagos.

**Não entregue apenas recomendações: faça as alterações no código do projeto existente, implemente as melhorias possíveis, valide o resultado e apresente um relatório técnico do que realmente funciona.**