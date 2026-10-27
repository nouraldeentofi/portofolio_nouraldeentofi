// Export dialog: settings -> progress -> preview + save.
import { S } from './store.js';
import { h, icon, chips, toggle, toast } from './ui.js';
import { openModal } from './modal.js';
import { exportVideo, saveFile } from '../export.js';
import { images, syncImages } from './stage.js';
import { ensureFonts, projectFonts } from './fontsync.js';
import { timeline } from '../engine/renderer.js';
import { openPoster, renderSceneImage } from './poster.js';
import { watermarkControl } from './wm-ui.js';

const opts = { scale: 1, fps: 30, sound: true, cover: true };
let lastUrl = null;

export function initExport() {
  document.getElementById('exportBtn').addEventListener('click', openExport);
}

export function openExport() {
  if (!S.project.scenes.length) { toast('ضيف مشهد واحد على الأقل'); return; }
  S.playing = false;
  let running = null;
  const m = openModal({ title: 'تصدير الفيديو', size: '', onClose: () => running && running.abort() });
  const body = m.body;

  function settings() {
    const dur = timeline(S.project).total;
    body.innerHTML = '';
    const hasCover = !!S.project.poster && S.project.scenes.some((s) => s.id === S.project.poster.scene);
    body.append(
      h('p', { class: 'note' }, `الفيديو ${dur.toFixed(1)} ثانية · ${S.project.scenes.length} مشاهد. التصدير بيصير كامل على جهازك، ما في رفع لأي سيرفر.`),
      chips('الجودة', opts.scale, [[1, 'Full HD 1080'], [0.6667, '720p أسرع']], (v) => (opts.scale = +v)),
      chips('عدد الإطارات', opts.fps, [[30, '30 fps'], [60, '60 fps ناعم']], (v) => (opts.fps = +v)),
      toggle('المؤثرات الصوتية', opts.sound && (S.project.sound || {}).on !== false, (v) => (opts.sound = v)),
    );
    if (hasCover) body.append(toggle('ابدأ بصورة الغلاف (عُشر ثانية)', opts.cover, (v) => (opts.cover = v)));
    const coverBtn = h('button', { class: 'btn small', type: 'button', style: { marginBottom: '12px' } }, icon('image'), hasCover ? 'غيّر صورة الغلاف' : 'اختار صورة غلاف للفيديو');
    coverBtn.addEventListener('click', () => { m.close(); openPoster(); });
    body.append(coverBtn, watermarkControl());
    const go = h('button', { class: 'btn primary block big', type: 'button' }, 'ابدأ التصدير');
    go.addEventListener('click', run);
    m.setFoot(null);
    body.append(go);
  }

  async function run() {
    body.innerHTML = '';
    const bar = h('i');
    const stat = h('div', { class: 'exp-stats' }, h('span', {}, '0%'), h('span', {}, ''));
    const phase = h('p', { class: 'note' }, 'عم جهّز الخطوط والصور…');
    const cancel = h('button', { class: 'btn block', type: 'button' }, 'إلغاء');
    body.append(phase, h('div', { class: 'bar' }, bar), stat, cancel);
    const ac = new AbortController();
    running = ac;
    cancel.addEventListener('click', () => ac.abort());
    try {
      syncImages();
      await ensureFonts(projectFonts());
      await Promise.all([...images.values()].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      const project = JSON.parse(JSON.stringify(S.project));
      const res = await exportVideo(project, {
        ...opts,
        images,
        signal: ac.signal,
        onProgress: ({ phase: ph, p, frame, frames, eta }) => {
          bar.style.width = (p * 100).toFixed(1) + '%';
          phase.textContent = ph === 'video' ? 'عم ارسم الإطارات…' : ph === 'audio' ? 'عم ركّب الأصوات…' : 'عم جهّز الملف…';
          stat.firstChild.textContent = Math.round(p * 100) + '% · ' + frame + '/' + frames;
          stat.lastChild.textContent = eta > 0 ? '~' + Math.ceil(eta) + 's' : '';
        },
      });
      running = null;
      done(res);
    } catch (e) {
      running = null;
      if (e && e.name === 'AbortError') { settings(); toast('انلغى التصدير'); return; }
      body.innerHTML = '';
      body.append(h('p', { class: 'note' }, 'صار خطأ بالتصدير: ' + (e && e.message ? e.message : e)), h('p', { class: 'note' }, 'جرّب جودة 720p، أو افتح الموقع على Chrome أو Edge على الكمبيوتر.'));
      const back = h('button', { class: 'btn block', type: 'button' }, 'رجوع');
      back.addEventListener('click', settings);
      body.append(back);
    }
  }

  function done(res) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(res.blob);
    const mb = (res.blob.size / 1048576).toFixed(1);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const name = 'motion-' + stamp + '.' + res.ext;
    body.innerHTML = '';
    const vid = h('video', { class: 'exp-video', src: lastUrl, controls: true, playsinline: true, autoplay: true, muted: true, loop: true });
    const save = h('button', { class: 'btn primary block big', type: 'button' }, icon('save'), 'حفظ الفيديو (' + mb + ' MB)');
    save.addEventListener('click', async () => {
      try {
        const r = await saveFile(res.blob, name);
        toast(r === 'declined' ? 'ما انحفظ الملف' : 'تمام! الفيديو انحفظ');
      } catch (e) { toast('ما قدرت احفظ الملف: ' + (e.message || e.code || e)); }
    });
    const kids = [vid, h('div', { class: 'exp-stats' }, h('span', {}, res.width + '×' + res.height + ' · ' + res.codec + (res.audio ? ' + ' + res.audio : '')), h('span', {}, mb + ' MB')), save];
    if (S.project.poster) {
      const ci = S.project.scenes.findIndex((s) => s.id === S.project.poster.scene);
      if (ci >= 0) {
        const pb = h('button', { class: 'btn block', type: 'button', style: { marginTop: '8px' } }, icon('image'), 'حفظ صورة الغلاف كمان');
        pb.addEventListener('click', async () => {
          const blob = await renderSceneImage(ci, S.project.poster.t, 1, 'image/jpeg');
          const r = await saveFile(blob, 'cover-' + stamp + '.jpg').catch(() => 'error');
          if (r !== 'declined' && r !== 'error') toast('انحفظت صورة الغلاف');
        });
        kids.push(pb);
      }
    }
    const again = h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '8px' } }, 'تصدير بإعدادات تانية');
    again.addEventListener('click', settings);
    kids.push(again);
    body.append(...kids);
  }

  settings();
}
