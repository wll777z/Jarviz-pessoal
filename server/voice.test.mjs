import test from 'node:test';
import assert from 'node:assert/strict';
import { decode } from '@msgpack/msgpack';
import { synthesize } from './voice.mjs';

test('Fish voice request uses the supplied voice ID and authenticated MessagePack protocol', async () => {
  const config = { fishKey: 'test-only-key', fishVoice: 'a5b93aeddcc948c19ea04f0afe9d178c', fishModel: 's2.1-pro-free' };
  let sent;
  const request = async (url, options) => { sent = { url, ...options }; return new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'Content-Type': 'audio/mpeg' } }); };
  const audio = await synthesize('Olá, senhor.', config, request);
  assert.equal(sent.url, 'https://api.fish.audio/v1/tts');
  assert.equal(sent.headers.Authorization, 'Bearer test-only-key');
  assert.equal(sent.headers.model, 's2.1-pro-free');
  assert.deepEqual(decode(sent.body), { text: 'Olá, senhor.', reference_id: config.fishVoice, format: 'mp3' });
  assert.equal(audio.toString('ascii', 0, 3), 'ID3');
  await assert.rejects(synthesize('Olá', { ...config, fishKey: '' }, request), /chave Fish/);
  await assert.rejects(synthesize('x'.repeat(3001), config, request), /3000/);
  await assert.rejects(synthesize('Olá', config, async () => new Response('secret-in-provider-error', { status: 401 })), /Chave Fish Audio inválida/);
  await assert.rejects(synthesize('Olá', config, async () => new Response('not audio', { headers: { 'Content-Type': 'application/json' } })), /áudio/);
});
