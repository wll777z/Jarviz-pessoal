import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {complete,modelCapabilities} from './openrouter.mjs';
import {autoConnect} from './auto-connect.mjs';
const run=promisify(execFile);
const config={key:'sk-or-secret-never-show',model:'openrouter/free',fallbackModel:'other:free'};
test('transport errors identify causes without exposing secrets or retrying same host',async()=>{
 for(const [code,label] of [['ENOTFOUND',/DNS/],['ECONNREFUSED',/recusada/],['UNABLE_TO_VERIFY_LEAF_SIGNATURE',/certificado/],['UND_ERR_CONNECT_TIMEOUT',/tempo/i],['ECONNRESET',/interrompida/]]){
  let calls=0;
  await assert.rejects(complete({config,messages:[],request:async()=>{calls++;throw new TypeError('fetch failed '+config.key,{cause:Object.assign(new Error('private proxy password'),{code})});}}),error=>label.test(error.message)&&!error.message.includes(config.key)&&!error.message.includes('password'));
  assert.equal(calls,1);
 }
});
test('Windows and npm launchers enable trusted proxy transport; real fetch reaches a local proxy',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));
 assert.equal(pkg.engines.node,'>=24.5.0');
 const cmd=await readFile(new URL('../Iniciar-Jarviz.cmd',import.meta.url),'utf8');
 const args=pkg.scripts.start.split(' ').slice(1,-1);
 for(const flag of ['--use-env-proxy','--use-system-ca']){assert.ok(args.includes(flag));assert.ok(cmd.includes(flag));}
 let tunnels=0;
 const proxy=http.createServer();
 proxy.on('connect',(req,socket)=>{
  tunnels++;assert.equal(req.url,'jarviz-transport.invalid:80');assert.equal(req.headers.authorization,undefined);
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  socket.once('data',data=>{assert.match(data.toString(),/^GET \/probe HTTP/);socket.end('HTTP/1.1 200 OK\r\nContent-Length: 8\r\nConnection: close\r\n\r\nproxy-ok');});
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 try{
  const address='http://127.0.0.1:'+proxy.address().port;
  const {stdout}=await run(process.execPath,[...args,'-e',"fetch('http://jarviz-transport.invalid/probe',{signal:AbortSignal.timeout(3000)}).then(r=>r.text()).then(console.log)"],{env:{...process.env,HTTP_PROXY:address,http_proxy:address,HTTPS_PROXY:address,https_proxy:address,NO_PROXY:'',no_proxy:''},timeout:6000});
  assert.equal(stdout.trim(),'proxy-ok');assert.equal(tunnels,1);
 }finally{await new Promise(resolve=>proxy.close(resolve));}
});

test('nested DNS causes are diagnosed in both model lookup and automatic registration',async()=>{
 const request=async()=>{throw new TypeError('fetch failed',{cause:new AggregateError([Object.assign(new Error('private'),{code:'ENOTFOUND'})])});};
 await assert.rejects(modelCapabilities('gsk_private',request,'groq'),/DNS/);
 await assert.rejects(autoConnect({key:'gsk_private',billingAccepted:true,request}),/DNS/);
});
test('timeout while receiving response body remains a network diagnosis',async()=>{
 await assert.rejects(complete({config,messages:[],request:async()=>({ok:true,json:async()=>{throw new DOMException('private','TimeoutError');}})}),/Tempo de conexão/);
});
