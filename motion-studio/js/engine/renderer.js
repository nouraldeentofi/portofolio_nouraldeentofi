// Frame renderer: project + time -> pixels. Deterministic, so preview == export.
import { clamp, ease, noise2, makeCanvas } from './util.js';
import { resolveTheme } from './themes.js';
import { identity, unitTransform, applyLoop, applyTransform, applyClip, inWindow } from './anim.js';
import { drawBackground, drawOverlay } from './backgrounds.js';
import { composite } from './transitions.js';
import * as B from './el-basic.js';
import * as D from './el-data.js';
import * as UI from './el-ui.js';
import * as FX from './el-fx.js';
import { textMetrics } from './text.js';
import { withBlur } from './paint.js';
import { drawWatermark } from './watermark.js';

export const ELEMENTS = {
  text: B.text, shape: B.shape, glow: B.glow, image: B.image, icon: B.icon, counter: B.counter, rotator: B.rotator,
  ticker: B.ticker, signature: B.signature, status: B.status, corners: B.corners,
  bars: D.bars, linechart: D.linechart, donut: D.donut, progress: D.progress, list: D.list, timeline: D.timeline,
  flow: D.flow, equalizer: D.equalizer,
  code: UI.code, chat: UI.chat, notify: UI.notify, device: UI.device,
  obj3d: FX.obj3d, particles: FX.particles,
};

export const ASPECTS = {
  '9:16': [1080, 1920],
  '4:5': [1080, 1350],
  '1:1': [1080, 1080],
  '16:9': [1920, 1080],
};

export const CAM_CATS = [
  ['basic', 'أساسي'], ['zoom', 'زووم'], ['pan', 'تحريك'], ['crane', 'رافعة'], ['rotate', 'دوران'], ['dolly', 'دوللي'],
  ['kenburns', 'كين بيرنز'], ['handheld', 'كاميرا يد'], ['float', 'طفو'], ['impact', 'ضربات'],
];

export const CAMERAS = [
  ['none', 'ثابتة', 'basic'],
  // zoom
  ['push', 'دفع للأمام', 'zoom'], ['pull', 'سحب للخلف', 'zoom'], ['pushSlow', 'دفع بطيء', 'zoom'], ['pushFast', 'دفع سريع', 'zoom'],
  ['pullSlow', 'سحب بطيء', 'zoom'], ['pullFast', 'سحب سريع', 'zoom'], ['pushSmooth', 'دفع ناعم', 'zoom'], ['pullReveal', 'كشف بالسحب', 'zoom'],
  ['zoomBounce', 'زووم بارتداد', 'zoom'], ['stepZoom', 'زووم درجات', 'zoom'], ['stepZoom2', 'زووم درجتين', 'zoom'], ['punch', 'ضربة', 'zoom'],
  ['punchBeat', 'ضربة كل ثانية', 'zoom'], ['doublePunch', 'ضربتين', 'zoom'], ['crashZoom', 'زووم بالآخر', 'zoom'], ['snapZoom', 'زووم خاطف', 'zoom'],
  ['zoomPulse', 'نبض زووم', 'zoom'],
  // pan
  ['panL', 'تحريك يسار', 'pan'], ['panR', 'تحريك يمين', 'pan'], ['panUp', 'تحريك لفوق', 'pan'], ['panDown', 'تحريك لتحت', 'pan'],
  ['panUL', 'قطري فوق يسار', 'pan'], ['panUR', 'قطري فوق يمين', 'pan'], ['panDL', 'قطري تحت يسار', 'pan'], ['panDR', 'قطري تحت يمين', 'pan'],
  ['panLFast', 'تحريك يسار سريع', 'pan'], ['panRFast', 'تحريك يمين سريع', 'pan'], ['slideL', 'انزلاق يسار مع دفع', 'pan'], ['slideR', 'انزلاق يمين مع دفع', 'pan'],
  // crane
  ['rise', 'رفع', 'crane'], ['craneUp', 'رافعة لفوق', 'crane'], ['craneDown', 'رافعة لتحت', 'crane'], ['craneUpPush', 'رافعة مع دفع', 'crane'],
  ['craneDownPull', 'نزول مع سحب', 'crane'], ['tiltUp', 'ميلان لفوق', 'crane'], ['tiltDown', 'ميلان لتحت', 'crane'],
  // rotate
  ['orbit', 'مدار', 'rotate'], ['orbitIn', 'مدار مع دفع', 'rotate'], ['orbitOut', 'مدار مع سحب', 'rotate'], ['dutchL', 'زاوية مائلة يسار', 'rotate'],
  ['dutchR', 'زاوية مائلة يمين', 'rotate'], ['rollIn', 'لفّة دخول', 'rotate'], ['rollOut', 'لفّة خروج', 'rotate'], ['spiralIn', 'حلزون للداخل', 'rotate'],
  ['spiralOut', 'حلزون للخارج', 'rotate'], ['pendulum', 'بندول', 'rotate'], ['swayRot', 'تمايل دوار', 'rotate'],
  // dolly
  ['dolly', 'دوللي ثلاثي', 'dolly'], ['dollyIn', 'دوللي للداخل', 'dolly'], ['dollyOut', 'دوللي للخارج', 'dolly'], ['dollyLeft', 'دوللي يسار', 'dolly'],
  ['dollyRight', 'دوللي يمين', 'dolly'], ['vertigo', 'دوار (فيرتيغو)', 'dolly'],
  // ken burns
  ['kbTL', 'تقريب لزاوية فوق يسار', 'kenburns'], ['kbTR', 'تقريب لزاوية فوق يمين', 'kenburns'], ['kbBL', 'تقريب لزاوية تحت يسار', 'kenburns'], ['kbBR', 'تقريب لزاوية تحت يمين', 'kenburns'],
  ['kbTLOut', 'ابتعاد من فوق يسار', 'kenburns'], ['kbTROut', 'ابتعاد من فوق يمين', 'kenburns'], ['kbBLOut', 'ابتعاد من تحت يسار', 'kenburns'], ['kbBROut', 'ابتعاد من تحت يمين', 'kenburns'],
  // handheld
  ['shake', 'كاميرا يد', 'handheld'], ['handLight', 'يد خفيفة', 'handheld'], ['handMedium', 'يد متوسطة', 'handheld'], ['handHeavy', 'يد قوية', 'handheld'],
  ['earthquake', 'زلزال', 'handheld'], ['jitter', 'ارتعاش رقمي', 'handheld'], ['walk', 'مشي', 'handheld'], ['drone', 'درون', 'handheld'],
  // float
  ['drift', 'انجراف', 'float'], ['float', 'طفو', 'float'], ['breath', 'تنفّس', 'float'], ['sway', 'تمايل', 'float'],
  ['figure8', 'رقم ثمانية', 'float'], ['wander', 'تجوّل', 'float'], ['hover', 'تحويم', 'float'],
  // impact
  ['whipIn', 'سحبة دخول من اليسار', 'impact'], ['whipInR', 'سحبة دخول من اليمين', 'impact'], ['whipUp', 'سحبة دخول من تحت', 'impact'], ['dropIn', 'سقوط بارتداد', 'impact'],
  ['slamIn', 'ضربة دخول', 'impact'], ['shockwave', 'موجة صدمة', 'impact'], ['bounceIn', 'دخول مطاطي', 'impact'], ['heartbeat', 'نبضة قلب', 'impact'],
];
export const CAMERA_LABEL = Object.fromEntries(CAMERAS.map(([id, lab]) => [id, lab]));

// stateless hash for stepped jitter
const camHash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const cn = (t, seed) => noise2(t, seed) - 0.5; // centered smooth noise
const sym = (v) => (v - 0.5) * 2; // 0..1 -> -1..1

// Each preset writes into c = { s, tx, ty, rot }. tx/ty in design units (frame ≈ 1000 wide), a = cam.amount.
const CAM_FN = {
  push: (c, t, p, a) => { c.s = 1 + 0.075 * a * ease('quadOut', p); },
  pull: (c, t, p, a) => { c.s = 1 + 0.075 * a * (1 - ease('quadOut', p)); },
  pushSlow: (c, t, p, a) => { c.s = 1 + 0.04 * a * p; },
  pushFast: (c, t, p, a) => { c.s = 1 + 0.16 * a * ease('expoOut', clamp(t / 1.2)); },
  pullSlow: (c, t, p, a) => { c.s = 1 + 0.04 * a * (1 - p); },
  pullFast: (c, t, p, a) => { c.s = 1 + 0.2 * a * (1 - ease('expoOut', clamp(t / 1.0))); },
  pushSmooth: (c, t, p, a) => { c.s = 1 + 0.1 * a * ease('cubicInOut', p); },
  pullReveal: (c, t, p, a, d) => { c.s = 1 + 0.35 * a * (1 - ease('quintInOut', clamp(t / Math.max(0.4, d * 0.6)))); },
  zoomBounce: (c, t, p, a) => { c.s = 1 + 0.08 * a * ease('spring', clamp(t / 1.2)); },
  stepZoom: (c, t, p, a, d) => { c.s = 1 + [0.2, 0.45, 0.7].reduce((s, k) => s + 0.05 * a * ease('expoOut', clamp((t - d * k) / 0.35)), 0); },
  stepZoom2: (c, t, p, a, d) => { c.s = 1 + [0.3, 0.65].reduce((s, k) => s + 0.08 * a * ease('expoOut', clamp((t - d * k) / 0.35)), 0); },
  punch: (c, t, p, a) => { c.s = 1 + 0.16 * a * Math.exp(-t * 3.2); },
  punchBeat: (c, t, p, a) => { c.s = 1 + 0.07 * a * Math.exp(-(t % 1) * 6); },
  doublePunch: (c, t, p, a) => { c.s = 1 + 0.1 * a * (Math.exp(-t * 6) + (t > 0.5 ? Math.exp(-(t - 0.5) * 6) : 0)); },
  crashZoom: (c, t, p, a, d) => { c.s = 1 + 0.25 * a * ease('expoIn', clamp((t - d * 0.75) / Math.max(0.1, d * 0.25))); },
  snapZoom: (c, t, p, a) => { c.s = 1 + 0.1 * a * ease('expoOut', clamp(t / 0.35)); },
  zoomPulse: (c, t, p, a) => { c.s = 1 + 0.025 * a * (0.5 - 0.5 * Math.cos((t / 1.2) * Math.PI * 2)); },

  panL: (c, t, p, a) => { c.tx = 46 * a * sym(ease('sineInOut', p)); c.s = 1.05; },
  panR: (c, t, p, a) => { c.tx = -46 * a * sym(ease('sineInOut', p)); c.s = 1.05; },
  panUp: (c, t, p, a) => { c.ty = 40 * a * sym(ease('sineInOut', p)); },
  panDown: (c, t, p, a) => { c.ty = -40 * a * sym(ease('sineInOut', p)); },
  panUL: (c, t, p, a) => { const k = sym(ease('sineInOut', p)); c.tx = 34 * a * k; c.ty = 30 * a * k; },
  panUR: (c, t, p, a) => { const k = sym(ease('sineInOut', p)); c.tx = -34 * a * k; c.ty = 30 * a * k; },
  panDL: (c, t, p, a) => { const k = sym(ease('sineInOut', p)); c.tx = 34 * a * k; c.ty = -30 * a * k; },
  panDR: (c, t, p, a) => { const k = sym(ease('sineInOut', p)); c.tx = -34 * a * k; c.ty = -30 * a * k; },
  panLFast: (c, t, p, a) => { c.tx = 70 * a * sym(ease('expoInOut', p)); },
  panRFast: (c, t, p, a) => { c.tx = -70 * a * sym(ease('expoInOut', p)); },
  slideL: (c, t, p, a) => { const k = ease('sineInOut', p); c.tx = 40 * a * sym(k); c.s = 1 + 0.05 * a * k; },
  slideR: (c, t, p, a) => { const k = ease('sineInOut', p); c.tx = -40 * a * sym(k); c.s = 1 + 0.05 * a * k; },

  rise: (c, t, p, a) => { c.ty = 36 * a * sym(ease('sineInOut', p)); c.s = 1.05; },
  craneUp: (c, t, p, a) => { c.ty = 55 * a * sym(ease('cubicInOut', p)); c.s = 1 + 0.03 * a * p; },
  craneDown: (c, t, p, a) => { c.ty = -55 * a * sym(ease('cubicInOut', p)); c.s = 1 + 0.03 * a * p; },
  craneUpPush: (c, t, p, a) => { const k = ease('cubicInOut', p); c.ty = 40 * a * sym(k); c.s = 1 + 0.09 * a * k; },
  craneDownPull: (c, t, p, a) => { const k = ease('cubicInOut', p); c.ty = -40 * a * sym(k); c.s = 1 + 0.09 * a * (1 - k); },
  tiltUp: (c, t, p, a) => { const k = ease('quadOut', p); c.ty = 30 * a * k; c.s = 1 + 0.03 * a * k; },
  tiltDown: (c, t, p, a) => { const k = ease('quadOut', p); c.ty = -30 * a * k; c.s = 1 + 0.03 * a * k; },

  orbit: (c, t, p, a) => { const k = ease('sineInOut', p) - 0.5; c.rot = k * 0.06 * a; c.tx = k * 36 * a; c.s = 1.07; },
  orbitIn: (c, t, p, a) => { const k = ease('sineInOut', p) - 0.5; c.rot = k * 0.06 * a; c.tx = k * 36 * a; c.s = 1.04 + 0.07 * a * ease('cubicInOut', p); },
  orbitOut: (c, t, p, a) => { const k = ease('sineInOut', p) - 0.5; c.rot = -k * 0.06 * a; c.tx = -k * 36 * a; c.s = 1.04 + 0.07 * a * (1 - ease('cubicInOut', p)); },
  dutchL: (c, t, p, a) => { c.rot = -0.045 * a; c.s = 1 + 0.04 * a * p; },
  dutchR: (c, t, p, a) => { c.rot = 0.045 * a; c.s = 1 + 0.04 * a * p; },
  rollIn: (c, t, p, a) => { c.rot = -0.12 * a * (1 - ease('expoOut', clamp(t / 1.2))); },
  rollOut: (c, t, p, a) => { c.rot = 0.1 * a * ease('cubicIn', p); },
  spiralIn: (c, t, p, a) => { const k = ease('cubicInOut', p); c.rot = 0.08 * a * (1 - k); c.s = 1 + 0.14 * a * k; },
  spiralOut: (c, t, p, a) => { const k = ease('cubicInOut', p); c.rot = -0.08 * a * k; c.s = 1 + 0.14 * a * (1 - k); },
  pendulum: (c, t, p, a) => { c.rot = 0.03 * a * Math.sin((t / 2.6) * Math.PI * 2); },
  swayRot: (c, t, p, a) => { c.rot = 0.015 * a * Math.sin(t * 1.3); c.tx = 8 * a * Math.sin(t * 1.3); },

  dolly: (c, t, p, a) => { const sm = ease('sineInOut', p); c.s = 1 + 0.11 * a * ease('cubicInOut', p); c.rot = (sm - 0.5) * 0.035 * a; c.ty = -sm * 18 * a; },
  dollyIn: (c, t, p, a) => { const k = ease('cubicInOut', p); c.s = 1 + 0.14 * a * k; c.ty = -10 * a * k; },
  dollyOut: (c, t, p, a) => { const k = 1 - ease('cubicInOut', p); c.s = 1 + 0.14 * a * k; c.ty = -10 * a * k; },
  dollyLeft: (c, t, p, a) => { const k = ease('cubicInOut', p); c.tx = 40 * a * sym(k); c.s = 1 + 0.06 * a * k; c.rot = -0.01 * a * k; },
  dollyRight: (c, t, p, a) => { const k = ease('cubicInOut', p); c.tx = -40 * a * sym(k); c.s = 1 + 0.06 * a * k; c.rot = 0.01 * a * k; },
  vertigo: (c, t, p, a) => { const k = ease('cubicInOut', p); c.s = 1 + 0.12 * a * k; c.rot = 0.02 * a * Math.sin(p * Math.PI); c.ty = -6 * a * Math.sin(p * Math.PI); },

  kbTL: (c, t, p, a) => kb(c, p, a, 1, 1, false),
  kbTR: (c, t, p, a) => kb(c, p, a, -1, 1, false),
  kbBL: (c, t, p, a) => kb(c, p, a, 1, -1, false),
  kbBR: (c, t, p, a) => kb(c, p, a, -1, -1, false),
  kbTLOut: (c, t, p, a) => kb(c, p, a, 1, 1, true),
  kbTROut: (c, t, p, a) => kb(c, p, a, -1, 1, true),
  kbBLOut: (c, t, p, a) => kb(c, p, a, 1, -1, true),
  kbBROut: (c, t, p, a) => kb(c, p, a, -1, -1, true),

  shake: (c, t, p, a) => { c.tx = cn(t * 3, 1.7) * 14 * a; c.ty = cn(t * 3, 9.3) * 14 * a; c.rot = cn(t * 2, 4.4) * 0.008 * a; c.s = 1.03; },
  handLight: (c, t, p, a) => { c.tx = cn(t * 1.6, 1.7) * 10 * a; c.ty = cn(t * 1.6, 9.3) * 8 * a; c.rot = cn(t * 1.2, 4.4) * 0.006 * a; },
  handMedium: (c, t, p, a) => { c.tx = cn(t * 2.4, 2.1) * 20 * a; c.ty = cn(t * 2.4, 7.9) * 16 * a; c.rot = cn(t * 1.8, 3.3) * 0.012 * a; },
  handHeavy: (c, t, p, a) => { c.tx = cn(t * 3.5, 5.2) * 36 * a; c.ty = cn(t * 3.5, 6.6) * 30 * a; c.rot = cn(t * 2.6, 8.1) * 0.022 * a; },
  earthquake: (c, t, p, a) => { const k = 0.4 + 0.6 * Math.exp(-t * 1.5); c.tx = cn(t * 14, 1.1) * 28 * a * k; c.ty = cn(t * 14, 2.2) * 22 * a * k; c.rot = cn(t * 10, 3.3) * 0.01 * a * k; },
  jitter: (c, t, p, a) => { const n = Math.floor(t * 10); const on = camHash(n * 7.7) > 0.7 ? 1 : 0; c.tx = (camHash(n * 1.3) - 0.5) * 12 * a * on; c.ty = (camHash(n * 2.9) - 0.5) * 8 * a * on; },
  walk: (c, t, p, a) => { c.ty = (Math.abs(Math.sin(t * Math.PI * 1.8)) - 0.5) * 10 * a; c.tx = Math.sin(t * Math.PI * 0.9) * 8 * a; c.rot = Math.sin(t * Math.PI * 0.9) * 0.006 * a; },
  drone: (c, t, p, a) => { c.tx = cn(t * 0.3, 4.1) * 30 * a; c.ty = cn(t * 0.3, 5.2) * 24 * a; c.s = 1 + 0.04 * a * p; c.rot = cn(t * 0.2, 6.3) * 0.01 * a; },

  drift: (c, t, p, a) => { c.tx = Math.sin(t * 0.5) * 16 * a; c.ty = Math.cos(t * 0.41) * 11 * a; c.rot = Math.sin(t * 0.3) * 0.008 * a; c.s = 1.045; },
  float: (c, t, p, a) => { c.ty = Math.sin(t * 1.1) * 12 * a; c.tx = Math.sin(t * 0.7) * 6 * a; },
  breath: (c, t, p, a) => { c.s = 1 + 0.02 * a + 0.02 * a * Math.sin((t / 4) * Math.PI * 2); },
  sway: (c, t, p, a) => { c.tx = Math.sin(t * 0.9) * 18 * a; c.rot = Math.sin(t * 0.9) * 0.008 * a; },
  figure8: (c, t, p, a) => { c.tx = Math.sin(t * 0.8) * 20 * a; c.ty = Math.sin(t * 1.6) * 10 * a; },
  wander: (c, t, p, a) => { c.tx = cn(t * 0.25, 7.7) * 40 * a; c.ty = cn(t * 0.25, 3.1) * 30 * a; },
  hover: (c, t, p, a) => { c.ty = Math.sin(t * 2.2) * 5 * a; c.s = 1 + 0.01 * a + 0.01 * a * Math.sin(t * 1.1); },

  whipIn: (c, t, p, a) => { c.tx = -110 * a * (1 - ease('expoOut', clamp(t / 0.5))); },
  whipInR: (c, t, p, a) => { c.tx = 110 * a * (1 - ease('expoOut', clamp(t / 0.5))); },
  whipUp: (c, t, p, a) => { c.ty = 110 * a * (1 - ease('expoOut', clamp(t / 0.5))); },
  dropIn: (c, t, p, a) => { c.ty = -90 * a * (1 - ease('bounceOut', clamp(t / 0.9))); },
  slamIn: (c, t, p, a) => { c.s = 1 + 0.35 * a * (1 - ease('expoOut', clamp(t / 0.4))); },
  shockwave: (c, t, p, a) => { const k = Math.exp(-t * 3); c.s = 1 + 0.1 * a * Math.exp(-t * 4); c.tx = cn(t * 12, 1.4) * 20 * a * k; c.ty = cn(t * 12, 4.2) * 20 * a * k; },
  bounceIn: (c, t, p, a) => { c.s = 1 + 0.06 * a * ease('elasticOut', clamp(t / 1.1)); },
  heartbeat: (c, t, p, a) => {
    const f = (t % 1.1) / 1.1;
    const k = Math.exp(-Math.pow((f - 0.1) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((f - 0.3) / 0.05, 2));
    c.s = 1 + 0.04 * a * k;
  },
};
function kb(c, p, a, dx, dy, out) {
  const k = ease('sineInOut', out ? 1 - p : p);
  c.s = 1 + 0.14 * a * k;
  c.tx = dx * 40 * a * k;
  c.ty = dy * 30 * a * k;
}

// Minimum zoom so a full-frame layer never shows an edge after the move
// (frame ≥ 1000 units wide and ≥ 1250 tall; aspect up to 16:9).
function coverScale(c) {
  const r = Math.min(0.4, Math.abs(c.rot));
  const rotF = Math.cos(r) + 1.78 * Math.sin(r);
  // exact for a shift: the scaled frame must still reach the far edge
  return rotF / Math.max(0.35, 1 - (2 * Math.abs(c.tx)) / 1000 - (2 * Math.abs(c.ty)) / 1250);
}

export function cameraAt(cam, t, dur) {
  const c = { s: 1, tx: 0, ty: 0, rot: 0 };
  if (!cam || !cam.type || cam.type === 'none') return c;
  const fn = CAM_FN[cam.type];
  if (!fn) return c;
  const a = cam.amount ?? 1;
  const d = Math.max(0.1, dur || 1);
  const tt = Math.max(0, t);
  fn(c, tt, clamp(tt / d), a, d);
  // keep travel within what a zoom can cover
  c.tx = clamp(c.tx, -260, 260);
  c.ty = clamp(c.ty, -320, 320);
  c.rot = clamp(c.rot, -0.4, 0.4);
  if (!(Number.isFinite(c.s) && Number.isFinite(c.tx) && Number.isFinite(c.ty) && Number.isFinite(c.rot))) return { s: 1, tx: 0, ty: 0, rot: 0 };
  c.s = Math.max(c.s, coverScale(c));
  return c;
}

function applyCam(ctx, cam, k, env) {
  if (!cam || (cam.s === 1 && !cam.tx && !cam.ty && !cam.rot)) return;
  const W = env.W, H = env.H;
  const s = 1 + (cam.s - 1) * k;
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot * k);
  ctx.scale(s, s);
  ctx.translate(-W / 2 + cam.tx * env.U * k, -H / 2 + cam.ty * env.U * k);
}

// Design unit. Templates are composed for 4:5; on squat frames (1:1, 16:9) the unit
// shrinks with the height so the same vertical layout still fits.
export const unitFor = (W, H) => Math.min(W, H * 0.8) / 1000;

let measure = null;
export function createEnv(project, W, H, px, extra = {}) {
  if (!measure) measure = makeCanvas(8, 8).getContext('2d');
  return {
    W, H, px, U: unitFor(W, H),
    theme: resolveTheme(project),
    images: extra.images || new Map(),
    mctx: measure,
    backdrop: extra.backdrop ?? true,
    collect: null,
  };
}

export function measureEl(el, env) {
  const R = ELEMENTS[el.type];
  if (!R) return { w: 10, h: 10, bx: 0, by: 0 };
  try { return R.measure(el, env); } catch (e) { return { w: 10, h: 10, bx: 0, by: 0 }; }
}

export function drawElement(ctx, el, t, dur, env, cam) {
  const R = ELEMENTS[el.type];
  if (!R || el.hidden) return;
  const U = env.U;
  const b = measureEl(el, env);
  const splitText = el.type === 'text' && el.split && el.split !== 'none';
  let tr;
  if (splitText) {
    tr = identity();
    applyLoop(tr, el.anim, t, null, false);
  } else {
    tr = unitTransform(el.anim, t, dur, { i: 0, n: 1, w: b.w / U, h: b.h / U }).tr;
    applyLoop(tr, el.anim, t, null, false);
  }
  ctx.save();
  applyCam(ctx, cam, 1 + (el.z || 0), env);
  ctx.translate((el.x ?? 0.5) * env.W, (el.y ?? 0.5) * env.H);
  if (el.rot) ctx.rotate((el.rot * Math.PI) / 180);
  if (el.flipX) ctx.scale(-1, 1);
  if (env.collect) env.collect.push({ id: el.id, m: ctx.getTransform(), b });
  const alpha = (el.opacity ?? 1) * tr.alpha;
  if (alpha > 0.002) {
    applyTransform(ctx, tr, b.bx, b.by, b.w, b.h, U);
    ctx.globalAlpha *= clamp(alpha);
    if (el.blend && el.blend !== 'normal') ctx.globalCompositeOperation = el.blend;
    applyClip(ctx, tr, b.w, b.h, U);
    const body = (c) => {
      c.translate(-b.bx, -b.by);
      try { R.draw(c, el, env, t, dur, tr); } catch (e) { if (env.onError) env.onError(el, e); }
    };
    if (tr.blur > 0.4) withBlur(ctx, env, tr.blur, b.w * 1.1, b.h * 1.1, body);
    else body(ctx);
  }
  ctx.restore();
}

export function renderScene(ctx, scene, t, env) {
  ctx.save();
  ctx.setTransform(env.px, 0, 0, env.px, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  const cam = env.noCamera ? null : cameraAt(scene.camera, t, scene.duration);
  ctx.save();
  if (cam) applyCam(ctx, cam, 0.45, env);
  drawBackground(ctx, scene.bg, t, env, scene.duration);
  ctx.restore();
  for (const el of scene.elements || []) drawElement(ctx, el, t, scene.duration, env, cam);
  drawOverlay(ctx, scene.fx, t, env);
  ctx.restore();
}

export function timeline(project) {
  let t = 0;
  const items = [];
  for (const s of project.scenes) {
    items.push({ scene: s, start: t, end: t + s.duration });
    t += s.duration;
  }
  return { items, total: t };
}

export function sceneAt(project, t) {
  const tl = timeline(project);
  if (!tl.items.length) return null;
  t = clamp(t, 0, Math.max(0, tl.total - 1e-4));
  let i = tl.items.findIndex((it) => t >= it.start && t < it.end);
  if (i < 0) i = tl.items.length - 1;
  return { i, local: t - tl.items[i].start, tl };
}

const bufs = { A: null, B: null };
function buf(name, w, h) {
  let c = bufs[name];
  if (!c || c.width !== w || c.height !== h) { c = makeCanvas(w, h); bufs[name] = c; }
  return c;
}

export function renderFrame(ctx, project, t, env) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const at = sceneAt(project, t);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.restore();
  if (!at) return;
  const { i, local, tl } = at;
  const scene = tl.items[i].scene;
  const tr = scene.transition;
  if (i > 0 && tr && tr.type && tr.type !== 'cut' && local < (tr.dur ?? 0.7) && !env.noTransitions) {
    const prev = tl.items[i - 1];
    const A = buf('A', cw, ch), Bc = buf('B', cw, ch);
    const actx = A.getContext('2d'), bctx = Bc.getContext('2d');
    const keep = env.collect;
    env.collect = null;
    renderScene(actx, prev.scene, prev.scene.duration + local, env);
    env.collect = keep;
    renderScene(bctx, scene, local, env);
    composite(ctx, tr, clamp(local / (tr.dur ?? 0.7)), A, Bc, env);
  } else {
    renderScene(ctx, scene, local, env);
  }
  drawWatermark(ctx, env, project);
}

// When every entrance has finished: the best moment to edit a scene.
export function holdTime(scene, env) {
  let end = 0.4, outMax = 0;
  for (const el of scene.elements || []) {
    const a = el.anim || {};
    let n = 1;
    if (el.type === 'list') n = (el.items || []).length;
    let w = inWindow(a, n);
    if (el.type === 'counter') w = { end: (a.start ?? 0) + (el.countDur ?? 1.8) + 0.1 };
    if (el.type === 'code') w = { end: (a.start ?? 0) + ((el.lines || []).join('').length + 4 * (el.lines || []).length) / (el.cps ?? 40) + 0.5 };
    if (el.type === 'chat') w = { end: (a.start ?? 0) + (el.messages || []).length * ((el.interval ?? 1.1) + 0.75) };
    if (el.type === 'flow') w = { end: (a.start ?? 0) + (el.nodes || [1, 2, 3]).length * (a.stagger ?? 0.4) + 0.6 };
    if (el.type === 'text' && el.split && el.split !== 'none') {
      let units = 12;
      if (env) { try { units = textMetrics(el, env).units.length; } catch (e) { /* keep estimate */ } }
      w = inWindow(a, units);
    }
    if (el.type === 'text' && a.in === 'typewriter') w = { end: (a.start ?? 0) + (a.dur ?? 0.7) };
    end = Math.max(end, Math.min(w.end, scene.duration * 0.85));
    if (a.out && a.out !== 'none') outMax = Math.max(outMax, (a.outDur ?? 0.45) + 0.1);
  }
  return clamp(end + 0.15, 0, Math.max(0, scene.duration - outMax - 0.05));
}

export { textMetrics };
