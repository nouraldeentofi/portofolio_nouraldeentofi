// Remix tools: cohesive random motion for a whole scene, and RTL mirroring.
import { rng } from '../engine/util.js';

const STYLES = {
  cinematic: { text: ['riseBlur', 'pushIn', 'blurIn', 'track', 'maskUp'], other: ['pushIn', 'riseBlur', 'blurIn', 'zoomOut'], split: ['word', 'line', 'none'], cam: ['dolly', 'push', 'drift'], ease: 'quintOut' },
  kinetic: { text: ['slam', 'maskUp', 'stretch', 'skew', 'scatter'], other: ['slam', 'pop', 'stretch', 'zoomRot'], split: ['word', 'letter'], cam: ['punch', 'push', 'shake'], ease: 'expoOut' },
  clean: { text: ['riseSoft', 'maskUp', 'fade', 'rise'], other: ['riseSoft', 'fade', 'rise', 'wipeR'], split: ['word', 'line'], cam: ['push', 'none', 'drift'], ease: 'brand' },
  playful: { text: ['wave', 'pop', 'letterDrop', 'elastic', 'bounce'], other: ['pop', 'elastic', 'popRotate', 'bounce'], split: ['letter', 'word'], cam: ['orbit', 'drift'], ease: 'auto' },
  tech: { text: ['scramble', 'typewriter', 'glitch', 'maskLeft', 'flicker'], other: ['wipeR', 'glitch', 'flicker', 'iris'], split: ['none', 'word'], cam: ['push', 'panL', 'drift'], ease: 'auto' },
  depth: { text: ['tilt', 'flipX', 'zoomIn', 'zoomRot'], other: ['tilt', 'flipY', 'zoomIn', 'spin'], split: ['word', 'line'], cam: ['dolly', 'orbit', 'pull'], ease: 'auto' },
};
const DRAWN = new Set(['signature', 'corners', 'obj3d']);
const SELF_ANIMATED = new Set(['flow', 'timeline', 'chat', 'bars', 'linechart', 'donut', 'progress', 'code', 'list', 'particles', 'glow', 'ticker', 'equalizer']);

export function randomizeMotion(scene, seed = Date.now()) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const names = Object.keys(STYLES);
  const st = STYLES[pick(names)];
  let t = 0.15;
  for (const e of scene.elements || []) {
    const a = (e.anim = e.anim || {});
    if (DRAWN.has(e.type)) { a.in = 'draw'; a.start = t; t += 0.2; continue; }
    if (e.type === 'shape' && ['line', 'arrow', 'curve', 'wave', 'zigzag', 'bracket', 'ring', 'arc'].includes(e.shape)) { a.in = 'draw'; a.start = t; t += 0.15; continue; }
    if (SELF_ANIMATED.has(e.type)) { a.in = pick(['fade', 'riseSoft', 'pushIn']); a.start = t; t += 0.25; continue; }
    if (e.type === 'text') {
      a.in = pick(st.text);
      a.split = a.in === 'typewriter' || a.in === 'scramble' || a.in === 'track' ? 'none' : pick(st.split);
      a.stagger = a.split === 'letter' ? 0.025 + r() * 0.02 : a.split === 'word' ? 0.06 + r() * 0.05 : 0.12;
      a.dur = a.in === 'typewriter' ? Math.min(2.2, 0.04 * (e.text || '').length + 0.3) : 0.6 + r() * 0.4;
    } else {
      a.in = pick(st.other);
      a.dur = 0.6 + r() * 0.4;
    }
    a.ease = st.ease === 'auto' ? 'auto' : st.ease;
    a.start = +t.toFixed(2);
    t += 0.18 + r() * 0.16;
  }
  scene.camera = { type: pick(st.cam), amount: 0.8 + r() * 0.5 };
  return scene;
}

export function mirrorScene(scene) {
  for (const e of scene.elements || []) {
    if (e.x != null) e.x = +(1 - e.x).toFixed(4);
    if (e.rot) e.rot = -e.rot;
    if (e.type === 'flow' && e.nodes) e.nodes.forEach((n) => (n.x = -(n.x || 0)));
    if (e.align === 'left') e.align = 'right';
    else if (e.align === 'right') e.align = 'left';
  }
  return scene;
}
