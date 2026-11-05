import {networkFailure} from '../server/network.mjs';
console.log('Jarviz — diagnóstico de conexão (sem chave e sem gerar respostas)');
console.log('Node:',process.version,'| Sistema:',process.platform);
console.log('Proxy de ambiente:',Object.keys(process.env).some(k=>/^(https?|all)_proxy$/i.test(k)&&process.env[k])?'configurado':'não configurado');
console.log('Certificado adicional:',process.env.NODE_EXTRA_CA_CERTS?'configurado':'não configurado');
const started=Date.now();
try{
 const response=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000),redirect:'error'});
 console.log('OpenRouter HTTP',response.status,'|',Date.now()-started,'ms');
 await response.body?.cancel();
 if(response.ok)console.log('Conexão TLS/HTTP funcionando. Se o cadastro falhar, copie o erro do cadastro: autenticação, cota e modelo são testes separados.');
 else{console.log('O serviço ou proxy respondeu, mas recusou a consulta pública. Confira restrições da rede/serviço.');process.exitCode=1;}
}catch(error){console.log(networkFailure(error,'OpenRouter').message);process.exitCode=1;}
