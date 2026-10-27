// "القوالب" tab: searchable template gallery with live thumbnails in the project's theme.
import { S, scene, emit, on, commit, freshIds } from './store.js';
import { h, icon, toast } from './ui.js';
import { openModal } from './modal.js';
import { TEMPLATES, CATEGORIES } from '../templates/index.js';
import { renderScene, createEnv, ASPECTS, holdTime } from '../engine/renderer.js';
import { goToScene, images } from './stage.js';
import { deepClone } from '../engine/util.js';
import { loadFonts } from '../engine/fonts.js';
import { clearTextCache } from '../engine/text.js';

let root, gridEl, countEl;
let cat = 'all';
let query = '';
const cards = new Map(); // id -> {canvas, tpl, hold}
let io = null;
let hovered = null;

export function initLibrary() {
  root = document.getElementById('tab-templates');
  const search = h('input', { class: 'search', type: 'search', placeholder: 'دوّر على قالب… (عنوان، أرقام، كود، 3D)', 'aria-label': 'بحث بالقوالب' });
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); fill(); });
  const cats = h('div', { class: 'cats', role: 'tablist' });
  [['all', 'الكل'], ...CATEGORIES].forEach(([id, lab]) => {
    const b = h('button', { class: 'cat' + (id === cat ? ' on' : ''), type: 'button' }, lab);
    b.addEventListener('click', () => { cat = id; cats.querySelectorAll('.cat').forEach((x) => x.classList.remove('on')); b.classList.add('on'); fill(); });
    cats.appendChild(b);
  });
  countEl = h('div', { class: 'count-note' });
  gridEl = h('div', { class: 'tpl-grid' });
  root.append(search, cats, countEl, gridEl);
  io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { drawCard(e.target.dataset.id); io.unobserve(e.target); } }), { root, rootMargin: '300px' });
  fill();
  // fonts picked per element inside templates (calligraphy, serif…) load once for the thumbnails
  const fams = new Set();
  for (const t of TEMPLATES) for (const e of t.scene.elements) if (e.font && e.font[0] !== '@') fams.add(e.font);
  loadFonts([...fams]).then(() => { clearTextCache(); redrawAll(); });
  on('theme', redrawAll);
  on('aspect', () => { fill(); });
  hoverLoop();
}

function matches(t) {
  if (cat !== 'all' && t.cat !== cat) return false;
  if (!query) return true;
  const hay = (t.name + ' ' + (t.tags || '') + ' ' + t.cat + ' ' + JSON.stringify(t.scene.elements.map((e) => e.text || e.type))).toLowerCase();
  return hay.includes(query);
}

function fill() {
  gridEl.innerHTML = '';
  cards.clear();
  const list = TEMPLATES.filter(matches);
  countEl.textContent = list.length === TEMPLATES.length ? `${TEMPLATES.length} مشهد جاهز` : `${list.length} من ${TEMPLATES.length} مشهد`;
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  const cw = 300, ch = Math.round((cw * H) / W);
  list.forEach((t, i) => {
    const canvas = h('canvas', { width: cw, height: ch });
    const card = h('div', { class: 'tpl', 'data-id': t.id, tabindex: '0' },
      canvas,
      h('div', { class: 'meta' }, h('span', { class: 'name' }, t.name), h('span', { class: 'num' }, '#' + String(TEMPLATES.indexOf(t) + 1).padStart(3, '0'))),
      h('div', { class: 'acts' }, actBtn('+ مشهد', () => addTemplate(t)), actBtn('دمج', () => mergeTemplate(t), true)));
    card.addEventListener('click', (e) => { if (e.target.closest('.acts')) return; openPreview(t, list); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPreview(t, list); });
    card.addEventListener('pointerenter', () => { hovered = t.id; });
    card.addEventListener('pointerleave', () => { if (hovered === t.id) { hovered = null; drawCard(t.id); } });
    gridEl.appendChild(card);
    cards.set(t.id, { canvas, tpl: t, hold: null });
    io.observe(card);
    void i;
  });
}
function actBtn(lab, fn, alt) {
  const b = h('button', { type: 'button', class: alt ? 'alt' : '' }, lab);
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

function envFor(canvas) {
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  const env = createEnv(S.project, W, H, canvas.width / W, { images, backdrop: true });
  return env;
}
function drawCard(id, time) {
  const c = cards.get(id);
  if (!c) return;
  const env = envFor(c.canvas);
  if (c.hold == null) c.hold = holdTime(c.tpl.scene, env);
  const ctx = c.canvas.getContext('2d');
  try { renderScene(ctx, c.tpl.scene, time ?? c.hold, env); } catch (e) { /* keep last frame */ }
}
function redrawAll() {
  for (const [id, c] of cards) {
    c.hold = null;
    const r = c.canvas.getBoundingClientRect();
    if (r.bottom > -400 && r.top < window.innerHeight + 400) drawCard(id);
  }
}
function hoverLoop() {
  let t0 = performance.now();
  let last = null;
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (!hovered) { last = null; return; }
    if (hovered !== last) { last = hovered; t0 = now; }
    const c = cards.get(hovered);
    if (!c) return;
    const d = c.tpl.scene.duration;
    drawCard(hovered, ((now - t0) / 1000) % d);
  };
  requestAnimationFrame(tick);
}

export function addTemplate(t) {
  const sc = freshIds(t.scene);
  sc.name = t.name;
  if (!sc.transition) sc.transition = { type: t.transition || 'slide', dur: 0.7 };
  const at = S.project.scenes.length ? S.sceneIdx + 1 : 0;
  S.project.scenes.splice(at, 0, sc);
  S.selId = null;
  commit();
  emit('structure');
  goToScene(at);
  emit('images');
  toast('انضاف «' + t.name + '» كمشهد ' + (at + 1));
}
export function mergeTemplate(t) {
  if (!S.project.scenes.length) return addTemplate(t);
  const src = freshIds(t.scene);
  const cur = scene();
  cur.elements.push(...src.elements);
  cur.duration = Math.max(cur.duration, src.duration);
  commit();
  emit('structure', 'render');
  toast('اندمجت عناصر «' + t.name + '» بالمشهد الحالي');
}
export function replaceWithTemplate(t) {
  if (!S.project.scenes.length) return addTemplate(t);
  const sc = freshIds(t.scene);
  sc.name = t.name;
  const old = scene();
  sc.transition = old.transition || sc.transition || { type: t.transition || 'slide', dur: 0.7 };
  S.project.scenes[S.sceneIdx] = sc;
  S.selId = null;
  commit();
  emit('structure', 'select');
  goToScene(S.sceneIdx);
  emit('images');
  toast('صار المشهد ' + (S.sceneIdx + 1) + ' «' + t.name + '»');
}

const CAT_NAME = Object.fromEntries(CATEGORIES);
const TYPE_AR = { text: 'نص', shape: 'شكل', image: 'صورة', icon: 'أيقونة', counter: 'عداد', bars: 'أعمدة', linechart: 'خط بياني', donut: 'دائرة', flow: 'ورك فلو', code: 'كود', chat: 'محادثة', notify: 'إشعار', device: 'جهاز', obj3d: '3D', list: 'قائمة', timeline: 'خط زمني', particles: 'جزيئات', signature: 'توقيع' };

// Large looping preview with add / merge / replace, arrows browse the current list.
export function openPreview(t, list = TEMPLATES) {
  let idx = Math.max(0, list.indexOf(t));
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.min(560, (window.innerHeight * 0.68 * W) / H, window.innerWidth - 60);
  const canvas = h('canvas', { class: 'pv-canvas', width: Math.round(cssW * pr), height: Math.round((cssW * pr * H) / W), style: { maxWidth: cssW + 'px' } });
  const side = h('div', { class: 'pv-side' });
  const wrap = h('div', { class: 'pv-wrap' }, h('div', { style: { display: 'grid', placeItems: 'center' } }, canvas), side);
  let raf = 0;
  const m = openModal({ title: 'معاينة القالب', size: 'wide', body: wrap, onClose: () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); } });
  let t0 = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const tp = list[idx];
    const env = createEnv(S.project, W, H, canvas.width / W, { images });
    try { renderScene(canvas.getContext('2d'), tp.scene, ((now - t0) / 1000) % tp.scene.duration, env); } catch (e) { /* ignore */ }
  };
  raf = requestAnimationFrame(loop);
  const act = (lab, ic, fn, cls = 'btn block') => { const b = h('button', { class: cls, type: 'button' }, ic ? icon(ic) : null, lab); b.addEventListener('click', fn); return b; };
  const show = () => {
    const tp = list[idx];
    t0 = performance.now();
    const kinds = [...new Set(tp.scene.elements.map((e) => TYPE_AR[e.type]).filter(Boolean))].slice(0, 6).join(' · ');
    side.innerHTML = '';
    side.append(
      h('span', { class: 'cat-name' }, CAT_NAME[tp.cat] || tp.cat),
      h('h3', {}, tp.name),
      h('p', { class: 'note', style: { margin: 0 } }, tp.scene.duration.toFixed(1) + ' ثانية · فيه: ' + kinds),
      act('أضف كمشهد جديد', 'plus', () => { addTemplate(tp); m.close(); }, 'btn primary block big'),
      act('دمج عناصره بالمشهد الحالي', 'layers', () => { mergeTemplate(tp); m.close(); }),
      act('استبدل المشهد الحالي فيه', 'swap', () => { replaceWithTemplate(tp); m.close(); }),
      h('div', { class: 'pv-nav' }, act('السابق', 'prev', () => { idx = (idx - 1 + list.length) % list.length; show(); }, 'btn'), act('التالي', 'next', () => { idx = (idx + 1) % list.length; show(); }, 'btn')),
      h('p', { class: 'hint' }, 'الألوان والخطوط من الثيم الحالي. بعد ما تضيفه بتعدّل كل شي فيه.'),
    );
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { idx = (idx + 1) % list.length; show(); }
    else if (e.key === 'ArrowRight') { idx = (idx - 1 + list.length) % list.length; show(); }
    else if (e.key === 'Enter') { addTemplate(list[idx]); m.close(); }
  };
  document.addEventListener('keydown', onKey);
  show();
}

export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
void deepClone;
