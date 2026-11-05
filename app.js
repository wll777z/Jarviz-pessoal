import { selectVoice } from './voice-selection.mjs';
const $ = selector => document.querySelector(selector);
const isPreview = Boolean(document.querySelector('meta[name="jarviz-mode"][content="preview"]'));
const states = {
  idle: ['AGUARDANDO COMANDO', 'Como posso ajudar?', 'Uma ideia. Um comando. Novas possibilidades.'],
  listening: ['OUVINDO', 'Estou ouvindo.', 'Sua transcrição aparecerá no campo de comando.'],
  processing: ['PROCESSANDO', 'Conectando as ideias.', 'Aguardando a resposta do assistente.'],
  speaking: ['FALANDO', 'Vamos dar o próximo passo.', 'Reproduzindo a resposta em voz alta.'],
  alert: ['ATENÇÃO', 'Uma decisão precisa de você.', 'Confira a mensagem ou autorização abaixo.'],
};
let token = '';
let pending = null;
let busy = false;
let available = false;
let serverConfig = null;
let recognition = null;
let listening = false;
let speechGeneration = 0;
const speech = window.speechSynthesis;
const settings = $('#settings-dialog');
let preferences = { reduced: false, voice: '', rate: .92, pitch: .78, enabled: true };
try { preferences = { ...preferences, ...JSON.parse(localStorage.getItem('jarviz-preferences') || '{}') }; } catch { /* Private storage can be unavailable. */ }
delete preferences.provider;
function savePreferences() { try { localStorage.setItem('jarviz-preferences', JSON.stringify(preferences)); } catch { /* Keep session settings. */ } }
function state(mode) {
  document.body.dataset.state = mode;
  const [label, title, description] = states[mode];
  $('#state-label').textContent = label;
  $('#core-title').textContent = title;
  $('#core-description').textContent = description;
  document.querySelectorAll('[data-mode]').forEach(item => item.dataset.active = String(item.dataset.mode === mode));
}
function controls() {
  $('.send').disabled = busy || Boolean(pending) || !available;
  $('#mic-button').disabled = busy || Boolean(pending) || !recognition || !available;
  $('#approve-button').disabled = busy;
  $('#deny-button').disabled = busy;
  $('#reset-button').disabled = busy;
  $('#settings-button').disabled = busy || Boolean(pending) || !available || isPreview;
}
function addEvent(label, title, description = '') {
  const article = document.createElement('article');
  const dot = document.createElement('span'); dot.className = 'event-dot';
  const small = document.createElement('small'); small.textContent = label;
  const heading = document.createElement('h3'); heading.textContent = title;
  const paragraph = document.createElement('p'); paragraph.textContent = description;
  article.append(dot, small, heading, paragraph);
  $('#conversation').prepend(article);
  while ($('#conversation').children.length > 30) $('#conversation').lastElementChild.remove();
  $('#conversation').scrollTop = 0;
}
async function api(route, data) {
  if (isPreview) {
    if (route === 'session') return { token: 'preview', configured: false, model: 'openrouter/free', root: '', pending: null };
    if (route === 'reset') return { ok: true };
    if (route === 'chat') {
      await new Promise(resolve => setTimeout(resolve, 700));
      return { reply: 'Esta é a prévia visual online do Jarviz. Para conversar com a IA, usar a voz e autorizar ações no computador, baixe o projeto pelo botão acima e execute Iniciar-Jarviz.cmd no Windows. Nenhum comando foi executado nesta página.', pending: null };
    }
    throw new Error('Disponível no aplicativo local para Windows.');
  }
  const response = await fetch('/api/' + route, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jarviz-Client': '1', 'X-Jarviz-Token': token },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(90000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Falha no servidor local.');
  return result;
}
function stopVoice() {
  speechGeneration++; speech?.cancel();
  if (document.body.dataset.state === 'speaking') state(pending ? 'alert' : 'idle');
}
async function speak(text, force = false) {
  stopVoice();
  const reportVoice = (message, failed = false) => {
    if (settings.open) $('#voice-test-message').textContent = message;
    else if (failed) { $('#request-error').textContent = message; $('#request-error').hidden = false; }
  };
  if (isPreview) { state('idle'); return; }
  if (!preferences.enabled && !force) { if (!pending) state('idle'); return; }
  if (!speech || (!preferences.enabled && !force)) { reportVoice('Este navegador não disponibiliza síntese de voz. Tente Edge ou Chrome.', true); if (!pending) state('idle'); return; }
  reportVoice('Iniciando a voz do navegador…');
  const generation = speechGeneration;
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
  const voices = speech.getVoices();
  utterance.voice = selectVoice(voices, preferences.voice);
  utterance.lang = utterance.voice?.lang || 'pt-BR';
  utterance.rate = Number(preferences.rate);
  utterance.pitch = Number(preferences.pitch);
  utterance.onstart = () => { if (generation === speechGeneration) { state('speaking'); reportVoice('Voz do navegador em reprodução.'); } };
  utterance.onend = () => { if (generation === speechGeneration) state(pending ? 'alert' : 'idle'); };
  utterance.onerror = event => {
    if (generation !== speechGeneration || event.error === 'canceled' || event.error === 'interrupted') return;
    state(pending ? 'alert' : 'idle');
    reportVoice('Erro na voz do navegador: ' + event.error + '. Confira as vozes instaladas e a saída de áudio.', true);
    addEvent('VOZ', 'Não foi possível reproduzir a voz.', 'A resposta continua disponível em texto. Confira as vozes do navegador nas configurações.');
  };
  speech.speak(utterance);
}
function showPending(value) {
  pending = value || null;
  $('#approval-panel').hidden = !pending;
  if (pending) {
    $('#approval-details').textContent = pending.actions.map((action, i) => `${i + 1}. ${action.name}\n${JSON.stringify(action.args, null, 2)}`).join('\n\n');
    state('alert');
    $('#approval-panel').scrollIntoView({ block: 'center' });
  }
  controls();
}
async function handleResult(result) {
  if (result.reply) {
    addEvent('JARVIZ', result.reply);
    $('#latest-answer').textContent = result.reply; $('#latest-answer-panel').hidden = false;
  }
  showPending(result.pending);
  if (!pending && result.reply) speak(result.reply);
}
$('#command-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#command').value.trim();
  if (!message || busy || pending || !available) return;
  stopVoice(); recognition?.abort();
  busy = true; controls(); state('processing');
  $('#request-error').hidden = true;
  addEvent('VOCÊ', message); $('#command').value = '';
  try { await handleResult(await api('chat', { message })); }
  catch (error) { state('alert'); addEvent('ERRO', error.message); $('#request-error').textContent = error.message; $('#request-error').hidden = false; }
  finally { busy = false; controls(); }
});
async function decide(approved) {
  if (!pending || busy) return;
  busy = true; controls(); state('processing');
  try { const result = await api('approve', { id: pending.id, approved }); showPending(null); await handleResult(result); }
  catch (error) {
    state('alert'); addEvent('ERRO', error.message);
    // The backend may have executed before the provider failed; refresh pending state instead of replaying.
    try { const session = await api('session'); showPending(session.pending); } catch { showPending(null); }
  } finally { busy = false; controls(); }
}
$('#approve-button').addEventListener('click', () => decide(true));
$('#deny-button').addEventListener('click', () => decide(false));
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  $('#command').value = button.dataset.command; $('#command').focus(); $('#command').scrollIntoView({ block: 'center' });
}));
$('#reset-button').addEventListener('click', async () => {
  if (busy) return;
  busy = true; controls(); stopVoice(); recognition?.abort();
  try { await api('reset', {}); showPending(null); $('#conversation').replaceChildren(); addEvent('SESSÃO', 'Conversa apagada.', 'O histórico foi removido da memória do servidor. O registro local de decisões é preservado.'); state('idle'); }
  catch (error) { addEvent('ERRO', error.message); state('alert'); }
  finally { busy = false; controls(); }
});
function voicesChanged() {
  const selector = $('#voice'); selector.replaceChildren(new Option('Automática · português masculino quando disponível', ''));
  const voicesAvailable = speech?.getVoices() || [];
  voicesAvailable.forEach(voice => selector.add(new Option(`${voice.name} · ${voice.lang}${voice.localService ? ' · local' : ' · rede'}`, voice.voiceURI)));
  selector.value = voicesAvailable.some(v => v.voiceURI === preferences.voice) ? preferences.voice : '';
  const selected = selectVoice(voicesAvailable, selector.value);
  $('#voice-description').textContent = selected ? `Voz selecionada: ${selected.name} (${selected.lang})${selected.localService ? ' · disponível no dispositivo' : ' · pode usar a rede do navegador'}.` : 'Aguardando as vozes do Windows. Se nenhuma aparecer, instale uma voz em Configurações do Windows → Hora e idioma → Fala.';
}
speech?.addEventListener('voiceschanged', voicesChanged); voicesChanged();
for (const [id, key] of [['voice-rate', 'rate'], ['voice-pitch', 'pitch']]) {
  $('#' + id).value = preferences[key]; $('#' + key + '-value').textContent = preferences[key];
  $('#' + id).addEventListener('input', event => $('#' + key + '-value').textContent = event.target.value);
}
$('#voice-enabled').checked = preferences.enabled;
function readVoicePreferences() {
  preferences.voice = $('#voice').value; preferences.rate = Number($('#voice-rate').value); preferences.pitch = Number($('#voice-pitch').value); preferences.enabled = $('#voice-enabled').checked;
  savePreferences();
}
$('#voice-test').addEventListener('click', () => {
  readVoicePreferences(); speak('Boa noite. Sou o Jarviz, seu assistente pessoal. Sistemas prontos para começar.', true);
});
$('#ai-test').addEventListener('click', async () => {
  if ($('#api-key').value.trim() || $('#model').value.trim() !== serverConfig?.model) { $('#ai-test-message').textContent = 'Salve a chave e o modelo antes de testar a IA.'; return; }
  $('#ai-test').disabled = true; $('#ai-test-message').textContent = 'Testando a conexão com a OpenRouter…';
  try { const result = await api('test-ai', {}); $('#ai-test-message').textContent = result.message; $('#ai-status').textContent = 'Conexão verificada'; }
  catch (error) { $('#ai-test-message').textContent = error.message; $('#ai-status').textContent = 'Falha no teste'; }
  finally { $('#ai-test').disabled = false; }
});
$('#stop-button').addEventListener('click', stopVoice);
$('#close-settings').addEventListener('click', () => { $('#api-key').value = ''; settings.close(); });
settings.addEventListener('close', () => { $('#api-key').value = ''; });
$('#settings-button').addEventListener('click', async () => {
  try { fillConfig(await api('config')); $('#settings-message').textContent = ''; settings.showModal(); }
  catch (error) { addEvent('ERRO', error.message); }
});
function fillConfig(config) {
  serverConfig = config;
  $('#model').value = config.model; $('#root-folder').value = config.root; $('#allow-commands').checked = config.allowCommands;
  $('#api-key').placeholder = config.configured ? 'Chave já configurada; vazio mantém a atual' : 'Cole sua chave OpenRouter';
  $('#ai-status').textContent = config.configured ? 'Configurado · não verificado' : 'Não configurado';
}
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter; if (button) button.disabled = true;
  $('#settings-message').textContent = 'Salvando…';
  try {
    const config = await api('config', { key: $('#api-key').value.trim(), model: $('#model').value.trim(), root: $('#root-folder').value.trim(), allowCommands: $('#allow-commands').checked });
    $('#api-key').value = ''; readVoicePreferences(); fillConfig(config);
    $('#settings-message').textContent = 'Salvo neste computador. A conexão será testada ao enviar uma mensagem.';
    addEvent('CONFIGURAÇÃO', 'Configurações salvas.', 'A conversa do servidor foi reiniciada para aplicar o modelo e a pasta autorizada.');
    state('idle');
  } catch (error) { $('#settings-message').textContent = error.message; }
  finally { if (button) button.disabled = false; }
});
function applyMotion() {
  document.documentElement.dataset.reducedMotion = String(preferences.reduced);
  $('#motion-toggle').setAttribute('aria-pressed', String(preferences.reduced));
  $('#motion-toggle').textContent = preferences.reduced ? 'Movimento reduzido · ativado' : 'Reduzir movimento';
}
applyMotion();
$('#motion-toggle').addEventListener('click', () => { preferences.reduced = !preferences.reduced; applyMotion(); savePreferences(); });
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition && !isPreview) {
  recognition = new Recognition(); recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = true;
  recognition.onstart = () => { listening = true; stopVoice(); $('#mic-button').setAttribute('aria-pressed', 'true'); $('#mic-button').setAttribute('aria-label', 'Parar microfone'); $('#mic-status').textContent = 'Ouvindo'; state('listening'); };
  recognition.onresult = event => { $('#command').value = Array.from(event.results).map(result => result[0].transcript).join(' ').slice(0, 8000); };
  recognition.onend = () => { listening = false; $('#mic-button').setAttribute('aria-pressed', 'false'); $('#mic-button').setAttribute('aria-label', 'Ativar microfone'); $('#mic-status').textContent = 'Desativado'; if (document.body.dataset.state === 'listening') state('idle'); };
  recognition.onerror = event => { addEvent('MICROFONE', 'Entrada por voz indisponível: ' + event.error, 'Você pode continuar digitando. Verifique a permissão e a conexão do navegador.'); };
  $('#mic-button').addEventListener('click', () => {
    if (listening) recognition.stop();
    else {
      if (!confirm('O reconhecimento de voz do navegador pode enviar áudio ao serviço do navegador. Ativar o microfone nesta sessão?')) return;
      try { recognition.start(); } catch { addEvent('MICROFONE', 'Não foi possível iniciar. Aguarde e tente novamente.'); }
    }
  });
} else { $('#mic-status').textContent = 'Sem suporte'; $('#mic-button').title = 'Reconhecimento de voz indisponível. Use Edge ou Chrome com suporte.'; }
function clock() { const now = new Date(); $('#clock').dateTime = now.toISOString(); $('#clock').textContent = now.toLocaleTimeString('pt-BR', { hour12: false }); }
clock(); setInterval(clock, 1000); controls();
try {
  const session = await api('session'); token = session.token; available = true;
  $('#backend-status').textContent = isPreview ? 'Prévia estática' : 'Conectado'; fillConfig(session); showPending(session.pending);
  $('#conversation').replaceChildren();
  addEvent('SISTEMA', isPreview ? 'Prévia visual online.' : 'Jarviz local conectado.', isPreview ? 'Sem conexão à IA, à voz ou aos arquivos. Instale o aplicativo Windows para usar essas funções.' : session.configured ? 'Envie uma mensagem para começar.' : 'Abra Configurações e voz para adicionar sua chave OpenRouter.');
  if (!session.configured && !isPreview) settings.showModal();
  if (isPreview) { $('#ai-status').textContent = 'Somente no app local'; $('#settings-button').hidden = true; $('#stop-button').hidden = true; $('#mic-status').textContent = 'Somente no app local'; }
} catch {
  state('alert'); $('#backend-status').textContent = 'Desconectado';
  addEvent('CONEXÃO', 'Inicie o servidor local.', 'No Windows, execute Iniciar-Jarviz.cmd e abra o endereço 127.0.0.1 indicado no terminal.');
}
controls();
