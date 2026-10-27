// Scene transitions: composite outgoing frame A and incoming frame B at progress p.
// scene.transition = { type: presetId, dur, …overrides } — any field set on it overrides the preset.
import { ease } from './util.js';
import { F } from './tr-families.js';
import { PRESETS, TR_CATS } from './tr-presets.js';

export { TR_CATS };
export const TRANSITIONS = PRESETS.map((p) => [p.id, p.label, p.cat]);
export const TRANSITION_LABEL = Object.fromEntries(PRESETS.map((p) => [p.id, p.label]));
const BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

const FAM_EASE = {
  fade: 'sineInOut', blur: 'sineInOut', tiles: 'sineInOut', blinds: 'sineInOut', slices: 'sineInOut', venetian: 'sineInOut',
  bubbles: 'sineInOut', mask: 'sineInOut', softwipe: 'cubicInOut', dust: 'linear', shatter: 'linear', assemble: 'linear',
  sand: 'linear', melt: 'linear', glitch: 'linear', cut: 'linear', dip: 'linear', panel: 'linear', colorShape: 'linear',
  leak: 'sineInOut', bloom: 'sineInOut', flare: 'sineInOut', sunrise: 'sineInOut', ripple: 'sineInOut', page: 'cubicInOut',
  shape: 'cubicInOut', wipe: 'cubicInOut', clock: 'cubicInOut', iris: 'cubicInOut', barn: 'cubicInOut', curtain: 'cubicInOut', fold: 'cubicInOut', door: 'cubicInOut',
};
const FAM_SOUND = {
  cut: '', fade: 'whoosh-soft', blur: 'whoosh-soft', dip: 'whoosh-soft', push: 'whoosh', cover: 'whoosh', uncover: 'whoosh',
  whip: 'whoosh', stack: 'whoosh', carousel: 'whoosh', tilt: 'whoosh', zoom: 'whoosh', spin: 'whoosh', shape: 'swish',
  bubbles: 'pop', wipe: 'swish', softwipe: 'swish', clock: 'swish', iris: 'swish', barn: 'swish', doors: 'whoosh',
  curtain: 'swish', blinds: 'swish', slices: 'swish', venetian: 'click', tiles: 'pop', pixel: 'glitch', flip: 'whoosh',
  cube: 'whoosh', door: 'whoosh', page: 'swish', fold: 'swish', cardfly: 'whoosh', glitch: 'glitch', ripple: 'whoosh-soft',
  stretch: 'whoosh', swirl: 'whoosh', melt: 'swish', wobble: 'whoosh-soft', flash: 'whoosh', leak: 'whoosh-soft',
  flare: 'whoosh', bloom: 'whoosh-soft', strobe: 'glitch', sunrise: 'chime', panel: 'whoosh', colorShape: 'pop',
  shatter: 'thud', dust: 'swish', assemble: 'whoosh', sand: 'thud', mask: 'swish',
};
// suggested sound per preset (empty = silent)
export const TR_SOUND = Object.fromEntries(PRESETS.map((p) => [p.id, p.sound ?? FAM_SOUND[p.fam] ?? 'whoosh']));
export const TR_FAMILY = Object.fromEntries(PRESETS.map((p) => [p.id, p.fam]));

const DIR_ANGLE = { right: 0, downright: 45, down: 90, downleft: 135, left: 180, upleft: 225, up: 270, upright: 315 };
const ANGLED = new Set(['wipe', 'softwipe', 'panel']);

export function resolveTransition(tr) {
  const pre = BY_ID[tr && tr.type] || BY_ID.fade;
  const P = { ...pre.params };
  for (const k in tr) if (k !== 'type' && k !== 'dur' && tr[k] !== undefined && tr[k] !== null) P[k] = tr[k];
  if (ANGLED.has(pre.fam) && tr.dir && tr.angle === undefined && DIR_ANGLE[tr.dir] !== undefined) P.angle = DIR_ANGLE[tr.dir];
  return { pre, P };
}

export function composite(ctx, tr, p, A, B, env) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const { pre, P } = resolveTransition(tr || {});
  const e = ease(P.ease || FAM_EASE[pre.fam] || 'quintInOut', p);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.imageSmoothingEnabled = true;
  const fn = F[pre.fam] || F.fade;
  fn({ ctx, A, B, p, e, P, env, cw, ch });
  ctx.restore();
}
