/* توحيد ملقط · Tawheed Malkat — site.js (vanilla, no frameworks) */
(() => {
  'use strict';
  const C = window.CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mqTouch = matchMedia('(hover: none)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqPhone = matchMedia('(max-width: 639px)');
  const SDA = window.CSS && CSS.supports('animation-timeline: view()');
  if (!SDA) root.classList.add('no-sda');
  const raf = (fn) => { let t = 0; return () => { if (!t) t = requestAnimationFrame(() => { t = 0; fn(); }); }; };
  const AR = () => root.lang === 'ar';
  const T = (ar, en) => (AR() ? ar : en);
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let toastT = 0;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1800); }

  /* ---------- language (both ship in the HTML; remembered) ---------- */
  const hooks = [];
  function applyLang(l) {
    root.lang = l; root.dir = l === 'ar' ? 'rtl' : 'ltr';
    $$('[data-ar-label]').forEach((el) => el.setAttribute('aria-label', el.dataset[l + 'Label'] || el.dataset.arLabel));
    $$('[data-ar-alt]').forEach((el) => el.setAttribute('alt', el.dataset[l + 'Alt'] || el.dataset.arAlt));
    $$('[data-ar-href]').forEach((el) => el.setAttribute('href', el.dataset[l + 'Href'] || el.dataset.arHref));
    $$('[data-ar-title]').forEach((el) => el.setAttribute('title', el.dataset[l + 'Title'] || el.dataset.arTitle));
    const t = root.dataset[l === 'ar' ? 'titleAr' : 'titleEn']; if (t) document.title = t;
    const lb = $('#langBtn'); if (lb) { lb.textContent = l === 'ar' ? 'EN' : 'ع'; lb.setAttribute('lang', l === 'ar' ? 'en' : 'ar'); }
    hooks.forEach((f) => f());
  }
  const langBtn = $('#langBtn');
  if (langBtn) langBtn.addEventListener('click', () => {
    // keep whatever is at the top of the screen where it is
    const probe = $$('main section, main .page-head, footer').find((s) => s.getBoundingClientRect().bottom > 90) || null;
    const before = probe ? probe.getBoundingClientRect().top : 0;
    applyLang(AR() ? 'en' : 'ar'); store('tm-lang', root.lang);
    if (probe) { const d = probe.getBoundingClientRect().top - before; if (Math.abs(d) > 1) { const sb = root.style.scrollBehavior; root.style.scrollBehavior = 'auto'; scrollBy(0, d); root.style.scrollBehavior = sb; } }
  });

  /* ---------- theme (light default, remembered) ---------- */
  const themeBtn = $('#themeBtn');
  const metaTheme = $('#metaTheme');
  function paintThemeBtn() {
    const dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? T('الوضع النهاري', 'Light mode') : T('الوضع الليلي', 'Dark mode'));
    if (metaTheme) metaTheme.content = dark ? '#101216' : '#ECEEF1';
  }
  function applyTheme(t) { root.dataset.theme = t; paintThemeBtn(); }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  hooks.push(paintThemeBtn);
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const go = () => { applyTheme(next); store('tm-theme', next); };
    if (document.startViewTransition && !mqReduce.matches) {
      const r = themeBtn.getBoundingClientRect();
      root.style.setProperty('--vx', `${r.left + r.width / 2}px`);
      root.style.setProperty('--vy', `${r.top + r.height / 2}px`);
      root.classList.add('theming');
      const vt = document.startViewTransition(go);
      vt.finished.finally(() => root.classList.remove('theming'));
    } else go();
  });
  applyLang(root.lang === 'en' ? 'en' : 'ar');

  /* ---------- header: glass after first scroll, hide on down, show on up ---------- */
  const hdr = $('#hdr');
  const progI = $('.progress i');
  const xsWrap = $('.hero-stage .xs-wrap');
  const heroCopy = $('.hero-copy');
  let lastY = scrollY, overlayOpen = false;
  const onScroll = raf(() => {
    const y = scrollY;
    hdr.classList.toggle('is-scrolled', y > 8);
    if (!overlayOpen) {
      if (y > 160 && y > lastY + 4) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 160) hdr.classList.remove('is-hidden');
    }
    if (!SDA && !mqReduce.matches) {
      const max = Math.max(1, root.scrollHeight - innerHeight);
      if (progI) progI.style.setProperty('--p', (y / max).toFixed(4));
      const k = Math.min(1, y / (innerHeight * 0.85));
      if (xsWrap) { xsWrap.style.transform = `translateY(${k * 12}%) scale(${1 - k * 0.14})`; xsWrap.style.opacity = String(1 - k * 0.85); }
      if (heroCopy) { heroCopy.style.transform = `translateY(${-k * 8}%)`; heroCopy.style.opacity = String(1 - k * 0.65); }
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

  /* ---------- reveals ---------- */
  if (!SDA || mqReduce.matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.rv,.slide,.wk-plane').forEach((el) => io.observe(el));
  }
  const gio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); gio.unobserve(e.target); } }), { threshold: 0.25 });
  $$('.gt').forEach((el) => gio.observe(el));

  /* ---------- count up from zero when visible ---------- */
  const counters = $$('.count');
  if (!mqReduce.matches) {
    counters.forEach((el) => { el.textContent = '0'; });
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, to = parseFloat(el.dataset.to), t0 = performance.now(), dur = 1500;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- pause animated areas that are off screen ---------- */
  const pio = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting)), { rootMargin: '80px' });
  $$('.hero-stage,.fs-stage,.gt,.ftr').forEach((el) => pio.observe(el));
  const cv = $('.cv');
  document.addEventListener('visibilitychange', () => cv && cv.classList.toggle('is-paused', document.hidden));

  /* ---------- project images: hotlinked from Behance; the wireframe stays if they can't load ---------- */
  $$('.fr img').forEach((img) => {
    const fr = img.closest('.fr');
    const ok = () => fr.classList.add('is-loaded');
    const bad = () => {
      if (img.dataset.fb && img.getAttribute('src') !== img.dataset.fb) { img.removeAttribute('srcset'); img.src = img.dataset.fb; img.removeAttribute('data-fb'); return; }
      fr.classList.add('is-noimg');
    };
    img.addEventListener('load', ok); img.addEventListener('error', bad);
    if (img.complete) { if (img.naturalWidth) ok(); else if (img.getAttribute('src')) bad(); }
  });
  const ph = $('.ph img');
  if (ph) { const p = ph.closest('.ph'); ph.addEventListener('load', () => p.classList.add('is-loaded')); ph.addEventListener('error', () => ph.remove()); if (ph.complete && ph.naturalWidth) p.classList.add('is-loaded'); }

  /* ---------- scroll lock ---------- */
  let locks = 0;
  const lock = () => { if (locks++ === 0) root.classList.add('lock'); };
  const unlock = () => { if (--locks <= 0) { locks = 0; root.classList.remove('lock'); } };

  /* ---------- dock ---------- */
  const dock = $('#dock');
  const dockReasons = new Set();
  function dockHide(reason, on) { on ? dockReasons.add(reason) : dockReasons.delete(reason); if (dock) dock.classList.toggle('is-hidden', dockReasons.size > 0); }

  /* ---------- contact sheet ---------- */
  const sheet = $('#sheet'), scrim = $('#scrim');
  let sheetBack = null;
  function openSheet() {
    sheetBack = document.activeElement;
    scrim.hidden = false; sheet.hidden = false; lock(); overlayOpen = true; dockHide('sheet', true);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('open'); sheet.classList.add('open'); }));
    setTimeout(() => $('#sheetClose').focus({ preventScroll: true }), 60);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { sheet.hidden = true; scrim.hidden = true; unlock(); overlayOpen = false; dockHide('sheet', false); if (sheetBack) sheetBack.focus({ preventScroll: true }); }, 380);
  }
  $$('[data-contact]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openSheet(); }));
  $('#sheetClose').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = $$('a[href],button:not(:disabled)', sheet).filter((x) => x.offsetParent !== null);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  // swipe the sheet down to close (phones)
  let sy0 = null;
  sheet.addEventListener('touchstart', (e) => { if (!$('.sheet-body', sheet).scrollTop) sy0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => { if (sy0 != null && e.touches[0].clientY - sy0 > 70) { sy0 = null; closeSheet(); } }, { passive: true });
  sheet.addEventListener('touchend', () => { sy0 = null; }, { passive: true });

  /* ---------- copy e-mail ---------- */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const text = b.dataset.copy;
    const done = () => toast(T('تم نسخ البريد', 'E-mail copied'));
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }));

  /* ---------- selected work: stacked deck ---------- */
  const deck = $$('.dk-card');
  if (deck.length && !(SDA && !mqReduce.matches)) {
    const paintDeck = () => {
      if (mqReduce.matches) return;
      for (let i = 0; i < deck.length - 1; i++) {
        const a = deck[i].getBoundingClientRect(), b = deck[i + 1].getBoundingClientRect();
        const p = Math.max(0, Math.min(1, 1 - (b.top - a.top) / Math.max(1, a.height)));
        const v = p.toFixed(3);
        if (deck[i].style.getPropertyValue('--p') !== v) deck[i].style.setProperty('--p', v);
      }
    };
    addEventListener('scroll', raf(paintDeck), { passive: true });
    addEventListener('resize', raf(paintDeck));
    paintDeck();
  }

  /* ---------- from a question to a screen ---------- */
  const fs = $('.fs');
  if (fs) {
    const states = $$('.fs-st', fs), caps = $$('.fs-cap', fs), btns = $$('.fs-steps button', fs), range = $('.fs-range', fs), pill = $('.fs-pill', fs), tag = $('.fs-tag', fs);
    let cur = 0, auto = true, visible = false;
    const set = (i, user) => {
      cur = (i + states.length) % states.length;
      states.forEach((s, k) => s.classList.toggle('on', k === cur));
      caps.forEach((c, k) => { c.classList.toggle('on', k === cur); c.setAttribute('aria-hidden', String(k !== cur)); });
      btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === cur)));
      if (pill) pill.style.setProperty('--s', cur);
      const lbl = ($('[data-l="' + root.lang + '"]', btns[cur]) || btns[cur]).textContent.trim();
      if (range) { range.value = String(cur); range.setAttribute('aria-valuetext', lbl); }
      if (tag) tag.textContent = lbl;
      if (user) auto = false;
    };
    btns.forEach((b, k) => b.addEventListener('click', () => set(k, true)));
    if (range) range.addEventListener('input', () => set(+range.value, true));
    hooks.push(() => set(cur));
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.45 }).observe(fs);
    setInterval(() => { if (auto && visible && !document.hidden && !mqReduce.matches) set(cur + 1); }, 3400);
    set(0);
    window.__tm_fs = set;
  }

  /* ---------- swipe rows (phones): centred frame flat, neighbours turned away; auto-rotate ---------- */
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
        const card = it.firstElementChild;
        card.classList.toggle('is-mid', scroller && i === best);
        if (scroller && !mqReduce.matches) {
          const r = it.getBoundingClientRect();
          const d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / r.width));
          const a = Math.abs(d);
          card.style.transform = `perspective(1000px) rotateY(${(-d * 22).toFixed(2)}deg) scale(${(1 - 0.12 * a).toFixed(3)})`;
          card.style.opacity = (1 - 0.18 * a).toFixed(3);
          card.style.filter = a > 0.02 ? `saturate(${(1 - 0.35 * a).toFixed(2)})` : '';
        } else { card.style.transform = ''; card.style.opacity = ''; card.style.filter = ''; }
      });
      if (dots) Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === best));
    };
    const onRow = raf(update);
    row.addEventListener('scroll', onRow, { passive: true });
    addEventListener('resize', onRow);
    hooks.push(() => requestAnimationFrame(update));
    update();
    const stop = () => { idleAt = performance.now(); };
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach((ev) => row.addEventListener(ev, stop, { passive: true }));
    new IntersectionObserver((es) => { visible = es[0].isIntersecting && es[0].intersectionRatio > 0.6; }, { threshold: [0, 0.6, 1] }).observe(row);
    setInterval(() => {
      if (!visible || mqReduce.matches || document.hidden || overlayOpen || row.scrollWidth <= row.clientWidth + 2) return;
      if (performance.now() - idleAt < 6000) return;
      const next = items[(center + 1) % items.length];
      const rr = row.getBoundingClientRect(), r = next.getBoundingClientRect();
      row.scrollBy({ left: r.left + r.width / 2 - (rr.left + rr.width / 2), behavior: 'smooth' });
    }, +(row.dataset.auto || 4600));
  });

  /* ---------- project viewer ---------- */
  const vw = $('#vw');
  if (vw) {
    const stage = $('#vwStage'), figs = $$('.vw-fig', vw), cnt = $('#vwCount'), ttl = $('#vwTitle');
    let idx = 0, back = null, navTo = -1;
    const load = (i) => { $$('img[data-src]', figs[i]).forEach((img) => { if (img.dataset.srcset) img.srcset = img.dataset.srcset; img.src = img.dataset.src; img.removeAttribute('data-src'); img.removeAttribute('data-srcset'); }); };
    const paint = () => { figs.forEach((f, i) => f.classList.toggle('is-cur', i === idx)); cnt.textContent = `${idx + 1} / ${figs.length}`; const h = $('h2 [data-l="' + root.lang + '"]', figs[idx]) || $('h2', figs[idx]); ttl.textContent = h ? h.textContent : ''; };
    const go = (i, smooth = true) => {
      idx = (i + figs.length) % figs.length;
      [idx - 1, idx, idx + 1].forEach((k) => load((k + figs.length) % figs.length));
      const r = figs[idx].getBoundingClientRect(), sr = stage.getBoundingClientRect();
      navTo = smooth && !mqReduce.matches ? idx : -1; clearTimeout(go.t); if (navTo >= 0) go.t = setTimeout(() => { navTo = -1; }, 1400);
      stage.scrollBy({ left: r.left - sr.left, behavior: smooth && !mqReduce.matches ? 'smooth' : 'instant' });
      paint();
    };
    const open = (slug) => {
      const i = Math.max(0, figs.findIndex((f) => f.dataset.slug === slug));
      back = document.activeElement; vw.hidden = false; lock(); overlayOpen = true; dockHide('vw', true);
      requestAnimationFrame(() => { go(i, false); vw.classList.add('open'); $('#vwClose').focus({ preventScroll: true }); });
      history.replaceState(null, '', '#p-' + figs[i].dataset.slug);
    };
    const close = () => {
      vw.classList.remove('open');
      history.replaceState(null, '', location.pathname + location.search);
      setTimeout(() => { vw.hidden = true; unlock(); overlayOpen = false; dockHide('vw', false); if (back) back.focus({ preventScroll: true }); }, 320);
    };
    $$('[data-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(b.dataset.open); }));
    ['pointerdown', 'touchstart', 'wheel'].forEach((ev) => stage.addEventListener(ev, () => { navTo = -1; }, { passive: true }));
    $('#vwPrev').addEventListener('click', () => go(idx - 1));
    $('#vwNext').addEventListener('click', () => go(idx + 1));
    $('#vwClose').addEventListener('click', close);
    stage.addEventListener('scroll', raf(() => {
      const sr = stage.getBoundingClientRect();
      let best = 0, bd = Infinity; figs.forEach((f, i) => { const d = Math.abs(f.getBoundingClientRect().left - sr.left); if (d < bd) { bd = d; best = i; } });
      if (navTo >= 0) { if (best === navTo && bd < 2) navTo = -1; return; }
      if (best !== idx) { idx = best; load(idx); load((idx + 1) % figs.length); load((idx - 1 + figs.length) % figs.length); paint(); history.replaceState(null, '', '#p-' + figs[idx].dataset.slug); }
    }), { passive: true });
    vw.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(AR() ? idx + 1 : idx - 1);
      if (e.key === 'ArrowRight') go(AR() ? idx - 1 : idx + 1);
      if (e.key === 'Tab') { const f = $$('a[href],button', vw).filter((x) => x.offsetParent !== null); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    hooks.push(() => { if (!vw.hidden) { paint(); go(idx, false); } });
    $$('.vw-fig .fr img').forEach((img) => {
      const fr = img.closest('.fr');
      img.addEventListener('load', () => fr.classList.add('is-loaded'));
      img.addEventListener('error', () => { if (img.dataset.fb) { img.removeAttribute('srcset'); img.src = img.dataset.fb; img.removeAttribute('data-fb'); } else fr.classList.add('is-noimg'); });
    });
    const m = location.hash.match(/^#p-([\w-]+)/);
    if (m) open(m[1]);
    window.__tm_vw = { open, close, go, idx: () => idx };
  }



  /* ---------- the flight: scroll moves a camera through the design file ---------- */
  const fly = $('.fly');
  if (fly) {
    const view = $('.fly-view', fly), tiltEl = $('.fly-tilt', fly), world = $('.fly-world', fly);
    const WW = +world.dataset.w, WH = +world.dataset.h;
    const stops = $$('.fx[data-k]', fly).sort((a, b) => a.dataset.k - b.dataset.k);
    const panes = $$('.fly-p', fly), lays = $$('.fly-layers button', fly);
    const count = $('.fly-count', fly), bar = $('.fly-bar', fly);
    let vw = 1, vh = 1, cams = [], cur = -1, top0 = 0;
    const desk = () => vw >= 900;
    const docTop = (el) => { let y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };
    const camFor = (el) => {
      const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
      let z, fx, fy;
      if (desk()) {
        const startW = vw >= 1280 ? 296 : 32, endW = 436, free = vw - startW - endW;
        z = Math.min((free * 0.86) / w, (vh * 0.6) / h);
        fx = (AR() ? (endW + (vw - startW)) / 2 : (startW + (vw - endW)) / 2) / vw; fy = 0.54;
      } else {
        z = Math.min((vw * 0.8) / 680, (vh * 0.3) / 532); fx = 0.5; fy = 0.26;
      }
      return { z, cx: x + w / 2, cy: y + h / 2, fx, fy, tilt: 0 };
    };
    const cover = $('.fly-cover', fly);
    const overview = (end) => {
      if (stepped()) { const c = camFor(stops[0]), x = parseFloat(cover.style.left), y = parseFloat(cover.style.top);
        return { z: c.z, cx: x + cover.offsetWidth / 2, cy: y + cover.offsetHeight / 2, fx: 0.5, fy: end ? 0.3 : 0.32, tilt: 1 }; }
      const startW = vw >= 1280 ? 296 : 32, endW = 436, free = vw - startW - endW;
      return { z: Math.min(free / WW, vh / WH) * 0.98, cx: WW / 2, cy: WH / 2, fx: (AR() ? (endW + (vw - startW)) / 2 : (startW + (vw - endW)) / 2) / vw, fy: 0.52, tilt: 1 };
    };
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const setStop = (k) => {
      if (k === cur) return; cur = k;
      panes.forEach((p) => { const on = +p.dataset.k === k; p.classList.toggle('on', on); p.setAttribute('aria-hidden', String(!on)); });
      lays.forEach((b) => b.setAttribute('aria-current', String(+b.dataset.go === k)));
      if (count) count.textContent = `${Math.min(Math.max(k, 0), stops.length)} / ${stops.length}`;
    };
    // phones and touch screens: the scroll only picks the stop, and the camera flies there in one compositor animation
    const fineDesk = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
    const stepped = () => !fineDesk.matches;
    const T = (c) => `translate3d(${(vw * c.fx - c.cx * c.z).toFixed(1)}px,${(vh * c.fy - c.cy * c.z).toFixed(1)}px,0) scale(${c.z.toFixed(4)})`;
    const TT = (tl) => `rotateX(${(tl * 26).toFixed(2)}deg) translateY(${(tl * -2).toFixed(2)}%)`;
    let shown = -1, wAnim = null, tAnim = null, focusT = 0, cw = null, ct = null;
    const camSet = (wt, tt) => {
      if (!world.animate) { world.style.transform = wt; tiltEl.style.transform = tt; return; }
      if (!cw) { cw = world.animate([{ transform: wt }], { duration: 1, fill: 'forwards' }); cw.pause(); ct = tiltEl.animate([{ transform: tt }], { duration: 1, fill: 'forwards' }); ct.pause(); cw.currentTime = 1; ct.currentTime = 1; }
      else { cw.effect.setKeyframes([{ transform: wt }]); ct.effect.setKeyframes([{ transform: tt }]); }
    };
    const camClear = () => { if (cw) { cw.cancel(); ct.cancel(); cw = ct = null; } };
    const settle = (k) => { const c = cams[k]; world.style.setProperty('--iz', (1 / c.z).toFixed(4)); world.style.setProperty('--z', c.z.toFixed(4)); stops.forEach((fr) => fr.classList.toggle('is-focus', +fr.dataset.k === k)); };
    // phones: one frame at a time; the next one slides in from its real direction in the file while the canvas pans with it
    const slots = [cover, ...stops, cover];
    const dotsEl = $('.fly-dots', fly);
    const center = (el) => ({ x: parseFloat(el.dataset.x), y: parseFloat(el.dataset.y) });
    slots.forEach((el) => { if (!el.dataset.x) { el.dataset.x = parseFloat(el.style.left) + el.offsetWidth / 2; el.dataset.y = parseFloat(el.style.top) + el.offsetHeight / 2; } });
    const flyTo = (k, instant) => {
      const prevK = shown; shown = k;
      const inEl = slots[k], outEl = prevK >= 0 ? slots[prevK] : null;
      clearTimeout(focusT);
      $$('.is-cur,.is-out', fly).forEach((el) => el.classList.remove('is-cur', 'is-out'));
      stops.forEach((fr) => fr.classList.remove('is-focus'));
      inEl.classList.add('is-cur');
      tiltEl.style.transform = TT(mqReduce.matches ? 0 : (k === 0 || k === slots.length - 1 ? 0.55 : 0));
      const done = () => { if (inEl !== cover) inEl.classList.add('is-focus'); };
      if (instant || !outEl || outEl === inEl || mqReduce.matches || !inEl.animate) { done(); return; }
      outEl.classList.add('is-out');
      const a = center(outEl), b2 = center(inEl);
      let dx = b2.x - a.x, dy = b2.y - a.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const D = Math.max(vw, vh) * 0.85, opt = { duration: 950, easing: 'cubic-bezier(.65,0,.35,1)' };
      outEl.animate([{ transform: 'translate3d(0,0,0)', opacity: 1 }, { transform: `translate3d(${(-dx * D).toFixed(0)}px,${(-dy * D).toFixed(0)}px,0)`, opacity: 0.5 }], opt).onfinish = () => outEl.classList.remove('is-out');
      inEl.animate([{ transform: `translate3d(${(dx * D).toFixed(0)}px,${(dy * D).toFixed(0)}px,0)`, opacity: 0.5 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], opt);
      if (dotsEl) dotsEl.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${Math.round((-dx * D) / 24) * 24}px,${Math.round((-dy * D) / 24) * 24}px,0)` }], opt);
      focusT = setTimeout(done, 980);
    };
    const paint = () => {
      const total = Math.max(1, fly.offsetHeight - innerHeight);
      const p = Math.min(1, Math.max(0, (scrollY - top0) / total));
      const segs = cams.length - 1, f = p * segs, i = Math.min(segs - 1, Math.floor(f));
      if (bar) bar.style.setProperty('--fp', p.toFixed(3));
      root.classList.toggle('fly-on', scrollY > top0 - 40 && scrollY < top0 + total + 40);
      const k = Math.round(f);
      if (stepped()) { if (k !== shown) { setStop(k); flyTo(k); } return; }
      let tt = Math.min(1, Math.max(0, (f - i - 0.2) / 0.6));
      const e = mqReduce.matches ? (tt < 0.5 ? 0 : 1) : ease(tt);
      const A = cams[i], B = cams[i + 1];
      const bump = mqReduce.matches ? 0 : Math.sin(Math.PI * e) * (i > 0 && i < segs - 1 ? 0.42 : 0.12);
      const z = Math.exp(Math.log(A.z) + (Math.log(B.z) - Math.log(A.z)) * e - bump);
      const cx = A.cx + (B.cx - A.cx) * e, cy = A.cy + (B.cy - A.cy) * e;
      const fx = A.fx + (B.fx - A.fx) * e, fy = A.fy + (B.fy - A.fy) * e;
      const tl = mqReduce.matches ? 0 : A.tilt + (B.tilt - A.tilt) * e;
      camSet(`translate3d(${(vw * fx - cx * z).toFixed(1)}px,${(vh * fy - cy * z).toFixed(1)}px,0) scale(${z.toFixed(4)})`, TT(tl));
      world.style.setProperty('--iz', (1 / z).toFixed(4)); world.style.setProperty('--z', z.toFixed(4));
      setStop(k);
      stops.forEach((fr) => fr.classList.toggle('is-focus', +fr.dataset.k === k));
    };
    const markMode = () => fly.classList.toggle('is-cont', !stepped());
    const measure = () => { markMode(); vw = view.clientWidth || innerWidth; vh = view.clientHeight || innerHeight; fly.style.setProperty('--zc', (Math.min(vw * 0.8, 440) / 680).toFixed(4)); top0 = docTop(fly); cams = [overview(false), ...stops.map(camFor), overview(true)]; if (stepped()) { camClear(); world.style.transform = ''; tiltEl.style.transform = ''; if (shown >= 0) flyTo(shown, true); } else { $$('.is-cur,.is-out', fly).forEach((el) => el.classList.remove('is-cur', 'is-out')); } paint(); };
    addEventListener('scroll', raf(paint), { passive: true });
    addEventListener('resize', raf(measure));
    hooks.push(() => requestAnimationFrame(measure));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
    lays.forEach((b) => b.addEventListener('click', () => {
      measure();
      const k = +b.dataset.go, total = fly.offsetHeight - innerHeight;
      scrollTo({ top: Math.ceil(top0 + total * (k / (cams.length - 1))), behavior: mqReduce.matches ? 'auto' : 'smooth' });
    }));
    window.__tm_fly = { measure, stop: () => cur, go: (k) => { measure(); scrollTo(0, Math.ceil(top0 + (fly.offsetHeight - innerHeight) * (k / (cams.length - 1)))); } };
  }

  /* ---------- first visit: the cursor drags a selection around the name ---------- */
  const nm = $('.nm');
  if (nm && root.classList.contains('intro')) {
    try { sessionStorage.setItem('tm-intro', '1'); } catch (e) { /* ignore */ }
    const cur = $('.nm-cur', nm);
    const run = () => {
      if (!cur || !cur.animate) return;
      const W = nm.offsetWidth + 20, H = nm.offsetHeight + 9, sx = AR() ? -1 : 1;
      cur.animate([
        { opacity: 0, transform: 'translate(0,0) scale(.85)', offset: 0 },
        { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 0.18 },
        { opacity: 1, transform: `translate(${sx * W}px,${H}px)`, offset: 0.6 },
        { opacity: 1, transform: `translate(${sx * (W + 34)}px,${H + 46}px)`, offset: 0.84 },
        { opacity: 0, transform: `translate(${sx * (W + 46)}px,${H + 64}px)`, offset: 1 }
      ], { duration: 2200, delay: 600, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'both' });
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
  }

  /* ---------- inspect mode: the page shows its own specs, measured live ---------- */
  const insBtn = $('#insBtn');
  if (insBtn) {
    const layer = document.createElement('div');
    layer.className = 'ins-layer'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    const fam = (f) => { const n = f.split(',')[0].replace(/["']/g, '').trim(); return n === 'Plex' ? 'IBM Plex Sans Arabic' : n === 'Alex' ? 'Alexandria' : n; };
    const docPos = (el) => { let x = 0, y = 0, n = el; while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; };
    const hex = (c) => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return c; return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase(); };
    const paintIns = () => {
      if (!root.classList.contains('inspect')) { layer.innerHTML = ''; return; }
      layer.style.height = root.scrollHeight + 'px';
      const html = [];
      $$('[data-spec]').forEach((el) => {
        if (!el.offsetParent || !el.offsetWidth) return;
        const cs = getComputedStyle(el), p = docPos(el), name = el.dataset.specName || '';
        let v;
        if (el.dataset.spec === 'text') v = `${fam(cs.fontFamily)} ${cs.fontWeight} · ${Math.round(parseFloat(cs.fontSize))}/${Math.round(parseFloat(cs.lineHeight)) || 'auto'}`;
        else { const r = parseFloat(cs.borderTopLeftRadius) || 0; v = `${el.offsetWidth} × ${el.offsetHeight}${r ? ' · r ' + (r > 300 ? 'full' : Math.round(r)) : ''}`; }
        const left = AR() ? `left:${p.x + el.offsetWidth}px;transform:translate(-100%,-100%)` : `left:${p.x}px`;
        html.push(`<span class="ins-l" style="top:${p.y - 6}px;${left}">${name} <s>${v}</s></span>`);
      });
      layer.innerHTML = html.join('');
      $$('[data-tok]').forEach((em) => { em.textContent = hex(getComputedStyle(root).getPropertyValue(em.dataset.tok).trim() ? getComputedStyle(em.previousElementSibling).backgroundColor : ''); });
    };
    const setIns = (on) => {
      root.classList.toggle('inspect', on);
      insBtn.setAttribute('aria-pressed', String(on));
      requestAnimationFrame(paintIns);
    };
    insBtn.addEventListener('click', () => setIns(!root.classList.contains('inspect')));
    $$('[data-ins-close]').forEach((b) => b.addEventListener('click', () => setIns(false)));
    addEventListener('resize', raf(paintIns));
    hooks.push(() => requestAnimationFrame(paintIns));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintIns);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('inspect')) setIns(false); });
    window.__tm_ins = setIns;
  }

  /* ---------- the board: pan, pinch, wheel-zoom, minimap, full screen ---------- */
  const vwEl = $('#vw');
  const bd = $('#board');
  if (bd) {
    const view = $('.bd-view', bd), world = $('.bd-world', bd), dots = $('.bd-dots', bd), pct = $('#bdPct');
    const miniIn = $('.bd-mini-in', bd), vpr = $('.bd-mini-vp', bd);
    const WW = +world.dataset.w, WH = +world.dataset.h;
    const coarse = matchMedia('(pointer: coarse)');
    const full = () => bd.classList.contains('is-full');
    let z = 1, x = 0, y = 0, vw0 = 1, vh0 = 1, anim = 0;
    const ZMIN = () => Math.min(0.12, fitZ() * 0.8), ZMAX = 2;
    const fitZ = () => Math.min(vw0 / WW, vh0 / WH) * 0.94;
    const clamp = () => { const m = 140; x = Math.min(vw0 - m, Math.max(m - WW * z, x)); y = Math.min(vh0 - m, Math.max(m - WH * z, y)); };
    const apply = () => {
      world.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${z.toFixed(4)})`;
      world.style.setProperty('--iz', (1 / z).toFixed(4)); world.style.setProperty('--z', z.toFixed(4));
      bd.classList.toggle('is-far', z < 0.3);
      if (dots) dots.style.transform = `translate3d(${(((x % 24) + 24) % 24) - 24}px,${(((y % 24) + 24) % 24) - 24}px,0)`;
      if (pct) pct.value = Math.round(z * 100) + '%';
      if (miniIn && vpr) {
        const m = miniIn.clientWidth / WW;
        vpr.style.width = Math.max(4, (vw0 / z) * m) + 'px'; vpr.style.height = Math.max(4, (vh0 / z) * m) + 'px';
        vpr.style.transform = `translate(${(-x / z) * m}px,${(-y / z) * m}px)`;
      }
    };
    const size = () => { vw0 = view.clientWidth || 1; vh0 = view.clientHeight || 1; };
    const tween = (tz, tx, ty, ms = 420) => {
      cancelAnimationFrame(anim);
      const z0 = z, x0 = x, y0 = y, t0 = performance.now();
      if (mqReduce.matches) ms = 1;
      const step = (t) => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); z = z0 + (tz - z0) * e; x = x0 + (tx - x0) * e; y = y0 + (ty - y0) * e; apply(); if (p < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    };
    const fit = (smooth = true) => { size(); const tz = fitZ(), tx = (vw0 - WW * tz) / 2, ty = (vh0 - WH * tz) / 2; if (smooth) tween(tz, tx, ty); else { z = tz; x = tx; y = ty; apply(); } };
    const zoomTo = (nz, px = vw0 / 2, py = vh0 / 2, smooth = true) => {
      nz = Math.min(ZMAX, Math.max(ZMIN(), nz));
      const tx = px - (px - x) * (nz / z), ty = py - (py - y) * (nz / z);
      if (smooth) tween(nz, tx, ty, 260); else { z = nz; x = tx; y = ty; clamp(); apply(); }
    };
    const focusOn = (el, smooth = true) => {
      const fx = parseFloat(el.style.left), fy = parseFloat(el.style.top), fw = el.offsetWidth, fh = el.offsetHeight;
      const tz = Math.min(1, (vw0 * 0.84) / fw, (vh0 * 0.7) / fh), tx = vw0 / 2 - (fx + fw / 2) * tz, ty = vh0 / 2 - (fy + fh / 2) * tz;
      smooth ? tween(tz, tx, ty) : (z = tz, x = tx, y = ty, apply());
    };
    // pointers: drag with inertia, pinch with two fingers
    const pts = new Map();
    let drag = null, pinch = null, moved = false, vx = 0, vy = 0, lt = 0;
    const live = () => full() || !coarse.matches;
    view.addEventListener('pointerdown', (e) => {
      if (!live() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      cancelAnimationFrame(anim);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { drag = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }; moved = false; vx = vy = 0; lt = performance.now(); }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], r = view.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, z0: z, x0: x, y0: y };
        moved = true; try { view.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      }
    });
    view.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()], r = view.getBoundingClientRect();
        const nz = Math.min(ZMAX, Math.max(ZMIN(), pinch.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)));
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const wx = (pinch.mx - pinch.x0) / pinch.z0, wy = (pinch.my - pinch.y0) / pinch.z0;
        z = nz; x = mx - wx * nz; y = my - wy * nz; clamp(); apply(); return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; bd.classList.add('is-grabbing'); try { view.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
      if (moved) {
        const t = performance.now(), dt = Math.max(8, t - lt);
        vx = (e.clientX - prev.x) / dt; vy = (e.clientY - prev.y) / dt; lt = t;
        x = drag.ox + dx; y = drag.oy + dy; clamp(); apply();
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { sx: p.x, sy: p.y, ox: x, oy: y }; return; }
      if (pts.size === 0) {
        bd.classList.remove('is-grabbing');
        if (drag && moved && !mqReduce.matches && performance.now() - lt < 80) {
          const glide = () => { vx *= 0.93; vy *= 0.93; x += vx * 16; y += vy * 16; clamp(); apply(); if (Math.abs(vx) + Math.abs(vy) > 0.02) anim = requestAnimationFrame(glide); };
          anim = requestAnimationFrame(glide);
        }
        drag = null;
      }
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
    view.addEventListener('lostpointercapture', (e) => { if (e.target === view) end(e); });
    view.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      if (coarse.matches && !full()) { e.preventDefault(); e.stopPropagation(); openFull(); }
    }, true);
    view.addEventListener('wheel', (e) => {
      if (!live()) return;
      const r = view.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTo(z * Math.exp(-e.deltaY * 0.0045), e.clientX - r.left, e.clientY - r.top, false); return; }
      if (full() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); cancelAnimationFrame(anim); x -= e.deltaX; y -= e.deltaY; clamp(); apply(); }
    }, { passive: false });
    view.addEventListener('keydown', (e) => {
      const k = e.key, step = 90;
      if (k === 'ArrowLeft') { x += step; } else if (k === 'ArrowRight') { x -= step; } else if (k === 'ArrowUp') { y += step; } else if (k === 'ArrowDown') { y -= step; }
      else if (k === '+' || k === '=') { zoomTo(z * 1.25); return; } else if (k === '-') { zoomTo(z / 1.25); return; } else if (k === '0') { fit(); return; }
      else if (k === 'Escape' && full()) { closeFull(); return; } else return;
      e.preventDefault(); clamp(); apply();
    });
    // keyboard focus on a frame brings it into view
    $$('.bd-hit', bd).forEach((b) => b.addEventListener('focus', () => { if (!drag) focusOn(b.parentElement); }));
    $$('[data-z]', bd).forEach((b) => b.addEventListener('click', () => { const v = b.dataset.z; if (v === 'fit') fit(); else zoomTo(v === '+' ? z * 1.3 : z / 1.3); }));
    if (miniIn) miniIn.parentElement.addEventListener('click', (e) => {
      const r = miniIn.getBoundingClientRect(), m = miniIn.clientWidth / WW;
      const wx = (e.clientX - r.left) / m, wy = (e.clientY - r.top) / m;
      tween(z, vw0 / 2 - wx * z, vh0 / 2 - wy * z, 380);
    });
    // full screen (phones open the file; desktop can too)
    function openFull() {
      if (full()) return;
      bd.classList.add('is-full'); lock(); overlayOpen = true; dockHide('board', true); hdr.classList.add('is-hidden');
      requestAnimationFrame(() => { size(); const c = $('.bd-cover', bd); if (c && coarse.matches) focusOn(c, false); else fit(false); $('.bd-x', bd).focus({ preventScroll: true }); });
    }
    function closeFull() {
      if (!full()) return;
      bd.classList.remove('is-full'); unlock(); overlayOpen = false; dockHide('board', false);
      requestAnimationFrame(() => { size(); fit(false); });
    }
    $$('.bd-open,.bd-full', bd).forEach((b) => b.addEventListener('click', openFull));
    $('.bd-x', bd).addEventListener('click', closeFull);
    bd.addEventListener('keydown', (e) => { if (e.key === 'Escape' && full() && (!vwEl || vwEl.hidden)) closeFull(); });
    addEventListener('resize', raf(() => { size(); clamp(); apply(); }));
    size(); fit(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); fit(false); });
    window.__tm_bd = { fit, zoomTo, openFull, closeFull, state: () => ({ z, x, y }) };
  }

  /* ---------- v2: links shared before the project pages (work.html#p-slug) land on the page itself ---------- */
  const oldLink = location.hash.match(/^#p-([\w-]+)$/);
  if (oldLink && !$('#vw') && $(`a[href="project-${oldLink[1]}.html"]`)) location.replace(`project-${oldLink[1]}.html`);

  /* ---------- v2: centred-item tracking shared by the deck, the key screens and the lightbox ---------- */
  const nearest = (track, items) => {
    const tr = track.getBoundingClientRect(), mid = tr.left + tr.width / 2;
    let best = 0, bd = Infinity;
    items.forEach((it, i) => { const r = it.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const centreOn = (track, item, smooth) => {
    const tr = track.getBoundingClientRect(), r = item.getBoundingClientRect();
    track.scrollBy({ left: r.left + r.width / 2 - (tr.left + tr.width / 2), behavior: smooth && !mqReduce.matches ? 'smooth' : 'instant' });
  };
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ---------- v2: the deck — swipe between projects, neighbours turn away ---------- */
  $$('[data-pw]').forEach((track) => {
    const sec = track.closest('.pw');
    const slots = Array.from(track.children);
    const dots = $$('.pw-dots i', sec), count = $('.pw-count', sec);
    const real = slots.filter((s) => !s.querySelector('.pw-more')).length;
    let cur = 0;
    const paint = () => {
      const tr = track.getBoundingClientRect(), mid = tr.left + tr.width / 2;
      slots.forEach((s) => {
        const r = s.getBoundingClientRect();
        const d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / (r.width + 16)));
        s.style.setProperty('--d', d.toFixed(3));
        s.style.setProperty('--a', Math.abs(d).toFixed(3));
      });
      cur = nearest(track, slots);
      slots.forEach((s, i) => s.classList.toggle('is-cur', i === cur));
      dots.forEach((d, i) => d.classList.toggle('on', i === cur));
      if (count) count.textContent = `${pad2(Math.min(cur + 1, real))} / ${pad2(real)}`;
    };
    const onScroll = raf(paint);
    track.addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    hooks.push(() => requestAnimationFrame(paint));
    const go = (i) => centreOn(track, slots[Math.max(0, Math.min(slots.length - 1, i))], true);
    const prev = $('.pw-prev', sec), next = $('.pw-next', sec);
    if (prev) prev.addEventListener('click', () => go(cur - 1));
    if (next) next.addEventListener('click', () => go(cur + 1));
    track.addEventListener('keydown', (e) => {
      if (e.target !== track || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      const fwd = (e.key === 'ArrowLeft') === AR();
      go(cur + (fwd ? 1 : -1));
    });
    track.classList.add('is-live');
    paint();
    window.__tm_pw = { go, cur: () => cur };
  });

  /* ---------- v2: key screens — a count that follows the swipe ---------- */
  $$('[data-pj-hi]').forEach((track) => {
    const items = Array.from(track.children), count = $('.pj-hi-count');
    const paint = () => { if (count) count.textContent = `${pad2(nearest(track, items) + 1)} / ${pad2(items.length)}`; };
    track.addEventListener('scroll', raf(paint), { passive: true });
    paint();
  });

  /* ---------- v2: lightbox — every screen of a project at full size ---------- */
  const lb = $('#lb');
  if (lb) {
    const track = $('#lbTrack'), items = Array.from(track.children), cnt = $('#lbCount');
    let idx = 0, back = null, opening = false;
    const load = (i) => { const img = items[i] && $('img[data-src]', items[i]); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    const paint = () => { cnt.textContent = `${idx + 1} / ${items.length}`; [idx - 1, idx, idx + 1, idx + 2].forEach(load); };
    const go = (i, smooth = true) => { idx = Math.max(0, Math.min(items.length - 1, i)); paint(); centreOn(track, items[idx], smooth); };
    const open = (i) => {
      back = document.activeElement; lb.hidden = false; lock(); overlayOpen = true; dockHide('lb', true); opening = true;
      requestAnimationFrame(() => { go(i, false); lb.classList.add('open'); $('#lbClose').focus({ preventScroll: true }); setTimeout(() => { opening = false; }, 120); });
    };
    const close = () => {
      lb.classList.remove('open');
      setTimeout(() => { lb.hidden = true; unlock(); overlayOpen = false; dockHide('lb', false); if (back) back.focus({ preventScroll: true }); }, 300);
    };
    $$('[data-lb]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault(); open(+a.dataset.lb);
    }));
    track.addEventListener('scroll', raf(() => { if (opening) return; const i = nearest(track, items); if (i !== idx) { idx = i; paint(); } }), { passive: true });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => go(idx - 1));
    $('#lbNext').addEventListener('click', () => go(idx + 1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(AR() ? idx + 1 : idx - 1);
      if (e.key === 'ArrowRight') go(AR() ? idx - 1 : idx + 1);
      if (e.key === 'Tab') { const f = $$('button', lb).filter((x) => x.offsetParent !== null); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    hooks.push(() => { if (!lb.hidden) go(idx, false); });
    window.__tm_lb = { open, close, go, idx: () => idx };
  }

  /* ---------- the opening: the hero designs itself, one skill at a time ---------- */
  const hx = $('[data-hx]');
  if (hx) {
    const fr = $('.hx-frame', hx), cur = $('.hx-cur', hx), dim = $('.hx-dim', hx), proto = $('.hx-proto', hx);
    const tools = $$('[data-hx-go]', hx), replay = $('.hx-replay', hx);
    const noodle = $('.hx-noodle', hx), npath = $('path', noodle), ends = $$('circle', noodle);
    const shots = $$('.hx-shot', hx);
    let stage = 5, done = true, timers = [];
    const box = (el) => { const a = el.getBoundingClientRect(), f = fr.getBoundingClientRect(); return { x: a.left - f.left, y: a.top - f.top, w: a.width, h: a.height }; };
    // where her cursor works at each stage
    const AT = { 0: '.hx-name-wrap', 1: '.hx-note-1', 2: '.hx-lead', 3: '.hx-name-wrap', 4: '.hx-cta .btn-p', 5: '.hx-vis' };
    const aim = () => {
      const t = $(done ? '.hx-vis' : AT[stage], fr);
      if (!t || !t.offsetParent) return;
      // when the build is finished her cursor rests on the window's bar, beside its dots, so her work is seen whole
      const b = box(t), fx = done ? (AR() ? 0.78 : 0.22) : (AR() ? 0.22 : 0.78);
      cur.style.setProperty('--cx', `${(b.x + b.w * fx).toFixed(0)}px`);
      cur.style.setProperty('--cy', `${(done ? b.y - 10 : b.y + b.h * (stage === 1 ? 0.5 : 0.82)).toFixed(0)}px`);
    };
    // the prototype connection: from the main button to the screen
    const wire = () => {
      const btn = $('.hx-cta .btn-p', fr), vis = $('.hx-vis-in', fr);
      if (!btn || !vis) return;
      const a = box(btn), v = box(vis), wide = fr.clientWidth >= 820;
      let x1, y1, x2, y2, d;
      if (wide) {
        x1 = AR() ? a.x : a.x + a.w; y1 = a.y + a.h / 2;
        x2 = AR() ? v.x + v.w : v.x; y2 = v.y + v.h * 0.62;
        const k = (x2 - x1) * 0.55;
        d = `M${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
      } else {
        x1 = a.x + a.w / 2; y1 = a.y + a.h;
        x2 = v.x + v.w / 2; y2 = v.y;
        d = `M${x1} ${y1} C ${x1} ${y1 + 60}, ${x2} ${y2 - 60}, ${x2} ${y2}`;
      }
      npath.setAttribute('d', d);
      ends[0].setAttribute('cx', x1); ends[0].setAttribute('cy', y1); ends[1].setAttribute('cx', x2); ends[1].setAttribute('cy', y2);
      noodle.style.setProperty('--len', Math.ceil(npath.getTotalLength() + 2));
      // the label sits by the screen end of the wire, clear of the buttons
      if (proto) { const pw = proto.offsetWidth || 150; proto.style.setProperty('--px', `${(wide ? (AR() ? x2 - pw - 12 : x2 + 12) : x2 - pw / 2).toFixed(0)}px`); proto.style.setProperty('--py', `${(wide ? y2 - 44 : y2 - 46).toFixed(0)}px`); }
    };
    const paint = () => { aim(); wire(); if (dim) dim.textContent = `${Math.round(fr.offsetWidth)} × ${Math.round(fr.offsetHeight)}`; };
    const set = (n, fin) => {
      stage = n; done = !!fin;
      for (let k = 1; k <= 5; k++) fr.classList.toggle('s' + k, k <= n);
      fr.classList.toggle('done', done);
      tools.forEach((b, i) => { b.setAttribute('aria-pressed', String(i + 1 <= n)); b.classList.toggle('is-on', i + 1 === n && !done); });
      paint();
    };
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    const play = () => {
      stop(); set(0);
      [[1, 200], [2, 1150], [3, 2150], [4, 3100], [5, 3950]].forEach(([n, ms]) => timers.push(setTimeout(() => set(n), ms)));
      timers.push(setTimeout(() => set(5, true), 5300));
    };
    tools.forEach((b) => b.addEventListener('click', () => { stop(); const n = +b.dataset.hxGo; set(n, false); }));
    if (replay) replay.addEventListener('click', play);
    // her screens take turns once the colour is in
    let shot = 0, seen = true;
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; }).observe(fr);
    setInterval(() => {
      if (!seen || document.hidden || stage < 4 || mqReduce.matches || shots.length < 2) return;
      shots[shot].classList.remove('on'); shot = (shot + 1) % shots.length; shots[shot].classList.add('on');
    }, 3600);
    // sticky notes can be moved, like on any canvas
    $$('.hx-note', hx).forEach((n) => {
      let sx = 0, sy = 0, ox = 0, oy = 0, id = null;
      n.addEventListener('pointerdown', (e) => { id = e.pointerId; n.setPointerCapture(id); n.classList.add('is-drag'); sx = e.clientX; sy = e.clientY; ox = parseFloat(n.style.getPropertyValue('--dx')) || 0; oy = parseFloat(n.style.getPropertyValue('--dy')) || 0; });
      n.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; n.style.setProperty('--dx', `${ox + e.clientX - sx}px`); n.style.setProperty('--dy', `${oy + e.clientY - sy}px`); });
      const end = () => { id = null; n.classList.remove('is-drag'); };
      n.addEventListener('pointerup', end); n.addEventListener('pointercancel', end);
    });
    addEventListener('resize', raf(paint));
    hooks.push(() => requestAnimationFrame(paint));
    if (window.ResizeObserver) new ResizeObserver(raf(paint)).observe(fr);
    const first = root.classList.contains('intro') && !mqReduce.matches;
    fr.classList.add('hx-live');
    if (first) { try { sessionStorage.setItem('tm-intro', '1'); } catch (e) { /* ignore */ } set(0); }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { if (first) play(); else set(5, true); });
    window.__tm_hx = { play, set, stage: () => stage, done: () => done };
  }

  /* expose for tests */
  window.__tm = { applyLang, applyTheme, openSheet, closeSheet };
})();
