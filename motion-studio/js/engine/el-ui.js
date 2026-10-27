// Interface elements: code / terminal window, chat thread, notification, device mockups.
import { TAU, clamp, ease, roundRectPath, rgba, hasArabic, luminance, smoothstep } from './util.js';
import { color, fontString } from './themes.js';
import { textMetrics, drawText } from './text.js';
import { glass, softShadow, boxShadow } from './paint.js';
import { drawIcon } from './icons.js';

const Uv = (v, env) => (v ?? 0) * env.U;
const plain = (tr) => ({ ...tr, type: 1, scramble: 1, glitch: 0, track: 0, shimmer: -1 });
const contrast = (a, b) => {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// ---------------------------------------------------------------- code / terminal
const KW = /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|await|async|class|new|def|try|catch|in|of|true|false|null|undefined|self|print|elif|lambda|yield)\b/;
const TOK = /(\/\/.*$|#.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|\b(const|let|var|function|return|if|else|for|while|import|from|export|default|await|async|class|new|def|try|catch|in|of|true|false|null|undefined|self|print|elif|lambda|yield)\b|\b(\d+(?:\.\d+)?)\b|([{}()[\];,.:=<>+\-*/!&|?])/gm;
function highlight(line, th) {
  const win = th.c.window;
  const fg = th.c.windowFg;
  const acc = th.c.windowAccent;
  const str = contrast(th.c.secondary, win) > 3.2 && th.c.secondary !== acc ? th.c.secondary : rgba(fg, 0.78);
  const out = [];
  let last = 0;
  line.replace(TOK, (m, com, s, kw, num, pun, idx) => {
    if (idx > last) out.push([line.slice(last, idx), fg]);
    out.push([m, com ? rgba(fg, 0.42) : s ? str : kw ? acc : num ? acc : rgba(fg, 0.55)]);
    last = idx + m.length;
    return m;
  });
  if (last < line.length) out.push([line.slice(last), fg]);
  return out;
}
function codeLayout(el, env) {
  const size = Uv(el.size ?? 30, env);
  const lines = el.lines || ['const agent = new Agent()', 'await agent.run("lead")'];
  const lh = size * 1.6;
  const head = el.header === false ? 0 : size * 2.2;
  const pad = size * 1.0;
  const w = Uv(el.w ?? 860, env);
  const h = el.h ? Uv(el.h, env) : head + pad * 2 + lines.length * lh;
  return { size, lines, lh, head, pad, w, h };
}
export const code = {
  measure(el, env) { const L = codeLayout(el, env); return { w: L.w, h: L.h, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = codeLayout(el, env);
    const { w, h, size, lh, head, pad } = L;
    const r = Uv(el.radius ?? 22, env);
    const pathFn = () => roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
    boxShadow(ctx, env, w, h, r, 1);
    pathFn();
    ctx.fillStyle = color(el.bg || '@window', th);
    ctx.fill();
    ctx.lineWidth = Math.max(1, 1.5 * env.U);
    ctx.strokeStyle = rgba(th.c.windowFg, 0.1);
    ctx.stroke();
    if (head) {
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => {
        ctx.beginPath(); ctx.arc(-w / 2 + pad * 0.9 + i * size * 0.85, -h / 2 + head / 2, size * 0.24, 0, TAU);
        ctx.fillStyle = el.mono ? rgba(th.c.windowFg, 0.25) : c; ctx.fill();
      });
      ctx.save();
      ctx.translate(0, -h / 2 + head / 2);
      drawText(ctx, { text: el.title ?? (el.mode === 'terminal' ? 'zsh — n8n' : 'agent.ts'), font: '@mono', size: (el.size ?? 30) * 0.72, weight: 400, w: 3000, color: rgba(th.c.windowFg, 0.5) }, env, time, dur, plain(tr));
      ctx.restore();
      ctx.fillStyle = rgba(th.c.windowFg, 0.07);
      ctx.fillRect(-w / 2, -h / 2 + head, w, Math.max(1, env.U * 1.5));
    }
    ctx.font = fontString('@mono', th, 400, size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const a = el.anim || {};
    const cps = el.cps ?? 40;
    const term = el.mode === 'terminal';
    const t0 = (a.start ?? 0) + (a.dur ?? 0.5) * 0.6;
    let budget = el.typing === false ? 1e9 : Math.max(0, (time - t0) * cps);
    const gutter = el.lineNumbers === false || term ? 0 : size * 2.2;
    let cursor = null;
    const x0 = -w / 2 + pad + gutter;
    for (let i = 0; i < L.lines.length; i++) {
      const line = L.lines[i];
      const y = -h / 2 + head + pad + lh * i + lh / 2;
      const isCmd = term && line.startsWith('$');
      let shown = line.length;
      if (!term || isCmd) {
        if (budget <= 0) break;
        shown = Math.min(line.length, Math.floor(budget));
        budget -= line.length + 4;
      } else {
        if (budget < 0) break;
        budget -= 8;
      }
      if (gutter) {
        ctx.fillStyle = rgba(th.c.windowFg, 0.25);
        ctx.fillText(String(i + 1).padStart(2, ' '), -w / 2 + pad * 0.7, y);
      }
      if (el.hiLine === i) {
        ctx.fillStyle = rgba(th.c.windowAccent, 0.09);
        ctx.fillRect(-w / 2, y - lh / 2, w, lh);
      }
      let x = x0;
      const parts = term
        ? isCmd ? [['$ ', th.c.windowAccent], [line.slice(2), th.c.windowFg]] : [[line, line.startsWith('✓') || line.startsWith('✔') ? th.c.windowAccent : rgba(th.c.windowFg, 0.62)]]
        : highlight(line, th);
      let left = shown;
      for (const [txt, c] of parts) {
        if (left <= 0) break;
        const s = txt.slice(0, left);
        left -= txt.length;
        ctx.fillStyle = c;
        ctx.fillText(s, x, y);
        x += ctx.measureText(s).width;
      }
      cursor = [x, y, shown < line.length];
    }
    if (cursor && el.cursor !== false) {
      const on = cursor[2] || time % 1 < 0.55;
      if (on) {
        ctx.fillStyle = th.c.windowAccent;
        ctx.fillRect(cursor[0] + size * 0.08, cursor[1] - size * 0.55, size * 0.52, size * 1.1);
      }
    }
  },
};

// ---------------------------------------------------------------- chat thread
function chatLayout(el, env) {
  const size = el.size ?? 34;
  const W = Uv(el.w ?? 820, env);
  const msgs = el.messages || [
    { me: false, text: 'مرحبا! شو بتشتغل؟' },
    { me: true, text: 'ببني أتمتة على *n8n* بتوفر ساعات شغل' },
  ];
  const maxW = (el.w ?? 820) * 0.74;
  const pad = Uv(size * 0.62, env);
  const ms = msgs.map((m) => textMetrics({ text: m.text, size, weight: 400, font: '@body', w: maxW - (size * 1.24), align: 'start', lineHeight: hasArabic(m.text) ? 1.5 : 1.35 }, env));
  const gap = Uv(el.gap ?? 22, env);
  const heights = ms.map((m) => m.H + pad * 2);
  const total = heights.reduce((a, b) => a + b, 0) + gap * (msgs.length - 1);
  const head = el.header ? Uv(130, env) : 0;
  const H = el.h ? Uv(el.h, env) : total + head;
  const rtl = hasArabic(msgs.map((m) => m.text).join(''));
  return { size, W, msgs, ms, pad, gap, heights, total, head, H, rtl };
}
export const chat = {
  measure(el, env) { const L = chatLayout(el, env); return { w: L.W, h: L.H, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = chatLayout(el, env);
    const a = el.anim || {};
    const iv = el.interval ?? 1.1;
    const t0 = a.start ?? 0;
    const appearAt = [];
    let tt = t0;
    L.msgs.forEach((m, i) => {
      if (!m.me && i > 0) tt += 0.75;
      appearAt.push(tt);
      tt += iv;
    });
    if (el.frame) {
      const r = Uv(30, env);
      const pathFn = () => roundRectPath(ctx, -L.W / 2 - Uv(30, env), -L.H / 2 - Uv(30, env), L.W + Uv(60, env), L.H + Uv(60, env), r);
      boxShadow(ctx, env, L.W + Uv(60, env), L.H + Uv(60, env), r, 0.8);
      glass(ctx, env, pathFn, L.W, L.H, { blur: 18 });
    }
    if (L.head) {
      const y = -L.H / 2 + L.head / 2 - Uv(10, env);
      const ax = L.rtl ? L.W / 2 - Uv(45, env) : -L.W / 2 + Uv(45, env);
      ctx.beginPath(); ctx.arc(ax, y, Uv(42, env), 0, TAU);
      ctx.fillStyle = color('@accent', th); ctx.fill();
      ctx.save(); ctx.translate(ax, y);
      drawText(ctx, { text: (el.header.name || 'N').slice(0, 1), size: 40, weight: 800, color: '@ink', w: 200 }, env, time, dur, plain(tr));
      ctx.restore();
      const nx = L.rtl ? ax - Uv(70, env) : ax + Uv(70, env);
      const nm = textMetrics({ text: el.header.name || 'Nour', size: 34, weight: 700, font: '@body', w: 3000 }, env);
      ctx.save(); ctx.translate(nx + (L.rtl ? -nm.tightW / 2 : nm.tightW / 2), y - Uv(18, env));
      drawText(ctx, { text: el.header.name || 'Nour', size: 34, weight: 700, font: '@body', w: 3000, color: '@fg' }, env, time, dur, plain(tr));
      ctx.restore();
      const st = el.header.status || 'online';
      const sm = textMetrics({ text: st, size: 24, weight: 400, font: '@mono', w: 3000 }, env);
      ctx.save(); ctx.translate(nx + (L.rtl ? -sm.tightW / 2 : sm.tightW / 2), y + Uv(22, env));
      drawText(ctx, { text: st, size: 24, weight: 400, font: '@mono', w: 3000, color: '@accent' }, env, time, dur, plain(tr));
      ctx.restore();
      ctx.fillStyle = color('@fg/0.1', th);
      ctx.fillRect(-L.W / 2, -L.H / 2 + L.head - Uv(20, env), L.W, Math.max(1, Uv(2, env)));
    }
    // scroll so the newest bubble stays in view
    let visibleBottom = 0, acc = 0;
    L.msgs.forEach((m, i) => {
      const p = clamp((time - appearAt[i]) / 0.45);
      if (p > 0) visibleBottom = acc + L.heights[i] * ease('expoOut', p);
      acc += L.heights[i] + L.gap;
    });
    const area = L.H - L.head;
    const scroll = Math.max(0, visibleBottom - area);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-L.W / 2 - Uv(40, env), -L.H / 2 + L.head - Uv(10, env), L.W + Uv(80, env), area + Uv(20, env));
    ctx.clip();
    let y = -L.H / 2 + L.head - scroll;
    L.msgs.forEach((m, i) => {
      const bh = L.heights[i];
      const mm = L.ms[i];
      const bw = mm.tightW + L.pad * 2;
      const mine = !!m.me;
      const onRight = L.rtl ? !mine : mine;
      const x = onRight ? L.W / 2 - bw / 2 : -L.W / 2 + bw / 2;
      const p = clamp((time - appearAt[i]) / 0.45);
      // typing dots before an incoming message
      if (!mine && i > 0 && time > appearAt[i] - 0.75 && p <= 0) {
        const dw = Uv(130, env), dh = Uv(70, env);
        const dx = onRight ? L.W / 2 - dw / 2 : -L.W / 2 + dw / 2;
        roundRectPath(ctx, dx - dw / 2, y, dw, dh, dh / 2);
        ctx.fillStyle = color(el.themColor || (th.dark ? '@raised' : '@fg/0.08'), th); ctx.fill();
        for (let k = 0; k < 3; k++) {
          const b = Math.sin(time * 9 - k * 0.9) * 0.5 + 0.5;
          ctx.beginPath(); ctx.arc(dx - Uv(30, env) + k * Uv(30, env), y + dh / 2 - b * Uv(8, env), Uv(8, env), 0, TAU);
          ctx.fillStyle = color('@muted', th); ctx.fill();
        }
      }
      if (p > 0) {
        const e = ease('backOutSoft', p);
        ctx.save();
        const ox = onRight ? x + bw / 2 : x - bw / 2;
        ctx.translate(ox, y + bh);
        ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e);
        ctx.translate(-ox, -(y + bh));
        ctx.globalAlpha *= clamp(p * 2.5);
        const r = Uv(L.size * 0.9, env);
        roundRectPath(ctx, x - bw / 2, y, bw, bh, r);
        ctx.fillStyle = mine ? color(el.meColor || '@accent', th) : color(el.themColor || (th.dark ? '@raised' : '@fg/0.08'), th);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y + bh / 2);
        drawText(ctx, { text: m.text, size: L.size, weight: 400, font: '@body', w: mm.tightW / env.U + 1, align: 'start', lineHeight: hasArabic(m.text) ? 1.5 : 1.35, color: mine ? el.meText || '@ink' : '@fg', accentColor: mine ? '@ink' : '@accent' }, env, time, dur, plain(tr));
        ctx.restore();
        ctx.restore();
      }
      y += bh + L.gap;
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------- notification card
function notifyLayout(el, env) {
  const W = Uv(el.w ?? 860, env);
  const iconS = Uv(110, env);
  const pad = Uv(34, env);
  const tw = (el.w ?? 860) - 110 - 34 * 3;
  const title = textMetrics({ text: el.title ?? 'Lead جديد وصل', size: 38, weight: 700, font: '@body', w: tw, align: 'start' }, env);
  const body = textMetrics({ text: el.body ?? 'الـ workflow رد عليه تلقائياً خلال 4 ثواني', size: 30, weight: 400, font: '@body', w: tw, align: 'start' }, env);
  const top = Uv(40, env);
  const H = pad * 2 + top + title.H + body.H;
  return { W, iconS, pad, tw, title, body, top, H, rtl: hasArabic((el.title ?? 'ل') + (el.body ?? '')) };
}
export const notify = {
  measure(el, env) { const L = notifyLayout(el, env); return { w: L.W, h: L.H, bx: 0, by: 0 }; },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const L = notifyLayout(el, env);
    const r = Uv(40, env);
    const pathFn = () => roundRectPath(ctx, -L.W / 2, -L.H / 2, L.W, L.H, r);
    boxShadow(ctx, env, L.W, L.H, r, 1);
    glass(ctx, env, pathFn, L.W, L.H, { blur: 24 });
    const ix = L.rtl ? L.W / 2 - L.pad - L.iconS / 2 : -L.W / 2 + L.pad + L.iconS / 2;
    const iy = -L.H / 2 + L.pad + L.iconS / 2;
    roundRectPath(ctx, ix - L.iconS / 2, iy - L.iconS / 2, L.iconS, L.iconS, L.iconS * 0.26);
    ctx.fillStyle = color(el.iconBg || '@accent', th); ctx.fill();
    ctx.save(); ctx.translate(ix, iy);
    drawIcon(ctx, el.icon || 'bolt', L.iconS * 0.5, color('@ink', th), { strokeW: 2.2 });
    ctx.restore();
    const tx = L.rtl ? ix - L.iconS / 2 - L.pad - (L.tw * env.U) / 2 : ix + L.iconS / 2 + L.pad + (L.tw * env.U) / 2;
    let y = -L.H / 2 + L.pad + L.top / 2;
    const appTxt = (el.app ?? 'n8n').toUpperCase() + '  ·  ' + (el.time ?? 'now');
    ctx.save(); ctx.translate(tx, y);
    drawText(ctx, { text: appTxt, size: 24, weight: 600, font: '@mono', w: L.tw, align: L.rtl ? 'right' : 'left', color: '@muted' }, env, time, dur, plain(tr));
    ctx.restore();
    y += L.top / 2 + L.title.H / 2;
    ctx.save(); ctx.translate(tx, y);
    drawText(ctx, { text: el.title ?? 'Lead جديد وصل', size: 38, weight: 700, font: '@body', w: L.tw, align: 'start', color: '@fg' }, env, time, dur, plain(tr));
    ctx.restore();
    y += L.title.H / 2 + L.body.H / 2;
    ctx.save(); ctx.translate(tx, y);
    drawText(ctx, { text: el.body ?? 'الـ workflow رد عليه تلقائياً خلال 4 ثواني', size: 30, weight: 400, font: '@body', w: L.tw, align: 'start', color: '@muted' }, env, time, dur, plain(tr));
    ctx.restore();
  },
};

// ---------------------------------------------------------------- device mockups
function skeleton(ctx, env, w, h, time, start, th) {
  const pad = w * 0.07;
  const items = [
    { y: 0.04, h: 0.07, k: 'bar' },
    { y: 0.15, h: 0.26, k: 'hero' },
    { y: 0.45, h: 0.14, k: 'card' },
    { y: 0.62, h: 0.14, k: 'card' },
    { y: 0.79, h: 0.14, k: 'card' },
  ];
  items.forEach((it, i) => {
    const q = ease('expoOut', clamp((time - start - 0.25 - i * 0.12) / 0.7));
    if (q <= 0) return;
    ctx.save();
    ctx.globalAlpha *= q;
    ctx.translate(0, (1 - q) * h * 0.06);
    const x = -w / 2 + pad, y = -h / 2 + it.y * h, ww = w - pad * 2, hh = it.h * h;
    if (it.k === 'bar') {
      ctx.fillStyle = rgba(th.c.fg, 0.14);
      roundRectPath(ctx, x, y + hh * 0.3, ww * 0.35, hh * 0.4, hh * 0.2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + ww - hh * 0.35, y + hh / 2, hh * 0.35, 0, TAU); ctx.fillStyle = th.c.accent; ctx.fill();
    } else if (it.k === 'hero') {
      const g = ctx.createLinearGradient(x, y, x + ww, y + hh);
      g.addColorStop(0, rgba(th.c.accent, 0.85)); g.addColorStop(1, rgba(th.c.secondary, 0.7));
      ctx.fillStyle = g; roundRectPath(ctx, x, y, ww, hh, w * 0.05); ctx.fill();
      ctx.fillStyle = rgba(th.c.ink, 0.55);
      roundRectPath(ctx, x + ww * 0.08, y + hh * 0.6, ww * 0.5, hh * 0.1, hh * 0.05); ctx.fill();
      roundRectPath(ctx, x + ww * 0.08, y + hh * 0.76, ww * 0.32, hh * 0.08, hh * 0.04); ctx.fill();
    } else {
      ctx.fillStyle = rgba(th.c.fg, 0.07); roundRectPath(ctx, x, y, ww, hh, w * 0.04); ctx.fill();
      ctx.beginPath(); ctx.arc(x + hh * 0.5, y + hh / 2, hh * 0.28, 0, TAU); ctx.fillStyle = rgba(th.c.accent, 0.9 - i * 0.12); ctx.fill();
      ctx.fillStyle = rgba(th.c.fg, 0.22); roundRectPath(ctx, x + hh, y + hh * 0.3, ww * 0.5, hh * 0.15, hh * 0.08); ctx.fill();
      ctx.fillStyle = rgba(th.c.fg, 0.12); roundRectPath(ctx, x + hh, y + hh * 0.58, ww * 0.34, hh * 0.13, hh * 0.07); ctx.fill();
    }
    ctx.restore();
  });
}
function screenContent(ctx, el, env, w, h, time, dur, th) {
  const img = el.src && env.images ? env.images.get(el.src) : null;
  ctx.fillStyle = color(el.screen || '@bg', th);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (img && (img.naturalWidth || img.width)) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = w / iw;
    const dh = ih * s;
    const a = el.anim || {};
    const sc = el.scroll ? clamp((time - (a.start ?? 0) - 0.8) / Math.max(1, dur - 1.6)) : 0;
    const off = dh > h ? (dh - h) * ease('cubicInOut', sc) : 0;
    if (dh >= h) ctx.drawImage(img, -w / 2, -h / 2 - off, w, dh);
    else { const s2 = Math.max(w / iw, h / ih); ctx.drawImage(img, -iw * s2 / 2, -ih * s2 / 2, iw * s2, ih * s2); }
  } else skeleton(ctx, env, w, h, time, (el.anim || {}).start ?? 0, th);
}
export const device = {
  measure(el, env) {
    const k = el.kind || 'phone';
    const w = Uv(el.w ?? (k === 'phone' ? 420 : 900), env);
    const h = Uv(el.h ?? (k === 'phone' ? 860 : 600), env);
    return { w, h, bx: 0, by: 0 };
  },
  draw(ctx, el, env, time, dur, tr) {
    const th = env.theme;
    const k = el.kind || 'phone';
    const { w, h } = device.measure(el, env);
    if (k === 'phone') {
      const r = w * 0.16;
      const bez = w * 0.04;
      const pathFn = () => roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
      boxShadow(ctx, env, w, h, r, 1.2);
      pathFn();
      ctx.fillStyle = el.frameColor ? color(el.frameColor, th) : '#0B0D10';
      ctx.fill();
      ctx.lineWidth = Math.max(1, env.U * 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.stroke();
      ctx.save();
      roundRectPath(ctx, -w / 2 + bez, -h / 2 + bez, w - bez * 2, h - bez * 2, r - bez);
      ctx.clip();
      screenContent(ctx, el, env, w - bez * 2, h - bez * 2, time, dur, th);
      ctx.restore();
      roundRectPath(ctx, -w * 0.15, -h / 2 + bez * 1.6, w * 0.3, w * 0.075, w * 0.0375);
      ctx.fillStyle = '#0B0D10'; ctx.fill();
    } else {
      const r = Uv(24, env);
      const bar = Uv(64, env);
      const pathFn = () => roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
      boxShadow(ctx, env, w, h, r, 1.1);
      pathFn();
      ctx.fillStyle = color('@card', th);
      ctx.fill();
      ctx.save();
      pathFn(); ctx.clip();
      ctx.fillStyle = color('@raised', th);
      ctx.fillRect(-w / 2, -h / 2, w, bar);
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => {
        ctx.beginPath(); ctx.arc(-w / 2 + Uv(34 + i * 30, env), -h / 2 + bar / 2, Uv(9, env), 0, TAU);
        ctx.fillStyle = c; ctx.fill();
      });
      const uw = w * 0.5;
      roundRectPath(ctx, -uw / 2, -h / 2 + bar * 0.22, uw, bar * 0.56, bar * 0.28);
      ctx.fillStyle = color('@bg', th); ctx.fill();
      ctx.save(); ctx.translate(0, -h / 2 + bar / 2);
      drawText(ctx, { text: el.url ?? 'nouraldeentofi.com', font: '@mono', size: 22, weight: 400, w: uw / env.U, color: '@muted' }, env, time, dur, plain(tr));
      ctx.restore();
      ctx.translate(0, bar / 2);
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2 + bar / 2, w, h - bar); ctx.clip();
      screenContent(ctx, el, env, w, h - bar, time, dur, th);
      ctx.restore();
    }
  },
};
