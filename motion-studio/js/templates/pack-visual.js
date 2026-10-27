// Visual pack: quotes, 3D, abstract shapes, promos, photo layouts and outros.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl } from './kit.js';

const U = 1.08; // design unit in px on the 1080-wide portrait frame

// rotate a local offset (design units) by deg, return frame-fraction deltas
function off(dxU, dyU, deg) {
  const r = (deg * Math.PI) / 180;
  const x = dxU * Math.cos(r) - dyU * Math.sin(r);
  const y = dxU * Math.sin(r) + dyU * Math.cos(r);
  return [(x * U) / 1080, (y * U) / 1350];
}

// a polaroid: paper frame + photo + handwritten caption, all sharing one rotation
function polaroid(x, y, rot, start, caption) {
  const a = A('drop', start, { dur: 0.9, ease: 'backOutSoft' });
  const [ix, iy] = off(0, -45, rot);
  const [cx, cy] = off(0, 200, rot);
  return [
    shape('rect', { x, y, w: 430, h: 520, radius: 6, rot, fill: '#F5F3EE', shadow: 1.1, anim: a }),
    el('image', { x: x + ix, y: y + iy, w: 380, h: 380, radius: 3, rot, kenburns: 0.06, anim: a }),
    text(caption, { x: x + cx, y: y + cy, rot, font: 'Aref Ruqaa', size: 40, weight: 700, color: '#2A2622', w: 380, anim: a }),
  ];
}

// glass contact row: pill + icon on the reading-start side + mono text
function contactRow(y, iconName, label, start) {
  return [
    shape('rect', { y, w: 860, h: 118, radius: 59, glass: true, anim: A('blurSlideR', start, { dur: 0.8 }) }),
    el('icon', { name: iconName, x: 0.83, y, size: 46, color: '@accent', anim: A('pop', start + 0.25) }),
    text(label, { x: 0.47, y, size: 34, font: '@mono', weight: 500, w: 620, align: 'right', anim: A('blurSlideR', start + 0.1, { dur: 0.8 }) }),
  ];
}

const pill = (t, o = {}) => text(t, { size: 46, weight: 700, color: '@ink', box: { fill: '@accent', padX: 48, padY: 20 }, ...o });

export const VISUAL = [
  // ================================================================ quotes
  tpl('vis-quote-giant', 'اقتباس بعلامة ضخمة', 'quote', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'dolly', amount: 0.7 }, fx: { grain: 0.7, vignette: 0.4 },
    elements: [
      text('“', { y: 0.47, size: 620, weight: 900, font: 'Playfair Display', color: '@accent/0.2', z: -0.5, anim: A('zoomIn', 0.1, { dur: 1.3 }) }),
      text('ما في أداة رح تنقذك… إذا *العملية نفسها* غلط', { y: 0.45, size: 78, w: 860, lineHeight: 1.45, anim: A('maskUp', 0.6, { split: 'line', stagger: 0.18, dur: 0.9 }) }),
      shape('line', { y: 0.64, w: 80, h: 6, strokeW: 6, stroke: '@accent', anim: A('draw', 1.9, { dur: 0.6 }) }),
      text('درس من 40 مشروع أتمتة', { y: 0.69, size: 36, weight: 600, color: '@muted', anim: A('riseSoft', 2.1) }),
      sig({ anim: A('draw', 2.5, { dur: 1.2 }) }),
    ],
  }, { tags: 'quote اقتباس درس', transition: 'fade' }),

  tpl('vis-quote-testimonial', 'رأي عميل مع صورة', 'quote', {
    duration: 7, bg: { type: 'bokeh' }, camera: { type: 'drift', amount: 0.7 },
    elements: [
      shape('rect', { y: 0.5, w: 900, h: 930, radius: 48, glass: true, shadow: 1, anim: A('riseBlur', 0.1, { dur: 1 }) }),
      el('image', { y: 0.24, w: 190, h: 190, mask: 'circle', border: '@accent', borderW: 5, z: 0.3, anim: A('pop', 0.5) }),
      el('icon', { name: 'star', y: 0.355, size: 44, repeat: 5, gap: 14, filled: true, color: '@accent', anim: A('none', 0.9, { stagger: 0.08, dur: 0.5 }) }),
      text('«الوكيل اللي بناه نور وفّر علينا *20 ساعة* بالأسبوع، وصار الرد على العملاء فوري»', { y: 0.52, size: 50, weight: 500, w: 780, lineHeight: 1.6, anim: A('blurIn', 1.3, { split: 'word', stagger: 0.05, dur: 0.7 }) }),
      text('سارة الخطيب', { y: 0.7, size: 40, weight: 700, anim: A('rise', 2.7) }),
      text('Operations Lead · Riyadh', { y: 0.745, size: 26, font: '@mono', weight: 400, color: '@muted', anim: A('rise', 2.9) }),
    ],
  }, { tags: 'testimonial review رأي عميل تقييم', transition: 'blur' }),

  tpl('vis-quote-lesson', 'درس تعلمته', 'quote', {
    duration: 6, bg: { type: 'contour' }, camera: { type: 'panL', amount: 0.8 },
    elements: [
      veil({ y: 0.45, h: 800 }),
      tag('// درس تعلّمته', { x: 0.5, y: 0.2 }),
      text('ابدأ *صغير*. أتمت مهمة وحدة، وبعدين كبّر.', { y: 0.42, size: 92, w: 880, hl: 'marker', lineHeight: 1.4, anim: A('blurIn', 0.6, { split: 'word', stagger: 0.1, dur: 0.8 }) }),
      text('بعد 3 سنين وأكتر من 200 workflow', { y: 0.63, size: 40, weight: 400, color: '@muted', anim: A('maskUp', 2.0) }),
      status('lesson 07', { x: 0.5, y: 0.73, anim: A('fade', 2.4) }),
      sig(),
    ],
  }, { tags: 'lesson tip درس نصيحة', transition: 'wipe' }),

  tpl('vis-quote-handwritten', 'اقتباس بخط اليد', 'quote', {
    duration: 6, bg: { type: 'solid', color: '@bg2' }, camera: { type: 'push', amount: 0.6 }, fx: { grain: 0.8, vignette: 0.5 },
    elements: [
      text('الشغل الحلو بياخد وقت… بس بيضل', { y: 0.42, font: 'Aref Ruqaa', size: 112, weight: 700, w: 900, lineHeight: 1.5, anim: A('wipeL', 0.4, { dur: 2.2, ease: 'cubicInOut' }) }),
      shape('curve', { y: 0.6, w: 420, h: 70, strokeW: 7, stroke: '@accent', anim: A('draw', 2.6, { dur: 0.9 }) }),
      text('— نور', { y: 0.7, font: 'Aref Ruqaa', size: 58, weight: 700, color: '@accent', anim: A('fade', 3.2) }),
    ],
  }, { tags: 'handwritten calligraphy خط يد رقعة', transition: 'blur' }),

  tpl('vis-quote-serif', 'اقتباس كلاسيكي', 'quote', {
    duration: 6, bg: { type: 'gradient', angle: 180 }, camera: { type: 'none' }, fx: { letterbox: 0.06 },
    elements: [
      shape('line', { y: 0.31, w: 520, h: 4, strokeW: 2, stroke: '@fg/0.4', anim: A('draw', 0.2, { dur: 1.2 }) }),
      text('البساطة هي أعلى درجات الإتقان', { y: 0.45, font: 'Amiri', size: 98, weight: 700, w: 820, lineHeight: 1.5, anim: A('blurIn', 0.6, { split: 'line', stagger: 0.3, dur: 1.4 }) }),
      text('LEONARDO DA VINCI', { y: 0.615, font: '@mono', size: 28, weight: 400, letterSpacing: 0.3, color: '@muted', anim: A('track', 1.8, { dur: 1.4 }) }),
      shape('line', { y: 0.68, w: 520, h: 4, strokeW: 2, stroke: '@fg/0.4', anim: A('draw', 0.2, { dur: 1.2 }) }),
    ],
  }, { tags: 'serif classic كلاسيكي حكمة', transition: 'fade' }),

  tpl('vis-quote-aurora', 'اقتباس فوق الشفق', 'quote', {
    duration: 6.5, bg: { type: 'aurora' }, camera: { type: 'pull', amount: 0.8 },
    elements: [
      el('particles', { kind: 'dust', count: 60, w: 1000, h: 1250, anim: A('fade', 0, { dur: 1.5 }) }),
      el('icon', { name: 'sparkles', y: 0.24, size: 90, color: '@accent', anim: A('spin', 0.3, { dur: 1, loop: 'float' }) }),
      text('كل يوم بتأجّل فيه الأتمتة… *بتدفع* تمنه', { y: 0.46, size: 88, w: 880, hl: 'gradient', glow: 0.3, lineHeight: 1.4, anim: A('pushIn', 0.7, { split: 'word', stagger: 0.09, dur: 1 }) }),
      text('ساعات ضايعة · فرص ضايعة · عملاء ضايعين', { y: 0.66, size: 36, weight: 400, color: '@muted', anim: A('riseBlur', 2.3) }),
    ],
  }, { tags: 'aurora quote شفق', transition: 'zoom' }),

  tpl('vis-quote-post', 'اقتباس كبوست', 'quote', {
    duration: 6.5, bg: { type: 'dots', size: 48 }, camera: { type: 'orbit', amount: 0.8 },
    elements: [
      shape('rect', { y: 0.5, w: 900, h: 720, radius: 40, fill: '@card', shadow: 1.2, anim: A('tilt', 0.2, { dur: 1 }) }),
      shape('circle', { x: 0.8, y: 0.3, w: 110, h: 110, fill: '@accent', anim: A('pop', 0.6) }),
      text('ن', { x: 0.8, y: 0.3, size: 58, color: '@ink', anim: A('pop', 0.6) }),
      text('نور الدين طفي', { x: 0.52, y: 0.288, size: 38, weight: 700, w: 420, align: 'start', anim: A('fade', 0.8) }),
      text('@nouraldeentofi', { x: 0.52, y: 0.327, size: 26, font: '@mono', weight: 400, color: '@muted', w: 420, align: 'right', anim: A('fade', 0.9) }),
      text('أكبر غلطة: تبني AI Agent قبل ما تفهم *الـ process* يدوياً.', { y: 0.49, size: 52, weight: 500, w: 780, align: 'start', lineHeight: 1.6, anim: A('typewriter', 1.2, { dur: 2.0 }) }),
      shape('line', { y: 0.63, w: 780, h: 2, strokeW: 2, stroke: '@fg/0.1', anim: A('growC', 3.0) }),
      el('icon', { name: 'heart', x: 0.78, y: 0.69, size: 40, color: '@accent', filled: true, anim: A('pop', 3.2) }),
      el('counter', { x: 0.68, y: 0.69, to: 1240, size: 34, font: '@mono', weight: 600, color: '@fg', anim: A('fade', 3.2) }),
      el('icon', { name: 'refresh', x: 0.52, y: 0.69, size: 38, color: '@muted', anim: A('pop', 3.35) }),
      el('counter', { x: 0.44, y: 0.69, to: 186, size: 34, font: '@mono', weight: 600, color: '@fg', anim: A('fade', 3.35) }),
      el('icon', { name: 'message', x: 0.3, y: 0.69, size: 38, color: '@muted', anim: A('pop', 3.5) }),
      el('counter', { x: 0.22, y: 0.69, to: 92, size: 34, font: '@mono', weight: 600, color: '@fg', anim: A('fade', 3.5) }),
    ],
  }, { tags: 'post tweet بوست اقتباس', transition: 'cover' }),

  // ================================================================ 3D
  tpl('vis-3d-sphere', 'كرة نقاط عملاقة', '3d', {
    duration: 6, bg: { type: 'radial', size: 0.7 }, camera: { type: 'dolly' },
    elements: [
      glowAt(0.5, 0.4, { alpha: 0.28, w: 1100, h: 1100 }),
      el('obj3d', { shape: 'sphere', y: 0.4, size: 760, speed: 0.35, style: 'dots', anim: A('zoomOut', 0.1, { dur: 1.6 }) }),
      text('بياناتك صارت *ذكاء*', { y: 0.75, size: 96, anim: A('riseBlur', 1.2, { split: 'word', stagger: 0.12 }) }),
      text('520 نقطة · كل وحدة إلها معنى', { y: 0.84, size: 36, font: '@mono', weight: 400, color: '@muted', anim: A('fade', 2) }),
    ],
  }, { tags: '3d sphere data بيانات', transition: 'zoomThrough' }),

  tpl('vis-3d-cube-orbit', 'مكعب وأدوات حواليه', '3d', {
    duration: 7, bg: { type: 'floor', horizon: 0.64, sun: false }, camera: { type: 'orbit', amount: 0.8 },
    elements: [
      el('obj3d', { shape: 'cube', y: 0.38, size: 520, speed: 0.6, glow: 0.6, anim: A('spin', 0.2, { dur: 1.4 }) }),
      text('React', { x: 0.2, y: 0.22, size: 40, font: '@mono', weight: 600, color: '@accent', z: 0.8, box: { fill: '@card', stroke: '@accent/0.4', padX: 24, padY: 10, radius: 14 }, anim: A('pop', 1.0, { loop: 'orbit' }) }),
      text('n8n', { x: 0.82, y: 0.27, size: 40, font: '@mono', weight: 600, color: '@accent', z: -0.6, box: { fill: '@card', stroke: '@accent/0.4', padX: 24, padY: 10, radius: 14 }, anim: A('pop', 1.2, { loop: 'orbit', phase: 2 }) }),
      text('MCP', { x: 0.22, y: 0.52, size: 40, font: '@mono', weight: 600, color: '@accent', z: 0.5, box: { fill: '@card', stroke: '@accent/0.4', padX: 24, padY: 10, radius: 14 }, anim: A('pop', 1.4, { loop: 'orbit', phase: 4 }) }),
      text('Claude', { x: 0.78, y: 0.55, size: 40, font: '@mono', weight: 600, color: '@accent', z: 1, box: { fill: '@card', stroke: '@accent/0.4', padX: 24, padY: 10, radius: 14 }, anim: A('pop', 1.6, { loop: 'orbit', phase: 1 }) }),
      text('نظام واحد… *كل الأدوات* حواليه', { y: 0.8, size: 60, w: 780, shadow: 0.6, anim: A('maskUp', 1.8, { split: 'word', stagger: 0.08 }) }),
    ],
  }, { tags: '3d cube stack أدوات', transition: 'spin' }),

  tpl('vis-3d-icosa', 'بلورة في نفق', '3d', {
    duration: 6, bg: { type: 'tunnel', speed: 0.06 }, camera: { type: 'push' }, fx: { vignette: 0.6 },
    elements: [
      tag('// architecture', { x: 0.5, y: 0.11 }),
      el('obj3d', { shape: 'icosa', y: 0.43, size: 600, speed: 0.4, glow: 0.8, strokeW: 3, anim: A('iris', 0.2, { dur: 1.4, loop: 'float' }) }),
      text('بنية *متينة* من أول يوم', { y: 0.78, size: 86, anim: A('zoomIn', 1.4, { split: 'word', stagger: 0.1 }) }),
    ],
  }, { tags: '3d crystal architecture بنية', transition: 'circle' }),

  tpl('vis-3d-knot', 'عقدة لانهائية', '3d', {
    duration: 6, bg: { type: 'spotlight' }, camera: { type: 'push', amount: 1.1 },
    elements: [
      el('obj3d', { shape: 'torus', y: 0.4, size: 820, speed: -0.2, color: '@fg/0.25', color2: '@fg/0.12', style: 'lines', z: -0.6, anim: A('fade', 0, { dur: 1.5 }) }),
      el('obj3d', { shape: 'knot', y: 0.4, size: 600, speed: 0.7, glow: 0.9, anim: A('draw', 0.2, { dur: 2 }) }),
      text('INFINITE LOOP', { y: 0.74, size: 110, letterSpacing: 0.02, anim: A('scatter', 1.2, { split: 'letter', stagger: 0.03, dur: 1 }) }),
      text('الـ workflow الصح بيشتغل للأبد بدون ما تلمسه', { y: 0.83, size: 38, weight: 400, color: '@muted', w: 880, anim: A('riseSoft', 2.4) }),
    ],
  }, { tags: '3d knot torus loop', transition: 'ink' }),

  tpl('vis-3d-helix', 'DNA الأتمتة', '3d', {
    duration: 6.5, bg: { type: 'plexus', count: 50 }, camera: { type: 'panR', amount: 0.8 },
    elements: [
      el('obj3d', { shape: 'helix', x: 0.26, y: 0.5, size: 880, speed: 0.8, tilt: 0.2, glow: 0.4, anim: A('unfold', 0.2, { dur: 1.4 }) }),
      tag('// genome', { x: 0.75, y: 0.24 }),
      text('الأتمتة صارت جزء من *DNA* شركتك', { x: 0.68, y: 0.43, size: 74, w: 560, align: 'start', lineHeight: 1.35, anim: A('blurSlideR', 0.8, { split: 'line', stagger: 0.15 }) }),
      el('list', { x: 0.68, y: 0.67, w: 560, size: 36, gap: 22, icon: 'dot', items: ['مبيعات', 'دعم العملاء', 'تقارير'], anim: A('rise', 2.0, { stagger: 0.2 }) }),
    ],
  }, { tags: '3d helix dna', transition: 'slide' }),

  tpl('vis-3d-atom', 'ذرة الداتا', '3d', {
    duration: 6, bg: { type: 'hex' }, camera: { type: 'push' },
    elements: [
      glowAt(0.5, 0.45, { alpha: 0.2 }),
      text('كل شي بيدور حول *الداتا*', { y: 0.12, size: 76, anim: A('drop', 0.6, { split: 'word', stagger: 0.08 }) }),
      el('obj3d', { shape: 'atom', y: 0.45, size: 660, speed: 0.5, anim: A('zoomRot', 0.2, { dur: 1.3 }) }),
      text('خلّي الداتا بمكان واحد، والباقي بيمشي لحاله', { y: 0.78, size: 40, weight: 400, color: '@muted', w: 820, anim: A('riseSoft', 1.8) }),
      sig(),
    ],
  }, { tags: '3d atom data ذرة', transition: 'diamond' }),

  tpl('vis-3d-wave', 'موجة ثلاثية', '3d', {
    duration: 6, bg: { type: 'gradient', angle: 0 }, camera: { type: 'rise' }, fx: { vignette: 0.4 },
    elements: [
      text('موجة الـ AI', { y: 0.19, size: 130, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.12, dur: 1 }) }),
      text('ما رح *تستنى* حدا', { y: 0.31, size: 78, anim: A('maskUp', 0.6, { split: 'word', stagger: 0.1 }) }),
      el('obj3d', { shape: 'wave', y: 0.68, size: 1100, speed: 0.6, anim: A('draw', 0.4, { dur: 2 }) }),
    ],
  }, { tags: '3d wave surface موجة', transition: 'wipe' }),

  tpl('vis-3d-pyramid', 'هرم فوق شبكة', '3d', {
    duration: 6.5, bg: { type: 'matrix', speed: 0.6 }, camera: { type: 'dolly' }, fx: { vignette: 0.7 },
    elements: [
      el('obj3d', { shape: 'grid3d', y: 0.46, size: 900, speed: 0.2, color: '@fg/0.4', color2: '@secondary', z: -0.7, anim: A('fade', 0, { dur: 1.2 }) }),
      el('obj3d', { shape: 'pyramid', y: 0.44, size: 560, speed: 0.5, glow: 0.7, strokeW: 3.5, anim: A('draw', 0.4, { dur: 1.6 }) }),
      veil({ y: 0.12, w: 1100, h: 300, alpha: 0.85 }),
      text('3 طبقات لأي نظام *ناجح*', { y: 0.12, size: 76, anim: A('flicker', 0.8, { dur: 0.8 }) }),
      veil({ y: 0.8, w: 1100, h: 260, alpha: 0.85 }),
      text('داتا  ←  منطق  ←  واجهة', { y: 0.8, size: 54, weight: 700, color: '@accent', anim: A('wipeL', 1.8, { dur: 1 }) }),
    ],
  }, { tags: '3d pyramid layers طبقات', transition: 'glitch' }),

  tpl('vis-3d-globe-rings', 'كرة بحلقات 24/7', '3d', {
    duration: 6, bg: { type: 'stars', count: 200, speed: 0.6 }, camera: { type: 'push' },
    elements: [
      el('obj3d', { shape: 'rings', y: 0.42, size: 900, speed: 0.5, color: '@secondary', color2: '@accent', z: 0.2, anim: A('zoomOut', 0.4, { dur: 1.4 }) }),
      el('obj3d', { shape: 'globe', y: 0.42, size: 470, speed: 0.3, glow: 0.3, anim: A('pop', 0.1, { dur: 1 }) }),
      el('counter', { y: 0.78, to: 24, suffix: '/7', size: 150, font: '@mono', color: '@accent', glow: 0.4, anim: A('riseBlur', 1.2) }),
      text('شغّال بكل المناطق الزمنية', { y: 0.87, size: 40, weight: 400, color: '@muted', anim: A('fade', 1.8) }),
    ],
  }, { tags: '3d globe rings عالمي', transition: 'zoom' }),

  // ================================================================ abstract
  tpl('vis-abs-blobs', 'فقاعات متدرجة', 'abstract', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'drift' }, fx: { grain: 1 },
    elements: [
      shape('blob', { x: 0.3, y: 0.3, w: 620, h: 620, speed: 0.5, seed: 2, fill: { g: 'linear', colors: ['@accent', '@secondary'], angle: 135 }, anim: A('pop', 0.1, { dur: 1.2, loop: 'drift' }) }),
      shape('blob', { x: 0.74, y: 0.66, w: 540, h: 540, speed: 0.4, seed: 7, fill: { g: 'linear', colors: ['@secondary', '@bg2'], angle: 45 }, anim: A('pop', 0.4, { dur: 1.2, loop: 'drift', phase: 2 }) }),
      shape('blob', { x: 0.24, y: 0.82, w: 300, h: 300, seed: 11, fill: '@fg/0.12', anim: A('pop', 0.7, { loop: 'float' }) }),
      shape('circle', { y: 0.5, w: 640, h: 640, glass: true, shadow: 0.8, anim: A('zoomOut', 0.6, { dur: 1 }) }),
      text('أفكار *مرنة*، نتائج صلبة', { y: 0.5, size: 86, w: 540, lineHeight: 1.3, anim: A('stretch', 1.0, { split: 'word', stagger: 0.1 }) }),
    ],
  }, { tags: 'blob gradient abstract فقاعات', transition: 'ink' }),

  tpl('vis-abs-rings', 'حلقات تركيز', 'abstract', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'push', amount: 1 },
    elements: [
      shape('ring', { y: 0.42, w: 900, h: 900, strokeW: 2, stroke: '@fg/0.12', anim: A('draw', 0.1, { dur: 1.2 }) }),
      shape('ring', { y: 0.42, w: 700, h: 700, strokeW: 2, stroke: '@fg/0.18', anim: A('draw', 0.3, { dur: 1.2 }) }),
      shape('arc', { y: 0.42, w: 820, h: 820, a0: -90, a1: 130, strokeW: 12, stroke: '@accent', anim: A('draw', 0.5, { dur: 1.2, loop: 'spinSlow' }) }),
      shape('arc', { y: 0.42, w: 620, h: 620, a0: 90, a1: 300, strokeW: 6, stroke: '@secondary', anim: A('draw', 0.7, { dur: 1.2, loop: 'spinSlow', loopSpeed: -1.6 }) }),
      shape('circle', { x: 0.5, y: 0.118, w: 34, h: 34, fill: '@accent', glow: 1, anim: A('pop', 1.4, { loop: 'pulse' }) }),
      el('counter', { y: 0.42, to: 87, suffix: '%', size: 190, font: '@mono', color: '@fg', anim: A('blurIn', 0.8, { dur: 1 }) }),
      text('من وقتي صار للشغل *المهم*', { y: 0.8, size: 70, anim: A('riseBlur', 1.8, { split: 'word', stagger: 0.08 }) }),
    ],
  }, { tags: 'rings focus percent تركيز', transition: 'circle' }),

  tpl('vis-abs-burst', 'ملصق «جديد!»', 'abstract', {
    duration: 5, bg: { type: 'rings', count: 7 }, camera: { type: 'punch' },
    elements: [
      shape('burst', { y: 0.4, w: 700, h: 700, sides: 18, inner: 0.82, fill: '@accent', anim: A('elastic', 0.2, { dur: 1.2, loop: 'spinSlow' }) }),
      text('جديد!', { y: 0.4, size: 170, color: '@ink', rot: -8, anim: A('popRotate', 0.7, { dur: 0.7, loop: 'jelly' }) }),
      text('أطلقت قالب n8n مجاني للتسويق', { y: 0.73, size: 64, w: 860, anim: A('wave', 1.3, { split: 'word', stagger: 0.06 }) }),
      text('الرابط بأول تعليق', { y: 0.83, size: 38, weight: 400, color: '@muted', anim: A('fade', 2) }),
    ],
  }, { tags: 'burst sticker new جديد', transition: 'zoomThrough' }),

  tpl('vis-abs-spiral', 'حلزون خطوة بخطوة', 'abstract', {
    duration: 6, bg: { type: 'waves' }, camera: { type: 'pull' },
    elements: [
      shape('spiral', { y: 0.38, w: 700, h: 700, cycles: 4, strokeW: 6, stroke: '@accent', speed: 0.4, anim: A('draw', 0.2, { dur: 2.2 }) }),
      shape('circle', { y: 0.38, w: 60, h: 60, fill: '@accent', glow: 0.8, anim: A('pop', 2.2, { loop: 'pulse' }) }),
      text('خطوة… *بخطوة*', { y: 0.74, size: 110, anim: A('maskLeft', 1.4, { split: 'word', stagger: 0.2 }) }),
      text('كل workflow كبير بلّش بعقدة وحدة', { y: 0.84, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 2.4) }),
    ],
  }, { tags: 'spiral steps حلزون', transition: 'blur' }),

  tpl('vis-abs-bauhaus', 'تكوين هندسي', 'abstract', {
    duration: 5.5, bg: { type: 'solid' }, camera: { type: 'none' },
    elements: [
      shape('circle', { x: 0.28, y: 0.3, w: 420, h: 420, fill: '@accent', anim: A('slideL', 0.1, { dur: 0.9 }) }),
      shape('rect', { x: 0.74, y: 0.3, w: 380, h: 380, fill: '@secondary', anim: A('drop', 0.3, { dur: 0.9 }) }),
      shape('triangle', { x: 0.74, y: 0.62, w: 380, h: 330, fill: '@fg', anim: A('slideR', 0.5, { dur: 0.9 }) }),
      shape('pill', { x: 0.28, y: 0.62, w: 420, h: 200, fill: '@fg/0.15', anim: A('grow', 0.7, { dur: 0.9 }) }),
      shape('dots', { x: 0.5, y: 0.46, w: 170, h: 170, cols: 5, rows: 5, dot: 6, fill: '@fg/0.5', anim: A('fade', 0.9) }),
      text('شكل. لون. *فكرة*.', { y: 0.85, size: 96, anim: A('maskUp', 1.2, { split: 'word', stagger: 0.12 }) }),
    ],
  }, { tags: 'bauhaus geometric هندسي', transition: 'tiles' }),

  tpl('vis-abs-morph', 'تدرجات بتتشكل', 'abstract', {
    duration: 6, bg: { type: 'aurora', speed: 1.4 }, camera: { type: 'dolly' },
    elements: [
      shape('blob', { x: 0.42, y: 0.46, w: 860, h: 860, amp: 0.25, speed: 0.6, fill: { g: 'radial', colors: ['@secondary/0.55', '@accent/0.22', '@bg/0'] }, anim: A('blurIn', 0, { dur: 1.5 }) }),
      shape('blob', { x: 0.64, y: 0.56, w: 600, h: 600, amp: 0.3, speed: 0.8, seed: 9, opacity: 0.6, fill: { g: 'linear', colors: ['@secondary/0.6', '@accent/0.3'], angle: 200 }, anim: A('blurIn', 0.3, { dur: 1.5, loop: 'orbit' }) }),
      text('الهوية مش شعار…', { y: 0.42, size: 96, w: 860, shadow: 0.6, anim: A('riseBlur', 0.8, { split: 'word', stagger: 0.12 }) }),
      text('هي *إحساس* بيضل', { y: 0.54, size: 96, w: 860, hl: 'underline', shadow: 0.6, anim: A('riseBlur', 1.6, { split: 'word', stagger: 0.12 }) }),
    ],
  }, { tags: 'gradient morph identity هوية', transition: 'fade' }),

  tpl('vis-abs-geogrid', 'شبكة مربعات', 'abstract', {
    duration: 5.5, bg: { type: 'grid', size: 120 }, camera: { type: 'push' },
    elements: [
      ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
        const center = r === 1 && c === 1;
        return shape('rect', {
          x: 0.27 + c * 0.23, y: 0.24 + r * 0.184, w: 200, h: 200, radius: 30,
          fill: center ? '@accent' : '@fg/0.07', stroke: center ? null : '@fg/0.12', strokeW: 2, glow: center ? 0.5 : 0,
          anim: A('flipY', 0.1 + (r + c) * 0.1, { dur: 0.7 }),
        });
      })),
      el('icon', { name: 'bolt', y: 0.424, size: 90, color: '@ink', strokeW: 2.4, anim: A('pop', 0.75) }),
      text('نظام. ترتيب. *نتيجة*.', { y: 0.83, size: 84, anim: A('maskUp', 1.2, { split: 'word', stagger: 0.12 }) }),
    ],
  }, { tags: 'grid squares system شبكة', transition: 'blinds' }),

  tpl('vis-abs-stickers', 'ملصقات الستاك', 'abstract', {
    duration: 6, bg: { type: 'dots', size: 46, wave: false }, camera: { type: 'drift' },
    elements: [
      text('الستاك تبعي', { y: 0.46, size: 120, anim: A('slam', 0.2, { dur: 0.6 }) }),
      text('n8n', { x: 0.25, y: 0.24, rot: -10, size: 54, font: '@mono', weight: 700, color: '@ink', box: { fill: '@accent', padX: 30, padY: 14, radius: 18, shadow: true }, anim: A('popRotate', 0.8, { loop: 'float' }) }),
      text('React', { x: 0.74, y: 0.27, rot: 8, size: 50, font: '@mono', weight: 700, color: '@bg', box: { fill: '@fg', padX: 30, padY: 14, radius: 18 }, anim: A('popRotate', 1.0, { loop: 'float', phase: 1 }) }),
      text('Python', { x: 0.5, y: 0.12, rot: 4, size: 44, font: '@mono', weight: 700, color: '@accent', box: { fill: '@card', stroke: '@accent', strokeW: 3, padX: 28, padY: 12, radius: 18 }, anim: A('popRotate', 1.2, { loop: 'float', phase: 2 }) }),
      text('MCP', { x: 0.22, y: 0.67, rot: 6, size: 54, font: '@mono', weight: 700, color: '@ink', box: { fill: '@secondary', padX: 30, padY: 14, radius: 18 }, anim: A('popRotate', 1.4, { loop: 'float', phase: 3 }) }),
      text('Claude', { x: 0.77, y: 0.65, rot: -7, size: 50, font: '@mono', weight: 700, color: '@accent', box: { fill: '@card', stroke: '@accent', strokeW: 3, padX: 30, padY: 14, radius: 18, shadow: true }, anim: A('popRotate', 1.6, { loop: 'float', phase: 4 }) }),
      text('Supabase', { x: 0.5, y: 0.83, rot: -3, size: 48, font: '@mono', weight: 700, color: '@ink', box: { fill: '@accent', padX: 30, padY: 14, radius: 18 }, anim: A('popRotate', 1.8, { loop: 'float', phase: 5 }) }),
    ],
  }, { tags: 'stickers stack tools ملصقات أدوات', transition: 'spin' }),

  tpl('vis-abs-liquid-glass', 'زجاج سائل', 'abstract', {
    duration: 6, bg: { type: 'blobs', speed: 1.5 }, camera: { type: 'orbit' },
    elements: [
      shape('circle', { x: 0.82, y: 0.18, w: 130, h: 130, glass: true, z: -0.4, anim: A('zoomOut', 0.5, { loop: 'float', phase: 1 }) }),
      shape('circle', { x: 0.22, y: 0.24, w: 260, h: 260, glass: true, z: 0.6, anim: A('zoomOut', 0.2, { loop: 'float' }) }),
      shape('rect', { y: 0.5, w: 820, h: 520, radius: 60, glass: true, shadow: 1, anim: A('pushIn', 0.3, { dur: 1.1 }) }),
      shape('pill', { x: 0.76, y: 0.78, w: 360, h: 140, glass: true, z: 0.8, anim: A('zoomOut', 0.4, { loop: 'float', phase: 2 }) }),
      text('واجهات *زجاجية*', { y: 0.46, size: 96, anim: A('riseBlur', 0.9, { split: 'word' }) }),
      text('Liquid Glass · مباشرة بالمتصفح', { y: 0.56, size: 40, weight: 400, color: '@muted', anim: A('fade', 1.6) }),
    ],
  }, { tags: 'glass liquid زجاج', transition: 'blur' }),

  // ================================================================ promo
  tpl('vis-promo-launch', 'إطلاق منتج', 'promo', {
    duration: 6, bg: { type: 'rays', count: 16, speed: 0.12 }, camera: { type: 'punch' },
    elements: [
      el('ticker', { y: 0.075, w: 1100, text: 'NEW LAUNCH', size: 40, rows: 1, speed: 200, font: '@mono', color: '@accent', anim: A('fade', 0) }),
      el('particles', { kind: 'burst', y: 0.38, w: 1000, h: 1000, count: 90, anim: A('fade', 1.3, { dur: 0.15 }) }),
      text('FlowPilot', { y: 0.38, size: 180, letterSpacing: -0.02, anim: A('letterDrop', 0.5, { split: 'letter', stagger: 0.05, dur: 0.9 }) }),
      text('أداة بتبني workflow كامل *من جملة وحدة*', { y: 0.53, size: 56, w: 860, anim: A('riseBlur', 1.4, { split: 'word', stagger: 0.06 }) }),
      pill('جرّبها مجاناً', { y: 0.68, size: 50, box: { fill: '@accent', padX: 56, padY: 22 }, anim: A('elastic', 2.2, { dur: 1, loop: 'heartbeat' }) }),
      el('ticker', { y: 0.925, w: 1100, text: 'FLOWPILOT', size: 40, rows: 1, speed: -200, font: '@mono', color: '@fg', outline: true, anim: A('fade', 0) }),
    ],
  }, { tags: 'launch product إطلاق', transition: 'zoomThrough' }),

  tpl('vis-promo-discount', 'خصم ٥٠٪', 'promo', {
    duration: 5.5, bg: { type: 'stripes', width: 90, speed: 60 }, camera: { type: 'shake', amount: 0.4 },
    elements: [
      shape('burst', { y: 0.36, w: 760, h: 760, sides: 22, inner: 0.86, fill: '@accent', anim: A('spin', 0.1, { dur: 1, loop: 'spinSlow' }) }),
      el('counter', { y: 0.34, to: 50, suffix: '%', size: 250, color: '@ink', anim: A('slam', 0.4, { dur: 0.6 }) }),
      text('خصم', { y: 0.49, size: 70, color: '@ink', anim: A('pop', 0.9) }),
      text('على كورس *n8n* الكامل', { y: 0.72, size: 72, w: 880, anim: A('maskUp', 1.3, { split: 'word', stagger: 0.08 }) }),
      text('لأول 100 مشترك · ينتهي الجمعة', { y: 0.83, size: 36, weight: 500, color: '@fg', box: { fill: '@fg/0.08', padX: 30, padY: 12 }, anim: A('riseSoft', 2) }),
    ],
  }, { tags: 'discount sale offer خصم عرض', transition: 'panel' }),

  tpl('vis-promo-webinar', 'ويبينار بتاريخ', 'promo', {
    duration: 7, bg: { type: 'grid', size: 70 }, camera: { type: 'push' },
    elements: [
      status('LIVE · مجاني', { x: 0.5, y: 0.08 }),
      shape('rect', { x: 0.25, y: 0.3, w: 300, h: 340, radius: 36, fill: '@accent', shadow: 1, anim: A('flipX', 0.3, { dur: 1 }) }),
      text('14', { x: 0.25, y: 0.28, size: 160, font: '@mono', color: '@ink', anim: A('pop', 0.8) }),
      text('نوفمبر', { x: 0.25, y: 0.375, size: 44, weight: 700, color: '@ink', anim: A('fade', 1) }),
      text('ابنِ أول *AI Agent*\nإلك بساعة وحدة', { x: 0.665, y: 0.3, size: 58, w: 540, align: 'start', lineHeight: 1.35, anim: A('blurSlideR', 0.9, { split: 'line', stagger: 0.15 }) }),
      ...[['clock', 'الساعة 8 مساءً بتوقيت الرياض'], ['video', 'أونلاين على Zoom'], ['users', '300 مقعد بس']].flatMap(([ic, label], i) => [
        el('icon', { name: ic, x: 0.84, y: 0.55 + i * 0.08, size: 40, color: '@accent', bg: '@fg/0.08', anim: A('pop', 1.6 + i * 0.2) }),
        text(label, { x: 0.5, y: 0.55 + i * 0.08, size: 40, weight: 600, w: 560, align: 'start', anim: A('blurSlideR', 1.65 + i * 0.2, { dur: 0.7 }) }),
      ]),
      pill('سجّل من الرابط', { y: 0.85, anim: A('pop', 2.6, { loop: 'pulse' }) }),
    ],
  }, { tags: 'webinar event date ويبينار حدث', transition: 'slide' }),

  tpl('vis-promo-feature', 'ميزة جديدة', 'promo', {
    duration: 6.5, bg: { type: 'radial' }, camera: { type: 'dolly' },
    elements: [
      pill('ميزة جديدة', { y: 0.09, size: 34, box: { fill: '@accent', padX: 30, padY: 12 }, anim: A('pop', 0.2) }),
      text('صار فيك تشغّل أي workflow *بالصوت*', { y: 0.21, size: 70, w: 880, anim: A('riseBlur', 0.5, { split: 'word', stagger: 0.07 }) }),
      el('device', { kind: 'browser', y: 0.6, w: 900, h: 620, url: 'app.flowpilot.ai', z: 0.2, anim: A('tilt', 1.2, { dur: 1.2 }) }),
      shape('pill', { y: 0.62, w: 640, h: 220, glass: true, shadow: 1, z: 0.6, anim: A('pop', 2.0) }),
      el('icon', { name: 'mic', x: 0.76, y: 0.62, size: 70, color: '@accent', z: 0.6, anim: A('pop', 2.2, { loop: 'pulse' }) }),
      el('equalizer', { x: 0.44, y: 0.62, w: 420, h: 130, bars: 20, z: 0.6, anim: A('fade', 2.3) }),
    ],
  }, { tags: 'feature update ميزة', transition: 'cube' }),

  tpl('vis-promo-hiring', 'عم وظّف', 'promo', {
    duration: 6.5, bg: { type: 'circuit' }, camera: { type: 'panR', amount: 0.6 },
    elements: [
      tag('// we are hiring', { x: 0.5, y: 0.1 }),
      text('عم دوّر على *n8n Developer*', { y: 0.23, size: 84, w: 880, anim: A('scramble', 0.4, { dur: 1.4 }) }),
      text('Remote', { x: 0.24, y: 0.37, rot: -4, size: 38, font: '@mono', weight: 700, color: '@ink', box: { fill: '@accent', padX: 26, padY: 12, radius: 14 }, anim: A('popRotate', 1.0) }),
      text('Full-time', { x: 0.5, y: 0.38, rot: 3, size: 38, font: '@mono', weight: 700, color: '@bg', box: { fill: '@fg', padX: 26, padY: 12, radius: 14 }, anim: A('popRotate', 1.15) }),
      text('AR + EN', { x: 0.76, y: 0.37, rot: -2, size: 38, font: '@mono', weight: 700, color: '@accent', box: { fill: '@card', stroke: '@accent', strokeW: 3, padX: 26, padY: 12, radius: 14 }, anim: A('popRotate', 1.3) }),
      el('list', { y: 0.6, w: 820, size: 40, icon: 'check', items: ['خبرة سنة بـ n8n أو Make', 'بتفهم APIs و webhooks', 'بتحب تحل مشاكل حقيقية'], anim: A('rise', 1.6, { stagger: 0.2 }) }),
      pill('ابعتلي CV على الخاص', { y: 0.84, anim: A('pop', 2.6) }),
    ],
  }, { tags: 'hiring job وظيفة توظيف', transition: 'glitch' }),

  tpl('vis-promo-countdown', 'عد تنازلي للإطلاق', 'promo', {
    duration: 6, bg: { type: 'mesh', traffic: 2 }, camera: { type: 'push' },
    elements: [
      text('الإطلاق بعد', { y: 0.17, size: 70, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      ...[['3', 'يوم', 0.78], ['12', 'ساعة', 0.5], ['45', 'دقيقة', 0.22]].flatMap(([n, lab, x], i) => [
        shape('rect', { x, y: 0.4, w: 280, h: 300, radius: 36, glass: true, shadow: 0.8, anim: A('flipX', 0.4 + i * 0.15, { dur: 0.8 }) }),
        el('counter', { x, y: 0.385, to: +n, size: 140, font: '@mono', color: i === 0 ? '@accent' : '@fg', style: 'roll', anim: A('fade', 0.6 + i * 0.15) }),
        text(lab, { x, y: 0.47, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.9 + i * 0.15) }),
      ]),
      text('سجّل اسمك لتكون أول واحد يجرّبه', { y: 0.65, size: 46, w: 860, anim: A('riseSoft', 1.8) }),
      el('progress', { y: 0.78, w: 760, value: 0.72, label: 'المقاعد المحجوزة', anim: A('fade', 2.1) }),
    ],
  }, { tags: 'countdown timer عد تنازلي', transition: 'flip' }),

  tpl('vis-promo-giveaway', 'سحب وهدايا', 'promo', {
    duration: 6.5, bg: { type: 'gradient', c1: '@bg', c2: '@bg2' }, camera: { type: 'push' },
    elements: [
      el('particles', { kind: 'confetti', count: 140, w: 1000, h: 1250, anim: A('fade', 1.0, { dur: 0.5 }) }),
      el('icon', { name: 'gift', y: 0.29, size: 220, color: '@accent', strokeW: 1.6, glow: 0.6, anim: A('elastic', 0.2, { dur: 1.4, loop: 'wiggle' }) }),
      text('سحب على *3 اشتراكات* مجانية', { y: 0.5, size: 78, w: 880, anim: A('bounce', 0.8, { split: 'word', stagger: 0.08, dur: 1 }) }),
      el('list', { y: 0.7, w: 760, size: 40, icon: 'num', items: ['تابع الحساب', 'اعمل لايك للبوست', 'منشن صديق بالتعليقات'], anim: A('slideR', 1.8, { stagger: 0.22 }) }),
      text('النتائج يوم الأحد', { y: 0.88, size: 34, weight: 400, color: '@muted', anim: A('fade', 2.8) }),
    ],
  }, { tags: 'giveaway gift سحب هدية', transition: 'stripes' }),

  tpl('vis-promo-drop', 'دروب منتج', 'promo', {
    duration: 6.5, bg: { type: 'spotlight', speed: 0.6 }, camera: { type: 'dolly' }, fx: { letterbox: 0.08, grain: 0.6 },
    elements: [
      text('DROP 01', { y: 0.2, size: 104, letterSpacing: 0.12, anim: A('track', 0.2, { dur: 1.6 }) }),
      el('image', { y: 0.46, w: 620, h: 500, radius: 40, shadow: 1.3, kenburns: 0.15, z: 0.3, anim: A('pushIn', 0.8, { dur: 1.3 }) }),
      text('قوالب n8n للمتاجر', { y: 0.72, size: 64, anim: A('maskUp', 1.6, { split: 'word', stagger: 0.08 }) }),
      text('$49', { y: 0.82, size: 56, font: '@mono', weight: 700, color: '@ink', box: { fill: '@accent', padX: 40, padY: 14 }, anim: A('pop', 2.3, { loop: 'glow' }) }),
    ],
  }, { tags: 'drop product price منتج سعر', transition: 'split' }),

  // ================================================================ photo
  tpl('vis-photo-fullbleed', 'صورة كاملة مع عنوان', 'photo', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'push' },
    elements: [
      el('image', { y: 0.5, w: 1010, h: 1260, radius: 0, kenburns: 0.14, fade: 0.95, anim: A('blurIn', 0, { dur: 1.2 }) }),
      tag('// behind the scenes', { x: 0.5, y: 0.08 }),
      text('هيك بيبلّش يومي', { y: 0.73, size: 96, w: 880, align: 'start', anim: A('maskUp', 0.8, { split: 'word', stagger: 0.1 }) }),
      text('قهوة، تيرمنال، و workflow جديد كل صباح', { y: 0.81, size: 42, weight: 400, color: '@muted', w: 880, align: 'start', anim: A('riseSoft', 1.6) }),
      sig({ y: 0.92 }),
    ],
  }, { tags: 'photo fullbleed صورة كاملة', transition: 'fade' }),

  tpl('vis-photo-polaroid', 'صور بولارويد', 'photo', {
    duration: 6.5, bg: { type: 'solid', color: '@bg2' }, camera: { type: 'drift' }, fx: { grain: 1 },
    elements: [
      ...polaroid(0.33, 0.33, -8, 0.2, 'أول عميل'),
      ...polaroid(0.67, 0.41, 6, 0.7, 'الفريق'),
      ...polaroid(0.47, 0.6, -3, 1.2, 'يوم الإطلاق'),
      text('ذكريات من *2025*', { y: 0.89, size: 72, anim: A('riseBlur', 2.0, { split: 'word' }) }),
    ],
  }, { tags: 'polaroid memories بولارويد ذكريات', transition: 'whip' }),

  tpl('vis-photo-portrait', 'بورتريه دائري', 'photo', {
    duration: 6, bg: { type: 'radial' }, camera: { type: 'push' },
    elements: [
      shape('ring', { y: 0.35, w: 680, h: 680, strokeW: 2, stroke: '@fg/0.2', anim: A('zoomOut', 0.6, { loop: 'spinSlow', loopSpeed: -1 }) }),
      shape('ring', { y: 0.35, w: 600, h: 600, strokeW: 4, stroke: '@accent', dash: [18, 22], dashSpeed: 40, anim: A('draw', 0.4, { dur: 1.2, loop: 'spinSlow' }) }),
      el('image', { y: 0.35, w: 500, h: 500, mask: 'circle', kenburns: 0.1, anim: A('iris', 0.2, { dur: 1.2 }) }),
      text('نور الدين طفي', { y: 0.66, size: 88, anim: A('maskUp', 1.2, { split: 'word', stagger: 0.1 }) }),
      text('AI Automation Engineer · Frontend', { y: 0.735, size: 30, font: '@mono', weight: 400, color: '@accent', anim: A('typewriter', 1.8, { dur: 1.1 }) }),
      ...['link', 'mail', 'code', 'globe'].map((n, i) => el('icon', { name: n, x: 0.32 + i * 0.12, y: 0.84, size: 40, color: '@fg', bg: '@fg/0.08', anim: A('pop', 2.4 + i * 0.12) })),
    ],
  }, { tags: 'portrait profile بورتريه شخصي', transition: 'circle' }),

  tpl('vis-photo-split', 'صورة فوق ونص تحت', 'photo', {
    duration: 6, bg: { type: 'split', angle: -8, ratio: 0.58, c1: '@bg', c2: '@bg2' }, camera: { type: 'panL', amount: 0.6 },
    elements: [
      el('image', { y: 0.32, w: 920, h: 620, radius: 36, kenburns: 0.12, shadow: 1, anim: A('wipeDown', 0.1, { dur: 1.1 }) }),
      text('من فكرة… لنظام شغّال', { y: 0.66, size: 86, w: 880, anim: A('maskUp', 1.0, { split: 'line', stagger: 0.15 }) }),
      text('بنيت هالنظام لمطعم بالرياض بـ 10 أيام', { y: 0.765, size: 40, weight: 400, color: '@muted', w: 860, anim: A('riseSoft', 1.8) }),
      status('case study', { x: 0.5, y: 0.86, anim: A('fade', 2.2) }),
    ],
  }, { tags: 'case study photo split دراسة حالة', transition: 'wipe' }),

  tpl('vis-photo-gallery', 'معرض ٤ صور', 'photo', {
    duration: 6.5, bg: { type: 'solid' }, camera: { type: 'pull' },
    elements: [
      text('من أحدث *مشاريعي*', { y: 0.1, size: 72, anim: A('riseBlur', 0.1, { split: 'word' }) }),
      ...[['Dashboard', 0.71, 0.37], ['AI Agent', 0.29, 0.37], ['Store', 0.71, 0.7], ['CRM', 0.29, 0.7]].flatMap(([lab, x, y], i) => [
        el('image', { x, y, w: 400, h: 400, radius: 30, z: i % 2 ? 0.3 : -0.2, anim: A(i % 2 ? 'flipY' : 'flipX', 0.5 + i * 0.2, { dur: 0.9 }) }),
        text(lab, { x, y: y + 0.125, size: 24, font: '@mono', weight: 600, color: '@fg', box: { fill: '@bg/0.75', padX: 18, padY: 8 }, z: i % 2 ? 0.3 : -0.2, anim: A('pop', 1.2 + i * 0.2) }),
      ]),
      sig(),
    ],
  }, { tags: 'gallery portfolio معرض أعمال', transition: 'tiles' }),

  tpl('vis-photo-cover', 'غلاف مجلة', 'photo', {
    duration: 6, bg: { type: 'image', dim: 0.4, kenburns: 0.12 }, camera: { type: 'push' },
    elements: [
      text('AUTOMATE', { y: 0.13, size: 150, anim: A('track', 0.1, { dur: 1.6 }) }),
      text('العدد 07 · نوفمبر', { y: 0.215, size: 30, font: '@mono', weight: 400, color: '@muted', anim: A('fade', 0.8) }),
      text('كيف وفّرت *40 ساعة* بالشهر', { x: 0.66, y: 0.52, size: 46, w: 580, align: 'start', anim: A('blurSlideR', 1.3) }),
      text('*5 أدوات* ما بستغنى عنها', { x: 0.66, y: 0.6, size: 46, w: 580, align: 'start', anim: A('blurSlideR', 1.5) }),
      text('أول AI Agent إلك بـ *10 دقايق*', { x: 0.66, y: 0.68, size: 46, w: 580, align: 'start', anim: A('blurSlideR', 1.7) }),
      text('الذكاء الاصطناعي بالشغل اليومي', { y: 0.87, size: 52, weight: 800, color: '@ink', box: { fill: '@accent', padX: 30, padY: 14, radius: 8 }, anim: A('wipeL', 2.2, { dur: 0.8 }) }),
    ],
  }, { tags: 'magazine cover مجلة غلاف', transition: 'pixel' }),

  // ================================================================ outro
  tpl('vis-outro-follow', 'تابعني مع صورة', 'outro', {
    duration: 5.5, bg: { type: 'aurora' }, camera: { type: 'pull' },
    elements: [
      el('particles', { kind: 'hearts', count: 24, w: 900, h: 1200, colors: ['@accent', '@secondary'], anim: A('fade', 2.0) }),
      shape('ring', { y: 0.29, w: 370, h: 370, strokeW: 4, stroke: '@accent/0.5', anim: A('zoomOut', 0.4, { loop: 'pulse' }) }),
      el('image', { y: 0.29, w: 300, h: 300, mask: 'circle', border: '@accent', borderW: 6, anim: A('pop', 0.2) }),
      text('تابعني', { y: 0.52, size: 130, anim: A('slam', 0.6, { dur: 0.6 }) }),
      text('@nouraldeentofi', { y: 0.62, size: 42, font: '@mono', weight: 500, color: '@accent', anim: A('typewriter', 1.2, { dur: 0.9 }) }),
      pill('+ متابعة', { y: 0.75, anim: A('elastic', 1.8, { dur: 1, loop: 'heartbeat' }) }),
    ],
  }, { tags: 'follow outro تابعني', transition: 'zoom' }),

  tpl('vis-outro-linkbio', 'الرابط بالبايو', 'outro', {
    duration: 5, bg: { type: 'waves', lines: 18 }, camera: { type: 'rise' },
    elements: [
      shape('arrow', { y: 0.2, w: 220, h: 60, rot: -90, strokeW: 10, stroke: '@accent', anim: A('draw', 0.2, { dur: 0.7, loop: 'pulse' }) }),
      text('الرابط بالبايو', { y: 0.41, size: 120, anim: A('maskUp', 0.5, { split: 'word', stagger: 0.12 }) }),
      text('nouraldeentofi.com', { y: 0.55, size: 44, font: '@mono', weight: 600, color: '@accent', box: { fill: '@fg/0.06', stroke: '@accent/0.5', padX: 40, padY: 18 }, anim: A('scramble', 1.2, { dur: 1.2 }) }),
      el('list', { y: 0.74, w: 700, size: 38, icon: 'sparkles', items: ['قوالب n8n مجانية', 'الكورس الكامل', 'احجز استشارة'], anim: A('rise', 1.8, { stagger: 0.18 }) }),
    ],
  }, { tags: 'link in bio رابط', transition: 'slide' }),

  tpl('vis-outro-thanks', 'شكراً', 'outro', {
    duration: 5, bg: { type: 'bokeh' }, camera: { type: 'push' },
    elements: [
      el('particles', { kind: 'stars', count: 120, w: 1000, h: 1250, anim: A('fade', 0, { dur: 1 }) }),
      text('شكراً', { y: 0.4, size: 240, fill: { g: 'linear', colors: ['@accent', '@secondary'], angle: 90 }, anim: A('blurIn', 0.2, { dur: 1.4 }) }),
      text('إنك كمّلت للآخر', { y: 0.56, size: 70, anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.1 }) }),
      text('شاركه مع حدا بيحتاجه', { y: 0.66, size: 40, weight: 400, color: '@muted', anim: A('fade', 1.8) }),
      sig({ y: 0.9 }),
    ],
  }, { tags: 'thanks شكرا', transition: 'blur' }),

  tpl('vis-outro-subscribe', 'اشترك بالنشرة', 'outro', {
    duration: 5.5, bg: { type: 'plexus', count: 60 }, camera: { type: 'dolly' },
    elements: [
      el('icon', { name: 'bell', y: 0.25, size: 160, color: '@accent', bg: '@accent/0.12', anim: A('pop', 0.2, { loop: 'wiggle', loopAmp: 2 }) }),
      text('اشترك بالنشرة', { y: 0.44, size: 110, anim: A('skew', 0.6, { split: 'word', stagger: 0.12 }) }),
      text('كل خميس: workflow جاهز + شرح 5 دقايق', { y: 0.545, size: 42, weight: 400, color: '@muted', w: 860, anim: A('riseSoft', 1.3) }),
      el('counter', { y: 0.67, to: 2840, prefix: '+', size: 110, font: '@mono', color: '@fg', anim: A('rise', 1.6) }),
      text('مشترك لحد هلق', { y: 0.75, size: 36, weight: 400, color: '@muted', anim: A('fade', 2) }),
      pill('اشترك', { y: 0.87, anim: A('pop', 2.4, { loop: 'pulse' }) }),
    ],
  }, { tags: 'subscribe newsletter نشرة اشتراك', transition: 'cover' }),

  tpl('vis-outro-signature', 'توقيع فقط', 'outro', {
    duration: 5, bg: { type: 'mesh', density: 1.4, traffic: 2 }, camera: { type: 'pull', amount: 1.2 },
    elements: [
      glowAt(0.5, 0.47, { alpha: 0.15 }),
      el('signature', { y: 0.46, size: 70, anim: A('draw', 0.4, { dur: 1.6 }) }),
      shape('line', { y: 0.535, w: 620, h: 4, strokeW: 2, stroke: '@fg/0.2', anim: A('growC', 1.8, { dur: 0.9 }) }),
      text('nouraldeentofi.com', { y: 0.58, size: 30, font: '@mono', weight: 400, color: '@muted', anim: A('fade', 2.2) }),
    ],
  }, { tags: 'signature end card توقيع', transition: 'circle' }),

  tpl('vis-outro-contact', 'معلومات التواصل', 'outro', {
    duration: 6, bg: { type: 'grid', size: 90 }, camera: { type: 'push' },
    elements: [
      text('خلّينا *نحكي*', { y: 0.16, size: 110, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.12 }) }),
      ...contactRow(0.35, 'globe', 'nouraldeentofi.com', 0.8),
      ...contactRow(0.465, 'at', '@nouraldeentofi', 1.0),
      ...contactRow(0.58, 'link', 'linkedin · Nour Aldeen Tofi', 1.2),
      ...contactRow(0.695, 'pin', 'Remote · GMT+3', 1.4),
      sig({ y: 0.9 }),
    ],
  }, { tags: 'contact تواصل', transition: 'blinds' }),
];
