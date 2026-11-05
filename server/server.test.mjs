import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { get } from 'node:http';
import { createJarviz } from './server.mjs';

test('local chat requires authentication, approvals, and keeps secrets private', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'jarviz-test-'));
  await writeFile(path.join(root, 'notes.txt'), 'meu texto');
  const calls = [];
  const app = await createJarviz({ dataDir: path.join(root, 'private'), provider: async ({ messages }) => {
    calls.push(structuredClone(messages));
    if (messages.at(-1).role === 'tool') return { content: 'Li o arquivo com autorização.' };
    return { content: '', tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'read_file', arguments: JSON.stringify({ path: 'notes.txt' }) } }] };
  }});
  await app.listen(0);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const headers = { 'Content-Type': 'application/json', 'X-Jarviz-Client': '1' };
  const api = (url, body, extra = {}) => fetch(base + url, { method: body ? 'POST' : 'GET', headers: { ...headers, ...extra }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal((await api('/api/config')).status, 401);
    assert.equal((await fetch(base + '/api/session')).status, 403);
    assert.equal((await api('/api/session', null, { Origin: 'https://evil.example' })).status, 403);
    const navigationStatus = await new Promise((resolve, reject) => {
      get(base, { headers: { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(navigationStatus, 200);
    assert.equal((await api('/api/session', null, { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate' })).status, 403);
    assert.equal((await fetch(base + '/server/server.mjs')).status, 404);
    assert.equal((await fetch(base + '/.git/config')).status, 404);
    assert.match((await fetch(base)).headers.get('content-security-policy'), /media-src 'self' blob:/);
    const session = await (await api('/api/session')).json();
    headers['X-Jarviz-Token'] = session.token;
    const saved = await api('/api/config', { key: 'test-key-not-real', model: 'openrouter/free', root, allowCommands: false });
    assert.equal(saved.status, 200);
    assert.ok(!(await saved.text()).includes('test-key-not-real'));
    assert.ok(!(await (await api('/api/config')).text()).includes('test-key-not-real'));
    assert.equal((await api('/api/config', { model: 'openrouter/free', root: path.join(root, 'notes.txt') })).status, 400);
    const pending = await (await api('/api/chat', { message: 'Leia notes.txt' })).json();
    assert.equal(pending.pending.actions[0].name, 'read_file');
    assert.equal((await api('/api/chat', { message: 'another action' })).status, 409);
    assert.equal((await api('/api/config', { model: 'openrouter/free', root })).status, 409);
    assert.equal(calls.length, 1);
    assert.ok(!JSON.stringify(calls).includes('meu texto'));
    assert.equal((await api('/api/approve', { id: 'forged', approved: true })).status, 409);
    const result = await (await api('/api/approve', { id: pending.pending.id, approved: true })).json();
    assert.equal(result.reply, 'Li o arquivo com autorização.');
    assert.ok(JSON.stringify(calls.at(-1)).includes('meu texto'));
    assert.equal((await api('/api/approve', { id: pending.pending.id, approved: true })).status, 409);
    const denied = await (await api('/api/chat', { message: 'Leia novamente' })).json();
    await api('/api/approve', { id: denied.pending.id, approved: false });
    assert.ok(JSON.stringify(calls.at(-1)).includes('denied'));
    const cancelled = await (await api('/api/chat', { message: 'Leia novamente' })).json();
    assert.equal((await api('/api/reset', {})).status, 200);
    assert.equal((await api('/api/approve', { id: cancelled.pending.id, approved: true })).status, 409);
  } finally { await app.close(); await rm(root, { recursive: true, force: true }); }
});

test('file tools constrain paths and perform real file operations', async () => {
  const { executeTool } = await import('./tools.mjs');
  const root = await mkdtemp(path.join(tmpdir(), 'jarviz-tools-'));
  const config = { root, dataDir: path.join(root, 'private'), allowCommands: false };
  try {
    await executeTool('write_file', { path: 'new.txt', content: 'hello' }, config);
    await executeTool('create_directory', { path: 'folder' }, config);
    assert.equal(await readFile(path.join(root, 'new.txt'), 'utf8'), 'hello');
    await assert.rejects(executeTool('write_file', { path: 'new.txt', content: 'overwrite' }, config));
    await assert.rejects(executeTool('read_file', { path: '../outside.txt' }, config));
    await assert.rejects(executeTool('write_file', { path: '.env', content: 'secret' }, config));
    for (const filename of ['.npmrc', '.netrc', '.git-credentials', '.pypirc']) {
      await writeFile(path.join(root, filename), 'synthetic-secret');
      await assert.rejects(executeTool('read_file', { path: filename }, config), /protegido/);
    }
    await assert.rejects(executeTool('delete_file', { path: 'folder' }, config));
    await assert.rejects(executeTool('write_file', { path: '../outside.txt', content: 'no' }, config));
    await assert.rejects(executeTool('create_directory', { path: '../outside' }, config));
    await assert.rejects(executeTool('invented_tool', {}, config));
    await assert.rejects(executeTool('write_file', { path: 'bad.txt', content: 'no', extra: true }, config));
    await assert.rejects(executeTool('run_command', { command: 'echo unsafe' }, config));
    await symlink(tmpdir(), path.join(root, 'outside'), 'dir');
    await assert.rejects(executeTool('list_files', { path: 'outside' }, config));
    await executeTool('move_file', { path: 'new.txt', destination: 'moved.txt' }, config);
    assert.match(await executeTool('read_file', { path: 'moved.txt' }, config), /hello/);
    await executeTool('delete_file', { path: 'moved.txt' }, config);
    assert.deepEqual(JSON.parse(await executeTool('list_files', { path: '.' }, config)).filter(x => x.name === 'moved.txt'), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
