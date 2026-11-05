import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {fetchPublic} from './web.mjs';
function fakeTransport(responses,observations){return (url,options,callback)=>{
 const request=new EventEmitter();request.destroy=error=>request.emit('error',error);observations.push(url.href);
 options.lookup(url.hostname,{all:true},(error,records)=>{assert.equal(error,null);assert.equal(records[0].address,'93.184.216.34');});
 queueMicrotask(()=>{const input=responses.shift();const response=new EventEmitter();response.statusCode=input.status;response.headers={'content-type':'text/html',...input.headers};response.destroy=error=>response.emit('error',error);callback(response);queueMicrotask(()=>{response.emit('data',Buffer.from(input.body||''));response.emit('end');request.emit('close');});});return request;
};}
const resolve=async()=>[{address:'93.184.216.34',family:4}];
test('HTTPS transport pins validated DNS and rejects private redirects before connecting',async()=>{
 const calls=[];const get=fakeTransport([{status:302,headers:{location:'https://127.0.0.1/private'}}],calls);
 await assert.rejects(fetchPublic('https://example.com',{resolve,get}),/privado/);assert.equal(calls.length,1);
});
test('HTTPS transport follows revalidated public redirects and enforces download size',async()=>{
 const calls=[];const get=fakeTransport([{status:302,headers:{location:'https://other.example.org'}},{status:200,body:'página'}],calls);
 const response=await fetchPublic('https://example.com',{resolve,get});assert.equal(response.text,'página');assert.equal(calls.length,2);
 await assert.rejects(fetchPublic('https://example.com',{resolve,maxBytes:4,get:fakeTransport([{status:200,body:'excessive download'}],[])}),/tamanho/);
});
