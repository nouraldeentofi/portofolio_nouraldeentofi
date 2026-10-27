/* خياط برستيج VIP — site.js (vanilla, no frameworks) */
(() => {
  'use strict';
  const C = window.CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mqPhone = matchMedia('(max-width: 899px)');
  const mqTouch = matchMedia('(hover: none)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SDA = window.CSS && CSS.supports('animation-timeline: view()');
  if (!SDA) root.classList.add('no-sda');
  const raf = (fn) => { let t = 0; return () => { if (!t) t = requestAnimationFrame(() => { t = 0; fn(); }); }; };

  /* ---------- language: the page is either Arabic (rtl) or English (ltr) ---------- */
  const EN = (C.lang || root.lang) === 'en';
  const RTL = !EN;
  const L = EN ? {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sep: ', ', tomorrow: 'tomorrow ', openUntil: 'Open now · closes ', closedAt: 'Closed now · opens ', closed: 'Closed now',
    dark: 'Dark mode', light: 'Light mode', step: (n) => `Step <span dir="ltr">${n}</span> of <span dir="ltr">3</span>`,
    errDate: 'Choose a day that suits you', errTime: 'Choose a time', errName: 'Write your name so we know who you are',
    prevMonth: 'Previous month', nextMonth: 'Next month', closedDay: ', closed',
    sum: { count: 'Thobes', occ: 'Occasion', when: 'Appointment', model: 'Model', none: 'None', edit: 'Edit' },
    msg: { hi: (n) => `Hello, I'd like to book a measuring appointment at ${n}.`, name: 'Name', count: 'Thobes', occ: 'Occasion', when: 'Appointment', model: 'Model', notes: 'Notes', from: '(from the website)' },
  } : {
    days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    wd: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    sep: '، ', tomorrow: 'بكرة ', openUntil: 'مفتوح الحين · يقفل ', closedAt: 'مسكّر الحين · يفتح ', closed: 'مسكّر الحين',
    dark: 'الوضع الليلي', light: 'الوضع النهاري', step: (n) => `الخطوة <span dir="ltr">${n}</span> من <span dir="ltr">3</span>`,
    errDate: 'اختر اليوم اللي يناسبك', errTime: 'اختر الوقت', errName: 'اكتب اسمك عشان نعرفك',
    prevMonth: 'الشهر اللي قبل', nextMonth: 'الشهر اللي بعد', closedDay: '، مسكّر',
    sum: { count: 'عدد الثياب', occ: 'المناسبة', when: 'الموعد', model: 'الموديل', none: 'بدون', edit: 'تعديل' },
    msg: { hi: (n) => `السلام عليكم، أبي أحجز موعد قياس عند ${n}.`, name: 'الاسم', count: 'عدد الثياب', occ: 'المناسبة', when: 'الموعد', model: 'الموديل', notes: 'ملاحظات', from: '(من الموقع)' },
  };

  /* ---------- dialect time + Riyadh clock ---------- */
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_AR = L.days;
  const MON_AR = L.months;
  const part = (h) => (EN ? (h < 12 ? 'am' : 'pm') : h < 4 ? 'بالليل' : h < 5 ? 'الفجر' : h < 12 ? 'الصبح' : h < 15 ? 'الظهر' : h < 18 ? 'العصر' : h < 19 ? 'المغرب' : 'بالليل');
  const fmtTime = (min) => { const h = Math.floor(min / 60) % 24, m = min % 60; return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${part(h)}`; };
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  function riyadhNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: C.tz || 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t).value;
    return { y: +g('year'), m: +g('month') - 1, d: +g('day'), min: (+g('hour') % 24) * 60 + +g('minute'), wd: DAYS.indexOf(g('weekday').toLowerCase().slice(0, 3)) };
  }
  const HOURS = C.hours || {};
  const hasHours = Object.keys(HOURS).length > 0;
  const rangesFor = (wd) => (HOURS[DAYS[wd]] || []).map(([a, b]) => { const s = toMin(a); let e = toMin(b); if (e <= s) e += 1440; return [s, e]; });

  function openStatus() {
    if (!hasHours) return null;
    const n = riyadhNow();
    const list = rangesFor(n.wd).concat(rangesFor((n.wd + 6) % 7).filter(([, e]) => e > 1440).map(([s, e]) => [s - 1440, e - 1440]));
    for (const [s, e] of list) if (n.min >= s && n.min < e) return { open: true, until: e % 1440 };
    for (let k = 0; k < 8; k++) {
      const starts = rangesFor((n.wd + k) % 7).map(([s]) => s).sort((a, b) => a - b);
      for (const s of starts) if (k > 0 || s > n.min) return { open: false, at: s, k, wd: (n.wd + k) % 7 };
    }
    return { open: false };
  }
  function paintBadges() {
    const st = openStatus();
    $$('#openBadge,[data-open-badge]').forEach((b) => {
      if (!st) { b.hidden = true; return; }
      const when = st.k === 0 ? '' : st.k === 1 ? L.tomorrow : `${DAY_AR[st.wd]} `;
      $('span', b).textContent = st.open ? `${L.openUntil}${fmtTime(st.until)}` : st.at != null ? `${L.closedAt}${when}${fmtTime(st.at)}` : L.closed;
      b.classList.toggle('is-closed', !st.open);
      b.hidden = false; b.removeAttribute('data-pending');
    });
    const today = riyadhNow().wd;
    $$('.hours [data-wd]').forEach((el) => el.classList.toggle('is-today', +el.dataset.wd === today));
  }
  paintBadges();
  setInterval(paintBadges, 60000);

  /* ---------- theme (light default, remembered) ---------- */
  const themeBtn = $('#themeBtn');
  const metaTheme = $('#metaTheme');
  function applyTheme(t) {
    root.dataset.theme = t;
    themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    themeBtn.setAttribute('aria-label', t === 'dark' ? L.light : L.dark);
    if (metaTheme) metaTheme.content = t === 'dark' ? '#0B1322' : '#EEF2F6';
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const go = () => { applyTheme(next); try { localStorage.setItem('pv-theme', next); } catch (e) { /* private mode */ } };
    if (document.startViewTransition && !mqReduce.matches) {
      const r = themeBtn.getBoundingClientRect();
      root.style.setProperty('--vx', `${r.left + r.width / 2}px`);
      root.style.setProperty('--vy', `${r.top + r.height / 2}px`);
      document.startViewTransition(go);
    } else go();
  });

  /* ---------- header: glass after first scroll, hide on down, show on up ---------- */
  const hdr = $('#hdr');
  const progI = $('.progress i');
  const heroStage = $('.hero-stage');
  const heroTitle = $('.hero-title');
  const atelier = $('.atelier');
  let lastY = scrollY;
  let overlayOpen = false;
  const onScroll = raf(() => {
    const y = scrollY;
    hdr.classList.toggle('is-scrolled', y > 8);
    if (!overlayOpen) {
      if (y > 160 && y > lastY + 4) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 160) hdr.classList.remove('is-hidden');
    }
    if (!SDA && !mqReduce.matches) {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progI.style.setProperty('--p', (y / max).toFixed(4));
      const k = Math.min(1, y / (innerHeight * 0.85));
      if (heroStage) { heroStage.style.transform = `translateY(${k * 10}%) scale(${1 - k * 0.1})`; heroStage.style.opacity = String(1 - k * 0.7); }
      if (heroTitle) { heroTitle.style.transform = `translateY(${-k * 14}%) scale(${1 - k * 0.04})`; heroTitle.style.opacity = String(1 - k * 0.45); }
      atelier.style.transform = `translateY(${-(y / max) * 5}%)`;
    }
    lastY = y;
  });
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  let scrollIdle = 0;
  addEventListener('scroll', () => {
    if (!scrollIdle) root.classList.add('is-scrolling');
    clearTimeout(scrollIdle);
    scrollIdle = setTimeout(() => { root.classList.remove('is-scrolling'); scrollIdle = 0; }, 160);
  }, { passive: true });

  /* ---------- scroll reveal fallback (no scroll-driven animations, or reduced motion) ---------- */
  if (!SDA || mqReduce.matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.rv,.slide').forEach((el) => io.observe(el));
  }

  /* ---------- count up from zero when visible ---------- */
  const counters = $$('.count');
  if (!mqReduce.matches) {
    counters.forEach((el) => { const dec = +(el.dataset.dec || 0); el.textContent = (0).toFixed(dec); });
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1500;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- pause animated areas that are off screen ---------- */
  const pio = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting)), { rootMargin: '80px' });
  $$('.hero,.hero-stage,.bld-stage,.why-row,.ftr,.visit-map,.proof').forEach((el) => pio.observe(el));
  document.addEventListener('visibilitychange', () => { atelier.classList.toggle('is-paused', document.hidden); root.classList.toggle('tab-hidden', document.hidden); });

  /* ---------- opening «على المقاس»: plays once per session (class set in <head>); replay on demand ---------- */
  const heroSec = $('#home');
  // landed somewhere else on the page (deep link / restored scroll): don't hold back a sequence nobody sees
  if (root.classList.contains('cut-play') && ((location.hash && location.hash !== '#home') || scrollY > innerHeight * 0.6)) root.classList.remove('cut-play');
  const replayBtn = $('.cut-replay');
  if (replayBtn) replayBtn.addEventListener('click', () => {
    if (mqReduce.matches) return;
    root.classList.remove('cut-play');
    void heroSec.offsetWidth; // restart every keyframe from 0
    heroSec.classList.remove('is-paused'); $('.hero-stage').classList.remove('is-paused');
    root.classList.add('cut-play');
    if (heroSec.getBoundingClientRect().top < -40) heroSec.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- scroll lock (scrollbar-gutter keeps layout still) ---------- */
  let locks = 0;
  const lock = () => { if (locks++ === 0) root.classList.add('lock'); };
  const unlock = () => { if (--locks <= 0) { locks = 0; root.classList.remove('lock'); } };

  /* ---------- bottom sheet ---------- */
  const sheet = $('#sheet'), scrim = $('#scrim'), sheetBody = $('#sheetBody'), sheetTitle = $('#sheetTitle');
  let sheetState = null;
  function openSheet(title, node, onClose) {
    if (sheetState) closeSheet(true);
    sheetState = { node, home: node.parentNode, next: node.nextSibling, onClose, back: document.activeElement };
    sheetTitle.textContent = title;
    sheetBody.appendChild(node);
    scrim.hidden = false; sheet.hidden = false;
    lock(); overlayOpen = true; dockHide('sheet', true);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('open'); sheet.classList.add('open'); }));
    setTimeout(() => { const f = node.querySelector('[aria-selected="true"],[aria-pressed="true"],button:not(:disabled),[tabindex="0"],li[role="option"]'); (f || $('#sheetClose')).focus({ preventScroll: true }); }, 60);
  }
  function closeSheet(instant) {
    if (!sheetState) return;
    const st = sheetState; sheetState = null;
    sheet.classList.remove('open'); scrim.classList.remove('open');
    const done = () => {
      sheet.hidden = true; scrim.hidden = true;
      st.home.insertBefore(st.node, st.next);
      unlock(); overlayOpen = false; dockHide('sheet', false);
      if (st.onClose) st.onClose();
      if (st.back && st.back.focus) st.back.focus({ preventScroll: true });
    };
    instant === true ? done() : setTimeout(done, 380);
  }
  scrim.addEventListener('click', () => closeSheet());
  $('#sheetClose').addEventListener('click', () => closeSheet());
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key === 'Tab') {
      const f = $$('button:not(:disabled),[tabindex="0"],li[role="option"][tabindex="0"]', sheet).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- custom dropdown (listbox) — popover on desktop, bottom sheet on phones ---------- */
  const openDDs = new Set();
  function makeDropdown(el, { onPick, render } = {}) {
    const btn = $('.dd-btn', el), val = $('.dd-val', el), pop = $('.pop', el);
    const content = pop.firstElementChild;
    const list = $('.dd-list', el);
    const api = { el, value: '', open, close, set, list };
    let active = -1;
    function opts() { return list ? $$('li[role="option"]', list) : []; }
    function setActive(i) {
      const o = opts(); if (!o.length) return;
      active = (i + o.length) % o.length;
      o.forEach((x, k) => { x.classList.toggle('is-active', k === active); x.tabIndex = k === active ? 0 : -1; });
      // keep the active option visible by scrolling the list only — never the page
      const li = o[active], L = li.parentElement;
      if (li.offsetTop < L.scrollTop) L.scrollTop = li.offsetTop;
      else if (li.offsetTop + li.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = li.offsetTop + li.offsetHeight - L.clientHeight;
      if (list) list.setAttribute('aria-activedescendant', o[active].id);
    }
    function set(value, label) {
      api.value = value;
      val.textContent = value ? label : val.dataset.ph;
      val.classList.toggle('is-ph', !value);
      opts().forEach((x) => x.setAttribute('aria-selected', String(x.dataset.value === value)));
    }
    function open() {
      if (render) render();
      if (mqPhone.matches) {
        btn.setAttribute('aria-expanded', 'true');
        openSheet(el.dataset.title || '', content, () => btn.setAttribute('aria-expanded', 'false'));
      } else {
        openDDs.forEach((d) => d !== api && d.close());
        el.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); openDDs.add(api);
        setTimeout(() => {
          if (list) { const o = opts(); const s = o.findIndex((x) => x.getAttribute('aria-selected') === 'true'); setActive(s >= 0 ? s : o.findIndex((x) => x.getAttribute('aria-disabled') !== 'true')); o[active] && o[active].focus({ preventScroll: true }); }
          else { const f = $('[aria-pressed="true"],.cal-d:not(:disabled)', content); f && f.focus({ preventScroll: true }); }
        }, 30);
      }
    }
    function close(refocus) {
      if (sheetState && sheetState.node === content) { closeSheet(); return; }
      el.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); openDDs.delete(api);
      if (refocus) btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', () => (el.classList.contains('open') ? close() : open()));
    if (list) {
      opts().forEach((o, i) => { o.id = o.id || `${el.id}-o${i}`; o.tabIndex = -1; });
      list.addEventListener('click', (e) => {
        const o = e.target.closest('li[role="option"]');
        if (!o || o.getAttribute('aria-disabled') === 'true') return;
        set(o.dataset.value, o.textContent.trim()); onPick && onPick(o.dataset.value); close(true);
      });
      list.addEventListener('keydown', (e) => {
        const o = opts();
        const move = (d) => { let i = active; for (let k = 0; k < o.length; k++) { i = (i + d + o.length) % o.length; if (o[i].getAttribute('aria-disabled') !== 'true') break; } setActive(i); o[active].focus({ preventScroll: true }); };
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(-1); move(1); }
        else if (e.key === 'End') { e.preventDefault(); setActive(0); move(-1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const t = o[active]; if (t && t.getAttribute('aria-disabled') !== 'true') { set(t.dataset.value, t.textContent.trim()); onPick && onPick(t.dataset.value); close(true); } }
        else if (e.key === 'Escape') { e.preventDefault(); close(true); }
        else if (e.key === 'Tab') close();
      });
    }
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.classList.contains('open')) { e.preventDefault(); close(true); } });
    api.refreshIds = () => opts().forEach((o, i) => { o.id = `${el.id}-o${i}`; o.tabIndex = -1; });
    return api;
  }
  document.addEventListener('pointerdown', (e) => { openDDs.forEach((d) => { if (!d.el.contains(e.target)) d.close(); }); });

  /* ---------- builder: live thobe ---------- */
  const bld = $('#bld');
  const thobe = $('#thobeSvg');
  const bldCap = $('#bldCap');
  const designTxt = $('#fDesignTxt');
  const incDesign = $('#fIncDesign');
  const designText = () => $$('input:checked', bld).map((i) => i.dataset.t).join(L.sep);
  const syncSeg = (seg) => seg.style.setProperty('--idx', String($$('input', seg).findIndex((i) => i.checked)));
  $$('.seg', bld).forEach(syncSeg);
  bld.addEventListener('change', (e) => {
    const i = e.target;
    if (i.name === 'color') {
      thobe.style.setProperty('--fab', i.value);
      thobe.style.setProperty('--seam', i.dataset.seam);
      thobe.toggleAttribute('data-dark', i.dataset.seam !== '#1F3A5F');
    } else thobe.setAttribute(`data-${i.name}`, i.value);
    const seg = i.closest('.seg'); if (seg) syncSeg(seg);
    const t = designText(); bldCap.textContent = t; designTxt.textContent = t;
  });
  $('#bldToBook').addEventListener('click', () => { incDesign.checked = true; goStep(1, false); });

  /* ---------- booking wizard ---------- */
  const wz = $('#wz');
  const steps = $$('.wz-step', wz);
  const bar = $('#wzBar'), wzCount = $('#wzCount'), back = $('#wzBack'), nextBtn = $('#wzNext'), sendBtn = $('#wzSend');
  const fCount = $('#fCount'), fName = $('#fName'), fNotes = $('#fNotes');
  const data = { count: 1, occasion: '', date: null, time: '' };
  let step = 1;

  function setErr(key, msg) {
    const p = $(`.err[data-for="${key}"]`, wz); if (p) p.textContent = msg || '';
    const map = { date: '#ddDate .dd-btn', time: '#ddTime .dd-btn', name: '#fName' };
    const f = $(map[key], wz); if (f) f.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function goStep(n, focus = true) {
    step = Math.max(1, Math.min(3, n));
    const phone = mqPhone.matches;
    steps.forEach((s) => {
      const k = +s.dataset.step;
      s.classList.toggle('is-on', k === step);
      s.classList.toggle('is-past', k < step);
      if (phone && k !== step) s.setAttribute('inert', ''); else s.removeAttribute('inert');
    });
    bar.style.setProperty('--prog', String(step / 3));
    wzCount.innerHTML = L.step(step);
    back.setAttribute('aria-disabled', String(step === 1));
    back.tabIndex = step === 1 ? -1 : 0;
    nextBtn.classList.toggle('is-off', step === 3);
    sendBtn.classList.toggle('is-off', step !== 3);
    nextBtn.tabIndex = step === 3 ? -1 : 0;
    sendBtn.tabIndex = phone && step !== 3 ? -1 : 0;
    if (step === 3) renderSummary();
    if (focus && phone) {
      const f = $('.wz-step.is-on .wz-lg', wz);
      if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); }
    }
  }
  mqPhone.addEventListener('change', () => goStep(step, false));
  function validate(which) {
    let first = 0;
    if (which === 2 || which === 'all') {
      setErr('date', data.date ? '' : L.errDate);
      setErr('time', data.time ? '' : L.errTime);
      if (!data.date || !data.time) first = first || 2;
    }
    if (which === 3 || which === 'all') {
      const ok = fName.value.trim().length > 0;
      setErr('name', ok ? '' : L.errName);
      if (!ok) first = first || 3;
    }
    return first;
  }
  nextBtn.addEventListener('click', () => { if (validate(step)) return; goStep(step + 1); });
  back.addEventListener('click', () => goStep(step - 1));
  wz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"])')) {
      e.preventDefault();
      if (e.target === fName) { fNotes.focus(); return; }
      if (mqPhone.matches && step < 3) nextBtn.click();
    }
  });
  fName.addEventListener('input', () => { if (fName.value.trim()) setErr('name', ''); });

  // count: chips + stepper + numeric input
  function setCount(n) {
    n = Math.max(1, Math.min(50, Math.round(+n || 1)));
    data.count = n; fCount.value = String(n);
    $$('[data-count]', wz).forEach((c) => { const on = +c.dataset.count === n; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
  }
  $$('[data-count]', wz).forEach((c) => c.addEventListener('click', () => setCount(c.dataset.count)));
  $$('[data-step-count]', wz).forEach((b) => b.addEventListener('click', () => setCount(data.count + +b.dataset.stepCount)));
  fCount.addEventListener('input', () => { fCount.value = fCount.value.replace(/\D/g, '').slice(0, 2); if (fCount.value) setCount(fCount.value); });
  fCount.addEventListener('blur', () => setCount(fCount.value));

  // occasion
  const ddOcc = makeDropdown($('#ddOcc'), { onPick: (v) => { data.occasion = v; } });

  // dates
  const today = () => { const n = riyadhNow(); return { y: n.y, m: n.m, d: n.d }; };
  const keyOf = (o) => `${o.y}-${String(o.m + 1).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`;
  const wdOf = (o) => new Date(Date.UTC(o.y, o.m, o.d, 12)).getUTCDay();
  const addDays = (o, k) => { const t = new Date(Date.UTC(o.y, o.m, o.d + k, 12)); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
  const dateLabel = (o) => `${DAY_AR[wdOf(o)]} ${o.d} ${MON_AR[o.m]}`;
  const closedDay = (o) => hasHours && rangesFor(wdOf(o)).length === 0;
  function quickDate(q) {
    const t = today();
    if (q === 'today') return t;
    if (q === 'tomorrow') return addDays(t, 1);
    const target = q === 'thu' ? 4 : 5; const diff = (target - wdOf(t) + 7) % 7; return addDays(t, diff);
  }
  const ddDateEl = $('#ddDate');
  const calEl = $('#cal');
  let view = (() => { const t = today(); return { y: t.y, m: t.m }; })();
  function renderCal() {
    const t = today();
    const first = new Date(Date.UTC(view.y, view.m, 1, 12)).getUTCDay();
    const dim = new Date(Date.UTC(view.y, view.m + 1, 0, 12)).getUTCDate();
    const atStart = view.y === t.y && view.m === t.m;
    const tk = keyOf(t), sel = data.date ? keyOf(data.date) : '';
    const [chPrev, chNext] = RTL ? ['chevron-right', 'chevron-left'] : ['chevron-left', 'chevron-right'];
    let h = `<div class="cal-head"><button type="button" class="icon-btn" data-cal="-1" aria-label="${L.prevMonth}" ${atStart ? 'disabled' : ''}><svg class="ic" aria-hidden="true"><use href="#i-${chPrev}"></use></svg></button><span class="cal-title" aria-live="polite">${MON_AR[view.m]} <span dir="ltr">${view.y}</span></span><button type="button" class="icon-btn" data-cal="1" aria-label="${L.nextMonth}"><svg class="ic" aria-hidden="true"><use href="#i-${chNext}"></use></svg></button></div><div class="cal-grid" role="grid">`;
    L.wd.forEach((w) => { h += `<span class="cal-wd" aria-hidden="true">${w}</span>`; });
    for (let i = 0; i < 42; i++) {
      const d = i - first + 1;
      if (d < 1 || d > dim) { h += '<button type="button" class="cal-d is-out" tabindex="-1" disabled aria-hidden="true"></button>'; continue; }
      const o = { y: view.y, m: view.m, d }, k = keyOf(o);
      const past = k < tk, closed = closedDay(o);
      h += `<button type="button" class="cal-d${k === tk ? ' is-today' : ''}" data-key="${k}" aria-pressed="${k === sel}" aria-label="${dateLabel(o)}${closed ? L.closedDay : ''}" ${past || closed ? 'disabled' : ''} tabindex="${k === (sel || tk) ? 0 : -1}"><span dir="ltr">${d}</span></button>`;
    }
    calEl.innerHTML = h + '</div>';
  }
  calEl.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-cal]');
    if (nav) { const nm = view.m + +nav.dataset.cal; view = { y: view.y + Math.floor(nm / 12), m: (nm + 12) % 12 }; renderCal(); const f = $('[data-cal="' + nav.dataset.cal + '"]', calEl); f && !f.disabled && f.focus({ preventScroll: true }); return; }
    const b = e.target.closest('.cal-d[data-key]');
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.key.split('-').map(Number);
    pickDate({ y, m: m - 1, d });
    ddDate.close(true);
  });
  calEl.addEventListener('keydown', (e) => {
    const b = e.target.closest('.cal-d[data-key]'); if (!b) return;
    const delta = { ArrowLeft: RTL ? 1 : -1, ArrowRight: RTL ? -1 : 1, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const [y, m, d] = b.dataset.key.split('-').map(Number);
    const o = addDays({ y, m: m - 1, d }, delta);
    if (o.m !== view.m || o.y !== view.y) { view = { y: o.y, m: o.m }; renderCal(); }
    const t = $(`.cal-d[data-key="${keyOf(o)}"]`, calEl); if (t && !t.disabled) { $$('.cal-d', calEl).forEach((x) => (x.tabIndex = -1)); t.tabIndex = 0; t.focus({ preventScroll: true }); }
  });
  const ddDate = makeDropdown(ddDateEl, { render: () => { if (data.date) view = { y: data.date.y, m: data.date.m }; renderCal(); } });
  function pickDate(o) {
    data.date = o;
    ddDate.set(keyOf(o), dateLabel(o));
    $$('[data-quick]', wz).forEach((c) => { const q = quickDate(c.dataset.quick); c.classList.toggle('on', keyOf(q) === keyOf(o)); c.setAttribute('aria-pressed', String(keyOf(q) === keyOf(o))); });
    setErr('date', '');
    buildTimes();
  }
  $$('[data-quick]', wz).forEach((c) => {
    const q = quickDate(c.dataset.quick);
    c.setAttribute('aria-pressed', 'false');
    c.setAttribute('aria-label', `${c.textContent.trim()}${L.sep}${dateLabel(q)}`);
    if (closedDay(q)) { c.disabled = true; c.setAttribute('aria-label', `${c.textContent.trim()}${L.closedDay}`); }
    c.addEventListener('click', () => pickDate(quickDate(c.dataset.quick)));
  });

  // times in dialect, filtered by hours and by "now" when today
  const ddTimeEl = $('#ddTime');
  const timeList = $('.dd-list', ddTimeEl);
  const ddTime = makeDropdown(ddTimeEl, { onPick: (v) => { data.time = v; setErr('time', ''); } });
  function buildTimes() {
    let slots = [];
    if (data.date && hasHours) {
      rangesFor(wdOf(data.date)).forEach(([s, e]) => { for (let t = Math.ceil(s / 30) * 30; t <= e - 30; t += 30) slots.push(t); });
    } else for (let t = 10 * 60; t <= 23 * 60; t += 60) slots.push(t);
    const isToday = data.date && keyOf(data.date) === keyOf(today());
    const nowMin = riyadhNow().min;
    timeList.innerHTML = slots.map((t) => {
      const v = `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const dis = isToday && t <= nowMin + 30;
      return `<li role="option" aria-selected="${v === data.time}" data-value="${v}"${dis ? ' aria-disabled="true"' : ''}><span>${fmtTime(t)}</span><svg class="ic ok" aria-hidden="true"><use href="#i-check"></use></svg></li>`;
    }).join('');
    ddTime.refreshIds();
    const still = $(`li[data-value="${data.time}"]:not([aria-disabled])`, timeList);
    if (data.time && !still) { data.time = ''; ddTime.set('', ''); }
    else if (still) ddTime.set(data.time, still.textContent.trim());
  }
  buildTimes();

  // summary (phones, step 3)
  const wzSum = $('#wzSum');
  function renderSummary() {
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const rows = [
      [L.sum.count, String(data.count), 1],
      [L.sum.occ, data.occasion || '—', 1],
      [L.sum.when, data.date ? `${dateLabel(data.date)}${L.sep}${data.time ? fmtTime(toMin(data.time)) : ''}` : '—', 2],
    ];
    if (incDesign.checked) rows.push([L.sum.model, designText(), 1]);
    else rows.push([L.sum.model, L.sum.none, 1]);
    wzSum.innerHTML = rows.map(([k, v, s]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd><button type="button" data-goto="${s}" aria-label="${L.sum.edit} ${k}">${L.sum.edit}</button></div>`).join('');
  }
  wzSum.addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) goStep(+b.dataset.goto); });

  // compose WhatsApp
  function message() {
    const M = L.msg;
    const lines = [M.hi(C.name || 'خياط برستيج VIP'), ''];
    lines.push(`${M.name}: ${fName.value.trim()}`);
    lines.push(`${M.count}: ${data.count}`);
    if (data.occasion) lines.push(`${M.occ}: ${data.occasion}`);
    lines.push(`${M.when}: ${dateLabel(data.date)}${L.sep}${fmtTime(toMin(data.time))}`);
    if (incDesign.checked) lines.push(`${M.model}: ${designText()}`);
    const n = fNotes.value.trim(); if (n) lines.push(`${M.notes}: ${n}`);
    lines.push('', M.from);
    return lines.join('\n');
  }
  wz.addEventListener('submit', (e) => {
    e.preventDefault();
    if (mqPhone.matches && step < 3) { nextBtn.click(); return; }
    const bad = validate('all');
    if (bad) {
      if (mqPhone.matches) goStep(bad);
      const f = bad === 2 ? $(data.date ? '#ddTime .dd-btn' : '#ddDate .dd-btn', wz) : fName;
      setTimeout(() => f.focus({ preventScroll: !mqPhone.matches ? false : true }), mqPhone.matches ? 380 : 0);
      return;
    }
    const url = `https://wa.me/${C.wa || ''}?text=${encodeURIComponent(message())}`;
    window.__lastWa = url;
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  });
  goStep(1, false);

  /* ---------- dock: active section, hide while typing / in the form ---------- */
  const dock = $('#dock');
  const dockReasons = new Set();
  function dockHide(reason, on) { on ? dockReasons.add(reason) : dockReasons.delete(reason); dock && dock.classList.toggle('is-hidden', dockReasons.size > 0); }
  const isTyping = (t) => t.matches && t.matches('input[type="text"],textarea');
  document.addEventListener('focusin', (e) => { if (isTyping(e.target)) dockHide('typing', true); });
  document.addEventListener('focusout', (e) => { if (isTyping(e.target)) dockHide('typing', false); });
  const groups = { home: 'home', why: 'home', thobe: 'thobe', reviews: 'reviews', photos: 'photos', book: 'book', faq: 'visit', visit: 'visit' };
  const sio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const g = groups[e.target.id];
    $$('#dock a[data-sec]').forEach((a) => a.classList.toggle('on', a.dataset.sec === g));
    $$('.hdr-nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => sio.observe(s));
  const fio = new IntersectionObserver((es) => es.forEach((e) => dockHide('form', e.isIntersecting)), { threshold: 0.35 });
  fio.observe(wz);

  /* ---------- desktop floating CTA: after hero CTA leaves, hidden over form/footer ---------- */
  const fab = $('#fab');
  const fabState = { hero: true, book: false, ftr: false, bld: false };
  const paintFab = () => { const show = !mqPhone.matches && !fabState.hero && !fabState.book && !fabState.ftr && !fabState.bld; fab.classList.toggle('show', show); root.classList.toggle('fab-on', show); fab.tabIndex = show ? 0 : -1; fab.setAttribute('aria-hidden', String(!show)); };
  const xio = new IntersectionObserver((es) => es.forEach((e) => { fabState[e.target.dataset.fab] = e.isIntersecting; paintFab(); }));
  [['#heroCta', 'hero'], ['#book', 'book'], ['#ftr', 'ftr'], ['#bldToBook', 'bld']].forEach(([s, k]) => { const el = $(s); if (el) { el.dataset.fab = k; xio.observe(el); } });

  /* ---------- swipe rows: dots, centred card (touch only), auto-rotate ---------- */
  $$('[data-swipe]').forEach((row) => {
    const items = Array.from(row.children);
    const dots = row.nextElementSibling && row.nextElementSibling.classList.contains('dots') ? row.nextElementSibling : null;
    if (dots) dots.innerHTML = items.map(() => '<i></i>').join('');
    let center = 0, idleAt = 0, visible = false;
    const update = () => {
      const rr = row.getBoundingClientRect(), mid = rr.left + rr.width / 2;
      let best = 0, bd = Infinity;
      items.forEach((it, i) => { const r = it.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      center = best;
      const scroller = row.scrollWidth > row.clientWidth + 2;
      if (scroller) row.tabIndex = 0; else row.removeAttribute('tabindex');
      items.forEach((it, i) => {
        it.classList.toggle('is-mid', scroller && i === best);
        it.classList.toggle('is-center', scroller && mqTouch.matches && i === best);
        if (scroller && !mqReduce.matches) {
          const r = it.getBoundingClientRect();
          const d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / (r.width + 14)));
          const a = Math.abs(d);
          it.style.transform = `perspective(1000px) rotateY(${(-d * 18).toFixed(2)}deg) scale(${(1 - 0.12 * a).toFixed(3)})`;
          it.style.opacity = (1 - 0.2 * a).toFixed(3);
          it.style.filter = a > 0.02 ? `saturate(${(1 - 0.35 * a).toFixed(2)}) brightness(${(1 - 0.04 * a).toFixed(3)})` : '';
        } else { it.style.transform = ''; it.style.opacity = ''; it.style.filter = ''; }
      });
      if (dots) Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === best));
    };
    const onRow = raf(update);
    row.addEventListener('scroll', onRow, { passive: true });
    addEventListener('resize', onRow);
    update();
    const stop = () => { idleAt = performance.now(); };
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach((ev) => row.addEventListener(ev, stop, { passive: true }));
    new IntersectionObserver((es) => { visible = es[0].isIntersecting && es[0].intersectionRatio > 0.6; }, { threshold: [0, 0.6, 1] }).observe(row);
    const every = +(row.dataset.auto || 5200);
    setInterval(() => {
      if (!visible || mqReduce.matches || document.hidden || row.scrollWidth <= row.clientWidth + 2) return;
      if (performance.now() - idleAt < 6000) return;
      const next = items[(center + 1) % items.length];
      const rr = row.getBoundingClientRect(), r = next.getBoundingClientRect();
      row.scrollBy({ left: r.left + r.width / 2 - (rr.left + rr.width / 2), behavior: 'smooth' });
    }, every);
  });

  /* ---------- gallery lightbox ---------- */
  const lb = $('#lb');
  if (lb) {
    const stage = $('#lbStage'), figs = $$('.lb-fig', lb), cnt = $('#lbCount');
    let idx = 0, backTo = null;
    const load = (i) => { const img = $('img', figs[i]); if (img && img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    const go = (i, smooth = true) => {
      idx = (i + figs.length) % figs.length; [idx - 1, idx, idx + 1].forEach((k) => figs[(k + figs.length) % figs.length] && load((k + figs.length) % figs.length));
      const r = figs[idx].getBoundingClientRect(), sr = stage.getBoundingClientRect();
      stage.scrollBy({ left: r.left - sr.left, behavior: smooth ? 'smooth' : 'instant' });
      cnt.textContent = `${idx + 1} / ${figs.length}`;
    };
    const open = (i) => {
      backTo = document.activeElement; lb.hidden = false; lock(); overlayOpen = true; dockHide('lb', true);
      requestAnimationFrame(() => { lb.classList.add('open'); go(i, false); $('#lbClose').focus({ preventScroll: true }); });
    };
    const close = () => { lb.classList.remove('open'); setTimeout(() => { lb.hidden = true; unlock(); overlayOpen = false; dockHide('lb', false); backTo && backTo.focus({ preventScroll: true }); }, 320); };
    $$('.g-item').forEach((b) => b.addEventListener('click', () => open(+b.dataset.idx)));
    const all = $('#galAll'); if (all) all.addEventListener('click', () => open(0));
    $('#lbPrev').addEventListener('click', () => go(idx - 1));
    $('#lbNext').addEventListener('click', () => go(idx + 1));
    $('#lbClose').addEventListener('click', close);
    stage.addEventListener('scroll', raf(() => {
      const sr = stage.getBoundingClientRect();
      let best = 0, bd = Infinity; figs.forEach((f, i) => { const d = Math.abs(f.getBoundingClientRect().left - sr.left); if (d < bd) { bd = d; best = i; } });
      if (best !== idx) { idx = best; load(idx); load((idx + 1) % figs.length); cnt.textContent = `${idx + 1} / ${figs.length}`; }
    }), { passive: true });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(RTL ? idx + 1 : idx - 1);
      if (e.key === 'ArrowRight') go(RTL ? idx - 1 : idx + 1);
      if (e.key === 'Tab') { const f = $$('button', lb); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
  }

  /* ---------- reviews: «اقرأ المزيد» only where the text is clamped; full text in a sheet ---------- */
  const markClamped = () => $$('.rev').forEach((r) => { const p = $('.clamp', r), m = $('[data-more]', r); if (p && m) m.hidden = p.scrollHeight <= p.clientHeight + 1; });
  markClamped(); addEventListener('resize', raf(markClamped));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markClamped);
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-more]'); if (!m) return;
    const r = m.closest('.rev'); const box = document.createElement('div');
    box.innerHTML = `<p class="rev-full"></p>`; $('.rev-full', box).textContent = $('.clamp', r).textContent;
    const holder = document.createElement('div'); holder.hidden = true; document.body.appendChild(holder); holder.appendChild(box);
    openSheet($('.rev-top b', r).textContent, box, () => holder.remove());
  });

  /* expose for tests */
  window.__pv = { goStep, message: () => message(), data, pickDate, quickDate };
})();
