import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{createJarviz}from'./server.mjs';import{providerProfile}from'./providers.mjs';
import {complete} from './openrouter.mjs';
test('a community free-tier listing never substitutes for explicit external billing consent',async()=>{
 let calls=0;const request=async()=>{calls++;return Response.json({choices:[{message:{content:'OK'}}]});};
 await assert.rejects(complete({config:{provider:'gemini',model:'gemini-2.5-flash',key:'test'},messages:[],request}),/cobrança/);
 assert.equal(calls,0);
 const result=await complete({config:{provider:'gemini',model:'gemini-2.5-flash',key:'test',externalBillingAccepted:true},messages:[],request});assert.equal(result.message.content,'OK');assert.equal(calls,1);
});
test('saving voice or memory settings preserves active conversation and existing provider keys',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-settings-'));let sent;
 const app=await createJarviz({dataDir:directory,provider:async data=>{sent=data;return{content:'OK'};}});await app.listen(0);const base=`http://127.0.0.1:${app.server.address().port}`;const headers={'Content-Type':'application/json','X-Jarviz-Client':'1'};const post=(route,data)=>fetch(base+'/api/'+route,{method:'POST',headers,body:JSON.stringify(data)});
 try{headers['X-Jarviz-Token']=(await(await fetch(base+'/api/session',{headers})).json()).token;await post('config',{root:directory,model:'openrouter/free',key:'test-key'});await post('chat',{message:'Minha pergunta anterior'});const saved=await post('config',{root:directory,model:'openrouter/free',ttsEngine:'browser'});assert.equal(saved.status,200);await post('chat',{message:'Continue'});assert.ok(sent.messages.some(m=>m.content==='Minha pergunta anterior'));assert.equal((await(await fetch(base+'/api/config',{headers})).json()).configured,true);}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('provider credentials are isolated and keys never appear in public configuration',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-provider-'));const calls=[];const app=await createJarviz({dataDir:directory,openrouterFetch:async(url,options)=>{calls.push({url,key:options.headers.Authorization,body:JSON.parse(options.body)});return Response.json({choices:[{message:{content:'OK'}}]});}});await app.listen(0);const base=`http://127.0.0.1:${app.server.address().port}`;const headers={'Content-Type':'application/json','X-Jarviz-Client':'1'};const post=(route,data)=>fetch(base+'/api/'+route,{method:'POST',headers,body:JSON.stringify(data)});
 try{headers['X-Jarviz-Token']=(await(await fetch(base+'/api/session',{headers})).json()).token;
 await post('config',{key:'or-test-key',model:'openrouter/free',root:directory});
 assert.equal((await post('config',{provider:'groq',model:'openai/gpt-oss-120b',root:directory})).status,400);
 const saved=await post('config',{provider:'groq',acknowledgeExternalBilling:true,key:'groq-test-key',model:'openai/gpt-oss-120b',root:directory});assert.equal(saved.status,200);const publicText=await saved.text();assert.ok(!publicText.includes('groq-test-key')&&!publicText.includes('or-test-key')&&!publicText.includes('providerKeys'));
 await post('chat',{message:'Olá'});assert.equal(calls.at(-1).url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(calls.at(-1).key,'Bearer groq-test-key');assert.equal(calls.at(-1).body.provider,undefined);
 await post('config',{provider:'openrouter',model:'openrouter/free',root:directory});await post('chat',{message:'Voltei'});assert.equal(calls.at(-1).key,'Bearer or-test-key');assert.equal(calls.at(-1).url,'https://openrouter.ai/api/v1/chat/completions');
 assert.throws(()=>providerProfile('https://evil.example'),/não suportado/);
 }finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
