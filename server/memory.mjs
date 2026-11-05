import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export function sanitize(value, secrets = []) {
  let text = String(value);
  for (const secret of secrets) if (secret) text = text.split(secret).join('[credencial omitida]');
  // Treat credential-bearing paragraphs conservatively, including values on following lines.
  return text.split(/\n\s*\n/).map(paragraph=>/\b(senha|password|tokens?|api[_ -]?key|chave|secret|private[ _-]?key)\b/i.test(paragraph)?'[Trecho com possível credencial omitido]':paragraph).join('\n\n').replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g,'[credencial omitida]').replace(/\b[A-Za-z0-9_-]{32,}\b/g,'[identificador potencialmente sensível omitido]').replace(/Bearer\s+\S+/gi,'Bearer [credencial omitida]');
}
export async function createMemory(directory, { days = 30, maxConversations = 20, maxMessages = 120, maxBytes = 5*1024*1024, secrets = [] } = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 }); const file = path.join(directory, 'memory.json');
  let data = { notes: [], conversations: [] };
  try { const {stat}=await import('node:fs/promises');if((await stat(file)).size>25*1024*1024)throw new Error('Arquivo de memória excessivo.');const raw = await readFile(file, 'utf8'); if (raw.length > 25 * 1024 * 1024) throw new Error('Arquivo de memória excessivo.'); data = JSON.parse(raw); if (!Array.isArray(data.notes) || !Array.isArray(data.conversations)) throw new Error('Formato de memória inválido.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const prune = () => { const cutoff = Date.now() - days * 86400000; data.conversations = data.conversations.filter(c => c.updated >= cutoff).sort((a,b) => b.updated-a.updated).slice(0,maxConversations); data.notes = data.notes.filter(n => n.updated >= cutoff).slice(-100); while(Buffer.byteLength(JSON.stringify(data))>maxBytes&&data.conversations.length>1)data.conversations.pop();while(Buffer.byteLength(JSON.stringify(data))>maxBytes&&data.notes.length)data.notes.shift();while(Buffer.byteLength(JSON.stringify(data))>maxBytes&&data.conversations[0]?.messages.length>2)data.conversations[0].messages.shift(); };
  const save = async () => { prune(); const content = JSON.stringify(data); if (Buffer.byteLength(content) > maxBytes) throw new Error('Limite local de memória atingido. Exclua conversas antigas.'); await writeFile(file + '.tmp', content, { mode: 0o600 }); await rename(file + '.tmp', file); };
  const previous=JSON.stringify(data);prune();if(JSON.stringify(data)!==previous)await save();
  return {
    notes: () => structuredClone(data.notes),
    history: () => data.conversations.map(c => ({ id: c.id, title: c.title, updated: c.updated, count: c.messages.length })),
    conversation: id => structuredClone(data.conversations.find(c => c.id === id) || null),
    async remember(text) { if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new Error('Memória deve ter de 1 a 2000 caracteres.'); if (sanitize(text, secrets) !== text) throw new Error('Não é permitido guardar credenciais na memória.'); const note = { id: randomUUID(), text, updated: Date.now() }; data.notes.push(note); await save(); return note; },
    async forget(id) { data.notes = data.notes.filter(n => n.id !== id); await save(); },
    async saveConversation(id, messages) { const safe = messages.filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string').slice(-maxMessages).map(m => ({ role:m.role, content:sanitize(m.content, secrets).slice(0,16000) })); const conversation = { id, title:safe.find(m => m.role === 'user')?.content.slice(0,80) || 'Conversa', messages:safe, updated:Date.now() }; data.conversations = data.conversations.filter(c => c.id !== id); data.conversations.push(conversation); await save(); },
    async clearHistory() { data.conversations = []; await save(); },
    async clearAll() { data = { notes:[], conversations:[] }; await save(); },
  };
}
