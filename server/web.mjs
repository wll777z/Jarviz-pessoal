import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP, BlockList } from 'node:net';
const blocked = new BlockList();
for (const [ip, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['192.88.99.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(ip, bits, 'ipv4');
const global6=new BlockList();global6.addSubnet('2000::',3,'ipv6');
const special6=new BlockList();for(const [ip,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])special6.addSubnet(ip,bits,'ipv6');
export function publicAddress(address) {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  if (isIP(address) === 6) return global6.check(address,'ipv6') && !special6.check(address,'ipv6') && !address.toLowerCase().startsWith('2001:db8:');
  return false;
}
export async function assertPublicURL(value, resolve = host => lookup(host, { all: true, verbatim: true })) {
  let url; try { url = new URL(value); } catch { throw new Error('URL inválida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Use somente HTTPS público, sem credenciais ou portas alternativas.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host.length > 253 || /(?:^|\.)(localhost|local|internal|test|onion)$/.test(host) || host.endsWith('.')) throw new Error('Destino local ou inválido bloqueado.');
  let addresses;
  if(isIP(host))addresses=[{address:host,family:isIP(host)}];
  else{let timer;try{addresses=await Promise.race([resolve(host),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo de resolução DNS excedido.')),5000);})]);}finally{clearTimeout(timer);}}
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Acesso a endereço privado/especial bloqueado.');
  return { url, addresses };
}
function directHTTPSGet(...args) {
  if(process.env.HTTPS_PROXY || process.env.https_proxy)throw new Error('A pesquisa web deste adaptador requer conexão HTTPS direta autorizada; proxy configurado não é suportado. A política de rede não será contornada.');
  return https.get(...args);
}
export async function fetchPublic(value, { redirects = 3, maxBytes = 1024 * 1024, timeout = 10000, deadline = Date.now()+12000, resolve, get = directHTTPSGet } = {}) {
  if(Date.now()>=deadline)throw new Error('Tempo total da consulta web excedido.');
  const { url, addresses } = await assertPublicURL(value,resolve);
  const selected = addresses[0];
  const response = await new Promise((resolve, reject) => {
    const request = get(url, { family: selected.family, lookup: (_host, opts, callback) => opts?.all ? callback(null, [selected]) : callback(null, selected.address, selected.family), headers: { 'User-Agent': 'JarvizPersonal/3.0 (user requested research)', Accept: 'text/html,application/rss+xml,application/json,text/plain' } }, res => {
      const chunks = []; let bytes = 0;
      res.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) { res.destroy(new Error('Resposta web excede o limite de tamanho.')); return; } chunks.push(chunk); });
      res.on('error', reject); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    const timer = setTimeout(() => request.destroy(new Error('Tempo de consulta web excedido.')), Math.max(1,Math.min(timeout,deadline-Date.now())));
    request.on('error', reject); request.on('close', () => clearTimeout(timer));
  });
  if ([301,302,303,307,308].includes(response.status)) {
    if (!redirects || !response.headers.location) throw new Error('Redirecionamento web inválido ou excessivo.');
    return fetchPublic(new URL(response.headers.location, url).href, { redirects: redirects - 1, maxBytes, timeout, deadline, resolve, get });
  }
  if (response.status !== 200) throw new Error(`Fonte web retornou HTTP ${response.status}.`);
  if (!/text\/|xml|json/i.test(response.headers['content-type'] || '')) throw new Error('A fonte não retornou texto suportado.');
  return { ...response, url: url.href };
}
function decode(value) { return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, key) => ({ amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ' })[key]); }
export function extractText(html) { return decode(String(html).replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim().slice(0, 18000); }
export function parseSearchRSS(xml) {
  return [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 8).map(match => {
    const tag = name => decode(match[1].match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '').trim();
    const date = new Date(tag('pubDate'));
    return { title: extractText(tag('title')), url: tag('link'), published: Number.isNaN(date.getTime()) ? null : date.toISOString(), snippet: extractText(tag('description')).slice(0, 600) };
  }).filter(result => { try { const u = new URL(result.url); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } });
}
const searchCache = new Map();
export async function webSearch(query, request = fetchPublic) {
  if (typeof query !== 'string' || !query.trim() || query.length > 400) throw new Error('Pesquisa deve ter de 1 a 400 caracteres.');
  const key = query.trim(); const cached = searchCache.get(key);
  if (request === fetchPublic && cached && Date.now() - cached.time < 120000) return cached.result;
  const news = /not[ií]cia|hoje|atual|news|recent/i.test(query);
  const url = news ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419` : `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
  const response = await request(url); const sources = parseSearchRSS(response.text);
  if (!sources.length) throw new Error('A fonte RSS não retornou resultados utilizáveis. Tente outra consulta ou forneça uma URL.');
  const result = { query, fetchedAt: new Date().toISOString(), provider: news ? 'Google News RSS' : 'Bing RSS', sources, notice: 'Resultados de fonte RSS pública; datas ausentes não foram inferidas. Leia a fonte antes de confirmar fatos.' };
  if (request === fetchPublic) { if (searchCache.size > 30) searchCache.delete(searchCache.keys().next().value); searchCache.set(key, { time: Date.now(), result }); }
  return result;
}
export async function weather(city, request = fetchPublic) {
  if (typeof city !== 'string' || !city.trim() || city.length > 150) throw new Error('Cidade inválida.');
  const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const place = JSON.parse((await request(geoURL)).text).results?.[0];
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) throw new Error('Cidade não encontrada.');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
  const data = JSON.parse((await request(url)).text);
  return { city: place.name, current: data.current, units: data.current_units, timezone: data.timezone, sources: [{ title: 'Open-Meteo', url: 'https://open-meteo.com/', published: data.current?.time || null }] };
}
