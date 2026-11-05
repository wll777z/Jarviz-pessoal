export const PROVIDERS={
 openrouter:{name:'OpenRouter',base:'https://openrouter.ai/api/v1'},
 groq:{name:'Groq',base:'https://api.groq.com/openai/v1'},
 gemini:{name:'Google Gemini',base:'https://generativelanguage.googleapis.com/v1beta/openai'},
 mistral:{name:'Mistral AI',base:'https://api.mistral.ai/v1'},
};
export function providerProfile(id='openrouter'){const profile=Object.hasOwn(PROVIDERS,id)?PROVIDERS[id]:null;if(!profile)throw new Error('Provedor não suportado. Selecione um adaptador disponível.');return profile;}
export function providerKey(config){return (config.provider||'openrouter')==='openrouter'?config.key:config.providerKeys?.[config.provider]||'';}
