/* ==========================================================================
   Salam Aksimi — site.js  (vanilla, no frameworks)
   Language + theme switches, motion, swipe rows, carousels, sheets, dropdown,
   mailto form, cards that react to the pointer, and the living "threads & sparks" background.
   ========================================================================== */
(function () {
  "use strict";

  var d = document, root = d.documentElement, body = d.body;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqPhone = window.matchMedia("(max-width: 767px)");
  var mqTouch = window.matchMedia("(hover: none)");
  var reduced = function () { return mqReduce.matches; };
  var SDA = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
  var VIEW_TL = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
  if (!SDA) root.classList.add("no-sda");
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var lang = function () { return root.lang === "en" ? "en" : "ar"; };
  var isRTL = function () { return root.dir === "rtl"; };
  function emit(name) { d.dispatchEvent(new CustomEvent(name)); }

  /* ---------------------------------------------------------------- language */
  function applyLang(l) {
    root.lang = l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    var t = root.getAttribute("data-title-" + l); if (t) d.title = t;
    var desc = root.getAttribute("data-desc-" + l), md = $('meta[name="description"]');
    if (desc && md) md.setAttribute("content", desc);
    $$("a[data-ar][data-en]").forEach(function (a) { a.setAttribute("href", a.getAttribute("data-" + l)); });
    $$("img[data-alt-ar]").forEach(function (im) { im.alt = im.getAttribute("data-alt-" + l) || ""; });
    $$("[data-ph-ar]").forEach(function (el) { el.placeholder = el.getAttribute("data-ph-" + l) || ""; });
    $$("[data-aria-ar]").forEach(function (el) { el.setAttribute("aria-label", el.getAttribute("data-aria-" + l)); });
    $$("[data-set-lang]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-set-lang") === l ? "true" : "false"); b.classList.toggle("is-on", b.getAttribute("data-set-lang") === l); });
    emit("sa:lang");
  }
  function setLang(l) { store.set("sa-lang", l); applyLang(l); toast(l === "ar" ? "العربية" : "English"); }
  $$("[data-lang-toggle]").forEach(function (b) { b.addEventListener("click", function () { setLang(lang() === "ar" ? "en" : "ar"); }); });
  $$("[data-set-lang]").forEach(function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-set-lang")); }); });
  if (root.getAttribute("data-default-lang") !== lang() || true) applyLang(lang());

  /* ---------------------------------------------------------------- theme */
  var themeMeta = $("meta[data-theme-color]");
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    if (themeMeta) themeMeta.setAttribute("content", t === "dark" ? "#14131D" : "#F6F1EB");
    $$("[data-theme-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", t === "dark" ? "true" : "false"); });
    $$("[data-set-theme]").forEach(function (b) { var on = b.getAttribute("data-set-theme") === t; b.setAttribute("aria-pressed", on ? "true" : "false"); b.classList.toggle("is-on", on); });
    emit("sa:theme");
  }
  function setTheme(t) { store.set("sa-theme", t); applyTheme(t); }
  $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", function () { setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); }); });
  $$("[data-set-theme]").forEach(function (b) { b.addEventListener("click", function () { setTheme(b.getAttribute("data-set-theme")); }); });
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  /* ---------------------------------------------------------------- toast */
  var toastEl = $("[data-toast]"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 1800);
  }

  /* ---------------------------------------------------------------- scroll lock */
  var locks = 0;
  function lock() { locks++; root.classList.add("lock"); }
  function unlock() { locks = Math.max(0, locks - 1); if (!locks) root.classList.remove("lock"); }

  /* ---------------------------------------------------------------- header + progress + parallax fallback */
  var hdr = $("[data-hdr]"), dock = $("[data-dock]"), lastY = window.scrollY, ticking = false;
  var progress = $(".progress span");
  var heroVisual = $("[data-hero-visual]"), heroCopy = $("[data-hero-copy]");
  var tlEl = $("[data-tl]"), tlFill = tlEl ? $(".tl-fill", tlEl) : null;
  function onScroll() {
    var y = window.scrollY, dy = y - lastY;
    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 8);
      if (mqPhone.matches && !root.classList.contains("lock")) {
        if (dy > 6 && y > 140) hdr.classList.add("is-hidden");
        else if (dy < -6 || y < 80) hdr.classList.remove("is-hidden");
      } else hdr.classList.remove("is-hidden");
    }
    if (!SDA && !reduced()) {
      var max = Math.max(1, d.documentElement.scrollHeight - innerHeight);
      if (progress) progress.style.setProperty("--p", Math.min(1, y / max).toFixed(4));
      var vh = innerHeight, k = Math.min(1, y / (vh * 0.9));
      if (heroVisual) heroVisual.style.transform = "translateY(" + (-7 * k) + "vh) scale(" + (1 - 0.07 * k) + ")", heroVisual.style.opacity = String(1 - 0.65 * k);
      if (heroCopy) heroCopy.style.transform = "translateY(" + (-3 * k) + "vh) scale(" + (1 - 0.02 * k) + ")", heroCopy.style.opacity = String(1 - 0.75 * k);
    }
    if ((!VIEW_TL || !SDA) && tlEl && !reduced()) {
      var tr = tlEl.getBoundingClientRect(), p = (innerHeight * .85 - tr.top) / (tr.height + innerHeight * .7);
      tlFill.style.setProperty("--tl", Math.max(0, Math.min(1, p)).toFixed(3));
    }
    lastY = y; ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* large title → bar title (phones): once the page's big title slides under the header, its short name takes the brand's place */
  var bigTitle = $(".phero-title");
  if (hdr && bigTitle && $(".hdr-ptitle", hdr) && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var e = es[0]; hdr.classList.toggle("is-titled", !e.isIntersecting && e.boundingClientRect.top < 100);
    }, { rootMargin: "-56px 0px 0px 0px", threshold: 0 }).observe(bigTitle);
  }

  /* swipe rows that only scroll on small screens become focusable (keyboard) only while they do scroll */
  var hRows = $$("[data-hscroll]");
  function syncHRows() { hRows.forEach(function (r) { if (r.scrollWidth > r.clientWidth + 2) r.setAttribute("tabindex", "0"); else r.removeAttribute("tabindex"); }); }
  if (hRows.length) { syncHRows(); var hrT = 0; window.addEventListener("resize", function () { clearTimeout(hrT); hrT = setTimeout(syncHRows, 150); }); }

  /* ---------------------------------------------------------------- reveal on scroll */
  var revealEls = $$("[data-reveal],[data-reveal-stagger],.tl-item,.stage-art,.d-art,.thread-div,.cta-panel");
  $$("[data-reveal-stagger]").forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { if (!c.style.getPropertyValue("--i")) c.style.setProperty("--i", i); }); });
  if ("IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.01 });
    revealEls.forEach(function (el) { rio.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------------------------------------------------------------- count-up numbers */
  var nums = $$(".num[data-count]");
  if (nums.length && "IntersectionObserver" in window) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return; nio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute("data-count"), pre = el.getAttribute("data-prefix") || "", v = $(".num-val", el);
        if (reduced()) { v.textContent = pre + to; return; }
        var t0 = performance.now(), dur = 1300;
        (function step(t) {
          var p = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
          v.textContent = pre + Math.round(to * ease);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { $(".num-val", n).textContent = (n.getAttribute("data-prefix") || "") + "0"; nio.observe(n); });
  }

  /* ---------------------------------------------------------------- pause animations off screen */
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-paused", !e.isIntersecting); });
    }, { rootMargin: "80px" });
    $$("[data-hero],.cta-panel,.ftr,.sec-story,.sec-about,.quote-band,.thread-div,.d-photo").forEach(function (el) { pio.observe(el); });
  }

  /* ---------------------------------------------------------------- swipe rows (phones) */
  $$("[data-rail]").forEach(function (rail) {
    var dotsWrap = rail.parentElement.querySelector("[data-rail-dots]"), items = Array.prototype.slice.call(rail.children), dots = [];
    if (dotsWrap) { dotsWrap.innerHTML = ""; items.forEach(function () { var i = d.createElement("i"); dotsWrap.appendChild(i); dots.push(i); }); }
    var raf = 0, moveT = 0;
    function update() {
      raf = 0;
      /* the stylesheet decides when a rail is a swipe row (phones, and three-up rails on small tablets) */
      var swipe = getComputedStyle(rail).display === "flex";
      rail.classList.toggle("is-swipe", swipe);
      if (!swipe) { items.forEach(function (it) { it.style.removeProperty("--c"); }); return; }
      var r = rail.getBoundingClientRect(), c = r.left + r.width / 2, best = 0, bestD = 1e9;
      items.forEach(function (it, i) {
        var b = it.getBoundingClientRect(), dd = Math.abs(b.left + b.width / 2 - c);
        if (dd < bestD) { bestD = dd; best = i; }
        it.style.setProperty("--c", Math.min(1, dd / (r.width * 0.8)).toFixed(3));
      });
      dots.forEach(function (dt, i) { dt.classList.toggle("is-on", i === best); });
    }
    rail.addEventListener("scroll", function () {
      rail.classList.add("is-moving"); clearTimeout(moveT); moveT = setTimeout(function () { rail.classList.remove("is-moving"); }, 160);
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(update); });
    d.addEventListener("sa:lang", function () { setTimeout(update, 60); });
    update();
  });

  /* ---------------------------------------------------------------- carousel (auto-rotates, swipeable) */
  $$("[data-carousel]").forEach(function (car) {
    var track = $("[data-car-track]", car), cards = Array.prototype.slice.call(track.children), dotsWrap = $("[data-car-dots]", car), dots = [];
    cards.forEach(function () { var i = d.createElement("i"); dotsWrap.appendChild(i); dots.push(i); });
    var idx = 0, timer = null, paused = false, visible = false, interacted = false;
    var every = (+car.getAttribute("data-auto") || 7000) / (window.saSpeed || 1);
    function perView() { return mqPhone.matches ? 1 : 2; }
    function maxIdx() { return Math.max(0, cards.length - perView()); }
    function current() {
      var tr = track.getBoundingClientRect(), best = 0, bestD = 1e9;
      cards.forEach(function (c, i) {
        var b = c.getBoundingClientRect();
        var edge = mqPhone.matches ? Math.abs(b.left + b.width / 2 - (tr.left + tr.width / 2)) : Math.abs((isRTL() ? b.right - tr.right : b.left - tr.left));
        if (edge < bestD) { bestD = edge; best = i; }
      });
      return best;
    }
    function go(i) {
      i = Math.max(0, Math.min(i, mqPhone.matches ? cards.length - 1 : maxIdx()));
      var c = cards[i], tr = track.getBoundingClientRect(), b = c.getBoundingClientRect(), delta;
      if (mqPhone.matches) delta = (b.left + b.width / 2) - (tr.left + tr.width / 2);
      else delta = isRTL() ? (b.right - tr.right) : (b.left - tr.left);
      track.scrollBy({ left: delta, behavior: reduced() ? "auto" : "smooth" });
      idx = i; paint();
    }
    function paint() { dots.forEach(function (dt, i) { dt.classList.toggle("is-on", i === idx); }); }
    function next() { var m = mqPhone.matches ? cards.length - 1 : maxIdx(); go(idx >= m ? 0 : idx + 1); }
    function prev() { var m = mqPhone.matches ? cards.length - 1 : maxIdx(); go(idx <= 0 ? m : idx - 1); }
    function start() { stop(); if (reduced() || paused || !visible) return; timer = setInterval(next, every); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    $("[data-car-next]", car).addEventListener("click", function () { next(); start(); });
    $("[data-car-prev]", car).addEventListener("click", function () { prev(); start(); });
    var st = 0;
    track.addEventListener("scroll", function () { clearTimeout(st); st = setTimeout(function () { idx = current(); paint(); }, 90); }, { passive: true });
    car.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { paused = true; stop(); } });
    car.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { paused = false; start(); } });
    car.addEventListener("focusin", function () { paused = true; stop(); });
    car.addEventListener("focusout", function () { paused = false; start(); });
    track.addEventListener("touchstart", function () { stop(); }, { passive: true });
    track.addEventListener("touchend", function () { setTimeout(start, 2500); }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.25 }).observe(car);
    d.addEventListener("visibilitychange", function () { d.hidden ? stop() : start(); });
    d.addEventListener("sa:lang", function () { setTimeout(function () { go(idx); }, 80); });
    paint();
  });

  /* ---------------------------------------------------------------- segmented controls / tabs + stacked states */
  $$("[data-seg-group]").forEach(function (seg) {
    var group = seg.getAttribute("data-seg-group"), btns = $$("button", seg), thumb = $(".seg-thumb", seg);
    var stacks = $$('[data-switch="' + group + '"]'), auto = (+seg.getAttribute("data-auto") || 0) / (window.saSpeed || 1), timer = null, userTouched = false, visible = false;
    var postLines = group === "anatomy" ? $$(".post-line") : [];
    function place() {
      if (!thumb) return;
      var on = btns.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0] || btns[0];
      var sr = seg.getBoundingClientRect(), br = on.getBoundingClientRect(), pad = 5, x;
      x = isRTL() ? br.right - (sr.right - pad - 1) : br.left - (sr.left + pad + 1);
      seg.style.setProperty("--seg-w", br.width + "px");
      seg.style.setProperty("--seg-x", x + "px");
    }
    function select(i, focus) {
      btns.forEach(function (b, k) {
        var on = k === i; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      });
      stacks.forEach(function (st) { Array.prototype.forEach.call(st.children, function (c) { c.classList.toggle("is-on", +c.getAttribute("data-state") === i); }); });
      if (postLines.length) { var part = btns[i].getAttribute("data-part"); postLines.forEach(function (p) { p.classList.toggle("is-on", p.getAttribute("data-part") === part); }); }
      if (focus) btns[i].focus();
      place();
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { userTouched = true; stopAuto(); select(i); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, n = btns.length, fwd = isRTL() ? "ArrowLeft" : "ArrowRight", back = isRTL() ? "ArrowRight" : "ArrowLeft";
        if (k === fwd || k === back || k === "Home" || k === "End") {
          e.preventDefault(); userTouched = true; stopAuto();
          var j = k === fwd ? (i + 1) % n : k === back ? (i - 1 + n) % n : k === "Home" ? 0 : n - 1;
          select(j, true);
        }
      });
    });
    function cur() { for (var i = 0; i < btns.length; i++) if (btns[i].getAttribute("aria-selected") === "true") return i; return 0; }
    function startAuto() { stopAuto(); if (!auto || userTouched || reduced() || !visible) return; timer = setInterval(function () { select((cur() + 1) % btns.length); }, auto); }
    function stopAuto() { if (timer) clearInterval(timer); timer = null; }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? startAuto() : stopAuto(); }, { threshold: 0.3 }).observe(seg.parentElement);
    d.addEventListener("visibilitychange", function () { d.hidden ? stopAuto() : startAuto(); });
    window.addEventListener("resize", place);
    d.addEventListener("sa:lang", function () { requestAnimationFrame(place); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(place);
    select(cur());
  });

  /* ---------------------------------------------------------------- credentials filter (highlight, no reflow) */
  var credFilter = $("[data-cred-filter]");
  if (credFilter) {
    var cbtns = $$("button", credFilter), ccards = $$("[data-cred-grid] > li");
    cbtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        cbtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        ccards.forEach(function (c) { c.classList.toggle("is-dim", f !== "all" && c.getAttribute("data-group") !== f); });
      });
    });
  }

  /* ---------------------------------------------------------------- expanders ("عرض التفاصيل") */
  $$(".xp-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var xp = b.closest(".xp"), open = !xp.classList.contains("is-open");
      xp.classList.toggle("is-open", open); b.setAttribute("aria-expanded", open ? "true" : "false");
      var item = b.closest(".faq-item"); if (item) item.classList.toggle("is-open", open);
    });
  });

  /* ---------------------------------------------------------------- sheets (menu + dialog) */
  var lastFocus = null;
  function focusables(el) { return $$('a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])', el).filter(function (x) { return x.offsetParent !== null || x === d.activeElement; }); }
  function openSheet(sheet, opener) {
    if (!sheet || sheet.classList.contains("is-open")) return;
    lastFocus = opener || d.activeElement;
    sheet.hidden = false; lock();
    $$('[aria-controls="' + sheet.id + '"]').forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
    if (hdr) hdr.classList.remove("is-hidden");
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add("is-open"); var f = focusables($(".sheet-panel", sheet)); if (f[0]) f[0].focus({ preventScroll: true }); }); });
  }
  function closeSheet(sheet) {
    if (!sheet || !sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    $$('[aria-controls="' + sheet.id + '"]').forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    setTimeout(function () { sheet.hidden = true; unlock(); }, reduced() ? 60 : 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $$("[data-sheet-open]").forEach(function (b) { b.addEventListener("click", function () { var s = d.getElementById(b.getAttribute("data-sheet-open")); if (s && s.classList.contains("is-open")) closeSheet(s); else openSheet(s, b); }); });
  $$("[data-sheet]").forEach(function (s) {
    $$("[data-sheet-close]", s).forEach(function (c) { c.addEventListener("click", function () { closeSheet(s); }); });
    $$("a", s).forEach(function (a) { a.addEventListener("click", function () { if (a.target !== "_blank") closeSheet(s); }); });
    s.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeSheet(s); }
      if (e.key === "Tab") { var f = focusables($(".sheet-panel", s)); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
  });
  var dlg = $("#dlg");
  $$("[data-dialog]").forEach(function (b) {
    b.addEventListener("click", function () {
      var src = d.getElementById(b.getAttribute("data-dialog")); if (!src || !dlg) return;
      $(".dlg-title", dlg).innerHTML = $(".dlg-src-title", src).innerHTML;
      $("[data-dlg-body]", dlg).innerHTML = $(".dlg-src-body", src).innerHTML;
      $$("[data-ar][data-en]", dlg).forEach(function (a) { a.setAttribute("href", a.getAttribute("data-" + lang())); });
      openSheet(dlg, b);
    });
  });

  /* ---------------------------------------------------------------- contact form → ready e-mail */
  var form = $("[data-cform]");
  if (form) {
    var status = $("[data-cform-status]", form), strings = $("[data-mail-strings]", form), radios = $$('input[name="topic"]', form);
    function syncTopics() { radios.forEach(function (r) { r.closest(".topic").classList.toggle("is-on", r.checked); }); }
    radios.forEach(function (r) { r.addEventListener("change", function () { syncTopics(); fieldOf(r).classList.remove("has-err"); }); });
    var q = new URLSearchParams(location.search).get("topic");
    if (q) { radios.forEach(function (r) { if (r.value === q) r.checked = true; }); syncTopics(); }
    function fieldOf(el) { return el.closest(".field"); }
    function picked() { return radios.filter(function (r) { return r.checked; })[0] || null; }
    function check() {
      var ok = true;
      var badT = !picked(); fieldOf(radios[0]).classList.toggle("has-err", badT); if (badT) ok = false;
      ["#f-name", "#f-msg"].forEach(function (s) { var el = $(s, form), bad = !el.value.trim(); fieldOf(el).classList.toggle("has-err", bad); if (bad) ok = false; });
      return ok;
    }
    $$("input:not([type=radio]),textarea", form).forEach(function (el) { el.addEventListener("input", function () { if (el.value.trim()) fieldOf(el).classList.remove("has-err"); }); });
    $("#f-name", form).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("#f-profile", form).focus(); } });
    $("#f-profile", form).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("#f-msg", form).focus(); } });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!check()) { var first = $(".has-err input,.has-err textarea", form); if (first) first.focus({ preventScroll: false }); return; }
      var L = lang(), g = function (k) { return strings.getAttribute("data-" + k + "-" + L); };
      var t = picked(), topic = t ? t.getAttribute("data-label-" + L) : "";
      var name = $("#f-name", form).value.trim(), prof = $("#f-profile", form).value.trim(), msg = $("#f-msg", form).value.trim();
      var subject = g("subject") + " — " + topic;
      var bodyTxt = g("name") + ": " + name + "\n" + (prof ? g("profile") + ": " + prof + "\n" : "") + g("topic") + ": " + topic + "\n\n" + msg;
      var to = body.getAttribute("data-email");
      status.classList.add("is-on");
      var url = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyTxt);
      window.saLastMailto = url;            /* handy for tests */
      if (!window.saNoMail) window.location.href = url;
    });
  }

  /* ---------------------------------------------------------------- copy e-mail */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-copy"), done = function () { toast(lang() === "ar" ? "انتسخ الإيميل" : "Email copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, done); else done();
    });
  });

  /* ---------------------------------------------------------------- phone dock: one sticky action, never twice on screen */
  if (dock && "IntersectionObserver" in window) {
    var watched = $$("[data-cta-watch],[data-cta-watch-form]"), seen = new Set(), dio = null, dioCover = -1;
    function dioCb(es) {
      es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
      dock.classList.toggle("cta-off", seen.size > 0);
      var cta = $("[data-dock-cta]", dock); if (cta) { cta.tabIndex = seen.size > 0 ? -1 : 0; cta.setAttribute("aria-hidden", seen.size > 0 ? "true" : "false"); }
    }
    /* a button hidden behind the dock does not count as "on screen": the observed area stops at the dock's top edge */
    function dioMake() {
      var r = dock.getBoundingClientRect(), cover = r.height && !dock.classList.contains("is-hidden") ? Math.max(0, Math.round(innerHeight - r.top + 16)) : 0;
      if (cover === dioCover && dio) return;
      dioCover = cover; if (dio) dio.disconnect(); seen.clear();
      dio = new IntersectionObserver(dioCb, { rootMargin: "0px 0px -" + cover + "px 0px", threshold: 0 });
      watched.forEach(function (w) { dio.observe(w); });
    }
    dioMake();
    var dioT = 0; window.addEventListener("resize", function () { clearTimeout(dioT); dioT = setTimeout(dioMake, 150); });
    var TYPING = "input:not([type=radio]):not([type=checkbox]),textarea";
    d.addEventListener("focusin", function (e) { if (e.target.matches(TYPING)) dock.classList.add("is-hidden"); });
    d.addEventListener("focusout", function (e) { if (e.target.matches(TYPING)) setTimeout(function () { if (!d.activeElement || !d.activeElement.matches(TYPING)) dock.classList.remove("is-hidden"); }, 120); });
  }

  /* ---------------------------------------------------------------- cards that notice you coming */
  var mqFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var nearCards = $$(".card:not(.cform):not(.post):not(.c-card)");
  var TILT = ".svc-card,.stage-card,.note-card,.rec-card,.stat,.cred-card,.compass-card,.learn-card,.pillar,.mod-card,.step,.skill-group,.fact,.more-card,.pn,.for-item";
  if (nearCards.length && "IntersectionObserver" in window) {
    var onScreen = new Set(), mx = -1e4, my = -1e4, nearPending = false;
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) onScreen.add(e.target); else { onScreen.delete(e.target); e.target.style.removeProperty("--near"); e.target.classList.remove("is-hot"); } });
    }, { rootMargin: "160px" });
    if (mqFine.matches) nearCards.forEach(function (c) { vio.observe(c); });
    function paintNear() {
      nearPending = false;
      onScreen.forEach(function (c) {
        var r = c.getBoundingClientRect();
        var dx = Math.max(r.left - mx, 0, mx - r.right), dy = Math.max(r.top - my, 0, my - r.bottom);
        var dist = Math.sqrt(dx * dx + dy * dy), k = Math.round(Math.max(0, 1 - dist / 200) * 100) / 100;
        if (k > 0) {
          c.style.setProperty("--px", Math.round(mx - r.left) + "px"); c.style.setProperty("--py", Math.round(my - r.top) + "px");
          c.style.setProperty("--near", k);
        } else c.style.removeProperty("--near");           /* the stylesheet decides again (touch glow) */
        var hot = dist === 0 && !reduced() && c.matches(TILT);
        if (hot) {
          var u = (mx - r.left) / r.width - .5, v = (my - r.top) / r.height - .5, amp = Math.min(7, 1600 / Math.max(r.width, 220));
          c.style.setProperty("--rx", (-v * amp).toFixed(2) + "deg"); c.style.setProperty("--ry", (u * amp).toFixed(2) + "deg");
        }
        c.classList.toggle("is-hot", hot);
      });
    }
    function queueNear() { if (!nearPending) { nearPending = true; requestAnimationFrame(paintNear); } }
    d.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse" || !mqFine.matches) return; mx = e.clientX; my = e.clientY; queueNear(); }, { passive: true });
    window.addEventListener("scroll", function () { if (mx > -1e3) queueNear(); }, { passive: true });
    root.addEventListener("pointerleave", function () { mx = my = -1e4; queueNear(); });
    /* touch: the card that settles in the middle of the screen lights up (applied once the scroll rests,
       so a moving page never repaints cards) */
    var inBand = new Set(), bandT = 0;
    function applyBand() {
      /* only the one card closest to the middle of the screen (a whole row lighting up would say nothing) */
      var best = null, bestD = 1e9, cy = innerHeight / 2, cx = innerWidth / 2;
      if (!mqFine.matches) inBand.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.right < 0 || r.left > innerWidth) return;
        var dd = Math.abs(r.top + r.height / 2 - cy) + Math.abs(r.left + r.width / 2 - cx) * .5;
        if (dd < bestD) { bestD = dd; best = c; }
      });
      nearCards.forEach(function (c) { c.classList.toggle("is-near", c === best); });
    }
    function queueBand() { clearTimeout(bandT); bandT = setTimeout(applyBand, 140); }
    var bio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) inBand.add(e.target); else inBand.delete(e.target); });
      queueBand();
    }, { rootMargin: "-36% 0px -36% 0px" });
    nearCards.forEach(function (c) { bio.observe(c); });
    window.addEventListener("scroll", function () { if (bandT) queueBand(); }, { passive: true });
  }

  /* ---------------------------------------------------------------- hero: «the post that lands»
     The page is the finished hero; <head> adds html.intro (once per session, not with reduced motion) and the CSS
     plays the opening over it. Here: remember that it played, aim the spark at the main button, pause with the tab,
     and replay on demand. */
  var pv = $("[data-pv]");
  function syncDocHidden() { root.classList.toggle("doc-hidden", d.hidden); }
  d.addEventListener("visibilitychange", syncDocHidden); syncDocHidden();
  if (pv) {
    var aimT = 0;
    var aim = function () {
      /* the spark leaves the top of the post and lands on «احجز استشارة» (measured, so it works in any layout) */
      var fly = $(".pv-fly", pv), cta = $(".hero-ctas .btn-primary");
      if (!fly || !cta) return;
      var f = fly.getBoundingClientRect(), c = cta.getBoundingClientRect();
      if (!f.width || !c.width) return;
      pv.style.setProperty("--fx", Math.round(c.left + c.width / 2 - (f.left + f.width / 2)) + "px");
      pv.style.setProperty("--fy", Math.round(c.top + c.height / 2 - (f.top + f.height / 2)) + "px");
    };
    var play = function () {
      clearTimeout(aimT);
      /* measure once the words have entered (their entrance moves them a few px) and before the spark leaves */
      aimT = setTimeout(aim, 2600);
    };
    if (root.classList.contains("intro")) {
      try { sessionStorage.setItem("sa-intro", "1"); } catch (e) {}
      play();
    }
    var replayBtn = $("[data-pv-replay]");
    if (replayBtn) replayBtn.addEventListener("click", function () {
      if (reduced()) return;
      root.classList.remove("intro");
      void pv.offsetWidth;                                  /* restart every CSS animation of the opening */
      root.classList.add("intro");
      play();
    });
  }

  /* ---------------------------------------------------------------- the living background: threads that float, sparks that run along them */
  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function sparkSprite(col) {
    var c = d.createElement("canvas"), s = 64, x; c.width = c.height = s; x = c.getContext("2d");
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, rgba(col, .5)); g.addColorStop(.32, rgba(col, .16)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.translate(s / 2, s / 2); x.fillStyle = col;
    var r = 9.5, p = r * .22;
    x.beginPath(); x.moveTo(0, -r); x.quadraticCurveTo(p, -p, r, 0); x.quadraticCurveTo(p, p, 0, r); x.quadraticCurveTo(-p, p, -r, 0); x.quadraticCurveTo(-p, -p, 0, -r); x.fill();
    return c;
  }
  function Live(cv) {
    this.cv = cv; this.ctx = cv.getContext("2d"); this.t0 = performance.now(); this.last = 0; this.running = false;
    this.colors(); this.resize(true);
  }
  Live.prototype.colors = function () {
    var dark = root.getAttribute("data-theme") === "dark";
    this.cols = dark ? ["#DCC7B3", "#DEC5D2", "#E8CD9C"] : ["#6E5361", "#C49B5E", "#2A2B47"];
    this.alpha = dark ? [.19, .16, .24] : [.24, .3, .12];
    this.spark = sparkSprite(dark ? "#E8CD9C" : "#C49B5E");
    this.dustCol = dark ? "#F6EEE6" : "#6E5361";
  };
  Live.prototype.resize = function (force) {
    var b = this.cv.getBoundingClientRect(), w = Math.round(b.width), h = Math.round(b.height);
    if (!force && w === this.w && Math.abs(h - this.h) < 2) return;
    /* soft threads need no retina pixels: phones draw at 1×, desktops at up to 1.5× */
    var dpr = Math.min(mqPhone.matches ? 1 : 1.5, window.devicePixelRatio || 1);
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.build();
    this.frame(performance.now(), !this.running);
  };
  Live.prototype.build = function () {
    var phone = this.w < 700, n = phone ? 4 : 6, r = rnd(20261013);
    this.threads = [];
    for (var i = 0; i < n; i++) {
      this.threads.push({
        y: .1 + .8 * (i + .5) / n + (r() - .5) * .07, tilt: (r() - .5) * .22,
        a1: (phone ? 20 : 30) + r() * (phone ? 18 : 34), l1: .6 + r() * .55, s1: (.12 + r() * .14) * (r() < .5 ? -1 : 1), p1: r() * 6.283,
        a2: 7 + r() * 14, l2: .22 + r() * .22, s2: (.18 + r() * .22) * (r() < .5 ? -1 : 1), p2: r() * 6.283,
        col: i % 3, w: 1 + r() * .8, depth: .5 + r() * .9
      });
    }
    this.sparks = [];
    for (var k = 0; k < (phone ? 6 : 10); k++) this.sparks.push({ th: k % n, x: r() * 1.2 - .1, v: (.016 + r() * .03) * (r() < .5 ? -1 : 1), s: .45 + r() * .6, ph: r() * 6.283 });
    this.dust = [];
    for (var j = 0; j < (phone ? 12 : 22); j++) this.dust.push({ x: r(), y: r(), r: .6 + r() * 1.3, v: .004 + r() * .01, ph: r() * 6.283 });
  };
  Live.prototype.yAt = function (th, x, t, scr) {
    var W = this.w, H = this.h, u = x / W;
    var y = th.y * H + (u - .5) * th.tilt * H
      + th.a1 * Math.sin(u / th.l1 * 6.283 + t * th.s1 + th.p1 + scr * th.depth)
      + th.a2 * Math.sin(u / th.l2 * 6.283 - t * th.s2 + th.p2);
    return y;
  };
  Live.prototype.frame = function (now, still) {
    var c = this.ctx, W = this.w, H = this.h, self = this;
    var t = still ? 14 : (now - this.t0) / 1000, dt = still ? 0 : Math.min(.1, (now - (this.last || now)) / 1000);
    this.last = now;
    var scr = (window.scrollY || 0) * .0015;
    c.clearRect(0, 0, W, H);
    var step = W < 700 ? 24 : 30;
    this.threads.forEach(function (th) {
      var col = self.cols[th.col], a = self.alpha[th.col], g = c.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(.16, rgba(col, a)); g.addColorStop(.84, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      c.strokeStyle = g; c.lineWidth = th.w; c.lineCap = "round"; c.beginPath();
      var px = -step, py = self.yAt(th, px, t, scr); c.moveTo(px, py);
      for (var x = 0; x <= W + step; x += step) {
        var y = self.yAt(th, x, t, scr);
        c.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); px = x; py = y;
      }
      c.lineTo(px, py); c.stroke();
    });
    this.sparks.forEach(function (s) {
      s.x += s.v * dt; if (s.x > 1.1) s.x = -.1; if (s.x < -.1) s.x = 1.1;
      var th = self.threads[s.th], x = s.x * W, y = self.yAt(th, x, t, scr), tw = .72 + .28 * Math.sin(t * 2.2 + s.ph), z = 30 * s.s * tw;
      c.globalAlpha = .9 * tw; c.drawImage(self.spark, x - z / 2, y - z / 2, z, z);
    });
    c.fillStyle = this.dustCol;
    this.dust.forEach(function (p) {
      var y = (((p.y - (still ? 0 : t * p.v)) % 1) + 1) % 1;
      c.globalAlpha = still ? .14 : .08 + .14 * (.5 + .5 * Math.sin(t * .7 + p.ph));
      c.beginPath(); c.arc(p.x * W, y * H, p.r, 0, 6.283); c.fill();
    });
    c.globalAlpha = 1;
  };
  var scrolledAt = 0;
  window.addEventListener("scroll", function () { scrolledAt = performance.now(); }, { passive: true });
  Live.prototype.loop = function () {
    var self = this; if (self.running) return; self.running = true; self.last = 0;
    (function tick(now) {
      if (!self.running) return;
      /* a slow drift needs few frames: ~30 fps on desktops, ~24 on phones. While a phone is being scrolled the
         scroll itself is the motion (and the light wash keeps flowing), so the threads wait for it to settle */
      var scrolling = now - scrolledAt < 180;
      var gap = mqPhone.matches ? (scrolling ? 1e9 : 41) : (scrolling ? 64 : 32);
      if (!self.drawn || now - self.drawn > gap) { self.frame(now, false); self.drawn = now; }
      self.raf = requestAnimationFrame(tick);
    })(performance.now());
  };
  Live.prototype.stop = function () { this.running = false; this.drawn = 0; cancelAnimationFrame(this.raf); };
  var liveCv = $("canvas[data-live]");
  if (liveCv && liveCv.getContext) {
    var live = new Live(liveCv);
    window.saLive = live;                                 /* handy for tests */
    var syncLive = function () { if (reduced() || d.hidden) { live.stop(); live.frame(performance.now(), true); } else live.loop(); };
    var liveT = 0; window.addEventListener("resize", function () { clearTimeout(liveT); liveT = setTimeout(function () { live.resize(false); }, 120); });
    d.addEventListener("sa:theme", function () { live.colors(); live.frame(performance.now(), !live.running); });
    d.addEventListener("visibilitychange", syncLive);
    if (mqReduce.addEventListener) mqReduce.addEventListener("change", syncLive);
    syncLive();
  }
})();
