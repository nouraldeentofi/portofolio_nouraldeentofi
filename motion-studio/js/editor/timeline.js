// Scene strip: thumbnails, durations, transition chips, drag to reorder.
import { S, emit, on, commit, totalDur } from './store.js';
import { h, icon, presetGrid, range, popover, toast, revealInRow } from './ui.js';
import { transitionPicker } from './gallery.js';
import { openPoster } from './poster.js';
import { renderScene, createEnv, ASPECTS, holdTime } from '../engine/renderer.js';
import { TRANSITIONS, TRANSITION_LABEL } from '../engine/transitions.js';
import { goToScene, images } from './stage.js';
import { deepClone, uid } from '../engine/util.js';

let root, row, head;
const thumbs = new Map(); // scene id -> canvas
let thumbTimer = null;

export function initTimeline() {
  root = document.getElementById('timeline');
  head = h('div', { class: 'tl-head' });
  row = h('div', { class: 'tl-row' });
  root.append(head, row);
  on('structure', build);
  on('scene', mark);
  on('names', build);
  on('durations', updateHead);
  on('edit', scheduleThumbs);
  on('theme', scheduleThumbs);
  on('thumbs', scheduleThumbs);
  on('aspect', build);
  build();
}

function updateHead() {
  const n = S.project.scenes.length;
  head.innerHTML = '';
  head.append(h('span', {}, h('b', {}, n + ' مشاهد'), ' · ', h('span', { class: 'mono', style: { direction: 'ltr', display: 'inline-block' } }, totalDur().toFixed(1) + 's')), h('span', {}, 'اسحب المشاهد لترتيبها · كبسة على الانتقال لتغييره'));
  row.querySelectorAll('.tl-card').forEach((c, i) => {
    const d = c.querySelector('.d');
    if (d && S.project.scenes[i]) d.textContent = S.project.scenes[i].duration.toFixed(1) + 's';
  });
}

function build() {
  row.innerHTML = '';
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  S.project.scenes.forEach((sc, i) => {
    if (i > 0) {
      const tr = sc.transition || { type: 'fade' };
      const chip = h('button', { class: 'tr-chip', type: 'button', title: 'الانتقال: ' + (TRANSITION_LABEL[tr.type] || tr.type) }, TRANSITION_LABEL[tr.type] || tr.type);
      chip.addEventListener('click', () => transitionPop(chip, sc));
      row.appendChild(chip);
    }
    let cv = thumbs.get(sc.id);
    const cw = 236, ch = Math.round((cw * H) / W);
    if (!cv || cv.width !== cw || cv.height !== ch) { cv = h('canvas', { width: cw, height: ch }); thumbs.set(sc.id, cv); cv.dataset.dirty = '1'; }
    const card = h('div', { class: 'tl-card' + (i === S.sceneIdx ? ' on' : ''), draggable: 'true', 'data-i': i, role: 'button', tabindex: '0' },
      cv,
      h('div', { class: 'info' }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('span', { class: 'nm', style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sc.name || ''), h('span', { class: 'd' }, sc.duration.toFixed(1) + 's')),
      h('div', { class: 'x' }, miniBtn('image', 'حفظ كصورة', () => openPoster(i)), miniBtn('copy', 'نسخ', () => dupScene(i)), miniBtn('trash', 'حذف', () => delScene(i))));
    card.addEventListener('click', (e) => { if (e.target.closest('.x')) return; S.selId = null; goToScene(i); emit('select'); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') { S.selId = null; goToScene(i); emit('select'); } });
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const from = +e.dataTransfer.getData('text/plain');
      if (isNaN(from) || from === i) return;
      const [m] = S.project.scenes.splice(from, 1);
      S.project.scenes.splice(i, 0, m);
      commit();
      goToScene(i);
      emit('structure');
    });
    row.appendChild(card);
  });
  const add = h('button', { class: 'tl-add', type: 'button' }, icon('plus'), 'مشهد');
  add.addEventListener('click', () => {
    document.querySelector('[data-tab="templates"]').click();
    toast('اختار قالب وبينضاف كمشهد جديد');
    const s = document.querySelector('#tab-templates .search');
    if (s) s.focus();
  });
  row.appendChild(add);
  updateHead();
  scheduleThumbs(true);
}

function miniBtn(name, title, fn) {
  const b = h('button', { type: 'button', title, 'aria-label': title }, icon(name));
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}
function dupScene(i) {
  const c = deepClone(S.project.scenes[i]);
  c.id = uid('s');
  c.elements.forEach((e) => (e.id = uid('e')));
  S.project.scenes.splice(i + 1, 0, c);
  commit();
  emit('structure');
  goToScene(i + 1);
}
function delScene(i) {
  if (S.project.scenes.length <= 1) { toast('لازم يضل مشهد واحد على الأقل'); return; }
  S.project.scenes.splice(i, 1);
  commit();
  emit('structure');
  goToScene(Math.min(i, S.project.scenes.length - 1));
}

function mark() {
  row.querySelectorAll('.tl-card').forEach((c) => c.classList.toggle('on', +c.dataset.i === S.sceneIdx));
  const on = row.querySelector('.tl-card.on');
  revealInRow(row, on);
}

function scheduleThumbs(all) {
  if (all === true) thumbs.forEach((c) => (c.dataset.dirty = '1'));
  else {
    const sc = S.project.scenes[S.sceneIdx];
    if (sc && thumbs.get(sc.id)) thumbs.get(sc.id).dataset.dirty = '1';
    if (all === undefined) thumbs.forEach((c) => (c.dataset.dirty = '1'));
  }
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(drawThumbs, 250);
}
function drawThumbs() {
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  for (const sc of S.project.scenes) {
    const cv = thumbs.get(sc.id);
    if (!cv || cv.dataset.dirty !== '1') continue;
    cv.dataset.dirty = '0';
    const env = createEnv(S.project, W, H, cv.width / W, { images, backdrop: false });
    try { renderScene(cv.getContext('2d'), sc, holdTime(sc, env), env); } catch (e) { /* ignore */ }
  }
}

function transitionPop(anchor, sc) {
  const tr = (sc.transition = sc.transition || { type: 'fade', dur: 0.7 });
  const box = h('div', {},
    h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'الانتقال'),
    h('p', { class: 'hint', style: { margin: '0 0 6px' } }, 'مرّر فوق أي انتقال لتشوفه بين مشهديك.'),
    transitionPicker(sc, (x) => { anchor.textContent = x.name; commit(); emit('render'); }),
    h('div', { style: { height: '8px' } }),
    range('المدة', tr.dur ?? 0.7, { min: 0.15, max: 2.5, step: 0.05 }, (v) => { tr.dur = v; emit('render'); }, () => commit()));
  popover(anchor, box);
}
void holdTime;
