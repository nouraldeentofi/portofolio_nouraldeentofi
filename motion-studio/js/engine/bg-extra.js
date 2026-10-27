// Extra animated backgrounds (phase 2). Same contract as backgrounds.js:
// fn(ctx, bg, time, env, dur) draws in design px over the frame plus overscan,
// is a pure function of time, and takes colours from theme tokens by default.
// Noise fields render into a small buffer and are scaled up (cheap per frame).
import { TAU, clamp, sr, fract, hash2, makeCanvas, parseColor, smoothstep, rgba, mix } from './util.js';
import { color, fontString } from './themes.js';
import { soft } from './bg-soft.js';

const M = 0.22;
const C = (spec, env, fb) => color(spec || fb, env.theme);
const R = (env) => ({ X: -env.W * M, Y: -env.H * M, W: env.W * (1 + 2 * M), H: env.H * (1 + 2 * M) });
function fill(ctx, env, c) {
  const r = R(env);
  ctx.fillStyle = c;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
}
// parsed colour, translucent tokens pre-mixed over the theme background
function solid(env, spec, fb) {
  const c = parseColor(C(spec, env, fb));
  if (c.a >= 0.999) return c;
  const b = parseColor(env.theme.c.bg);
  return { r: b.r + (c.r - b.r) * c.a, g: b.g + (c.g - b.g) * c.a, b: b.b + (c.b - b.b) * c.a, a: 1 };
}

// ---------------------------------------------------------------- fast value noise (table based)
const P = new Uint8Array(512);
const V = new Float32Array(256);
(function init() {
  let s = 1337;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  for (let i = 0; i < 256; i++) V[i] = rnd();
})();
function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]], c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) {
    s += vn(x * f, y * f) * a;
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

// ---------------------------------------------------------------- low-res buffers
const bufs = new Map();
function lowres(key, env, target = 7000, nearest = false) {
  const r = R(env);
  const ar = r.W / r.H;
  const bw = Math.max(16, Math.round(Math.sqrt(target * ar))), bh = Math.max(16, Math.round(bw / ar));
  let b = bufs.get(key);
  if (!b || b.w !== bw || b.h !== bh) {
    const c = makeCanvas(bw, bh);
    const x = c.getContext('2d');
    const img = x.createImageData(bw, bh);
    b = { c, x, img, u32: new Uint32Array(img.data.buffer), w: bw, h: bh };
    bufs.set(key, b);
  }
  b.nearest = nearest;
  return b;
}
function blit(ctx, env, b, alpha = 1) {
  b.x.putImageData(b.img, 0, 0);
  const r = R(env);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = !b.nearest;
  if (!b.nearest) ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(b.c, r.X, r.Y, r.W, r.H);
  ctx.restore();
}
const c8 = (v) => (v <= 0 ? 0 : v >= 255 ? 255 : v | 0);
const pack = (r, g, b) => (255 << 24) | (c8(b) << 16) | (c8(g) << 8) | c8(r);
function lut(cols) {
  const L = new Uint32Array(256);
  const n = cols.length - 1;
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * n;
    const k = Math.min(n - 1, Math.floor(t));
    const f = t - k;
    const a = cols[k], b = cols[k + 1] || a;
    L[i] = pack(a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f);
  }
  return L;
}

// glow sprite cache (radial dot) for fireflies etc.
const sprites = new Map();
function sprite(col) {
  let s = sprites.get(col);
  if (s) return s;
  if (sprites.size > 40) sprites.clear();
  s = makeCanvas(64, 64);
  const x = s.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(col, 1));
  g.addColorStop(0.18, rgba(col, 0.85));
  g.addColorStop(0.45, rgba(col, 0.22));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  sprites.set(col, s);
  return s;
}

// ================================================================= noise fields
function liquid(ctx, bg, t, env) {
  const b = lowres('liquid', env, bg.res ?? 5200);
  const cols = [bg.base || '@bg', bg.color3 || '@bg2', bg.color2 || '@secondary', bg.color || '@accent'].map((c) => solid(env, c));
  const L = lut(cols);
  const sc = bg.scale ?? 2.2, sp = (bg.speed ?? 1) * t, warp = bg.warp ?? 3.5, con = bg.contrast ?? 1.5, gam = bg.dark ?? 1.9;
  const { w, h, u32 } = b;
  const ar = w / h;
  for (let y = 0; y < h; y++) {
    const ny = (y / h) * sc;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * sc * ar;
      const q = fbm(nx + sp * 0.05, ny - sp * 0.04, 3);
      const r = fbm(nx + warp * q + 1.7 + sp * 0.07, ny + warp * q + 9.2 - sp * 0.05, 3);
      let v = fbm(nx + warp * r + 3.1, ny + warp * r - 2.3 + sp * 0.03, 3);
      v = Math.pow(clamp((v - 0.5) * con + 0.5), gam);
      u32[y * w + x] = L[(v * 255) | 0];
    }
  }
  blit(ctx, env, b);
}

function nebula(ctx, bg, t, env) {
  const b = lowres('nebula', env, 6500);
  const base = solid(env, bg.base, '@bg'), c1 = solid(env, bg.color, '@accent'), c2 = solid(env, bg.color2, '@secondary');
  const sp = (bg.speed ?? 1) * t * 0.03, sc = bg.scale ?? 2.4, k = bg.intensity ?? 0.6;
  const { w, h, u32 } = b;
  const ar = w / h;
  for (let y = 0; y < h; y++) {
    const ny = (y / h) * sc;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * sc * ar;
      const rx = nx * 0.866 - ny * 0.5, ry = nx * 0.5 + ny * 0.866;
      const a1 = Math.pow(smoothstep(0.53, 0.86, fbm(rx + sp, ry, 3)), 1.6) * k * 0.9;
      const a2 = Math.pow(smoothstep(0.55, 0.88, fbm(ry * 1.3 + 7 - sp, -rx * 1.3 + 3, 3)), 1.6) * k * 0.75;
      const m1 = Math.min(1, a1), m2 = Math.min(1, a2);
      let r = base.r + (c1.r - base.r) * m1, g = base.g + (c1.g - base.g) * m1, bb = base.b + (c1.b - base.b) * m1;
      r += (c2.r - r) * m2; g += (c2.g - g) * m2; bb += (c2.b - bb) * m2;
      u32[y * w + x] = pack(r, g, bb);
    }
  }
  blit(ctx, env, b);
  starDots(ctx, env, bg.stars ?? 140, t, C(bg.starColor, env, '@fg'));
}
function starDots(ctx, env, n, t, col) {
  const r = R(env);
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = r.X + sr(i * 3.17 + 0.3) * r.W, y = r.Y + sr(i * 7.31 + 0.9) * r.H;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + sr(i) * 1.8) + i));
    const s = (0.8 + sr(i * 1.9) * 2.4) * env.U;
    ctx.globalAlpha = tw * (0.4 + sr(i * 5.1) * 0.6);
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

function lava(ctx, bg, t, env) {
  const b = lowres('lava', env, 7000);
  const base = solid(env, bg.base, '@bg'), c1 = solid(env, bg.color, '@accent'), c2 = solid(env, bg.color2, '@secondary');
  const n = Math.round(bg.count ?? 7), sp = bg.speed ?? 1, size = bg.size ?? 1;
  const { w, h, u32 } = b;
  const ar = w / h;
  const balls = [];
  for (let i = 0; i < n; i++) {
    balls.push([
      0.5 + 0.36 * Math.sin(t * 0.27 * sp * (0.6 + sr(i)) + i * 2.1),
      0.5 + 0.4 * Math.cos(t * 0.21 * sp * (0.5 + sr(i + 3)) + i * 1.3),
      Math.pow((0.055 + sr(i + 7) * 0.05) * size, 2),
      i % 2,
    ]);
  }
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let f = 0, fc = 0;
      for (let k = 0; k < n; k++) {
        const B = balls[k];
        const dx = (u - B[0]) * ar, dy = v - B[1];
        const c = B[2] / (dx * dx * 1 + dy * dy + 1e-4);
        f += c;
        if (B[3]) fc += c;
      }
      const e = smoothstep(0.8, 1.2, f);
      const m = fc / (f || 1);
      const lr = c1.r + (c2.r - c1.r) * m, lg = c1.g + (c2.g - c1.g) * m, lb = c1.b + (c2.b - c1.b) * m;
      const hi = smoothstep(2.5, 7, f) * 0.18;
      u32[y * w + x] = pack(base.r + (lr - base.r) * e + 255 * hi * e, base.g + (lg - base.g) * e + 255 * hi * e, base.b + (lb - base.b) * e + 255 * hi * e);
    }
  }
  blit(ctx, env, b);
}

function voronoi(ctx, bg, t, env) {
  const b = lowres('voronoi', env, 7000);
  const base = solid(env, bg.base, '@bg'), b2 = solid(env, bg.color2, '@bg2'), acc = solid(env, bg.color, '@accent');
  const n = Math.round(bg.count ?? 16), sp = (bg.speed ?? 1) * t, ew = bg.edge ?? 0.03, ea = bg.edgeAlpha ?? 0.42;
  const { w, h, u32 } = b;
  const ar = w / h;
  const sx = [], sy = [];
  for (let i = 0; i < n; i++) {
    sx.push((0.5 + 0.46 * Math.sin(sp * 0.09 * (0.5 + sr(i)) + i * 3.7)) * ar);
    sy.push(0.5 + 0.46 * Math.cos(sp * 0.07 * (0.5 + sr(i + 11)) + i * 1.9));
  }
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = (x / w) * ar;
      let d1 = 1e9, d2 = 1e9, id = 0;
      for (let k = 0; k < n; k++) {
        const dx = u - sx[k], dy = v - sy[k];
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; id = k; } else if (d < d2) d2 = d;
      }
      const edge = 1 - smoothstep(0, ew, Math.sqrt(d2) - Math.sqrt(d1));
      const tint = sr(id * 5.3);
      const hot = id % 5 === 0 ? 0.22 : 0;
      let r = base.r + (b2.r - base.r) * tint * 0.8 + (acc.r - base.r) * hot;
      let g = base.g + (b2.g - base.g) * tint * 0.8 + (acc.g - base.g) * hot;
      let bl = base.b + (b2.b - base.b) * tint * 0.8 + (acc.b - base.b) * hot;
      r += (acc.r - r) * edge * ea; g += (acc.g - g) * edge * ea; bl += (acc.b - bl) * edge * ea;
      u32[y * w + x] = pack(r, g, bl);
    }
  }
  blit(ctx, env, b);
}

function clouds(ctx, bg, t, env) {
  const b = lowres('clouds', env, 5000);
  const top = solid(env, bg.base, '@bg'), bot = solid(env, bg.color2, '@bg2'), cl = solid(env, bg.color, '@fg');
  const sp = (bg.speed ?? 1) * t * 0.03, cover = bg.cover ?? 0.5, alpha = bg.alpha ?? (env.theme.dark ? 0.32 : 0.85);
  const { w, h, u32 } = b;
  const ar = w / h;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const sr0 = top.r + (bot.r - top.r) * v, sg0 = top.g + (bot.g - top.g) * v, sb0 = top.b + (bot.b - top.b) * v;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * 3 * ar;
      const d = smoothstep(1 - cover - 0.05, 1 - cover + 0.25, fbm(nx + sp, v * 5.2 - sp * 0.2, 4)) * alpha;
      u32[y * w + x] = pack(sr0 + (cl.r - sr0) * d, sg0 + (cl.g - sg0) * d, sb0 + (cl.b - sb0) * d);
    }
  }
  blit(ctx, env, b);
}

function smoke(ctx, bg, t, env) {
  const b = lowres('smoke', env, 5000);
  const base = solid(env, bg.base, '@bg'), sm = solid(env, bg.color, '@fg');
  const sp = (bg.speed ?? 1) * t, k = bg.alpha ?? (env.theme.dark ? 0.3 : 0.22);
  const { w, h, u32 } = b;
  const ar = w / h;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * 2.6 * ar;
      const q = fbm(nx, v * 2.6 + sp * 0.12, 3);
      const d = smoothstep(0.42, 0.85, fbm(nx + q * 2.2, v * 2.6 + q * 2 + sp * 0.18, 4)) * k * (0.35 + 0.65 * v);
      u32[y * w + x] = pack(base.r + (sm.r - base.r) * d, base.g + (sm.g - base.g) * d, base.b + (sm.b - base.b) * d);
    }
  }
  blit(ctx, env, b);
}

function curtain(ctx, bg, t, env) {
  const b = lowres('curtain', env, 5000);
  const base = solid(env, bg.base, '@bg'), c1 = solid(env, bg.color, '@accent'), c2 = solid(env, bg.color2, '@secondary');
  const sp = (bg.speed ?? 1) * t, k = bg.intensity ?? 0.38;
  const { w, h, u32 } = b;
  const ar = w / h;
  const curt = [[0.32, c1, 0.0], [0.42, c2, 3.3], [0.27, c1, 7.1]];
  for (let x = 0; x < w; x++) {
    const u = (x / w) * ar;
    const lines = curt.map(([y0, , ph]) => y0 + 0.08 * Math.sin(u * 2.2 + sp * 0.35 + ph) + 0.05 * (fbm(u * 3 + ph, sp * 0.1, 2) - 0.5));
    const shim = curt.map(([, , ph]) => { const f = fbm(u * 16 + ph, sp * 0.25, 2); return Math.min(1.3, f * f * 2.4); });
    for (let y = 0; y < h; y++) {
      const v = y / h;
      let r = base.r, g = base.g, bb = base.b;
      for (let c = 0; c < 3; c++) {
        const d = v - lines[c];
        const a = d > 0 ? Math.exp(-d * d * 520) : Math.exp(-d * d * 30);
        const s = a * shim[c] * k * (c === 1 ? 0.7 : 0.85);
        const col = curt[c][1];
        const m = Math.min(1, s);
        r += (col.r - r) * m; g += (col.g - g) * m; bb += (col.b - bb) * m;
      }
      u32[y * w + x] = pack(r, g, bb);
    }
  }
  blit(ctx, env, b);
}

function led(ctx, bg, t, env) {
  const r = R(env);
  const s = (bg.size ?? 26) * env.U;
  const cols = Math.ceil(r.W / s), rows = Math.ceil(r.H / s);
  const b = lowres('led', env, cols * rows, true);
  const off = solid(env, bg.base, '@bg2'), on = solid(env, bg.color, '@accent'), on2 = solid(env, bg.color2, '@secondary');
  const sp = (bg.speed ?? 1) * t;
  const { w, h, u32 } = b;
  const cx = w * (0.5 + 0.3 * Math.sin(sp * 0.4)), cy = h * (0.5 + 0.3 * Math.cos(sp * 0.33));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x - cx, y - cy);
    let v = 0.5 + 0.5 * Math.sin(d * 0.45 - sp * 2.4);
    v = v * v * (0.55 + 0.45 * vn(x * 0.25 + sp * 0.5, y * 0.25));
    const tt = sr(x * 12.1 + y * 7.7);
    const c = tt > 0.5 ? on : on2;
    u32[y * w + x] = pack(off.r + (c.r - off.r) * v, off.g + (c.g - off.g) * v, off.b + (c.b - off.b) * v);
  }
  blit(ctx, env, b);
  // gaps between pixels
  ctx.strokeStyle = C(bg.gap, env, '@bg');
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  const cw = r.W / w, ch = r.H / h;
  for (let x = 0; x <= w; x++) { ctx.moveTo(r.X + x * cw, r.Y); ctx.lineTo(r.X + x * cw, r.Y + r.H); }
  for (let y = 0; y <= h; y++) { ctx.moveTo(r.X, r.Y + y * ch); ctx.lineTo(r.X + r.W, r.Y + y * ch); }
  ctx.stroke();
}

// ================================================================= gradients
function conic(ctx, bg, t, env) {
  const W = env.W, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.5);
  const cols = [bg.color || '@accent', bg.color2 || '@secondary', bg.color3 || '@bg2'].map((c) => C(c, env));
  const a0 = t * (bg.speed ?? 1) * 0.25 + ((bg.angle ?? 0) * Math.PI) / 180;
  const r = R(env);
  soft(ctx, env, 'conic', 0.25, (ctx) => {
  ctx.save();
  ctx.globalAlpha *= bg.alpha ?? 0.85;
  if (ctx.createConicGradient) {
    const g = ctx.createConicGradient(a0, cx, cy);
    const all = [...cols, cols[0]];
    all.forEach((c, i) => g.addColorStop(i / (all.length - 1), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = cols[0];
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  ctx.restore();
  const soft = bg.soft ?? 0.6;
  if (soft > 0) {
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.9);
    g2.addColorStop(0, rgba(env.theme.c.bg, soft * 0.15));
    g2.addColorStop(1, rgba(env.theme.c.bg, soft));
    ctx.fillStyle = g2;
    ctx.fillRect(r.X, r.Y, r.W, r.H);
  }
  });
}

const tiny = { c: null };
function meshgrad(ctx, bg, t, env) {
  const N = 4, Mh = 5;
  if (!tiny.c) { tiny.c = makeCanvas(N, Mh); tiny.x = tiny.c.getContext('2d'); tiny.img = tiny.x.createImageData(N, Mh); tiny.mid = makeCanvas(64, 80); tiny.mx = tiny.mid.getContext('2d'); }
  const pal = [bg.base || '@bg', bg.color || '@accent', bg.color2 || '@secondary', bg.color3 || '@bg2'].map((c) => solid(env, c));
  const sp = (bg.speed ?? 1) * t;
  const d = tiny.img.data;
  for (let i = 0; i < N * Mh; i++) {
    const f = fract(sr(i * 2.7) + sp * 0.05 * (0.4 + sr(i + 30)));
    const k = sr(i * 9.1) < (bg.dark ?? 0.45) ? 0 : 1 + Math.floor(f * 3);
    const a = pal[k % pal.length], b = pal[(k + 1) % pal.length];
    const m = 0.5 - 0.5 * Math.cos(f * TAU);
    d[i * 4] = a.r + (b.r - a.r) * m * 0.6;
    d[i * 4 + 1] = a.g + (b.g - a.g) * m * 0.6;
    d[i * 4 + 2] = a.b + (b.b - a.b) * m * 0.6;
    d[i * 4 + 3] = 255;
  }
  tiny.x.putImageData(tiny.img, 0, 0);
  tiny.mx.imageSmoothingEnabled = true;
  tiny.mx.imageSmoothingQuality = 'high';
  tiny.mx.drawImage(tiny.c, 0, 0, 64, 80);
  const r = R(env);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(tiny.mid, r.X, r.Y, r.W, r.H);
  ctx.restore();
}

function holo(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const a = C(bg.color, env, '@accent'), b = C(bg.color2, env, '@secondary');
  const pastel = [mix(a, '#ffffff', 0.45), mix(b, '#ffffff', 0.45), mix(a, '#ff9ee6', 0.5), mix(b, '#9ed8ff', 0.5)];
  const sp = (bg.speed ?? 1) * t;
  soft(ctx, env, 'holo', 0.15, (ctx) => {
  for (let k = 0; k < 2; k++) {
    const ang = sp * 0.12 * (k % 2 ? -1 : 1) + k * 1.1;
    const L = Math.hypot(W, H);
    const cx = W / 2 + Math.cos(ang) * L * 0.1, cy = H / 2 + Math.sin(ang) * L * 0.1;
    const g = ctx.createLinearGradient(cx - Math.cos(ang) * L, cy - Math.sin(ang) * L, cx + Math.cos(ang) * L, cy + Math.sin(ang) * L);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, pastel[(i + k) % pastel.length]);
    ctx.globalAlpha = (bg.alpha ?? 0.55) / (k + 1);
    ctx.fillStyle = g;
    ctx.fillRect(r.X, r.Y, r.W, r.H);
  }
  // moving sheen band
  const x = r.X + fract(sp * 0.06) * r.W * 1.4 - r.W * 0.2;
  const g = ctx.createLinearGradient(x - W * 0.25, 0, x + W * 0.25, H * 0.3);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  if (env.theme.dark) {
    ctx.fillStyle = rgba(env.theme.c.bg, bg.dim ?? 0.35);
    ctx.fillRect(r.X, r.Y, r.W, r.H);
  }
  });
}

function sunset(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  const hz = H * (bg.horizon ?? 0.62);
  const top = C(bg.base, env, '@bg'), mid = C(bg.color2, env, '@secondary'), hot = C(bg.color, env, '@accent');
  const g = ctx.createLinearGradient(0, r.Y, 0, hz);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mix(top, mid, 0.55));
  g.addColorStop(1, mix(mid, hot, 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, hz - r.Y);
  const sun = Math.min(W, H) * (bg.sun ?? 0.2);
  const sy = hz - sun * 0.35 + Math.sin(t * 0.2) * sun * 0.05;
  const sg = ctx.createRadialGradient(W / 2, sy, 0, W / 2, sy, sun * 2.6);
  sg.addColorStop(0, rgba(hot, 0.55));
  sg.addColorStop(1, rgba(hot, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(r.X, r.Y, r.W, hz - r.Y);
  ctx.fillStyle = mix(hot, '#ffffff', 0.25);
  ctx.beginPath(); ctx.arc(W / 2, sy, sun, 0, TAU); ctx.fill();
  // water
  const wg = ctx.createLinearGradient(0, hz, 0, r.Y + r.H);
  wg.addColorStop(0, mix(mid, top, 0.4));
  wg.addColorStop(1, top);
  ctx.fillStyle = wg;
  ctx.fillRect(r.X, hz, r.W, r.Y + r.H - hz);
  // reflection lines
  ctx.fillStyle = rgba(mix(hot, '#ffffff', 0.3), 0.55);
  for (let i = 0; i < 16; i++) {
    const y = hz + Math.pow((i + 1) / 16, 1.6) * (H * 0.36);
    const wl = sun * (1.4 - i * 0.06) * (0.75 + 0.25 * Math.sin(t * 1.3 + i * 1.7));
    ctx.fillRect(W / 2 - wl / 2 + Math.sin(t * 0.9 + i) * 8 * env.U, y, wl, (2 + i * 0.25) * env.U);
  }
}

// ================================================================= geometric / patterns
function halftone(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 34) * U;
  const sp = (bg.speed ?? 1) * t;
  const cx = env.W * (0.5 + 0.25 * Math.sin(sp * 0.3)), cy = env.H * (0.45 + 0.2 * Math.cos(sp * 0.25));
  const lam = (bg.wave ?? 140) * U;
  ctx.fillStyle = C(bg.color, env, '@accent');
  ctx.beginPath();
  let row = 0;
  for (let y = r.Y; y < r.Y + r.H + s; y += s * 0.87, row++) {
    for (let x = r.X + (row % 2 ? s / 2 : 0); x < r.X + r.W + s; x += s) {
      const d = Math.hypot(x - cx, y - cy);
      let v = 0.5 + 0.5 * Math.sin(d / lam * TAU * 0.5 - sp * 1.6);
      v *= clamp(1.25 - d / (Math.max(env.W, env.H) * 0.9));
      const rr = s * 0.48 * Math.pow(Math.max(0, v), 1.4);
      if (rr < 0.4) continue;
      ctx.moveTo(x + rr, y);
      ctx.arc(x, y, rr, 0, TAU);
    }
  }
  ctx.globalAlpha = bg.alpha ?? 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function checker(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 96) * U;
  const L = Math.hypot(W, H) * 0.85;
  const off = (t * (bg.speed ?? 30) * U) % (s * 2);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(((bg.angle ?? 0) * Math.PI) / 180);
  ctx.fillStyle = C(bg.color, env, '@fg/0.06');
  ctx.beginPath();
  for (let i = -Math.ceil(L / s) - 2; i < Math.ceil(L / s) + 2; i++) {
    for (let j = -Math.ceil(L / s) - 2; j < Math.ceil(L / s) + 2; j++) {
      if ((i + j) & 1) continue;
      ctx.rect(i * s + off, j * s + off, s, s);
    }
  }
  ctx.fill();
  ctx.restore();
  vignette(ctx, env, bg.vignette ?? 0.5);
}
function vignette(ctx, env, k) {
  if (!k) return;
  const r = R(env), W = env.W, H = env.H;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.8);
  g.addColorStop(0, rgba(env.theme.c.bg, 0));
  g.addColorStop(1, rgba(env.theme.c.bg, k));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
}

function chevron(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 70) * U, p = s * 1.6, a = s * 0.55;
  const off = ((t * (bg.speed ?? 40) * U) % (s * 2) + s * 2) % (s * 2);
  ctx.fillStyle = C(bg.color, env, '@fg/0.05');
  ctx.beginPath();
  for (let y = r.Y - s * 2 + off; y < r.Y + r.H + s; y += s * 2) {
    ctx.moveTo(r.X - p, y);
    for (let x = r.X - p; x <= r.X + r.W + p; x += p / 2) ctx.lineTo(x, y + (Math.round((x - r.X) / (p / 2)) % 2 ? a : 0));
    for (let x = r.X + r.W + p; x >= r.X - p; x -= p / 2) ctx.lineTo(x, y + s + (Math.round((x - r.X) / (p / 2)) % 2 ? a : 0));
    ctx.closePath();
  }
  ctx.fill();
  vignette(ctx, env, bg.vignette ?? 0.35);
}

function polka(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 64) * U, rad = s * (bg.dot ?? 0.18);
  const off = (t * (bg.speed ?? 20) * U) % s;
  ctx.fillStyle = C(bg.color, env, '@accent/0.35');
  ctx.beginPath();
  let row = 0;
  for (let y = r.Y - s + off; y < r.Y + r.H + s; y += s, row++) {
    for (let x = r.X - s + off + (row % 2 ? s / 2 : 0); x < r.X + r.W + s; x += s) {
      const pulse = bg.pulse ? 0.75 + 0.25 * Math.sin(t * 2 + (x + y) * 0.004 / U) : 1;
      ctx.moveTo(x + rad * pulse, y);
      ctx.arc(x, y, rad * pulse, 0, TAU);
    }
  }
  ctx.fill();
  vignette(ctx, env, bg.vignette ?? 0.3);
}

function iso(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 70) * U;
  const dx = s * Math.sqrt(3);
  ctx.strokeStyle = C(bg.color, env, '@fg/0.08');
  ctx.lineWidth = 1.4 * U;
  ctx.beginPath();
  const span = r.W + r.H;
  for (let k = -span; k < span * 2; k += s * 2) {
    ctx.moveTo(r.X, r.Y + k); ctx.lineTo(r.X + span, r.Y + k - span / Math.sqrt(3));
    ctx.moveTo(r.X, r.Y + k - span); ctx.lineTo(r.X + span, r.Y + k - span + span / Math.sqrt(3));
  }
  for (let x = r.X; x < r.X + r.W; x += dx / 2) { ctx.moveTo(x, r.Y); ctx.lineTo(x, r.Y + r.H); }
  ctx.stroke();
  // lit rhombi
  const acc = C(bg.color2, env, '@accent');
  const tick = Math.floor(t * (bg.speed ?? 1) * 1.5);
  for (let i = 0; i < 26; i++) {
    const cx = Math.round((r.X + sr(i * 3.3 + tick * 0.17) * r.W) / (dx / 2)) * (dx / 2);
    const cy = Math.round((r.Y + sr(i * 5.9 + tick * 0.11) * r.H) / s) * s;
    const f = fract(t * (bg.speed ?? 1) * 1.5);
    const a = Math.sin(f * Math.PI) * 0.35;
    ctx.fillStyle = rgba(acc, a);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx + dx / 2, cy - s / 2); ctx.lineTo(cx, cy); ctx.lineTo(cx - dx / 2, cy - s / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function diamonds(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 110) * U;
  const L = Math.hypot(W, H) * 0.85;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(Math.PI / 4 + t * (bg.speed ?? 0.02));
  const c1 = C(bg.color, env, '@accent/0.08'), c2 = C(bg.color2, env, '@secondary/0.06');
  for (let i = -Math.ceil(L / s); i < Math.ceil(L / s); i++) for (let j = -Math.ceil(L / s); j < Math.ceil(L / s); j++) {
    const k = (i + j) & 1;
    if (!k && (i & 1)) continue;
    if ((i * s + s / 2) ** 2 + (j * s + s / 2) ** 2 > L * L) continue;
    ctx.fillStyle = k ? c1 : c2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.7 + j * 0.4);
    ctx.fillRect(i * s, j * s, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C(bg.line, env, '@fg/0.07');
  ctx.lineWidth = 1.5 * U;
  ctx.beginPath();
  for (let i = -Math.ceil(L / s); i < Math.ceil(L / s); i++) {
    ctx.moveTo(i * s + s / 2, -L); ctx.lineTo(i * s + s / 2, L);
    ctx.moveTo(-L, i * s + s / 2); ctx.lineTo(L, i * s + s / 2);
  }
  ctx.stroke();
  ctx.restore();
  vignette(ctx, env, bg.vignette ?? 0.45);
}

function squares(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 22), sides = Math.round(bg.sides ?? 4);
  const R0 = Math.hypot(W, H) * 0.75;
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  ctx.save();
  ctx.translate(W * (bg.x ?? 0.5), H * (bg.y ?? 0.5));
  ctx.lineWidth = (bg.width ?? 2.5) * U;
  for (let i = 0; i < n; i++) {
    const f = (i + fract(t * (bg.zoom ?? 0.1))) / n;
    const s = f * f * R0;
    ctx.save();
    ctx.rotate(t * (bg.speed ?? 0.15) + i * (bg.twist ?? 0.12));
    ctx.strokeStyle = rgba(i % 2 ? c2 : c1, 0.08 + 0.42 * f);
    ctx.beginPath();
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * TAU + Math.PI / sides;
      k ? ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s) : ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

const RING = new Float32Array(256);
function moire(ctx, bg, t, env) {
  // two ring fields evaluated per pixel at ~3 samples per ring period, then scaled up
  const W = env.W, H = env.H, U = env.U;
  const r = R(env);
  const s = (bg.size ?? 22) * U;
  const b = lowres('moire', env, Math.min(90000, (r.W * r.H) / ((s / 2.4) * (s / 2.4))));
  const base = solid(env, bg.base, '@bg');
  const p1 = parseColor(C(bg.color, env, '@fg/0.2')), p2 = parseColor(C(bg.color2, env, '@secondary/0.35'));
  const sp = (bg.speed ?? 1) * t;
  const { w, h, u32 } = b;
  const sx = r.W / w, sy = r.H / h;
  const c1x = W * (0.42 + 0.12 * Math.sin(sp * 0.3)) - r.X, c1y = H * (0.45 + 0.1 * Math.cos(sp * 0.25)) - r.Y;
  const c2x = W * (0.58 + 0.12 * Math.cos(sp * 0.27)) - r.X, c2y = H * (0.55 + 0.1 * Math.sin(sp * 0.31)) - r.Y;
  const inv = 1 / s;
  const vg = bg.vignette ?? 0.55;
  for (let i = 0; i < 256; i++) RING[i] = smoothstep(0.35, 0.95, 0.5 + 0.5 * Math.cos((i / 256) * TAU));
  for (let y = 0; y < h; y++) {
    const py = (y + 0.5) * sy;
    const d1y = (py - c1y) * (py - c1y), d2y = (py - c2y) * (py - c2y);
    for (let x = 0; x < w; x++) {
      const px = (x + 0.5) * sx;
      const a = Math.sqrt((px - c1x) * (px - c1x) + d1y) * inv, bq = Math.sqrt((px - c2x) * (px - c2x) + d2y) * inv;
      const v1 = RING[((a - Math.floor(a)) * 256) | 0] * p1.a;
      const v2 = RING[((bq - Math.floor(bq)) * 256) | 0] * p2.a;
      let rr = base.r + (p1.r - base.r) * v1, gg = base.g + (p1.g - base.g) * v1, bb = base.b + (p1.b - base.b) * v1;
      rr += (p2.r - rr) * v2; gg += (p2.g - gg) * v2; bb += (p2.b - bb) * v2;
      u32[y * w + x] = pack(rr, gg, bb);
    }
  }
  blit(ctx, env, b);
  vignette(ctx, env, vg);
}

function kaleido(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.folds ?? 8);
  const Rm = Math.max(W, H) * 0.75;
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const sp = (bg.speed ?? 1) * t;
  ctx.save();
  ctx.translate(W / 2, H * (bg.y ?? 0.5));
  ctx.rotate(sp * 0.08);
  ctx.globalCompositeOperation = env.theme.dark ? 'lighter' : 'multiply';
  for (let k = 0; k < n; k++) {
    ctx.save();
    ctx.rotate((k / n) * TAU);
    if (k % 2) ctx.scale(1, -1);
    for (let j = 0; j < 6; j++) {
      const rr = Rm * (0.12 + j * 0.13) * (1 + 0.08 * Math.sin(sp * 0.6 + j));
      const ww = Rm * (0.05 + 0.03 * Math.sin(sp * 0.5 + j * 1.3));
      ctx.fillStyle = rgba(j % 2 ? c2 : c1, (bg.alpha ?? 0.16) * (1 - j * 0.1));
      ctx.beginPath();
      ctx.ellipse(rr, rr * 0.18, ww * 2, ww * 0.7, 0.4 + Math.sin(sp * 0.3 + j) * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  vignette(ctx, env, bg.vignette ?? 0.4);
}

function bauhaus(ctx, bg, t, env) {
  const W = env.W, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const pal = [bg.color || '@accent', bg.color2 || '@secondary', bg.color3 || '@bg2', '@fg/0.12'].map((c) => C(c, env));
  const seed = bg.seed ?? 1;
  const n = Math.round(bg.count ?? 7);
  const S = Math.min(W, H);
  ctx.save();
  ctx.globalAlpha = bg.alpha ?? 0.9;
  for (let i = 0; i < n; i++) {
    const r1 = sr(i * 3.1 + seed * 17), r2 = sr(i * 5.7 + seed * 11), r3 = sr(i * 7.3 + seed * 5);
    const x = W * (0.05 + r1 * 0.9) + Math.sin(t * 0.25 + i) * S * 0.02;
    const y = H * (0.05 + r2 * 0.9) + Math.cos(t * 0.2 + i) * S * 0.02;
    const s = S * (0.12 + r3 * 0.28);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.05 * (i % 2 ? 1 : -1) + r1 * TAU);
    ctx.fillStyle = pal[i % pal.length];
    ctx.beginPath();
    const kind = Math.floor(sr(i * 9.9 + seed) * 5);
    if (kind === 0) ctx.arc(0, 0, s / 2, 0, TAU);
    else if (kind === 1) { ctx.arc(0, 0, s / 2, 0, Math.PI); ctx.closePath(); }
    else if (kind === 2) { ctx.moveTo(0, 0); ctx.arc(0, 0, s / 2, 0, Math.PI / 2); ctx.closePath(); }
    else if (kind === 3) ctx.rect(-s / 2, -s / 4, s, s / 2);
    else { ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  const dim = bg.dim ?? 0.35;
  if (dim) { const r = R(env); ctx.fillStyle = rgba(env.theme.c.bg, dim); ctx.fillRect(r.X, r.Y, r.W, r.H); }
}

function barcode(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const sp = (bg.speed ?? 40) * U;
  const off = t * sp;
  const unit = (bg.size ?? 12) * U;
  const col = C(bg.color, env, '@fg/0.07'), acc = C(bg.color2, env, '@accent/0.25');
  const start = Math.floor((r.X + off) / unit) - 2;
  const end = Math.ceil((r.X + r.W + off) / unit) + 2;
  for (let k = start; k < end; k++) {
    const h = sr(k * 1.37);
    if (h < 0.45) continue;
    const w = unit * (h > 0.85 ? 2.2 : h > 0.65 ? 1.2 : 0.5);
    ctx.fillStyle = sr(k * 7.7) > 0.93 ? acc : col;
    ctx.fillRect(k * unit - off, r.Y, w, r.H);
  }
  // scanner line
  const y = r.Y + (0.5 + 0.5 * Math.sin(t * 1.4)) * r.H;
  const g = ctx.createLinearGradient(0, y - 40 * U, 0, y + 40 * U);
  const a = C(bg.color2, env, '@accent');
  g.addColorStop(0, rgba(a, 0));
  g.addColorStop(0.5, rgba(a, 0.4));
  g.addColorStop(1, rgba(a, 0));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, y - 40 * U, r.W, 80 * U);
  vignette(ctx, env, bg.vignette ?? 0.5);
}

function warp(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 70) * U, amp = (bg.amp ?? 26) * U;
  const sp = (bg.speed ?? 1) * t;
  const k = 1 / (240 * U);
  ctx.strokeStyle = C(bg.color, env, '@fg/0.16');
  ctx.lineWidth = 1.6 * U;
  const D = (x, y) => [x + Math.sin(y * k + sp) * amp, y + Math.cos(x * k * 1.3 - sp * 0.8) * amp];
  ctx.beginPath();
  for (let x = r.X; x <= r.X + r.W; x += s) {
    for (let y = r.Y; y <= r.Y + r.H; y += 36 * U) { const p = D(x, y); y === r.Y ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
  }
  for (let y = r.Y; y <= r.Y + r.H; y += s) {
    for (let x = r.X; x <= r.X + r.W; x += 36 * U) { const p = D(x, y); x === r.X ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
  }
  ctx.stroke();
  vignette(ctx, env, bg.vignette ?? 0.5);
}

function ripples(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 6), src = Math.round(bg.sources ?? 3);
  const R0 = Math.max(W, H) * 0.7;
  const col = C(bg.color, env, '@accent'), col2 = C(bg.color2, env, '@secondary');
  for (let s = 0; s < src; s++) {
    const cx = W * (0.2 + sr(s * 4.1) * 0.6) + Math.sin(t * 0.2 + s) * W * 0.04;
    const cy = H * (0.2 + sr(s * 7.3) * 0.6) + Math.cos(t * 0.17 + s) * H * 0.04;
    for (let i = 0; i < n; i++) {
      const f = fract(t * (bg.speed ?? 0.15) + i / n + sr(s) * 0.5);
      ctx.strokeStyle = rgba(s % 2 ? col2 : col, 0.38 * (1 - f) * (1 - f));
      ctx.lineWidth = (1.5 + 3 * (1 - f)) * U;
      ctx.beginPath();
      ctx.ellipse(cx, cy, f * R0, f * R0 * (bg.flat ?? 1), 0, 0, TAU);
      ctx.stroke();
    }
  }
}

function orbits(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 7);
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.5);
  const S = Math.max(W, H);
  const tilt = bg.tilt ?? 0.38;
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.12);
  sg.addColorStop(0, rgba(c1, 0.9));
  sg.addColorStop(0.3, rgba(c1, 0.3));
  sg.addColorStop(1, rgba(c1, 0));
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.12, 0, TAU); ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bg.angle ?? -0.25);
  for (let i = 0; i < n; i++) {
    const rx = S * (0.1 + i * 0.075), ry = rx * tilt;
    ctx.strokeStyle = C(bg.line, env, '@fg/0.12');
    ctx.lineWidth = 1.4 * U;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke();
    const a = t * (bg.speed ?? 1) * 0.9 / (1 + i * 0.6) + sr(i * 3.3) * TAU;
    const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
    const pr = (5 + sr(i * 1.7) * 9) * U;
    ctx.fillStyle = i % 2 ? c2 : c1;
    ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.55;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ================================================================= tech
function flowfield(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 150), steps = Math.round(bg.steps ?? 26);
  const k = (bg.scale ?? 1) / (420 * U);
  const st = (bg.step ?? 15) * U;
  const sp = (bg.speed ?? 1) * t;
  const ang0 = ((bg.angle ?? -20) * Math.PI) / 180;
  const cols = [C(bg.color, env, '@accent'), C(bg.color2, env, '@secondary'), C('@fg', env)];
  ctx.lineWidth = (bg.width ?? 2.2) * U;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = r.X + fract(sr(i * 1.31) + sp * 0.006 * (sr(i * 2.9) - 0.3)) * r.W;
    let y = r.Y + sr(i * 4.77) * r.H;
    ctx.strokeStyle = rgba(cols[i % 3], (bg.alpha ?? 0.4) * (0.4 + sr(i * 6.1) * 0.6));
    ctx.beginPath();
    ctx.moveTo(x, y);
    // curl noise: divergence-free, so lines swirl without collapsing into a few streams
    const e = 0.35 / k * 0.05, bias = 1 / Math.max(0.2, bg.curl ?? 1.6);
    for (let s = 0; s < steps; s++) {
      const ny = y * k + sp * 0.04;
      const dx = fbm(x * k, ny + e * k, 2) - fbm(x * k, ny - e * k, 2);
      const dy = fbm(x * k + e * k, ny, 2) - fbm(x * k - e * k, ny, 2);
      let vx = dx, vy = -dy;
      const m = Math.hypot(vx, vy) || 1;
      vx = vx / m + Math.cos(ang0) * bias * 0.6;
      vy = vy / m + Math.sin(ang0) * bias * 0.6;
      const m2 = Math.hypot(vx, vy) || 1;
      x += (vx / m2) * st;
      y += (vy / m2) * st;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function binary(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 24) * U;
  const hex = bg.mode === 'hex';
  const cw = s * (hex ? 1.7 : 0.9);
  const cols = Math.ceil(r.W / cw), rows = Math.ceil(r.H / (s * 1.25)) + 2;
  const off = (t * (bg.speed ?? 14) * U) % (s * 1.25);
  const ticks = Math.floor(t * 3);
  ctx.font = `500 ${s.toFixed(1)}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = C(bg.color, env, '@fg/0.1');
  const HEX = '0123456789ABCDEF';
  for (let j = 0; j < rows; j++) {
    const row = j + Math.floor((t * (bg.speed ?? 14) * U) / (s * 1.25));
    let line = '';
    for (let i = 0; i < cols; i++) {
      const h = hash2(i, row);
      line += hex ? HEX[Math.floor(h * 16)] + HEX[Math.floor(fract(h * 97) * 16)] + ' ' : h > 0.5 ? '1' : '0';
    }
    ctx.fillText(line, r.X, r.Y + j * s * 1.25 - off);
  }
  ctx.fillStyle = C(bg.color2, env, '@accent');
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(sr(k * 3.7 + ticks * 1.1) * cols), j = Math.floor(sr(k * 9.1 + ticks * 0.7) * rows);
    const row = j + Math.floor((t * (bg.speed ?? 14) * U) / (s * 1.25));
    const h = hash2(i, row);
    const ch = hex ? HEX[Math.floor(h * 16)] + HEX[Math.floor(fract(h * 97) * 16)] : h > 0.5 ? '1' : '0';
    ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * 3 + k));
    ctx.fillText(ch, r.X + i * (hex ? cw : ctx.measureText('0').width), r.Y + j * s * 1.25 - off);
  }
  ctx.globalAlpha = 1;
  vignette(ctx, env, bg.vignette ?? 0.6);
}

function blueprint(ctx, bg, t, env) {
  const r = R(env), U = env.U, W = env.W, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg2'));
  const s = (bg.size ?? 24) * U;
  const line = C(bg.color, env, '@fg');
  ctx.lineWidth = 1 * U;
  ctx.strokeStyle = rgba(line, 0.05);
  ctx.beginPath();
  for (let x = r.X - (r.X % s); x < r.X + r.W; x += s) { ctx.moveTo(x, r.Y); ctx.lineTo(x, r.Y + r.H); }
  for (let y = r.Y - (r.Y % s); y < r.Y + r.H; y += s) { ctx.moveTo(r.X, y); ctx.lineTo(r.X + r.W, y); }
  ctx.stroke();
  ctx.strokeStyle = rgba(line, 0.12);
  ctx.lineWidth = 1.6 * U;
  ctx.beginPath();
  const S = s * 5;
  for (let x = r.X - (r.X % S); x < r.X + r.W; x += S) { ctx.moveTo(x, r.Y); ctx.lineTo(x, r.Y + r.H); }
  for (let y = r.Y - (r.Y % S); y < r.Y + r.H; y += S) { ctx.moveTo(r.X, y); ctx.lineTo(r.X + r.W, y); }
  ctx.stroke();
  // technical drawing being drafted
  const acc = C(bg.color2, env, '@accent');
  const p = fract(t * (bg.speed ?? 0.12));
  ctx.strokeStyle = rgba(acc, 0.45);
  ctx.lineWidth = 2 * U;
  ctx.setLineDash([1000 * U * p, 4000 * U]);
  ctx.beginPath();
  ctx.arc(W * 0.7, H * 0.3, S * 1.6, 0, TAU);
  ctx.moveTo(W * 0.7 - S * 2.2, H * 0.3); ctx.lineTo(W * 0.7 + S * 2.2, H * 0.3);
  ctx.moveTo(W * 0.7, H * 0.3 - S * 2.2); ctx.lineTo(W * 0.7, H * 0.3 + S * 2.2);
  ctx.rect(W * 0.12, H * 0.62, S * 3.2, S * 2);
  ctx.moveTo(W * 0.12, H * 0.62 + S * 2.5); ctx.lineTo(W * 0.12 + S * 3.2, H * 0.62 + S * 2.5);
  ctx.stroke();
  ctx.setLineDash([]);
  vignette(ctx, env, bg.vignette ?? 0.35);
}

function notebook(ctx, bg, t, env) {
  const r = R(env), U = env.U, W = env.W;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 50) * U;
  const off = (t * (bg.speed ?? 0) * U) % s;
  ctx.strokeStyle = C(bg.color, env, '@secondary/0.25');
  ctx.lineWidth = 2 * U;
  ctx.beginPath();
  for (let y = r.Y - off; y < r.Y + r.H; y += s) { ctx.moveTo(r.X, y); ctx.lineTo(r.X + r.W, y); }
  ctx.stroke();
  ctx.strokeStyle = C(bg.color2, env, '@accent/0.6');
  ctx.lineWidth = 3 * U;
  const mx = (bg.side ?? 'right') === 'right' ? W * 0.88 : W * 0.12;
  ctx.beginPath(); ctx.moveTo(mx, r.Y); ctx.lineTo(mx, r.Y + r.H); ctx.stroke();
}

function words(ctx, bg, t, env) {
  const r = R(env), U = env.U, W = env.W, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg'));
  soft(ctx, env, 'words', 0.5, (ctx) => {
    const s = (bg.size ?? 150) * U;
    const txt = (bg.text || 'AUTOMATE • نور • MOTION •') + '  ';
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(((bg.angle ?? -12) * Math.PI) / 180);
    ctx.font = fontString('@display', env.theme, 800, s);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const tw = Math.max(10, ctx.measureText(txt).width);
    const L = Math.hypot(W, H) * 0.75;
    const col = C(bg.color, env, '@fg');
    let row = 0;
    for (let y = -L; y < L; y += s * 1.1, row++) {
      const dir = row % 2 ? 1 : -1;
      const off = ((t * (bg.speed ?? 60) * U * dir) % tw + tw) % tw;
      const outline = row % 2 === 1;
      for (let x = -L - tw + off; x < L; x += tw) {
        if (outline) { ctx.lineWidth = 2 * U; ctx.strokeStyle = rgba(col, (bg.alpha ?? 0.1) * 1.4); ctx.strokeText(txt, x, y); }
        else { ctx.fillStyle = rgba(col, bg.alpha ?? 0.1); ctx.fillText(txt, x, y); }
      }
    }
    ctx.restore();
  });
  vignette(ctx, env, bg.vignette ?? 0.45);
  void r;
}

function vhs(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  const g = ctx.createLinearGradient(0, r.Y, 0, r.Y + r.H);
  g.addColorStop(0, C(bg.base, env, '@bg'));
  g.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const fr = Math.floor(t * 12);
  // chroma tracking lines
  for (let k = 0; k < 7; k++) {
    const y = r.Y + sr(k * 3.3 + fr * 0.71) * r.H, hh = (2 + sr(k + fr) * 10) * U;
    ctx.fillStyle = rgba(k % 2 ? '#ff2a6d' : '#05d9e8', 0.16 + sr(k * 7 + fr) * 0.14);
    ctx.fillRect(r.X + (sr(k * 9 + fr) - 0.5) * 40 * U, y, r.W, hh);
  }
  // rolling bar
  const by = r.Y + fract(t * (bg.speed ?? 0.12)) * r.H * 1.2 - r.H * 0.1;
  const bgr = ctx.createLinearGradient(0, by - 60 * U, 0, by + 60 * U);
  bgr.addColorStop(0, 'rgba(255,255,255,0)');
  bgr.addColorStop(0.5, `rgba(255,255,255,${env.theme.dark ? 0.06 : 0.2})`);
  bgr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bgr;
  ctx.fillRect(r.X, by - 60 * U, r.W, 120 * U);
  // speckles
  ctx.fillStyle = C(bg.color, env, '@fg/0.25');
  for (let k = 0; k < 160; k++) ctx.fillRect(r.X + sr(k * 1.7 + fr * 3.1) * r.W, r.Y + sr(k * 2.9 + fr * 1.3) * r.H, (1 + sr(k)) * U * 2, U);
  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = r.Y; y < r.Y + r.H; y += 6 * U) ctx.fillRect(r.X, y, r.W, 2.5 * U);
  vignette(ctx, env, bg.vignette ?? 0.6);
}

function neon(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const S = Math.min(W, H);
  const shapes = bg.shape === 'circles' ? [0, 0, 0, 0, 0] : bg.shape === 'lines' ? [2, 2, 2, 2, 2, 2] : [1, 0, 2, 1, 3, 0];
  shapes.forEach((kind, i) => {
    const x = W * (0.15 + sr(i * 3.1 + (bg.seed ?? 0)) * 0.7) + Math.sin(t * 0.3 + i) * S * 0.02;
    const y = H * (0.12 + sr(i * 5.3 + (bg.seed ?? 0)) * 0.76) + Math.cos(t * 0.25 + i) * S * 0.02;
    const s = S * (0.1 + sr(i * 7.1) * 0.16);
    const flick = sr(i * 13 + Math.floor(t * 14)) > 0.95 ? 0.25 : 1;
    const col = i % 2 ? c2 : c1;
    const path = () => {
      ctx.beginPath();
      if (kind === 0) ctx.arc(x, y, s, 0, TAU);
      else if (kind === 1) ctx.rect(x - s, y - s * 0.6, s * 2, s * 1.2);
      else if (kind === 2) { ctx.moveTo(x - s * 1.4, y); ctx.lineTo(x + s * 1.4, y + s * 0.3); }
      else { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath(); }
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [lw, a] of [[22, 0.05], [12, 0.1], [6, 0.35]]) {
      ctx.strokeStyle = rgba(col, a * flick * (bg.alpha ?? 1));
      ctx.lineWidth = lw * U;
      path();
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(mix(col, '#ffffff', 0.55), 0.95 * flick * (bg.alpha ?? 1));
    ctx.lineWidth = 2.4 * U;
    path();
    ctx.stroke();
  });
}

function lasers(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 8);
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const top = bg.from === 'top';
  const L = Math.hypot(W, H) * 1.3;
  ctx.save();
  ctx.globalCompositeOperation = env.theme.dark ? 'lighter' : 'source-over';
  for (let i = 0; i < n; i++) {
    const ox = W * ((i + 0.5) / n), oy = top ? r.Y : r.Y + r.H;
    const ang = (top ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * (bg.speed ?? 0.8) + i * 1.3) * 0.55;
    const wd = (0.012 + sr(i) * 0.01);
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(ang) * L, oy + Math.sin(ang) * L);
    const col = i % 2 ? c2 : c1;
    g.addColorStop(0, rgba(col, 0.55));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(ang - wd) * L, oy + Math.sin(ang - wd) * L);
    ctx.lineTo(ox + Math.cos(ang + wd) * L, oy + Math.sin(ang + wd) * L);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const hz = ctx.createLinearGradient(0, top ? r.Y : r.Y + r.H, 0, H / 2);
  hz.addColorStop(0, rgba(c1, 0.18));
  hz.addColorStop(1, rgba(c1, 0));
  ctx.fillStyle = hz;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  void U;
}

function eq(ctx, bg, t, env) {
  const r = R(env), U = env.U, H = env.H;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.bars ?? 48);
  const bw = r.W / n;
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const g = ctx.createLinearGradient(0, r.Y + r.H, 0, H * 0.3);
  g.addColorStop(0, rgba(c1, bg.alpha ?? 0.5));
  g.addColorStop(1, rgba(c2, 0.05));
  ctx.fillStyle = g;
  const base = H * (bg.base_y ?? 1.0);
  for (let i = 0; i < n; i++) {
    const v = vn(i * 0.35, t * (bg.speed ?? 2)) * (0.4 + 0.6 * Math.sin((i / n) * Math.PI));
    const h = H * (bg.height ?? 0.5) * v;
    ctx.fillRect(r.X + i * bw + bw * 0.15, base - h, bw * 0.7, h + r.H);
    if (bg.mirror) ctx.fillRect(r.X + i * bw + bw * 0.15, r.Y, bw * 0.7, h * 0.6 + (-r.Y));
  }
  void U;
}

function streaks(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 110);
  const col = C(bg.color, env, '@fg');
  const fr = Math.floor(t * (bg.rate ?? 10));
  if ((bg.mode || 'radial') === 'radial') {
    const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.5);
    const Rm = Math.hypot(W, H);
    ctx.fillStyle = rgba(col, bg.alpha ?? 0.16);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = sr(i * 1.7 + fr * 0.37) * TAU;
      const r0 = Rm * (0.22 + sr(i * 2.3 + fr) * 0.25);
      const wd = 0.002 + sr(i * 3.9 + fr) * 0.012;
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a - wd) * Rm, cy + Math.sin(a - wd) * Rm);
      ctx.lineTo(cx + Math.cos(a + wd) * Rm, cy + Math.sin(a + wd) * Rm);
      ctx.closePath();
    }
    ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 0.3);
    g.addColorStop(0, rgba(env.theme.c.bg, 1));
    g.addColorStop(1, rgba(env.theme.c.bg, 0));
    ctx.fillStyle = g;
    ctx.fillRect(r.X, r.Y, r.W, r.H);
  } else {
    const acc = C(bg.color2, env, '@accent');
    for (let i = 0; i < n; i++) {
      const y = r.Y + sr(i * 4.1) * r.H;
      const sp = (0.6 + sr(i * 2.2) * 1.6) * (bg.speed ?? 1);
      const L = (120 + sr(i * 6.6) * 420) * U;
      const x = r.X + r.W - fract(sr(i * 9.3) + t * sp * 0.35) * (r.W + L);
      const gg = ctx.createLinearGradient(x, 0, x + L, 0);
      const c = i % 7 === 0 ? acc : col;
      gg.addColorStop(0, rgba(c, (bg.alpha ?? 0.16) * 2));
      gg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(x, y, L, (1 + sr(i) * 3) * U);
    }
  }
}

// ================================================================= space / nature
function galaxy(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 1100), arms = Math.round(bg.arms ?? 3);
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.45);
  const Rm = Math.max(W, H) * (bg.size ?? 0.55);
  const tilt = bg.tilt ?? 0.55;
  const core = C('@fg', env), c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const sp = (bg.speed ?? 1) * t;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 0.35);
  g.addColorStop(0, rgba(c1, 0.35));
  g.addColorStop(1, rgba(c1, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - Rm, cy - Rm, Rm * 2, Rm * 2);
  for (let i = 0; i < n; i++) {
    const rr = Math.pow(sr(i * 1.73), 0.7);
    const arm = i % arms;
    const ang = (arm / arms) * TAU + rr * (bg.twist ?? 4.2) + (sr(i * 3.1) - 0.5) * (0.35 + rr * 0.5) + sp * 0.22 / (0.3 + rr);
    const x = cx + Math.cos(ang) * rr * Rm, y = cy + Math.sin(ang) * rr * Rm * tilt;
    ctx.fillStyle = rr < 0.12 ? core : rr < 0.5 ? c1 : c2;
    ctx.globalAlpha = (0.25 + 0.75 * (1 - rr)) * (0.6 + 0.4 * sr(i * 9.7));
    const s = (1.4 + sr(i * 5.5) * 2.6) * U;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
  starDots(ctx, env, 80, t, core);
}

function rain(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  const g = ctx.createLinearGradient(0, r.Y, 0, r.Y + r.H);
  g.addColorStop(0, C(bg.base, env, '@bg'));
  g.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const n = Math.round(bg.count ?? 240), slant = bg.slant ?? 0.18;
  const col = C(bg.color, env, '@fg');
  ctx.lineCap = 'round';
  for (let layer = 0; layer < 3; layer++) {
    ctx.strokeStyle = rgba(col, 0.12 + layer * 0.1);
    ctx.lineWidth = (1 + layer * 0.7) * U;
    ctx.beginPath();
    for (let i = layer; i < n; i += 3) {
      const sp = (0.9 + layer * 0.5 + sr(i) * 0.4) * (bg.speed ?? 1);
      const y = r.Y + fract(sr(i * 2.1) + t * sp * 0.6) * r.H;
      const x = r.X + sr(i * 5.3) * r.W + (y - r.Y) * slant;
      const L = (30 + layer * 25 + sr(i * 7) * 30) * U;
      ctx.moveTo(x, y);
      ctx.lineTo(x - L * slant, y - L);
    }
    ctx.stroke();
  }
}

function snowfall(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  const g = ctx.createLinearGradient(0, r.Y, 0, r.Y + r.H);
  g.addColorStop(0, C(bg.base, env, '@bg'));
  g.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const n = Math.round(bg.count ?? 200);
  const col = C(bg.color, env, '@fg');
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = rgba(col, 0.25 + layer * 0.25);
    ctx.beginPath();
    for (let i = layer; i < n; i += 3) {
      const sp = (0.05 + layer * 0.04 + sr(i) * 0.03) * (bg.speed ?? 1);
      const y = r.Y + fract(sr(i * 2.7) + t * sp) * r.H;
      const x = r.X + sr(i * 4.9) * r.W + Math.sin(t * 0.8 + i) * 26 * U;
      const s = (1.5 + layer * 1.6 + sr(i * 8) * 1.5) * U;
      ctx.moveTo(x + s, y);
      ctx.arc(x, y, s, 0, TAU);
    }
    ctx.fill();
  }
}

function fireflies(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  const g = ctx.createLinearGradient(0, r.Y, 0, r.Y + r.H);
  g.addColorStop(0, C(bg.base, env, '@bg'));
  g.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const n = Math.round(bg.count ?? 46);
  const s1 = sprite(C(bg.color, env, '@accent')), s2 = sprite(C(bg.color2, env, '@secondary'));
  const sp = (bg.speed ?? 1) * t;
  for (let i = 0; i < n; i++) {
    const x = r.X + (sr(i * 1.9) + (vn(i * 3.1, sp * 0.15) - 0.5) * 0.25) * r.W;
    const y = r.Y + (sr(i * 6.7) + (vn(i * 5.3 + 50, sp * 0.13) - 0.5) * 0.25) * r.H;
    const p = Math.pow(Math.max(0, Math.sin(sp * (0.8 + sr(i) * 1.4) + i * 2.3)), 2);
    const s = (26 + sr(i * 3.3) * 40) * U * (bg.size ?? 1);
    ctx.globalAlpha = 0.15 + 0.85 * p;
    ctx.drawImage(i % 3 ? s1 : s2, x - s / 2, y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function sea(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  const sky = ctx.createLinearGradient(0, r.Y, 0, H * 0.5);
  sky.addColorStop(0, C(bg.base, env, '@bg'));
  sky.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = sky;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const n = Math.round(bg.layers ?? 5);
  const c1 = C(bg.color, env, '@secondary'), c2 = C(bg.color2, env, '@accent'), dk = C(bg.base, env, '@bg');
  const sp = (bg.speed ?? 1) * t;
  for (let l = 0; l < n; l++) {
    const f = l / Math.max(1, n - 1);
    const yb = H * ((bg.horizon ?? 0.42) + f * 0.42);
    const amp = H * (0.015 + f * 0.03);
    const wl = W * (0.35 + f * 0.25);
    ctx.fillStyle = mix(mix(c1, c2, f * 0.4), dk, 0.25 + f * 0.55);
    ctx.globalAlpha = 0.6 + f * 0.4;
    ctx.beginPath();
    ctx.moveTo(r.X, r.Y + r.H);
    for (let x = r.X; x <= r.X + r.W + 20; x += 20 * env.U) {
      const y = yb + Math.sin((x / wl) * TAU + sp * (0.5 + f * 0.6) + l * 1.7) * amp + Math.sin((x / wl) * TAU * 2.3 - sp * 0.7 + l) * amp * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(r.X + r.W, r.Y + r.H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function dunes(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  const sky = ctx.createLinearGradient(0, r.Y, 0, H * 0.6);
  sky.addColorStop(0, C(bg.base, env, '@bg'));
  sky.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = sky;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary'), dk = C(bg.base, env, '@bg');
  const sun = Math.min(W, H) * 0.12;
  ctx.fillStyle = rgba(c1, 0.85);
  ctx.beginPath(); ctx.arc(W * 0.72, H * 0.3, sun, 0, TAU); ctx.fill();
  const n = 5;
  const sp = (bg.speed ?? 1) * t * 0.03;
  for (let l = 0; l < n; l++) {
    const f = l / (n - 1);
    const yb = H * (0.5 + f * 0.36);
    ctx.fillStyle = mix(mix(c2, c1, 0.5 - f * 0.4), dk, 0.35 + f * 0.45);
    ctx.beginPath();
    ctx.moveTo(r.X, r.Y + r.H);
    for (let x = r.X; x <= r.X + r.W + 24; x += 24 * env.U) {
      const y = yb + Math.sin(x / (W * (0.5 + f * 0.3)) * Math.PI + l * 2.1 + sp * (1 + f)) * H * (0.05 - f * 0.01) + (vn(x * 0.002 / env.U + l * 9, l) - 0.5) * H * 0.04;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(r.X + r.W, r.Y + r.H);
    ctx.closePath();
    ctx.fill();
  }
}

// ================================================================= 3D
function terrain(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H, U = env.U;
  const hz = H * (bg.horizon ?? 0.42);
  const sky = ctx.createLinearGradient(0, r.Y, 0, hz);
  sky.addColorStop(0, C(bg.base, env, '@bg'));
  sky.addColorStop(1, C(bg.color3, env, '@bg2'));
  ctx.fillStyle = sky;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const col = C(bg.color, env, '@accent');
  const ground = C(bg.base, env, '@bg');
  const rows = Math.round(bg.rows ?? 30);
  const sp = (bg.speed ?? 1) * t * 0.7;
  const fr = fract(sp), base = Math.floor(sp);
  const amp = H * (bg.amp ?? 0.22);
  ctx.fillStyle = ground;
  ctx.fillRect(r.X, hz, r.W, r.Y + r.H - hz);
  ctx.lineWidth = 1.6 * U;
  for (let k = rows; k >= 1; k--) {
    const z = k - fr;
    const pz = 1.6 / (z * 0.32 + 0.6);
    const yb = hz + (r.Y + r.H - hz) * Math.min(1.2, pz * 0.42);
    const rowId = base + (rows - k);
    const ridge = new Path2D();
    let first = true;
    for (let x = r.X; x <= r.X + r.W + 1; x += 26 * U) {
      const wx = (x - W / 2) / pz;
      const n = fbm(wx * 0.0021 / U + 50, rowId * 0.21, 3);
      const mid = Math.abs(x - W / 2) / (W * 0.6);
      const h = Math.pow(Math.max(0, n - 0.32), 1.3) * amp * pz * (0.35 + Math.min(1, mid) * 0.9);
      const y = yb - h;
      first ? ridge.moveTo(x, y) : ridge.lineTo(x, y);
      first = false;
    }
    // hide farther ridges behind this one: fill only down to this row's base line
    const body = new Path2D(ridge);
    const by = Math.min(r.Y + r.H, yb + 4 * U);
    body.lineTo(r.X + r.W, by);
    body.lineTo(r.X, by);
    body.closePath();
    ctx.fillStyle = ground;
    ctx.fill(body);
    ctx.strokeStyle = rgba(col, clamp(0.12 + (1 - z / rows) * 0.8));
    ctx.stroke(ridge);
  }
  const fade = ctx.createLinearGradient(0, hz - 10 * U, 0, hz + H * 0.12);
  fade.addColorStop(0, rgba(env.theme.c.bg, 0.9));
  fade.addColorStop(1, rgba(env.theme.c.bg, 0));
  ctx.fillStyle = fade;
  ctx.fillRect(r.X, hz - 10 * U, r.W, H * 0.12);
}

function dotfield(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  const nx = Math.round(bg.cols ?? 44), nz = Math.round(bg.rows ?? 30);
  const sp = (bg.speed ?? 1) * t;
  const hz = H * (bg.horizon ?? 0.32);
  const F = W * 0.9;
  const amp = bg.amp ?? 0.22;
  for (let j = nz - 1; j >= 0; j--) {
    const z = 0.6 + j * 0.16;
    for (let i = 0; i < nx; i++) {
      const x = (i / (nx - 1) - 0.5) * 6;
      const y = Math.sin(x * 1.3 + sp * 1.2) * Math.cos(z * 0.9 - sp * 0.8) * amp;
      const sx = W / 2 + (x / z) * F * 0.3, sy = hz + ((1.1 - y) / z) * F * 0.32;
      if (sx < -W * 0.25 || sx > W * 1.25) continue;
      const s = (5.5 / z) * U;
      ctx.fillStyle = (i + j) % 6 === 0 ? c1 : c2;
      ctx.globalAlpha = clamp(1.3 / z) * (0.35 + 0.65 * (y + amp) / (2 * amp));
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function blocks(ctx, bg, t, env) {
  const W = env.W, H = env.H, U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  soft(ctx, env, 'blocks', 0.4, (ctx) => {
    const s = (bg.size ?? 90) * U;
    const cols = Math.ceil(W / (s * 1.73)) + 4, rows = Math.ceil(H / (s * 0.5)) + 6;
    const acc = C(bg.color, env, '@accent'), side = C(bg.color2, env, '@bg2');
    const base = C(bg.base, env, '@bg');
    const topC = mix(side, base, 0.2), leftC = mix(base, '#000000', 0.22), rightC = mix(base, '#000000', 0.38), hotC = mix(acc, base, 0.35);
    ctx.lineWidth = 1.2 * U;
    ctx.strokeStyle = rgba(acc, 0.22);
    const sp = (bg.speed ?? 1) * t;
    for (let j = 0; j < rows; j++) {
      const L = new Path2D(), Rt = new Path2D(), T = new Path2D(), Th = new Path2D();
      for (let i = 0; i < cols; i++) {
        const cx = (i - 2) * s * 1.73 + (j % 2 ? s * 0.865 : 0);
        const cy = (j - 4) * s * 0.5;
        const hgt = (0.2 + 1.4 * Math.pow(vn(i * 0.35 + sp * 0.25, j * 0.35), 2)) * s;
        const y = cy - hgt;
        L.moveTo(cx - s * 0.865, y); L.lineTo(cx, y + s * 0.5); L.lineTo(cx, cy + s); L.lineTo(cx - s * 0.865, cy + s * 0.5); L.closePath();
        Rt.moveTo(cx + s * 0.865, y); Rt.lineTo(cx, y + s * 0.5); Rt.lineTo(cx, cy + s); Rt.lineTo(cx + s * 0.865, cy + s * 0.5); Rt.closePath();
        const tp = hgt > s * 1.15 ? Th : T;
        tp.moveTo(cx, y - s * 0.5); tp.lineTo(cx + s * 0.865, y); tp.lineTo(cx, y + s * 0.5); tp.lineTo(cx - s * 0.865, y); tp.closePath();
      }
      ctx.fillStyle = leftC; ctx.fill(L);
      ctx.fillStyle = rightC; ctx.fill(Rt);
      ctx.fillStyle = topC; ctx.fill(T);
      ctx.fillStyle = hotC; ctx.fill(Th);
      ctx.stroke(T);
      ctx.stroke(Th);
    }
  });
  vignette(ctx, env, bg.vignette ?? 0.55);
}

// ================================================================= texture
const paperCache = new Map();
function paper(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const key = [Math.round(r.W), Math.round(r.H), env.px.toFixed(3), C(bg.color, env, '@fg')].join('|');
  let c = paperCache.get(key);
  if (!c) {
    if (paperCache.size > 6) paperCache.clear();
    const cw = Math.max(64, Math.round(r.W * env.px * 0.5)), ch = Math.max(64, Math.round(r.H * env.px * 0.5));
    c = makeCanvas(cw, ch);
    const x = c.getContext('2d');
    const col = C(bg.color, env, '@fg');
    x.lineCap = 'round';
    for (let i = 0; i < 700; i++) {
      const px = sr(i * 1.3) * cw, py = sr(i * 2.7) * ch, a = sr(i * 4.1) * TAU, L = (4 + sr(i * 6.6) * 18) * U * env.px * 0.5;
      x.strokeStyle = rgba(col, 0.025 + sr(i * 8.8) * 0.04);
      x.lineWidth = Math.max(0.5, U * env.px * 0.5 * (0.6 + sr(i) * 0.8));
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(a + 0.6) * L * 0.6, py + Math.sin(a + 0.6) * L * 0.6, px + Math.cos(a) * L, py + Math.sin(a) * L);
      x.stroke();
    }
    const d = x.getImageData(0, 0, cw, ch);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (sr(i * 0.13) - 0.5) * 18;
      d.data[i] = Math.max(0, Math.min(255, d.data[i] + n));
      d.data[i + 3] = Math.max(d.data[i + 3], 10);
    }
    x.putImageData(d, 0, 0);
    paperCache.set(key, c);
  }
  ctx.drawImage(c, r.X, r.Y, r.W, r.H);
  vignette(ctx, env, bg.vignette ?? 0.25);
  void t;
}

const grainTiles = [];
function grainTile(k) {
  if (grainTiles[k]) return grainTiles[k];
  const c = makeCanvas(160, 160);
  const x = c.getContext('2d');
  const d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.floor(sr(i * 0.71 + k * 77.7) * 255);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  grainTiles[k] = c;
  return c;
}
function grainy(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  const ang = ((bg.angle ?? 135) * Math.PI) / 180;
  const L = Math.hypot(W, H) * 0.6;
  soft(ctx, env, 'grainy', 0.15, (ctx) => {
  const g = ctx.createLinearGradient(W / 2 - Math.cos(ang) * L, H / 2 - Math.sin(ang) * L, W / 2 + Math.cos(ang) * L, H / 2 + Math.sin(ang) * L);
  g.addColorStop(0, C(bg.base, env, '@bg'));
  g.addColorStop(0.55, C(bg.color3, env, '@bg2'));
  g.addColorStop(1, C(bg.color, env, '@accent'));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  const b2 = ctx.createRadialGradient(W * 0.2, H * 0.85, 0, W * 0.2, H * 0.85, W * 0.8);
  b2.addColorStop(0, rgba(C(bg.color2, env, '@secondary'), 0.5));
  b2.addColorStop(1, rgba(C(bg.color2, env, '@secondary'), 0));
  ctx.fillStyle = b2;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
  });
  const pat = ctx.createPattern(grainTile(Math.floor(t * 18) % 3), 'repeat');
  if (pat) {
    ctx.save();
    ctx.globalAlpha = (bg.grain ?? 0.22) * 0.32;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function burst(ctx, bg, t, env) {
  const r = R(env), W = env.W, H = env.H;
  const c1 = C(bg.color, env, '@bg'), c2 = C(bg.color2, env, '@bg2');
  fill(ctx, env, c1);
  const n = Math.round(bg.count ?? 24);
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.5);
  const Rm = Math.hypot(W, H) * 1.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * (bg.speed ?? 0.06));
  ctx.fillStyle = c2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Rm, a, a + TAU / n / 2);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
  const acc = C(bg.glow, env, '@accent');
  g.addColorStop(0, rgba(acc, 0.35));
  g.addColorStop(0.4, rgba(acc, 0.08));
  g.addColorStop(1, rgba(env.theme.c.bg, bg.vignette ?? 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(r.X, r.Y, r.W, r.H);
}

function confettiBg(ctx, bg, t, env) {
  const r = R(env), U = env.U;
  fill(ctx, env, C(bg.base, env, '@bg'));
  const n = Math.round(bg.count ?? 90);
  const cols = [C(bg.color, env, '@accent'), C(bg.color2, env, '@secondary'), C('@fg/0.5', env)];
  for (let i = 0; i < n; i++) {
    const x = r.X + sr(i * 1.7) * r.W + Math.sin(t * 0.4 + i) * 12 * U;
    const y = r.Y + fract(sr(i * 3.9) + t * (bg.speed ?? 0.03) * (0.5 + sr(i))) * r.H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (0.3 + sr(i * 5)) + i);
    ctx.fillStyle = cols[i % 3];
    ctx.globalAlpha = bg.alpha ?? 0.55;
    const s = (8 + sr(i * 2) * 14) * U;
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, TAU); ctx.fill(); }
    else if (i % 3 === 1) ctx.fillRect(-s / 2, -s / 5, s, s / 2.5);
    else { ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}

// ================================================================= registry
export const EXTRA_DRAW = {
  liquid, nebula, lava, voronoi, clouds, smoke, curtain, led, conic, meshgrad, holo, sunset, halftone, checker, chevron, polka,
  iso, diamonds, squares, moire, kaleido, bauhaus, barcode, warp, ripples, orbits, flowfield, binary, blueprint, notebook, words,
  vhs, neon, lasers, eq, streaks, galaxy, rain, snowfall, fireflies, sea, dunes, terrain, dotfield, blocks, paper, grainy, burst,
  confetti: confettiBg,
};

export const EXTRA_TYPES = [
  ['liquid', 'سائل متدفق'], ['nebula', 'سديم'], ['lava', 'مصباح لافا'], ['voronoi', 'خلايا فورونوي'], ['clouds', 'غيوم'], ['smoke', 'دخان'],
  ['curtain', 'ستائر شفق'], ['led', 'شاشة LED'], ['conic', 'تدرج دائري'], ['meshgrad', 'تدرج شبكي'], ['holo', 'هولوغرام'], ['sunset', 'غروب البحر'],
  ['halftone', 'هاف تون'], ['checker', 'شطرنج'], ['chevron', 'متعرج'], ['polka', 'منقط'], ['iso', 'شبكة أيزومترية'], ['diamonds', 'معيّنات'],
  ['squares', 'مربعات دوّارة'], ['moire', 'تموّج مواريه'], ['kaleido', 'مشكال'], ['bauhaus', 'باوهاوس'], ['barcode', 'باركود'], ['warp', 'شبكة ملتوية'],
  ['ripples', 'تموجات ماء'], ['orbits', 'مدارات'], ['flowfield', 'حقل تدفق'], ['binary', 'كود ثنائي'], ['blueprint', 'مخطط هندسي'], ['notebook', 'دفتر'],
  ['words', 'جدار كلمات'], ['vhs', 'شريط VHS'], ['neon', 'أنابيب نيون'], ['lasers', 'ليزر'], ['eq', 'موجة صوتية'], ['streaks', 'خطوط سرعة'],
  ['galaxy', 'مجرة'], ['rain', 'مطر'], ['snowfall', 'ثلج'], ['fireflies', 'يراعات'], ['sea', 'بحر'], ['dunes', 'كثبان'],
  ['terrain', 'جبال سلكية'], ['dotfield', 'حقل نقاط 3D'], ['blocks', 'مكعبات 3D'], ['paper', 'ورق'], ['grainy', 'تدرج محبب'], ['burst', 'انفجار شعاعي'],
  ['confetti', 'كونفيتي'],
];
