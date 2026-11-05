# Jarviz pessoal

Assistente local para **Windows 10/11**, com interface HUD, conversa OpenRouter, voz e ações no computador mediante aprovação.

## Começar no Windows

1. Instale **Node.js 24 LTS** de https://nodejs.org.
2. Baixe ou clone este repositório e extraia todos os arquivos.
3. Abra `Iniciar-Jarviz.cmd`. Na primeira execução ele instala a dependência pelo lockfile. Mantenha o terminal aberto.
4. Abra **http://127.0.0.1:3210** no Edge ou Chrome.
5. Em **Configurações e voz**, cole sua chave OpenRouter, escolha a pasta autorizada e salve. Não envie chaves pelo chat nem publique no GitHub.
6. Escreva uma mensagem. Para ações em arquivos, confira os caminhos e argumentos e clique em **Aprovar e executar** ou **Recusar**.

Também pode executar `npm ci` e `npm start` na raiz. Não use mais `python -m http.server`: a conversa e as ferramentas dependem do servidor Node. Este projeto não funciona como assistente em hospedagem estática/GitHub Pages.

## IA gratuita pela OpenRouter

Crie sua chave em https://openrouter.ai/settings/keys. O padrão é `openrouter/free`. Pode selecionar o identificador de um modelo `:free` com suporte a ferramentas. Sem cota, rede ou modelo compatível, a interface informa o erro; não troca automaticamente para modelos pagos. Identificadores pagos escolhidos manualmente podem gerar cobrança. O uso de modelos gratuitos depende dos limites, disponibilidade e políticas da sua conta.

Conversas e resultados de ferramentas autorizados são enviados à OpenRouter e ao provedor do modelo. Não aprove leitura de conteúdo que não queira compartilhar. Arquivos do computador são dados, nunca instruções para o assistente.

## Voz Fish Audio indicada

A opção Fish Audio é a voz padrão para novas instalações. O ID **a5b93aeddcc948c19ea04f0afe9d178c** já vem preenchido, conforme a [página da voz fornecida](https://fish.audio/pt/app/text-to-speech/?modelId=a5b93aeddcc948c19ea04f0afe9d178c).

1. Obtenha uma chave de API na sua conta Fish Audio.
2. Em Configurações, selecione **Fish Audio · voz Jarviz** e preencha **Chave Fish Audio**.
3. Mantenha o modelo **s2.1-pro-free**, salve e use **Testar voz**.

O SDK oficial documenta `s2.1-pro-free` como gratuito, inclusive sem créditos na conta. Isso não confirma acesso a toda voz da comunidade: esta voz específica exige validação com sua conta. Não há troca automática para modelos pagos. A chave OpenRouter não funciona no Fish Audio. Esta integração não inclui áudio, licença ou autorização do ator/personagem; utilize a voz conforme as condições do serviço.

Ao usar Fish Audio, o texto da resposta também é enviado ao Fish. A reprodução lê até 3000 caracteres por vez; a resposta completa permanece em texto. O tom só é ajustável para vozes do navegador; a velocidade também se aplica à reprodução Fish. **Parar voz** cancela a reprodução/solicitação local, mas não garante que o serviço remoto deixe de contabilizar uma geração já iniciada.

### Alternativa sem API de voz

Selecione **Voz do navegador / Windows**, escolha uma voz instalada e ajuste velocidade e tom. Disponibilidade e qualidade dependem do Windows/navegador. Não é a voz exata do personagem. A voz marcada como “rede” pode enviar texto ao serviço do navegador.

O microfone só é ativado pelo botão e pela permissão do navegador. O reconhecimento pode usar o serviço remoto do navegador. A transcrição aparece no campo e **você envia**; não há escuta permanente nem palavra de ativação. Se não houver suporte, digite normalmente.

## Ações realmente implementadas

- Listar uma pasta (até 200 itens).
- Ler arquivos UTF-8 de até 64 KiB.
- Criar pastas e arquivos novos sem sobrescrever arquivos existentes.
- Mover arquivos dentro da pasta autorizada, sem substituir destinos.
- Excluir um único arquivo, permanentemente, com confirmação; não exclui pastas recursivamente.
- Abrir arquivo ou executável por caminho no Windows.
- Executar PowerShell, quando habilitado, com confirmação, limite de saída e espera de até 20 segundos. O limite interrompe o PowerShell, mas programas que ele iniciou podem continuar; confira o Windows antes de repetir comandos após erro ou timeout.

O servidor usa as permissões da conta que o iniciou. A pasta autorizada limita as ferramentas de arquivos, inclusive links para fora dela. **PowerShell não é restrito à pasta**: pode afetar arquivos, programas e rede acessíveis à sua conta. Leia o comando completo antes de aprovar. Abrir um arquivo pode executar um programa. Não execute como administrador. Não existe acesso remoto irrestrito, controle de mouse/tela ou instalação oculta.

Cada conjunto de ações exige aprovação; o modelo não pode aprovar sua própria execução. O painel mostra os argumentos completos. Enquanto houver aprovação pendente, novos comandos e mudanças de configuração ficam bloqueados. Recarregar a página recupera a aprovação pendente. Aprovação usada não pode ser repetida. Arquivos de credenciais conhecidos e a pasta de dados do Jarviz não são acessíveis pelas ferramentas de arquivos. Comandos PowerShell habilitados têm o alcance mais amplo da sua conta, portanto essa proteção não se aplica a comandos explicitamente aprovados.

## Dados locais

- Windows: `%APPDATA%\Jarviz\config.json` guarda as chaves e configurações fora do repositório. **As chaves ficam em texto nesse arquivo**, com a proteção da conta/pasta local, sem criptografia própria. Não compartilhe essa pasta. Contas com acesso aos seus arquivos podem lê-las.
- `actions.jsonl`, na mesma pasta, registra horário, nome da ferramenta e decisão, sem conteúdo, caminho, comando ou chave.
- Conversa somente em memória do servidor; **Limpar conversa** a remove. Provedores externos podem ter suas próprias políticas de retenção. Reiniciar o servidor também limpa a conversa e as aprovações.
- Preferências de voz/movimento ficam no armazenamento local do navegador; chaves nunca ficam nele.
- O servidor escuta somente em `127.0.0.1`, verifica origem/Host e exige token de sessão nas APIs. Somente os três arquivos públicos são servidos; código do servidor, `.git` e configurações não são publicados.

Para remover uma chave salva, encerre o Jarviz e remova o campo correspondente em `config.json`, ou remova o arquivo inteiro e configure novamente. Variáveis `OPENROUTER_API_KEY` e `FISH_API_KEY` também são aceitas na primeira configuração; configuração salva tem precedência. `JARVIZ_PORT` permite escolher outra porta (abra o endereço indicado no terminal).

## Verificar

```sh
npm ci
npm run check
npm test
```

Testes Node verificam autenticação, origem, aprovação/recusa/replay, arquivos temporários reais, limites de caminhos e protocolo MessagePack Fish com HTTP controlado. Não usam nem consomem suas APIs.

O teste opcional `python3 tests/browser.py` exige Python, Playwright e Chromium; no Linux usa `/usr/bin/chromium`, ou configure `JARVIZ_CHROMIUM`. Ele inicia um backend com provedor de teste explícito, valida conversa, aprovações, persistência de movimento e layout móvel. Não confirma IA real nem qualidade de voz. Capturas no ambiente de desenvolvimento: `/workspace/jarviz-functional-desktop.png` e `/workspace/jarviz-functional-mobile.png`.

A validação automática foi feita em Linux. Abertura de programas, PowerShell, permissões do microfone e som precisam ser validados no Windows do usuário. Chamadas reais OpenRouter/Fish dependem de chaves e acesso à rede; não são apresentadas como verificadas sem esses requisitos.

## Site público no GitHub Pages

O workflow `.github/workflows/pages.yml` publica somente o HUD e os links de instalação em `dist/`. Backend, testes, chaves e dados locais não entram no artefato. O site é uma prévia explicitamente identificada: ele não faz chamadas de IA, não captura áudio e não executa ações no computador. O botão de download entrega o projeto completo; depois de iniciar no Windows, o botão “Abrir Jarviz local já iniciado” leva ao servidor da própria máquina na porta padrão 3210.

Ative em **Settings → Pages → Build and deployment → Source → GitHub Actions**. Depois execute o workflow **Publicar prévia Jarviz** em **Actions**, ou faça um novo push em main. O endereço padrão previsto é `https://wll777z.github.io/Jarviz-pessoal/`; confirme o resultado do deploy antes de tratá-lo como publicado.

Para gerar os arquivos estáticos localmente: `node scripts/build-pages.mjs`. A versão completa continua sendo iniciada com `Iniciar-Jarviz.cmd` e não depende do Pages. O iniciador abre o navegador no Windows após o servidor iniciar.
