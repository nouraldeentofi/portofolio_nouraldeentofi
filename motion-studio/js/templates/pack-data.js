// Data pack: lists, stats, charts, time, comparisons and explainers (dt-*).
import { A, text, shape, el, tag, status, sig, tpl, bgp } from './kit.js';

// clock / gauge hand that turns around its own centre: a pill twice as long, first half transparent
const hand = (x, y, len, thick, rot, col = '@fg', o = {}) => shape('pill', {
  x, y, w: len * 2, h: thick, rot,
  fill: { g: 'linear', angle: 90, colors: [col + '/0', col + '/0', col + '/0', col + '/0', col, col, col, col, col] },
  ...o,
});
const vline = (x, y, len, o = {}) => shape('line', { x, y, w: len, rot: 90, stroke: '@fg/0.2', strokeW: 3, ...o });
const chip = (t, o = {}) => text(t, { size: 30, weight: 700, w: 340, box: { fill: '@raised', padX: 24, padY: 12, radius: 40 }, ...o });

// a line between two frame points (4:5 frame: x in 1000 units, y in 1250 units)
const segment = (x0, y0, x1, y1, o = {}) => {
  const dx = (x1 - x0) * 1000, dy = (y1 - y0) * 1250;
  return shape('line', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(dx, dy), rot: (Math.atan2(dy, dx) * 180) / Math.PI, stroke: '@fg', strokeW: 4, ...o });
};

// icon tile + title + muted line, used by row lists
const iconRow = (y, s, icon, title, sub, o = {}) => [
  shape('rect', { y, w: 880, h: o.h || 124, radius: 26, glass: true, shadow: 0.4, sfx: 'whoosh-soft', sfxVol: 0.5, anim: A(o.cardIn || 'blurSlideL', s, { dur: 0.7 }) }),
  el('icon', { x: 0.865, y, name: icon, size: 44, color: '@accent', bg: '@accent/0.14', bgShape: 'square', sfx: 'none', anim: A('pop', s + 0.2, { dur: 0.6 }) }),
  text(title, { x: 0.46, y: y - 0.018, w: 640, size: o.size || 40, weight: 800, align: 'start', dir: 'rtl', anim: A('fade', s + 0.25) }),
  text(sub, { x: 0.46, y: y + 0.025, w: 640, size: 28, weight: 500, color: '@muted', align: 'start', dir: 'rtl', anim: A('fade', s + 0.35) }),
];

// heatmap data: rows = days, columns = time slots (right to left)
const HEAT = [
  [0.3, 0.5, 0.4, 0.3, 0.2, 0.1],
  [0.6, 1.0, 0.8, 0.6, 0.4, 0.2],
  [0.5, 0.9, 0.7, 0.5, 0.4, 0.2],
  [0.5, 0.8, 0.7, 0.6, 0.3, 0.2],
  [0.4, 0.7, 0.6, 0.5, 0.3, 0.15],
  [0.3, 0.5, 0.4, 0.3, 0.2, 0.1],
  [0.05, 0.1, 0.15, 0.1, 0.1, 0.05],
];
const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const SLOTS = ['8ص', '10ص', '12ظ', '2م', '4م', '6م'];

// scatter data: workflows 1..14 against errors per month
const ERRS = [47, 41, 44, 33, 36, 27, 22, 25, 15, 12, 14, 7, 5, 2];
const errPt = (i) => [0.18 + i * (0.68 / 13), 0.7 - (ERRS[i] / 50) * 0.42];

// uptime strip: 90 days, one slow day
const UPTIME = Array.from({ length: 90 }, (_, i) => (i === 61 ? '@fg/0.3' : '@accent'));

// year ruler: month 1 on the right
const monthX = (m) => 0.84 - ((m - 1) / 11) * 0.68;

export const DATA = [
  // ================================================================== LIST
  tpl('dt-receipt', 'فاتورة الوقت', 'list', {
    duration: 6.5, bg: bgp('grainy-cool'), camera: { type: 'tiltDown', amount: 0.5 }, fx: { grain: 0.2 },
    elements: [
      tag('// فاتورة أكتوبر', { y: 0.075 }),
      text('شو *رجّعتلي* الأتمتة بشهر', { y: 0.145, size: 68, anim: A('maskUp', 0.25, { split: 'word', stagger: 0.08 }) }),
      shape('rect', { y: 0.55, w: 720, h: 860, radius: 20, fill: '@card', shadow: 0.8, sfx: 'paper', anim: A('unfold', 0.6, { dur: 0.9 }) }),
      text('RECEIPT · NOUR AUTOMATION', { y: 0.25, size: 26, font: '@mono', weight: 600, color: '@muted', w: 640, anim: A('fade', 1.0) }),
      shape('dots', { y: 0.29, w: 640, h: 1, cols: 24, rows: 1, dot: 4, fill: '@fg/0.25', anim: A('fade', 1.0) }),
      ...[['رد على الإيميلات', '14 ساعة'], ['إدخال بيانات', '22 ساعة'], ['تقارير أسبوعية', '9 ساعات'], ['متابعة العملاء', '11 ساعة']].flatMap(([a, b], i) => [
        text(a, { y: 0.345 + i * 0.065, w: 600, size: 38, weight: 600, align: 'start', anim: A('fade', 1.2 + i * 0.3, { dur: 0.4 }) }),
        text(b, { y: 0.345 + i * 0.065, w: 600, size: 38, weight: 800, align: 'end', sfx: 'tick-wood', sfxPitch: 1 + i * 0.08, anim: A('typewriter', 1.3 + i * 0.3, { dur: 0.4 }) }),
      ]),
      shape('line', { y: 0.61, w: 620, stroke: '@fg/0.35', strokeW: 3, dash: [10, 10], anim: A('wipeL', 2.4, { dur: 0.6 }) }),
      text('المجموع', { y: 0.67, w: 600, size: 46, weight: 800, align: 'start', anim: A('fade', 2.6) }),
      el('counter', { x: 0.3, y: 0.67, to: 56, suffix: 'ساعة', size: 64, weight: 800, color: '@accent', countDur: 1.0, anim: A('fade', 2.6, { dur: 0.4 }) }),
      text('مدفوعة بالكامل', { x: 0.63, y: 0.765, size: 40, weight: 800, w: 400, color: '@accent', rot: -9, box: { fill: '@accent/0.12', padX: 26, padY: 12, radius: 12 }, sfx: 'stamp', anim: A('slam', 3.2, { dur: 0.5 }) }),
      text('والتكلفة؟ *$12* سيرفر بالشهر', { y: 0.845, size: 32, weight: 600, color: '@muted', w: 600, anim: A('riseSoft', 3.5) }),
    ],
  }, { tags: 'receipt invoice list فاتورة وقت قائمة', transition: 'page-left' }),

  tpl('dt-tier-list', 'تير ليست الأدوات', 'list', {
    duration: 6.5, bg: bgp('stripes-flat'), camera: { type: 'panL', amount: 0.4 },
    elements: [
      text('ترتيبي لأدوات *الأتمتة*', { y: 0.11, size: 72, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[['S', ['n8n', 'Claude']], ['A', ['Make', 'Supabase', 'Airtable']], ['B', ['Zapier', 'Notion']], ['C', ['Excel VBA']]].flatMap(([L, chips], r) => {
        const y = 0.27 + r * 0.14, s = 0.6 + r * 0.5, hero = r === 0;
        return [
          shape('rect', { x: 0.44, y, w: 640, h: 150, radius: 24, fill: '@fg/0.05', stroke: '@fg/0.1', strokeW: 2, sfx: 'none', anim: A('wipeL', s, { dur: 0.6 }) }),
          shape('rect', { x: 0.86, y, w: 150, h: 150, radius: 24, fill: hero ? '@accent' : '@fg/0.12', glow: hero ? 0.5 : 0, sfx: 'none', anim: A('pop', s, { dur: 0.6 }) }),
          text(L, { x: 0.86, y, size: 84, font: '@display', weight: 800, w: 150, color: hero ? '@ink' : '@fg', anim: A('pop', s + 0.1, { dur: 0.6 }) }),
          ...chips.map((c, k) => text(c, { x: 0.65 - k * 0.205, y, size: 30, font: '@mono', weight: 600, w: 200, box: { fill: hero ? '@accent/0.18' : '@card', padX: 20, padY: 12, radius: 30 }, sfx: 'pop-soft', sfxPitch: 1 + k * 0.15, anim: A('drop', s + 0.3 + k * 0.15, { dur: 0.5 }) })),
        ];
      }),
      text('وإنت؟ شو بتحط بالـ *S*؟', { y: 0.84, size: 46, anim: A('pop', 3.0) }),
      sig(),
    ],
  }, { tags: 'tier list ranking tools ترتيب أدوات', transition: 'push-cards-up' }),

  tpl('dt-free-tools', 'أدوات مجانية', 'list', {
    duration: 7, bg: bgp('blueprint-draft'), camera: { type: 'craneUp', amount: 0.5 },
    elements: [
      tag('// احفظ البوست', { y: 0.075 }),
      text('5 أدوات *مجانية* بستعملها كل يوم', { y: 0.155, size: 62, anim: A('maskUp', 0.3, { split: 'line' }) }),
      ...[['workflow', 'n8n self-hosted', 'كل الـ workflows تبعي عليه'], ['database', 'Supabase', 'داتابيس ببلاش لحد 500MB'], ['cpu', 'Ollama', 'موديلات AI شغّالة على جهازي'], ['wand', 'Excalidraw', 'برسم فيه الفكرة قبل ما ابنيها'], ['calendar', 'Cal.com', 'حجز مواعيد بدل Calendly']].flatMap(([ic, n, d], i) => {
        const y = 0.29 + i * 0.115, s = 0.7 + i * 0.3;
        return [
          ...iconRow(y, s, ic, n, d),
          text('FREE', { x: 0.13, y, size: 22, font: '@mono', weight: 700, w: 120, color: '@accent', box: { fill: '@accent/0.12', padX: 14, padY: 8, radius: 8 }, sfx: 'click-soft', anim: A('pop', s + 0.4, { dur: 0.5 }) }),
        ];
      }),
      sig(),
    ],
  }, { tags: 'free tools resources list أدوات مجانية', transition: 'stack-left' }),

  tpl('dt-stopped-doing', 'بطّلت أعملها', 'list', {
    duration: 6.5, bg: bgp('notebook-ruled'), camera: { type: 'handLight', amount: 0.6 },
    elements: [
      text('شغلات *بطّلت* أعملها بإيدي', { y: 0.13, size: 72, anim: A('blurIn', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[['نسخ الطلبات لـ Excel', 'n8n', 420], ['الرد على نفس السؤال 50 مرة', 'bot', 560], ['تذكير العملاء بالدفع', 'cron', 430], ['كتابة التقرير الأسبوعي', 'Claude', 480]].flatMap(([t, by, lw], i) => {
        const y = 0.31 + i * 0.12, s = 0.7 + i * 0.55;
        return [
          text(t, { x: 0.56, y, size: 46, weight: 600, w: 720, color: '@fg/0.8', anim: A('riseSoft', s, { dur: 0.5 }) }),
          shape('line', { x: 0.56, y, w: lw, rot: 180, stroke: '@accent', strokeW: 7, sfx: 'pencil', anim: A('draw', s + 0.45, { dur: 0.45 }) }),
          text(by, { x: 0.12, y, size: 26, font: '@mono', weight: 700, w: 160, color: '@accent', box: { fill: '@accent/0.12', padX: 14, padY: 8, radius: 10 }, sfx: 'none', anim: A('pop', s + 0.8, { dur: 0.5 }) }),
        ];
      }),
      text('وقتي رجع للشغل *اللي بيفرق*', { y: 0.81, size: 52, anim: A('pop', 3.4) }),
      sig(),
    ],
  }, { tags: 'stopped doing strike list بطلت أعمل', transition: 'wipe-line-45' }),

  tpl('dt-lead-orbit', 'دورة الـ lead', 'list', {
    duration: 6.5, bg: bgp('rings-sonar'), camera: { type: 'orbitIn', amount: 0.3 },
    elements: [
      text('شو بيصير لما يوصل *lead* جديد', { y: 0.12, size: 64, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('ellipse', { y: 0.53, w: 580, h: 625, fill: 'none', stroke: '@fg/0.2', strokeW: 3, dash: [6, 12], sfx: 'none', anim: A('draw', 0.6, { dur: 1.2 }) }),
      shape('circle', { y: 0.53, w: 220, fill: '@accent', glow: 0.6, sfx: 'pop-low', anim: A('pop', 0.5, { dur: 0.7, loop: 'pulse', loopAmp: 0.4 }) }),
      el('icon', { y: 0.53, name: 'user', size: 90, color: '@ink', sfx: 'none', anim: A('elastic', 0.7, { dur: 0.8 }) }),
      ...['يتسجّل بالـ CRM', 'رسالة ترحيب فورية', 'تصنيف بالـ AI', 'تنبيه عالـ Slack', 'موعد متابعة'].map((t, k) => {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
        return chip(t, { x: 0.5 + Math.cos(a) * 0.29, y: 0.53 + Math.sin(a) * 0.25, sfx: 'blip', sfxPitch: 1 + k * 0.12, anim: A('zoomOut', 1.1 + k * 0.32, { dur: 0.6 }) });
      }),
      text('كل هاد بيصير *بـ 4 ثواني*', { y: 0.885, size: 48, anim: A('riseBlur', 2.9) }),
    ],
  }, { tags: 'lead orbit radial cycle دورة عميل', transition: 'shape-hexagon' }),

  tpl('dt-sticky-board', 'لوح ستيكي نوتس', 'list', {
    duration: 6, bg: bgp('graph-paper'), camera: { type: 'drift', amount: 0.6 },
    elements: [
      text('أفكار أتمتة *لهالأسبوع*', { y: 0.1, size: 72, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[[0.71, 0.32, 3, 'رد تلقائي عالواتساب'], [0.29, 0.31, -4, 'فواتير PDF لـ Google Sheets'], [0.72, 0.55, -3, 'تذكير قبل الموعد بساعة', true], [0.28, 0.54, 3, 'ملخص اجتماعات بالـ AI'], [0.7, 0.78, 4, 'باك أب يومي للداتا'], [0.3, 0.77, -2, 'بوست واحد ← 3 منصات']].flatMap(([x, y, r, t, hero], i) => {
        const s = 0.6 + i * 0.3;
        return [
          shape('rect', { x, y, w: 370, h: 230, radius: 10, rot: r, fill: hero ? '@accent' : '@raised', shadow: 0.6, sfx: 'paper', sfxPitch: 0.9 + i * 0.06, anim: A('drop', s, { dur: 0.6 }) }),
          text(t, { x, y: y + 0.008, size: 36, weight: 700, w: 300, rot: r, color: hero ? '@ink' : '@fg', anim: A('fade', s + 0.2) }),
          shape('circle', { x, y: y - 0.072, w: 26, fill: hero ? '@ink' : '@accent', sfx: 'none', anim: A('pop', s + 0.35, { dur: 0.4 }) }),
        ];
      }),
      sig(),
    ],
  }, { tags: 'sticky notes board ideas ستيكي أفكار', transition: 'close-star' }),

  tpl('dt-podium', 'منصة التتويج', 'list', {
    duration: 6.5, bg: bgp('spot-soft'), camera: { type: 'stepZoom', amount: 0.5 },
    sfx: { events: [{ id: 'dt-podium-riser', t: 1.6, kind: 'riser-short', vol: 0.6 }] },
    elements: [
      text('أكتر 3 workflows *رجّعولي* وقتي', { y: 0.12, size: 62, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('particles', { y: 0.4, kind: 'confetti', count: 70, w: 1000, h: 900, anim: A('fade', 2.6) }),
      shape('line', { y: 0.8, w: 900, stroke: '@fg/0.3', strokeW: 3, anim: A('growC', 0.3) }),
      ...[[0.23, 190, 0.6, 3, 'ملخص الإيميل', '5 ساعات بالأسبوع', 'mail'], [0.77, 280, 1.3, 2, 'متابعة الفواتير', '8 ساعات بالأسبوع', 'dollar'], [0.5, 400, 2.1, 1, 'رد الواتساب', '14 ساعة بالأسبوع', 'trophy']].flatMap(([x, h, s, rank, name, hours, icon]) => {
        const hero = rank === 1, hf = h / 1250, top = 0.8 - hf;
        return [
          shape('rect', { x, y: 0.8 - hf / 2, w: 260, h, radius: 18, fill: hero ? '@accent' : '@fg/0.1', stroke: hero ? undefined : '@fg/0.18', strokeW: 2, glow: hero ? 0.5 : 0, sfx: hero ? 'success' : 'thud', anim: A('growY', s, { dur: 0.8 }) }),
          text(String(rank), { x, y: top + (hero ? 0.075 : 0.06), size: hero ? 150 : 110, font: '@display', weight: 800, w: 240, color: hero ? '@ink' : '@fg/0.7', anim: A('pop', s + 0.4, { dur: 0.6 }) }),
          el('icon', { x, y: top - 0.15, name: icon, size: hero ? 64 : 48, color: hero ? '@accent' : '@muted', sfx: 'none', anim: A('pop', s + 0.5) }),
          text(name, { x, y: top - 0.085, size: hero ? 36 : 32, weight: 800, w: 260, anim: A('riseSoft', s + 0.55) }),
          text(hours, { x, y: top - 0.04, size: 26, weight: 600, w: 260, color: hero ? '@accent' : '@muted', anim: A('riseSoft', s + 0.65) }),
        ];
      }),
      text('وإنت؟ شو الـ workflow اللي *ما بتستغني* عنه؟', { y: 0.88, size: 38, w: 860, anim: A('fade', 3.0) }),
    ],
  }, { tags: 'podium top 3 ranking منصة ترتيب أفضل', transition: 'zoom-punch' }),

  // ================================================================== STATS
  tpl('dt-gauge', 'عداد الدقة', 'stats', {
    duration: 6, bg: bgp('radial-top'), camera: { type: 'pushSlow', amount: 0.6 },
    elements: [
      tag('// تقرير الأداء', { y: 0.07 }),
      text('دقة الوكيل *بأول شهر*', { y: 0.14, size: 68, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('arc', { y: 0.5, w: 700, a0: 180, a1: 360, stroke: '@fg/0.12', strokeW: 54, anim: A('fade', 0.4) }),
      shape('arc', { y: 0.5, w: 700, a0: 180, a1: 349.2, stroke: '@accent', strokeW: 54, glow: 0.5, sfx: 'riser-short', anim: A('draw', 0.8, { dur: 1.6 }) }),
      text('0%', { x: 0.177, y: 0.545, size: 26, font: '@mono', weight: 600, color: '@muted', w: 120, anim: A('fade', 0.6) }),
      text('100%', { x: 0.823, y: 0.545, size: 26, font: '@mono', weight: 600, color: '@muted', w: 120, anim: A('fade', 0.6) }),
      hand(0.5, 0.5, 280, 14, -10.8, '@fg', { sfx: 'whoosh-short', anim: A('swing', 0.8, { dur: 1.6, ease: 'backOut' }) }),
      shape('circle', { y: 0.5, w: 64, fill: '@fg', sfx: 'none', anim: A('pop', 0.6) }),
      shape('circle', { y: 0.5, w: 26, fill: '@accent', sfx: 'none', anim: A('pop', 0.7) }),
      el('counter', { y: 0.645, to: 94, suffix: '%', size: 160, font: '@display', weight: 800, color: '@accent', countDur: 1.6, anim: A('fade', 0.8, { dur: 0.4 }) }),
      text('من الأسئلة انحلّت *بدون* ما أتدخل', { y: 0.75, size: 40, anim: A('riseSoft', 2.2) }),
      text('1,284 سؤال  ·  76 بس حوّلهم لإلي', { y: 0.83, size: 30, weight: 600, color: '@muted', anim: A('fade', 2.6) }),
      sig(),
    ],
  }, { tags: 'gauge meter accuracy percent عداد دقة نسبة', transition: 'zoom-blur' }),

  tpl('dt-battery', 'بطارية الفريق', 'stats', {
    duration: 5.5, bg: bgp('hex-small'), camera: { type: 'breath', amount: 0.6 },
    elements: [
      text('من يوم ما *أتمتنا* التقارير', { y: 0.12, size: 66, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      text('طاقة الفريق آخر الأسبوع', { y: 0.195, size: 38, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('rect', { x: 0.48, y: 0.46, w: 700, h: 340, radius: 46, fill: 'none', stroke: '@fg', strokeW: 12, sfx: 'click', anim: A('zoomOut', 0.4, { dur: 0.7 }) }),
      shape('rect', { x: 0.865, y: 0.46, w: 36, h: 130, radius: 10, fill: '@fg', sfx: 'none', anim: A('fade', 0.6) }),
      ...[0, 1, 2, 3, 4].map((i) => shape('rect', { x: 0.214 + i * 0.133, y: 0.46, w: 112, h: 284, radius: 18, fill: i < 4 ? '@accent' : '@accent/0.35', sfx: 'blip', sfxPitch: 1 + i * 0.15, anim: A('growY', 0.9 + i * 0.3, { dur: 0.5, loop: i === 4 ? 'blink' : 'none' }) })),
      el('icon', { x: 0.48, y: 0.46, name: 'bolt', size: 130, color: '@ink', filled: true, sfx: 'power-up', anim: A('elastic', 2.5, { dur: 0.8 }) }),
      el('counter', { y: 0.7, to: 86, suffix: '%', size: 150, font: '@display', weight: 800, color: '@accent', countDur: 1.5, anim: A('fade', 0.9, { dur: 0.4 }) }),
      text('كانت *31%* قبل 3 شهور', { y: 0.81, size: 42, anim: A('riseSoft', 2.6) }),
      sig(),
    ],
  }, { tags: 'battery energy charge percent بطارية طاقة', transition: 'cube-up' }),

  tpl('dt-split-flap', 'لوحة المطار', 'stats', {
    duration: 6, bg: bgp('solid-bg2'), camera: { type: 'dollyIn', amount: 0.5 }, fx: { vignette: 0.3 },
    elements: [
      tag('// اليوم لحد الساعة 4', { y: 0.11 }),
      text('طلبات دخلت *لحالها*', { y: 0.2, size: 76, anim: A('maskUp', 0.3, { split: 'word', stagger: 0.08 }) }),
      ...[['1', 0.174], ['2', 0.418], ['4', 0.622], ['8', 0.826]].flatMap(([d, x], i) => [
        shape('rect', { x, y: 0.46, w: 180, h: 260, radius: 18, fill: '@card', shadow: 0.6, sfx: 'none', anim: A('flipX', 0.6 + i * 0.15, { dur: 0.6 }) }),
        text(d, { x, y: 0.462, size: 200, font: '@mono', weight: 700, w: 180, sfx: i ? 'none' : 'auto', anim: A('scramble', 0.8 + i * 0.2, { dur: 0.9 }) }),
        shape('line', { x, y: 0.46, w: 180, stroke: '@bg', strokeW: 5, sfx: 'none', anim: A('fade', 0.6 + i * 0.15) }),
      ]),
      text(',', { x: 0.296, y: 0.53, size: 130, font: '@mono', weight: 700, w: 60, anim: A('fade', 1.0) }),
      ...[['مواعيد *37*', 0.8], ['فواتير *112*', 0.5], ['أخطاء *0*', 0.2]].map(([t, x], k) => text(t, { x, y: 0.67, size: 36, weight: 700, w: 280, box: { fill: '@card', padX: 26, padY: 16, radius: 18 }, sfx: 'click-soft', anim: A('rise', 2.0 + k * 0.2) })),
      status('آخر تحديث 16:04', { x: 0.5, y: 0.79, anim: A('fade', 2.8) }),
      sig(),
    ],
  }, { tags: 'split flap board airport counter لوحة رقم', transition: 'dip-accent' }),

  tpl('dt-uptime', 'مراقبة السيرفر', 'stats', {
    duration: 6, bg: bgp('matrix-fine'), camera: { type: 'jitter', amount: 0.3 }, fx: { scanlines: 0.15 },
    sfx: { events: [{ id: 'dt-uptime-beep', t: 0.15, kind: 'beep', vol: 0.5 }, { id: 'dt-uptime-beat', t: 2.4, kind: 'heartbeat', vol: 0.6 }] },
    elements: [
      status('all systems operational', { x: 0.5, y: 0.075 }),
      text('الـ workflows ما وقفت *ولا مرة*', { y: 0.155, size: 62, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('counter', { y: 0.32, from: 90, to: 99.98, decimals: 2, suffix: '%', size: 170, font: '@mono', weight: 700, color: '@accent', glow: 0.4, countDur: 1.6, anim: A('fade', 0.6, { dur: 0.4 }) }),
      text('uptime آخر 90 يوم', { y: 0.415, size: 32, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 0.9) }),
      el('bars', { y: 0.53, w: 880, h: 110, values: UPTIME.map(() => 1), colors: UPTIME, showValues: false, gap: 0.35, radius: 4, hi: -1, sfx: 'scan', anim: A('fade', 1.2, { stagger: 0.012 }) }),
      text('قبل 90 يوم', { x: 0.16, y: 0.59, size: 24, weight: 600, color: '@muted', w: 260, anim: A('fade', 1.4) }),
      text('اليوم', { x: 0.89, y: 0.59, size: 24, weight: 600, color: '@muted', w: 160, anim: A('fade', 2.2) }),
      el('linechart', { y: 0.72, w: 880, h: 150, values: [1.9, 1.6, 1.7, 1.4, 1.3, 1.5, 1.2, 1.1, 1.2, 1.0], min: 0, grid: false, dots: false, strokeW: 4, anim: A('fade', 1.8, { dur: 0.8 }) }),
      text('متوسط التنفيذ نزل لـ *1.0s*', { y: 0.85, size: 42, anim: A('riseSoft', 2.6) }),
    ],
  }, { tags: 'uptime status monitor server مراقبة سيرفر', transition: 'glitch-scan' }),

  tpl('dt-coin-stack', 'كومة التوفير', 'stats', {
    duration: 6, bg: bgp('fireflies-gold'), camera: { type: 'rise', amount: 0.5 },
    elements: [
      text('شو بيوفّر workflow واحد *بسنة*', { y: 0.1, size: 62, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.07 }) }),
      text('20 ساعة بالشهر × $20 للساعة', { y: 0.17, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      ...[[0.76, 4, 0.6, 400, 'أول شهر'], [0.5, 7, 1.1, 2400, '6 شهور'], [0.24, 10, 1.7, 4800, 'سنة كاملة']].flatMap(([x, n, s, v, lab], k) => {
        const top = 0.72 - (n - 1) * 0.026, hero = k === 2;
        return [
          ...Array.from({ length: n }, (_, c) => shape('ellipse', { x, y: 0.72 - c * 0.026, w: 220, h: 70, fill: '@accent', stroke: '@bg/0.55', strokeW: 4, sfx: c === n - 1 ? 'cash' : 'tick-soft', sfxVol: c === n - 1 ? 0.9 : 0.35, anim: A('drop', s + c * 0.08, { dur: 0.45 }) })),
          el('icon', { x, y: top, name: 'dollar', size: 30, color: '@ink', strokeW: 2.4, sfx: 'none', anim: A('pop', s + n * 0.08 + 0.1, { dur: 0.4 }) }),
          el('counter', { x, y: top - 0.075, to: v, prefix: '$', size: hero ? 76 : 58, font: '@display', weight: 800, color: hero ? '@accent' : '@fg', countDur: 1.0, sfx: 'none', anim: A('fade', s + 0.2, { dur: 0.4 }) }),
          text(lab, { x, y: 0.79, size: 32, weight: 700, w: 260, color: hero ? '@fg' : '@muted', anim: A('fade', s) }),
        ];
      }),
      text('وهاد workflow *واحد* بس', { y: 0.87, size: 46, anim: A('pop', 3.0) }),
    ],
  }, { tags: 'coins money savings stack فلوس توفير', transition: 'circle-bottom' }),

  tpl('dt-morning-digest', 'تقرير الصبح', 'stats', {
    duration: 6.5, bg: bgp('aurora-slow'), camera: { type: 'pushSmooth', amount: 0.5 },
    elements: [
      text('7:30', { y: 0.16, size: 190, font: '@display', weight: 700, anim: A('blurIn', 0.2) }),
      text('الأحد · 26 أكتوبر', { y: 0.265, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      el('notify', { y: 0.4, w: 860, app: 'n8n', icon: 'message', time: 'الآن', title: 'ردّيت على 86 رسالة', body: 'وحوّلت 4 لإلك لأنها بدها قرار', sfx: 'notify-soft', anim: A('drop', 0.9, { dur: 0.6 }) }),
      el('notify', { y: 0.565, w: 860, app: 'Calendar', icon: 'calendar', time: '2د', title: 'انحجز 7 مواعيد جديدة', body: 'أول واحد الساعة 10:00 مع شركة من جدة', sfx: 'notify-soft', sfxPitch: 1.1, anim: A('drop', 1.5, { dur: 0.6 }) }),
      el('notify', { y: 0.73, w: 860, app: 'Stripe', icon: 'dollar', time: '5د', title: 'وصلت 3 دفعات: $1,240', body: 'والفواتير انبعتت تلقائياً', sfx: 'cash', anim: A('drop', 2.1, { dur: 0.6 }) }),
      text('بلّشت يومي *بدون* ما أفتح اللابتوب', { y: 0.875, size: 40, anim: A('riseSoft', 2.8) }),
    ],
  }, { tags: 'morning digest notifications report تقرير صباح اشعارات', transition: 'cardfly-up' }),

  tpl('dt-stock-ticker', 'شريط الأرقام', 'stats', {
    duration: 5.5, bg: bgp('streaks-side'), camera: { type: 'panR', amount: 0.4 },
    elements: [
      shape('rect', { y: 0.12, w: 1100, h: 90, fill: '@fg/0.06', anim: A('fade', 0) }),
      el('ticker', { y: 0.12, text: 'CLIENTS +38%  ·  ORDERS +210%  ·  DELIVERY TIME -45%  ·  ERRORS -90%', sep: '  ·  ', size: 40, weight: 700, font: '@mono', speed: 90, w: 1100, anim: A('fade', 0.2) }),
      text('طلبات الأتمتة اللي وصلتني', { y: 0.33, size: 50, anim: A('riseBlur', 0.4, { split: 'word', stagger: 0.07 }) }),
      el('counter', { y: 0.47, to: 210, prefix: '+', suffix: '%', size: 230, font: '@display', weight: 800, color: '@accent', glow: 0.4, countDur: 1.8, anim: A('fade', 0.8, { dur: 0.4 }) }),
      text('هالسنة، مقارنة بـ 2025', { y: 0.6, size: 40, weight: 600, color: '@muted', anim: A('fade', 1.6) }),
      el('icon', { y: 0.7, name: 'trendUp', size: 64, color: '@accent', bg: '@accent/0.14', sfx: 'sparkle', anim: A('pop', 2.4, { dur: 0.6, loop: 'float', loopAmp: 0.5 }) }),
      shape('rect', { y: 0.86, w: 1100, h: 90, fill: '@accent/0.1', anim: A('fade', 0) }),
      el('ticker', { y: 0.86, text: 'n8n  ·  Claude  ·  Supabase  ·  WhatsApp API  ·  MCP', sep: '  ·  ', size: 40, weight: 700, font: '@mono', speed: 70, w: 1100, color: '@accent', outline: true, anim: A('fade', 0.4) }),
    ],
  }, { tags: 'ticker stock growth percent شريط نمو', transition: 'pixel-mosaic' }),

  // ================================================================== CHART
  tpl('dt-heatmap', 'خريطة الضغط', 'chart', {
    duration: 6.5, bg: bgp('radial-faint'), camera: { type: 'kbTR', amount: 0.5 },
    sfx: { events: [{ id: 'dt-heat-in', t: 0.6, kind: 'whoosh-soft', vol: 0.6 }, { id: 'dt-heat-hi', t: 1.7, kind: 'sparkle-chime', vol: 0.5 }] },
    elements: [
      text('وقت *الضغط* على الواتساب', { y: 0.1, size: 66, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      text('رسائل العملاء حسب اليوم والساعة', { y: 0.17, size: 32, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      ...HEAT.flatMap((row, r) => [
        text(DAYS[r], { x: 0.885, y: 0.27 + r * 0.072, size: 26, weight: 600, w: 150, color: '@muted', anim: A('fade', 0.5 + r * 0.05) }),
        ...row.map((v, c) => shape('rect', { x: 0.745 - c * 0.115, y: 0.27 + r * 0.072, w: 100, h: 76, radius: 12, fill: '@accent/' + (0.08 + v * 0.92).toFixed(2), sfx: 'none', anim: A('pop', 0.6 + (r + c) * 0.07, { dur: 0.45 }) })),
      ]),
      ...SLOTS.map((s, c) => text(s, { x: 0.745 - c * 0.115, y: 0.77, size: 24, weight: 600, w: 110, color: '@muted', anim: A('fade', 1.0) })),
      shape('rect', { x: 0.63, y: 0.342, w: 114, h: 90, radius: 16, fill: 'none', stroke: '@fg', strokeW: 4, sfx: 'none', anim: A('pop', 1.7, { dur: 0.5, loop: 'pulse', loopAmp: 0.5 }) }),
      text('أقل', { x: 0.34, y: 0.82, size: 24, weight: 600, w: 100, color: '@muted', anim: A('fade', 1.4) }),
      shape('rect', { x: 0.5, y: 0.82, w: 220, h: 18, radius: 9, fill: { g: 'linear', angle: 90, colors: ['@accent/0.08', '@accent'] }, sfx: 'none', anim: A('growC', 1.4) }),
      text('أكتر', { x: 0.66, y: 0.82, size: 24, weight: 600, w: 100, color: '@muted', anim: A('fade', 1.4) }),
      text('الأحد 10 الصبح: *142 رسالة* بساعة', { y: 0.885, size: 38, anim: A('riseSoft', 2.2) }),
    ],
  }, { tags: 'heatmap grid week hours خريطة حرارية ضغط', transition: 'blinds-v-8' }),

  tpl('dt-waterfall', 'شلال الساعات', 'chart', {
    duration: 7, bg: bgp('grid-classic'), camera: { type: 'pullReveal', amount: 0.5 },
    elements: [
      text('أسبوع الشغل نزل من *40* لـ *12* ساعة', { y: 0.1, size: 60, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('line', { y: 0.75, w: 860, stroke: '@fg/0.25', strokeW: 3, anim: A('growC', 0.4) }),
      ...[[0.74, 0.35], [0.58, 0.47], [0.42, 0.56], [0.26, 0.63]].map(([x, y], i) => shape('line', { x, y, w: 160, stroke: '@fg/0.35', strokeW: 2, dash: [6, 8], sfx: 'none', anim: A('wipeL', 1.0 + i * 0.45, { dur: 0.4 }) })),
      ...[
        [0.82, 0.55, 500, '@fg/0.28', 'growY', '40', 0.325, 'قبل'],
        [0.66, 0.41, 150, '@accent/0.45', 'wipeDown', '-12', 0.495, 'إيميلات'],
        [0.5, 0.515, 112.5, '@accent/0.45', 'wipeDown', '-9', 0.585, 'تقارير'],
        [0.34, 0.595, 87.5, '@accent/0.45', 'wipeDown', '-7', 0.655, 'إدخال بيانات'],
        [0.18, 0.69, 150, '@accent', 'growY', '12', 0.6, 'بعد'],
      ].flatMap(([x, y, h, fill, inn, val, vy, lab], i) => {
        const s = 0.6 + i * 0.45, last = i === 4;
        return [
          shape('rect', { x, y, w: 120, h, radius: 12, fill, glow: last ? 0.5 : 0, sfx: last ? 'success' : i ? 'pop-low' : 'thud', sfxPitch: 1 - i * 0.06, anim: A(inn, s, { dur: 0.6 }) }),
          text(val, { x, y: vy, size: last ? 40 : 34, font: '@mono', weight: 700, w: 140, color: last || i ? '@accent' : '@fg', anim: A('fade', s + 0.3) }),
          text(lab, { x, y: 0.79, size: 28, weight: 600, w: 160, color: last ? '@fg' : '@muted', anim: A('fade', s) }),
        ];
      }),
      text('*28 ساعة* رجعولي كل أسبوع', { y: 0.875, size: 48, anim: A('pop', 3.2) }),
    ],
  }, { tags: 'waterfall chart hours breakdown شلال ساعات', transition: 'slices-bounce' }),

  tpl('dt-bubbles', 'فقاعات الوقت', 'chart', {
    duration: 6, bg: bgp('bokeh-few'), camera: { type: 'float', amount: 0.6 },
    elements: [
      text('وين بيروح *وقت* الفريق؟', { y: 0.1, size: 70, anim: A('blurIn', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('ساعات بالأسبوع لكل موظف', { y: 0.17, size: 32, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      ...[
        [0.36, 0.42, 380, 'إيميلات', '14 ساعة', 52, 34],
        [0.71, 0.35, 300, 'اجتماعات', '9 ساعات', 40, 28],
        [0.7, 0.6, 240, 'تقارير', '6 ساعات', 34, 24],
        [0.3, 0.72, 220, 'إدخال بيانات', '5 ساعات', 28, 22],
        [0.53, 0.77, 170, 'متابعة', '3 ساعات', 26, 20],
      ].flatMap(([x, y, w, name, hours, ns, hs], i) => {
        const s = 0.6 + i * 0.32, hero = i === 0;
        return [
          shape('circle', { x, y, w, fill: hero ? '@accent' : '@fg/0.12', glow: hero ? 0.4 : 0, stroke: hero ? undefined : '@fg/0.2', strokeW: 2, sfx: 'bubble', sfxPitch: 0.8 + i * 0.15, anim: A('elastic', s, { dur: 0.9 }) }),
          text(name, { x, y: y - (hero ? 0.024 : 0.016), size: ns, weight: 800, w: w - 30, color: hero ? '@ink' : '@fg', anim: A('fade', s + 0.3) }),
          text(hours, { x, y: y + (hero ? 0.034 : 0.024), size: hs, weight: 600, w: w - 30, color: hero ? '@ink' : '@muted', anim: A('fade', s + 0.4) }),
        ];
      }),
      text('الإيميلات أول شي *أتمتناه*', { y: 0.9, size: 42, anim: A('riseSoft', 2.7) }),
    ],
  }, { tags: 'bubble chart time split فقاعات وقت', transition: 'bubbles-small' }),

  tpl('dt-small-multiples', 'أربع مؤشرات', 'chart', {
    duration: 6.5, bg: bgp('mesh-orbit'), camera: { type: 'dollyLeft', amount: 0.3 },
    elements: [
      tag('// الأسبوع 43', { y: 0.075 }),
      text('أسبوع واحد، *4 أرقام*', { y: 0.145, size: 72, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[
        [0.72, 0.38, 'رسائل انحلّت', { to: 1284 }, 190, '+18%', [40, 52, 48, 61, 70, 66, 82]],
        [0.28, 0.38, 'متوسط وقت الرد', { from: 3.2, to: 0.8, decimals: 1, suffix: 's' }, 152, '-75%', [3.2, 2.9, 2.1, 1.6, 1.2, 1.0, 0.8]],
        [0.72, 0.7, 'مواعيد محجوزة', { to: 37 }, 77, '+9', [3, 4, 6, 5, 7, 6, 6]],
        [0.28, 0.7, 'تحويل لإلي', { to: 76 }, 77, '-90%', [20, 16, 14, 12, 8, 4, 2]],
      ].flatMap(([cx, cy, lab, cnt, vw, delta, vals], i) => {
        const s = 0.5 + i * 0.25;
        return [
          shape('rect', { x: cx, y: cy, w: 410, h: 340, radius: 30, glass: true, shadow: 0.5, sfx: 'swish', sfxVol: 0.6, anim: A('tilt', s, { dur: 0.7 }) }),
          text(lab, { x: cx, y: cy - 0.1, size: 30, weight: 600, w: 360, color: '@muted', align: 'start', anim: A('fade', s + 0.2) }),
          el('counter', { x: cx + 0.18 - vw / 2000, y: cy - 0.045, size: 64, font: '@mono', weight: 700, color: '@fg', countDur: 1.2, ...cnt, anim: A('fade', s + 0.2, { dur: 0.4 }) }),
          text(delta, { x: cx - 0.12, y: cy - 0.045, size: 24, font: '@mono', weight: 700, w: 140, color: '@accent', box: { fill: '@accent/0.14', padX: 14, padY: 8, radius: 10 }, anim: A('pop', s + 0.6, { dur: 0.5 }) }),
          el('linechart', { x: cx, y: cy + 0.065, w: 340, h: 110, values: vals, grid: false, dots: false, strokeW: 5, glow: 0.3, anim: A('fade', s + 0.3, { dur: 0.7 }) }),
        ];
      }),
      sig(),
    ],
  }, { tags: 'small multiples sparklines kpi مؤشرات مخططات', transition: 'carousel-left' }),

  tpl('dt-goal-bars', 'أهداف الربع', 'chart', {
    duration: 6, bg: bgp('mesh-sparse'), camera: { type: 'tiltUp', amount: 0.4 },
    elements: [
      tag('// Q4 2026 · مرّ 66% من الربع', { y: 0.07, w: 700 }),
      text('وين وصلت *بأهداف* الربع؟', { y: 0.15, size: 68, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[['10 عملاء جدد', 0.8], ['50 workflow شغّال', 0.92], ['كورس n8n بالعربي', 0.45], ['2,000 متابع جديد', 0.68]].map(([lab, v], i) => el('progress', { y: 0.32 + i * 0.13, w: 840, h: 30, value: v, label: lab, labelSize: 34, sfx: 'swish', sfxPitch: 0.9 + i * 0.1, anim: A('fade', 0.8 + i * 0.3, { dur: 1.4 }) })),
      text('الكورس متأخر. *هاد شغلي* بنوفمبر', { y: 0.86, size: 42, anim: A('pop', 2.8) }),
    ],
  }, { tags: 'goals progress quarter okr أهداف تقدم', transition: 'blur-quick' }),

  tpl('dt-paired-bars', 'قبل وبعد لكل مهمة', 'chart', {
    duration: 6.5, bg: bgp('dotfield-wave'), camera: { type: 'stepZoom2', amount: 0.4 },
    elements: [
      text('كم دقيقة بتاخد كل مهمة؟', { y: 0.1, size: 64, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.07 }) }),
      text('قبل', { x: 0.58, y: 0.19, size: 28, weight: 700, w: 120, box: { fill: '@fg/0.25', padX: 22, padY: 8, radius: 12 }, anim: A('pop', 0.5) }),
      text('بعد', { x: 0.42, y: 0.19, size: 28, weight: 700, w: 120, color: '@ink', box: { fill: '@accent', padX: 22, padY: 8, radius: 12 }, anim: A('pop', 0.6) }),
      el('bars', { y: 0.47, w: 880, h: 520, values: [3, 25, 8, 60, 2, 30, 5, 45], colors: ['@accent', '@fg/0.25'], hi: -1, suffix: 'د', labelSize: 28, gap: 0.2, radius: 10, sfx: 'blip', anim: A('fade', 0.8, { stagger: 0.12 }) }),
      ...['متابعة', 'تقرير', 'فاتورة', 'إيميل'].map((t, k) => text(t, { x: 0.17 + k * 0.22, y: 0.71, size: 30, weight: 700, w: 200, anim: A('fade', 1.0 + (3 - k) * 0.15) })),
      text('*160 دقيقة* صاروا *18*', { y: 0.81, size: 60, anim: A('pop', 2.4) }),
      text('بكل دورة شغل', { y: 0.875, size: 32, weight: 600, color: '@muted', anim: A('fade', 2.7) }),
    ],
  }, { tags: 'grouped bars before after minutes أعمدة قبل بعد', transition: 'swirl' }),

  tpl('dt-pictogram', 'رسم بالأيقونات', 'chart', {
    duration: 6, bg: bgp('radial-center'), camera: { type: 'kbBL', amount: 0.5 },
    elements: [
      text('من كل *10 عملاء*', { y: 0.12, size: 76, anim: A('slam', 0.2, { dur: 0.6 }) }),
      ...[['user', 7, '*7* رجعوا يطلبوا مرة تانية'], ['message', 9, '*9* بيفضّلوا الرد عالواتساب'], ['users', 4, '*4* جابولي عميل جديد']].flatMap(([ic, n, lab], i) => {
        const y = 0.29 + i * 0.21, s = 0.6 + i * 0.9;
        return [
          el('icon', { y, name: ic, size: 60, gap: 20, repeat: 10, filledN: n, color: '@accent', sfx: 'bubble-double', sfxPitch: 1 + i * 0.1, anim: A('pop', s, { stagger: 0.07, dur: 0.5 }) }),
          text(lab, { y: y + 0.08, size: 40, weight: 700, anim: A('riseSoft', s + 0.6) }),
        ];
      }),
      text('من بيانات 140 عميل هالسنة', { y: 0.86, size: 28, weight: 500, color: '@muted', anim: A('fade', 3.2) }),
      sig(),
    ],
  }, { tags: 'pictogram icons ratio 10 أيقونات نسبة', transition: 'tiles-flip-diag' }),

  tpl('dt-scatter', 'نقاط واتجاه', 'chart', {
    duration: 6.5, bg: bgp('terrain-calm'), camera: { type: 'panUR', amount: 0.4 },
    elements: [
      text('كل ما زادت الأتمتة *قلّت* الأخطاء', { y: 0.1, size: 60, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      vline(0.14, 0.49, 560, { stroke: '@fg/0.35', anim: A('draw', 0.4) }),
      shape('line', { x: 0.52, y: 0.714, w: 760, stroke: '@fg/0.35', strokeW: 3, anim: A('draw', 0.4) }),
      text('عدد الـ workflows', { x: 0.52, y: 0.75, size: 26, weight: 600, color: '@muted', w: 400, anim: A('fade', 0.6) }),
      text('أخطاء بالشهر', { x: 0.09, y: 0.49, size: 26, weight: 600, color: '@muted', w: 300, rot: -90, anim: A('fade', 0.6) }),
      ...ERRS.map((_, i) => { const [x, y] = errPt(i); return shape('circle', { x, y, w: i === 13 ? 34 : 24, fill: '@accent', glow: i === 13 ? 0.8 : 0.2, sfx: i % 3 ? 'none' : 'tick-soft', anim: A('pop', 0.7 + i * 0.07, { dur: 0.4 }) }); }),
      segment(0.18, 0.31, 0.86, 0.66, { stroke: '@fg/0.7', strokeW: 5, dash: [14, 10], sfx: 'swish', anim: A('draw', 1.9, { dur: 1.0 }) }),
      shape('ring', { x: errPt(13)[0], y: errPt(13)[1], w: 74, stroke: '@accent', strokeW: 4, sfx: 'none', anim: A('pop', 2.6, { dur: 0.5, loop: 'pulse' }) }),
      text('اليوم: 2 أخطاء', { x: 0.85, y: 0.57, size: 28, weight: 800, w: 220, anim: A('fade', 2.7) }),
      text('r = -0.96', { x: 0.76, y: 0.32, size: 28, font: '@mono', weight: 700, w: 240, color: '@accent', box: { fill: '@accent/0.12', padX: 16, padY: 8, radius: 10 }, anim: A('pop', 2.9) }),
      text('من *47* خطأ بالشهر لـ *2*', { y: 0.86, size: 50, anim: A('pop', 3.2) }),
    ],
  }, { tags: 'scatter plot trend correlation نقاط اتجاه', transition: 'ripple-fine' }),

  // ================================================================== TIME
  tpl('dt-night-clock', 'الوكيل بالليل', 'time', {
    duration: 6, bg: bgp('stars-calm'), camera: { type: 'craneDown', amount: 0.5 },
    sfx: { events: [{ id: 'dt-clock-bell', t: 0.3, kind: 'bell', vol: 0.4 }] },
    elements: [
      text('الساعة *3 الصبح*', { y: 0.09, size: 76, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('وأنا نايم، الوكيل كان عم يشتغل', { y: 0.165, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('circle', { y: 0.43, w: 460, fill: '@card', shadow: 0.6, sfx: 'none', anim: A('zoomOut', 0.3, { dur: 0.8 }) }),
      shape('ring', { y: 0.43, w: 460, stroke: '@fg/0.3', strokeW: 8, sfx: 'none', anim: A('draw', 0.4, { dur: 1.0 }) }),
      shape('ring', { y: 0.43, w: 420, stroke: '@fg/0.6', strokeW: 16, dash: [4, 101.77], sfx: 'none', anim: A('fade', 0.8) }),
      hand(0.5, 0.43, 110, 18, 0, '@fg', { sfx: 'tick-clock', anim: A('spin', 0.9, { dur: 0.9 }) }),
      hand(0.5, 0.43, 165, 10, -90, '@accent', { sfx: 'none', anim: A('spin', 1.0, { dur: 0.9, loop: 'spin', loopAmp: 0.6 }) }),
      shape('circle', { y: 0.43, w: 34, fill: '@accent', sfx: 'none', anim: A('pop', 1.1) }),
      el('icon', { x: 0.77, y: 0.27, name: 'moon', size: 56, color: '@accent', filled: true, sfx: 'none', anim: A('pop', 1.2, { loop: 'float', loopAmp: 0.6 }) }),
      el('list', { y: 0.765, w: 840, size: 34, gap: 22, icon: 'check', items: ['03:02  ردّ على 3 عملاء من الرياض', '03:15  بعت فاتورتين وانقبضوا', '03:40  باك أب للداتابيس'], anim: A('riseSoft', 1.6, { stagger: 0.4, dur: 0.6 }) }),
      sig(),
    ],
  }, { tags: 'clock night agent 3am ساعة ليل وكيل', transition: 'clock-cw' }),

  tpl('dt-year-ruler', 'سنتي بسطر', 'time', {
    duration: 7, bg: bgp('stripes-fine'), camera: { type: 'slideL', amount: 0.3 },
    elements: [
      text('2026 بسطر واحد', { y: 0.12, size: 84, font: '@display', anim: A('track', 0.2) }),
      text('السنة اللي كل شي فيها صار *أوتوماتيك*', { y: 0.195, size: 34, weight: 600, anim: A('fade', 0.5) }),
      shape('line', { y: 0.5, w: 720, stroke: '@fg/0.2', strokeW: 6, anim: A('growC', 0.3) }),
      shape('line', { y: 0.5, w: 680, rot: 180, stroke: '@accent', strokeW: 6, sfx: 'none', anim: A('draw', 0.6, { dur: 3.0, ease: 'linear' }) }),
      shape('dots', { y: 0.5, w: 680, h: 1, cols: 12, rows: 1, dot: 6, fill: '@fg/0.45', anim: A('fade', 0.4) }),
      ...[[1, 'يناير', 'أول عميل من السعودية', 1], [3, 'مارس', 'أول وكيل AI بالإنتاج', -1], [6, 'يونيو', '1,000 متابع عالمحتوى العربي', 1], [9, 'سبتمبر', 'صرنا فريق من 3', -1], [12, 'ديسمبر', '50 workflow شغّال', 1]].flatMap(([m, mon, ev, up], i) => {
        const x = monthX(m), t = 0.6 + (3.0 * (m - 1)) / 11, hero = m === 12;
        return [
          vline(x, 0.5 - up * 0.045, 80, { stroke: '@fg/0.35', sfx: 'none', anim: A('draw', t, { dur: 0.3 }) }),
          shape('circle', { x, y: 0.5, w: hero ? 44 : 30, fill: '@accent', glow: hero ? 0.8 : 0.3, sfx: hero ? 'success' : 'blip', sfxPitch: 1 + i * 0.1, anim: A('pop', t, { dur: 0.5 }) }),
          text(mon, { x, y: up > 0 ? 0.398 : 0.602, size: 26, weight: 700, w: 220, color: '@accent', anim: A('fade', t + 0.1) }),
          text(ev, { x, y: up > 0 ? 0.34 : 0.66, size: 30, weight: 700, w: 230, anim: A('riseSoft', t + 0.15, { dur: 0.6 }) }),
        ];
      }),
      text('و2027؟ *أكبر*', { y: 0.82, size: 60, anim: A('pop', 4.0) }),
      sig(),
    ],
  }, { tags: 'year review timeline months سنة مراجعة', transition: 'dust-right' }),

  tpl('dt-hourglass', 'ساعة رملية', 'time', {
    duration: 6, bg: bgp('dunes-desert'), camera: { type: 'hover', amount: 0.6 },
    sfx: { events: [0.3, 1.3, 2.3, 3.3].map((t, i) => ({ id: 'dt-hg-tick' + i, t, kind: 'tick-clock', vol: 0.45 })) },
    elements: [
      text('كل يوم بتخسر *ساعتين*', { y: 0.1, size: 70, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('على شغلات بيعملها workflow واحد', { y: 0.17, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('triangle', { y: 0.372, w: 330, h: 270, rot: 180, fill: '@fg/0.06', stroke: '@fg/0.6', strokeW: 5, sfx: 'none', anim: A('fade', 0.4) }),
      shape('triangle', { y: 0.588, w: 330, h: 270, fill: '@fg/0.06', stroke: '@fg/0.6', strokeW: 5, sfx: 'none', anim: A('fade', 0.4) }),
      shape('triangle', { y: 0.412, w: 210, h: 170, rot: 180, fill: '@accent', sfx: 'none', anim: A('fade', 0.7) }),
      shape('line', { y: 0.57, w: 190, rot: 90, stroke: '@accent', strokeW: 6, dash: [10, 8], dashSpeed: 80, sfx: 'whoosh-air', sfxVol: 0.5, anim: A('fade', 0.9) }),
      shape('triangle', { y: 0.656, w: 250, h: 100, fill: '@accent', sfx: 'none', anim: A('growY', 0.9, { dur: 2.0 }) }),
      shape('rect', { y: 0.262, w: 400, h: 26, radius: 13, fill: '@fg', sfx: 'none', anim: A('growC', 0.3) }),
      shape('rect', { y: 0.706, w: 400, h: 26, radius: 13, fill: '@fg', sfx: 'none', anim: A('growC', 0.3) }),
      shape('rect', { y: 0.825, w: 780, h: 200, radius: 30, fill: '@bg/0.82', shadow: 0.4, sfx: 'none', anim: A('rise', 1.5, { dur: 0.6 }) }),
      el('counter', { y: 0.79, to: 730, suffix: 'ساعة', size: 90, font: '@display', weight: 800, color: '@accent', countDur: 1.6, anim: A('fade', 1.6, { dur: 0.4 }) }),
      text('بالسنة. يعني *91 يوم* شغل كامل', { y: 0.87, size: 40, anim: A('riseSoft', 2.6) }),
    ],
  }, { tags: 'hourglass time wasted sand ساعة رملية وقت ضايع', transition: 'iris-round-open' }),

  tpl('dt-changelog', 'سجل الإصدارات', 'time', {
    duration: 7, bg: bgp('binary-hex'), camera: { type: 'kbTLOut', amount: 0.5 },
    elements: [
      text('Changelog', { y: 0.1, size: 84, font: '@mono', weight: 700, anim: A('scramble', 0.2, { dur: 0.8 }) }),
      text('بوت الواتساب تبعي من يوم ما بلّش', { y: 0.17, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.6) }),
      vline(0.84, 0.5, 560, { stroke: '@fg/0.15', strokeW: 4, anim: A('draw', 0.5, { dur: 1.0 }) }),
      ...[['v2.4', 'أكتوبر', 'بيحجز مواعيد وبيقبض عربون', 'Stripe + Cal.com'], ['v2.0', 'يونيو', 'صار يفهم الرسائل الصوتية', 'Whisper بيحوّل الفويس لنص'], ['v1.3', 'مارس', 'بيحكي سعودي ومصري وشامي', 'برومبت لكل لهجة'], ['v1.0', 'يناير', 'بيرد على 5 أسئلة ثابتة', 'if / else وبس']].flatMap(([v, mon, t, d], i) => {
        const y = 0.3 + i * 0.13, s = 0.7 + (3 - i) * 0.5, hero = i === 0;
        return [
          text(v, { x: 0.84, y, size: 30, font: '@mono', weight: 700, w: 160, color: hero ? '@ink' : '@fg', box: { fill: hero ? '@accent' : '@card', padX: 18, padY: 10, radius: 12 }, sfx: 'blip', sfxPitch: 0.9 + (3 - i) * 0.12, anim: A('pop', s, { dur: 0.5 }) }),
          text(mon, { x: 0.84, y: y + 0.047, size: 24, weight: 600, w: 160, color: '@muted', anim: A('fade', s + 0.1) }),
          text(t, { x: 0.42, y: y - 0.016, w: 640, size: 38, weight: 800, align: 'start', dir: 'rtl', anim: A('blurSlideL', s + 0.1, { dur: 0.6 }) }),
          text(d, { x: 0.42, y: y + 0.03, w: 640, size: 28, weight: 500, color: '@muted', align: 'start', dir: 'rtl', anim: A('fade', s + 0.25) }),
        ];
      }),
      text('جديد', { x: 0.12, y: 0.3, size: 24, weight: 800, w: 120, color: '@accent', box: { fill: '@accent/0.14', padX: 16, padY: 8, radius: 10 }, anim: A('pop', 2.6, { loop: 'pulse', loopAmp: 0.5 }) }),
      sig(),
    ],
  }, { tags: 'changelog versions release history سجل إصدارات', transition: 'venetian-h' }),

  tpl('dt-kanban', 'سبرينت أسبوعين', 'time', {
    duration: 7, bg: bgp('squares-calm'), camera: { type: 'drone', amount: 0.4 },
    elements: [
      text('سبرينت *الأسبوعين*', { y: 0.085, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('progress', { y: 0.18, w: 760, h: 14, value: 0.64, label: 'يوم 9 من 14', labelSize: 28, anim: A('fade', 0.5, { dur: 1.2 }) }),
      ...[[0.8, 'لسا · 2'], [0.5, 'عم يصير · 2'], [0.2, 'خلص · 3']].flatMap(([x, h], k) => [
        shape('rect', { x, y: 0.55, w: 280, h: 620, radius: 24, fill: '@fg/0.05', stroke: '@fg/0.08', strokeW: 2, sfx: 'none', anim: A('fade', 0.4 + k * 0.1) }),
        text(h, { x, y: 0.34, size: 30, weight: 800, w: 260, color: k === 2 ? '@accent' : '@fg', anim: A('fade', 0.5 + k * 0.1) }),
      ]),
      ...[[0.8, 0.43, 'صفحة الأسعار', 0], [0.8, 0.53, 'ربط HubSpot', 0], [0.5, 0.43, 'وكيل المبيعات', 1], [0.5, 0.53, 'تقرير الأداء', 1], [0.2, 0.43, 'إعداد n8n', 2], [0.2, 0.53, 'webhook الطلبات', 2], [0.2, 0.63, 'رد الواتساب', 2]].flatMap(([x, y, t, col], i) => {
        const s = 0.7 + i * 0.25, done = col === 2;
        return [
          shape('rect', { x, y, w: 250, h: 100, radius: 16, fill: done ? '@accent/0.14' : '@card', stroke: done ? '@accent/0.6' : undefined, strokeW: 2, shadow: 0.4, sfx: done ? (i === 6 ? 'success' : 'click-soft') : 'tap', anim: A('drop', s, { dur: 0.5 }) }),
          text(t, { x: done ? x - 0.02 : x, y, size: 26, weight: 700, w: done ? 190 : 220, anim: A('fade', s + 0.15) }),
          ...(done ? [el('icon', { x: x + 0.09, y, name: 'check', size: 26, color: '@accent', strokeW: 3, sfx: 'none', anim: A('pop', s + 0.3, { dur: 0.4 }) })] : []),
        ];
      }),
      text('5 أيام وبنسلّم *قبل الموعد*', { y: 0.875, size: 42, anim: A('riseSoft', 2.8) }),
    ],
  }, { tags: 'kanban sprint board tasks مهام سبرينت', transition: 'panel2-90' }),

  tpl('dt-history-years', 'تاريخ الأتمتة', 'time', {
    duration: 7, bg: bgp('nebula-faint'), camera: { type: 'spiralIn', amount: 0.3 },
    elements: [
      tag('// قصة الأتمتة بـ 5 محطات', { y: 0.1 }),
      el('counter', { y: 0.29, from: 1913, to: 2026, sep: false, size: 230, font: '@display', weight: 800, color: '@accent', glow: 0.3, countDur: 3.2, sfx: 'riser', anim: A('fade', 0.5, { dur: 0.4 }) }),
      text('من خط فورد… لوكيل بيرد عنك وإنت نايم', { y: 0.42, size: 40, weight: 700, w: 860, anim: A('riseSoft', 0.8) }),
      el('timeline', { y: 0.63, orient: 'h', w: 900, h: 260, size: 34, items: [{ t: '1913', s: 'خط فورد' }, { t: '1961', s: 'أول روبوت' }, { t: '2011', s: 'Zapier' }, { t: '2019', s: 'n8n' }, { t: '2026', s: 'وكلاء AI' }], anim: A('fade', 0.6, { stagger: 0.7 }) }),
      text('وأنا *هون*، بـ 2026', { y: 0.82, size: 54, anim: A('pop', 3.8) }),
      sig(),
    ],
  }, { tags: 'history years timeline automation تاريخ سنين', transition: 'spin-flat' }),

  // ================================================================== COMPARE
  tpl('dt-balance', 'الميزان', 'compare', {
    duration: 6, bg: bgp('warp-grid'), camera: { type: 'swayRot', amount: 0.4 },
    elements: [
      text('شو *أتقل* بالميزان؟', { y: 0.11, size: 76, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('بالقيمة، مش بالتعب', { y: 0.185, size: 36, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('triangle', { y: 0.56, w: 130, h: 150, fill: '@fg/0.85', sfx: 'none', anim: A('rise', 0.4) }),
      shape('rect', { y: 0.628, w: 280, h: 20, radius: 10, fill: '@fg/0.85', sfx: 'none', anim: A('growC', 0.4) }),
      shape('rect', { y: 0.5, w: 600, h: 16, radius: 8, rot: -8, fill: '@fg', sfx: 'none', anim: A('growC', 0.7, { dur: 0.7 }) }),
      shape('circle', { y: 0.5, w: 34, fill: '@accent', sfx: 'none', anim: A('pop', 0.9) }),
      vline(0.203, 0.5765, 109, { stroke: '@fg/0.7', anim: A('draw', 1.1, { dur: 0.3 }) }),
      vline(0.797, 0.5105, 109, { stroke: '@fg/0.7', anim: A('draw', 1.1, { dur: 0.3 }) }),
      shape('arc', { x: 0.203, y: 0.62, w: 240, a0: 0, a1: 180, stroke: '@fg', strokeW: 8, sfx: 'none', anim: A('draw', 1.2, { dur: 0.4 }) }),
      shape('line', { x: 0.203, y: 0.62, w: 240, stroke: '@fg', strokeW: 6, sfx: 'none', anim: A('growC', 1.2) }),
      shape('arc', { x: 0.797, y: 0.554, w: 240, a0: 0, a1: 180, stroke: '@fg', strokeW: 8, sfx: 'none', anim: A('draw', 1.2, { dur: 0.4 }) }),
      shape('line', { x: 0.797, y: 0.554, w: 240, stroke: '@fg', strokeW: 6, sfx: 'none', anim: A('growC', 1.2) }),
      text('40 ساعة يدوي', { x: 0.797, y: 0.519, size: 32, weight: 800, w: 260, box: { fill: '@fg/0.15', padX: 20, padY: 12, radius: 14 }, sfx: 'pop-low', anim: A('drop', 1.6, { dur: 0.5 }) }),
      text('workflow واحد', { x: 0.203, y: 0.585, size: 32, weight: 800, w: 260, color: '@ink', box: { fill: '@accent', padX: 20, padY: 12, radius: 14 }, sfx: 'thud', anim: A('drop', 2.0, { dur: 0.5 }) }),
      text('ساعة وحدة بنيت فيها workflow *أوزن* من 40 ساعة شغل يدوي كل شهر', { y: 0.8, size: 40, w: 860, anim: A('riseSoft', 2.6) }),
    ],
  }, { tags: 'balance scale weight value ميزان قيمة', transition: 'mask-rings' }),

  tpl('dt-impact-matrix', 'مصفوفة الأولويات', 'compare', {
    duration: 7, bg: bgp('grid-faint'), camera: { type: 'kbBROut', amount: 0.5 },
    elements: [
      text('شو بأتمت *أول*؟', { y: 0.11, size: 76, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[[0.69, 0.38, '@accent/0.14'], [0.31, 0.38, '@fg/0.04'], [0.69, 0.66, '@fg/0.04'], [0.31, 0.66, '@fg/0.04']].map(([x, y, f], k) => shape('rect', { x, y, w: 360, h: 330, radius: 22, fill: f, sfx: 'none', anim: A('zoomIn', 0.4 + k * 0.1, { dur: 0.6 }) })),
      vline(0.5, 0.52, 700, { stroke: '@fg/0.25', anim: A('draw', 0.5) }),
      shape('line', { y: 0.52, w: 760, stroke: '@fg/0.25', strokeW: 3, anim: A('draw', 0.5) }),
      text('تأثير كبير', { y: 0.222, size: 24, weight: 600, color: '@muted', w: 300, anim: A('fade', 0.7) }),
      text('تأثير قليل', { y: 0.818, size: 24, weight: 600, color: '@muted', w: 300, anim: A('fade', 0.7) }),
      text('جهد قليل', { x: 0.925, y: 0.52, size: 24, weight: 600, color: '@muted', w: 300, rot: 90, anim: A('fade', 0.7) }),
      text('جهد كبير', { x: 0.075, y: 0.52, size: 24, weight: 600, color: '@muted', w: 300, rot: -90, anim: A('fade', 0.7) }),
      text('ابدأ فيها *هلق*', { x: 0.69, y: 0.275, size: 30, weight: 800, w: 340, anim: A('fade', 0.9) }),
      text('خطط لها', { x: 0.31, y: 0.275, size: 30, weight: 800, w: 340, color: '@muted', anim: A('fade', 0.9) }),
      text('إذا فضيت', { x: 0.69, y: 0.765, size: 30, weight: 800, w: 340, color: '@muted', anim: A('fade', 0.9) }),
      text('انساها', { x: 0.31, y: 0.765, size: 30, weight: 800, w: 340, color: '@muted', anim: A('fade', 0.9) }),
      ...[[0.74, 0.35, 'رد الواتساب', true], [0.62, 0.44, 'تذكير الدفع', true], [0.3, 0.37, 'وكيل مبيعات كامل'], [0.7, 0.62, 'تسمية الملفات'], [0.3, 0.66, 'ERP مخصص']].flatMap(([x, y, t, hot], k) => {
        const s = 1.2 + k * 0.35;
        return [
          shape('circle', { x, y, w: 28, fill: hot ? '@accent' : '@fg/0.55', glow: hot ? 0.6 : 0, sfx: 'pop-soft', sfxPitch: 1 + k * 0.08, anim: A('pop', s, { dur: 0.5 }) }),
          text(t, { x, y: y + 0.035, size: 28, weight: 700, w: 300, anim: A('fade', s + 0.1) }),
        ];
      }),
      text('دايماً بلّش من *الزاوية فوق يمين*', { y: 0.88, size: 40, anim: A('pop', 3.2) }),
    ],
  }, { tags: 'matrix priority effort impact مصفوفة أولويات', transition: 'color-diamond' }),

  tpl('dt-host-table', 'جدول مقارنة', 'compare', {
    duration: 7, bg: bgp('circuit-brand'), camera: { type: 'none' },
    elements: [
      text('وين تشغّل *n8n*؟', { y: 0.11, size: 76, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('rect', { x: 0.38, y: 0.475, w: 190, h: 620, radius: 24, fill: '@accent/0.12', stroke: '@accent', strokeW: 3, sfx: 'none', anim: A('unfold', 0.5, { dur: 0.7 }) }),
      text('نصيحتي', { x: 0.38, y: 0.2, size: 22, weight: 800, w: 160, color: '@ink', box: { fill: '@accent', padX: 14, padY: 6, radius: 10 }, anim: A('pop', 2.8) }),
      ...[['n8n Cloud', 0.58], ['VPS', 0.38], ['جهازك', 0.18]].map(([t, x], c) => text(t, { x, y: 0.25, size: 30, font: c < 2 ? '@mono' : '@body', weight: 700, w: 190, color: c === 1 ? '@accent' : '@fg', anim: A('fade', 0.6 + c * 0.1) })),
      ...[0.305, 0.415, 0.525, 0.635].map((y) => shape('line', { y, w: 880, stroke: '@fg/0.1', strokeW: 2, sfx: 'none', anim: A('growC', 0.6) })),
      ...[['السعر بالشهر', ['€24', '$5', 'ببلاش']], ['شغّال 24/7', [1, 1, 0]], ['بدون صيانة', [1, 0, 0]], ['الداتا عندك', [0, 1, 1]]].flatMap(([lab, cells], r) => {
        const y = 0.36 + r * 0.11, s = 0.8 + r * 0.45;
        return [
          text(lab, { x: 0.82, y, size: 32, weight: 700, w: 260, anim: A('blurSlideL', s, { dur: 0.6 }) }),
          ...cells.map((v, c) => {
            const x = 0.58 - c * 0.2, o = { sfx: c ? 'none' : 'pop-soft', sfxPitch: 1 + r * 0.1, anim: A('pop', s + 0.15 + c * 0.12, { dur: 0.5 }) };
            if (typeof v === 'string') return text(v, { x, y, size: 34, font: c < 2 ? '@mono' : '@body', weight: 700, w: 180, color: c === 1 ? '@accent' : '@fg', ...o });
            return v ? el('icon', { x, y, name: 'check', size: 44, color: '@accent', strokeW: 3, ...o }) : el('icon', { x, y, name: 'x', size: 38, color: '@fg/0.35', strokeW: 2.5, ...o });
          }),
        ];
      }),
      text('نصيحتي: *VPS بـ $5* وخلصت', { y: 0.8, size: 50, anim: A('pop', 3.0) }),
      text('Hetzner أو DigitalOcean · Docker', { y: 0.865, size: 28, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 3.3) }),
    ],
  }, { tags: 'table comparison hosting n8n جدول مقارنة استضافة', transition: 'door-v' }),

  tpl('dt-split-report', 'قبل وبعد بالشاشة', 'compare', {
    duration: 6, bg: bgp('mesh-grid'), camera: { type: 'slideR', amount: 0.3 },
    elements: [
      text('تقرير الأسبوع', { y: 0.1, size: 76, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('نفس الداتا، شغلتين مختلفتين', { y: 0.175, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      shape('rect', { y: 0.5, w: 860, h: 640, radius: 32, fill: '@card', shadow: 0.6, sfx: 'whoosh', anim: A('zoomOut', 0.3, { dur: 0.7 }) }),
      text('قبل', { x: 0.86, y: 0.29, size: 26, weight: 800, w: 100, box: { fill: '@fg/0.15', padX: 18, padY: 8, radius: 10 }, anim: A('pop', 0.7) }),
      ...[0, 1, 2, 3, 4, 5, 6].map((r) => shape('line', { x: 0.715, y: 0.36 + r * 0.05, w: 380, stroke: '@fg/0.15', strokeW: 2, sfx: 'none', anim: A('wipeL', 0.8 + r * 0.04, { dur: 0.4 }) })),
      ...[0.6, 0.715, 0.83].map((x) => vline(x, 0.51, 380, { stroke: '@fg/0.15', strokeW: 2, sfx: 'none', anim: A('fade', 0.9) })),
      ...[[0.88, 0.385, '1,284'], [0.775, 0.385, '#REF!'], [0.655, 0.435, '0.83'], [0.88, 0.485, '=SUM('], [0.775, 0.535, '#N/A'], [0.655, 0.585, '???'], [0.88, 0.635, '47 tab'], [0.775, 0.635, '12.4']].map(([x, y, t], k) => text(t, { x, y, size: 22, font: '@mono', weight: 600, w: 110, color: t[0] === '#' ? '@fg' : '@muted', sfx: 'none', anim: A('fade', 1.0 + k * 0.05) })),
      text('بعد', { x: 0.14, y: 0.29, size: 26, weight: 800, w: 100, color: '@ink', box: { fill: '@accent', padX: 18, padY: 8, radius: 10 }, anim: A('pop', 1.9) }),
      el('donut', { x: 0.285, y: 0.46, w: 230, value: 0.82, label: '82%', sub: 'انحلّت', sfx: 'sparkle', anim: A('fade', 1.9, { dur: 1.0 }) }),
      text('1,284 رسالة', { x: 0.285, y: 0.62, size: 36, weight: 800, w: 360, anim: A('riseSoft', 2.2) }),
      text('بشاشة وحدة، بتتحدّث لحالها', { x: 0.285, y: 0.665, size: 24, weight: 500, w: 360, color: '@muted', anim: A('fade', 2.4) }),
      vline(0.5, 0.5, 640, { stroke: '@accent', strokeW: 6, sfx: 'swish', anim: A('draw', 1.4, { dur: 0.5 }) }),
      shape('circle', { y: 0.5, w: 92, fill: '@accent', glow: 0.5, sfx: 'click', anim: A('pop', 1.7, { dur: 0.5 }) }),
      el('icon', { x: 0.483, y: 0.5, name: 'chevronLeft', size: 30, color: '@ink', strokeW: 3, sfx: 'none', anim: A('fade', 1.9) }),
      el('icon', { x: 0.517, y: 0.5, name: 'chevronRight', size: 30, color: '@ink', strokeW: 3, sfx: 'none', anim: A('fade', 1.9) }),
      text('*47 تاب* Excel صاروا شاشة وحدة', { y: 0.84, size: 46, anim: A('pop', 2.8) }),
    ],
  }, { tags: 'before after split slider report قبل بعد تقرير', transition: 'sand' }),

  tpl('dt-butterfly', 'أنا قبل وبعد', 'compare', {
    duration: 6.5, bg: bgp('words-big'), camera: { type: 'shockwave', amount: 0.4 },
    elements: [
      text('نفس الشخص، *سنتين* فرق', { y: 0.1, size: 66, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('أنا 2024', { x: 0.77, y: 0.21, size: 42, weight: 800, w: 300, color: '@muted', anim: A('slideR', 0.5) }),
      text('VS', { y: 0.21, size: 36, font: '@mono', weight: 700, w: 120, box: { fill: '@fg/0.1', padX: 18, padY: 8, radius: 12 }, sfx: 'punch-hit', anim: A('slam', 0.6, { dur: 0.5 }) }),
      text('أنا 2026', { x: 0.23, y: 0.21, size: 42, weight: 800, w: 300, color: '@accent', anim: A('slideL', 0.5) }),
      ...[['عملاء', 40, 230, '4', '23'], ['ساعات شغل', 230, 146, '60س', '38س'], ['دخل شهري', 41, 230, '$1.2k', '$6.8k'], ['ساعات نوم', 153, 230, '5س', '7.5س']].flatMap(([lab, rw, lw, rv, lv], r) => {
        const y = 0.34 + r * 0.12, s = 0.9 + r * 0.4;
        return [
          text(lab, { y, size: 30, weight: 700, w: 220, anim: A('fade', s) }),
          shape('rect', { x: 0.62 + rw / 2000, y, w: rw, h: 58, radius: 12, fill: '@fg/0.3', sfx: 'none', anim: A('grow', s, { dur: 0.6 }) }),
          shape('rect', { x: 0.38 - lw / 2000, y, w: lw, h: 58, radius: 12, fill: '@accent', sfx: 'swish', sfxPitch: 1 + r * 0.1, anim: A('wipeL', s + 0.15, { dur: 0.6 }) }),
          text(rv, { x: 0.62 + rw / 1000 + 0.045, y, size: 30, font: '@mono', weight: 700, w: 120, color: '@muted', anim: A('fade', s + 0.5) }),
          text(lv, { x: 0.38 - lw / 1000 - 0.045, y, size: 30, font: '@mono', weight: 700, w: 120, color: '@accent', anim: A('fade', s + 0.55) }),
        ];
      }),
      text('الفرق؟ *بطّلت* أشتغل بإيدي', { y: 0.84, size: 48, anim: A('pop', 3.0) }),
    ],
  }, { tags: 'butterfly versus me then now أنا قبل بعد', transition: 'stretch-h' }),

  tpl('dt-expect-reality', 'التوقع والواقع', 'compare', {
    duration: 6.5, bg: bgp('sea-calm'), camera: { type: 'wander', amount: 0.5 },
    elements: [
      text('تعلّم *الأتمتة*', { y: 0.09, size: 66, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('rect', { y: 0.32, w: 880, h: 360, radius: 30, glass: true, shadow: 0.5, sfx: 'swish', anim: A('zoomOut', 0.4, { dur: 0.7 }) }),
      text('التوقع', { x: 0.78, y: 0.215, size: 36, weight: 800, w: 260, anim: A('fade', 0.6) }),
      text('أسبوع وبصير محترف', { x: 0.3, y: 0.215, size: 28, weight: 600, w: 360, color: '@muted', anim: A('fade', 0.7) }),
      el('linechart', { y: 0.35, w: 760, h: 200, values: [5, 14, 24, 35, 46, 58, 70, 82], grid: false, dots: false, area: false, color: '@fg/0.55', strokeW: 6, glow: 0, anim: A('fade', 0.7, { dur: 0.6 }) }),
      shape('rect', { y: 0.67, w: 880, h: 360, radius: 30, glass: true, shadow: 0.5, sfx: 'swish', sfxPitch: 0.8, anim: A('zoomOut', 1.4, { dur: 0.7 }) }),
      text('الواقع', { x: 0.78, y: 0.565, size: 36, weight: 800, w: 260, color: '@accent', anim: A('fade', 1.6) }),
      text('3 شهور تجربة وغلط… وبعدين فجأة', { x: 0.36, y: 0.565, size: 28, weight: 600, w: 460, color: '@muted', anim: A('fade', 1.7) }),
      el('linechart', { y: 0.7, w: 760, h: 200, values: [5, 22, 8, 26, 6, 30, 14, 10, 48, 92], grid: false, dots: false, strokeW: 6, sfx: 'riser-short', anim: A('fade', 1.8, { dur: 1.0 }) }),
      text('هون فهمت الـ webhooks', { x: 0.68, y: 0.635, size: 24, weight: 700, w: 300, color: '@ink', box: { fill: '@accent', padX: 14, padY: 8, radius: 10 }, sfx: 'ding', anim: A('pop', 3.6, { dur: 0.5 }) }),
      text('عادي تحس إنك *ما عم تتقدّم*. كمّل', { y: 0.885, size: 40, anim: A('riseSoft', 3.4) }),
    ],
  }, { tags: 'expectation reality learning curve توقع واقع تعلم', transition: 'leak-warm' }),

  // ================================================================== EDU
  tpl('dt-glossary', 'قاموس: Webhook', 'edu', {
    duration: 6, bg: bgp('paper-dark'), camera: { type: 'dutchL', amount: 0.3 }, fx: { grain: 0.25 },
    elements: [
      tag('// قاموس الأتمتة · 07', { y: 0.09 }),
      text('Webhook', { y: 0.22, size: 150, font: '@display', weight: 800, anim: A('letterDrop', 0.3, { split: 'letter', stagger: 0.05 }) }),
      text('/ ويب · هوك /', { y: 0.32, size: 36, weight: 500, color: '@muted', anim: A('fade', 0.9) }),
      text('اسم · تقني', { y: 0.38, size: 28, weight: 700, w: 300, color: '@accent', box: { fill: '@accent/0.14', padX: 20, padY: 8, radius: 12 }, sfx: 'click-soft', anim: A('pop', 1.1) }),
      shape('line', { y: 0.43, w: 600, stroke: '@fg/0.2', strokeW: 2, anim: A('growC', 1.2) }),
      text('رابط بيستنّى. أول ما يصير حدث بأي تطبيق، التطبيق *بيدق عليه* وبيبعتله الداتا فوراً.', { y: 0.53, size: 44, weight: 600, w: 860, anim: A('maskUp', 1.4, { split: 'line', stagger: 0.15 }) }),
      shape('rect', { y: 0.76, w: 860, h: 190, radius: 24, fill: '@fg/0.06', sfx: 'page-flip', anim: A('unfold', 2.3, { dur: 0.6 }) }),
      text('مثال', { x: 0.84, y: 0.715, size: 26, weight: 800, w: 120, color: '@accent', anim: A('fade', 2.5) }),
      text('العميل بيدفع ← Stripe بيبعت webhook ← الـ n8n بيبعتله الفاتورة', { y: 0.775, size: 32, weight: 600, w: 780, anim: A('fade', 2.7) }),
      sig(),
    ],
  }, { tags: 'glossary term dictionary webhook قاموس مصطلح', transition: 'mask-halftone' }),

  tpl('dt-myth-fact', 'خرافة وحقيقة', 'edu', {
    duration: 6.5, bg: bgp('smoke-faint'), camera: { type: 'heartbeat', amount: 0.5 },
    elements: [
      text('خرافة', { y: 0.13, size: 30, weight: 800, w: 200, color: '@bg', box: { fill: '@fg', padX: 26, padY: 10, radius: 12 }, anim: A('drop', 0.2) }),
      text('الأتمتة بدها مبرمج', { y: 0.24, size: 84, weight: 800, color: '@fg/0.75', anim: A('blurIn', 0.4, { split: 'word', stagger: 0.1 }) }),
      shape('rect', { x: 0.75, y: 0.355, w: 280, h: 150, radius: 18, rot: -12, fill: 'none', stroke: '@accent', strokeW: 8, sfx: 'none', anim: A('slam', 1.5, { dur: 0.45 }) }),
      text('غلط', { x: 0.75, y: 0.355, size: 96, font: '@display', weight: 800, w: 260, rot: -12, color: '@accent', sfx: 'stamp', anim: A('slam', 1.5, { dur: 0.45 }) }),
      shape('line', { y: 0.44, w: 700, stroke: '@fg/0.2', strokeW: 3, dash: [8, 10], anim: A('growC', 1.9) }),
      text('الحقيقة', { y: 0.5, size: 30, weight: 800, w: 200, color: '@ink', box: { fill: '@accent', padX: 26, padY: 10, radius: 12 }, sfx: 'ding', anim: A('pop', 2.0) }),
      text('80% من الـ workflows اللي بنيتها كانت *بدون سطر كود*', { y: 0.6, size: 54, w: 860, anim: A('maskUp', 2.2, { split: 'line', stagger: 0.12 }) }),
      el('list', { y: 0.77, w: 760, size: 32, gap: 18, icon: 'check', items: ['سحب وإفلات بـ n8n', 'شوية منطق if / else', 'والباقي بيعمله الـ AI'], anim: A('riseSoft', 2.7, { stagger: 0.25, dur: 0.6 }) }),
      sig(),
    ],
  }, { tags: 'myth fact truth خرافة حقيقة', transition: 'flash-radial' }),

  tpl('dt-formula', 'معادلة الأتمتة', 'edu', {
    duration: 7, bg: bgp('dots-still'), camera: { type: 'zoomPulse', amount: 0.4 },
    elements: [
      tag('// المعادلة اللي بستعملها', { y: 0.09 }),
      text('بتستاهل *الأتمتة*؟ احسبها', { y: 0.17, size: 64, anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.07 }) }),
      ...[[0.8, '5', 'دقايق كل مرة'], [0.5, '40', 'مرة باليوم'], [0.2, '22', 'يوم شغل']].flatMap(([x, n, u], i) => {
        const s = 0.6 + i * 0.4;
        return [
          shape('rect', { x, y: 0.37, w: 240, h: 190, radius: 26, glass: true, shadow: 0.5, sfx: 'tick-wood', sfxPitch: 1 + i * 0.12, anim: A('pop', s, { dur: 0.6 }) }),
          text(n, { x, y: 0.355, size: 90, font: '@mono', weight: 700, w: 220, anim: A('fade', s + 0.15) }),
          text(u, { x, y: 0.42, size: 24, weight: 600, w: 220, color: '@muted', anim: A('fade', s + 0.25) }),
        ];
      }),
      ...[0.65, 0.35].map((x, i) => text('×', { x, y: 0.37, size: 70, weight: 800, w: 80, color: '@accent', anim: A('zoomIn', 0.85 + i * 0.4) })),
      text('=', { y: 0.51, size: 90, weight: 800, w: 100, color: '@accent', anim: A('zoomIn', 1.8) }),
      shape('rect', { y: 0.635, w: 640, h: 210, radius: 32, fill: '@accent', glow: 0.4, sfx: 'impact-soft', anim: A('slam', 2.0, { dur: 0.5 }) }),
      el('counter', { y: 0.62, to: 73, suffix: 'ساعة', size: 110, font: '@display', weight: 800, color: '@ink', countDur: 1.2, anim: A('fade', 2.1, { dur: 0.3 }) }),
      text('بالشهر، لشغلة وحدة', { y: 0.69, size: 30, weight: 700, color: '@ink', anim: A('fade', 2.4) }),
      text('إذا طلع الرقم فوق *10 ساعات*، أتمتها اليوم', { y: 0.82, size: 42, anim: A('riseSoft', 2.9) }),
      sig(),
    ],
  }, { tags: 'formula equation calculate معادلة حساب', transition: 'assemble-fine' }),

  tpl('dt-analogy-mcp', 'شرح بتشبيه: MCP', 'edu', {
    duration: 7, bg: bgp('orbits-flat'), camera: { type: 'orbit', amount: 0.3 },
    elements: [
      text('شو يعني *MCP*؟', { y: 0.1, size: 84, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      text('بشرحلك بتشبيه من شنطتك', { y: 0.175, size: 34, weight: 600, color: '@muted', anim: A('fade', 0.5) }),
      el('flow', { y: 0.44, w: 820, h: 420, nodeSize: 110, labelSize: 26, pulses: 2, nodes: [{ label: 'Claude', icon: 'bot', x: 0.38, y: 0, hot: true }, { label: 'MCP', icon: 'plug', x: 0, y: 0 }, { label: 'Gmail', icon: 'mail', x: -0.38, y: -0.36 }, { label: 'Drive', icon: 'folder', x: -0.38, y: 0 }, { label: 'Supabase', icon: 'database', x: -0.38, y: 0.36 }], edges: [[0, 1], [1, 2], [1, 3], [1, 4]], anim: A('fade', 0.6, { stagger: 0.35 }) }),
      text('MCP هو *USB-C* تبع الذكاء الاصطناعي', { y: 0.74, size: 52, w: 880, anim: A('maskUp', 2.4, { split: 'line' }) }),
      text('وصلة وحدة بتخلّي أي AI يحكي مع أي أداة، بدل ما تبرمج ربط خاص لكل وحدة', { y: 0.82, size: 32, weight: 500, w: 840, color: '@muted', anim: A('fade', 3.0) }),
      sig(),
    ],
  }, { tags: 'analogy explain mcp usb concept شرح تشبيه', transition: 'bloom' }),

  tpl('dt-howto-stepper', 'خطوة بخطوة', 'edu', {
    duration: 7.5, bg: bgp('waves-lines'), camera: { type: 'dropIn', amount: 0.4 },
    elements: [
      text('أول workflow إلك *بـ 3 خطوات*', { y: 0.1, size: 64, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('line', { y: 0.26, w: 600, stroke: '@fg/0.15', strokeW: 8, anim: A('growC', 0.4) }),
      shape('line', { y: 0.26, w: 600, rot: 180, stroke: '@accent', strokeW: 8, sfx: 'none', anim: A('draw', 0.7, { dur: 2.2, ease: 'linear' }) }),
      ...[[0.8, '1', 'Trigger', 'bolt', 'حط Trigger', 'Webhook أو Schedule كل ساعة'], [0.5, '2', 'Action', 'database', 'زيد Action', 'Google Sheets يكتب الداتا بسطر جديد'], [0.2, '3', 'Test', 'play', 'كبسة Test', 'Execute workflow وشوف النتيجة فوراً']].flatMap(([x, n, en, ic, t, d], i) => {
        const s = 0.6 + i * 1.1;
        return [
          shape('circle', { x, y: 0.26, w: 100, fill: '@accent', glow: 0.5, sfx: 'pop', sfxPitch: 1 + i * 0.15, anim: A('pop', s, { dur: 0.5 }) }),
          text(n, { x, y: 0.262, size: 48, font: '@display', weight: 800, w: 100, color: '@ink', anim: A('pop', s + 0.1, { dur: 0.5 }) }),
          text(en, { x, y: 0.33, size: 28, font: '@mono', weight: 600, w: 200, color: '@muted', anim: A('fade', s + 0.2) }),
          ...iconRow(0.47 + i * 0.14, s + 0.2, ic, t, d, { h: 140, size: 36 }),
        ];
      }),
      text('10 دقايق، *وبدون كود*', { y: 0.88, size: 44, anim: A('pop', 3.6) }),
    ],
  }, { tags: 'how to step by step tutorial stepper خطوات شرح', transition: 'fold-h' }),

  tpl('dt-three-mistakes', '3 أخطاء', 'edu', {
    duration: 7, bg: bgp('vhs-tape'), camera: { type: 'walk', amount: 0.4 },
    elements: [
      text('3 أخطاء *بشوفها* بكل workflow', { y: 0.12, size: 62, anim: A('glitch', 0.2, { dur: 0.6 }) }),
      ...[['ما في Error handling', 'الحل: *Error Trigger* بيبعتلك عالتلغرام'], ['الـ API keys جوا الـ nodes', 'الحل: حطهم بالـ *Credentials*'], ['workflow واحد بيعمل كل شي', 'الحل: قسّمه لـ *sub-workflows*']].flatMap(([t, fix], i) => {
        const y = 0.3 + i * 0.18, s = 0.7 + i * 0.7;
        return [
          shape('rect', { y, w: 880, h: 150, radius: 26, fill: '@fg/0.05', stroke: '@fg/0.1', strokeW: 2, sfx: 'none', anim: A('blurSlideL', s, { dur: 0.6 }) }),
          el('icon', { x: 0.865, y, name: 'x', size: 50, color: '@accent', strokeW: 3, bg: '@accent/0.15', sfx: 'error', anim: A('glitch', s + 0.15, { dur: 0.5 }) }),
          text(t, { x: 0.45, y: y - 0.02, w: 640, size: 42, weight: 800, align: 'start', dir: 'rtl', anim: A('fade', s + 0.2) }),
          text(fix, { x: 0.45, y: y + 0.03, w: 640, size: 28, weight: 600, color: '@muted', align: 'start', dir: 'rtl', anim: A('fade', s + 0.35) }),
        ];
      }),
      text('أي واحد *وقعت فيه*؟', { y: 0.84, size: 50, anim: A('pop', 3.2) }),
      sig(),
    ],
  }, { tags: 'mistakes errors tips أخطاء نصائح', transition: 'glitch-rgb' }),
];
