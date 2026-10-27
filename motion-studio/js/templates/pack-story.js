// Story pack: openers, hooks, kinetic type, quotes and outros that tell a story in first person.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl, bgp } from './kit.js';

// straight line between two frame points (fractions) on the 4:5 frame (1000 x 1250 design units)
function link(x1, y1, x2, y2, o = {}) {
  const dx = (x2 - x1) * 1000, dy = (y2 - y1) * 1250;
  return shape('line', { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: Math.hypot(dx, dy), h: 6, rot: (Math.atan2(dy, dx) * 180) / Math.PI, stroke: '@fg/0.35', strokeW: 3, sfx: 'none', ...o });
}

// a flat tile with a word on it, both sharing one entrance
function tile(word, x, y, start, o = {}) {
  const a = A(o.inName || 'tilt', start, { dur: 0.6, ease: 'backOutSoft' });
  const hero = !!o.hero;
  return [
    shape('rect', { x, y, w: o.w ?? 200, h: o.h ?? 300, radius: 18, fill: hero ? '@accent' : '@card', shadow: 1, sfx: o.sfx ?? 'tap', anim: a }),
    text(word, { x, y, size: o.size ?? 60, w: (o.w ?? 200) - 20, color: hero ? '@ink' : '@fg', font: o.font, weight: o.weight ?? 800, sfx: 'none', anim: a }),
  ];
}

// one split-flap letter: card, hinge line and a scrambling glyph
function flap(ch, x, y, start, hero) {
  return [
    shape('rect', { x, y, w: 96, h: 140, radius: 8, fill: '@raised', stroke: '@fg/0.12', strokeW: 2, sfx: 'none', anim: A('flipX', start, { dur: 0.5 }) }),
    text(ch, { x, y, size: 92, w: 96, font: '@mono', weight: 700, color: hero ? '@accent' : '@fg', sfx: 'none', anim: A('scramble', start, { dur: 0.9 }) }),
    shape('line', { x, y, w: 96, h: 4, stroke: '@bg/0.7', strokeW: 3, sfx: 'none', anim: A('flipX', start, { dur: 0.5 }) }),
  ];
}

// a sign hanging on a string from the top edge; string and sign move together
function hanging(word, x, y, start, hero) {
  const a = A('drop', start, { dur: 0.9, ease: 'backOutSoft', loop: 'float', loopAmp: 0.6 });
  const top = y - 0.06;
  return [
    shape('line', { x, y: top / 2, w: top * 1250, h: 6, rot: 90, stroke: '@fg/0.45', strokeW: 3, sfx: 'none', anim: a }),
    shape('circle', { x, y: top, w: 18, fill: '@fg/0.6', sfx: 'none', anim: a }),
    shape('rect', { x, y, w: 250, h: 150, radius: 16, fill: hero ? '@accent' : '@card', shadow: 1, sfx: 'tick-wood', anim: a }),
    text(word, { x, y, size: 64, w: 230, color: hero ? '@ink' : '@fg', sfx: 'none', anim: a }),
  ];
}

const chip = (t, o = {}) => text(t, { size: 54, weight: 700, box: { fill: '@card', padX: 46, padY: 20, stroke: '@fg/0.15', strokeW: 2 }, ...o });

// receipt paper is always light, whatever the theme
const RC = { ink: '#1B1F24', soft: '#5B6168', paper: '#FAF7F0' };
// warm letter paper
const LT = { ink: '#3A2E22', hero: '#A0522D' };
// blueprint is always deep blue
const BP = { ink: '#FFFFFF', line: '#DCEBFF', hero: '#FFE08A' };

const CONST = [[0.2, 0.3], [0.37, 0.17], [0.55, 0.3], [0.75, 0.19], [0.85, 0.41], [0.63, 0.5], [0.36, 0.46]];

export const STORY = [
  // ================================================================ intro
  tpl('st-intro-diary', 'صفحة يوميات', 'intro', {
    duration: 6, bg: bgp('notebook-ruled'), camera: { type: 'kbTL', amount: 0.7 }, fx: { grain: 0.4 },
    elements: [
      text('يوم 01 · الساعة 11:40 بالليل', { y: 0.15, size: 34, font: '@mono', weight: 500, color: '@muted', anim: A('typewriter', 0.2, { dur: 1 }) }),
      text('اليوم قررت\nأتمت شغلي كلّو', { y: 0.36, size: 112, font: 'Aref Ruqaa', weight: 700, lineHeight: 1.35, anim: A('wipeL', 0.8, { split: 'line', stagger: 0.5, dur: 0.9 }) }),
      shape('wave', { y: 0.52, w: 520, h: 40, stroke: '@accent', strokeW: 6, cycles: 4, sfx: 'pencil', anim: A('draw', 2.2, { dur: 0.9 }) }),
      text('وهون بلشت القصة.', { y: 0.61, size: 56, font: 'Aref Ruqaa', weight: 400, color: '@muted', anim: A('fade', 2.6, { dur: 0.8 }) }),
      shape('rect', { x: 0.27, y: 0.77, w: 330, h: 190, rot: -5, fill: '@accent', shadow: 0.8, sfx: 'paper', anim: A('drop', 3.0, { dur: 0.7 }) }),
      text('TODO:\n8h → 15m', { x: 0.27, y: 0.77, w: 300, rot: -5, size: 40, font: '@mono', weight: 700, lineHeight: 1.35, color: '@ink', sfx: 'none', anim: A('drop', 3.0, { dur: 0.7 }) }),
      sig({ x: 0.68, y: 0.9 }),
    ],
  }, { transition: 'page-left', tags: 'diary notebook story يوميات دفتر قصة' }),

  tpl('st-intro-leader', 'عد سينمائي', 'intro', {
    duration: 5, bg: bgp('vhs-tape'), camera: { type: 'handLight', amount: 0.6 }, fx: { grain: 0.8, scanlines: 0.4, vignette: 0.5 },
    sfx: { events: [
      { id: 'st-leader-1', t: 0.3, kind: 'tick-clock', vol: 0.9 },
      { id: 'st-leader-2', t: 1.1, kind: 'tick-clock', vol: 0.9 },
      { id: 'st-leader-3', t: 1.9, kind: 'tick-clock', vol: 0.9 },
      { id: 'st-leader-4', t: 2.7, kind: 'impact-soft', vol: 1 },
    ] },
    elements: [
      text('REEL 01 · TRUE STORY', { y: 0.08, size: 30, font: '@mono', weight: 500, letterSpacing: 0.3, color: '@muted', anim: A('flicker', 0.1) }),
      shape('line', { y: 0.4, w: 920, h: 6, stroke: '@fg/0.22', strokeW: 3, sfx: 'none', anim: A('fade', 0, { dur: 0.3 }) }),
      shape('line', { y: 0.4, w: 860, h: 6, rot: 90, stroke: '@fg/0.22', strokeW: 3, sfx: 'none', anim: A('fade', 0, { dur: 0.3 }) }),
      shape('ring', { y: 0.4, w: 640, h: 640, stroke: '@fg/0.5', strokeW: 6, sfx: 'none', anim: A('fade', 0, { dur: 0.4 }) }),
      shape('ring', { y: 0.4, w: 500, h: 500, stroke: '@fg/0.22', strokeW: 3, sfx: 'none', anim: A('fade', 0, { dur: 0.4 }) }),
      shape('arc', { y: 0.4, w: 640, h: 640, a0: -90, a1: 270, stroke: '@accent', strokeW: 14, sfx: 'none', anim: A('draw', 0.3, { dur: 2.4, ease: 'linear' }) }),
      el('counter', { y: 0.4, from: 3.49, to: 0.51, countDur: 2.4, countEase: 'linear', countDelay: 0.1, font: '@mono', size: 300, weight: 700, sfx: 'none', anim: A('fade', 0.2, { dur: 0.3 }) }),
      text('القصة بتبلش… *هلق*', { y: 0.8, size: 88, sfx: 'none', anim: A('slam', 2.7, { dur: 0.6 }) }),
    ],
  }, { transition: 'glitch-vhs', tags: 'countdown film leader 321 عد تنازلي فيلم' }),

  tpl('st-intro-route', 'من نقطة لنقطة', 'intro', {
    duration: 6, bg: bgp('contour-topo'), camera: { type: 'craneUp', amount: 0.7 }, fx: { vignette: 0.35 },
    elements: [
      text('رحلتي من *0* لـ *40 عميل*', { y: 0.13, size: 80, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.1 }) }),
      link(0.24, 0.76, 0.5, 0.62, { stroke: '@accent', strokeW: 6, dash: [14, 14], anim: A('draw', 1.0, { dur: 0.7 }) }),
      link(0.5, 0.62, 0.76, 0.47, { stroke: '@accent', strokeW: 6, dash: [14, 14], anim: A('draw', 1.7, { dur: 0.7 }) }),
      shape('circle', { x: 0.24, y: 0.76, w: 34, fill: '@fg', anim: A('pop', 0.6) }),
      el('icon', { name: 'pin', x: 0.24, y: 0.705, size: 90, color: '@fg', sfx: 'none', anim: A('drop', 0.6) }),
      shape('circle', { x: 0.5, y: 0.62, w: 26, fill: '@accent', sfx: 'none', anim: A('pop', 1.6) }),
      text('18 شهر', { x: 0.5, y: 0.565, size: 34, weight: 700, color: '@ink', box: { fill: '@accent', padX: 26, padY: 10 }, sfx: 'pop-soft', anim: A('pop', 1.6) }),
      glowAt(0.76, 0.47, { w: 420, h: 420, alpha: 0.35, anim: A('fade', 2.3) }),
      shape('circle', { x: 0.76, y: 0.47, w: 40, fill: '@accent', sfx: 'none', anim: A('pop', 2.3, { loop: 'pulse' }) }),
      el('icon', { name: 'pin', x: 0.76, y: 0.405, size: 110, color: '@accent', sfx: 'sparkle-chime', anim: A('drop', 2.3) }),
      text('لابتوب واحد\n2023', { x: 0.24, y: 0.855, w: 340, size: 38, weight: 600, lineHeight: 1.35, color: '@muted', anim: A('riseSoft', 0.9) }),
      text('عملاء بـ 4 دول\n2026', { x: 0.76, y: 0.29, w: 340, size: 38, weight: 700, lineHeight: 1.35, anim: A('riseSoft', 2.6) }),
      sig({ x: 0.7, y: 0.93 }),
    ],
  }, { transition: 'circle-tr', tags: 'journey map route رحلة خريطة طريق' }),

  tpl('st-intro-years', 'سبع سنين', 'intro', {
    duration: 5.5, bg: bgp('grainy-warm'), camera: { type: 'pushSlow', amount: 0.8 },
    elements: [
      text('من', { y: 0.2, size: 52, weight: 600, color: '@muted', anim: A('fade', 0.2) }),
      el('counter', { y: 0.36, from: 2019, to: 2026, sep: false, countDur: 2.2, font: '@display', size: 280, weight: 800, color: '@accent', glow: 0.3, anim: A('zoomOut', 0.3, { dur: 0.8 }) }),
      shape('line', { y: 0.52, w: 800, h: 6, stroke: '@fg/0.3', strokeW: 4, sfx: 'none', anim: A('draw', 0.6, { dur: 2.0, ease: 'linear' }) }),
      shape('dots', { y: 0.52, w: 800, h: 20, cols: 8, rows: 1, dot: 7, fill: '@accent', sfx: 'none', anim: A('wipeL', 0.6, { dur: 2.0, ease: 'linear' }) }),
      veil({ y: 0.72, w: 1200, h: 560, alpha: 0.65 }),
      text('سبع سنين بسطر واحد:', { y: 0.62, size: 46, weight: 600, color: '@muted', anim: A('riseSoft', 2.3) }),
      text('من موظف بيعيد نفس الشغل\nلمهندس *بيبني أنظمة*', { y: 0.76, size: 66, lineHeight: 1.4, anim: A('maskUp', 2.7, { split: 'line', stagger: 0.25 }) }),
    ],
  }, { transition: 'stretch-h', tags: 'years timeline counter سنين رحلة عداد' }),

  tpl('st-intro-loading', 'تحميل القصة', 'intro', {
    duration: 5, bg: bgp('binary-flow'), camera: { type: 'stepZoom', amount: 0.8 },
    elements: [
      veil({ y: 0.5, w: 1300, h: 1100, alpha: 0.75 }),
      text('LOADING STORY', { y: 0.18, size: 40, font: '@mono', weight: 600, letterSpacing: 0.3, color: '@accent', anim: A('scramble', 0.2, { dur: 1 }) }),
      el('counter', { y: 0.35, to: 87, suffix: '%', countDur: 2, font: '@mono', size: 220, weight: 700, anim: A('fade', 0.4, { dur: 0.3 }) }),
      text('جاري تحميل القصة', { y: 0.47, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.4) }),
      el('progress', { y: 0.515, w: 760, value: 0.87, anim: A('fade', 0.4, { dur: 1 }) }),
      text('قصة أول workflow\nبعتو لعميل *حقيقي*', { y: 0.7, size: 80, lineHeight: 1.35, anim: A('riseBlur', 1.9, { split: 'word', stagger: 0.08 }) }),
      status('buffering…', { x: 0.5, y: 0.88, anim: A('fade', 2.6) }),
    ],
  }, { transition: 'assemble', tags: 'loading progress تحميل قصة' }),

  tpl('st-intro-clapper', 'كلاكيت', 'intro', {
    duration: 5, bg: bgp('radial-center'), camera: { type: 'slamIn', amount: 0.9 },
    elements: [
      shape('rect', { y: 0.45, w: 640, h: 360, radius: 16, fill: '@card', shadow: 1, sfx: 'none', anim: A('rise', 0.2, { dur: 0.7 }) }),
      shape('line', { y: 0.41, w: 580, h: 4, stroke: '@fg/0.15', strokeW: 3, sfx: 'none', anim: A('draw', 0.6) }),
      shape('line', { y: 0.49, w: 580, h: 4, stroke: '@fg/0.15', strokeW: 3, sfx: 'none', anim: A('draw', 0.7) }),
      text('مشهد', { x: 0.68, y: 0.37, w: 240, size: 36, weight: 600, color: '@muted', anim: A('fade', 0.6) }),
      text('01', { x: 0.36, y: 0.37, w: 340, size: 60, font: '@mono', weight: 700, anim: A('fade', 0.6) }),
      text('لقطة', { x: 0.68, y: 0.45, w: 240, size: 36, weight: 600, color: '@muted', anim: A('fade', 0.75) }),
      text('03', { x: 0.36, y: 0.45, w: 340, size: 60, font: '@mono', weight: 700, anim: A('fade', 0.75) }),
      text('المخرج', { x: 0.68, y: 0.53, w: 240, size: 36, weight: 600, color: '@muted', anim: A('fade', 0.9) }),
      text('نور', { x: 0.36, y: 0.53, w: 340, size: 56, weight: 800, color: '@accent', anim: A('fade', 0.9) }),
      shape('rect', { y: 0.265, w: 640, h: 80, radius: 8, fill: '@accent', sfx: 'clap', sfxVol: 1.2, anim: A('slam', 1.3, { dur: 0.45 }) }),
      ...[0.24, 0.37, 0.5, 0.63, 0.76].map((x) => shape('rect', { x, y: 0.265, w: 46, h: 68, rot: 30, fill: '@ink', sfx: 'none', anim: A('slam', 1.3, { dur: 0.45 }) })),
      text('أول تيك.\n*أول عميل.*', { y: 0.74, size: 96, lineHeight: 1.3, anim: A('rise', 1.9, { split: 'line', stagger: 0.3 }) }),
      text('قصة مشروعي الأول من الصفر', { y: 0.89, size: 40, weight: 500, color: '@muted', anim: A('fade', 2.7) }),
    ],
  }, { transition: 'slices-5', tags: 'clapper film take كلاكيت فيلم تصوير' }),

  tpl('st-intro-constellation', 'كوكبة مشاريع', 'intro', {
    duration: 6, bg: bgp('stars-calm'), camera: { type: 'orbitIn', amount: 0.6 }, fx: { vignette: 0.5 },
    elements: [
      ...CONST.slice(1).map((p, i) => link(CONST[i][0], CONST[i][1], p[0], p[1], { stroke: '@fg/0.4', anim: A('draw', 0.5 + i * 0.25, { dur: 0.5 }) })),
      ...CONST.map(([x, y], i) => shape('circle', { x, y, w: i === 5 ? 34 : 20, fill: i === 5 ? '@accent' : '@fg', glow: i === 5 ? 0.8 : 0.3, sfx: i % 2 ? 'none' : 'twinkle', anim: A('pop', 0.2 + i * 0.25, { loop: i === 5 ? 'pulse' : 'none' }) })),
      glowAt(0.63, 0.5, { w: 360, h: 360, alpha: 0.3, anim: A('fade', 1.5) }),
      text('كل نقطة كانت مشروع.\nوكل خط كان *درس*.', { y: 0.69, size: 76, lineHeight: 1.4, anim: A('riseBlur', 2.2, { split: 'line', stagger: 0.35 }) }),
      text('7 مشاريع · 6 دروس · قصة وحدة', { y: 0.85, size: 38, weight: 500, color: '@muted', anim: A('fade', 3.3) }),
    ],
  }, { transition: 'dust-up', tags: 'constellation stars projects نجوم مشاريع' }),

  tpl('st-intro-midnight', 'إيميل نص الليل', 'intro', {
    duration: 6, bg: bgp('rain-night'), camera: { type: 'breath', amount: 0.8 }, fx: { vignette: 0.5, grain: 0.4 },
    elements: [
      text('02:14', { y: 0.17, size: 200, font: '@mono', weight: 700, anim: A('flicker', 0.2, { dur: 0.9 }) }),
      text('الساعة 2 وربع بالليل', { y: 0.29, size: 40, weight: 500, color: '@muted', anim: A('fade', 0.8) }),
      el('notify', { y: 0.46, w: 860, app: 'Mail', title: 'عميل جديد', body: 'بدنا نأتمت كل الطلبات قبل الإثنين', icon: 'mail', time: 'الآن', anim: A('drop', 1.3, { dur: 0.7 }) }),
      text('هيك بلشت\n*أكبر قصة شغل* عندي', { y: 0.69, size: 90, lineHeight: 1.3, anim: A('maskUp', 2.3, { split: 'line', stagger: 0.3 }) }),
      sig(),
    ],
  }, { transition: 'ripple-fine', tags: 'night email notification ليل ايميل اشعار' }),

  // ================================================================ hook
  tpl('st-hook-confession', 'اعتراف', 'hook', {
    duration: 5.5, bg: bgp('paper-dark'), camera: { type: 'punchBeat', amount: 0.9 },
    elements: [
      shape('rect', { y: 0.2, w: 470, h: 180, radius: 14, rot: -7, fill: 'none', stroke: '@accent', strokeW: 8, sfx: 'none', anim: A('slam', 0.2, { dur: 0.5 }) }),
      text('اعتراف', { y: 0.2, size: 112, rot: -7, color: '@accent', sfx: 'stamp', sfxVol: 1.2, anim: A('slam', 0.2, { dur: 0.5 }) }),
      text('خسرت أول عميل إلي\nبسبب *غلطة وحدة*', { y: 0.46, size: 92, lineHeight: 1.35, hl: 'underline', anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.07 }) }),
      text('وما كانت بالكود.', { y: 0.65, size: 58, weight: 600, color: '@muted', anim: A('riseSoft', 2.2) }),
      text('خليني احكيلك شو صار', { y: 0.78, size: 44, weight: 700, color: '@accent', anim: A('riseSoft', 2.8) }),
      el('icon', { name: 'arrowDown', y: 0.86, size: 60, color: '@accent', anim: A('drop', 3.1, { loop: 'float' }) }),
    ],
  }, { transition: 'burn', tags: 'confession stamp mistake اعتراف ختم غلطة' }),

  tpl('st-hook-receipt', 'فاتورة غلطة', 'hook', {
    duration: 6, bg: bgp('checker-tilt'), camera: { type: 'craneDown', amount: 0.6 },
    elements: [
      text('فاتورة *غلطة وحدة*', { y: 0.1, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.1 }) }),
      shape('rect', { y: 0.53, w: 660, h: 820, radius: 10, fill: RC.paper, shadow: 1.2, sfx: 'paper', anim: A('rise', 0.5, { dur: 0.9 }) }),
      text('RECEIPT #0042', { y: 0.25, size: 36, font: '@mono', weight: 700, letterSpacing: 0.15, color: RC.ink, anim: A('typewriter', 0.9, { dur: 0.6 }) }),
      text('28 / 10 / 2025', { y: 0.29, size: 26, font: '@mono', weight: 500, color: RC.soft, anim: A('fade', 1.2) }),
      shape('line', { y: 0.33, w: 560, h: 6, stroke: RC.ink, strokeW: 2, dash: [8, 8], sfx: 'none', anim: A('draw', 1.2, { dur: 0.5 }) }),
      text('إدخال بيانات يدوي\nأخطاء بالطلبيات\nعميل زعلان وراح', { x: 0.6, y: 0.45, w: 340, align: 'right', size: 36, weight: 600, lineHeight: 1.9, color: RC.ink, anim: A('riseSoft', 1.4, { split: 'line', stagger: 0.25 }) }),
      text('$1,600\n$1,400\n$1,000', { x: 0.33, y: 0.45, w: 220, align: 'left', size: 36, font: '@mono', weight: 600, lineHeight: 1.9, color: RC.ink, anim: A('riseSoft', 1.4, { split: 'line', stagger: 0.25 }) }),
      shape('line', { y: 0.565, w: 560, h: 6, stroke: RC.ink, strokeW: 2, dash: [8, 8], sfx: 'none', anim: A('draw', 2.2, { dur: 0.5 }) }),
      text('المجموع', { x: 0.64, y: 0.64, w: 260, align: 'right', size: 46, weight: 800, color: RC.ink, anim: A('fade', 2.5) }),
      shape('rect', { x: 0.35, y: 0.64, w: 290, h: 104, radius: 14, fill: '@accent', sfx: 'none', anim: A('pop', 2.5) }),
      el('counter', { x: 0.35, y: 0.64, prefix: '$', to: 4000, countDur: 1.2, font: '@mono', size: 70, weight: 700, color: '@ink', anim: A('fade', 2.5, { dur: 0.3 }) }),
      text('شكراً لأنك تعلمت بالطريقة الصعبة', { y: 0.78, size: 30, weight: 500, color: RC.soft, anim: A('fade', 3.2) }),
      text('هاد اللي بيكلفك ترك الشغل يدوي', { y: 0.925, size: 38, weight: 600, color: '@muted', anim: A('riseSoft', 3.4) }),
    ],
  }, { transition: 'tiles-slide-rows', tags: 'receipt cost money فاتورة تكلفة غلطة' }),

  tpl('st-hook-twist', 'بلوت تويست', 'hook', {
    duration: 5.5, bg: bgp('moire-classic'), camera: { type: 'dutchL', amount: 0.7 },
    elements: [
      veil({ y: 0.45, w: 1200, h: 900, alpha: 0.55 }),
      text('كنت متأكد إنو\nالمشكلة بالكود…', { y: 0.24, size: 78, lineHeight: 1.35, color: '@muted', anim: A('riseSoft', 0.2, { split: 'line', stagger: 0.3 }) }),
      shape('rect', { x: 0.24, y: 0.37, w: 220, h: 10, fill: '@accent', sfx: 'none', anim: A('flicker', 1.4, { dur: 0.5 }) }),
      shape('rect', { x: 0.77, y: 0.555, w: 170, h: 10, fill: '@accent', sfx: 'none', anim: A('flicker', 1.5, { dur: 0.5 }) }),
      text('PLOT TWIST', { y: 0.46, size: 132, weight: 900, color: '@accent', letterSpacing: 0.03, sfx: 'glitch', anim: A('glitch', 1.4, { split: 'letter', stagger: 0.04, dur: 0.6 }) }),
      text('طلعت بالـ *process*.', { y: 0.65, size: 100, anim: A('slam', 2.4, { dur: 0.6 }) }),
      text('وهالشي بيصير مع 9 من كل 10 فرق', { y: 0.79, size: 40, weight: 500, color: '@muted', anim: A('fade', 3.0) }),
    ],
  }, { transition: 'glitch-rgb', tags: 'plot twist surprise مفاجأة تويست' }),

  tpl('st-hook-search', 'سؤال بالبحث', 'hook', {
    duration: 6, bg: bgp('radial-top'), camera: { type: 'pushSmooth', amount: 0.8 },
    elements: [
      text('سؤال بيوصلني كل يوم', { y: 0.16, size: 44, weight: 600, color: '@muted', anim: A('riseSoft', 0.2) }),
      shape('rect', { y: 0.3, w: 900, h: 136, radius: 68, glass: true, sfx: 'none', anim: A('pop', 0.4) }),
      el('icon', { name: 'search', x: 0.86, y: 0.3, size: 54, color: '@muted', anim: A('pop', 0.6) }),
      text('كيف بوفّر 20 ساعة بالأسبوع؟', { x: 0.46, y: 0.3, w: 700, align: 'right', size: 46, weight: 600, caret: true, anim: A('typewriter', 0.7, { dur: 1.4 }) }),
      text('About 2,340,000 results (0.42 seconds)', { y: 0.4, size: 26, font: '@mono', weight: 400, color: '@muted', anim: A('fade', 2.2) }),
      text('الجواب مو بالبحث.\nالجواب *بنظام*.', { y: 0.6, size: 92, lineHeight: 1.35, anim: A('riseBlur', 2.5, { split: 'word', stagger: 0.08 }) }),
      text('بفرجيك كيف ببنيه بـ 3 خطوات', { y: 0.8, size: 44, weight: 700, color: '@accent', anim: A('riseSoft', 3.3) }),
      el('icon', { name: 'arrowDown', y: 0.88, size: 56, color: '@accent', sfx: 'none', anim: A('drop', 3.4, { loop: 'float' }) }),
    ],
  }, { transition: 'zoom-blur', tags: 'search google question بحث سؤال' }),

  tpl('st-hook-flags', 'علامات حمرا', 'hook', {
    duration: 5.5, bg: bgp('chevron-classic'), camera: { type: 'bounceIn', amount: 0.8 },
    elements: [
      ...[0.7, 0.5, 0.3].map((x, i) => el('icon', { name: 'flag', x, y: 0.17, size: 110, color: '@accent', strokeW: 2.4, sfx: 'pop-high', sfxPitch: 1 + i * 0.12, anim: A('drop', 0.2 + i * 0.2, { dur: 0.6, ease: 'backOutSoft' }) })),
      text('3 علامات إنو شغلك\n*لازم يتأتمت*', { y: 0.39, size: 96, lineHeight: 1.3, hl: 'marker', anim: A('riseBlur', 0.9, { split: 'word', stagger: 0.07 }) }),
      el('list', { y: 0.66, w: 780, size: 46, gap: 38, icon: 'num', items: ['بتعمل نفس الخطوة كل يوم', 'بتنسخ وبتلصق بين 3 شيتات', '*التالتة رح تصدمك…*'], anim: A('blurSlideR', 1.9, { stagger: 0.35, dur: 0.7 }) }),
      sig(),
    ],
  }, { transition: 'push-bounce-up', tags: 'red flags signs checklist علامات تحذير' }),

  tpl('st-hook-foryou', 'هالبوست إلك', 'hook', {
    duration: 5.5, bg: bgp('rays-center'), camera: { type: 'zoomBounce', amount: 0.8 },
    elements: [
      veil({ y: 0.25, w: 1200, h: 520, alpha: 0.7 }),
      text('إذا لسا عم تنسخ وتلصق\nبين 5 شيتات كل يوم…', { y: 0.22, size: 70, lineHeight: 1.4, anim: A('riseSoft', 0.2, { split: 'line', stagger: 0.3 }) }),
      shape('ring', { y: 0.53, w: 520, h: 520, stroke: '@accent', strokeW: 4, sfx: 'none', anim: A('draw', 1.4, { dur: 0.8, loop: 'pulse' }) }),
      shape('circle', { y: 0.53, w: 400, h: 400, fill: '@accent', sfx: 'none', anim: A('iris', 1.1, { dur: 0.8 }) }),
      el('icon', { name: 'user', y: 0.53, size: 200, color: '@ink', sfx: 'pop', anim: A('pop', 1.5) }),
      text('هالبوست *إلك.*', { y: 0.82, size: 120, anim: A('slam', 2.1, { dur: 0.6 }) }),
    ],
  }, { transition: 'iris-open', tags: 'for you callout you هاد إلك انت' }),

  tpl('st-hook-strike', 'شطب النصيحة', 'hook', {
    duration: 5, bg: bgp('stripes-bold'), camera: { type: 'whipIn', amount: 0.8 },
    elements: [
      text('النصيحة اللي غيّرت سنتي:', { y: 0.16, size: 46, weight: 600, color: '@muted', anim: A('riseSoft', 0.2) }),
      text('اشتغل أكتر', { y: 0.35, size: 130, color: '@muted', anim: A('rise', 0.4) }),
      shape('line', { y: 0.355, w: 700, h: 14, rot: 176, stroke: '@accent', strokeW: 14, sfx: 'pencil', sfxVol: 1.2, anim: A('draw', 1.2, { dur: 0.5 }) }),
      text('أتمت *أكتر*', { y: 0.57, size: 170, sfx: 'punch-hit', anim: A('slam', 1.8, { dur: 0.6 }) }),
      text('ساعة وحدة بتبني فيها workflow\nبترجعلك 40 ساعة بالشهر', { y: 0.79, size: 46, weight: 500, lineHeight: 1.45, color: '@muted', anim: A('riseSoft', 2.4, { split: 'line', stagger: 0.25 }) }),
    ],
  }, { transition: 'wipe-line-45', tags: 'strike advice wrong شطب نصيحة' }),

  tpl('st-hook-minute', 'دقيقة وحدة', 'hook', {
    duration: 6, bg: bgp('rings-sonar'), camera: { type: 'heartbeat', amount: 0.6 },
    sfx: { events: [0.4, 0.9, 1.4, 1.9, 2.4, 2.9].map((t, i) => ({ id: 'st-minute-' + i, t, kind: 'tick-soft', vol: 0.8 })).concat([{ id: 'st-minute-end', t: 3.4, kind: 'ding', vol: 0.9 }]) },
    elements: [
      shape('rect', { y: 0.115, w: 70, h: 34, radius: 6, fill: '@fg/0.5', sfx: 'none', anim: A('drop', 0.1) }),
      shape('ring', { y: 0.33, w: 480, h: 480, stroke: '@fg/0.16', strokeW: 18, sfx: 'none', anim: A('fade', 0.1) }),
      shape('arc', { y: 0.33, w: 480, h: 480, a0: -90, a1: 270, stroke: '@accent', strokeW: 18, sfx: 'none', anim: A('draw', 0.4, { dur: 3, ease: 'linear' }) }),
      el('counter', { y: 0.33, from: 60, to: 0, countDur: 3, countEase: 'linear', countDelay: 0, font: '@mono', size: 170, weight: 700, sfx: 'none', anim: A('fade', 0.3, { dur: 0.3 }) }),
      text('بدقيقة وحدة\nرح تفهم شو يعني *AI Agent*', { y: 0.66, size: 84, lineHeight: 1.35, anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.07 }) }),
      text('بلا مصطلحات معقدة', { y: 0.84, size: 42, weight: 500, color: '@muted', anim: A('riseSoft', 2.2) }),
    ],
  }, { transition: 'clock-cw', tags: 'timer minute stopwatch دقيقة مؤقت' }),

  // ================================================================ kinetic
  tpl('st-kin-domino', 'دومينو كلمات', 'kinetic', {
    duration: 5.5, bg: bgp('blocks-small'), camera: { type: 'dollyRight', amount: 0.7 },
    elements: [
      veil({ y: 0.55, w: 1300, h: 1000, alpha: 0.55 }),
      ...tile('خطوة', 0.83, 0.36, 0.3),
      ...tile('صغيرة', 0.61, 0.36, 0.6),
      ...tile('كل', 0.39, 0.36, 0.9),
      ...tile('يوم', 0.17, 0.36, 1.2, { hero: true }),
      text('= نظام كامل بـ *90 يوم*', { y: 0.63, size: 86, anim: A('riseBlur', 1.9, { split: 'word', stagger: 0.1 }) }),
      text('ما في قفزات. في خطوات.', { y: 0.77, size: 46, weight: 500, color: '@muted', anim: A('fade', 2.7) }),
      sig(),
    ],
  }, { transition: 'cardfly-left', tags: 'domino tiles steps دومينو خطوات' }),

  tpl('st-kin-bounce', 'BUILD IN PUBLIC', 'kinetic', {
    duration: 5, bg: bgp('polka-pulse'), camera: { type: 'figure8', amount: 0.6 },
    elements: [
      text('BUILD', { y: 0.25, size: 200, weight: 900, anim: A('bounce', 0.2, { split: 'letter', stagger: 0.05, dur: 0.7 }) }),
      text('IN', { y: 0.42, size: 200, weight: 900, color: '@accent', anim: A('bounce', 0.6, { split: 'letter', stagger: 0.05, dur: 0.7 }) }),
      text('PUBLIC', { y: 0.59, size: 200, weight: 900, anim: A('bounce', 0.85, { split: 'letter', stagger: 0.05, dur: 0.7 }) }),
      text('عم ابني كل شي قدامكن،\nخطوة بخطوة، بالأرقام', { y: 0.8, size: 50, weight: 600, lineHeight: 1.4, color: '@muted', anim: A('riseSoft', 1.8, { split: 'line', stagger: 0.25 }) }),
    ],
  }, { transition: 'bubbles', tags: 'build in public bounce letters حروف ناطة' }),

  tpl('st-kin-marker', 'هايلايتر', 'kinetic', {
    duration: 6, bg: bgp('graph-paper'), camera: { type: 'panDown', amount: 0.6 },
    elements: [
      text('مو مشكلة *وقت*.', { y: 0.22, size: 100, hl: 'marker', sfx: 'swish', sfxDelay: 0.45, anim: A('maskUp', 0.2) }),
      text('مو مشكلة *أدوات*.', { y: 0.39, size: 100, hl: 'marker', sfx: 'swish', sfxDelay: 0.45, anim: A('maskUp', 1.0) }),
      text('هي مشكلة *نظام*.', { y: 0.6, size: 120, hl: 'marker', sfx: 'swish-fast', sfxDelay: 0.45, anim: A('maskUp', 1.8, { dur: 0.9 }) }),
      shape('line', { y: 0.7, w: 260, h: 8, stroke: '@accent', strokeW: 6, sfx: 'none', anim: A('growC', 2.6) }),
      text('والنظام بينبني، مو بينشرى.', { y: 0.8, size: 46, weight: 500, color: '@muted', anim: A('riseSoft', 2.8) }),
    ],
  }, { transition: 'panel-diag-135', tags: 'marker highlight problem هايلايت تظليل' }),

  tpl('st-kin-columns', 'أعمدة متحركة', 'kinetic', {
    duration: 5, bg: bgp('solid-bg2'), camera: { type: 'none' },
    elements: [
      ...[[0.14, 140], [0.5, -110], [0.86, 140]].map(([x, speed], i) => el('ticker', { x, y: 0.5, w: 1400, rot: 90, size: 150, text: 'COPY  PASTE  REPEAT', speed, outline: i !== 1, color: i === 1 ? '@fg/0.07' : '@fg/0.3', anim: A('fade', 0, { dur: 0.6 }) })),
      shape('rect', { y: 0.47, w: 780, h: 460, radius: 32, glass: true, sfx: 'none', anim: A('pop', 0.5) }),
      text('كل يوم\nنفس الشغل؟', { y: 0.44, size: 104, lineHeight: 1.3, anim: A('riseBlur', 0.9, { split: 'line', stagger: 0.3 }) }),
      text('خلّيه يشتغل *لحالو*', { y: 0.59, size: 50, weight: 700, anim: A('riseSoft', 1.8) }),
      text('// automate the boring', { y: 0.86, size: 32, font: '@mono', weight: 500, color: '@accent', box: { fill: '@bg', padX: 26, padY: 12 }, anim: A('typewriter', 2.3, { dur: 0.8 }) }),
    ],
  }, { transition: 'stripes-8', tags: 'columns ticker repeat أعمدة تكرار' }),

  tpl('st-kin-outline', 'من خط لتعبئة', 'kinetic', {
    duration: 5.5, bg: bgp('bauhaus-1'), camera: { type: 'dollyIn', amount: 0.7 },
    elements: [
      veil({ y: 0.55, w: 1400, h: 1300, alpha: 0.75 }),
      text('FROM IDEA', { y: 0.3, size: 136, weight: 900, outline: true, strokeW: 3, color: '@fg', sfx: 'none', anim: A('fade', 0.2) }),
      text('FROM IDEA', { y: 0.3, size: 136, weight: 900, color: '@fg', sfx: 'whoosh-soft', anim: A('wipeR', 0.9, { dur: 1 }) }),
      text('TO SYSTEM', { y: 0.46, size: 136, weight: 900, outline: true, strokeW: 3, color: '@accent', sfx: 'none', anim: A('fade', 0.5) }),
      text('TO SYSTEM', { y: 0.46, size: 136, weight: 900, color: '@accent', glow: 0.3, sfx: 'whoosh', anim: A('wipeR', 1.8, { dur: 1 }) }),
      text('الفكرة ببلاش.\nالنظام هو اللي *بيدفعلك*.', { y: 0.7, size: 68, lineHeight: 1.4, anim: A('riseSoft', 2.7, { split: 'line', stagger: 0.25 }) }),
      sig(),
    ],
  }, { transition: 'mask-waves', tags: 'outline fill idea system فكرة نظام' }),

  tpl('st-kin-numbers', 'ثلاث أرقام', 'kinetic', {
    duration: 5.5, bg: bgp('grid-big'), camera: { type: 'tiltDown', amount: 0.6 },
    elements: [
      ...[['1', 'فكرة', 0.21, 'kick'], ['3', 'أدوات', 0.4, 'kick'], ['0', 'سطر كود', 0.59, 'clap']].flatMap(([n, label, y, snd], i) => [
        text(n, { x: 0.78, y, size: 220, font: '@mono', weight: 700, color: '@accent', sfx: snd, anim: A('slam', 0.3 + i * 0.6, { dur: 0.5 }) }),
        text(label, { x: 0.4, y, w: 540, align: 'right', size: 92, sfx: 'none', anim: A('slideL', 0.45 + i * 0.6, { dur: 0.6 }) }),
      ]),
      shape('line', { y: 0.305, w: 860, h: 4, stroke: '@fg/0.15', strokeW: 3, sfx: 'none', anim: A('grow', 0.8) }),
      shape('line', { y: 0.495, w: 860, h: 4, stroke: '@fg/0.15', strokeW: 3, sfx: 'none', anim: A('grow', 1.4) }),
      text('النتيجة:\nworkflow شغّال بـ *48 ساعة*', { y: 0.79, size: 64, lineHeight: 1.35, anim: A('riseBlur', 2.4, { split: 'word', stagger: 0.08 }) }),
    ],
  }, { transition: 'tiles-scale-checker', tags: 'numbers rhythm count أرقام إيقاع' }),

  tpl('st-kin-hanging', 'لافتات معلقة', 'kinetic', {
    duration: 6, bg: bgp('fireflies-gold'), camera: { type: 'pendulum', amount: 0.5 },
    elements: [
      ...hanging('فكّر', 0.8, 0.34, 0.3),
      ...hanging('جرّب', 0.5, 0.41, 0.7),
      ...hanging('أتمت', 0.2, 0.34, 1.1, true),
      text('3 كلمات علّقتهن\nفوق مكتبي من 2023', { y: 0.65, size: 76, lineHeight: 1.35, anim: A('riseBlur', 1.9, { split: 'word', stagger: 0.08 }) }),
      text('والتالتة هي اللي غيّرت *كل شي*', { y: 0.83, size: 44, weight: 600, color: '@muted', anim: A('riseSoft', 2.8) }),
    ],
  }, { transition: 'curtain-v', tags: 'hanging signs words لافتات معلقة كلمات' }),

  tpl('st-kin-flipboard', 'لوحة مطار', 'kinetic', {
    duration: 6, bg: bgp('stripes-flat'), camera: { type: 'dollyLeft', amount: 0.4 },
    sfx: { events: [{ id: 'st-flip-1', t: 0.6, kind: 'scan', vol: 0.7 }, { id: 'st-flip-2', t: 1.7, kind: 'scan', vol: 0.7 }, { id: 'st-flip-3', t: 2.8, kind: 'ding-double', vol: 0.8 }] },
    elements: [
      text('DEPARTURES', { y: 0.12, size: 40, font: '@mono', weight: 700, letterSpacing: 0.3, color: '@accent', sfx: 'none', anim: A('scramble', 0.1, { dur: 0.8 }) }),
      text('من', { x: 0.88, y: 0.29, w: 120, size: 44, weight: 700, color: '@muted', anim: A('fade', 0.4) }),
      text('لـ', { x: 0.88, y: 0.45, w: 120, size: 44, weight: 700, color: '@muted', anim: A('fade', 1.5) }),
      ...[...'9AM-5PM'].flatMap((c, i) => flap(c, 0.105 + i * 0.106, 0.29, 0.5 + i * 0.08)),
      ...[...'FREEDOM'].flatMap((c, i) => flap(c, 0.105 + i * 0.106, 0.45, 1.6 + i * 0.08, true)),
      text('رحلتي من الدوام لـ *الحرية*\nبلشت بـ workflow واحد', { y: 0.67, size: 64, lineHeight: 1.45, anim: A('riseSoft', 2.6, { split: 'line', stagger: 0.25 }) }),
      status('GATE 01 · ON TIME', { x: 0.5, y: 0.86, anim: A('fade', 3.2) }),
    ],
  }, { transition: 'venetian-h', tags: 'split flap airport board مطار لوحة رحلة' }),

  tpl('st-kin-stickers', 'ستيكرات', 'kinetic', {
    duration: 5, bg: bgp('halftone-big'), camera: { type: 'handMedium', amount: 0.5 },
    elements: [
      text('انشرها', { x: 0.6, y: 0.24, size: 116, rot: -6, color: '@ink', box: { fill: '@accent', padX: 40, padY: 18, radius: 16, shadow: true }, sfx: 'stamp', anim: A('slam', 0.2, { dur: 0.45 }) }),
      text('قبل ما', { x: 0.36, y: 0.4, size: 92, rot: 4, color: '@bg', box: { fill: '@fg', padX: 36, padY: 16, radius: 16, shadow: true }, sfx: 'stamp', sfxPitch: 1.2, anim: A('slam', 0.55, { dur: 0.45 }) }),
      text('تكون *كاملة*', { x: 0.55, y: 0.57, size: 110, rot: -3, box: { fill: '@card', padX: 40, padY: 18, radius: 16, shadow: true }, sfx: 'stamp', sfxPitch: 0.9, anim: A('slam', 0.9, { dur: 0.45 }) }),
      text('SHIP IT', { x: 0.3, y: 0.73, size: 76, rot: 7, font: '@mono', weight: 700, color: '@accent', box: { fill: 'none', stroke: '@accent', strokeW: 5, padX: 30, padY: 14, radius: 12 }, sfx: 'pop', anim: A('popRotate', 1.3) }),
      shape('burst', { x: 0.78, y: 0.74, w: 170, fill: '@accent', sfx: 'none', anim: A('popRotate', 1.5, { loop: 'spinSlow' }) }),
      text('v1', { x: 0.78, y: 0.74, size: 52, font: '@mono', weight: 700, color: '@ink', sfx: 'none', anim: A('pop', 1.6) }),
      text('أول نسخة من أي workflow عندي كانت بشعة', { y: 0.9, size: 36, weight: 500, color: '@muted', box: { fill: '@bg', padX: 22, padY: 10 }, anim: A('fade', 2.0) }),
    ],
  }, { transition: 'spin-star', tags: 'stickers ship it انشر ستيكر' }),

  tpl('st-kin-wordgrid', 'شبكة أدوات', 'kinetic', {
    duration: 5.5, bg: bgp('squares-calm'), camera: { type: 'shockwave', amount: 0.6 },
    elements: [
      ...[['n8n', 0.79, 0.224], ['API', 0.5, 0.224], ['CRM', 0.21, 0.224], ['Sheets', 0.79, 0.4], ['WhatsApp', 0.21, 0.4], ['Email', 0.79, 0.576], ['MCP', 0.5, 0.576], ['Claude', 0.21, 0.576]].flatMap(([w, x, y], i) => {
        const corner = x !== 0.5 && y !== 0.4;
        const a = A('pop', corner ? 0.2 + i * 0.08 : 0.7 + i * 0.05, { dur: 0.5 });
        return [
          shape('rect', { x, y, w: 270, h: 196, radius: 20, fill: '@card', stroke: '@fg/0.15', strokeW: 2, sfx: corner ? 'pop-soft' : 'none', anim: a }),
          text(w, { x, y, size: 44, w: 250, font: '@mono', weight: 600, sfx: 'none', anim: a }),
        ];
      }),
      shape('rect', { x: 0.5, y: 0.4, w: 270, h: 196, radius: 20, fill: '@accent', glow: 0.5, sfx: 'impact-soft', anim: A('slam', 1.2, { dur: 0.5 }) }),
      text('أنت', { x: 0.5, y: 0.4, size: 90, color: '@ink', sfx: 'none', anim: A('slam', 1.2, { dur: 0.5 }) }),
      text('كل هالأدوات موجودة.\nبس *انت* اللي بتربطها.', { y: 0.79, size: 66, lineHeight: 1.4, anim: A('riseSoft', 1.9, { split: 'line', stagger: 0.3 }) }),
    ],
  }, { transition: 'tiles-flip-center', tags: 'grid tools words شبكة أدوات' }),

  // ================================================================ quote
  tpl('st-quote-letter', 'رسالة لنفسي', 'quote', {
    duration: 7, bg: bgp('paper-warm'), camera: { type: 'kbBR', amount: 0.6 }, fx: { grain: 0.5, vignette: 0.3 },
    elements: [
      text('إلى نور، 2019', { y: 0.17, w: 820, align: 'right', font: 'Amiri', size: 56, weight: 700, color: LT.ink, anim: A('typewriter', 0.3, { dur: 0.8 }) }),
      text('وقّف تشتغل لحالك 14 ساعة.\nابني *نظام* بيشتغل عنك،\nوخلّي وقتك للناس اللي بتحبهم.', { y: 0.42, w: 820, align: 'right', font: 'Amiri', size: 62, weight: 400, lineHeight: 1.7, color: LT.ink, hl: 'underline', accentColor: LT.hero, anim: A('typewriter', 1.2, { dur: 2.8 }) }),
      text('— نور، 2026', { y: 0.66, w: 820, align: 'left', font: 'Aref Ruqaa', size: 62, weight: 700, color: LT.hero, sfx: 'pencil', anim: A('fade', 4.0, { dur: 0.8 }) }),
      shape('ring', { x: 0.24, y: 0.84, w: 200, h: 200, rot: -12, stroke: LT.hero, strokeW: 4, sfx: 'none', anim: A('slam', 3.7, { dur: 0.4 }) }),
      text('POST\n2026', { x: 0.24, y: 0.84, w: 180, rot: -12, size: 34, font: '@mono', weight: 700, lineHeight: 1.3, color: LT.hero, sfx: 'stamp', anim: A('slam', 3.7, { dur: 0.4 }) }),
    ],
  }, { transition: 'leak-warm', tags: 'letter past self typewriter رسالة نفسي آلة كاتبة' }),

  tpl('st-quote-neon', 'لافتة نيون', 'quote', {
    duration: 5.5, bg: bgp('radial-faint'), camera: { type: 'swayRot', amount: 0.5 }, fx: { grain: 0.5, vignette: 0.5 },
    elements: [
      shape('rect', { y: 0.43, w: 900, h: 560, radius: 44, fill: 'none', stroke: '@accent', strokeW: 6, glow: 1, sfx: 'zap', anim: A('draw', 0.2, { dur: 1.2 }) }),
      text('اللي بيتكرر\n*لازم يتأتمت*', { y: 0.43, size: 118, lineHeight: 1.35, glow: 1, glowColor: '@accent', sfx: 'power-up', anim: A('flicker', 0.8, { dur: 1.2, loop: 'glow' }) }),
      text('— قاعدتي الأولى بالشغل', { y: 0.74, size: 44, weight: 600, color: '@muted', anim: A('fade', 2.1) }),
      sig(),
    ],
  }, { transition: 'flash-accent', tags: 'neon sign glow quote نيون اقتباس' }),

  tpl('st-quote-split', 'اقتباس مقسوم', 'quote', {
    duration: 5.5, bg: bgp('split-diag', { c2: '@accent' }), camera: { type: 'slideL', amount: 0.6 },
    elements: [
      text('الناس بتشتري', { y: 0.2, size: 92, anim: A('slideR', 0.2, { dur: 0.8 }) }),
      text('*نتيجة.*', { y: 0.34, size: 180, glow: 0.3, anim: A('slam', 0.8, { dur: 0.6 }) }),
      text('مو أدوات.', { y: 0.68, size: 150, color: '@ink', anim: A('slideL', 1.6, { dur: 0.8 }) }),
      text('ولا ساعات شغل.', { y: 0.81, size: 60, weight: 600, color: '@ink', opacity: 0.8, anim: A('riseSoft', 2.3) }),
    ],
  }, { transition: 'cover-upright', tags: 'split two tone quote result نتيجة اقتباس' }),

  tpl('st-quote-subtitle', 'ترجمة فيلم', 'quote', {
    duration: 6.5, bg: bgp('sunset-sea'), camera: { type: 'kbBLOut', amount: 0.6 }, fx: { letterbox: 0.1, grain: 0.6, vignette: 0.4 },
    elements: [
      text('مشهد داخلي · مكتب صغير · 2 بالليل', { y: 0.15, size: 32, weight: 600, color: '#FFFFFF', shadow: true, anim: A('typewriter', 0.3, { dur: 1 }) }),
      text('[ نور ]', { y: 0.66, size: 30, font: '@mono', weight: 500, color: '#FFFFFF', opacity: 0.75, shadow: true, anim: A('fade', 1.2) }),
      text('ما في شي اسمو وقت ضايع.', { y: 0.73, size: 56, weight: 700, color: '#FFFFFF', box: { fill: 'rgba(0,0,0,0.42)', padX: 22, padY: 8, radius: 10 }, anim: A('fade', 1.4, { dur: 0.5 }) }),
      text('في *نظام ناقص*.', { y: 0.805, size: 56, weight: 700, color: '#FFFFFF', accentColor: '#FFD37A', box: { fill: 'rgba(0,0,0,0.42)', padX: 22, padY: 8, radius: 10 }, anim: A('fade', 2.6, { dur: 0.5 }) }),
    ],
  }, { transition: 'dip-black', tags: 'movie subtitle cinematic ترجمة فيلم سينما' }),

  tpl('st-quote-blueprint', 'مخطط على ورقة', 'quote', {
    duration: 6, bg: bgp('blueprint-blue'), camera: { type: 'drone', amount: 0.5 },
    elements: [
      el('corners', { y: 0.42, w: 900, h: 620, len: 70, strokeW: 4, all: true, color: BP.line, anim: A('draw', 0.1, { dur: 0.9 }) }),
      text('ارسم الـ workflow\nعلى *ورقة*\nقبل ما تفتح n8n', { y: 0.42, size: 92, font: 'Aref Ruqaa', weight: 700, lineHeight: 1.45, color: BP.ink, accentColor: BP.hero, anim: A('wipeL', 0.5, { split: 'line', stagger: 0.45, dur: 0.9 }) }),
      shape('line', { y: 0.72, w: 700, h: 6, stroke: BP.line, strokeW: 2, sfx: 'none', anim: A('growC', 2.2) }),
      shape('line', { x: 0.15, y: 0.72, w: 50, h: 6, rot: 90, stroke: BP.line, strokeW: 2, sfx: 'none', anim: A('fade', 2.4) }),
      shape('line', { x: 0.85, y: 0.72, w: 50, h: 6, rot: 90, stroke: BP.line, strokeW: 2, sfx: 'none', anim: A('fade', 2.4) }),
      text('ورقة وحدة = 10 ساعات debugging أقل', { y: 0.77, size: 32, font: '@mono', weight: 500, color: BP.line, anim: A('typewriter', 2.6, { dur: 1 }) }),
      sig({ nameColor: BP.ink, roleColor: BP.line }),
    ],
  }, { transition: 'mask-halftone', tags: 'blueprint plan sketch مخطط ورقة رسم' }),

  tpl('st-quote-rule', 'القاعدة رقم 1', 'quote', {
    duration: 5.5, bg: bgp('mesh-calm'), camera: { type: 'drift', amount: 0.6 },
    elements: [
      shape('circle', { y: 0.24, w: 280, h: 280, fill: '@accent', glow: 0.4, sfx: 'none', anim: A('iris', 0.2, { dur: 0.8 }) }),
      text('#1', { y: 0.235, size: 130, font: '@mono', weight: 700, color: '@ink', sfx: 'pop-low', anim: A('zoomOut', 0.6, { dur: 0.6 }) }),
      text('القاعدة رقم واحد بشغلي', { y: 0.4, size: 40, weight: 600, color: '@muted', anim: A('fade', 1.0) }),
      text('إذا عملتها مرتين،\n*أتمتها.*', { y: 0.59, size: 124, lineHeight: 1.3, anim: A('riseBlur', 1.3, { split: 'line', stagger: 0.45 }) }),
      sig(),
    ],
  }, { transition: 'fade-rise', tags: 'rule number one quote قاعدة اقتباس' }),

  // ================================================================ outro
  tpl('st-outro-end', 'النهاية؟', 'outro', {
    duration: 6, bg: bgp('smoke-rise'), camera: { type: 'pullSlow', amount: 0.7 }, fx: { letterbox: 0.08, grain: 0.6 },
    elements: [
      text('النهاية*؟*', { y: 0.35, size: 200, font: 'Amiri', weight: 700, anim: A('fade', 0.3, { dur: 1.4 }) }),
      text('لا. هي *البداية*.', { y: 0.55, size: 90, anim: A('riseBlur', 1.8, { split: 'word', stagger: 0.12 }) }),
      text('الجزء 2 ينزل الأسبوع الجاي', { y: 0.67, size: 44, weight: 500, color: '@muted', anim: A('riseSoft', 2.6) }),
      sig({ y: 0.83 }),
    ],
  }, { transition: 'fade-scale-out', tags: 'the end part 2 النهاية جزء تاني' }),

  tpl('st-outro-comment', 'اكتب بالتعليقات', 'outro', {
    duration: 6, bg: bgp('dots-wave'), camera: { type: 'hover', amount: 0.6 },
    elements: [
      text('بدك الـ workflow كامل؟', { y: 0.19, size: 80, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.1 }) }),
      shape('rect', { y: 0.38, w: 900, h: 150, radius: 75, glass: true, sfx: 'none', anim: A('rise', 0.8) }),
      shape('circle', { x: 0.86, y: 0.38, w: 96, h: 96, fill: '@fg/0.15', sfx: 'none', anim: A('pop', 1.0) }),
      el('icon', { name: 'user', x: 0.86, y: 0.38, size: 50, color: '@fg', sfx: 'none', anim: A('pop', 1.0) }),
      text('أتمتة', { x: 0.53, y: 0.38, w: 540, align: 'right', size: 58, weight: 700, caret: true, anim: A('typewriter', 1.3, { dur: 0.6 }) }),
      shape('circle', { x: 0.15, y: 0.38, w: 96, h: 96, fill: '@accent', sfx: 'none', anim: A('pop', 2.1) }),
      el('icon', { name: 'send', x: 0.15, y: 0.38, size: 46, color: '@ink', sfx: 'message-out', anim: A('pop', 2.1) }),
      text('اكتب *أتمتة* بالتعليقات\nوببعتلك ياه ببلاش', { y: 0.6, size: 72, lineHeight: 1.4, anim: A('riseSoft', 2.4, { split: 'line', stagger: 0.25 }) }),
      text('خلال 24 ساعة · بالـ DM', { y: 0.76, size: 32, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 3.2) }),
      sig(),
    ],
  }, { transition: 'stack-up', tags: 'comment keyword cta تعليق كلمة' }),

  tpl('st-outro-next', 'الحلقة الجاية', 'outro', {
    duration: 5.5, bg: bgp('conic-soft'), camera: { type: 'whipUp', amount: 0.7 },
    elements: [
      tag('// الحلقة الجاية', { y: 0.12 }),
      shape('circle', { y: 0.32, w: 260, h: 260, fill: '@accent', glow: 0.5, sfx: 'none', anim: A('pop', 0.4, { loop: 'pulse' }) }),
      el('icon', { name: 'play', x: 0.51, y: 0.32, size: 110, color: '@ink', filled: true, sfx: 'pop', anim: A('pop', 0.6) }),
      text('ربط WhatsApp مع n8n\nبـ *10 دقايق*', { y: 0.56, size: 84, lineHeight: 1.35, anim: A('maskUp', 1.0, { split: 'line', stagger: 0.3 }) }),
      el('progress', { y: 0.74, w: 720, value: 0.72, label: 'بتنزل بعد 3 أيام', anim: A('fade', 1.8) }),
      text('فعّل الجرس حتى ما تفوتك', { y: 0.88, size: 38, weight: 500, color: '@muted', anim: A('fade', 2.6) }),
    ],
  }, { transition: 'zoom-punch', tags: 'next episode up next الحلقة الجاية' }),

  tpl('st-outro-share', 'ابعتها لصاحبك', 'outro', {
    duration: 5.5, bg: bgp('clouds-sky'), camera: { type: 'panR', amount: 0.6 },
    elements: [
      shape('curve', { x: 0.55, y: 0.3, w: 520, h: 220, rot: 180, stroke: '@fg/0.4', strokeW: 4, dash: [10, 12], head: 0, sfx: 'none', anim: A('draw', 0.2, { dur: 1 }) }),
      el('icon', { name: 'send', x: 0.24, y: 0.25, size: 160, color: '@accent', sfx: 'whoosh-up', anim: A('blurSlideR', 0.6, { dur: 0.8, loop: 'float' }) }),
      veil({ y: 0.6, w: 1200, h: 700, alpha: 0.7 }),
      text('ابعتها لصاحبك اللي\nلسا عم يشتغل *يدوي*', { y: 0.53, size: 86, lineHeight: 1.35, anim: A('riseBlur', 1.1, { split: 'word', stagger: 0.07 }) }),
      text('رح يشكرك بعد أول workflow', { y: 0.71, size: 44, weight: 600, color: '@muted', anim: A('riseSoft', 2.2) }),
      sig(),
    ],
  }, { transition: 'whip-up', tags: 'share send friend شارك ابعت صاحبك' }),

  tpl('st-outro-recap', 'ملخص الفيديو', 'outro', {
    duration: 6, bg: bgp('hex-small'), camera: { type: 'craneUpPush', amount: 0.6 },
    elements: [
      text('بهالفيديو تعلمت:', { y: 0.15, size: 62, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.1 }) }),
      chip('3 أدوات', { y: 0.31, rot: -3, sfx: 'pop', anim: A('popRotate', 0.7) }),
      chip('1 workflow', { y: 0.43, rot: 2, sfx: 'pop', sfxPitch: 1.15, anim: A('popRotate', 1.0) }),
      chip('15 دقيقة بدل 8 ساعات', { y: 0.55, rot: -1.5, color: '@ink', box: { fill: '@accent', padX: 46, padY: 20 }, sfx: 'pop', sfxPitch: 1.3, anim: A('popRotate', 1.3) }),
      text('الجاي أقوى. *تابعني.*', { y: 0.73, size: 80, anim: A('riseBlur', 2.0, { split: 'word', stagger: 0.1 }) }),
      sig(),
    ],
  }, { transition: 'shape-hexagon', tags: 'recap summary chips ملخص' }),

  tpl('st-outro-credits', 'تترات النهاية', 'outro', {
    duration: 7, bg: bgp('galaxy-flat'), camera: { type: 'rise', amount: 0.6 },
    elements: [
      text('CREDITS', { y: 0.12, size: 34, font: '@mono', weight: 500, letterSpacing: 0.4, color: '@muted', anim: A('track', 0.1, { dur: 1.4 }) }),
      text('فكرة\nكود\nتصميم\nصوت\nقهوة\nساعات نوم', { x: 0.72, y: 0.43, w: 400, align: 'left', size: 42, weight: 500, lineHeight: 1.8, color: '@muted', anim: A('riseSoft', 0.6, { split: 'line', stagger: 0.3 }) }),
      text('نور\nنور\nنور\nالمتصفح\n7 كاسات\n4', { x: 0.28, y: 0.43, w: 400, align: 'right', size: 42, weight: 800, lineHeight: 1.8, anim: A('riseSoft', 0.75, { split: 'line', stagger: 0.3 }) }),
      shape('line', { y: 0.43, w: 360, h: 6, rot: 90, stroke: '@accent/0.5', strokeW: 2, sfx: 'none', anim: A('draw', 0.4, { dur: 1.5 }) }),
      text('شكراً إنك وصلت *للآخر*', { y: 0.74, size: 72, anim: A('riseBlur', 2.9, { split: 'word', stagger: 0.1 }) }),
      text('تابعني للحلقة الجاية', { y: 0.83, size: 40, weight: 600, color: '@muted', anim: A('fade', 3.6) }),
      sig(),
    ],
  }, { transition: 'mask-clouds', tags: 'credits end roll تترات نهاية' }),

  tpl('st-outro-call', 'احجز مكالمة', 'outro', {
    duration: 6, bg: bgp('aurora-north'), camera: { type: 'dollyOut', amount: 0.6 },
    elements: [
      shape('rect', { x: 0.73, y: 0.24, w: 400, h: 240, radius: 26, glass: true, sfx: 'whoosh-soft', anim: A('slideL', 0.2, { dur: 0.8 }) }),
      text('أنت', { x: 0.73, y: 0.2, size: 36, weight: 700, color: '@accent', sfx: 'none', anim: A('slideL', 0.2, { dur: 0.8 }) }),
      text('عندك فكرة', { x: 0.73, y: 0.27, size: 56, w: 360, sfx: 'none', anim: A('slideL', 0.2, { dur: 0.8 }) }),
      shape('rect', { x: 0.27, y: 0.24, w: 400, h: 240, radius: 26, glass: true, sfx: 'whoosh-soft', anim: A('slideR', 0.6, { dur: 0.8 }) }),
      text('أنا', { x: 0.27, y: 0.2, size: 36, weight: 700, color: '@accent', sfx: 'none', anim: A('slideR', 0.6, { dur: 0.8 }) }),
      text('عندي النظام', { x: 0.27, y: 0.27, size: 56, w: 360, sfx: 'none', anim: A('slideR', 0.6, { dur: 0.8 }) }),
      shape('circle', { x: 0.5, y: 0.24, w: 90, h: 90, fill: '@accent', sfx: 'none', anim: A('pop', 1.3) }),
      el('icon', { name: 'plus', x: 0.5, y: 0.24, size: 50, color: '@ink', sfx: 'pop', anim: A('popRotate', 1.3) }),
      text('خلينا نحوّل فكرتك\nلـ *workflow شغّال*', { y: 0.5, size: 82, lineHeight: 1.35, anim: A('riseBlur', 1.8, { split: 'word', stagger: 0.07 }) }),
      text('احجز مكالمة 15 دقيقة', { y: 0.7, size: 52, weight: 800, color: '@ink', box: { fill: '@accent', padX: 50, padY: 24 }, sfx: 'click-ui', anim: A('pop', 2.6, { loop: 'pulse' }) }),
      el('icon', { name: 'calendar', x: 0.5, y: 0.8, size: 54, color: '@muted', sfx: 'none', anim: A('fade', 3.0) }),
      text('مجانية · بلا التزام', { y: 0.86, size: 32, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 3.0) }),
    ],
  }, { transition: 'color-circle', tags: 'book call meeting cta مكالمة حجز' }),

  tpl('st-outro-rewatch', 'شوفها مرة تانية', 'outro', {
    duration: 5.5, bg: bgp('tunnel-round'), camera: { type: 'spiralOut', amount: 0.6 },
    elements: [
      veil({ y: 0.5, w: 1200, h: 1000, alpha: 0.7 }),
      el('icon', { name: 'refresh', y: 0.28, size: 220, color: '@accent', glow: 0.5, sfx: 'whoosh-reverse', anim: A('zoomRot', 0.2, { dur: 0.9, loop: 'spinSlow' }) }),
      text('ارجع شوفها\nمن الأول', { y: 0.53, size: 110, lineHeight: 1.3, anim: A('riseBlur', 0.9, { split: 'word', stagger: 0.1 }) }),
      text('في تفصيلة *بالثانية 7* فاتتك', { y: 0.72, size: 50, weight: 600, color: '@muted', anim: A('riseSoft', 1.9) }),
      status('replay', { x: 0.5, y: 0.82, anim: A('fade', 2.5) }),
      sig(),
    ],
  }, { transition: 'spin-full', tags: 'rewatch replay loop شوف مرة تانية' }),
];
