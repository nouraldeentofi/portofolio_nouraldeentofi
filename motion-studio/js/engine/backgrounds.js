// Animated backgrounds. Each draws over the full frame (plus overscan for camera moves).
import { TAU, clamp, sr, rgba, noise2, fract, hash2, makeCanvas, ease, roundRectPath, lerp } from './util.js';
import { color } from './themes.js';
import { EXTRA_DRAW, EXTRA_TYPES } from './bg-extra.js';
import { soft } from './bg-soft.js';
export { BG_PRESETS, BG_CATS } from './bg-presets.js';
export { BG_PARAMS, BG_COLORS, BG_TOGGLES, BG_TEXTS, BG_CHOICES } from './bg-meta.js';

const BASE_TYPES = [
  ['mesh', 'شبكة نور الحية'], ['solid', 'لون واحد'], ['gradient', 'تدرج'], ['radial', 'إضاءة مركزية'], ['aurora', 'شفق'],
  ['blobs', 'بقع ملونة'], ['grid', 'شبكة'], ['floor', 'أرضية ثلاثية'], ['dots', 'نقاط'], ['waves', 'موجات'],
  ['stars', 'نجوم سريعة'], ['bokeh', 'بوكيه'], ['rays', 'أشعة'], ['stripes', 'خطوط مائلة'], ['rings', 'حلقات'],
  ['hex', 'خلايا'], ['matrix', 'مطر الكود'], ['plexus', 'بليكسس'], ['circuit', 'دارة'], ['tunnel', 'نفق'],
  ['spotlight', 'سبوت لايت'], ['contour', 'خطوط كنتور'], ['split', 'قسمين'], ['image', 'صورة'],
];
export const BG_TYPES = [...BASE_TYPES, ...EXTRA_TYPES];
export const BG_LABEL = Object.fromEntries(BG_TYPES);

const M = 0.22; // overscan
function base(ctx, env, c) {
  ctx.fillStyle = c;
  ctx.fillRect(-env.W * M, -env.H * M, env.W * (1 + 2 * M), env.H * (1 + 2 * M));
}
const C = (spec, env, fb) => color(spec || fb, env.theme);

// ---------------------------------------------------------------- brand node mesh
const meshCache = new Map();
function meshGeo(W, H, U, density, k) {
  const key = [W, H, U, density, k].join('|');
  if (meshCache.has(key)) return meshCache.get(key);
  const cell = (W > H ? 178 : 222) * U / density;
  const ow = W * (1 + 2 * M), oh = H * (1 + 2 * M);
  let cols = Math.max(3, Math.round(ow / cell)), rows = Math.max(4, Math.round(oh / cell));
  while (cols * rows > 320) { cols = Math.max(3, cols - 1); rows = Math.max(4, rows - 1); }
  const cw = ow / cols, ch = oh / rows;
  const nodes = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const s = c * 127.1 + r * 311.7;
    const jx = (sr(s) - 0.5) * 0.9, jy = (sr(s + 17.3) - 0.5) * 0.9;
    nodes.push({
      x: -W * M + (c + 0.5 + jx) * cw,
      y: -H * M + (r + 0.5 + jy) * ch,
      z: 0.55 + sr(s + 3.1) * 0.45,
      rr: 1.6 + sr(s + 5.7) * 2.2,
      ph: sr(s + 9.9) * TAU,
    });
  }
  const edges = [];
  const seen = new Set();
  const adj = nodes.map(() => []);
  nodes.forEach((n, i) => {
    const d = nodes.map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
    for (let q = 0; q < k; q++) {
      const j = d[q][0];
      const key2 = i < j ? i + '-' + j : j + '-' + i;
      if (seen.has(key2)) continue;
      seen.add(key2);
      edges.push([i, j]);
      adj[i].push(j);
      adj[j].push(i);
    }
  });
  const g = { nodes, edges, adj };
  meshCache.set(key, g);
  return g;
}
function pulsePath(g, seed, hops = 80) {
  const path = [];
  let cur = Math.floor(sr(seed * 3.3) * g.nodes.length);
  let prev = -1;
  for (let h = 0; h < hops; h++) {
    const opts = g.adj[cur].filter((j) => j !== prev);
    const list = opts.length ? opts : g.adj[cur];
    const nxt = list[Math.floor(sr(seed * 7.1 + h * 13.7) * list.length)];
    path.push([cur, nxt, 4 + sr(seed * 2.9 + h * 5.3) * 5]);
    prev = cur;
    cur = nxt;
  }
  return path;
}
const pulseCache = new Map();
function drawMesh(ctx, bg, time, env) {
  const th = env.theme, U = env.U;
  base(ctx, env, C(bg.color, env, '@bg'));
  const glows = bg.glows ?? th.mesh.glows;
  const W = env.W, H = env.H;
  if (glows) {
    const g1 = (x, y, rw, rh, col) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, rh / rw);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
      g.addColorStop(0, col);
      g.addColorStop(0.62, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rw, 0, TAU); ctx.fill();
      ctx.restore();
    };
    g1(W * 0.82, -H * 0.12, W * 0.62 * 1.3, H * 0.44 * 1.3, th.c.glowA);
    g1(W * 0.04, H * 1.12, W * 0.48 * 1.3, H * 0.38 * 1.3, th.c.glowB);
  }
  const density = bg.density ?? 1;
  const k = bg.k ?? 3;
  const g = meshGeo(W, H, U, density, k);
  const alpha = bg.alpha ?? th.mesh.alpha;
  const sc = 2.1 * U;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 1.3 * U;
  const lineCol = th.c.meshLine;
  for (const [i, j] of g.edges) {
    const a = g.nodes[i], b = g.nodes[j];
    const za = (a.z + b.z) / 2;
    ctx.strokeStyle = rgba(lineCol, Math.min(1, th.mesh.line * (0.22 + za * 0.34) * 1.6));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  const nodeCol = th.c.meshNode;
  const halo = th.id !== 'signal';
  for (const n of g.nodes) {
    const br = 0.5 + 0.5 * Math.sin((time / 5.2) * TAU + n.ph);
    const op = (0.28 + 0.3 * br) * n.z;
    const r = (n.rr * n.z + 1.2 * br * 0.5) * sc * 0.5;
    ctx.fillStyle = rgba(nodeCol, op);
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
    if (halo && n.z > 0.85) {
      ctx.strokeStyle = rgba(nodeCol, 0.1 + 0.07 * br);
      ctx.lineWidth = 1 * U;
      ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, TAU); ctx.stroke();
    }
  }
  // pulses hopping node to node
  const traffic = bg.traffic ?? 1;
  const count = Math.round(clamp(H / 150, 6, 36) * traffic);
  const speed = bg.speed ?? 1;
  const pkey = [W, H, U, density, k].join('|');
  let paths = pulseCache.get(pkey);
  if (!paths || paths.length < count) {
    paths = [];
    for (let p = 0; p < Math.max(count, 40); p++) paths.push(pulsePath(g, p + 1));
    pulseCache.set(pkey, paths);
  }
  const pc = th.c.meshPulse;
  for (let p = 0; p < count; p++) {
    const path = paths[p];
    const total = path.reduce((s, h) => s + h[2], 0);
    let tt = ((time * speed * 1.6 + sr(p * 4.7) * total) % total + total) % total;
    let hop = 0;
    while (hop < path.length - 1 && tt > path[hop][2]) { tt -= path[hop][2]; hop++; }
    const [ai, bi, d] = path[hop];
    const f = clamp(tt / d);
    const a = g.nodes[ai], b = g.nodes[bi];
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    const o = Math.sin(f * Math.PI) * 0.9;
    ctx.fillStyle = rgba(pc, o * 0.25);
    ctx.beginPath(); ctx.arc(x, y, 2.4 * sc * 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(pc, o);
    ctx.beginPath(); ctx.arc(x, y, 2.4 * sc * 0.55, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (bg.veil !== false) {
    // veil: quiet zone behind reading text
    ctx.save();
    ctx.translate(W / 2, H * (bg.veilY ?? 0.45));
    ctx.scale(1, (bg.veilH ?? 0.42) / 0.5 * (H / W));
    const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
    vg.addColorStop(0, rgba(th.c.bg, 0.55));
    vg.addColorStop(1, rgba(th.c.bg, 0));
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(0, 0, W * 0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- simple fills
function gradient(ctx, bg, time, env) {
  const W = env.W, H = env.H;
  const ang = (((bg.angle ?? 160) + (bg.drift !== false ? Math.sin(time * 0.2) * 12 : 0)) * Math.PI) / 180;
  const cx = W / 2, cy = H / 2, L = Math.hypot(W, H) * 0.6;
  const g = ctx.createLinearGradient(cx - Math.sin(ang) * L, cy + Math.cos(ang) * L, cx + Math.sin(ang) * L, cy - Math.cos(ang) * L);
  const cols = bg.colors || [bg.c1 || '@bg', bg.c2 || '@bg2'];
  cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), C(c, env)));
  base(ctx, env, g);
}
function radial(ctx, bg, time, env) {
  const W = env.W, H = env.H;
  base(ctx, env, C(bg.c2, env, '@bg'));
  const x = W * (bg.x ?? 0.5) + Math.sin(time * 0.3) * W * 0.03, y = H * (bg.y ?? 0.4);
  const R = Math.hypot(W, H) * (bg.size ?? 0.6);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, C(bg.c1, env, '@bg2'));
  g.addColorStop(1, rgba(C(bg.c2, env, '@bg'), 1));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  if (bg.glow !== false) {
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, R * 0.5);
    g2.addColorStop(0, rgba(env.theme.c.accent, 0.12));
    g2.addColorStop(1, rgba(env.theme.c.accent, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  }
}
function blobLayer(ctx, env, cols, time, sp, alpha, size) {
  const W = env.W, H = env.H;
  cols.forEach((c, i) => {
    const x = W * (0.5 + 0.38 * Math.sin(time * 0.21 * sp + i * 2.1) * Math.cos(time * 0.13 * sp + i));
    const y = H * (0.5 + 0.36 * Math.cos(time * 0.17 * sp + i * 1.7));
    const r = Math.max(W, H) * (size + 0.08 * Math.sin(time * 0.3 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, alpha));
    g.addColorStop(0.5, rgba(c, alpha * 0.4));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    const x0 = Math.max(-W * M, x - r), y0 = Math.max(-H * M, y - r);
    const x1 = Math.min(W * (1 + M), x + r), y1 = Math.min(H * (1 + M), y + r);
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  });
}
function aurora(ctx, bg, time, env) {
  base(ctx, env, C(bg.color, env, '@bg'));
  const cols = (bg.colors || [bg.c1 || '@accent', bg.c2 || '@secondary', bg.c3 || '@bg2']).map((c) => C(c, env));
  const W = env.W, H = env.H;
  const mode = env.theme.dark ? 'screen' : 'multiply';
  const layer = (ctx) => cols.forEach((c, i) => {
    ctx.save();
    ctx.translate(W / 2, H * (0.3 + i * 0.12));
    ctx.rotate(Math.sin(time * 0.15 + i) * 0.25 - 0.2);
    ctx.scale(1, 0.32);
    const r = W * (0.75 + 0.1 * Math.sin(time * 0.4 + i * 2));
    const ox = Math.sin(time * 0.23 * (bg.speed ?? 1) + i * 1.9) * W * 0.3;
    const g = ctx.createRadialGradient(ox, 0, 0, ox, 0, r);
    g.addColorStop(0, rgba(c, env.theme.dark ? 0.42 : 0.3));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-W * 1.5, -H * 3, W * 3, H * 6);
    ctx.restore();
  });
  ctx.save();
  ctx.globalCompositeOperation = mode;
  soft(ctx, env, 'aurora', 0.2, layer);
  ctx.restore();
}
function blobs(ctx, bg, time, env) {
  base(ctx, env, C(bg.color, env, '@bg'));
  const cols = (bg.colors || [bg.c1 || '@accent', bg.c2 || '@secondary', bg.c3 || '@bg2', bg.c1 || '@accent']).map((c) => C(c, env));
  soft(ctx, env, 'blobs', 0.2, (x) => blobLayer(x, env, cols, time, bg.speed ?? 1, env.theme.dark ? 0.32 : 0.36, bg.size ?? 0.42));
}
function grid(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 90) * U;
  const off = (time * (bg.speed ?? 12) * U) % s;
  ctx.strokeStyle = C(bg.color, env, '@fg/0.07');
  ctx.lineWidth = Math.max(1, 1.4 * U);
  ctx.beginPath();
  for (let x = -W * M - s + off; x < W * (1 + M) + s; x += s) { ctx.moveTo(x, -H * M); ctx.lineTo(x, H * (1 + M)); }
  for (let y = -H * M - s + off; y < H * (1 + M) + s; y += s) { ctx.moveTo(-W * M, y); ctx.lineTo(W * (1 + M), y); }
  ctx.stroke();
  // fade the grid towards the edges
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, rgba(env.theme.c.bg, 0));
  g.addColorStop(1, rgba(env.theme.c.bg, 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  if (bg.glow !== false) {
    const g2 = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.6);
    g2.addColorStop(0, rgba(env.theme.c.accent, 0.1));
    g2.addColorStop(1, rgba(env.theme.c.accent, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  }
}
function floor(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U, th = env.theme;
  const hz = H * (bg.horizon ?? 0.52);
  const sky = ctx.createLinearGradient(0, -H * M, 0, hz);
  sky.addColorStop(0, th.c.bg);
  sky.addColorStop(1, C(bg.sky, env, '@bg2'));
  base(ctx, env, th.c.bg);
  ctx.fillStyle = sky;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), hz + H * M);
  const col = C(bg.color, env, '@accent');
  if (bg.sun !== false) {
    const r = Math.min(W, H) * 0.26;
    ctx.save();
    ctx.beginPath(); ctx.rect(-W * M, -H * M, W * (1 + 2 * M), hz + H * M); ctx.clip();
    const g = ctx.createLinearGradient(0, hz - r * 1.6, 0, hz);
    g.addColorStop(0, C(bg.sun2, env, '@secondary'));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(W / 2, hz - r * 0.15, r, 0, TAU); ctx.fill();
    ctx.fillStyle = th.c.bg;
    for (let i = 0; i < 6; i++) {
      const y = hz - r * 0.1 - i * r * 0.16 + ((time * 10 * U) % (r * 0.16));
      ctx.fillRect(W / 2 - r, y, r * 2, r * 0.035 * (6 - i) * 0.5);
    }
    ctx.restore();
    const hg = ctx.createRadialGradient(W / 2, hz, 0, W / 2, hz, W * 0.7);
    hg.addColorStop(0, rgba(col, 0.35));
    hg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(-W * M, hz - H * 0.4, W * (1 + 2 * M), H * 0.8);
  }
  ctx.fillStyle = C(bg.ground, env, '@bg');
  ctx.fillRect(-W * M, hz, W * (1 + 2 * M), H * (1 + M) - hz);
  ctx.strokeStyle = col;
  const glowW = 9 * U, lineW = 2.2 * U;
  const glowLine = () => {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.22;
    ctx.lineWidth = glowW;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = lineW;
    ctx.stroke();
  };
  const depth = H * (1 + M) - hz;
  const ph = fract(time * (bg.speed ?? 0.6));
  for (let k = 1; k < 26; k++) {
    const z = k - ph;
    if (z <= 0.05) continue;
    const y = hz + depth / (z * 0.55 + 0.45) * 0.55 / 1.0;
    const yy = hz + (depth * 1.0) / (z * 0.6);
    const fy = Math.min(yy, H * (1 + M));
    ctx.globalAlpha = clamp((fy - hz) / (H * 0.25)) * 0.9;
    ctx.beginPath(); ctx.moveTo(-W * M, fy); ctx.lineTo(W * (1 + M), fy); glowLine();
    void y;
  }
  ctx.globalAlpha = 1;
  for (let i = -16; i <= 16; i++) {
    const xb = W / 2 + i * W * 0.16;
    ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(W / 2 + i * W * 0.004, hz); ctx.lineTo(W / 2 + (xb - W / 2) * 2.6, H * (1 + M)); glowLine();
  }
  ctx.globalAlpha = 1;
  const fade = ctx.createLinearGradient(0, hz - 2, 0, hz + H * 0.12);
  fade.addColorStop(0, rgba(th.c.bg, 0.95));
  fade.addColorStop(1, rgba(th.c.bg, 0));
  ctx.fillStyle = fade;
  ctx.fillRect(-W * M, hz - 2, W * (1 + 2 * M), H * 0.12 + 2);
}
function dots(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 54) * U;
  const col = C(bg.color, env, '@fg/0.22');
  const acc = env.theme.c.accent;
  ctx.fillStyle = col;
  for (let x = -W * M; x < W * (1 + M); x += s) for (let y = -H * M; y < H * (1 + M); y += s) {
    const d = Math.hypot(x - W / 2, y - H / 2) / Math.max(W, H);
    const wv = bg.wave === false ? 0 : Math.max(0, Math.sin(d * 14 - time * 2.2));
    const r = (2 + wv * 3.2) * U;
    if (wv > 0.85) { ctx.fillStyle = rgba(acc, 0.5 * wv); } else ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}
function waves(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.lines ?? 14;
  const c1 = C(bg.color, env, '@accent'), c2 = C(bg.color2, env, '@secondary');
  ctx.lineWidth = 2 * U;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    ctx.strokeStyle = rgba(i % 3 === 0 ? c1 : c2, 0.08 + 0.3 * Math.sin(f * Math.PI));
    ctx.beginPath();
    for (let x = -W * M; x <= W * (1 + M); x += 12 * U) {
      const y = H * (0.3 + f * 0.5) + Math.sin(x / (W * 0.18) + time * (bg.speed ?? 0.8) + i * 0.35) * H * (bg.amp ?? 0.05) + Math.sin(x / (W * 0.07) - time * 0.6 + i) * H * 0.012;
      x === -W * M ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
function stars(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 240;
  const col = C(bg.color, env, '@fg');
  const acc = env.theme.c.accent;
  const sp = bg.speed ?? 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x0 = (sr(i * 1.31) - 0.5) * 2, y0 = (sr(i * 2.77) - 0.5) * 2;
    const z = 1 - fract(time * 0.12 * sp + sr(i * 5.1));
    const z2 = Math.min(1, z + 0.035 * sp);
    const k = 0.5 / Math.max(0.02, z), k2 = 0.5 / Math.max(0.02, z2);
    const x = W / 2 + x0 * k * W * 0.5, y = H / 2 + y0 * k * H * 0.5;
    const xp = W / 2 + x0 * k2 * W * 0.5, yp = H / 2 + y0 * k2 * H * 0.5;
    const a = clamp((1 - z) * 1.6);
    ctx.strokeStyle = rgba(i % 9 === 0 ? acc : col, a);
    ctx.lineWidth = (1 + (1 - z) * 3) * U;
    ctx.beginPath(); ctx.moveTo(xp, yp); ctx.lineTo(x, y); ctx.stroke();
  }
}
function bokeh(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const cols = (bg.colors || [bg.c1 || '@accent', bg.c2 || '@secondary', bg.c3 || '@fg']).map((c) => C(c, env));
  const n = bg.count ?? 26;
  soft(ctx, env, 'bokeh', 0.34, (ctx) => {
  for (let i = 0; i < n; i++) {
    const x = (fract(sr(i * 3.3) + time * 0.01 * (sr(i) - 0.5)) * (1 + 2 * M) - M) * W;
    const y = (fract(sr(i * 7.7) - time * 0.012 * (0.5 + sr(i * 2))) * (1 + 2 * M) - M) * H;
    const r = (40 + sr(i * 9.1) * 140) * U;
    const a = (0.06 + sr(i * 4.4) * 0.14) * (0.7 + 0.3 * Math.sin(time + i));
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
    const c = cols[i % cols.length];
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(0.85, rgba(c, a * 0.8));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  });
}
function rays(ctx, bg, time, env) {
  const W = env.W, H = env.H;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 18;
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.45);
  const R = Math.hypot(W, H) * 1.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * (bg.speed ?? 0.08));
  ctx.fillStyle = C(bg.color, env, '@accent/0.07');
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a, a + TAU / n / 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
  g.addColorStop(0, rgba(env.theme.c.accent, 0.18));
  g.addColorStop(0.5, rgba(env.theme.c.bg, 0));
  g.addColorStop(1, rgba(env.theme.c.bg, 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
}
function stripes(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.width ?? 70) * U;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(((bg.angle ?? -35) * Math.PI) / 180);
  const L = Math.hypot(W, H);
  const off = (time * (bg.speed ?? 40) * U) % (s * 2);
  ctx.fillStyle = C(bg.color, env, '@fg/0.045');
  for (let x = -L - s * 2 + off; x < L; x += s * 2) ctx.fillRect(x, -L, s, L * 2);
  ctx.restore();
}
function rings(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 9;
  const cx = W * (bg.x ?? 0.5), cy = H * (bg.y ?? 0.5);
  const R = Math.hypot(W, H) * 0.65;
  const col = C(bg.color, env, '@accent');
  for (let i = 0; i < n; i++) {
    const f = fract(time * (bg.speed ?? 0.12) + i / n);
    ctx.strokeStyle = rgba(col, 0.32 * (1 - f));
    ctx.lineWidth = (2 + 6 * (1 - f)) * U;
    ctx.beginPath(); ctx.arc(cx, cy, f * R, 0, TAU); ctx.stroke();
  }
}
function hex(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 58) * U;
  const hw = Math.sqrt(3) * s, hh = 1.5 * s;
  const col = C(bg.color, env, '@fg/0.09');
  const acc = env.theme.c.accent;
  ctx.lineWidth = 1.5 * U;
  let row = 0;
  for (let y = -H * M; y < H * (1 + M) + s; y += hh, row++) {
    let colI = 0;
    for (let x = -W * M + (row % 2 ? hw / 2 : 0); x < W * (1 + M) + s; x += hw, colI++) {
      const n = noise2(colI * 0.35 + time * 0.25, row * 0.35 - time * 0.15, 2);
      const lit = n > 0.66;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * TAU) / 6;
        const px = x + Math.cos(a) * s * 0.94, py = y + Math.sin(a) * s * 0.94;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      if (lit) { ctx.fillStyle = rgba(acc, (n - 0.66) * 0.9); ctx.fill(); }
      ctx.strokeStyle = col;
      ctx.stroke();
    }
  }
}

const MCH = '01ابتثجحخدذرزسشصضطظعغفقكلمنهوي<>/{}[]=+*#$';
function matrix(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = (bg.size ?? 30) * U;
  const col = C(bg.color, env, '@accent');
  ctx.font = `600 ${s.toFixed(1)}px "JetBrains Mono", "IBM Plex Sans Arabic", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cols = Math.ceil((W * (1 + 2 * M)) / s);
  for (let c = 0; c < cols; c++) {
    const x = -W * M + c * s + s / 2;
    const sp = 0.08 + sr(c * 3.7) * 0.16;
    const head = fract(time * sp * (bg.speed ?? 1) + sr(c * 9.1)) * (H * (1 + 2 * M) + 20 * s) - H * M;
    for (let k = 0; k < 20; k++) {
      const y = head - k * s;
      if (y < -H * M || y > H * (1 + M)) continue;
      const ch = MCH[Math.floor(hash2(c, Math.floor(y / s) + Math.floor(time * 6 + k)) * MCH.length)];
      const a = k === 0 ? 1 : (1 - k / 20) * 0.55;
      ctx.fillStyle = k === 0 ? env.theme.c.fg : rgba(col, a);
      ctx.fillText(ch, x, Math.floor(y / s) * s);
    }
  }
  const g = ctx.createLinearGradient(0, -H * M, 0, H * (1 + M));
  g.addColorStop(0, rgba(env.theme.c.bg, 0.6));
  g.addColorStop(0.5, rgba(env.theme.c.bg, 0.15));
  g.addColorStop(1, rgba(env.theme.c.bg, 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
}
function plexus(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 70;
  const col = C(bg.color, env, '@secondary');
  const acc = env.theme.c.accent;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = (fract(sr(i * 1.7) + time * 0.012 * (sr(i * 3.1) - 0.5)) * (1 + 2 * M) - M) * W + (noise2(i, time * 0.2) - 0.5) * 80 * U;
    const y = (fract(sr(i * 5.3) + time * 0.01 * (sr(i * 7.9) - 0.5)) * (1 + 2 * M) - M) * H + (noise2(i + 50, time * 0.2) - 0.5) * 80 * U;
    pts.push([x, y]);
  }
  const D = (bg.dist ?? 210) * U;
  ctx.lineWidth = 1.4 * U;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
    const d = Math.hypot(dx, dy);
    if (d < D) {
      ctx.strokeStyle = rgba(col, (1 - d / D) * 0.35);
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
    }
  }
  pts.forEach(([x, y], i) => {
    ctx.fillStyle = i % 7 === 0 ? acc : rgba(col, 0.7);
    ctx.beginPath(); ctx.arc(x, y, (i % 7 === 0 ? 4.5 : 3) * U, 0, TAU); ctx.fill();
  });
}
const circuitCache = new Map();
function circuit(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const s = 48 * U;
  const key = [W, H, U].join('|');
  let traces = circuitCache.get(key);
  if (!traces) {
    traces = [];
    const cols = Math.ceil((W * (1 + 2 * M)) / s), rows = Math.ceil((H * (1 + 2 * M)) / s);
    for (let t = 0; t < 34; t++) {
      let cx = Math.floor(sr(t * 3.1) * cols), cy = Math.floor(sr(t * 5.7) * rows);
      let dir = Math.floor(sr(t * 7.3) * 4);
      const pts = [[cx, cy]];
      const len = 5 + Math.floor(sr(t * 9.9) * 12);
      for (let k = 0; k < len; k++) {
        if (sr(t * 11.3 + k * 1.7) < 0.3) dir = (dir + (sr(t + k) < 0.5 ? 1 : 3)) % 4;
        cx += [1, 0, -1, 0][dir]; cy += [0, 1, 0, -1][dir];
        pts.push([cx, cy]);
      }
      traces.push(pts.map(([x, y]) => [-W * M + x * s, -H * M + y * s]));
    }
    circuitCache.set(key, traces);
  }
  const col = C(bg.color, env, '@fg/0.12');
  const pc = C(bg.pulse, env, '@accent');
  ctx.lineWidth = 2.2 * U;
  ctx.lineJoin = 'round';
  traces.forEach((pts, ti) => {
    ctx.strokeStyle = col;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    const [ex, ey] = pts[pts.length - 1];
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(ex, ey, 6 * U, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 4 * U, 0, TAU); ctx.fill();
    const f = fract(time * 0.25 + sr(ti * 2.3));
    const seg = f * (pts.length - 1);
    const i = Math.floor(seg), r = seg - i;
    const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
    const x = a[0] + (b[0] - a[0]) * r, y = a[1] + (b[1] - a[1]) * r;
    ctx.fillStyle = rgba(pc, 0.25);
    ctx.beginPath(); ctx.arc(x, y, 12 * U, 0, TAU); ctx.fill();
    ctx.fillStyle = pc;
    ctx.beginPath(); ctx.arc(x, y, 4.5 * U, 0, TAU); ctx.fill();
  });
}
function tunnel(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 16;
  const col = C(bg.color, env, '@accent'), col2 = C(bg.color2, env, '@secondary');
  const cx = W / 2, cy = H / 2;
  const R = Math.max(W, H) * 0.9;
  for (let i = n - 1; i >= 0; i--) {
    const z = fract(i / n - time * (bg.speed ?? 0.08));
    const k = Math.pow(z, 2.2);
    const s = R * k;
    ctx.save();
    ctx.translate(cx + Math.sin(time * 0.5 + z * 3) * W * 0.04 * (1 - z), cy + Math.cos(time * 0.4 + z * 3) * H * 0.03 * (1 - z));
    ctx.rotate(z * 0.9 + time * 0.1);
    ctx.strokeStyle = rgba(i % 2 ? col : col2, clamp(z * 1.4) * 0.6);
    ctx.lineWidth = (1 + z * 5) * U;
    if (bg.round) { ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); }
    else roundRectPath(ctx, -s, -s, s * 2, s * 2, s * 0.18);
    ctx.stroke();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.25);
  g.addColorStop(0, rgba(env.theme.c.bg, 1));
  g.addColorStop(1, rgba(env.theme.c.bg, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
}
function spotlight(ctx, bg, time, env) {
  const W = env.W, H = env.H;
  base(ctx, env, C(bg.base, env, '@bg'));
  const x = W * (0.5 + 0.28 * Math.sin(time * 0.35 * (bg.speed ?? 1))), y = H * (0.42 + 0.18 * Math.sin(time * 0.27 * (bg.speed ?? 1) + 1));
  const R = Math.max(W, H) * 0.55;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  const col = C(bg.color, env, '@fg');
  g.addColorStop(0, rgba(col, env.theme.dark ? 0.13 : 0.5));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  const g2 = ctx.createRadialGradient(x, y, 0, x, y, R * 0.45);
  g2.addColorStop(0, rgba(env.theme.c.accent, 0.12));
  g2.addColorStop(1, rgba(env.theme.c.accent, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
}
function contour(ctx, bg, time, env) {
  const W = env.W, H = env.H, U = env.U;
  base(ctx, env, C(bg.base, env, '@bg'));
  const n = bg.count ?? 16;
  const cx = W * (bg.x ?? 0.62), cy = H * (bg.y ?? 0.42);
  const step = Math.max(W, H) * 0.06;
  const col = C(bg.color, env, '@fg/0.1');
  const acc = env.theme.c.accent;
  ctx.lineWidth = 1.6 * U;
  for (let k = 1; k <= n; k++) {
    ctx.strokeStyle = k % 5 === 0 ? rgba(acc, 0.35) : col;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * TAU;
      const nn = noise2(Math.cos(a) * 1.1 + k * 0.08 + 10, Math.sin(a) * 1.1 + time * 0.06, 3);
      const r = k * step * (0.75 + nn * 0.6);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}
function split(ctx, bg, time, env) {
  const W = env.W, H = env.H;
  base(ctx, env, C(bg.c1, env, '@bg'));
  const a = ((bg.angle ?? 12) * Math.PI) / 180;
  const p = ease('expoOut', clamp(time / 0.9));
  const r = bg.ratio ?? 0.5;
  ctx.save();
  ctx.translate(W / 2, H * r + H * (1 - p) * 0.8);
  ctx.rotate(a);
  ctx.fillStyle = C(bg.c2, env, '@bg2');
  ctx.fillRect(-W * 2, 0, W * 4, H * 3);
  ctx.restore();
}
function imageBg(ctx, bg, time, env, dur) {
  const W = env.W, H = env.H;
  base(ctx, env, env.theme.c.bg);
  const img = bg.src && env.images ? env.images.get(bg.src) : null;
  if (img && (img.naturalWidth || img.width)) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max((W * (1 + 2 * M * 0.5)) / iw, (H * (1 + 2 * M * 0.5)) / ih) * (1 + (bg.kenburns ?? 0.08) * clamp(time / Math.max(1, dur || 6)));
    if (bg.blur) ctx.filter = `blur(${(bg.blur * env.U * env.px).toFixed(1)}px)`;
    ctx.drawImage(img, W / 2 - (iw * s) / 2, H / 2 - (ih * s) / 2, iw * s, ih * s);
    ctx.filter = 'none';
  } else {
    blobLayer(ctx, env, [env.theme.c.accent, env.theme.c.secondary], time, 1, 0.25, 0.45);
  }
  const dim = bg.dim ?? 0.45;
  if (dim > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(env.theme.c.bg, dim * 0.7));
    g.addColorStop(1, rgba(env.theme.c.bg, Math.min(1, dim * 1.4)));
    ctx.fillStyle = g;
    ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  }
}

const DRAW = {
  mesh: drawMesh, solid: (ctx, bg, t, env) => base(ctx, env, C(bg.color, env, '@bg')), gradient, radial, aurora, blobs, grid, floor, dots, waves,
  stars, bokeh, rays, stripes, rings, hex, matrix, plexus, circuit, tunnel, spotlight, contour, split, image: imageBg,
  ...EXTRA_DRAW,
};

export function drawBackground(ctx, bg, time, env, dur) {
  const fn = DRAW[(bg && bg.type) || 'mesh'] || drawMesh;
  fn(ctx, bg || {}, time, env, dur);
}

// ---------------------------------------------------------------- overlays
let grainTiles = null;
function grain() {
  if (grainTiles) return grainTiles;
  grainTiles = [];
  for (let k = 0; k < 4; k++) {
    const c = makeCanvas(192, 192);
    const g = c.getContext('2d');
    const d = g.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.floor(sr(i * 0.37 + k * 913.1) * 255);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    grainTiles.push(c);
  }
  return grainTiles;
}
export function drawOverlay(ctx, fx, time, env) {
  if (!fx) return;
  const W = env.W, H = env.H;
  if (fx.vignette) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${0.6 * fx.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (fx.scanlines) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const s = 4 * env.U;
    for (let y = 0; y < H; y += s * 2) ctx.fillRect(0, y, W, s);
  }
  if (fx.grain) {
    const tiles = grain();
    const tile = tiles[Math.floor(time * 24) % tiles.length];
    const pat = ctx.createPattern(tile, 'repeat');
    if (pat) {
      ctx.save();
      ctx.globalAlpha = 0.09 * fx.grain;
      ctx.globalCompositeOperation = env.theme.dark ? 'overlay' : 'multiply';
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  if (fx.letterbox) {
    const b = H * fx.letterbox;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, b);
    ctx.fillRect(0, H - b, W, b);
  }
}
