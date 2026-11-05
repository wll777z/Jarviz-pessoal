// Test-only controlled provider: never contacts OpenRouter or any voice service.
import { createJarviz } from '../server/server.mjs';
const app = await createJarviz({ dataDir: process.env.JARVIZ_TEST_DATA, modelsFetch:async()=>Response.json({data:[{id:'openrouter/free',supported_parameters:['tools'],architecture:{input_modalities:['text']}},{id:'test-vision:free',supported_parameters:['tools'],architecture:{input_modalities:['text','image']}}]}), provider: async ({ messages }) => {
  if (messages.at(-1).role === 'tool') return { content: 'Ação concluída no provedor de teste.' };
  if (messages.at(-1).content.includes('arquivo')) return { content: 'Posso ler o arquivo?', tool_calls: [{ id: 'fixture-read', type: 'function', function: { name: 'read_file', arguments: JSON.stringify({ path: 'notes.txt' }) } }] };
  await new Promise(resolve => setTimeout(resolve, 200));
  return { content: 'Olá. Esta resposta veio do provedor de teste.' };
}});
await app.listen(0);
console.log(app.server.address().port);
