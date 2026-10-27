// Core pack: Nour's signature formats (also the reference style for the other packs).
import { A, text, shape, el, tag, status, sig, veil, glowAt, tpl } from './kit.js';

export const CORE = [
  tpl('core-brand-hook', 'هوك بهويتك', 'intro', {
    duration: 6, camera: { type: 'push', amount: 0.9 }, fx: { grain: 0.4 },
    elements: [
      veil({ y: 0.4 }),
      tag('// 01 · n8n', { x: 0.78, y: 0.09 }),
      status('workflow running', { x: 0.24, y: 0.09 }),
      text('أنا أبني وكلاء *ذكاء اصطناعي* بيشتغلوا عنك 24/7', { y: 0.35, size: 92, w: 900, caret: true, anim: A('riseBlur', 0.5, { split: 'word', stagger: 0.09, dur: 0.9 }) }),
      text('بدون ما تكتب سطر كود واحد', { y: 0.53, size: 44, weight: 400, color: '@muted', anim: A('riseSoft', 1.7) }),
      el('flow', { y: 0.7, w: 900, h: 240, nodeSize: 110, nodes: [{ label: 'Lead', icon: 'user', x: 0.4, y: 0 }, { label: 'AI Agent', icon: 'bot', x: 0, y: 0, hot: true }, { label: 'CRM', icon: 'database', x: -0.4, y: 0 }], anim: A('none', 2.1, { stagger: 0.4 }) }),
      sig(),
    ],
  }, { tags: 'brand nour هوية افتتاحية' }),

  tpl('core-big-number', 'رقم ضخم دوّار', 'stats', {
    duration: 5, bg: { type: 'mesh', density: 0.8 }, camera: { type: 'dolly', amount: 0.8 },
    elements: [
      glowAt(0.5, 0.42, { alpha: 0.18 }),
      tag('// نتيجة', { x: 0.5, y: 0.17 }),
      el('counter', { y: 0.39, to: 494, style: 'roll', font: '@mono', size: 270, color: '@accent', glow: 0.5, anim: A('pushIn', 0.3) }),
      text('اختبار آلي بيشتغل مع كل تعديل', { y: 0.57, size: 54, weight: 700, anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.07 }) }),
      el('progress', { y: 0.7, w: 760, value: 0.98, label: 'نسبة النجاح', anim: A('fade', 1.4) }),
      sig(),
    ],
  }, { tags: 'number counter رقم عداد' }),

  tpl('core-flow-4', 'ورك فلو متعرج', 'flow', {
    duration: 7, bg: { type: 'mesh', traffic: 1.4 }, camera: { type: 'drift' },
    elements: [
      text('كل Lead بيوصل… بيترد عليه خلال *4 ثواني*', { y: 0.16, size: 70, w: 900, anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.08 }) }),
      el('flow', { y: 0.46, w: 880, h: 520, layout: 'zigzag', nodeSize: 120, pulses: 2, nodes: [{ label: 'Form', icon: 'file', x: 0.4, y: -0.28 }, { label: 'AI Agent', icon: 'bot', x: 0.13, y: 0.28, hot: true }, { label: 'CRM', icon: 'database', x: -0.13, y: -0.28 }, { label: 'WhatsApp', icon: 'message', x: -0.4, y: 0.28 }], anim: A('none', 1.0, { stagger: 0.5 }) }),
      el('notify', { y: 0.8, w: 860, app: 'n8n', title: 'Lead جديد وصل', body: 'الوكيل رد عليه وحجز موعد تلقائياً', icon: 'bolt', time: 'الآن', z: 0.4, anim: A('drop', 3.4, { dur: 0.7 }) }),
    ],
  }, { tags: 'workflow n8n automation أتمتة' }),

  tpl('core-checklist', 'قائمة صح', 'list', {
    duration: 6, camera: { type: 'push' },
    elements: [
      tag('// نصيحة', { x: 0.5, y: 0.13 }),
      text('3 أشياء *بأتمتها* بكل مشروع', { y: 0.25, size: 84, anim: A('maskUp', 0.3, { split: 'line', stagger: 0.12 }) }),
      el('list', { y: 0.55, w: 860, size: 50, items: ['الرد على الإيميلات والاستفسارات', 'التقارير اليومية للفريق', 'متابعة العملاء بعد البيع'], icon: 'check', anim: A('blurSlideR', 1.0, { stagger: 0.35, dur: 0.8 }) }),
      sig(),
    ],
  }, { tags: 'list checklist قائمة نصائح' }),

  tpl('core-outro', 'خاتمة: تابعني', 'outro', {
    duration: 5, bg: { type: 'mesh', traffic: 1.5 }, camera: { type: 'pull', amount: 0.9 },
    elements: [
      el('particles', { kind: 'sparkle', count: 40, w: 1000, h: 1300, anim: A('fade', 0.5, { dur: 1 }) }),
      text('بدك تبني أتمتة متلها؟', { y: 0.33, size: 96, w: 900, caret: true, anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.1 }) }),
      text('تابعني، كل أسبوع workflow جديد', { y: 0.47, size: 46, weight: 400, color: '@muted', anim: A('riseSoft', 1.2) }),
      text('تابع الحساب', { y: 0.62, size: 50, weight: 700, color: '@ink', box: { fill: '@accent', padX: 56, padY: 22 }, anim: A('pop', 1.8, { dur: 0.6, loop: 'pulse' }) }),
      el('signature', { y: 0.82, size: 44, anim: A('draw', 2.2, { dur: 1.3 }) }),
    ],
  }, { tags: 'cta follow outro خاتمة' }),

  tpl('core-kinetic-slam', 'كلمات بتضرب', 'kinetic', {
    duration: 4.5, bg: { type: 'grid', size: 110 }, camera: { type: 'punch', amount: 1 }, fx: { grain: 0.6, vignette: 0.5 },
    elements: [
      text('BUILD.', { y: 0.32, size: 210, letterSpacing: -0.03, anim: A('slam', 0.2, { dur: 0.5 }) }),
      text('AUTOMATE.', { y: 0.5, size: 150, color: '@accent', glow: 0.4, anim: A('slam', 0.7, { dur: 0.5 }) }),
      text('SHIP.', { y: 0.68, size: 210, outline: true, strokeW: 4, anim: A('slam', 1.2, { dur: 0.5 }) }),
    ],
  }, { tags: 'kinetic english words بوستر' }),

  tpl('core-quote-glass', 'اقتباس زجاجي', 'quote', {
    duration: 6, bg: { type: 'blobs' }, camera: { type: 'drift' },
    elements: [
      shape('rect', { y: 0.48, w: 900, h: 780, radius: 44, glass: true, shadow: 1, anim: A('pushIn', 0.2, { dur: 1 }) }),
      el('icon', { name: 'quote', y: 0.27, size: 100, color: '@accent', filled: true, anim: A('pop', 0.6) }),
      text('الأتمتة مو رفاهية… هي الطريقة الوحيدة لتكبر بدون ما تتعب أكتر', { y: 0.47, size: 56, weight: 600, w: 760, lineHeight: 1.55, anim: A('riseBlur', 0.9, { split: 'word', stagger: 0.06 }) }),
      shape('line', { y: 0.65, w: 120, h: 6, strokeW: 5, stroke: '@accent', anim: A('draw', 2.4) }),
      text('نور الدين طفي', { y: 0.7, size: 38, weight: 700, anim: A('fade', 2.6) }),
      text('AI Automation Engineer', { y: 0.745, size: 26, font: '@mono', weight: 400, color: '@muted', anim: A('fade', 2.8) }),
    ],
  }, { tags: 'quote اقتباس glass زجاج', transition: 'blur' }),

  tpl('core-code', 'كود بينكتب', 'tech', {
    duration: 7, bg: { type: 'grid', size: 80 }, camera: { type: 'dolly', amount: 0.7 },
    elements: [
      text('خلّي الكود *يشتغل عنك*', { y: 0.14, size: 80, anim: A('maskUp', 0.2, { split: 'word', stagger: 0.1 }) }),
      el('code', { y: 0.49, w: 920, size: 30, title: 'agent.ts', cps: 34, z: 0.3, anim: A('pushIn', 0.6, { dur: 0.9 }), lines: [
        "import { Agent } from 'n8n-ai'",
        '',
        'const agent = new Agent({',
        "  model: 'claude',",
        '  tools: [gmail, crm, whatsapp],',
        '})',
        '',
        "agent.on('lead', async (lead) => {",
        '  await agent.reply(lead) // 4s',
        '})',
      ] }),
      status('agent running', { x: 0.5, y: 0.8, anim: A('fade', 4) }),
      sig(),
    ],
  }, { tags: 'code كود typing برمجة' }),

  tpl('core-globe', 'كرة أرضية 3D', '3d', {
    duration: 6, bg: { type: 'stars', count: 160, speed: 0.3 }, camera: { type: 'push' },
    elements: [
      glowAt(0.5, 0.42, { alpha: 0.25, w: 1000, h: 1000 }),
      el('obj3d', { shape: 'globe', y: 0.41, size: 680, speed: 0.45, glow: 0.5, anim: A('draw', 0.2, { dur: 2 }) }),
      text('عملاء من *12 دولة*', { y: 0.74, size: 84, anim: A('riseBlur', 1.2, { split: 'word', stagger: 0.1 }) }),
      text('وكلهم شغالين على نفس الأتمتة', { y: 0.82, size: 42, weight: 400, color: '@muted', anim: A('riseSoft', 1.8) }),
    ],
  }, { tags: '3d globe عالمي دول' }),

  tpl('core-chat', 'محادثة عميل', 'ui', {
    duration: 8, camera: { type: 'drift', amount: 0.6 },
    elements: [
      text('هيك بيرد الوكيل على عملائك', { y: 0.09, size: 58, anim: A('riseBlur', 0.2, { split: 'word' }) }),
      el('chat', { y: 0.54, w: 880, h: 900, size: 36, frame: true, interval: 1.2, header: { name: 'AI Agent', status: 'online · رد تلقائي' }, anim: A('pushIn', 0.5), messages: [
        { me: false, text: 'مرحبا، عندكم دورات أتمتة؟' },
        { me: true, text: 'أهلين! إيه، عنا دورة *n8n* كاملة' },
        { me: false, text: 'قديش سعرها؟' },
        { me: true, text: 'بعتلك التفاصيل والرابط على الإيميل' },
      ] }),
    ],
  }, { tags: 'chat whatsapp محادثة رسائل', transition: 'cover' }),

  tpl('core-phone', 'تطبيق بجوال', 'mockup', {
    duration: 6, bg: { type: 'radial' }, camera: { type: 'orbit' },
    elements: [
      glowAt(0.5, 0.58, { alpha: 0.25 }),
      text('تطبيقك… بيشتغل لحاله', { y: 0.11, size: 72, anim: A('maskUp', 0.4, { split: 'word', stagger: 0.1 }) }),
      el('device', { kind: 'phone', y: 0.57, w: 420, h: 860, z: 0.2, anim: A('riseBlur', 0.3, { dur: 1.1 }) }),
      el('notify', { y: 0.38, w: 780, z: 0.6, title: 'طلب جديد #1042', body: 'تم تأكيد الطلب وإرسال الفاتورة', icon: 'cart', app: 'Store', time: 'الآن', anim: A('drop', 1.8) }),
    ],
  }, { tags: 'phone mockup app جوال تطبيق' }),

  tpl('core-compare', 'قبل وبعد', 'compare', {
    duration: 6.5, camera: { type: 'push', amount: 0.6 },
    elements: [
      text('قبل الأتمتة ← بعدها', { y: 0.11, size: 70, anim: A('riseBlur', 0.2, { split: 'word', stagger: 0.08 }) }),
      shape('rect', { x: 0.745, y: 0.55, w: 450, h: 830, radius: 32, fill: '@fg/0.05', anim: A('riseSoft', 0.4) }),
      shape('rect', { x: 0.255, y: 0.55, w: 450, h: 830, radius: 32, fill: '@accent/0.08', stroke: '@accent', strokeW: 2, anim: A('riseSoft', 0.6) }),
      text('قبل', { x: 0.745, y: 0.27, size: 56, color: '@muted', anim: A('fade', 0.8) }),
      text('بعد', { x: 0.255, y: 0.27, size: 56, color: '@accent', anim: A('pop', 1.6) }),
      el('list', { x: 0.745, y: 0.53, w: 390, size: 36, gap: 44, icon: 'x', iconColor: '@muted', color: '@muted', items: ['8 ساعات ردود', 'أخطاء يدوية', 'عملاء بيستنوا'], anim: A('rise', 1.0, { stagger: 0.25 }) }),
      el('list', { x: 0.255, y: 0.53, w: 390, size: 36, gap: 44, icon: 'check', items: ['دقيقة وحدة', 'صفر أخطاء', 'رد خلال 4 ثواني'], anim: A('rise', 1.9, { stagger: 0.25 }) }),
      sig(),
    ],
  }, { tags: 'compare before after مقارنة قبل بعد' }),
];
