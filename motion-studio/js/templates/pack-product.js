// Product pack: tech, automation flows, interface moments, mockups and business scenes.
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl, bgp } from './kit.js';

// accent pill with ink text
const pill = (t, x, y, o = {}) => text(t, { x, y, size: 30, weight: 700, color: '@ink', w: 700, box: { fill: '@accent', padX: 28, padY: 12 }, ...o });
// quiet chip that reads on every theme
const chip = (t, x, y, o = {}) => text(t, { x, y, size: 28, weight: 600, color: '@fg', w: 700, box: { fill: '@fg/0.08', padX: 26, padY: 12, stroke: '@fg/0.14', strokeW: 2 }, ...o });
const card = (x, y, w, h, o = {}) => shape('rect', { x, y, w, h, radius: 30, glass: true, shadow: 0.8, ...o });
const mono = (t, x, y, o = {}) => text(t, { x, y, font: '@mono', size: 26, weight: 500, color: '@muted', w: 700, ...o });
const solid = (x, y, w, h, o = {}) => shape('rect', { x, y, w, h, radius: 24, fill: '@fg/0.06', ...o });

export const PRODUCT = [
  // ================================================================== tech
  tpl('pr-tech-webhook', 'Webhook بيصير مهمة', 'tech', {
    duration: 8, bg: bgp('blueprint-draft'), camera: { type: 'craneDown', amount: 0.5 },
    elements: [
      tag('// webhook · POST', { x: 0.5, y: 0.085 }),
      text('كل طلب بيوصل… بيتحوّل لـ *مهمة*', { y: 0.165, size: 60, w: 900, anim: A('maskUp', 0.2, { split: 'line', stagger: 0.15, dur: 0.9 }) }),
      el('code', { y: 0.405, w: 820, size: 28, title: 'POST /hooks/new-order', cps: 44, rot: 1.5, z: 0.3, sfx: 'data', anim: A('flipX', 0.7, { dur: 0.9 }), lines: [
        '{',
        '  "event": "order.created",',
        '  "id": 1042,',
        '  "total": 249,',
        '  "email": "sara@mail.com"',
        '}',
      ] }),
      shape('arrow', { x: 0.5, y: 0.6, w: 120, h: 44, rot: 90, strokeW: 9, stroke: '@accent', sfx: 'swish', anim: A('draw', 2.6, { dur: 0.6 }) }),
      el('list', { y: 0.77, w: 780, size: 40, icon: 'check', sfx: 'pop-soft', items: ['فاتورة بـ *Stripe*', 'إيميل تأكيد للعميل', 'تحديث المخزون'], anim: A('rise', 3.1, { stagger: 0.35 }) }),
      sig({ y: 0.94, size: 26 }),
    ],
  }, { tags: 'webhook json api ويب هوك', transition: 'glitch-scan' }),

  tpl('pr-tech-sql', 'اسأل الداتا بالعربي', 'tech', {
    duration: 8, bg: bgp('grid-fine'), camera: { type: 'dollyIn', amount: 0.45 },
    elements: [
      text('اسأل الداتا بالعربي… والوكيل بيكتب *SQL*', { y: 0.13, size: 56, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('code', { y: 0.37, w: 900, size: 28, title: 'query.sql', cps: 40, anim: A('unfold', 0.6, { dur: 0.7 }), lines: [
        'SELECT city, COUNT(*) AS orders',
        'FROM orders',
        'WHERE created_at > NOW() - 7',
        'GROUP BY city',
        'ORDER BY orders DESC;',
      ] }),
      el('bars', { y: 0.725, w: 820, h: 340, values: [128, 96, 74, 51, 33], labels: ['الرياض', 'جدة', 'دبي', 'عمّان', 'الدوحة'], hi: 0, sfx: 'blip', anim: A('fade', 3.8, { stagger: 0.12 }) }),
      status('query · 0.08s', { x: 0.5, y: 0.93, anim: A('fade', 4.6) }),
    ],
  }, { tags: 'sql database data داتا استعلام', transition: 'tiles-fade-diag' }),

  tpl('pr-tech-agent-trace', 'سجل تفكير الوكيل', 'tech', {
    duration: 9, bg: bgp('matrix-fine'), camera: { type: 'pushSlow', amount: 0.8 }, fx: { vignette: 0.4 },
    elements: [
      status('agent · thinking', { x: 0.25, y: 0.065 }),
      tag('// trace', { x: 0.8, y: 0.065 }),
      text('هيك بيفكّر *الوكيل* قبل ما يرد', { y: 0.155, size: 70, w: 900, anim: A('blurIn', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('code', { mode: 'terminal', y: 0.5, w: 920, size: 28, title: 'agent.log', cps: 36, anim: A('pushIn', 0.6, { dur: 0.8 }), lines: [
        '$ agent.run("summarize today")',
        '> thought: need orders from CRM',
        '> tool: crm.search(date=today)',
        '> result: 37 orders',
        '> thought: group by status',
        '> tool: sheets.append(report)',
        '✓ summary sent to Slack',
      ] }),
      el('progress', { y: 0.79, w: 760, value: 1, label: 'خطوات الوكيل', anim: A('fade', 5.6) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'agent log reasoning وكيل تفكير', transition: 'glitch-rgb' }),

  tpl('pr-tech-secrets', 'مفاتيح بأمان', 'tech', {
    duration: 6, bg: bgp('hex-small'), camera: { type: 'handLight', amount: 0.6 },
    elements: [
      glowAt(0.5, 0.24, { alpha: 0.24, w: 700, h: 700 }),
      el('icon', { name: 'lock', y: 0.235, size: 150, bg: '@card', color: '@accent', strokeW: 1.8, sfx: 'switch', anim: A('elastic', 0.2, { dur: 1, loop: 'heartbeat', loopAmp: 0.6 }) }),
      text('مفاتيحك *بأمان*… مو جوّا الكود', { y: 0.45, size: 72, w: 900, anim: A('maskUp', 0.7, { split: 'word', stagger: 0.08 }) }),
      el('code', { y: 0.7, w: 880, size: 28, title: '.env', cps: 52, lineNumbers: false, anim: A('riseSoft', 1.3), lines: [
        'OPENAI_API_KEY=sk-••••••••••••',
        'STRIPE_SECRET=rk_live_••••••••',
        'DB_URL=postgres://••••@db:5432',
        '# loaded from vault at runtime',
      ] }),
      status('vault · encrypted', { x: 0.5, y: 0.9, anim: A('fade', 3.2) }),
    ],
  }, { tags: 'security secrets env أمان مفاتيح', transition: 'iris-open' }),

  tpl('pr-tech-git', 'فروع Git', 'tech', {
    duration: 7, bg: bgp('circuit-classic'), camera: { type: 'panL', amount: 0.6 },
    elements: [
      tag('// git · main', { x: 0.5, y: 0.08 }),
      text('كل ميزة بفرع لحالها… والدمج *بثقة*', { y: 0.17, size: 58, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('line', { x: 0.5, y: 0.5, w: 860, h: 10, strokeW: 8, stroke: '@fg/0.35', anim: A('draw', 0.6, { dur: 1.3 }) }),
      shape('line', { x: 0.5, y: 0.38, w: 230, h: 10, strokeW: 8, stroke: '@accent', anim: A('draw', 1.5, { dur: 0.6 }) }),
      shape('line', { x: 0.338, y: 0.44, w: 150, h: 10, strokeW: 8, stroke: '@accent', rot: -48, anim: A('draw', 1.2, { dur: 0.4 }) }),
      shape('line', { x: 0.662, y: 0.44, w: 150, h: 10, strokeW: 8, stroke: '@accent', rot: 48, anim: A('draw', 2.0, { dur: 0.4 }) }),
      shape('circle', { x: 0.14, y: 0.5, w: 46, fill: '@fg', anim: A('pop', 0.7) }),
      shape('circle', { x: 0.27, y: 0.5, w: 46, fill: '@fg', anim: A('pop', 0.95) }),
      shape('circle', { x: 0.44, y: 0.38, w: 46, fill: '@accent', sfx: 'click-soft', anim: A('pop', 1.6) }),
      shape('circle', { x: 0.56, y: 0.38, w: 46, fill: '@accent', anim: A('pop', 1.85) }),
      shape('circle', { x: 0.73, y: 0.5, w: 58, fill: '@accent', glow: 0.8, sfx: 'success', anim: A('pop', 2.4, { loop: 'pulse' }) }),
      shape('circle', { x: 0.86, y: 0.5, w: 46, fill: '@fg', anim: A('pop', 2.7) }),
      mono('init', 0.14, 0.552, { size: 24, anim: A('fade', 0.9) }),
      mono('api', 0.27, 0.552, { size: 24, anim: A('fade', 1.1) }),
      mono('feat: agent', 0.5, 0.33, { size: 24, color: '@accent', anim: A('fade', 1.9) }),
      mono('merge', 0.73, 0.555, { size: 24, anim: A('fade', 2.6) }),
      mono('v1.0', 0.86, 0.552, { size: 24, anim: A('fade', 2.9) }),
      el('notify', { y: 0.76, w: 840, app: 'GitHub', title: 'Pull request merged', body: 'الـ CI مرّ… والنسخة الجديدة صارت live', icon: 'branch', time: 'الآن', anim: A('drop', 3.4, { dur: 0.7 }) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'git branch merge جيت فروع', transition: 'wipe-line-0' }),

  tpl('pr-tech-latency', 'أسرع بعشر مرات', 'tech', {
    duration: 7, bg: bgp('streaks-side'), camera: { type: 'zoomBounce', amount: 0.45 },
    elements: [
      tag('// performance', { x: 0.5, y: 0.08 }),
      text('نفس الوكيل… بس *أسرع بعشر مرات*', { y: 0.185, size: 66, w: 900, anim: A('slam', 0.2, { split: 'word', stagger: 0.09, dur: 0.6 }) }),
      card(0.73, 0.42, 420, 330, { anim: A('flipY', 0.8, { dur: 0.8 }) }),
      card(0.27, 0.42, 420, 330, { stroke: '@accent', strokeW: 2, anim: A('flipY', 1.1, { dur: 0.8 }) }),
      text('قبل', { x: 0.73, y: 0.345, size: 36, color: '@muted', anim: A('fade', 1.1) }),
      text('بعد', { x: 0.27, y: 0.345, size: 36, color: '@accent', anim: A('fade', 1.4) }),
      el('counter', { x: 0.73, y: 0.44, from: 0, to: 4.2, decimals: 1, suffix: 's', font: '@mono', size: 120, color: '@muted', countDur: 1.2, anim: A('fade', 1.2) }),
      el('counter', { x: 0.27, y: 0.44, from: 4.2, to: 0.4, decimals: 1, suffix: 's', font: '@mono', size: 120, color: '@accent', glow: 0.5, countDur: 1.6, sfx: 'zap', anim: A('fade', 1.6) }),
      el('equalizer', { y: 0.67, w: 820, h: 130, bars: 32, color: '@accent', anim: A('fade', 2.6) }),
      text('caching + streaming + أدوات أقل', { y: 0.8, size: 36, font: '@mono', weight: 500, color: '@muted', anim: A('riseSoft', 3.2) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'performance speed latency سرعة أداء', transition: 'zoom-punch' }),

  tpl('pr-tech-schedule', 'جدول المهام', 'tech', {
    duration: 8, bg: bgp('graph-paper'), camera: { type: 'kbTL', amount: 0.45 },
    elements: [
      text('الوكيل بيشتغل *حسب الجدول*', { y: 0.15, size: 66, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.09 }) }),
      ...['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((d, i) => mono(d, 0.5 + (3 - i) * 0.117, 0.295, { size: 22, w: 120, anim: A('fade', 0.5 + i * 0.05) })),
      ...[0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => {
        const on = (r === 0 && c === 0) || (r === 1 && c === 2) || (r === 0 && c === 4) || (r === 2 && c === 6) || (r === 2 && c === 1);
        return solid(0.5 + (3 - c) * 0.117, 0.38 + r * 0.1, 112, 112, { radius: 22, fill: on ? '@accent' : '@fg/0.06', glow: on ? 0.4 : 0, sfx: on ? 'tick-wood' : 'none', anim: A('pop', on ? 1.6 + (r * 7 + c) * 0.05 : 0.6 + (r * 7 + c) * 0.025, { dur: 0.5 }) });
      })),
      el('icon', { name: 'chart', x: 0.851, y: 0.38, size: 54, color: '@ink', strokeW: 2.4, anim: A('pop', 1.8) }),
      el('icon', { name: 'mail', x: 0.617, y: 0.48, size: 54, color: '@ink', strokeW: 2.4, anim: A('pop', 2.1) }),
      el('icon', { name: 'database', x: 0.383, y: 0.38, size: 54, color: '@ink', strokeW: 2.4, anim: A('pop', 2.0) }),
      el('icon', { name: 'dollar', x: 0.149, y: 0.58, size: 54, color: '@ink', strokeW: 2.4, anim: A('pop', 2.6) }),
      el('icon', { name: 'refresh', x: 0.734, y: 0.58, size: 54, color: '@ink', strokeW: 2.4, anim: A('pop', 2.4) }),
      el('list', { y: 0.79, w: 800, size: 34, icon: 'clock', gap: 24, items: ['تقرير المبيعات كل يوم 08:00', 'تنظيف الـ CRM كل اثنين', 'فواتير آخر الشهر لحالها'], anim: A('blurSlideR', 3.0, { stagger: 0.3 }) }),
    ],
  }, { tags: 'schedule cron calendar جدول مواعيد', transition: 'tiles-scale-rows' }),

  tpl('pr-tech-prompt-diff', 'برومبت قبل وبعد', 'tech', {
    duration: 7, bg: bgp('binary-flow'), camera: { type: 'tiltDown', amount: 0.7 },
    elements: [
      text('برومبت ضعيف ← برومبت *قوي*', { y: 0.1, size: 68, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      mono('// قبل', 0.5, 0.195, { anim: A('fade', 0.5) }),
      el('code', { y: 0.29, w: 860, size: 28, title: 'prompt_v1.txt', cps: 60, rot: -1.5, opacity: 0.7, lineNumbers: false, anim: A('riseSoft', 0.5), lines: ['write a reply to the customer'] }),
      shape('arrow', { x: 0.5, y: 0.405, w: 100, h: 40, rot: 90, strokeW: 8, stroke: '@accent', sfx: 'whoosh-down', anim: A('draw', 1.4, { dur: 0.5 }) }),
      el('code', { y: 0.6, w: 900, size: 28, title: 'prompt_v2.txt', cps: 75, hiLine: 1, anim: A('pushIn', 1.8, { dur: 0.8 }), lines: [
        'Role: support agent for an online store',
        'Tone: warm, short, Levantine Arabic',
        'Context: order #1042, delayed 2 days',
        'Goal: apologise + offer free shipping',
        'Format: max 3 sentences',
      ] }),
      text('النتيجة: ردود أدق بـ *3 أضعاف*', { y: 0.84, size: 46, weight: 700, hl: 'marker', anim: A('pop', 4.1) }),
    ],
  }, { tags: 'prompt engineering برومبت ذكاء', transition: 'slices-5' }),

  // ================================================================== flow
  tpl('pr-flow-support', 'تذكرة دعم محلولة', 'flow', {
    duration: 8, bg: bgp('mesh-flow'), camera: { type: 'drift', amount: 0.8 },
    elements: [
      tag('// support bot', { x: 0.78, y: 0.065 }),
      status('24/7', { x: 0.2, y: 0.065 }),
      text('تذكرة دعم… *محلولة* قبل قهوتك', { y: 0.155, size: 64, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('notify', { y: 0.33, w: 820, app: 'Helpdesk', title: 'تذكرة #318: الطلب ما وصل', body: 'وصلت من العميل الساعة 02:14 بالليل', icon: 'mail', time: '02:14', sfx: 'notify', anim: A('drop', 0.9, { dur: 0.7 }) }),
      el('flow', { y: 0.585, w: 900, h: 230, nodeSize: 104, pulses: 2, anim: A('none', 2.0, { stagger: 0.5 }), nodes: [
        { label: 'Ticket', icon: 'mail', x: 0.42, y: 0 },
        { label: 'Classify', icon: 'brain', x: 0.14, y: 0 },
        { label: 'Docs', icon: 'file', x: -0.14, y: 0 },
        { label: 'Reply', icon: 'send', x: -0.42, y: 0, hot: true },
      ] }),
      pill('مستعجل', 0.7, 0.8, { anim: A('pop', 4.3) }),
      chip('شحن', 0.5, 0.8, { anim: A('pop', 4.45) }),
      chip('فوترة', 0.3, 0.8, { anim: A('pop', 4.6) }),
      mono('وقت الرد: 40 ثانية', 0.5, 0.895, { size: 30, anim: A('fade', 4.6) }),
    ],
  }, { tags: 'support helpdesk ticket دعم تذاكر', transition: 'panel2-90' }),

  tpl('pr-flow-shop', 'درج طلب المتجر', 'flow', {
    duration: 9, bg: bgp('iso-grid'), camera: { type: 'craneUp', amount: 0.7 },
    elements: [
      text('طلب جديد بالمتجر… *5 خطوات* بدون ولا كبسة', { y: 0.125, size: 58, w: 900, anim: A('maskUp', 0.2, { split: 'line', stagger: 0.14 }) }),
      el('flow', { y: 0.49, w: 900, h: 540, nodeSize: 96, dashed: true, pulses: 1, anim: A('none', 0.9, { stagger: 0.45 }), nodes: [
        { label: 'Order', icon: 'cart', x: 0.4, y: -0.38 },
        { label: 'Payment', icon: 'dollar', x: 0.2, y: -0.19, hot: true },
        { label: 'Stock', icon: 'box', x: 0, y: 0 },
        { label: 'Shipping', icon: 'rocket', x: -0.2, y: 0.19 },
        { label: 'SMS', icon: 'message', x: -0.4, y: 0.38 },
      ] }),
      el('counter', { y: 0.83, to: 1240, suffix: '+', font: '@mono', size: 110, color: '@accent', glow: 0.4, anim: A('riseBlur', 3.4) }),
      text('طلب بالشهر بدون تدخل', { y: 0.905, size: 34, weight: 500, color: '@muted', anim: A('fade', 3.8) }),
    ],
  }, { tags: 'ecommerce shop order متجر طلبات', transition: 'cube-up' }),

  tpl('pr-flow-approval', 'موافقة بكبسة', 'flow', {
    duration: 8, bg: bgp('radial-top'), camera: { type: 'orbitIn', amount: 0.4 },
    elements: [
      text('الوكيل بيحضّر… وإنت *بتوافق* بس', { y: 0.13, size: 60, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('flow', { y: 0.36, w: 900, h: 220, nodeSize: 108, anim: A('none', 0.8, { stagger: 0.45 }), nodes: [
        { label: 'Request', icon: 'file', x: 0.38, y: 0 },
        { label: 'AI Draft', icon: 'bot', x: 0, y: 0 },
        { label: 'Approve', icon: 'check', x: -0.38, y: 0, hot: true },
      ] }),
      el('notify', { y: 0.6, w: 840, app: 'Slack', title: 'بانتظار موافقتك', body: 'عرض سعر لشركة النخبة بقيمة $4,800', icon: 'bell', time: 'الآن', sfx: 'ding', anim: A('pop', 2.6, { dur: 0.6 }) }),
      pill('موافق', 0.63, 0.75, { size: 36, box: { fill: '@accent', padX: 48, padY: 16 }, sfx: 'click-ui', anim: A('pop', 3.4, { loop: 'pulse' }) }),
      chip('رفض', 0.37, 0.75, { size: 36, box: { fill: '@fg/0.08', padX: 48, padY: 16, stroke: '@fg/0.14', strokeW: 2 }, anim: A('pop', 3.55) }),
      status('human in the loop', { x: 0.5, y: 0.88, anim: A('fade', 4) }),
    ],
  }, { tags: 'approval human in the loop موافقة', transition: 'door-v' }),

  tpl('pr-flow-mcp-rack', 'رف أدوات MCP', 'flow', {
    duration: 8, bg: bgp('plexus-dense'), camera: { type: 'dollyLeft', amount: 0.6 },
    elements: [
      tag('// MCP', { x: 0.5, y: 0.07 }),
      text('وكيل واحد… وكل أدواتك *موصولة*', { y: 0.155, size: 64, w: 900, anim: A('blurSlideR', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('flow', { y: 0.54, w: 900, h: 600, nodeSize: 92, round: true, pulses: 2, edges: [[0, 4], [1, 4], [2, 4], [3, 4]], anim: A('none', 0.9, { stagger: 0.3 }), nodes: [
        { label: 'Gmail', icon: 'mail', x: 0.36, y: -0.36 },
        { label: 'Calendar', icon: 'calendar', x: 0.36, y: -0.12 },
        { label: 'Notion', icon: 'file', x: 0.36, y: 0.12 },
        { label: 'Postgres', icon: 'database', x: 0.36, y: 0.36 },
        { label: 'Claude', icon: 'brain', x: -0.36, y: 0, hot: true },
      ] }),
      text('MCP = بروتوكول واحد لكل الأدوات', { y: 0.885, size: 36, weight: 500, color: '@muted', anim: A('fade', 3.2) }),
    ],
  }, { tags: 'mcp tools claude agent أدوات', transition: 'carousel-left' }),

  tpl('pr-flow-sync', 'مزامنة بالاتجاهين', 'flow', {
    duration: 7, bg: bgp('aurora-north'), camera: { type: 'sway', amount: 0.8 },
    elements: [
      text('الشيت والـ CRM… *دايماً متطابقين*', { y: 0.14, size: 64, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('icon', { name: 'grid', x: 0.83, y: 0.47, size: 96, bg: '@card', bgShape: 'square', color: '@accent', anim: A('pop', 0.7) }),
      el('icon', { name: 'database', x: 0.17, y: 0.47, size: 96, bg: '@card', bgShape: 'square', color: '@accent', anim: A('pop', 0.9) }),
      shape('line', { x: 0.5, y: 0.43, w: 470, h: 10, strokeW: 7, stroke: '@accent', dash: [18, 14], dashSpeed: -70, anim: A('wipeL', 1.3, { dur: 0.7 }) }),
      shape('line', { x: 0.5, y: 0.51, w: 470, h: 10, strokeW: 7, stroke: '@secondary', dash: [18, 14], dashSpeed: 70, anim: A('wipeR', 1.6, { dur: 0.7 }) }),
      shape('chevron', { x: 0.27, y: 0.43, w: 26, h: 40, rot: 180, strokeW: 7, stroke: '@accent', anim: A('pop', 1.9) }),
      shape('chevron', { x: 0.73, y: 0.51, w: 26, h: 40, strokeW: 7, stroke: '@secondary', anim: A('pop', 2.2) }),
      mono('Google Sheets', 0.83, 0.585, { anim: A('fade', 1) }),
      mono('HubSpot CRM', 0.17, 0.585, { anim: A('fade', 1.2) }),
      text('0', { x: 0.7, y: 0.74, size: 130, font: '@mono', color: '@accent', glow: 0.4, anim: A('slam', 2.8, { dur: 0.5 }) }),
      text('5s', { x: 0.3, y: 0.74, size: 130, font: '@mono', color: '@fg', anim: A('slam', 3.1, { dur: 0.5 }) }),
      text('تكرار', { x: 0.7, y: 0.83, size: 32, color: '@muted', weight: 500, anim: A('fade', 3.2) }),
      text('بين كل مزامنة', { x: 0.3, y: 0.83, size: 32, color: '@muted', weight: 500, anim: A('fade', 3.4) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'sync sheets crm مزامنة', transition: 'push-cards-left' }),

  tpl('pr-flow-ocr', 'فاتورة PDF لبيانات', 'flow', {
    duration: 8, bg: bgp('barcode-scan'), camera: { type: 'pushSmooth', amount: 0.7 },
    elements: [
      text('فاتورة PDF ← بيانات *جاهزة* بالمحاسبة', { y: 0.11, size: 60, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('rect', { x: 0.74, y: 0.44, w: 360, h: 470, radius: 22, fill: '@card', shadow: 1, rot: 3, anim: A('tilt', 0.6, { dur: 0.9 }) }),
      mono('INVOICE #A-2291', 0.74, 0.29, { size: 26, color: '@fg', rot: 3, anim: A('fade', 1) }),
      ...[0, 1, 2, 3, 4].map((i) => shape('rect', { x: 0.735 + i * 0.002, y: 0.35 + i * 0.05, w: i % 2 ? 240 : 290, h: 16, radius: 8, fill: '@fg/0.15', rot: 3, anim: A('wipeR', 1 + i * 0.08, { dur: 0.4 }) })),
      shape('rect', { x: 0.74, y: 0.44, w: 360, h: 470, radius: 22, fill: '@accent/0.16', stroke: '@accent', strokeW: 3, rot: 3, sfx: 'scan', anim: A('wipeDown', 1.6, { dur: 1.4, ease: 'linear' }) }),
      shape('arrow', { x: 0.5, y: 0.44, w: 110, h: 40, rot: 180, strokeW: 8, stroke: '@accent', anim: A('draw', 2.8, { dur: 0.5 }) }),
      el('list', { x: 0.24, y: 0.44, w: 420, size: 30, gap: 26, icon: 'check', sfx: 'blip', items: ['المورد: *ACME*', 'المبلغ: *$1,250*', 'التاريخ: 12/10', 'الضريبة: 15%'], anim: A('blurSlideR', 3.1, { stagger: 0.3 }) }),
      el('notify', { y: 0.8, w: 820, app: 'Xero', title: 'انضافت للمحاسبة', body: 'بدون إدخال يدوي… ولا غلطة', icon: 'check', time: 'الآن', sfx: 'cash', anim: A('drop', 4.8, { dur: 0.7 }) }),
    ],
  }, { tags: 'ocr invoice pdf فاتورة محاسبة', transition: 'wipe-glow-90' }),

  tpl('pr-flow-retry', 'لما شي يخرب', 'flow', {
    duration: 8, bg: bgp('contour-topo'), camera: { type: 'handMedium', amount: 0.5 },
    elements: [
      text('حتى لما شي *يخرب*… الأتمتة بتكمّل', { y: 0.13, size: 56, w: 900, anim: A('glitch', 0.2, { dur: 0.9 }) }),
      el('flow', { y: 0.36, w: 900, h: 220, nodeSize: 108, anim: A('none', 0.8, { stagger: 0.5 }), nodes: [
        { label: 'API', icon: 'cloud', x: 0.38, y: 0 },
        { label: 'Retry ×3', icon: 'refresh', x: 0, y: 0 },
        { label: 'Fallback', icon: 'shield', x: -0.38, y: 0, hot: true },
      ] }),
      el('icon', { name: 'x', x: 0.89, y: 0.305, size: 34, bg: '#FF4D5E', color: '#FFFFFF', strokeW: 3, sfx: 'error', anim: A('pop', 1.3, { loop: 'wiggle' }) }),
      el('list', { y: 0.6, w: 720, size: 38, icon: 'num', gap: 26, items: ['محاولة 1: فشلت', 'محاولة 2: فشلت', 'محاولة 3: *نجحت*'], sfx: 'tick', anim: A('rise', 2.5, { stagger: 0.45 }) }),
      el('notify', { y: 0.84, w: 820, app: 'Slack', title: 'تنبيه للفريق', body: 'عطل بالـ API… والوكيل حلّه لحاله', icon: 'bell', time: 'الآن', anim: A('drop', 4.4, { dur: 0.7 }) }),
    ],
  }, { tags: 'error retry fallback أخطاء', transition: 'glitch-tear' }),

  tpl('pr-flow-booking', 'من الفورم للموعد', 'flow', {
    duration: 8, bg: bgp('notebook-ruled'), camera: { type: 'tiltUp', amount: 0.6 },
    elements: [
      text('من الفورم للموعد… *بدقيقة وحدة*', { y: 0.12, size: 58, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('timeline', { y: 0.5, w: 820, h: 620, size: 38, sfx: 'tick-soft', anim: A('none', 0.8, { stagger: 0.45 }), items: [
        { t: 'العميل عبّى الفورم', s: '09:00:00' },
        { t: 'الوكيل قيّم الطلب', s: '09:00:04' },
        { t: 'انحجز الموعد بالتقويم', s: '09:00:09' },
        { t: 'رابط Zoom وصل للعميل', s: '09:00:12' },
        { t: 'تذكير قبل بساعة', s: '09:59:00' },
      ] }),
      status('booked automatically', { x: 0.5, y: 0.9, anim: A('fade', 3.6) }),
    ],
  }, { tags: 'booking calendar form حجز موعد', transition: 'page-left' }),

  // ================================================================== ui
  tpl('pr-ui-voice', 'رسالة صوتية بتنكتب', 'ui', {
    duration: 8, bg: bgp('smoke-faint'), camera: { type: 'hover', amount: 0.7 },
    elements: [
      text('رسالة صوتية… *بتنكتب* لحالها', { y: 0.13, size: 70, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('pill', { x: 0.5, y: 0.34, w: 800, h: 150, fill: '@card', shadow: 0.9, anim: A('pop', 0.6, { dur: 0.6 }) }),
      el('icon', { name: 'play', x: 0.8, y: 0.34, size: 44, bg: '@accent', color: '@ink', filled: true, anim: A('pop', 0.9) }),
      el('equalizer', { x: 0.45, y: 0.34, w: 480, h: 80, bars: 30, color: '@accent', anim: A('fade', 1.0) }),
      mono('0:42', 0.17, 0.34, { anim: A('fade', 1.1) }),
      card(0.5, 0.62, 860, 300, { anim: A('unfold', 1.6, { dur: 0.6 }) }),
      mono('// transcript', 0.5, 0.52, { color: '@accent', anim: A('fade', 1.9) }),
      text('مرحبا، بدي أعرف إذا الطلب تبعي بيوصل قبل الخميس؟ ضروري كتير.', { y: 0.63, size: 40, weight: 500, w: 760, sfx: 'type-soft', anim: A('typewriter', 2.1, { dur: 2.4 }) }),
      status('voice → text → reply', { x: 0.5, y: 0.86, anim: A('fade', 4.8) }),
    ],
  }, { tags: 'voice transcription صوت تفريغ', transition: 'ripple' }),

  tpl('pr-ui-inbox', 'صندوق الوارد مفروز', 'ui', {
    duration: 8, bg: bgp('grad-soft'), camera: { type: 'panUp', amount: 0.6 },
    elements: [
      text('100 رسالة… الوكيل *فرزها* بثانية', { y: 0.1, size: 68, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      ...[
        ['سارة الخطيب', 'الطلب ما وصل لهلق…', '02:14', '@accent', ['عاجل', true]],
        ['شركة النخبة', 'بدنا عرض سعر لـ 3 فروع', '08:40', '@secondary', ['بيع', false]],
        ['أحمد', 'كيف بغيّر كلمة السر؟', '09:05', '@fg/0.35', ['سؤال', false]],
        ['Promo Bot', 'اربح جوال مجاناً!!!', '09:12', '@muted', ['سبام', false]],
      ].flatMap(([name, prev, time, av, [lab, hot]], i) => {
        const y = 0.27 + i * 0.125, st = 0.5 + i * 0.15;
        return [
          shape('rect', { x: 0.5, y, w: 920, h: 150, radius: 26, fill: '@fg/0.06', anim: A('rise', st, { dur: 0.6 }) }),
          shape('circle', { x: 0.865, y, w: 84, fill: av, anim: A('pop', st + 0.1) }),
          text(name, { x: 0.55, y: y - 0.022, size: 32, weight: 700, w: 520, align: 'start', anim: A('fade', st + 0.15) }),
          text(prev, { x: 0.55, y: y + 0.022, size: 26, weight: 400, w: 520, align: 'start', color: '@muted', anim: A('fade', st + 0.2) }),
          mono(time, 0.12, y - 0.025, { size: 22, w: 140, anim: A('fade', st + 0.2) }),
          hot ? pill(lab, 0.15, y + 0.02, { size: 24, box: { fill: '@accent', padX: 20, padY: 8 }, sfx: 'pop-soft', anim: A('pop', 2.4 + i * 0.25) })
            : chip(lab, 0.15, y + 0.02, { size: 24, box: { fill: '@fg/0.08', padX: 20, padY: 8 }, sfx: 'pop-soft', anim: A('pop', 2.4 + i * 0.25) }),
        ];
      }),
      status('auto-triage', { x: 0.5, y: 0.8, anim: A('fade', 3.6) }),
      text('وفّرت ساعة كل صبح', { y: 0.87, size: 40, weight: 700, color: '@accent', anim: A('riseSoft', 3.9) }),
    ],
  }, { tags: 'inbox email triage إيميل فرز', transition: 'stack-up' }),

  tpl('pr-ui-form', 'الوكيل عبّى الفورم', 'ui', {
    duration: 8, bg: bgp('grid-faint'), camera: { type: 'stepZoom', amount: 0.6 },
    elements: [
      text('الوكيل *عبّى* الفورم عنك', { y: 0.1, size: 76, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      card(0.5, 0.5, 860, 760, { radius: 36, anim: A('pushIn', 0.4, { dur: 0.8 }) }),
      ...[['الاسم', 'سارة الخطيب'], ['الإيميل', 'sara@store.com'], ['الجوال', '+966 5• ••• ••••'], ['النشاط', 'متجر إلكتروني · 12 موظف']].flatMap(([lab, val], i) => {
        const y = 0.24 + i * 0.13;
        return [
          text(lab, { x: 0.5, y, size: 26, weight: 600, color: '@muted', w: 740, align: 'start', anim: A('fade', 0.8 + i * 0.1) }),
          shape('rect', { x: 0.5, y: y + 0.045, w: 760, h: 82, radius: 16, fill: '@bg/0.55', stroke: '@fg/0.15', strokeW: 2, anim: A('fade', 0.9 + i * 0.1) }),
          text(val, { x: 0.5, y: y + 0.045, size: 32, weight: 600, w: 700, align: 'start', sfx: 'type-soft', anim: A('typewriter', 1.4 + i * 0.6, { dur: 0.55 }) }),
        ];
      }),
      pill('إرسال', 0.5, 0.765, { size: 36, box: { fill: '@accent', padX: 70, padY: 16 }, sfx: 'success', anim: A('pop', 4.2) }),
    ],
  }, { tags: 'form autofill فورم تعبئة', transition: 'tiles-flip-rows' }),

  tpl('pr-ui-slack', 'قناة التقارير', 'ui', {
    duration: 8, bg: bgp('mesh-busy'), camera: { type: 'drone', amount: 0.6 },
    elements: [
      text('الوكيل بيبعت *التقارير* للفريق', { y: 0.1, size: 68, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('rect', { x: 0.5, y: 0.53, w: 920, h: 780, radius: 30, fill: '@card', shadow: 1, anim: A('riseSoft', 0.4) }),
      shape('rect', { x: 0.5, y: 0.255, w: 920, h: 90, radius: 30, fill: '@fg/0.06', anim: A('fade', 0.5) }),
      mono('# sales-reports', 0.5, 0.255, { size: 30, color: '@fg', anim: A('fade', 0.6) }),
      ...[
        ['تقرير المبيعات: *$12,480* اليوم', '+12'],
        ['Lead جديد: شركة النخبة… أولوية عالية', '+5'],
        ['كل فواتير الشهر *اندفعت*', '+21'],
      ].flatMap(([msg, react], i) => {
        const y = 0.36 + i * 0.165, st = 1.2 + i * 0.9;
        return [
          shape('rect', { x: 0.865, y, w: 70, h: 70, radius: 16, fill: '@accent', sfx: 'message-in', anim: A('pop', st) }),
          text('n8n bot', { x: 0.52, y: y - 0.022, size: 26, weight: 700, w: 560, align: 'start', anim: A('fade', st + 0.05) }),
          text(msg, { x: 0.52, y: y + 0.02, size: 30, weight: 500, w: 560, align: 'start', anim: A('riseSoft', st + 0.1) }),
          chip(react, 0.71, y + 0.072, { size: 22, box: { fill: '@fg/0.08', padX: 16, padY: 6 }, anim: A('pop', st + 0.5) }),
        ];
      }),
    ],
  }, { tags: 'slack channel reports تقارير فريق', transition: 'cover-up' }),

  tpl('pr-ui-otp', 'رمز التحقق', 'ui', {
    duration: 7, bg: bgp('galaxy-corner'), camera: { type: 'vertigo', amount: 0.35 },
    elements: [
      text('رمز التحقق وصل…\nوالوكيل *كمّل التسجيل*', { y: 0.13, size: 58, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      el('device', { kind: 'phone', y: 0.575, w: 400, h: 820, anim: A('riseBlur', 0.3, { dur: 1 }) }),
      el('notify', { y: 0.35, w: 660, app: 'SMS', title: 'رمز التحقق', body: 'رمزك: 482913', icon: 'message', time: 'الآن', z: 0.5, sfx: 'notify-soft', anim: A('drop', 1.2, { dur: 0.6 }) }),
      shape('rect', { x: 0.5, y: 0.58, w: 340, h: 150, radius: 26, fill: '@bg', stroke: '@accent', strokeW: 3, z: 0.5, anim: A('pop', 1.9) }),
      el('counter', { y: 0.58, to: 482913, sep: false, style: 'roll', font: '@mono', size: 80, color: '@accent', z: 0.5, countDur: 1.4, anim: A('fade', 2.0) }),
      el('icon', { name: 'check', y: 0.74, size: 70, bg: '@accent', color: '@ink', strokeW: 3, z: 0.5, sfx: 'success', anim: A('pop', 3.8) }),
    ],
  }, { tags: 'otp sms verification رمز تحقق', transition: 'flip-y' }),

  tpl('pr-ui-compose', 'إيميل جاهز للإرسال', 'ui', {
    duration: 8, bg: bgp('paper-plain'), camera: { type: 'kbBR', amount: 0.4 },
    elements: [
      text('الوكيل كتب الإيميل… إنت بس *بعته*', { y: 0.12, size: 54, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.07 }) }),
      shape('rect', { x: 0.5, y: 0.53, w: 900, h: 830, radius: 28, fill: '@card', shadow: 1, anim: A('riseSoft', 0.4) }),
      text('رسالة جديدة', { x: 0.5, y: 0.23, size: 32, weight: 700, w: 820, align: 'start', anim: A('fade', 0.6) }),
      chip('AI draft', 0.2, 0.23, { size: 22, color: '@accent', box: { fill: '@accent/0.14', padX: 18, padY: 8 }, anim: A('pop', 0.9) }),
      text('إلى: أحمد، مدير العمليات', { x: 0.5, y: 0.29, size: 28, weight: 500, w: 820, align: 'start', color: '@muted', anim: A('fade', 0.8) }),
      text('الموضوع: عرض الأتمتة الشهري', { x: 0.5, y: 0.34, size: 28, weight: 500, w: 820, align: 'start', color: '@muted', anim: A('fade', 0.9) }),
      shape('line', { x: 0.5, y: 0.372, w: 820, h: 4, strokeW: 2, stroke: '@fg/0.12', anim: A('draw', 1) }),
      text('أهلين أحمد،\nحسب حديثنا، جهّزتلك عرض لأتمتة الطلبات والفواتير. التكلفة الشهرية $490 وبنبلش خلال أسبوع.\nتحياتي، نور', { x: 0.5, y: 0.51, size: 32, weight: 400, w: 820, align: 'start', lineHeight: 1.7, anim: A('typewriter', 1.3, { dur: 3.2 }) }),
      chip('proposal.pdf', 0.7, 0.755, { size: 24, font: '@mono', box: { fill: '@fg/0.06', padX: 22, padY: 10, radius: 12, stroke: '@fg/0.14', strokeW: 2 }, anim: A('rise', 3.6) }),
      pill('إرسال', 0.24, 0.84, { size: 34, box: { fill: '@accent', padX: 56, padY: 16 }, sfx: 'whoosh-up', anim: A('pop', 4.8) }),
    ],
  }, { tags: 'email compose draft إيميل', transition: 'fold-v' }),

  tpl('pr-ui-rating', 'تقييم العملاء', 'ui', {
    duration: 7, bg: bgp('bokeh-few'), camera: { type: 'figure8', amount: 0.6 },
    elements: [
      text('تقييم العملاء بعد *الوكيل*', { y: 0.1, size: 66, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('counter', { y: 0.26, to: 4.9, decimals: 1, font: '@mono', size: 200, color: '@accent', glow: 0.4, anim: A('pushIn', 0.4) }),
      el('icon', { name: 'star', y: 0.385, size: 60, repeat: 5, gap: 14, filled: true, color: '@accent', sfx: 'sparkle', anim: A('pop', 1.0, { stagger: 0.1 }) }),
      text('من 1,280 تقييم', { y: 0.45, size: 32, weight: 500, color: '@muted', anim: A('fade', 1.6) }),
      el('bars', { y: 0.68, w: 820, h: 330, orient: 'h', labelW: 70, values: [82, 12, 4, 1, 1], labels: ['5', '4', '3', '2', '1'], suffix: '%', hi: 0, anim: A('fade', 2.0, { stagger: 0.12 }) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'rating reviews stars تقييم نجوم', transition: 'bubbles-star' }),

  tpl('pr-ui-calendar', 'يوم مرتّب', 'ui', {
    duration: 8, bg: bgp('squares-calm'), camera: { type: 'craneUpPush', amount: 0.4 },
    elements: [
      text('يومك *مرتّب* قبل ما تصحى', { y: 0.11, size: 66, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      card(0.5, 0.55, 880, 860, { radius: 32, anim: A('pushIn', 0.3) }),
      ...['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].flatMap((tm, i) => [
        mono(tm, 0.86, 0.25 + i * 0.1, { size: 22, w: 120, anim: A('fade', 0.6 + i * 0.05) }),
        shape('line', { x: 0.45, y: 0.25 + i * 0.1, w: 680, h: 4, strokeW: 2, stroke: '@fg/0.08', anim: A('draw', 0.6 + i * 0.05) }),
      ]),
      shape('rect', { x: 0.45, y: 0.3, w: 660, h: 96, radius: 18, fill: '@fg/0.1', anim: A('unfold', 1.2) }),
      text('اجتماع الفريق', { x: 0.45, y: 0.3, size: 30, weight: 600, w: 600, align: 'start', anim: A('fade', 1.4) }),
      shape('rect', { x: 0.45, y: 0.5, w: 660, h: 150, radius: 18, fill: '@accent', glow: 0.5, sfx: 'ding', anim: A('unfold', 2.2) }),
      text('مكالمة مع عميل جديد', { x: 0.45, y: 0.485, size: 34, weight: 800, w: 600, align: 'start', color: '@ink', anim: A('fade', 2.5) }),
      text('حجزها الوكيل · Zoom', { x: 0.45, y: 0.525, size: 24, weight: 600, w: 600, align: 'start', color: '@ink', anim: A('fade', 2.7) }),
      shape('rect', { x: 0.45, y: 0.7, w: 660, h: 96, radius: 18, fill: '@fg/0.1', anim: A('unfold', 1.6) }),
      text('مراجعة التقارير', { x: 0.45, y: 0.7, size: 30, weight: 600, w: 600, align: 'start', anim: A('fade', 1.8) }),
    ],
  }, { tags: 'calendar day schedule تقويم يوم', transition: 'blinds-v-8' }),

  // ================================================================== mockup
  tpl('pr-mock-twophones', 'تصميم قبل وبعد', 'mockup', {
    duration: 7, bg: bgp('holo-pastel'), camera: { type: 'orbitOut', amount: 0.4 },
    elements: [
      text('قبل التصميم الجديد… *وبعده*', { y: 0.12, size: 56, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('device', { kind: 'phone', x: 0.7, y: 0.55, w: 330, h: 680, rot: 6, opacity: 0.7, z: -0.2, screen: '@raised', anim: A('blurSlideR', 0.4, { dur: 0.9 }) }),
      el('device', { kind: 'phone', x: 0.31, y: 0.53, w: 380, h: 780, rot: -5, z: 0.3, anim: A('blurSlideL', 0.8, { dur: 0.9 }) }),
      el('particles', { kind: 'sparkle', x: 0.31, y: 0.52, w: 520, h: 900, count: 16, anim: A('fade', 1.6) }),
      chip('قبل', 0.7, 0.88, { anim: A('pop', 1.8) }),
      pill('بعد', 0.31, 0.9, { sfx: 'sparkle', anim: A('pop', 2.1) }),
    ],
  }, { tags: 'redesign app before after تصميم', transition: 'cardfly-left' }),

  tpl('pr-mock-site-cursor', 'موقع بيبيع وإنت نايم', 'mockup', {
    duration: 8, bg: bgp('floor-nosun'), camera: { type: 'dollyRight', amount: 0.6 },
    elements: [
      text('موقع بيبيع… وإنت *نايم*', { y: 0.1, size: 76, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.09 }) }),
      el('device', { kind: 'browser', y: 0.47, w: 920, h: 620, url: 'store.nouraldeentofi.com', anim: A('pushIn', 0.4, { dur: 0.9 }) }),
      shape('ring', { x: 0.62, y: 0.555, w: 90, stroke: '@accent', strokeW: 5, anim: A('pop', 2.9, { dur: 0.5, out: 'fade', outDur: 3.5 }) }),
      shape('triangle', { x: 0.64, y: 0.58, w: 40, h: 56, rot: -28, fill: '@fg', stroke: '@bg', strokeW: 4, sfx: 'click-mouse', sfxDelay: 0.9, anim: A('slideR', 2.0, { dur: 0.9, loop: 'drift', loopAmp: 0.4 }) }),
      el('notify', { y: 0.83, w: 800, app: 'Store', title: 'طلب جديد: $129', body: 'الساعة 03:12 فجراً', icon: 'cart', time: '03:12', sfx: 'cash', anim: A('drop', 3.6, { dur: 0.7 }) }),
    ],
  }, { tags: 'website store ecommerce موقع متجر', transition: 'zoom-through-br' }),

  tpl('pr-mock-phone-fan', 'تلات تجارب', 'mockup', {
    duration: 7, bg: bgp('stars-calm'), camera: { type: 'spiralIn', amount: 0.6 },
    elements: [
      text('تطبيق واحد… *3 تجارب*', { y: 0.1, size: 76, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.09 }) }),
      el('device', { kind: 'phone', x: 0.25, y: 0.57, w: 300, h: 620, rot: -12, z: -0.3, anim: A('flipY', 0.9, { dur: 0.8 }) }),
      el('device', { kind: 'phone', x: 0.75, y: 0.57, w: 300, h: 620, rot: 12, z: -0.3, anim: A('flipY', 1.1, { dur: 0.8 }) }),
      el('device', { kind: 'phone', x: 0.5, y: 0.55, w: 360, h: 740, z: 0.4, anim: A('riseBlur', 0.5, { dur: 1 }) }),
      text('iOS · Android · Web', { y: 0.915, size: 34, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 2) }),
    ],
  }, { tags: 'app ios android phones تطبيق جوال', transition: 'spin-flat' }),

  tpl('pr-mock-widgets', 'ودجات صغيرة', 'mockup', {
    duration: 7, bg: bgp('blobs-soft'), camera: { type: 'breath', amount: 0.8 },
    elements: [
      text('لوحة صغيرة… *فيها كل شي*', { y: 0.1, size: 70, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      card(0.71, 0.33, 420, 290, { radius: 40, anim: A('pop', 0.5) }),
      card(0.29, 0.33, 420, 290, { radius: 40, anim: A('pop', 0.65) }),
      card(0.71, 0.62, 420, 290, { radius: 40, anim: A('pop', 0.8) }),
      card(0.29, 0.62, 420, 290, { radius: 40, anim: A('pop', 0.95) }),
      text('مبيعات اليوم', { x: 0.71, y: 0.27, size: 28, weight: 600, color: '@muted', anim: A('fade', 0.9) }),
      el('counter', { x: 0.71, y: 0.35, to: 2340, prefix: '$', font: '@mono', size: 80, color: '@accent', anim: A('fade', 1) }),
      el('donut', { x: 0.29, y: 0.31, w: 170, value: 0.72, anim: A('pop', 1.1) }),
      text('من الهدف', { x: 0.29, y: 0.405, size: 24, weight: 500, color: '@muted', anim: A('fade', 1.3) }),
      el('linechart', { x: 0.71, y: 0.63, w: 340, h: 150, values: [8, 14, 11, 19, 17, 26, 31], dots: false, strokeW: 5, anim: A('fade', 1.3) }),
      el('icon', { name: 'bot', x: 0.29, y: 0.59, size: 74, color: '@accent', anim: A('pop', 1.5, { loop: 'float' }) }),
      status('3 agents', { x: 0.29, y: 0.675, size: 24, anim: A('fade', 1.7) }),
      shape('rect', { x: 0.5, y: 0.86, w: 860, h: 150, radius: 40, glass: true, anim: A('rise', 1.9) }),
      el('progress', { x: 0.5, y: 0.86, w: 760, value: 0.64, label: 'طلبات الأسبوع', anim: A('fade', 2.1) }),
    ],
  }, { tags: 'widgets dashboard ودجات لوحة', transition: 'tiles-scale-center' }),

  tpl('pr-mock-tabs', 'كل الأدوات بتبويب', 'mockup', {
    duration: 7, bg: bgp('mesh-grad'), camera: { type: 'pushFast', amount: 0.7 },
    elements: [
      text('كل أدواتك… *بتبويب واحد*', { y: 0.1, size: 72, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('device', { kind: 'browser', y: 0.53, w: 940, h: 640, url: 'dashboard.nouraldeentofi.com', anim: A('riseBlur', 0.5, { dur: 0.9 }) }),
      pill('CRM', 0.8, 0.235, { size: 26, sfx: 'tap', anim: A('slideR', 1.4, { dur: 0.5 }) }),
      chip('Inbox', 0.61, 0.235, { size: 26, anim: A('slideR', 1.55, { dur: 0.5 }) }),
      chip('Reports', 0.42, 0.235, { size: 26, anim: A('slideR', 1.7, { dur: 0.5 }) }),
      chip('Agents', 0.23, 0.235, { size: 26, anim: A('slideR', 1.85, { dur: 0.5 }) }),
      status('all synced', { x: 0.5, y: 0.88, anim: A('fade', 2.6) }),
    ],
  }, { tags: 'browser tabs saas تبويبات', transition: 'stretch-h' }),

  tpl('pr-mock-phone-chat', 'بوت جوّا التطبيق', 'mockup', {
    duration: 9, bg: bgp('nebula-faint'), camera: { type: 'dropIn', amount: 0.6 },
    elements: [
      text('بوت الدعم… *جوّا تطبيقك*', { y: 0.09, size: 72, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      el('device', { kind: 'phone', y: 0.56, w: 440, h: 900, anim: A('pushIn', 0.3, { dur: 0.9 }) }),
      shape('rect', { y: 0.56, w: 404, h: 864, radius: 53, fill: '@bg', anim: A('pushIn', 0.3, { dur: 0.9 }) }),
      el('chat', { y: 0.585, w: 360, h: 700, size: 26, interval: 1.1, anim: A('none', 1.3), messages: [
        { me: false, text: 'وين طلبي؟' },
        { me: true, text: 'طلبك #1042 طلع للشحن اليوم' },
        { me: false, text: 'إيمتى بيوصل؟' },
        { me: true, text: 'الخميس قبل الساعة 6' },
      ] }),
    ],
  }, { tags: 'in-app chat support bot بوت', transition: 'circle-bottom' }),

  tpl('pr-mock-billboard', 'إعلانك بكل مكان', 'mockup', {
    duration: 7, bg: bgp('halftone-pop'), camera: { type: 'craneDownPull', amount: 0.6 },
    elements: [
      veil({ y: 0.1, w: 1000, h: 300, alpha: 0.85 }),
      text('إعلانك *بكل مكان*', { y: 0.1, size: 80, w: 900, anim: A('slam', 0.2, { split: 'word', stagger: 0.12, dur: 0.6 }) }),
      el('image', { y: 0.44, w: 860, h: 560, radius: 12, kenburns: 0.1, anim: A('wipeR', 0.6, { dur: 0.8 }) }),
      el('corners', { y: 0.44, w: 900, h: 600, len: 80, strokeW: 6, all: true, anim: A('draw', 0.5, { dur: 0.8 }) }),
      el('ticker', { y: 0.76, w: 1300, text: 'AUTOMATE EVERYTHING', sep: '  •  ', size: 86, rows: 1, speed: 220, color: '@accent', anim: A('fade', 1.4) }),
      sig({ y: 0.93, size: 28 }),
    ],
  }, { tags: 'billboard ad campaign إعلان', transition: 'flash-white' }),

  tpl('pr-mock-darklight', 'ليلي أو نهاري', 'mockup', {
    duration: 7, bg: bgp('split-diag'), camera: { type: 'panDL', amount: 0.6 },
    elements: [
      text('ليلي أو نهاري؟ *الاتنين*', { y: 0.11, size: 74, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.09 }) }),
      el('device', { kind: 'browser', x: 0.42, y: 0.44, w: 760, h: 500, rot: -3, z: -0.2, screen: '#0F1216', anim: A('blurSlideR', 0.4, { dur: 0.9 }) }),
      el('device', { kind: 'browser', x: 0.59, y: 0.64, w: 760, h: 500, rot: 3, z: 0.3, screen: '#F7F9FB', anim: A('blurSlideL', 0.8, { dur: 0.9 }) }),
      chip('وضع ليلي', 0.3, 0.88, { anim: A('pop', 1.8) }),
      pill('وضع نهاري', 0.7, 0.88, { anim: A('pop', 2.0) }),
    ],
  }, { tags: 'dark light mode theme وضع ليلي', transition: 'barn-v' }),

  // ================================================================== biz
  tpl('pr-biz-intro', 'مين نحنا', 'biz', {
    duration: 7, bg: bgp('curtain-aurora'), camera: { type: 'pullReveal', amount: 0.7 },
    elements: [
      tag('// من نحن', { x: 0.5, y: 0.13 }),
      text('منبني *أنظمة أتمتة*\nبتشتغل عن فريقك', { y: 0.29, size: 84, w: 920, anim: A('maskUp', 0.4, { split: 'line', stagger: 0.18, dur: 1 }) }),
      text('للشركات الصغيرة والمتوسطة بالخليج', { y: 0.44, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 1.4) }),
      chip('n8n', 0.74, 0.56, { anim: A('pop', 1.8) }),
      chip('AI Agents', 0.5, 0.56, { anim: A('pop', 1.95) }),
      chip('MCP', 0.26, 0.56, { anim: A('pop', 2.1) }),
      el('counter', { x: 0.78, y: 0.72, to: 40, suffix: '+', font: '@mono', size: 90, color: '@accent', anim: A('fade', 2.4) }),
      el('counter', { x: 0.5, y: 0.72, to: 12, font: '@mono', size: 90, color: '@accent', anim: A('fade', 2.55) }),
      el('counter', { x: 0.22, y: 0.72, to: 75, suffix: '%', font: '@mono', size: 90, color: '@accent', anim: A('fade', 2.7) }),
      text('مشروع', { x: 0.78, y: 0.79, size: 30, weight: 500, color: '@muted', anim: A('fade', 2.6) }),
      text('دولة', { x: 0.5, y: 0.79, size: 30, weight: 500, color: '@muted', anim: A('fade', 2.75) }),
      text('توفير بالوقت', { x: 0.22, y: 0.79, size: 30, weight: 500, color: '@muted', anim: A('fade', 2.9) }),
      sig({ y: 0.93, size: 28 }),
    ],
  }, { tags: 'company about intro من نحن شركة', transition: 'fade-depth' }),

  tpl('pr-biz-services', 'شو منقدّم', 'biz', {
    duration: 8, bg: bgp('mesh-sparse'), camera: { type: 'kbTR', amount: 0.6 },
    elements: [
      text('شو *منقدّم*؟', { y: 0.1, size: 84, w: 900, anim: A('slam', 0.2, { split: 'word', stagger: 0.1, dur: 0.6 }) }),
      ...[
        ['bot', 'وكلاء AI', 'ردود ومبيعات 24/7'],
        ['workflow', 'أتمتة n8n', 'ربط كل أدواتك'],
        ['chart', 'تقارير ذكية', 'أرقامك كل صبح'],
        ['globe', 'مواقع سريعة', 'بتحمّل بثانية'],
        ['database', 'CRM مرتّب', 'بدون إدخال يدوي'],
        ['message', 'بوت واتساب', 'حجوزات وطلبات'],
      ].flatMap(([ic, title, sub], i) => {
        const x = i % 2 ? 0.27 : 0.73, y = 0.3 + Math.floor(i / 2) * 0.225, st = 0.6 + i * 0.18;
        return [
          card(x, y, 440, 250, { radius: 28, anim: A('pop', st) }),
          el('icon', { name: ic, x, y: y - 0.042, size: 58, color: '@accent', anim: A('pop', st + 0.15) }),
          text(title, { x, y: y + 0.022, size: 34, weight: 700, w: 400, anim: A('fade', st + 0.2) }),
          text(sub, { x, y: y + 0.06, size: 24, weight: 500, w: 400, color: '@muted', anim: A('fade', st + 0.3) }),
        ];
      }),
    ],
  }, { tags: 'services grid خدمات', transition: 'tiles-fade-checker' }),

  tpl('pr-biz-team', 'الفريق', 'biz', {
    duration: 8, bg: bgp('polka-classic'), camera: { type: 'walk', amount: 0.5 },
    elements: [
      text('الفريق اللي *ورا الأتمتة*', { y: 0.1, size: 74, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      ...[['نور', 'Automation Lead'], ['سارة', 'AI Engineer'], ['أحمد', 'Frontend']].flatMap(([n, r], i) => {
        const x = [0.78, 0.5, 0.22][i], st = 0.6 + i * 0.25;
        return [
          el('image', { x, y: 0.33, w: 230, h: 230, mask: 'circle', border: '@accent', borderW: 5, anim: A('pop', st) }),
          text(n, { x, y: 0.465, size: 36, weight: 700, w: 300, anim: A('fade', st + 0.2) }),
          mono(r, x, 0.505, { size: 22, w: 300, anim: A('fade', st + 0.3) }),
        ];
      }),
      shape('rect', { x: 0.5, y: 0.71, w: 880, h: 220, radius: 32, fill: '@accent', sfx: 'ding', anim: A('pop', 2.4, { dur: 0.6 }) }),
      text('عم نوظّف: n8n Developer', { y: 0.69, size: 46, weight: 800, color: '@ink', anim: A('fade', 2.7) }),
      text('عن بعد · دوام كامل', { y: 0.745, size: 30, weight: 600, color: '@ink', anim: A('fade', 2.9) }),
      status('hiring', { x: 0.5, y: 0.88, anim: A('fade', 3.2) }),
    ],
  }, { tags: 'team hiring فريق توظيف', transition: 'assemble' }),

  tpl('pr-biz-plan', 'باقة سنوية', 'biz', {
    duration: 8, bg: bgp('radial-corner'), camera: { type: 'zoomPulse', amount: 0.35 },
    elements: [
      text('باقة وحدة… *كل شي فيها*', { y: 0.1, size: 68, w: 900, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('pill', { x: 0.5, y: 0.19, w: 440, h: 84, fill: '@fg/0.08', anim: A('fade', 0.5) }),
      shape('pill', { x: 0.41, y: 0.19, w: 210, h: 66, fill: '@accent', sfx: 'toggle', anim: A('slideR', 1.4, { dur: 0.6 }) }),
      text('شهري', { x: 0.59, y: 0.19, size: 28, weight: 600, color: '@muted', anim: A('fade', 0.6) }),
      text('سنوي −20%', { x: 0.41, y: 0.19, size: 28, weight: 700, color: '@ink', anim: A('fade', 1.7) }),
      shape('rect', { x: 0.5, y: 0.555, w: 760, h: 640, radius: 40, glass: true, shadow: 1, stroke: '@accent', strokeW: 2, anim: A('pushIn', 0.8) }),
      text('Pro', { y: 0.34, size: 40, font: '@mono', weight: 700, color: '@accent', anim: A('fade', 1.2) }),
      el('counter', { y: 0.41, from: 490, to: 392, prefix: '$', font: '@mono', size: 120, color: '@fg', countDur: 1, anim: A('fade', 1.8) }),
      text('بالشهر · بتندفع سنوياً', { y: 0.47, size: 28, weight: 500, color: '@muted', anim: A('fade', 2.0) }),
      el('list', { y: 0.615, w: 620, size: 34, gap: 22, icon: 'check', items: ['3 وكلاء AI', 'ورك فلوز بلا حدود', 'دعم أولوية', 'تقرير أداء شهري'], anim: A('rise', 2.2, { stagger: 0.2 }) }),
      pill('ابدأ هلق', 0.5, 0.79, { size: 36, box: { fill: '@accent', padX: 60, padY: 16 }, anim: A('pop', 3.4, { loop: 'pulse' }) }),
    ],
  }, { tags: 'pricing plan yearly باقة سعر', transition: 'color-diamond' }),

  tpl('pr-biz-clients', 'شركات بتثق فينا', 'biz', {
    duration: 7, bg: bgp('stripes-flat'), camera: { type: 'slideL', amount: 0.6 },
    elements: [
      text('شركات *بتثق* فينا', { y: 0.11, size: 80, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.1 }) }),
      ...['NAKHBA', 'DATAWAVE', 'MAWJ', 'QIMMA', 'RAYYAN', 'SOUQLY', 'NOVA LABS', 'TAKAMOL', 'SAHAB'].map((n, i) => chip(n, [0.78, 0.5, 0.22][i % 3], 0.29 + Math.floor(i / 3) * 0.115, {
        size: 34, weight: 800, font: '@display', letterSpacing: 0.06, w: 400, box: { fill: '@fg/0.07', padX: 30, padY: 18, stroke: '@fg/0.12', strokeW: 2, radius: 18 },
        anim: A('pop', 0.6 + ((i * 7) % 9) * 0.12),
      })),
      el('ticker', { y: 0.68, w: 1300, text: 'دعم 24/7 • تقارير يومية • ردود فورية', sep: '   •   ', size: 54, rows: 1, speed: 120, color: '@muted', anim: A('fade', 1.8) }),
      el('counter', { y: 0.8, to: 40, prefix: '+', font: '@mono', size: 110, color: '@accent', glow: 0.4, anim: A('riseBlur', 2.2) }),
      text('شركة بالخليج والشام', { y: 0.875, size: 32, weight: 500, color: '@muted', anim: A('fade', 2.6) }),
    ],
  }, { tags: 'clients logos trust عملاء', transition: 'mask-checker' }),

  tpl('pr-biz-process', 'كيف منشتغل', 'biz', {
    duration: 8, bg: bgp('iso-big'), camera: { type: 'rise', amount: 0.7 },
    elements: [
      text('كيف *منشتغل*؟', { y: 0.1, size: 84, w: 900, anim: A('slam', 0.2, { split: 'word', stagger: 0.1, dur: 0.6 }) }),
      el('bars', { y: 0.55, w: 860, h: 620, values: [100, 75, 50, 25], labels: ['إطلاق', 'اختبار', 'بناء', 'اكتشاف'], showValues: false, hi: 0, radius: 18, anim: A('fade', 0.8, { stagger: 0.3 }) }),
      text('04', { x: 0.178, y: 0.3, size: 40, font: '@mono', color: '@accent', anim: A('pop', 1.2) }),
      text('03', { x: 0.393, y: 0.405, size: 40, font: '@mono', color: '@fg', anim: A('pop', 1.5) }),
      text('02', { x: 0.607, y: 0.513, size: 40, font: '@mono', color: '@fg', anim: A('pop', 1.8) }),
      text('01', { x: 0.822, y: 0.62, size: 40, font: '@mono', color: '@fg', anim: A('pop', 2.1) }),
      text('من الفكرة للإطلاق بـ *4 أسابيع*', { y: 0.845, size: 42, weight: 600, anim: A('riseSoft', 2.6) }),
      sig({ y: 0.935, size: 26 }),
    ],
  }, { tags: 'process steps how we work مراحل', transition: 'wipe-hard-45' }),

  tpl('pr-biz-case', 'قصة متجر أزياء', 'biz', {
    duration: 8, bg: bgp('grainy-cool'), camera: { type: 'dutchL', amount: 0.5 },
    sfx: { events: [{ id: 'pr-case-rise', t: 0.1, kind: 'riser-short', vol: 0.7 }] },
    elements: [
      tag('// case study · متجر أزياء', { x: 0.5, y: 0.075 }),
      text('*75%* أقل وقت بخدمة العملاء', { y: 0.17, size: 72, w: 900, hl: 'marker', anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.08 }) }),
      ...[['التحدي', '300 رسالة باليوم وفريق صغير'], ['الحل', 'وكيل AI على واتساب مربوط بالمخزون'], ['النتيجة', 'رد خلال 30 ثانية ورضا 96%']].flatMap(([lab, body], i) => {
        const y = 0.34 + i * 0.15, st = 1 + i * 0.4;
        return [
          shape('rect', { x: 0.5, y, w: 880, h: 170, radius: 26, fill: i === 2 ? '@accent/0.14' : '@fg/0.06', stroke: i === 2 ? '@accent' : null, strokeW: 2, anim: A('blurSlideR', st, { dur: 0.7 }) }),
          mono(lab, 0.5, y - 0.03, { size: 24, color: '@accent', w: 800, align: 'start', anim: A('fade', st + 0.2) }),
          text(body, { x: 0.5, y: y + 0.02, size: 34, weight: 600, w: 800, align: 'start', anim: A('fade', st + 0.3) }),
        ];
      }),
      text('«صرنا نرد على الكل… بدون ما نوظّف»', { y: 0.8, size: 38, weight: 500, color: '@fg', anim: A('riseSoft', 2.8) }),
      text('— مديرة المتجر', { y: 0.855, size: 26, weight: 500, color: '@muted', anim: A('fade', 3.1) }),
    ],
  }, { tags: 'case study result قصة نجاح', transition: 'leak-accent' }),

  tpl('pr-biz-contact', 'احجز مكالمة', 'biz', {
    duration: 7, bg: bgp('rays-top'), camera: { type: 'heartbeat', amount: 0.5 },
    elements: [
      text('خلّينا نبني *أتمتتك*', { y: 0.12, size: 80, w: 900, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.1 }) }),
      pill('احجز مكالمة 15 دقيقة', 0.5, 0.25, { size: 42, box: { fill: '@accent', padX: 50, padY: 20 }, sfx: 'pop', anim: A('pop', 0.9, { loop: 'pulse' }) }),
      shape('dots', { y: 0.47, w: 300, h: 300, cols: 9, rows: 9, dot: 13, fill: '@fg', anim: A('wipeDown', 1.4, { dur: 0.9 }) }),
      el('corners', { y: 0.47, w: 380, h: 380, len: 60, strokeW: 6, all: true, anim: A('draw', 1.2, { dur: 0.7 }) }),
      chip('nouraldeentofi.com', 0.5, 0.68, { font: '@mono', size: 30, anim: A('rise', 2.2) }),
      chip('@nouraldeentofi', 0.5, 0.755, { font: '@mono', size: 30, anim: A('rise', 2.35) }),
      chip('الرياض · أو عن بعد', 0.5, 0.83, { size: 30, anim: A('rise', 2.5) }),
      sig({ y: 0.93, size: 26 }),
    ],
  }, { tags: 'contact booking call تواصل حجز', transition: 'shape-hexagon' }),
];
