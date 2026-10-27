// Transition families. Each draws the composite of outgoing A and incoming B
// at eased progress e (raw progress p). Presets pick a family + params.
import { TAU, clamp, ease, sr, noise2, parseColor, rgba } from './util.js';
import { color } from './themes.js';
import { buf, dirVec, drawAt, blurred, shapePath, SHAPE_REACH, maskReveal, FIELDS, linearField, fakeShadow } from './tr-kit.js';

const fill = (ctx, c, cw, ch) => { ctx.fillStyle = c; ctx.fillRect(0, 0, cw, ch); };
const bgOf = (k) => color('@bg', k.env.theme);
const col = (k, spec) => color(spec || '@accent', k.env.theme);

export const F = {};

// ---------------------------------------------------------------- basic
F.cut = ({ ctx, A, B, p }) => ctx.drawImage(p < 0.5 ? A : B, 0, 0);

F.fade = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  switch (P.mode) {
    case 'light':
      fill(ctx, '#000', cw, ch);
      ctx.globalCompositeOperation = 'lighter';
      drawAt(ctx, A, 0, 0, 1, 0, 1 - e, cw, ch);
      drawAt(ctx, B, 0, 0, 1, 0, e, cw, ch);
      drawAt(ctx, e < 0.5 ? A : B, 0, 0, 1, 0, Math.sin(e * Math.PI) * 0.45, cw, ch);
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'depth':
      fill(ctx, bgOf(k), cw, ch);
      drawAt(ctx, A, 0, 0, 1 - 0.07 * e, 0, 1, cw, ch);
      drawAt(ctx, B, 0, 0, 1.07 - 0.07 * e, 0, e, cw, ch);
      break;
    case 'rise': case 'sink': case 'scaleIn': case 'scaleOut': {
      ctx.drawImage(A, 0, 0);
      const sgn = P.mode === 'rise' ? 1 : -1;
      if (P.mode === 'rise' || P.mode === 'sink') drawAt(ctx, B, 0, sgn * (1 - e) * ch * 0.06, 1, 0, e, cw, ch);
      else drawAt(ctx, B, 0, 0, P.mode === 'scaleIn' ? 0.9 + 0.1 * e : 1.15 - 0.15 * e, 0, e, cw, ch);
      break;
    }
    default:
      ctx.drawImage(A, 0, 0);
      ctx.globalAlpha = e;
      ctx.drawImage(B, 0, 0);
  }
};

F.blur = (k) => {
  const { ctx, A, B, e, p, P, env, cw, ch } = k;
  const b = Math.sin(p * Math.PI) * (P.amount ?? 30) * env.U * env.px;
  ctx.drawImage(blurred(A, b, 'a'), 0, 0, cw, ch);
  ctx.globalAlpha = e;
  ctx.drawImage(blurred(B, b, 'b'), 0, 0, cw, ch);
};

F.dip = (k) => {
  const { ctx, A, B, p, P, cw, ch } = k;
  const hold = P.hold ?? 0.12;
  const c = col(k, P.color || '#000');
  const a = (1 - hold) / 2;
  if (p < a) { ctx.drawImage(A, 0, 0); ctx.globalAlpha = ease('cubicIn', p / a); fill(ctx, c, cw, ch); }
  else if (p < a + hold) fill(ctx, c, cw, ch);
  else { ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1 - ease('cubicOut', (p - a - hold) / a); fill(ctx, c, cw, ch); }
};

// ---------------------------------------------------------------- slide family
function vec(k) { const [x, y] = dirVec(k.P.dir); return [x, y]; }
F.push = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const [dx, dy] = vec(k);
  const mx = Math.abs(dx) > 0.1 && Math.abs(dy) > 0.1 ? 1.42 : 1;
  fill(ctx, bgOf(k), cw, ch);
  const sc = P.scale ? 1 - P.scale * Math.sin(e * Math.PI) : 1;
  const gap = P.scale ? 1.06 : 1;
  drawAt(ctx, A, dx * cw * e * mx * gap, dy * ch * e * mx * gap, sc, 0, 1, cw, ch);
  drawAt(ctx, B, -dx * cw * (1 - e) * mx * gap, -dy * ch * (1 - e) * mx * gap, sc, 0, 1, cw, ch);
};
F.cover = (k) => {
  const { ctx, A, B, e, cw, ch, env } = k;
  const [dx, dy] = vec(k);
  const mx = Math.abs(dx) > 0.1 && Math.abs(dy) > 0.1 ? 1.42 : 1;
  drawAt(ctx, A, dx * cw * e * 0.25, dy * ch * e * 0.25, 1 - 0.05 * e, 0, 1, cw, ch);
  ctx.fillStyle = `rgba(0,0,0,${0.5 * e})`;
  ctx.fillRect(0, 0, cw, ch);
  const bx = -dx * cw * (1 - e) * mx, by = -dy * ch * (1 - e) * mx;
  fakeShadow(ctx, bx, by, cw, ch, 40 * env.px, 0.45);
  drawAt(ctx, B, bx, by, 1, 0, 1, cw, ch);
};
F.uncover = (k) => {
  const { ctx, A, B, e, cw, ch, env } = k;
  const [dx, dy] = vec(k);
  const mx = Math.abs(dx) > 0.1 && Math.abs(dy) > 0.1 ? 1.42 : 1;
  drawAt(ctx, B, -dx * cw * (1 - e) * 0.25, -dy * ch * (1 - e) * 0.25, 1.05 - 0.05 * e, 0, 1, cw, ch);
  ctx.fillStyle = `rgba(0,0,0,${0.5 * (1 - e)})`;
  ctx.fillRect(0, 0, cw, ch);
  const ax = dx * cw * e * mx, ay = dy * ch * e * mx;
  fakeShadow(ctx, ax, ay, cw, ch, 40 * env.px, 0.45);
  drawAt(ctx, A, ax, ay, 1, 0, 1, cw, ch);
};
F.whip = (k) => {
  const { ctx, A, B, p, cw, ch } = k;
  const [dx, dy] = vec(k);
  const copies = 3;
  const img = p < 0.5 ? A : B;
  const D = Math.abs(dx) > Math.abs(dy) ? cw : ch;
  const off = p < 0.5 ? ease('expoIn', p * 2) * D * 1.1 : -(1 - ease('expoOut', (p - 0.5) * 2)) * D * 1.1;
  const spread = Math.sin(p * Math.PI) * D * 0.12;
  if (p >= 0.5) ctx.drawImage(B, 0, 0);
  else fill(ctx, bgOf(k), cw, ch);
  for (let i = 0; i < copies; i++) {
    const f = i / (copies - 1) - 0.5;
    drawAt(ctx, img, dx * (off + f * spread), dy * (off + f * spread), 1, 0, (p < 0.5 ? 1 : 0.5) / (1 + Math.abs(f) * 4), cw, ch);
  }
};
F.stack = (k) => {
  const { ctx, A, B, e, cw, ch, env } = k;
  const [dx, dy] = vec(k);
  drawAt(ctx, A, 0, 0, 1 - 0.08 * e, 0, 1, cw, ch);
  ctx.fillStyle = `rgba(0,0,0,${0.55 * e})`;
  ctx.fillRect(0, 0, cw, ch);
  const s = 0.9 + 0.1 * ease('cubicIn', e);
  const x = -dx * cw * (1 - e) * 1.05, y = -dy * ch * (1 - e) * 1.05;
  const r = Math.min(cw, ch) * 0.06 * (1 - e);
  ctx.save();
  ctx.translate(cw / 2 + x, ch / 2 + y);
  ctx.scale(s, s);
  fakeShadow(ctx, -cw / 2, -ch / 2, cw, ch, 36 * env.px, 0.4);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-cw / 2, -ch / 2, cw, ch, r); else ctx.rect(-cw / 2, -ch / 2, cw, ch);
  ctx.clip();
  ctx.drawImage(B, -cw / 2, -ch / 2);
  ctx.restore();
};
F.carousel = (k) => {
  const { ctx, A, B, e, cw, ch } = k;
  const s = P_sign(k);
  fill(ctx, '#000', cw, ch);
  const sa = 1 - 0.25 * e, sb = 0.75 + 0.25 * e;
  drawAt(ctx, A, -s * cw * 0.62 * e, 0, sa, 0, 1 - 0.6 * e, cw, ch, sa * (1 - 0.1 * e));
  drawAt(ctx, B, s * cw * 0.62 * (1 - e), 0, sb, 0, 0.4 + 0.6 * e, cw, ch, sb * (0.9 + 0.1 * e));
};
const P_sign = (k) => (k.P.dir === 'right' ? -1 : 1);
F.tilt = (k) => {
  const { ctx, A, B, e, p, cw, ch } = k;
  fill(ctx, bgOf(k), cw, ch);
  if (p < 0.5) {
    const q = ease('cubicIn', p * 2);
    drawAt(ctx, A, 0, q * ch * 1.1, 1 - 0.1 * q, q * 0.35 * P_sign(k), 1, cw, ch);
  } else {
    const q = ease('backOut', (p - 0.5) * 2);
    drawAt(ctx, B, 0, -(1 - q) * ch * 1.1, 0.9 + 0.1 * q, -(1 - q) * 0.35 * P_sign(k), 1, cw, ch);
  }
  void e;
};

// ---------------------------------------------------------------- zoom family
F.zoom = (k) => {
  const { ctx, A, B, e, p, P, env, cw, ch } = k;
  const ox = (P.ox ?? 0.5) - 0.5, oy = (P.oy ?? 0.5) - 0.5;
  const bl = env.U * env.px;
  switch (P.mode) {
    case 'through':
      if (p < 0.5) { const q = ease('expoIn', p * 2); drawAt(ctx, blurred(A, q * 24 * bl), -ox * cw * q * 2, -oy * ch * q * 2, 1 + q * 3, 0, 1, cw, ch); }
      else { const q = ease('expoOut', (p - 0.5) * 2); drawAt(ctx, blurred(B, (1 - q) * 24 * bl), 0, 0, 1.8 - 0.8 * q, 0, 1, cw, ch); }
      break;
    case 'in':
      fill(ctx, bgOf(k), cw, ch);
      drawAt(ctx, blurred(B, (1 - e) * 10 * bl, 'b'), 0, 0, 0.6 + 0.4 * e, 0, 1, cw, ch);
      drawAt(ctx, blurred(A, e * 18 * bl, 'a'), -ox * cw * e, -oy * ch * e, 1 + e * 1.8, (P.rot ?? 0) * e, 1 - e, cw, ch);
      break;
    case 'out':
      drawAt(ctx, blurred(B, (1 - e) * 16 * bl, 'b'), 0, 0, 1.5 - 0.5 * e, -(P.rot ?? 0) * (1 - e), 1, cw, ch);
      drawAt(ctx, A, -ox * cw * e, -oy * ch * e, 1 - 0.85 * e, (P.rot ?? 0) * e, 1 - ease('cubicIn', e), cw, ch);
      break;
    case 'blur': {
      // radial streak: stacked scaled copies
      const img = p < 0.5 ? A : B;
      const amt = Math.sin(p * Math.PI);
      ctx.drawImage(img, 0, 0);
      for (let i = 1; i <= 3; i++) drawAt(ctx, img, 0, 0, 1 + amt * 0.09 * i, 0, 0.32 * amt, cw, ch);
      break;
    }
    case 'punch': {
      ctx.drawImage(A, 0, 0);
      const q = ease('expoOut', e);
      drawAt(ctx, B, 0, 0, 1.35 - 0.35 * q, 0, clamp(e * 3), cw, ch);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * Math.max(0, 1 - e * 3)})`;
      if (e > 0.02) ctx.fillRect(0, 0, cw, ch);
      break;
    }
    default: // cross
      drawAt(ctx, blurred(A, e * 16 * bl, 'a'), 0, 0, 1 + e * 0.5, (P.rot ?? 0) * e, 1 - e, cw, ch);
      drawAt(ctx, blurred(B, (1 - e) * 16 * bl, 'b'), 0, 0, 0.75 + e * 0.25, -(P.rot ?? 0) * (1 - e), e, cw, ch);
  }
};
F.spin = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const turns = (P.turns ?? 0.2) * TAU * (P.cw === false ? -1 : 1);
  fill(ctx, bgOf(k), cw, ch);
  if (P.mode === 'flat') {
    drawAt(ctx, A, 0, 0, 1 + 0.3 * Math.sin(e * Math.PI) * 0, turns * e, 1 - e, cw, ch);
    drawAt(ctx, B, 0, 0, 1, -turns * (1 - e), e, cw, ch);
    return;
  }
  drawAt(ctx, A, 0, 0, 1 - e * 0.8, turns * e, 1 - e, cw, ch);
  drawAt(ctx, B, 0, 0, 0.2 + e * 0.8, -turns * (1 - e), e, cw, ch);
};

// ---------------------------------------------------------------- shapes
F.shape = (k) => {
  const { ctx, A, B, e, p, P, env, cw, ch } = k;
  const cx = cw * (P.ox ?? 0.5), cy = ch * (P.oy ?? 0.5);
  const far = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy));
  const R = far * (SHAPE_REACH[P.shape] || 1.1) * (P.reach ?? 1);
  const rot = (P.spin ?? 0) * (P.close ? 1 - e : e);
  if (P.close) {
    ctx.drawImage(B, 0, 0);
    const r = R * (1 - e);
    if (r > 0.5) {
      ctx.save();
      ctx.beginPath();
      shapePath(ctx, P.shape, cx, cy, r, rot, p);
      ctx.clip();
      drawAt(ctx, A, 0, 0, 1 - 0.08 * e, 0, 1, cw, ch);
      ctx.restore();
    }
  } else {
    ctx.drawImage(A, 0, 0);
    const r = R * e;
    ctx.save();
    ctx.beginPath();
    shapePath(ctx, P.shape, cx, cy, r, rot, p);
    if (P.shape === 'ring') {
      const inner = r * 0.62 * (1 - e);
      ctx.moveTo(cx + inner, cy);
      ctx.arc(cx, cy, inner, 0, TAU, true);
    }
    ctx.clip();
    drawAt(ctx, B, 0, 0, 1.08 - 0.08 * e, 0, 1, cw, ch);
    ctx.restore();
  }
  if (P.stroke && e > 0 && e < 1) {
    ctx.strokeStyle = col(k, P.color);
    ctx.lineWidth = 7 * env.U * env.px * (1 - Math.abs(e - 0.5));
    ctx.beginPath();
    shapePath(ctx, P.shape, cx, cy, (P.close ? R * (1 - e) : R * e), rot, p);
    ctx.stroke();
  }
};
F.bubbles = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const n = P.n ?? 18;
  ctx.drawImage(A, 0, 0);
  ctx.save();
  ctx.beginPath();
  const base = Math.hypot(cw, ch) * (P.size ?? 0.22);
  for (let i = 0; i < n; i++) {
    const x = sr(i * 3.7 + 1) * cw, y = sr(i * 9.1 + 2) * ch;
    const d = sr(i * 5.3 + 3) * 0.55;
    const q = ease('cubicOut', clamp((e - d) / 0.45));
    if (q <= 0) continue;
    shapePath(ctx, P.shape || 'circle', x, y, base * (0.6 + sr(i * 2.2) * 0.8) * q, sr(i) * TAU * (P.shape === 'circle' ? 0 : 1));
  }
  ctx.clip();
  ctx.drawImage(B, 0, 0);
  ctx.restore();
  if (e > 0.9) { ctx.globalAlpha = (e - 0.9) / 0.1; ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; }
};

// ---------------------------------------------------------------- wipes
F.wipe = (k) => {
  const { ctx, A, B, e, P, env, cw, ch } = k;
  const ang = ((P.angle ?? 0) * Math.PI) / 180;
  const L = Math.abs(cw * Math.cos(ang)) + Math.abs(ch * Math.sin(ang));
  const H = Math.hypot(cw, ch) * 1.5;
  const x = -L / 2 + L * e;
  ctx.drawImage(A, 0, 0);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.rect(-H, -H, H + x, H * 2);
  ctx.rotate(-ang);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.clip();
  ctx.drawImage(B, 0, 0);
  ctx.restore();
  if (P.edge && e > 0 && e < 1) {
    const ac = col(k, P.color);
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(ang);
    const lw = 8 * env.U * env.px;
    if (P.edge === 'glow') {
      const g = ctx.createLinearGradient(x - lw * 8, 0, x + lw * 2, 0);
      g.addColorStop(0, rgba(ac, 0));
      g.addColorStop(0.8, rgba(ac, 0.55));
      g.addColorStop(1, rgba('#fff', 0.95));
      ctx.fillStyle = g;
      ctx.fillRect(x - lw * 8, -H, lw * 10, H * 2);
    } else {
      ctx.fillStyle = ac;
      ctx.fillRect(x - lw / 2, -H, lw, H * 2);
      if (P.edge === 'double') { ctx.fillStyle = col(k, '@secondary'); ctx.fillRect(x - lw * 2.4, -H, lw * 0.8, H * 2); }
    }
    ctx.restore();
  }
};
F.softwipe = (k) => maskReveal(k.ctx, k.A, k.B, 'lin' + (k.P.angle ?? 0), linearField(k.P.angle ?? 0), k.e, { soft: k.P.soft ?? 0.12, res: 90 });
F.clock = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const cx = cw * (P.ox ?? 0.5), cy = ch * (P.oy ?? 0.5);
  const R = Math.hypot(cw, ch) * 1.2;
  const n = P.n ?? 1;
  const span = (P.span ?? TAU) / n;
  const a0 = ((P.start ?? -90) * Math.PI) / 180;
  const sg = P.ccw ? -1 : 1;
  ctx.drawImage(A, 0, 0);
  if (e <= 0) return;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const s = a0 + sg * i * span;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, s, s + sg * span * e, sg < 0);
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(B, 0, 0);
  ctx.restore();
};
F.iris = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const open = P.mode !== 'close';
  const q = open ? e : 1 - e;
  const w = cw * q * 1.02, hh = ch * q * 1.02;
  const r = Math.min(w, hh) * (P.round ?? 0);
  ctx.drawImage(open ? A : B, 0, 0);
  if (q <= 0) return;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cw / 2 - w / 2, ch / 2 - hh / 2, w, hh, r); else ctx.rect(cw / 2 - w / 2, ch / 2 - hh / 2, w, hh);
  ctx.clip();
  drawAt(ctx, open ? B : A, 0, 0, open ? 1.06 - 0.06 * e : 1 - 0.06 * e, 0, 1, cw, ch);
  ctx.restore();
};
F.barn = (k) => {
  const { ctx, A, B, e, P, env, cw, ch } = k;
  const vert = P.axis === 'v';
  ctx.drawImage(A, 0, 0);
  ctx.save();
  ctx.beginPath();
  if (vert) ctx.rect(cw / 2 - (cw / 2) * e, 0, cw * e, ch); else ctx.rect(0, ch / 2 - (ch / 2) * e, cw, ch * e);
  ctx.clip();
  ctx.drawImage(B, 0, 0);
  ctx.restore();
  if (P.edge && e > 0 && e < 1) {
    ctx.fillStyle = col(k, P.color);
    const lw = 6 * env.U * env.px;
    if (vert) { ctx.fillRect(cw / 2 - (cw / 2) * e - lw / 2, 0, lw, ch); ctx.fillRect(cw / 2 + (cw / 2) * e - lw / 2, 0, lw, ch); }
    else { ctx.fillRect(0, ch / 2 - (ch / 2) * e - lw / 2, cw, lw); ctx.fillRect(0, ch / 2 + (ch / 2) * e - lw / 2, cw, lw); }
  }
};
F.doors = (k) => {
  // outgoing frame splits into pieces that slide apart (each piece carries its own clip)
  const { ctx, A, B, e, P, env, cw, ch } = k;
  drawAt(ctx, B, 0, 0, 1.1 - 0.1 * e, 0, 1, cw, ch);
  const lw = 7 * env.U * env.px;
  const piece = (pathFn, ox, oy) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.beginPath();
    pathFn();
    ctx.clip();
    ctx.drawImage(A, 0, 0);
    ctx.restore();
  };
  if (P.diag) {
    const off = e * Math.hypot(cw, ch) * 0.62;
    piece(() => { ctx.moveTo(0, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, ch); ctx.closePath(); }, off * 0.7071, -off * 0.7071);
    piece(() => { ctx.moveTo(0, 0); ctx.lineTo(0, ch); ctx.lineTo(cw, ch); ctx.closePath(); }, -off * 0.7071, off * 0.7071);
    return;
  }
  if ((P.parts ?? 2) === 4) {
    const ox = e * cw * 0.55, oy = e * ch * 0.55;
    [[0, 0, -1, -1], [1, 0, 1, -1], [0, 1, -1, 1], [1, 1, 1, 1]].forEach(([i, j, sx, sy]) => piece(() => ctx.rect(i * cw / 2, j * ch / 2, cw / 2, ch / 2), sx * ox, sy * oy));
    return;
  }
  ctx.fillStyle = col(k, P.color);
  if (P.axis === 'h') {
    const off = e * ch * 0.55;
    piece(() => ctx.rect(0, 0, cw, ch / 2), 0, -off);
    piece(() => ctx.rect(0, ch / 2, cw, ch / 2), 0, off);
    if (P.edge !== false && e > 0.01 && e < 0.99) { ctx.fillRect(0, ch / 2 - off - lw / 2, cw, lw); ctx.fillRect(0, ch / 2 + off - lw / 2, cw, lw); }
  } else {
    const off = e * cw * 0.55;
    piece(() => ctx.rect(0, 0, cw / 2, ch), -off, 0);
    piece(() => ctx.rect(cw / 2, 0, cw / 2, ch), off, 0);
    if (P.edge !== false && e > 0.01 && e < 0.99) { ctx.fillRect(cw / 2 - off - lw / 2, 0, lw, ch); ctx.fillRect(cw / 2 + off - lw / 2, 0, lw, ch); }
  }
};
F.curtain = (k) => {
  // incoming frame closes in from both sides
  const { ctx, A, B, e, P, env, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * e})`;
  ctx.fillRect(0, 0, cw, ch);
  const vert = P.axis !== 'h';
  ctx.save();
  if (vert) {
    const w = (cw / 2) * e;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, ch); ctx.clip(); ctx.drawImage(B, -(cw / 2 - w), 0); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(cw - w, 0, w, ch); ctx.clip(); ctx.drawImage(B, cw / 2 - w, 0); ctx.restore();
  } else {
    const hh = (ch / 2) * e;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, hh); ctx.clip(); ctx.drawImage(B, 0, -(ch / 2 - hh)); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, ch - hh, cw, hh); ctx.clip(); ctx.drawImage(B, 0, ch / 2 - hh); ctx.restore();
  }
  ctx.restore();
};

// ---------------------------------------------------------------- strips
F.blinds = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const n = P.n ?? 8;
  const ang = P.orient === 'v' ? Math.PI / 2 : P.orient === 'd' ? -0.62 : 0;
  const span = P.orient === 'd' ? Math.hypot(cw, ch) : P.orient === 'v' ? cw : ch;
  const len = Math.hypot(cw, ch) * 1.5;
  const sh = span / n;
  const st = P.stagger ?? 0.6;
  ctx.drawImage(A, 0, 0);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(ang);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const order = P.mode === 'alt' ? (i % 2) * 0.5 : P.mode === 'center' ? Math.abs(i - (n - 1) / 2) / n * 2 : i / n;
    const q = ease('cubicOut', clamp((e * (1 + st) - order * st)));
    if (q <= 0) continue;
    const y0 = -span / 2 + i * sh;
    if (P.grow === 'edge') ctx.rect(-len / 2, y0, len, sh * q);
    else if (P.grow === 'side') ctx.rect(-len / 2 + (i % 2 ? len * (1 - q) : 0), y0, len * q, sh + 0.5);
    else ctx.rect(-len / 2, y0 + (sh * (1 - q)) / 2, len, sh * q + 0.5);
  }
  ctx.rotate(-ang);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.clip();
  ctx.drawImage(B, 0, 0);
  ctx.restore();
};
F.slices = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const n = P.n ?? 6;
  const vert = P.orient === 'v';
  ctx.drawImage(A, 0, 0);
  for (let i = 0; i < n; i++) {
    const q = ease(P.ease2 || 'expoOut', clamp(e * 1.5 - (i / n) * 0.5));
    if (q <= 0) continue;
    const s = P.comb ? (i % 2 ? 1 : -1) : i % 2 ? 1 : -1;
    ctx.save();
    ctx.beginPath();
    if (vert) {
      const w = cw / n;
      ctx.rect(i * w, 0, w + 0.5, ch);
      ctx.clip();
      ctx.drawImage(B, 0, s * (1 - q) * ch);
    } else {
      const hh = ch / n;
      ctx.rect(0, i * hh, cw, hh + 0.5);
      ctx.clip();
      ctx.drawImage(B, s * (1 - q) * cw, 0);
    }
    ctx.restore();
  }
};
F.venetian = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const n = P.n ?? 10;
  const vert = P.orient === 'v';
  fill(ctx, '#000', cw, ch);
  for (let i = 0; i < n; i++) {
    const q = clamp(e * 1.6 - (i / n) * 0.6);
    const flip = Math.cos(q * Math.PI);
    const img = q < 0.5 ? A : B;
    const s = Math.max(0.002, Math.abs(flip));
    ctx.save();
    if (vert) {
      const w = cw / n, x = i * w;
      ctx.beginPath(); ctx.rect(x, 0, w + 0.5, ch); ctx.clip();
      ctx.translate(x + w / 2, 0); ctx.scale(s, 1); ctx.translate(-(x + w / 2), 0);
    } else {
      const hh = ch / n, y = i * hh;
      ctx.beginPath(); ctx.rect(0, y, cw, hh + 0.5); ctx.clip();
      ctx.translate(0, y + hh / 2); ctx.scale(1, s); ctx.translate(0, -(y + hh / 2));
    }
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${(1 - s) * 0.5})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
};

// ---------------------------------------------------------------- tiles
function spiralOrder(cols, rows) {
  const order = new Array(cols * rows).fill(0);
  let x0 = 0, y0 = 0, x1 = cols - 1, y1 = rows - 1, n = 0;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) order[y0 * cols + x] = n++;
    for (let y = y0 + 1; y <= y1; y++) order[y * cols + x1] = n++;
    if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) order[y1 * cols + x] = n++;
    if (x0 < x1) for (let y = y1 - 1; y > y0; y--) order[y * cols + x0] = n++;
    x0++; y0++; x1--; y1--;
  }
  return order.map((v) => v / (cols * rows));
}
F.tiles = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  const cols = P.cols ?? 8, rows = Math.max(2, Math.round(cols * ch / cw));
  const tw = cw / cols, th = ch / rows;
  const sp = P.pattern === 'spiral' ? spiralOrder(cols, rows) : null;
  const win = P.win ?? 0.4;
  ctx.drawImage(A, 0, 0);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    let o;
    switch (P.pattern) {
      case 'rows': o = j / rows + (i / cols) * 0.08; break;
      case 'cols': o = i / cols + (j / rows) * 0.08; break;
      case 'diag': o = (i + j) / (cols + rows - 2); break;
      case 'spiral': o = sp[j * cols + i]; break;
      case 'center': o = Math.hypot(i - (cols - 1) / 2, (j - (rows - 1) / 2) * (th / tw)) / Math.hypot(cols / 2, rows / 2 * (th / tw)); break;
      case 'checker': o = ((i + j) % 2) * 0.5 + (j / rows) * 0.45; break;
      default: o = sr(i * 13.1 + j * 7.7);
    }
    const q = clamp((e - o * (1 - win)) / win);
    if (q <= 0) continue;
    const x = i * tw, y = j * th;
    ctx.save();
    ctx.translate(x + tw / 2, y + th / 2);
    switch (P.anim) {
      case 'flip': { const s = ease('backOut', q); ctx.scale(Math.max(0.01, s), 1); break; }
      case 'fade': ctx.globalAlpha = ease('cubicOut', q); break;
      case 'slide': ctx.translate(0, (1 - ease('expoOut', q)) * -th * 1.2); ctx.globalAlpha = clamp(q * 3); break;
      case 'spin': { const s = ease('backOut', q); ctx.rotate((1 - q) * Math.PI); ctx.scale(s, s); break; }
      default: { const s = ease('backOut', q); ctx.scale(s, s); }
    }
    ctx.drawImage(B, x, y, tw, th, -tw / 2 - 0.5, -th / 2 - 0.5, tw + 1, th + 1);
    ctx.restore();
  }
};
F.pixel = (k) => {
  const { ctx, A, B, p, P, env, cw, ch } = k;
  const q = p < 0.5 ? p * 2 : (1 - p) * 2;
  const block = Math.max(1, Math.round(1 + ease('cubicIn', q) * (P.max ?? 60) * env.px));
  const sw = Math.max(1, Math.round(cw / block)), sh = Math.max(1, Math.round(ch / block));
  const small = buf('px', sw, sh);
  const s = small.getContext('2d');
  s.imageSmoothingEnabled = true;
  s.globalAlpha = 1;
  s.clearRect(0, 0, sw, sh);
  if (P.mode === 'mosaic') { s.drawImage(A, 0, 0, sw, sh); s.globalAlpha = ease('sineInOut', p); s.drawImage(B, 0, 0, sw, sh); s.globalAlpha = 1; }
  else s.drawImage(p < 0.5 ? A : B, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, sw, sh, 0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
};

// ---------------------------------------------------------------- 3D-ish
F.flip = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  fill(ctx, '#000', cw, ch);
  const img = e < 0.5 ? A : B;
  const kk = Math.abs(Math.cos(e * Math.PI));
  const depth = 0.88 + 0.12 * kk;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  if (P.axis === 'y') ctx.scale(depth, Math.max(0.001, kk) * depth);
  else ctx.scale(Math.max(0.001, kk) * depth, depth);
  if (P.tilt) ctx.rotate(Math.sin(e * Math.PI) * P.tilt);
  ctx.drawImage(img, -cw / 2, -ch / 2);
  ctx.fillStyle = `rgba(0,0,0,${(1 - kk) * 0.6})`;
  ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.restore();
};
F.cube = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  fill(ctx, '#000', cw, ch);
  const d = P.dir || 'left';
  const shade = (x, y, w, h, a) => { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(x, y, w, h); };
  if (d === 'left' || d === 'right') {
    const wa = cw * (1 - e), wb = cw * e;
    if (d === 'left') {
      ctx.drawImage(A, 0, 0, cw, ch, 0, ch * 0.04 * e, wa, ch * (1 - 0.08 * e)); shade(0, 0, wa, ch, e * 0.6);
      ctx.drawImage(B, 0, 0, cw, ch, wa, ch * 0.04 * (1 - e), wb, ch * (1 - 0.08 * (1 - e))); shade(wa, 0, wb, ch, (1 - e) * 0.6);
    } else {
      ctx.drawImage(A, 0, 0, cw, ch, wb, ch * 0.04 * e, wa, ch * (1 - 0.08 * e)); shade(wb, 0, wa, ch, e * 0.6);
      ctx.drawImage(B, 0, 0, cw, ch, 0, ch * 0.04 * (1 - e), wb, ch * (1 - 0.08 * (1 - e))); shade(0, 0, wb, ch, (1 - e) * 0.6);
    }
  } else {
    const ha = ch * (1 - e), hb = ch * e;
    if (d === 'up') {
      ctx.drawImage(A, 0, 0, cw, ch, cw * 0.04 * e, 0, cw * (1 - 0.08 * e), ha); shade(0, 0, cw, ha, e * 0.6);
      ctx.drawImage(B, 0, 0, cw, ch, cw * 0.04 * (1 - e), ha, cw * (1 - 0.08 * (1 - e)), hb); shade(0, ha, cw, hb, (1 - e) * 0.6);
    } else {
      ctx.drawImage(A, 0, 0, cw, ch, cw * 0.04 * e, hb, cw * (1 - 0.08 * e), ha); shade(0, hb, cw, ha, e * 0.6);
      ctx.drawImage(B, 0, 0, cw, ch, cw * 0.04 * (1 - e), 0, cw * (1 - 0.08 * (1 - e)), hb); shade(0, 0, cw, hb, (1 - e) * 0.6);
    }
  }
};
F.door = (k) => {
  // the outgoing frame opens like two doors (perspective squeeze toward the hinges)
  const { ctx, A, B, e, P, cw, ch } = k;
  drawAt(ctx, B, 0, 0, 0.9 + 0.1 * e, 0, 1, cw, ch);
  ctx.fillStyle = `rgba(0,0,0,${0.5 * (1 - e)})`;
  ctx.fillRect(0, 0, cw, ch);
  const s = Math.max(0.002, Math.cos(e * Math.PI / 2));
  if (P.axis === 'h') {
    const hh = ch / 2;
    ctx.drawImage(A, 0, 0, cw, hh, 0, 0, cw, hh * s);
    ctx.drawImage(A, 0, hh, cw, hh, 0, ch - hh * s, cw, hh * s);
    ctx.fillStyle = `rgba(0,0,0,${e * 0.55})`;
    ctx.fillRect(0, 0, cw, hh * s); ctx.fillRect(0, ch - hh * s, cw, hh * s);
  } else {
    const w = cw / 2;
    ctx.drawImage(A, 0, 0, w, ch, 0, ch * 0.05 * e, w * s, ch * (1 - 0.1 * e));
    ctx.drawImage(A, w, 0, w, ch, cw - w * s, ch * 0.05 * e, w * s, ch * (1 - 0.1 * e));
    ctx.fillStyle = `rgba(0,0,0,${e * 0.55})`;
    ctx.fillRect(0, 0, w * s, ch); ctx.fillRect(cw - w * s, 0, w * s, ch);
  }
};
F.page = (k) => {
  // page turn: the fold line travels; the turned part is a shaded mirrored strip
  const { ctx, A, B, e, P, cw, ch } = k;
  const rev = P.dir === 'right';
  const x = rev ? cw * e : cw * (1 - e);
  ctx.drawImage(B, 0, 0);
  ctx.save();
  ctx.beginPath();
  if (rev) ctx.rect(x, 0, cw - x, ch); else ctx.rect(0, 0, x, ch);
  ctx.clip();
  ctx.drawImage(A, 0, 0);
  ctx.restore();
  const fw = Math.min(cw * e, cw * (1 - e), cw * 0.5) * 0.9;
  if (fw > 1) {
    ctx.save();
    // shadow cast on the next page
    const sg = ctx.createLinearGradient(x, 0, rev ? x - fw * 1.4 : x + fw * 1.4, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(rev ? x - fw * 1.4 : x, 0, fw * 1.4, ch);
    // the curled back of the page
    ctx.beginPath();
    if (rev) ctx.rect(x - fw, 0, fw, ch); else ctx.rect(x, 0, fw, ch);
    ctx.clip();
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(A, 0, 0);
    const g = ctx.createLinearGradient(x, 0, rev ? x + fw : x - fw, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(rev ? x : x - fw, 0, fw, ch);
    ctx.restore();
  }
};
F.fold = (k) => {
  // accordion: the outgoing frame folds into pleats toward one edge
  const { ctx, A, B, e, P, cw, ch } = k;
  ctx.drawImage(B, 0, 0);
  ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - e)})`;
  ctx.fillRect(0, 0, cw, ch);
  const n = P.n ?? 8;
  const vert = P.axis !== 'h';
  const total = (vert ? cw : ch) * (1 - e);
  const pw = total / n;
  for (let i = 0; i < n; i++) {
    const src = (vert ? cw : ch) / n;
    if (vert) ctx.drawImage(A, i * src, 0, src, ch, i * pw, ch * 0.03 * e * (i % 2 ? 1 : -1), pw + 0.5, ch);
    else ctx.drawImage(A, 0, i * src, cw, src, cw * 0.03 * e * (i % 2 ? 1 : -1), i * pw, cw, pw + 0.5);
    ctx.fillStyle = i % 2 ? `rgba(0,0,0,${0.45 * e})` : `rgba(255,255,255,${0.08 * e})`;
    if (vert) ctx.fillRect(i * pw, 0, pw + 0.5, ch); else ctx.fillRect(0, i * pw, cw, pw + 0.5);
  }
};
F.cardfly = (k) => {
  const { ctx, A, B, p, P, env, cw, ch } = k;
  const [dx, dy] = vec(k);
  drawAt(ctx, B, 0, 0, 0.94 + 0.06 * ease('cubicOut', p), 0, 1, cw, ch);
  const q1 = ease('cubicOut', clamp(p / 0.4));
  const q2 = ease('cubicIn', clamp((p - 0.22) / 0.78));
  const s = 1 - 0.18 * q1;
  ctx.save();
  ctx.translate(cw / 2 + dx * cw * 1.3 * q2, ch / 2 + dy * ch * 1.3 * q2);
  ctx.rotate(q2 * 0.25 * (dx || 1));
  ctx.scale(s, s);
  fakeShadow(ctx, -cw / 2, -ch / 2, cw, ch, 40 * env.px * q1, 0.45 * q1);
  const r = Math.min(cw, ch) * 0.06 * q1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-cw / 2, -ch / 2, cw, ch, r); else ctx.rect(-cw / 2, -ch / 2, cw, ch);
  ctx.clip();
  ctx.drawImage(A, -cw / 2, -ch / 2);
  ctx.restore();
};

// ---------------------------------------------------------------- glitch
function channels(img, cw, ch) {
  // red channel and cyan (green+blue) channels as separate layers
  const r = buf('ch-r', cw, ch), c = buf('ch-c', cw, ch);
  const rx = r.getContext('2d'), cx = c.getContext('2d');
  rx.globalCompositeOperation = 'copy'; rx.drawImage(img, 0, 0);
  rx.globalCompositeOperation = 'multiply'; rx.fillStyle = '#ff0000'; rx.fillRect(0, 0, cw, ch);
  rx.globalCompositeOperation = 'source-over';
  cx.globalCompositeOperation = 'copy'; cx.drawImage(img, 0, 0);
  cx.globalCompositeOperation = 'multiply'; cx.fillStyle = '#00ffff'; cx.fillRect(0, 0, cw, ch);
  cx.globalCompositeOperation = 'source-over';
  return [r, c];
}
F.glitch = (k) => {
  const { ctx, A, B, p, P, env, cw, ch } = k;
  const img = p < 0.5 ? A : B;
  const amt = Math.sin(p * Math.PI);
  const tick = Math.floor(p * 30);
  switch (P.mode) {
    case 'rgb': case 'rgbv': {
      const [r, c] = channels(img, cw, ch);
      const o = amt * 26 * env.px * (sr(tick * 1.7) * 0.6 + 0.7);
      fill(ctx, '#000', cw, ch);
      ctx.globalCompositeOperation = 'lighter';
      if (P.mode === 'rgb') { ctx.drawImage(r, o, 0); ctx.drawImage(c, -o, 0); }
      else { ctx.drawImage(r, 0, o); ctx.drawImage(c, 0, -o); }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'scan': {
      ctx.drawImage(A, 0, 0);
      const lh = Math.max(2, Math.round(5 * env.px));
      ctx.save();
      ctx.beginPath();
      for (let y = 0, i = 0; y < ch; y += lh, i++) if (sr(i * 1.31 + 0.2) < p * 1.15 - 0.05) ctx.rect(0, y, cw, lh);
      ctx.clip();
      ctx.drawImage(B, (sr(tick) - 0.5) * 30 * env.px * amt, 0);
      ctx.restore();
      ctx.fillStyle = `rgba(0,0,0,${0.25 * amt})`;
      for (let y = 0; y < ch; y += lh * 2) ctx.fillRect(0, y, cw, lh * 0.5);
      break;
    }
    case 'mosh': {
      ctx.drawImage(A, 0, 0);
      const bs = Math.round(Math.min(cw, ch) / 9);
      for (let y = 0; y < ch; y += bs) for (let x = 0; x < cw; x += bs) {
        const r = sr(x * 0.37 + y * 1.13 + tick * 0.17);
        if (r > p * 1.25) continue;
        const vx = (sr(x + y * 3.1) - 0.5) * bs * 1.6 * amt, vy = (sr(x * 2.7 + y) - 0.3) * bs * 2.2 * amt;
        ctx.drawImage(r > p * 0.8 ? A : B, x, y, bs, bs, x + vx, y + vy, bs, bs);
      }
      break;
    }
    case 'blocks': {
      ctx.drawImage(img, 0, 0);
      const ac = col(k, P.color);
      for (let i = 0; i < 16; i++) {
        if (sr(i * 4.1 + tick) > amt) continue;
        const w = (0.08 + sr(i * 2.3 + tick) * 0.4) * cw, h = (0.02 + sr(i * 1.9 + tick) * 0.12) * ch;
        const x = sr(i * 7.7 + tick * 0.3) * (cw - w), y = sr(i * 3.3 + tick * 0.7) * (ch - h);
        ctx.drawImage(img === A ? B : A, x, y, w, h, x + (sr(i + tick) - 0.5) * 60 * env.px, y, w, h);
        if (i % 4 === 0) { ctx.fillStyle = rgba(ac, 0.55); ctx.fillRect(x, y, w * 0.3, h * 0.4); }
      }
      break;
    }
    case 'vhs': {
      const bands = 24;
      const bh = ch / bands;
      fill(ctx, '#000', cw, ch);
      for (let i = 0; i < bands; i++) {
        const off = Math.sin(i * 0.9 + p * 22) * 18 * env.px * amt + (sr(i + tick) - 0.5) * 30 * env.px * amt * amt;
        ctx.drawImage(img, 0, i * bh, cw, bh + 1, off, i * bh, cw, bh + 1);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 * amt;
      ctx.drawImage(img, 8 * env.px, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${0.12 * amt})`;
      const ny = sr(tick * 9.1) * ch;
      ctx.fillRect(0, ny, cw, ch * 0.02);
      break;
    }
    case 'jitter': {
      const pick = sr(tick * 3.3) < p ? B : A;
      fill(ctx, '#000', cw, ch);
      drawAt(ctx, pick, (sr(tick * 1.1) - 0.5) * 40 * env.px * amt, (sr(tick * 2.2) - 0.5) * 30 * env.px * amt, 1 + 0.04 * amt, 0, 1, cw, ch);
      break;
    }
    case 'tear': {
      const y = (0.2 + 0.6 * sr(tick * 0.7)) * ch;
      const off = amt * cw * 0.18 * (sr(tick * 2.9) - 0.5) * 2;
      ctx.drawImage(img, 0, 0, cw, y, off, 0, cw, y);
      ctx.drawImage(img, 0, y, cw, ch - y, -off, y, cw, ch - y);
      ctx.fillStyle = `rgba(255,255,255,${0.6 * amt})`;
      ctx.fillRect(0, y - env.px, cw, 2 * env.px);
      break;
    }
    case 'noise': {
      ctx.drawImage(img, 0, 0);
      for (let i = 0; i < 10; i++) {
        if (sr(i * 2.2 + tick) > amt) continue;
        const y = sr(i * 5.5 + tick * 0.9) * ch, h = (0.01 + sr(i + tick) * 0.05) * ch;
        ctx.fillStyle = i % 3 ? `rgba(255,255,255,${0.35 + 0.4 * sr(i)})` : rgba(col(k, P.color), 0.7);
        for (let x = 0; x < cw; x += 6 * env.px) if (sr(x * 0.1 + i + tick) > 0.45) ctx.fillRect(x, y, 4 * env.px, h);
      }
      break;
    }
    default: { // slice shift (classic)
      ctx.drawImage(img, 0, 0);
      const n = P.n ?? 14;
      for (let i = 0; i < n; i++) {
        if (sr(i * 3.1 + tick) > amt * 0.9) continue;
        const y = sr(i * 7.7 + tick * 1.3) * ch, hh = (0.01 + sr(i * 1.9 + tick) * 0.08) * ch;
        const off = (sr(i * 5.3 + tick * 2.1) - 0.5) * cw * 0.25 * amt;
        ctx.drawImage(sr(i + tick) > 0.5 ? A : B, 0, y, cw, hh, off, y, cw, hh);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4 * amt;
      ctx.drawImage(img, 12 * env.px * amt, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (P.flash && sr(tick * 5.1) > 0.75 && amt > 0.4) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, 0, cw, ch); }
    }
  }
};

// ---------------------------------------------------------------- warp
F.ripple = (k) => {
  const { ctx, A, B, e, p, P, env, cw, ch } = k;
  const vert = P.axis === 'v';
  const n = P.n ?? 36;
  const amp = Math.sin(p * Math.PI) * (P.amp ?? 40) * env.U * env.px;
  const freq = P.freq ?? 3;
  fill(ctx, '#000', cw, ch);
  const strips = (img, alpha, ph) => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const off = Math.sin((i / n) * TAU * freq + p * 9 + ph) * amp;
      if (vert) { const w = cw / n; ctx.drawImage(img, i * w, 0, w + 1, ch, i * w, off, w + 1, ch); }
      else { const hh = ch / n; ctx.drawImage(img, 0, i * hh, cw, hh + 1, off, i * hh, cw, hh + 1); }
    }
  };
  strips(A, 1, 0);
  strips(B, e, 1.3);
  ctx.globalAlpha = 1;
};
F.stretch = (k) => {
  const { ctx, A, B, p, P, cw, ch } = k;
  fill(ctx, bgOf(k), cw, ch);
  const h = P.axis !== 'v';
  if (p < 0.5) {
    const q = ease('expoIn', p * 2);
    const s1 = 1 + q * (P.amt ?? 5), s2 = 1 - q * 0.6;
    drawAt(ctx, A, 0, 0, h ? s1 : s2, 0, 1 - q * 0.6, cw, ch, h ? s2 : s1);
  } else {
    const q = ease('expoOut', (p - 0.5) * 2);
    const s1 = 1 + (1 - q) * (P.amt ?? 5), s2 = 1 - (1 - q) * 0.6;
    drawAt(ctx, B, 0, 0, h ? s1 : s2, 0, 0.4 + 0.6 * q, cw, ch, h ? s2 : s1);
  }
};
F.swirl = (k) => {
  // rendered at half size: the image is heavily distorted anyway, and rotated resampling is costly
  const { ctx, A, B, p, P, cw, ch } = k;
  const hw = Math.max(2, Math.round(cw / 2)), hh = Math.max(2, Math.round(ch / 2));
  const hb = buf('swirl', hw, hh);
  const sx = hb.getContext('2d');
  const n = 9;
  const R = Math.hypot(hw, hh) / 2;
  const amt = Math.sin(p * Math.PI) * (P.amt ?? 2.4) * (P.ccw ? -1 : 1);
  const img = p < 0.5 ? A : B;
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.drawImage(img, 0, 0, hw, hh);
  const pat = sx.createPattern(img, 'no-repeat');
  if (pat) {
    pat.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]));
    sx.fillStyle = pat;
    const cx = hw / 2, cy = hh / 2;
    for (let i = n - 1; i >= 0; i--) {
      const r0 = (i / n) * R, r1 = ((i + 1) / n) * R + 1;
      const ang = amt * (1 - i / n) * (P.twist && i % 2 ? -1 : 1);
      if (Math.abs(ang) < 0.002) continue;
      const c = Math.cos(ang), s2 = Math.sin(ang);
      sx.setTransform(c, s2, -s2, c, cx - (c * cx - s2 * cy), cy - (s2 * cx + c * cy));
      sx.beginPath();
      sx.arc(cx, cy, r1, 0, TAU);
      if (r0 > 0) sx.arc(cx, cy, r0, 0, TAU, true);
      sx.fill();
    }
    sx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.drawImage(hb, 0, 0, hw, hh, 0, 0, cw, ch);
};
F.melt = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  ctx.drawImage(B, 0, 0);
  const n = P.n ?? 36;
  const w = cw / n;
  for (let i = 0; i < n; i++) {
    const d = sr(i * 3.9 + 1) * 0.45 + (P.wave ? Math.sin(i / n * Math.PI) * 0.25 : 0);
    const q = ease('cubicIn', clamp((e - d * 0.6) / 0.6));
    const y = q * ch * 1.05 * (P.up ? -1 : 1);
    ctx.drawImage(A, i * w, 0, w + 1, ch, i * w, y, w + 1, ch);
  }
};
F.wobble = (k) => {
  const { ctx, A, B, e, p, cw, ch } = k;
  const amt = Math.sin(p * Math.PI);
  fill(ctx, '#000', cw, ch);
  const sk = Math.sin(p * 18) * 0.25 * amt;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.transform(1, 0, sk, 1, 0, 0);
  ctx.scale(1 + 0.06 * amt, 1 - 0.04 * amt);
  ctx.drawImage(A, -cw / 2, -ch / 2);
  ctx.globalAlpha = e;
  ctx.drawImage(B, -cw / 2, -ch / 2);
  ctx.restore();
};

// ---------------------------------------------------------------- light
F.flash = (k) => {
  const { ctx, A, B, p, P, cw, ch } = k;
  ctx.drawImage(p < 0.5 ? A : B, 0, 0);
  const peak = Math.pow(1 - Math.abs(p * 2 - 1), P.sharp ?? 2);
  ctx.globalAlpha = peak;
  if (P.radial) {
    const g = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.hypot(cw, ch) / 2);
    g.addColorStop(0, col(k, P.color || '#fff'));
    g.addColorStop(0.5 + 0.5 * peak, rgba(col(k, P.color || '#fff'), peak));
    g.addColorStop(1, rgba(col(k, P.color || '#fff'), 0));
    ctx.fillStyle = g;
  } else ctx.fillStyle = col(k, P.color || '#fff');
  ctx.fillRect(0, 0, cw, ch);
};
F.leak = (k) => {
  const { ctx, A, B, e, p, P, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.globalAlpha = ease('sineInOut', p);
  ctx.drawImage(B, 0, 0);
  ctx.globalAlpha = 1;
  const amt = Math.sin(p * Math.PI);
  const cols = (P.colors || ['#ff9a3c', '#ff3c6e', '#ffd36b']).map((c) => col(k, c));
  // light painted at 1/4 size, then screened over the frame
  const lw = Math.max(8, Math.round(cw / 4)), lh = Math.max(8, Math.round(ch / 4));
  const L = buf('leak', lw, lh);
  const lx = L.getContext('2d');
  lx.globalCompositeOperation = 'source-over';
  lx.fillStyle = '#000';
  lx.fillRect(0, 0, lw, lh);
  lx.globalCompositeOperation = 'lighter';
  cols.forEach((c, i) => {
    const x = lw * (-0.2 + 1.4 * e + (i - 1) * 0.25), y = lh * (0.25 + i * 0.25 + Math.sin(p * 3 + i) * 0.1);
    const R = Math.max(lw, lh) * (0.45 + i * 0.12);
    const g = lx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba(c, 0.85 * amt));
    g.addColorStop(1, rgba(c, 0));
    lx.fillStyle = g;
    lx.fillRect(0, 0, lw, lh);
  });
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(L, 0, 0, lw, lh, 0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
};
F.flare = (k) => {
  const { ctx, A, B, e, p, P, env, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.globalAlpha = ease('sineInOut', clamp((p - 0.3) / 0.4));
  ctx.drawImage(B, 0, 0);
  ctx.globalAlpha = 1;
  const amt = Math.sin(p * Math.PI);
  const x = cw * (-0.1 + 1.2 * e), y = ch * (P.y ?? 0.42);
  const c = col(k, P.color || '#fff');
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y - ch * 0.02, 0, y + ch * 0.02);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, 0.8 * amt)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - ch * 0.02, cw, ch * 0.04);
  const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.min(cw, ch) * 0.35);
  rg.addColorStop(0, rgba('#ffffff', amt)); rg.addColorStop(0.2, rgba(c, 0.6 * amt)); rg.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, cw, ch);
  for (let i = 1; i <= 3; i++) {
    const fx = cw / 2 + (cw / 2 - x) * i * 0.5, fy = ch / 2 + (ch / 2 - y) * i * 0.5;
    ctx.fillStyle = rgba(c, 0.18 * amt);
    ctx.beginPath(); ctx.arc(fx, fy, Math.min(cw, ch) * 0.03 * i, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  void env;
};
F.bloom = (k) => {
  const { ctx, A, B, e, p, env, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.globalAlpha = e;
  ctx.drawImage(B, 0, 0);
  ctx.globalAlpha = 1;
  const amt = Math.sin(p * Math.PI);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.85 * amt;
  ctx.drawImage(blurred(p < 0.5 ? A : B, 26 * env.U * env.px * (0.4 + amt), 'a'), 0, 0, cw, ch);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};
F.strobe = (k) => {
  const { ctx, A, B, p, cw, ch } = k;
  const f = Math.floor(p * 14);
  const img = p < 0.5 ? (f % 2 ? B : A) : (f % 2 ? A : B);
  ctx.drawImage(p > 0.85 ? B : p < 0.15 ? A : img, 0, 0);
  if (p > 0.2 && p < 0.8 && f % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(0, 0, cw, ch); }
};
F.sunrise = (k) => {
  const { ctx, A, B, e, p, P, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.globalAlpha = ease('sineInOut', p);
  ctx.drawImage(B, 0, 0);
  ctx.globalAlpha = 1;
  const amt = Math.sin(p * Math.PI);
  const c = col(k, P.color);
  const y = ch * (1.25 - 0.9 * e);
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(cw / 2, y, 0, cw / 2, y, Math.max(cw, ch) * 0.9);
  g.addColorStop(0, rgba('#ffffff', 0.9 * amt)); g.addColorStop(0.25, rgba(c, 0.7 * amt)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
};

// ---------------------------------------------------------------- colour panels
F.panel = (k) => {
  const { ctx, A, B, p, P, cw, ch } = k;
  const cols = (P.colors || ['@accent', '@secondary']).map((c) => col(k, c));
  const n = cols.length;
  const ang = ((P.angle ?? 0) * Math.PI) / 180;
  const L = Math.abs(cw * Math.cos(ang)) + Math.abs(ch * Math.sin(ang));
  const H = Math.hypot(cw, ch) * 1.5;
  const lag = 0.16;
  const span = 1 - lag * (n - 1);
  ctx.drawImage(p < 0.5 ? A : B, 0, 0);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(ang);
  if (p < 0.5) {
    const q = p * 2;
    for (let i = 0; i < n; i++) {
      const c = ease('cubicInOut', clamp((q - i * lag) / span));
      ctx.fillStyle = cols[i];
      ctx.fillRect(-L / 2, -H, L * c, H * 2);
    }
  } else {
    const q = (p - 0.5) * 2;
    for (let i = 0; i < n; i++) {
      const r = ease('cubicInOut', clamp((q - (n - 1 - i) * lag) / span));
      ctx.fillStyle = cols[i];
      ctx.fillRect(-L / 2 + L * r, -H, L * (1 - r), H * 2);
    }
  }
  ctx.restore();
};
F.colorShape = (k) => {
  // a colour shape grows to cover A, then the next scene opens out of it
  const { ctx, A, B, p, P, cw, ch } = k;
  const c = col(k, P.color);
  const cx = cw * (P.ox ?? 0.5), cy = ch * (P.oy ?? 0.5);
  const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) * (SHAPE_REACH[P.shape] || 1.05);
  if (p < 0.5) {
    ctx.drawImage(A, 0, 0);
    const r = R * ease('cubicIn', p * 2);
    ctx.fillStyle = c;
    ctx.beginPath(); shapePath(ctx, P.shape || 'circle', cx, cy, r, (P.spin ?? 0) * p); ctx.fill();
  } else {
    fill(ctx, c, cw, ch);
    const r = R * ease('cubicOut', (p - 0.5) * 2);
    ctx.save();
    ctx.beginPath(); shapePath(ctx, P.shape || 'circle', cx, cy, r, (P.spin ?? 0) * p); ctx.clip();
    ctx.drawImage(B, 0, 0);
    ctx.restore();
  }
};

// ---------------------------------------------------------------- particles
F.shatter = (k) => {
  // shards are filled with an image pattern under a per-shard transform (cheaper than clip + drawImage)
  const { ctx, A, B, e, P, cw, ch } = k;
  drawAt(ctx, B, 0, 0, 1.06 - 0.06 * e, 0, 1, cw, ch);
  const cols = P.cols ?? 5, rows = Math.max(3, Math.round(cols * ch / cw));
  const tw = cw / cols, th = ch / rows;
  const ix = cw * (P.ox ?? 0.5), iy = ch * (P.oy ?? 0.5);
  const pat = ctx.createPattern(A, 'no-repeat');
  if (!pat) return;
  ctx.fillStyle = pat;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) for (let t = 0; t < 2; t++) {
    const x = i * tw, y = j * th;
    const tri = t ? [x, y, x + tw, y, x + tw, y + th] : [x, y, x, y + th, x + tw, y + th];
    const mx = (tri[0] + tri[2] + tri[4]) / 3, my = (tri[1] + tri[3] + tri[5]) / 3;
    const seed = i * 7.1 + j * 3.3 + t;
    const dist = Math.hypot(mx - ix, my - iy) / Math.hypot(cw, ch);
    const q = clamp((e - dist * 0.5) / 0.55);
    if (q >= 1) continue;
    const qq = ease('cubicIn', q);
    const vx = (mx - ix) * (1.2 + sr(seed) * 1.5), vy = (my - iy) * (1.2 + sr(seed + 1) * 1.5);
    const rot = (sr(seed + 2) - 0.5) * 4 * qq, sc = 1 - qq * 0.4;
    const a = Math.cos(rot) * sc, b = Math.sin(rot) * sc;
    const tx = mx + vx * qq, ty = my + vy * qq + qq * qq * ch * 0.6;
    ctx.setTransform(a, b, -b, a, tx - (a * mx - b * my), ty - (b * mx + a * my));
    ctx.globalAlpha = 1 - qq;
    ctx.beginPath();
    ctx.moveTo(tri[0], tri[1]); ctx.lineTo(tri[2], tri[3]); ctx.lineTo(tri[4], tri[5]); ctx.closePath();
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
};
F.dust = (k) => {
  // the outgoing frame breaks into small squares that drift away
  const { ctx, A, B, e, P, cw, ch } = k;
  drawAt(ctx, B, 0, 0, 1.04 - 0.04 * e, 0, 1, cw, ch);
  const cols = P.cols ?? 18, rows = Math.max(4, Math.round(cols * ch / cw));
  const tw = cw / cols, th = ch / rows;
  const [dx, dy] = P.mode === 'explode' || P.mode === 'fall' ? [0, 0] : dirVec(P.dir || 'right');
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * tw, y = j * th;
    const seed = i * 13.7 + j * 5.1;
    let d;
    if (P.mode === 'explode') d = Math.hypot(i / cols - 0.5, j / rows - 0.5) * 0.9 + sr(seed) * 0.25;
    else if (P.mode === 'fall') d = (1 - j / rows) * 0.35 + sr(seed) * 0.35;
    else d = (dx > 0 ? i / cols : dx < 0 ? 1 - i / cols : dy > 0 ? j / rows : 1 - j / rows) * 0.55 + sr(seed) * 0.3;
    const q = clamp((e - d * 0.7) / 0.35);
    if (q >= 1) continue;
    const qq = ease('cubicIn', q);
    let ox, oy, rot = 0;
    if (P.mode === 'explode') { ox = (x + tw / 2 - cw / 2) * qq * 1.4; oy = (y + th / 2 - ch / 2) * qq * 1.4; rot = (sr(seed + 3) - 0.5) * 3 * qq; }
    else if (P.mode === 'fall') { ox = (sr(seed + 1) - 0.5) * tw * 2 * qq; oy = qq * qq * ch * 1.2; rot = (sr(seed + 4) - 0.5) * 4 * qq; }
    else { ox = (dx * 0.6 + (sr(seed + 1) - 0.5) * 0.3) * cw * qq; oy = (dy * 0.6 + (sr(seed + 2) - 0.6) * 0.3) * ch * qq; }
    ctx.globalAlpha = 1 - qq;
    if (rot) {
      ctx.save();
      ctx.translate(x + tw / 2 + ox, y + th / 2 + oy);
      ctx.rotate(rot);
      ctx.drawImage(A, x, y, tw, th, -tw / 2, -th / 2, tw + 0.5, th + 0.5);
      ctx.restore();
    } else ctx.drawImage(A, x, y, tw, th, x + ox, y + oy, tw + 0.5, th + 0.5);
  }
  ctx.globalAlpha = 1;
};
F.assemble = (k) => {
  // the incoming frame flies in from scattered pieces
  const { ctx, A, B, e, P, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  ctx.fillStyle = `rgba(0,0,0,${0.5 * e})`;
  ctx.fillRect(0, 0, cw, ch);
  const cols = P.cols ?? 10, rows = Math.max(4, Math.round(cols * ch / cw));
  const tw = cw / cols, th = ch / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const seed = i * 9.7 + j * 4.3;
    const q = ease('expoOut', clamp((e - sr(seed) * 0.45) / 0.55));
    if (q <= 0) continue;
    const x = i * tw, y = j * th;
    const sx = (sr(seed + 1) - 0.5) * cw * 1.6, sy = (sr(seed + 2) - 0.5) * ch * 1.6;
    ctx.save();
    ctx.globalAlpha = clamp(q * 2);
    ctx.translate(x + tw / 2 + sx * (1 - q), y + th / 2 + sy * (1 - q));
    ctx.rotate((sr(seed + 3) - 0.5) * 3 * (1 - q));
    ctx.drawImage(B, x, y, tw, th, -tw / 2, -th / 2, tw + 0.5, th + 0.5);
    ctx.restore();
  }
};
F.sand = (k) => {
  const { ctx, A, B, e, P, cw, ch } = k;
  ctx.drawImage(A, 0, 0);
  const n = P.n ?? 30;
  const w = cw / n;
  for (let i = 0; i < n; i++) {
    const d = sr(i * 4.4 + 0.5) * 0.5;
    const q = ease('bounceOut', clamp((e - d) / 0.5));
    if (q <= 0) continue;
    ctx.drawImage(B, i * w, 0, w + 1, ch, i * w, -(1 - q) * ch, w + 1, ch);
  }
};

// ---------------------------------------------------------------- mask patterns (luma wipes)
F.mask = (k) => {
  const { ctx, A, B, e, P } = k;
  const fn = FIELDS[P.field] || FIELDS.clouds;
  let edge = null;
  if (P.edge) {
    const c = parseColor(col(k, P.edge));
    edge = [c.r, c.g, c.b];
  }
  maskReveal(ctx, A, B, P.field + (P.flipField ? '-r' : ''), P.flipField ? (u, v, a, x, y) => -fn(u, v, a, x, y) : fn, e, { soft: P.soft ?? 0.09, res: P.res ?? 150, edge, band: P.band });
};
