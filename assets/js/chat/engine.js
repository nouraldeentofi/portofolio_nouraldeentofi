/**
 * Chat rendering engine.
 *
 * Knows nothing about Nour — it renders whatever conversation graph it is
 * handed. A missing node id falls back to `menu` rather than dead-ending.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Timestamps follow the page language, not the browser locale — the Arabic
   page shows "٠٦:١٧ م" even on a device set to English, and vice versa. */
const locale = document.documentElement.lang || undefined;
const now = () => new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export function createChat({ script, thread, typing, replies, fallbackNode = 'menu' }) {
  let busy = false;
  let audio = null;

  function blip(freq) {
    if (reduced) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.13);
    } catch {
      /* audio is a nicety, never a requirement */
    }
  }

  const scrollDown = () => { thread.scrollTop = thread.scrollHeight; };

  function addMsg(html, who) {
    const el = document.createElement('div');
    el.className = `chat__msg chat__msg--${who}`;
    el.innerHTML = `${html}<span class="chat__time">${now()}</span>`;
    thread.appendChild(el);
    scrollDown();
    blip(who === 'bot' ? 620 : 840);
  }

  function addCard(html) {
    const el = document.createElement('div');
    el.className = 'chat__card';
    el.innerHTML = html;
    thread.appendChild(el);
    scrollDown();
    blip(620);
  }

  function typeThen(fn, len) {
    if (reduced) { fn(); return Promise.resolve(); }
    return new Promise((resolve) => {
      typing.classList.add('is-on');
      scrollDown();
      setTimeout(() => {
        typing.classList.remove('is-on');
        fn();
        resolve();
      }, Math.min(1400, 380 + len * 8));
    });
  }

  function showOpts(opts) {
    replies.innerHTML = '';
    opts.forEach(([label, next], i) => {
      const btn = document.createElement('button');
      btn.className = 'chat__reply';
      btn.type = 'button';
      btn.innerHTML = label;
      btn.style.animationDelay = `${i * 0.05}s`;
      btn.addEventListener('click', () => {
        if (busy) return;
        addMsg(label, 'user');
        run(next);
      });
      replies.appendChild(btn);
    });
  }

  async function run(id) {
    const node = script[id] ?? script[fallbackNode];
    if (!node) return;

    busy = true;
    replies.innerHTML = '';

    for (const m of node.msgs ?? []) await typeThen(() => addMsg(m, 'bot'), m.length);
    if (node.card) await typeThen(() => addCard(node.card), 80);
    for (const m of node.msgs2 ?? []) await typeThen(() => addMsg(m, 'bot'), m.length);

    showOpts(node.opts ?? script[fallbackNode].opts);
    busy = false;
  }

  return { start: (id = 'start') => run(id) };
}
