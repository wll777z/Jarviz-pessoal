# JARVIZ Pessoal 3.0

Assistente local para Windows 10/11: HUD original, OpenRouter, fala segmentada, pesquisa pública, captura visual autorizada, memória opt-in e ferramentas Windows com aprovação.

## Iniciar no Windows

1. Instale **Node.js 24 LTS atualizado (24.5 ou superior)** de https://nodejs.org e extraia o projeto inteiro.
2. Execute **Iniciar-Jarviz.cmd**. O navegador abre após o servidor iniciar. Mantenha o terminal aberto.
3. Em **Configurações e voz**, mantenha sua chave OpenRouter existente ou informe uma chave nova e salve.
4. Use **Testar IA**, **Consultar capacidades dos modelos**, **Testar pesquisa na internet** e **Testar voz** separadamente.

Não existem dependências npm de produção. No terminal também funciona `npm ci` seguido de `npm start`. Endereço padrão: `http://127.0.0.1:3210`. `JARVIZ_PORT` altera a porta. A versão completa exige o servidor local; hospedagem estática mostra somente a prévia.

## IA e modelos

- Padrão: `openrouter/free`. Configure um **alternativo** com identificador `:free` para erros temporários, cota 429 ou resposta vazia.
- Nunca há fallback automático para modelo pago. Modelos pagos exigem marcar a autorização explícita e escolher seus IDs.
- Autenticação 401/402/403 não dispara tentativas cegas; o erro é exibido. O modelo alternativo não garante disponibilidade ou melhora de qualidade.
- O catálogo informa suporte declarado a ferramentas e imagens. Uma requisição real ainda pode ser recusada pelo provedor ou política da conta.
- O servidor exige parâmetros suportados no roteamento OpenRouter; limita chamadas por turno e agrupa até cinco ações por aprovação.
- Contexto antigo é reduzido por grupos completos de ferramenta e resumo extrativo identificado como citações, sem inventar fatos nem chamar modelo pago para resumir.
- Latência total do provedor e modelo efetivamente usado aparecem na interface. O texto chega após a resposta completa; **tokens de texto ainda não são transmitidos em streaming**.

## Voz sem chave — prioridade local

Os presets são **JARVIZ Clássico** (preferência en-GB), **Rápido**, **Português** e **Personalizado**. Padrão: português, velocidade 1,15 e tom 0,95 no navegador. O preset britânico escolhe voz britânica quando disponível; não traduz automaticamente a resposta. Peça uma resposta em inglês para ouvi-la nesse idioma.

Texto completo fica na tela; áudio usa uma versão limpa e resumida, ou a resposta completa quando marcado. Links e blocos de código não são lidos literalmente. A fala é segmentada, pode ser interrompida por **Parar voz** ou pelo microfone, e não mantém filas duplicadas.

### Navegador / Windows

Funciona com as vozes disponíveis no dispositivo. O seletor prioriza vozes masculinas no idioma do preset e aceita escolha manual. Algumas vozes usam serviços do navegador; outras são locais. Nenhuma chave de voz é pedida. Se necessário, instale uma voz em **Configurações Windows → Hora e idioma → Fala** e reinicie o navegador. Não há promessa de reproduzir a voz exata de um ator/personagem.

### Piper neural local opcional

O adaptador usa o [Piper oficial](https://github.com/OHF-Voice/piper1-gpl), com código GPL-3.0 e modelos com licenças próprias. A documentação CLI foi consultada para confirmar `--model`, `--output_file` e `--length_scale`. Não incluímos o motor nem vozes de terceiros.

1. Instale uma distribuição confiável do Piper para seu Windows; a documentação oficial também oferece instalação Python `pip install piper-tts`.
2. Escolha e baixe **manualmente** um modelo compatível `.onnx` e seu `.onnx.json`, verificando o MODEL_CARD/licença e amostras. Para o preset clássico, procure voz masculina en-GB; para português, voz masculina pt-BR/pt-PT. Disponibilidade, licença e qualidade de cada voz precisam ser confirmadas.
3. Em Configurações, selecione **Piper**, informe os caminhos completos do executável (ex.: `C:\Piper\piper.exe`) e modelo, salve e teste.

Não baixe gravações protegidas nem clone ator sem autorização. Recursos próprios/licenciados podem ser usados como modelos Piper compatíveis, desde que o usuário tenha direitos.

Cada segmento gera WAV local; o próximo é pré-sintetizado enquanto o atual toca. Cache em `%APPDATA%\Jarviz\tts-cache` limita áudios a 50 MiB. O cache contém voz/texto falado e deve ser tratado como dado pessoal. Pode ser removido com o Jarviz fechado. O modelo é carregado por processo: há custo de inicialização; não houve benchmark de voz neural real nesta máquina. Não há download automático de modelos, CUDA obrigatório ou garantia de timbre/velocidade em todo PC. Pitch é do navegador; no Piper, velocidade usa length_scale e timbre/idioma vêm do modelo. Erro do Piper aciona fallback visível ao navegador.

## Pesquisa e fontes atuais

Ferramentas: `web_search`, `extract_webpage_text`, `open_webpage`, `get_current_datetime` e `get_weather`.

- Notícias: Google News RSS. Pesquisa geral: Bing RSS. São interfaces públicas sem chave, com disponibilidade/abrangência variáveis; não são uma API com SLA nem busca exaustiva.
- Clima por cidade: geocodificação e previsão atuais [Open-Meteo](https://open-meteo.com/), respeitando limites/termos de uso pessoal.
- Fontes, datas fornecidas e horário da consulta são preservados. Data ausente não é inventada. Fontes aparecem como links na interface.
- Consultas externas e conteúdo retornado são dados não confiáveis. Aprovações mostram a consulta/URL; não aprove envio de dados privados que não queira compartilhar.
- Leitura de páginas exige HTTPS público, porta padrão, sem credenciais. Endereços privados/especiais e URLs perigosas são recusados; DNS é validado e fixado na conexão, redirecionamentos são revalidados, downloads e tempo são limitados.
- **Proxies HTTPS configurados não são suportados pelo adaptador de páginas**: ele informa a limitação em vez de ignorar a política. Não remova proxies para contornar redes restritas. OpenRouter usa o transporte fetch do Node; a configuração de proxy/TLS da máquina precisa ser adequada.
- Se a rede, RSS ou API falhar, o erro é mostrado; não há notícia simulada no aplicativo real.

## Conversação e push-to-talk

**Modo conversação** pede permissão explícita e envia transcrições finais automaticamente. Durante resposta/fala, o reconhecimento pausa para não transcrever o próprio assistente. A escuta retoma ao concluir quando a sessão segue ativa; silêncio sem transcrição pausa a sessão. **Encerrar conversação** desativa a sessão.

**Segure para falar** funciona por mouse/toque ou tecla Espaço no botão, e interrompe a fala atual. Fora do modo conversação, revise a transcrição e envie manualmente. Não há gravação oculta, escuta permanente ou palavra de ativação. O reconhecimento do navegador pode usar serviço remoto; suporte depende de Edge/Chrome e permissões. O modo é half-duplex: interrupção da resposta é pelo microfone/push-to-talk, não por escuta oculta durante a própria fala.

Reconhecimento local (ex.: Vosk/Whisper) exigiria motor/modelo adicionais e integração própria; não é anunciado como funcional nesta entrega. Nenhum modelo foi instalado automaticamente.

## Visão autorizada

Use **Capturar tela** para abrir o seletor do navegador e escolher tela, janela ou aba quando suportado. É capturado um único quadro; as tracks são encerradas. **Adicionar imagem** é alternativa manual PNG/JPEG. A imagem é normalizada para JPEG com até 1600 pixels por dimensão e prévia local.

Marque o consentimento específico antes de enviar a próxima mensagem. Só então a imagem é transmitida à OpenRouter e ao provedor. Escolha um modelo visual gratuito no catálogo; sem capacidade visual verificada, o envio é recusado. Não há captura contínua ou acionada secretamente pelo modelo. A imagem não entra na memória persistente e é retirada do contexto após a análise. A resposta textual sobre ela pode entrar no histórico se a memória estiver habilitada.

## Histórico e memória opt-in

Ative em Configurações e escolha retenção de 1 a 365 dias (padrão 30). Armazenamento JSON atômico local, sem dependência de banco: até 20 conversas de 120 mensagens, 100 notas e capacidade configurável de 1 a 20 MiB (padrão 5 MiB). É adequado ao uso pessoal de uma instância, não a múltiplos servidores/processos sobre o mesmo perfil.

**Histórico e memória** permite guardar notas explicitamente, esquecer notas, retomar conversas e excluir tudo. Histórico e notas são separados. Retomar conversa restaura somente texto e nunca reexecuta ações antigas. Desabilitar memória impede novas gravações/recuperação; dados existentes permanecem até exclusão explícita. A exclusão continua disponível com memória desabilitada. Tokens/chaves conhecidos, identificadores longos e parágrafos com indícios de credenciais (inclusive valores em linhas seguintes) são omitidos de forma conservadora; notas que contenham credenciais reconhecíveis são recusadas. Não use a memória como cofre de senhas.

## Windows e arquivos

Preserva listar/ler/criar/mover/excluir arquivo, criar pasta, abrir caminho e executar PowerShell autorizado. Novidades: busca limitada de nomes (até 1000 entradas/100 resultados), identificação de CPU, memória livre/total, disco, sistema/uptime, processos Windows e interfaces de rede. CPU é identificação, não percentual instantâneo inventado.

Operações de arquivos respeitam pasta autorizada, não seguem links para fora dela e protegem caminhos de credenciais conhecidos e os dados Jarviz. Consultas privadas também exigem aprovação; data/hora pode ser consultada automaticamente. Consultas de diagnóstico usam APIs do sistema ou scripts fixos. Organizar pastas usa criação/movimentação já aprovadas, sem organização automática oculta.

PowerShell começa desabilitado e exige confirmação por comando. **Não é restrito à pasta autorizada**: opera com as permissões da conta Windows. Espera de até 20 segundos e limite de saída não garantem encerrar programas filhos; confira o Windows antes de repetir. Exclusão de arquivo é permanente, sem remoção recursiva de pastas. Não execute Jarviz como administrador.

## Dados e segurança

Configuração/chave: `%APPDATA%\Jarviz\config.json`, fora do repositório, em texto protegido pelas permissões da conta, sem criptografia própria. A chave existente é preservada. `OPENROUTER_API_KEY` é alternativa na primeira configuração. Memória: `memory.json`; decisões: `actions.jsonl` (sem comandos, caminhos, conteúdo ou chaves). Preferências de voz ficam no navegador, sem chaves.

O backend escuta só `127.0.0.1`, valida Host/origem e token, sem CORS. Só módulos públicos explicitamente permitidos são servidos/exportados. Não publique perfil local ou dados pessoais. Conversas, imagens autorizadas e resultados de ferramentas são enviados ao provedor de IA, sujeito à política dele.

## Testes e relatório

```sh
npm ci
npm run check
npm test
python3 tests/browser.py
```

Os testes de navegador exigem Playwright e Chromium (`JARVIZ_CHROMIUM` configura o caminho). Provedores externos, captura e Web Speech são simulados nos testes; o adaptador Piper é exercitado com CLI simulado, não uma voz neural real. Veja [validação técnica](docs/validation-3.0.md) para resultados e limitações. Não declarar validado no Windows a partir de testes Linux.

A prévia GitHub Pages é gerada por `npm run build:pages`; ela não executa IA, pesquisa, memória, microfone ou arquivos. O workflow de deploy só roda em main; a versão 3.0 pode ser revisada numa branch sem merge/deploy automático.

## Opera GX, áudio e movimento do núcleo

Permissão de microfone não garante reconhecimento de voz no Opera GX. Para transcrição direta e modo conversação, use Edge/Chrome com serviço de reconhecimento disponível. Falhas agora aparecem junto ao comando e o reconhecimento sem transcrição tem aviso de timeout.

Alternativa: **Gravar áudio → Parar gravação**, ou **Anexar áudio**. O áudio é convertido localmente para WAV mono de até 60 segundos, com prévia. Marque o consentimento e envie. Usa a mesma chave OpenRouter, porém requer um modelo com entrada de áudio, escolhido em Configurações após consultar capacidades. Não há fallback pago automático; disponibilidade gratuita varia. Áudio é removido do contexto após a chamada, não guardado como mídia na memória. A prévia estática não grava áudio.

**Ativar movimento do núcleo** habilita explicitamente as animações mesmo se a preferência do sistema for redução de movimento. O controle de redução continua disponível. Ao falar, os anéis aceleram e o núcleo pulsa; o movimento indica estado de fala, não amplitude fonema a fonema.

## Referência preferencial de APIs gratuitas

O catálogo [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis) foi incorporado como snapshot em `data/free-llm-catalog.json`, com revisão e data originais. Licença CC0 preservada em `docs/third-party/`. O botão **Catálogo de APIs gratuitas** nas configurações permite filtrar provedores/modelos e modalidades anunciadas, consultar limites declarados e abrir o site oficial. Modelos OpenRouter gratuitos podem preencher um campo escolhido pelo usuário, sem alterar a chave; ainda exigem salvar e verificar capacidades ao vivo. Provedores sem adaptador explícito são referências, não integrações operacionais. A lista cobre principalmente inferência de texto; modalidade anunciada não garante áudio gratuito na conta.

`AGENTS.md` registra a preferência por essa referência para trabalhos futuros neste projeto. Atualização do snapshot é explícita pelo script `scripts/import-free-catalog.mjs`; não há atualização, cadastro ou envio de chave a terceiros em segundo plano.

## Cadastro de chaves por provedor

Adaptadores atuais: **OpenRouter, Groq, Google Gemini (endpoint OpenAI-compatible) e Mistral AI**. Selecione o provedor, informe a chave da sua própria conta, escolha um modelo e salve. A chave OpenRouter antiga é preservada. Cada serviço tem chave separada, armazenada somente no perfil local. Trocar de serviço não reutiliza uma chave de outro provedor; as credenciais nunca são enviadas a URLs fornecidas pelo modelo ou pelo catálogo. Endpoints são fixos no servidor.

Não existe “chave universal”: outras APIs exigem protocolo/adaptador próprio. Não incluímos chaves públicas ou credenciais compartilhadas. A lista comunitária anuncia cotas gratuitas, mas não pode impedir cobrança em uma conta com plano pago ou garantir disponibilidade; verifique limites e privacidade oficiais. Para os novos provedores, o modo sem autorização de modelos pagos restringe os IDs aos anunciados no snapshot; isso não é uma verificação do saldo ou plano da conta.

Consultar modelos/capacidades e Testar IA usam o provedor selecionado. Áudio/visão em outros provedores dependem de metadados compatíveis do serviço; capacidades desconhecidas são recusadas em vez de serem presumidas. Não há fallback entre serviços com envio automático de histórico a terceiros. Os adaptadores foram testados com transporte controlado, não com contas reais dos quatro serviços.

Antes de utilizar Groq, Gemini ou Mistral, é obrigatório confirmar na interface o risco de cobrança conforme o plano da conta. A lista de IDs gratuitos não prova que sua chave esteja numa cota gratuita; o backend bloqueia a chamada sem essa confirmação. A autorização é separada por provedor, e inserir uma nova chave pede nova confirmação. Modelos fora do snapshot ainda exigem a opção adicional de modelos pagos. Nenhuma cota ou saldo foi verificado com contas reais.

## Conexão automática

Em Configurações, cole a chave e clique em **Conectar automaticamente**. Prefixos OpenRouter (`sk-or-`), Groq (`gsk_`) e Gemini (`AIza`) são reconhecidos. Chaves sem prefixo inequívoco exigem escolher o provedor; nunca são testadas em vários serviços. Prefixos e aspas comuns de cópia, como `Bearer`, são removidos localmente.

OpenRouter testa `openrouter/free` diretamente. Outros adaptadores cruzam o catálogo ao vivo com IDs anunciados na referência e testam até três candidatos no mesmo serviço. Autenticação, falta de saldo, acesso negado e limites interrompem as tentativas. A chamada de verificação exige suporte às ferramentas do assistente, sem executar nenhuma delas. Não há fallback pago ou entre provedores.

A configuração só é gravada após resposta válida, preservando voz, memória, arquivos e outras chaves. Erros não substituem a chave anterior. Provedores externos ainda exigem confirmação explícita do risco de cobrança; a automação não consegue verificar seu plano/saldo. O repositório de APIs gratuitas não distribui chaves. Não são criadas contas ou credenciais automaticamente.

### Falha de conexão com a IA

Reinicie pelo `Iniciar-Jarviz.cmd` atualizado ou por `npm start`. Ambos habilitam o proxy de ambiente (`HTTP_PROXY`/`HTTPS_PROXY` e `NO_PROXY`) e os certificados confiáveis do sistema no Node 24. Não desabilitamos TLS. A VPN/proxy interno do Opera não configura o servidor Node; proxies automáticos/PAC do Windows também não são importados por estas opções.

Se persistir, execute `Diagnosticar-Conexao.cmd` e copie o resultado. Ele consulta apenas o catálogo público da OpenRouter, sem chave, conversa ou geração de tokens. Os erros de cadastro agora distinguem DNS, certificado, conexão recusada, interrupção e timeout, sem exibir credenciais do proxy. Falhas de rede não repetem a mesma chamada em outro modelo do mesmo domínio. Sucesso no diagnóstico comprova acesso TLS/HTTP, não a validade ou cota da chave.
