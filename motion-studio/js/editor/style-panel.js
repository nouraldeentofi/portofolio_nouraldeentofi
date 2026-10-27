// "الستايل" tab: themes, colour overrides, fonts, sound.
import { S, emit, on, commit } from './store.js';
import { h, field, select, toggle, range, toast } from './ui.js';
import { THEMES, TOKENS, resolveTheme } from '../engine/themes.js';
import { FONTS } from '../engine/fonts.js';
import { toHex } from '../engine/util.js';
import { syncProjectFonts } from './fontsync.js';
import { requestRender } from './stage.js';

let root;
export function initStyle() {
  root = document.getElementById('tab-style');
  on('theme', build);
  on('structure', () => {});
  build();
}

const PAIRS = [
  ['Figtree', 'IBM Plex Sans Arabic', 'هويتك (افتراضي)'],
  ['Unbounded', 'Changa', 'عريض وتقني'],
  ['Playfair Display', 'El Messiri', 'فخم كلاسيكي'],
  ['Sora', 'Readex Pro', 'حديث ناعم'],
  ['Anton', 'Lalezar', 'بوستر صاخب'],
  ['Space Grotesk', 'Alexandria', 'هندسي'],
  ['Bricolage Grotesque', 'Lemonada', 'مرح'],
  ['DM Serif Display', 'Amiri', 'أدبي'],
  ['Syne', 'Reem Kufi', 'كوفي عصري'],
  ['Montserrat', 'Noto Kufi Arabic', 'واضح وقوي'],
  ['Poppins', 'Cairo', 'شبابي'],
  ['Space Mono', 'Kufam', 'كود'],
];

function setTheme(id) {
  S.project.theme = id;
  S.project.themeOverrides = {};
  commit();
  syncProjectFonts();
  emit('theme', 'render');
}

function build() {
  const th = resolveTheme(S.project);
  root.innerHTML = '';
  const grid = h('div', { class: 'theme-grid' });
  THEMES.forEach((t) => {
    const c = t.c;
    const card = h('button', { type: 'button', class: 'theme-card' + (S.project.theme === t.id ? ' on' : '') },
      h('div', { class: 'sw', style: { background: c.bg, color: c.fg } },
        h('i', { style: { background: c.accent } }), h('i', { style: { background: c.secondary } }), h('i', { style: { background: c.card } }),
        h('b', { style: { color: c.accent, fontFamily: `"${t.fonts.display[0]}", "${t.fonts.display[1]}", sans-serif` } }, 'Aa')),
      h('div', { class: 'lab' }, h('span', {}, t.name), t.group === 'brand' ? h('span', { class: 'badge' }, 'هويتك') : h('small', {}, t.en)));
    card.addEventListener('click', () => { setTheme(t.id); toast('الثيم: ' + t.name); });
    grid.appendChild(card);
  });
  root.append(h('div', { class: 'group-title', style: { marginTop: '4px' } }, 'الثيمات'), grid);
  root.append(h('div', { class: 'tip', style: { marginTop: '10px' } }, 'ثيمات ', h('b', {}, 'هويتك'), ': ليل للأساس، نهار للمحتوى الطويل، غابة للنتائج والقصص، إشارة للإعلانات الكبيرة بس.'));

  // colours
  root.append(h('div', { class: 'group-title' }, 'الألوان'));
  const ov = (S.project.themeOverrides = S.project.themeOverrides || {});
  ov.colors = ov.colors || {};
  TOKENS.forEach(([k, lab]) => {
    const inp = h('input', { type: 'color', value: toHex(th.c[k]) });
    inp.addEventListener('input', () => { ov.colors[k] = inp.value; requestRender(); emit('themeLive'); });
    inp.addEventListener('change', () => { commit(); emit('theme'); });
    root.append(h('label', { class: 'toggle', style: { marginBottom: '8px' } }, h('span', {}, lab), h('span', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--faint)', direction: 'ltr' } }, toHex(th.c[k])), inp)));
  });
  const reset = h('button', { class: 'btn small', type: 'button' }, 'رجّع ألوان الثيم');
  reset.addEventListener('click', () => { S.project.themeOverrides = { fonts: ov.fonts }; commit(); emit('theme', 'render'); });
  root.append(h('div', { class: 'btn-row' }, reset));

  // fonts
  root.append(h('div', { class: 'group-title' }, 'الخطوط'));
  const pairs = h('div', { class: 'preset-grid', style: { gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginBottom: '12px' } });
  PAIRS.forEach(([lat, ar, lab]) => {
    const on = th.fonts.display[0] === lat && th.fonts.display[1] === ar;
    const b = h('button', { type: 'button', class: on ? 'on' : '', style: { fontFamily: `"${lat}", "${ar}", sans-serif`, padding: '9px 6px' } }, lab);
    b.addEventListener('click', () => {
      ov.fonts = { ...(ov.fonts || {}), display: [lat, ar], body: lat === 'Anton' || lat === 'Space Mono' ? ['Inter', 'Cairo'] : [lat, ar] };
      commit();
      syncProjectFonts();
      emit('theme', 'render');
    });
    pairs.appendChild(b);
  });
  root.append(pairs);
  const latin = FONTS.filter((f) => !f.ar).map((f) => [f.f, f.f]);
  const arabic = FONTS.filter((f) => f.ar).map((f) => [f.f, f.f]);
  const setF = (role, idx) => (v) => {
    const cur = [...(th.fonts[role] || [])];
    cur[idx] = v;
    ov.fonts = { ...(ov.fonts || {}), [role]: cur };
    commit();
    syncProjectFonts();
    emit('theme', 'render');
  };
  root.append(
    h('div', { class: 'row2' }, select('عناوين · إنكليزي', th.fonts.display[0], latin, setF('display', 0)), select('عناوين · عربي', th.fonts.display[1], arabic, setF('display', 1))),
    h('div', { class: 'row2' }, select('نص · إنكليزي', th.fonts.body[0], latin, setF('body', 0)), select('نص · عربي', th.fonts.body[1], arabic, setF('body', 1))),
  );

  root.append(h('div', { class: 'tip', style: { marginTop: '14px' } }, 'الأصوات صارت بتبويب ', h('b', {}, 'الصوت'), ' بإعدادات المشهد: ستايل الأصوات، العلو، صوت لكل عنصر، وملف صوت خاص فيك.'));
  void field;
}
