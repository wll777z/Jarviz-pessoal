# Jarviz funcional — Windows 10/11

Servidor Node.js 24 local, sem bibliotecas externas. Serve o HUD e mantém chave OpenRouter e histórico no backend. A chave é inserida em Configurações e armazenada no perfil local do usuário; nunca vai para Git ou para o modelo.

Conversa pela API OpenAI-compatible da OpenRouter. Modelo configurável, padrão `openrouter/free`; disponibilidade, ferramentas e limites dependem do provedor. Respostas de erro explícitas, timeout, histórico limitado e exclusão de conversa.

Ferramentas: listar/ler/criar/mover/excluir arquivos, abrir arquivo ou programa por caminho e executar PowerShell. Todas exigem aprovação com argumentos visíveis, inclusive leitura, porque resultados são enviados à OpenRouter. Caminhos seguem pasta autorizada; links simbólicos não escapam dela. Comandos ficam desabilitados inicialmente e, quando habilitados, têm o alcance da conta Windows, não um sandbox. Exclusão somente de arquivos, sem exclusão recursiva. Arquivos de credenciais e configuração do próprio Jarviz são protegidos das ferramentas de arquivos. Abrir arquivos pode executar programas e também exige confirmação. Sem execução elevada ou serviço de acesso remoto.

Servidor vinculado apenas a 127.0.0.1, valida Host/Origin e token de sessão, sem CORS e sem servidor de arquivos genérico. Log local registra nomes/estado das ações, não conteúdo de arquivos, comandos ou chaves.

Voz: Web Speech API quando suportada, seleção das vozes instaladas e ajuste de velocidade/tom. Voz masculina disponível no dispositivo, sem prometer a voz exata de um ator/personagem. Microfone acionado por botão e reconhecimento do navegador, potencialmente remoto; sem escuta permanente. Fallback de texto quando voz não existe. Movimento deriva de eventos reais de requisição, reconhecimento e fala.

Instalação Windows por script CMD com Node.js 24. Testes locais usam provedor de teste controlado e arquivos temporários; a chamada real requer chave do usuário e rede permitida. Não pedir chave pelo chat. Sem alegar validação no Windows quando o executor é Linux.

## Voz atual sem chave
A pedido do usuário, Fish Audio foi removido. A voz agora usa Web Speech API, seleção automática de voz masculina portuguesa quando presente e ajustes de tom/velocidade. IDs e chaves de voz não são necessários. A voz não é uma reprodução exata do personagem; qualidade e timbre dependem do Windows/navegador. Preferências antigas de provedor são ignoradas e campos Fish são descartados no próximo salvamento da configuração.
