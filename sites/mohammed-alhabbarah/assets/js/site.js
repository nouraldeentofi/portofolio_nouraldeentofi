/* Mohammed Alhabbarah · محمد الحبارة — site behaviour (vanilla JS, no dependencies) */
(function () {
  'use strict';
  var d = document, H = d.documentElement, W = window;
  var RTL = H.dir === 'rtl';
  var mq = function (q) { return W.matchMedia(q); };
  var mqReduce = mq('(prefers-reduced-motion: reduce)');
  var mqPhone = mq('(max-width: 767.98px)');
  var mqDock = mq('(max-width: 1023.98px)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()') && CSS.supports('animation-timeline: scroll()'));
  var REDUCE = mqReduce.matches;
  var SPEED = Math.max(1, +W.__TEST_SPEED || 1); /* tests only: speeds up auto-rotation */
  var AUTO = !W.__NO_AUTO;                          /* tests only: freeze auto-rotation for screenshots */
  if (SDA) H.classList.add('sda'); else H.classList.remove('sda');
  if (REDUCE) H.classList.add('rm');

  var store = {
    get: function (k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { W.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function rafThrottle(fn) {
    var queued = false;
    return function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; fn(); }); };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ------------------------------------------------------------ theme */
  var themeBtn = $('.tool--theme');
  var metaTheme = $('meta[name="theme-color"]');
  function applyTheme(t) {
    H.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    if (metaTheme) metaTheme.setAttribute('content', t === 'dark' ? '#0D1411' : '#F7F4EC');
  }
  applyTheme(store.get('theme') === 'dark' ? 'dark' : (H.getAttribute('data-theme') || 'light'));
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var t = H.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); store.set('theme', t);
  });
  W.addEventListener('pageshow', function () {
    var t = store.get('theme'); if (t === 'dark' || t === 'light') applyTheme(t);
    closeSheet(true);
  });

  /* --------------------------------------------------------- language */
  $$('[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () { store.set('lang', a.getAttribute('data-lang')); });
  });

  /* ----------------------------------------------- header + progress */
  var hdr = $('#hdr');
  var prog = $('.progress');
  var tl = $('[data-tl]');
  var tlFill = tl && $('.tl__fill', tl), tlTrain = tl && $('.tl__train', tl);
  var lastY = W.scrollY;
  function onScroll() {
    var y = W.scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (mqDock.matches && !H.classList.contains('lock')) {
        if (y > lastY + 6 && y > 140) hdr.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 140) hdr.classList.remove('is-hidden');
      } else hdr.classList.remove('is-hidden');
    }
    lastY = y;
    if (!SDA && prog) {
      var max = H.scrollHeight - W.innerHeight;
      prog.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : '0');
    }
    if (tl) {
      var r = tl.getBoundingClientRect();
      var p = clamp((W.innerHeight * 0.62 - r.top) / Math.max(1, r.height), 0, 1);
      if (tlFill) tlFill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (tlTrain) tlTrain.style.transform = 'translateY(' + (p * 100).toFixed(2) + '%)';
    }
  }
  var onScrollRaf = rafThrottle(onScroll);
  W.addEventListener('scroll', onScrollRaf, { passive: true });
  W.addEventListener('resize', onScrollRaf);
  onScroll();

  /* ------------------------------------------- reveal (IO fallback) */
  if (!SDA) {
    var rv = $$('.rv, .rv-h, .jline');
    if ('IntersectionObserver' in W && !REDUCE) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      rv.forEach(function (el) { io.observe(el); });
    } else rv.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* -------------------------------------------- pause off-screen art */
  if ('IntersectionObserver' in W) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var on = en.isIntersecting && !REDUCE;
        en.target.classList.toggle('is-paused', !on);
        $$('svg.map', en.target).forEach(function (svg) {
          try { if (on) svg.unpauseAnimations(); else svg.pauseAnimations(); } catch (e) { /* noop */ }
        });
      });
    }, { rootMargin: '120px 0px' });
    $$('.hero__maps, .phero__bg, .pcard__map, .prog__map, .ftr__map, main > section').forEach(function (el) { pio.observe(el); });
  }
  if (REDUCE) $$('svg.map').forEach(function (svg) { try { svg.pauseAnimations(); svg.setCurrentTime(0); } catch (e) { /* noop */ } });

  /* -------------------------------- opening: platform doors (home page) */
  /* The sequence itself is pure CSS (it finishes even if this file never loads). Here: tidy up when it
     ends, let any tap / key / scroll skip straight to the doors opening, and the replay button. */
  var pd = $('.pd'), pdReplay = $('[data-pd-replay]');
  var pdT0 = pd && H.classList.contains('pd-play') ? performance.now() : -1;
  var PD_OPEN_MS = 2800, PD_COUNT_MS = 3500;
  function pdPlaying() { return pdT0 >= 0 && H.classList.contains('pd-play') && !H.classList.contains('pd-done'); }
  function pdStart(skip) {
    H.classList.remove('pd-play', 'pd-done', 'pd-skip');
    void H.offsetWidth;            /* restart every animation in the layer */
    H.classList.add('pd-play');
    if (skip) H.classList.add('pd-skip');
    pdT0 = performance.now();
  }
  function pdSkip() {
    if (!pdPlaying() || H.classList.contains('pd-skip')) return;
    if (performance.now() - pdT0 > PD_OPEN_MS) return;   /* the doors are already opening */
    pdStart(true);
  }
  if (pd) {
    pd.addEventListener('animationend', function (ev) {
      if (ev.target === pd && ev.animationName === 'pd-end') H.classList.add('pd-done');
    });
    pd.addEventListener('pointerdown', pdSkip);
    W.addEventListener('keydown', pdSkip);
    W.addEventListener('wheel', pdSkip, { passive: true });
    W.addEventListener('touchmove', pdSkip, { passive: true });
    W.addEventListener('scroll', function () { if (W.scrollY > 24) pdSkip(); }, { passive: true });
    /* opened in a background tab: hold the sequence until the visitor actually looks at it */
    var pdHiddenAt = 0;
    var pdHold = function () {
      if (!pdPlaying() || !pd.getAnimations) return;
      var anims = pd.getAnimations({ subtree: true });
      if (d.hidden) { pdHiddenAt = performance.now(); anims.forEach(function (a) { a.pause(); }); }
      else if (pdHiddenAt) { pdT0 += performance.now() - pdHiddenAt; pdHiddenAt = 0; anims.forEach(function (a) { a.play(); }); }
    };
    d.addEventListener('visibilitychange', pdHold);
    pdHold();
    if (pdReplay) pdReplay.addEventListener('click', function () {
      if (REDUCE) return;
      W.scrollTo({ top: 0, behavior: 'instant' });
      pdStart(false);
    });
  }

  /* --------------------------------------------------------- counters */
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var counters = $$('[data-count]');
  /* the final value stays in a hidden ::before ghost, so the box keeps its final width while counting */
  counters.forEach(function (el) { if (!REDUCE) el.textContent = '0'; });
  function countUp(el, quick) {
    if (el.__done && !quick) return; el.__done = true;
    if (el.__run) return;
    var target = +el.getAttribute('data-count');
    if (REDUCE) { el.textContent = fmt(target); return; }
    el.__run = true;
    var t0 = performance.now(), dur = quick ? 900 : 1500 + Math.min(900, target / 10);
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * e);
      if (k < 1) requestAnimationFrame(step); else { el.textContent = fmt(target); el.__run = false; el.__end = Date.now(); }
    })(t0);
  }
  if ('IntersectionObserver' in W) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var delay = el.closest('.stats') ? 650 : 0;
          /* the hero numbers start counting as the platform doors open */
          if (pdPlaying() && el.closest('.hero')) delay = Math.max(delay, PD_COUNT_MS - (performance.now() - pdT0));
          setTimeout(function () { countUp(el); }, delay);
          cio.unobserve(el);
        }
      });
    }, { threshold: 0.35 });
    counters.forEach(function (el) { cio.observe(el); });
  } else counters.forEach(countUp);

  /* --------------------------------------- tabs helper (keyboard) */
  function tabKeys(tabs, select, getIndex) {
    tabs.forEach(function (t) {
      t.addEventListener('keydown', function (ev) {
        var i = getIndex(), n = tabs.length, k = null;
        var fwd = RTL ? 'ArrowLeft' : 'ArrowRight', back = RTL ? 'ArrowRight' : 'ArrowLeft';
        if (ev.key === fwd) k = (i + 1) % n;
        else if (ev.key === back) k = (i - 1 + n) % n;
        else if (ev.key === 'Home') k = 0;
        else if (ev.key === 'End') k = n - 1;
        if (k !== null) { ev.preventDefault(); select(k, true); tabs[k].focus(); }
      });
    });
  }
  function visibleWatch(el, cb) {
    if (!('IntersectionObserver' in W)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: 0.3 }).observe(el);
  }

  /* --------------------------------------------- readiness line (home) */
  $$('[data-rline]').forEach(function (root) {
    var tabs = $$('.rline__stop', root), panels = $$('.rline__panel', root);
    var train = $('.rline__train', root), track = $('.rline__track', root), fill = $('.rline__fill', root);
    var i = 0, visible = false, pausedUntil = 0;
    function place() {
      var tr = track.getBoundingClientRect();
      var dot = tabs[i].querySelector('.rline__dot').getBoundingClientRect();
      train.style.setProperty('--x', (dot.left + dot.width / 2 - tr.left).toFixed(1) + 'px');
      fill.style.setProperty('--f', (i / (tabs.length - 1)).toFixed(3));
    }
    function select(k, user) {
      i = (k + tabs.length) % tabs.length;
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === i ? 'true' : 'false');
        t.tabIndex = j === i ? 0 : -1;
        t.setAttribute('data-past', j < i ? 'true' : 'false');
      });
      panels.forEach(function (p, j) {
        p.classList.toggle('is-on', j === i);
        if (j === i) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
      });
      place();
      if (user) pausedUntil = Date.now() + 14000;
    }
    tabs.forEach(function (t, j) { t.addEventListener('click', function () { select(j, true); }); });
    tabKeys(tabs, select, function () { return i; });
    root.addEventListener('pointerenter', function () { pausedUntil = Date.now() + 6000; });
    visibleWatch(root, function (v) { visible = v; });
    W.addEventListener('resize', rafThrottle(place));
    select(0, false);
    if (!REDUCE && AUTO) setInterval(function () {
      if (visible && !d.hidden && Date.now() > pausedUntil) select(i + 1, false);
    }, 3400 / SPEED);
  });

  /* ------------------------------------------- segmented control */
  $$('[data-seg]').forEach(function (root) {
    var tabs = $$('[role="tab"]', root), panels = $$('[role="tabpanel"]', root);
    var i = 0, visible = false, pausedUntil = 0;
    function select(k, user) {
      i = (k + tabs.length) % tabs.length;
      root.style.setProperty('--k', i);
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach(function (p, j) {
        p.classList.toggle('is-on', j === i);
        if (j === i) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
      });
      if (user) pausedUntil = Date.now() + 15000;
    }
    tabs.forEach(function (t, j) { t.addEventListener('click', function () { select(j, true); }); });
    tabKeys(tabs, select, function () { return i; });
    visibleWatch(root, function (v) { visible = v; });
    if (!REDUCE && AUTO) setInterval(function () {
      if (visible && !d.hidden && Date.now() > pausedUntil) select(i + 1, false);
    }, 4200 / SPEED);
  });

  /* ---------------------------------------- rails & carousels */
  function initRow(row, dotsWrap, opts) {
    var items = Array.prototype.slice.call(row.children);
    if (!items.length) return;
    var dots = dotsWrap ? $$('.dot', dotsWrap) : [];
    var cur = -1, visible = false, pausedUntil = 0, programmatic = 0;
    function active() { return opts.always || mqPhone.matches; }
    function centered() { return mqPhone.matches; }
    function offsetFor(el) {
      var r = row.getBoundingClientRect(), c = el.getBoundingClientRect();
      if (centered()) return (c.left + c.width / 2) - (r.left + r.width / 2);
      var cs = W.getComputedStyle(row);
      var padS = parseFloat(RTL ? cs.paddingRight : cs.paddingLeft) || 0;
      return RTL ? (c.right - (r.right - padS)) : (c.left - (r.left + padS));
    }
    function update() {
      var best = 0, bd = Infinity;
      items.forEach(function (el, k) { var dd = Math.abs(offsetFor(el)); if (dd < bd - 1) { bd = dd; best = k; } });
      if (best !== cur) {
        cur = best;
        dots.forEach(function (b, k) { b.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
        items.forEach(function (el, k) { el.classList.toggle('is-center', k === cur); });
      }
    }
    function maxIndex() {
      var maxScroll = row.scrollWidth - row.clientWidth;
      if (maxScroll <= 1) return 0;
      if (centered()) return items.length - 1;
      var shown = Math.max(1, Math.round(row.clientWidth / (items[0].getBoundingClientRect().width + 16)));
      return Math.max(0, items.length - shown);
    }
    function go(k) {
      var mx = maxIndex();
      if (k > mx) k = 0; if (k < 0) k = mx;
      programmatic = Date.now();
      row.scrollTo({ left: row.scrollLeft + offsetFor(items[k]), behavior: REDUCE ? 'auto' : 'smooth' });
    }
    /* a scrollable row must be reachable by keyboard when nothing inside it is focusable */
    var hasFocusable = !!row.querySelector('a[href], button, [tabindex]');
    function a11y() {
      if (hasFocusable) return;
      var scrollable = row.scrollWidth > row.clientWidth + 2;
      var isList = /^(UL|OL)$/.test(row.tagName);
      if (scrollable) {
        row.setAttribute('tabindex', '0');
        if (!isList) row.setAttribute('role', 'region');
        if (!row.getAttribute('aria-label')) { var h = row.closest('section') && row.closest('section').querySelector('h2'); if (h) row.setAttribute('aria-label', h.textContent.trim()); }
      } else { row.removeAttribute('tabindex'); if (!isList) row.removeAttribute('role'); }
    }
    a11y();
    row.addEventListener('scroll', rafThrottle(update), { passive: true });
    W.addEventListener('resize', rafThrottle(function () { update(); a11y(); }));
    dots.forEach(function (b, k) { b.addEventListener('click', function () { pausedUntil = Date.now() + 15000; go(k); }); });
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach(function (ev) {
      row.addEventListener(ev, function () { pausedUntil = Date.now() + 15000; }, { passive: true });
    });
    row.addEventListener('pointerenter', function () { pausedUntil = Date.now() + 8000; });
    if (opts.prev) opts.prev.addEventListener('click', function () { pausedUntil = Date.now() + 15000; go(cur - 1); });
    if (opts.next) opts.next.addEventListener('click', function () { pausedUntil = Date.now() + 15000; go(cur + 1); });
    visibleWatch(row, function (v) { visible = v; });
    update();
    if (!REDUCE && AUTO && opts.auto) setInterval(function () {
      if (visible && active() && !d.hidden && Date.now() > pausedUntil && !H.classList.contains('lock')) go(cur + 1);
    }, opts.auto / SPEED);
  }
  $$('.rail[data-rail]').forEach(function (row) {
    var dw = row.nextElementSibling && row.nextElementSibling.classList.contains('dots') ? row.nextElementSibling : null;
    initRow(row, dw, { auto: 6200, always: false });
  });
  $$('[data-carousel]').forEach(function (c) {
    var row = $('.carousel__row', c);
    initRow(row, $('.dots', c), { auto: +c.getAttribute('data-auto') || 5600, always: true, prev: $('.cbtn--prev', c), next: $('.cbtn--next', c) });
  });

  /* ------------------------------------------ expanders + FAQ */
  function toggle(btn, body) {
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('is-open', open);
    if (open) body.removeAttribute('inert'); else body.setAttribute('inert', '');
    var lbl = $('.xp__lbl', btn);
    if (lbl && btn.dataset.show) lbl.textContent = open ? btn.dataset.hide : btn.dataset.show;
  }
  $$('.xp__btn, [data-faq]').forEach(function (btn) {
    var body = d.getElementById(btn.getAttribute('aria-controls'));
    if (body) btn.addEventListener('click', function () { toggle(btn, body); });
  });

  /* ---------------------------------------------- bottom sheet */
  var sheet = $('#sheet'), scrim = $('#scrim'), more = $('.dock__more'), lastFocus = null, sheetTimer = null;
  function openSheet() {
    if (!sheet) return;
    clearTimeout(sheetTimer);
    lastFocus = d.activeElement;
    sheet.hidden = false; scrim.hidden = false;
    void sheet.offsetHeight;
    sheet.classList.add('is-on'); scrim.classList.add('is-on');
    var sbw = W.innerWidth - H.clientWidth;
    if (sbw > 0) d.body.style.paddingInlineEnd = sbw + 'px';
    H.classList.add('lock');
    if (more) more.setAttribute('aria-expanded', 'true');
    setTimeout(function () { var x = $('.sheet__x', sheet); if (x) x.focus({ preventScroll: true }); }, 80);
  }
  function closeSheet(instant) {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove('is-on'); scrim.classList.remove('is-on');
    H.classList.remove('lock'); d.body.style.paddingInlineEnd = '';
    if (more) more.setAttribute('aria-expanded', 'false');
    var fin = function () { sheet.hidden = true; scrim.hidden = true; };
    if (instant === true) fin(); else sheetTimer = setTimeout(fin, 480);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  if (more) more.addEventListener('click', function () { if (sheet.hidden) openSheet(); else closeSheet(); });
  if (scrim) scrim.addEventListener('click', closeSheet);
  $$('[data-close]', sheet || d).forEach(function (b) { b.addEventListener('click', closeSheet); });
  d.addEventListener('keydown', function (ev) {
    if (!sheet || sheet.hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); closeSheet(); }
    if (ev.key === 'Tab') {
      var f = $$('a[href], button:not([disabled])', sheet);
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && d.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && d.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });
  mqDock.addEventListener && mqDock.addEventListener('change', function (e) { if (!e.matches) closeSheet(true); });

  /* ------------------------------------ sticky action (home, phones) */
  var fab = $('#fab'), cta = $('#hero-cta'), ftr = $('.ftr');
  if (fab && cta && ftr) {
    var fabOn = null;
    var updFab = function () {
      var ctaGone = cta.getBoundingClientRect().bottom < 0;
      var footIn = ftr.getBoundingClientRect().top < W.innerHeight + 40;
      var on = ctaGone && !footIn && mqDock.matches;
      if (on === fabOn) return;
      fabOn = on;
      fab.classList.toggle('is-on', on);
      fab.setAttribute('aria-hidden', on ? 'false' : 'true');
      fab.tabIndex = on ? 0 : -1;
    };
    W.addEventListener('scroll', rafThrottle(updFab), { passive: true });
    W.addEventListener('resize', rafThrottle(updFab));
    updFab();
  }

  /* ---------------------------------------------- notes filter */
  var filters = $('[data-filters]'), ngrid = $('[data-ngrid]');
  if (filters && ngrid) filters.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-filter]'); if (!b) return;
    var k = b.getAttribute('data-filter');
    $$('[data-filter]', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    $$('[data-topic]', ngrid).forEach(function (c) { c.classList.toggle('is-dim', k !== 'all' && c.getAttribute('data-topic') !== k); });
  });
  /* -------------------------------------------- interactive surfaces */
  /* desktop: the card leans toward the pointer and catches the light; touch: a soft glow where the finger lands */
  var TILT = '.card, .stat, .badge, .quote, .fprof, .roundel--xl, .lang, .fig';
  var mqFine = mq('(hover: hover) and (pointer: fine)');
  var tEl = null, tRect = null, tX = 0, tY = 0, tRaf = 0;
  function tiltPaint() {
    tRaf = 0;
    if (!tEl) return;
    var r = tRect, x = clamp((tX - r.left) / r.width, 0, 1), y = clamp((tY - r.top) / r.height, 0, 1);
    var max = clamp(2000 / Math.max(r.width, r.height, 1), 1.6, 5.5);
    tEl.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
    tEl.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
    tEl.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    tEl.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  }
  function tiltEnd() {
    if (!tEl) return;
    var el = tEl; tEl = null;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    el.classList.remove('is-tilt');
  }
  if (!REDUCE) {
    d.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse' || !mqFine.matches) return;
      var el = ev.target && ev.target.closest ? ev.target.closest(TILT) : null;
      if (el && el.closest('.sheet, .dock, .hdr')) el = null;
      if (el !== tEl) {
        tiltEnd();
        if (el) { tEl = el; tRect = el.getBoundingClientRect(); el.classList.add('is-tilt'); }
      }
      if (!tEl) return;
      tX = ev.clientX; tY = ev.clientY;
      if (!tRaf) tRaf = requestAnimationFrame(tiltPaint);
    }, { passive: true });
    H.addEventListener('pointerleave', tiltEnd);
    W.addEventListener('scroll', tiltEnd, { passive: true });
    W.addEventListener('blur', tiltEnd);
    d.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0) return;
      var el = ev.target && ev.target.closest ? ev.target.closest('.card, .stat, .quote, .fprof') : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--px', Math.round(ev.clientX - r.left) + 'px');
      el.style.setProperty('--py', Math.round(ev.clientY - r.top) + 'px');
      el.classList.remove('is-press');
      void el.offsetWidth;
      el.classList.add('is-press');
      clearTimeout(el.__press);
      el.__press = setTimeout(function () { el.classList.remove('is-press'); }, 900);
    }, { passive: true });
  }

  /* numbers count again when you come back to them */
  $$('.stat, .fig').forEach(function (card) {
    var n = $('[data-count]', card); if (!n) return;
    var again = function () { if (n.__done && !n.__run && Date.now() - (n.__end || 0) > 1200) countUp(n, true); };
    card.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') again(); });
    if (!$('a[href]', card)) card.addEventListener('click', again);
  });

  /* a role card opens its details wherever you tap it */
  $$('.rcard').forEach(function (c) {
    var b = $('.xp__btn', c); if (!b) return;
    c.addEventListener('click', function (ev) {
      if (ev.target.closest('a, button, .xp__body')) return;
      if (W.getSelection && String(W.getSelection())) return;
      b.click();
    });
  });

  /* -------------------------------------------- copy + toast */
  var toastEl = $('.toast'), toastT = 0, toastC = 0;
  function toast(msg, extra) {
    if (!toastEl || !msg) return;
    clearTimeout(toastT); clearTimeout(toastC);
    toastEl.textContent = '';
    var ok = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ok.setAttribute('class', 'ic'); ok.setAttribute('aria-hidden', 'true');
    var u = d.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-check'); ok.appendChild(u);
    toastEl.appendChild(ok);
    toastEl.appendChild(d.createTextNode(msg));
    if (extra) { var bi = d.createElement('bdi'); bi.className = 'toast__x'; bi.textContent = extra; toastEl.appendChild(bi); }
    requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
    toastT = setTimeout(function () {
      toastEl.classList.remove('is-on');
      toastC = setTimeout(function () { toastEl.textContent = ''; }, 500);
    }, 2600);
  }
  function legacyCopy(v, back) {
    var ta = d.createElement('textarea');
    ta.value = v; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    d.body.appendChild(ta); ta.select();
    var ok = false; try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
    d.body.removeChild(ta);
    if (back && back.focus) back.focus({ preventScroll: true });
    return ok;
  }
  $$('[data-copy]').forEach(function (b) {
    var v = b.getAttribute('data-copy');
    function done() {
      b.classList.add('is-done');
      toast(b.getAttribute('data-done'), v);
      clearTimeout(b.__t); b.__t = setTimeout(function () { b.classList.remove('is-done'); }, 2000);
    }
    b.addEventListener('click', function () {
      if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(v).then(done, function () { if (legacyCopy(v, b)) done(); });
      else if (legacyCopy(v, b)) done();
    });
    var row = b.closest('.cert__id');
    if (row) row.addEventListener('click', function (ev) {
      if (ev.target.closest('a, button')) return;
      if (W.getSelection && String(W.getSelection())) return;
      b.click();
    });
  });

  /* -------------------------------------------- footer */
  $$('[data-totop]').forEach(function (b) {
    b.addEventListener('click', function () {
      W.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
      var m = $('#main');
      if (m) setTimeout(function () { m.focus({ preventScroll: true }); }, REDUCE ? 0 : 700);
    });
  });
  var wm = $('.ftr__wm');
  if (wm && !SDA) {
    if ('IntersectionObserver' in W && !REDUCE) {
      var wio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { wm.classList.add('is-in'); wio.disconnect(); }
      }, { threshold: 0.35 });
      wio.observe(wm);
    } else wm.classList.add('is-in');
  }
  /* on narrow screens the station line scrolls: start with the current station in view */
  var fl = $('.fline'), flOn = fl && $('.fline__st.is-on', fl);
  function flCenter() {
    if (!fl || !flOn || fl.scrollWidth <= fl.clientWidth + 2) return;
    var fr = fl.getBoundingClientRect(), sr = flOn.getBoundingClientRect();
    fl.scrollLeft += (sr.left + sr.width / 2) - (fr.left + fr.width / 2);
  }
  flCenter();
})();
