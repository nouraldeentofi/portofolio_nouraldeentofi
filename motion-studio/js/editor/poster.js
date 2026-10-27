// Poster: save any moment of any scene as an image, or set it as the video's cover frame.
import { S, commit, sceneStart } from './store.js';
import { h, chips, range, toggle, toast } from './ui.js';
import { openModal } from './modal.js';
import { renderScene, createEnv, ASPECTS, holdTime } from '../engine/renderer.js';
import { images, syncImages } from './stage.js';
import { ensureFonts, projectFonts } from './fontsync.js';
import { saveFile } from '../export.js';
import { drawWatermark } from '../engine/watermark.js';
import { watermarkControl } from './wm-ui.js';

export function renderSceneImage(sceneIdx, t, scale = 1, type = 'image/png') {
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  const c = document.createElement('canvas');
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const env = createEnv(S.project, W, H, scale, { images });
  renderScene(c.getContext('2d'), S.project.scenes[sceneIdx], t, env);
  drawWatermark(c.getContext('2d'), env, S.project);
  return new Promise((res) => c.toBlob(res, type, 0.92));
}

export async function openPoster(startIdx = S.sceneIdx) {
  syncImages();
  await ensureFonts(projectFonts());
  const [W, H] = ASPECTS[S.project.aspect] || ASPECTS['4:5'];
  const st = { i: startIdx, t: null, fmt: 'png', scale: 1 };
  const cover = S.project.poster;
  if (cover) {
    const ci = S.project.scenes.findIndex((s) => s.id === cover.scene);
    if (ci >= 0 && startIdx === S.sceneIdx) { st.i = ci; st.t = cover.t; }
  }
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.min(480, (window.innerHeight * 0.62 * W) / H, window.innerWidth - 60);
  const canvas = h('canvas', { class: 'pv-canvas', width: Math.round(cssW * pr), height: Math.round((cssW * pr * H) / W), style: { maxWidth: cssW + 'px' } });
  const side = h('div', { class: 'pv-side' });
  const m = openModal({ title: 'بوستر / صورة غلاف', sub: 'اختار المشهد واللحظة، واحفظها كصورة للنشر أو كغلاف للفيديو.', size: 'mid', body: h('div', { class: 'poster-wrap' }, h('div', { style: { display: 'grid', placeItems: 'center' } }, canvas), side) });
  const env = () => createEnv(S.project, W, H, canvas.width / W, { images });
  const draw = () => { const e = env(); renderScene(canvas.getContext('2d'), S.project.scenes[st.i], st.t, e); drawWatermark(canvas.getContext('2d'), e, S.project); };
  const build = () => {
    const sc = S.project.scenes[st.i];
    if (st.t == null) st.t = holdTime(sc, env());
    side.innerHTML = '';
    side.append(
      chips('المشهد', st.i, S.project.scenes.map((s, k) => [k, String(k + 1)]), (v) => { st.i = +v; st.t = null; build(); }),
      range('اللحظة (ثانية)', st.t, { min: 0, max: Math.max(0.1, sc.duration - 0.01), step: 0.01 }, (v) => { st.t = v; draw(); }),
      chips('الصيغة', st.fmt, [['png', 'PNG'], ['jpg', 'JPG']], (v) => (st.fmt = v)),
      chips('الحجم', st.scale, [[1, `${W}×${H}`], [2, `${W * 2}×${H * 2}`]], (v) => (st.scale = +v)),
    );
    const save = h('button', { class: 'btn primary block big', type: 'button' }, 'حفظ الصورة');
    save.addEventListener('click', async () => {
      const type = st.fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      const blob = await renderSceneImage(st.i, st.t, st.scale, type);
      const r = await saveFile(blob, `poster-scene-${st.i + 1}.${st.fmt}`).catch((e) => { toast('ما قدرت احفظ: ' + (e.message || e.code)); return 'error'; });
      if (r !== 'declined' && r !== 'error') toast('انحفظت الصورة');
    });
    const isCover = S.project.poster && S.project.poster.scene === sc.id && Math.abs(S.project.poster.t - st.t) < 0.02;
    const setCover = h('button', { class: 'btn block', type: 'button' }, isCover ? 'هي الغلاف الحالي ✓' : 'خليها غلاف الفيديو');
    setCover.addEventListener('click', () => {
      S.project.poster = { scene: sc.id, t: +st.t.toFixed(2) };
      commit();
      toast('صارت غلاف الفيديو. وقت التصدير بتطلع أول لقطة.');
      build();
    });
    side.append(save, setCover);
    if (S.project.poster) {
      const rm = h('button', { class: 'btn ghost block', type: 'button' }, 'بلا غلاف');
      rm.addEventListener('click', () => { delete S.project.poster; commit(); build(); toast('شلت الغلاف'); });
      side.append(rm);
    }
    side.append(watermarkControl(draw));
    side.append(h('p', { class: 'hint' }, 'لينكدإن وإنستغرام بياخدوا أول لقطة كصورة للفيديو. لما تعيّن غلاف، بينحط بأول الفيديو لعُشر ثانية.'));
    draw();
  };
  build();
  void toggle; void sceneStart;
  return m;
}
