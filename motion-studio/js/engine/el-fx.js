// 3D wireframe/point objects (own tiny projector) and particle systems.
import { TAU, clamp, ease, sr, rgba, noise2, roundRectPath } from './util.js';
import { color } from './themes.js';

const Uv = (v, env) => (v ?? 0) * env.U;

// ---------------------------------------------------------------- geometry cache
const geo = new Map();
function fib(n) {
  const pts = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), a = g * i;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}
function build(shape) {
  if (geo.has(shape)) return geo.get(shape);
  let pts = [], lines = [], polys = [];
  const phi = (1 + Math.sqrt(5)) / 2;
  switch (shape) {
    case 'globe': {
      for (let la = -75; la <= 75; la += 25) {
        const ring = [];
        for (let k = 0; k <= 48; k++) {
          const a = (k / 48) * TAU, r = Math.cos((la * Math.PI) / 180);
          ring.push([Math.cos(a) * r, Math.sin((la * Math.PI) / 180), Math.sin(a) * r]);
        }
        polys.push(ring);
      }
      for (let lo = 0; lo < 180; lo += 22.5) {
        const ring = [];
        for (let k = 0; k <= 48; k++) {
          const a = (k / 48) * TAU, b = (lo * Math.PI) / 180;
          ring.push([Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)]);
        }
        polys.push(ring);
      }
      pts = fib(140);
      break;
    }
    case 'sphere': pts = fib(520); break;
    case 'cube': {
      const v = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x * 0.72, y * 0.72, z * 0.72]);
      pts = v;
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const d = Math.abs(v[i][0] - v[j][0]) + Math.abs(v[i][1] - v[j][1]) + Math.abs(v[i][2] - v[j][2]);
        if (Math.abs(d - 1.44) < 0.01) lines.push([i, j]);
      }
      const inner = v.map((p) => p.map((c) => c * 0.45));
      inner.forEach((p) => pts.push(p));
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const d = Math.abs(v[i][0] - v[j][0]) + Math.abs(v[i][1] - v[j][1]) + Math.abs(v[i][2] - v[j][2]);
        if (Math.abs(d - 1.44) < 0.01) lines.push([i + 8, j + 8]);
      }
      for (let i = 0; i < 8; i++) lines.push([i, i + 8]);
      break;
    }
    case 'icosa': {
      const v = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
      const n = Math.hypot(1, phi);
      pts = v.map((p) => p.map((c) => c / n));
      for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
        const d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
        if (Math.abs(d - 2) < 0.01) lines.push([i, j]);
      }
      break;
    }
    case 'pyramid': {
      pts = [[0, -0.95, 0], [-0.85, 0.55, -0.85], [0.85, 0.55, -0.85], [0.85, 0.55, 0.85], [-0.85, 0.55, 0.85]];
      lines = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1]];
      break;
    }
    case 'torus': {
      const R = 0.7, r = 0.28, U = 36, V = 14;
      for (let i = 0; i < U; i++) {
        const ring = [];
        for (let j = 0; j <= V; j++) {
          const u = (i / U) * TAU, v = (j / V) * TAU;
          ring.push([(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]);
        }
        polys.push(ring);
      }
      for (let j = 0; j < V; j += 2) {
        const ring = [];
        for (let i = 0; i <= 60; i++) {
          const u = (i / 60) * TAU, v = (j / V) * TAU;
          ring.push([(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]);
        }
        polys.push(ring);
      }
      break;
    }
    case 'knot': {
      const ring = [];
      for (let i = 0; i <= 420; i++) {
        const t = (i / 420) * TAU;
        const r = 0.42 * (2 + Math.cos(3 * t));
        ring.push([r * Math.cos(2 * t) * 0.6, 0.42 * Math.sin(3 * t) * 0.9, r * Math.sin(2 * t) * 0.6]);
      }
      polys.push(ring);
      break;
    }
    case 'helix': {
      for (let s = 0; s < 2; s++) {
        const ring = [];
        for (let i = 0; i <= 120; i++) {
          const t = i / 120, a = t * TAU * 2.2 + s * Math.PI;
          ring.push([Math.cos(a) * 0.42, -1 + t * 2, Math.sin(a) * 0.42]);
        }
        polys.push(ring);
      }
      for (let i = 0; i <= 120; i += 6) {
        const t = i / 120, a = t * TAU * 2.2;
        pts.push([Math.cos(a) * 0.42, -1 + t * 2, Math.sin(a) * 0.42], [Math.cos(a + Math.PI) * 0.42, -1 + t * 2, Math.sin(a + Math.PI) * 0.42]);
        lines.push([pts.length - 2, pts.length - 1]);
      }
      break;
    }
    case 'grid3d': {
      for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) pts.push([x * 0.36, y * 0.36, z * 0.36]);
      break;
    }
    default: pts = fib(200);
  }
  const g = { pts, lines, polys };
  geo.set(shape, g);
  return g;
}

function rot(p, ax, ay, az) {
  let [x, y, z] = p;
  let c = Math.cos(ay), s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(ax); s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  if (az) { c = Math.cos(az); s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
function proj(p, R, f = 3.2) {
  const k = f / (f + p[2]);
  return [p[0] * R * k, p[1] * R * k, p[2], k];
}

export const OBJ3D = ['globe', 'sphere', 'cube', 'icosa', 'pyramid', 'torus', 'knot', 'helix', 'atom', 'wave', 'grid3d', 'rings'];
export const OBJ3D_LABELS = { globe: 'كرة أرضية', sphere: 'كرة نقاط', cube: 'مكعب', icosa: 'بلورة', pyramid: 'هرم', torus: 'دونات', knot: 'عقدة', helix: 'DNA', atom: 'ذرة', wave: 'سطح موجي', grid3d: 'شبكة', rings: 'حلقات' };

export const obj3d = {
  measure(el, env) { const s = Uv(el.size ?? 520, env); return { w: s, h: s, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const g = (el.glow ?? 0) * (tr.glow ?? 1);
    if (g > 0) {
      // halo pass: wide translucent strokes instead of per-segment shadow blur
      ctx.save();
      ctx.globalAlpha *= Math.min(1, 0.16 * g);
      drawObj(ctx, el, env, time, tr, 4.5);
      ctx.restore();
    }
    drawObj(ctx, el, env, time, tr, 1);
  },
};

function drawObj(ctx, el, env, time, tr, pw) {
  {
    const th = env.theme;
    const S = Uv(el.size ?? 520, env);
    const R = S * 0.46;
    const shape = el.shape || 'globe';
    const sp = el.speed ?? 0.5;
    const ay = time * sp + (el.yaw ?? 0.4);
    const ax = (el.tilt ?? -0.35) + Math.sin(time * 0.4) * 0.08;
    const az = el.roll ?? 0;
    const c1 = color(el.color || '@accent', th), c2 = color(el.color2 || '@secondary', th);
    const style = el.style || 'wire';
    const reveal = tr.draw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const lw = Uv(el.strokeW ?? 2.6, env) * pw;

    if (shape === 'wave') {
      const N = 22;
      const rows = [];
      for (let i = 0; i <= N; i++) {
        const row = [];
        for (let j = 0; j <= N; j++) {
          const x = (i / N) * 2 - 1, z = (j / N) * 2 - 1;
          const d = Math.hypot(x, z);
          const y = Math.sin(d * 7 - time * 2.4 * (sp / 0.5)) * 0.12 * (1 - d * 0.4) + noise2(x * 2 + time * 0.3, z * 2) * 0.06;
          row.push(proj(rot([x, y, z], ax - 0.55, ay * 0.4, 0), R * 0.95));
        }
        rows.push(row);
      }
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const p = rows[i][j];
        const a = clamp(0.25 + (1 - (p[2] + 1) / 2) * 0.9) * clamp(reveal * 1.5 - (i / N) * 0.5);
        if (a <= 0) continue;
        ctx.fillStyle = rgba(j % 4 === 0 ? c1 : c2, a);
        ctx.beginPath(); ctx.arc(p[0], p[1], Uv(3.2, env) * p[3] * pw, 0, TAU); ctx.fill();
        if (style === 'wire' && i < N) {
          const q = rows[i + 1][j];
          ctx.strokeStyle = rgba(c2, a * 0.35);
          ctx.lineWidth = lw * 0.5;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
      }
      return;
    }
    if (shape === 'atom' || shape === 'rings') {
      const n = 3;
      for (let k = 0; k < n; k++) {
        const ring = [];
        const tilt = (k / n) * Math.PI;
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * TAU;
          let p = [Math.cos(a) * (shape === 'atom' ? 1 : 0.6 + k * 0.2), Math.sin(a) * (shape === 'atom' ? 0.38 : 0.6 + k * 0.2), 0];
          if (shape === 'atom') p = rot(p, 0, 0, tilt);
          else p = rot(p, time * (0.6 + k * 0.3), time * (0.4 + k * 0.2), 0);
          ring.push(proj(rot(p, ax, ay, 0), R));
        }
        ctx.strokeStyle = rgba(k % 2 ? c2 : c1, 0.85);
        ctx.lineWidth = lw;
        ctx.beginPath();
        const lim = Math.floor(80 * clamp(reveal));
        ring.slice(0, lim + 1).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        if (shape === 'atom') {
          const e = ring[Math.floor(((time * 0.6 + k / n) % 1) * 80)];
          ctx.beginPath(); ctx.arc(e[0], e[1], Uv(13, env) * e[3] * pw, 0, TAU); ctx.fillStyle = c1; ctx.fill();
        }
      }
      if (shape === 'atom') {
        ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, TAU);
        const g = ctx.createRadialGradient(-R * 0.05, -R * 0.05, 0, 0, 0, R * 0.16);
        g.addColorStop(0, '#fff'); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fill();
      }
      return;
    }
    const G = build(shape);
    const P = G.pts.map((p) => proj(rot(p, ax, ay, az), R));
    if (G.polys.length) {
      G.polys.forEach((poly, pi) => {
        const pp = poly.map((p) => proj(rot(p, ax, ay, az), R));
        const lim = Math.max(1, Math.floor(pp.length * clamp(reveal * 1.4 - (pi / G.polys.length) * 0.4)));
        for (let i = 1; i < lim; i++) {
          const a = pp[i - 1], b = pp[i];
          const depth = 1 - ((a[2] + b[2]) / 2 + 1) / 2;
          ctx.strokeStyle = rgba(shape === 'knot' ? (i / pp.length < 0.5 ? c1 : c2) : pi % 3 === 0 ? c1 : c2, 0.12 + depth * 0.85);
          ctx.lineWidth = lw * (0.55 + depth * 0.8) * (shape === 'knot' ? 2.2 : 1);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      });
    }
    G.lines.forEach(([i, j], k) => {
      const a = P[i], b = P[j];
      const f = clamp(reveal * 1.6 - (k / G.lines.length) * 0.6);
      if (f <= 0) return;
      const depth = 1 - ((a[2] + b[2]) / 2 + 1) / 2;
      ctx.strokeStyle = rgba(k % 2 ? c2 : c1, 0.25 + depth * 0.75);
      ctx.lineWidth = lw * (0.7 + depth);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); ctx.stroke();
    });
    const dotR = Uv(el.dot ?? (shape === 'sphere' ? 4.2 : G.lines.length ? 9 : 4.5), env);
    if (style !== 'lines') {
      P.forEach((p, i) => {
        const depth = 1 - (p[2] + 1) / 2;
        const f = clamp(reveal * 1.5 - (i / P.length) * 0.5);
        if (f <= 0) return;
        ctx.fillStyle = rgba(i % 5 === 0 ? c1 : shape === 'sphere' ? c2 : c1, (0.18 + depth * 0.82) * f);
        ctx.beginPath(); ctx.arc(p[0], p[1], dotR * (0.5 + depth * 0.7) * p[3] * Math.min(pw, 2.5), 0, TAU); ctx.fill();
      });
    }
  }
}

// ---------------------------------------------------------------- particles
export const PARTICLES = ['confetti', 'sparkle', 'dust', 'bubbles', 'snow', 'burst', 'embers', 'stars', 'hearts'];
export const PARTICLE_LABELS = { confetti: 'كونفيتي', sparkle: 'لمعات', dust: 'غبار', bubbles: 'فقاعات', snow: 'ثلج', burst: 'انفجار', embers: 'شرار', stars: 'نجوم', hearts: 'قلوب' };

export const particles = {
  measure(el, env) { return { w: Uv(el.w ?? 1000, env), h: Uv(el.h ?? 1000, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 1000, env), h = Uv(el.h ?? 1000, env);
    const kind = el.kind || 'sparkle';
    const n = el.count ?? 60;
    const cols = (el.colors || ['@accent', '@secondary', '@fg']).map((c) => color(c, th));
    const sz = el.size ?? 1;
    const a = el.anim || {};
    if (kind === 'burst' && time < (a.start ?? 0)) return;
    const t = Math.max(0, time - (a.start ?? 0));
    const sp = el.speed ?? 1;
    for (let i = 0; i < n; i++) {
      const r1 = sr(i * 12.9898 + 1.3), r2 = sr(i * 78.233 + 2.1), r3 = sr(i * 39.425 + 3.7), r4 = sr(i * 9.17 + 4.4);
      const col = cols[i % cols.length];
      ctx.save();
      switch (kind) {
        case 'confetti': {
          const fall = (t * (0.18 + r2 * 0.22) * sp + r1) % 1.15 - 0.075;
          const x = (r3 - 0.5) * w + Math.sin(t * 2 + i) * Uv(30, env);
          const y = -h / 2 + fall * h;
          ctx.translate(x, y);
          ctx.rotate(t * (2 + r4 * 4) + i);
          ctx.scale(1, Math.cos(t * (3 + r1 * 4) + i));
          ctx.fillStyle = col;
          ctx.fillRect(-Uv(9, env) * sz, -Uv(5, env) * sz, Uv(18, env) * sz, Uv(10, env) * sz);
          break;
        }
        case 'burst': {
          const ang = r1 * TAU, v = (0.35 + r2 * 0.65) * Math.min(w, h) * 0.55;
          const q = ease('expoOut', clamp(t / (1.4 + r3)));
          const x = Math.cos(ang) * v * q, y = Math.sin(ang) * v * q + t * t * Uv(60, env) * (el.gravity ?? 1);
          ctx.globalAlpha *= clamp(1.6 - t / 1.6);
          ctx.translate(x, y);
          ctx.rotate(t * 5 * (r4 - 0.5));
          ctx.fillStyle = col;
          if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, Uv(7, env) * sz, 0, TAU); ctx.fill(); }
          else ctx.fillRect(-Uv(8, env) * sz, -Uv(4, env) * sz, Uv(16, env) * sz, Uv(8, env) * sz);
          break;
        }
        case 'sparkle': case 'stars': {
          const x = (r1 - 0.5) * w, y = (r2 - 0.5) * h;
          const tw = Math.pow(Math.max(0, Math.sin(t * (1.2 + r3 * 2.5) * sp + r4 * TAU)), kind === 'stars' ? 1.5 : 6);
          const s = Uv(kind === 'stars' ? 3 + r3 * 4 : 10 + r3 * 18, env) * sz * (kind === 'stars' ? 1 : tw);
          ctx.globalAlpha *= kind === 'stars' ? 0.25 + tw * 0.75 : tw;
          ctx.translate(x, y);
          ctx.fillStyle = col;
          if (kind === 'stars') { ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill(); }
          else {
            ctx.beginPath();
            ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
            ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
          }
          break;
        }
        case 'dust': case 'embers': {
          const rise = (t * (0.03 + r2 * 0.05) * sp * (kind === 'embers' ? 2.4 : 1) + r1) % 1;
          const x = (r3 - 0.5) * w + Math.sin(t * 0.7 + i) * Uv(40, env);
          const y = h / 2 - rise * h;
          const s = Uv(kind === 'embers' ? 3 + r4 * 5 : 2 + r4 * 4, env) * sz;
          const fl = kind === 'embers' ? 0.5 + 0.5 * Math.sin(t * 9 + i * 3) : 1;
          ctx.globalAlpha *= Math.sin(rise * Math.PI) * (0.35 + r4 * 0.6) * fl;
          ctx.fillStyle = col;
          if (kind === 'embers') { ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(x, y, s * 3, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.35; }
          ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
          break;
        }
        case 'bubbles': case 'hearts': {
          const rise = (t * (0.08 + r2 * 0.1) * sp + r1) % 1;
          const x = (r3 - 0.5) * w + Math.sin(t * 1.4 + i) * Uv(26, env);
          const y = h / 2 - rise * h;
          const s = Uv(kind === 'hearts' ? 16 + r4 * 22 : 10 + r4 * 30, env) * sz;
          ctx.globalAlpha *= Math.sin(rise * Math.PI) * 0.8;
          ctx.translate(x, y);
          if (kind === 'hearts') {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.35);
            ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.4, -s, 0, -s * 0.45);
            ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.3, 0, s * 0.35);
            ctx.fill();
          } else {
            ctx.strokeStyle = col; ctx.lineWidth = Uv(2.5, env);
            ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke();
            ctx.fillStyle = rgba(col, 0.12); ctx.fill();
          }
          break;
        }
        case 'snow': {
          const fall = (t * (0.05 + r2 * 0.06) * sp + r1) % 1;
          const x = (r3 - 0.5) * w + Math.sin(t * 0.8 + i) * Uv(50, env);
          const y = -h / 2 + fall * h;
          ctx.globalAlpha *= 0.4 + r4 * 0.6;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, Uv(3 + r4 * 6, env) * sz, 0, TAU); ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  },
};
