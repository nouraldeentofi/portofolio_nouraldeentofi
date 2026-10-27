// Tiny DOM helpers + form field builders used by every panel.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

export const ICON = {
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  mirror: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8V4z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41M17.66 6.34l1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  bigger: '<svg viewBox="0 0 24 24"><path d="M4 20 20 4"/><path d="M14 4h6v6"/><path d="M10 20H4v-6"/></svg>',
  smaller: '<svg viewBox="0 0 24 24"><path d="m4 20 6-6"/><path d="M4 14h6v6"/><path d="m20 4-6 6"/><path d="M20 10h-6V4"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',
  palette: '<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.66 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
};
export const icon = (name) => {
  const s = h('span', { html: ICON[name] || '' });
  return s.firstChild;
};

export function section(title, kids, open = true) {
  return h('details', { class: 'sec', open: open || null }, h('summary', {}, title), ...kids);
}

export function field(label, control, valueText) {
  const lab = h('div', { class: 'lab' }, h('span', {}, label));
  if (valueText !== undefined) lab.appendChild(h('span', { class: 'val' }, valueText));
  return h('div', { class: 'field' }, lab, control);
}

export function range(label, value, { min = 0, max = 1, step = 0.01, fmt } = {}, onInput, onCommit) {
  const show = (v) => (fmt ? fmt(v) : String(+(+v).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)));
  const inp = h('input', { type: 'range', min, max, step, value: value ?? min });
  const f = field(label, inp, show(value ?? min));
  const val = f.querySelector('.val');
  inp.addEventListener('input', () => { val.textContent = show(inp.value); onInput(+inp.value); });
  inp.addEventListener('change', () => onCommit && onCommit(+inp.value));
  return f;
}

export function chips(label, value, options, onChange) {
  const box = h('div', { class: 'chips' });
  options.forEach(([v, lab]) => {
    const b = h('button', { type: 'button', class: String(v) === String(value) ? 'on' : '' }, lab);
    b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onChange(v);
    });
    box.appendChild(b);
  });
  return label ? field(label, box) : box;
}

export function select(label, value, options, onChange) {
  const s = h('select', { class: 'select' });
  options.forEach(([v, lab]) => s.appendChild(h('option', { value: v, selected: String(v) === String(value) ? true : null }, lab)));
  s.addEventListener('change', () => onChange(s.value));
  return label ? field(label, s) : s;
}

export function toggle(label, checked, onChange) {
  const inp = h('input', { type: 'checkbox', checked: checked ? true : null });
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'toggle' }, h('span', {}, label), inp);
}

export function textInput(label, value, onInput, { multiline = false, rows = 3, placeholder = '', dir, onCommit } = {}) {
  const el = multiline
    ? h('textarea', { class: 'textarea', rows, placeholder, dir: dir || 'auto' })
    : h('input', { class: 'input', type: 'text', placeholder, dir: dir || 'auto' });
  el.value = value ?? '';
  el.addEventListener('input', () => onInput(el.value));
  if (onCommit) el.addEventListener('change', () => onCommit(el.value));
  return label ? field(label, el) : el;
}

export function numberInput(label, value, onChange, { step = 1, min, max } = {}) {
  const el = h('input', { class: 'input', type: 'number', step, min, max, dir: 'ltr' });
  el.value = value ?? 0;
  el.addEventListener('change', () => onChange(+el.value));
  return label ? field(label, el) : el;
}

// colour: theme token swatches + custom picker. value is '@token' or '#hex'
export function colorField(label, value, theme, onChange, { tokens = ['fg', 'muted', 'accent', 'secondary', 'ink', 'bg', 'card'], allowNone = false } = {}) {
  const box = h('div', { class: 'swatches' });
  const names = { fg: 'النص', muted: 'خافت', accent: 'أساسي', secondary: 'ثانوي', ink: 'فوق الأساسي', bg: 'الخلفية', card: 'بطاقة', bg2: 'خلفية 2', white: 'أبيض', black: 'أسود' };
  const mark = () => box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(value)));
  if (allowNone) {
    const b = h('button', { type: 'button', title: 'بدون', 'data-v': 'none', style: { background: 'repeating-linear-gradient(45deg,#333 0 4px,#555 4px 8px)' } });
    b.addEventListener('click', () => { value = 'none'; mark(); onChange('none'); });
    box.appendChild(b);
  }
  tokens.forEach((t) => {
    const c = theme.c[t];
    if (!c) return;
    const b = h('button', { type: 'button', title: names[t] || t, 'data-v': '@' + t, style: { background: c } });
    b.addEventListener('click', () => { value = '@' + t; mark(); onChange('@' + t); });
    box.appendChild(b);
  });
  const custom = h('input', { type: 'color', value: typeof value === 'string' && value[0] === '#' ? value.slice(0, 7) : '#ffffff', title: 'لون مخصص' });
  custom.addEventListener('input', () => { value = custom.value; mark(); onChange(custom.value); });
  box.appendChild(custom);
  mark();
  return label ? field(label, box) : box;
}

export function presetGrid(label, value, options, onChange, cols) {
  const g = h('div', { class: 'preset-grid', style: cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } : null });
  options.forEach(([v, lab]) => {
    const b = h('button', { type: 'button', class: v === value ? 'on' : '', title: lab }, lab);
    b.addEventListener('click', () => {
      g.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onChange(v);
    });
    g.appendChild(b);
  });
  return label ? field(label, g) : g;
}

let toastTimer = null;
// bring a child into view inside a horizontal strip without scrolling the page
export function revealInRow(row, el) {
  if (!row || !el) return;
  const a = row.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  if (b.left < a.left) row.scrollLeft -= a.left - b.left + 8;
  else if (b.right > a.right) row.scrollLeft += b.right - a.right + 8;
}

export function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function popover(anchor, content, onClose) {
  document.querySelectorAll('.pop').forEach((p) => p.remove());
  const pop = h('div', { class: 'pop' }, content);
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.left + r.width / 2 - pw / 2));
  let top = r.top - ph - 8;
  if (top < 12) top = r.bottom + 8;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  const close = (e) => {
    if (e && pop.contains(e.target)) return;
    pop.remove();
    document.removeEventListener('pointerdown', close, true);
    onClose && onClose();
  };
  setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
  return { pop, close: () => close() };
}
