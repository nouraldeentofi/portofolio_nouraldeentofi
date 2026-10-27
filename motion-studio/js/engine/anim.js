// Motion presets. Every preset writes into a transform record `tr`.
// Distances are in design units (U = 1/1000 of the frame's short side).
import { clamp, ease, sr, smoothstep, TAU, noise2 } from './util.js';

export const identity = () => ({
  dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1, blur: 0, skx: 0, ox: 0, oy: 0,
  clip: null, cdx: 0, cdy: 0, draw: 1, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1, glow: 1, reveal: 1,
});

const A = (p, k = 1.6) => clamp(p * k);

// name: [arabic label, default ease, fn(tr, p, d, unit, raw)]
export const IN = {
  none: ['بدون', 'linear', () => {}],
  fade: ['ظهور', 'cubicOut', (t, p) => { t.alpha = p; }],
  rise: ['صعود', 'expoOut', (t, p, d) => { t.dy = d * 70; t.alpha = A(p); }],
  riseSoft: ['صعود ناعم', 'brand', (t, p, d) => { t.dy = d * 26; t.alpha = A(p, 1.3); }],
  riseBlur: ['صعود + ضباب', 'expoOut', (t, p, d) => { t.dy = d * 60; t.blur = d * 18; t.alpha = A(p, 1.4); }],
  drop: ['نزول', 'expoOut', (t, p, d) => { t.dy = -d * 70; t.alpha = A(p); }],
  slideL: ['من اليسار', 'expoOut', (t, p, d) => { t.dx = -d * 170; t.alpha = A(p); }],
  slideR: ['من اليمين', 'expoOut', (t, p, d) => { t.dx = d * 170; t.alpha = A(p); }],
  blurSlideL: ['انزلاق ضبابي ←', 'expoOut', (t, p, d) => { t.dx = -d * 120; t.blur = d * 20; t.alpha = A(p, 1.3); }],
  blurSlideR: ['انزلاق ضبابي →', 'expoOut', (t, p, d) => { t.dx = d * 120; t.blur = d * 20; t.alpha = A(p, 1.3); }],
  pop: ['قفزة', 'backOut', (t, p) => { const s = 0.3 + 0.7 * p; t.sx = t.sy = s; t.alpha = A(p, 3); }],
  popRotate: ['قفزة مع دوران', 'backOut', (t, p, d) => { const s = 0.3 + 0.7 * p; t.sx = t.sy = s; t.rot = -d * 0.35; t.alpha = A(p, 3); }],
  zoomIn: ['تقريب', 'expoOut', (t, p, d) => { const s = 1 + d * 0.9; t.sx = t.sy = s; t.blur = d * 22; t.alpha = A(p, 1.4); }],
  zoomOut: ['تكبير من صغير', 'expoOut', (t, p, d) => { const s = 1 - d * 0.55; t.sx = t.sy = s; t.alpha = A(p, 1.6); }],
  slam: ['ضربة', 'expoOut', (t, p, d) => { const s = 1 + d * 2.4; t.sx = t.sy = s; t.alpha = A(p, 2.2); t.blur = d * 10; }],
  blurIn: ['ضباب', 'cubicOut', (t, p, d) => { t.blur = d * 30; t.alpha = A(p, 1.2); const s = 1 + d * 0.06; t.sx = t.sy = s; }],
  pushIn: ['دفع سينمائي', 'quintOut', (t, p, d) => { const s = 1 - d * 0.14; t.sx = t.sy = s; t.dy = d * 34; t.blur = d * 9; t.alpha = A(p, 1.5); }],
  flipX: ['قلب أفقي', 'expoOut', (t, p, d) => { t.sy = Math.max(0.02, Math.cos(d * Math.PI * 0.5)); t.dy = d * 20; t.alpha = A(p, 2); }],
  flipY: ['قلب عمودي', 'expoOut', (t, p, d) => { t.sx = Math.max(0.02, Math.cos(d * Math.PI * 0.5)); t.alpha = A(p, 2); }],
  tilt: ['ميلان ثلاثي', 'quintOut', (t, p, d) => { t.rot = d * 0.18; t.sy = 1 - d * 0.2; t.sx = 1 - d * 0.08; t.dy = d * 50; t.skx = -d * 0.25; t.blur = d * 6; t.alpha = A(p, 1.6); }],
  swing: ['تأرجح', 'backOut', (t, p, d) => { t.rot = -d * 0.6; t.oy = -0.5; t.alpha = A(p, 2); }],
  spin: ['لفّة', 'expoOut', (t, p, d) => { t.rot = -d * Math.PI * 1.2; const s = 0.2 + 0.8 * p; t.sx = t.sy = s; t.alpha = A(p, 2); }],
  zoomRot: ['تقريب مع دوران', 'expoOut', (t, p, d) => { const s = 1 + d * 1.2; t.sx = t.sy = s; t.rot = d * 0.5; t.blur = d * 14; t.alpha = A(p, 1.6); }],
  stretch: ['مطّ', 'expoOut', (t, p, d) => { t.sx = 1 + d * 0.9; t.sy = 1 - d * 0.7; t.alpha = A(p, 1.6); t.blur = d * 8; }],
  skew: ['انحراف', 'expoOut', (t, p, d) => { t.skx = d * 0.7; t.dx = d * 130; t.alpha = A(p, 1.6); }],
  elastic: ['مطاطي', 'elasticOut', (t, p) => { const s = Math.max(0, p); t.sx = t.sy = s; t.alpha = A(p, 4); }],
  bounce: ['ارتداد', 'bounceOut', (t, p, d) => { t.dy = -d * 260; t.alpha = A(p, 4); }],
  wave: ['موجة', 'backOutSoft', (t, p, d) => { t.dy = d * 56; t.alpha = A(p, 2); }],
  letterDrop: ['سقوط', 'backOutSoft', (t, p, d, u) => { t.dy = -d * 140; t.rot = d * (u ? (sr(u.i + 1) - 0.5) * 1.2 : 0.4); t.alpha = A(p, 2); }],
  scatter: ['تجمّع', 'expoOut', (t, p, d, u) => {
    const i = u ? u.i : 0;
    t.dx = (sr(i * 3.1 + 1) - 0.5) * d * 520; t.dy = (sr(i * 7.3 + 2) - 0.5) * d * 520;
    t.rot = (sr(i * 1.7 + 3) - 0.5) * d * 2.4; t.blur = d * 10; t.alpha = A(p, 1.4);
  }],
  rollIn: ['دحرجة', 'expoOut', (t, p, d) => { t.dx = -d * 260; t.rot = -d * TAU; t.alpha = A(p, 2); }],
  maskUp: ['كشف من تحت', 'expoOut', (t, p, d, u) => { t.dy = t.cdy = d * ((u && u.h) || 100) * 1.08; t.clip = 'self'; }],
  maskDown: ['كشف من فوق', 'expoOut', (t, p, d, u) => { t.dy = t.cdy = -d * ((u && u.h) || 100) * 1.08; t.clip = 'self'; }],
  maskLeft: ['كشف جانبي ←', 'expoOut', (t, p, d, u) => { t.dx = t.cdx = -d * ((u && u.w) || 200) * 1.02; t.clip = 'self'; }],
  maskRight: ['كشف جانبي →', 'expoOut', (t, p, d, u) => { t.dx = t.cdx = d * ((u && u.w) || 200) * 1.02; t.clip = 'self'; }],
  wipeR: ['مسح ←→', 'quintOut', (t, p) => { t.clip = 'wipeR'; t.reveal = p; }],
  wipeL: ['مسح →←', 'quintOut', (t, p) => { t.clip = 'wipeL'; t.reveal = p; }],
  wipeUp: ['مسح للأعلى', 'quintOut', (t, p) => { t.clip = 'wipeU'; t.reveal = p; }],
  wipeDown: ['مسح للأسفل', 'quintOut', (t, p) => { t.clip = 'wipeD'; t.reveal = p; }],
  iris: ['دائرة', 'quintOut', (t, p) => { t.clip = 'iris'; t.reveal = p; }],
  grow: ['نمو أفقي', 'expoOut', (t, p) => { t.sx = Math.max(0.0001, p); t.ox = -0.5; }],
  growC: ['نمو من الوسط', 'expoOut', (t, p) => { t.sx = Math.max(0.0001, p); }],
  growY: ['نمو للأعلى', 'expoOut', (t, p) => { t.sy = Math.max(0.0001, p); t.oy = 0.5; }],
  unfold: ['انفتاح', 'expoOut', (t, p) => { t.sy = Math.max(0.0001, p); t.oy = -0.5; t.alpha = A(p, 3); }],
  draw: ['رسم', 'smooth', (t, p) => { t.draw = p; }],
  typewriter: ['آلة كاتبة', 'linear', (t, p) => { t.type = p; }],
  scramble: ['فك تشفير', 'linear', (t, p) => { t.scramble = p; t.alpha = A(p, 6); }],
  glitch: ['قلتش', 'linear', (t, p, d, u, raw) => {
    const k = Math.floor(raw * 22);
    t.glitch = d;
    t.dx = (sr(k * 13.7 + 1) - 0.5) * d * 80;
    t.alpha = raw >= 1 ? 1 : sr(k * 7.1) > 0.35 ? 1 : 0.15;
  }],
  flicker: ['وميض نيون', 'linear', (t, p, d, u, raw) => {
    const k = Math.floor(raw * 16);
    t.alpha = raw >= 1 ? 1 : raw < 0.15 ? 0 : sr(k * 5.3 + 2) > 0.45 ? 1 : 0.1;
  }],
  track: ['تباعد سينمائي', 'quintOut', (t, p, d) => { t.track = d * 0.45; t.blur = d * 12; t.alpha = A(p, 1.2); }],
};

// exits: reuse an entrance, played backwards; flip mirrors the travel direction
export const OUT = {
  none: ['بدون', null, false],
  fade: ['اختفاء', 'fade', false],
  rise: ['خروج للأعلى', 'drop', false],
  sink: ['خروج للأسفل', 'rise', false],
  riseBlur: ['صعود ضبابي', 'riseBlur', true],
  slideL: ['خروج يسار', 'slideL', false],
  slideR: ['خروج يمين', 'slideR', false],
  zoomIn: ['تقريب للخارج', 'zoomIn', false],
  zoomOut: ['تصغير', 'zoomOut', false],
  blurOut: ['ضباب', 'blurIn', false],
  pop: ['انكماش', 'pop', false],
  maskUp: ['إخفاء للأعلى', 'maskUp', true],
  maskDown: ['إخفاء للأسفل', 'maskUp', false],
  wipe: ['مسح', 'wipeR', false],
  glitch: ['قلتش', 'glitch', false],
  spin: ['لفّة', 'spin', false],
  stretch: ['مطّ', 'stretch', false],
};

// loops run after the entrance settles
export const LOOP = {
  none: ['بدون', null],
  float: ['طفو', (t, time, a, ph) => { t.dy += Math.sin((time / 3.2) * TAU + ph) * 10 * a; }],
  drift: ['انجراف', (t, time, a, ph) => { t.dx += Math.sin(time / 4 + ph) * 14 * a; t.dy += Math.cos(time / 5 + ph) * 9 * a; }],
  pulse: ['نبض', (t, time, a, ph) => { const s = 1 + 0.035 * a * Math.sin((time / 1.6) * TAU + ph); t.sx *= s; t.sy *= s; }],
  heartbeat: ['نبضة قلب', (t, time, a) => {
    const f = (time % 1.4) / 1.4;
    const k = Math.exp(-Math.pow((f - 0.1) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((f - 0.3) / 0.05, 2));
    const s = 1 + 0.07 * a * k; t.sx *= s; t.sy *= s;
  }],
  breathe: ['تنفس', (t, time, a, ph) => { t.alpha *= 1 - 0.28 * a * (0.5 + 0.5 * Math.sin((time / 2.4) * TAU + ph)); }],
  spin: ['دوران', (t, time, a) => { t.rot += time * 0.9 * a; }],
  spinSlow: ['دوران بطيء', (t, time, a) => { t.rot += time * 0.18 * a; }],
  wiggle: ['اهتزاز', (t, time, a, ph) => { t.rot += 0.06 * a * Math.sin((time / 0.7) * TAU + ph); }],
  sway: ['تمايل', (t, time, a, ph) => { t.rot += 0.045 * a * Math.sin((time / 3) * TAU + ph); t.dx += 5 * a * Math.sin((time / 3) * TAU + ph); }],
  orbit: ['مدار', (t, time, a, ph) => { t.dx += Math.cos(time * 1.2 + ph) * 18 * a; t.dy += Math.sin(time * 1.2 + ph) * 18 * a; }],
  jelly: ['جيلي', (t, time, a, ph) => { const k = Math.sin((time / 0.9) * TAU + ph) * 0.035 * a; t.sx *= 1 + k; t.sy *= 1 - k; }],
  shake: ['ارتجاف', (t, time, a) => { t.dx += (noise2(time * 9, 1.3) - 0.5) * 10 * a; t.dy += (noise2(time * 9, 7.1) - 0.5) * 10 * a; }],
  blink: ['رمش', (t, time) => { t.alpha *= time % 1 < 0.55 ? 1 : 0; }],
  glow: ['توهج', (t, time, a, ph) => { t.glow *= 1 + 0.6 * a * (0.5 + 0.5 * Math.sin((time / 1.8) * TAU + ph)); }],
  shimmer: ['لمعة', (t, time) => { t.shimmer = (time * 0.45) % 1.7; }],
  waveText: ['موج الحروف', (t, time, a, ph, u) => { if (u) t.dy += Math.sin(time * 4 - u.i * 0.55) * 9 * a; }, true],
};

export const IN_NAMES = Object.keys(IN);
export const OUT_NAMES = Object.keys(OUT);
export const LOOP_NAMES = Object.keys(LOOP);

function compose(a, b) {
  a.dx += b.dx; a.dy += b.dy; a.sx *= b.sx; a.sy *= b.sy; a.rot += b.rot; a.alpha *= b.alpha;
  a.blur += b.blur; a.skx += b.skx; a.cdx += b.cdx; a.cdy += b.cdy; a.glitch = Math.max(a.glitch, b.glitch); a.track += b.track;
  if (b.clip && !a.clip) { a.clip = b.clip; a.reveal = b.reveal; } else if (b.clip === a.clip && b.clip) a.reveal = Math.min(a.reveal, b.reveal);
  if (b.ox) a.ox = b.ox;
  if (b.oy) a.oy = b.oy;
  a.draw = Math.min(a.draw, b.draw);
  a.type = Math.min(a.type, b.type);
  a.scramble = Math.min(a.scramble, b.scramble);
  return a;
}

export function inWindow(anim, nUnits = 1) {
  const a = anim || {};
  const start = a.start ?? 0;
  const dur = a.dur ?? 0.7;
  const stag = nUnits > 1 ? (a.stagger ?? 0.05) * (nUnits - 1) : 0;
  return { start, end: start + dur + stag };
}

// Entrance + exit for one unit (or the whole element when unit is null).
export function unitTransform(anim, time, sceneDur, unit) {
  const a = anim || {};
  const tr = identity();
  const i = unit ? unit.i : 0;
  const start = (a.start ?? 0) + i * (a.stagger ?? 0.05);
  const dur = a.dur ?? 0.7;
  const raw = dur > 0 ? clamp((time - start) / dur) : time >= start ? 1 : 0;
  const pre = IN[a.in || 'none'] || IN.none;
  const en = !a.ease || a.ease === 'auto' ? pre[1] : a.ease;
  const p = ease(en, raw);
  pre[2](tr, p, 1 - p, unit, raw);
  if (a.in === 'typewriter' || a.in === 'scramble') tr[a.in === 'typewriter' ? 'type' : 'scramble'] = raw;

  const outName = a.out || 'none';
  if (outName !== 'none' && OUT[outName]) {
    const od = a.outDur ?? 0.45;
    const n = unit ? unit.n : 1;
    const ost = a.outStagger ?? 0;
    const os = sceneDur - od - 0.02 - ost * (n - 1) + i * ost;
    const q = clamp((time - os) / od);
    if (q > 0) {
      const ref = IN[OUT[outName][1]];
      const tq = identity();
      const pe = 1 - ease('cubicIn', q);
      ref[2](tq, pe, 1 - pe, unit, 1 - q);
      if (OUT[outName][2]) { tq.dx = -tq.dx; tq.dy = -tq.dy; tq.cdx = -tq.cdx; tq.cdy = -tq.cdy; }
      compose(tr, tq);
    }
  }
  return { tr, raw };
}

// Loops are layered on top after the entrance; amplitude eases in.
export function applyLoop(tr, anim, time, unit, perUnitPass) {
  const a = anim || {};
  const L = LOOP[a.loop || 'none'];
  if (!L || !L[1]) return tr;
  const isPerUnit = !!L[2];
  if (isPerUnit !== !!perUnitPass) return tr;
  const w = inWindow(a, unit ? unit.n : 1);
  const amp = (a.loopAmp ?? 1) * smoothstep(w.end - 0.2, w.end + 0.5, time);
  const spd = a.loopSpeed ?? 1;
  const lt = Math.max(0, time - w.end + 0.2) * spd;
  const ph = (a.phase ?? 0) + (unit ? unit.i * 0.3 : 0);
  if (a.loop === 'blink' || a.loop === 'shimmer' || a.loop === 'spin' || a.loop === 'spinSlow') L[1](tr, lt, a.loopAmp ?? 1, ph, unit);
  else L[1](tr, time * spd, amp, ph, unit);
  return tr;
}

// Applies a transform to the context around the unit's centre (cx, cy) with size (w, h) in px.
export function applyTransform(ctx, tr, cx, cy, w, h, U) {
  ctx.translate(cx + tr.dx * U, cy + tr.dy * U);
  const px = tr.ox * w, py = tr.oy * h;
  if (px || py) ctx.translate(px, py);
  if (tr.rot) ctx.rotate(tr.rot);
  if (tr.skx) ctx.transform(1, 0, Math.tan(tr.skx), 1, 0, 0);
  if (tr.sx !== 1 || tr.sy !== 1) ctx.scale(tr.sx || 0.0001, tr.sy || 0.0001);
  if (px || py) ctx.translate(-px, -py);
}

// Clip for mask / wipe / iris reveals, in local (centred) coordinates.
export function applyClip(ctx, tr, w, h, U) {
  if (!tr.clip) return;
  const pad = 0.04 * h;
  ctx.beginPath();
  const r = tr.reveal;
  switch (tr.clip) {
    case 'self': {
      // undo the travel so the window stays put while content slides through
      const dx = tr.cdx * U, dy = tr.cdy * U;
      ctx.rect(-w / 2 - pad * 6 - dx, -h / 2 - pad - dy, w + pad * 12, h + pad * 2);
      break;
    }
    case 'wipeR': ctx.rect(-w / 2 - pad, -h / 2 - pad, (w + pad * 2) * r, h + pad * 2); break;
    case 'wipeL': ctx.rect(w / 2 + pad - (w + pad * 2) * r, -h / 2 - pad, (w + pad * 2) * r, h + pad * 2); break;
    case 'wipeU': ctx.rect(-w / 2 - pad, h / 2 + pad - (h + pad * 2) * r, w + pad * 2, (h + pad * 2) * r); break;
    case 'wipeD': ctx.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, (h + pad * 2) * r); break;
    case 'iris': ctx.arc(0, 0, Math.hypot(w, h) * 0.55 * r + 0.01, 0, TAU); break;
    default: ctx.rect(-1e5, -1e5, 2e5, 2e5);
  }
  ctx.clip();
}
