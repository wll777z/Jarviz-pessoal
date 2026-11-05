import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { splitSpeech, prepareSpeech, VOICE_PRESETS } from '../speech-controller.mjs';
import { assertPublicURL, parseSearchRSS, extractText, webSearch, weather, publicAddress } from './web.mjs';
import { createMemory } from './memory.mjs';
import { complete } from './openrouter.mjs';

test('speech is segmented and summarized separately from full answer', () => {
  const full = 'Olá. '.repeat(150) + 'Veja https://example.com para detalhes.';
  const speech = prepareSpeech(full);
  assert.ok(speech.length < full.length);
  assert.ok(!speech.includes('https://'));
  assert.ok(splitSpeech(full).every(s => s.length <= 240));
  assert.equal(VOICE_PRESETS.classic.lang, 'en-GB');
  assert.equal(VOICE_PRESETS.portuguese.lang, 'pt-BR');
});
test('web URL checks reject loopback, private IPs and credentials', async () => {
  for (const url of ['http://example.com', 'https://127.0.0.1', 'https://[::1]', 'https://user:pass@example.com', 'https://10.0.0.1', 'https://[::ffff:127.0.0.1]']) await assert.rejects(assertPublicURL(url));
  await assert.rejects(assertPublicURL('https://example.com', async () => [{ address: '192.168.1.1', family: 4 }]));
  assert.equal((await assertPublicURL('https://example.com', async () => [{ address: '93.184.216.34', family: 4 }])).url.hostname, 'example.com');
  const sources = parseSearchRSS('<rss><item><title>Notícia</title><link>https://example.com/news</link><pubDate>Wed, 04 Nov 2026 12:00:00 GMT</pubDate><description>Texto</description></item></rss>');
  assert.equal(sources[0].url, 'https://example.com/news');
  assert.ok(sources[0].published);
  assert.equal(extractText('<script>bad()</script><p>Bom &amp; atual</p>'), 'Bom & atual');
  assert.equal(publicAddress('2002:7f00:1::'),false);
  assert.equal(publicAddress('2001:0000::1'),false);
  const result=await webSearch('notícias de hoje',async()=>({text:'<rss><item><title>Fonte simulada</title><link>https://example.com/news</link><pubDate>Wed, 04 Nov 2026 12:00:00 GMT</pubDate></item></rss>'}));
  assert.equal(result.sources[0].title,'Fonte simulada');
  await assert.rejects(webSearch('notícia',async()=>{throw new Error('rede indisponível');}),/rede/);
  let count=0;const forecast=await weather('São Paulo',async()=>({text:JSON.stringify(++count===1?{results:[{name:'São Paulo',latitude:-23,longitude:-46}]}:{current:{temperature_2m:25,time:'2026-11-04T12:00'},current_units:{temperature_2m:'°C'}})}));
  assert.equal(forecast.current.temperature_2m,25);
});
test('memory persists explicitly authorized notes and sanitizes secrets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'jarviz-memory-'));
  try {
    const memory = await createMemory(directory);
    await memory.remember('Meu editor preferido é VS Code.');
    await assert.rejects(memory.remember('OPENROUTER_API_KEY=sk-secret1234567890'));
    await memory.saveConversation('session1', [{ role: 'user', content: 'Olá' }, { role: 'assistant', content: 'Oi' }]);
    await memory.saveConversation('secret-message', [{role:'user',content:'Minha senha:\nExamplePassword42'}]);
    const {readFile}=await import('node:fs/promises');
    assert.ok(!(await readFile(path.join(directory,'memory.json'),'utf8')).includes('ExamplePassword42'));
    const restored = await createMemory(directory);
    assert.equal(restored.notes().length, 1);
    assert.equal(restored.conversation('session1').messages.length, 2);
    await restored.forget(restored.notes()[0].id);
    await restored.clearHistory();
    assert.equal(restored.notes().length, 0);
    assert.equal(restored.history().length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('OpenRouter fallback is bounded and never silently uses a paid model', async () => {
  let calls = 0;
  const request = async () => ++calls === 1 ? Response.json({ error: { message: 'limit' } }, { status: 429 }) : Response.json({ model: 'other/free:free', choices: [{ message: { content: 'OK' } }] });
  const result = await complete({ config: { key: 'test', model: 'openrouter/free', fallbackModel: 'other/free:free' }, messages: [{ role: 'user', content: 'Olá' }], tools: [], request });
  assert.equal(result.message.content, 'OK');
  assert.equal(calls, 2);
  await assert.rejects(complete({ config: { key: 'test', model: 'paid/model' }, messages: [], tools: [], request }), /pago/);
  calls = 0;
  await assert.rejects(complete({ config: { key: 'test', model: 'openrouter/free', fallbackModel: 'other:free' }, messages: [], tools: [], request: async () => { calls++; return Response.json({}, { status: 401 }); } }));
  assert.equal(calls, 1);
});
test('expired memory is removed from both active state and persisted storage on startup',async()=>{
 const {writeFile,readFile}=await import('node:fs/promises');const directory=await mkdtemp(path.join(tmpdir(),'jarviz-expire-'));
 try{await writeFile(path.join(directory,'memory.json'),JSON.stringify({notes:[{id:'expired',text:'Nota expirada',updated:0}],conversations:[]}));const memory=await createMemory(directory,{days:1});assert.equal(memory.notes().length,0);assert.ok(!(await readFile(path.join(directory,'memory.json'),'utf8')).includes('Nota expirada'));}finally{await rm(directory,{recursive:true,force:true});}
});
