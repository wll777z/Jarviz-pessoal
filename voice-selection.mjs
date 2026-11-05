// Voice availability is provided by Windows/the browser, not an external TTS API.
export function selectVoice(voices, preferred = '', language = 'pt-BR') {
  if (!voices.length) return null;
  const explicit = voices.find(voice => voice.voiceURI === preferred);
  if (explicit) return explicit;
  const target = language.toLowerCase().replace('_', '-');
  const score = voice => {
    const language = voice.lang.toLowerCase().replace('_', '-');
    const portuguese = language.startsWith('pt');
    const male = /\b(daniel|ant[oô]nio|duarte|ricardo|jorge|david|george|ryan|thomas|mark|james|guy|paul)\b/i.test(voice.name);
    return (language === target ? 120 : language.split('-')[0] === target.split('-')[0] ? 100 : portuguese ? 30 : 0) + (male ? 35 : 0) + (voice.localService ? 5 : 0) + (voice.default ? 1 : 0);
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}
