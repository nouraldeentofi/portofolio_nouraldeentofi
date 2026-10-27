// Pack A: openers, social hooks and kinetic typography.
import { A, text, shape, el, tag, status, sig, glowAt, tpl } from './kit.js';

export const TYPE = [
  // ------------------------------------------------------------------ intro
  tpl('type-intro-cinematic', 'عنوان سينمائي', 'intro', {
    duration: 6, bg: { type: 'spotlight', speed: 0.6 }, camera: { type: 'dolly', amount: 0.9 }, fx: { grain: 0.8, letterbox: 0.08, vignette: 0.6 },
    elements: [
      glowAt(0.5, 0.45, { alpha: 0.16, w: 1100, h: 600 }),
      text('2026', { y: 0.36, size: 30, font: '@mono', weight: 500, color: '@accent', letterSpacing: 0.6, anim: A('fade', 1.6) }),
      text('AUTOMATION', { y: 0.44, size: 112, letterSpacing: 0.08, anim: A('track', 0.3, { dur: 2.2 }) }),
      shape('line', { y: 0.515, w: 520, h: 6, strokeW: 3, stroke: '@accent', anim: A('draw', 1.4, { dur: 1.2 }) }),
      text('سلسلة جديدة · الحلقة 01', { y: 0.58, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 2.0) }),
    ],
  }, { transition: 'blur', tags: 'cinematic title سينمائي عنوان' }),

  tpl('type-intro-episode', 'رقم الحلقة', 'intro', {
    duration: 6, bg: { type: 'contour' }, camera: { type: 'panL', amount: 0.7 }, fx: { grain: 0.5 },
    elements: [
      tag('// الحلقة', { y: 0.11 }),
      text('01', { y: 0.33, size: 400, font: '@mono', weight: 700, outline: true, strokeW: 3, color: '@accent', anim: A('wipeUp', 0.2, { dur: 1.2 }) }),
      text('كيف بنيت أول\nوكيل AI إلي', { y: 0.63, size: 86, lineHeight: 1.3, anim: A('maskUp', 0.9, { split: 'line', stagger: 0.18, dur: 0.9 }) }),
      text('بخطوات بسيطة وبدون كود', { y: 0.79, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 1.8) }),
      sig(),
    ],
  }, { transition: 'wipe', tags: 'episode series حلقة سلسلة' }),

  tpl('type-intro-split', 'نصين متقابلين', 'intro', {
    duration: 5.5, bg: { type: 'split', angle: -8, ratio: 0.55, c1: '@bg', c2: '@accent' }, camera: { type: 'push', amount: 0.6 },
    elements: [
      text('من الفكرة', { y: 0.3, size: 110, anim: A('slideR', 0.3, { dur: 0.9 }) }),
      el('icon', { name: 'arrowDown', y: 0.44, size: 80, color: '@accent', anim: A('drop', 1.3, { loop: 'float' }) }),
      text('للنظام *الشغّال*', { y: 0.74, size: 110, color: '@ink', accentColor: '@bg', anim: A('slideL', 0.8, { dur: 0.9 }) }),
      text('// workflow · v1', { y: 0.88, size: 30, font: '@mono', weight: 500, color: '@ink', opacity: 0.75, anim: A('typewriter', 1.6, { dur: 0.7 }) }),
    ],
  }, { transition: 'slide', tags: 'split two tone قسمين' }),

  tpl('type-intro-orbit', 'حلقات مدارية', 'intro', {
    duration: 6, bg: { type: 'stars', count: 200, speed: 0.4 }, camera: { type: 'orbit' }, fx: { vignette: 0.5 },
    elements: [
      glowAt(0.5, 0.42, { alpha: 0.2 }),
      el('obj3d', { shape: 'rings', y: 0.42, size: 820, speed: 0.4, glow: 0.6, z: -0.4, opacity: 0.85, anim: A('draw', 0.1, { dur: 1.8 }) }),
      text('الجيل الجديد\nمن الأتمتة', { y: 0.42, size: 100, lineHeight: 1.25, glow: 0.3, anim: A('riseBlur', 0.8, { split: 'word', stagger: 0.12, dur: 1 }) }),
      text('MCP · AGENTS · n8n', { y: 0.75, size: 34, font: '@mono', weight: 500, color: '@secondary', letterSpacing: 0.15, anim: A('scramble', 1.8, { dur: 1.2 }) }),
    ],
  }, { transition: 'zoomThrough', tags: '3d orbit space فضاء' }),

  tpl('type-intro-frame', 'عنوان بإطار', 'intro', {
    duration: 5.5, bg: { type: 'grid', size: 70 }, camera: { type: 'push', amount: 1 },
    elements: [
      el('corners', { y: 0.45, w: 900, h: 520, len: 80, strokeW: 6, all: true, breath: 6, anim: A('draw', 0.1, { dur: 0.9 }) }),
      text('> init project', { y: 0.29, size: 34, font: '@mono', weight: 500, color: '@accent', anim: A('typewriter', 0.6, { dur: 0.8 }) }),
      text('مشروع جديد عم ينبني', { y: 0.44, size: 92, w: 820, anim: A('flipX', 1.0, { split: 'word', stagger: 0.12, dur: 0.8 }) }),
      text('تابع الرحلة من أول سطر', { y: 0.57, size: 40, weight: 400, color: '@muted', anim: A('fade', 1.9) }),
      status('building', { x: 0.5, y: 0.86, anim: A('fade', 2.2) }),
    ],
  }, { transition: 'diamond', tags: 'frame corners إطار' }),

  tpl('type-intro-stack', 'ثلاث كلمات متراكمة', 'intro', {
    duration: 5, bg: { type: 'gradient', angle: 200 }, camera: { type: 'rise', amount: 0.8 },
    elements: [
      text('أتمتة.', { y: 0.29, size: 120, color: '@muted', anim: A('blurSlideR', 0.2, { dur: 0.8 }) }),
      text('ذكاء اصطناعي.', { y: 0.45, size: 120, anim: A('blurSlideR', 0.6, { dur: 0.8 }) }),
      text('نتائج.', { y: 0.62, size: 150, color: '@accent', glow: 0.35, anim: A('blurSlideR', 1.0, { dur: 0.8, loop: 'glow' }) }),
      shape('line', { y: 0.74, w: 300, h: 8, strokeW: 6, stroke: '@accent', anim: A('draw', 1.6) }),
      sig(),
    ],
  }, { transition: 'whip', tags: 'stack words كلمات' }),

  tpl('type-intro-iris', 'دائرة كاشفة', 'intro', {
    duration: 5.5, bg: { type: 'dots', size: 50 }, camera: { type: 'pull', amount: 0.8 },
    elements: [
      shape('ring', { y: 0.36, w: 620, h: 620, stroke: '@accent', strokeW: 3, dash: [14, 18], anim: A('draw', 0.6, { dur: 1.2, loop: 'spinSlow' }) }),
      shape('circle', { y: 0.36, w: 480, h: 480, fill: '@accent', anim: A('iris', 0.2, { dur: 1 }) }),
      text('جديد', { y: 0.36, size: 140, color: '@ink', anim: A('zoomOut', 0.8, { dur: 0.7 }) }),
      text('خدمة أتمتة كاملة لمتجرك', { y: 0.68, size: 66, anim: A('riseBlur', 1.3, { split: 'word', stagger: 0.08 }) }),
      text('من الطلب لحد الفاتورة', { y: 0.77, size: 40, weight: 400, color: '@muted', anim: A('riseSoft', 1.9) }),
    ],
  }, { transition: 'circle', tags: 'new launch جديد إطلاق' }),

  tpl('type-intro-name', 'بطاقة اسم', 'intro', {
    duration: 6, bg: { type: 'aurora' }, camera: { type: 'drift' }, fx: { grain: 0.5 },
    elements: [
      el('particles', { kind: 'dust', count: 60, w: 1100, h: 1350, anim: A('fade', 0.2) }),
      text('نور الدين طفي', { y: 0.4, size: 116, anim: A('zoomOut', 0.3, { dur: 1.1 }) }),
      shape('line', { y: 0.49, w: 640, h: 4, strokeW: 3, stroke: '@fg/0.3', anim: A('growC', 1.0, { dur: 0.9 }) }),
      text('AI AUTOMATION ENGINEER', { y: 0.55, size: 36, font: '@mono', weight: 500, color: '@accent', letterSpacing: 0.2, anim: A('scramble', 1.3, { dur: 1.4 }) }),
      status('متاح لمشاريع جديدة', { x: 0.5, y: 0.67, anim: A('fade', 2.4) }),
    ],
  }, { transition: 'fade', tags: 'name card اسم تعريف' }),

  tpl('type-intro-tunnel', 'نفق سريع', 'intro', {
    duration: 5, bg: { type: 'tunnel', speed: 0.14 }, camera: { type: 'punch', amount: 1.2 }, fx: { vignette: 0.7 },
    elements: [
      el('particles', { kind: 'stars', count: 90, w: 1100, h: 1350, anim: A('fade', 0) }),
      el('glow', { y: 0.48, w: 1000, h: 520, color: '@bg', alpha: 0.85, anim: A('none', 0) }),
      text('ادخل عالم', { y: 0.42, size: 64, weight: 600, color: '@muted', anim: A('zoomIn', 0.3, { dur: 0.9 }) }),
      text('الوكلاء الأذكياء', { y: 0.52, size: 116, anim: A('zoomIn', 0.7, { split: 'word', stagger: 0.15, dur: 1 }) }),
    ],
  }, { transition: 'zoomThrough', tags: 'tunnel speed نفق' }),

  tpl('type-intro-chapter', 'فصل جانبي', 'intro', {
    duration: 5.5, bg: { type: 'stripes', width: 60, angle: -30, speed: 30 }, camera: { type: 'panR', amount: 0.7 },
    elements: [
      text('03', { x: 0.68, y: 0.27, size: 380, font: '@mono', weight: 700, color: '@accent', anim: A('maskRight', 0.2, { dur: 1 }) }),
      shape('rect', { y: 0.46, w: 900, h: 4, fill: '@fg/0.25', anim: A('grow', 0.8, { dur: 0.9 }) }),
      text('// الفصل التالت', { y: 0.52, w: 880, align: 'start', size: 38, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 1.0) }),
      text('ربط الوكيل مع الـ CRM', { y: 0.62, w: 880, align: 'start', size: 92, anim: A('maskUp', 1.2, { split: 'word', stagger: 0.1 }) }),
      sig(),
    ],
  }, { transition: 'panel', tags: 'chapter section فصل' }),

  // ------------------------------------------------------------------ hook
  tpl('type-hook-question', 'سؤال صادم', 'hook', {
    duration: 5.5, bg: { type: 'radial', y: 0.45 }, camera: { type: 'push', amount: 1 },
    elements: [
      text('؟', { y: 0.45, size: 900, color: '@fg/0.06', anim: A('zoomOut', 0, { dur: 1.6, loop: 'sway' }) }),
      text('شو لو قلتلك إنو *80%* من شغلك اليومي ممكن يتأتمت؟', { y: 0.42, size: 88, w: 880, lineHeight: 1.4, hl: 'marker', anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.08 }) }),
      text('خليني فرجيك كيف', { y: 0.7, size: 44, weight: 600, color: '@accent', anim: A('riseSoft', 1.9) }),
      el('icon', { name: 'arrowDown', y: 0.79, size: 64, color: '@accent', anim: A('drop', 2.2, { loop: 'float' }) }),
    ],
  }, { transition: 'zoom', tags: 'question سؤال هوك' }),

  tpl('type-hook-stop', 'وقّف السكرول', 'hook', {
    duration: 5, bg: { type: 'stripes', width: 90, angle: -45, speed: 120, color: '@accent/0.06' }, camera: { type: 'shake', amount: 0.6 }, fx: { vignette: 0.5 },
    elements: [
      text('وقّف السكرول.', { y: 0.35, size: 128, w: 920, anim: A('slam', 0.2, { dur: 0.45 }) }),
      shape('rect', { y: 0.46, w: 640, h: 14, radius: 7, fill: '@accent', anim: A('grow', 0.7, { dur: 0.6 }) }),
      text('هالبوست رح يوفّرلك *10 ساعات* بالأسبوع', { y: 0.59, size: 64, w: 860, lineHeight: 1.35, anim: A('maskUp', 1.0, { split: 'line', stagger: 0.15 }) }),
      text('اقرأه للآخر', { y: 0.77, size: 38, weight: 600, color: '@ink', box: { fill: '@accent', padX: 40, padY: 16 }, anim: A('pop', 1.8, { loop: 'heartbeat' }) }),
    ],
  }, { transition: 'glitch', tags: 'stop scroll وقف انتباه' }),

  tpl('type-hook-myth', 'خرافة وحقيقة', 'hook', {
    duration: 7, bg: { type: 'mesh', density: 0.7 }, camera: { type: 'drift', amount: 0.7 },
    elements: [
      tag('// خرافة', { y: 0.15, color: '@muted' }),
      text('الأتمتة بدها مبرمج محترف', { y: 0.25, size: 68, color: '@muted', anim: A('riseBlur', 0.3, { split: 'word', stagger: 0.07 }) }),
      shape('line', { y: 0.255, w: 780, h: 8, strokeW: 7, stroke: '@accent', anim: A('draw', 1.4, { dur: 0.5 }) }),
      shape('rect', { y: 0.58, w: 900, h: 440, radius: 36, glass: true, shadow: 0.8, anim: A('pushIn', 2.0, { dur: 0.9 }) }),
      text('// الحقيقة', { y: 0.45, size: 32, font: '@mono', weight: 500, color: '@accent', w: 600, anim: A('typewriter', 2.4, { dur: 0.6 }) }),
      text('مع *n8n* بتبني أول workflow إلك بساعة وحدة', { y: 0.6, size: 64, w: 800, lineHeight: 1.4, anim: A('riseBlur', 2.7, { split: 'word', stagger: 0.07 }) }),
      sig(),
    ],
  }, { transition: 'cube', tags: 'myth fact خرافة حقيقة' }),

  tpl('type-hook-unpopular', 'رأي غير شعبي', 'hook', {
    duration: 6, bg: { type: 'spotlight', speed: 0.8 }, camera: { type: 'push', amount: 1.1 }, fx: { grain: 0.6 },
    elements: [
      text('رأي غير شعبي', { y: 0.22, size: 40, weight: 700, color: '@ink', rot: -4, box: { fill: '@accent', padX: 36, padY: 14 }, anim: A('popRotate', 0.2, { dur: 0.6 }) }),
      text('مو كل شي لازم يتأتمت.', { y: 0.42, size: 104, w: 900, lineHeight: 1.3, anim: A('maskUp', 0.6, { split: 'word', stagger: 0.12 }) }),
      text('أتمت اللي بيتكرر كل يوم، والباقي خليه لعقلك', { y: 0.62, size: 48, weight: 400, w: 820, color: '@muted', lineHeight: 1.5, anim: A('fade', 1.8, { dur: 1 }) }),
      sig(),
    ],
  }, { transition: 'blinds', tags: 'opinion رأي جدلي' }),

  tpl('type-hook-number', 'رقم مشوّق', 'hook', {
    duration: 5.5, bg: { type: 'rays', count: 24, speed: 0.06 }, camera: { type: 'dolly' },
    elements: [
      el('counter', { y: 0.32, from: 0, to: 7, size: 420, weight: 800, color: '@accent', glow: 0.6, countDur: 1.2, anim: A('elastic', 0.2, { dur: 1 }) }),
      text('أدوات AI بستخدمها كل يوم', { y: 0.58, size: 74, anim: A('riseBlur', 1.0, { split: 'word', stagger: 0.08 }) }),
      text('والرقم 5 غيّر طريقة شغلي كلها', { y: 0.68, size: 44, weight: 400, color: '@muted', anim: A('riseSoft', 1.7) }),
      text('اسحب', { x: 0.56, y: 0.84, size: 34, weight: 600, anim: A('fade', 2.2) }),
      el('icon', { name: 'arrowLeft', x: 0.45, y: 0.84, size: 50, color: '@accent', anim: A('slideL', 2.2, { loop: 'sway', loopAmp: 3 }) }),
    ],
  }, { transition: 'slide', tags: 'number teaser carousel رقم' }),

  tpl('type-hook-pov', 'POV', 'hook', {
    duration: 6, bg: { type: 'stars', count: 220, speed: 0.15 }, camera: { type: 'drift' }, fx: { vignette: 0.6 },
    elements: [
      el('icon', { name: 'moon', y: 0.19, size: 120, color: '@accent', glow: 0.6, anim: A('swing', 0.2, { loop: 'float' }) }),
      text('POV:', { y: 0.32, size: 64, font: '@mono', weight: 700, color: '@accent', w: 400, anim: A('typewriter', 0.6, { dur: 0.4 }) }),
      text('إنت نايم… ووكيلك الـ AI عم يرد على كل عملائك', { y: 0.5, size: 82, w: 880, lineHeight: 1.4, anim: A('blurIn', 1.0, { split: 'word', stagger: 0.1, dur: 0.9 }) }),
      status('3:12 AM · 14 رسالة انردّت', { x: 0.5, y: 0.75, anim: A('fade', 2.4) }),
    ],
  }, { transition: 'fade', tags: 'pov night ليل' }),

  tpl('type-hook-mistake', 'أكبر غلطة', 'hook', {
    duration: 6, bg: { type: 'hex', size: 64 }, camera: { type: 'push', amount: 0.9 },
    elements: [
      el('icon', { name: 'x', y: 0.22, size: 110, color: '@ink', bg: '@accent', strokeW: 2.6, anim: A('spin', 0.2, { dur: 0.8 }) }),
      text('أكبر غلطة بتعملها بالأتمتة', { y: 0.42, size: 92, w: 880, lineHeight: 1.3, anim: A('wipeL', 0.7, { dur: 0.9 }) }),
      text('إنك تبلّش بالأداة… قبل ما تفهم *المشكلة*', { y: 0.6, size: 52, w: 820, weight: 600, color: '@muted', hl: 'underline', markDelay: 0.3, anim: A('riseSoft', 1.6) }),
      sig(),
    ],
  }, { transition: 'ink', tags: 'mistake غلطة تحذير' }),

  tpl('type-hook-secret', 'السر', 'hook', {
    duration: 6, bg: { type: 'circuit' }, camera: { type: 'dolly', amount: 0.7 }, fx: { vignette: 0.5 },
    elements: [
      el('icon', { name: 'lock', y: 0.23, size: 150, color: '@accent', strokeW: 1.6, glow: 0.5, anim: A('draw', 0.2, { dur: 1.2 }) }),
      text('السر اللي ما حدا بيحكيه عن *n8n*', { y: 0.45, size: 88, w: 880, hl: 'box', lineHeight: 1.35, anim: A('pushIn', 0.9, { split: 'word', stagger: 0.09 }) }),
      text('(وهو مجاني 100%)', { y: 0.62, size: 44, weight: 500, color: '@muted', anim: A('fade', 1.9) }),
      shape('chevron', { y: 0.77, w: 40, h: 70, rot: 90, strokeW: 7, stroke: '@accent', anim: A('fade', 2.3, { loop: 'float' }) }),
    ],
  }, { transition: 'pixel', tags: 'secret سر' }),

  tpl('type-hook-vs', 'مين أقوى', 'hook', {
    duration: 5.5, bg: { type: 'split', angle: 90, c1: '@bg', c2: '@bg2' }, camera: { type: 'push', amount: 0.7 },
    elements: [
      text('ChatGPT', { x: 0.75, y: 0.42, size: 76, color: '@muted', w: 460, anim: A('slideR', 0.2) }),
      text('وكيل AI', { x: 0.25, y: 0.42, size: 84, color: '@accent', w: 460, anim: A('slideL', 0.5) }),
      shape('circle', { y: 0.42, w: 150, h: 150, fill: '@accent', shadow: 0.8, anim: A('pop', 1.0) }),
      text('VS', { y: 0.42, size: 58, font: '@mono', weight: 700, color: '@ink', anim: A('pop', 1.1) }),
      text('واحد بيجاوب… والتاني بيشتغل', { y: 0.66, size: 64, w: 880, anim: A('riseBlur', 1.6, { split: 'word', stagger: 0.08 }) }),
      text('الفرق بالسلايد الجاي', { y: 0.76, size: 40, weight: 400, color: '@muted', anim: A('fade', 2.4) }),
    ],
  }, { transition: 'split', tags: 'versus compare مقابل' }),

  tpl('type-hook-save', 'احفظ البوست', 'hook', {
    duration: 5, bg: { type: 'waves', lines: 18 }, camera: { type: 'rise', amount: 0.7 },
    elements: [
      text('احفظ هالبوست', { y: 0.29, size: 110, anim: A('bounce', 0.2, { split: 'word', stagger: 0.15, dur: 1 }) }),
      text('رح ترجعله لما تبني أول وكيل إلك', { y: 0.43, size: 50, weight: 400, w: 820, color: '@muted', anim: A('riseSoft', 1.2) }),
      el('icon', { name: 'download', y: 0.63, size: 150, color: '@accent', bg: '@accent/0.12', anim: A('pop', 1.6, { loop: 'float' }) }),
      sig(),
    ],
  }, { transition: 'slide', tags: 'save bookmark احفظ' }),

  // ------------------------------------------------------------------ kinetic
  tpl('type-kin-wave', 'موجة حروف', 'kinetic', {
    duration: 5, bg: { type: 'dots', size: 44 }, camera: { type: 'push', amount: 0.6 },
    elements: [
      text('MOTION', { y: 0.4, size: 190, letterSpacing: 0.02, anim: A('wave', 0.2, { split: 'letter', stagger: 0.06, dur: 0.8, loop: 'waveText', loopAmp: 1.2 }) }),
      text('كل حرف إله حركته', { y: 0.57, size: 56, weight: 600, color: '@accent', anim: A('riseSoft', 1.1) }),
    ],
  }, { transition: 'stripes', tags: 'wave letters موجة حروف' }),

  tpl('type-kin-scatter', 'تجميع الحروف', 'kinetic', {
    duration: 5.5, bg: { type: 'plexus', count: 60 }, camera: { type: 'pull', amount: 1 },
    elements: [
      text('AUTOMATE', { y: 0.42, size: 150, anim: A('scatter', 0.2, { split: 'letter', stagger: 0.03, dur: 1.4 }) }),
      text('شي واحد كل يوم', { y: 0.55, size: 54, weight: 600, color: '@muted', anim: A('fade', 1.8) }),
      shape('rect', { y: 0.62, w: 160, h: 8, radius: 4, fill: '@accent', anim: A('growC', 2.0) }),
    ],
  }, { transition: 'tiles', tags: 'scatter assemble تجميع' }),

  tpl('type-kin-track', 'عنوان فيلم', 'kinetic', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'dolly', amount: 0.6 }, fx: { grain: 1, letterbox: 0.12, vignette: 0.8 },
    elements: [
      glowAt(0.5, 0.48, { alpha: 0.12, w: 1200, h: 500 }),
      text('THE FUTURE', { y: 0.44, size: 92, weight: 300, letterSpacing: 0.12, anim: A('track', 0.3, { dur: 2.4 }) }),
      text('IS AUTOMATED', { y: 0.53, size: 92, letterSpacing: 0.04, color: '@accent', anim: A('track', 1.0, { dur: 2.4 }) }),
      text('قريباً', { y: 0.65, size: 36, font: '@mono', weight: 500, color: '@muted', anim: A('fade', 2.8) }),
    ],
  }, { transition: 'fade', tags: 'movie trailer فيلم سينما' }),

  tpl('type-kin-ticker', 'جدار متحرك', 'kinetic', {
    duration: 6, bg: { type: 'solid' }, camera: { type: 'none' },
    elements: [
      el('ticker', { y: 0.5, w: 1750, rows: 10, size: 110, text: 'n8n  AI  MCP  AGENTS', sep: '  /  ', alt: true, speed: 140, rot: -10, color: '@fg/0.8', anim: A('fade', 0, { dur: 0.6 }) }),
      shape('rect', { y: 0.5, w: 760, h: 200, radius: 100, fill: '@accent', shadow: 1, anim: A('stretch', 0.6, { dur: 0.7 }) }),
      text('كل يوم شي جديد', { y: 0.5, size: 72, color: '@ink', anim: A('maskUp', 0.9) }),
    ],
  }, { transition: 'whip', tags: 'ticker marquee شريط' }),

  tpl('type-kin-rotator', 'كلمات بتتبدل', 'kinetic', {
    duration: 7, bg: { type: 'mesh' }, camera: { type: 'drift', amount: 0.8 },
    elements: [
      tag('// what i build', { y: 0.31 }),
      el('rotator', { y: 0.45, prefix: 'أنا ببني', words: ['وكلاء AI', 'أتمتة n8n', 'سيرفرات MCP', 'مواقع ذكية'], size: 76, interval: 1.2, anim: A('riseBlur', 0.4) }),
      text('وكلهم بيشتغلوا 24/7', { y: 0.59, size: 46, weight: 400, color: '@muted', anim: A('riseSoft', 1.2) }),
      sig(),
    ],
  }, { transition: 'flip', tags: 'rotating words كلمات متبدلة' }),

  tpl('type-kin-typewriter', 'آلة كاتبة', 'kinetic', {
    duration: 7, bg: { type: 'matrix', size: 26, speed: 0.6 }, camera: { type: 'push', amount: 0.5 }, fx: { scanlines: true, vignette: 0.6 },
    elements: [
      el('glow', { y: 0.46, w: 1200, h: 820, color: '@bg', alpha: 0.92, anim: A('none', 0) }),
      text('> agent.start()', { y: 0.3, size: 56, font: '@mono', weight: 600, color: '@accent', anim: A('typewriter', 0.3, { dur: 1 }) }),
      text('مرحبا… أنا وكيلك الجديد', { y: 0.45, size: 80, caret: true, anim: A('typewriter', 1.5, { dur: 1.6 }) }),
      text('بشتغل عنك، وما بتعب، وما بنسى', { y: 0.58, size: 48, weight: 400, color: '@muted', anim: A('typewriter', 3.3, { dur: 1.6 }) }),
    ],
  }, { transition: 'glitch', tags: 'typewriter typing كتابة' }),

  tpl('type-kin-decode', 'فك تشفير', 'kinetic', {
    duration: 5.5, bg: { type: 'circuit' }, camera: { type: 'dolly', amount: 0.8 }, fx: { scanlines: true, grain: 0.6 },
    elements: [
      el('corners', { y: 0.45, w: 860, h: 300, len: 50, strokeW: 4, all: true, anim: A('draw', 0.1) }),
      text('ACCESS GRANTED', { y: 0.45, size: 86, font: '@mono', weight: 700, color: '@accent', glow: 0.4, anim: A('scramble', 0.4, { dur: 1.8 }) }),
      text('وصلت للوحة التحكم بكل أتمتتك', { y: 0.62, size: 52, weight: 600, anim: A('riseBlur', 2.2, { split: 'word', stagger: 0.07 }) }),
      status('secure · encrypted', { x: 0.5, y: 0.75, anim: A('fade', 2.8) }),
    ],
  }, { transition: 'pixel', tags: 'decode hacker تشفير' }),

  tpl('type-kin-glitch', 'قلتش', 'kinetic', {
    duration: 5, bg: { type: 'grid', size: 60, speed: 30 }, camera: { type: 'shake', amount: 0.8 }, fx: { scanlines: true, grain: 0.8 },
    elements: [
      text('ERROR 404', { y: 0.36, size: 150, font: '@mono', weight: 800, anim: A('glitch', 0.2, { dur: 1.2, loop: 'shake', loopAmp: 0.4 }) }),
      text('وقتك الفاضي… مو موجود', { y: 0.52, size: 72, color: '@accent', anim: A('flicker', 1.3, { dur: 0.9 }) }),
      text('خلّي الأتمتة ترجّعلك ياه', { y: 0.63, size: 48, weight: 400, color: '@muted', anim: A('glitch', 2.0, { dur: 0.6 }) }),
    ],
  }, { transition: 'glitch', tags: 'glitch error قلتش' }),

  tpl('type-kin-stack', 'تكرار محدد', 'kinetic', {
    duration: 5, bg: { type: 'solid' }, camera: { type: 'pull', amount: 0.8 },
    elements: [
      text('AGENTS', { y: 0.2, size: 150, outline: true, strokeW: 3, color: '@fg/0.5', anim: A('slideR', 0.1, { dur: 0.9 }) }),
      text('AGENTS', { y: 0.35, size: 150, outline: true, strokeW: 3, color: '@fg/0.7', anim: A('slideL', 0.25, { dur: 0.9 }) }),
      text('AGENTS', { y: 0.5, size: 150, color: '@accent', glow: 0.4, anim: A('stretch', 0.6, { dur: 0.8 }) }),
      text('AGENTS', { y: 0.65, size: 150, outline: true, strokeW: 3, color: '@fg/0.7', anim: A('slideR', 0.25, { dur: 0.9 }) }),
      text('AGENTS', { y: 0.8, size: 150, outline: true, strokeW: 3, color: '@fg/0.5', anim: A('slideL', 0.1, { dur: 0.9 }) }),
    ],
  }, { transition: 'cube', tags: 'outline repeat تكرار' }),

  tpl('type-kin-manifesto', 'بيان سطر سطر', 'kinetic', {
    duration: 7, bg: { type: 'gradient', angle: 170 }, camera: { type: 'rise', amount: 0.6 },
    elements: [
      text('ما بدي أشتغل أكتر.\nبدي أشتغل *أذكى*.\nوخلّي الآلة\nتعمل الباقي.', { y: 0.45, size: 92, lineHeight: 1.35, hl: 'underline', markDelay: 0.7, anim: A('maskUp', 0.3, { split: 'line', stagger: 0.35, dur: 0.9 }) }),
      sig(),
    ],
  }, { transition: 'cover', tags: 'manifesto lines بيان' }),

  tpl('type-kin-stretch', 'مطّ وانحراف', 'kinetic', {
    duration: 4.5, bg: { type: 'rays', count: 16, speed: 0.12 }, camera: { type: 'punch', amount: 1.3 }, fx: { grain: 0.5 },
    elements: [
      text('BIG', { y: 0.32, size: 300, anim: A('stretch', 0.2, { dur: 0.7 }) }),
      text('IDEAS', { y: 0.52, size: 220, color: '@accent', anim: A('skew', 0.6, { dur: 0.7 }) }),
      text('عم اشتغل عليها هلق', { y: 0.7, size: 56, weight: 700, color: '@ink', rot: -3, box: { fill: '@fg', padX: 36, padY: 14 }, anim: A('pop', 1.2) }),
    ],
  }, { transition: 'zoom', tags: 'stretch skew مط' }),

  tpl('type-kin-shipit', 'سقوط حروف', 'kinetic', {
    duration: 5, bg: { type: 'floor', horizon: 0.72 }, camera: { type: 'push', amount: 0.7 },
    elements: [
      text('SHIP IT', { y: 0.26, size: 190, glow: 0.5, anim: A('letterDrop', 0.3, { split: 'letter', stagger: 0.08, dur: 0.9 }) }),
      text('أطلقت النسخة الأولى', { y: 0.38, size: 60, weight: 700, anim: A('riseBlur', 1.4) }),
      el('particles', { kind: 'burst', y: 0.26, count: 90, w: 1000, h: 1000, anim: A('fade', 1.0, { dur: 0.2 }) }),
    ],
  }, { transition: 'zoomThrough', tags: 'launch ship إطلاق' }),
];
