// Start wizard: shape → style → content (ready storyboard or hand-picked scenes).
import { S, emit, newProject, freshIds } from './store.js';
import { h, icon, toast } from './ui.js';
import { openModal } from './modal.js';
import { TEMPLATES, CATEGORIES } from '../templates/index.js';
import { THEMES } from '../engine/themes.js';
import { ASPECTS } from '../engine/renderer.js';
import { sceneThumb, thumbCanvas } from './thumbs.js';
import { loadFonts } from '../engine/fonts.js';
import { clearTextCache } from '../engine/text.js';

export const STORIES = [
  { name: 'بوست لينكدإن سريع', sub: 'هوك، رقم، نصيحة، وخاتمة', ids: ['core-brand-hook', 'core-big-number', 'core-checklist', 'core-outro'] },
  { name: 'شرح أتمتة', sub: 'سؤال، ورك فلو، نتيجة قبل وبعد', ids: ['type-hook-question', 'core-flow-4', 'tech-flow-n8n', 'info-8h-to-15m', 'core-outro'] },
  { name: 'إطلاق منتج', sub: 'إعلان، موقع، أرقام، عرض', ids: ['vis-promo-launch', 'tech-mock-launch', 'info-kpi-row', 'vis-promo-discount', 'vis-outro-follow'] },
  { name: 'قصة نجاح عميل', sub: 'افتتاحية، قبل وبعد، إيرادات، شهادة', ids: ['type-intro-cinematic', 'info-old-new-way', 'info-revenue-card', 'vis-quote-testimonial', 'vis-outro-contact'] },
  { name: 'ريل كلمات سريع', sub: 'نص متحرك قوي ومختصر', ids: ['core-kinetic-slam', 'type-kin-scatter', 'type-kin-glitch', 'type-kin-shipit'] },
  { name: 'نصائح وقائمة', sub: 'رقم، خطوات، افعل ولا تفعل', ids: ['type-hook-number', 'info-steps-num', 'info-do-dont', 'vis-outro-follow'] },
  { name: 'عرّف عن حالك', sub: 'اسمك، صورتك، أدواتك، تواصل', ids: ['type-intro-name', 'vis-photo-portrait', 'tech-stack', 'vis-outro-contact'] },
  { name: 'ويبينار أو فعالية', sub: 'إعلان، خطة، عد تنازلي', ids: ['vis-promo-webinar', 'info-roadmap-h', 'vis-promo-countdown', 'vis-outro-linkbio'] },
  { name: 'تقنية وكود', sub: 'كود، API، MCP، نشر', ids: ['core-code', 'tech-api', 'tech-mcp', 'tech-deploy', 'core-outro'] },
  { name: 'ثلاثي الأبعاد', sub: 'مجسمات وحركة كاميرا', ids: ['core-globe', 'vis-3d-knot', 'vis-3d-wave', 'vis-3d-globe-rings'] },
  { name: 'قصتي الشخصية', sub: 'بداية، اعتراف، تحوّل، وخاتمة', ids: ['st-intro-diary', 'st-hook-confession', 'st-hook-twist', 'st-intro-years', 'st-outro-comment'] },
  { name: 'عرّف عن شركتك', sub: 'مين نحنا، خدماتنا، طريقة الشغل، تواصل', ids: ['pr-biz-intro', 'pr-biz-services', 'pr-biz-process', 'pr-biz-clients', 'pr-biz-contact'] },
  { name: 'إطلاق تطبيق', sub: 'تطبيق، شاشات، تقييم، تجربة مجانية', ids: ['ar-promo-app', 'pr-mock-twophones', 'pr-ui-rating', 'ar-promo-trial', 'st-outro-call'] },
  { name: 'أتمتة من الداخل', sub: 'webhook، وكيل، نتيجة', ids: ['st-hook-minute', 'pr-tech-webhook', 'pr-tech-agent-trace', 'pr-flow-support', 'st-outro-next'] },
  { name: 'عرض وخصم', sub: 'فلاش سيل، سعر، باقات، عد تنازلي', ids: ['ar-promo-flash', 'ar-promo-price-drop', 'ar-promo-pricing', 'vis-promo-countdown', 'vis-outro-linkbio'] },
  { name: 'تهنئة ومناسبة', sub: 'رمضان، سنة جديدة، شكر', ids: ['ar-ev-ramadan', 'ar-ev-new-year', 'ar-ev-thanks', 'st-outro-end'] },
  { name: 'كلمات قوية', sub: 'نص متحرك من الحزمة الجديدة', ids: ['st-kin-domino', 'st-kin-marker', 'st-kin-flipboard', 'st-kin-stickers', 'st-outro-rewatch'] },
].map((s) => ({ ...s, ids: s.ids.filter((id) => TEMPLATES.some((t) => t.id === id)) })).filter((s) => s.ids.length >= 3);

const ASPECT_INFO = { '9:16': ['ريلز وستوري', 'TikTok · Reels'], '4:5': ['بوست لينكدإن', 'LinkedIn · Instagram'], '1:1': ['مربع', 'Instagram · X'], '16:9': ['عرضي', 'YouTube · عرض'] };

export function openWizard({ onDone } = {}) {
  const st = { step: 0, aspect: S.project.aspect || '4:5', theme: S.project.theme || 'night', picks: [], cat: 'all' };
  const m = openModal({ title: 'فيديو جديد', size: 'wide' });
  const stepper = () => h('div', { class: 'steps' }, ...['المقاس', 'الستايل', 'المشاهد'].flatMap((n, i) => [i ? h('i') : null, h('span', { class: i === st.step ? 'on' : '' }, h('b', {}, String(i + 1)), n)]));
  const proj = () => ({ ...newProject(), aspect: st.aspect, theme: st.theme });

  function render() {
    m.body.innerHTML = '';
    m.body.append(stepper(), h('div', { style: { height: '14px' } }));
    if (st.step === 0) stepAspect();
    else if (st.step === 1) stepTheme();
    else stepContent();
    const back = h('button', { class: 'btn', type: 'button' }, 'رجوع');
    back.addEventListener('click', () => { st.step--; render(); });
    const next = h('button', { class: 'btn primary', type: 'button' }, st.step < 2 ? 'التالي' : st.picks.length ? `اصنع الفيديو (${st.picks.length} مشاهد)` : 'اختار مشهد واحد على الأقل');
    if (st.step === 2 && !st.picks.length) next.disabled = true;
    next.addEventListener('click', () => { if (st.step < 2) { st.step++; render(); } else create(); });
    m.setFoot(st.step ? back : h('span', { class: 'note' }, 'بتقدر تغيّر كل شي بعدين'), next);
  }

  function stepAspect() {
    m.setTitle('فيديو جديد', 'لوين رح تنشر الفيديو؟');
    const g = h('div', { class: 'aspect-cards' });
    Object.keys(ASPECTS).forEach((a) => {
      const [w, hh] = ASPECTS[a];
      const k = 70 / Math.max(w, hh);
      const card = h('button', { type: 'button', class: 'aspect-card' + (st.aspect === a ? ' on' : '') },
        h('div', { class: 'shape', style: { width: w * k + 'px', height: hh * k + 'px' } }), h('b', {}, ASPECT_INFO[a][0]), h('small', {}, a + ' · ' + ASPECT_INFO[a][1]));
      card.addEventListener('click', () => { st.aspect = a; st.step = 1; render(); });
      g.appendChild(card);
    });
    m.body.append(g);
  }

  function stepTheme() {
    m.setTitle('اختار الستايل', 'الألوان والخطوط لكل الفيديو. ثيمات هويتك أول أربعة.');
    const g = h('div', { class: 'tpl-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } });
    const sample = TEMPLATES.find((t) => t.id === 'core-brand-hook') || TEMPLATES[0];
    THEMES.forEach((th) => {
      const c = thumbCanvas(240, { ...proj(), theme: th.id });
      const card = h('div', { class: 'tpl' + (st.theme === th.id ? ' picked' : ''), tabindex: '0', role: 'button' }, c,
        h('div', { class: 'meta' }, h('span', { class: 'name' }, th.name), th.group === 'brand' ? h('span', { class: 'badge' }, 'هويتك') : h('span', { class: 'num' }, th.en)));
      const pick = () => { st.theme = th.id; st.step = 2; render(); };
      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
      g.appendChild(card);
      requestAnimationFrame(() => sceneThumb(c, sample.scene, null, { ...proj(), theme: th.id }));
      c._th = th.id;
    });
    m.body.append(g);
    // each theme has its own font pair: redraw once they are in
    loadFonts(THEMES.flatMap((t) => [...t.fonts.display, ...t.fonts.body])).then(() => {
      clearTextCache();
      g.querySelectorAll('canvas').forEach((c) => sceneThumb(c, sample.scene, null, { ...proj(), theme: c._th }));
    });
  }

  function stepContent() {
    m.setTitle('شو بدك يكون بالفيديو؟', 'كبسة على فكرة جاهزة، أو اختار المشاهد وحدة وحدة بالترتيب اللي بدك ياه.');
    const stories = h('div', { class: 'story-cards' });
    STORIES.forEach((s) => {
      const b = h('button', { type: 'button', class: 'story-card' }, h('b', {}, s.name), h('small', {}, s.sub + ' · ' + s.ids.length + ' مشاهد'));
      b.addEventListener('click', () => { st.picks = [...s.ids]; render(); toast('اخترنا ' + s.ids.length + ' مشاهد. فيك تزيد أو تشيل.'); });
      stories.appendChild(b);
    });
    const cats = h('div', { class: 'cats' });
    [['all', 'الكل'], ['picked', 'المختار (' + st.picks.length + ')'], ...CATEGORIES].forEach(([id, lab]) => {
      const b = h('button', { class: 'cat' + (st.cat === id ? ' on' : ''), type: 'button' }, lab);
      b.addEventListener('click', () => { st.cat = id; render(); });
      cats.appendChild(b);
    });
    const grid = h('div', { class: 'tpl-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } });
    const list = st.cat === 'picked' ? st.picks.map((id) => TEMPLATES.find((t) => t.id === id)) : TEMPLATES.filter((t) => st.cat === 'all' || t.cat === st.cat);
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const t = TEMPLATES.find((x) => x.id === e.target.dataset.id);
      sceneThumb(e.target.querySelector('canvas'), t.scene, null, proj());
    }), { root: m.card, rootMargin: '300px' });
    list.forEach((t) => {
      const idx = st.picks.indexOf(t.id);
      const c = thumbCanvas(240, proj());
      const card = h('div', { class: 'tpl' + (idx >= 0 ? ' picked' : ''), 'data-id': t.id, tabindex: '0', role: 'checkbox', 'aria-checked': idx >= 0 ? 'true' : 'false' },
        c, h('div', { class: 'meta' }, h('span', { class: 'name' }, t.name)), idx >= 0 ? h('div', { class: 'pick-badge' }, String(idx + 1)) : null);
      const toggle = () => {
        const i = st.picks.indexOf(t.id);
        if (i >= 0) st.picks.splice(i, 1); else st.picks.push(t.id);
        render();
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      grid.appendChild(card);
      io.observe(card);
    });
    m.body.append(h('div', { class: 'group-title' }, 'أفكار جاهزة'), stories, h('div', { class: 'group-title' }, 'أو اختار بنفسك'), cats, grid);
  }

  function create() {
    const p = proj();
    p.sound = { on: true, volume: 0.7 };
    p.scenes = st.picks.map((id) => {
      const t = TEMPLATES.find((x) => x.id === id);
      const sc = freshIds(t.scene);
      sc.name = t.name;
      if (!sc.transition) sc.transition = { type: t.transition || 'slide', dur: 0.7 };
      return sc;
    });
    S.project = p;
    m.close();
    onDone && onDone();
    toast('جاهز! كبسة على أي نص لتغيّره، أو شغّل الفيديو ▶');
  }

  render();
  return m;
}
void icon; void emit;
