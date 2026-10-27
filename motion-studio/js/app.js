// Boot: wire panels, top bar, transport and keyboard shortcuts.
import { S, emit, on, commit, undo, redo, canUndo, canRedo, resetHistory, loadSaved, newProject, freshIds, scene, selected, totalDur, sceneStart } from './editor/store.js';
import { initStage, requestRender, goToScene, syncImages, inlineEdit } from './editor/stage.js';
import { initInspector, duplicateEl, deleteEl } from './editor/inspector.js';
import { buildElementsPanel } from './editor/elements-panel.js';
import { initLibrary } from './editor/library.js';
import { initStyle } from './editor/style-panel.js';
import { initTimeline } from './editor/timeline.js';
import { initExport, openExport } from './editor/export-ui.js';
import { buildBackgroundsTab } from './editor/gallery.js';
import { openWizard } from './editor/wizard.js';
import { openPoster } from './editor/poster.js';
import { openModal, modalOpen } from './editor/modal.js';
import { syncProjectFonts } from './editor/fontsync.js';
import { h, icon, toast } from './editor/ui.js';
import { ASPECTS } from './engine/renderer.js';
import { TEMPLATES, DEMO } from './templates/index.js';
import * as AUD from './engine/audio.js';
import { saveFile } from './export.js';
import { clamp } from './engine/util.js';
import { initWatermark } from './engine/watermark.js';

function demoProject() {
  const p = newProject();
  const ids = DEMO.filter((id) => TEMPLATES.some((t) => t.id === id));
  p.scenes = ids.map((id) => {
    const t = TEMPLATES.find((x) => x.id === id);
    const sc = freshIds(t.scene);
    sc.name = t.name;
    if (!sc.transition) sc.transition = { type: t.transition || 'slide', dur: 0.7 };
    return sc;
  });
  return p;
}

async function boot() {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
  const [saved] = await Promise.all([loadSaved(), initWatermark()]);
  S.project = saved ? saved.project : demoProject();
  S.project.sound = S.project.sound || { on: true, volume: 0.7 };
  S.sceneIdx = saved ? clamp(saved.sceneIdx || 0, 0, S.project.scenes.length - 1) : 0;
  resetHistory();
  syncImages();
  initStage();
  initLibrary();
  buildElementsPanel(document.getElementById('tab-elements'));
  buildBackgroundsTab(document.getElementById('tab-backgrounds'));
  initStyle();
  initInspector();
  initTimeline();
  initExport();
  bindTop();
  bindTransport();
  bindKeys();
  on('images', syncImages);
  const inv = () => AUD.invalidateSfx && AUD.invalidateSfx();
  on('structure', () => { syncImages(); inv(); });
  on('edit', inv);
  syncProjectFonts().then(() => emit('theme'));
  if (S.project.scenes.length) goToScene(S.sceneIdx);
  if (!saved) setTimeout(() => openWizard({ onDone: afterLoad }), 400);
}

// ---------------------------------------------------------------- top bar
function setUiTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light') root.dataset.ui = 'light'; else delete root.dataset.ui;
  try { localStorage.setItem('nms:ui', mode); } catch (e) { /* ignore */ }
  const b = document.getElementById('uiThemeBtn');
  b.innerHTML = '';
  b.appendChild(icon(mode === 'light' ? 'moon' : 'sun'));
  b.title = mode === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';
}

function bindTop() {
  const seg = document.getElementById('aspectSeg');
  const labels = { '9:16': 'ريلز 9:16', '4:5': 'لينكدإن 4:5', '1:1': 'مربع 1:1', '16:9': 'يوتيوب 16:9' };
  const drawSeg = () => {
    seg.innerHTML = '';
    Object.keys(ASPECTS).forEach((a) => {
      const [w, hh] = ASPECTS[a];
      const b = h('button', { type: 'button', class: S.project.aspect === a ? 'on' : '', role: 'radio', 'aria-checked': S.project.aspect === a ? 'true' : 'false' },
        h('span', { class: 'ar', style: { height: Math.round((10 * hh) / w) + 'px' } }), labels[a]);
      b.addEventListener('click', () => {
        S.project.aspect = a;
        commit();
        drawSeg();
        emit('aspect', 'render');
        toast('المقاس: ' + labels[a]);
      });
      seg.appendChild(b);
    });
  };
  drawSeg();
  on('structure', drawSeg);
  const ub = document.getElementById('undoBtn'), rb = document.getElementById('redoBtn');
  const upd = () => { ub.disabled = !canUndo(); rb.disabled = !canRedo(); };
  on('history', upd);
  upd();
  ub.addEventListener('click', undo);
  rb.addEventListener('click', redo);

  setUiTheme(document.documentElement.dataset.ui === 'light' ? 'light' : 'dark');
  document.getElementById('uiThemeBtn').addEventListener('click', () => setUiTheme(document.documentElement.dataset.ui === 'light' ? 'dark' : 'light'));
  document.getElementById('helpBtn').addEventListener('click', openHelp);
  document.getElementById('posterBtn').addEventListener('click', () => openPoster());

  const pb = document.getElementById('projectBtn'), menu = document.getElementById('projectMenu');
  pb.addEventListener('click', (e) => { e.stopPropagation(); buildMenu(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target) && !pb.contains(e.target)) menu.hidden = true; });
  function item(ic, lab, fn) {
    const b = h('button', { type: 'button' }, icon(ic), lab);
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    return b;
  }
  function confirmRow(label, fn) {
    menu.innerHTML = '';
    const yes = h('button', { type: 'button', style: { color: 'var(--danger)' } }, label);
    const no = h('button', { type: 'button' }, 'لا، رجوع');
    yes.addEventListener('click', (e) => { e.stopPropagation(); fn(); menu.hidden = true; });
    no.addEventListener('click', (e) => { e.stopPropagation(); buildMenu(); });
    menu.append(yes, no);
  }
  function buildMenu() {
    menu.innerHTML = '';
    menu.append(
      item('wand', 'فيديو جديد خطوة بخطوة', () => { menu.hidden = true; openWizard({ onDone: afterLoad }); }),
      item('film', 'المشروع التجريبي', () => confirmRow('أكيد؟ بيستبدل المشروع الحالي', () => { S.project = demoProject(); afterLoad(); })),
      item('plus', 'مشروع فاضي بمشهد واحد', () => confirmRow('أكيد؟ بيمسح المشروع الحالي', () => {
        S.project = newProject();
        const sc = freshIds({ duration: 5, bg: { type: 'mesh' }, camera: { type: 'push', amount: 0.8 }, fx: {}, elements: [] });
        sc.name = 'مشهد فاضي';
        S.project.scenes.push(sc);
        afterLoad();
      })),
      h('hr'),
      item('save', 'حفظ المشروع كملف', () => {
        menu.hidden = true;
        saveFile(new Blob([JSON.stringify(S.project)], { type: 'application/json' }), 'motion-project.json').then((r) => r !== 'declined' && toast('انحفظ ملف المشروع'));
      }),
      item('file', 'فتح مشروع…', () => {
        menu.hidden = true;
        const inp = document.getElementById('projectInput');
        inp.value = '';
        inp.onchange = () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          f.text().then((txt) => {
            try {
              const p = JSON.parse(txt);
              if (!p || !Array.isArray(p.scenes)) throw new Error('bad');
              S.project = p;
              afterLoad();
              toast('انفتح المشروع');
            } catch (err) { toast('هالملف مو مشروع صالح'); }
          });
        };
        inp.click();
      }),
      h('hr'),
      item('image', 'حفظ مشهد كصورة (بوستر)', () => { menu.hidden = true; openPoster(); }),
      item('film', 'تصدير الفيديو', () => { menu.hidden = true; openExport(); }),
    );
  }
}

export function afterLoad() {
  S.project.sound = S.project.sound || { on: true, volume: 0.7 };
  S.sceneIdx = 0;
  S.selId = null;
  resetHistory();
  syncImages();
  syncProjectFonts();
  emit('structure', 'theme', 'select', 'aspect', 'history', 'sound');
  goToScene(0);
}

function openHelp() {
  const steps = [
    ['١', 'اختار قوالب', 'من تبويب القوالب: كبسة على أي قالب بتشوفه كبير، وبعدين «أضف كمشهد».'],
    ['٢', 'غيّر الكلام', 'بتبويب «المشهد» في كل نصوص المشهد بمكان واحد. أو كبستين على النص بالفيديو.'],
    ['٣', 'الستايل', 'ثيم، خلفية، كاميرا، انتقال، وأصوات. كل شي بكبسة.'],
    ['٤', 'صدّر', '«تصدير MP4» بيعمل الفيديو على جهازك، و«بوستر» بيحفظ صورة من أي مشهد.'],
  ];
  const keys = [['Space', 'تشغيل / إيقاف'], ['Ctrl + Z', 'تراجع'], ['Ctrl + Y', 'إعادة'], ['Ctrl + D', 'نسخ العنصر'], ['Delete', 'حذف العنصر'], ['Enter', 'كتابة على النص المختار'], ['← →', 'تحريك العنصر / تنقل بين المشاهد'], ['Shift + سحب', 'تحريك باتجاه واحد'], ['Esc', 'إلغاء الاختيار']];
  const body = h('div', {},
    h('div', { class: 'story-cards' }, ...steps.map(([n, t, d]) => h('div', { class: 'story-card' }, h('b', {}, n + '  ' + t), h('small', {}, d)))),
    h('div', { class: 'group-title' }, 'اختصارات الكيبورد'),
    h('div', { class: 'help-list' }, ...keys.flatMap(([k, d]) => [h('span', {}, d), h('span', { class: 'kbd' }, k)])),
  );
  const m = openModal({ title: 'كيف بشتغل؟', sub: 'أربع خطوات وبيطلع فيديو.', size: 'mid', body });
  const w = h('button', { class: 'btn primary', type: 'button' }, icon('wand'), 'ابدأ فيديو جديد خطوة بخطوة');
  w.addEventListener('click', () => { m.close(); openWizard({ onDone: afterLoad }); });
  m.setFoot(h('span', { class: 'note' }, 'كلشي بيشتغل على جهازك وببلاش.'), w);
}

// ---------------------------------------------------------------- transport
function fmt(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return m + ':' + s.toFixed(1).padStart(4, '0');
}
function bindTransport() {
  const app = document.getElementById('app');
  const play = document.getElementById('playBtn');
  const scrub = document.getElementById('scrub');
  const label = document.getElementById('timeLabel');
  const loopB = document.getElementById('loopBtn');
  const soundB = document.getElementById('soundBtn');
  let lastT = S.time;
  const sync = () => {
    const total = totalDur() || 1;
    label.textContent = fmt(S.time) + ' / ' + fmt(total);
    if (document.activeElement !== scrub) scrub.value = String(Math.round((S.time / total) * 1000));
    if (S.playing && AUD.liveTick) {
      if (S.time < lastT && AUD.liveStart && S.sound) AUD.liveStart(S.project, S.time); // looped back: restart the track
      AUD.liveTick(S.project, lastT, S.time, S.sound);
    }
    lastT = S.time;
  };
  on('time', sync);
  on('structure', sync);
  on('durations', sync);
  on('play', () => {
    app.classList.toggle('playing', S.playing);
    play.setAttribute('aria-label', S.playing ? 'إيقاف' : 'تشغيل');
    lastT = S.time;
    if (S.playing && S.sound && AUD.liveStart) AUD.liveStart(S.project, S.time);
    if (!S.playing && AUD.liveStop) AUD.liveStop();
    requestRender();
  });
  play.addEventListener('click', togglePlay);
  scrub.addEventListener('input', () => {
    S.playing = false;
    emit('play');
    S.time = (+scrub.value / 1000) * totalDur();
    const prev = S.sceneIdx;
    let acc = 0;
    for (let i = 0; i < S.project.scenes.length; i++) { if (S.time < acc + S.project.scenes[i].duration) { S.sceneIdx = i; break; } acc += S.project.scenes[i].duration; }
    if (prev !== S.sceneIdx) { S.selId = null; emit('scene', 'select'); }
    emit('time', 'render');
  });
  loopB.addEventListener('click', () => { S.loopScene = !S.loopScene; loopB.classList.toggle('on', S.loopScene); });
  const drawSound = () => { soundB.classList.toggle('on', S.sound); soundB.innerHTML = ''; soundB.append(icon(S.sound ? 'sound' : 'mute'), S.sound ? 'صوت' : 'صامت'); };
  drawSound();
  soundB.addEventListener('click', () => {
    S.sound = !S.sound;
    drawSound();
    if (S.sound) AUD.audioUnlock && AUD.audioUnlock();
    if (!S.sound && AUD.liveStop) AUD.liveStop();
    if (S.sound && S.playing && AUD.liveStart) AUD.liveStart(S.project, S.time);
  });
  sync();
}
function togglePlay() {
  AUD.audioUnlock && AUD.audioUnlock();
  S.playing = !S.playing;
  if (S.playing) {
    const st = sceneStart(S.sceneIdx), en = st + (scene() ? scene().duration : 0);
    if (S.loopScene && (S.time < st || S.time >= en - 0.05)) S.time = st;
    if (S.time >= totalDur() - 0.05) S.time = 0;
  }
  emit('play');
}

// ---------------------------------------------------------------- keyboard + side tabs
function bindKeys() {
  document.addEventListener('keydown', (e) => {
    if (modalOpen()) return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing) return;
    const el = selected();
    if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
    if (e.key === 'Escape') { if (S.selId) { S.selId = null; emit('select'); } return; }
    if (e.key === '?') { openHelp(); return; }
    if (!el) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowLeft' ? 1 : -1;
        goToScene(clamp(S.sceneIdx + d, 0, S.project.scenes.length - 1));
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteEl(el); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateEl(el); return; }
    if (e.key === 'Enter' && el.type === 'text') { e.preventDefault(); inlineEdit(el); return; }
    const step = e.shiftKey ? 0.02 : 0.004;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) {
      e.preventDefault();
      el.x = +((el.x ?? 0.5) + mv[0]).toFixed(4);
      el.y = +((el.y ?? 0.5) + mv[1]).toFixed(4);
      requestRender();
      clearTimeout(bindKeys.t);
      bindKeys.t = setTimeout(() => { commit(); emit('edit'); }, 400);
    }
  });
  const TABS = ['templates', 'elements', 'backgrounds', 'style'];
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs [data-tab]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
    TABS.forEach((t) => {
      const el = document.getElementById('tab-' + t);
      const show = t === b.dataset.tab;
      const was = el.hidden;
      el.hidden = !show;
      if (show && was) el.dispatchEvent(new Event('tabshow'));
    });
  }));
}

boot();
