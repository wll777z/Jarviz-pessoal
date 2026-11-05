import { selectVoice } from './voice-selection.mjs';
export const VOICE_PRESETS = {
  classic: { label: 'JARVIZ Clássico', lang: 'en-GB', rate: 1.15, pitch: .95 },
  fast: { label: 'JARVIZ Rápido', lang: 'pt-BR', rate: 1.25, pitch: 1 },
  portuguese: { label: 'JARVIZ Português', lang: 'pt-BR', rate: 1.15, pitch: .95 },
  custom: { label: 'Personalizado', lang: 'pt-BR', rate: 1.15, pitch: 1 },
};
export function splitSpeech(text, limit = 240) {
  const parts = []; let current = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (current.length + word.length + 1 > limit && current) { parts.push(current); current = ''; }
    if (word.length > limit) { if (current) { parts.push(current); current = ''; } for (let i = 0; i < word.length; i += limit) parts.push(word.slice(i, i + limit)); }
    else { current += (current ? ' ' : '') + word; if (/[.!?]$/.test(word) && current.length > 70) { parts.push(current); current = ''; } }
  }
  if (current) parts.push(current);
  return parts;
}
export function prepareSpeech(text, full = false) {
  const clean = String(text).replace(/```[\s\S]*?```/g, ' O exemplo de código está na tela. ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/[*#_`>|]/g, '').replace(/\s+/g, ' ').trim();
  if (full || clean.length <= 600) return clean.slice(0, 8000);
  const summary = clean.slice(0, 520).replace(/\s+\S*$/, '');
  return summary + '. O restante da explicação está na tela.';
}
export class SpeechController {
  constructor({ speech, Utterance, AudioClass, tts, onState = () => {}, onError = () => {}, onDone = () => {} }) { Object.assign(this, { speech, Utterance, AudioClass, tts, onState, onError, onDone }); this.generation = 0; this.active=false; }
  cancel() { this.active=false; this.generation++; this.abort?.abort(); this.speech?.cancel(); this.audio?.pause(); this.audio = null; }
  async speak(text, options = {}) {
    this.cancel(); this.active=true; const generation = this.generation; const abort = new AbortController(); this.abort = abort;
    const segments = splitSpeech(prepareSpeech(text, options.full));
    const started = performance.now(); let first = true; let fallback = options.engine !== 'piper';
    const get = segment => this.tts(segment, { rate: options.rate || 1.15, signal: abort.signal }).then(blob => ({ blob }), error => ({ error }));
    let next = !fallback && segments.length ? get(segments[0]) : null;
    try {
      for (let i = 0; i < segments.length; i++) {
        if (abort.signal.aborted) break;
        if (!fallback) {
          this.onState('synthesizing');
          const result = await next;
          if (abort.signal.aborted) break;
          if (result.error) { fallback = true; this.onError(result.error.message + ' Usando a voz do navegador.'); }
          else {
            if (i + 1 < segments.length) next = get(segments[i + 1]);
            await this.play(result.blob, abort.signal, () => { this.onState('speaking', { engine: 'piper', firstAudioMs: first ? performance.now() - started : null }); first = false; });
            continue;
          }
        }
        if (!this.speech || !this.Utterance) throw new Error('Voz do navegador indisponível. Use Edge/Chrome com voz instalada ou configure Piper.');
        await new Promise((resolve, reject) => {
          const utterance = new this.Utterance(segments[i]); this.utterance = utterance;
          utterance.voice = selectVoice(this.speech.getVoices(), options.voice, options.lang || 'pt-BR');
          utterance.lang = utterance.voice?.lang || options.lang || 'pt-BR'; utterance.rate = options.rate || 1.15; utterance.pitch = options.pitch || 1;
          const stop = () => reject(new Error('Fala cancelada.'));
          const finish = callback => { abort.signal.removeEventListener('abort', stop); callback(); };
          utterance.onstart = () => { if (!abort.signal.aborted) { this.onState('speaking', { engine: 'browser', firstAudioMs: first ? performance.now() - started : null }); first = false; } };
          utterance.onend = () => finish(resolve);
          utterance.onerror = event => finish(() => reject(new Error('Falha da voz do navegador: ' + event.error)));
          abort.signal.addEventListener('abort', stop, { once: true });
          try { this.speech.speak(utterance); } catch (error) { finish(() => reject(error)); }
        });
      }
    } catch (error) { if (!abort.signal.aborted) this.onError(error.message); }
    finally { if (generation === this.generation) { this.active=false; this.onState('idle'); this.onDone(); } }
  }
  async play(blob, signal, onStart) {
    const url = URL.createObjectURL(blob); const audio = new this.AudioClass(url); this.audio = audio;
    try {
      await new Promise((resolve, reject) => {
        const stop = () => { audio.pause(); reject(new Error('Áudio cancelado.')); };
        const finish = fn => { signal.removeEventListener('abort', stop); fn(); };
        audio.onplaying = onStart; audio.onended = () => finish(resolve); audio.onerror = () => finish(() => reject(new Error('Não foi possível reproduzir o áudio local.')));
        signal.addEventListener('abort', stop, { once: true }); audio.play().catch(error => finish(() => reject(error)));
      });
    } finally { audio.pause(); URL.revokeObjectURL(url); if (this.audio === audio) this.audio = null; }
  }
}
