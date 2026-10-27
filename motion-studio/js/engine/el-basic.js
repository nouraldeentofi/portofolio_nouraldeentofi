// Basic element renderers: text wrapper, shape, glow, image, icon, counter,
// rotator, ticker, signature, status, corners.
import { TAU, clamp, smoothstep, ease, roundRectPath, noise2, rgba, hasArabic, sr } from './util.js';
import { color, fontString } from './themes.js';
import { textMetrics, drawText } from './text.js';
import { fillStyle, softShadow, glass, glowBlob, boxShadow } from './paint.js';
import { drawIcon } from './icons.js';

const Uv = (v, env) => (v ?? 0) * env.U;

// ---------------------------------------------------------------- text
export const text = {
  measure(el, env) {
    const m = textMetrics(el, env);
    let { x, y, w, h } = m.bounds;
    if (el.box) {
      const px = (el.box.padX ?? 34) * env.U, py = (el.box.padY ?? 16) * env.U;
      x -= px; y -= py; w += px * 2; h += py * 2;
    }
    return { w, h, bx: x + w / 2, by: y + h / 2 };
  },
  draw(ctx, el, env, time, dur, tr) { drawText(ctx, el, env, time, dur, tr); },
};

// ---------------------------------------------------------------- shape
export const SHAPES = ['rect', 'circle', 'ellipse', 'pill', 'triangle', 'polygon', 'star', 'burst', 'diamond', 'heart', 'plus', 'cross',
  'ring', 'arc', 'line', 'arrow', 'curve', 'wave', 'zigzag', 'blob', 'dots', 'chevron', 'spiral', 'bracket'];
export const SHAPE_LABELS = {
  rect: 'مستطيل', circle: 'دائرة', ellipse: 'بيضاوي', pill: 'كبسولة', triangle: 'مثلث', polygon: 'مضلع', star: 'نجمة', burst: 'انفجار',
  diamond: 'معيّن', heart: 'قلب', plus: 'زائد', cross: 'إكس', ring: 'حلقة', arc: 'قوس', line: 'خط', arrow: 'سهم', curve: 'سهم منحني',
  wave: 'موجة', zigzag: 'متعرج', blob: 'فقاعة', dots: 'نقاط', chevron: 'شيفرون', spiral: 'حلزون', bracket: 'أقواس',
};
const STROKE_ONLY = new Set(['line', 'arrow', 'curve', 'wave', 'zigzag', 'ring', 'arc', 'chevron', 'spiral', 'bracket']);

function polyPath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// builds the path; returns approximate length for draw-on
function shapePath(ctx, el, w, h, env, time) {
  const s = el.shape || 'rect';
  const U = env.U;
  const r = Math.min(w, h) / 2;
  switch (s) {
    case 'rect': roundRectPath(ctx, -w / 2, -h / 2, w, h, Uv(el.radius ?? 0, env)); return 2 * (w + h);
    case 'pill': roundRectPath(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) / 2); return 2 * (w + h);
    case 'circle': ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); return TAU * r;
    case 'ellipse': ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); return Math.PI * (w + h) / 2;
    case 'triangle': polyPath(ctx, [[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]); return w + 2 * Math.hypot(w / 2, h);
    case 'diamond': polyPath(ctx, [[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]]); return 4 * Math.hypot(w / 2, h / 2);
    case 'polygon': case 'star': case 'burst': {
      const n = el.sides ?? (s === 'polygon' ? 6 : s === 'star' ? 5 : 16);
      const inner = s === 'polygon' ? 1 : el.inner ?? (s === 'star' ? 0.45 : 0.78);
      const pts = [];
      const k = s === 'polygon' ? n : n * 2;
      for (let i = 0; i < k; i++) {
        const a = -Math.PI / 2 + (i / k) * TAU;
        const rr = s === 'polygon' || i % 2 === 0 ? 1 : inner;
        pts.push([Math.cos(a) * (w / 2) * rr, Math.sin(a) * (h / 2) * rr]);
      }
      polyPath(ctx, pts);
      return k * Math.hypot(w, h) * 0.4;
    }
    case 'heart': {
      ctx.beginPath();
      const sx = w / 24, sy = h / 22;
      ctx.moveTo(0, 9 * sy);
      ctx.bezierCurveTo(-1 * sx, 8 * sy, -12 * sx, 1 * sy, -12 * sx, -4.5 * sy);
      ctx.bezierCurveTo(-12 * sx, -9 * sy, -8.5 * sx, -11 * sy, -6 * sx, -11 * sy);
      ctx.bezierCurveTo(-3.2 * sx, -11 * sy, -1 * sx, -9 * sy, 0, -6.5 * sy);
      ctx.bezierCurveTo(1 * sx, -9 * sy, 3.2 * sx, -11 * sy, 6 * sx, -11 * sy);
      ctx.bezierCurveTo(8.5 * sx, -11 * sy, 12 * sx, -9 * sy, 12 * sx, -4.5 * sy);
      ctx.bezierCurveTo(12 * sx, 1 * sy, 1 * sx, 8 * sy, 0, 9 * sy);
      ctx.closePath();
      return 3 * (w + h);
    }
    case 'plus': case 'cross': {
      const t = Math.min(w, h) * (el.thick ?? 0.3);
      ctx.save();
      if (s === 'cross') ctx.rotate(Math.PI / 4);
      const L = s === 'cross' ? Math.min(w, h) * 1.1 : null;
      const ww = L || w, hh = L || h;
      ctx.beginPath();
      ctx.rect(-ww / 2, -t / 2, ww, t);
      ctx.rect(-t / 2, -hh / 2, t, hh);
      ctx.restore();
      return 4 * (w + h);
    }
    case 'ring': ctx.beginPath(); ctx.arc(0, 0, r - Uv(el.strokeW ?? 10, env) / 2, 0, TAU); return TAU * r;
    case 'arc': {
      const a0 = ((el.a0 ?? -90) * Math.PI) / 180, a1 = ((el.a1 ?? 180) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(0, 0, r - Uv(el.strokeW ?? 10, env) / 2, a0, a1);
      return Math.abs(a1 - a0) * r;
    }
    case 'line': ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); return w;
    case 'arrow': {
      const hl = Math.min(w * 0.3, (el.head ?? 34) * U);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
      ctx.moveTo(w / 2 - hl, -hl * 0.8); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 - hl, hl * 0.8);
      return w + hl * 2.6;
    }
    case 'curve': {
      const hl = (el.head ?? 30) * U;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.bezierCurveTo(-w / 4, -h / 2, w / 4, -h / 2, w / 2, h / 4);
      const ang = Math.atan2(h / 4 - (-h / 2) * 0.2, w / 2 - w / 4);
      ctx.moveTo(w / 2 + Math.cos(ang + 2.5) * hl, h / 4 + Math.sin(ang + 2.5) * hl);
      ctx.lineTo(w / 2, h / 4);
      ctx.lineTo(w / 2 + Math.cos(ang - 2.5) * hl, h / 4 + Math.sin(ang - 2.5) * hl);
      return w * 1.5 + hl * 2;
    }
    case 'wave': {
      const cyc = el.cycles ?? 3, ph = time * (el.speed ?? 2);
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = -w / 2 + (i / 80) * w;
        const y = Math.sin((i / 80) * cyc * TAU + ph) * h / 2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      return w * (1 + cyc * 0.4 * (h / w) * 4);
    }
    case 'zigzag': {
      const n = el.cycles ?? 8;
      ctx.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const x = -w / 2 + (i / (n * 2)) * w, y = i % 2 ? -h / 2 : h / 2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      return n * 2 * Math.hypot(w / (n * 2), h);
    }
    case 'chevron': ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(-w / 2, h / 2); return 2 * Math.hypot(w, h / 2);
    case 'spiral': {
      ctx.beginPath();
      const turns = el.cycles ?? 3;
      for (let i = 0; i <= 200; i++) {
        const t = i / 200, a = t * turns * TAU + time * (el.speed ?? 0);
        const x = Math.cos(a) * t * w / 2, y = Math.sin(a) * t * h / 2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      return turns * Math.PI * r;
    }
    case 'bracket': {
      const L = Math.min(w, h) * (el.len ?? 0.22);
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2 + L); ctx.lineTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 + L, -h / 2);
      ctx.moveTo(w / 2 - L, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2 + L);
      ctx.moveTo(w / 2, h / 2 - L); ctx.lineTo(w / 2, h / 2); ctx.lineTo(w / 2 - L, h / 2);
      ctx.moveTo(-w / 2 + L, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(-w / 2, h / 2 - L);
      return L * 8;
    }
    case 'blob': {
      const n = 9, amp = el.amp ?? 0.16, sp = el.speed ?? 0.35, seed = el.seed ?? 3;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const k = 1 + (noise2(Math.cos(a) * 1.3 + seed + time * sp, Math.sin(a) * 1.3 + time * sp * 0.7, 2) - 0.5) * 2 * amp;
        pts.push([Math.cos(a) * w / 2 * k, Math.sin(a) * h / 2 * k]);
      }
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        if (i === 0) ctx.moveTo(p1[0], p1[1]);
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      ctx.closePath();
      return TAU * r;
    }
    case 'dots': {
      const cols = el.cols ?? 6, rows = el.rows ?? 6, dr = Uv(el.dot ?? 5, env);
      ctx.beginPath();
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = -w / 2 + (cols === 1 ? w / 2 : (i / (cols - 1)) * w), y = -h / 2 + (rows === 1 ? h / 2 : (j / (rows - 1)) * h);
        ctx.moveTo(x + dr, y);
        ctx.arc(x, y, dr, 0, TAU);
      }
      return 1;
    }
    default: roundRectPath(ctx, -w / 2, -h / 2, w, h, 0); return 2 * (w + h);
  }
}

export const shape = {
  measure(el, env) { return { w: Uv(el.w ?? 200, env), h: Uv(el.h ?? el.w ?? 200, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 200, env), h = Uv(el.h ?? el.w ?? 200, env);
    const s = el.shape || 'rect';
    const strokeOnly = STROKE_ONLY.has(s);
    const fillSpec = el.fill ?? (strokeOnly ? 'none' : '@accent');
    const strokeSpec = el.stroke ?? (strokeOnly ? (el.fill && el.fill !== 'none' ? el.fill : '@accent') : null);
    const sw = Uv(el.strokeW ?? (strokeOnly ? 8 : 4), env);
    const draw = tr.draw;
    const pathFn = () => shapePath(ctx, el, w, h, env, time);

    if (el.shadow && fillSpec !== 'none') {
      const sa = el.shadow * (draw < 1 ? smoothstep(0.5, 1, draw) : 1);
      if (s === 'rect' || s === 'pill') {
        ctx.save();
        ctx.globalAlpha *= Math.min(1, sa);
        boxShadow(ctx, env, w, h, s === 'pill' ? Math.min(w, h) / 2 : Uv(el.radius ?? 0, env), Math.max(1, sa));
        ctx.restore();
      } else softShadow(ctx, env, pathFn, sa);
    }
    const glowAmt = (el.glow ?? 0) * tr.glow;
    if (glowAmt > 0) {
      ctx.shadowColor = typeof fillSpec === 'string' && fillSpec !== 'none' ? color(fillSpec, th) : color(strokeSpec || '@accent', th);
      ctx.shadowBlur = 40 * glowAmt * env.U * env.px;
    }
    if (el.glass) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.globalAlpha *= draw < 1 ? smoothstep(0.3, 1, draw) : 1;
      glass(ctx, env, pathFn, w, h, { blur: el.blurAmt ?? 22, tint: el.fill && el.fill !== '@card' && typeof el.fill === 'string' ? el.fill : null });
      ctx.restore();
    } else if (fillSpec !== 'none') {
      const len = pathFn();
      if (draw < 1) {
        ctx.save();
        ctx.globalAlpha *= smoothstep(0.55, 1, draw);
        ctx.fillStyle = fillStyle(ctx, fillSpec, th, w, h);
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = Math.max(sw, 3 * env.U);
        ctx.strokeStyle = fillStyle(ctx, strokeSpec || fillSpec, th, w, h);
        ctx.setLineDash([len * draw, len * 2]);
        pathFn();
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = fillStyle(ctx, fillSpec, th, w, h);
        ctx.fill(el.evenodd ? 'evenodd' : 'nonzero');
      }
      if (tr.shimmer >= 0) {
        ctx.save();
        pathFn();
        ctx.clip();
        const x = -w / 2 + (tr.shimmer - 0.3) * w * 1.4;
        const g = ctx.createLinearGradient(x - w * 0.2, 0, x + w * 0.2, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
    if (strokeSpec && strokeSpec !== 'none' && (strokeOnly || el.stroke)) {
      const len = pathFn();
      ctx.lineWidth = sw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = fillStyle(ctx, strokeSpec, th, w, h);
      if (el.dash) ctx.setLineDash(el.dash.map((d) => d * env.U));
      if (draw < 1) ctx.setLineDash([len * draw, len * 2]);
      if (el.dash && el.dashSpeed) ctx.lineDashOffset = -time * el.dashSpeed * env.U;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },
};

// ---------------------------------------------------------------- glow (soft light / veil)
export const glow = {
  measure(el, env) { return { w: Uv(el.w ?? 600, env), h: Uv(el.h ?? el.w ?? 600, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const w = Uv(el.w ?? 600, env), h = Uv(el.h ?? el.w ?? 600, env);
    ctx.save();
    ctx.scale(1, h / w);
    glowBlob(ctx, 0, 0, w / 2, color(el.color || '@accent', env.theme), (el.alpha ?? 0.35) * tr.glow);
    ctx.restore();
  },
};

// ---------------------------------------------------------------- image
function placeholder(ctx, env, w, h) {
  const th = env.theme;
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, rgba(th.c.accent, 0.35));
  g.addColorStop(1, rgba(th.c.secondary, 0.25));
  ctx.fillStyle = th.c.raised || th.c.card;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const s = Math.min(w, h) * 0.22;
  ctx.globalAlpha *= 0.85;
  drawIcon(ctx, 'image', s, th.c.fg, { strokeW: 1.6 });
}
export const image = {
  measure(el, env) { return { w: Uv(el.w ?? 600, env), h: Uv(el.h ?? 600, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 600, env), h = Uv(el.h ?? 600, env);
    const rad = el.mask === 'circle' ? Math.min(w, h) / 2 : Uv(el.radius ?? 22, env);
    const pathFn = () => {
      if (el.mask === 'circle') { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); }
      else roundRectPath(ctx, -w / 2, -h / 2, w, h, rad);
    };
    if (el.shadow) {
      if (el.mask === 'circle') softShadow(ctx, env, pathFn, el.shadow);
      else boxShadow(ctx, env, w, h, rad, el.shadow);
    }
    ctx.save();
    pathFn();
    ctx.clip();
    const img = el.src && env.images ? env.images.get(el.src) : null;
    if (img && (img.width || img.naturalWidth)) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const fit = el.fit || 'cover';
      let s = fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
      const kb = el.kenburns ?? 0.08;
      s *= 1 + kb * clamp(time / Math.max(1, dur));
      const panX = (el.panX ?? 0) * w * clamp(time / Math.max(1, dur));
      if (el.filter && el.filter !== 'none') ctx.filter = el.filter === 'gray' ? 'grayscale(1)' : el.filter === 'warm' ? 'sepia(0.35) saturate(1.2)' : el.filter === 'contrast' ? 'contrast(1.25) saturate(1.1)' : el.filter === 'dim' ? 'brightness(0.65)' : 'none';
      ctx.drawImage(img, -iw * s / 2 + panX, -ih * s / 2, iw * s, ih * s);
      ctx.filter = 'none';
    } else placeholder(ctx, env, w, h);
    if (el.tint) {
      ctx.fillStyle = color(el.tint, th);
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    if (el.fade) {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, rgba(th.c.bg, 0));
      g.addColorStop(1, rgba(th.c.bg, el.fade));
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
    if (el.border) {
      pathFn();
      ctx.lineWidth = Uv(el.borderW ?? 4, env);
      ctx.strokeStyle = color(el.border, th);
      ctx.stroke();
    }
  },
};

// ---------------------------------------------------------------- icon
export const icon = {
  measure(el, env) {
    const s = Uv(el.size ?? 120, env);
    const n = el.repeat ?? 1, gap = Uv(el.gap ?? 20, env);
    const pad = el.bg ? s * (el.bgPad ?? 0.55) : 0;
    const one = s + pad * 2;
    return { w: one * n + gap * (n - 1), h: one, bx: 0, by: 0 };
  },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const s = Uv(el.size ?? 120, env);
    const n = el.repeat ?? 1, gap = Uv(el.gap ?? 20, env);
    const pad = el.bg ? s * (el.bgPad ?? 0.55) : 0;
    const one = s + pad * 2;
    const total = one * n + gap * (n - 1);
    const a = el.anim || {};
    for (let i = 0; i < n; i++) {
      const cx = -total / 2 + one / 2 + i * (one + gap);
      ctx.save();
      ctx.translate(cx, 0);
      if (n > 1) {
        const t0 = (a.start ?? 0) + i * (a.stagger ?? 0.08);
        const p = ease('backOut', clamp((time - t0) / (a.dur ?? 0.5)));
        const k = 0.2 + 0.8 * p;
        ctx.scale(k, k);
        ctx.globalAlpha *= clamp(p * 3);
        const filledN = el.filledN ?? n;
        if (i >= filledN) ctx.globalAlpha *= 0.3;
      }
      if (el.bg) {
        const bgc = color(el.bg, th);
        if (el.bgShape === 'square') roundRectPath(ctx, -one / 2, -one / 2, one, one, one * 0.28);
        else { ctx.beginPath(); ctx.arc(0, 0, one / 2, 0, TAU); }
        if (el.bgGlass) glass(ctx, env, () => {
          if (el.bgShape === 'square') roundRectPath(ctx, -one / 2, -one / 2, one, one, one * 0.28);
          else { ctx.beginPath(); ctx.arc(0, 0, one / 2, 0, TAU); }
        }, one, one, { blur: 14 });
        else { ctx.fillStyle = bgc; ctx.fill(); }
      }
      const glowAmt = (el.glow ?? 0) * tr.glow;
      if (glowAmt > 0) { ctx.shadowColor = color(el.color || '@accent', th); ctx.shadowBlur = 30 * glowAmt * env.U * env.px; }
      drawIcon(ctx, el.name || 'sparkles', s, color(el.color || '@accent', th), { strokeW: el.strokeW ?? 2, filled: el.filled, draw: tr.draw });
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- counter
function fmtNum(v, el) {
  const dec = el.decimals ?? 0;
  let s = Math.abs(v).toFixed(dec);
  if (el.sep !== false) {
    const [i, d] = s.split('.');
    s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
  }
  return (v < 0 ? '-' : '') + s;
}
function counterValue(el, time) {
  const a = el.anim || {};
  const t0 = (a.start ?? 0) + (el.countDelay ?? 0.1);
  const p = ease(el.countEase || 'quartOut', clamp((time - t0) / (el.countDur ?? 1.8)));
  return { v: (el.from ?? 0) + ((el.to ?? 100) - (el.from ?? 0)) * p, p };
}
function counterLayout(ctx, el, env) {
  const size = Uv(el.size ?? 200, env);
  const font = fontString(el.font || '@display', env.theme, el.weight ?? 800, size);
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  let dw = 0;
  for (let d = 0; d <= 9; d++) dw = Math.max(dw, ctx.measureText(String(d)).width);
  const pre = el.prefix || '', suf = el.suffix || '';
  ctx.direction = 'ltr';
  const pw = pre ? ctx.measureText(pre).width : 0, sw = suf ? ctx.measureText(suf).width : 0;
  const numW = (str) => [...str].reduce((w, ch) => w + (/\d/.test(ch) ? dw : ctx.measureText(ch).width), 0);
  const finalNum = fmtNum(el.to ?? 100, el);
  const gap = (s) => (s && hasArabic(s) ? size * 0.18 : 0);
  const w = pw + gap(pre) + numW(finalNum) + gap(suf) + sw;
  return { size, font, dw, w, h: size * 1.05, pre, suf, pw, sw, numW, gap, finalNum };
}
export const counter = {
  measure(el, env) {
    const L = counterLayout(env.mctx, el, env);
    return { w: L.w, h: L.h, bx: 0, by: 0 };
  },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = counterLayout(ctx, el, env);
    const { v, p } = counterValue(el, time);
    const style = el.style || 'count';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.direction = 'ltr';
    const col = color(el.color || '@accent', th);
    const glowAmt = (el.glow ?? 0) * tr.glow;
    if (glowAmt > 0) { ctx.shadowColor = col; ctx.shadowBlur = 40 * glowAmt * env.U * env.px; }
    ctx.fillStyle = el.fill && typeof el.fill === 'object' ? fillStyle(ctx, el.fill, th, L.w, L.h) : col;
    const numStr = style === 'roll' ? L.finalNum : fmtNum(v, el);
    const nw = L.numW(numStr);
    // Arabic units read right-to-left: an Arabic suffix sits on the left of the number, an Arabic prefix on the right
    const left = hasArabic(L.suf) ? L.suf : !hasArabic(L.pre) ? L.pre : '';
    const right = hasArabic(L.suf) ? (hasArabic(L.pre) ? L.pre : '') : L.suf;
    const lw = left ? ctx.measureText(left).width + L.gap(left) : 0;
    const rw = right ? ctx.measureText(right).width + L.gap(right) : 0;
    const extraPre = hasArabic(L.suf) && L.pre && !hasArabic(L.pre) ? L.pre : '';
    const ew = extraPre ? ctx.measureText(extraPre).width : 0;
    let x = -(lw + ew + nw + rw) / 2;
    const word = (s, gapAfter) => {
      ctx.direction = hasArabic(s) ? 'rtl' : 'ltr';
      const w = ctx.measureText(s).width;
      ctx.fillText(s, x + w / 2, 0);
      ctx.direction = 'ltr';
      x += w + gapAfter;
    };
    if (left) word(left, L.gap(left));
    if (extraPre) word(extraPre, 0);
    if (style === 'roll') {
      const chars = [...numStr];
      const digits = chars.filter((c) => /\d/.test(c)).length;
      let di = 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - L.size, -L.h / 2, nw + L.size * 2, L.h);
      ctx.clip();
      chars.forEach((ch) => {
        if (/\d/.test(ch)) {
          const target = +ch;
          const a = el.anim || {};
          const t0 = (a.start ?? 0) + 0.1 + (digits - 1 - di) * 0.08;
          const q = ease('expoOut', clamp((time - t0) / (el.countDur ?? 1.8)));
          const spins = 1 + (digits - 1 - di);
          const pos = q * (target + spins * 10);
          const base = Math.floor(pos), f = pos - base;
          const cx = x + L.dw / 2;
          ctx.fillText(String(base % 10), cx, -f * L.h);
          ctx.fillText(String((base + 1) % 10), cx, (1 - f) * L.h);
          x += L.dw;
          di++;
        } else {
          const w = ctx.measureText(ch).width;
          ctx.fillText(ch, x + w / 2, 0);
          x += w;
        }
      });
      ctx.restore();
    } else {
      for (const ch of numStr) {
        const cw = /\d/.test(ch) ? L.dw : ctx.measureText(ch).width;
        ctx.fillText(ch, x + cw / 2, 0);
        x += cw;
      }
    }
    if (right) { x += L.gap(right); word(right, 0); }
    if (el.underline) ctx.fillRect(-L.w / 2, L.h * 0.52, L.w * p, Math.max(3, L.size * 0.05));
  },
};

// ---------------------------------------------------------------- rotator  (prefix + cycling words)
function rotLayout(el, env) {
  const base = { font: el.font, size: el.size ?? 90, weight: el.weight ?? 800, w: 3000, align: 'center' };
  const pre = el.prefix ? textMetrics({ ...base, text: el.prefix }, env) : null;
  const words = (el.words || ['agents']).map((wd) => textMetrics({ ...base, text: wd }, env));
  const ww = Math.max(...words.map((m) => m.tightW));
  const gap = (el.size ?? 90) * env.U * 0.28;
  const pw = pre ? pre.tightW : 0;
  const rtl = hasArabic((el.prefix || '') + (el.words || []).join(''));
  const W = pw + (pre ? gap : 0) + ww;
  const H = Math.max(pre ? pre.H : 0, words[0].H);
  return { pre, words, ww, pw, gap, W, H, rtl };
}
export const rotator = {
  measure(el, env) { const L = rotLayout(el, env); return { w: L.W, h: L.H, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = rotLayout(el, env);
    const n = L.words.length;
    const iv = el.interval ?? 1.3;
    const a = el.anim || {};
    const t = Math.max(0, time - (a.start ?? 0) - (a.dur ?? 0.6));
    const idx = Math.floor(t / iv);
    const f = clamp(((t % iv) - (iv - 0.45)) / 0.45);
    const cur = idx % n, nxt = (idx + 1) % n;
    const e = ease('expoInOut', f);
    const preX = L.rtl ? L.W / 2 - L.pw / 2 : -L.W / 2 + L.pw / 2;
    const wordX = L.rtl ? -L.W / 2 + L.ww / 2 : L.W / 2 - L.ww / 2;
    if (L.pre) {
      ctx.save();
      ctx.translate(preX, 0);
      drawText(ctx, { text: el.prefix, font: el.font, size: el.size ?? 90, weight: el.weight ?? 800, w: 3000, color: el.color || '@fg' }, env, time, dur, { ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
      ctx.restore();
    }
    ctx.save();
    ctx.translate(wordX, 0);
    const h = L.H;
    if (el.pill !== false) {
      const wa = L.words[cur].tightW, wb = L.words[nxt].tightW;
      const pw = wa + (wb - wa) * e + (el.size ?? 90) * env.U * 0.5;
      const ph = h * 1.0;
      const px = L.rtl ? L.ww / 2 - pw : -L.ww / 2;
      roundRectPath(ctx, el.alignWord === 'center' ? -pw / 2 : px + (L.rtl ? 0 : 0), -ph / 2, pw, ph, ph * 0.22);
      ctx.fillStyle = color(el.pillColor || '@accent', th);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.rect(-L.ww, -h / 2, L.ww * 2, h);
    ctx.clip();
    const wc = el.pill !== false ? el.wordColor || '@ink' : el.wordColor || '@accent';
    const drawWord = (i, dy) => {
      const m = L.words[i];
      const off = el.pill !== false ? (L.rtl ? L.ww / 2 - m.tightW / 2 - (el.size ?? 90) * env.U * 0.25 : -L.ww / 2 + m.tightW / 2 + (el.size ?? 90) * env.U * 0.25) : 0;
      ctx.save();
      ctx.translate(off, dy);
      drawText(ctx, { text: el.words[i], font: el.font, size: el.size ?? 90, weight: el.weight ?? 800, w: 3000, color: wc }, env, time, dur, { ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
      ctx.restore();
    };
    drawWord(cur, -e * h);
    if (f > 0) drawWord(nxt, (1 - e) * h);
    ctx.restore();
  },
};

// ---------------------------------------------------------------- ticker (marquee rows)
export const ticker = {
  measure(el, env) {
    const rows = el.rows ?? 1;
    const size = Uv(el.size ?? 120, env);
    return { w: Uv(el.w ?? 1400, env), h: rows * size * 1.25, bx: 0, by: 0 };
  },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const rows = el.rows ?? 1;
    const size = Uv(el.size ?? 120, env);
    const w = Uv(el.w ?? 1400, env);
    let txt = (el.text || 'MOTION') + (el.sep ?? '  •  ');
    ctx.font = fontString(el.font || '@display', th, el.weight ?? 800, size);
    ctx.textBaseline = 'middle';
    ctx.direction = hasArabic(txt) ? 'rtl' : 'ltr';
    // keep "+38%" and "24/7" in one piece inside Arabic (left-to-right isolate)
    if (ctx.direction === 'rtl') txt = txt.replace(/[+\-−]?[$€£]?\d[\d.,:/]*%?/g, (m) => '\u2066' + m + '\u2069');
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const tw = Math.max(10, ctx.measureText(txt).width);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -rows * size * 0.625, w, rows * size * 1.25);
    ctx.clip();
    for (let r = 0; r < rows; r++) {
      const y = -((rows - 1) * size * 1.25) / 2 + r * size * 1.25;
      const dir = r % 2 ? 1 : -1;
      const off = ((time * (el.speed ?? 160) * env.U * dir) % tw + tw) % tw;
      const outlined = el.alt ? r % 2 === 1 : el.outline;
      for (let x = -w / 2 - tw + off; x < w / 2 + tw; x += tw) {
        if (outlined) {
          ctx.lineWidth = 2.5 * env.U;
          ctx.strokeStyle = color(el.color || '@fg', th);
          ctx.strokeText(txt, x, y);
        } else {
          ctx.fillStyle = color(r % 2 && el.color2 ? el.color2 : el.color || '@fg', th);
          ctx.fillText(txt, x, y);
        }
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- signature (brand)
function sigLayout(el, env) {
  const size = el.size ?? 34;
  const name = textMetrics({ text: el.name ?? 'نور الدين طفي', font: '@body', size, weight: 700, w: 3000 }, env);
  const role = el.role === '' ? null : textMetrics({ text: el.role ?? '// AI Automation Engineer', font: '@mono', size: size * 0.62, weight: 400, w: 3000 }, env);
  const markW = size * 1.5 * env.U, markH = size * 0.68 * env.U;
  const gap = size * 0.45 * env.U;
  const textW = Math.max(name.tightW, role ? role.tightW : 0);
  const H = name.H + (role ? role.H * 0.95 : 0);
  return { name, role, markW, markH, gap, textW, W: markW + gap + textW, H, size };
}
export const signature = {
  measure(el, env) { const L = sigLayout(el, env); return { w: L.W, h: L.H, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = sigLayout(el, env);
    const rtl = el.dir ? el.dir === 'rtl' : hasArabic(el.name ?? 'نور');
    const col = color(el.color || '@accent', th);
    const markX = rtl ? L.W / 2 - L.markW / 2 : -L.W / 2 + L.markW / 2;
    const textX = rtl ? markX - L.markW / 2 - L.gap - L.textW / 2 : markX + L.markW / 2 + L.gap + L.textW / 2;
    // node mark: ring — line — dot (mirrored in RTL so the ring sits on the reading-start side)
    ctx.save();
    ctx.translate(markX, 0);
    const s = L.markW / 44;
    ctx.scale(rtl ? -s : s, s);
    ctx.translate(-22, -10);
    const d = tr.draw;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(8, 10, 5.5, 0, TAU * clamp(d * 2.2)); ctx.stroke();
    if (d > 0.35) { ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(14 + 16 * clamp((d - 0.35) / 0.35), 10); ctx.stroke(); }
    if (d > 0.7) { ctx.beginPath(); ctx.arc(36, 10, 6 * ease('backOut', clamp((d - 0.7) / 0.3)), 0, TAU); ctx.fill(); }
    ctx.restore();
    const align = rtl ? 'end' : 'start';
    const nameY = L.role ? -L.H / 2 + L.name.H / 2 : 0;
    ctx.save();
    ctx.translate(textX, nameY);
    drawText(ctx, { text: el.name ?? 'نور الدين طفي', font: '@body', size: L.size, weight: 700, w: L.textW / env.U + 1, align: 'start', color: el.nameColor || '@fg' }, env, time, dur, { ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
    ctx.restore();
    if (L.role) {
      ctx.save();
      ctx.translate(textX, L.H / 2 - L.role.H / 2);
      drawText(ctx, { text: el.role ?? '// AI Automation Engineer', font: '@mono', size: L.size * 0.62, weight: 400, w: L.textW / env.U + 1, align: rtl ? 'right' : 'left', color: el.roleColor || '@muted' }, env, time, dur, { ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- status dot + mono label
export const status = {
  measure(el, env) {
    const m = textMetrics({ text: el.label ?? 'workflow running', font: '@mono', size: el.size ?? 30, weight: 400, w: 3000 }, env);
    const d = (el.size ?? 30) * env.U * 0.9;
    return { w: d + d * 0.6 + m.tightW, h: Math.max(d, m.H), bx: 0, by: 0 };
  },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const lab = el.label ?? 'workflow running';
    const m = textMetrics({ text: lab, font: '@mono', size: el.size ?? 30, weight: 400, w: 3000 }, env);
    const d = (el.size ?? 30) * env.U * 0.9;
    const W = d + d * 0.6 + m.tightW;
    const rtl = hasArabic(lab);
    const dx = rtl ? W / 2 - d / 2 : -W / 2 + d / 2;
    const col = color(el.color || '@accent', th);
    const ph = (time % 1.6) / 1.6;
    ctx.beginPath();
    ctx.arc(dx, 0, d / 2 + ph * d * 1.1, 0, TAU);
    ctx.fillStyle = rgba(col, 0.45 * (1 - ph));
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx, 0, d / 2, 0, TAU);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.save();
    ctx.translate(rtl ? dx - d / 2 - d * 0.6 - m.tightW / 2 : dx + d / 2 + d * 0.6 + m.tightW / 2, 0);
    drawText(ctx, { text: lab, font: '@mono', size: el.size ?? 30, weight: 400, w: 3000, color: el.labelColor || '@muted' }, env, time, dur, { ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
    ctx.restore();
  },
};

// ---------------------------------------------------------------- frame corners ⌜ ⌟
export const corners = {
  measure(el, env) { return { w: Uv(el.w ?? 800, env), h: Uv(el.h ?? 500, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const w = Uv(el.w ?? 800, env), h = Uv(el.h ?? 500, env);
    const L = Uv(el.len ?? 60, env) * clamp(tr.draw * 1.2);
    const pad = Uv(el.breath ?? 0, env) * Math.sin(time * 2);
    ctx.strokeStyle = color(el.color || '@accent', env.theme);
    ctx.lineWidth = Uv(el.strokeW ?? 5, env);
    ctx.lineCap = 'round';
    const X = w / 2 + pad, Y = h / 2 + pad;
    ctx.beginPath();
    ctx.moveTo(-X, -Y + L); ctx.lineTo(-X, -Y); ctx.lineTo(-X + L, -Y);
    ctx.moveTo(X - L, Y); ctx.lineTo(X, Y); ctx.lineTo(X, Y - L);
    if (el.all) {
      ctx.moveTo(X - L, -Y); ctx.lineTo(X, -Y); ctx.lineTo(X, -Y + L);
      ctx.moveTo(-X + L, Y); ctx.lineTo(-X, Y); ctx.lineTo(-X, Y - L);
    }
    ctx.stroke();
  },
};
