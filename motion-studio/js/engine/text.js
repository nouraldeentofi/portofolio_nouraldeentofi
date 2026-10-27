// Text layout (bilingual RTL/LTR, wrapping, markup) and animated drawing.
// Markup: *word* marks accent words.
import { hasArabic, strongDir, paraDir, clamp, smoothstep, sr, roundRectPath, makeCanvas, rgba } from './util.js';
import { color, fontString } from './themes.js';
import { unitTransform, applyLoop, applyTransform, applyClip, identity } from './anim.js';
import { withBlur } from './paint.js';

let mctx = null;
function measureCtx() {
  if (!mctx) mctx = makeCanvas(8, 8).getContext('2d');
  return mctx;
}
const cache = new Map();
const SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$<>/*+';

function setLS(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function tokenize(par) {
  const toks = [];
  let acc = false, buf = '', glue = false, run = 0;
  const push = (nextGlue) => {
    if (buf) toks.push({ t: buf, acc, glue, run: acc ? run : 0 });
    buf = '';
    glue = nextGlue;
  };
  for (const ch of par) {
    if (ch === '*') { const had = buf.length > 0; push(had); acc = !acc; if (acc) run++; continue; }
    if (ch === ' ' || ch === '\t') { push(false); continue; }
    buf += ch;
  }
  push(false);
  return toks;
}

// "workflow." inside Arabic: the dot belongs to the paragraph, not to the English word,
// so edge punctuation on an opposite-direction word becomes its own glued token
const LEAD = /^[("'«“‘[{]+/;
const TRAIL = /[.,!?:;،؛؟…)"'»”’\]}]+$/;
function splitEdges(toks, pdir) {
  const out = [];
  for (const tk of toks) {
    const d = hasArabic(tk.t) ? 'rtl' : strongDir(tk.t);
    const lead = d && d !== pdir ? (tk.t.match(LEAD) || [''])[0] : '';
    const rest = tk.t.slice(lead.length);
    const trail = d && d !== pdir ? (rest.match(TRAIL) || [''])[0] : '';
    const core = rest.slice(0, rest.length - trail.length);
    if (!core || (!lead && !trail)) { out.push(tk); continue; }
    let first = true;
    for (const t of [lead, core, trail]) {
      if (!t) continue;
      out.push({ ...tk, t, glue: first ? tk.glue : true });
      first = false;
    }
  }
  return out;
}

function tokenDir(t, pdir) {
  if (hasArabic(t)) return 'rtl';
  const d = strongDir(t);
  return d || null;
}

export function textMetrics(el, env) {
  const th = env.theme, U = env.U;
  const size = (el.size ?? 80) * U;
  const font = fontString(el.font || '@display', th, el.weight ?? 800, size);
  const key = [el.text, font, el.lineHeight, el.letterSpacing, el.w, el.align, el.upper, el.split, el.dir, U, el.hl].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 800) cache.clear();

  const ctx = measureCtx();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  let raw = String(el.text ?? '');
  if (el.upper) raw = raw.toUpperCase();
  const arabic = hasArabic(raw);
  const lsEm = el.letterSpacing ?? 0;
  const lsPx = lsEm * size;
  const maxW = Math.min((el.w ?? 900) * U, env.W * 0.96);
  const lhMul = el.lineHeight ?? (arabic ? 1.35 : 1.12);
  const lh = size * lhMul;
  setLS(ctx, 0);
  const spaceW = ctx.measureText(' ').width;

  const lines = [];
  const paragraphs = raw.split('\n');
  let logical = 0;
  for (const par of paragraphs) {
    const pdir = el.dir && el.dir !== 'auto' ? el.dir : paraDir(par.replace(/\*/g, '')) || 'ltr';
    const toks = splitEdges(tokenize(par), pdir);
    for (const tk of toks) {
      tk.dir = tokenDir(tk.t, pdir);
      setLS(ctx, tk.dir === 'rtl' ? 0 : lsPx);
      tk.w = ctx.measureText(tk.t).width;
      tk.li = logical++;
    }
    // resolve neutral tokens from their neighbours
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].dir) continue;
      let pv = null, nx = null;
      for (let j = i - 1; j >= 0; j--) if (toks[j].dir) { pv = toks[j].dir; break; }
      for (let j = i + 1; j < toks.length; j++) if (toks[j].dir) { nx = toks[j].dir; break; }
      toks[i].dir = pv && pv === nx ? pv : pdir;
    }
    // greedy wrap
    let cur = [], curW = 0;
    const flush = () => { lines.push({ toks: cur, pdir }); cur = []; curW = 0; };
    if (!toks.length) { lines.push({ toks: [], pdir }); continue; }
    const widthOf = (arr) => arr.reduce((w, k, i) => w + (i && !k.glue ? spaceW : 0) + k.w, 0);
    for (const tk of toks) {
      const add = (cur.length && !tk.glue ? spaceW : 0) + tk.w;
      if (cur.length && curW + add > maxW && !tk.glue) {
        // keep a highlighted phrase together: carry its start to the next line when it fits there
        let j = -1;
        if (tk.run && cur[cur.length - 1].run === tk.run) j = cur.findIndex((k) => k.run === tk.run);
        if (j > 0 && widthOf([...cur.slice(j), tk]) <= maxW) {
          const carry = cur.slice(j);
          cur = cur.slice(0, j);
          flush();
          cur = carry;
          curW = widthOf(carry);
        } else flush();
      }
      curW += (cur.length && !tk.glue ? spaceW : 0) + tk.w;
      cur.push(tk);
    }
    if (cur.length) flush();
  }

  // visual order + widths
  let tightW = 0;
  for (const ln of lines) {
    const runs = [];
    for (const tk of ln.toks) {
      const last = runs[runs.length - 1];
      if (last && last.dir === tk.dir) last.toks.push(tk);
      else runs.push({ dir: tk.dir, toks: [tk] });
    }
    if (ln.pdir === 'rtl') runs.reverse();
    const vis = [];
    for (const r of runs) vis.push(...(r.dir === 'rtl' ? [...r.toks].reverse() : r.toks));
    let x = 0;
    const boxed = el.hl === 'marker' || el.hl === 'box';
    for (let i = 0; i < vis.length; i++) {
      const tk = vis[i];
      if (i > 0) {
        const pv = vis[i - 1];
        const glued = (tk.glue && tk.li === pv.li + 1) || (pv.glue && pv.li === tk.li + 1);
        if (!glued) x += spaceW + (boxed && pv.acc !== tk.acc ? size * 0.16 : 0);
      }
      tk.x = x;
      x += tk.w;
    }
    ln.vis = vis;
    ln.w = x;
    tightW = Math.max(tightW, x);
  }
  const H = lines.length * lh;
  const align = el.align || 'center';
  const firstDir = lines[0] ? lines[0].pdir : 'ltr';
  const side = (a, dir) => (a === 'start' ? (dir === 'rtl' ? 'right' : 'left') : a === 'end' ? (dir === 'rtl' ? 'left' : 'right') : a);
  const blockSide = side(align, firstDir);
  const layoutW = blockSide === 'center' ? tightW : maxW;
  const bx = blockSide === 'left' ? -(layoutW - tightW) / 2 : blockSide === 'right' ? (layoutW - tightW) / 2 : 0;
  const left0 = bx - tightW / 2;

  // absolute positions relative to anchor
  let ci = 0;
  lines.forEach((ln, li) => {
    const s = side(align, ln.pdir);
    const off = s === 'left' ? 0 : s === 'right' ? tightW - ln.w : (tightW - ln.w) / 2;
    ln.x = left0 + off;
    ln.cy = -H / 2 + li * lh + lh / 2;
    for (const tk of ln.vis) {
      tk.ax = ln.x + tk.x;
      tk.cy = ln.cy;
      tk.line = li;
    }
    // accent runs for marker / underline
    ln.marks = [];
    let run = null;
    for (const tk of ln.vis) {
      if (tk.acc) {
        if (run) run.x1 = tk.ax + tk.w;
        else { run = { x0: tk.ax, x1: tk.ax + tk.w, cy: ln.cy, li: tk.li }; ln.marks.push(run); }
        run.li = Math.min(run.li, tk.li);
      } else run = null;
    }
  });
  // logical token list for typewriter order
  const logicalToks = lines.flatMap((l) => l.toks);
  for (const tk of logicalToks) { tk.cs = ci; ci += [...tk.t].length; }

  // units
  const split = el.split || 'none';
  const units = [];
  if (split === 'line') {
    lines.forEach((ln, li) => {
      if (!ln.vis.length) return;
      units.push({ i: units.length, cx: ln.x + ln.w / 2, cy: ln.cy, w: ln.w, h: lh, toks: ln.vis.map((tk) => ({ tk, t: tk.t, x: tk.ax, w: tk.w, dir: tk.dir })) });
    });
  } else if (split === 'word') {
    for (const tk of logicalToks) units.push({ i: units.length, cx: tk.ax + tk.w / 2, cy: tk.cy, w: tk.w, h: lh, toks: [{ tk, t: tk.t, x: tk.ax, w: tk.w, dir: tk.dir }] });
  } else if (split === 'letter') {
    for (const tk of logicalToks) {
      if (tk.dir === 'rtl' || hasArabic(tk.t)) {
        units.push({ i: units.length, cx: tk.ax + tk.w / 2, cy: tk.cy, w: tk.w, h: lh, toks: [{ tk, t: tk.t, x: tk.ax, w: tk.w, dir: 'rtl' }] });
        continue;
      }
      setLS(ctx, lsPx);
      const chars = [...tk.t];
      let pre = '';
      for (const ch of chars) {
        const x0 = ctx.measureText(pre).width;
        const cw = ctx.measureText(ch).width;
        pre += ch;
        if (ch.trim()) units.push({ i: units.length, cx: tk.ax + x0 + cw / 2, cy: tk.cy, w: cw, h: lh, toks: [{ tk, t: ch, x: tk.ax + x0, w: cw, dir: 'ltr' }] });
      }
    }
  }
  units.forEach((u) => (u.n = units.length));

  const m = {
    font, size, lh, lsPx, lines, logicalToks, units, chars: ci, tightW, H,
    bounds: { x: left0, y: -H / 2, w: tightW, h: H },
    arabic,
  };
  cache.set(key, m);
  return m;
}

// Fill style for a token
function tokenFill(ctx, el, env, m, acc, tr) {
  const th = env.theme;
  const hl = el.hl || 'color';
  let c = color(el.color || '@fg', th);
  if (acc) {
    if (hl === 'color' || hl === 'underline') c = color(el.accentColor || '@accent', th);
    else if (hl === 'marker') c = color(el.markerInk || '@markerInk', th);
    else if (hl === 'gradient') {
      const g = ctx.createLinearGradient(m.bounds.x, 0, m.bounds.x + m.bounds.w, 0);
      g.addColorStop(0, color(el.accentColor || '@accent', th));
      g.addColorStop(1, color(el.accentColor2 || '@secondary', th));
      return g;
    }
  }
  if (el.fill && typeof el.fill === 'object' && !acc) {
    const b = m.bounds;
    const ang = ((el.fill.angle ?? 90) * Math.PI) / 180;
    const dx = Math.sin(ang) * b.w * 0.5, dy = -Math.cos(ang) * b.h * 0.5;
    const g = ctx.createLinearGradient(-dx + b.x + b.w / 2, -dy, dx + b.x + b.w / 2, dy);
    const cs = el.fill.colors || ['@accent', '@secondary'];
    cs.forEach((cc, i) => g.addColorStop(i / Math.max(1, cs.length - 1), color(cc, th)));
    return g;
  }
  if (tr && tr.shimmer >= 0) {
    const b = m.bounds;
    const s = tr.shimmer - 0.35;
    const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h * 0.3);
    const hi = th.dark ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)';
    const stops = [[0, c], [clamp(s - 0.12), c], [clamp(s), hi], [clamp(s + 0.12), c], [1, c]];
    let last = -1;
    for (const [o, cc] of stops) { const oo = Math.max(o, last); g.addColorStop(oo, cc); last = oo; }
    return g;
  }
  return c;
}

function drawTokenText(ctx, el, env, m, d, x, y, tr, visibleChars) {
  const th = env.theme;
  ctx.direction = d.dir === 'rtl' ? 'rtl' : 'ltr';
  setLS(ctx, d.dir === 'rtl' ? 0 : m.lsPx + (tr ? tr.track * m.size : 0));
  let s = d.t;
  let ax = x;
  if (visibleChars != null) {
    const chars = [...s];
    if (visibleChars <= 0) return;
    if (visibleChars < chars.length) {
      s = chars.slice(0, visibleChars).join('');
      if (d.dir === 'rtl') {
        ctx.textAlign = 'right';
        ax = x + d.w;
      }
    }
  }
  const outline = el.outline || (d.tk && d.tk.acc && el.hl === 'outline');
  if (outline) {
    ctx.lineWidth = (el.strokeW ?? 3) * env.U;
    ctx.strokeStyle = d.tk && d.tk.acc && el.hl === 'outline' ? color(el.accentColor || '@accent', th) : color(el.strokeColor || el.color || '@fg', th);
    ctx.lineJoin = 'round';
    ctx.strokeText(s, ax, y);
    if (!(el.outline && el.outlineFill)) { ctx.textAlign = 'left'; return; }
  } else if (el.stroke) {
    ctx.lineWidth = (el.strokeW ?? 4) * env.U;
    ctx.strokeStyle = color(el.stroke, th);
    ctx.lineJoin = 'round';
    ctx.strokeText(s, ax, y);
  }
  ctx.fillText(s, ax, y);
  ctx.textAlign = 'left';
}

function scrambleDraw(ctx, el, env, m, d, x, y, sp, time) {
  if (d.dir === 'rtl') {
    const a = smoothstep(d.tk.cs / m.chars, d.tk.cs / m.chars + 0.25, sp * 1.25);
    ctx.globalAlpha *= a;
    drawTokenText(ctx, el, env, m, d, x, y, null);
    return;
  }
  setLS(ctx, m.lsPx);
  ctx.direction = 'ltr';
  const chars = [...d.t];
  let pre = '';
  const tick = Math.floor(time * 18);
  chars.forEach((ch, k) => {
    const g = d.tk.cs + k;
    const th = g / Math.max(1, m.chars);
    const x0 = x + ctx.measureText(pre).width;
    pre += ch;
    if (sp * 1.3 - 0.3 >= th) ctx.fillText(ch, x0, y);
    else if (sp * 1.3 >= th - 0.05) {
      const r = SCRAMBLE[Math.floor(sr(g * 31.7 + tick * 7.3) * SCRAMBLE.length)];
      const save = ctx.fillStyle;
      ctx.fillStyle = color(el.accentColor || '@accent', env.theme);
      ctx.fillText(r, x0, y);
      ctx.fillStyle = save;
    }
  });
}

export function drawBox(ctx, el, env, m) {
  if (!el.box) return;
  const th = env.theme, U = env.U, b = el.box;
  const px = (b.padX ?? 34) * U, py = (b.padY ?? 16) * U;
  const x = m.bounds.x - px, y = m.bounds.y - py, w = m.bounds.w + px * 2, h = m.bounds.h + py * 2;
  const r = b.radius === 'pill' || b.radius == null ? h / 2 : b.radius * U;
  roundRectPath(ctx, x, y, w, h, r);
  if (b.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 40 * U * env.px;
    ctx.shadowOffsetY = 14 * U * env.px;
    ctx.fillStyle = color(b.fill || '@card', th);
    ctx.fill();
    ctx.restore();
  } else if (b.fill !== 'none') {
    ctx.fillStyle = color(b.fill || '@accent', th);
    ctx.fill();
  }
  if (b.stroke) {
    ctx.lineWidth = (b.strokeW ?? 2) * U;
    ctx.strokeStyle = color(b.stroke, th);
    ctx.stroke();
  }
}

function drawMarks(ctx, el, env, m, time) {
  const hl = el.hl || 'color';
  if (hl !== 'marker' && hl !== 'underline' && hl !== 'box') return;
  const th = env.theme, U = env.U;
  const a = el.anim || {};
  const st = a.stagger ?? 0.05;
  m.lines.forEach((ln, lineIdx) => {
    for (const mk of ln.marks) {
      // unit index of the first accent token decides when its mark grows in
      let ui = 0;
      if (el.split === 'word' || el.split === 'letter' || el.split === 'line') {
        const u = m.units.find((uu) => uu.toks.some((d) => d.tk.li === mk.li));
        ui = u ? u.i : el.split === 'line' ? lineIdx : 0;
      }
      const t0 = (a.start ?? 0) + ui * st + (a.dur ?? 0.7) * 0.55 + (el.markDelay ?? 0);
      const p = smoothstep(t0, t0 + 0.5, time);
      if (p <= 0) continue;
      const padX = m.size * 0.12;
      const w = (mk.x1 - mk.x0 + padX * 2);
      const rtl = ln.pdir === 'rtl';
      const x0 = rtl ? mk.x1 + padX - w * p : mk.x0 - padX;
      if (hl === 'marker') {
        const h = m.size * 1.08;
        ctx.fillStyle = color(el.markerColor || '@marker', th);
        roundRectPath(ctx, x0, mk.cy - h / 2 + m.size * 0.04, w * p, h, m.size * 0.12);
        ctx.fill();
      } else if (hl === 'underline') {
        const h = Math.max(3 * U, m.size * 0.085);
        ctx.fillStyle = color(el.accentColor || '@accent', th);
        roundRectPath(ctx, x0, mk.cy + m.size * 0.52, w * p, h, h / 2);
        ctx.fill();
      } else if (hl === 'box') {
        const h = m.size * 1.12;
        ctx.strokeStyle = color(el.accentColor || '@accent', th);
        ctx.lineWidth = Math.max(2 * U, m.size * 0.05);
        roundRectPath(ctx, x0, mk.cy - h / 2, w * p, h, m.size * 0.18);
        ctx.stroke();
      }
    }
  });
}

function glitchCopies(ctx, env, tr, fn) {
  if (tr.glitch <= 0.01) return;
  const off = tr.glitch * 14 * env.U;
  ctx.save();
  ctx.globalAlpha *= 0.75;
  ctx.globalCompositeOperation = env.theme.dark ? 'lighter' : 'multiply';
  ctx.fillStyle = env.theme.dark ? '#ff2a6d' : '#ff2a6d';
  ctx.translate(-off, 0);
  fn('#ff2a6d');
  ctx.translate(off * 2, off * 0.3);
  fn('#05d9e8');
  ctx.restore();
}

function caretDraw(ctx, el, env, m, time, typingDone, pos) {
  if (!el.caret) return;
  const th = env.theme;
  const blinkOn = !typingDone || (time % 1.0) < 0.55;
  if (!blinkOn) return;
  const w = m.size * 0.09, h = m.size * 0.95;
  ctx.fillStyle = color(el.caretColor || '@accent', th);
  ctx.fillRect(pos.x + (pos.rtl ? -w - m.size * 0.08 : m.size * 0.08), pos.y - h / 2, w, h);
}

function endPos(m) {
  const ln = m.lines[m.lines.length - 1];
  if (!ln || !ln.vis.length) return { x: 0, y: 0, rtl: false };
  const rtl = ln.pdir === 'rtl';
  return rtl ? { x: ln.x, y: ln.cy, rtl } : { x: ln.x + ln.w, y: ln.cy, rtl };
}

// Draw a text element. Caller has translated to the element anchor and applied
// the element-level transform `tr` (its alpha/blur/clip already handled).
export function drawText(ctx, el, env, time, sceneDur, tr) {
  const m = textMetrics(el, env);
  const th = env.theme, U = env.U;
  ctx.font = m.font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  drawBox(ctx, el, env, m);
  drawMarks(ctx, el, env, m, time);

  const glowAmt = (el.glow ?? 0) * (tr ? tr.glow : 1);
  const setShadow = () => {
    if (glowAmt > 0) {
      ctx.shadowColor = color(el.glowColor || el.accentColor || '@accent', th);
      ctx.shadowBlur = 36 * glowAmt * U * env.px;
    } else if (el.shadow) {
      ctx.shadowColor = `rgba(0,0,0,${0.35 * el.shadow})`;
      ctx.shadowBlur = 28 * U * env.px;
      ctx.shadowOffsetY = 10 * U * env.px;
    }
  };
  const split = el.split || 'none';
  if (split === 'none' || !m.units.length) {
    const typing = tr.type < 1 ? Math.floor(tr.type * m.chars + 0.0001) : null;
    const drawAll = (forceColor) => {
      for (const ln of m.lines) {
        let extra = 0;
        if (tr.track > 0 && !m.arabic) {
          const n = ln.vis.reduce((s, tk) => s + [...tk.t].length, 0);
          extra = tr.track * m.size * n;
        }
        let shift = -extra / 2, acc = 0;
        for (const tk of ln.vis) {
          ctx.fillStyle = forceColor || tokenFill(ctx, el, env, m, tk.acc, tr);
          const d = { tk, t: tk.t, w: tk.w, dir: tk.dir };
          const x = tk.ax + shift + acc;
          if (tr.scramble < 1) scrambleDraw(ctx, el, env, m, d, x, tk.cy, tr.scramble, time);
          else drawTokenText(ctx, el, env, m, d, x, tk.cy, tr, typing == null ? null : typing - tk.cs);
          if (extra) acc += tr.track * m.size * [...tk.t].length;
        }
      }
    };
    glitchCopies(ctx, env, tr, (c) => drawAll(c));
    ctx.save();
    setShadow();
    drawAll(null);
    ctx.restore();
    // caret follows typing
    if (el.caret) {
      let pos = endPos(m);
      if (typing != null) {
        const tk = m.logicalToks.find((k) => typing >= k.cs && typing <= k.cs + [...k.t].length) || m.logicalToks[m.logicalToks.length - 1];
        if (tk) {
          const mc = measureCtx();
          mc.font = m.font;
          setLS(mc, tk.dir === 'rtl' ? 0 : m.lsPx);
          const sub = [...tk.t].slice(0, Math.max(0, typing - tk.cs)).join('');
          const sw = mc.measureText(sub).width;
          pos = tk.dir === 'rtl' ? { x: tk.ax + tk.w - sw, y: tk.cy, rtl: true } : { x: tk.ax + sw, y: tk.cy, rtl: false };
        }
      }
      caretDraw(ctx, el, env, m, time, typing == null, pos);
    }
    return m;
  }

  // split: every unit animates on its own
  const anim = el.anim || {};
  const setShadowOn = (c) => {
    if (glowAmt > 0) {
      c.shadowColor = color(el.glowColor || el.accentColor || '@accent', th);
      c.shadowBlur = 36 * glowAmt * U * env.px;
    } else if (el.shadow) {
      c.shadowColor = `rgba(0,0,0,${0.35 * el.shadow})`;
      c.shadowBlur = 28 * U * env.px;
      c.shadowOffsetY = 10 * U * env.px;
    }
  };
  for (const u of m.units) {
    const info = { i: u.i, n: u.n, w: u.w / U, h: u.h / U };
    const { tr: ut } = unitTransform(anim, time, sceneDur, info);
    applyLoop(ut, anim, time, info, true);
    if (ut.alpha <= 0.002) continue;
    ctx.save();
    applyTransform(ctx, ut, u.cx, u.cy, u.w, u.h, U);
    ctx.globalAlpha *= clamp(ut.alpha);
    applyClip(ctx, ut, u.w, u.h, U);
    const drawU = (c, forceColor) => {
      for (const d of u.toks) {
        c.fillStyle = forceColor || tokenFill(c, el, env, m, d.tk.acc, tr);
        drawTokenText(c, el, env, m, d, d.x - u.cx, d.tk.cy - u.cy, null);
      }
    };
    const body = (c) => {
      c.font = m.font;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      glitchCopies(c, env, ut, (fc) => drawU(c, fc));
      setShadowOn(c);
      drawU(c, null);
    };
    if (ut.blur > 0.4) withBlur(ctx, env, ut.blur, u.w + m.size * 0.4, u.h, body);
    else body(ctx);
    ctx.restore();
  }
  if (el.caret) {
    const w = { start: anim.start ?? 0 };
    const doneAt = w.start + (anim.dur ?? 0.7) + (anim.stagger ?? 0.05) * (m.units.length - 1);
    if (time > (anim.start ?? 0)) caretDraw(ctx, el, env, m, time, time > doneAt, endPos(m));
  }
  return m;
}

export function clearTextCache() { cache.clear(); }
