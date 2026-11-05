import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const jobs = new Map();
export async function synthesizePiper(text, config, signal) {
  if(signal?.aborted)throw new Error('Síntese Piper cancelada.');
  if (!config.ttsExecutable || !config.ttsModel) throw new Error('Piper não configurado. Informe executável e modelo locais; nenhum modelo é baixado automaticamente.');
  if (typeof text !== 'string' || !text.trim() || text.length > 600) throw new Error('Segmento de voz deve ter até 600 caracteres.');
  if (!path.isAbsolute(config.ttsExecutable) || !path.isAbsolute(config.ttsModel)) throw new Error('Use caminhos absolutos para o executável e o modelo Piper.');
  const model = await stat(config.ttsModel); await stat(config.ttsModel + '.json'); await stat(config.ttsExecutable);
  const rate = Math.max(.6, Math.min(1.5, Number(config.ttsRate) || 1.15));
  const key = createHash('sha256').update(JSON.stringify([text,config.ttsModel,model.mtimeMs,rate])).digest('hex');
  const cache = path.join(config.dataDir,'tts-cache'); await mkdir(cache,{recursive:true,mode:0o700});
  const file = path.join(cache,key+'.wav');
  try { const info = await stat(file); if (info.size <= 8*1024*1024) return await readFile(file); } catch {}
  if (jobs.has(key)) throw new Error('Este segmento já está sendo sintetizado. Tente novamente.');
  const temporary = path.join(cache,randomUUID()+'.wav');
  jobs.set(key,true);
  try {
    if(signal?.aborted)throw new Error('Síntese Piper cancelada.');
    await new Promise((resolve,reject) => {
      const child = spawn(config.ttsExecutable,['--model',config.ttsModel,'--output_file',temporary,'--length_scale',String(1/rate)],{windowsHide:true,stdio:['pipe','ignore','pipe']});
      let diagnostics=''; child.stderr.on('data',chunk => diagnostics = (diagnostics+chunk.toString()).slice(-1000));
      const stop = () => { child.kill(); reject(new Error('Síntese Piper cancelada.')); };
      const timer = setTimeout(() => { child.kill(); reject(new Error('Piper excedeu 30 segundos.')); },30000);
      const clean = () => { clearTimeout(timer); signal?.removeEventListener('abort',stop); };
      child.on('error',error => {clean();reject(new Error('Não foi possível iniciar Piper: '+error.code));});
      child.stdin.on('error',()=>{}); child.stdin.end(text+'\n');
      child.on('exit',code => {clean();code===0 ? resolve() : reject(new Error('Piper falhou. Confira modelo, configuração e compatibilidade do executável.'));});
      if(signal?.aborted){stop();clean();return;}signal?.addEventListener('abort',stop,{once:true});
    });
    const info = await stat(temporary); if (info.size > 8*1024*1024) throw new Error('Áudio Piper excessivo.');
    const audio = await readFile(temporary); if (audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE') throw new Error('Piper não gerou WAV válido.');
    const { rename } = await import('node:fs/promises'); await rename(temporary,file);
    const entries = await Promise.all((await readdir(cache)).filter(n=>n.endsWith('.wav')).map(async name=>({name,...await stat(path.join(cache,name))})));
    let total = entries.reduce((sum,e)=>sum+e.size,0);
    for (const entry of entries.sort((a,b)=>a.mtimeMs-b.mtimeMs)) if (total > 50*1024*1024) { await unlink(path.join(cache,entry.name)); total-=entry.size; }
    return audio;
  } finally { jobs.delete(key); await unlink(temporary).catch(()=>{}); }
}
