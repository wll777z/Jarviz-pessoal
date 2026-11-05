import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createJarviz } from './server.mjs';
async function connect(app){await app.listen(0);const base=`http://127.0.0.1:${app.server.address().port}`;const headers={'Content-Type':'application/json','X-Jarviz-Client':'1'};headers['X-Jarviz-Token']=(await(await fetch(base+'/api/session',{headers})).json()).token;return async(route,data)=>{const response=await fetch(base+'/api/'+route,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)});return{status:response.status,...await response.json()};};}
test('history and explicit memory persist across restart, can be loaded and erased',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-persist-'));let app;
 try{
  app=await createJarviz({dataDir:directory,provider:async()=>({content:'Resposta persistida.'})});let api=await connect(app);
  assert.equal((await api('config',{root:directory,model:'openrouter/free',key:'synthetic',memoryEnabled:true})).status,200);
  assert.equal((await api('memory',{action:'remember',text:'Prefiro VS Code.'})).status,200);
  await api('chat',{message:'Meu projeto de estudo'});await app.close();
  app=await createJarviz({dataDir:directory,provider:async()=>({content:'OK'})});api=await connect(app);
  const history=await api('history');assert.equal(history.history.length,1);assert.equal((await api('memory')).notes.length,1);
  const loaded=await api('history',{id:history.history[0].id});assert.equal(loaded.messages[0].content,'Meu projeto de estudo');
  await api('memory',{action:'clear'});assert.equal((await api('history')).history.length,0);assert.equal((await api('memory')).notes.length,0);
 }finally{await app?.close();await rm(directory,{recursive:true,force:true});}
});
test('screen image requires explicit consent and verified visual capability; no implicit persistence',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-vision-'));let calls=0;let vision=false;let sent;
 const app=await createJarviz({dataDir:directory,provider:async data=>{calls++;sent=data;return{content:'Descrição de teste da imagem autorizada.'};},modelsFetch:async()=>Response.json({data:[{id:'visual:free',supported_parameters:['tools'],architecture:{input_modalities:vision?['text','image']:['text']}}]})});
 try{
  const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',visionModel:'visual:free',key:'synthetic'});
  const image='data:image/jpeg;base64,'+(await readFile(new URL('../tests/fixtures/screen-test.jpg',import.meta.url))).toString('base64');
  assert.equal((await api('chat',{message:'O que aparece?',image})).status,400);assert.equal(calls,0);
  assert.equal((await api('chat',{message:'O que aparece?',image,imageConsent:true})).status,400);assert.equal(calls,0);
  vision=true;const result=await api('chat',{message:'O que aparece?',image,imageConsent:true});assert.equal(result.status,200);assert.equal(calls,1);assert.ok(Array.isArray(sent.messages.at(-1).content));
  await api('chat',{message:'Explique a resposta anterior'});assert.ok(!JSON.stringify(sent.messages).includes('data:image/'));
  assert.deepEqual((await api('history')).history,[]);
 }finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('per-turn tool budget blocks excessive tool calls before execution',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-budget-'));
 const app=await createJarviz({dataDir:directory,provider:async()=>({tool_calls:[1,2].map(id=>({id:String(id),function:{name:'get_system_status',arguments:'{}'}}))})});
 try{const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',key:'synthetic',maxToolSteps:1});const result=await api('chat',{message:'Status'});assert.equal(result.status,400);assert.match(result.error,/Limite/);}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('safe system diagnostics and bounded file discovery retain credential protection',async()=>{
 const {executeTool}=await import('./tools.mjs');const {writeFile,mkdir}=await import('node:fs/promises');
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-diagnostics-'));
 try{await writeFile(path.join(directory,'meu-projeto.txt'),'teste');await mkdir(path.join(directory,'.ssh'));await writeFile(path.join(directory,'.ssh','projeto-secreto'),'secret');const config={root:directory,dataDir:path.join(directory,'private')};
  const found=JSON.parse(await executeTool('search_files',{query:'projeto'},config));assert.deepEqual(found.results,['meu-projeto.txt']);
  const status=JSON.parse(await executeTool('get_system_status',{},config));assert.ok(status.memoryTotal>0);assert.ok(status.diskTotal>0);assert.ok(status.logicalCPUs>0);
  if(process.platform!=='win32')await assert.rejects(executeTool('list_processes',{},config),/Windows/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('automatic datetime tool continues to a textual answer without an approval or replay',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-clock-'));let calls=0;
 const app=await createJarviz({dataDir:directory,provider:async({messages})=>{calls++;return messages.at(-1).role==='tool'?{content:'Data/hora consultada.'}:{tool_calls:[{id:'clock',function:{name:'get_current_datetime',arguments:'{}'}}]};}});
 try{const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',key:'synthetic'});const response=await api('chat',{message:'Que horas são?'});assert.equal(response.status,200);assert.equal(response.reply,'Data/hora consultada.');assert.equal(response.pending,null);assert.equal(calls,2);}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('forgetting the last note also removes it from the next provider system prompt',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-forget-'));let sent;
 const app=await createJarviz({dataDir:directory,provider:async data=>{sent=data;return{content:'OK'};}});
 try{const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',key:'synthetic',memoryEnabled:true});const {note}=await api('memory',{action:'remember',text:'Minha cor preferida é Cobalto.'});await api('chat',{message:'Olá'});assert.ok(sent.messages[0].content.includes('Cobalto'));await api('memory',{action:'forget',id:note.id});await api('chat',{message:'Outra pergunta'});assert.ok(!sent.messages[0].content.includes('Cobalto'));}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('an image is never resent after an approval response fails and a new message has no consent',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-screen-once-'));let stage=0,sent;
 const app=await createJarviz({dataDir:directory,provider:async data=>{sent=data;if(stage++===0)return{tool_calls:[{id:'image-action',function:{name:'get_system_status',arguments:'{}'}}]};if(stage===2)throw new Error('Provedor temporariamente indisponível');return{content:'OK'};},modelsFetch:async()=>Response.json({data:[{id:'visual:free',architecture:{input_modalities:['image']}}]})});
 try{const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',visionModel:'visual:free',key:'synthetic'});const image='data:image/jpeg;base64,'+(await readFile(new URL('../tests/fixtures/screen-test.jpg',import.meta.url))).toString('base64');const first=await api('chat',{message:'Analise a tela',image,imageConsent:true});assert.equal(first.status,200);assert.equal((await api('approve',{id:first.pending.id,approved:false})).status,502);await api('chat',{message:'Nova pergunta sem imagem'});assert.ok(!JSON.stringify(sent.messages).includes('data:image/'));}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('audio attachment requires consent and uses the verified audio model without resending audio',async()=>{
 const {encodeWav}=await import('../audio-input.mjs');const directory=await mkdtemp(path.join(tmpdir(),'jarviz-audio-'));let sent,calls=0;
 const app=await createJarviz({dataDir:directory,provider:async data=>{sent=data;calls++;return{content:'Áudio recebido no teste.'};},modelsFetch:async()=>Response.json({data:[{id:'audio:free',architecture:{input_modalities:['audio']}}]})});
 try{const api=await connect(app);await api('config',{root:directory,model:'openrouter/free',audioModel:'audio:free',key:'synthetic'});const audio='data:audio/wav;base64,'+Buffer.from(encodeWav(new Float32Array(240),24000)).toString('base64');assert.equal((await api('chat',{message:'Transcreva',audio})).status,400);assert.equal(calls,0);assert.equal((await api('chat',{message:'Transcreva',audio,audioConsent:true})).status,200);assert.equal(sent.model,'audio:free');assert.equal(sent.messages.at(-1).content[1].type,'input_audio');await api('chat',{message:'Outra pergunta'});assert.ok(!JSON.stringify(sent.messages).includes('input_audio'));}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
