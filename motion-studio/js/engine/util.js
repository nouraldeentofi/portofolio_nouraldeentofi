// Shared math, color, random and noise helpers for the render engine.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
};
export const fract = (v) => v - Math.floor(v);

// ---------- deterministic random ----------
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let a = (typeof seed === 'string' ? hashStr(seed) : seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// stateless hash noise in 0..1
export const sr = (n) => fract(Math.sin(n) * 43758.5453);
export const hash2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);

// ---------- value noise ----------
function vnoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function noise2(x, y, oct = 3) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise2(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / norm;
}

// ---------- easing ----------
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    t = clamp(t);
    return sy(t);
  };
}
const c1 = 1.70158, c3 = c1 + 1;
export const EASE = {
  linear: (t) => t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  quartOut: (t) => 1 - Math.pow(1 - t, 4),
  quintOut: (t) => 1 - Math.pow(1 - t, 5),
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  circOut: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expoInOut: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  quintInOut: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  cubicIn: (t) => t * t * t,
  expoIn: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  backOut: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  backOutSoft: (t) => {
    const s = 1.1, k = s + 1;
    return 1 + k * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
  elasticOut: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  bounceOut: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  spring: (t) => {
    if (t >= 1) return 1;
    return 1 - Math.exp(-6.5 * t) * Math.cos(t * 9.5);
  },
  brand: bezier(0.2, 0.8, 0.2, 1),
  snappy: bezier(0.16, 1, 0.3, 1),
  smooth: bezier(0.65, 0, 0.35, 1),
};
export const EASE_NAMES = Object.keys(EASE);
export const ease = (name, t) => (EASE[name] || EASE.brand)(clamp(t));

// ---------- color ----------
const colorCache = new Map();
export function parseColor(c) {
  if (!c) return { r: 0, g: 0, b: 0, a: 0 };
  if (typeof c === 'object' && 'r' in c) return c;
  const hit = colorCache.get(c);
  if (hit) return hit;
  let out = { r: 0, g: 0, b: 0, a: 1 };
  const s = String(c).trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    out = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  } else if (s.startsWith('rgb')) {
    const m = s.match(/[\d.]+/g) || [];
    out = { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m[3] !== undefined ? +m[3] : 1 };
  } else if (s === 'transparent') {
    out = { r: 0, g: 0, b: 0, a: 0 };
  } else if (s === 'white') out = { r: 255, g: 255, b: 255, a: 1 };
  else if (s === 'black') out = { r: 0, g: 0, b: 0, a: 1 };
  colorCache.set(c, out);
  return out;
}
export const rgba = (c, a = 1) => {
  const p = parseColor(c);
  return `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${+(p.a * a).toFixed(4)})`;
};
export function mix(c1, c2, t) {
  const a = parseColor(c1), b = parseColor(c2);
  return `rgba(${lerp(a.r, b.r, t) | 0},${lerp(a.g, b.g, t) | 0},${lerp(a.b, b.b, t) | 0},${lerp(a.a, b.a, t).toFixed(4)})`;
}
export function toHex(c) {
  const p = parseColor(c);
  const h = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(p.r) + h(p.g) + h(p.b);
}
export function luminance(c) {
  const p = parseColor(c);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
}

// ---------- text helpers ----------
const AR_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LTR_RE = /[A-Za-z0-9À-ɏ]/;
export const hasArabic = (s) => AR_RE.test(s);
export const strongDir = (s) => {
  for (const ch of s) {
    if (AR_RE.test(ch)) return 'rtl';
    if (LTR_RE.test(ch)) return 'ltr';
  }
  return null;
};

// paragraph direction: Arabic-led unless Latin clearly dominates
export function paraDir(s) {
  let ar = 0, la = 0;
  for (const ch of s) {
    if (AR_RE.test(ch)) ar++;
    else if (/[A-Za-z]/.test(ch)) la++;
  }
  if (!ar) return la ? 'ltr' : null;
  return ar * 2 >= la ? 'rtl' : 'ltr';
}

export function uid(prefix = 'e') {
  return prefix + Math.random().toString(36).slice(2, 9);
}
export const deepClone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeCanvas(w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
