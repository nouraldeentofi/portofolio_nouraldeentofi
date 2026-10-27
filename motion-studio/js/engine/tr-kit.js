// Shared helpers for transitions: pooled buffers, reduced-resolution blur, shape paths, mask reveals.
import { TAU, clamp, makeCanvas, sr, noise2 } from './util.js';

const pool = new Map();
// named scratch canvases, reused between frames
export function buf(name, w, h) {
  let c = pool.get(name);
  if (!c || c.width !== w || c.height !== h) { c = makeCanvas(w, h); pool.set(name, c); }
  return c;
}

export const DIRS = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
  upleft: [-0.7071, -0.7071], upright: [0.7071, -0.7071], downleft: [-0.7071, 0.7071], downright: [0.7071, 0.7071],
};
export const dirVec = (d) => DIRS[d] || DIRS.left;

export function drawAt(ctx, img, x, y, sx = 1, rot = 0, alpha = 1, cw, ch, sy = sx) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cw / 2 + x, ch / 2 + y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx || 0.0001, sy || 0.0001);
  ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
  ctx.restore();
}

// cheap soft shadow around a full-frame layer (shadowBlur on a full frame is slow in software canvas)
export function fakeShadow(ctx, x, y, w, h, spread, alpha = 0.5) {
  for (let i = 3; i >= 1; i--) {
    const g = spread * i / 3;
    ctx.fillStyle = `rgba(0,0,0,${(alpha / 3).toFixed(3)})`;
    ctx.fillRect(x - g, y - g * 0.6, w + g * 2, h + g * 1.6);
  }
}

// full-frame blur at quarter size; slot keeps two blurred frames alive at once
export function blurred(img, bpx, slot = 'a') {
  if (bpx < 0.6) return img;
  const k = 0.25;
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = buf('blur-' + slot, w, h);
  const x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  x.filter = `blur(${(bpx * k).toFixed(2)}px)`;
  x.drawImage(img, 0, 0, w, h);
  x.filter = 'none';
  return c;
}

// ---------------------------------------------------------------- shape paths (unit radius r)
export const SHAPE_REACH = { circle: 1.02, diamond: 1.42, star: 2.5, heart: 1.9, hexagon: 1.16, triangle: 2.1, square: 1.02, cross: 2.9, ring: 1.02, blob: 1.35, octagon: 1.09, pentagon: 1.3, squircle: 1.08 };

function poly(ctx, cx, cy, r, n, rot, inner = null) {
  const k = inner ? n * 2 : n;
  for (let i = 0; i < k; i++) {
    const a = rot - Math.PI / 2 + (i / k) * TAU;
    const rr = inner && i % 2 ? r * inner : r;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// adds a closed subpath (caller does beginPath / clip / fill)
export function shapePath(ctx, shape, cx, cy, r, rot = 0, t = 0) {
  r = Math.max(0.01, r);
  switch (shape) {
    case 'circle': case 'ring': ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); break;
    case 'diamond': poly(ctx, cx, cy, r, 4, rot); break;
    case 'square': poly(ctx, cx, cy, r * Math.SQRT2, 4, rot + Math.PI / 4); break;
    case 'hexagon': poly(ctx, cx, cy, r, 6, rot); break;
    case 'octagon': poly(ctx, cx, cy, r, 8, rot + Math.PI / 8); break;
    case 'pentagon': poly(ctx, cx, cy, r, 5, rot); break;
    case 'triangle': poly(ctx, cx, cy, r, 3, rot); break;
    case 'star': poly(ctx, cx, cy, r, 5, rot, 0.45); break;
    case 'squircle': {
      const s = r * 1.414, rr = s * 0.42;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.moveTo(-s + rr, -s);
      ctx.arcTo(s, -s, s, s, rr); ctx.arcTo(s, s, -s, s, rr); ctx.arcTo(-s, s, -s, -s, rr); ctx.arcTo(-s, -s, s, -s, rr);
      ctx.closePath(); ctx.restore();
      break;
    }
    case 'cross': {
      const w = r * 0.42;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      const pts = [[-w, -r], [w, -r], [w, -w], [r, -w], [r, w], [w, w], [w, r], [-w, r], [-w, w], [-r, w], [-r, -w], [-w, -w]];
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.restore();
      break;
    }
    case 'heart': {
      const s = r / 12;
      ctx.save(); ctx.translate(cx, cy + r * 0.12); ctx.rotate(rot); ctx.scale(s, s);
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-1, 9, -13, 1.5, -13, -5);
      ctx.bezierCurveTo(-13, -10, -9, -12.5, -6.5, -12.5);
      ctx.bezierCurveTo(-3.4, -12.5, -1, -10, 0, -7.5);
      ctx.bezierCurveTo(1, -10, 3.4, -12.5, 6.5, -12.5);
      ctx.bezierCurveTo(9, -12.5, 13, -10, 13, -5);
      ctx.bezierCurveTo(13, 1.5, 1, 9, 0, 10);
      ctx.closePath(); ctx.restore();
      break;
    }
    case 'blob': {
      const n = 48;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const k = 0.78 + 0.45 * noise2(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + t * 2, 3);
        const x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * k;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      break;
    }
    default: ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU);
  }
}

// ---------------------------------------------------------------- mask reveals (luma wipes)
// A field f(u, v) in 0..1 decides the order in which pixels switch from A to B.
const fieldCache = new Map();
function field(key, fn, mw, mh, aspect) {
  const k = key + '|' + mw + 'x' + mh + '|' + aspect.toFixed(3);
  let f = fieldCache.get(k);
  if (f) return f;
  if (fieldCache.size > 120) fieldCache.clear();
  f = new Float32Array(mw * mh);
  let mn = Infinity, mx = -Infinity;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const v = fn((x + 0.5) / mw, (y + 0.5) / mh, aspect, x, y);
    f[y * mw + x] = v;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const span = mx - mn || 1;
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - mn) / span;
  fieldCache.set(k, f);
  return f;
}

const idata = new Map();
function imgData(ctx, slot, w, h) {
  let d = idata.get(slot);
  if (!d || d.width !== w || d.height !== h) { d = ctx.createImageData(w, h); idata.set(slot, d); }
  return d;
}

// Draws A, then B where the field has been passed. Optional glowing edge (burn).
export function maskReveal(ctx, A, B, key, fn, e, opts = {}) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  if (e <= 0.0005) { ctx.drawImage(A, 0, 0); return; }
  if (e >= 0.9995) { ctx.drawImage(B, 0, 0); return; }
  // mask resolution follows the output size (about 1/3), so a nearest-neighbour upscale stays smooth;
  // smoothed upscales inside destination-in are very slow on software canvases
  const short = Math.min(cw, ch);
  const res = Math.round(Math.max(48, Math.min(short / 1.5, (short / 3) * ((opts.res || 150) / 150))));
  const aspect = cw / ch;
  const mw = Math.max(8, Math.round(aspect >= 1 ? res * aspect : res)), mh = Math.max(8, Math.round(aspect >= 1 ? res : res / aspect));
  const f = field(key, fn, mw, mh, aspect);
  const s = opts.soft ?? 0.08;
  const t = -s + (1 + 2 * s) * e;
  const m = buf('mask', mw, mh);
  const mctx = m.getContext('2d');
  const img = imgData(mctx, 'm', mw, mh);
  const d = img.data;
  const edge = opts.edge;
  let ed = null, eimg = null;
  if (edge) { eimg = imgData(mctx, 'e', mw, mh); ed = eimg.data; }
  const band = opts.band ?? 0.07;
  const inv = 1 / (2 * s);
  for (let i = 0, j = 0; i < f.length; i++, j += 4) {
    const a = clamp((t - f[i]) * inv + 0.5);
    d[j] = d[j + 1] = d[j + 2] = 255;
    d[j + 3] = a * 255;
    if (ed) {
      const dd = f[i] - t;
      const ea = dd > -s && dd < band ? 1 - Math.abs(dd) / band : 0;
      ed[j] = edge[0]; ed[j + 1] = edge[1]; ed[j + 2] = edge[2];
      ed[j + 3] = clamp(ea) * 255 * (e > 0.995 ? 0 : 1);
    }
  }
  mctx.putImageData(img, 0, 0);
  const tmp = buf('mask-b', cw, ch);
  const tctx = tmp.getContext('2d');
  tctx.globalCompositeOperation = 'copy';
  tctx.drawImage(B, 0, 0);
  tctx.globalCompositeOperation = 'destination-in';
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(m, 0, 0, mw, mh, 0, 0, cw, ch);
  tctx.imageSmoothingEnabled = true;
  tctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(A, 0, 0);
  ctx.drawImage(tmp, 0, 0);
  if (ed) {
    const em = buf('mask-e', mw, mh);
    em.getContext('2d').putImageData(eimg, 0, 0);
    ctx.drawImage(em, 0, 0, mw, mh, 0, 0, cw, ch);
  }
}

// frequently used fields (u, v in 0..1; aspect = w/h)
export const FIELDS = {
  noise: (u, v, a, x, y) => sr(x * 12.9898 + y * 78.233),
  clouds: (u, v, a) => noise2(u * 3.2 * a + 7, v * 3.2 + 3, 5),
  liquid: (u, v, a) => v * 0.72 + noise2(u * 4 * a, v * 4, 4) * 0.5,
  radial: (u, v, a) => Math.hypot((u - 0.5) * a, v - 0.5),
  angular: (u, v, a) => (Math.atan2(v - 0.5, (u - 0.5) * a) + Math.PI / 2 + TAU) % TAU,
  spiral: (u, v, a) => {
    const r = Math.hypot((u - 0.5) * a, v - 0.5) / 0.75;
    const ang = ((Math.atan2(v - 0.5, (u - 0.5) * a) + Math.PI) / TAU);
    return ang / 3 + r;
  },
  plasma: (u, v, a) => Math.sin(u * 9 * a) + Math.sin(v * 7 + u * 3) + Math.sin(Math.hypot(u * a - 0.3, v - 0.7) * 11),
  waves: (u, v, a) => v + 0.06 * Math.sin(u * a * 22),
  bands: (u, v) => (v * 6 % 1) * 0.4 + v * 0.6,
  halftone: (u, v, a) => {
    const c = 0.075, U = u * a;
    const cx = Math.floor(U / c), cy = Math.floor(v / c);
    const dx = (U / c - cx - 0.5), dy = (v / c - cy - 0.5);
    return Math.hypot(dx, dy) * 0.55 + ((cx * c) / a + cy * c) * 0.45;
  },
  diamonds: (u, v, a) => {
    const c = 0.11, U = u * a;
    const cx = Math.floor(U / c), cy = Math.floor(v / c);
    const dx = Math.abs(U / c - cx - 0.5), dy = Math.abs(v / c - cy - 0.5);
    return (dx + dy) * 0.5 + Math.hypot(cx * c / a - 0.5, cy * c - 0.5) * 0.6;
  },
  checker: (u, v, a) => {
    const c = 0.125, cx = Math.floor((u * a) / c), cy = Math.floor(v / c);
    return ((cx + cy) % 2) * 0.5 + v * 0.45;
  },
  starburst: (u, v, a) => {
    const ang = Math.atan2(v - 0.5, (u - 0.5) * a);
    const r = Math.hypot((u - 0.5) * a, v - 0.5);
    return r * 0.8 + (0.5 + 0.5 * Math.cos(ang * 16)) * 0.12;
  },
  rings: (u, v, a) => {
    const r = Math.hypot((u - 0.5) * a, v - 0.5) * 7;
    return (r % 1) * 0.35 + (r / 7) * 0.9;
  },
  crossField: (u, v, a) => Math.min(Math.abs((u - 0.5) * a), Math.abs(v - 0.5)),
  boxField: (u, v, a) => Math.max(Math.abs((u - 0.5) * a) / a, Math.abs(v - 0.5)),
  hearts: (u, v, a) => {
    const x = (u - 0.5) * a * 6, y = -(v - 0.47) * 6;
    const q = x * x + y * y - 1;
    // distance-like: 0 at the centre, 1 on the heart outline, then grows linearly
    return Math.sqrt(Math.max(0, Math.cbrt(q * q * q - x * x * y * y * y) + 1));
  },
  zigzag: (u, v, a) => v + 0.05 * Math.abs(((u * a * 8) % 2) - 1),
  pixelsDiag: (u, v, a, x, y) => (u + v) * 0.5 * 0.8 + sr(Math.floor(x / 6) * 3.1 + Math.floor(y / 6) * 7.7) * 0.2,
};

export function linearField(angleDeg) {
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return (u, v, asp) => (u - 0.5) * asp * c + (v - 0.5) * s;
}
