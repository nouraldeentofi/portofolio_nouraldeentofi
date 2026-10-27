// Two marks on every frame:
// - a big soft diagonal watermark drawn above every layer, so nothing in the scene can cover it.
//   Only the owner's password removes it. The password is not stored anywhere: the code keeps a
//   salted PBKDF2 key's SHA-256, and an unlocked browser keeps the key (not a flag).
// - a small corner badge, which each project can switch off freely (project.badge === false).
import { color, fontString } from './themes.js';
import { roundRectPath, makeCanvas } from './util.js';

export const WM_TEXT = 'nouraldeentofi.com';
const SALT = '030716e3ff78d1e5ff021ab544ec8412';
const CHECK = 'dfd7f02105891afef760e2f8e8a48ffcbc12b7e271157f0c6799c7cf0b326236';
const ITER = 310000;
const KEY = 'nms:wm';

let unlocked = false;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const bytes = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function derive(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(SALT), iterations: ITER }, base, 256));
}

export const watermarkOn = () => !unlocked;

// a browser that was unlocked before stays unlocked, but only with a key that checks out
export async function initWatermark() {
  try {
    const k = localStorage.getItem(KEY);
    unlocked = !!k && (await sha(k)) === CHECK;
  } catch (e) { unlocked = false; }
  return unlocked;
}

export async function unlockWatermark(pw) {
  const k = await derive(String(pw || '').trim().toLowerCase());
  if ((await sha(k)) !== CHECK) return false;
  unlocked = true;
  try { localStorage.setItem(KEY, k); } catch (e) { /* stays unlocked for this visit */ }
  return true;
}

export function lockWatermark() {
  unlocked = false;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export const badgeOn = (project) => !project || project.badge !== false;

export function drawWatermark(ctx, env, project) {
  if (badgeOn(project)) drawBadge(ctx, env);
  if (!unlocked) drawBigMark(ctx, env);
}

function nodeMark(ctx, x, cy, mark, lw, col) {
  const r = mark * 0.16;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 2.2, cy); ctx.lineTo(x + mark - r * 2.4, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + mark - r * 1.1, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
}

// bottom-left pill: node mark + address
function drawBadge(ctx, env) {
  const { W, H, U, theme: th } = env;
  const size = 20 * U;
  ctx.save();
  ctx.setTransform(env.px, 0, 0, env.px, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.font = fontString('@mono', th, 600, size);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(WM_TEXT).width;
  const mark = size * 1.25, gap = size * 0.45, padX = size * 0.6, h = size * 1.6;
  const w = padX * 2 + mark + gap + tw;
  // low in the corner, clear of the centred signature that most scenes end with
  const x = Math.round(W * 0.03), y = Math.round(H - H * 0.012 - h);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color('@bg', th);
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  const cy = y + h / 2, mx = x + padX;
  nodeMark(ctx, mx, cy, mark, Math.max(1, size * 0.09), color('@accent', th));
  ctx.fillStyle = color('@fg', th);
  ctx.fillText(WM_TEXT, mx + mark + gap, cy + size * 0.04);
  ctx.restore();
}

// The big mark is the same for every frame of a size and theme: paint it once, then stamp it.
// a few sizes live at once (preview, poster, export), so keep a small cache
const sprites = new Map();
function bigSprite(env, cw, ch) {
  const th = env.theme;
  const font = (px) => fontString('@display', th, 800, px);
  const ready = typeof document === 'undefined' || !document.fonts || document.fonts.check(font(100));
  const key = [cw, ch, env.W, env.H, color('@fg', th), color('@bg', th), font(100), ready].join('|');
  if (sprites.has(key)) return sprites.get(key);
  const { W, H } = env;
  const c = makeCanvas(cw, ch);
  const g = c.getContext('2d');
  const k = cw / W;
  // diagonal that suits the frame: steeper on tall frames, flatter on wide ones
  const ang = -Math.min(0.62, Math.max(0.28, Math.atan2(H, W) * 0.6));
  g.font = font(100);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  const tw100 = g.measureText(WM_TEXT).width;
  const markR = 1.05; // mark width in em
  const unitW = tw100 / 100 + markR + 0.35;
  const maxW = Math.min((W * 0.88) / Math.cos(ang), (H * 0.5) / Math.abs(Math.sin(ang)));
  const size = maxW / unitW;
  const total = unitW * size;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.translate(W / 2, H / 2);
  g.rotate(ang);
  g.font = font(size);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.direction = 'ltr';
  const x0 = -total / 2;
  const tx = x0 + (markR + 0.35) * size;
  const fg = color('@fg', th), bg = color('@bg', th);
  const paint = (col, blur, alpha, lw) => {
    // the shadow trick: draw far off-canvas and let only the blurred shadow land in place
    const off = 20000;
    g.save();
    g.globalAlpha = alpha;
    g.shadowColor = col;
    g.shadowBlur = blur * k;
    g.shadowOffsetX = off * k * Math.cos(ang);
    g.shadowOffsetY = off * k * Math.sin(ang);
    g.translate(-off, 0);
    g.fillStyle = col;
    g.fillText(WM_TEXT, tx, size * 0.04);
    nodeMark(g, x0, 0, markR * size, size * 0.11, col);
    if (lw) { g.lineWidth = lw; g.strokeStyle = col; g.strokeText(WM_TEXT, tx, size * 0.04); }
    g.restore();
  };
  paint(bg, size * 0.35, 0.45);        // dark haze so it reads on bright scenes
  paint(fg, size * 0.18, 0.4);         // soft glow
  paint(fg, size * 0.035, 0.42);       // the letters, slightly out of focus
  if (sprites.size >= 4) sprites.delete(sprites.keys().next().value);
  sprites.set(key, c);
  return c;
}

function drawBigMark(ctx, env) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const s = bigSprite(env, cw, ch);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}
