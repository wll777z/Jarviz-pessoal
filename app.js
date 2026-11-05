import { audioToWav } from './audio-input.mjs';
import { selectVoice } from './voice-selection.mjs';
import { SpeechController, VOICE_PRESETS } from './speech-controller.mjs';
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
let receivedTranscript=false;let recognitionWatchdog=null;let recognition = null;let recordingPhase='idle',pageLeaving=false,recordGeneration=0;let attachedAudio=null,audioURL=null,recorder=null,recordStream=null,recordTimer=null;
let listening = false;
let conversationActive=false; let suppressRecognitionEnd=false; let finalTranscript=''; let micConsent=false; let screenshot=null; let capturing=false;
const speech = window.speechSynthesis;
const settings = $('#settings-dialog');
let preferences = { reduced: false, voice: '', rate: 1.15, pitch: .95, enabled: true, preset:'portuguese', engine:'browser', full:false };
try { preferences = { ...preferences, ...JSON.parse(localStorage.getItem('jarviz-preferences') || '{}') }; } catch { /* Private storage can be unavailable. */ }
delete preferences.provider;
if(!preferences.v3){preferences.rate=1.15;preferences.pitch=.95;preferences.preset='portuguese';preferences.v3=true;}
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
  $('#record-button').disabled=(recordingPhase!=='idle'&&recordingPhase!=='recording')||(busy&&recordingPhase!=='recording');$('#audio-upload').disabled=isPreview||busy||recordingPhase!=='idle';
  $('.send').disabled = busy || Boolean(pending) || !available || recordingPhase!=='idle';
  $('#mic-button').disabled = busy || Boolean(pending) || !recognition || !available || recordingPhase!=='idle';
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
    signal: AbortSignal.timeout(['chat','approve'].includes(route)?150000:90000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Falha no servidor local.');
  return result;
}
function reportVoice(message,failed=false) {
  if(settings.open) $('#voice-test-message').textContent=message;
  else if(failed){$('#request-error').textContent=message;$('#request-error').hidden=false;}
}
const speaker = new SpeechController({
  speech,Utterance:window.SpeechSynthesisUtterance,AudioClass:window.Audio,
  tts:async(text,{rate,signal})=>{
    const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json','X-Jarviz-Token':token},body:JSON.stringify({text,rate}),signal});
    if(!response.ok){const data=await response.json();throw new Error(data.error || 'Síntese local falhou.');}return response.blob();
  },
  onState:(mode,detail={})=>{
    state(mode==='synthesizing'?'processing':pending?'alert':mode);
    if(mode==='synthesizing'){$('#state-label').textContent='SINTETIZANDO VOZ';reportVoice('Sintetizando segmento no Piper…');}
    if(mode==='speaking'){reportVoice('Voz em reprodução.');$('#voice-engine-status').textContent='Voz: '+(detail.engine==='piper'?'Piper neural local':'navegador/Windows');if(detail.firstAudioMs!=null)$('#latency-status').textContent+=' · primeiro áudio '+Math.round(detail.firstAudioMs)+' ms';}
  },
  onError:message=>{reportVoice(message,true);addEvent('VOZ',message);},
  onDone:()=>resumeConversation(),
});
function stopVoice(){speaker.cancel();if(['speaking','processing'].includes(document.body.dataset.state)&&!busy)state(pending?'alert':'idle');}
async function speak(text,force=false){
  if(isPreview){state('idle');return;}
  if(!preferences.enabled&&!force){state(pending?'alert':'idle');resumeConversation();return;}
  if(listening){suppressRecognitionEnd=true;recognition?.abort();}
  reportVoice('Iniciando voz…');
  return speaker.speak(text,{...preferences,lang:VOICE_PRESETS[preferences.preset]?.lang || 'pt-BR'});
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
  if(result.metrics){$('#ai-status').textContent=result.metrics.model || serverConfig?.model || 'Conectado';$('#latency-status').textContent='IA '+(result.metrics.providerMs || 0)+' ms';}
  if(result.sources?.length){$('#internet-status').textContent='Fonte consultada';$('#sources-panel').hidden=false;$('#sources-list').replaceChildren();for(const source of result.sources){try{const url=new URL(source.url);if(url.protocol!=='https:'||url.username||url.password)continue;const li=document.createElement('li');const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title+(source.published?' · '+source.published:'');li.append(a);$('#sources-list').append(li);}catch{}}}
  if (result.reply) {
    addEvent('JARVIZ', result.reply);
    $('#latest-answer').textContent = result.reply; $('#latest-answer-panel').hidden = false;
  }
  showPending(result.pending);
  if (!pending && result.reply) speak(result.reply);
}
$('#command-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#command').value.trim() || (attachedAudio?'Transcreva este áudio e responda ao que foi solicitado.':'');
  if (!message || busy || pending || !available) return;
  stopVoice(); suppressRecognitionEnd=true; recognition?.abort();
  if(attachedAudio&&!$('#audio-consent').checked){$('#request-error').textContent='Autorize o envio do áudio ou remova o anexo.';$('#request-error').hidden=false;return;}
  if(screenshot&&!$('#vision-consent').checked){$('#request-error').textContent='Autorize o envio da imagem ou remova a captura.';$('#request-error').hidden=false;return;}
  busy = true; controls(); state('processing');
  $('#request-error').hidden = true;$('#sources-panel').hidden=true;
  if(screenshot)$('#vision-status').textContent='Analisando imagem autorizada…';
  addEvent('VOCÊ', message); $('#command').value = '';
  try { await handleResult(await api('chat', { message, ...(screenshot?{image:screenshot,imageConsent:true}:{}),...(attachedAudio?{audio:attachedAudio,audioConsent:true}:{}) })); removeImage();removeAudio(); }
  catch (error) { state('alert'); addEvent('ERRO', error.message); $('#request-error').textContent = error.message; $('#request-error').hidden = false; }
  finally { busy = false; controls(); if(!speaker.active)resumeConversation(); }
});
async function decide(approved) {
  if (!pending || busy) return;
  busy = true; controls(); state('processing');
  try { const result = await api('approve', { id: pending.id, approved }); showPending(null); await handleResult(result); }
  catch (error) {
    state('alert'); addEvent('ERRO', error.message);
    // The backend may have executed before the provider failed; refresh pending state instead of replaying.
    try { const session = await api('session'); showPending(session.pending); } catch { showPending(null); }
  } finally { busy = false; controls(); if(!speaker.active)resumeConversation(); }
}
$('#approve-button').addEventListener('click', () => decide(true));
$('#deny-button').addEventListener('click', () => decide(false));
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  $('#command').value = button.dataset.command; $('#command').focus(); $('#command').scrollIntoView({ block: 'center' });
}));
$('#reset-button').addEventListener('click', async () => {
  if (busy) return;
  endConversation();cancelRecording();removeAudio();busy = true; controls(); removeImage();$('#latest-answer-panel').hidden=true;$('#sources-panel').hidden=true;
  try { await api('reset', {}); showPending(null); $('#conversation').replaceChildren(); addEvent('SESSÃO', 'Conversa apagada.', 'O histórico foi removido da memória do servidor. O registro local de decisões é preservado.'); state('idle'); }
  catch (error) { addEvent('ERRO', error.message); state('alert'); }
  finally { busy = false; controls(); }
});
function voicesChanged() {
  const selector = $('#voice'); selector.replaceChildren(new Option('Automática · português masculino quando disponível', ''));
  const voicesAvailable = speech?.getVoices() || [];
  voicesAvailable.forEach(voice => selector.add(new Option(`${voice.name} · ${voice.lang}${voice.localService ? ' · local' : ' · rede'}`, voice.voiceURI)));
  selector.value = voicesAvailable.some(v => v.voiceURI === preferences.voice) ? preferences.voice : '';
  const selected = selectVoice(voicesAvailable, selector.value, VOICE_PRESETS[preferences.preset]?.lang || 'pt-BR');
  $('#voice-description').textContent = selected ? `Voz selecionada: ${selected.name} (${selected.lang})${selected.localService ? ' · disponível no dispositivo' : ' · pode usar a rede do navegador'}.` : 'Aguardando as vozes do Windows. Se nenhuma aparecer, instale uma voz em Configurações do Windows → Hora e idioma → Fala.';
}
speech?.addEventListener('voiceschanged', voicesChanged); voicesChanged();
for (const [id, key] of [['voice-rate', 'rate'], ['voice-pitch', 'pitch']]) {
  $('#' + id).value = preferences[key]; $('#' + key + '-value').textContent = preferences[key];
  $('#' + id).addEventListener('input', event => $('#' + key + '-value').textContent = event.target.value);
}
$('#voice-enabled').checked = preferences.enabled;
$('#voice-preset').value=preferences.preset;$('#speak-full').checked=preferences.full;
$('#voice-preset').addEventListener('change',()=>{const preset=VOICE_PRESETS[$('#voice-preset').value];preferences.preset=$('#voice-preset').value;$('#voice-rate').value=preset.rate;$('#voice-pitch').value=preset.pitch;$('#rate-value').textContent=preset.rate;$('#pitch-value').textContent=preset.pitch;preferences.voice='';voicesChanged();});
function readVoicePreferences() {
  preferences.preset=$('#voice-preset').value;preferences.engine=$('#tts-engine').value;preferences.full=$('#speak-full').checked;
  preferences.voice = $('#voice').value; preferences.rate = Number($('#voice-rate').value); preferences.pitch = Number($('#voice-pitch').value); preferences.enabled = $('#voice-enabled').checked;
  savePreferences();
}
$('#voice-test').addEventListener('click', () => {
  readVoicePreferences(); speak('Boa noite. Sou o Jarviz, seu assistente pessoal. Sistemas prontos para começar.', true);
});
$('#ai-test').addEventListener('click', async () => {
  if ($('#api-key').value.trim() || $('#model').value.trim() !== serverConfig?.model || $('#provider').value!==(serverConfig?.provider||'openrouter')) { $('#ai-test-message').textContent = 'Salve a chave e o modelo antes de testar a IA.'; return; }
  $('#ai-test').disabled = true; $('#ai-test-message').textContent = 'Testando a conexão com a OpenRouter…';
  try { const result = await api('test-ai', {}); $('#ai-test-message').textContent = result.message; $('#ai-status').textContent = 'Conexão verificada'; }
  catch (error) { $('#ai-test-message').textContent = error.message; $('#ai-status').textContent = 'Falha no teste'; }
  finally { $('#ai-test').disabled = false; }
});
$('#stop-button').addEventListener('click',()=>{stopVoice();resumeConversation();});
$('#close-settings').addEventListener('click', () => { $('#api-key').value = ''; settings.close(); });
settings.addEventListener('close', () => { $('#api-key').value = ''; });
$('#settings-button').addEventListener('click', async () => {
  endConversation();
  try { fillConfig(await api('config')); $('#settings-message').textContent = ''; settings.showModal(); }
  catch (error) { addEvent('ERRO', error.message); }
});
function fillConfig(config) {
  serverConfig = config;$('#internet-status').textContent=config.webEnabled===false?'Desabilitada':'Habilitada · não testada';$('#voice-engine-status').textContent='Voz: '+(config.ttsEngine==='piper'?'Piper configurado · não testado':'navegador / Windows');
  for(const [id,key] of [['fallback-model','fallbackModel'],['vision-model','visionModel'],['audio-model','audioModel'],['tts-executable','ttsExecutable'],['tts-model','ttsModel']])$('#'+id).value=config[key] || '';
  $('#web-enabled').checked=config.webEnabled!==false;$('#memory-enabled').checked=config.memoryEnabled===true;$('#allow-paid').checked=config.allowPaid===true;$('#retention-days').value=config.retentionDays || 30;$('#memory-max-mb').value=config.memoryMaxMB || 5;$('#max-tool-steps').value=config.maxToolSteps || 6;$('#tts-engine').value=config.ttsEngine || 'browser';preferences.engine=config.ttsEngine || 'browser';
  $('#model').value = config.model; $('#root-folder').value = config.root; $('#allow-commands').checked = config.allowCommands;
  $('#provider').value=config.provider||'openrouter';$('#external-billing-consent').checked=config.providerBillingConsent?.[config.provider]===true;
  $('#api-key').placeholder = config.configured ? 'Chave já configurada; vazio mantém a atual' : 'Cole sua chave OpenRouter';
  $('#ai-status').textContent = config.configured ? 'Configurado · não verificado' : 'Não configurado';
}
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter; if (button) button.disabled = true;
  $('#settings-message').textContent = 'Salvando…';
  try {
    const config = await api('config', { key: $('#api-key').value.trim(),provider:$('#provider').value,acknowledgeExternalBilling:$('#external-billing-consent').checked, model: $('#model').value.trim(), root: $('#root-folder').value.trim(), allowCommands: $('#allow-commands').checked,fallbackModel:$('#fallback-model').value.trim(),visionModel:$('#vision-model').value.trim(),audioModel:$('#audio-model').value.trim(),allowPaid:$('#allow-paid').checked,webEnabled:$('#web-enabled').checked,memoryEnabled:$('#memory-enabled').checked,retentionDays:Number($('#retention-days').value),memoryMaxMB:Number($('#memory-max-mb').value),maxToolSteps:Number($('#max-tool-steps').value),ttsEngine:$('#tts-engine').value,ttsExecutable:$('#tts-executable').value.trim(),ttsModel:$('#tts-model').value.trim() });
    $('#api-key').value = ''; readVoicePreferences(); fillConfig(config);
    $('#settings-message').textContent = 'Salvo neste computador. A conexão será testada ao enviar uma mensagem.';
    addEvent('CONFIGURAÇÃO', 'Configurações salvas.', 'A conversa do servidor foi reiniciada para aplicar o modelo e a pasta autorizada.');
    state('idle');
  } catch (error) { $('#settings-message').textContent = error.message; }
  finally { if (button) button.disabled = false; }
});
function applyMotion() {
  document.documentElement.dataset.reducedMotion = String(preferences.reduced);document.documentElement.dataset.motionOverride=String(preferences.motionOverride===true);
  $('#motion-toggle').setAttribute('aria-pressed', String(preferences.reduced));
  $('#motion-toggle').textContent = preferences.reduced ? 'Movimento reduzido · ativado' : 'Reduzir movimento';
}
applyMotion();
$('#motion-toggle').addEventListener('click', () => { preferences.reduced = !preferences.reduced; applyMotion(); savePreferences(); });
$('#enable-motion').addEventListener('click',()=>{preferences.reduced=false;preferences.motionOverride=true;applyMotion();savePreferences();$('#enable-motion').textContent='Movimento do núcleo ativado';});
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function resumeConversation(){if(conversationActive&&!speaker.active&&!busy&&!pending&&!settings.open&&!listening&&!capturing)startListening();}
function permitMic(){if(micConsent)return true;micConsent=confirm('Ativar o microfone? O reconhecimento do navegador pode usar serviço remoto. No modo conversação, transcrições finais serão enviadas automaticamente à IA. A escuta pausa durante a resposta.');return micConsent;}
function startListening(){if(recordingPhase!=='idle'||!recognition||busy||pending||!available||!permitMic())return;stopVoice();finalTranscript='';receivedTranscript=false;suppressRecognitionEnd=false;try{clearTimeout(recognitionWatchdog);recognitionWatchdog=setTimeout(()=>{if(!receivedTranscript){suppressRecognitionEnd=true;recognition.abort();$('#request-error').textContent='O navegador não entregou transcrição. No Opera GX, use Gravar áudio/Anexar áudio ou abra no Edge/Chrome.';$('#request-error').hidden=false;endConversation();}},12000);recognition.start();}catch(error){addEvent('MICROFONE','Não foi possível iniciar: '+error.message);}}
function endConversation(){clearTimeout(recognitionWatchdog);conversationActive=false;$('#conversation-button').setAttribute('aria-pressed','false');$('#conversation-button').textContent='Modo conversação';suppressRecognitionEnd=true;recognition?.abort();stopVoice();}
if(Recognition&&!isPreview){
  recognition=new Recognition();recognition.lang='pt-BR';recognition.continuous=false;recognition.interimResults=true;
  recognition.onstart=()=>{listening=true;$('#mic-button').setAttribute('aria-pressed','true');$('#mic-button').setAttribute('aria-label','Parar microfone');$('#mic-status').textContent='Ouvindo';state('listening');};
  recognition.onresult=event=>{receivedTranscript=true;clearTimeout(recognitionWatchdog);let text='';for(const result of event.results){text+=result[0].transcript+' ';if(result.isFinal)finalTranscript+=result[0].transcript+' ';}$('#command').value=text.trim().slice(0,8000);};
  recognition.onend=()=>{clearTimeout(recognitionWatchdog);listening=false;$('#mic-button').setAttribute('aria-pressed','false');$('#mic-button').setAttribute('aria-label','Ativar microfone');$('#mic-status').textContent=conversationActive?'Conversação · aguardando':'Desativado';if(document.body.dataset.state==='listening')state('idle');if(suppressRecognitionEnd){suppressRecognitionEnd=false;return;}if(!receivedTranscript){$('#request-error').textContent='Nenhuma transcrição foi recebida. No Opera GX, use Gravar áudio/Anexar áudio ou Edge/Chrome.';$('#request-error').hidden=false;}if(conversationActive&&finalTranscript.trim()&&!busy){$('#command').value=finalTranscript.trim().slice(0,8000);finalTranscript='';$('#command-form').requestSubmit();}else if(conversationActive){endConversation();addEvent('MICROFONE','Sessão pausada sem fala final. Ative novamente quando quiser.');}};
  recognition.onerror=event=>{if(event.error==='aborted')return;endConversation();const messages={'not-allowed':'Permissão do microfone negada. Libere o microfone nas configurações do navegador.','audio-capture':'Nenhum microfone disponível. Confira a entrada de som do Windows.','network':'O reconhecimento do navegador não conectou. Use Edge/Chrome ou Gravar áudio.','service-not-allowed':'Este navegador não permite reconhecimento de voz. Use Edge/Chrome ou Gravar áudio.'};const message=messages[event.error]||('Erro de reconhecimento: '+event.error);$('#request-error').textContent=message;$('#request-error').hidden=false;addEvent('MICROFONE',message);};
  $('#mic-button').addEventListener('click',()=>listening?recognition.stop():startListening());
  $('#conversation-button').addEventListener('click',()=>{if(conversationActive){endConversation();return;}if(!permitMic())return;conversationActive=true;$('#conversation-button').setAttribute('aria-pressed','true');$('#conversation-button').textContent='Encerrar conversação';startListening();});
  $('#push-to-talk').addEventListener('pointerdown',event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);startListening();});
  $('#push-to-talk').addEventListener('pointerup',()=>recognition.stop());$('#push-to-talk').addEventListener('pointercancel',()=>recognition.abort());
  $('#push-to-talk').addEventListener('keydown',event=>{if(event.code==='Space'&&!event.repeat){event.preventDefault();startListening();}});$('#push-to-talk').addEventListener('keyup',event=>{if(event.code==='Space'){event.preventDefault();recognition.stop();}});
}else{for(const id of ['conversation-button','push-to-talk'])$('#'+id).disabled=true;$('#mic-status').textContent='Use Gravar áudio ou Edge/Chrome';$('#mic-button').title='Reconhecimento não disponível neste navegador. Use Gravar áudio.';}
function removeAudio(){attachedAudio=null;$('#command').required=true;if(audioURL)URL.revokeObjectURL(audioURL);audioURL=null;$('#audio-preview').removeAttribute('src');$('#audio-panel').hidden=true;$('#audio-consent').checked=false;}
async function attachAudio(blob,generation=null){try{const wav=await audioToWav(blob);if(generation!==null&&generation!==recordGeneration)return;removeAudio();const reader=new FileReader();reader.readAsDataURL(wav);await new Promise((resolve,reject)=>{reader.onload=resolve;reader.onerror=reject;});if(generation!==null&&generation!==recordGeneration)return;attachedAudio=reader.result;$('#command').required=false;audioURL=URL.createObjectURL(wav);$('#audio-preview').src=audioURL;$('#audio-panel').hidden=false;$('#audio-status').textContent='Áudio pronto. Ouça, autorize o envio e clique em Enviar. Requer modelo com entrada de áudio; a chave é a mesma OpenRouter.';}catch(error){$('#request-error').textContent=error.message;$('#request-error').hidden=false;}}
$('#remove-audio').addEventListener('click',removeAudio);
$('#audio-upload').addEventListener('change',async event=>{const file=event.target.files[0];if(!file||recordingPhase!=='idle')return;recordingPhase='processing';const generation=++recordGeneration;controls();try{await attachAudio(file,generation);}finally{event.target.value='';if(generation===recordGeneration){recordingPhase='idle';controls();}}});
function cancelRecording(){recordGeneration++;clearTimeout(recordTimer);if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}recordStream?.getTracks().forEach(track=>track.stop());recordingPhase='idle';$('#record-button').disabled=false;$('#record-button').textContent='Gravar áudio';controls();}
$('#record-button').addEventListener('click',async()=>{
 if(recordingPhase==='recording'){recordingPhase='stopping';$('#record-button').disabled=true;controls();recorder.stop();return;}
 if(recordingPhase!=='idle'||isPreview||busy)return;
 endConversation();recordingPhase='requesting';const generation=++recordGeneration;$('#record-button').disabled=true;controls();$('#request-error').hidden=true;
 let stream;
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Gravação indisponível. Use Anexar áudio ou Edge/Chrome em 127.0.0.1.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(pageLeaving||generation!==recordGeneration){stream.getTracks().forEach(t=>t.stop());return;}
  recordStream=stream;const current=new MediaRecorder(stream);recorder=current;const chunks=[];
  const cleanup=()=>{clearTimeout(recordTimer);stream.getTracks().forEach(t=>t.stop());};
  current.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  current.onstop=async()=>{cleanup();if(generation!==recordGeneration)return;recordingPhase='processing';$('#record-button').disabled=true;$('#record-button').textContent='Preparando áudio…';state('idle');await attachAudio(new Blob(chunks,{type:current.mimeType}),generation);if(generation!==recordGeneration){removeAudio();return;}recordingPhase='idle';$('#record-button').disabled=false;$('#record-button').textContent='Gravar áudio';controls();};
  current.onerror=()=>{cleanup();if(generation!==recordGeneration)return;recordingPhase='idle';$('#record-button').disabled=false;$('#record-button').textContent='Gravar áudio';state('idle');controls();$('#request-error').textContent='Falha ao gravar. Confira o microfone.';$('#request-error').hidden=false;};
  current.start();recordingPhase='recording';$('#record-button').disabled=false;$('#record-button').textContent='Parar gravação';state('listening');controls();
  recordTimer=setTimeout(()=>{if(generation===recordGeneration&&current.state==='recording'){recordingPhase='stopping';$('#record-button').disabled=true;current.stop();}},59000);
 }catch(error){stream?.getTracks().forEach(t=>t.stop());if(generation!==recordGeneration)return;recordingPhase='idle';$('#record-button').disabled=false;controls();$('#request-error').textContent=error.message;$('#request-error').hidden=false;}
});
window.addEventListener('pagehide',()=>{pageLeaving=true;endConversation();cancelRecording();});
function removeImage(){screenshot=null;$('#image-preview').removeAttribute('src');$('#image-panel').hidden=true;$('#vision-consent').checked=false;$('#vision-status').textContent='Tela não compartilhada';}
function setImage(canvas){let data=canvas.toDataURL('image/jpeg',.75);if(data.length>1800000)data=canvas.toDataURL('image/jpeg',.45);if(data.length>1800000)throw new Error('Imagem excessiva. Selecione uma janela menor.');screenshot=data;$('#image-preview').src=data;$('#image-panel').hidden=false;$('#vision-consent').checked=false;$('#vision-status').textContent='Imagem local · aguardando consentimento';}
$('#remove-image').addEventListener('click',removeImage);
$('#capture-button').addEventListener('click',async()=>{
  if(isPreview||busy||capturing)return;endConversation();capturing=true;$('#capture-button').disabled=true;let stream;
  try{if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('Captura indisponível. Use Adicionar imagem ou Edge/Chrome local.');stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const video=document.createElement('video');video.muted=true;video.srcObject=stream;await video.play();const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);setImage(canvas);video.srcObject=null;}
  catch(error){$('#vision-status').textContent='Captura não realizada: '+error.message;}finally{stream?.getTracks().forEach(track=>track.stop());capturing=false;$('#capture-button').disabled=false;}
});
$('#image-upload').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>8000000||!['image/png','image/jpeg'].includes(file.type))throw new Error('Use PNG/JPEG de até 8 MB.');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();setImage(canvas);}catch(error){$('#vision-status').textContent=error.message;}event.target.value='';});
$('#web-test').addEventListener('click',async()=>{const button=$('#web-test');button.disabled=true;$('#web-test-message').textContent='Consultando fonte pública…';try{const result=await api('test-web',{});$('#web-test-message').textContent=result.provider+': '+result.sources.length+' fontes recebidas em '+result.fetchedAt;$('#internet-status').textContent='Consulta verificada';}catch(error){$('#web-test-message').textContent=error.message;$('#internet-status').textContent='Falha na consulta';}finally{button.disabled=false;}});
$('#models-button').addEventListener('click',async()=>{const button=$('#models-button');button.disabled=true;$('#models-status').textContent='Consultando catálogo…';try{const data=await api('models');const current=data.models.find(m=>m.id===$('#model').value);const compatible=data.models.filter(m=>m.id.endsWith(':free')&&(m.tools||m.vision||m.audio)).sort((a,b)=>Number(b.audio)-Number(a.audio)||Number(b.vision)-Number(a.vision)).slice(0,25);$('#models-status').textContent=(current?`Modelo atual: ferramentas ${current.tools?'sim':'não'}, imagens ${current.vision?'sim':'não'}. `:'Modelo atual não localizado. ')+compatible.map(m=>m.id+' ['+(m.tools?'ferramentas ':'')+(m.vision?'visão ':'')+(m.audio?'áudio':'')+']').join('; ');}catch(error){$('#models-status').textContent=error.message;}finally{button.disabled=false;}});
async function refreshMemory(){try{const [notes,history]=await Promise.all([api('memory'),api('history')]);$('#memory-status').textContent=notes.enabled?'Memória habilitada. Notas são dados autorizados; não guarde credenciais.':'Memória desabilitada. Habilite nas configurações para guardar/recuperar; excluir tudo continua disponível.';$('#remember-button').disabled=!notes.enabled;$('#memory-list').replaceChildren();$('#history-list').replaceChildren();for(const note of notes.notes){const li=document.createElement('li');li.textContent=note.text+' ';const button=document.createElement('button');button.textContent='Esquecer';button.addEventListener('click',async()=>{try{await api('memory',{action:'forget',id:note.id});await refreshMemory();}catch(error){$('#memory-status').textContent=error.message;}});li.append(button);$('#memory-list').append(li);}for(const item of history.history){const li=document.createElement('li');const button=document.createElement('button');button.textContent=item.title+' · '+new Date(item.updated).toLocaleString('pt-BR');button.addEventListener('click',async()=>{try{const data=await api('history',{id:item.id});$('#conversation').replaceChildren();for(const m of data.messages)addEvent(m.role==='user'?'VOCÊ':'JARVIZ',m.content);$('#memory-dialog').close();}catch(error){$('#memory-status').textContent=error.message;}});li.append(button);$('#history-list').append(li);}}catch(error){$('#memory-status').textContent=error.message;}}
$('#memory-button').addEventListener('click',()=>{if(isPreview)return;endConversation();$('#memory-dialog').showModal();refreshMemory();});$('#close-memory').addEventListener('click',()=>$('#memory-dialog').close());
$('#remember-button').addEventListener('click',async()=>{try{await api('memory',{action:'remember',text:$('#memory-note').value});$('#memory-note').value='';await refreshMemory();}catch(error){$('#memory-status').textContent=error.message;}});
$('#clear-memory').addEventListener('click',async()=>{if(!confirm('Excluir permanentemente todas as conversas e notas locais?'))return;try{await api('memory',{action:'clear'});$('#conversation').replaceChildren();showPending(null);await refreshMemory();}catch(error){$('#memory-status').textContent=error.message;}});
function clock() { const now = new Date(); $('#clock').dateTime = now.toISOString(); $('#clock').textContent = now.toLocaleTimeString('pt-BR', { hour12: false }); }
clock(); setInterval(clock, 1000); controls();
try {
  const session = await api('session'); token = session.token; available = true;
  $('#backend-status').textContent = isPreview ? 'Prévia estática' : 'Conectado'; fillConfig(session); showPending(session.pending);
  $('#conversation').replaceChildren();
  addEvent('SISTEMA', isPreview ? 'Prévia visual online.' : 'Jarviz local conectado.', isPreview ? 'Sem conexão à IA, à voz ou aos arquivos. Instale o aplicativo Windows para usar essas funções.' : session.configured ? 'Envie uma mensagem para começar.' : 'Abra Configurações e voz para adicionar sua chave OpenRouter.');
  if (!session.configured && !isPreview) settings.showModal();
  if (isPreview) { for(const id of ['memory-button','capture-button','record-button'])$('#'+id).hidden=true;$('#image-upload').disabled=true;$('#audio-upload').disabled=true;$('#audio-upload').closest('label').hidden=true; $('#ai-status').textContent = 'Somente no app local'; $('#settings-button').hidden = true; $('#stop-button').hidden = true; $('#mic-status').textContent = 'Somente no app local'; }
} catch {
  state('alert'); $('#backend-status').textContent = 'Desconectado';
  addEvent('CONEXÃO', 'Inicie o servidor local.', 'No Windows, execute Iniciar-Jarviz.cmd e abra o endereço 127.0.0.1 indicado no terminal.');
}
controls();

let freeProviders=[];
function renderFreeCatalog(){
 const query=$('#free-catalog-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const modality=$('#free-catalog-modality').value;const results=$('#free-catalog-results');results.replaceChildren();
 for(const provider of freeProviders){
  const models=provider.models.filter(model=>(modality==='all'||model[modality]===true)&&(!query||(provider.name+' '+model.id+' '+model.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)));
  if(!models.length)continue;const card=document.createElement('section');card.className='catalog-card';const title=document.createElement('h3');title.textContent=provider.name+(provider.integrated?(provider.adapter==='openrouter'?' · OpenRouter integrada':' · adaptador disponível'):' · referência externa');const description=document.createElement('p');description.textContent=provider.description;const link=document.createElement('a');link.href=provider.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Site oficial / obter chave ↗';card.append(title,description,link);
  for(const model of models){const row=document.createElement('div');const text=document.createElement('p');text.textContent=model.id+' · '+model.modality+' · '+(model.rateLimit||'Consulte os limites oficiais');row.append(text);
   if(provider.integrated&&(provider.adapter!=='openrouter'||model.id==='openrouter/free'||model.id.endsWith(':free'))){for(const [label,field] of [['Usar como principal','model'],...(model.audio?[['Usar para áudio','audio-model']]:[]),...(model.vision?[['Usar para visão','vision-model']]:[])]){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{if(provider.adapter&&$('#provider').value!==provider.adapter){$('#provider').value=provider.adapter;$('#external-billing-consent').checked=serverConfig?.providerBillingConsent?.[provider.adapter]===true;$('#api-key').value='';$('#api-key').placeholder=serverConfig?.configuredProviders?.[provider.adapter]?'Chave própria já cadastrada; vazio mantém a atual':'Cadastre uma chave própria de '+provider.name;$('#model').value=model.id;$('#fallback-model').value='';$('#vision-model').value='';$('#audio-model').value='';}$('#'+field).value=model.id;$('#free-catalog-dialog').close();$('#settings-message').textContent='Modelo selecionado. Salve e consulte as capacidades ao vivo antes de usar.';});row.append(button);}}
   card.append(row);
  }results.append(card);
 }if(!results.children.length)results.textContent='Nenhuma opção explicitamente compatível no snapshot. Consulte os provedores para dados atuais.';
}
$('#free-catalog-button').addEventListener('click',async()=>{$('#free-catalog-dialog').showModal();$('#free-catalog-status').textContent='Carregando referência local…';try{const catalog=await api('free-catalog');freeProviders=catalog.providers;$('#free-catalog-status').textContent=catalog.source+' · fonte atualizada em '+catalog.lastUpdated+' · revisão '+catalog.commit.slice(0,7)+'. '+catalog.notice;renderFreeCatalog();}catch(error){$('#free-catalog-status').textContent=error.message;}});
$('#free-catalog-search').addEventListener('input',renderFreeCatalog);$('#free-catalog-modality').addEventListener('change',renderFreeCatalog);$('#close-free-catalog').addEventListener('click',()=>$('#free-catalog-dialog').close());

$('#provider').addEventListener('change',async()=>{
 $('#api-key').value='';const id=$('#provider').value;$('#external-billing-consent').checked=serverConfig?.providerBillingConsent?.[id]===true;const names={openrouter:'OpenRouter',groq:'Groq',gemini:'Google Gemini',mistral:'Mistral AI'};
 $('#api-key').placeholder=serverConfig?.configuredProviders?.[id]?'Chave própria já cadastrada; vazio mantém a atual':'Cole uma chave própria de '+names[id];
 $('#fallback-model').value='';$('#vision-model').value='';$('#audio-model').value='';$('#models-status').textContent='Salve o provedor e sua chave antes de testar. A chave de outro serviço não será reutilizada.';
 try{const catalogue=await api('free-catalog');const first=catalogue.providers.find(p=>p.name===names[id])?.models[0];$('#model').value=id==='openrouter'?'openrouter/free':first?.id||'';}catch{$('#model').value='';}
});

$('#api-key').addEventListener('input',()=>{if($('#provider').value!=='openrouter')$('#external-billing-consent').checked=false;});
