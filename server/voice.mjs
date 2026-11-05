import { encode } from '@msgpack/msgpack';
export async function synthesize(text, config, request = fetch, signal) {
  if (!config.fishKey) throw new Error('Adicione uma chave Fish Audio nas configurações para usar esta voz.');
  if (typeof text !== 'string' || !text.trim() || text.length > 3000) throw new Error('A voz Fish aceita de 1 a 3000 caracteres por resposta nesta versão.');
  let response;
  try {
    response = await request('https://api.fish.audio/v1/tts', {
      method: 'POST', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${config.fishKey}`, 'Content-Type': 'application/msgpack', model: config.fishModel },
      body: encode({ text, reference_id: config.fishVoice, format: 'mp3' }),
    });
  } catch { throw new Error('Falha de rede ao conectar ao Fish Audio.'); }
  if (!response.ok) {
    const errors = { 401: 'Chave Fish Audio inválida.', 402: 'O Fish Audio informou falta de créditos. Confira o modelo gratuito e os limites da conta.', 403: 'Sem permissão para esta voz ou modelo Fish Audio.', 404: 'Voz ou modelo Fish Audio indisponível.', 429: 'Limite do Fish Audio atingido. Aguarde e tente novamente.' };
    throw new Error(errors[response.status] || `Não foi possível gerar a voz (Fish Audio HTTP ${response.status}).`);
  }
  if (!/audio\/|application\/octet-stream/.test(response.headers.get('content-type') || '')) throw new Error('Fish Audio não retornou áudio.');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) throw new Error('Áudio excede o limite de 12 MiB.');
    chunks.push(chunk);
  }
  if (!size) throw new Error('Fish Audio retornou áudio vazio.');
  return Buffer.concat(chunks);
}
