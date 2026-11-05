export function encodeWav(samples,rate){
 if(samples.length>rate*60)throw new Error('Áudio limitado a 60 segundos.');
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);const word=(offset,text)=>[...text].forEach((char,i)=>view.setUint8(offset+i,char.charCodeAt(0)));
 word(0,'RIFF');view.setUint32(4,36+samples.length*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,samples.length*2,true);samples.forEach((sample,i)=>view.setInt16(44+i*2,Math.max(-1,Math.min(1,sample))*32767,true));return buffer;
}
export async function audioToWav(blob){
 if(blob.size>8*1024*1024)throw new Error('Arquivo de áudio excede 8 MiB.');
 const context=new AudioContext();try{const audio=await context.decodeAudioData(await blob.arrayBuffer());if(audio.duration>60)throw new Error('Áudio limitado a 60 segundos.');const offline=new OfflineAudioContext(1,Math.ceil(audio.duration*24000),24000);const source=offline.createBufferSource();source.buffer=audio;source.connect(offline.destination);source.start();const mono=await offline.startRendering();return new Blob([encodeWav(mono.getChannelData(0),24000)],{type:'audio/wav'});}finally{await context.close();}
}
