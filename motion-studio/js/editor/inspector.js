// Inspector: tabs for the selected element, or for the scene when nothing is selected.
import { S, scene, selected, emit, on, commit, sceneStart } from './store.js';
import { h, icon, section, field, range, chips, select, toggle, textInput, numberInput, colorField, presetGrid, toast } from './ui.js';
import { requestRender, SIZE_KEYS, goToScene, makeEnv, dims, highlight, inlineEdit } from './stage.js';
import { TYPE_LABEL, makeElement, iconPicker, pickImage } from './elements-panel.js';
import { IN, OUT, LOOP } from '../engine/anim.js';
import { EASE_NAMES, deepClone, uid, clamp } from '../engine/util.js';
import { resolveTheme } from '../engine/themes.js';
import { FONTS } from '../engine/fonts.js';
import { SHAPES, SHAPE_LABELS } from '../engine/el-basic.js';
import { OBJ3D, OBJ3D_LABELS, PARTICLES, PARTICLE_LABELS } from '../engine/el-fx.js';
import * as BGM from '../engine/backgrounds.js';
import * as AUD from '../engine/audio.js';
import { renderScene, createEnv } from '../engine/renderer.js';
import { ensureFonts } from './fontsync.js';
import { randomizeMotion, mirrorScene } from './remix.js';
import { transitionPicker, cameraPicker, soundSelect, soundBrowser, soundPacks, playPreview, bgPresets, trList } from './gallery.js';
import { openPoster } from './poster.js';
import { images } from './stage.js';

let root;
let commitTimer = null;
const later = () => { clearTimeout(commitTimer); commitTimer = setTimeout(() => commit(), 650); };
const touch = () => { requestRender(); emit('edit'); };
const setter = (obj, key, { live = true } = {}) => ({
  input: (v) => { obj[key] = v; if (live) touch(); },
  commit: () => { commit(); },
});

export function initInspector() {
  root = document.getElementById('inspector');
  let t = null;
  const rebuild = () => { clearTimeout(t); t = setTimeout(build, 0); };
  on('select', rebuild);
  on('structure', rebuild);
  on('scene', () => { if (!S.selId) rebuild(); });
  on('theme', rebuild);
  on('focusContent', () => setTimeout(() => { const f = root.querySelector('textarea, .input'); if (f) f.focus(); }, 30));
  build();
}

function build() {
  const scroll = root.scrollTop;
  root.innerHTML = '';
  if (!S.project.scenes.length) {
    root.append(h('div', { class: 'tip' }, 'ابدأ باختيار قالب من القائمة، أو أضف مشهد فاضي.'));
    return;
  }
  const el = selected();
  if (el) elementPanel(el);
  else scenePanel(scene());
  root.scrollTop = scroll;
}

// ====================================================================== element
let elTab = 'content';
let scTab = 'scene';
function tabBar(cur, list, onPick) {
  const bar = h('div', { class: 'itabs', role: 'tablist' });
  list.forEach(([id, lab]) => {
    const b = h('button', { type: 'button', role: 'tab', class: id === cur ? 'on' : '', 'aria-selected': id === cur ? 'true' : 'false' }, lab);
    b.addEventListener('click', () => onPick(id));
    bar.appendChild(b);
  });
  return bar;
}

function elementPanel(el) {
  const th = resolveTheme(S.project);
  const head = h('div', { class: 'insp-head' },
    h('h3', {}, TYPE_LABEL[el.type] || el.type, h('small', {}, el.type)),
    iconBtn('copy', 'نسخ العنصر (Ctrl+D)', () => duplicateEl(el)),
    iconBtn('up', 'لقدّام', () => moveLayer(el, 1)),
    iconBtn('down', 'لورا', () => moveLayer(el, -1)),
    iconBtn('trash', 'حذف (Delete)', () => deleteEl(el)),
  );
  const back = h('button', { class: 'btn small ghost', type: 'button', style: { marginBottom: '8px' } }, '→ رجوع للمشهد');
  back.addEventListener('click', () => { S.selId = null; emit('select'); });
  root.append(back, head, tabBar(elTab, [['content', 'المحتوى'], ['look', 'الشكل'], ['motion', 'الحركة'], ['sound', 'الصوت']], (v) => { elTab = v; build(); }));
  const content = contentFields(el, th);
  const style = styleFields(el, th);
  let quick = [], rest = style;
  if (el.type === 'text') { quick = style.slice(0, 7); rest = style.slice(7); }
  else if (!content.length) { quick = style; rest = []; }
  if (elTab === 'content') {
    if (el.type === 'text') {
      const edit = h('button', { class: 'btn small', type: 'button', style: { marginBottom: '10px' } }, icon('edit'), 'اكتب فوق الفيديو مباشرة');
      edit.addEventListener('click', () => inlineEdit(el));
      root.append(edit);
    }
    root.append(...content, ...quick);
    if (!content.length && !quick.length) root.append(h('div', { class: 'tip' }, 'هالعنصر ما إله محتوى نصي. شوف تبويب «الشكل».'));
  } else if (elTab === 'look') {
    if (rest.length) root.append(section('التنسيق', rest));
    root.append(section('الحجم والموقع', positionFields(el)));
  } else if (elTab === 'motion') root.append(...motionFields(el));
  else root.append(...soundFieldsEl(el));
}

function soundFieldsEl(el) {
  const f = [];
  const inv = () => { if (AUD.invalidateSfx) AUD.invalidateSfx(); };
  const pct = (v) => Math.round(v * 100) + '%';
  f.push(h('div', { class: 'tip' }, 'هالصوت بيشتغل لحظة دخول العنصر. ', h('b', {}, 'تلقائي'), ' يعني بينختار حسب الحركة والستايل الصوتي للفيديو.'));
  f.push(field('صوت الدخول', soundSelect(el.sfx || 'auto', (v) => { el.sfx = v; inv(); commit(); })));
  f.push(range('العلو', el.sfxVol ?? 1, { min: 0, max: 2, step: 0.05, fmt: pct }, (v) => { el.sfxVol = v; inv(); }, commit));
  f.push(range('تأخير / تقديم (ثانية)', el.sfxDelay ?? 0, { min: -1, max: 3, step: 0.05 }, (v) => { el.sfxDelay = v; inv(); }, commit));
  f.push(range('طبقة الصوت (أحد ↔ أعمق)', el.sfxPitch ?? 1, { min: 0.5, max: 2, step: 0.05 }, (v) => { el.sfxPitch = v; inv(); }, commit));
  const test = h('button', { class: 'btn small', type: 'button' }, icon('play'), 'اسمع مع الحركة');
  test.addEventListener('click', () => previewEl(el));
  f.push(h('div', { class: 'btn-row' }, test));
  f.push(section('مكتبة الأصوات (كبسة = اسمع وطبّق)', [soundBrowser((x) => { el.sfx = x.id; inv(); commit(); build(); })], true));
  return f;
}

function iconBtn(name, title, fn) {
  const b = h('button', { class: 'icon-btn sm', type: 'button', title, 'aria-label': title }, icon(name));
  b.addEventListener('click', fn);
  return b;
}

export function duplicateEl(el) {
  const sc = scene();
  const c = deepClone(el);
  c.id = uid('e');
  c.x = clamp((c.x ?? 0.5) + 0.03, 0, 1);
  c.y = clamp((c.y ?? 0.5) + 0.03, 0, 1);
  sc.elements.splice(sc.elements.indexOf(el) + 1, 0, c);
  S.selId = c.id;
  commit();
  emit('structure', 'select', 'render');
}
export function deleteEl(el) {
  const sc = scene();
  sc.elements = sc.elements.filter((e) => e !== el);
  S.selId = null;
  commit();
  emit('structure', 'select', 'render');
}
function moveLayer(el, d) {
  const a = scene().elements;
  const i = a.indexOf(el), j = clamp(i + d, 0, a.length - 1);
  if (i === j) return;
  a.splice(i, 1);
  a.splice(j, 0, el);
  commit();
  emit('structure', 'render');
}

const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const csvNums = (s) => s.split(/[,،\s]+/).map((x) => parseFloat(x)).filter((x) => !isNaN(x));
const csv = (s) => s.split(/[,،]/).map((x) => x.trim()).filter(Boolean);

function R(el, key, label, min, max, step = 1, dflt) {
  const st = setter(el, key);
  return range(label, el[key] ?? dflt ?? min, { min, max, step }, st.input, st.commit);
}
function C(el, key, label, th, opts) {
  return colorField(label, el[key] ?? (opts && opts.dflt) ?? '@fg', th, (v) => { el[key] = v; touch(); later(); }, opts);
}
function T(el, key, label, opts = {}) {
  return textInput(label, el[key] ?? '', (v) => { el[key] = v; touch(); later(); }, opts);
}
function TG(el, key, label) {
  return toggle(label, !!el[key], (v) => { el[key] = v; touch(); commit(); });
}
function CH(el, key, label, opts, dflt) {
  return chips(label, el[key] ?? dflt, opts, (v) => { el[key] = v; touch(); commit(); });
}
function SEL(el, key, label, opts, dflt, after) {
  return select(label, el[key] ?? dflt, opts, (v) => { el[key] = v; touch(); commit(); after && after(v); });
}
function fontOptions() {
  return [['@display', 'خط العناوين (الثيم)'], ['@body', 'خط النص (الثيم)'], ['@mono', 'خط الكود (الثيم)'], ...FONTS.map((f) => [f.f, f.f + (f.ar ? ' · عربي' : '')])];
}
function FONT(el, key = 'font', label = 'الخط', dflt = '@display') {
  return select(label, el[key] ?? dflt, fontOptions(), async (v) => { el[key] = v; await ensureFonts([v]); touch(); commit(); });
}

function contentFields(el, th) {
  const f = [];
  switch (el.type) {
    case 'text':
      f.push(T(el, 'text', 'النص', { multiline: true, rows: 3 }));
      f.push(h('div', { class: 'hint field' }, 'حط *نجمتين* حول أي كلمة لتطلع ملوّنة. سطر جديد = Enter.'));
      break;
    case 'counter':
      f.push(h('div', { class: 'row2' }, numberInput('من', el.from ?? 0, (v) => { el.from = v; touch(); commit(); }), numberInput('إلى', el.to ?? 100, (v) => { el.to = v; touch(); commit(); })));
      f.push(h('div', { class: 'row3' }, T(el, 'prefix', 'قبل الرقم'), T(el, 'suffix', 'بعد الرقم'), numberInput('كسور', el.decimals ?? 0, (v) => { el.decimals = clamp(v, 0, 3); touch(); commit(); }, { min: 0, max: 3 })));
      break;
    case 'rotator':
      f.push(T(el, 'prefix', 'النص الثابت'));
      f.push(textInput('الكلمات المتبدلة (كل كلمة بسطر)', (el.words || []).join('\n'), (v) => { el.words = lines(v).length ? lines(v) : ['…']; touch(); later(); }, { multiline: true, rows: 3 }));
      break;
    case 'ticker': f.push(T(el, 'text', 'النص')); break;
    case 'signature':
      f.push(T(el, 'name', 'الاسم'), T(el, 'role', 'السطر الثاني', { dir: 'ltr' }));
      break;
    case 'status': f.push(T(el, 'label', 'النص', { dir: 'ltr' })); break;
    case 'image':
      f.push(btnRow([['تغيير الصورة', () => pickImage((src) => { el.src = src; emit('images'); touch(); commit(); })], ['إزالة', () => { delete el.src; touch(); commit(); }]]));
      break;
    case 'device':
      f.push(btnRow([['صورة للشاشة', () => pickImage((src) => { el.src = src; emit('images'); touch(); commit(); })], ['بدون صورة', () => { delete el.src; touch(); commit(); }]]));
      if ((el.kind || 'phone') === 'browser') f.push(T(el, 'url', 'الرابط', { dir: 'ltr' }));
      f.push(TG(el, 'scroll', 'تمرير الصورة الطويلة (سكرول)'));
      break;
    case 'icon':
      f.push(field('الأيقونة', iconPicker((n) => { el.name = n; touch(); commit(); }, el.name)));
      break;
    case 'bars':
      f.push(textInput('القيم (بفاصلة)', (el.values || []).join(', '), (v) => { const n = csvNums(v); if (n.length) { el.values = n; touch(); later(); } }, { dir: 'ltr' }));
      f.push(textInput('العناوين (بفاصلة)', (el.labels || []).join('، '), (v) => { el.labels = csv(v); touch(); later(); }));
      f.push(h('div', { class: 'row2' }, T(el, 'suffix', 'وحدة'), numberInput('العمود المميّز', (el.hi ?? -1) + 1, (v) => { el.hi = v - 1; touch(); commit(); }, { min: 0 })));
      break;
    case 'linechart':
      f.push(textInput('القيم (بفاصلة)', (el.values || []).join(', '), (v) => { const n = csvNums(v); if (n.length > 1) { el.values = n; touch(); later(); } }, { dir: 'ltr' }));
      f.push(T(el, 'tip', 'ملاحظة على آخر نقطة'));
      break;
    case 'donut':
      f.push(range('النسبة', el.value ?? 0.75, { min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' }, (v) => { el.value = v; delete el.values; touch(); }, commit));
      f.push(h('div', { class: 'row2' }, T(el, 'label', 'النص بالنص'), T(el, 'sub', 'تحته')));
      break;
    case 'progress':
      f.push(T(el, 'label', 'العنوان'));
      f.push(range('النسبة', el.value ?? 0.8, { min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' }, (v) => { el.value = v; touch(); }, commit));
      break;
    case 'list':
      f.push(textInput('البنود (كل بند بسطر)', (el.items || []).join('\n'), (v) => { el.items = lines(v); touch(); later(); }, { multiline: true, rows: 4 }));
      break;
    case 'timeline':
      f.push(textInput('المراحل: عنوان | تفصيل', (el.items || []).map((x) => x.t + (x.s ? ' | ' + x.s : '')).join('\n'), (v) => {
        el.items = lines(v).map((l) => { const [t, s] = l.split('|').map((x) => x.trim()); return { t, s }; });
        touch(); later();
      }, { multiline: true, rows: 4 }));
      break;
    case 'flow':
      f.push(textInput('العقد: اسم | أيقونة', (el.nodes || []).map((n) => n.label + (n.icon ? ' | ' + n.icon : '')).join('\n'), (v) => {
        const ls = lines(v);
        el.nodes = ls.map((l, i) => { const [label, ic] = l.split('|').map((x) => x.trim()); return { label, icon: ic || ['bolt', 'bot', 'database', 'mail', 'message', 'check'][i % 6], hot: el.nodes && el.nodes[i] ? el.nodes[i].hot : false }; });
        layoutFlow(el);
        touch(); later();
      }, { multiline: true, rows: 4, dir: 'ltr' }));
      f.push(h('div', { class: 'hint field' }, 'أسماء الأيقونات: bolt, bot, database, mail, message, code, cloud, globe, rocket, user, check, workflow, brain, cart, bell'));
      f.push(select('الترتيب', el.layout || 'chain', [['chain', 'سلسلة أفقية'], ['vertical', 'عمودي'], ['branch', 'تفرّع 1 ← كثير'], ['merge', 'تجميع كثير ← 1'], ['circle', 'دائرة'], ['zigzag', 'متعرج']], (v) => { el.layout = v; layoutFlow(el); touch(); commit(); }));
      f.push(numberInput('العقدة المميّزة (رقم)', (el.nodes || []).findIndex((n) => n.hot) + 1, (v) => { (el.nodes || []).forEach((n, i) => (n.hot = i === v - 1)); touch(); commit(); }, { min: 0 }));
      break;
    case 'code':
      f.push(CH(el, 'mode', 'النوع', [['code', 'كود'], ['terminal', 'تيرمنال']], 'code'));
      f.push(T(el, 'title', 'عنوان النافذة', { dir: 'ltr' }));
      f.push(textInput('الأسطر', (el.lines || []).join('\n'), (v) => { el.lines = v.split('\n'); touch(); later(); }, { multiline: true, rows: 5, dir: 'ltr' }));
      f.push(h('div', { class: 'hint field' }, 'بالتيرمنال: السطر اللي بيبلش بـ $ بينكتب، والباقي بيطلع كنتيجة.'));
      break;
    case 'chat':
      f.push(textInput('الرسائل: + رسالتك / - رسالة الطرف التاني', (el.messages || []).map((m) => (m.me ? '+ ' : '- ') + m.text).join('\n'), (v) => {
        el.messages = lines(v).map((l) => ({ me: l.startsWith('+'), text: l.replace(/^[+-]\s*/, '') }));
        touch(); later();
      }, { multiline: true, rows: 5 }));
      f.push(toggle('رأس المحادثة (اسم وحالة)', !!el.header, (v) => { el.header = v ? { name: 'Sara', status: 'online' } : null; touch(); commit(); build(); }));
      if (el.header) f.push(h('div', { class: 'row2' }, textInput('الاسم', el.header.name, (v) => { el.header.name = v; touch(); later(); }), textInput('الحالة', el.header.status, (v) => { el.header.status = v; touch(); later(); })));
      break;
    case 'notify':
      f.push(h('div', { class: 'row2' }, T(el, 'app', 'التطبيق', { dir: 'ltr' }), T(el, 'time', 'الوقت')));
      f.push(T(el, 'title', 'العنوان'), T(el, 'body', 'النص', { multiline: true, rows: 2 }));
      f.push(field('الأيقونة', iconPicker((n) => { el.icon = n; touch(); commit(); }, el.icon)));
      break;
  }
  return f;
}

function btnRow(items) {
  return h('div', { class: 'btn-row' }, ...items.map(([lab, fn]) => { const b = h('button', { class: 'btn small', type: 'button' }, lab); b.addEventListener('click', fn); return b; }));
}

export function layoutFlow(el) {
  const n = (el.nodes || []).length;
  const L = el.layout || 'chain';
  const spread = (i, k) => (k <= 1 ? 0 : -0.42 + (i / (k - 1)) * 0.84);
  el.edges = null;
  el.nodes.forEach((nd, i) => {
    if (L === 'chain') { nd.x = spread(i, n); nd.y = 0; }
    else if (L === 'vertical') { nd.x = 0; nd.y = spread(i, n); }
    else if (L === 'zigzag') { nd.x = spread(i, n); nd.y = i % 2 ? 0.28 : -0.28; }
    else if (L === 'branch') { if (i === 0) { nd.x = -0.38; nd.y = 0; } else { nd.x = 0.36; nd.y = spread(i - 1, n - 1); } }
    else if (L === 'merge') { if (i === n - 1) { nd.x = 0.36; nd.y = 0; } else { nd.x = -0.38; nd.y = spread(i, n - 1); } }
    else if (L === 'circle') { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; nd.x = Math.cos(a) * 0.38; nd.y = Math.sin(a) * 0.38; }
  });
  if (L === 'branch') el.edges = el.nodes.slice(1).map((_, i) => [0, i + 1]);
  if (L === 'merge') el.edges = el.nodes.slice(0, -1).map((_, i) => [i, n - 1]);
  if (L === 'circle') el.edges = el.nodes.map((_, i) => [i, (i + 1) % n]);
  if (L === 'circle' || L === 'vertical') { el.h = Math.max(el.h || 300, 700); }
  if (!el.edges) delete el.edges;
}

function styleFields(el, th) {
  const f = [];
  const weights = [[300, 'خفيف'], [400, 'عادي'], [600, 'وسط'], [800, 'عريض']];
  switch (el.type) {
    case 'text':
      f.push(FONT(el));
      f.push(R(el, 'size', 'حجم الخط', 16, 400, 1, 84));
      f.push(CH(el, 'weight', 'السماكة', weights, 800));
      f.push(C(el, 'color', 'لون النص', th));
      f.push(C(el, 'accentColor', 'لون الكلمات المميزة', th, { dflt: '@accent' }));
      f.push(SEL(el, 'hl', 'شكل الكلمات المميزة', [['color', 'لون فقط'], ['marker', 'قلم تظليل'], ['underline', 'خط تحتها'], ['box', 'إطار'], ['gradient', 'تدرج'], ['outline', 'محددة فقط']], 'color'));
      f.push(CH(el, 'align', 'المحاذاة', [['start', 'بداية'], ['center', 'وسط'], ['end', 'نهاية']], 'center'));
      f.push(R(el, 'w', 'عرض السطر', 120, 1800, 10, 860));
      f.push(R(el, 'lineHeight', 'تباعد الأسطر', 0.8, 2.4, 0.05, 1.2));
      f.push(R(el, 'letterSpacing', 'تباعد الحروف (إنكليزي)', -0.1, 0.5, 0.01, 0));
      f.push(R(el, 'glow', 'توهج', 0, 1.5, 0.05, 0));
      f.push(R(el, 'shadow', 'ظل', 0, 1.5, 0.05, 0));
      f.push(TG(el, 'caret', 'مؤشر كتابة ▍ بالآخر'));
      f.push(TG(el, 'upper', 'أحرف كبيرة (إنكليزي)'));
      f.push(TG(el, 'outline', 'نص محدد بدون تعبئة'));
      f.push(toggle('خلفية خلف النص (كبسولة)', !!el.box, (v) => { el.box = v ? { fill: '@accent', padX: 36, padY: 16 } : null; if (v && (!el.color || el.color === '@fg')) el.color = '@ink'; touch(); commit(); build(); }));
      if (el.box) {
        f.push(colorField('لون الكبسولة', el.box.fill ?? '@accent', th, (v) => { el.box.fill = v; touch(); later(); }, { tokens: ['accent', 'secondary', 'card', 'fg', 'bg', 'ink'] }));
        f.push(range('زوايا الكبسولة', el.box.radius === 'pill' || el.box.radius == null ? 200 : el.box.radius, { min: 0, max: 200, step: 1 }, (v) => { el.box.radius = v >= 200 ? 'pill' : v; touch(); }, commit));
      }
      break;
    case 'shape': {
      f.push(select('الشكل', el.shape || 'rect', SHAPES.map((s) => [s, SHAPE_LABELS[s]]), (v) => { el.shape = v; touch(); commit(); }));
      const isGrad = el.fill && typeof el.fill === 'object';
      f.push(chips('التعبئة', el.fill === 'none' ? 'none' : isGrad ? 'grad' : 'solid', [['solid', 'لون'], ['grad', 'تدرج'], ['none', 'بدون']], (v) => {
        if (v === 'solid') el.fill = '@accent';
        else if (v === 'grad') el.fill = { g: 'linear', colors: ['@accent', '@secondary'], angle: 135 };
        else el.fill = 'none';
        touch(); commit(); build();
      }));
      if (isGrad) {
        f.push(colorField('لون 1', el.fill.colors[0], th, (v) => { el.fill.colors[0] = v; touch(); later(); }));
        f.push(colorField('لون 2', el.fill.colors[1], th, (v) => { el.fill.colors[1] = v; touch(); later(); }));
        f.push(range('زاوية التدرج', el.fill.angle ?? 135, { min: 0, max: 360, step: 1 }, (v) => { el.fill.angle = v; touch(); }, commit));
      } else if (el.fill !== 'none') f.push(C(el, 'fill', 'اللون', th, { dflt: '@accent' }));
      f.push(C(el, 'stroke', 'لون الحد', th, { allowNone: true, dflt: 'none' }));
      f.push(R(el, 'strokeW', 'سماكة الحد', 0, 40, 0.5, 6));
      if (['rect'].includes(el.shape || 'rect')) f.push(R(el, 'radius', 'تدوير الزوايا', 0, 300, 1, 0));
      if (['star', 'burst', 'polygon'].includes(el.shape)) f.push(R(el, 'sides', 'عدد الرؤوس', 3, 24, 1, el.shape === 'polygon' ? 6 : el.shape === 'star' ? 5 : 16));
      if (['wave', 'zigzag', 'spiral'].includes(el.shape)) f.push(R(el, 'cycles', 'عدد التموجات', 1, 16, 1, 3));
      if (['wave', 'blob'].includes(el.shape)) f.push(R(el, 'speed', 'سرعة الحركة', 0, 4, 0.05, el.shape === 'blob' ? 0.35 : 2));
      f.push(TG(el, 'glass', 'زجاج شفاف'));
      f.push(R(el, 'glow', 'توهج', 0, 1.5, 0.05, 0));
      f.push(R(el, 'shadow', 'ظل ناعم', 0, 1.5, 0.05, 0));
      break;
    }
    case 'glow':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent', tokens: ['accent', 'secondary', 'fg', 'bg', 'bg2'] }));
      f.push(R(el, 'alpha', 'القوة', 0, 1, 0.01, 0.35));
      break;
    case 'image':
      f.push(CH(el, 'mask', 'القص', [['rect', 'مستطيل'], ['circle', 'دائرة']], 'rect'));
      f.push(R(el, 'radius', 'تدوير الزوايا', 0, 300, 1, 22));
      f.push(CH(el, 'fit', 'الملاءمة', [['cover', 'تعبئة'], ['contain', 'كاملة']], 'cover'));
      f.push(R(el, 'kenburns', 'زووم بطيء', 0, 0.4, 0.01, 0.08));
      f.push(SEL(el, 'filter', 'فلتر', [['none', 'بدون'], ['gray', 'أبيض وأسود'], ['warm', 'دافئ'], ['contrast', 'تباين'], ['dim', 'معتم']], 'none'));
      f.push(C(el, 'border', 'إطار', th, { allowNone: true, dflt: 'none' }));
      f.push(R(el, 'fade', 'تلاشي من تحت', 0, 1, 0.01, 0));
      f.push(R(el, 'shadow', 'ظل', 0, 1.5, 0.05, 0));
      break;
    case 'icon':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(R(el, 'strokeW', 'سماكة الخط', 0.5, 4, 0.1, 2));
      f.push(TG(el, 'filled', 'تعبئة كاملة'));
      f.push(C(el, 'bg', 'خلفية', th, { allowNone: true, dflt: 'none' }));
      f.push(CH(el, 'bgShape', 'شكل الخلفية', [['circle', 'دائرة'], ['square', 'مربع']], 'circle'));
      f.push(R(el, 'repeat', 'تكرار', 1, 10, 1, 1));
      f.push(R(el, 'glow', 'توهج', 0, 1.5, 0.05, 0));
      break;
    case 'counter':
      f.push(CH(el, 'style', 'الأسلوب', [['count', 'عد'], ['roll', 'دوران أرقام']], 'count'));
      f.push(FONT(el));
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(R(el, 'countDur', 'مدة العد', 0.3, 6, 0.1, 1.8));
      f.push(R(el, 'glow', 'توهج', 0, 1.5, 0.05, 0));
      f.push(TG(el, 'underline', 'خط تحت الرقم'));
      break;
    case 'rotator':
      f.push(FONT(el));
      f.push(C(el, 'color', 'لون النص الثابت', th));
      f.push(TG(el, 'pill', 'الكلمة جوا كبسولة'));
      f.push(C(el, 'pillColor', 'لون الكبسولة', th, { dflt: '@accent' }));
      f.push(C(el, 'wordColor', 'لون الكلمة', th, { dflt: '@ink' }));
      f.push(R(el, 'interval', 'سرعة التبديل (ثانية)', 0.5, 4, 0.1, 1.4));
      break;
    case 'ticker':
      f.push(FONT(el));
      f.push(C(el, 'color', 'اللون', th));
      f.push(R(el, 'rows', 'عدد الأسطر', 1, 6, 1, 1));
      f.push(R(el, 'speed', 'السرعة', 20, 600, 5, 160));
      f.push(TG(el, 'alt', 'تبديل محدد / معبى'));
      f.push(TG(el, 'outline', 'محدد فقط'));
      break;
    case 'signature': case 'status':
      f.push(C(el, 'color', 'لون العلامة', th, { dflt: '@accent' }));
      break;
    case 'corners':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(R(el, 'len', 'طول الزاوية', 10, 300, 1, 60));
      f.push(R(el, 'strokeW', 'السماكة', 1, 20, 0.5, 5));
      f.push(TG(el, 'all', 'أربع زوايا'));
      break;
    case 'bars':
      f.push(CH(el, 'orient', 'الاتجاه', [['v', 'عمودي'], ['h', 'أفقي']], 'v'));
      f.push(TG(el, 'showValues', 'إظهار الأرقام'));
      f.push(R(el, 'radius', 'تدوير', 0, 60, 1, 14));
      f.push(R(el, 'gap', 'المسافة', 0.05, 0.8, 0.01, 0.35));
      break;
    case 'linechart':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(TG(el, 'area', 'تعبئة تحت الخط'));
      f.push(R(el, 'strokeW', 'سماكة الخط', 1, 20, 0.5, 7));
      break;
    case 'donut': case 'progress':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      if (el.type === 'donut') f.push(R(el, 'thick', 'السماكة', 0.04, 0.5, 0.01, 0.18));
      break;
    case 'list':
      f.push(SEL(el, 'icon', 'العلامة', [['check', '✓ صح'], ['num', 'أرقام'], ['comment', '01 كود'], ['dot', 'نقطة'], ['arrowRight', 'سهم'], ['star', 'نجمة'], ['x', 'خطأ'], ['bolt', 'برق'], ['sparkles', 'لمعة']], 'check'));
      f.push(C(el, 'iconColor', 'لون العلامة', th, { dflt: '@accent' }));
      f.push(C(el, 'color', 'لون النص', th));
      f.push(R(el, 'size', 'حجم النص', 16, 120, 1, 44));
      f.push(R(el, 'gap', 'المسافة', 0, 120, 1, 34));
      f.push(FONT(el, 'font', 'الخط', '@body'));
      break;
    case 'timeline':
      f.push(CH(el, 'orient', 'الاتجاه', [['v', 'عمودي'], ['h', 'أفقي']], 'v'));
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(R(el, 'size', 'حجم النص', 16, 100, 1, 40));
      break;
    case 'flow':
      f.push(C(el, 'color', 'لون النبضات', th, { dflt: '@accent' }));
      f.push(R(el, 'nodeSize', 'حجم العقدة', 50, 300, 1, 120));
      f.push(R(el, 'pulses', 'عدد النبضات', 0, 4, 1, 1));
      f.push(TG(el, 'dashed', 'خطوط متقطعة'));
      f.push(TG(el, 'round', 'عقد دائرية'));
      break;
    case 'equalizer':
      f.push(C(el, 'color', 'اللون', th, { dflt: '@accent' }));
      f.push(R(el, 'bars', 'عدد الأعمدة', 6, 80, 1, 24));
      f.push(R(el, 'speed', 'السرعة', 0.2, 8, 0.1, 2.4));
      break;
    case 'code':
      f.push(R(el, 'size', 'حجم الخط', 14, 60, 1, 30));
      f.push(R(el, 'cps', 'سرعة الكتابة', 5, 200, 1, 40));
      f.push(toggle('كتابة متحركة', el.typing !== false, (v) => { el.typing = v; touch(); commit(); }));
      f.push(toggle('أرقام الأسطر', el.lineNumbers !== false, (v) => { el.lineNumbers = v; touch(); commit(); }));
      break;
    case 'chat':
      f.push(R(el, 'size', 'حجم النص', 18, 70, 1, 34));
      f.push(R(el, 'interval', 'الوقت بين الرسائل', 0.3, 4, 0.1, 1.1));
      f.push(C(el, 'meColor', 'لون رسائلك', th, { dflt: '@accent' }));
      f.push(TG(el, 'frame', 'إطار زجاجي'));
      break;
    case 'device':
      f.push(CH(el, 'kind', 'الجهاز', [['phone', 'جوال'], ['browser', 'متصفح']], 'phone'));
      break;
    case 'obj3d':
      f.push(select('المجسم', el.shape || 'globe', OBJ3D.map((s) => [s, OBJ3D_LABELS[s]]), (v) => { el.shape = v; touch(); commit(); }));
      f.push(C(el, 'color', 'لون 1', th, { dflt: '@accent' }));
      f.push(C(el, 'color2', 'لون 2', th, { dflt: '@secondary' }));
      f.push(R(el, 'speed', 'سرعة الدوران', -3, 3, 0.05, 0.5));
      f.push(R(el, 'tilt', 'الميلان', -1.5, 1.5, 0.05, -0.35));
      f.push(CH(el, 'style', 'الأسلوب', [['wire', 'خطوط ونقاط'], ['lines', 'خطوط فقط'], ['dots', 'نقاط']], 'wire'));
      f.push(R(el, 'glow', 'توهج', 0, 1.5, 0.05, 0));
      break;
    case 'particles':
      f.push(select('النوع', el.kind || 'sparkle', PARTICLES.map((k) => [k, PARTICLE_LABELS[k]]), (v) => { el.kind = v; touch(); commit(); }));
      f.push(R(el, 'count', 'العدد', 5, 400, 1, 60));
      f.push(R(el, 'speed', 'السرعة', 0.1, 4, 0.05, 1));
      f.push(R(el, 'size', 'الحجم', 0.3, 4, 0.05, 1));
      break;
  }
  return f;
}

function positionFields(el) {
  const f = [];
  const pct = (v) => Math.round(v * 100) + '%';
  f.push(h('div', { class: 'row2' },
    range('أفقي', el.x ?? 0.5, { min: -0.2, max: 1.2, step: 0.001, fmt: pct }, (v) => { el.x = v; touch(); }, commit),
    range('عمودي', el.y ?? 0.5, { min: -0.2, max: 1.2, step: 0.001, fmt: pct }, (v) => { el.y = v; touch(); }, commit)));
  const keys = SIZE_KEYS[el.type] || [];
  const lab = { size: 'الحجم', w: 'العرض', h: 'الارتفاع', nodeSize: 'حجم العقدة' };
  const max = { size: 600, w: 2400, h: 2400, nodeSize: 400 };
  keys.filter((k) => !(el.type === 'text' && k === 'w')).forEach((k) => f.push(R(el, k, lab[k] || k, 4, max[k] || 2000, 1, k === 'size' ? 80 : 400)));
  f.push(R(el, 'rot', 'الدوران', -180, 180, 1, 0));
  f.push(range('الشفافية', el.opacity ?? 1, { min: 0, max: 1, step: 0.01, fmt: pct }, (v) => { el.opacity = v; touch(); }, commit));
  f.push(range('العمق (بارالاكس مع الكاميرا)', el.z ?? 0, { min: -1, max: 1, step: 0.05 }, (v) => { el.z = v; touch(); }, commit));
  f.push(SEL(el, 'blend', 'دمج الألوان', [['normal', 'عادي'], ['screen', 'إضاءة'], ['multiply', 'تعتيم'], ['overlay', 'تراكب'], ['lighter', 'إضافة']], 'normal'));
  f.push(btnRow([
    ['توسيط أفقي', () => { el.x = 0.5; touch(); commit(); build(); }],
    ['توسيط عمودي', () => { el.y = 0.5; touch(); commit(); build(); }],
    ['قلب', () => { el.flipX = !el.flipX; touch(); commit(); }],
  ]));
  return f;
}

function motionFields(el) {
  const a = (el.anim = el.anim || {});
  const f = [];
  const setA = (k, v) => { a[k] = v; touch(); };
  const inOpts = Object.entries(IN).map(([k, v]) => [k, v[0]]);
  f.push(presetGrid('حركة الدخول', a.in || 'none', inOpts, (v) => { a.in = v; a.ease = 'auto'; touch(); commit(); previewEl(el); }));
  if (el.type === 'text') f.push(chips('تقسيم الحركة', a.split || 'none', [['none', 'كتلة واحدة'], ['line', 'سطر سطر'], ['word', 'كلمة كلمة'], ['letter', 'حرف حرف']], (v) => { a.split = v; touch(); commit(); previewEl(el); }));
  f.push(h('div', { class: 'row2' },
    range('يبدأ بعد (ث)', a.start ?? 0, { min: 0, max: Math.max(1, scene().duration), step: 0.05 }, (v) => setA('start', v), commit),
    range('المدة (ث)', a.dur ?? 0.7, { min: 0.05, max: 4, step: 0.05 }, (v) => setA('dur', v), commit)));
  if (el.type === 'text' || el.type === 'list' || el.type === 'flow' || el.type === 'timeline' || el.type === 'bars' || el.type === 'icon')
    f.push(range('الفاصل بين الأجزاء (ث)', a.stagger ?? 0.06, { min: 0, max: 1, step: 0.01 }, (v) => setA('stagger', v), commit));
  f.push(select('الإيقاع (Easing)', a.ease || 'auto', [['auto', 'تلقائي حسب الحركة'], ...EASE_NAMES.map((n) => [n, n])], (v) => { a.ease = v; touch(); commit(); }));
  f.push(select('حركة الخروج', a.out || 'none', Object.entries(OUT).map(([k, v]) => [k, v[0]]), (v) => { a.out = v; touch(); commit(); }));
  if (a.out && a.out !== 'none') f.push(range('مدة الخروج', a.outDur ?? 0.45, { min: 0.1, max: 2, step: 0.05 }, (v) => setA('outDur', v), commit));
  f.push(select('حركة مستمرة', a.loop || 'none', Object.entries(LOOP).map(([k, v]) => [k, v[0]]), (v) => { a.loop = v; touch(); commit(); }));
  if (a.loop && a.loop !== 'none') f.push(h('div', { class: 'row2' },
    range('القوة', a.loopAmp ?? 1, { min: 0, max: 4, step: 0.05 }, (v) => setA('loopAmp', v), commit),
    range('السرعة', a.loopSpeed ?? 1, { min: 0.1, max: 4, step: 0.05 }, (v) => setA('loopSpeed', v), commit)));
  f.push(btnRow([
    ['▶ جرّب الحركة', () => previewEl(el)],
    ['طبّق على كل العناصر', () => {
      for (const e of scene().elements) if (e !== el) e.anim = { ...(e.anim || {}), in: a.in, ease: a.ease, dur: a.dur, out: a.out, outDur: a.outDur, ...(e.type === 'text' ? { split: a.split } : {}) };
      touch(); commit(); toast('انطبقت الحركة على كل عناصر المشهد');
    }],
  ]));
  return f;
}

function previewEl(el) {
  const a = el.anim || {};
  S.time = sceneStart(S.sceneIdx) + Math.max(0, (a.start ?? 0) - 0.15);
  S.playing = true;
  S.loopScene = false;
  emit('play', 'time');
  const stopAt = sceneStart(S.sceneIdx) + Math.min(scene().duration, (a.start ?? 0) + (a.dur ?? 0.7) + 1.6);
  const check = () => {
    if (!S.playing) return;
    if (S.time >= stopAt) { S.playing = false; emit('play'); return; }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

// ====================================================================== scene
const BG_PARAMS_LOCAL = {
  mesh: [['density', 'كثافة الشبكة', 0.4, 2.2, 0.05, 1], ['traffic', 'عدد النبضات', 0, 3, 0.05, 1], ['speed', 'سرعة النبضات', 0.2, 4, 0.05, 1], ['alpha', 'وضوح الشبكة', 0, 1, 0.01, null]],
  gradient: [['angle', 'الزاوية', 0, 360, 1, 160]],
  radial: [['x', 'المركز أفقي', 0, 1, 0.01, 0.5], ['y', 'المركز عمودي', 0, 1, 0.01, 0.4], ['size', 'الحجم', 0.2, 1.5, 0.01, 0.6]],
  image: [['dim', 'تعتيم', 0, 1, 0.01, 0.45], ['blur', 'ضباب', 0, 40, 0.5, 0], ['kenburns', 'زووم بطيء', 0, 0.4, 0.01, 0.08]],
};
const bgParams = (type) => (BGM.BG_PARAMS && BGM.BG_PARAMS[type]) || BG_PARAMS_LOCAL[type] || [];
const bgColors = (type) => (BGM.BG_COLORS && BGM.BG_COLORS[type]) || [];

const TEXTY = { text: ['text'], rotator: ['prefix'], status: ['label'], signature: ['name'], notify: ['title', 'body'], ticker: ['text'], donut: ['label'], progress: ['label'], linechart: ['tip'] };
const TEXTY_LABEL = { text: 'نص', prefix: 'النص الثابت', label: 'النص', name: 'الاسم', title: 'العنوان', body: 'التفاصيل', tip: 'ملاحظة' };

function scenePanel(sc) {
  const i = S.sceneIdx;
  root.append(h('div', { class: 'insp-head' },
    h('h3', {}, 'المشهد ' + (i + 1), h('small', {}, sc.name || '')),
    iconBtn('image', 'حفظ كصورة / بوستر', () => openPoster(i)),
    iconBtn('copy', 'نسخ المشهد', () => { const c = deepClone(sc); c.id = uid('s'); c.elements.forEach((e) => (e.id = uid('e'))); S.project.scenes.splice(i + 1, 0, c); commit(); goToScene(i + 1); emit('structure'); }),
    iconBtn('trash', 'حذف المشهد', () => {
      if (S.project.scenes.length <= 1) { toast('لازم يضل مشهد واحد على الأقل'); return; }
      S.project.scenes.splice(i, 1); commit(); goToScene(Math.max(0, i - 1)); emit('structure');
    })));
  root.append(tabBar(scTab, [['scene', 'المشهد'], ['bg', 'الخلفية'], ['motion', 'كاميرا وانتقال'], ['sound', 'الصوت']], (v) => { scTab = v; build(); }));
  if (scTab === 'scene') sceneMain(sc);
  else if (scTab === 'bg') sceneBg(sc);
  else if (scTab === 'motion') sceneMotion(sc);
  else sceneSound(sc);
}

function sceneMain(sc) {
  const i = S.sceneIdx;
  const big = h('div', { class: 'big-actions' });
  const ba = (lab, ic, fn, cls = 'btn') => { const b = h('button', { class: cls, type: 'button' }, icon(ic), lab); b.addEventListener('click', fn); big.appendChild(b); };
  ba('شغّل المشهد', 'play', () => { goToScene(i, { hold: false }); S.loopScene = true; S.playing = true; emit('play'); }, 'btn primary');
  ba('حركة عشوائية', 'dice', () => { randomizeMotion(sc); commit(); touch(); goToScene(i, { hold: false }); S.playing = true; emit('play'); toast('حركات جديدة. كبسة كمان لغيرها'); });
  ba('عكس الاتجاه', 'mirror', () => { mirrorScene(sc); commit(); touch(); });
  ba('حفظ كصورة', 'image', () => openPoster(i));
  root.append(big);
  root.append(h('div', { class: 'row2' },
    textInput('اسم المشهد', sc.name || '', (v) => { sc.name = v; later(); emit('names'); }),
    range('المدة (ثانية)', sc.duration, { min: 1, max: 30, step: 0.1 }, (v) => { sc.duration = v; touch(); emit('durations'); }, () => { commit(); emit('structure'); })));

  // every piece of text in the scene, editable in one place
  const qt = h('div', { class: 'quick-texts' });
  for (const el of sc.elements) {
    if (el.type === 'list' || el.type === 'rotator' || TEXTY[el.type]) {
      const rows = [];
      if (el.type === 'list') rows.push(['items', 'بنود القائمة', (el.items || []).join('\n'), (v) => { el.items = v.split('\n').filter((x) => x.trim()); }]);
      else if (el.type === 'rotator') {
        rows.push(['prefix', 'النص الثابت', el.prefix || '', (v) => { el.prefix = v; }]);
        rows.push(['words', 'الكلمات المتبدلة', (el.words || []).join('\n'), (v) => { el.words = v.split('\n').filter((x) => x.trim()); }]);
      } else for (const k of TEXTY[el.type]) if (el[k] != null || el.type === 'text') rows.push([k, TEXTY_LABEL[k] || k, el[k] ?? '', (v) => { el[k] = v; }]);
      for (const [k, lab, val, set] of rows) {
        const ta = h('textarea', { class: 'textarea', rows: String(Math.min(5, Math.max(String(val).length > 34 ? 2 : 1, String(val).split('\n').length))), dir: 'auto', 'aria-label': lab });
        ta.value = val;
        ta.addEventListener('input', () => { set(ta.value); touch(); later(); });
        ta.addEventListener('focus', () => highlight(el.id));
        ta.addEventListener('blur', () => highlight(null));
        const go = iconBtn('edit', 'اختار هالعنصر', () => { S.selId = el.id; elTab = 'content'; emit('select'); });
        qt.append(h('div', { class: 'qt' }, ta, go));
        void k;
      }
    }
  }
  if (qt.children.length) root.append(section('كل النصوص بهالمشهد', [h('p', { class: 'hint', style: { margin: '0 0 8px' } }, 'غيّر الكلام هون مباشرة. حط *نجمتين* حول كلمة لتطلع ملوّنة.'), qt]));

  const list = h('div', { class: 'layers' });
  [...sc.elements].reverse().forEach((e) => {
    const nm = e.type === 'text' ? (e.text || '').replace(/\*/g, '').slice(0, 40) : e.label || e.name || e.shape || e.kind || TYPE_LABEL[e.type];
    const row = h('div', { class: 'layer' + (e.hidden ? ' hidden-el' : '') }, h('span', { class: 'nm' }, nm || TYPE_LABEL[e.type]), h('span', { class: 'ty' }, TYPE_LABEL[e.type] || e.type));
    const eye = iconBtn(e.hidden ? 'eyeOff' : 'eye', e.hidden ? 'إظهار' : 'إخفاء', (ev) => { ev.stopPropagation(); e.hidden = !e.hidden; touch(); commit(); build(); });
    row.appendChild(eye);
    row.addEventListener('click', () => { S.selId = e.id; emit('select'); });
    row.addEventListener('pointerenter', () => highlight(e.id));
    row.addEventListener('pointerleave', () => highlight(null));
    list.appendChild(row);
  });
  root.append(section('العناصر (' + sc.elements.length + ')', [list], sc.elements.length <= 8));
  root.append(h('div', { class: 'tip' }, h('b', {}, 'كبسة'), ' على أي عنصر بالفيديو لتعدّله، ', h('b', {}, 'كبستين'), ' على النص لتكتب مباشرة، واسحب لتحرّك.'));
}

function bgPreview(bg) {
  const c = h('canvas', { width: 300, height: 180, style: { width: '100%', borderRadius: '12px', display: 'block', background: '#000' } });
  const env = createEnv(S.project, 1080, 648, 300 / 1080, { images });
  try { renderScene(c.getContext('2d'), { duration: 6, bg, elements: [] }, 2.3, env); } catch (e) { /* ignore */ }
  return c;
}

function sceneBg(sc) {
  const th = resolveTheme(S.project);
  const bg = (sc.bg = sc.bg || { type: 'mesh' });
  const preset = bgPresets().find((p) => p.id === bg.preset);
  root.append(bgPreview(bg), h('p', { class: 'note', style: { margin: '8px 0 10px' } }, (preset ? preset.name : (BGM.BG_LABEL || {})[bg.type] || bg.type) + ' · ' + bgPresets().length + ' خلفية بالمكتبة'));
  const browse = h('button', { class: 'btn primary block', type: 'button', style: { marginBottom: '12px' } }, icon('image'), 'تصفّح كل الخلفيات');
  browse.addEventListener('click', () => { const t = document.querySelector('[data-tab="backgrounds"]'); if (t) t.click(); });
  root.append(browse);
  const kids = [];
  bgColors(bg.type).forEach(([k, lab, d]) => kids.push(colorField(lab, bg[k] ?? d, th, (v) => { bg[k] = v; touch(); later(); }, { tokens: ['bg', 'bg2', 'card', 'accent', 'secondary', 'fg', 'muted'] })));
  bgParams(bg.type).forEach(([k, lab, mn, mx, st, d]) => kids.push(range(lab, bg[k] ?? d ?? (k === 'alpha' ? th.mesh.alpha : mn), { min: mn, max: mx, step: st }, (v) => { bg[k] = v; touch(); }, commit)));
  ((BGM.BG_TEXTS || {})[bg.type] || []).forEach(([k, lab, d]) => kids.push(textInput(lab, bg[k] ?? d, (v) => { bg[k] = v; touch(); later(); })));
  ((BGM.BG_CHOICES || {})[bg.type] || []).forEach(([k, lab, opts, d]) => kids.push(chips(lab, bg[k] ?? d, opts, (v) => { bg[k] = v; touch(); commit(); })));
  const toggles = (BGM.BG_TOGGLES || {})[bg.type] || (bg.type === 'mesh' ? [['veil', 'بقعة هادية خلف النص', true], ['glows', 'توهج الزوايا', th.mesh.glows]] : []);
  // mesh glows follow the theme until the user flips them
  toggles.forEach(([k, lab, d]) => kids.push(toggle(lab, bg[k] ?? (bg.type === 'mesh' && k === 'glows' ? th.mesh.glows : d), (v) => { bg[k] = v; touch(); commit(); })));
  if (bg.type === 'image') kids.push(btnRow([['اختار صورة', () => pickImage((src) => { bg.src = src; emit('images'); touch(); commit(); build(); })]]));
  if (kids.length) root.append(section('تعديل الخلفية', kids));
  root.append(btnRow([
    ['طبّق على كل المشاهد', () => { S.project.scenes.forEach((s) => (s.bg = deepClone(bg))); touch(); commit(); emit('structure'); toast('صارت كل المشاهد بنفس الخلفية'); }],
    ['صورة كخلفية', () => pickImage((src) => { sc.bg = { type: 'image', src, dim: 0.45 }; emit('images'); touch(); commit(); build(); })],
  ]));
  const fx = (sc.fx = sc.fx || {});
  root.append(section('مؤثرات الصورة', [
    range('حبيبات (Grain)', fx.grain ?? 0, { min: 0, max: 2, step: 0.05 }, (v) => { fx.grain = v; touch(); }, commit),
    range('تعتيم الأطراف', fx.vignette ?? 0, { min: 0, max: 1.5, step: 0.05 }, (v) => { fx.vignette = v; touch(); }, commit),
    range('شريط سينمائي', fx.letterbox ?? 0, { min: 0, max: 0.2, step: 0.005 }, (v) => { fx.letterbox = v; touch(); }, commit),
    toggle('خطوط شاشة قديمة', !!fx.scanlines, (v) => { fx.scanlines = v; touch(); commit(); }),
  ], false));
}

function sceneMotion(sc) {
  const i = S.sceneIdx;
  const cam = (sc.camera = sc.camera || { type: 'none' });
  root.append(section('حركة الكاميرا', [
    cameraPicker(cam, () => { touch(); commit(); goToScene(i, { hold: false }); S.loopScene = true; S.playing = true; emit('play'); }),
    h('div', { style: { height: '10px' } }),
    range('قوة الحركة', cam.amount ?? 1, { min: 0, max: 3, step: 0.05 }, (v) => { cam.amount = v; touch(); }, commit),
    btnRow([['طبّق الكاميرا على كل المشاهد', () => { S.project.scenes.forEach((s) => (s.camera = deepClone(cam))); commit(); toast('كل المشاهد صارت بنفس الكاميرا'); }]]),
  ]));
  if (i > 0) {
    const tr = (sc.transition = sc.transition || { type: 'fade', dur: 0.7 });
    root.append(section('الانتقال لهالمشهد (' + trList().length + ')', [
      h('p', { class: 'hint', style: { margin: '0 0 8px' } }, 'مرّر الماوس فوق أي انتقال لتشوفه بين مشاهدك الحقيقية.'),
      transitionPicker(sc, () => { touch(); commit(); emit('structure'); previewTransition(); }),
      h('div', { style: { height: '10px' } }),
      range('مدة الانتقال', tr.dur ?? 0.7, { min: 0.15, max: 2.5, step: 0.05 }, (v) => { tr.dur = v; touch(); }, commit),
      chips('الاتجاه', tr.dir || 'auto', [['auto', 'حسب الانتقال'], ['left', '←'], ['right', '→'], ['up', '↑'], ['down', '↓']], (v) => { if (v === 'auto') { delete tr.dir; delete tr.angle; } else { tr.dir = v; delete tr.angle; } touch(); commit(); previewTransition(); }),
      btnRow([['▶ جرّب', previewTransition], ['طبّق على كل المشاهد', () => { S.project.scenes.forEach((s, k) => { if (k) s.transition = deepClone(tr); }); commit(); emit('structure'); toast('انطبق الانتقال على كل المشاهد'); }],
        ['انتقالات عشوائية', () => { const L = trList().filter((x) => x.id !== 'cut'); S.project.scenes.forEach((s, k) => { if (k) s.transition = { type: L[Math.floor(Math.random() * L.length)].id, dur: (s.transition && s.transition.dur) || 0.7 }; }); commit(); emit('structure'); build(); toast('كل مشهد صار إله انتقال مختلف'); }]]),
    ]));
  } else root.append(h('div', { class: 'tip' }, 'الانتقال بيصير بين مشهدين. اختار المشهد التاني أو اللي بعده لتختار انتقاله.'));
}

// ---------------------------------------------------------------- sound
function sceneSound(sc) {
  const i = S.sceneIdx;
  const snd = (S.project.sound = S.project.sound || { on: true, volume: 0.7 });
  const inv = () => { if (AUD.invalidateSfx) AUD.invalidateSfx(); };
  const pct = (v) => Math.round(v * 100) + '%';
  // whole video
  const packs = soundPacks();
  const g = [];
  g.push(toggle('مؤثرات صوتية بالفيديو', snd.on !== false, (v) => { snd.on = v; inv(); commit(); build(); }));
  g.push(range('العلو العام', snd.volume ?? 0.7, { min: 0, max: 1.5, step: 0.05, fmt: pct }, (v) => { snd.volume = v; inv(); }, commit));
  if (packs.length) g.push(field('ستايل الأصوات', h('div', { class: 'chip-list' }, ...packs.map((p) => {
    const b = h('button', { type: 'button', class: (snd.pack || packs[0].id) === p.id ? 'on' : '' }, p.name);
    b.addEventListener('click', () => { snd.pack = p.id; inv(); commit(); build(); const ev = AUD.sfxEvents ? AUD.sfxEvents(S.project) : []; if (ev[0]) playPreview(ev[0].kind); });
    return b;
  }))));
  const cats = [['transition', 'الانتقالات'], ['entrance', 'دخول العناصر'], ['typing', 'الكتابة'], ['counter', 'العدادات'], ['ui', 'الواجهات'], ['custom', 'الأصوات المضافة'], ['track', 'ملف الصوت']];
  snd.cats = snd.cats || {};
  const catKids = cats.map(([k, lab]) => range(lab, snd.cats[k] ?? 1, { min: 0, max: 2, step: 0.05, fmt: pct }, (v) => { snd.cats[k] = v; inv(); }, commit));
  root.append(section('صوت الفيديو كله', [...g, section('علو كل نوع', catKids, false)]));

  // uploaded audio (voice-over or any track)
  const tk = snd.track;
  const trackKids = [];
  const up = h('button', { class: 'btn small', type: 'button' }, icon('upload'), tk ? 'بدّل الملف' : 'ارفع ملف صوت');
  up.addEventListener('click', () => pickAudio((src, name) => { snd.track = { src, name, volume: 0.8, offset: 0, fadeIn: 0.3, fadeOut: 1, loop: false }; inv(); commit(); build(); toast('انضاف الصوت: ' + name); }));
  trackKids.push(h('p', { class: 'hint', style: { margin: '0 0 8px' } }, 'تعليق صوتي أو أي ملف صوت (mp3, wav, m4a). بينضاف تحت المؤثرات.'));
  trackKids.push(h('div', { class: 'btn-row' }, up));
  if (tk) {
    const rm = h('button', { class: 'btn small danger', type: 'button' }, icon('trash'), 'شيل');
    rm.addEventListener('click', () => { snd.track = null; inv(); commit(); build(); });
    trackKids[1].appendChild(rm);
    trackKids.push(h('p', { class: 'note', style: { margin: '0 0 8px' } }, '♪ ' + (tk.name || 'audio')));
    trackKids.push(range('العلو', tk.volume ?? 0.8, { min: 0, max: 2, step: 0.05, fmt: pct }, (v) => { tk.volume = v; inv(); }, commit));
    trackKids.push(range('يبدأ من (ثانية، بالسالب بيقص البداية)', tk.offset ?? 0, { min: -60, max: 30, step: 0.1 }, (v) => { tk.offset = v; inv(); }, commit));
    trackKids.push(h('div', { class: 'row2' },
      range('ظهور تدريجي', tk.fadeIn ?? 0.3, { min: 0, max: 5, step: 0.1 }, (v) => { tk.fadeIn = v; inv(); }, commit),
      range('اختفاء تدريجي', tk.fadeOut ?? 1, { min: 0, max: 5, step: 0.1 }, (v) => { tk.fadeOut = v; inv(); }, commit)));
    trackKids.push(toggle('تكرار لآخر الفيديو', !!tk.loop, (v) => { tk.loop = v; inv(); commit(); }));
  }
  root.append(section('ملف صوت خاص فيك', trackKids, !!tk));

  // this scene: transition sound + every automatic sound + added sounds
  const sfx = (sc.sfx = sc.sfx || {});
  sfx.events = sfx.events || [];
  const rows = [];
  if (i > 0) rows.push(field('صوت الانتقال لهالمشهد', soundSelect(sfx.transition || 'auto', (v) => { sfx.transition = v; inv(); commit(); })),
    range('علو صوت الانتقال', sfx.transitionVol ?? 1, { min: 0, max: 2, step: 0.05, fmt: pct }, (v) => { sfx.transitionVol = v; inv(); }, commit));
  const ev = AUD.sfxEvents ? AUD.sfxEvents(S.project) : [];
  const st = sceneStart(i), en = st + sc.duration;
  const mine = ev.filter((e) => (e.src ? e.src.scene === i : e.t >= st && e.t < en) && !(e.src && e.src.cat === 'custom'));
  const seen = new Set();
  const list = h('div');
  for (const e of mine) {
    const elId = e.src && e.src.el;
    const el = elId ? sc.elements.find((x) => x.id === elId) : null;
    const key = elId || 'tr';
    if (seen.has(key)) continue;
    seen.add(key);
    const name = el ? (el.type === 'text' ? (el.text || '').replace(/\*/g, '').slice(0, 26) : TYPE_LABEL[el.type]) : 'الانتقال';
    const muted = el ? el.sfx === 'none' : sfx.transition === 'none';
    const row = h('div', { class: 'snd-row' + (muted ? ' muted' : '') });
    const sel = soundSelect(el ? el.sfx || 'auto' : sfx.transition || 'auto', (v) => { if (el) el.sfx = v; else sfx.transition = v; inv(); commit(); build(); }, { noPlay: true });
    const pl = h('button', { class: 'snd-play', type: 'button', title: 'اسمع' }, icon('play'));
    pl.addEventListener('click', () => playPreview(e.kind, 1, e.pitch || 1));
    const mt = iconBtn(muted ? 'mute' : 'sound', muted ? 'رجّع الصوت' : 'اكتم', () => { if (el) el.sfx = muted ? 'auto' : 'none'; else sfx.transition = muted ? 'auto' : 'none'; inv(); commit(); build(); });
    row.append(h('span', { class: 't' }, (e.t - st).toFixed(1) + 's'), h('div', { class: 'what' }, h('b', {}, name), sel), h('div', { class: 'acts' }, pl, mt));
    if (el) row.addEventListener('pointerenter', () => highlight(el.id));
    row.addEventListener('pointerleave', () => highlight(null));
    list.appendChild(row);
  }
  if (!list.children.length) list.append(h('p', { class: 'hint' }, 'ما في أصوات تلقائية بهالمشهد.'));
  root.append(section('أصوات هالمشهد', [...rows, list]));

  // custom sounds placed on the scene timeline
  const cust = h('div');
  sfx.events.forEach((x, k) => {
    const row = h('div', { class: 'snd-row' });
    const del = iconBtn('trash', 'حذف', () => { sfx.events.splice(k, 1); inv(); commit(); build(); });
    const pl = h('button', { class: 'snd-play', type: 'button', title: 'اسمع' }, icon('play'));
    pl.addEventListener('click', () => playPreview(x.kind, x.vol ?? 1, x.pitch ?? 1));
    row.append(h('span', { class: 't' }, (x.t ?? 0).toFixed(1) + 's'),
      h('div', { class: 'what' }, soundSelect(x.kind, (v) => { x.kind = v; inv(); commit(); }, { allowAuto: false, allowNone: false, noPlay: true }),
        range('الوقت', x.t ?? 0, { min: 0, max: sc.duration, step: 0.05 }, (v) => { x.t = v; row.querySelector('.t').textContent = v.toFixed(1) + 's'; inv(); }, commit),
        h('div', { class: 'row2' }, range('العلو', x.vol ?? 1, { min: 0, max: 2, step: 0.05, fmt: pct }, (v) => { x.vol = v; inv(); }, commit), range('الطبقة', x.pitch ?? 1, { min: 0.5, max: 2, step: 0.05 }, (v) => { x.pitch = v; inv(); }, commit))),
      h('div', { class: 'acts' }, pl, del));
    cust.appendChild(row);
  });
  const addAt = (kind) => {
    const local = clamp(S.time - sceneStart(i), 0, sc.duration - 0.05);
    sfx.events.push({ id: uid('snd'), t: +local.toFixed(2), kind, vol: 1, pitch: 1 });
    inv(); commit(); build();
    toast('انضاف الصوت عند ' + local.toFixed(1) + ' ثانية');
  };
  const addBtn = h('button', { class: 'btn small primary', type: 'button' }, icon('plus'), 'أضف صوت عند المؤشر');
  addBtn.addEventListener('click', () => addAt((soundBrowserPick.last) || 'pop'));
  root.append(section('أصوات مضافة (' + sfx.events.length + ')', [
    h('p', { class: 'hint', style: { margin: '0 0 8px' } }, 'وقّف الفيديو عند اللحظة اللي بدك ياها، اختار صوت من المكتبة، وكبسة «أضف».'),
    cust, h('div', { class: 'btn-row' }, addBtn),
    soundBrowser((x) => { soundBrowserPick.last = x.id; addBtn.lastChild.textContent = 'أضف «' + x.name + '» عند المؤشر'; }),
  ]));
}
const soundBrowserPick = { last: null };

function pickAudio(cb) {
  const inp = document.getElementById('audioInput');
  inp.value = '';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (f.size > 25 * 1048576) { toast('الملف كبير كتير (أكتر من 25MB)'); return; }
    const r = new FileReader();
    r.onload = () => cb(r.result, f.name);
    r.readAsDataURL(f);
  };
  inp.click();
}

function previewTransition() {
  const st = sceneStart(S.sceneIdx);
  S.time = Math.max(0, st - 0.6);
  S.loopScene = false;
  S.playing = true;
  emit('play', 'time');
  const stopAt = st + (scene().transition?.dur ?? 0.7) + 0.8;
  const check = () => {
    if (!S.playing) return;
    if (S.time >= stopAt) { S.playing = false; emit('play'); return; }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
void dims; void makeEnv; void makeElement; void presetGrid; void numberInput;
