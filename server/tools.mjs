import { realpath, readdir, readFile, writeFile, mkdir, stat, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const text = description => ({ type: 'string', description });
const definitions = [
  ['web_search', 'Pesquisa fontes públicas atuais com links e datas. Use para fatos recentes e notícias.', { query:text('Consulta pública, sem dados privados, até 400 caracteres.') }],
  ['extract_webpage_text', 'Lê texto de página HTTPS pública com proteção de rede e limites.', { url:text('URL HTTPS pública.') }],
  ['open_webpage', 'Abre página HTTPS pública no navegador Windows mediante aprovação.', { url:text('URL HTTPS pública.') }],
  ['get_current_datetime', 'Obtém data/hora atual e fuso desta máquina sem acessar dados privados.', {}],
  ['get_weather', 'Consulta clima atual por cidade via Open-Meteo, sem chave.', { city:text('Cidade e país, se necessário.') }],
  ['get_system_status', 'Consulta memória, CPU, sistema e espaço em disco. Somente leitura.', {}],
  ['list_processes', 'Lista processos Windows por consulta fixa, sem comandos arbitrários.', {}],
  ['get_network_info', 'Consulta interfaces de rede locais. Esses dados podem ser privados.', {}],
  ['search_files', 'Localiza nomes de arquivos na pasta autorizada, sem seguir links ou ler conteúdo. Busca limitada.', { query:text('Trecho do nome do arquivo.') }],
  ['remember_memory', 'Guarda uma informação que o usuário explicitamente pediu para lembrar; não use para senhas.', { text:text('Informação autorizada.') }],
  ['recall_memory', 'Consulta notas de memória autorizadas; só disponível com memória habilitada.', {}],
  ['forget_memory', 'Esquece uma nota mediante solicitação do usuário.', { id:text('ID da nota a esquecer.') }],
  ['list_files', 'Lista até 200 itens de uma pasta autorizada.', { path: text('Pasta relativa à raiz ou caminho absoluto dentro dela.') }],
  ['read_file', 'Lê arquivo de texto UTF-8 de até 64 KiB. O resultado é enviado ao provedor de IA após aprovação.', { path: text('Arquivo de texto.') }],
  ['write_file', 'Cria novo arquivo UTF-8, sem sobrescrever arquivos existentes. A pasta pai deve existir.', { path: text('Novo arquivo.'), content: text('Conteúdo completo, até 64 KiB.') }],
  ['create_directory', 'Cria uma pasta dentro de uma pasta pai existente.', { path: text('Nova pasta.') }],
  ['move_file', 'Move um arquivo dentro da raiz sem substituir arquivos existentes.', { path: text('Origem.'), destination: text('Destino.') }],
  ['delete_file', 'Exclui permanentemente um único arquivo. Não remove pastas.', { path: text('Arquivo a excluir.') }],
  ['open_path', 'Abre arquivo ou executável Windows associado. Pode iniciar código; requer confirmação.', { path: text('Caminho dentro da raiz autorizada.') }],
  ['run_command', 'Executa PowerShell com permissões do usuário Windows, fora do limite da pasta, somente se habilitado. Espera até 20 segundos; programas iniciados podem continuar rodando após esse prazo. Não use comandos demorados ou em background sem solicitação explícita.', { command: text('Script PowerShell completo, visível na confirmação.') }],
];
export const tools = definitions.map(([name, description, properties]) => ({ type: 'function', function: { name, description, parameters: object(properties) } }));
export function validateTool(name, args) {
  const definition = definitions.find(x => x[0] === name);
  if (!definition || !args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Ferramenta inválida.');
  if (Object.keys(args).some(key => !(key in definition[2]))) throw new Error('Argumentos desconhecidos.');
  for (const key of Object.keys(definition[2])) if (typeof args[key] !== 'string' || args[key].includes('\0') || args[key].length > 65536) throw new Error('Argumento inválido: ' + key);
  if (name === 'run_command' && (!args.command.trim() || args.command.length > 8000)) throw new Error('Comando vazio ou muito longo.');
}
function inside(root, target) { const rel = path.relative(root, target); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); }
async function safePath(input, config, create = false) {
  const root = await realpath(config.root);
  const target = path.resolve(root, input || '.');
  if (!inside(root, target)) throw new Error('Caminho fora da pasta autorizada.');
  const resolved = create ? path.join(await realpath(path.dirname(target)), path.basename(target)) : await realpath(target);
  if (!inside(root, resolved)) throw new Error('Link aponta para fora da pasta autorizada.');
  const parts = resolved.split(path.sep);
  if (parts.some(p => /^\.env(?:\.|$)|^\.(?:ssh|aws|azure|git|gnupg|jarviz|codex|npmrc|pypirc|netrc|git-credentials)$/i.test(p)) || inside(path.resolve(config.dataDir), resolved)) throw new Error('Arquivo de credenciais/configuração protegido.');
  return resolved;
}
export async function executeTool(name, args, config) {
  validateTool(name, args);
  if (name === 'get_current_datetime') return JSON.stringify({ iso:new Date().toISOString(), timezone:Intl.DateTimeFormat().resolvedOptions().timeZone, local:new Date().toLocaleString('pt-BR') });
  if (['web_search','extract_webpage_text','open_webpage','get_weather'].includes(name)) {
    if (!config.webEnabled) throw new Error('Pesquisa web desabilitada nas configurações.');
    const web = await import('./web.mjs');
    if (name === 'web_search') return JSON.stringify(await web.webSearch(args.query));
    if (name === 'get_weather') return JSON.stringify(await web.weather(args.city));
    if (name === 'extract_webpage_text') { const response = await web.fetchPublic(args.url); return JSON.stringify({ text:web.extractText(response.text), sources:[{title:'Página consultada',url:response.url,published:null}], fetchedAt:new Date().toISOString() }); }
    await web.assertPublicURL(args.url);
    if (process.platform !== 'win32') throw new Error('Abertura de páginas disponível no Windows; você pode abrir a URL manualmente.');
    await exec('rundll32.exe',['url.dll,FileProtocolHandler',args.url],{timeout:10000,windowsHide:true}); return 'Página aberta no navegador padrão.';
  }
  if (['remember_memory','recall_memory','forget_memory'].includes(name)) {
    if (!config.memoryEnabled || !config.memory) throw new Error('Memória desabilitada. Habilite explicitamente nas configurações.');
    if (name === 'remember_memory') return JSON.stringify(await config.memory.remember(args.text));
    if (name === 'forget_memory') { await config.memory.forget(args.id); return 'Nota esquecida.'; }
    return JSON.stringify(config.memory.notes());
  }
  if (name === 'get_system_status') {
    const os = await import('node:os'); const { statfs } = await import('node:fs/promises'); const disk = await statfs(config.root);
    return JSON.stringify({ os:os.type(),release:os.release(),cpuModel:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,memoryTotal:os.totalmem(),memoryFree:os.freemem(),diskTotal:disk.blocks*disk.bsize,diskFree:disk.bavail*disk.bsize,uptimeSeconds:os.uptime(),notice:'CPU: identificação, não percentual de uso.' });
  }
  if (name === 'get_network_info') { const os=await import('node:os'); return JSON.stringify(os.networkInterfaces()); }
  if (name === 'list_processes') {
    if (process.platform !== 'win32') throw new Error('Consulta de processos disponível no Windows.');
    const {stdout} = await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-Process | Select-Object -First 100 Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Compress'],{timeout:10000,maxBuffer:65536,windowsHide:true}); return stdout;
  }
  if (name === 'search_files') {
    if (!args.query.trim() || args.query.length > 200) throw new Error('Consulta inválida.');
    const root=await safePath('.',config); const queue=[root]; const results=[]; let visited=0;
    while (queue.length && visited < 1000 && results.length < 100) {
      const folder=queue.shift(); let entries; try {entries=await readdir(folder,{withFileTypes:true});}catch{continue;}
      for (const entry of entries) { if (++visited > 1000) break; if (entry.isSymbolicLink()) continue; const target=path.join(folder,entry.name); try{await safePath(target,config);}catch{continue;} if (entry.name.toLowerCase().includes(args.query.toLowerCase())) results.push(path.relative(root,target)); if(entry.isDirectory()) queue.push(target); if(results.length>=100)break; }
    }
    return JSON.stringify({results,visited,truncated:visited>=1000 || results.length>=100});
  }
  if (name === 'run_command') {
    if (!config.allowCommands) throw new Error('Execução de comandos está desabilitada nas configurações.');
    if (process.platform !== 'win32') throw new Error('Comandos PowerShell disponíveis somente no Windows nesta versão.');
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key)));
    try {
      const { stdout, stderr } = await exec('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', args.command], { cwd: config.root, timeout: 20000, maxBuffer: 65536, windowsHide: true, env });
      return JSON.stringify({ stdout, stderr });
    } catch (error) {
      if (error.killed) throw new Error('PowerShell interrompido por limite de tempo/saída. Programas iniciados podem continuar; confira o Windows antes de repetir.');
      return JSON.stringify({ error: 'O comando PowerShell falhou.', stdout: String(error.stdout || '').slice(0, 32000), stderr: String(error.stderr || '').slice(0, 32000) });
    }
  }
  const target = await safePath(args.path, config, name === 'write_file' || name === 'create_directory');
  if (name === 'create_directory') { await mkdir(target); return 'Pasta criada.'; }
  if (name === 'list_files') {
    const entries = await readdir(target, { withFileTypes: true });
    return JSON.stringify(entries.slice(0, 200).map(x => ({ name: x.name, type: x.isDirectory() ? 'directory' : x.isSymbolicLink() ? 'link' : 'file' })));
  }
  if (name === 'write_file') {
    if (Buffer.byteLength(args.content) > 65536) throw new Error('Conteúdo excede 64 KiB.');
    await writeFile(target, args.content, { flag: 'wx', mode: 0o600 });
    return 'Arquivo criado.';
  }
  const info = await stat(target);
  if (name === 'read_file') {
    if (!info.isFile() || info.size > 65536) throw new Error('Selecione arquivo de texto de até 64 KiB.');
    const data = await readFile(target);
    if (data.includes(0)) throw new Error('Arquivo binário não suportado.');
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  }
  if (name === 'delete_file') {
    if (!info.isFile()) throw new Error('Exclusão de pastas não permitida.');
    await unlink(target); return 'Arquivo excluído.';
  }
  if (name === 'move_file') {
    if (!info.isFile()) throw new Error('Mover pastas não suportado nesta versão.');
    const destination = await safePath(args.destination, config, true);
    await link(target, destination);
    try { await unlink(target); } catch (error) { await unlink(destination); throw error; }
    return 'Arquivo movido.';
  }
  if (name === 'open_path') {
    if (process.platform !== 'win32') throw new Error('Abrir programas disponível somente no Windows nesta versão.');
    const { spawn } = await import('node:child_process');
    // The path is a positional argument, never interpolated into PowerShell source.
    await new Promise((resolve, reject) => {
      const encodedPath = Buffer.from(target, 'utf8').toString('base64');
      const script = `$ErrorActionPreference='Stop'; Invoke-Item -LiteralPath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}')))`;
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript], { windowsHide: true, stdio: 'ignore', timeout: 10000 });
      child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Não foi possível abrir o caminho.')));
    });
    return 'Solicitação de abertura enviada ao Windows.';
  }
  throw new Error('Ferramenta não implementada.');
}
