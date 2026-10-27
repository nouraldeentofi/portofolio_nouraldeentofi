/* Mazen Alobaidi — site behaviour (vanilla, no frameworks) */
(function () {
  'use strict';
  window.__maReady = true;
  var d = document, root = d.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var rtl = root.dir === 'rtl';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var sess = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  function absTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }

  /* ── restore scroll after a language switch (same spot, other language) ── */
  var keep = sess.get('mazen-alobaidi:keep');
  if (keep) {
    sess.del('mazen-alobaidi:keep');
    try {
      var k = JSON.parse(keep);
      if (k.page === root.getAttribute('data-page')) {
        var restore = function () {
          var el = k.anchor && d.getElementById(k.anchor);
          var y = el ? absTop(el) - k.off : k.ratio * (d.documentElement.scrollHeight - innerHeight);
          root.style.scrollBehavior = 'auto';
          scrollTo(0, Math.max(0, y));
          requestAnimationFrame(function () { root.style.scrollBehavior = ''; });
        };
        restore();
        if (d.fonts && d.fonts.ready) d.fonts.ready.then(restore);
        addEventListener('load', restore, { once: true });
      }
    } catch (e) {}
  }

  /* ── theme ── */
  var themeBtn = d.querySelector('.theme-btn');
  if (themeBtn) {
    var setPressed = function () { themeBtn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false'); };
    setPressed();
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('mazen-alobaidi:theme', next);
      setPressed();
    });
  }

  /* ── language: remember the choice and keep the reader's place ── */
  var langBtn = d.querySelector('.lang-btn');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      store.set('mazen-alobaidi:lang', langBtn.getAttribute('data-lang'));
      var anchor = null, off = 0, best = 1e9, hdr = header ? header.offsetHeight : 60;
      var cands = d.querySelectorAll('main [id]');
      for (var i = 0; i < cands.length; i++) {
        var r = cands[i].getBoundingClientRect();
        if (!r.height || r.bottom < hdr || r.top > innerHeight) continue;
        var top = absTop(cands[i]) - scrollY;   // layout position, ignores reveal transforms
        var dist = Math.abs(top - hdr);
        if (dist < best) { best = dist; anchor = cands[i].id; off = top; }
      }
      var max = d.documentElement.scrollHeight - innerHeight;
      sess.set('mazen-alobaidi:keep', JSON.stringify({ page: root.getAttribute('data-page'), anchor: anchor, off: off, ratio: max > 0 ? scrollY / max : 0 }));
    });
  }
  /* any internal link keeps the current language as the remembered one */
  store.set('mazen-alobaidi:lang', root.lang);

  /* ── header state + reading progress + hero scroll fallback ── */
  var header = d.querySelector('.site-header');
  var prog = d.querySelector('.progress span');
  var sda = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  if (!sda) root.classList.add('no-sda');
  var hero = d.querySelector('.hero, .page-hero');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (!sda) {
      var max = d.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      if (hero && !reduce) root.style.setProperty('--hp', Math.min(1, y / (innerHeight * .9)).toFixed(4));
    }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ── reveal on enter ── */
  var revealEls = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    // titles are clipped while hidden, so watch their (unclipped) parent instead
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target.__reveal || e.target;
        el.classList.add('in'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) {
      var watch = el.classList.contains('from-start') && el.parentElement ? el.parentElement : el;
      watch.__reveal = el; io.observe(watch);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── count up ── */
  var counts = d.querySelectorAll('.count[data-to]');
  function runCount(el) {
    var to = +el.getAttribute('data-to'), t0 = null, dur = 1400;
    if (reduce) { el.textContent = to; return; }
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counts.forEach(function (c) { cio.observe(c); });
  }

  /* ── pause looping art when off screen (battery) ── */
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { e.target.classList.toggle('paused', !e.isIntersecting); });
    });
    d.querySelectorAll('.band, .slabs-wrap').forEach(function (el) { pio.observe(el); });
  }

  /* ── climb distance for the career spine pulse ── */
  var sw = d.querySelector('.slabs-wrap');
  if (sw) {
    var setClimb = function () { sw.style.setProperty('--climb', Math.max(0, sw.offsetHeight - 68) + 'px'); };
    setClimb(); addEventListener('resize', setClimb, { passive: true });
  }

  /* ── swipe rows: centred card focus, dots, gentle auto-advance ── */
  var mqSwipe = matchMedia('(max-width: 760px)');
  d.querySelectorAll('.swipe').forEach(function (sw) {
    var track = sw.querySelector('.swipe-track');
    var items = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(sw.querySelectorAll('.dot'));
    var cur = 0, timer = null, userAt = 0, visible = false, raf = 0;
    function center(i) {
      var it = items[i];
      var left = it.offsetLeft - (track.clientWidth - it.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
    }
    function update() {
      raf = 0;
      if (!mqSwipe.matches) { items.forEach(function (it) { it.style.removeProperty('--k'); it.style.removeProperty('--o'); }); return; }
      var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      var best = 0, bestD = 1e9;
      items.forEach(function (it, i) {
        var r = it.getBoundingClientRect();
        var dist = Math.abs(r.left + r.width / 2 - mid);
        var n = Math.min(1, dist / r.width);
        it.style.setProperty('--k', (1 - n * 0.06).toFixed(3));
        it.style.setProperty('--o', (1 - n * 0.35).toFixed(3));
        if (dist < bestD) { bestD = dist; best = i; }
      });
      cur = best;
      dots.forEach(function (dt, i) { dt.setAttribute('aria-current', i === best ? 'true' : 'false'); });
    }
    track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      track.addEventListener(ev, function () { userAt = Date.now(); }, { passive: true });
    });
    dots.forEach(function (dt, i) { dt.addEventListener('click', function () { userAt = Date.now(); center(i); }); });
    function tick() {
      if (!mqSwipe.matches || !visible || reduce || d.hidden) return;
      if (Date.now() - userAt < 7000) return;
      center((cur + 1) % items.length);
    }
    function start() { if (!timer) timer = setInterval(tick, 5200); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) { visible = ents[0].isIntersecting; }, { threshold: 0.5 }).observe(track);
    }
    start();
    update();
    mqSwipe.addEventListener ? mqSwipe.addEventListener('change', update) : mqSwipe.addListener(update);
    addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  });

  /* ── expanders (role details, FAQ): grow smoothly, the tapped button stays put ── */
  function bindToggle(btn, panel) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      // the panel sits below its button, so the button never moves
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.classList.toggle('is-open', open);
    });
  }
  d.querySelectorAll('.more-btn').forEach(function (b) {
    var p = d.getElementById(b.getAttribute('aria-controls'));
    if (p) bindToggle(b, p);
  });
  d.querySelectorAll('.faq-q button').forEach(function (b) {
    var p = d.getElementById(b.getAttribute('aria-controls'));
    if (p) bindToggle(b, p);
  });

  /* ── toast + copy email ── */
  var toast = d.querySelector('.toast'), tt;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  d.querySelectorAll('.copy-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      var done = function () { say(rtl ? 'تم نسخ البريد' : 'Email copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, done);
      else { var t = d.createElement('textarea'); t.value = v; t.style.position = 'fixed'; t.style.opacity = '0'; d.body.appendChild(t); t.select(); try { d.execCommand('copy'); } catch (e) {} d.body.removeChild(t); done(); }
    });
  });

  /* ── message form → ready email (mailto) ── */
  var form = d.querySelector('.mail-form');
  if (form) {
    var err = form.querySelector('.f-err');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = form.elements.name, msg = form.elements.msg, org = form.elements.org;
      var bad = [];
      [name, msg].forEach(function (f) { var empty = !f.value.trim(); f.classList.toggle('is-err', empty); f.setAttribute('aria-invalid', empty ? 'true' : 'false'); if (empty) bad.push(f); });
      if (bad.length) { err.textContent = form.getAttribute('data-err'); err.classList.add('show'); bad[0].focus(); return; }
      err.classList.remove('show');
      var topicEl = form.querySelector('input[name=topic]:checked');
      var topic = topicEl ? topicEl.value : '';
      var subject = topic + ' — ' + name.value.trim() + (org.value.trim() ? ' (' + org.value.trim() + ')' : '');
      var body = form.getAttribute('data-greet') + '\n\n' + msg.value.trim() + '\n\n' + name.value.trim() + (org.value.trim() ? '\n' + org.value.trim() : '');
      var url = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      (window.__maGo || function (u) { location.href = u; })(url);
    });
    form.querySelectorAll('input[type=text], textarea').forEach(function (f) {
      f.addEventListener('input', function () { if (f.value.trim()) { f.classList.remove('is-err'); f.removeAttribute('aria-invalid'); } });
    });
  }

  /* ── open a hash target that lives inside a collapsed panel ── */
  if (location.hash) {
    var t = d.getElementById(location.hash.slice(1));
    if (t && t.classList.contains('reveal')) t.classList.add('in');
  }

  /* ── year ── */
  d.querySelectorAll('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
