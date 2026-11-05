import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {synthesizePiper} from './tts.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('Piper adapter runs a simulated CLI and caches its WAV without a model download',{skip:process.platform==='win32'},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-piper-'));const executable=path.join(directory,'fake-piper.mjs');const model=path.join(directory,'test.onnx');
 try{
  await writeFile(model,'synthetic');await writeFile(model+'.json','{}');
  await writeFile(executable,`#!${process.execPath}\nimport {writeFileSync,appendFileSync} from 'node:fs';\nconst target=process.argv[process.argv.indexOf('--output_file')+1];const wav=Buffer.alloc(46);wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);process.stdin.resume();process.stdin.on('end',()=>{appendFileSync(${JSON.stringify(path.join(directory,'calls'))},'1');writeFileSync(target,wav);});\n`);
  await chmod(executable,0o700);const config={dataDir:directory,ttsExecutable:executable,ttsModel:model,ttsRate:1.15};
  const first=await synthesizePiper('Teste de áudio simulado',config);const second=await synthesizePiper('Teste de áudio simulado',config);
  assert.deepEqual(first,second);assert.equal(await readFile(path.join(directory,'calls'),'utf8'),'1');
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('already-aborted Piper requests do not spawn an invalid executable or emit uncaught errors',{skip:process.platform==='win32'},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'jarviz-piper-abort-'));const executable=path.join(directory,'not-executable');const model=path.join(directory,'test.onnx');
 try{await writeFile(executable,'not executable',{mode:0o600});await writeFile(model,'synthetic');await writeFile(model+'.json','{}');const moduleURL=new URL('./tts.mjs',import.meta.url).href;const script=`import {synthesizePiper} from ${JSON.stringify(moduleURL)};process.on('uncaughtException',()=>process.exit(55));const controller=new AbortController();controller.abort();await synthesizePiper('Teste',${JSON.stringify({dataDir:directory,ttsExecutable:executable,ttsModel:model})},controller.signal).catch(()=>{});await new Promise(resolve=>setTimeout(resolve,100));`;await promisify(execFile)(process.execPath,['--input-type=module','-e',script],{timeout:5000});}finally{await rm(directory,{recursive:true,force:true});}
});
