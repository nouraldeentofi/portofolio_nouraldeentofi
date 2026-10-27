// Authoring helpers for templates. Positions are fractions of the frame,
// sizes are design units (1/1000 of the short side). Elements draw in array order.
import { BG_PRESETS } from '../engine/backgrounds.js';

// background from the preset library: bgp('id', { overrides })
export const bgp = (id, o = {}) => {
  const p = BG_PRESETS.find((x) => x.id === id);
  if (!p) { if (typeof console !== 'undefined') console.warn('unknown background preset ' + id); return { type: 'mesh', ...o }; }
  return { ...JSON.parse(JSON.stringify(p.bg)), preset: id, ...o };
};

export const A = (inName = 'rise', start = 0.3, o = {}) => ({ in: inName, start, dur: 0.8, ...o });

export const text = (t, o = {}) => ({ type: 'text', text: t, x: 0.5, y: 0.5, size: 84, weight: 800, w: 880, align: 'center', ...o });
export const shape = (s, o = {}) => ({ type: 'shape', shape: s, x: 0.5, y: 0.5, ...o });
export const el = (type, o = {}) => ({ type, x: 0.5, y: 0.5, ...o });

// brand motifs
export const tag = (t, o = {}) => text(t, { font: '@mono', size: 32, weight: 500, color: '@secondary', w: 600, anim: A('typewriter', 0.1, { dur: 0.7 }), ...o });
export const status = (label = 'live', o = {}) => el('status', { label, size: 28, x: 0.2, y: 0.08, anim: A('fade', 0.2), ...o });
export const sig = (o = {}) => el('signature', { y: 0.93, size: 30, anim: A('draw', 1.2, { dur: 1.2 }), ...o });
export const veil = (o = {}) => el('glow', { w: 1100, h: 700, color: '@bg', alpha: 0.6, anim: A('none', 0), ...o });
export const glowAt = (x, y, o = {}) => el('glow', { x, y, w: 900, h: 900, color: '@accent', alpha: 0.22, anim: A('fade', 0, { dur: 1.4 }), ...o });

export function tpl(id, name, cat, scene, meta = {}) {
  return {
    id,
    name,
    cat,
    tags: meta.tags || '',
    transition: meta.transition,
    scene: {
      duration: 5,
      bg: { type: 'mesh' },
      camera: { type: 'push', amount: 0.8 },
      fx: {},
      ...scene,
    },
  };
}
