// Report only known codes: raw fetch errors can contain proxy URLs and credentials.
export function networkFailure(error, provider) {
 const codes=new Set();const seen=new Set();
 function visit(value){if(!value||typeof value!=='object'||seen.has(value)||seen.size>=20)return;seen.add(value);if(typeof value.code==='string')codes.add(value.code);if(value.name==='TimeoutError'||value.name==='AbortError')codes.add('TIMEOUT');visit(value.cause);if(Array.isArray(value.errors))value.errors.slice(0,10).forEach(visit);}
 visit(error);
 const matches=list=>list.some(code=>codes.has(code));
 let detail;
 if(matches(['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID']))detail='Certificado TLS recusado. Confira data/hora do Windows e o certificado do antivírus/proxy. Atualize o Node 24 e reinicie por Iniciar-Jarviz.cmd; a verificação TLS permanece ativa.';
 else if(matches(['ENOTFOUND','EAI_AGAIN']))detail='DNS não resolveu o endereço do serviço ou do proxy. Confira a conexão e o DNS do Windows.';
 else if(matches(['ECONNREFUSED']))detail='Conexão recusada pelo serviço ou proxy. Confira se o proxy configurado está disponível e se o firewall permite o Node.';
 else if(matches(['UND_ERR_PRX_TLS','UND_ERR_PRX_INVALID_AUTH','ERR_PROXY_INVALID_CONFIG','UND_ERR_PRX_AUTH']))detail='Proxy recusou a conexão ou exige autenticação. Confira HTTP_PROXY/HTTPS_PROXY no ambiente do Windows, sem compartilhar credenciais.';
 else if(matches(['TIMEOUT','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT']))detail='Tempo de conexão/resposta excedido. Confira firewall, proxy e acesso do Node à internet. VPN do Opera protege apenas o navegador, não o servidor Jarviz.';
 else if(matches(['ECONNRESET','UND_ERR_SOCKET','EPIPE']))detail='Conexão interrompida pelo serviço, firewall ou proxy. Aguarde e teste novamente.';
 else detail='Não foi possível estabelecer a conexão. Reinicie por Iniciar-Jarviz.cmd e confira o acesso do Node à internet e o proxy do Windows. VPN do Opera não se aplica ao servidor Jarviz.';
 return Object.assign(new Error('Falha de rede em '+provider+'. '+detail),{code:'JARVIZ_NETWORK'});
}
export async function providerRequest(request, url, options, provider){
 try{return await request(url,options);}catch(error){throw networkFailure(error,provider);}
}
