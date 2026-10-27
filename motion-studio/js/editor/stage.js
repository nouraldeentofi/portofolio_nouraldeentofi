// Stage: renders the preview, maps pointer input to elements (move / resize / rotate / inline text edit).
import { S, scene, selected, emit, on, commit, sceneStart, totalDur } from './store.js';
import { renderFrame, createEnv, ASPECTS, sceneAt, holdTime, unitFor } from '../engine/renderer.js';
import { clamp } from '../engine/util.js';
import { h, icon, toast } from './ui.js';
import { resolveTheme } from '../engine/themes.js';
import { pickImage } from './elements-panel.js';

let stageEl, inner, canvas, ctx, overlay, selBox, hovBox, gV, gH;
let boxes = [];
let qbar = null;
let hlId = null;
let qbarFor = null;
let dirty = true;
let cssW = 1, cssH = 1;
// adaptive preview quality: drops resolution while playing on slow devices
let quality = 1;
const frameMs = [];
export const images = new Map();

export const SIZE_KEYS = {
  text: ['size', 'w'], shape: ['w', 'h'], image: ['w', 'h'], icon: ['size'], counter: ['size'], donut: ['w'], obj3d: ['size'],
  rotator: ['size'], signature: ['size'], status: ['size'], list: ['w', 'size'], chat: ['w', 'size'], code: ['w', 'size'],
  notify: ['w'], device: ['w', 'h'], bars: ['w', 'h'], linechart: ['w', 'h'], flow: ['w', 'h', 'nodeSize'], timeline: ['w', 'h', 'size'],
  progress: ['w'], equalizer: ['w', 'h'], ticker: ['size', 'w'], particles: ['w', 'h'], glow: ['w', 'h'], corners: ['w', 'h'],
};
const DEFAULT_SIZE = { size: 80, w: 600, h: 400, nodeSize: 120 };

export function requestRender() { dirty = true; }
export const dims = () => ASPECTS[S.project.aspect] || ASPECTS['4:5'];

export function initStage() {
  stageEl = document.getElementById('stage');
  inner = document.getElementById('stageInner');
  canvas = document.getElementById('view');
  ctx = canvas.getContext('2d');
  overlay = document.getElementById('overlay');
  hovBox = h('div', { class: 'hov', hidden: true });
  selBox = h('div', { class: 'sel', hidden: true },
    h('div', { class: 'stem' }), h('div', { class: 'h rot', 'data-h': 'rot' }), h('div', { class: 'h br', 'data-h': 'br' }), h('div', { class: 'h tl', 'data-h': 'tl' }), h('div', { class: 'tag' }));
  gV = h('div', { class: 'guide v', hidden: true });
  gH = h('div', { class: 'guide h', hidden: true });
  qbar = h('div', { class: 'qbar', hidden: true, role: 'toolbar', 'aria-label': 'أدوات سريعة' });
  qbar.addEventListener('pointerdown', (e) => e.stopPropagation());
  overlay.append(hovBox, selBox, gV, gH);
  inner.appendChild(qbar);
  new ResizeObserver(() => { layout(); requestRender(); }).observe(stageEl);
  bindPointer();
  on('render', requestRender);
  on('select', () => { qbarFor = null; requestRender(); });
  on('play', () => { if (S.playing) qbar.hidden = true; });
  on('aspect', () => { layout(); requestRender(); });
  on('play', () => { frameMs.length = 0; layout(); requestRender(); });
  layout();
  loop();
}

function layout() {
  const [W, H] = dims();
  const r = stageEl.getBoundingClientRect();
  const pad = window.innerWidth < 920 ? 12 : 22;
  const s = Math.max(0.05, Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H));
  cssW = Math.max(40, W * s);
  cssH = Math.max(40, H * s);
  inner.style.width = cssW + 'px';
  inner.style.height = cssH + 'px';
  const pr = Math.min(window.devicePixelRatio || 1, 2) * (S.playing ? quality : 1);
  const target = Math.max(120, Math.min(W, Math.round(cssW * pr)));
  if (canvas.width !== target) {
    canvas.width = target;
    canvas.height = Math.round((target * H) / W);
  }
}

// ---------------------------------------------------------------- images
export function syncImages() {
  const srcs = new Set();
  for (const sc of S.project.scenes) {
    if (sc.bg && sc.bg.src) srcs.add(sc.bg.src);
    for (const e of sc.elements || []) if (e.src) srcs.add(e.src);
  }
  for (const src of srcs) {
    if (images.has(src)) continue;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { requestRender(); emit('thumbs'); };
    img.src = src;
    images.set(src, img);
  }
}

// ---------------------------------------------------------------- render loop
let last = performance.now();
let lastScene = -1;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (S.playing) {
    frameMs.push(dt * 1000);
    if (frameMs.length >= 24) {
      const avg = frameMs.reduce((a, b) => a + b, 0) / frameMs.length;
      frameMs.length = 0;
      const q0 = quality;
      if (avg > 40 && quality > 0.45) quality = Math.max(0.45, quality - 0.15);
      else if (avg < 21 && quality < 1) quality = Math.min(1, quality + 0.1);
      if (q0 !== quality) layout();
    }
    const total = totalDur();
    S.time += dt;
    if (S.loopScene) {
      const st = sceneStart(S.sceneIdx), en = st + scene().duration;
      if (S.time >= en || S.time < st) S.time = st;
    } else if (S.time >= total) S.time = 0;
    const at = sceneAt(S.project, S.time);
    if (at && at.i !== S.sceneIdx) {
      S.sceneIdx = at.i;
      if (S.selId) S.selId = null;
      emit('scene');
    }
    emit('time');
    dirty = true;
  }
  if (dirty) {
    dirty = false;
    draw();
  }
}

export function makeEnv(W, H, px) {
  return createEnv(S.project, W, H, px, { images });
}

function draw() {
  if (!S.project.scenes.length) {
    ctx.fillStyle = '#0F1216';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const [W, H] = dims();
  const env = makeEnv(W, H, canvas.width / W);
  env.collect = [];
  renderFrame(ctx, S.project, S.time, env);
  boxes = env.collect;
  placeSel();
}

// ---------------------------------------------------------------- selection geometry
function cssRect(bx) {
  const k = cssW / canvas.width;
  const m = bx.m, b = bx.b;
  const c = m.transformPoint(new DOMPoint(b.bx, b.by));
  const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
  const ang = Math.atan2(m.b, m.a);
  return { cx: c.x * k, cy: c.y * k, w: Math.max(6, b.w * sx * k), h: Math.max(6, b.h * sy * k), ang, scale: sx * k };
}
function place(el, r) {
  el.style.width = r.w + 'px';
  el.style.height = r.h + 'px';
  el.style.transform = `translate(${r.cx - r.w / 2}px, ${r.cy - r.h / 2}px) rotate(${r.ang}rad)`;
}
function placeSel() {
  const bx = S.selId && boxes.find((b) => b.id === S.selId);
  if (!bx || S.playing) { selBox.hidden = true; qbar.hidden = true; placeHl(); return; }
  selBox.hidden = false;
  const r = cssRect(bx);
  place(selBox, r);
  const el = selected();
  selBox.querySelector('.tag').textContent = el ? el.type : '';
  if (el && !document.querySelector('.inline-edit')) {
    if (qbarFor !== el.id) buildQbar(el);
    qbar.hidden = false;
    const top = r.cy - r.h / 2 - 46;
    const below = top < 44;
    qbar.style.left = clamp(r.cx, 150, Math.max(150, cssW - 150)) + 'px';
    qbar.style.top = (below ? Math.min(cssH - 10, r.cy + r.h / 2 + 56) : top) + 'px';
  } else qbar.hidden = true;
  placeHl();
}

// dashed outline for an element hovered in the inspector
export function highlight(id) { hlId = id; placeHl(); }
function placeHl() {
  if (!hlId || hlId === S.selId) { if (!hovBox.dataset.ptr) hovBox.hidden = true; return; }
  const bx = boxes.find((b) => b.id === hlId);
  hovBox.hidden = !bx;
  if (bx) place(hovBox, cssRect(bx));
}

// ---------------------------------------------------------------- quick toolbar
const COLOR_KEY = { text: 'color', shape: 'fill', icon: 'color', counter: 'color', glow: 'color', obj3d: 'color', corners: 'color', status: 'color', signature: 'color', linechart: 'color', donut: 'color', progress: 'color', equalizer: 'color', flow: 'color', list: 'iconColor', timeline: 'color', ticker: 'color', rotator: 'pillColor' };
const FUN_IN = ['riseBlur', 'pop', 'maskUp', 'slam', 'blurIn', 'pushIn', 'zoomIn', 'tilt', 'flipX', 'scatter', 'wave', 'stretch', 'skew', 'blurSlideR', 'elastic', 'spin', 'iris', 'wipeR', 'glitch', 'track'];
function buildQbar(el) {
  qbarFor = el.id;
  qbar.innerHTML = '';
  const b = (ic, label, title, fn) => {
    const x = h('button', { type: 'button', title, 'aria-label': title }, ic ? icon(ic) : null, label || null);
    x.addEventListener('click', (e) => { e.stopPropagation(); fn(x); });
    qbar.appendChild(x);
    return x;
  };
  const sep = () => qbar.appendChild(h('span', { class: 'sep' }));
  if (el.type === 'text') b('edit', 'اكتب', 'تعديل النص', () => inlineEdit(el));
  if (el.type === 'image' || el.type === 'device') b('image', 'صورة', 'تغيير الصورة', () => pickImage((src) => { el.src = src; syncImages(); commit(); emit('edit', 'render', 'select'); }));
  b('smaller', null, 'أصغر', () => scaleEl(el, 0.9));
  b('bigger', null, 'أكبر', () => scaleEl(el, 1.1));
  const ck = COLOR_KEY[el.type];
  if (ck) {
    const th = resolveTheme(S.project);
    const cur = typeof el[ck] === 'string' ? el[ck] : '@accent';
    const dot = h('span', { class: 'dot', style: { background: cur[0] === '@' ? th.c[cur.slice(1).split('/')[0]] || '#888' : cur } });
    const x = b(null, null, 'اللون', () => {
      const order = ['@fg', '@accent', '@secondary', '@muted', '@ink', '@bg', '#FFFFFF', '#FF4D5E', '#4CC9F0', '#FFC65C'];
      const i = order.indexOf(typeof el[ck] === 'string' ? el[ck] : '');
      el[ck] = order[(i + 1) % order.length];
      const v = el[ck];
      dot.style.background = v[0] === '@' ? th.c[v.slice(1)] : v;
      requestRender(); emit('edit');
      clearTimeout(buildQbar.t); buildQbar.t = setTimeout(() => { commit(); emit('select'); }, 500);
    });
    x.appendChild(dot);
  }
  sep();
  b('dice', 'حركة', 'حركة دخول عشوائية', () => {
    const a = (el.anim = el.anim || {});
    let n = a.in;
    while (n === a.in) n = FUN_IN[Math.floor(Math.random() * FUN_IN.length)];
    a.in = n;
    a.ease = 'auto';
    if (el.type === 'text' && n !== 'glitch' && n !== 'track') a.split = a.split && a.split !== 'none' ? a.split : 'word';
    commit();
    emit('edit', 'select');
    const st = sceneStart(S.sceneIdx) + Math.max(0, (a.start ?? 0) - 0.15);
    S.time = st; S.playing = true; emit('play', 'time');
    const stop = st + (a.dur ?? 0.7) + 1.2;
    const chk = () => { if (!S.playing) return; if (S.time >= stop) { S.playing = false; emit('play'); return; } requestAnimationFrame(chk); };
    requestAnimationFrame(chk);
  });
  b('copy', null, 'نسخ', () => import('./inspector.js').then((m) => m.duplicateEl(el)));
  b('trash', null, 'حذف', () => import('./inspector.js').then((m) => m.deleteEl(el)));
}
function scaleEl(el, k) {
  const keys = SIZE_KEYS[el.type] || ['w', 'h'];
  for (const kk of keys) el[kk] = +((el[kk] ?? DEFAULT_SIZE[kk] ?? 100) * k).toFixed(1);
  requestRender();
  emit('edit');
  clearTimeout(scaleEl.t);
  scaleEl.t = setTimeout(() => { commit(); emit('select'); }, 400);
}

function hit(px, py) {
  const k = cssW / canvas.width;
  const p = new DOMPoint(px / k, py / k);
  const hits = [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const bx = boxes[i];
    const el = (scene().elements || []).find((e) => e.id === bx.id);
    if (!el || el.locked) continue;
    let q;
    try { q = bx.m.inverse().transformPoint(p); } catch (e) { continue; }
    const sc = Math.hypot(bx.m.a, bx.m.b) * k;
    const tol = 6 / Math.max(0.01, sc);
    if (Math.abs(q.x - bx.b.bx) <= bx.b.w / 2 + tol && Math.abs(q.y - bx.b.by) <= bx.b.h / 2 + tol) hits.push(el);
  }
  const solid = hits.find((e) => e.type !== 'glow' && e.type !== 'particles');
  return solid || hits[0] || null;
}

// ---------------------------------------------------------------- pointer
function local(e) {
  const r = inner.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function bindPointer() {
  let drag = null;
  overlay.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const [x, y] = local(e);
    const handle = e.target.dataset && e.target.dataset.h;
    if (S.playing) { S.playing = false; emit('play'); }
    if (handle && selected()) {
      const el = selected();
      const bx = boxes.find((b) => b.id === el.id);
      const r = cssRect(bx);
      drag = { mode: handle, el, r, x0: x, y0: y, orig: JSON.parse(JSON.stringify(el)) };
      overlay.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    const el = hit(x, y);
    if (!el) {
      if (S.selId) { S.selId = null; emit('select'); }
      return;
    }
    if (el.id !== S.selId) { S.selId = el.id; emit('select'); }
    const bx = boxes.find((b) => b.id === el.id);
    drag = { mode: 'move', el, x0: x, y0: y, ex: el.x ?? 0.5, ey: el.y ?? 0.5, sc: bx ? Math.hypot(bx.m.a, bx.m.b) : 1, moved: false };
    overlay.setPointerCapture(e.pointerId);
  });
  overlay.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (!drag) {
      const el = hit(x, y);
      const bx = el && el.id !== S.selId && boxes.find((b) => b.id === el.id);
      hovBox.hidden = !bx;
      if (bx) { hovBox.dataset.ptr = '1'; place(hovBox, cssRect(bx)); } else delete hovBox.dataset.ptr;
      overlay.style.cursor = el ? 'move' : 'default';
      return;
    }
    const [W, H] = dims();
    const k = cssW / canvas.width;
    const el = drag.el;
    if (drag.mode === 'move') {
      const dx = (x - drag.x0) / k / drag.sc, dy = (y - drag.y0) / k / drag.sc;
      if (Math.abs(x - drag.x0) + Math.abs(y - drag.y0) > 2) drag.moved = true;
      let nx = drag.ex + dx / W, ny = drag.ey + dy / H;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) ny = drag.ey; else nx = drag.ex; }
      const snapX = Math.abs(nx - 0.5) < 0.012, snapY = Math.abs(ny - 0.5) < 0.012;
      if (snapX) nx = 0.5;
      if (snapY) ny = 0.5;
      gV.hidden = !snapX;
      gH.hidden = !snapY;
      gV.style.left = cssW / 2 + 'px';
      gH.style.top = cssH / 2 + 'px';
      el.x = +nx.toFixed(4);
      el.y = +ny.toFixed(4);
      requestRender();
      emit('elmove');
    } else if (drag.mode === 'br' || drag.mode === 'tl') {
      const d0 = Math.hypot(drag.x0 - drag.r.cx, drag.y0 - drag.r.cy);
      const d1 = Math.hypot(x - drag.r.cx, y - drag.r.cy);
      const ratio = clamp(d1 / Math.max(4, d0), 0.05, 20);
      const keys = SIZE_KEYS[el.type] || ['w', 'h'];
      for (const kk of keys) {
        const base = drag.orig[kk] ?? DEFAULT_SIZE[kk] ?? 100;
        el[kk] = +(base * ratio).toFixed(1);
      }
      requestRender();
      emit('elmove');
    } else if (drag.mode === 'rot') {
      let ang = (Math.atan2(y - drag.r.cy, x - drag.r.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      else if (Math.abs(((ang % 90) + 90) % 90) < 3) ang = Math.round(ang / 90) * 90;
      el.rot = +(((ang + 540) % 360) - 180).toFixed(1);
      requestRender();
      emit('elmove');
    }
  });
  const end = () => {
    if (!drag) return;
    gV.hidden = gH.hidden = true;
    const moved = drag.mode !== 'move' || drag.moved;
    drag = null;
    if (moved) { commit(); emit('edit'); }
  };
  overlay.addEventListener('pointerup', end);
  overlay.addEventListener('pointercancel', end);
  overlay.addEventListener('pointerleave', () => { delete hovBox.dataset.ptr; hovBox.hidden = true; placeHl(); });
  overlay.addEventListener('dblclick', (e) => {
    const [x, y] = local(e);
    const el = hit(x, y);
    if (!el) return;
    S.selId = el.id;
    emit('select');
    if (el.type === 'text') inlineEdit(el);
    else if (el.type === 'image' || el.type === 'device') pickImage((src) => { el.src = src; syncImages(); commit(); emit('edit', 'render', 'select'); });
    else emit('focusContent');
  });
}

// ---------------------------------------------------------------- inline text editing
export function inlineEdit(el) {
  requestRender();
  draw();
  const bx = boxes.find((b) => b.id === el.id);
  if (!bx) return;
  const r = cssRect(bx);
  const before = el.text;
  const ta = h('textarea', { class: 'inline-edit', dir: 'auto' });
  ta.value = el.text || '';
  const fs = clamp((el.size ?? 80) * unitFor(...dims()) * r.scale, 13, 34);
  Object.assign(ta.style, {
    left: Math.max(4, r.cx - Math.max(r.w, 220) / 2) + 'px',
    top: Math.max(4, r.cy - Math.max(r.h, 60) / 2) + 'px',
    width: Math.min(cssW - 8, Math.max(r.w, 220)) + 'px',
    height: Math.max(r.h, 60) + 'px',
    fontSize: fs + 'px',
  });
  inner.appendChild(ta);
  qbar.hidden = true;
  ta.focus();
  ta.select();
  ta.addEventListener('input', () => { el.text = ta.value; requestRender(); });
  const done = (keep) => {
    if (!ta.isConnected) return;
    if (!keep) el.text = before;
    ta.remove();
    requestRender();
    if (keep && el.text !== before) { commit(); emit('edit', 'select'); }
  };
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); done(false); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(true); }
    e.stopPropagation();
  });
  ta.addEventListener('blur', () => done(true));
}

export function goToScene(i, { hold = true } = {}) {
  S.sceneIdx = clamp(i, 0, S.project.scenes.length - 1);
  const sc = scene();
  const [W, H] = dims();
  S.time = sceneStart(S.sceneIdx) + (hold ? holdTime(sc, makeEnv(W, H, 0.2)) : 0);
  emit('scene', 'time', 'render');
}

export function snapshotPNG() {
  const [W, H] = dims();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const env = makeEnv(W, H, 1);
  renderFrame(c.getContext('2d'), S.project, S.time, env);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
