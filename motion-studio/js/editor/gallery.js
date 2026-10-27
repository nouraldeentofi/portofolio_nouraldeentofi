// Pickers for backgrounds, transitions, cameras and sounds.
// The engine catalogues are read through namespace imports so a missing export never breaks loading.
import { S, scene, emit, on, commit, sceneStart } from './store.js';
import { h, icon, toast, revealInRow } from './ui.js';
import * as BGM from '../engine/backgrounds.js';
import * as TRM from '../engine/transitions.js';
import * as R from '../engine/renderer.js';
import * as AUD from '../engine/audio.js';
import { deepClone } from '../engine/util.js';
import { images, requestRender, goToScene } from './stage.js';

// ---------------------------------------------------------------- catalogues with fallbacks
export const bgPresets = () => BGM.BG_PRESETS || BGM.BG_TYPES.map(([type, name]) => ({ id: type, name, cat: 'all', bg: { type } }));
export const bgCats = () => BGM.BG_CATS || [];
export const trList = () => TRM.TRANSITIONS.map(([id, name, cat]) => ({ id, name, cat: cat || 'all' }));
export const trCats = () => TRM.TR_CATS || [];
export const camList = () => R.CAMERAS.map(([id, name, cat]) => ({ id, name, cat: cat || 'all' }));
export const camCats = () => R.CAM_CATS || [];
const FALLBACK_SOUNDS = [['whoosh', 'هوا'], ['whoosh-soft', 'هوا ناعم'], ['swish', 'سويش'], ['pop', 'فقاعة'], ['click', 'كليك'], ['tick', 'تكتكة'], ['type', 'كيبورد'], ['chime', 'رنة'], ['thud', 'ضربة'], ['glitch', 'قلتش']].map(([id, name]) => ({ id, name, cat: 'all' }));
export const soundList = () => AUD.SOUNDS || FALLBACK_SOUNDS;
export const soundCats = () => AUD.SOUND_CATS || [];
export const soundPacks = () => AUD.SOUND_PACKS || [];
export function playPreview(kind, gain = 1, pitch = 1) {
  if (AUD.previewSound) return AUD.previewSound(kind, gain, pitch);
  const ctx = AUD.audioUnlock && AUD.audioUnlock();
  if (ctx && AUD.playSfx) AUD.playSfx(ctx, ctx.destination, kind, ctx.currentTime + 0.02, gain);
}

function catBar(cats, cur, onPick, counts) {
  const bar = h('div', { class: 'cats' });
  [['all', 'الكل'], ...cats].forEach(([id, lab]) => {
    const b = h('button', { class: 'cat' + (cur === id ? ' on' : ''), type: 'button' }, lab, counts && counts[id] ? h('small', {}, String(counts[id])) : null);
    b.addEventListener('click', () => { bar.querySelectorAll('.cat').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(id); });
    bar.appendChild(b);
  });
  if (cur !== 'all') requestAnimationFrame(() => { const on = bar.querySelector('.cat.on'); revealInRow(bar, on); });
  return bar;
}
const countBy = (list) => list.reduce((o, x) => ((o[x.cat] = (o[x.cat] || 0) + 1), o), {});

// ---------------------------------------------------------------- backgrounds tab
let bgState = { cat: 'all', q: '', all: false };
export function buildBackgroundsTab(root) {
  const draw = () => {
    root.innerHTML = '';
    const presets = bgPresets();
    const search = h('input', { class: 'search', type: 'search', placeholder: 'دوّر على خلفية… (نجوم، تدرج، شبكة)', value: bgState.q, 'aria-label': 'بحث بالخلفيات' });
    search.addEventListener('input', () => { bgState.q = search.value.trim(); fillGrid(); });
    const allT = h('label', { class: 'toggle', style: { margin: '10px 2px 0' } }, h('span', {}, 'طبّق على كل المشاهد'), h('input', { type: 'checkbox', checked: bgState.all ? true : null }));
    allT.querySelector('input').addEventListener('change', (e) => (bgState.all = e.target.checked));
    const grid = h('div', { class: 'gal-grid' });
    const note = h('div', { class: 'count-note' });
    root.append(search, allT, catBar(bgCats(), bgState.cat, (c) => { bgState.cat = c; fillGrid(); }, countBy(presets)), note, grid);
    let io = null;
    let hovered = null, raf = 0;
    function fillGrid() {
      grid.innerHTML = '';
      if (io) io.disconnect();
      const q = bgState.q.toLowerCase();
      const list = presets.filter((p) => (bgState.cat === 'all' || p.cat === bgState.cat) && (!q || (p.name + ' ' + p.id + ' ' + p.bg.type).toLowerCase().includes(q)));
      note.textContent = list.length === presets.length ? `${presets.length} خلفية` : `${list.length} من ${presets.length} خلفية`;
      const cur = scene() && scene().bg;
      io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); paint(e.target, 2.3); } }), { root, rootMargin: '200px' });
      list.forEach((p) => {
        const c = h('canvas', { width: 120, height: 150 });
        const b = h('button', { type: 'button', class: 'gal-item' + (cur && cur.preset === p.id ? ' on' : ''), title: p.name, 'data-id': p.id }, c, h('span', {}, p.name));
        b._p = p;
        b.addEventListener('click', () => applyBg(p));
        b.addEventListener('pointerenter', () => { hovered = b; });
        b.addEventListener('pointerleave', () => { if (hovered === b) hovered = null; paint(b, 2.3); });
        grid.appendChild(b);
        io.observe(b);
      });
    }
    function paint(b, t) {
      const c = b.querySelector('canvas');
      const [W, H] = R.ASPECTS['4:5'];
      const env = R.createEnv(S.project, W, H, c.width / W, { images });
      try { R.renderScene(c.getContext('2d'), { duration: 6, bg: b._p.bg, elements: [] }, t, env); } catch (e) { /* ignore */ }
    }
    const t0 = performance.now();
    const tick = (now) => { raf = requestAnimationFrame(tick); if (hovered && hovered.isConnected) paint(hovered, 1 + ((now - t0) / 1000) % 8); };
    cancelAnimationFrame(buildBackgroundsTab.raf);
    buildBackgroundsTab.raf = raf = requestAnimationFrame(tick);
    fillGrid();
  };
  draw();
  on('theme', () => { if (!root.hidden) draw(); });
  root.addEventListener('tabshow', draw);
}
export function applyBg(p) {
  const bg = { ...deepClone(p.bg), preset: p.id };
  if (bgState.all) S.project.scenes.forEach((s) => (s.bg = deepClone(bg)));
  else if (scene()) scene().bg = bg;
  commit();
  requestRender();
  emit('edit', 'bg');
  toast((bgState.all ? 'كل المشاهد صارت بخلفية ' : 'الخلفية: ') + p.name);
}

// ---------------------------------------------------------------- transition picker
export function transitionPicker(sc, onChange) {
  const box = h('div');
  const list = trList();
  let cat = 'all';
  const i = S.project.scenes.indexOf(sc);
  const prev = S.project.scenes[i - 1];
  // small frames of the two real scenes, composited live on hover
  const [W, H] = R.ASPECTS[S.project.aspect] || R.ASPECTS['4:5'];
  const cw = 108, chh = Math.round((cw * H) / W);
  const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = chh; return c; };
  const A = mk(), B = mk();
  const env = R.createEnv(S.project, W, H, cw / W, { images });
  try {
    if (prev) R.renderScene(A.getContext('2d'), prev, R.holdTime(prev, env), env);
    R.renderScene(B.getContext('2d'), sc, R.holdTime(sc, env), env);
  } catch (e) { /* ignore */ }
  const grid = h('div', { class: 'gal-grid' });
  let hovered = null;
  const paint = (b, p) => {
    const c = b.querySelector('canvas');
    const ctx = c.getContext('2d');
    try { TRM.composite(ctx, { ...(sc.transition || {}), type: b._id }, p, A, B, env); } catch (e) { ctx.drawImage(p < 0.5 ? A : B, 0, 0); }
  };
  let io = null;
  const fill = () => {
    grid.innerHTML = '';
    if (io) io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); paint(e.target, 0.5); } }), { rootMargin: '150px' });
    const cur = (sc.transition || {}).type;
    list.filter((x) => cat === 'all' || x.cat === cat).forEach((x) => {
      const c = mk();
      const b = h('button', { type: 'button', class: 'gal-item' + (x.id === cur ? ' on' : ''), title: x.name }, c, h('span', {}, x.name));
      b._id = x.id;
      b.addEventListener('click', () => {
        // a new preset starts clean: leftover dir/angle/colour overrides would change how it looks
        const old = sc.transition || {};
        sc.transition = { type: x.id, dur: old.dur ?? 0.7, ...(old.ease ? { ease: old.ease } : {}) };
        grid.querySelectorAll('.gal-item').forEach((g) => g.classList.toggle('on', g === b));
        onChange && onChange(x);
      });
      b.addEventListener('pointerenter', () => (hovered = b));
      b.addEventListener('pointerleave', () => { if (hovered === b) hovered = null; paint(b, 0.5); });
      grid.appendChild(b);
      io.observe(b);
    });
  };
  let raf = 0;
  const t0 = performance.now();
  const tick = (now) => {
    if (!box.isConnected && performance.now() - t0 > 2000) return;
    raf = requestAnimationFrame(tick);
    if (hovered) { const ph = ((now - t0) / 1400) % 1.3; paint(hovered, Math.min(1, ph)); }
  };
  raf = requestAnimationFrame(tick);
  box.append(catBar(trCats(), cat, (c) => { cat = c; fill(); }, countBy(list)), grid);
  fill();
  void raf;
  return box;
}

// ---------------------------------------------------------------- camera picker
export function cameraPicker(cam, onChange) {
  const box = h('div');
  const list = camList();
  // open on the current camera's group: 85 chips at once is too much to scan
  const cur = list.find((x) => x.id === (cam.type || 'none'));
  let cat = (cur && cur.cat) || 'all';
  const grid = h('div', { class: 'chip-list' });
  const fill = () => {
    grid.innerHTML = '';
    list.filter((x) => cat === 'all' || x.cat === cat).forEach((x) => {
      const b = h('button', { type: 'button', class: x.id === (cam.type || 'none') ? 'on' : '' }, x.name);
      b.addEventListener('click', () => {
        cam.type = x.id;
        grid.querySelectorAll('button').forEach((g) => g.classList.toggle('on', g === b));
        onChange && onChange(x);
      });
      grid.appendChild(b);
    });
  };
  box.append(catBar(camCats(), cat, (c) => { cat = c; fill(); }, countBy(list)), grid);
  fill();
  return box;
}

// ---------------------------------------------------------------- sounds
export function soundSelect(value, onChange, { allowAuto = true, allowNone = true, noPlay = false } = {}) {
  const wrap = h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } });
  const sel = h('select', { class: 'select' });
  if (allowAuto) sel.appendChild(h('option', { value: 'auto' }, 'تلقائي'));
  if (allowNone) sel.appendChild(h('option', { value: 'none' }, 'بدون صوت'));
  const cats = soundCats();
  const list = soundList();
  if (cats.length) {
    cats.forEach(([cid, clab]) => {
      const g = h('optgroup', { label: clab });
      list.filter((s) => s.cat === cid).forEach((s) => g.appendChild(h('option', { value: s.id }, s.name)));
      if (g.children.length) sel.appendChild(g);
    });
    list.filter((s) => !cats.some(([c]) => c === s.cat)).forEach((s) => sel.appendChild(h('option', { value: s.id }, s.name)));
  } else list.forEach((s) => sel.appendChild(h('option', { value: s.id }, s.name)));
  sel.value = value || (allowAuto ? 'auto' : list[0].id);
  sel.addEventListener('change', () => { onChange(sel.value); if (sel.value !== 'auto' && sel.value !== 'none') playPreview(sel.value); });
  wrap.append(sel);
  if (!noPlay) {
    const play = h('button', { class: 'snd-play', type: 'button', title: 'اسمع', 'aria-label': 'اسمع الصوت' }, icon('play'));
    play.addEventListener('click', () => { const v = sel.value; if (v !== 'auto' && v !== 'none') playPreview(v); else toast('اختار صوت لتسمعه'); });
    wrap.append(play);
  }
  return wrap;
}

export function soundBrowser(onPick) {
  const box = h('div');
  const list = soundList();
  let cat = 'all';
  const grid = h('div', { class: 'snd-grid' });
  const fill = () => {
    grid.innerHTML = '';
    list.filter((x) => cat === 'all' || x.cat === cat).forEach((x) => {
      const b = h('button', { type: 'button', title: x.name }, h('i', {}, '▶'), h('span', {}, x.name));
      b.addEventListener('click', () => { playPreview(x.id); onPick && onPick(x); });
      grid.appendChild(b);
    });
  };
  box.append(catBar(soundCats(), cat, (c) => { cat = c; fill(); }, countBy(list)), grid);
  fill();
  return box;
}

export function previewSceneFrom(i, offset = 0) {
  goToScene(i, { hold: false });
  S.time = sceneStart(i) + offset;
  S.playing = true;
  emit('play', 'time');
}
