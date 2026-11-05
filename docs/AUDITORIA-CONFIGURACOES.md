# Auditoria focada de configurações

## Confirmado no código

- main local/remota conhecida: versão anterior, commit 3b64174. A versão completa está em feat/jarviz-3-local. O ZIP padrão da main não entrega as funcionalidades novas.
- O cadastro atual tem quatro provedores: OpenRouter, Groq, Google Gemini e Mistral. Chaves são separadas. Outros provedores do catálogo ainda não possuem adaptador.
- Salvar preferências reiniciava toda a conversa, mesmo sem trocar provedor/modelo/chave. Reproduzido por teste que falhou; corrigido. Agora mudanças de voz/memória/limites preservam o contexto, e mudanças de identidade/modelo reiniciam por segurança.
- Chaves anteriores são carregadas e preservadas quando o campo é deixado vazio. O formulário não exibe seu valor; isso não significa que foram apagadas.
- Memória é opt-in. PowerShell é desabilitado por padrão. Confirmações de possíveis custos são obrigatórias nos provedores externos; essas restrições não são perda de funcionalidades.
- Fish Audio foi removido por solicitação anterior do usuário. Voz do navegador e Piper opcional permanecem.
- Modelos não têm perfis completos separados por provedor: trocar provedor sugere modelo do catálogo e limpa campos dependentes no formulário. As chaves de cada provedor continuam salvas. É uma limitação atual, não restauração já implementada.

## Referência free-llm-apis

Já registrada em AGENTS.md como referência preferencial para futuros trabalhos no projeto. Snapshot local em data/free-llm-catalog.json, 15 provedores, origem/SHA/data e licença CC0. Painel nas configurações do Jarviz. Não fornece chaves, não executa código da fonte e não comprova gratuidade atual.

## Dados do computador do usuário

Configurações ficam em %APPDATA%\Jarviz\config.json, fora do ZIP. A máquina na nuvem não tem acesso ao AppData do Windows do usuário; nenhuma configuração pessoal foi recuperada ou confirmada como apagada por esta auditoria. Não excluir ou compartilhar esse arquivo, pois contém credenciais.

## Atualização correta

Extraia a versão da branch feat/jarviz-3-local, feche a instância antiga e execute Iniciar-Jarviz.cmd sem alterar o perfil AppData. Não usar o ZIP padrão da main nem a demonstração estática. O relatório registra limites e problemas confirmados, sem afirmar que todos os dados pessoais foram restaurados.
