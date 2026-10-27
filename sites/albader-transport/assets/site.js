/* البدر للنقليات — behaviour (vanilla JS, no frameworks) */
(function () {
  'use strict';

  /* ===== CONFIG: contact details live here. An empty value hides its buttons. ===== */
  var CONFIG = {
    name: 'البدر للنقليات',
    phone: '+966500033756',            // used for tel: links
    phoneShow: '+966 50 003 3756',     // how the number is written on the page
    whatsapp: '966500033756',          // wa.me number, digits only
    email: 'albaderest1@gmail.com',
    logo: 'https://blue-page-photo.nbg1.your-objectstorage.com/companies/logos/019eeab1-932e-7d31-9999-cfa9bc5e7073.jpg',
    mapUrl: '',                        // Google Maps link, once the owner sends the address
    BASE_URL: 'https://nouraldeentofi.com/sites/albader-transport/',
    MAKER: 'https://nouraldeentofi.com'
  };

  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RTL = root.dir === 'rtl', DIR = RTL ? 1 : -1;
  var mq = function (q) { return window.matchMedia(q); };
  var reduce = mq('(prefers-reduced-motion: reduce)').matches;
  var touch = mq('(hover: none)').matches;
  var isPhone = function () { return mq('(max-width: 760px)').matches; };
  var scrollTL = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  var onTheme = [];

  /* ---------- CONFIG → page ---------- */
  var waUrl = function (text) { return 'https://wa.me/' + CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : ''); };
  $$('[data-wa]').forEach(function (a) { if (!CONFIG.whatsapp) a.hidden = true; else a.href = waUrl(a.dataset.wa); });
  $$('[data-tel]').forEach(function (a) { if (!CONFIG.phone) a.hidden = true; else a.href = 'tel:' + CONFIG.phone; });
  $$('[data-mail]').forEach(function (a) { if (!CONFIG.email) a.hidden = true; else a.href = 'mailto:' + CONFIG.email; });
  $$('[data-map]').forEach(function (a) { if (CONFIG.mapUrl) a.href = CONFIG.mapUrl; });
  $$('[data-maker]').forEach(function (a) { a.href = CONFIG.MAKER; });
  $$('[data-text]').forEach(function (el) { var v = CONFIG[el.dataset.text], card = el.closest('.fc'); if (v) el.textContent = v; else if (card) card.hidden = true; });
  $$('[data-cfg]').forEach(function (el) { el.hidden = !CONFIG[el.dataset.cfg]; });
  $$('img[data-logo]').forEach(function (img) { if (!CONFIG.logo) img.remove(); else if (img.getAttribute('src') !== CONFIG.logo) img.src = CONFIG.logo; });

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }

  /* ---------- opening: the night folds into the hero's moon ---------- */
  var intro = $('#intro'), introDone = false;
  function ready() { requestAnimationFrame(function () { root.classList.add('ready'); }); }
  function leaveIntro() {
    if (introDone) return;
    introDone = true;
    var hm = $('#heroMoon'), im = $('.imoon');
    root.classList.add('handoff', 'ready');
    var r = hm.getBoundingClientRect(), ir = im.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    intro.style.setProperty('--mx', cx + 'px');
    intro.style.setProperty('--my', cy + 'px');
    intro.style.setProperty('--mr', r.width / 2 - 3 + 'px');
    im.style.setProperty('--tx', cx - (ir.left + ir.width / 2) + 'px');
    im.style.setProperty('--ty', cy - (ir.top + ir.height / 2) + 'px');
    im.style.setProperty('--ts', r.width / im.offsetWidth);
    intro.classList.add('out');
    setTimeout(function () { intro.remove(); root.classList.remove('intro-on'); }, 1000);
  }
  if (intro && root.classList.contains('intro-on')) {
    // the three roads sweep in from the bottom corner and climb into the moon, drawn at the real screen size
    (function () {
      var W = innerWidth, H = innerHeight, svg = $('.iroads', intro);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      $$('path', svg).forEach(function (p) {
        var k = p.classList.contains('r1') ? 0 : p.classList.contains('r2') ? 1 : 2, g = Math.min(26, H * 0.03);
        p.setAttribute('d', 'M' + (W + 30) + ' ' + (H * 0.92 + k * g) + 'C' + W * 0.35 + ' ' + (H * 0.95 + k * g * 0.8) + ' ' +
          W * 0.3 + ' ' + (H * 0.55 + k * g * 0.3) + ' ' + (W * 0.5 - k * 4) + ' ' + (H * 0.42 + k * 8));
      });
    })();
    var introT = setTimeout(leaveIntro, 2750);
    var skip = function () { clearTimeout(introT); leaveIntro(); };
    intro.addEventListener('click', skip);
    window.addEventListener('keydown', skip, { once: true });
  } else {
    if (intro) intro.remove();
    root.classList.remove('intro-on');
    ready();
  }

  /* ---------- moving background: route lanes with lights travelling along them ----------
     Runs on its own (never follows the pointer), 30 fps on phones, sleeps while the hero
     covers it or the tab is hidden. Reduced motion gets one still frame. */
  (function () {
    var cv = $('#lanes');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var low = touch || innerWidth < 761;
    var FPS = low ? 30 : 60, GAP = 9;
    // P0..P3 as fractions of the viewport; "triple" lanes are the logo's three swoosh lines
    var DEF = [
      { p: [[1.08, .14], [.74, .02], [.42, .44], [-.08, .3]], triple: true, ph: 0 },
      { p: [[-.08, .62], [.3, .48], [.62, .92], [1.08, .72]], triple: false, ph: 1.7 },
      { p: [[1.08, .52], [.8, .68], [.46, .3], [-.08, .52]], triple: true, ph: 3.1 },
      { p: [[.16, 1.08], [.3, .7], [.76, .62], [1.08, .3]], triple: false, ph: 4.4, desk: true },
      { p: [[1.08, .9], [.7, .76], [.3, 1.02], [-.08, .86]], triple: true, ph: 5.3 },
      { p: [[-.08, .08], [.3, .22], [.62, -.02], [1.08, .12]], triple: false, ph: 2.2, desk: true }
    ].filter(function (d) { return !(low && d.desk); });
    var W = 0, H = 0, raf = 0, last = 0, col = null, hero = $('.hero'), scrolledAt = 0;
    // while the page itself is moving, the lanes hold still so scrolling stays smooth on phones
    window.addEventListener('scroll', function () { scrolledAt = performance.now(); }, { passive: true });
    var movers = [];
    DEF.forEach(function (d, i) {
      var n = d.triple ? 2 : 1;
      for (var k = 0; k < n; k++) movers.push({ lane: i, t: Math.random(), v: (0.03 + Math.random() * 0.03) * (k ? 0.8 : 1), off: d.triple && k ? 2 : 0 });
    });
    var glow = document.createElement('canvas');
    glow.width = glow.height = 48;
    function paintGlow(rgb) {
      var g = glow.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.clearRect(0, 0, 48, 48);
      gr.addColorStop(0, 'rgba(255,250,235,1)');
      gr.addColorStop(0.25, 'rgba(' + rgb + ',.9)');
      gr.addColorStop(0.6, 'rgba(' + rgb + ',.25)');
      gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 48, 48);
    }
    function recolor() {
      col = root.dataset.theme === 'dark'
        ? { tri: ['rgba(232,133,58,.32)', 'rgba(208,85,58,.26)', 'rgba(178,106,58,.24)'], one: 'rgba(170,176,255,.18)', tail: '255,190,130' }
        : { tri: ['rgba(224,122,46,.28)', 'rgba(201,71,45,.2)', 'rgba(166,90,42,.19)'], one: 'rgba(47,52,136,.14)', tail: '224,122,46' };
      paintGlow(col.tail);
      draw(performance.now());
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    function pts(d, now) {
      var s = now / 1000, a = 0.035;
      return [d.p[0],
        [d.p[1][0] + Math.sin(s / 7 + d.ph) * a, d.p[1][1] + Math.cos(s / 9 + d.ph) * a],
        [d.p[2][0] + Math.cos(s / 8 + d.ph) * a, d.p[2][1] + Math.sin(s / 6 + d.ph) * a],
        d.p[3]].map(function (p) { return [p[0] * W, p[1] * H]; });
    }
    function bez(P, t) {
      var u = 1 - t;
      return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
              u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]];
    }
    function draw(now) {
      if (!col || !W) return;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      var curves = DEF.map(function (d) { return pts(d, now); });
      curves.forEach(function (P, i) {
        var d = DEF[i], n = d.triple ? 3 : 1;
        ctx.setLineDash(d.triple ? [] : [2, 10]);
        ctx.lineWidth = d.triple ? 2.2 : 1.4;
        for (var k = 0; k < n; k++) {
          var o = k * GAP;
          ctx.beginPath();
          ctx.moveTo(P[0][0], P[0][1] + o);
          ctx.bezierCurveTo(P[1][0], P[1][1] + o, P[2][0], P[2][1] + o, P[3][0], P[3][1] + o);
          ctx.strokeStyle = d.triple ? col.tri[k] : col.one;
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
      ctx.lineWidth = 2.6;
      movers.forEach(function (m) {
        var P = curves[m.lane], o = m.off * GAP, prev = null;
        for (var j = 12; j >= 0; j--) {
          var tt = m.t - j * 0.006;
          if (tt < 0) continue;
          var q = bez(P, tt);
          if (prev) {
            ctx.strokeStyle = 'rgba(' + col.tail + ',' + ((1 - j / 12) * 0.55).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1] + o); ctx.lineTo(q[0], q[1] + o); ctx.stroke();
          }
          prev = q;
        }
        var h = bez(P, m.t);
        ctx.drawImage(glow, h[0] - 12, h[1] + o - 12, 24, 24);
      });
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS - 2) return;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      movers.forEach(function (m) { m.t += m.v * dt; if (m.t > 1) m.t -= 1; });
      if (low && now - scrolledAt < 180) return;
      if (hero && hero.getBoundingClientRect().bottom > innerHeight + 60) return; // hidden behind the hero's sky
      draw(now);
    }
    function start() { if (!raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    var rT = 0, lastW = innerWidth, lastH = innerHeight;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        // phones resize on every address-bar show/hide: ignore small height-only changes
        if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140) return;
        lastW = innerWidth; lastH = innerHeight; size();
      }, 150);
    });
    onTheme.push(recolor);
    size(); recolor(); start();
  })();

  /* ---------- header, progress line, hero parallax fallback ---------- */
  var top = $('#top'), progress = $('.progress i');
  var parMoon = $('.par-moon'), parCopy = $('.par-copy'), parScene = $('.par-scene');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    top.classList.toggle('scrolled', y > 12);
    if (isPhone() && !root.classList.contains('locked')) {
      if (y > lastY + 6 && y > 160) top.classList.add('hide');
      else if (y < lastY - 6 || y < 160) top.classList.remove('hide');
    } else top.classList.remove('hide');
    lastY = y;
    if (!scrollTL) {
      var max = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
      if (!reduce && y < innerHeight * 1.2) {
        var k = Math.min(1, y / innerHeight);
        parMoon.style.transform = 'translateY(' + k * 140 + 'px) scale(' + (1 - k * 0.08) + ')';
        parScene.style.transform = 'translateY(' + k * 60 + 'px)';
        if (!isPhone()) {
          parCopy.style.transform = 'translateY(' + -k * 60 + 'px) scale(' + (1 - k * 0.04) + ')';
          parCopy.style.opacity = 1 - k * 0.85;
        }
      }
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  if (isPhone()) $('#svcRow').classList.add('rv');
  else $$('#svcRow > .svc-cell').forEach(function (c, i) { c.classList.add('rv'); c.style.setProperty('--rd', i * 120 + 'ms'); });
  $$('.steps > li').forEach(function (c, i) { c.style.setProperty('--rd', i * 110 + 'ms'); });
  $$('[data-stagger]').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.classList.add('rv'); c.style.setProperty('--rd', (i % 6) * 100 + 'ms'); });
  });
  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  $$('.rv, .rv-x, .sec-head').forEach(function (el) { if (revealIO) revealIO.observe(el); else el.classList.add('in'); });

  /* ---------- pause looping art while it is off screen ---------- */
  var vis = {};
  var pauseIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var off = !e.isIntersecting;
      vis[e.target.id] = !off;
      e.target.classList.toggle('paused', off);
      $$('svg', e.target).forEach(function (s) { if (s.pauseAnimations) { if (off || reduce) s.pauseAnimations(); else s.unpauseAnimations(); } });
    });
  }, { rootMargin: '100px 0px' });
  ['home', 'services', 'how', 'madinah'].forEach(function (id) { var el = document.getElementById(id); if (el) pauseIO.observe(el); });
  // less motion: SMIL ignores the media query, so park the map and the network at their "arrived" frame
  if (reduce) $$('svg').forEach(function (s) {
    if (!s.pauseAnimations || !s.querySelector('animate, animateMotion')) return;
    s.pauseAnimations();
    try { s.setCurrentTime(s.closest('.rc-scene') ? 7.5 : 4.6); } catch (e) {}
  });

  /* ---------- services: swipe row on phones, the centred card leads ---------- */
  (function () {
    var row = $('#svcRow'), dotsEl = $('#svcDots');
    if (!row) return;
    var cells = $$('.svc-cell', row), cur = 0, hold = 0, t = false;
    cells.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'الخدمة ' + (i + 1));
      b.addEventListener('click', function () { hold = Date.now() + 9000; go(i); });
      dotsEl.appendChild(b);
    });
    var dots = $$('button', dotsEl);
    function mark() {
      var rr = row.getBoundingClientRect(), mid = rr.left + rr.width / 2, best = 0, bd = Infinity;
      cells.forEach(function (c, i) { var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cur = best;
      cells.forEach(function (c, i) { c.classList.toggle('is-center', i === best); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === best); d.setAttribute('aria-selected', i === best); });
    }
    function go(i) {
      var rr = row.getBoundingClientRect(), r = cells[i].getBoundingClientRect();
      row.scrollBy({ left: (r.left + r.width / 2) - (rr.left + rr.width / 2), behavior: reduce ? 'auto' : 'smooth' });
    }
    row.addEventListener('scroll', function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; mark(); }); } }, { passive: true });
    ['touchstart', 'pointerdown', 'wheel'].forEach(function (ev) { row.addEventListener(ev, function () { hold = Date.now() + 9000; }, { passive: true }); });
    mark();
    window.addEventListener('resize', mark);
    if (!reduce) setInterval(function () {
      if (!isPhone() || !vis.services || Date.now() < hold || document.hidden) return;
      go((cur + 1) % cells.length);
    }, 4800);
  })();

  /* ---------- how we work: the truck drives from step to step ---------- */
  (function () {
    var lis = $$('.steps > li'), steps = lis.map(function (li) { return $('.step', li); });
    var rigD = $('.track .rig'), stops = $$('.track .stop'), rigM = $('.vtrack .rig');
    var i = 0, hold = 0;
    function set(n) {
      i = n;
      steps.forEach(function (s, k) { s.classList.toggle('on', k === n); });
      stops.forEach(function (s, k) { s.classList.toggle('done', k <= n); });
      if (rigD && rigD.offsetParent) rigD.style.transform = 'translateX(' + -DIR * n * rigD.parentElement.clientWidth / 3 + 'px)';
      if (rigM && rigM.offsetParent) {
        var li = lis[n], vt = rigM.parentElement;
        rigM.style.transform = 'translateY(' + (li.offsetTop - vt.offsetTop + li.offsetHeight / 2 - rigM.offsetHeight / 2) + 'px)';
      }
    }
    lis.forEach(function (li, k) { li.addEventListener('click', function () { hold = Date.now() + 8000; set(k); }); });
    set(0);
    window.addEventListener('resize', function () { set(i); });
    if (!reduce) setInterval(function () {
      if (!vis.how || Date.now() < hold || document.hidden) return;
      set((i + 1) % lis.length);
    }, 2600);
  })();

  /* ---------- quote form → a ready WhatsApp message ---------- */
  (function () {
    var form = $('#qform');
    if (!form) return;
    var steps = $$('.qstep', form), bars = $$('.qprog i', form);
    var back = $('.qnav .back', form), next = $('.qnav .next', form), send = $('.qnav .send', form);
    var fromI = $('#from'), toI = $('#to'), detI = $('#details'), nameI = $('#name');
    var NAMES = ['الخدمة', 'التفاصيل', 'الوصف والاسم'];
    var BUILD = 'مقاولات';
    var PH = {
      'نقل': 'إيش تبغى تنقل؟ الحجم أو العدد تقريباً، وأي ملاحظة',
      'خدمات لوجستية': 'وصف الشحنة والكمية تقريباً، وأي ملاحظة',
      'مقاولات': 'وصف مختصر للشغل والمساحة تقريباً',
      'شي ثاني': 'اكتب طلبك باختصار'
    };
    var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    var DN = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    var TIMES = [
      { v: 'الصباح', s: 'من 8 إلى 12', i: 'i-sunrise' },
      { v: 'الظهر', s: 'من 12 إلى 3', i: 'i-sun' },
      { v: 'العصر', s: 'من 3 إلى 6', i: 'i-sunset' },
      { v: 'بالليل', s: 'من 6 إلى 10', i: 'i-moon' },
      { v: 'أي وقت', s: '', i: 'i-clock' }
    ];
    var S = { service: '', from: '', to: '', date: null, flex: false, time: '', details: '', name: '' };
    var cur = 1;

    var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
    var today = (function () {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    })();
    var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
    var same = function (a, b) { return !!(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    var nextDow = function (dow) { var d = addDays(today, 1); while (d.getDay() !== dow) d = addDays(d, 1); return d; };
    var dateText = function () { return S.flex ? 'مرن' : S.date ? DAYS[S.date.getDay()] + ' ' + S.date.getDate() + ' ' + MONTHS[S.date.getMonth()] : ''; };
    var timeText = function () { var t = TIMES.filter(function (x) { return x.v === S.time; })[0]; return t ? (t.s ? t.v + ' (' + t.s + ')' : t.v) : ''; };

    /* live preview (chat bubble on desktop, summary on phones) */
    var lines = {};
    $$('#bubble .ln[data-k]').forEach(function (l) { lines[l.dataset.k] = l; });
    function val(k) { return k === 'date' ? dateText() : k === 'time' ? timeText() : S[k]; }
    function update(k, flash) {
      var build = S.service === BUILD;
      var L = { service: 'الخدمة', from: build ? 'المشروع' : 'من', to: build ? 'نوع الشغل' : 'إلى', date: 'الموعد', time: 'الوقت', details: 'التفاصيل', name: 'الاسم' };
      Object.keys(lines).forEach(function (key) {
        var l = lines[key], v = val(key);
        l.textContent = L[key] + ': ';
        if (v) l.appendChild(document.createTextNode(v));
        else { var i = document.createElement('i'); i.textContent = '—'; l.appendChild(i); }
      });
      if (flash && lines[k]) { lines[k].classList.remove('fresh'); void lines[k].offsetWidth; lines[k].classList.add('fresh'); }
      $('#sumService').textContent = S.service || '—';
      $('#sumRoute').textContent = !S.from && !S.to ? '—' : build ? [S.from, S.to].filter(Boolean).join(' · ') : (S.from || '—') + ' ← ' + (S.to || '—');
      $('#sumWhen').textContent = [dateText(), timeText()].filter(Boolean).join(' · ') || '—';
    }

    function applyService() {
      var build = S.service === BUILD;
      $$('.lbl-wrap', form).forEach(function (w) {
        var a = $('.la', w), b = $('.lb', w);
        a.style.opacity = build ? 0 : 1; b.style.opacity = build ? 1 : 0;
        a.setAttribute('aria-hidden', build); b.setAttribute('aria-hidden', !build);
      });
      toI.placeholder = build ? 'اكتب نوع الشغل باختصار' : 'المدينة أو الحي';
      detI.placeholder = PH[S.service] || PH['نقل'];
    }
    function pickService(value) {
      var r = $('input[name=service][value="' + value + '"]', form);
      if (!r) return;
      r.checked = true;
      S.service = value;
      applyService();
      update('service', true);
      clearErr('f-service');
    }
    $$('input[name=service]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        pickService(r.value);
        if (isPhone() && cur === 1) setTimeout(function () { show(2); }, 380);
      });
    });
    // "اطلب عرض سعر" on a service card arrives with that service chosen
    $$('[data-service]').forEach(function (a) {
      a.addEventListener('click', function () { pickService(a.dataset.service); if (isPhone()) show(2); });
    });

    [[fromI, 'from'], [toI, 'to'], [detI, 'details'], [nameI, 'name']].forEach(function (p) {
      p[0].addEventListener('input', function () { S[p[1]] = p[0].value.trim(); update(p[1]); if (S[p[1]]) clearErr(p[0].closest('.field').id); });
      p[0].addEventListener('change', function () { update(p[1], true); });
    });
    fromI.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); toI.focus(); } });
    toI.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); toI.blur(); } });

    /* ----- pickers: popover on desktop, bottom sheet on phones ----- */
    var sheet = $('#sheet'), sheetBody = $('#sheetBody'), sheetTitle = $('#sheetTitle');
    var openKind = null, openBtn = null, view = null;
    var pops = { date: $('#datePop'), time: $('#timePop') };
    function setVal(k) {
      var el = k === 'date' ? $('#dateVal') : $('#timeVal'), t = k === 'date' ? dateText() : timeText();
      el.textContent = t || (k === 'date' ? 'اختار اليوم' : 'اختار الوقت');
      el.classList.toggle('ph', !t);
      update(k, true);
    }
    function closePicker(focusBack) {
      if (!openKind) return;
      pops[openKind].classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
      if (sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        sheet.setAttribute('aria-hidden', 'true');
        root.classList.remove('locked');
      }
      var b = openBtn;
      openKind = null; openBtn = null;
      if (focusBack) b.focus({ preventScroll: true });
    }
    function openPicker(kind, btn) {
      if (openKind === kind) { closePicker(true); return; }
      closePicker(false);
      openKind = kind; openBtn = btn;
      btn.setAttribute('aria-expanded', 'true');
      var phone = isPhone(), host = phone ? sheetBody : pops[kind];
      host.innerHTML = '';
      host.appendChild(kind === 'date' ? buildCal() : buildTimes());
      if (phone) {
        sheetTitle.textContent = kind === 'date' ? 'متى تبغى الخدمة؟' : 'أي وقت يناسبك؟';
        sheet.classList.add('open');
        sheet.setAttribute('aria-hidden', 'false');
        root.classList.add('locked');
      } else host.classList.add('open');
      requestAnimationFrame(function () {
        var f = host.querySelector('[aria-selected=true]:not(:disabled)') || host.querySelector('.opt, .cal-grid button:not(:disabled)');
        if (f) f.focus({ preventScroll: true });
      });
    }
    $('#datePick').addEventListener('click', function () { openPicker('date', this); });
    $('#timePick').addEventListener('click', function () { openPicker('time', this); });
    $$('[data-close]', sheet).forEach(function (b) { b.addEventListener('click', function () { closePicker(true); }); });
    document.addEventListener('pointerdown', function (e) {
      if (!openKind || isPhone()) return;
      if (!e.target.closest('#f-date, #f-time')) closePicker(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openKind) closePicker(true); });

    function listKeys(e, items) {
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i > -1) items[i].click(); }
    }
    function buildTimes() {
      var box = document.createElement('div');
      box.className = 'opts';
      box.setAttribute('role', 'listbox');
      box.setAttribute('aria-label', 'الوقت');
      TIMES.forEach(function (t) {
        var o = document.createElement('div');
        o.className = 'opt';
        o.setAttribute('role', 'option');
        o.tabIndex = -1;
        o.setAttribute('aria-selected', S.time === t.v);
        o.innerHTML = ico(t.i) + '<span>' + t.v + '</span>' + (t.s ? '<small>' + t.s + '</small>' : '') + ico('i-check', 'ok');
        o.addEventListener('click', function () { S.time = t.v; setVal('time'); closePicker(true); });
        box.appendChild(o);
      });
      box.addEventListener('keydown', function (e) { listKeys(e, $$('.opt', box)); });
      return box;
    }
    function iconBtn(id, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.innerHTML = ico(id);
      return b;
    }
    function buildCal() {
      var base = S.date || today;
      if (!view) view = new Date(base.getFullYear(), base.getMonth(), 1);
      var box = document.createElement('div');
      box.className = 'cal';
      var chips = document.createElement('div');
      chips.className = 'cal-chips';
      [['اليوم', today], ['بكرة', addDays(today, 1)], ['الخميس', nextDow(4)], ['السبت', nextDow(6)], ['مرن', 'flex']].forEach(function (c) {
        var b = document.createElement('button'), on = c[1] === 'flex' ? S.flex : !S.flex && same(S.date, c[1]);
        b.type = 'button';
        b.className = 'chip' + (on ? ' on' : '');
        b.textContent = c[0];
        b.setAttribute('aria-pressed', on);
        b.addEventListener('click', function () {
          if (c[1] === 'flex') { S.flex = true; S.date = null; } else { S.flex = false; S.date = c[1]; }
          view = null; setVal('date'); closePicker(true);
        });
        chips.appendChild(b);
      });
      var head = document.createElement('div'), title = document.createElement('b');
      var prev = iconBtn(RTL ? 'i-right' : 'i-left', 'الشهر السابق'), nxt = iconBtn(RTL ? 'i-left' : 'i-right', 'الشهر الجاي');
      head.className = 'cal-head';
      title.setAttribute('aria-live', 'polite');
      head.append(prev, title, nxt);
      var grid = document.createElement('div');
      grid.className = 'cal-grid';
      box.append(chips, head, grid);
      function render(focusDay) {
        title.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
        prev.disabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
        grid.innerHTML = DN.map(function (d) { return '<span class="dn" aria-hidden="true">' + d + '</span>'; }).join('');
        var first = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        for (var k = 0; k < first; k++) grid.appendChild(document.createElement('span'));
        for (var d = 1; d <= days; d++) {
          (function (d) {
            var date = new Date(view.getFullYear(), view.getMonth(), d), b = document.createElement('button');
            b.type = 'button';
            b.textContent = d;
            b.dataset.d = d;
            b.tabIndex = -1;
            b.setAttribute('aria-label', DAYS[date.getDay()] + ' ' + d + ' ' + MONTHS[date.getMonth()]);
            if (date < today) b.disabled = true;
            if (same(date, today)) b.classList.add('today');
            b.setAttribute('aria-selected', !S.flex && same(date, S.date));
            b.addEventListener('click', function () { S.flex = false; S.date = date; view = null; setVal('date'); closePicker(true); });
            grid.appendChild(b);
          })(d);
        }
        // always six weeks, so the calendar keeps one height from month to month
        for (var f = first + days; f < 42; f++) { var sp = document.createElement('span'); sp.style.height = '44px'; grid.appendChild(sp); }
        if (focusDay) { var fb = grid.querySelector('button[data-d="' + focusDay + '"]'); if (fb && !fb.disabled) fb.focus(); }
      }
      prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
      nxt.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
      grid.addEventListener('keydown', function (e) {
        var b = e.target.closest('button'), map = { ArrowRight: RTL ? -1 : 1, ArrowLeft: RTL ? 1 : -1, ArrowDown: 7, ArrowUp: -7 };
        if (!b || !(e.key in map)) return;
        e.preventDefault();
        var d = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d + map[e.key]);
        if (d < today) return;
        if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
        render(d.getDate());
      });
      render();
      return box;
    }

    /* ----- phone steps ----- */
    function show(n) {
      cur = n;
      steps.forEach(function (fs) { var k = +fs.dataset.step; fs.classList.toggle('cur', k === n); fs.classList.toggle('prev', k < n); });
      bars.forEach(function (b, k) { b.classList.toggle('on', k < n); });
      $('#qNo').textContent = n;
      $('#qName').textContent = NAMES[n - 1];
      back.disabled = n === 1;
      next.classList.toggle('off', n === 3);
      send.classList.toggle('off', n !== 3);
      next.tabIndex = n === 3 ? -1 : 0;
      send.tabIndex = n === 3 ? 0 : -1;
      update();
    }
    function bad(id) {
      var f = document.getElementById(id);
      f.classList.add('bad');
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
    }
    function clearErr(id) { var f = document.getElementById(id); if (f) f.classList.remove('bad'); }
    var REQ = [[1, 'f-service', function () { return S.service; }, function () { return $('#sv1'); }],
               [2, 'f-from', function () { return S.from; }, function () { return fromI; }],
               [3, 'f-name', function () { return S.name; }, function () { return nameI; }]];
    function check(step) {
      var first = null;
      REQ.forEach(function (r) {
        if (step && r[0] !== step) return;
        if (!r[2]()) { bad(r[1]); if (!first) first = r; }
      });
      if (first) {
        var el = first[3]();
        if (isPhone() && !step) show(first[0]);
        el.focus({ preventScroll: true });
        if (!isPhone()) el.closest('.field').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
      return !first;
    }
    next.addEventListener('click', function () { if (check(cur)) show(Math.min(3, cur + 1)); });
    back.addEventListener('click', function () { show(Math.max(1, cur - 1)); });
    $$('[data-goto]', form).forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.goto); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check(0)) return;
      var build = S.service === BUILD;
      var rows = [['الخدمة', S.service], [build ? 'المشروع' : 'من', S.from], [build ? 'نوع الشغل' : 'إلى', S.to],
                  ['الموعد', dateText()], ['الوقت', timeText()], ['التفاصيل', S.details], ['الاسم', S.name]]
        .filter(function (r) { return r[1]; });
      var msg = 'السلام عليكم، أبغى عرض سعر من ' + CONFIG.name + '\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n');
      var url = waUrl(msg), w = window.open(url, '_blank');
      if (w) w.opener = null; else location.href = url;
      toast('فتحنا لك الواتساب، باقي تضغط إرسال');
    });

    show(1);
  })();

  /* ---------- bottom dock: follows the section, steps aside for the form ---------- */
  (function () {
    var dock = $('#dock');
    if (!dock) return;
    var ind = $('.ind', dock), tabs = $$('a[data-sec]', dock), navs = $$('.nav a[data-sec]');
    var MAP = { home: 'home', services: 'services', how: 'how', madinah: 'how', quote: 'quote', faq: 'faq', contact: 'contact' };
    var active = 'home', inForm = false, typing = false;
    function place() {
      var a = tabs.filter(function (t) { return t.dataset.sec === active && !t.classList.contains('mid'); })[0];
      tabs.forEach(function (t) { t.classList.toggle('on', t.dataset.sec === active); });
      if (a) { ind.style.setProperty('--x', a.offsetLeft + 'px'); ind.style.setProperty('--w', a.offsetWidth + 'px'); ind.classList.add('on'); }
      else ind.classList.remove('on');
      navs.forEach(function (n) { n.classList.toggle('on', n.dataset.sec === active); });
    }
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { active = MAP[e.target.id] || ''; place(); } });
    }, { rootMargin: '-48% 0px -48% 0px' });
    Object.keys(MAP).forEach(function (id) { var el = document.getElementById(id); if (el) secIO.observe(el); });
    var sync = function () { dock.classList.toggle('away', inForm || typing); };
    new IntersectionObserver(function (es) { inForm = es[0].isIntersecting; sync(); }, { rootMargin: '-30% 0px -30% 0px' }).observe($('#qform'));
    document.addEventListener('focusin', function (e) { if (e.target.matches('input[type=text], textarea')) { typing = true; sync(); } });
    document.addEventListener('focusout', function () { typing = false; setTimeout(sync, 60); });
    window.addEventListener('resize', place);
    place();
  })();

  /* ---------- FAQ ---------- */
  $$('.qa h3 button').forEach(function (b) {
    b.addEventListener('click', function () {
      var qa = b.closest('.qa'), open = !qa.classList.contains('open');
      qa.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- copy number / email ---------- */
  function legacyCopy(t) {
    var a = document.createElement('textarea'), ok = false;
    a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(a); a.select();
    try { ok = document.execCommand('copy'); } catch (e) {}
    a.remove();
    return ok;
  }
  $$('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.previousElementSibling.textContent.trim(), done = function () { toast(b.dataset.msg || 'تم النسخ'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
      else { legacyCopy(text); done(); }
    });
  });

  /* ---------- theme: the new look spreads out from the moon button ---------- */
  var themeBtn = $('.theme'), metaTheme = $('meta[name=theme-color]');
  function syncTheme() {
    var dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-pressed', dark);
    themeBtn.setAttribute('aria-label', dark ? 'الوضع النهاري' : 'الوضع الليلي');
    metaTheme.content = dark ? '#0B0D27' : '#F3F3FA';
    onTheme.forEach(function (f) { f(); });
  }
  themeBtn.addEventListener('click', function () {
    var nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    var apply = function () {
      root.dataset.theme = nextTheme;
      try { localStorage.setItem('albader-theme', nextTheme); } catch (e) {}
      syncTheme();
    };
    if (!document.startViewTransition || reduce) { apply(); return; }
    var r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(.65,0,.25,1)', pseudoElement: '::view-transition-new(root)' });
    });
  });
  syncTheme();
})();
