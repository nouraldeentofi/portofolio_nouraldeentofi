// Tech pack: code & terminal, automation flows, chat/notification UI, device mockups.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl } from './kit.js';

// one vertical-flow step label (title + mono sub), aligned beside its node
const step = (title, sub, y, start, x = 0.4) => [
  text(title, { x, y: y - 0.022, size: 46, weight: 700, w: 520, align: 'right', anim: A('blurSlideL', start, { dur: 0.7 }) }),
  text(sub, { x, y: y + 0.026, size: 26, font: '@mono', weight: 500, w: 520, align: 'right', color: '@muted', anim: A('fade', start + 0.2) }),
];

// small glass stat card (rect + value + caption) that floats as one piece
const statCard = (x, y, value, caption, start, phase) => [
  shape('rect', { x, y, w: 330, h: 176, radius: 30, glass: true, shadow: 0.8, z: 0.6, anim: A('flipY', start, { dur: 0.8, loop: 'float', phase }) }),
  text(value, { x, y: y - 0.016, size: 58, font: '@mono', weight: 700, color: '@accent', w: 300, z: 0.6, anim: A('fade', start + 0.35, { loop: 'float', phase }) }),
  text(caption, { x, y: y + 0.034, size: 28, weight: 500, color: '@muted', w: 300, z: 0.6, anim: A('fade', start + 0.5, { loop: 'float', phase }) }),
];

// rounded chat-like bubble made from a boxed text
const bubble = (t, x, y, o = {}) => text(t, { x, y, size: 34, weight: 600, w: 460, color: '@fg', box: { fill: '@card', padX: 30, padY: 18, radius: 26, shadow: true }, ...o });

export const TECH = [
  // ================================================================== tech
  tpl('tech-python', 'سكربت Python', 'tech', {
    duration: 8, bg: { type: 'circuit' }, camera: { type: 'panL', amount: 0.6 }, fx: { vignette: 0.4 },
    elements: [
      tag('// python · cron', { x: 0.5, y: 0.07 }),
      text('سكربت صغير… بيوفّر *ساعة* كل يوم', { y: 0.165, size: 68, w: 920, anim: A('maskDown', 0.3, { split: 'line', stagger: 0.15, dur: 0.9 }) }),
      el('code', { y: 0.52, w: 940, size: 28, title: 'report.py', cps: 46, z: 0.3, rot: -2, anim: A('tilt', 0.7, { dur: 1 }), lines: [
        'import pandas as pd',
        'from mailer import send',
        '',
        'def daily_report():',
        '    df = pd.read_csv("sales.csv")',
        '    total = df["amount"].sum()',
        '    send("team@co.com", f"Total: {total}")',
        '',
        'daily_report()  # 08:00 every day',
      ] }),
      status('cron · 08:00 daily', { x: 0.5, y: 0.84, anim: A('fade', 5.2) }),
    ],
  }, { tags: 'python script code سكربت', transition: 'wipe' }),

  tpl('tech-deploy', 'لوغ النشر', 'tech', {
    duration: 8, bg: { type: 'grid', size: 60, speed: 30 }, camera: { type: 'push', amount: 1 }, fx: { scanlines: true, grain: 0.5 },
    elements: [
      text('من الكود للإنتاج… *بدقيقة*', { y: 0.12, size: 76, anim: A('flicker', 0.2, { dur: 0.9 }) }),
      el('code', { mode: 'terminal', y: 0.47, w: 940, size: 30, title: 'zsh — deploy', cps: 30, anim: A('unfold', 0.6, { dur: 0.7 }), lines: [
        '$ git push origin main',
        'Enumerating objects: 42, done.',
        '$ npm run build',
        '> built in 3.2s',
        '$ npm run deploy',
        '> uploading 128 files',
        '✓ Deployed to production',
      ] }),
      el('progress', { y: 0.765, w: 820, value: 1, label: 'Deploy', anim: A('riseSoft', 4.6, { dur: 0.8 }) }),
      status('live', { x: 0.5, y: 0.885, anim: A('pop', 5.8) }),
    ],
  }, { tags: 'terminal deploy نشر سيرفر', transition: 'blinds' }),

  tpl('tech-api', 'طلب API ورد', 'tech', {
    duration: 8, bg: { type: 'split', angle: -4, ratio: 0.55 }, camera: { type: 'orbit', amount: 0.7 },
    elements: [
      text('API وحدة… بتربط *كل أنظمتك*', { y: 0.1, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('code', { x: 0.53, y: 0.355, w: 860, size: 26, title: 'POST /v1/leads', cps: 44, z: 0.2, anim: A('blurSlideR', 0.6), lines: [
        'POST /v1/leads HTTP/1.1',
        'Authorization: Bearer sk-****',
        '{ "name": "Sara",',
        '  "source": "linkedin" }',
      ] }),
      el('icon', { name: 'arrowDown', y: 0.53, size: 64, color: '@accent', anim: A('drop', 3.0, { loop: 'float' }) }),
      el('code', { x: 0.47, y: 0.72, w: 860, size: 26, title: '200 OK · 84ms', cps: 70, z: 0.5, hiLine: 2, anim: A('blurSlideL', 3.3), lines: [
        '{',
        '  "id": "lead_1042",',
        '  "status": "synced",',
        '  "crm": true',
        '}',
      ] }),
      status('200 OK', { x: 0.5, y: 0.92, anim: A('fade', 5) }),
    ],
  }, { tags: 'api request response json', transition: 'slide' }),

  tpl('tech-prompt', 'كرت البرومبت', 'tech', {
    duration: 8, bg: { type: 'blobs', speed: 0.6 }, camera: { type: 'dolly', amount: 0.8 },
    elements: [
      text('البرومبت الصح = *نص الشغل*', { y: 0.1, size: 72, hl: 'marker', anim: A('pushIn', 0.2, { dur: 0.9 }) }),
      shape('rect', { y: 0.47, w: 900, h: 640, radius: 40, glass: true, shadow: 1, anim: A('flipX', 0.5, { dur: 0.9 }) }),
      text('SYSTEM PROMPT', { y: 0.258, size: 26, font: '@mono', weight: 600, color: '@accent', letterSpacing: 0.12, anim: A('track', 1.0) }),
      text('أنت مساعد مبيعات. رد بلطف واختصار، اقترح موعد، وما تخترع أسعار أبداً.', { y: 0.375, size: 46, weight: 500, w: 780, lineHeight: 1.6, caret: true, anim: A('typewriter', 1.3, { dur: 2.6 }) }),
      shape('line', { y: 0.51, w: 760, h: 4, strokeW: 2, stroke: '@fg/0.18', anim: A('draw', 3.9) }),
      text('OUTPUT', { y: 0.56, size: 26, font: '@mono', weight: 600, color: '@muted', letterSpacing: 0.12, anim: A('fade', 4.1) }),
      text('أهلين سارة! بقدر احجزلك مكالمة 15 دقيقة بكرا الساعة 11، بيناسبك؟', { y: 0.645, size: 40, weight: 400, w: 760, color: '@muted', lineHeight: 1.6, anim: A('riseBlur', 4.3, { split: 'word', stagger: 0.04 }) }),
      sig({ y: 0.9 }),
    ],
  }, { tags: 'prompt ai برومبت claude', transition: 'blur' }),

  tpl('tech-mcp', 'شو هو MCP؟', 'tech', {
    duration: 7, bg: { type: 'hex', size: 52 }, camera: { type: 'rise', amount: 0.8 },
    elements: [
      text('شو هو *MCP*؟', { y: 0.1, size: 100, anim: A('zoomOut', 0.2, { dur: 0.9 }) }),
      text('طريقة وحدة ليحكي الـ AI مع كل أدواتك', { y: 0.19, size: 42, weight: 400, color: '@muted', anim: A('riseSoft', 0.8) }),
      glowAt(0.5, 0.52, { w: 640, h: 640, alpha: 0.26 }),
      el('flow', { y: 0.52, w: 900, h: 640, nodeSize: 116, dashed: true, pulses: 2, edges: [[0, 1], [1, 2], [1, 3], [1, 4]], anim: A('none', 1.2, { stagger: 0.35 }), nodes: [
        { label: 'Claude', icon: 'brain', x: 0.4, y: 0 },
        { label: 'MCP Server', icon: 'plug', x: 0.02, y: 0, hot: true },
        { label: 'Gmail', icon: 'mail', x: -0.38, y: -0.36 },
        { label: 'Sheets', icon: 'grid', x: -0.38, y: 0 },
        { label: 'CRM', icon: 'database', x: -0.38, y: 0.36 },
      ] }),
      text('Server واحد = عشرات الأدوات', { y: 0.86, size: 44, weight: 600, anim: A('maskUp', 3.2) }),
    ],
  }, { tags: 'mcp ai tools claude شرح', transition: 'circle' }),

  tpl('tech-bugfix', 'Bug ← Fix', 'tech', {
    duration: 7.5, bg: { type: 'stripes', angle: -30, width: 50, speed: 30, color: '@accent/0.05' }, camera: { type: 'punch', amount: 0.8 }, fx: { vignette: 0.5 },
    elements: [
      text('Bug بالـ checkout؟', { y: 0.1, size: 84, anim: A('glitch', 0.2, { dur: 0.9 }) }),
      text('لقيته وصلّحته بـ *3 دقائق*', { y: 0.19, size: 52, weight: 600, anim: A('riseBlur', 0.9, { split: 'word', stagger: 0.07 }) }),
      el('code', { y: 0.5, w: 920, size: 30, title: 'checkout.js', cps: 40, hiLine: 3, anim: A('zoomIn', 1.2, { dur: 0.8 }), lines: [
        'function total(cart) {',
        '  return cart.items.reduce(',
        '-   (s, i) => s + i.price,',
        '+   (s, i) => s + i.price * i.qty,',
        '    0)',
        '}',
      ] }),
      el('icon', { name: 'check', y: 0.75, size: 66, color: '@ink', bg: '@accent', strokeW: 3, anim: A('elastic', 4.7, { dur: 0.9 }) }),
      text('كل الطلبات صارت تنحسب صح', { y: 0.86, size: 44, weight: 600, anim: A('maskUp', 5.0) }),
    ],
  }, { tags: 'bug fix debug خطأ', transition: 'glitch' }),

  tpl('tech-matrix', 'الكود ما بينام', 'tech', {
    duration: 6, bg: { type: 'matrix', size: 26, speed: 0.8 }, camera: { type: 'dolly', amount: 1 }, fx: { scanlines: true, vignette: 0.7 },
    elements: [
      veil({ y: 0.5, h: 820, alpha: 0.78 }),
      text('while (true) {', { y: 0.33, size: 92, font: '@mono', weight: 700, anim: A('scramble', 0.3, { dur: 1.2 }) }),
      text('automate();', { y: 0.44, size: 110, font: '@mono', weight: 800, color: '@accent', glow: 0.6, anim: A('scramble', 0.9, { dur: 1.2, loop: 'glow' }) }),
      text('}', { y: 0.55, size: 92, font: '@mono', weight: 700, anim: A('scramble', 1.6, { dur: 0.5 }) }),
      text('الأنظمة اللي ببنيها ما بتنام', { y: 0.7, size: 54, weight: 600, anim: A('riseBlur', 2.2, { split: 'word', stagger: 0.08 }) }),
      status('uptime 99.9%', { x: 0.5, y: 0.8, anim: A('fade', 3) }),
    ],
  }, { tags: 'matrix code hacker', transition: 'pixel' }),

  tpl('tech-stack', 'الستاك تبعي', 'tech', {
    duration: 6, bg: { type: 'mesh', density: 1.3 }, camera: { type: 'push', amount: 0.8 },
    elements: [
      tag('// stack', { y: 0.08 }),
      text('الأدوات اللي *ببني* فيها', { y: 0.17, size: 80, anim: A('maskUp', 0.3, { split: 'word', stagger: 0.1 }) }),
      ...[['workflow', 'n8n'], ['brain', 'Claude'], ['sparkles', 'OpenAI'], ['database', 'Supabase'], ['code', 'React'], ['terminal', 'Python']].flatMap(([ic, lab], i) => {
        const x = [0.78, 0.5, 0.22][i % 3], y = i < 3 ? 0.38 : 0.64;
        return [
          el('icon', { name: ic, x, y, size: 88, color: '@accent', bg: '@card', bgShape: 'square', bgGlass: true, anim: A('popRotate', 0.8 + i * 0.15, { dur: 0.7, loop: 'float', phase: i * 0.9 }) }),
          text(lab, { x, y: y + 0.1, size: 30, font: '@mono', weight: 600, w: 300, anim: A('fade', 1.1 + i * 0.15, { loop: 'float', phase: i * 0.9 }) }),
        ];
      }),
      sig({ y: 0.92 }),
    ],
  }, { tags: 'stack tools أدوات', transition: 'tiles' }),

  // ================================================================== flow
  tpl('tech-flow-gmail', 'إيميل ← ملخص', 'flow', {
    duration: 7, bg: { type: 'plexus', count: 60 }, camera: { type: 'panR', amount: 0.6 },
    elements: [
      tag('// workflow · email', { y: 0.08 }),
      text('إيميل بيوصل؟ بيتلخص *وبيتسجل* لحاله', { y: 0.2, size: 72, w: 900, anim: A('blurSlideR', 0.3, { split: 'word', stagger: 0.08 }) }),
      el('flow', { y: 0.46, w: 960, h: 260, nodeSize: 104, anim: A('none', 1.1, { stagger: 0.45 }), nodes: [
        { label: 'Gmail', icon: 'mail', x: 0.42, y: 0 },
        { label: 'Claude', icon: 'brain', x: 0.14, y: 0, hot: true },
        { label: 'Sheets', icon: 'grid', x: -0.14, y: 0 },
        { label: 'Slack', icon: 'message', x: -0.42, y: 0 },
      ] }),
      el('notify', { y: 0.72, w: 860, app: 'Slack', title: 'ملخص جديد بقناة #sales', body: 'عميل بيسأل عن باقة الشركات · أولوية عالية', icon: 'message', time: 'الآن', z: 0.4, anim: A('blurSlideL', 3.2) }),
      sig(),
    ],
  }, { tags: 'gmail slack sheets claude workflow', transition: 'slide' }),

  tpl('tech-flow-vertical', 'خط إنتاج عمودي', 'flow', {
    duration: 7, bg: { type: 'waves', lines: 18 }, camera: { type: 'rise', amount: 0.7 },
    elements: [
      text('كل دفعة = *رسالة شكر*', { y: 0.1, size: 76, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.1 }) }),
      el('flow', { x: 0.8, y: 0.56, w: 240, h: 880, nodeSize: 108, pulses: 2, anim: A('none', 1.0, { stagger: 0.5 }), nodes: [
        { label: '', icon: 'dollar', x: 0, y: -0.42 },
        { label: '', icon: 'brain', x: 0, y: -0.14, hot: true },
        { label: '', icon: 'grid', x: 0, y: 0.14 },
        { label: '', icon: 'message', x: 0, y: 0.42 },
      ] }),
      ...step('الدفع بيوصل', 'Stripe webhook', 0.264, 1.15),
      ...step('رسالة شكر مخصصة', 'Claude · 1.2s', 0.461, 1.65),
      ...step('بتتسجل بالشيت', 'Google Sheets', 0.659, 2.15),
      ...step('بتوصل للعميل', 'WhatsApp API', 0.856, 2.65),
    ],
  }, { tags: 'stripe whatsapp vertical pipeline دفع', transition: 'wipe' }),

  tpl('tech-flow-branch', 'فرز العملاء', 'flow', {
    duration: 7, bg: { type: 'contour' }, camera: { type: 'orbit', amount: 0.8 },
    elements: [
      text('الـ AI بيفرز العملاء *لحاله*', { y: 0.1, size: 74, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('flow', { y: 0.5, w: 900, h: 680, nodeSize: 112, pulses: 1, edges: [[0, 1], [1, 2], [1, 3], [1, 4]], anim: A('none', 0.9, { stagger: 0.42 }), nodes: [
        { label: 'Lead', icon: 'user', x: 0.4, y: 0 },
        { label: 'AI Score', icon: 'bot', x: 0.03, y: 0, hot: true },
        { label: 'Sales · Hot', icon: 'flame', x: -0.38, y: -0.38 },
        { label: 'Email · Warm', icon: 'mail', x: -0.38, y: 0 },
        { label: 'Nurture · Cold', icon: 'clock', x: -0.38, y: 0.38 },
      ] }),
      text('العميل الساخن بيوصل للمبيعات *خلال دقيقة*', { y: 0.88, size: 42, weight: 600, w: 900, anim: A('blurIn', 3.2) }),
    ],
  }, { tags: 'branch lead scoring فرز', transition: 'diamond' }),

  tpl('tech-flow-merge', '3 مصادر ← تقرير', 'flow', {
    duration: 7, bg: { type: 'tunnel', speed: 0.05 }, camera: { type: 'push', amount: 1 },
    elements: [
      veil({ y: 0.48, w: 1100, h: 900, alpha: 0.7 }),
      text('3 مصادر… *تقرير واحد*', { y: 0.1, size: 80, anim: A('zoomIn', 0.2, { dur: 0.9 }) }),
      el('flow', { y: 0.45, w: 920, h: 580, nodeSize: 108, pulses: 2, dashed: true, edges: [[0, 3], [1, 3], [2, 3], [3, 4]], anim: A('none', 0.9, { stagger: 0.35 }), nodes: [
        { label: 'Forms', icon: 'file', x: 0.42, y: -0.38 },
        { label: 'Calendly', icon: 'calendar', x: 0.42, y: 0 },
        { label: 'Stripe', icon: 'dollar', x: 0.42, y: 0.38 },
        { label: 'Claude', icon: 'brain', x: 0.02, y: 0, hot: true },
        { label: 'Report', icon: 'chart', x: -0.4, y: 0 },
      ] }),
      el('notify', { y: 0.8, w: 860, app: 'Gmail', title: 'التقرير اليومي جاهز', body: '14 حجز · 9 دفعات · 3 استفسارات جديدة', icon: 'mail', time: '08:00', z: 0.5, anim: A('rise', 3.1, { dur: 0.8 }) }),
    ],
  }, { tags: 'merge report تقرير', transition: 'ink' }),

  tpl('tech-flow-circle', 'دورة محتوى', 'flow', {
    duration: 7, bg: { type: 'rings', count: 7, speed: 0.08 }, camera: { type: 'orbit', amount: 0.6 },
    elements: [
      text('دورة محتوى *ما بتوقف*', { y: 0.085, size: 76, anim: A('maskDown', 0.2, { split: 'word', stagger: 0.1 }) }),
      el('icon', { name: 'refresh', y: 0.49, size: 110, color: '@accent', anim: A('spin', 0.4, { dur: 1, loop: 'spin', loopAmp: 0.45 }) }),
      text('content loop', { y: 0.565, size: 26, font: '@mono', weight: 500, color: '@muted', w: 400, anim: A('fade', 0.9) }),
      el('flow', { y: 0.5, w: 760, h: 760, nodeSize: 104, round: true, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], anim: A('none', 1.0, { stagger: 0.4 }), nodes: [
        { label: 'Idea', icon: 'bulb', x: 0, y: -0.38 },
        { label: '', icon: 'brain', x: 0.361, y: -0.117, hot: true },
        { label: 'Canva', icon: 'image', x: 0.223, y: 0.307 },
        { label: 'LinkedIn', icon: 'send', x: -0.223, y: 0.307 },
        { label: '', icon: 'chart', x: -0.361, y: -0.117 },
      ] }),
      text('Claude', { x: 0.774, y: 0.36, size: 26, font: '@mono', weight: 600, w: 300, anim: A('fade', 1.5) }),
      text('Analytics', { x: 0.226, y: 0.36, size: 26, font: '@mono', weight: 600, w: 300, anim: A('fade', 2.7) }),
      text('فكرة وحدة ← 5 بوستات بالأسبوع', { y: 0.88, size: 46, weight: 600, anim: A('riseBlur', 3.2, { split: 'word', stagger: 0.07 }) }),
    ],
  }, { tags: 'loop circle content محتوى', transition: 'spin' }),

  tpl('tech-flow-stripe', 'درج الدفع', 'flow', {
    duration: 7, bg: { type: 'gradient', angle: 200, drift: true }, camera: { type: 'dolly', amount: 0.8 },
    elements: [
      text('من الدفع… للفاتورة *بثانية*', { y: 0.09, size: 74, anim: A('skew', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('flow', { y: 0.47, w: 860, h: 720, nodeSize: 112, round: true, pulses: 2, anim: A('none', 0.8, { stagger: 0.45 }), nodes: [
        { label: 'Stripe', icon: 'dollar', x: 0.38, y: -0.38 },
        { label: 'Webhook', icon: 'bolt', x: 0.13, y: -0.13, hot: true },
        { label: 'Invoice PDF', icon: 'file', x: -0.13, y: 0.13 },
        { label: 'Email', icon: 'send', x: -0.38, y: 0.38 },
      ] }),
      el('counter', { y: 0.83, to: 12480, prefix: '$', style: 'roll', font: '@mono', size: 120, color: '@accent', glow: 0.4, anim: A('riseBlur', 2.7) }),
      text('إيرادات هالشهر · صفر شغل يدوي', { y: 0.915, size: 34, weight: 500, color: '@muted', anim: A('fade', 3.4) }),
    ],
  }, { tags: 'stripe invoice payments فاتورة', transition: 'whip' }),

  tpl('tech-flow-n8n', 'كانفس n8n', 'flow', {
    duration: 8, bg: { type: 'dots', size: 40, wave: false }, camera: { type: 'drift', amount: 0.5 },
    elements: [
      text('كبسة… *والـ workflow شغّال*', { y: 0.09, size: 66, w: 920, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      text('Execute Workflow', { y: 0.2, size: 34, weight: 700, color: '@ink', box: { fill: '@accent', padX: 40, padY: 16 }, anim: A('pop', 0.8, { dur: 0.6, loop: 'pulse' }) }),
      el('corners', { y: 0.42, w: 1000, h: 330, len: 46, strokeW: 4, all: true, color: '@fg/0.35', anim: A('draw', 1.0) }),
      el('flow', { y: 0.42, w: 940, h: 220, nodeSize: 100, anim: A('none', 1.3, { stagger: 0.4 }), nodes: [
        { label: 'Schedule', icon: 'clock', x: 0.42, y: 0 },
        { label: 'HTTP Request', icon: 'globe', x: 0.14, y: 0 },
        { label: 'Code', icon: 'code', x: -0.14, y: 0 },
        { label: 'Sheets', icon: 'grid', x: -0.42, y: 0, hot: true },
      ] }),
      el('code', { mode: 'terminal', y: 0.74, w: 920, size: 27, title: 'execution log', cps: 34, anim: A('riseSoft', 3.0), lines: [
        '$ n8n execute --id 42',
        '✓ Schedule Trigger   0.01s',
        '✓ HTTP Request       0.42s',
        '✓ Code               0.03s',
        '✓ Google Sheets      0.38s',
      ] }),
    ],
  }, { tags: 'n8n canvas execute log', transition: 'fade' }),

  tpl('tech-flow-hub', 'محور AI', 'flow', {
    duration: 7, bg: { type: 'radial', y: 0.5, size: 0.7 }, camera: { type: 'push', amount: 1.1 },
    elements: [
      text('محور AI واحد… *بيوزّع* كل شي', { y: 0.1, size: 72, anim: A('track', 0.2, { dur: 1 }) }),
      glowAt(0.5, 0.48, { w: 560, h: 560, alpha: 0.3 }),
      el('flow', { y: 0.48, w: 920, h: 640, nodeSize: 100, round: true, pulses: 2, edges: [[0, 3], [1, 3], [2, 3], [3, 4], [3, 5], [3, 6]], anim: A('none', 0.9, { stagger: 0.3 }), nodes: [
        { label: 'Gmail', icon: 'mail', x: 0.42, y: -0.34 },
        { label: 'Forms', icon: 'file', x: 0.42, y: 0 },
        { label: 'WhatsApp', icon: 'message', x: 0.42, y: 0.34 },
        { label: 'Claude', icon: 'brain', x: 0, y: 0, hot: true },
        { label: 'CRM', icon: 'database', x: -0.42, y: -0.34 },
        { label: 'Slack', icon: 'bell', x: -0.42, y: 0 },
        { label: 'Sheets', icon: 'grid', x: -0.42, y: 0.34 },
      ] }),
      text('6 أدوات · صفر نسخ ولصق', { y: 0.86, size: 48, weight: 700, anim: A('maskUp', 3.2) }),
    ],
  }, { tags: 'hub ai routing محور', transition: 'zoom' }),

  // ================================================================== ui
  tpl('tech-ui-whatsapp', 'واتساب بيزنس', 'ui', {
    duration: 8.5, bg: { type: 'solid' }, camera: { type: 'drift', amount: 0.5 }, fx: { grain: 0.8, vignette: 0.4 },
    elements: [
      shape('rect', { y: 0.5, w: 720, h: 1080, radius: 72, fill: '@card', stroke: '@fg/0.12', strokeW: 2, shadow: 1, anim: A('riseBlur', 0.2, { dur: 1 }) }),
      el('chat', { y: 0.5, w: 640, h: 940, size: 32, interval: 1.0, header: { name: 'متجر نور', status: 'online' }, anim: A('none', 0.9), messages: [
        { me: false, text: 'مرحبا، الطلب رقم 1042 وين صار؟' },
        { me: true, text: 'أهلين! طلبك بالطريق، بيوصل *بكرا* قبل الضهر' },
        { me: false, text: 'ممتاز، فيني غيّر العنوان؟' },
        { me: true, text: 'أكيد، ابعتلي العنوان الجديد وبحدّثه فوراً' },
      ] }),
    ],
  }, { tags: 'whatsapp chat phone محادثة', transition: 'cover' }),

  tpl('tech-ui-notifs', 'إشعارات الصبح', 'ui', {
    duration: 6.5, bg: { type: 'mesh', traffic: 1.2 }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('صباح عادي… *والنظام شغال*', { y: 0.09, size: 74, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('notify', { y: 0.27, w: 880, z: 0.1, app: 'Stripe', title: 'دفعة جديدة 250$', body: 'اشتراك شهري · باقة Pro', icon: 'dollar', time: '07:58', anim: A('drop', 0.7, { dur: 0.7 }) }),
      el('notify', { y: 0.44, w: 880, z: 0.25, app: 'Gmail', title: 'رد تلقائي انبعت', body: 'على استفسار من شركة الريم', icon: 'mail', time: '08:03', anim: A('drop', 1.4, { dur: 0.7 }) }),
      el('notify', { y: 0.61, w: 880, z: 0.4, app: 'Calendar', title: 'موعد انحجز', body: 'الخميس 11:00 · مكالمة تعارف', icon: 'calendar', time: '08:12', anim: A('drop', 2.1, { dur: 0.7 }) }),
      el('notify', { y: 0.78, w: 880, z: 0.55, app: 'Slack', title: 'تقرير الصبح جاهز', body: '12 Lead جديد · 3 منهم Hot', icon: 'message', time: '08:30', anim: A('drop', 2.8, { dur: 0.7 }) }),
      sig({ y: 0.935, size: 26 }),
    ],
  }, { tags: 'notifications stack إشعارات', transition: 'cover' }),

  tpl('tech-ui-email', 'إيميل الفاتورة', 'ui', {
    duration: 7, bg: { type: 'bokeh', count: 22 }, camera: { type: 'push', amount: 0.9 },
    elements: [
      text('الفاتورة بتوصل *لحالها*', { y: 0.11, size: 80, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.1 }) }),
      shape('rect', { y: 0.55, w: 900, h: 760, radius: 40, glass: true, shadow: 1, anim: A('pushIn', 0.5, { dur: 1 }) }),
      el('icon', { name: 'mail', x: 0.8, y: 0.335, size: 56, color: '@ink', bg: '@accent', strokeW: 2.2, anim: A('pop', 1.0) }),
      text('Stripe Billing', { x: 0.5, y: 0.318, size: 38, weight: 700, w: 440, align: 'right', anim: A('riseSoft', 1.2) }),
      text('billing@stripe.com', { x: 0.5, y: 0.355, size: 24, font: '@mono', weight: 400, w: 440, align: 'right', color: '@muted', anim: A('riseSoft', 1.3) }),
      text('فاتورتك لشهر أكتوبر جاهزة', { x: 0.5, y: 0.44, size: 52, w: 780, align: 'start', anim: A('riseBlur', 1.5, { split: 'word', stagger: 0.07 }) }),
      text('مرحبا نور، انصدرت فاتورة اشتراكك الشهري وانبعتت تلقائياً.', { x: 0.5, y: 0.52, size: 36, weight: 400, w: 780, align: 'start', color: '@muted', lineHeight: 1.6, anim: A('fade', 2.1) }),
      el('counter', { x: 0.7, y: 0.63, to: 1250, prefix: '$', style: 'roll', font: '@mono', size: 104, color: '@accent', anim: A('riseBlur', 2.4) }),
      text('عرض الفاتورة', { x: 0.5, y: 0.765, size: 38, weight: 700, color: '@ink', box: { fill: '@accent', padX: 46, padY: 18 }, anim: A('pop', 3.3, { dur: 0.6, loop: 'pulse' }) }),
    ],
  }, { tags: 'email invoice إيميل فاتورة', transition: 'circle' }),

  tpl('tech-ui-typing', 'الوكيل عم يكتب', 'ui', {
    duration: 6.5, bg: { type: 'spotlight' }, camera: { type: 'punch', amount: 0.5 }, fx: { vignette: 0.5 },
    elements: [
      text('سألت الوكيل سؤال…', { y: 0.13, size: 80, caret: true, anim: A('typewriter', 0.2, { dur: 1.1 }) }),
      el('chat', { y: 0.5, w: 900, size: 44, interval: 1.5, gap: 34, anim: A('none', 1.2), messages: [
        { me: true, text: 'شو أحسن وقت أنشر فيه على لينكدإن؟' },
        { me: false, text: 'بين 8 و 10 الصبح. وبوستات الفيديو عندك بتاخد *3x* تفاعل.' },
      ] }),
      el('icon', { name: 'bot', y: 0.8, size: 74, color: '@accent', bg: '@accent/0.14', anim: A('pop', 0.9, { loop: 'pulse' }) }),
      status('AI agent · online', { x: 0.5, y: 0.89, anim: A('fade', 1.2) }),
    ],
  }, { tags: 'typing ai chat سؤال', transition: 'fade' }),

  tpl('tech-ui-review', 'رأي عميل', 'ui', {
    duration: 6, bg: { type: 'rays', count: 22, speed: 0.05 }, camera: { type: 'drift', amount: 0.7 },
    elements: [
      tag('// رأي عميل', { y: 0.09 }),
      el('icon', { name: 'star', y: 0.18, size: 60, repeat: 5, gap: 18, filled: true, color: '@accent', anim: A('pop', 0.4, { stagger: 0.1 }) }),
      text('من أول أسبوع وفّر علينا *20 ساعة* شغل يدوي. الأتمتة صارت جزء من الفريق.', { y: 0.42, size: 50, weight: 600, w: 780, lineHeight: 1.6, box: { fill: '@card', padX: 56, padY: 44, radius: 40, shadow: true }, anim: A('pushIn', 1.0, { dur: 0.9 }) }),
      el('image', { y: 0.67, w: 150, h: 150, mask: 'circle', border: '@accent', borderW: 5, anim: A('pop', 2.0) }),
      text('ليلى حداد', { y: 0.765, size: 42, weight: 700, anim: A('riseSoft', 2.3) }),
      text('مديرة عمليات · شركة الريم', { y: 0.81, size: 30, weight: 400, color: '@muted', anim: A('riseSoft', 2.5) }),
      sig({ y: 0.92 }),
    ],
  }, { tags: 'review testimonial رأي', transition: 'zoom' }),

  tpl('tech-ui-search', 'بحث بيكتب', 'ui', {
    duration: 7, bg: { type: 'aurora' }, camera: { type: 'pull', amount: 0.8 },
    elements: [
      text('اسأل أي شي… *وخذ جواب جاهز*', { y: 0.13, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('pill', { y: 0.3, w: 900, h: 130, glass: true, shadow: 0.8, anim: A('growC', 0.5, { dur: 0.8 }) }),
      el('icon', { name: 'search', x: 0.86, y: 0.3, size: 52, color: '@accent', anim: A('pop', 0.9) }),
      text('كيف أأتمت الرد على الإيميلات؟', { x: 0.44, y: 0.3, size: 42, weight: 500, w: 640, align: 'start', caret: true, anim: A('typewriter', 1.0, { dur: 1.8 }) }),
      text('3 نتائج · 0.4s', { y: 0.405, size: 26, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 2.9) }),
      el('list', { y: 0.6, w: 860, size: 38, gap: 40, icon: 'sparkles', items: ['workflow جاهز: Gmail ← Claude ← رد تلقائي', 'قالب برومبت للردود الرسمية', 'فيديو شرح خطوة بخطوة · 6 دقائق'], anim: A('blurSlideR', 3.1, { stagger: 0.3 }) }),
      sig({ y: 0.9 }),
    ],
  }, { tags: 'search typing بحث', transition: 'blur' }),

  tpl('tech-ui-command', 'لوحة الأوامر', 'ui', {
    duration: 6.5, bg: { type: 'grid', size: 46, speed: 6 }, camera: { type: 'orbit', amount: 0.5 },
    elements: [
      text('Ctrl+K… وكل شي صار *أسرع*', { y: 0.1, size: 68, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('rect', { y: 0.55, w: 880, h: 760, radius: 30, fill: '@window', stroke: '@windowFg/0.1', strokeW: 1.5, shadow: 1, anim: A('zoomOut', 0.5, { dur: 0.8 }) }),
      text('> create workflow', { x: 0.5, y: 0.3, size: 38, font: '@mono', weight: 500, w: 760, align: 'left', color: '@windowFg', caret: true, caretColor: '@windowAccent', anim: A('typewriter', 1.0, { dur: 1.0 }) }),
      shape('line', { y: 0.355, w: 820, h: 2, strokeW: 1.5, stroke: '@windowFg/0.12', anim: A('grow', 1.2) }),
      shape('rect', { y: 0.5, w: 820, h: 76, radius: 14, fill: '@windowAccent/0.14', anim: A('wipeR', 2.6, { dur: 0.5 }) }),
      ...[['plus', 'New workflow', 'Ctrl+N'], ['play', 'Run last execution', 'Ctrl+R'], ['key', 'Open credentials', 'Ctrl+E'], ['layers', 'Duplicate node', 'Ctrl+D'], ['search', 'Search templates', 'Ctrl+T']].flatMap(([ic, lab, kb], i) => {
        const y = 0.42 + i * 0.08;
        return [
          el('icon', { name: ic, x: 0.15, y, size: 36, color: '@windowAccent', anim: A('fade', 1.6 + i * 0.12) }),
          text(lab, { x: 0.47, y, size: 34, font: '@mono', weight: i === 1 ? 700 : 400, w: 540, align: 'left', color: i === 1 ? '@windowFg' : '@windowFg/0.7', anim: A('riseSoft', 1.6 + i * 0.12) }),
          text(kb, { x: 0.79, y, size: 24, font: '@mono', weight: 500, w: 180, align: 'right', color: '@windowFg/0.45', anim: A('fade', 1.8 + i * 0.12) }),
        ];
      }),
      text('↑↓ navigate · Enter run', { y: 0.815, size: 22, font: '@mono', weight: 400, color: '@windowFg/0.4', anim: A('fade', 2.6) }),
    ],
  }, { tags: 'command palette shortcuts أوامر', transition: 'flip' }),

  tpl('tech-ui-bubbles', 'فقاعات الردود', 'ui', {
    duration: 6, bg: { type: 'radial', y: 0.45 }, camera: { type: 'drift', amount: 0.8 },
    elements: [
      el('particles', { kind: 'dust', count: 50, w: 1000, h: 1300, anim: A('fade', 0.2, { dur: 1 }) }),
      tag('// شهر أكتوبر', { y: 0.08 }),
      bubble('شكراً على السرعة!', 0.3, 0.2, { z: 0.6, rot: -4, anim: A('pop', 1.4, { loop: 'float', phase: 0 }) }),
      bubble('تم الحجز', 0.76, 0.27, { z: -0.3, rot: 3, color: '@ink', box: { fill: '@accent', padX: 30, padY: 18, radius: 26 }, anim: A('pop', 1.7, { loop: 'float', phase: 1.5 }) }),
      el('counter', { y: 0.46, to: 1248, style: 'roll', font: '@mono', size: 230, color: '@accent', glow: 0.5, countDur: 2, anim: A('riseBlur', 0.3) }),
      text('رسالة انردّت تلقائياً هالشهر', { y: 0.6, size: 56, weight: 700, anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.07 }) }),
      bubble('وين صار طلبي؟', 0.72, 0.75, { z: 0.4, rot: 4, anim: A('pop', 2.0, { loop: 'drift', phase: 0.7 }) }),
      bubble('الرد وصل بثواني', 0.3, 0.83, { z: 0.8, rot: -3, anim: A('pop', 2.3, { loop: 'float', phase: 2.2 }) }),
    ],
  }, { tags: 'bubbles counter replies ردود', transition: 'zoom' }),

  // ================================================================== mockup
  tpl('tech-mock-launch', 'إطلاق الموقع', 'mockup', {
    duration: 6.5, bg: { type: 'floor', horizon: 0.64, speed: 0.5 }, camera: { type: 'rise', amount: 0.8 },
    elements: [
      text('موقعي الجديد *لايف*', { y: 0.09, size: 88, anim: A('stretch', 0.2, { dur: 0.8 }) }),
      text('صمّمته وبنيته بأسبوع', { y: 0.165, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 0.8) }),
      el('device', { kind: 'browser', y: 0.5, w: 940, h: 640, url: 'nouraldeentofi.com', z: 0.2, anim: A('tilt', 0.6, { dur: 1.1 }) }),
      el('particles', { kind: 'burst', y: 0.48, w: 1000, h: 1000, count: 90, anim: A('none', 1.7) }),
      status('live', { x: 0.5, y: 0.8, size: 34, anim: A('pop', 1.8) }),
    ],
  }, { tags: 'website launch browser موقع', transition: 'zoomThrough' }),

  tpl('tech-mock-phone-cards', 'جوال وبطاقات', 'mockup', {
    duration: 6, bg: { type: 'blobs', speed: 0.8 }, camera: { type: 'orbit', amount: 0.8 },
    elements: [
      text('تطبيق واحد… *نتائج حقيقية*', { y: 0.085, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('device', { kind: 'phone', y: 0.555, w: 400, h: 820, z: 0.1, anim: A('riseBlur', 0.4, { dur: 1.1 }) }),
      ...statCard(0.24, 0.35, '+38%', 'مبيعات هالشهر', 1.4, 0),
      ...statCard(0.76, 0.72, '4 ثواني', 'أسرع رد', 2.0, 1.6),
    ],
  }, { tags: 'phone cards stats جوال', transition: 'cube' }),

  tpl('tech-mock-laptop', 'لابتوب ولوحة', 'mockup', {
    duration: 6.5, bg: { type: 'spotlight', speed: 0.6 }, camera: { type: 'push', amount: 0.9 },
    elements: [
      text('لوحة تحكم *بتحكيلك* كل شي', { y: 0.085, size: 70, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('device', { kind: 'browser', y: 0.46, w: 980, h: 620, url: 'app.nouraldeentofi.com', anim: A('pushIn', 0.4, { dur: 1 }) }),
      shape('rect', { y: 0.715, w: 1080, h: 26, radius: 13, fill: '@raised', stroke: '@fg/0.1', strokeW: 1, anim: A('growC', 0.5, { dur: 0.9 }) }),
      el('notify', { x: 0.66, y: 0.26, w: 600, z: 0.7, app: 'Stripe', title: 'طلب جديد +420$', body: 'تم الدفع والشحن تلقائياً', icon: 'dollar', time: 'الآن', anim: A('drop', 1.6, { loop: 'float' }) }),
      shape('rect', { x: 0.28, y: 0.8, w: 440, h: 270, radius: 30, glass: true, shadow: 0.8, z: 0.5, anim: A('flipX', 2.2, { dur: 0.8, loop: 'float', phase: 1 }) }),
      el('bars', { x: 0.28, y: 0.805, w: 340, h: 180, values: [22, 35, 30, 52, 70], showValues: false, z: 0.5, anim: A('fade', 2.6, { stagger: 0.1, loop: 'float', phase: 1 }) }),
    ],
  }, { tags: 'laptop dashboard browser لابتوب', transition: 'split' }),

  tpl('tech-mock-showcase', 'عرض تطبيق بإطار', 'mockup', {
    duration: 6.5, bg: { type: 'grid', size: 72 }, camera: { type: 'panL', amount: 0.5 },
    elements: [
      el('corners', { x: 0.7, y: 0.52, w: 470, h: 880, len: 56, strokeW: 5, all: true, anim: A('draw', 0.3, { dur: 0.9 }) }),
      el('device', { kind: 'phone', x: 0.7, y: 0.52, w: 380, h: 780, z: 0.2, anim: A('tilt', 0.5, { dur: 1 }) }),
      tag('// v2.0', { x: 0.26, y: 0.18, w: 400 }),
      text('تطبيق *حجوزات*', { x: 0.26, y: 0.27, size: 60, w: 400, align: 'start', anim: A('maskLeft', 0.8, { split: 'line' }) }),
      el('list', { x: 0.26, y: 0.53, w: 400, size: 30, gap: 34, icon: 'check', items: ['حجز بـ 3 كبسات', 'تذكير تلقائي على واتساب', 'دفع أونلاين آمن', 'لوحة إدارة للمالك'], anim: A('blurSlideL', 1.4, { stagger: 0.25 }) }),
      status('live on App Store', { x: 0.26, y: 0.8, anim: A('fade', 2.8) }),
    ],
  }, { tags: 'app showcase phone frame عرض', transition: 'stripes' }),

  tpl('tech-mock-dashboard', 'داشبورد كامل', 'mockup', {
    duration: 7, bg: { type: 'dots', size: 48 }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      shape('rect', { y: 0.53, w: 960, h: 1040, radius: 40, glass: true, shadow: 1, anim: A('pushIn', 0.2, { dur: 1 }) }),
      text('لوحة الأداء · أكتوبر', { x: 0.55, y: 0.17, size: 40, weight: 700, w: 700, align: 'start', anim: A('riseSoft', 0.6) }),
      status('live', { x: 0.17, y: 0.17, anim: A('fade', 0.7) }),
      ...[[0.78, 1248, '', 'Leads'], [0.5, 38, '%', 'تحويل'], [0.22, 4.2, 's', 'زمن الرد']].flatMap(([x, to, suffix, lab], i) => [
        el('counter', { x, y: 0.285, to, suffix, decimals: to % 1 ? 1 : 0, font: '@mono', size: 80, color: i === 0 ? '@accent' : '@fg', anim: A('riseBlur', 1.0 + i * 0.2) }),
        text(lab, { x, y: 0.345, size: 26, weight: 500, w: 260, color: '@muted', anim: A('fade', 1.2 + i * 0.2) }),
      ]),
      el('linechart', { y: 0.55, w: 840, h: 290, values: [14, 22, 19, 31, 28, 40, 47, 63], tip: '+63', anim: A('fade', 1.8) }),
      el('donut', { x: 0.28, y: 0.81, w: 220, value: 0.72, sub: 'هدف الشهر', anim: A('pop', 2.6) }),
      el('bars', { x: 0.66, y: 0.815, w: 460, h: 220, values: [30, 45, 38, 62, 80, 74], showValues: false, anim: A('fade', 2.8, { stagger: 0.08 }) }),
    ],
  }, { tags: 'dashboard analytics داشبورد', transition: 'panel' }),

  tpl('tech-mock-photo', 'صورة منتج + جوال', 'mockup', {
    duration: 6, bg: { type: 'image', dim: 0.55, kenburns: 0.1 }, camera: { type: 'push', amount: 0.8 },
    elements: [
      el('particles', { kind: 'sparkle', count: 30, w: 1000, h: 1300, anim: A('fade', 0.5, { dur: 1 }) }),
      el('device', { kind: 'phone', x: 0.71, y: 0.53, w: 360, h: 740, rot: 6, z: 0.3, anim: A('zoomRot', 0.3, { dur: 1.1 }) }),
      text('وصل *الجديد*', { x: 0.27, y: 0.34, size: 92, w: 420, align: 'start', anim: A('riseBlur', 0.8, { split: 'word', stagger: 0.1 }) }),
      text('حط صورة منتجك كخلفية وجرّب', { x: 0.27, y: 0.47, size: 38, weight: 400, w: 400, align: 'start', color: '@muted', lineHeight: 1.5, anim: A('riseSoft', 1.4) }),
      text('اطلب هلق', { x: 0.27, y: 0.6, size: 40, weight: 700, color: '@ink', box: { fill: '@accent', padX: 46, padY: 18 }, anim: A('pop', 2.0, { dur: 0.6, loop: 'heartbeat' }) }),
    ],
  }, { tags: 'photo product image صورة منتج', transition: 'ink' }),

  tpl('tech-mock-appstore', 'التطبيق نزل', 'mockup', {
    duration: 6, bg: { type: 'stars', count: 200, speed: 0.6 }, camera: { type: 'pull', amount: 0.9 },
    elements: [
      text('التطبيق نزل على *المتجر*', { y: 0.09, size: 76, anim: A('letterDrop', 0.2, { split: 'word', stagger: 0.09 }) }),
      el('icon', { name: 'star', y: 0.18, size: 50, repeat: 5, gap: 14, filled: true, color: '@accent', anim: A('pop', 1.0, { stagger: 0.08 }) }),
      glowAt(0.5, 0.58, { alpha: 0.24 }),
      el('device', { kind: 'phone', y: 0.585, w: 400, h: 820, rot: -6, anim: A('bounce', 0.6, { dur: 1.1 }) }),
      el('icon', { name: 'rocket', x: 0.77, y: 0.33, size: 92, color: '@ink', bg: '@accent', z: 0.6, anim: A('popRotate', 1.6, { loop: 'float' }) }),
      text('تقييم 4.9', { x: 0.24, y: 0.82, size: 34, font: '@mono', weight: 700, w: 360, z: 0.6, box: { fill: '@card', padX: 28, padY: 14, radius: 22, shadow: true }, anim: A('blurSlideL', 2.0, { loop: 'float', phase: 1.4 }) }),
    ],
  }, { tags: 'app store launch rocket تطبيق', transition: 'spin' }),
];
