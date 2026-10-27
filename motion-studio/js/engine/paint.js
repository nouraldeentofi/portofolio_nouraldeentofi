// Fill, shadow and glass helpers shared by element renderers.
import { color } from './themes.js';
import { rgba, TAU, makeCanvas, roundRectPath } from './util.js';

// fill spec: '@token' | '#hex' | {g:'linear'|'radial', colors:[...], angle}
export function fillStyle(ctx, spec, theme, w, h, fallback = '@accent') {
  if (spec && typeof spec === 'object') {
    const cs = (spec.colors || ['@accent', '@secondary']).map((c) => color(c, theme));
    let g;
    if (spec.g === 'radial') {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.6);
    } else {
      const a = ((spec.angle ?? 135) * Math.PI) / 180;
      const dx = Math.sin(a) * w * 0.5, dy = -Math.cos(a) * h * 0.5;
      g = ctx.createLinearGradient(-dx, -dy, dx, dy);
    }
    cs.forEach((c, i) => g.addColorStop(i / Math.max(1, cs.length - 1), c));
    return g;
  }
  return color(spec || fallback, theme);
}

// Dual soft shadow (brand rule): one tight, one wide. Draws only the shadow.
export function softShadow(ctx, env, pathFn, strength = 1, tint = null) {
  if (strength <= 0) return;
  const U = env.U, px = env.px;
  const far = 20000;
  const base = tint || (env.theme.dark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,32,0.14)');
  const m = ctx.getTransform();
  ctx.save();
  ctx.setTransform(m);
  ctx.translate(far, 0);
  pathFn();
  ctx.fillStyle = '#000';
  // the offset is in device pixels, so map the far translation through the transform
  const ox = -far * m.a, oy = -far * m.b;
  ctx.shadowColor = rgba(base, 0.7 * strength);
  ctx.shadowBlur = 5 * U * px;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy + 2 * U * px;
  ctx.fill();
  ctx.shadowColor = rgba(base, strength);
  ctx.shadowBlur = 48 * U * px;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy + 18 * U * px;
  ctx.fill();
  ctx.restore();
}

// Blur a drawing cheaply: render it into a small scratch canvas, blur that, then blit.
// (A filter on the main canvas re-filters a full-size layer per draw call.)
const pool = [];
let depth = 0;
function poolPair(w, h) {
  let p = pool[depth];
  if (!p) p = pool[depth] = [makeCanvas(w, h), makeCanvas(w, h)];
  for (let i = 0; i < 2; i++) if (p[i].width < w || p[i].height < h) p[i] = makeCanvas(Math.max(w, p[i].width), Math.max(h, p[i].height));
  return p;
}
export function withBlur(ctx, env, blurU, w, h, drawFn) {
  const bpx = blurU * env.U * env.px;
  if (bpx < 0.5) { drawFn(ctx); return; }
  const m = ctx.getTransform();
  const xs = [], ys = [];
  for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
    xs.push(m.a * x + m.c * y + m.e);
    ys.push(m.b * x + m.d * y + m.f);
  }
  const mg = bpx * 2.5 + 2;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const x0 = Math.max(-mg, Math.floor(Math.min(...xs) - mg)), y0 = Math.max(-mg, Math.floor(Math.min(...ys) - mg));
  const x1 = Math.min(cw + mg, Math.ceil(Math.max(...xs) + mg)), y1 = Math.min(ch + mg, Math.ceil(Math.max(...ys) + mg));
  const bw = Math.ceil(x1 - x0), bh = Math.ceil(y1 - y0);
  if (bw <= 1 || bh <= 1) return;
  const [A, B] = poolPair(bw, bh);
  const a = A.getContext('2d'), b = B.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.clearRect(0, 0, bw, bh);
  a.globalAlpha = 1;
  a.globalCompositeOperation = 'source-over';
  a.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
  depth++;
  try { drawFn(a); } finally { depth--; }
  const k = bpx > 10 ? 0.5 : 1;
  const dw = Math.max(1, Math.ceil(bw * k)), dh = Math.max(1, Math.ceil(bh * k));
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, dw, dh);
  b.filter = `blur(${(bpx * k).toFixed(1)}px)`;
  b.drawImage(A, 0, 0, bw, bh, 0, 0, dw, dh);
  b.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(B, 0, 0, dw, dh, x0, y0, bw, bh);
  ctx.restore();
}

// Frosted glass: blur only the region under the panel, then tint + rim light.
let scratch = null;
function scratchPair(w, h) {
  if (!scratch) scratch = [makeCanvas(w, h), makeCanvas(w, h)];
  for (let i = 0; i < 2; i++) if (scratch[i].width < w || scratch[i].height < h) scratch[i] = makeCanvas(Math.max(w, scratch[i].width), Math.max(h, scratch[i].height));
  return scratch;
}
export function glass(ctx, env, pathFn, w, h, opts = {}) {
  const th = env.theme;
  const blur = opts.blur ?? 22;
  if (blur > 0 && env.backdrop !== false) {
    const m = ctx.getTransform();
    const br = blur * env.U * env.px;
    const xs = [], ys = [];
    for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
      xs.push(m.a * x + m.c * y + m.e);
      ys.push(m.b * x + m.d * y + m.f);
    }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - br * 2)), y0 = Math.max(0, Math.floor(Math.min(...ys) - br * 2));
    const x1 = Math.min(cw, Math.ceil(Math.max(...xs) + br * 2)), y1 = Math.min(ch, Math.ceil(Math.max(...ys) + br * 2));
    const sw = x1 - x0, sh = y1 - y0;
    if (sw > 2 && sh > 2) {
      // blur at reduced resolution: the result is soft anyway, the cost drops ~4-9x
      const k = br > 12 ? 0.34 : br > 5 ? 0.5 : 1;
      const dw = Math.max(1, Math.ceil(sw * k)), dh = Math.max(1, Math.ceil(sh * k));
      const [sc, sb] = scratchPair(dw, dh);
      const sctx = sc.getContext('2d'), bctx = sb.getContext('2d');
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, dw, dh);
      try { sctx.drawImage(ctx.canvas, x0, y0, sw, sh, 0, 0, dw, dh); } catch (e) { /* ignore */ }
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, dw, dh);
      bctx.filter = `blur(${(br * k).toFixed(1)}px)`;
      bctx.drawImage(sc, 0, 0, dw, dh, 0, 0, dw, dh);
      bctx.filter = 'none';
      ctx.save();
      pathFn();
      ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(sb, 0, 0, dw, dh, x0, y0, sw, sh);
      ctx.restore();
    }
  }
  pathFn();
  ctx.fillStyle = opts.tint ? color(opts.tint, th) : rgba(th.c.card, th.dark ? 0.62 : 0.66);
  ctx.fill();
  // top sheen
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, th.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  pathFn();
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.6 * env.U);
  ctx.strokeStyle = th.dark ? 'rgba(255,255,255,0.13)' : 'rgba(16,24,32,0.10)';
  pathFn();
  ctx.stroke();
}

// Cached dual shadow for rounded boxes (cards, windows, devices): rendered once, then reused.
const shadowCache = new Map();
export function boxShadow(ctx, env, w, h, r, strength = 1) {
  if (strength <= 0) return;
  const px = env.px, U = env.U;
  const key = [Math.round(w), Math.round(h), Math.round(r), px.toFixed(3), env.theme.dark ? 1 : 0, strength].join('|');
  let c = shadowCache.get(key);
  const pad = 70 * U;
  if (!c) {
    if (shadowCache.size > 80) shadowCache.clear();
    c = makeCanvas((w + pad * 2) * px, (h + pad * 2) * px);
    const s = c.getContext('2d');
    s.setTransform(px, 0, 0, px, (w / 2 + pad) * px, (h / 2 + pad) * px);
    softShadow(s, env, () => roundRectPath(s, -w / 2, -h / 2, w, h, r), strength);
    shadowCache.set(key, c);
  }
  ctx.drawImage(c, -w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
}

export function glowBlob(ctx, x, y, r, col, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, alpha));
  g.addColorStop(0.45, rgba(col, alpha * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
