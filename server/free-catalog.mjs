import {PROVIDERS} from './providers.mjs';
import {readFile} from 'node:fs/promises';
const source='https://github.com/mnfst/awesome-free-llm-apis';
export function normalizeCatalog(data,commit){
 if(!/^[a-f0-9]{40}$/.test(commit)||!Array.isArray(data.providers))throw new Error('Catálogo ou revisão inválidos.');
 const https=value=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('URL inválida no catálogo.');return String(value);};
 const text=value=>String(value||'').slice(0,2000);
 return{source,commit,lastUpdated:text(data.lastUpdated),notice:'Referência comunitária, não teste ao vivo. Gratuidade, cotas, privacidade e suporte às modalidades devem ser confirmados no provedor. A chave OpenRouter não serve em outros provedores.',providers:data.providers.map(provider=>({name:text(provider.name),url:https(provider.url),baseUrl:https(provider.baseUrl),description:text(provider.description),adapter:Object.keys(PROVIDERS).find(id=>PROVIDERS[id].name===provider.name)||null,integrated:Object.values(PROVIDERS).some(p=>p.name===provider.name),models:(provider.models||[]).map(model=>({id:text(model.id),name:text(model.name),modality:text(model.modality),context:text(model.context),rateLimit:text(model.rateLimit),audio:/audio/i.test(model.modality||''),vision:/image|vision/i.test(model.modality||'')}))}))};
}
export async function freeCatalog(){return JSON.parse(await readFile(new URL('../data/free-llm-catalog.json',import.meta.url),'utf8'));}
