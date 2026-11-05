# Jarviz pessoal

Interface HUD inspirada no JARVIS, com identidade própria: núcleo ciano, órbitas segmentadas e movimento por estado. Primeira entrega visual em HTML, CSS e JavaScript, sem dependências de execução ou build.

## Executar

Na raiz, execute `python3 -m http.server 8000` e acesse o servidor local no navegador. Também é possível hospedar os três arquivos `index.html`, `styles.css` e `app.js` em qualquer serviço estático. Não há fontes, bibliotecas nem serviços externos carregados pela página.

## Interações

- Cinco estados: em espera, ouvindo, processando, falando e alerta.
- Comandos escritos demonstram processamento e uma resposta local predefinida.
- Atalhos preenchem a caixa de comando; Enter envia.
- Movimento reduzido respeita a preferência do sistema e um controle persistente.
- Layout adaptado a dispositivos móveis e navegação por teclado.

**Esta versão é uma demonstração visual.** Não há IA, backend, acesso a arquivos, execução de comandos, captura de microfone ou síntese de voz. Onda e estados de voz são simulados. Nenhuma credencial é necessária. O histórico existe somente em memória e some ao recarregar. Apenas a preferência de movimento é salva localmente.

## Validar

`node --check app.js` verifica a sintaxe. O teste `python3 tests/browser.py` exige o pacote Python Playwright e Chromium em `/usr/bin/chromium`; valida estados, envio de texto com HTML sem execução, cancelamento de transições, preferência de movimento e largura móvel. Capturas são salvas em `/workspace/jarviz-desktop.png` e `/workspace/jarviz-mobile.png` no ambiente de desenvolvimento.

Próximo passo: conectar uma API do assistente e seus eventos reais aos estados visuais; não expor chaves de API no frontend.
