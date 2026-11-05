import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeechController } from '../speech-controller.mjs';
test('speech cancellation prevents queued segments and stale completion callbacks',async()=>{
 let calls=0,done=0;let utterance;
 const speech={getVoices:()=>[],cancel:()=>{},speak:u=>{calls++;utterance=u;u.onstart?.();}};
 const controller=new SpeechController({speech,Utterance:class{},onDone:()=>done++});
 const pending=controller.speak('Uma frase longa. '.repeat(100),{full:true});
 assert.equal(calls,1);controller.cancel();await pending;
 assert.equal(done,0);assert.equal(calls,1);utterance.onend?.();assert.equal(done,0);
});
test('neural synthesis failure falls back once to functional browser queue',async()=>{
 let attempts=0,spoken=0,errors=0;
 const speech={getVoices:()=>[],cancel:()=>{},speak:u=>{spoken++;u.onstart?.();queueMicrotask(()=>u.onend?.());}};
 const controller=new SpeechController({speech,Utterance:class{},tts:async()=>{attempts++;throw new Error('Piper não instalado');},onError:()=>errors++});
 await controller.speak('Primeira frase. '.repeat(30),{engine:'piper',full:true});
 assert.equal(attempts,1);assert.ok(spoken>1);assert.equal(errors,1);
});
