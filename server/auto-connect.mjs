import {providerRequest} from './network.mjs';
import {complete} from './openrouter.mjs';
import {providerProfile} from './providers.mjs';
import {freeCatalog} from './free-catalog.mjs';
export function normalizeApiKey(key){if(typeof key!=='string')return '';return key.trim().replace(/^['"]|['"]$/g,'').replace(/^Bearer\s+/i,'').replace(/^['"]|['"]$/g,'').trim();}
export function detectProvider(key,selected='auto'){
 key=normalizeApiKey(key);
 const detected=key.startsWith('sk-or-')?'openrouter':key.startsWith('gsk_')?'groq':key.startsWith('AIza')?'gemini':null;
 if(selected!=='auto'){providerProfile(selected);if(detected&&detected!==selected)throw new Error('O prefixo da chave não corresponde ao provedor escolhido. Use detecção automática.');return selected;}
 if(!detected)throw new Error('Escolha o provedor desta chave: o formato não permite identificação segura.');return detected;
}
export async function autoConnect({key,provider='auto',billingAccepted=false,request=fetch}){
 key=normalizeApiKey(key);
 if(typeof key!=='string'||!key.trim()||key.length>500||/\s/.test(key))throw new Error('Cole somente a chave, sem espaços, aspas ou Bearer.');
 provider=detectProvider(key,provider);const profile=providerProfile(provider);
 if(provider!=='openrouter'&&!billingAccepted)throw new Error('Confirme o risco de cobrança para '+profile.name+'; a cota depende da sua conta.');
 let candidates=['openrouter/free'];
 if(provider!=='openrouter'){
  const response=await providerRequest(request,profile.base+'/models',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)},profile.name);
  if(!response.ok)throw new Error(`${profile.name} HTTP ${response.status}: não foi possível consultar os modelos desta chave.`);
  const data=await response.json();if(!Array.isArray(data.data))throw new Error('Catálogo ao vivo incompatível. Use o cadastro avançado.');
  const live=new Set(data.data.map(m=>String(m.id||'').replace(/^models\//,'')));
  const reference=(await freeCatalog()).providers.find(p=>p.name===profile.name);
  candidates=(reference?.models||[]).filter(m=>live.has(m.id)&&!/embedding|whisper|tts/i.test(m.id)).map(m=>m.id).slice(0,3);
  if(!candidates.length)throw new Error('Nenhum modelo da cota anunciada coincide com o catálogo ao vivo. Sua chave atual foi preservada; consulte os modelos no cadastro avançado.');
 }
 let failure;
 for(const model of candidates){
  try{const result=await complete({config:{provider,key,model,externalBillingAccepted:billingAccepted,requestDeadline:Date.now()+20000},messages:[{role:'user',content:'Responda apenas OK, sem usar ferramentas.'}],tools:[{type:'function',function:{name:'get_current_datetime',description:'Consulta hora quando solicitado.',parameters:{type:'object',properties:{}}}}],diagnostic:true,request});if(!result.message.content?.trim())throw new Error('O modelo não retornou texto no teste.');return{provider,model,verifiedAt:new Date().toISOString(),latencyMs:result.latencyMs};}
  catch(error){failure=error;if(/HTTP (401|402|403|429)/.test(error.message)||/rede|tempo/i.test(error.message))break;}
 }throw failure||new Error('Nenhum modelo respondeu. Configuração anterior preservada.');
}
