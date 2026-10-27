// "عناصر" tab: add any element to the current scene.
import { S, scene, emit, commit } from './store.js';
import { h } from './ui.js';
import { uid } from '../engine/util.js';
import { ICON_NAMES, drawIcon } from '../engine/icons.js';
import { SHAPES, SHAPE_LABELS } from '../engine/el-basic.js';
import { OBJ3D, OBJ3D_LABELS, PARTICLES, PARTICLE_LABELS } from '../engine/el-fx.js';
import { requestRender } from './stage.js';

export const TYPE_LABEL = {
  text: 'نص', shape: 'شكل', glow: 'إضاءة', image: 'صورة', icon: 'أيقونة', counter: 'عدّاد', rotator: 'كلمات متبدلة', ticker: 'شريط متحرك',
  signature: 'التوقيع', status: 'حالة', corners: 'زوايا إطار', bars: 'أعمدة', linechart: 'خط بياني', donut: 'دائرة نسبة', progress: 'شريط تقدم',
  list: 'قائمة', timeline: 'خط زمني', flow: 'ورك فلو', equalizer: 'موجة صوت', code: 'كود', chat: 'محادثة', notify: 'إشعار', device: 'جهاز',
  obj3d: 'مجسم 3D', particles: 'جزيئات',
};

const A = (o = {}) => ({ in: 'rise', start: 0.25, dur: 0.8, ease: 'auto', split: 'none', stagger: 0.06, out: 'none', loop: 'none', ...o });

export function makeElement(type, extra = {}) {
  const base = { id: uid('e'), type, x: 0.5, y: 0.5 };
  const D = {
    text: { text: 'اكتب *هون* كلامك', size: 84, weight: 800, w: 860, align: 'center', anim: A({ in: 'riseBlur', split: 'word', stagger: 0.07 }) },
    shape: { shape: 'rect', w: 420, h: 280, radius: 28, fill: '@accent', anim: A({ in: 'pop' }) },
    glow: { w: 800, h: 800, color: '@accent', alpha: 0.35, anim: A({ in: 'fade', dur: 1.2 }) },
    image: { w: 640, h: 640, radius: 28, kenburns: 0.08, anim: A({ in: 'pushIn', dur: 1 }) },
    icon: { name: 'sparkles', size: 140, color: '@accent', anim: A({ in: 'pop' }) },
    counter: { from: 0, to: 1250, size: 180, font: '@display', weight: 800, color: '@accent', suffix: '+', anim: A({ in: 'riseBlur' }) },
    rotator: { prefix: 'أنا أبني', words: ['وكلاء AI', 'أتمتة', 'مواقع'], size: 84, interval: 1.4, anim: A({ in: 'riseBlur' }) },
    ticker: { text: 'MOTION STUDIO', size: 130, rows: 2, alt: true, w: 1300, speed: 160, anim: A({ in: 'fade' }) },
    signature: { y: 0.92, size: 34, anim: A({ in: 'draw', dur: 1.2 }) },
    status: { label: 'workflow running', size: 30, anim: A({ in: 'fade' }) },
    corners: { w: 760, h: 520, len: 60, strokeW: 5, color: '@accent', anim: A({ in: 'draw', dur: 0.9 }) },
    bars: { w: 820, h: 520, values: [32, 48, 41, 66, 90], labels: ['ينا', 'فبر', 'مار', 'أبر', 'ماي'], anim: A({ in: 'fade', stagger: 0.12 }) },
    linechart: { w: 860, h: 480, values: [12, 18, 15, 30, 26, 44, 52, 70], tip: '+70%', anim: A({ in: 'fade' }) },
    donut: { w: 420, value: 0.75, anim: A({ in: 'pop' }) },
    progress: { w: 820, value: 0.86, label: 'نسبة الأتمتة', anim: A({ in: 'fade' }) },
    list: { w: 860, items: ['ردود تلقائية على *الإيميل*', 'تقارير يومية بدون تعب', 'تنبيهات فورية على واتساب'], icon: 'check', size: 44, anim: A({ in: 'rise', stagger: 0.18 }) },
    timeline: { w: 860, h: 640, items: [{ t: 'الفكرة', s: 'يوم 1' }, { t: 'أول نسخة', s: 'يوم 7' }, { t: 'الإطلاق', s: 'يوم 30' }], anim: A({ in: 'none', stagger: 0.45 }) },
    flow: { w: 900, h: 300, layout: 'chain', nodes: [{ label: 'Webhook', icon: 'bolt', x: -0.4, y: 0 }, { label: 'AI Agent', icon: 'bot', x: 0, y: 0, hot: true }, { label: 'CRM', icon: 'database', x: 0.4, y: 0 }], anim: A({ in: 'none', stagger: 0.45 }) },
    equalizer: { w: 700, h: 220, bars: 28, color: '@accent', anim: A({ in: 'fade' }) },
    code: { w: 900, size: 30, lines: ['const agent = new Agent({ model })', 'agent.on("lead", reply)', 'await agent.run() // 24/7'], title: 'agent.ts', anim: A({ in: 'pushIn' }) },
    chat: { w: 860, h: 640, size: 34, messages: [{ me: false, text: 'مرحبا! شو بتشتغل؟' }, { me: true, text: 'ببني أتمتة على *n8n* بتوفّر ساعات' }, { me: false, text: 'حلو! فيك تعملي وحدة؟' }], anim: A({ in: 'none' }) },
    notify: { w: 860, app: 'n8n', title: 'Lead جديد وصل', body: 'الـ workflow رد عليه تلقائياً خلال 4 ثواني', icon: 'bolt', time: 'الآن', anim: A({ in: 'drop' }) },
    device: { kind: 'phone', w: 420, h: 860, anim: A({ in: 'riseBlur', dur: 1 }) },
    obj3d: { shape: 'globe', size: 560, speed: 0.5, color: '@accent', color2: '@secondary', anim: A({ in: 'draw', dur: 1.6 }) },
    particles: { kind: 'sparkle', w: 1000, h: 1000, count: 50, anim: A({ in: 'fade', dur: 1 }) },
  };
  return { ...base, ...(D[type] || {}), ...extra, anim: { ...(D[type] || {}).anim, ...(extra.anim || {}) } };
}

export function addElement(el) {
  const sc = scene();
  if (!sc) return;
  sc.elements = sc.elements || [];
  sc.elements.push(el);
  S.selId = el.id;
  commit();
  emit('structure', 'select', 'render');
}

function btn(label, glyph, onClick) {
  const b = h('button', { class: 'add-btn', type: 'button' });
  if (typeof glyph === 'string') b.appendChild(h('span', { class: 'glyph' }, glyph));
  else if (glyph) b.appendChild(glyph);
  b.appendChild(h('span', {}, label));
  b.addEventListener('click', onClick);
  return b;
}
function iconCanvas(name, size = 22) {
  const c = h('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px' } });
  const x = c.getContext('2d');
  x.translate(size, size);
  drawIcon(x, name, size * 1.6, '#B8FF5C', { strokeW: 2 });
  return c;
}
function shapeGlyph(s) {
  const c = h('canvas', { width: 48, height: 48, style: { width: '24px', height: '24px' } });
  const x = c.getContext('2d');
  x.translate(24, 24);
  x.fillStyle = '#B8FF5C';
  x.strokeStyle = '#B8FF5C';
  x.lineWidth = 4;
  x.lineCap = 'round';
  const r = 17;
  x.beginPath();
  switch (s) {
    case 'circle': x.arc(0, 0, r, 0, 7); x.fill(); break;
    case 'ellipse': x.ellipse(0, 0, r, r * 0.6, 0, 0, 7); x.fill(); break;
    case 'pill': x.roundRect(-r, -r * 0.5, r * 2, r, r * 0.5); x.fill(); break;
    case 'triangle': x.moveTo(0, -r); x.lineTo(r, r); x.lineTo(-r, r); x.fill(); break;
    case 'diamond': x.moveTo(0, -r); x.lineTo(r, 0); x.lineTo(0, r); x.lineTo(-r, 0); x.fill(); break;
    case 'ring': x.arc(0, 0, r - 3, 0, 7); x.stroke(); break;
    case 'arc': x.arc(0, 0, r - 3, -1.6, 1.6); x.stroke(); break;
    case 'line': x.moveTo(-r, 0); x.lineTo(r, 0); x.stroke(); break;
    case 'arrow': x.moveTo(-r, 0); x.lineTo(r, 0); x.moveTo(r - 8, -7); x.lineTo(r, 0); x.lineTo(r - 8, 7); x.stroke(); break;
    case 'curve': x.moveTo(-r, r * 0.6); x.bezierCurveTo(-r * 0.5, -r, r * 0.5, -r, r, 0); x.stroke(); break;
    case 'wave': for (let i = 0; i <= 20; i++) { const xx = -r + (i / 20) * r * 2; const y = Math.sin(i / 20 * 12) * 7; i ? x.lineTo(xx, y) : x.moveTo(xx, y); } x.stroke(); break;
    case 'zigzag': for (let i = 0; i <= 6; i++) { const xx = -r + (i / 6) * r * 2; i ? x.lineTo(xx, i % 2 ? -8 : 8) : x.moveTo(xx, 8); } x.stroke(); break;
    case 'star': case 'burst': case 'polygon': {
      const n = s === 'star' ? 5 : s === 'burst' ? 12 : 6, inner = s === 'star' ? 0.45 : s === 'burst' ? 0.75 : 1;
      const k = s === 'polygon' ? n : n * 2;
      for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + (i / k) * Math.PI * 2; const rr = s === 'polygon' || i % 2 === 0 ? r : r * inner; i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      x.closePath(); x.fill(); break;
    }
    case 'heart': x.moveTo(0, r * 0.7); x.bezierCurveTo(-r * 1.3, -r * 0.2, -r * 0.5, -r * 1.1, 0, -r * 0.4); x.bezierCurveTo(r * 0.5, -r * 1.1, r * 1.3, -r * 0.2, 0, r * 0.7); x.fill(); break;
    case 'plus': x.fillRect(-r, -4, r * 2, 8); x.fillRect(-4, -r, 8, r * 2); break;
    case 'cross': x.rotate(0.785); x.fillRect(-r, -4, r * 2, 8); x.fillRect(-4, -r, 8, r * 2); break;
    case 'blob': x.moveTo(r, 0); x.bezierCurveTo(r, r, -r * 0.4, r * 1.1, -r, r * 0.2); x.bezierCurveTo(-r * 1.1, -r * 0.8, r * 0.2, -r * 1.2, r, 0); x.fill(); break;
    case 'dots': for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { x.moveTo(i * 12 + 3, j * 12); x.arc(i * 12, j * 12, 3, 0, 7); } x.fill(); break;
    case 'chevron': x.moveTo(-8, -r); x.lineTo(8, 0); x.lineTo(-8, r); x.stroke(); break;
    case 'spiral': for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 15; i ? x.lineTo(Math.cos(a) * t * r, Math.sin(a) * t * r) : x.moveTo(0, 0); } x.stroke(); break;
    case 'bracket': x.moveTo(-r, -r + 8); x.lineTo(-r, -r); x.lineTo(-r + 8, -r); x.moveTo(r - 8, r); x.lineTo(r, r); x.lineTo(r, r - 8); x.stroke(); break;
    default: x.roundRect(-r, -r * 0.7, r * 2, r * 1.4, 5); x.fill();
  }
  return c;
}

export function buildElementsPanel(root) {
  root.innerHTML = '';
  const add = (type, extra) => () => addElement(makeElement(type, extra));
  root.append(
    h('div', { class: 'group-title' }, 'نصوص'),
    h('div', { class: 'add-grid' },
      btn('عنوان كبير', 'Aa', add('text', { text: 'عنوان *قوي* هون', size: 110 })),
      btn('نص عادي', 'Tt', add('text', { text: 'سطر توضيحي قصير بيشرح الفكرة', size: 46, weight: 400, color: '@muted', anim: { in: 'riseSoft', split: 'none' } })),
      btn('تاغ كود', '//', add('text', { text: '// 01 · n8n', font: '@mono', size: 34, weight: 500, color: '@secondary', anim: { in: 'typewriter', dur: 0.8, split: 'none' } })),
      btn('زر / كبسولة', '◉', add('text', { text: 'جرّبه هلق', size: 46, weight: 700, color: '@ink', box: { fill: '@accent', padX: 40, padY: 18 }, anim: { in: 'pop', split: 'none' } })),
      btn('كلمات متبدلة', '↻', add('rotator')),
      btn('شريط متحرك', '⇆', add('ticker')),
    ),
    h('div', { class: 'group-title' }, 'أشكال'),
    h('div', { class: 'add-grid', style: { gridTemplateColumns: 'repeat(4, minmax(0,1fr))' } },
      ...SHAPES.map((s) => btn(SHAPE_LABELS[s], shapeGlyph(s), add('shape', shapeDefaults(s))))),
    h('div', { class: 'group-title' }, 'صور وإضاءة'),
    h('div', { class: 'add-grid' },
      btn('صورة', iconCanvas('image'), () => pickImage((src) => addElement(makeElement('image', { src })))),
      btn('صورة دائرية', iconCanvas('user'), () => pickImage((src) => addElement(makeElement('image', { src, mask: 'circle', w: 460, h: 460, border: '@accent', borderW: 6 })))),
      btn('إضاءة ناعمة', iconCanvas('sun'), add('glow')),
      btn('إطار زوايا', iconCanvas('grid'), add('corners')),
      btn('جوال', iconCanvas('phone'), add('device', { kind: 'phone' })),
      btn('متصفح', iconCanvas('laptop'), add('device', { kind: 'browser', w: 900, h: 600 })),
    ),
    h('div', { class: 'group-title' }, 'أرقام وبيانات'),
    h('div', { class: 'add-grid' },
      btn('عدّاد', '123', add('counter')),
      btn('عداد دوّار', '0→9', add('counter', { style: 'roll', to: 98, suffix: '%', font: '@mono' })),
      btn('أعمدة', iconCanvas('chart'), add('bars')),
      btn('خط صاعد', iconCanvas('trendUp'), add('linechart')),
      btn('دائرة نسبة', iconCanvas('pie'), add('donut')),
      btn('شريط تقدم', '▬', add('progress')),
    ),
    h('div', { class: 'group-title' }, 'تقنية وأتمتة'),
    h('div', { class: 'add-grid' },
      btn('ورك فلو', iconCanvas('workflow'), add('flow')),
      btn('نافذة كود', iconCanvas('code'), add('code')),
      btn('تيرمنال', iconCanvas('terminal'), add('code', { mode: 'terminal', title: 'zsh — n8n', lines: ['$ npx n8n start', 'Editor is now accessible via:', '✓ http://localhost:5678'] })),
      btn('محادثة', iconCanvas('message'), add('chat')),
      btn('إشعار', iconCanvas('bell'), add('notify')),
      btn('حالة شغالة', '●', add('status', { y: 0.1 })),
    ),
    h('div', { class: 'group-title' }, 'هوية'),
    h('div', { class: 'add-grid' },
      btn('توقيعك', '○—●', add('signature')),
      btn('قائمة', iconCanvas('check'), add('list')),
      btn('خط زمني', iconCanvas('clock'), add('timeline')),
    ),
    h('div', { class: 'group-title' }, 'ثلاثي الأبعاد'),
    h('div', { class: 'add-grid' }, ...OBJ3D.map((s) => btn(OBJ3D_LABELS[s], '◈', add('obj3d', { shape: s, size: s === 'wave' ? 900 : 560 })))),
    h('div', { class: 'group-title' }, 'مؤثرات'),
    h('div', { class: 'add-grid' },
      ...PARTICLES.map((k) => btn(PARTICLE_LABELS[k], '✦', add('particles', { kind: k, count: k === 'confetti' || k === 'burst' ? 110 : k === 'stars' ? 140 : 50 }))),
      btn('موجة صوت', iconCanvas('music'), add('equalizer')),
    ),
    h('div', { class: 'group-title' }, 'أيقونات'),
    iconPicker((name) => addElement(makeElement('icon', { name }))),
  );
}

function shapeDefaults(s) {
  const strokeOnly = ['line', 'arrow', 'curve', 'wave', 'zigzag', 'ring', 'arc', 'chevron', 'spiral', 'bracket'].includes(s);
  const o = { shape: s };
  if (s === 'line') Object.assign(o, { w: 600, h: 10, strokeW: 8, anim: { in: 'draw', dur: 0.9 } });
  else if (s === 'arrow') Object.assign(o, { w: 420, h: 60, strokeW: 10, anim: { in: 'draw', dur: 0.8 } });
  else if (s === 'curve') Object.assign(o, { w: 380, h: 240, strokeW: 9, anim: { in: 'draw', dur: 0.9 } });
  else if (s === 'wave' || s === 'zigzag') Object.assign(o, { w: 600, h: 80, strokeW: 8, anim: { in: 'draw', dur: 1 } });
  else if (s === 'bracket') Object.assign(o, { w: 700, h: 420, strokeW: 6, anim: { in: 'draw', dur: 0.9 } });
  else if (s === 'pill') Object.assign(o, { w: 520, h: 140 });
  else if (s === 'dots') Object.assign(o, { w: 300, h: 300, fill: '@fg/0.3', anim: { in: 'fade' } });
  else if (s === 'blob') Object.assign(o, { w: 520, h: 520, fill: { g: 'linear', colors: ['@accent', '@secondary'], angle: 135 }, anim: { in: 'pop', loop: 'none' } });
  else Object.assign(o, { w: 360, h: 360 });
  if (s === 'rect') Object.assign(o, { w: 520, h: 340, radius: 28 });
  if (strokeOnly) o.stroke = '@accent';
  return o;
}

export function iconPicker(onPick, current) {
  const g = h('div', { class: 'icon-pick' });
  ICON_NAMES.forEach((n) => {
    const b = h('button', { type: 'button', title: n, class: n === current ? 'on' : '' }, iconCanvas(n, 20));
    b.addEventListener('click', () => {
      g.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onPick(n);
    });
    g.appendChild(b);
  });
  return g;
}

// image upload -> downscaled data URL (keeps projects light)
export function pickImage(cb) {
  const inp = document.getElementById('fileInput');
  inp.value = '';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const type = f.type === 'image/png' ? 'image/png' : 'image/jpeg';
        cb(c.toDataURL(type, 0.88));
        requestRender();
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };
  inp.click();
}
