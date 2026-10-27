// Info pack: lists, stats, charts, timelines and comparisons.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl } from './kit.js';

// glass card + icon + label (used by icon grids)
const iconCard = (x, y, s, name, label, o = {}) => [
  shape('rect', { x, y, w: 430, h: 300, radius: 34, glass: true, shadow: 0.6, anim: A(o.cardIn || 'zoomOut', s, { dur: 0.7 }) }),
  el('icon', { x, y: y - 0.035, name, size: 70, color: '@accent', bg: '@accent/0.14', anim: A('elastic', s + 0.25, { dur: 0.9 }) }),
  text(label, { x, y: y + 0.07, size: 38, weight: 700, w: 400, anim: A('riseSoft', s + 0.35) }),
];

// stat card: counter (or text) + label
const statCard = (x, y, s, value, label, hero) => [
  shape('rect', hero
    ? { x, y, w: 430, h: 290, radius: 34, fill: '@accent', shadow: 0.8, anim: A('flipY', s, { dur: 0.8 }) }
    : { x, y, w: 430, h: 290, radius: 34, glass: true, shadow: 0.6, anim: A('flipY', s, { dur: 0.8 }) }),
  typeof value === 'string'
    ? text(value, { x, y: y - 0.025, size: 100, font: '@mono', weight: 700, color: hero ? '@ink' : '@accent', anim: A('fade', s + 0.25) })
    : el('counter', { x, y: y - 0.025, font: '@mono', size: 100, color: hero ? '@ink' : '@fg', countDur: 1.4, ...value, anim: A('fade', s + 0.2, { dur: 0.4 }) }),
  text(label, { x, y: y + 0.065, size: 32, weight: 600, w: 400, color: hero ? '@ink' : '@muted', anim: A('riseSoft', s + 0.35) }),
];

// price card
const priceCard = (x, s, name, price, items, hero) => {
  const y = 0.55;
  const ink = hero ? '@ink' : '@fg';
  const out = [
    shape('rect', hero
      ? { x, y, w: 280, h: 720, radius: 34, fill: '@accent', shadow: 1, anim: A('zoomOut', s, { dur: 0.8, loop: 'float', loopAmp: 0.6 }) }
      : { x, y, w: 280, h: 640, radius: 34, glass: true, shadow: 0.6, anim: A('tilt', s, { dur: 0.8 }) }),
    text(name, { x, y: hero ? 0.33 : 0.34, size: 36, weight: 700, w: 260, color: ink, anim: A('fade', s + 0.25) }),
    el('counter', { x, y: hero ? 0.42 : 0.425, prefix: '$', to: price, size: hero ? 100 : 88, font: '@display', weight: 800, color: hero ? '@ink' : '@accent', countDur: 1.2, anim: A('fade', s + 0.3, { dur: 0.4 }) }),
    text('/ شهرياً', { x, y: 0.495, size: 26, weight: 500, w: 260, color: hero ? '@ink' : '@muted', anim: A('fade', s + 0.45) }),
    el('list', { x, y: 0.64, w: 250, size: 26, gap: 20, icon: 'check', iconColor: hero ? '@ink' : '@accent', color: ink, items, anim: A('riseSoft', s + 0.55, { stagger: 0.15, dur: 0.6 }) }),
  ];
  if (hero) out.push(text('الأكثر طلباً', { x, y: 0.262, size: 26, weight: 700, w: 260, color: '@accent', box: { fill: '@ink', padX: 26, padY: 12 }, anim: A('pop', s + 0.6, { dur: 0.6 }) }));
  return out;
};

export const INFO = [
  // ================================================================== LIST
  tpl('info-steps-num', 'خطوات مرقّمة', 'list', {
    duration: 6.5, bg: { type: 'dots', size: 46 }, camera: { type: 'rise', amount: 0.7 }, fx: { vignette: 0.3 },
    elements: [
      tag('// 4 خطوات', { x: 0.5, y: 0.1 }),
      text('هيك بأتمت *أي شغلة* متكررة', { y: 0.2, size: 78, w: 900, anim: A('maskUp', 0.3, { split: 'line', stagger: 0.12 }) }),
      el('list', { y: 0.56, w: 880, size: 44, gap: 42, icon: 'num', items: ['بحدد الشغلة اللي بتتكرر كل يوم', 'برسم الـ workflow على ورقة', 'ببنيه على *n8n* وبجرّبه', 'بشغّله وبراقب النتائج'], anim: A('flipX', 1.0, { stagger: 0.32, dur: 0.7 }) }),
      sig(),
    ],
  }, { tags: 'steps numbered خطوات مرقمة', transition: 'wipe' }),

  tpl('info-stack-comment', 'قائمة بأسلوب الكود', 'list', {
    duration: 6, bg: { type: 'circuit' }, camera: { type: 'panL', amount: 0.6 }, fx: { grain: 0.3 },
    elements: [
      veil({ y: 0.45, h: 800 }),
      text('الـ *stack* اللي بشتغل فيه', { y: 0.16, size: 76, anim: A('blurIn', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('list', { y: 0.48, w: 880, size: 46, gap: 46, icon: 'comment', font: '@mono', weight: 500, items: ['n8n لبناء كل الـ workflows', 'Claude للوكيل الذكي', 'Supabase لتخزين البيانات', 'WhatsApp API للرد على العملاء'], anim: A('wipeL', 0.9, { stagger: 0.3, dur: 0.6 }) }),
      status('stack: production', { x: 0.5, y: 0.79, anim: A('fade', 2.4) }),
      sig(),
    ],
  }, { tags: 'stack code comment كود أدوات', transition: 'glitch' }),

  tpl('info-icon-grid', 'شبكة بطاقات أيقونات', 'list', {
    duration: 6, bg: { type: 'hex' }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('4 شغلات بيعملها الوكيل *عنك*', { y: 0.14, size: 72, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...iconCard(0.73, 0.45, 0.7, 'mail', 'يرد على الإيميلات'),
      ...iconCard(0.27, 0.45, 0.9, 'calendar', 'يحجز المواعيد'),
      ...iconCard(0.73, 0.72, 1.1, 'database', 'يحدّث الـ CRM'),
      ...iconCard(0.27, 0.72, 1.3, 'chart', 'يبعت التقارير'),
      sig(),
    ],
  }, { tags: 'grid cards icons بطاقات أيقونات', transition: 'tiles' }),

  tpl('info-do-dont', 'اعمل ولا تعمل', 'list', {
    duration: 7, bg: { type: 'gradient', angle: 200 }, camera: { type: 'rise', amount: 0.6 },
    elements: [
      text('قواعد الأتمتة الذكية', { y: 0.075, size: 60, anim: A('track', 0.2) }),
      shape('rect', { y: 0.345, w: 920, h: 450, radius: 36, fill: '@accent/0.08', stroke: '@accent', strokeW: 2, anim: A('unfold', 0.4, { dur: 0.8 }) }),
      text('اعمل', { y: 0.215, size: 40, color: '@ink', box: { fill: '@accent', padX: 42, padY: 12 }, anim: A('pop', 0.9, { dur: 0.6 }) }),
      el('list', { y: 0.37, w: 820, size: 40, gap: 30, icon: 'check', items: ['ابدأ بشغلة صغيرة ومتكررة', 'وثّق كل خطوة قبل ما تبنيها'], anim: A('slideR', 1.1, { stagger: 0.25 }) }),
      shape('rect', { y: 0.735, w: 920, h: 450, radius: 36, fill: '@fg/0.05', anim: A('unfold', 1.8, { dur: 0.8 }) }),
      text('لا تعمل', { y: 0.605, size: 40, color: '@fg', box: { fill: '@fg/0.12', padX: 42, padY: 12 }, anim: A('pop', 2.2, { dur: 0.6 }) }),
      el('list', { y: 0.76, w: 820, size: 40, gap: 30, icon: 'x', iconColor: '@muted', color: '@muted', items: ['لا تأتمت شي ما بتفهمه منيح', 'لا تنسى تراقب الأخطاء'], anim: A('slideR', 2.4, { stagger: 0.25 }) }),
    ],
  }, { tags: 'do dont rules قواعد اعمل', transition: 'blinds' }),

  tpl('info-launch-checklist', 'تشيك ليست الإطلاق', 'list', {
    duration: 7, bg: { type: 'plexus' }, camera: { type: 'push', amount: 0.7 },
    elements: [
      text('Launch checklist', { y: 0.11, size: 38, font: '@mono', weight: 600, color: '@ink', box: { fill: '@accent', padX: 34, padY: 14 }, anim: A('drop', 0.2) }),
      text('قبل ما أطلق أي *workflow*', { y: 0.225, size: 72, anim: A('riseBlur', 0.4, { split: 'word', stagger: 0.08 }) }),
      el('list', { y: 0.5, w: 860, size: 42, gap: 30, icon: 'check', items: ['اختبار على بيانات حقيقية', 'تنبيه فوري إذا صار أي خطأ', 'نسخة احتياطية من الإعدادات', 'توثيق واضح للفريق'], anim: A('riseSoft', 1.0, { stagger: 0.45, dur: 0.6 }) }),
      el('progress', { y: 0.76, w: 860, value: 1, label: 'جاهز للإطلاق', anim: A('fade', 1.2, { dur: 1.6 }) }),
      sig(),
    ],
  }, { tags: 'checklist launch إطلاق', transition: 'circle' }),

  tpl('info-big-numerals', 'أرقام عملاقة محددة', 'list', {
    duration: 7, bg: { type: 'contour' }, camera: { type: 'panR', amount: 0.6 },
    elements: [
      text('كيف بقرر شو *بأتمت*', { y: 0.1, size: 70, anim: A('maskDown', 0.2, { split: 'word', stagger: 0.07 }) }),
      ...[['01', 'إذا بتتكرر أكتر من 3 مرات بالأسبوع', 0.3, 0.7], ['02', 'إذا فيها نسخ ولصق بين برنامجين', 0.52, 1.4], ['03', 'إذا غلطة صغيرة فيها بتكلّف كتير', 0.74, 2.1]].flatMap(([n, t, y, s]) => [
        text(n, { x: 0.84, y, size: 150, font: '@mono', weight: 700, outline: true, strokeW: 3, color: '@accent', anim: A('skew', s, { dur: 0.7 }) }),
        text(t, { x: 0.4, y, size: 46, weight: 600, w: 640, align: 'start', lineHeight: 1.4, anim: A('blurSlideR', s + 0.15) }),
      ]),
      shape('line', { y: 0.41, w: 900, h: 4, strokeW: 2, stroke: '@fg/0.12', anim: A('draw', 1.0) }),
      shape('line', { y: 0.63, w: 900, h: 4, strokeW: 2, stroke: '@fg/0.12', anim: A('draw', 1.7) }),
      sig(),
    ],
  }, { tags: 'numbers outline rules أرقام', transition: 'stripes' }),

  tpl('info-pill-cloud', 'سحابة كبسولات', 'list', {
    duration: 6, bg: { type: 'bokeh' }, camera: { type: 'orbit', amount: 0.8 },
    elements: [
      text('شو رح نبني *سوا*', { y: 0.14, size: 84, anim: A('popRotate', 0.2, { split: 'word', stagger: 0.1 }) }),
      text('8 أسابيع · مشاريع حقيقية · بدون حشو', { y: 0.235, size: 36, weight: 400, color: '@muted', anim: A('fade', 0.8) }),
      ...[
        ['وكلاء ذكاء اصطناعي', 0.66, 0.36], ['n8n', 0.22, 0.36],
        ['Webhooks', 0.74, 0.48], ['MCP', 0.47, 0.48], ['APIs', 0.22, 0.48],
        ['تقارير تلقائية', 0.64, 0.6], ['CRM', 0.27, 0.6],
        ['WhatsApp bots', 0.5, 0.72, true],
      ].map(([t, x, y, hero], i) => text(t, {
        x, y, size: 42, weight: 600, w: 600, color: hero ? '@ink' : '@fg',
        box: { fill: hero ? '@accent' : '@fg/0.08', padX: 34, padY: 16 },
        anim: A('elastic', 0.8 + i * 0.15, { dur: 1, loop: 'float', loopAmp: 0.7, phase: i * 1.3 }),
      })),
      sig(),
    ],
  }, { tags: 'pills tags topics كبسولات مواضيع', transition: 'pixel' }),

  tpl('info-journey-cards', 'بطاقات رحلة متراكبة', 'list', {
    duration: 7.5, bg: { type: 'aurora' }, camera: { type: 'dolly', amount: 0.8 },
    elements: [
      text('رحلة العميل مع *الوكيل*', { y: 0.11, size: 74, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      ...[['01', 'يسأل على واتساب', 'الوكيل بيفهم السؤال خلال ثانية', 0.31, 0.6], ['02', 'بياخد عرض سعر', 'محسوب من الـ CRM مباشرة', 0.53, 1.2], ['03', 'بيحجز موعد', 'وبيوصلني إشعار على الجوال', 0.75, 1.8]].flatMap(([n, t, d, y, s]) => [
        shape('rect', { y, w: 900, h: 240, radius: 30, glass: true, shadow: 0.7, anim: A('tilt', s, { dur: 0.9 }) }),
        text(n, { x: 0.83, y, size: 64, font: '@mono', weight: 700, color: '@accent', anim: A('scramble', s + 0.3, { dur: 0.6 }) }),
        text(t, { x: 0.42, y: y - 0.03, size: 44, weight: 700, w: 620, align: 'start', anim: A('fade', s + 0.35) }),
        text(d, { x: 0.42, y: y + 0.035, size: 30, weight: 400, w: 620, align: 'start', color: '@muted', anim: A('fade', s + 0.5) }),
      ]),
      sig(),
    ],
  }, { tags: 'journey cards steps رحلة بطاقات', transition: 'cube' }),

  tpl('info-think-chain', 'سلسلة أيقونات', 'list', {
    duration: 6, bg: { type: 'rays', y: 0.45 }, camera: { type: 'punch', amount: 0.6 },
    elements: [
      text('كيف بيفكر *الوكيل* الذكي', { y: 0.17, size: 76, anim: A('wave', 0.2, { split: 'word', stagger: 0.09 }) }),
      el('icon', { x: 0.8, y: 0.45, name: 'message', size: 100, color: '@accent', bg: '@accent/0.15', anim: A('pop', 0.8) }),
      el('icon', { x: 0.5, y: 0.45, name: 'brain', size: 100, color: '@ink', bg: '@accent', anim: A('pop', 1.4, { loop: 'heartbeat' }) }),
      el('icon', { x: 0.2, y: 0.45, name: 'bolt', size: 100, color: '@accent', bg: '@accent/0.15', anim: A('pop', 2.0) }),
      shape('arrow', { x: 0.65, y: 0.45, w: 90, h: 40, strokeW: 7, rot: 180, stroke: '@accent', anim: A('draw', 1.1, { dur: 0.5 }) }),
      shape('arrow', { x: 0.35, y: 0.45, w: 90, h: 40, strokeW: 7, rot: 180, stroke: '@accent', anim: A('draw', 1.7, { dur: 0.5 }) }),
      ...[['يفهم', 'NLP', 0.8, 0.9], ['يفكّر', 'LLM', 0.5, 1.5], ['ينفّذ', 'Tools', 0.2, 2.1]].flatMap(([t, s2, x, s]) => [
        text(t, { x, y: 0.6, size: 46, weight: 700, w: 300, anim: A('riseSoft', s) }),
        text(s2, { x, y: 0.655, size: 26, font: '@mono', weight: 500, w: 300, color: '@muted', anim: A('fade', s + 0.15) }),
      ]),
      text('كل هاد بأقل من *3 ثواني*', { y: 0.78, size: 46, weight: 600, anim: A('maskUp', 2.6, { split: 'word' }) }),
      sig(),
    ],
  }, { tags: 'chain icons process سلسلة', transition: 'zoomThrough' }),

  // ================================================================== STATS
  tpl('info-kpi-row', 'صف مؤشرات KPI', 'stats', {
    duration: 6, bg: { type: 'grid', size: 70 }, camera: { type: 'push', amount: 0.7 }, fx: { grain: 0.3 },
    elements: [
      tag('// case study', { x: 0.5, y: 0.13 }),
      text('مشروع واحد… *3 أرقام*', { y: 0.24, size: 80, anim: A('riseBlur', 0.3, { split: 'word' }) }),
      el('counter', { x: 0.8, y: 0.47, to: 204, font: '@mono', size: 130, color: '@fg', countDur: 1.6, anim: A('riseBlur', 0.7) }),
      el('counter', { x: 0.5, y: 0.47, to: 494, font: '@mono', size: 130, color: '@fg', countDur: 1.6, anim: A('riseBlur', 0.95) }),
      el('counter', { x: 0.2, y: 0.47, to: 75, suffix: '%', font: '@mono', size: 130, color: '@accent', glow: 0.5, countDur: 1.6, anim: A('riseBlur', 1.2) }),
      text('ملف كود', { x: 0.8, y: 0.57, size: 34, weight: 500, w: 300, color: '@muted', anim: A('fade', 0.9) }),
      text('اختبار آلي', { x: 0.5, y: 0.57, size: 34, weight: 500, w: 300, color: '@muted', anim: A('fade', 1.15) }),
      text('توفير بالتكلفة', { x: 0.2, y: 0.57, size: 34, weight: 500, w: 300, color: '@muted', anim: A('fade', 1.4) }),
      shape('line', { x: 0.65, y: 0.51, w: 180, h: 4, strokeW: 2, stroke: '@fg/0.15', rot: 90, anim: A('draw', 1.0) }),
      shape('line', { x: 0.35, y: 0.51, w: 180, h: 4, strokeW: 2, stroke: '@fg/0.15', rot: 90, anim: A('draw', 1.2) }),
      text('بنظام واحد مبني على n8n و Supabase', { y: 0.72, size: 38, weight: 400, color: '@muted', anim: A('fade', 2.2) }),
      sig(),
    ],
  }, { tags: 'kpi counters row أرقام مؤشرات', transition: 'slide' }),

  tpl('info-donut-75', 'نسبة كبيرة بدائرة', 'stats', {
    duration: 5.5, bg: { type: 'radial', c1: '@bg2' }, camera: { type: 'dolly', amount: 0.8 },
    elements: [
      glowAt(0.5, 0.4, { alpha: 0.2 }),
      el('donut', { y: 0.4, w: 560, value: 0.75, thick: 0.13, glow: 0.8, anim: A('zoomOut', 0.3, { dur: 0.9 }) }),
      text('وفّرت *75%* من تكلفة الدعم', { y: 0.69, size: 72, anim: A('maskUp', 1.3, { split: 'line' }) }),
      text('بوكيل AI بيرد على 80% من الأسئلة لحاله', { y: 0.78, size: 38, weight: 400, color: '@muted', anim: A('riseSoft', 1.9) }),
      sig(),
    ],
  }, { tags: 'percent donut ring نسبة دائرة', transition: 'circle' }),

  tpl('info-x10', 'أسرع ×10', 'stats', {
    duration: 4.5, bg: { type: 'tunnel', speed: 0.1 }, camera: { type: 'punch', amount: 1.2 }, fx: { vignette: 0.6, grain: 0.4 },
    elements: [
      veil({ y: 0.45, w: 1100, h: 900, alpha: 0.7 }),
      glowAt(0.5, 0.4, { alpha: 0.25 }),
      el('particles', { kind: 'burst', y: 0.4, count: 70, w: 1000, h: 1000, anim: A('fade', 0.45, { dur: 0.2 }) }),
      text('x10', { y: 0.4, size: 380, weight: 800, fill: { g: 'linear', colors: ['@accent', '@secondary'], angle: 90 }, glow: 0.4, anim: A('slam', 0.3, { dur: 0.55 }) }),
      text('أسرع من الشغل *اليدوي*', { y: 0.62, size: 68, anim: A('riseBlur', 0.9, { split: 'word', stagger: 0.08 }) }),
      text('من 40 دقيقة لـ 4 دقائق', { y: 0.71, size: 36, font: '@mono', weight: 500, color: '@muted', anim: A('typewriter', 1.5, { dur: 0.9 }) }),
    ],
  }, { tags: 'x10 faster speed أسرع', transition: 'zoomThrough' }),

  tpl('info-yearly-savings', 'توفير بالدولار', 'stats', {
    duration: 6.5, bg: { type: 'spotlight' }, camera: { type: 'drift' },
    elements: [
      tag('// توفير سنوي', { x: 0.5, y: 0.12 }),
      el('counter', { y: 0.29, prefix: '$', to: 18400, size: 200, font: '@display', weight: 800, color: '@accent', underline: true, countDur: 2.2, anim: A('pushIn', 0.3) }),
      text('وفّرناها بأتمتة 3 عمليات بس', { y: 0.43, size: 52, weight: 700, anim: A('riseSoft', 1.0) }),
      el('bars', { y: 0.68, w: 860, h: 360, values: [400, 620, 800, 950, 1100, 1250, 1400, 1500, 1600, 1800, 2000, 2300], showValues: false, gap: 0.3, radius: 10, hi: 11, anim: A('fade', 1.4, { stagger: 0.08 }) }),
      text('توفير شهري', { y: 0.855, size: 28, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 2.6) }),
      sig({ y: 0.94, size: 26 }),
    ],
  }, { tags: 'dollar savings money توفير دولار', transition: 'panel' }),

  tpl('info-time-split', 'أشرطة تقدم متعددة', 'stats', {
    duration: 6.5, bg: { type: 'waves', lines: 10 }, camera: { type: 'rise', amount: 0.6 },
    elements: [
      text('وين بيروح *وقتي* هلق', { y: 0.15, size: 78, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[['بناء workflows جديدة', 0.82, '@accent'], ['تطوير مع العملاء', 0.64, '@fg/0.45'], ['مراجعة وتحسين', 0.4, '@fg/0.45'], ['شغل يدوي', 0.08, '@fg/0.45']].map(([label, value, color], i) =>
        el('progress', { y: 0.34 + i * 0.13, w: 860, value, label, color, labelSize: 34, anim: A('slideR', 0.8 + i * 0.3, { dur: 0.6 }) })),
      text('الشغل اليدوي صار *8%* بس', { y: 0.86, size: 46, weight: 700, anim: A('pop', 2.6) }),
    ],
  }, { tags: 'progress bars time أشرطة وقت', transition: 'split' }),

  tpl('info-stat-cards', 'بطاقات أرقام', 'stats', {
    duration: 6.5, bg: { type: 'blobs' }, camera: { type: 'orbit', amount: 0.7 },
    elements: [
      text('أداء الوكيل بأول شهر', { y: 0.13, size: 70, anim: A('flipX', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...statCard(0.73, 0.43, 0.6, { to: 3.2, decimals: 1, suffix: 's' }, 'متوسط وقت الرد', true),
      ...statCard(0.27, 0.43, 0.8, { to: 1200, suffix: '+' }, 'محادثة'),
      ...statCard(0.73, 0.7, 1.0, { to: 98, suffix: '%' }, 'رضا العملاء'),
      ...statCard(0.27, 0.7, 1.2, '24/7', 'شغال بدون توقف'),
      sig(),
    ],
  }, { tags: 'stat cards counters بطاقات أرقام', transition: 'flip' }),

  tpl('info-million-roll', 'عداد المليون', 'stats', {
    duration: 6, bg: { type: 'matrix' }, camera: { type: 'push', amount: 0.6 }, fx: { scanlines: true, vignette: 0.5 },
    elements: [
      veil({ y: 0.42, w: 1150, h: 820, alpha: 0.8 }),
      tag('// counter.live', { x: 0.5, y: 0.22 }),
      el('counter', { y: 0.4, to: 1000000, style: 'roll', font: '@mono', size: 150, color: '@accent', glow: 0.6, countDur: 2.4, anim: A('flicker', 0.3, { dur: 0.8 }) }),
      text('رسالة اتبعتت *تلقائياً* هالسنة', { y: 0.53, size: 62, anim: A('riseBlur', 1.2, { split: 'word' }) }),
      status('still counting', { x: 0.5, y: 0.65, anim: A('fade', 2) }),
      sig(),
    ],
  }, { tags: 'million counter roll مليون عداد', transition: 'glitch' }),

  tpl('info-8h-to-15m', 'من ساعات لدقائق', 'stats', {
    duration: 6.5, bg: { type: 'stripes', angle: -35 }, camera: { type: 'pull', amount: 0.8 },
    elements: [
      tag('// قبل الأتمتة', { x: 0.5, y: 0.11, color: '@muted' }),
      el('counter', { y: 0.25, to: 8, suffix: 'h', font: '@display', size: 220, color: '@muted', countDur: 0.8, anim: A('rise', 0.3) }),
      shape('line', { y: 0.25, w: 420, h: 10, strokeW: 12, stroke: '@accent', rot: -8, anim: A('draw', 1.4, { dur: 0.5 }) }),
      shape('arrow', { y: 0.43, w: 140, h: 50, strokeW: 8, rot: 90, stroke: '@fg/0.5', anim: A('draw', 1.8, { dur: 0.5 }) }),
      tag('// بعد الأتمتة', { x: 0.5, y: 0.54, color: '@accent', anim: A('typewriter', 2.1, { dur: 0.6 }) }),
      el('counter', { y: 0.67, to: 15, suffix: 'm', font: '@display', size: 240, color: '@accent', glow: 0.6, countDur: 1, anim: A('slam', 2.3, { dur: 0.5 }) }),
      text('بالأسبوع… لنفس الشغل بالضبط', { y: 0.82, size: 44, weight: 600, anim: A('fade', 3) }),
      sig(),
    ],
  }, { tags: 'hours minutes before after ساعات دقائق', transition: 'diamond' }),

  tpl('info-ring-trio', 'ثلاث دوائر نسب', 'stats', {
    duration: 6, bg: { type: 'mesh', density: 0.7, traffic: 0.6 }, camera: { type: 'panL', amount: 0.5 },
    elements: [
      text('نتائج *3 عملاء*', { y: 0.17, size: 80, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      el('donut', { x: 0.8, y: 0.44, w: 270, value: 0.92, thick: 0.16, labelSize: 64, anim: A('pop', 0.7) }),
      el('donut', { x: 0.5, y: 0.44, w: 270, value: 0.75, thick: 0.16, labelSize: 64, colors: ['@fg/0.6'], glow: 0, anim: A('pop', 1.0) }),
      el('donut', { x: 0.2, y: 0.44, w: 270, value: 0.6, thick: 0.16, labelSize: 64, colors: ['@fg/0.6'], glow: 0, anim: A('pop', 1.3) }),
      ...[['عيادة', 'مواعيد مؤتمتة', 0.8, 1.0], ['متجر', 'طلبات بدون تدخل', 0.5, 1.3], ['وكالة', 'تقارير تلقائية', 0.2, 1.6]].flatMap(([t, d, x, s]) => [
        text(t, { x, y: 0.58, size: 44, weight: 700, w: 300, anim: A('riseSoft', s) }),
        text(d, { x, y: 0.63, size: 26, weight: 500, w: 300, color: '@muted', anim: A('fade', s + 0.15) }),
      ]),
      text('نفس الفكرة… بتشتغل بكل مجال', { y: 0.78, size: 44, weight: 600, anim: A('maskUp', 2.2) }),
      sig(),
    ],
  }, { tags: 'rings donuts percent دوائر نسب', transition: 'whip' }),

  // ================================================================== CHART
  tpl('info-orders-bars', 'أعمدة نمو', 'chart', {
    duration: 6.5, bg: { type: 'floor', horizon: 0.8, sun: false, speed: 0.25 }, camera: { type: 'dolly', amount: 0.6 },
    elements: [
      text('نمو الطلبات بعد *الأتمتة*', { y: 0.12, size: 74, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      el('bars', { y: 0.47, w: 880, h: 560, values: [120, 140, 135, 260, 340, 410], labels: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون'], hi: 5, anim: A('fade', 0.6, { stagger: 0.14 }) }),
      text('قفزة +180% بعد أول شهر', { y: 0.8, size: 40, weight: 700, color: '@ink', box: { fill: '@accent', padX: 36, padY: 14 }, anim: A('pop', 2.0, { loop: 'float' }) }),
      sig(),
    ],
  }, { tags: 'bars chart growth أعمدة نمو', transition: 'cover' }),

  tpl('info-time-ranking', 'ترتيب أفقي', 'chart', {
    duration: 6.5, bg: { type: 'solid' }, camera: { type: 'panR', amount: 0.5 }, fx: { grain: 0.8 },
    elements: [
      tag('// ساعات بالأسبوع', { x: 0.5, y: 0.13 }),
      text('شو بياكل وقت *فريقك*', { y: 0.22, size: 76, anim: A('maskUp', 0.3, { split: 'word' }) }),
      el('bars', { y: 0.55, w: 900, h: 520, orient: 'h', labelW: 280, labelSize: 30, values: [14, 11, 8, 6, 4], labels: ['الرد على الإيميلات', 'إدخال البيانات', 'التقارير', 'المتابعة', 'الفواتير'], suffix: 'h', hi: 0, anim: A('fade', 0.8, { stagger: 0.15 }) }),
      text('كلها بتتأتمت', { y: 0.84, size: 52, weight: 700, color: '@ink', box: { fill: '@accent', padX: 40, padY: 14 }, anim: A('pop', 2.4, { loop: 'pulse' }) }),
    ],
  }, { tags: 'horizontal bars ranking ترتيب أعمدة', transition: 'stripes' }),

  tpl('info-followers-line', 'خط صاعد مع رقم', 'chart', {
    duration: 6.5, bg: { type: 'rings' }, camera: { type: 'push', amount: 0.8 },
    elements: [
      text('متابعيني بعد *6 أشهر* محتوى', { y: 0.13, size: 70, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      el('counter', { y: 0.27, to: 12.4, decimals: 1, suffix: 'K', font: '@mono', size: 120, color: '@accent', countDur: 2.6, anim: A('fade', 0.5) }),
      el('linechart', { y: 0.58, w: 800, h: 440, values: [1.2, 1.5, 2.1, 2.8, 4.6, 6.1, 8.9, 12.4], tip: '+312%', anim: A('fade', 0.7, { dur: 1 }) }),
      text('بوست واحد بالأسبوع… بس كل أسبوع', { y: 0.84, size: 40, weight: 500, color: '@muted', anim: A('fade', 3.2) }),
      sig(),
    ],
  }, { tags: 'line chart followers growth خط متابعين', transition: 'ink' }),

  tpl('info-donut-legend', 'دائرة مع مفتاح', 'chart', {
    duration: 6.5, bg: { type: 'stars', count: 120, speed: 0.2 }, camera: { type: 'orbit', amount: 0.5 },
    elements: [
      text('وين بتروح *ساعات* الأتمتة', { y: 0.12, size: 68, anim: A('maskUp', 0.2, { split: 'line' }) }),
      el('donut', { y: 0.42, w: 520, values: [45, 30, 15, 10], label: '40h', sub: 'بالأسبوع', thick: 0.2, anim: A('spin', 0.5, { dur: 1 }) }),
      ...[['دعم العملاء 45%', '@accent', 0.73, 0.68], ['المبيعات 30%', '@secondary', 0.27, 0.68], ['التقارير 15%', '@fg/0.5', 0.73, 0.76], ['الفواتير 10%', '@muted', 0.27, 0.76]].flatMap(([t, c, x, y], i) => [
        shape('circle', { x: x + 0.15, y, w: 28, h: 28, fill: c, anim: A('pop', 1.6 + i * 0.15) }),
        text(t, { x: x - 0.03, y, size: 34, weight: 600, w: 300, align: 'start', anim: A('blurSlideR', 1.65 + i * 0.15) }),
      ]),
      sig(),
    ],
  }, { tags: 'donut legend segments دائرة مفتاح', transition: 'spin' }),

  tpl('info-revenue-card', 'بطاقة إيرادات', 'chart', {
    duration: 7, bg: { type: 'blobs', size: 0.5 }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('الإيرادات الشهرية', { y: 0.1, size: 56, weight: 700, anim: A('riseSoft', 0.1) }),
      shape('rect', { y: 0.53, w: 940, h: 900, radius: 44, glass: true, shadow: 1, anim: A('pushIn', 0.2, { dur: 1 }) }),
      tag('// MRR', { x: 0.8, y: 0.25, anim: A('typewriter', 0.7, { dur: 0.5 }) }),
      el('counter', { x: 0.32, y: 0.255, prefix: '$', to: 42, suffix: 'K', size: 110, font: '@display', weight: 800, color: '@accent', countDur: 1.8, anim: A('riseBlur', 0.8) }),
      text('+38% عن الشهر الماضي', { x: 0.32, y: 0.335, size: 28, font: '@mono', weight: 600, w: 400, color: '@secondary', anim: A('fade', 1.4) }),
      shape('line', { y: 0.4, w: 820, h: 4, strokeW: 2, stroke: '@fg/0.1', anim: A('draw', 1.0) }),
      el('linechart', { y: 0.62, w: 820, h: 380, values: [18, 21, 20, 26, 29, 31, 36, 42], anim: A('fade', 1.2) }),
      sig({ y: 0.95, size: 26 }),
    ],
  }, { tags: 'revenue card mrr line إيرادات بطاقة', transition: 'zoom' }),

  tpl('info-growth-story', 'قصة نمو بالأعمدة', 'chart', {
    duration: 7, bg: { type: 'radial', x: 0.5, y: 0.8 }, camera: { type: 'push', amount: 0.6 },
    elements: [
      el('rotator', { y: 0.13, prefix: 'السنة كانت عن', words: ['التعلم', 'البناء', 'النمو'], size: 68, interval: 1.6, anim: A('riseBlur', 0.2) }),
      el('bars', { y: 0.5, w: 760, h: 560, values: [20, 55, 100], labels: ['السنة 1', 'السنة 2', 'السنة 3'], radius: 30, gap: 0.42, hi: 2, suffix: 'K', labelSize: 30, anim: A('fade', 0.6, { stagger: 0.5, dur: 1.1 }) }),
      text('من 20 ألف لـ 100 ألف دولار', { y: 0.84, size: 46, weight: 700, anim: A('maskUp', 2.4, { split: 'word' }) }),
      sig(),
    ],
  }, { tags: 'growth story years قصة نمو سنوات', transition: 'blinds' }),

  tpl('info-dual-lines', 'خطين مقارنة', 'chart', {
    duration: 6.5, bg: { type: 'grid', size: 60, speed: 6 }, camera: { type: 'panL', amount: 0.5 },
    elements: [
      text('يدوي *ضد* مؤتمت', { y: 0.12, size: 84, anim: A('scatter', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('line', { x: 0.82, y: 0.225, w: 60, h: 8, strokeW: 8, stroke: '@accent', anim: A('draw', 0.8, { dur: 0.4 }) }),
      text('مؤتمت', { x: 0.71, y: 0.225, size: 34, weight: 600, w: 200, anim: A('fade', 0.9) }),
      shape('line', { x: 0.42, y: 0.225, w: 60, h: 8, strokeW: 8, stroke: '@fg/0.35', anim: A('draw', 1.0, { dur: 0.4 }) }),
      text('يدوي', { x: 0.31, y: 0.225, size: 34, weight: 600, w: 200, color: '@muted', anim: A('fade', 1.1) }),
      el('linechart', { y: 0.55, w: 800, h: 520, values: [10, 14, 17, 20, 22, 25, 27, 29], min: 0, max: 100, color: '@fg/0.35', area: false, dots: false, glow: 0, anim: A('fade', 0.6) }),
      el('linechart', { y: 0.55, w: 800, h: 520, values: [10, 22, 38, 51, 63, 74, 86, 97], min: 0, max: 100, grid: false, tip: '3.3x', anim: A('fade', 1.2) }),
      text('نفس الفريق… إنتاجية أعلى بـ 3 مرات', { y: 0.86, size: 42, weight: 600, anim: A('fade', 3.4) }),
    ],
  }, { tags: 'dual line compare خطين مقارنة', transition: 'pixel' }),

  tpl('info-funnel', 'قمع مبيعات', 'chart', {
    duration: 7, bg: { type: 'gradient', angle: 20, c1: '@bg2', c2: '@bg' }, camera: { type: 'rise', amount: 0.6 },
    elements: [
      text('قمع المبيعات بعد *الوكيل*', { y: 0.11, size: 72, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      ...[['1,000 زائر', 900, '@fg/0.1', '@fg'], ['320 محادثة', 700, '@fg/0.16', '@fg'], ['140 عرض سعر', 520, '@fg/0.24', '@fg'], ['60 عميل', 340, '@accent', '@ink']].flatMap(([t, w, fill, color], i) => [
        shape('rect', { y: 0.28 + i * 0.14, w, h: 130, radius: 24, fill, anim: A('growC', 0.6 + i * 0.4, { dur: 0.7 }) }),
        text(t, { y: 0.28 + i * 0.14, size: 40, weight: 700, w: w - 40, color, anim: A('fade', 0.9 + i * 0.4) }),
      ]),
      text('*6%* تحويل من الزيارة للعميل', { y: 0.83, size: 48, weight: 700, anim: A('pop', 2.6) }),
      sig(),
    ],
  }, { tags: 'funnel sales conversion قمع مبيعات', transition: 'fade' }),

  // ================================================================== TIME
  tpl('info-journey-vertical', 'رحلتي بالسنوات', 'time', {
    duration: 7, bg: { type: 'mesh', density: 1.2, traffic: 0.8 }, camera: { type: 'rise', amount: 0.8 },
    elements: [
      text('رحلتي مع *الأتمتة*', { y: 0.1, size: 78, anim: A('maskUp', 0.2, { split: 'word' }) }),
      el('timeline', { y: 0.53, w: 860, h: 760, size: 42, items: [{ t: 'أول أتمتة', s: 'سنة 2022' }, { t: 'أول عميل', s: 'سنة 2023' }, { t: 'وكلاء AI', s: 'سنة 2024' }, { t: '+40 مشروع', s: 'سنة 2026' }], anim: A('none', 0.6, { stagger: 0.6 }) }),
      sig(),
    ],
  }, { tags: 'timeline vertical years رحلة سنوات', transition: 'blur' }),

  tpl('info-roadmap-h', 'خطة أفقية', 'time', {
    duration: 6.5, bg: { type: 'grid', size: 120 }, camera: { type: 'panL', amount: 0.6 },
    elements: [
      tag('// roadmap 2026', { x: 0.5, y: 0.2 }),
      text('خطة *الإطلاق*', { y: 0.3, size: 100, anim: A('stretch', 0.3, { split: 'word', stagger: 0.1 }) }),
      el('timeline', { y: 0.6, w: 960, h: 420, orient: 'h', size: 38, items: [{ t: 'الفكرة', s: 'Q1' }, { t: 'أول نسخة', s: 'Q2' }, { t: 'التجربة', s: 'Q3' }, { t: 'الإطلاق', s: 'Q4' }], anim: A('none', 1.0, { stagger: 0.5 }) }),
      status('on track', { x: 0.5, y: 0.84, anim: A('fade', 3) }),
    ],
  }, { tags: 'roadmap horizontal quarters خطة', transition: 'whip' }),

  tpl('info-day-agent', 'يوم بحياة الوكيل', 'time', {
    duration: 7.5, bg: { type: 'spotlight', speed: 0.6 }, camera: { type: 'drift', amount: 0.7 },
    elements: [
      el('icon', { y: 0.09, name: 'clock', size: 80, color: '@accent', anim: A('pop', 0.1, { loop: 'spinSlow' }) }),
      text('يوم بحياة *الوكيل*', { y: 0.19, size: 72, anim: A('riseBlur', 0.3, { split: 'word' }) }),
      shape('line', { x: 0.7, y: 0.56, w: 640, h: 6, strokeW: 3, stroke: '@fg/0.2', rot: 90, anim: A('draw', 0.7, { dur: 2.6, ease: 'linear' }) }),
      ...[['08:00', 'رد على 40 إيميل'], ['11:30', 'حجز 6 مواعيد جديدة'], ['15:00', 'حدّث الـ CRM كامل'], ['18:00', 'بعتلي تقرير اليوم']].flatMap(([tm, d], i) => {
        const y = 0.34 + i * 0.13, s = 1.0 + i * 0.6;
        return [
          text(tm, { x: 0.82, y, size: 40, font: '@mono', weight: 600, w: 300, color: '@accent', anim: A('scramble', s, { dur: 0.5 }) }),
          shape('circle', { x: 0.7, y, w: 26, h: 26, fill: '@accent', anim: A('pop', s) }),
          text(d, { x: 0.38, y, size: 40, weight: 600, w: 560, align: 'start', anim: A('blurSlideR', s + 0.1) }),
        ];
      }),
      text('وأنا؟ كنت عم ببني شي جديد', { y: 0.87, size: 42, weight: 500, color: '@muted', anim: A('fade', 3.6) }),
    ],
  }, { tags: 'day schedule hours يوم جدول', transition: 'panel' }),

  tpl('info-phases', 'قبل · أثناء · بعد', 'time', {
    duration: 7, bg: { type: 'hex', size: 80 }, camera: { type: 'orbit', amount: 0.6 },
    elements: [
      text('قبل · أثناء · بعد', { y: 0.12, size: 80, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.15 }) }),
      ...[['قبل', 'alert', 'شغل يدوي وأخطاء كتير', 0.8, 0.6, false], ['أثناء', 'gear', 'بناء وتجربة الـ workflow', 0.5, 1.0, true], ['بعد', 'rocket', 'كل شي ماشي لحاله', 0.2, 1.4, false]].flatMap(([t, ic, d, x, s, hero]) => [
        shape('rect', hero
          ? { x, y: 0.52, w: 280, h: 640, radius: 140, fill: '@accent', shadow: 0.8, anim: A('riseBlur', s, { dur: 0.9 }) }
          : { x, y: 0.52, w: 280, h: 640, radius: 140, glass: true, shadow: 0.5, anim: A('riseBlur', s, { dur: 0.9 }) }),
        el('icon', { x, y: 0.36, name: ic, size: 70, color: hero ? '@ink' : '@accent', anim: A('pop', s + 0.3, hero ? { loop: 'spinSlow' } : {}) }),
        text(t, { x, y: 0.47, size: 44, weight: 800, w: 260, color: hero ? '@ink' : '@fg', anim: A('fade', s + 0.4) }),
        text(d, { x, y: 0.59, size: 30, weight: 500, w: 220, lineHeight: 1.5, color: hero ? '@ink' : '@muted', anim: A('fade', s + 0.55) }),
      ]),
      text('3 أسابيع من الفكرة للإطلاق', { y: 0.86, size: 42, weight: 600, anim: A('maskUp', 2.4) }),
    ],
  }, { tags: 'phases before during after مراحل', transition: 'tiles' }),

  tpl('info-roadmap-path', 'مسار متعرج', 'time', {
    duration: 7.5, bg: { type: 'dots', size: 60, wave: false }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('خارطة الطريق *2026*', { y: 0.14, size: 80, anim: A('maskUp', 0.2, { split: 'word' }) }),
      shape('wave', { y: 0.52, w: 860, h: 300, cycles: 1, speed: 0, strokeW: 6, stroke: '@accent', glow: 0.4, flipX: true, anim: A('draw', 0.6, { dur: 2.4, ease: 'cubicInOut' }) }),
      ...[['الفكرة', 'Q1', 0.844, 0.59, 0.075], ['أول نسخة', 'Q2', 0.612, 0.607, 0.075], ['أول 100 عميل', 'Q3', 0.388, 0.433, -0.075], ['التوسّع', 'Q4', 0.156, 0.449, -0.075]].flatMap(([t, q, x, y, off], i) => [
        shape('circle', { x, y, w: 40, h: 40, fill: '@bg', stroke: '@accent', strokeW: 6, anim: A('pop', 0.9 + i * 0.6) }),
        text(q, { x, y: y + off * 0.7, size: 26, font: '@mono', weight: 600, w: 300, color: '@accent', anim: A('fade', 1.0 + i * 0.6) }),
        text(t, { x, y: y + off * 1.3, size: 38, weight: 700, w: 260, anim: A('riseSoft', 1.05 + i * 0.6) }),
      ]),
      sig(),
    ],
  }, { tags: 'roadmap path milestones مسار', transition: 'stripes' }),

  tpl('info-countdown', 'عد تنازلي', 'time', {
    duration: 6, bg: { type: 'rings', speed: 0.18 }, camera: { type: 'push', amount: 0.9 },
    elements: [
      text('باقي على *الإطلاق*', { y: 0.2, size: 80, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      ...[['0', 3, 'يوم', 0.8, 0.6, true], ['', 12, 'ساعة', 0.5, 0.8], ['', 45, 'دقيقة', 0.2, 1.0]].flatMap(([pre, to, lab, x, s, hero]) => [
        shape('rect', { x, y: 0.45, w: 270, h: 270, radius: 40, glass: true, shadow: 0.7, anim: A('flipX', s, { dur: 0.8 }) }),
        el('counter', { x, y: 0.45, prefix: pre, to, style: 'roll', font: '@mono', size: 120, color: hero ? '@accent' : '@fg', glow: hero ? 0.5 : 0, countDur: 1.4, anim: A('fade', s + 0.2, { dur: 0.4 }) }),
        text(lab, { x, y: 0.58, size: 34, weight: 600, w: 260, color: '@muted', anim: A('fade', s + 0.3) }),
      ]),
      text('الوكيل الجديد جاهز… قريباً', { y: 0.71, size: 48, weight: 700, anim: A('fade', 2) }),
      status('launch soon', { x: 0.5, y: 0.8, anim: A('fade', 2.4) }),
      sig(),
    ],
  }, { tags: 'countdown launch عد تنازلي إطلاق', transition: 'zoom' }),

  // ================================================================== COMPARE
  tpl('info-n8n-vs-zapier', 'مواجهة VS', 'compare', {
    duration: 7, bg: { type: 'split', angle: 90, ratio: 0.5, c1: '@bg', c2: '@bg2' }, camera: { type: 'push', amount: 0.5 },
    elements: [
      text('n8n', { x: 0.75, y: 0.15, size: 96, color: '@accent', w: 440, anim: A('slam', 0.4, { dur: 0.5 }) }),
      text('Zapier', { x: 0.25, y: 0.15, size: 80, color: '@muted', w: 440, anim: A('riseSoft', 0.7) }),
      shape('circle', { x: 0.5, y: 0.15, w: 130, h: 130, fill: '@accent', anim: A('pop', 1.0, { loop: 'heartbeat' }) }),
      text('VS', { x: 0.5, y: 0.15, size: 44, font: '@mono', weight: 800, color: '@ink', w: 200, anim: A('pop', 1.0, { loop: 'heartbeat' }) }),
      el('list', { x: 0.75, y: 0.46, w: 440, size: 36, gap: 34, icon: 'check', items: ['self-hosted ومجاني', 'تشغيل بدون حدود', 'كود JavaScript كامل', 'وكلاء AI جاهزين'], anim: A('slideR', 1.4, { stagger: 0.22 }) }),
      el('list', { x: 0.25, y: 0.46, w: 440, size: 36, gap: 34, icon: 'x', iconColor: '@muted', color: '@muted', items: ['اشتراك شهري غالي', 'كل خطوة بتنحسب', 'تخصيص محدود', 'مرتبط بالسحابة'], anim: A('slideL', 1.5, { stagger: 0.22 }) }),
      text('الفائز عندي؟ *n8n* بلا منازع', { y: 0.8, size: 52, weight: 700, anim: A('maskUp', 3, { split: 'word' }) }),
      sig(),
    ],
  }, { tags: 'versus vs n8n zapier مقارنة مواجهة', transition: 'split' }),

  tpl('info-old-new-way', 'الطريقة القديمة والجديدة', 'compare', {
    duration: 7, bg: { type: 'waves', lines: 18, amp: 0.03 }, camera: { type: 'rise', amount: 0.6 },
    elements: [
      tag('// الطريقة القديمة', { x: 0.5, y: 0.12, color: '@muted' }),
      text('إكسل، نسخ ولصق، وتذكير يدوي', { y: 0.22, size: 58, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('line', { y: 0.22, w: 800, h: 8, strokeW: 6, stroke: '@fg/0.6', anim: A('draw', 1.4, { dur: 0.6 }) }),
      shape('arrow', { y: 0.36, w: 120, h: 50, strokeW: 8, rot: 90, stroke: '@accent', anim: A('draw', 2.0, { dur: 0.5 }) }),
      tag('// الطريقة الجديدة', { x: 0.5, y: 0.47, color: '@accent', anim: A('typewriter', 2.3, { dur: 0.6 }) }),
      shape('rect', { y: 0.66, w: 900, h: 330, radius: 40, glass: true, shadow: 0.8, anim: A('zoomIn', 2.5, { dur: 0.8 }) }),
      text('workflow واحد بيعمل كل هاد *لحاله*', { y: 0.63, size: 56, w: 820, anim: A('riseBlur', 2.8, { split: 'word' }) }),
      status('runs every hour', { x: 0.5, y: 0.74, anim: A('fade', 3.6) }),
      sig(),
    ],
  }, { tags: 'old new way طريقة قديمة جديدة', transition: 'wipe' }),

  tpl('info-race', 'سباق يدوي ضد مؤتمت', 'compare', {
    duration: 7, bg: { type: 'stripes', angle: 35, speed: 140, width: 50 }, camera: { type: 'shake', amount: 0.5 },
    elements: [
      text('سباق: *يدوي* ضد *مؤتمت*', { y: 0.14, size: 72, anim: A('stretch', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('progress', { y: 0.38, w: 880, value: 0.34, label: 'يدوي · 40 دقيقة', color: '@fg/0.5', anim: A('fade', 0.8, { dur: 2.6 }) }),
      el('progress', { y: 0.55, w: 880, value: 1, label: 'مؤتمت · 4 دقائق', color: '@accent', anim: A('fade', 0.8, { dur: 0.5 }) }),
      el('icon', { y: 0.71, name: 'trophy', size: 90, color: '@accent', bg: '@accent/0.14', anim: A('pop', 2.0, { loop: 'wiggle' }) }),
      text('خلص قبل ما يبلّش التاني', { y: 0.84, size: 44, weight: 700, anim: A('riseSoft', 2.3) }),
      sig(),
    ],
  }, { tags: 'race progress manual automated سباق', transition: 'whip' }),

  tpl('info-price-tiers', 'باقات أسعار', 'compare', {
    duration: 7, bg: { type: 'radial', c1: '@bg2', y: 0.55 }, camera: { type: 'push', amount: 0.6 },
    elements: [
      text('اختار *الباقة* المناسبة', { y: 0.1, size: 72, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      ...priceCard(0.8, 0.5, 'أساسي', 49, ['3 أتمتات شهرياً', 'دعم بالإيميل', 'تقرير شهري']),
      ...priceCard(0.2, 0.7, 'شركات', 399, ['بدون حدود', 'فريق مخصص', 'تدريب للفريق']),
      ...priceCard(0.5, 1.0, 'احترافي', 149, ['10 أتمتات شهرياً', 'وكيل AI ذكي', 'دعم أولوية'], true),
      sig(),
    ],
  }, { tags: 'pricing tiers plans أسعار باقات', transition: 'flip' }),

  tpl('info-week-change', 'شو بيتغير بأسبوع', 'compare', {
    duration: 7, bg: { type: 'gradient', angle: 140 }, camera: { type: 'dolly', amount: 0.6 },
    elements: [
      text('شو بيتغير *بأسبوع* واحد', { y: 0.1, size: 74, anim: A('maskUp', 0.2, { split: 'word' }) }),
      shape('rect', { y: 0.52, w: 900, h: 760, radius: 40, fill: '@fg/0.06', anim: A('fade', 0.4) }),
      text('قبل', { y: 0.25, size: 44, weight: 700, color: '@muted', anim: A('fade', 0.5) }),
      el('list', { y: 0.51, w: 760, size: 40, gap: 34, icon: 'x', iconColor: '@muted', color: '@muted', items: ['40 إيميل بدون رد', 'مواعيد ضايعة', 'تقارير متأخرة', 'فريق مضغوط'], anim: A('fade', 0.6, { stagger: 0.15 }) }),
      shape('rect', { y: 0.52, w: 900, h: 760, radius: 40, fill: '@accent', anim: A('wipeL', 2.4, { dur: 1.2 }) }),
      text('بعد', { y: 0.25, size: 44, weight: 700, color: '@ink', anim: A('fade', 3.3) }),
      el('list', { y: 0.51, w: 760, size: 40, gap: 34, icon: 'check', iconColor: '@ink', color: '@ink', items: ['كل إيميل انرد خلال دقيقة', 'المواعيد بتنحجز لحالها', 'التقارير جاهزة الساعة 8', 'الفريق مرتاح'], anim: A('riseSoft', 3.4, { stagger: 0.15 }) }),
      sig(),
    ],
  }, { tags: 'before after week reveal قبل بعد', transition: 'circle' }),

  tpl('info-employee-vs-agent', 'تكلفة موظف ضد وكيل', 'compare', {
    duration: 7, bg: { type: 'mesh', density: 1.3, traffic: 0.5 }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('موظف دعم ضد *وكيل AI*', { y: 0.11, size: 72, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      tag('// تكلفة شهرية', { x: 0.5, y: 0.2, anim: A('typewriter', 0.6, { dur: 0.6 }) }),
      text('موظف دعم', { y: 0.3, size: 40, weight: 700, w: 860, align: 'start', anim: A('fade', 0.8) }),
      el('counter', { x: 0.2, y: 0.3, prefix: '$', to: 3500, size: 56, font: '@mono', weight: 700, color: '@fg', countDur: 1.4, anim: A('fade', 0.8, { dur: 0.4 }) }),
      shape('rect', { y: 0.37, w: 860, h: 60, radius: 30, fill: '@fg/0.3', flipX: true, anim: A('grow', 0.9, { dur: 1.2 }) }),
      text('وكيل AI', { y: 0.47, size: 40, weight: 700, w: 860, align: 'start', anim: A('fade', 1.6) }),
      el('counter', { x: 0.2, y: 0.47, prefix: '$', to: 49, size: 56, font: '@mono', weight: 700, color: '@accent', countDur: 1, anim: A('fade', 1.6, { dur: 0.4 }) }),
      shape('rect', { x: 0.91, y: 0.54, w: 40, h: 60, radius: 30, fill: '@accent', glow: 0.6, anim: A('pop', 1.8) }),
      text('أوفر بـ *71 مرة*', { y: 0.69, size: 96, anim: A('slam', 2.4, { dur: 0.5 }) }),
      text('ونفس جودة الردود… وبدون إجازات', { y: 0.79, size: 40, weight: 500, color: '@muted', anim: A('fade', 3) }),
      sig(),
    ],
  }, { tags: 'cost employee agent تكلفة موظف وكيل', transition: 'cube' }),
];
