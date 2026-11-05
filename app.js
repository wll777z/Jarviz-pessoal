const states = {
  idle: ['AGUARDANDO COMANDO', 'Como posso ajudar?', 'Uma ideia. Um comando. Novas possibilidades.'],
  listening: ['OUVINDO · SIMULAÇÃO', 'Estou ouvindo.', 'Visualização demonstrativa. O microfone não está ativo.'],
  processing: ['PROCESSANDO · SIMULAÇÃO', 'Conectando as ideias.', 'Organizando uma resposta de demonstração.'],
  speaking: ['FALANDO · SIMULAÇÃO', 'Vamos dar o próximo passo.', 'Visualização de voz. Nenhum áudio está sendo reproduzido.'],
  alert: ['ATENÇÃO', 'Uma conexão ainda falta.', 'Conecte um backend para habilitar o assistente real.'],
};
const timers = new Set();
const input = document.querySelector('#command');
const send = document.querySelector('.send');
function schedule(callback, delay) {
  const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
  timers.add(timer);
}
function cancelTimers() { timers.forEach(clearTimeout); timers.clear(); }
function setState(state) {
  if (!states[state]) return;
  document.body.dataset.state = state;
  const [label, title, description] = states[state];
  document.querySelector('#state-label').textContent = label;
  document.querySelector('#core-title').textContent = title;
  document.querySelector('#core-description').textContent = description;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state)));
  send.disabled = state === 'processing';
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { cancelTimers(); setState(button.dataset.mode); }));
function addEvent(label, title, description) {
  const article = document.createElement('article');
  const dot = document.createElement('span'); dot.className = 'event-dot';
  const small = document.createElement('small'); small.textContent = label;
  const heading = document.createElement('h3'); heading.textContent = title;
  const paragraph = document.createElement('p'); paragraph.textContent = description;
  article.append(dot, small, heading, paragraph);
  const log = document.querySelector('#conversation');
  log.prepend(article);
  while (log.children.length > 12) log.lastElementChild.remove();
  log.scrollTop = 0;
}
document.querySelector('#command-form').addEventListener('submit', event => {
  event.preventDefault();
  const command = input.value.trim();
  if (!command || send.disabled) return;
  cancelTimers();
  addEvent('VOCÊ · AGORA', command, 'Comando recebido apenas nesta demonstração local.');
  input.value = '';
  setState('processing');
  schedule(() => {
    const normalized = command.toLocaleLowerCase('pt-BR');
    const reply = normalized.includes('status')
      ? 'Interface disponível. IA e microfone não estão conectados. As animações demonstram os estados do assistente.'
      : normalized.includes('dia')
        ? 'Podemos criar um espaço para sua agenda e prioridades. Esta prévia ainda não acessa calendário nem cria tarefas.'
        : 'Este é o seu futuro centro de comando. O visual está pronto para receber integrações de conversa, voz e automações.';
    addEvent('JARVIZ · RESPOSTA DEMONSTRATIVA', 'Possibilidades à frente.', reply);
    setState('speaking');
    schedule(() => setState('idle'), 4500);
  }, 1200);
});
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  input.value = button.dataset.command;
  input.focus();
  input.scrollIntoView({ block: 'center' });
}));
const motion = document.querySelector('#motion-toggle');
let reduced = false;
try { reduced = localStorage.getItem('jarviz-reduced-motion') === 'true'; } catch { /* Storage may be unavailable in private contexts. */ }
function applyMotion() {
  document.documentElement.dataset.reducedMotion = String(reduced);
  motion.setAttribute('aria-pressed', String(reduced));
  motion.textContent = reduced ? 'Movimento reduzido · ativado' : 'Reduzir movimento';
}
applyMotion();
motion.addEventListener('click', () => {
  reduced = !reduced;
  applyMotion();
  try { localStorage.setItem('jarviz-reduced-motion', String(reduced)); } catch { /* Keep in-memory preference. */ }
});
function updateClock() {
  const now = new Date();
  const clock = document.querySelector('#clock');
  clock.dateTime = now.toISOString();
  clock.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
}
updateClock(); setInterval(updateClock, 1000);
