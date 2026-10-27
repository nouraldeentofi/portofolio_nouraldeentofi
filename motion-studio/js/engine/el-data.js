// Data + structure elements: bars, linechart, donut, progress, list, timeline, flow, equalizer.
import { TAU, clamp, ease, smoothstep, roundRectPath, rgba, hasArabic, noise2 } from './util.js';
import { color, fontString } from './themes.js';
import { textMetrics, drawText } from './text.js';
import { unitTransform, applyTransform } from './anim.js';
import { drawIcon } from './icons.js';
import { glass, softShadow, boxShadow, withBlur } from './paint.js';

const Uv = (v, env) => (v ?? 0) * env.U;
const plain = (tr) => ({ ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
const label = (ctx, env, time, dur, tr, opts, x, y) => {
  ctx.save();
  ctx.translate(x, y);
  drawText(ctx, { w: 3000, weight: 600, font: '@body', ...opts }, env, time, dur, plain(tr));
  ctx.restore();
};
const appear = (el, i, time, durMul = 1) => {
  const a = el.anim || {};
  const t0 = (a.start ?? 0) + i * (a.stagger ?? 0.12);
  return clamp((time - t0) / ((a.dur ?? 0.8) * durMul));
};
const fmt = (v, dec = 0) => v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------- bars
export const bars = {
  measure(el, env) { return { w: Uv(el.w ?? 800, env), h: Uv(el.h ?? 500, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 800, env), h = Uv(el.h ?? 500, env);
    const vals = el.values || [30, 55, 42, 80, 64];
    const n = vals.length;
    const max = el.max ?? Math.max(...vals) * 1.08;
    const horiz = el.orient === 'h';
    const labs = el.labels || [];
    const ls = el.labelSize ?? 26;
    const labH = labs.length ? ls * env.U * 1.8 : 0;
    const valH = el.showValues !== false ? ls * env.U * 1.6 : 0;
    const gapR = el.gap ?? 0.35;
    const hi = el.hi ?? vals.indexOf(Math.max(...vals));
    const colFor = (i) => {
      if (Array.isArray(el.colors)) return color(el.colors[i % el.colors.length], th);
      if (el.colors) return color(el.colors, th);
      return i === hi ? color('@accent', th) : color(el.dim || '@fg/0.22', th);
    };
    // baseline
    ctx.strokeStyle = color('@fg/0.18', th);
    ctx.lineWidth = Math.max(1, 2 * env.U);
    ctx.beginPath();
    if (horiz) { ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2); }
    else { ctx.moveTo(-w / 2, h / 2 - labH); ctx.lineTo(w / 2, h / 2 - labH); }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const p = ease('expoOut', appear(el, i, time));
      const v = vals[i] * p;
      ctx.fillStyle = colFor(i);
      if (!horiz) {
        const slot = w / n, bw = slot * (1 - gapR);
        const x = -w / 2 + slot * i + (slot - bw) / 2;
        const full = h - labH - valH;
        const bh = (v / max) * full;
        const y = h / 2 - labH - bh;
        roundRectPath(ctx, x, y, bw, Math.max(0.01, bh), Math.min(bw * 0.18, Uv(el.radius ?? 14, env)));
        ctx.fill();
        if (el.showValues !== false && p > 0.02)
          label(ctx, env, time, dur, tr, { text: fmt(v, el.decimals ?? 0) + (el.suffix || ''), font: '@mono', size: ls, weight: 600, color: i === hi ? '@accent' : '@muted' }, x + bw / 2, y - valH * 0.5);
        if (labs[i]) label(ctx, env, time, dur, tr, { text: labs[i], size: ls, color: '@muted', weight: 400 }, x + bw / 2, h / 2 - labH / 2);
      } else {
        const slot = h / n, bh = slot * (1 - gapR);
        const y = -h / 2 + slot * i + (slot - bh) / 2;
        const lw = el.labelW ? Uv(el.labelW, env) : 0;
        const full = w - valH * 3 - lw;
        const bw = (v / max) * full;
        roundRectPath(ctx, -w / 2 + lw, y, Math.max(0.01, bw), bh, Math.min(bh * 0.3, Uv(el.radius ?? 14, env)));
        ctx.fill();
        if (labs[i] && lw) label(ctx, env, time, dur, tr, { text: labs[i], size: ls, color: '@muted', weight: 400, w: el.labelW, align: 'start' }, -w / 2 + lw / 2 - ls * env.U * 0.3, y + bh / 2);
        else if (labs[i]) label(ctx, env, time, dur, tr, { text: labs[i], size: ls * 0.9, color: i === hi ? '@ink' : '@fg', weight: 600 }, -w / 2 + Math.max(bw / 2, ls * env.U * 3), y + bh / 2);
        if (el.showValues !== false && p > 0.02)
          label(ctx, env, time, dur, tr, { text: fmt(v, el.decimals ?? 0) + (el.suffix || ''), font: '@mono', size: ls, weight: 600, color: i === hi ? '@accent' : '@muted' }, -w / 2 + lw + bw + valH * 1.3, y + bh / 2);
      }
    }
  },
};

// ---------------------------------------------------------------- line chart
function smoothPts(pts, steps = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const linechart = {
  measure(el, env) { return { w: Uv(el.w ?? 860, env), h: Uv(el.h ?? 480, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 860, env), h = Uv(el.h ?? 480, env);
    const vals = el.values || [12, 18, 15, 30, 26, 44, 52, 70];
    const mn = el.min ?? Math.min(0, ...vals), mx = el.max ?? Math.max(...vals) * 1.1;
    const pts = vals.map((v, i) => [-w / 2 + (i / (vals.length - 1)) * w, h / 2 - ((v - mn) / (mx - mn)) * h]);
    const sp = el.smooth === false ? pts : smoothPts(pts);
    const a = el.anim || {};
    const p = ease('cubicInOut', clamp((time - (a.start ?? 0)) / ((a.dur ?? 0.8) * 2.2)));
    if (el.grid !== false) {
      ctx.strokeStyle = color('@fg/0.08', th);
      ctx.lineWidth = Math.max(1, 1.5 * env.U);
      for (let g = 0; g <= 4; g++) {
        const y = -h / 2 + (g / 4) * h;
        ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
      }
    }
    // cumulative length
    const L = [0];
    for (let i = 1; i < sp.length; i++) L.push(L[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
    const target = L[L.length - 1] * p;
    const vis = [sp[0]];
    let head = sp[0];
    for (let i = 1; i < sp.length; i++) {
      if (L[i] <= target) { vis.push(sp[i]); head = sp[i]; }
      else {
        const f = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
        head = [sp[i - 1][0] + (sp[i][0] - sp[i - 1][0]) * f, sp[i - 1][1] + (sp[i][1] - sp[i - 1][1]) * f];
        vis.push(head);
        break;
      }
    }
    const col = color(el.color || '@accent', th);
    if (el.area !== false && vis.length > 1) {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, rgba(col, 0.32));
      g.addColorStop(1, rgba(col, 0));
      ctx.beginPath();
      ctx.moveTo(vis[0][0], h / 2);
      vis.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(head[0], h / 2);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.beginPath();
    vis.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = col;
    ctx.lineWidth = Uv(el.strokeW ?? 7, env);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = col;
    ctx.shadowBlur = (el.glow ?? 0.6) * 24 * env.U * env.px;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (el.dots !== false) {
      pts.forEach(([x, y], i) => {
        const at = L[Math.min(L.length - 1, i * (el.smooth === false ? 1 : 12))];
        if (at > target + 0.5) return;
        ctx.beginPath(); ctx.arc(x, y, Uv(9, env), 0, TAU);
        ctx.fillStyle = th.c.bg; ctx.fill();
        ctx.lineWidth = Uv(4, env); ctx.strokeStyle = col; ctx.stroke();
      });
    }
    const ph = (time % 1.4) / 1.4;
    ctx.beginPath(); ctx.arc(head[0], head[1], Uv(12 + ph * 26, env), 0, TAU);
    ctx.fillStyle = rgba(col, 0.4 * (1 - ph)); ctx.fill();
    ctx.beginPath(); ctx.arc(head[0], head[1], Uv(12, env), 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    if (el.tip && p > 0.98) {
      const q = ease('backOut', clamp((time - (a.start ?? 0) - (a.dur ?? 0.8) * 2.2) / 0.5));
      const m = textMetrics({ text: el.tip, font: '@mono', size: 30, weight: 700, w: 3000 }, env);
      const half = m.tightW / 2 + Uv(18, env);
      const tx = Math.max(-w / 2 + half, Math.min(w / 2 - half, head[0]));
      ctx.save();
      ctx.translate(tx, head[1] - Uv(70, env));
      ctx.scale(q, q);
      roundRectPath(ctx, -m.tightW / 2 - Uv(18, env), -m.H / 2 - Uv(8, env), m.tightW + Uv(36, env), m.H + Uv(16, env), Uv(12, env));
      ctx.fillStyle = col; ctx.fill();
      drawText(ctx, { text: el.tip, font: '@mono', size: 30, weight: 700, w: 3000, color: '@ink' }, env, time, dur, plain(tr));
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- donut / ring progress
export const donut = {
  measure(el, env) { const s = Uv(el.w ?? 420, env); return { w: s, h: s, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const s = Uv(el.w ?? 420, env);
    const r = s / 2;
    const thick = r * (el.thick ?? 0.18);
    const vals = el.values || [el.value ?? 0.75];
    const tot = el.values ? vals.reduce((a, b) => a + b, 0) : 1;
    const a = el.anim || {};
    const p = ease('expoOut', clamp((time - (a.start ?? 0)) / ((a.dur ?? 0.8) * 2)));
    ctx.lineWidth = thick;
    ctx.lineCap = el.values ? 'butt' : 'round';
    ctx.beginPath(); ctx.arc(0, 0, r - thick / 2, 0, TAU);
    ctx.strokeStyle = color(el.track || '@fg/0.1', th); ctx.stroke();
    let acc = -Math.PI / 2;
    const cols = el.colors || ['@accent', '@secondary', '@fg/0.5', '@muted'];
    vals.forEach((v, i) => {
      const span = (v / tot) * TAU * p;
      ctx.beginPath(); ctx.arc(0, 0, r - thick / 2, acc, acc + Math.max(0.0001, span - (el.values ? 0.03 : 0)));
      ctx.strokeStyle = color(cols[i % cols.length], th);
      if (!el.values) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = (el.glow ?? 0.5) * 30 * env.U * env.px; }
      ctx.stroke();
      ctx.shadowBlur = 0;
      acc += (v / tot) * TAU * p;
    });
    const lab = el.label ?? (el.values ? '' : Math.round((el.value ?? 0.75) * 100 * p) + '%');
    if (lab) label(ctx, env, time, dur, tr, { text: lab, font: el.labelFont || '@display', size: el.labelSize ?? (el.w ?? 420) * 0.24, weight: 800, color: el.labelColor || '@fg' }, 0, el.sub ? -r * 0.08 : 0);
    if (el.sub) label(ctx, env, time, dur, tr, { text: el.sub, size: (el.w ?? 420) * 0.075, weight: 400, color: '@muted' }, 0, r * 0.2);
  },
};

// ---------------------------------------------------------------- progress bar
export const progress = {
  measure(el, env) { return { w: Uv(el.w ?? 800, env), h: Uv((el.h ?? 26) + (el.label ? 70 : 0), env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 800, env), bh = Uv(el.h ?? 26, env);
    const top = el.label ? Uv(70, env) : 0;
    const H = bh + top;
    const a = el.anim || {};
    const p = ease('expoOut', clamp((time - (a.start ?? 0) - 0.1) / ((a.dur ?? 0.8) * 2)));
    const y = -H / 2 + top;
    roundRectPath(ctx, -w / 2, y, w, bh, bh / 2);
    ctx.fillStyle = color(el.track || '@fg/0.1', th); ctx.fill();
    const fw = Math.max(bh, w * (el.value ?? 0.8) * p);
    const rtl = el.label && hasArabic(el.label);
    roundRectPath(ctx, rtl ? w / 2 - fw : -w / 2, y, fw, bh, bh / 2);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, color(el.color2 || el.color || '@secondary', th));
    g.addColorStop(1, color(el.color || '@accent', th));
    ctx.fillStyle = el.color2 ? g : color(el.color || '@accent', th);
    ctx.fill();
    if (el.label) {
      const lm = textMetrics({ text: el.label, size: el.labelSize ?? 32, weight: 600, font: '@body', w: 3000 }, env);
      label(ctx, env, time, dur, tr, { text: el.label, size: el.labelSize ?? 32, weight: 600, color: '@fg' }, rtl ? w / 2 - lm.tightW / 2 : -w / 2 + lm.tightW / 2, -H / 2 + Uv(26, env));
      const pct = Math.round((el.value ?? 0.8) * 100 * p) + '%';
      const pm = textMetrics({ text: pct, size: el.labelSize ?? 32, weight: 700, font: '@mono', w: 3000 }, env);
      label(ctx, env, time, dur, tr, { text: pct, font: '@mono', size: el.labelSize ?? 32, weight: 700, color: el.color || '@accent' }, rtl ? -w / 2 + pm.tightW / 2 : w / 2 - pm.tightW / 2, -H / 2 + Uv(26, env));
    }
  },
};

// ---------------------------------------------------------------- list (icon + text items)
function listLayout(el, env) {
  const size = el.size ?? 44;
  const items = el.items || ['أول نقطة', 'تاني نقطة', 'تالت نقطة'];
  const iconS = size * 1.15;
  const gapI = size * 0.55;
  const textW = (el.w ?? 820) - iconS - gapI;
  const rtl = el.dir ? el.dir === 'rtl' : hasArabic(items.join(''));
  const dir = rtl ? 'rtl' : 'ltr';
  const ms = items.map((t) => textMetrics({ text: t, size, weight: el.weight ?? 600, font: el.font || '@body', w: textW, align: 'start', lineHeight: el.lineHeight, dir }, env));
  const gap = Uv(el.gap ?? 34, env);
  const rows = ms.map((m) => Math.max(m.H, iconS * env.U));
  const H = rows.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  return { size, items, iconS, gapI, textW, ms, gap, rows, H, rtl };
}
export const list = {
  measure(el, env) { const L = listLayout(el, env); return { w: Uv(el.w ?? 820, env), h: L.H, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = listLayout(el, env);
    const W = Uv(el.w ?? 820, env);
    const kind = el.icon || 'check';
    const ic = color(el.iconColor || '@accent', th);
    const anim = { in: 'rise', dur: 0.7, stagger: 0.18, ...(el.anim || {}) };
    let y = -L.H / 2;
    L.items.forEach((t, i) => {
      const rh = L.rows[i];
      const { tr: ut } = unitTransform(anim, time, dur, { i, n: L.items.length, w: W / env.U, h: rh / env.U });
      if (ut.alpha > 0.002) {
        ctx.save();
        applyTransform(ctx, ut, 0, y + rh / 2, W, rh, env.U);
        ctx.globalAlpha *= clamp(ut.alpha);
        const is = L.iconS * env.U;
        const ix = L.rtl ? W / 2 - is / 2 : -W / 2 + is / 2;
        const body = (c) => {
          c.save();
          c.translate(ix, 0);
          if (kind === 'num') {
            c.beginPath(); c.arc(0, 0, is / 2, 0, TAU); c.fillStyle = ic; c.fill();
            drawText(c, { text: String(i + 1), font: '@mono', size: L.size * 0.62, weight: 700, color: el.numColor || '@ink', w: 200 }, env, time, dur, plain(tr));
          } else if (kind === 'dot') {
            c.beginPath(); c.arc(0, 0, is * 0.16, 0, TAU); c.fillStyle = ic; c.fill();
          } else if (kind === 'comment') {
            drawText(c, { text: String(i + 1).padStart(2, '0'), font: '@mono', size: L.size * 0.6, weight: 600, color: el.iconColor || '@accent', w: 200 }, env, time, dur, plain(tr));
          } else {
            if (el.iconBg !== false) { c.beginPath(); c.arc(0, 0, is / 2, 0, TAU); c.fillStyle = rgba(ic, 0.16); c.fill(); }
            const d = clamp((time - (anim.start ?? 0) - i * anim.stagger - 0.25) / 0.45);
            drawIcon(c, kind, is * 0.56, ic, { strokeW: 2.6, draw: kind === 'check' ? d : 1 });
          }
          c.restore();
          const tx = L.rtl ? W / 2 - is - L.gapI * env.U - (L.textW * env.U) / 2 : -W / 2 + is + L.gapI * env.U + (L.textW * env.U) / 2;
          c.save();
          c.translate(tx, 0);
          drawText(c, { text: t, size: L.size, weight: el.weight ?? 600, font: el.font || '@body', w: L.textW, align: 'start', color: el.color || '@fg', hl: el.hl, lineHeight: el.lineHeight, dir: L.rtl ? 'rtl' : 'ltr' }, env, time, dur, plain(tr));
          c.restore();
        };
        if (ut.blur > 0.4) withBlur(ctx, env, ut.blur, W, rh, body);
        else body(ctx);
        ctx.restore();
      }
      y += rh + L.gap;
    });
  },
};

// ---------------------------------------------------------------- timeline / steps
export const timeline = {
  measure(el, env) { return { w: Uv(el.w ?? 860, env), h: Uv(el.h ?? 700, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 860, env), h = Uv(el.h ?? 700, env);
    const items = el.items || [{ t: 'الفكرة', s: 'يوم 1' }, { t: 'التنفيذ', s: 'يوم 7' }, { t: 'الإطلاق', s: 'يوم 30' }];
    const n = items.length;
    const horiz = el.orient === 'h';
    const rtl = hasArabic(items.map((x) => x.t + (x.s || '')).join(''));
    const a = el.anim || {};
    const stag = a.stagger ?? 0.45;
    const lineP = ease('cubicInOut', clamp((time - (a.start ?? 0)) / (stag * (n - 1) + 0.6)));
    const col = color(el.color || '@accent', th);
    const dotR = Uv(el.dot ?? 18, env);
    const size = el.size ?? 40;
    ctx.lineCap = 'round';
    if (horiz) {
      const y0 = -h * 0.18;
      const x0 = -w / 2 + w / (2 * n), x1 = w / 2 - w / (2 * n);
      const xs = items.map((_, i) => (rtl ? x1 - (i / Math.max(1, n - 1)) * (x1 - x0) : x0 + (i / Math.max(1, n - 1)) * (x1 - x0)));
      ctx.lineWidth = Uv(5, env);
      ctx.strokeStyle = color('@fg/0.15', th);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.beginPath();
      if (rtl) { ctx.moveTo(x1, y0); ctx.lineTo(x1 - (x1 - x0) * lineP, y0); }
      else { ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * lineP, y0); }
      ctx.stroke();
      items.forEach((it, i) => {
        const q = ease('backOut', clamp((time - (a.start ?? 0) - i * stag) / 0.5));
        ctx.save(); ctx.translate(xs[i], y0); ctx.scale(q, q);
        ctx.beginPath(); ctx.arc(0, 0, dotR * 1.9, 0, TAU); ctx.fillStyle = rgba(col, 0.18); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, dotR, 0, TAU); ctx.fillStyle = col; ctx.fill();
        ctx.restore();
        const tq = ease('expoOut', clamp((time - (a.start ?? 0) - i * stag - 0.15) / 0.7));
        ctx.save(); ctx.globalAlpha *= tq; ctx.translate(xs[i], y0 + Uv(30, env) * (1 - tq));
        label(ctx, env, time, dur, tr, { text: it.t, size, weight: 700, color: '@fg', w: (w / n) / env.U * 0.95 }, 0, dotR * 2 + Uv(size, env) * 0.9);
        if (it.s) label(ctx, env, time, dur, tr, { text: it.s, font: '@mono', size: size * 0.62, weight: 400, color: '@muted', w: (w / n) / env.U }, 0, dotR * 2 + Uv(size, env) * 2);
        ctx.restore();
      });
    } else {
      const lx = rtl ? w / 2 - dotR * 2 : -w / 2 + dotR * 2;
      const y0 = -h / 2 + h / (2 * n), y1 = h / 2 - h / (2 * n);
      ctx.lineWidth = Uv(5, env);
      ctx.strokeStyle = color('@fg/0.15', th);
      ctx.beginPath(); ctx.moveTo(lx, y0); ctx.lineTo(lx, y1); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(lx, y0); ctx.lineTo(lx, y0 + (y1 - y0) * lineP); ctx.stroke();
      items.forEach((it, i) => {
        const y = y0 + (i / Math.max(1, n - 1)) * (y1 - y0);
        const q = ease('backOut', clamp((time - (a.start ?? 0) - i * stag) / 0.5));
        ctx.save(); ctx.translate(lx, y); ctx.scale(q, q);
        ctx.beginPath(); ctx.arc(0, 0, dotR * 1.9, 0, TAU); ctx.fillStyle = rgba(col, 0.18); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, dotR, 0, TAU); ctx.fillStyle = col; ctx.fill();
        ctx.restore();
        const tq = ease('expoOut', clamp((time - (a.start ?? 0) - i * stag - 0.15) / 0.7));
        const tw = w / env.U - dotR * 6 / env.U;
        const tx = rtl ? lx - dotR * 2.5 - (tw * env.U) / 2 : lx + dotR * 2.5 + (tw * env.U) / 2;
        ctx.save(); ctx.globalAlpha *= tq; ctx.translate(tx + (rtl ? -1 : 1) * Uv(40, env) * (1 - tq), y);
        const dir = rtl ? 'rtl' : 'ltr';
        label(ctx, env, time, dur, tr, { text: it.t, size, weight: 700, color: '@fg', w: tw, align: 'start', dir }, 0, it.s ? -Uv(size, env) * 0.45 : 0);
        if (it.s) label(ctx, env, time, dur, tr, { text: it.s, font: '@mono', size: size * 0.6, weight: 400, color: '@muted', w: tw, align: 'start', dir }, 0, Uv(size, env) * 0.6);
        ctx.restore();
      });
    }
  },
};

// ---------------------------------------------------------------- flow (automation nodes)
function edgePath(ctx, a, b, f) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const horiz = Math.abs(dx) >= Math.abs(dy);
  const c1 = horiz ? [a[0] + dx * 0.5, a[1]] : [a[0], a[1] + dy * 0.5];
  const c2 = horiz ? [b[0] - dx * 0.5, b[1]] : [b[0], b[1] - dy * 0.5];
  const pt = (t) => {
    const u = 1 - t;
    return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]];
  };
  if (ctx) {
    ctx.beginPath();
    const N = 40;
    for (let i = 0; i <= N * f; i++) {
      const p = pt(Math.min(f, i / N));
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    const e = pt(f); ctx.lineTo(e[0], e[1]);
  }
  return pt;
}
export const flow = {
  measure(el, env) { return { w: Uv(el.w ?? 900, env), h: Uv(el.h ?? 420, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 900, env), h = Uv(el.h ?? 420, env);
    const nodes = el.nodes || [
      { label: 'Webhook', icon: 'bolt', x: -0.4, y: 0 },
      { label: 'AI Agent', icon: 'bot', x: 0, y: 0 },
      { label: 'CRM', icon: 'database', x: 0.4, y: 0 },
    ];
    const edges = el.edges || nodes.slice(1).map((_, i) => [i, i + 1]);
    const ns = Uv(el.nodeSize ?? 120, env);
    const a = el.anim || {};
    const stag = a.stagger ?? 0.4;
    const t0 = a.start ?? 0;
    const pos = nodes.map((n) => [n.x * w, n.y * h]);
    const shown = nodes.map((_, i) => ease('backOut', clamp((time - t0 - i * stag) / 0.55)));
    const col = color(el.color || '@accent', th);
    const lineCol = color(el.lineColor || '@fg/0.35', th);
    const order = nodes.map((n, i) => n.order ?? i);
    // edges below nodes
    edges.forEach(([ai, bi], k) => {
      const A = pos[ai], B = pos[bi];
      if (!A || !B) return;
      const startT = t0 + order[bi] * stag - stag * 0.55;
      const f = ease('cubicInOut', clamp((time - startT) / (stag * 0.75 + 0.1)));
      if (f <= 0) return;
      const horiz = Math.abs(B[0] - A[0]) >= Math.abs(B[1] - A[1]);
      const sgx = Math.sign(B[0] - A[0]) || 1, sgy = Math.sign(B[1] - A[1]) || 1;
      const labGap = (n) => (n && n.label ? Uv((el.labelSize ?? 26) * 1.7 + 14, env) : 0);
      const a2 = horiz ? [A[0] + sgx * ns / 2, A[1]] : [A[0], A[1] + sgy * (ns / 2 + (sgy > 0 ? labGap(nodes[ai]) : 0))];
      const b2 = horiz ? [B[0] - sgx * ns / 2, B[1]] : [B[0], B[1] - sgy * (ns / 2 + (sgy < 0 ? labGap(nodes[bi]) : 0))];
      ctx.lineWidth = Uv(el.lineW ?? 4, env);
      ctx.strokeStyle = lineCol;
      ctx.lineCap = 'round';
      if (el.dashed) ctx.setLineDash([Uv(10, env), Uv(12, env)]);
      const pt = edgePath(ctx, a2, b2, f);
      ctx.stroke();
      ctx.setLineDash([]);
      // pulses travelling along the connection
      if (f >= 1 && el.pulse !== false) {
        const per = el.pulseEvery ?? 1.6;
        for (let q = 0; q < (el.pulses ?? 1); q++) {
          const ph = ((time - startT + q * per / (el.pulses ?? 1) + k * 0.37) % per) / per;
          const p = pt(ease('sineInOut', ph));
          const alpha = Math.sin(ph * Math.PI);
          ctx.beginPath(); ctx.arc(p[0], p[1], Uv(16, env), 0, TAU);
          ctx.fillStyle = rgba(col, 0.25 * alpha); ctx.fill();
          ctx.beginPath(); ctx.arc(p[0], p[1], Uv(7, env), 0, TAU);
          ctx.fillStyle = rgba(col, alpha); ctx.fill();
        }
      }
      if (f > 0.02) {
        ctx.beginPath(); ctx.arc(a2[0], a2[1], Uv(7, env), 0, TAU); ctx.fillStyle = th.c.bg; ctx.fill();
        ctx.lineWidth = Uv(3, env); ctx.strokeStyle = lineCol; ctx.stroke();
      }
      if (f >= 1) { ctx.beginPath(); ctx.arc(b2[0], b2[1], Uv(7, env), 0, TAU); ctx.fillStyle = lineCol; ctx.fill(); }
    });
    nodes.forEach((n, i) => {
      const q = shown[i];
      if (q <= 0.001) return;
      ctx.save();
      ctx.translate(pos[i][0], pos[i][1]);
      ctx.scale(q, q);
      const r = ns * 0.26;
      const pathFn = () => (el.round ? (ctx.beginPath(), ctx.arc(0, 0, ns / 2, 0, TAU)) : roundRectPath(ctx, -ns / 2, -ns / 2, ns, ns, r));
      if (el.round) softShadow(ctx, env, pathFn, 0.8); else boxShadow(ctx, env, ns, ns, r, 0.8);
      if (n.hot || i === el.hot) {
        pathFn(); ctx.fillStyle = col; ctx.fill();
      } else glass(ctx, env, pathFn, ns, ns, { blur: 0 });
      const active = (time - t0 - i * stag) > 0.4;
      if (active && el.ring !== false && !(n.hot || i === el.hot)) {
        pathFn(); ctx.lineWidth = Uv(3, env); ctx.strokeStyle = rgba(col, 0.55); ctx.stroke();
      }
      drawIcon(ctx, n.icon || 'bolt', ns * 0.46, n.hot || i === el.hot ? color('@ink', th) : col, { strokeW: 2 });
      ctx.restore();
      if (n.label) {
        const lq = ease('expoOut', clamp((time - t0 - i * stag - 0.12) / 0.6));
        ctx.save();
        ctx.globalAlpha *= lq;
        label(ctx, env, time, dur, tr, { text: n.label, font: el.labelFont || '@mono', size: el.labelSize ?? 26, weight: 600, color: '@fg', w: 400 }, pos[i][0], pos[i][1] + ns / 2 + Uv((el.labelSize ?? 26) * 1.1, env) + Uv(14, env) * (1 - lq));
        ctx.restore();
      }
    });
  },
};

// ---------------------------------------------------------------- equalizer
export const equalizer = {
  measure(el, env) { return { w: Uv(el.w ?? 600, env), h: Uv(el.h ?? 200, env), bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const w = Uv(el.w ?? 600, env), h = Uv(el.h ?? 200, env);
    const n = el.bars ?? 24;
    const slot = w / n, bw = slot * (el.thin ?? 0.55);
    const a = el.anim || {};
    const intro = ease('expoOut', clamp((time - (a.start ?? 0)) / 0.8));
    for (let i = 0; i < n; i++) {
      const k = noise2(i * 0.45, time * (el.speed ?? 2.4), 2);
      const env2 = Math.sin((i / (n - 1)) * Math.PI) * 0.6 + 0.4;
      const bh = Math.max(bw, h * (0.12 + 0.88 * k * env2) * intro);
      const x = -w / 2 + i * slot + (slot - bw) / 2;
      roundRectPath(ctx, x, el.mirror === false ? h / 2 - bh : -bh / 2, bw, bh, bw / 2);
      const isHi = el.colors === undefined && (i % 7 === 3);
      ctx.fillStyle = color(isHi ? el.color2 || el.color || '@accent' : el.color || '@accent', th);
      ctx.fill();
    }
  },
};
