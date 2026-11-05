import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {normalizeCatalog} from '../server/free-catalog.mjs';
const [file,commit]=process.argv.slice(2);
if(!file||!commit)throw new Error('Uso: node scripts/import-free-catalog.mjs caminho/data.json SHA-da-fonte');
const raw=await readFile(file,'utf8');if(raw.length>1024*1024)throw new Error('Catálogo excessivo.');
const catalog=normalizeCatalog(JSON.parse(raw),commit);
await mkdir(new URL('../data/',import.meta.url),{recursive:true});
await writeFile(new URL('../data/free-llm-catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(`Catálogo importado: ${catalog.providers.length} provedores, revisão ${commit}. Nenhuma configuração de API alterada.`);
