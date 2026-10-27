// Art pack: 3D scenes, abstract compositions, promos, photo layouts, occasions and social cards.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl, bgp } from './kit.js';

// rotate a local offset (design units) by deg, return frame-fraction deltas (1000 × 1250 units)
function off(dxU, dyU, deg) {
  const r = (deg * Math.PI) / 180;
  return [(dxU * Math.cos(r) - dyU * Math.sin(r)) / 1000, (dxU * Math.sin(r) + dyU * Math.cos(r)) / 1250];
}

const pill = (t, o = {}) => text(t, { size: 44, weight: 700, color: '@ink', box: { fill: '@accent', padX: 48, padY: 20, radius: 40 }, ...o });
const WHITE = '#FFFFFF';
const WHITE_DIM = 'rgba(255,255,255,0.7)';
const INK = '#2A2622';

// hanging lantern: every part shares one anim so the float loop moves them together
function lantern(x, yb, s, start, phase) {
  const a = A('drop', start, { dur: 1.3, ease: 'backOutSoft', loop: 'float', loopAmp: 1.3, phase });
  const fy = (u) => yb + (u * s) / 1250;
  const top = fy(-144);
  return [
    shape('line', { x, y: top / 2, w: top * 1250, rot: 90, stroke: '@fg/0.35', strokeW: 3, anim: a }),
    shape('ring', { x, y: fy(-132), w: 28 * s, strokeW: 4, stroke: '@accent', anim: a }),
    shape('triangle', { x, y: fy(-100), w: 84 * s, h: 48 * s, fill: '@accent', anim: a }),
    el('glow', { x, y: yb, w: 280 * s, h: 280 * s, color: '@accent', alpha: 0.45, anim: a }),
    shape('polygon', { x, y: yb, w: 120 * s, h: 150 * s, sides: 6, fill: '@accent/0.22', stroke: '@accent', strokeW: 4, glow: 0.5, anim: a }),
    shape('rect', { x, y: fy(84), w: 76 * s, h: 16 * s, radius: 6, fill: '@accent', anim: a }),
    shape('circle', { x, y: fy(104), w: 18 * s, fill: '@accent', anim: a }),
  ];
}

// pricing column
function plan(x, name, price, f1, f2, start, hot) {
  const a = A('rise', start, { dur: 0.9, ease: 'backOutSoft' });
  return [
    shape('rect', { x, y: 0.5, w: 290, h: hot ? 680 : 600, radius: 34, fill: hot ? '@raised' : '@card', stroke: hot ? '@accent' : null, strokeW: 4, shadow: hot ? 1.2 : 0.7, anim: a }),
    hot ? text('الأكتر طلباً', { x, y: 0.228, size: 26, weight: 700, color: '@ink', w: 260, box: { fill: '@accent', padX: 24, padY: 10, radius: 20 }, anim: A('pop', start + 0.5) }) : null,
    text(name, { x, y: 0.32, size: 36, weight: 700, w: 250, color: hot ? '@accent' : '@fg', anim: a }),
    text(price, { x, y: 0.41, size: 84, font: '@display', w: 260, anim: a, sfx: hot ? 'cash' : 'none' }),
    text('بالشهر', { x, y: 0.475, size: 26, weight: 400, color: '@muted', w: 250, anim: a }),
    shape('line', { x, y: 0.525, w: 200, stroke: '@fg/0.12', strokeW: 2, anim: a }),
    text(f1, { x, y: 0.585, size: 28, weight: 600, w: 250, anim: a }),
    text(f2, { x, y: 0.645, size: 28, weight: 500, color: '@muted', w: 250, anim: a }),
  ].filter(Boolean);
}

// honeycomb of icon cells, centre one is the hero
function hive(cy, start) {
  const r = 104;
  const dx = (Math.sqrt(3) * r) / 1000, dy = (1.5 * r) / 1250;
  const cells = [[0, 0, 'bot'], [1, 0, 'mail'], [-1, 0, 'database'], [0.5, -1, 'cloud'], [-0.5, -1, 'chart'], [-0.5, 1, 'code'], [0.5, 1, 'bell']];
  return cells.flatMap(([cx, cyy, name], i) => {
    const x = 0.5 + cx * dx, y = cy + cyy * dy, hot = i === 0;
    const a = A('pop', start + i * 0.14, { dur: 0.6, ease: 'backOut' });
    return [
      shape('polygon', { x, y, w: 190, h: 190, sides: 6, fill: hot ? '@accent' : '@card', stroke: hot ? null : '@fg/0.14', strokeW: 2, shadow: 0.6, glow: hot ? 0.6 : 0, anim: a, sfx: hot ? 'pop-low' : 'bubble', sfxVol: hot ? 1 : 0.5 }),
      el('icon', { name, x, y, size: 70, color: hot ? '@ink' : '@fg', strokeW: 2.2, anim: a }),
    ];
  });
}

// film strip column with three frames
function filmstrip(x, start) {
  const fr = [0.2, 0.48, 0.76];
  return [
    shape('rect', { x, y: 0.5, w: 560, h: 1400, fill: '#141414', shadow: 1, anim: A('wipeDown', start, { dur: 1 }) }),
    shape('dots', { x: x - 0.25, y: 0.5, w: 10, h: 1320, cols: 1, rows: 22, dot: 10, fill: '#E9E4DA', anim: A('fade', start + 0.4) }),
    shape('dots', { x: x + 0.25, y: 0.5, w: 10, h: 1320, cols: 1, rows: 22, dot: 10, fill: '#E9E4DA', anim: A('fade', start + 0.4) }),
    ...fr.map((y, i) => el('image', { x, y, w: 420, h: 315, radius: 4, kenburns: 0.1, anim: A('wipeDown', start + 0.6 + i * 0.35, { dur: 0.7 }), sfx: 'camera', sfxVol: 0.6 })),
  ];
}

// postage stamp: paper, perforation line, photo and caption sharing one rotation
function stamp(x, y, rot, start) {
  const a = A('drop', start, { dur: 1, ease: 'backOutSoft' });
  const [ix, iy] = off(0, -40, rot);
  const [cx, cy] = off(0, 300, rot);
  return [
    shape('rect', { x, y, w: 580, h: 720, radius: 4, rot, fill: '#FBF8F2', shadow: 1.1, anim: a, sfx: 'paper' }),
    shape('rect', { x, y, w: 540, h: 680, radius: 2, rot, fill: 'none', stroke: '#B9AF9F', strokeW: 3, dash: [10, 9], anim: a }),
    el('image', { x: x + ix, y: y + iy, w: 480, h: 540, radius: 2, rot, filter: 'warm', anim: a }),
    text('POST · 2026 · 25', { x: x + cx, y: y + cy, rot, font: '@mono', size: 28, weight: 600, color: '#3A332B', w: 460, anim: a }),
  ];
}

// image tile with a small day label on its reading-start corner
function tile(x, y, w, h, start, label) {
  return [
    el('image', { x, y, w, h, radius: 18, shadow: 0.6, kenburns: 0.12, anim: A('zoomOut', start, { dur: 0.8 }), sfx: 'camera', sfxVol: 0.5 }),
    text(label, { x: x + w / 2000 - 0.07, y: y - h / 2500 + 0.032, size: 24, weight: 700, w: 160, color: '@fg', box: { fill: '@bg/0.75', padX: 16, padY: 8, radius: 14 }, anim: A('fade', start + 0.4) }),
  ];
}

// icon + count group for social cards
function stat(x, y, name, to, o = {}, start = 1.6) {
  return [
    el('icon', { name, x: x - 0.045, y, size: 40, color: o.color || '@muted', filled: o.filled, anim: A('pop', start), sfx: o.sfx || 'none' }),
    el('counter', { x: x + 0.035, y, from: 0, to, decimals: o.decimals ?? 0, suffix: o.suffix || '', size: 32, font: '@mono', color: o.color || '@muted', anim: A('fade', start), countDur: 1.2 }),
  ];
}

export const ART = [
  // ================================================================ 3d
  tpl('ar-3d-torus-portal', 'بوابة دونات', '3d', {
    duration: 6, bg: bgp('tunnel-deep'), camera: { type: 'dollyIn', amount: 0.7 }, fx: { grain: 0.35, vignette: 0.5 },
    elements: [
      glowAt(0.5, 0.4, { w: 1000, h: 1000, alpha: 0.3 }),
      el('obj3d', { shape: 'torus', y: 0.4, size: 700, speed: 0.55, tilt: -0.6, glow: 0.7, anim: A('zoomIn', 0.1, { dur: 1.4 }), sfx: 'whoosh-deep' }),
      tag('// one portal, every tool', { y: 0.09 }),
      text('كل أدواتك من *بوابة وحدة*', { y: 0.7, size: 72, w: 800, anim: A('riseBlur', 1.1, { split: 'word', stagger: 0.1 }), sfx: 'whoosh-soft' }),
      text('Gmail · Sheets · Slack · CRM', { y: 0.82, size: 34, font: '@mono', weight: 500, color: '@muted', w: 800, anim: A('track', 1.9, { dur: 1 }) }),
      sig(),
    ],
  }, { tags: '3d torus portal دونات بوابة', transition: 'zoomThrough' }),

  tpl('ar-3d-data-city', 'مدينة الداتا', '3d', {
    duration: 6, bg: bgp('blocks-city'), camera: { type: 'craneUp', amount: 0.7 }, fx: { vignette: 0.4 },
    elements: [
      veil({ y: 0.3, w: 1100, h: 800, alpha: 0.7 }),
      tag('// your data skyline', { y: 0.08 }),
      text('كل *برج* عميل جديد', { y: 0.17, size: 86, anim: A('maskUp', 0.3, { split: 'word', stagger: 0.12 }) }),
      el('obj3d', { shape: 'grid3d', y: 0.42, size: 440, speed: 0.4, style: 'dots', glow: 0.5, anim: A('draw', 0.6, { dur: 1.6 }), sfx: 'data' }),
      el('counter', { y: 0.66, from: 0, to: 128, size: 170, font: '@display', color: '@accent', glow: 0.4, anim: A('pop', 1.4), countDur: 1.6, sfx: 'count-blip' }),
      text('عميل هالسنة، وكلهم بالـ CRM', { y: 0.76, size: 40, weight: 500, color: '@muted', anim: A('riseSoft', 2) }),
      sig(),
    ],
  }, { tags: '3d city data grid مدينة داتا', transition: 'cube-up' }),

  tpl('ar-3d-gyro-rings', 'جيروسكوب', '3d', {
    duration: 6, bg: bgp('orbits-flat'), camera: { type: 'orbitOut', amount: 0.7 },
    elements: [
      glowAt(0.5, 0.4, { alpha: 0.2 }),
      el('obj3d', { shape: 'rings', y: 0.4, size: 760, speed: 0.9, style: 'lines', glow: 0.6, anim: A('zoomRot', 0.1, { dur: 1.5 }), sfx: 'whoosh-long' }),
      el('obj3d', { shape: 'sphere', y: 0.4, size: 230, speed: -0.6, style: 'dots', color: '@fg', color2: '@accent', anim: A('pop', 0.8), sfx: 'pop-low' }),
      text('الشغل كله *بتوازن*', { y: 0.74, size: 84, w: 800, anim: A('blurIn', 1.3, { split: 'word', stagger: 0.12 }) }),
      text('Clients · Code · Life', { y: 0.81, size: 34, font: '@mono', weight: 500, color: '@secondary', w: 700, anim: A('fade', 2) }),
      sig(),
    ],
  }, { tags: '3d rings gyro balance حلقات توازن', transition: 'spin-full' }),

  tpl('ar-3d-cube-pipeline', 'مكعبات المراحل', '3d', {
    duration: 6.5, bg: bgp('iso-grid'), camera: { type: 'slideL', amount: 0.5 },
    elements: [
      tag('// 3-step pipeline', { y: 0.09 }),
      text('من *داتا خام* لنتيجة جاهزة', { y: 0.19, size: 76, anim: A('rise', 0.3, { split: 'word', stagger: 0.08 }) }),
      el('obj3d', { shape: 'cube', x: 0.8, y: 0.47, size: 190, speed: 0.7, color: '@fg', color2: '@muted', anim: A('pop', 0.9), sfx: 'pop-low' }),
      shape('arrow', { x: 0.652, y: 0.47, w: 70, head: 18, rot: 180, stroke: '@muted', strokeW: 5, anim: A('draw', 1.3, { dur: 0.4 }) }),
      el('obj3d', { shape: 'cube', x: 0.48, y: 0.47, size: 240, speed: 0.7, color: '@secondary', color2: '@fg', anim: A('pop', 1.5), sfx: 'pop' }),
      shape('arrow', { x: 0.335, y: 0.47, w: 56, head: 16, rot: 180, stroke: '@muted', strokeW: 5, anim: A('draw', 1.9, { dur: 0.4 }) }),
      el('obj3d', { shape: 'cube', x: 0.17, y: 0.47, size: 280, speed: 0.7, glow: 0.6, anim: A('pop', 2.1), sfx: 'pop-high' }),
      text('داتا', { x: 0.8, y: 0.62, size: 40, weight: 700, w: 240, anim: A('rise', 1.1) }),
      text('منطق', { x: 0.48, y: 0.62, size: 40, weight: 700, w: 240, anim: A('rise', 1.7) }),
      text('نتيجة', { x: 0.17, y: 0.62, size: 40, weight: 800, w: 240, color: '@accent', anim: A('rise', 2.3) }),
      text('كل مرحلة مكعب، وكل مكعب workflow', { y: 0.79, size: 40, weight: 500, color: '@muted', anim: A('riseSoft', 2.8) }),
      sig(),
    ],
  }, { tags: '3d cube pipeline steps مكعب مراحل', transition: 'cube-right' }),

  tpl('ar-3d-synth-sun', 'شمس سينثويف', '3d', {
    duration: 6, bg: bgp('floor-nosun'), camera: { type: 'rise', amount: 0.6 }, fx: { scanlines: 0.4, grain: 0.3 },
    elements: [
      glowAt(0.5, 0.34, { w: 800, h: 800, alpha: 0.35 }),
      el('obj3d', { shape: 'globe', y: 0.34, size: 500, speed: 0.35, glow: 0.8, anim: A('rise', 0.2, { dur: 1.4 }), sfx: 'riser' }),
      status('shipping', { x: 0.2, y: 0.08 }),
      text('*SHIP IT*', { y: 0.62, size: 140, font: 'Unbounded', weight: 800, hl: 'gradient', w: 900, anim: A('letterDrop', 1.0, { split: 'letter', stagger: 0.05 }), sfx: 'impact-soft' }),
      text('كل جمعة بطلّع شي جديد', { y: 0.74, size: 54, weight: 700, anim: A('riseBlur', 1.8, { split: 'word', stagger: 0.08 }) }),
      text('v1.0 → v1.1 → v2.0', { y: 0.81, font: '@mono', size: 32, weight: 500, color: '@secondary', w: 700, anim: A('typewriter', 2.4, { dur: 0.8 }), sfx: 'type-soft' }),
      sig(),
    ],
  }, { tags: '3d synthwave retro sun ship سينثويف', transition: 'glitch-vhs' }),

  tpl('ar-3d-terrain-peak', 'قمة الأرقام', '3d', {
    duration: 6, bg: bgp('terrain-high'), camera: { type: 'drone', amount: 0.6 }, fx: { vignette: 0.3 },
    elements: [
      veil({ y: 0.28, h: 760, alpha: 0.55 }),
      tag('// zero to peak', { y: 0.08 }),
      el('icon', { name: 'flag', y: 0.18, size: 96, color: '@accent', glow: 0.6, anim: A('drop', 0.4, { ease: 'backOutSoft' }), sfx: 'stamp' }),
      el('counter', { y: 0.31, from: 0, to: 10000, prefix: '+', size: 180, font: '@display', color: '@fg', glow: 0.3, anim: A('zoomIn', 0.8), countDur: 2, sfx: 'count-blip' }),
      text('متابع خلال *12 شهر*', { y: 0.42, size: 70, anim: A('riseBlur', 1.5, { split: 'word', stagger: 0.1 }) }),
      text('بلا إعلانات. محتوى وبس.', { y: 0.5, size: 38, weight: 500, color: '@muted', anim: A('fade', 2.2) }),
      sig(),
    ],
  }, { tags: '3d terrain mountain peak growth قمة', transition: 'sunrise' }),

  tpl('ar-3d-dot-planet', 'أفق كوكب', '3d', {
    duration: 6.5, bg: bgp('galaxy-spiral'), camera: { type: 'rollIn', amount: 0.5 },
    elements: [
      el('obj3d', { shape: 'globe', y: 1.1, size: 1500, speed: 0.12, tilt: -0.2, style: 'dots', glow: 0.4, anim: A('rise', 0, { dur: 1.6 }), sfx: 'whoosh-up' }),
      glowAt(0.5, 0.62, { w: 1200, h: 500, alpha: 0.22 }),
      tag('// requests per month', { y: 0.12 }),
      el('counter', { y: 0.26, from: 0, to: 1.2, decimals: 1, suffix: 'M', size: 220, font: '@display', color: '@accent', glow: 0.5, anim: A('pop', 0.7), countDur: 1.8, sfx: 'data' }),
      text('طلب بالشهر، *بلا ولا سيرفر*', { y: 0.38, size: 70, anim: A('riseBlur', 1.4, { split: 'word', stagger: 0.1 }) }),
      text('كله serverless وكله أوتوماتيك', { y: 0.45, size: 38, weight: 500, color: '@muted', anim: A('fade', 2.1) }),
      sig(),
    ],
  }, { tags: '3d planet horizon dots كوكب', transition: 'twist' }),

  tpl('ar-3d-glass-orb', 'كرة زجاجية', '3d', {
    duration: 6, bg: bgp('nebula-faint'), camera: { type: 'vertigo', amount: 0.6 }, fx: { grain: 0.3 },
    elements: [
      text('AI', { y: 0.38, size: 520, font: 'Unbounded', weight: 800, color: '@fg/0.07', w: 900, anim: A('fade', 0, { dur: 1.2 }) }),
      glowAt(0.5, 0.38, { w: 700, h: 700, alpha: 0.3 }),
      shape('circle', { y: 0.38, w: 560, glass: true, anim: A('zoomIn', 0.3, { dur: 1 }), sfx: 'reveal' }),
      shape('ring', { y: 0.38, w: 560, strokeW: 2, stroke: '@fg/0.3', anim: A('draw', 0.5, { dur: 1.2 }) }),
      el('obj3d', { shape: 'icosa', y: 0.38, size: 360, speed: 0.6, glow: 0.7, anim: A('draw', 0.7, { dur: 1.6 }) }),
      veil({ y: 0.77, w: 1100, h: 520, alpha: 0.85 }),
      text('نموذج واحد، *ألف مهمة*', { y: 0.72, size: 80, w: 800, anim: A('rise', 1.4, { split: 'word', stagger: 0.1 }), sfx: 'whoosh-soft' }),
      text('بيقرا، بيصنّف، وبيرد. لحاله', { y: 0.8, size: 38, weight: 500, color: '@muted', w: 800, anim: A('fade', 2.2) }),
      sig(),
    ],
  }, { tags: '3d glass orb ai crystal كرة زجاج', transition: 'color-circle' }),

  // ================================================================ abstract
  tpl('ar-abs-kaleido', 'مشكال', 'abstract', {
    duration: 6, bg: bgp('kaleido-8'), camera: { type: 'spiralIn', amount: 0.5 },
    elements: [
      shape('ring', { y: 0.46, w: 700, strokeW: 4, stroke: '@accent', anim: A('draw', 0.2, { dur: 1.4 }), sfx: 'whoosh-soft' }),
      shape('circle', { y: 0.46, w: 620, fill: '@bg', shadow: 1.2, anim: A('zoomIn', 0.4, { dur: 1 }) }),
      tag('// one tool, many uses', { y: 0.34, w: 460 }),
      text('أداة وحدة\n*100 استخدام*', { y: 0.47, size: 72, w: 500, lineHeight: 1.25, anim: A('rise', 1.0, { split: 'line', stagger: 0.2 }) }),
      text('بس لازم تعرف كيف تركّبها', { y: 0.59, size: 30, weight: 500, color: '@muted', w: 440, anim: A('fade', 1.8) }),
      sig(),
    ],
  }, { tags: 'abstract kaleidoscope pattern مشكال', transition: 'swirl' }),

  tpl('ar-abs-moire', 'تموجات موارية', 'abstract', {
    duration: 6, bg: bgp('moire-classic'), camera: { type: 'breath', amount: 0.8 },
    elements: [
      veil({ y: 0.5, w: 1200, h: 1000, alpha: 0.55 }),
      text('FOCUS', { y: 0.36, size: 300, font: 'Bebas Neue', weight: 400, outline: true, strokeW: 3, color: '@fg', w: 900, anim: A('stretch', 0.2, { dur: 1 }), sfx: 'swoosh-in' }),
      text('FOCUS', { y: 0.36, size: 300, font: 'Bebas Neue', weight: 400, color: '@accent', w: 900, anim: A('wipeR', 1.0, { dur: 1.4 }) }),
      text('ساعتين *ديب ورك*\nأحسن من يوم كامل مشتّت', { y: 0.62, size: 64, lineHeight: 1.35, anim: A('maskUp', 1.6, { split: 'line', stagger: 0.2 }) }),
      text('02:00:00', { y: 0.77, size: 40, font: '@mono', weight: 600, color: '@secondary', w: 400, anim: A('scramble', 2.4, { dur: 0.8 }), sfx: 'tick-clock' }),
      sig(),
    ],
  }, { tags: 'abstract moire focus deep work تركيز', transition: 'venetian-fine' }),

  tpl('ar-abs-lines', 'خطوط بترسم حالها', 'abstract', {
    duration: 6, bg: bgp('paper-warm'), camera: { type: 'panDown', amount: 0.4 }, fx: { grain: 0.6 },
    elements: [
      shape('zigzag', { x: 0.3, y: 0.14, w: 360, h: 50, cycles: 7, stroke: INK, strokeW: 6, anim: A('draw', 0.2, { dur: 1 }), sfx: 'pencil' }),
      shape('wave', { x: 0.66, y: 0.25, w: 420, h: 60, cycles: 3, speed: 1.5, stroke: '@secondary', strokeW: 6, anim: A('draw', 0.5, { dur: 1 }) }),
      shape('circle', { x: 0.84, y: 0.12, w: 90, fill: '@accent', anim: A('pop', 0.9), sfx: 'pop' }),
      text('الفكرة *بتبلّش خط*\nوبتصير مشروع', { y: 0.46, size: 86, lineHeight: 1.3, color: INK, anim: A('maskUp', 0.8, { split: 'line', stagger: 0.2 }) }),
      shape('curve', { x: 0.42, y: 0.68, w: 420, h: 180, stroke: '@accent', strokeW: 7, anim: A('draw', 1.6, { dur: 1.1 }), sfx: 'swish' }),
      shape('spiral', { x: 0.8, y: 0.74, w: 180, h: 180, cycles: 3, stroke: INK, strokeW: 5, anim: A('draw', 2.0, { dur: 1 }) }),
      shape('dots', { x: 0.18, y: 0.83, w: 180, h: 90, cols: 5, rows: 3, dot: 6, fill: 'rgba(42,38,34,0.45)', anim: A('fade', 2.4) }),
      sig({ nameColor: INK, roleColor: 'rgba(42,38,34,0.6)' }),
    ],
  }, { tags: 'abstract lines draw paper خطوط ورق', transition: 'wipe-soft-45' }),

  tpl('ar-abs-pop-art', 'بوب آرت', 'abstract', {
    duration: 5, bg: bgp('halftone-pop'), camera: { type: 'punchBeat', amount: 0.6 },
    sfx: { events: [{ id: 'pa1', t: 0.5, kind: 'boom', vol: 0.5 }] },
    elements: [
      shape('burst', { y: 0.38, w: 680, sides: 18, inner: 0.8, rot: -8, fill: '@accent', stroke: '@fg', strokeW: 8, shadow: 1, anim: A('popRotate', 0.4, { dur: 0.7, loop: 'breathe' }) }),
      text('WOW!', { y: 0.38, size: 200, font: 'Anton', weight: 400, color: '@ink', rot: -8, w: 600, anim: A('slam', 0.7, { dur: 0.5 }), sfx: 'punch-hit' }),
      shape('star', { x: 0.16, y: 0.15, w: 90, fill: '@fg', rot: 12, anim: A('pop', 1.1, { loop: 'spinSlow' }) }),
      shape('star', { x: 0.86, y: 0.63, w: 70, fill: '@fg', anim: A('pop', 1.3, { loop: 'spinSlow' }) }),
      shape('plus', { x: 0.85, y: 0.13, w: 60, fill: '@fg', rot: 20, anim: A('pop', 1.5) }),
      text('لما الـ workflow *يشتغل من أول مرة*', { y: 0.76, size: 66, hl: 'marker', w: 820, anim: A('rise', 1.4, { split: 'word', stagger: 0.08 }) }),
      sig(),
    ],
  }, { tags: 'abstract pop art comic wow بوب', transition: 'mask-halftone' }),

  tpl('ar-abs-hive', 'خلايا النحل', 'abstract', {
    duration: 6, bg: bgp('voronoi-cells'), camera: { type: 'wander', amount: 0.6 },
    elements: [
      veil({ y: 0.45, w: 1100, h: 900, alpha: 0.5 }),
      tag('// one agent per cell', { y: 0.09 }),
      ...hive(0.42, 0.3),
      text('كل *خلية* بتشتغل لحالها', { y: 0.75, size: 76, anim: A('riseBlur', 1.5, { split: 'word', stagger: 0.1 }) }),
      text('وإذا وقعت وحدة، الباقي بيكمّل', { y: 0.82, size: 38, weight: 500, color: '@muted', anim: A('fade', 2.3) }),
      sig(),
    ],
  }, { tags: 'abstract hexagon hive cells agents خلايا', transition: 'bubbles-hex' }),

  tpl('ar-abs-contour', 'خريطة كنتور', 'abstract', {
    duration: 6.5, bg: bgp('contour-topo'), camera: { type: 'kbTR', amount: 0.5 },
    elements: [
      text('كل *خطوة* بتعلّي الخط', { y: 0.12, size: 78, anim: A('rise', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('line', { x: 0.375, y: 0.62, w: 354, rot: -45, stroke: '@accent', strokeW: 5, dash: [14, 12], anim: A('draw', 1.0, { dur: 0.8 }), sfx: 'swish' }),
      shape('line', { x: 0.625, y: 0.43, w: 336, rot: -42, stroke: '@accent', strokeW: 5, dash: [14, 12], anim: A('draw', 1.9, { dur: 0.8 }), sfx: 'swish' }),
      shape('circle', { x: 0.25, y: 0.72, w: 28, fill: '@accent', anim: A('pop', 0.6) }),
      el('icon', { name: 'pin', x: 0.25, y: 0.69, size: 64, color: '@fg', anim: A('drop', 0.6), sfx: 'tap' }),
      text('أول بوست', { x: 0.25, y: 0.78, size: 36, weight: 700, w: 260, anim: A('rise', 0.8) }),
      shape('circle', { x: 0.5, y: 0.52, w: 28, fill: '@accent', anim: A('pop', 1.6) }),
      el('icon', { name: 'pin', x: 0.5, y: 0.49, size: 64, color: '@fg', anim: A('drop', 1.6), sfx: 'tap' }),
      text('أول عميل', { x: 0.33, y: 0.49, size: 36, weight: 700, w: 220, anim: A('rise', 1.8) }),
      shape('circle', { x: 0.75, y: 0.34, w: 28, fill: '@accent', anim: A('pop', 2.6) }),
      el('icon', { name: 'flag', x: 0.75, y: 0.3, size: 76, color: '@accent', glow: 0.6, anim: A('drop', 2.6), sfx: 'success' }),
      text('أول *1000*', { x: 0.75, y: 0.23, size: 46, weight: 800, w: 280, anim: A('pop', 2.8) }),
      text('ما في طريق مستقيم. في طريق بتمشيه', { y: 0.87, size: 38, weight: 500, color: '@muted', anim: A('fade', 3.2) }),
      sig({ y: 0.94, size: 26 }),
    ],
  }, { tags: 'abstract contour map journey milestones خريطة', transition: 'mask-waves' }),

  tpl('ar-abs-lava', 'لافا لامب', 'abstract', {
    duration: 6, bg: bgp('lava-lamp'), camera: { type: 'float', amount: 0.8 },
    elements: [
      shape('blob', { x: 0.2, y: 0.2, w: 170, fill: '@accent/0.5', seed: 2, anim: A('pop', 0.2, { loop: 'float' }) }),
      shape('blob', { x: 0.82, y: 0.78, w: 230, fill: '@secondary/0.4', seed: 7, anim: A('pop', 0.4, { loop: 'float', phase: 2 }) }),
      veil({ y: 0.47, w: 1200, h: 900, alpha: 0.6 }),
      veil({ y: 0.96, w: 800, h: 260, alpha: 0.7 }),
      tag('// ideas need space', { y: 0.33 }),
      shape('pill', { y: 0.47, w: 860, h: 280, glass: true, anim: A('blurIn', 0.3, { dur: 1 }) }),
      text('الأفكار بتطلع *لحالها*\nلما تفصل شوي', { y: 0.47, size: 64, lineHeight: 1.35, w: 760, anim: A('riseBlur', 0.8, { split: 'line', stagger: 0.25 }), sfx: 'whoosh-air' }),
      text('مشي، قهوة، وبلا شاشة', { y: 0.62, size: 38, weight: 500, color: '@muted', anim: A('fade', 1.8) }),
      sig(),
    ],
  }, { tags: 'abstract lava lamp glass calm لافا', transition: 'melt' }),

  tpl('ar-abs-shape-drop', 'أشكال بتنزل', 'abstract', {
    duration: 6, bg: bgp('grid-faint'), camera: { type: 'handLight', amount: 0.6 },
    elements: [
      text('المشروع الكبير\n*قطع صغيرة*', { y: 0.19, size: 88, lineHeight: 1.25, anim: A('rise', 0.2, { split: 'line', stagger: 0.2 }) }),
      text('رتّبها وحدة وحدة', { y: 0.33, size: 40, weight: 500, color: '@muted', anim: A('fade', 0.8) }),
      shape('rect', { x: 0.56, y: 0.8, w: 230, h: 200, radius: 30, rot: 10, fill: '@secondary', anim: A('bounce', 0.9, { dur: 1.1 }), sfx: 'thud' }),
      shape('circle', { x: 0.27, y: 0.79, w: 230, fill: '@accent', anim: A('bounce', 1.2, { dur: 1.1 }), sfx: 'plop' }),
      shape('triangle', { x: 0.83, y: 0.79, w: 230, h: 210, rot: -6, fill: '@fg', anim: A('bounce', 1.5, { dur: 1.1 }), sfx: 'thud' }),
      shape('pill', { x: 0.43, y: 0.6, w: 250, h: 100, rot: -14, fill: '@card', stroke: '@fg/0.2', strokeW: 3, anim: A('bounce', 1.8, { dur: 1.1 }), sfx: 'tap' }),
      shape('star', { x: 0.72, y: 0.6, w: 140, rot: 8, fill: '@accent', anim: A('bounce', 2.1, { dur: 1.1 }), sfx: 'pop-high' }),
      shape('plus', { x: 0.17, y: 0.58, w: 110, rot: 20, fill: '@fg', anim: A('bounce', 2.4, { dur: 1.1 }), sfx: 'tick-wood' }),
      sig(),
    ],
  }, { tags: 'abstract shapes drop bounce pieces أشكال', transition: 'assemble' }),

  // ================================================================ promo
  tpl('ar-promo-pricing', 'باقات أسعار', 'promo', {
    duration: 6.5, bg: bgp('grad-soft'), camera: { type: 'pullReveal', amount: 0.6 },
    elements: [
      text('اختار *الباقة* اللي بتناسبك', { y: 0.11, size: 70, anim: A('rise', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...plan(0.82, 'Starter', '$19', '3 workflows', 'دعم بالإيميل', 0.6, false),
      ...plan(0.5, 'Pro', '$49', '15 workflows', 'دعم مباشر', 0.9, true),
      ...plan(0.18, 'Team', '$99', 'بلا حدود', 'مدير حساب', 1.2, false),
      pill('جرّب أول شهر ببلاش', { y: 0.86, size: 40, anim: A('pop', 2.2), sfx: 'click-ui' }),
    ],
  }, { tags: 'promo pricing plans أسعار باقات', transition: 'push-cards-left' }),

  tpl('ar-promo-flash', 'عرض ٤٨ ساعة', 'promo', {
    duration: 5.5, bg: bgp('stripes-bold'), camera: { type: 'crashZoom', amount: 0.6 },
    sfx: { events: [{ id: 'fl1', t: 0, kind: 'riser-short', vol: 0.6 }, { id: 'fl2', t: 0.9, kind: 'impact-hard', vol: 0.7 }] },
    elements: [
      shape('rect', { y: 0.14, w: 1400, h: 110, rot: -6, fill: '@accent', anim: A('wipeR', 0.1, { dur: 0.6 }) }),
      el('ticker', { y: 0.14, rot: -6, text: 'FLASH SALE  ·  48H ONLY  ·  ', size: 54, color: '@ink', w: 1400, speed: 1.2, anim: A('fade', 0.4) }),
      text('خصم *60%* لمدة', { y: 0.31, size: 72, anim: A('slam', 0.8, { dur: 0.5 }) }),
      el('counter', { y: 0.45, from: 72, to: 48, size: 280, font: '@display', color: '@accent', glow: 0.5, anim: A('zoomIn', 1.0, { dur: 0.6 }), countDur: 1.2, sfx: 'tick-clock' }),
      text('ساعة وبس', { y: 0.58, size: 64, weight: 800, anim: A('rise', 1.6) }),
      pill('احجز مكانك قبل ما يخلص', { y: 0.71, anim: A('pop', 2.2), sfx: 'click-ui' }),
      shape('rect', { y: 0.86, w: 1400, h: 90, rot: 5, fill: '@fg', anim: A('wipeL', 0.3, { dur: 0.6 }) }),
      el('ticker', { y: 0.86, rot: 5, text: 'ساعتين شغل ببلاش  ·  48 ساعة وبس  ·  ', size: 42, color: '@bg', w: 1400, speed: 0.9, anim: A('fade', 0.5) }),
    ],
  }, { tags: 'promo flash sale limited countdown خصم عرض', transition: 'glitch-flash' }),

  tpl('ar-promo-course', 'كورس جديد', 'promo', {
    duration: 6.5, bg: bgp('notebook-ruled'), camera: { type: 'dutchL', amount: 0.4 },
    elements: [
      tag('// new course · 2026', { y: 0.07 }),
      el('image', { y: 0.25, w: 860, h: 330, radius: 28, shadow: 0.8, anim: A('maskDown', 0.2, { dur: 0.9 }) }),
      el('icon', { name: 'play', y: 0.25, size: 60, color: '@ink', filled: true, bg: '@accent', anim: A('pop', 0.9), sfx: 'pop' }),
      text('كورس *n8n من الصفر*', { y: 0.45, size: 76, anim: A('rise', 1.1, { split: 'word', stagger: 0.08 }), sfx: 'page-flip' }),
      el('list', { y: 0.61, w: 700, size: 38, items: ['12 درس عملي، كل درس ربع ساعة', '5 مشاريع بتبنيها بإيدك', 'شهادة ومجتمع خاص'], anim: { in: 'rise', start: 1.6, stagger: 0.25 } }),
      pill('سجّل هلأ، 40 مقعد بس', { y: 0.81, size: 42, anim: A('pop', 2.7), sfx: 'success' }),
      sig(),
    ],
  }, { tags: 'promo course learn n8n كورس تعليم', transition: 'page-right' }),

  tpl('ar-promo-app', 'تطبيق نزل', 'promo', {
    duration: 6, bg: bgp('radial-top'), camera: { type: 'craneUpPush', amount: 0.5 },
    elements: [
      glowAt(0.3, 0.5, { w: 700, h: 900, alpha: 0.25 }),
      el('device', { kind: 'phone', x: 0.29, y: 0.52, w: 380, h: 780, anim: A('rise', 0.2, { dur: 1, ease: 'backOutSoft' }), sfx: 'whoosh-up' }),
      text('التطبيق\n*نزل!*', { x: 0.72, y: 0.27, size: 96, w: 440, align: 'start', lineHeight: 1.15, anim: A('rise', 0.7, { split: 'line', stagger: 0.15 }) }),
      el('icon', { name: 'star', x: 0.72, y: 0.44, size: 50, repeat: 5, gap: 10, filled: true, color: '@accent', anim: A('pop', 1.3, { stagger: 0.1 }), sfx: 'sparkle' }),
      el('counter', { x: 0.72, y: 0.54, from: 0, to: 4.9, decimals: 1, size: 140, font: '@display', color: '@fg', anim: A('rise', 1.5), countDur: 1.2 }),
      text('تقييم من 2,300 مستخدم', { x: 0.72, y: 0.62, size: 30, weight: 500, color: '@muted', w: 440, anim: A('fade', 2) }),
      pill('نزّله ببلاش', { x: 0.72, y: 0.73, size: 40, anim: A('pop', 2.4), sfx: 'click' }),
      sig(),
    ],
  }, { tags: 'promo app store rating phone تطبيق', transition: 'cover-up' }),

  tpl('ar-promo-trial', 'تجربة ١٤ يوم', 'promo', {
    duration: 6, bg: bgp('mesh-grad-bright'), camera: { type: 'zoomBounce', amount: 0.5 },
    elements: [
      el('donut', { y: 0.3, w: 460, value: 1, thick: 0.07, label: '', anim: A('fade', 0.2, { dur: 1 }), sfx: 'whoosh-soft' }),
      el('counter', { y: 0.28, from: 0, to: 14, size: 210, font: '@display', color: '@fg', anim: A('pop', 0.4), countDur: 1.3, sfx: 'count-blip' }),
      text('يوم', { y: 0.395, size: 44, weight: 600, color: '@muted', w: 300, anim: A('fade', 1) }),
      text('جرّبها *ببلاش*، على حسابي', { y: 0.56, size: 74, anim: A('riseBlur', 1.2, { split: 'word', stagger: 0.08 }) }),
      el('list', { y: 0.72, w: 560, size: 40, items: ['بلا بطاقة بنكية', 'كل الميزات مفتوحة', 'إلغاء بكبسة وحدة'], anim: { in: 'blurSlideL', start: 1.8, stagger: 0.2 } }),
      sig(),
    ],
  }, { tags: 'promo free trial days تجربة مجانية', transition: 'zoom-punch' }),

  tpl('ar-promo-price-drop', 'السعر نزل', 'promo', {
    duration: 5.5, bg: bgp('spot-soft'), camera: { type: 'snapZoom', amount: 0.5 },
    elements: [
      tag('// price drop', { y: 0.09 }),
      text('كان', { y: 0.19, size: 46, weight: 600, color: '@muted', anim: A('fade', 0.2) }),
      text('$299', { y: 0.29, size: 150, font: '@mono', weight: 700, color: '@muted', w: 600, anim: A('rise', 0.3) }),
      shape('line', { y: 0.29, w: 420, rot: -10, stroke: '@accent', strokeW: 12, anim: A('draw', 1.0, { dur: 0.35 }), sfx: 'swish-fast' }),
      text('صار', { y: 0.42, size: 46, weight: 600, color: '@muted', anim: A('fade', 1.3) }),
      el('counter', { y: 0.55, from: 299, to: 99, prefix: '$', size: 280, font: '@display', color: '@accent', glow: 0.5, anim: A('slam', 1.5, { dur: 0.5 }), countDur: 0.9, sfx: 'cash', sfxDelay: 0.9 }),
      text('بس لآخر هالأسبوع', { y: 0.69, size: 54, weight: 700, anim: A('rise', 2.2) }),
      pill('اطلبه هلأ', { y: 0.81, anim: A('pop', 2.7), sfx: 'click-ui' }),
      sig(),
    ],
  }, { tags: 'promo price drop old new سعر', transition: 'stack-up' }),

  tpl('ar-promo-newsletter', 'نشرة كل أحد', 'promo', {
    duration: 6, bg: bgp('grainy-cool'), camera: { type: 'figure8', amount: 0.5 },
    elements: [
      el('icon', { name: 'mail', y: 0.18, size: 110, color: '@accent', bg: '@card', glow: 0.4, anim: A('drop', 0.2, { ease: 'backOutSoft' }), sfx: 'message-in' }),
      text('نشرة كل *أحد*', { y: 0.34, size: 92, anim: A('rise', 0.6, { split: 'word', stagger: 0.1 }) }),
      text('كل أسبوع workflow جاهز، ببلاش', { y: 0.42, size: 40, weight: 500, color: '@muted', anim: A('fade', 1.0) }),
      shape('pill', { y: 0.56, w: 860, h: 124, fill: '@card', stroke: '@fg/0.12', strokeW: 2, shadow: 0.7, anim: A('unfold', 1.2) }),
      text('you@email.com', { x: 0.36, y: 0.56, size: 34, font: '@mono', weight: 500, color: '@muted', w: 440, align: 'left', caret: true, anim: A('typewriter', 1.6, { dur: 1 }), sfx: 'type-soft' }),
      text('اشترك', { x: 0.77, y: 0.56, size: 36, weight: 700, color: '@ink', w: 300, box: { fill: '@accent', padX: 40, padY: 18, radius: 40 }, anim: A('pop', 2.2), sfx: 'click' }),
      el('counter', { y: 0.71, from: 0, to: 3400, prefix: '+', size: 96, font: '@display', color: '@fg', anim: A('rise', 2.4), countDur: 1.2 }),
      text('مشترك سبقوك', { y: 0.78, size: 36, weight: 500, color: '@muted', anim: A('fade', 2.7) }),
      sig(),
    ],
  }, { tags: 'promo newsletter email subscribe نشرة بريد', transition: 'blinds-v-8' }),

  tpl('ar-promo-bundle', 'باكج أدوات', 'promo', {
    duration: 6, bg: bgp('polka-classic'), camera: { type: 'bounceIn', amount: 0.5 },
    elements: [
      text('باكج *5 أدوات* بسعر وحدة', { y: 0.12, size: 74, anim: A('rise', 0.2, { split: 'word', stagger: 0.08 }) }),
      glowAt(0.5, 0.56, { w: 700, h: 700, alpha: 0.25 }),
      ...[['workflow', 0.228, 0.501], ['bot', 0.334, 0.39], ['sparkles', 0.5, 0.348], ['file', 0.666, 0.39], ['database', 0.772, 0.501]].map(([name, x, y], i) =>
        el('icon', { name, x, y, size: 64, color: '@fg', bg: '@card', anim: A('zoomIn', 1.0 + i * 0.15, { dur: 0.6, loop: 'float', phase: i }), sfx: 'pop', sfxVol: 0.6 })),
      el('icon', { name: 'gift', y: 0.58, size: 230, color: '@accent', glow: 0.5, anim: A('elastic', 0.4, { dur: 1 }), sfx: 'pop-low' }),
      text('Workflows · Prompts · Templates', { y: 0.75, size: 32, font: '@mono', weight: 500, color: '@secondary', w: 800, anim: A('fade', 2.0) }),
      pill('خدهن كلهن بـ $49', { y: 0.84, anim: A('pop', 2.6), sfx: 'cash' }),
    ],
  }, { tags: 'promo bundle pack tools باكج أدوات', transition: 'explode' }),

  // ================================================================ photo
  tpl('ar-photo-filmstrip', 'شريط فيلم', 'photo', {
    duration: 6.5, bg: bgp('paper-dark'), camera: { type: 'panUp', amount: 0.5 }, fx: { grain: 0.9 },
    elements: [
      ...filmstrip(0.36, 0.1),
      text('*3 لقطات*\nمن سنة كاملة', { x: 0.81, y: 0.42, size: 62, w: 300, align: 'start', lineHeight: 1.25, anim: A('blurSlideL', 1.6, { split: 'line', stagger: 0.2 }) }),
      text('أول مكتب\nأول عميل\nأول فريق', { x: 0.81, y: 0.58, size: 34, weight: 500, color: '@muted', w: 300, align: 'start', lineHeight: 1.5, anim: A('rise', 2.2, { split: 'line', stagger: 0.18 }) }),
      sig({ x: 0.81, y: 0.9, size: 24 }),
    ],
  }, { tags: 'photo film strip memories فيلم صور', transition: 'slices-5' }),

  tpl('ar-photo-before-after', 'قبل وبعد بالصور', 'photo', {
    duration: 6, bg: bgp('split-flat'), camera: { type: 'dollyRight', amount: 0.4 },
    elements: [
      text('نفس المكان، *بعد 6 شهور*', { y: 0.09, size: 64, anim: A('rise', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('image', { x: 0.735, y: 0.47, w: 430, h: 740, radius: 24, filter: 'gray', shadow: 0.8, anim: A('maskLeft', 0.5, { dur: 0.9 }), sfx: 'swipe' }),
      el('image', { x: 0.265, y: 0.47, w: 430, h: 740, radius: 24, border: '@accent', borderW: 5, shadow: 0.8, anim: A('maskLeft', 1.4, { dur: 0.9 }), sfx: 'swipe' }),
      el('icon', { name: 'arrowLeft', y: 0.47, size: 54, color: '@ink', bg: '@accent', anim: A('pop', 2.1), sfx: 'pop' }),
      text('قبل', { x: 0.735, y: 0.83, size: 40, weight: 700, color: '@fg', w: 300, box: { fill: '@card', padX: 34, padY: 14, radius: 30 }, anim: A('rise', 1.0) }),
      text('بعد', { x: 0.265, y: 0.83, size: 40, weight: 700, color: '@ink', w: 300, box: { fill: '@accent', padX: 34, padY: 14, radius: 30 }, anim: A('rise', 1.9) }),
      sig(),
    ],
  }, { tags: 'photo before after compare قبل بعد', transition: 'split' }),

  tpl('ar-photo-capsule', 'إطار كبسولة', 'photo', {
    duration: 6, bg: bgp('sunset-warm'), camera: { type: 'kbBL', amount: 0.5 }, fx: { grain: 0.5 },
    elements: [
      shape('circle', { x: 0.82, y: 0.12, w: 130, fill: '#FFC65C', glow: 0.8, anim: A('pop', 0.2) }),
      shape('pill', { x: 0.53, y: 0.435, w: 580, h: 860, fill: 'none', stroke: '#FFE7C9', strokeW: 3, anim: A('draw', 0.3, { dur: 1.4 }) }),
      el('image', { x: 0.5, y: 0.42, w: 560, h: 840, radius: 280, shadow: 1, kenburns: 0.1, anim: A('maskUp', 0.5, { dur: 1.1 }), sfx: 'camera' }),
      text('الإلهام بيجي *من برّا الشاشة*', { y: 0.83, size: 60, color: '#FFF4EA', accentColor: '#FFC65C', w: 820, anim: A('riseBlur', 1.4, { split: 'word', stagger: 0.08 }) }),
      sig({ color: '#FFC65C', nameColor: WHITE, roleColor: WHITE_DIM }),
    ],
  }, { tags: 'photo capsule arch frame sunset كبسولة', transition: 'iris-round-open' }),

  tpl('ar-photo-masonry', 'موزاييك صور', 'photo', {
    duration: 6, bg: bgp('graph-paper'), camera: { type: 'panUR', amount: 0.4 },
    elements: [
      text('أسبوع كامل *بـ 5 صور*', { y: 0.1, size: 66, anim: A('rise', 0.1, { split: 'word', stagger: 0.08 }) }),
      ...tile(0.32, 0.408, 520, 560, 0.3, 'الأحد'),
      ...tile(0.77, 0.292, 340, 270, 0.6, 'الاتنين'),
      ...tile(0.77, 0.524, 340, 270, 0.9, 'التلاتاء'),
      ...tile(0.275, 0.748, 430, 250, 1.2, 'الأربعاء'),
      ...tile(0.725, 0.748, 430, 250, 1.5, 'الخميس'),
      sig(),
    ],
  }, { tags: 'photo masonry mosaic grid week موزاييك', transition: 'tiles-scale-spiral' }),

  tpl('ar-photo-stamp', 'طابع بريد', 'photo', {
    duration: 6, bg: bgp('paper-plain'), camera: { type: 'handMedium', amount: 0.4 }, fx: { grain: 0.8 },
    elements: [
      ...stamp(0.46, 0.42, -6, 0.2),
      ...[0.16, 0.2, 0.24].map((y, i) => shape('wave', { x: 0.5, y, w: 300, h: 22, cycles: 4, speed: 0, stroke: '@accent', strokeW: 5, anim: A('draw', 1.3 + i * 0.1, { dur: 0.5 }) })),
      shape('ring', { x: 0.76, y: 0.2, w: 250, strokeW: 6, stroke: '@accent', anim: A('slam', 1.2, { dur: 0.4 }), sfx: 'stamp' }),
      text('POSTED\n2026', { x: 0.76, y: 0.2, rot: 14, size: 34, font: '@mono', weight: 700, color: '@accent', w: 220, lineHeight: 1.2, anim: A('slam', 1.2, { dur: 0.4 }) }),
      text('ذكرى من *أول رحلة شغل*', { y: 0.81, size: 64, anim: A('riseBlur', 1.8, { split: 'word', stagger: 0.08 }) }),
      sig(),
    ],
  }, { tags: 'photo stamp postcard memory طابع بريد', transition: 'panel-ink-0' }),

  tpl('ar-photo-duotone', 'صورة دوتون', 'photo', {
    duration: 6, bg: bgp('solid-ink'), camera: { type: 'kbTLOut', amount: 0.6 }, fx: { grain: 1.1, vignette: 0.5 },
    elements: [
      el('image', { y: 0.5, w: 1000, h: 1250, radius: 0, filter: 'gray', tint: 'rgba(11,11,12,0.45)', kenburns: 0.1, anim: A('blurIn', 0, { dur: 1.2 }) }),
      el('glow', { x: 0.2, y: 0.15, w: 1100, h: 1000, color: '@accent', alpha: 0.35, anim: A('fade', 0.3, { dur: 1.4 }) }),
      el('glow', { y: 0.86, w: 1500, h: 700, color: '#0B0B0C', alpha: 0.9, anim: A('none', 0) }),
      tag('// est. 2021', { y: 0.08, color: WHITE_DIM }),
      text('BUILD', { y: 0.3, size: 300, font: 'Anton', weight: 400, outline: true, strokeW: 3, color: WHITE, w: 900, anim: A('stretch', 0.6, { dur: 0.9 }), sfx: 'deep-hit' }),
      text('ابني اللي *ما حدا بناه*', { y: 0.74, size: 84, color: WHITE, hl: 'marker', w: 860, anim: A('maskUp', 1.3, { split: 'word', stagger: 0.1 }) }),
      text('وبعدين احكي عنه', { y: 0.82, size: 40, weight: 500, color: WHITE_DIM, anim: A('fade', 2.1) }),
      sig({ nameColor: WHITE, roleColor: WHITE_DIM }),
    ],
  }, { tags: 'photo duotone tint bold outline دوتون', transition: 'leak-warm' }),

  // ================================================================ event
  tpl('ar-ev-ramadan', 'رمضان كريم', 'event', {
    duration: 6.5, bg: bgp('stars-calm'), camera: { type: 'craneDown', amount: 0.5 }, fx: { vignette: 0.4 },
    elements: [
      el('particles', { kind: 'stars', y: 0.35, w: 1000, h: 700, count: 40, anim: A('fade', 0, { dur: 1.5 }) }),
      ...lantern(0.16, 0.27, 1.1, 0.2, 0),
      ...lantern(0.84, 0.2, 0.9, 0.5, 1.3),
      ...lantern(0.68, 0.12, 0.55, 0.8, 2.4),
      glowAt(0.5, 0.3, { w: 600, h: 600, alpha: 0.3 }),
      el('icon', { name: 'moon', y: 0.3, size: 230, color: '@accent', filled: true, glow: 1, anim: A('zoomIn', 0.6, { dur: 1.2 }), sfx: 'chime' }),
      text('*رمضان* كريم', { y: 0.58, size: 140, font: 'Aref Ruqaa', weight: 700, w: 900, anim: A('riseBlur', 1.4, { split: 'word', stagger: 0.2 }), sfx: 'sparkle-chime' }),
      text('كل سنة وإنتو بخير\nالشغل بيخفّ شوي، والقلب بيكبر', { y: 0.715, size: 40, weight: 500, color: '@muted', w: 760, lineHeight: 1.45, anim: A('fade', 2.4) }),
      sig(),
    ],
  }, { tags: 'event ramadan eid greeting lantern رمضان عيد تهنئة', transition: 'fade-light' }),

  tpl('ar-ev-new-year', 'سنة جديدة', 'event', {
    duration: 6, bg: bgp('bokeh-many'), camera: { type: 'shockwave', amount: 0.5 },
    sfx: { events: [{ id: 'ny1', t: 1.4, kind: 'boom', vol: 0.4 }, { id: 'ny2', t: 1.5, kind: 'twinkle', vol: 0.6 }, { id: 'ny3', t: 1.9, kind: 'boom', vol: 0.35 }] },
    elements: [
      el('particles', { kind: 'burst', x: 0.18, y: 0.15, w: 420, h: 420, count: 36, anim: A('none', 1.4) }),
      el('particles', { kind: 'burst', x: 0.82, y: 0.14, w: 380, h: 380, count: 32, colors: ['@secondary', '@fg'], anim: A('none', 1.9) }),
      el('counter', { y: 0.32, from: 2026, to: 2027, sep: false, style: 'roll', size: 300, font: '@display', color: '@fg', glow: 0.3, anim: A('zoomIn', 0.3, { dur: 0.8 }), countDelay: 0.4, countDur: 1, sfx: 'tick' }),
      text('شو ناوي تبني بـ *2027*؟', { y: 0.55, size: 80, anim: A('rise', 1.3, { split: 'word', stagger: 0.1 }) }),
      text('أنا: 12 أداة، ونشرة، وكورس واحد', { y: 0.63, size: 40, weight: 500, color: '@muted', anim: A('fade', 2) }),
      el('rotator', { y: 0.76, prefix: 'السنة الجاية:', words: ['بنبني أكتر', 'بننشر أكتر', 'بنتعلّم أكتر'], size: 48, interval: 1.1, anim: A('rise', 2.4) }),
      el('particles', { kind: 'confetti', y: 0.5, w: 1000, h: 1250, count: 70, anim: A('fade', 2.0) }),
      sig(),
    ],
  }, { tags: 'event new year 2027 fireworks سنة جديدة', transition: 'flash-radial' }),

  tpl('ar-ev-anniversary', 'ذكرى سنوية', 'event', {
    duration: 6.5, bg: bgp('rings-sonar'), camera: { type: 'pushSlow', amount: 0.6 },
    elements: [
      tag('// freelance anniversary', { y: 0.07 }),
      el('donut', { y: 0.3, w: 480, value: 1, thick: 0.06, label: '', glow: 0.7, anim: A('fade', 0.2, { dur: 1.2 }), sfx: 'whoosh-soft' }),
      el('counter', { y: 0.28, from: 0, to: 3, size: 230, font: '@display', color: '@accent', glow: 0.4, anim: A('pop', 0.5), countDur: 1, sfx: 'ding' }),
      text('سنين', { y: 0.385, size: 44, weight: 600, color: '@muted', w: 300, anim: A('fade', 1.1) }),
      text('*صفر ندم* بعد 3 سنين freelance', { y: 0.57, size: 58, anim: A('rise', 1.3, { split: 'word', stagger: 0.08 }) }),
      ...[[0.78, 41, 'مشروع'], [0.5, 9, 'دول'], [0.22, 120, 'عميل رجع']].flatMap(([x, to, lab], i) => [
        el('counter', { x, y: 0.69, from: 0, to, size: 90, font: '@display', color: '@fg', anim: A('rise', 1.8 + i * 0.2), countDur: 1.2, sfx: 'count-blip', sfxVol: 0.5 }),
        text(lab, { x, y: 0.755, size: 32, weight: 500, color: '@muted', w: 260, anim: A('fade', 2 + i * 0.2) }),
      ]),
      text('شكراً لكل عميل وثق فيي', { y: 0.85, size: 38, weight: 600, anim: A('fade', 2.8) }),
      sig({ y: 0.935, size: 26 }),
    ],
  }, { tags: 'event anniversary milestone years ذكرى سنوية', transition: 'clock-cw' }),

  tpl('ar-ev-congrats', 'مبروك', 'event', {
    duration: 5.5, bg: bgp('burst-center'), camera: { type: 'heartbeat', amount: 0.5 },
    sfx: { events: [{ id: 'cg1', t: 0.8, kind: 'success', vol: 0.8 }] },
    elements: [
      glowAt(0.5, 0.32, { w: 700, h: 700, alpha: 0.3 }),
      el('particles', { kind: 'burst', y: 0.32, w: 700, h: 700, count: 40, anim: A('none', 0.8) }),
      el('icon', { name: 'trophy', y: 0.32, size: 280, color: '@accent', glow: 0.8, strokeW: 1.6, anim: A('elastic', 0.3, { dur: 1 }), sfx: 'reveal' }),
      text('مبروك يا *أحمد*!', { y: 0.58, size: 116, anim: A('pop', 1.0, { split: 'word', stagger: 0.12 }) }),
      text('أول عميل إلك بالـ freelance والجاي أكتر', { y: 0.68, size: 42, weight: 500, color: '@muted', w: 800, anim: A('fade', 1.6) }),
      text('MILESTONE UNLOCKED', { y: 0.79, size: 28, font: '@mono', weight: 600, color: '@fg', w: 600, box: { fill: '@card', padX: 30, padY: 14, radius: 24 }, anim: A('scramble', 2.0, { dur: 0.8 }), sfx: 'power-up' }),
      el('particles', { kind: 'confetti', y: 0.5, w: 1000, h: 1250, count: 90, anim: A('fade', 0.9) }),
      sig(),
    ],
  }, { tags: 'event congrats celebration trophy مبروك تهنئة', transition: 'shape-star' }),

  tpl('ar-ev-thanks', 'شكراً للمتابعين', 'event', {
    duration: 6, bg: bgp('aurora-classic'), camera: { type: 'hover', amount: 0.6 },
    elements: [
      el('particles', { kind: 'hearts', y: 0.5, w: 1000, h: 1250, count: 22, anim: A('fade', 1.0) }),
      shape('heart', { y: 0.26, w: 300, h: 280, fill: '@accent', glow: 0.7, anim: A('pop', 0.2, { dur: 0.7, loop: 'heartbeat' }), sfx: 'heartbeat' }),
      el('counter', { y: 0.455, from: 0, to: 10000, size: 180, font: '@display', color: '@fg', anim: A('rise', 0.7), countDur: 1.8, sfx: 'count-blip' }),
      text('متابع. *شكراً* لكل واحد فيكن', { y: 0.585, size: 64, anim: A('riseBlur', 1.4, { split: 'word', stagger: 0.08 }) }),
      ...[0.34, 0.42, 0.5, 0.58, 0.66].map((x, i) => el('image', { x, y: 0.725, w: 130, h: 130, mask: 'circle', border: '@bg', borderW: 6, anim: A('pop', 2.0 + i * 0.12), sfx: 'pop-soft', sfxVol: 0.5 })),
      text('وإنت منهم', { y: 0.83, size: 40, weight: 600, color: '@muted', anim: A('fade', 2.8) }),
      sig(),
    ],
  }, { tags: 'event thanks followers milestone شكراً متابعين', transition: 'shape-heart' }),

  tpl('ar-ev-national', 'يوم وطني', 'event', {
    duration: 6, bg: bgp('rays-top'), camera: { type: 'tiltUp', amount: 0.5 },
    elements: [
      shape('line', { x: 0.29, y: 0.29, w: 450, rot: 90, stroke: '@fg', strokeW: 8, anim: A('growY', 0.2, { dur: 0.8 }) }),
      shape('circle', { x: 0.29, y: 0.105, w: 26, fill: '@accent', anim: A('pop', 0.8) }),
      ...[['@accent', 0.15], ['@fg', 0.195], ['@secondary', 0.24]].map(([c, y], i) =>
        shape('wave', { x: 0.5, y, w: 420, h: 36, cycles: 1.2, speed: 2.5, stroke: c, strokeW: 54, anim: A('wipeR', 0.7 + i * 0.12, { dur: 0.9 }), sfx: i ? 'none' : 'swoosh-in' })),
      el('particles', { kind: 'sparkle', y: 0.5, w: 1000, h: 1000, count: 40, anim: A('fade', 1.4) }),
      text('كل عام ووطننا *بخير*', { y: 0.58, size: 96, anim: A('maskUp', 1.4, { split: 'word', stagger: 0.12 }), sfx: 'chime' }),
      text('اليوم منحتفل، وبكرا منكمّل نبني', { y: 0.68, size: 42, weight: 500, color: '@muted', anim: A('fade', 2.2) }),
      text('يوم وطني سعيد', { y: 0.78, size: 34, weight: 700, color: '@fg', w: 500, box: { fill: '@card', padX: 34, padY: 14, radius: 26 }, anim: A('pop', 2.6), sfx: 'pop' }),
      sig(),
    ],
  }, { tags: 'event national day flag celebration يوم وطني', transition: 'circle-bottom' }),

  // ================================================================ social
  tpl('ar-soc-tweet', 'تغريدة X', 'social', {
    duration: 6, bg: bgp('grid-fine'), camera: { type: 'swayRot', amount: 0.5 },
    elements: [
      shape('rect', { y: 0.47, w: 900, h: 700, radius: 40, fill: '@card', stroke: '@fg/0.08', strokeW: 2, shadow: 1.1, anim: A('rise', 0.1, { dur: 0.8, ease: 'backOutSoft' }), sfx: 'whoosh-short' }),
      el('image', { x: 0.86, y: 0.27, w: 110, h: 110, mask: 'circle', anim: A('pop', 0.5) }),
      text('Nour Aldeen', { x: 0.59, y: 0.255, size: 38, weight: 800, w: 400, align: 'right', anim: A('fade', 0.6) }),
      text('@nourtofi · 2h', { x: 0.59, y: 0.29, size: 26, font: '@mono', weight: 500, color: '@muted', w: 400, align: 'right', anim: A('fade', 0.7) }),
      text('بنيت agent بيرد على 200 إيميل باليوم.\nوقتي رجعلي، *ولسا ما خلصت*', { y: 0.43, size: 48, weight: 600, w: 800, align: 'start', lineHeight: 1.45, anim: A('riseSoft', 0.9, { split: 'line', stagger: 0.25 }) }),
      text('9:41 م · 27 أكتوبر 2026', { y: 0.545, size: 26, weight: 400, color: '@muted', w: 800, align: 'start', anim: A('fade', 1.4) }),
      shape('line', { y: 0.59, w: 800, stroke: '@fg/0.1', strokeW: 2, anim: A('draw', 1.4, { dur: 0.6 }) }),
      ...stat(0.17, 0.665, 'message', 48),
      ...stat(0.39, 0.665, 'refresh', 312, {}, 1.75),
      ...stat(0.61, 0.665, 'heart', 2.4, { decimals: 1, suffix: 'K', color: '@accent', filled: true, sfx: 'pop-high' }, 2.2),
      ...stat(0.83, 0.665, 'chart', 98, { suffix: 'K' }, 2.0),
      text('أكتر تغريدة انتشرت عندي هالسنة', { y: 0.84, size: 44, weight: 700, anim: A('rise', 2.6) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'social tweet x twitter post card تغريدة', transition: 'tiles-slide-rows' }),

  tpl('ar-soc-linkedin', 'بوست لينكدإن', 'social', {
    duration: 6.5, bg: bgp('mesh-calm'), camera: { type: 'craneDownPull', amount: 0.4 },
    elements: [
      shape('rect', { y: 0.48, w: 900, h: 1000, radius: 34, fill: '@card', stroke: '@fg/0.08', strokeW: 2, shadow: 1.1, anim: A('riseSoft', 0.1, { dur: 0.8 }), sfx: 'whoosh-soft' }),
      el('image', { x: 0.86, y: 0.15, w: 100, h: 100, mask: 'circle', anim: A('pop', 0.4) }),
      text('Nour Aldeen Tofi', { x: 0.59, y: 0.136, size: 34, weight: 700, w: 420, align: 'right', anim: A('fade', 0.5) }),
      text('AI Automation Engineer · 1st', { x: 0.59, y: 0.168, size: 24, weight: 400, color: '@muted', w: 420, align: 'right', anim: A('fade', 0.6) }),
      text('+ متابعة', { x: 0.15, y: 0.15, size: 30, weight: 700, color: '@accent', w: 200, anim: A('fade', 0.7) }),
      text('وفّرت على عميل *15 ساعة* بالأسبوع\nبـ workflow واحد على n8n وهيك عملتها', { y: 0.255, size: 36, weight: 500, w: 820, align: 'start', lineHeight: 1.45, anim: A('riseSoft', 0.8, { split: 'line', stagger: 0.2 }) }),
      el('image', { y: 0.48, w: 900, h: 400, radius: 0, anim: A('fade', 1.2, { dur: 0.8 }) }),
      ...[['thumbsUp', 0.88, '@accent'], ['heart', 0.85, '@secondary'], ['bulb', 0.82, '@fg']].map(([name, x, c], i) =>
        el('icon', { name, x, y: 0.69, size: 22, color: '@ink', filled: name !== 'bulb', bg: c, anim: A('pop', 1.7 + i * 0.1) })),
      el('counter', { x: 0.73, y: 0.69, from: 1200, to: 1248, size: 28, font: '@mono', color: '@muted', anim: A('fade', 1.8), countDur: 1.8 }),
      text('86 تعليق · 23 مشاركة', { x: 0.3, y: 0.69, size: 26, weight: 400, color: '@muted', w: 400, align: 'left', anim: A('fade', 1.9) }),
      shape('line', { y: 0.725, w: 820, stroke: '@fg/0.1', strokeW: 2, anim: A('draw', 2.0, { dur: 0.5 }) }),
      ...[['thumbsUp', 0.83, 'أعجبني'], ['message', 0.61, 'تعليق'], ['refresh', 0.39, 'مشاركة'], ['send', 0.17, 'إرسال']].flatMap(([name, x, lab], i) => [
        el('icon', { name, x: x + 0.065, y: 0.785, size: 38, color: '@muted', anim: A('fade', 2.1 + i * 0.08) }),
        text(lab, { x: x - 0.02, y: 0.785, size: 26, weight: 600, color: '@muted', w: 150, anim: A('fade', 2.1 + i * 0.08) }),
      ]),
      el('icon', { name: 'thumbsUp', x: 0.895, y: 0.785, size: 38, color: '@accent', filled: true, anim: A('pop', 3.2, { dur: 0.5 }), sfx: 'click-ui' }),
      text('أعجبني', { x: 0.81, y: 0.785, size: 26, weight: 700, color: '@accent', w: 150, box: { fill: '@card', padX: 6, padY: 4 }, anim: A('fade', 3.2, { dur: 0.3 }) }),
      sig({ y: 0.935, size: 26 }),
    ],
  }, { tags: 'social linkedin post card reactions لينكدإن', transition: 'fade-rise' }),

  tpl('ar-soc-youtube', 'اشترك بالقناة', 'social', {
    duration: 6, bg: bgp('spot-slow'), camera: { type: 'whipIn', amount: 0.5 },
    elements: [
      el('image', { y: 0.28, w: 900, h: 506, radius: 28, shadow: 0.9, anim: A('zoomOut', 0.1, { dur: 0.9 }) }),
      shape('rect', { y: 0.28, w: 150, h: 104, radius: 30, fill: '@accent', shadow: 0.6, anim: A('pop', 0.7) }),
      el('icon', { name: 'play', y: 0.28, size: 50, color: '@ink', filled: true, anim: A('pop', 0.75), sfx: 'pop' }),
      text('12:48', { x: 0.13, y: 0.445, size: 26, font: '@mono', weight: 600, color: '@fg', w: 140, box: { fill: '@bg/0.8', padX: 12, padY: 6, radius: 8 }, anim: A('fade', 0.9) }),
      el('progress', { y: 0.493, w: 900, h: 8, value: 0.35, anim: A('fade', 1.0) }),
      text('بنيت AI agent بيكتب محتوى أسبوع كامل لحاله', { y: 0.555, size: 42, weight: 700, w: 880, align: 'start', anim: A('rise', 1.1) }),
      el('image', { x: 0.87, y: 0.655, w: 100, h: 100, mask: 'circle', anim: A('pop', 1.4) }),
      text('Nour Automates', { x: 0.6, y: 0.64, size: 36, weight: 700, w: 420, align: 'right', anim: A('fade', 1.5) }),
      text('24.6K مشترك', { x: 0.6, y: 0.674, size: 26, weight: 400, color: '@muted', w: 420, align: 'right', anim: A('fade', 1.6) }),
      shape('pill', { x: 0.52, y: 0.79, w: 440, h: 120, fill: '@accent', shadow: 0.8, anim: A('pop', 1.9), sfx: 'pop-low' }),
      text('اشترك', { x: 0.52, y: 0.79, size: 50, weight: 800, color: '@ink', w: 400, anim: A('pop', 1.95) }),
      el('particles', { kind: 'burst', x: 0.52, y: 0.79, w: 520, h: 260, count: 18, anim: A('none', 2.9) }),
      shape('pill', { x: 0.52, y: 0.79, w: 440, h: 120, fill: '@raised', stroke: '@fg/0.15', strokeW: 2, anim: A('pop', 2.9, { dur: 0.45 }), sfx: 'click' }),
      text('مشترك', { x: 0.56, y: 0.79, size: 46, weight: 700, color: '@fg', w: 300, anim: A('pop', 2.95, { dur: 0.45 }) }),
      el('icon', { name: 'check', x: 0.4, y: 0.79, size: 40, color: '@accent', strokeW: 3, anim: A('draw', 3.0, { dur: 0.4 }) }),
      el('icon', { name: 'bell', x: 0.17, y: 0.79, size: 64, color: '@fg', anim: A('pop', 3.3, { loop: 'wiggle', loopAmp: 2 }), sfx: 'bell' }),
      text('فيديو جديد كل *تلاتاء*', { y: 0.9, size: 42, weight: 700, anim: A('rise', 3.6) }),
    ],
  }, { tags: 'social youtube subscribe channel video يوتيوب اشتراك', transition: 'zoom-corner-br' }),

  tpl('ar-soc-poll', 'تصويت ستوري', 'social', {
    duration: 6, bg: bgp('holo'), camera: { type: 'walk', amount: 0.4 },
    elements: [
      shape('rect', { x: 0.82, y: 0.06, w: 290, h: 8, radius: 4, fill: '@fg', anim: A('fade', 0) }),
      el('progress', { x: 0.5, y: 0.06, w: 290, h: 8, value: 1, color: '@fg', track: '@fg/0.3', anim: A('none', 0, { dur: 2.6 }) }),
      shape('rect', { x: 0.18, y: 0.06, w: 290, h: 8, radius: 4, fill: '@fg/0.3', anim: A('fade', 0) }),
      el('image', { x: 0.89, y: 0.115, w: 70, h: 70, mask: 'circle', anim: A('fade', 0.1) }),
      text('nourtofi', { x: 0.7, y: 0.115, size: 28, font: '@mono', weight: 600, w: 260, align: 'right', anim: A('fade', 0.2) }),
      shape('rect', { y: 0.46, w: 800, h: 560, radius: 44, fill: '@card', shadow: 1.2, anim: A('pop', 0.3, { dur: 0.7, ease: 'backOutSoft' }), sfx: 'pop-low' }),
      text('شو بتستعمل للأتمتة؟', { y: 0.32, size: 58, weight: 800, w: 700, anim: A('rise', 0.6) }),
      el('progress', { y: 0.44, w: 700, h: 104, value: 0.72, track: '@fg/0.08', anim: A('none', 2.0, { dur: 0.8 }) }),
      text('n8n', { x: 0.76, y: 0.44, size: 40, weight: 700, font: '@mono', color: '@fg', w: 200, align: 'right', anim: A('fade', 0.9) }),
      el('counter', { x: 0.22, y: 0.44, from: 0, to: 72, suffix: '%', size: 40, font: '@mono', color: '@ink', anim: A('fade', 2.1), countDur: 1.2 }),
      el('icon', { name: 'check', x: 0.6, y: 0.44, size: 40, color: '@ink', strokeW: 3, anim: A('draw', 1.8, { dur: 0.3 }), sfx: 'tap' }),
      el('progress', { y: 0.56, w: 700, h: 104, value: 0.28, color: '@muted', track: '@fg/0.08', anim: A('none', 2.0, { dur: 0.8 }) }),
      text('Make', { x: 0.76, y: 0.56, size: 40, weight: 700, font: '@mono', color: '@fg', w: 200, align: 'right', anim: A('fade', 1.0) }),
      el('counter', { x: 0.22, y: 0.56, from: 0, to: 28, suffix: '%', size: 40, font: '@mono', color: '@bg', anim: A('fade', 2.1), countDur: 1.2 }),
      text('1,920 صوت', { y: 0.645, size: 28, weight: 500, color: '@muted', anim: A('fade', 2.4) }),
      text('صوّت وشوف *مين معك*', { y: 0.78, size: 48, weight: 800, anim: A('rise', 2.6) }),
      shape('pill', { x: 0.6, y: 0.89, w: 640, h: 92, fill: 'none', stroke: '@fg/0.5', strokeW: 3, anim: A('fade', 0.4) }),
      text('أرسل رسالة', { x: 0.7, y: 0.89, size: 30, weight: 500, color: '@muted', w: 300, align: 'right', anim: A('fade', 0.4) }),
      el('icon', { name: 'heart', x: 0.2, y: 0.89, size: 50, color: '@fg', anim: A('fade', 0.4) }),
      el('icon', { name: 'send', x: 0.09, y: 0.89, size: 46, color: '@fg', anim: A('fade', 0.4) }),
    ],
  }, { tags: 'social instagram story poll vote ستوري تصويت', transition: 'carousel-left' }),
];
