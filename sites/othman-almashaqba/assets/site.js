/* Othman Almashaqba: site behaviour. No dependencies.
   Contact details come from CONFIG in build.py (embedded in each page as #siteConfig). */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js-ok");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOTION = root.classList.contains("motion");
  var CONFIG = {};
  try { CONFIG = JSON.parse($("#siteConfig").textContent); } catch (e) {}
  var AR = function () { return root.lang === "ar"; };
  var hooks = [];
  var topBar = $("#top");

  /* ---------- language: swapped in place, the reader stays where they were ---------- */
  function anchor() {
    var hdr = topBar ? topBar.getBoundingClientRect().bottom : 64;
    var list = $$("main h1, main h2, main h3, main p, main li, main figure, main blockquote, main .btn, footer p");
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el.offsetParent && el.tagName !== "BODY") continue;
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > hdr + 4) return el;
    }
    return null;
  }
  function setLang(l, keep) {
    var a = null, off = 0;
    if (keep) { a = anchor(); if (a) off = a.getBoundingClientRect().top; }
    root.lang = l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    var title = root.getAttribute("data-title-" + l);
    if (title) document.title = title;
    var b = $("#langBtn");
    if (b) {
      b.textContent = l === "ar" ? "EN" : "عربي";
      b.setAttribute("lang", l === "ar" ? "en" : "ar");
      b.setAttribute("aria-label", l === "ar" ? "Switch to English" : "التبديل إلى العربية");
    }
    $$("[data-al-" + l + "]").forEach(function (el) { el.setAttribute("aria-label", el.getAttribute("data-al-" + l)); });
    $$("[data-alt-" + l + "]").forEach(function (el) { el.setAttribute("alt", el.getAttribute("data-alt-" + l)); });
    if (keep) {
      try { localStorage.setItem("oa-lang", l); } catch (e) {}
      if (/[?&]lang=/.test(location.search) && history.replaceState) {
        history.replaceState(null, "", location.pathname + "?lang=" + l + location.hash);
      }
    }
    hooks.forEach(function (f) { try { f(); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent("oa:lang")); } catch (e) {}
    if (a) {
      var d = a.getBoundingClientRect().top - off;
      if (Math.abs(d) >= 1) window.scrollBy(0, d);
    }
  }
  var langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", function () { setLang(AR() ? "en" : "ar", true); });

  /* ---------- theme: light by default, the choice is remembered ---------- */
  function setTheme(th, save) {
    root.setAttribute("data-theme", th);
    if (save) { try { localStorage.setItem("oa-theme", th); } catch (e) {} }
    var m = $("#themeColor");
    if (m) m.setAttribute("content", th === "dark" ? "#0A1323" : "#F3F5F8");
    var b = $("#themeBtn");
    if (b) {
      var lab = th === "dark" ? ["الوضع الفاتح", "Light mode"] : ["الوضع الداكن", "Dark mode"];
      b.setAttribute("data-al-ar", lab[0]); b.setAttribute("data-al-en", lab[1]);
      b.setAttribute("aria-label", AR() ? lab[0] : lab[1]);
      b.setAttribute("aria-pressed", th === "dark" ? "true" : "false");
    }
    try { document.dispatchEvent(new CustomEvent("oa:theme")); } catch (e) {}
  }
  var themeBtn = $("#themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });

  /* ---------- header: glass after the first scroll, out of the way while reading on phones ---------- */
  var lastY = window.scrollY, ticking = false;
  var chapters = $("#chapters"), chapLine = chapters ? $(".thread-line i", chapters) : null;
  var prog = topBar ? $(".progress", topBar) : null;
  function onScroll() {
    var y = window.scrollY;
    root.classList.toggle("scrolled", y > 8);
    if (topBar) {
      if (innerWidth <= 1020 && !root.classList.contains("menu-open")) {
        if (y > lastY + 6 && y > 140) topBar.classList.add("hide");
        else if (y < lastY - 6 || y < 140) topBar.classList.remove("hide");
      } else topBar.classList.remove("hide");
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      // transforms set on the one element that moves, so a scroll frame restyles nothing else
      if (prog) prog.style.transform = "scaleX(" + Math.min(1, Math.max(0, y / max)).toFixed(4) + ")";
    }
    if (chapLine) {
      var r = chapters.getBoundingClientRect();
      var p = (innerHeight * 0.62 - r.top) / Math.max(1, r.height);
      chapLine.style.transform = "scaleY(" + Math.min(1, Math.max(0, p)).toFixed(4) + ")";
    }
    lastY = y;
  }
  addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; onScroll(); });
  }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- phone menu: a glass sheet; the burger turns into a cross ---------- */
  var sheet = $("#sheet"), menuBtn = $("#menuBtn");
  function setMenu(open) {
    if (!sheet || !menuBtn) return;
    if (open) {
      sheet.hidden = false;
      sheet.classList.remove("closing");
      requestAnimationFrame(function () { sheet.classList.add("open"); });
      root.classList.add("menu-open");
      if (topBar) topBar.classList.remove("hide");
      menuBtn.setAttribute("aria-expanded", "true");
      var cur = $(".sheet-nav a[aria-current]", sheet) || $(".sheet-nav a", sheet);
      if (cur) setTimeout(function () { cur.focus({ preventScroll: true }); }, 60);
    } else {
      if (sheet.hidden) return;
      sheet.classList.remove("open");
      root.classList.remove("menu-open");
      menuBtn.setAttribute("aria-expanded", "false");
      if (MOTION) {
        sheet.classList.add("closing");
        setTimeout(function () { sheet.hidden = true; sheet.classList.remove("closing"); }, 200);
      } else sheet.hidden = true;
    }
    var lab = open ? ["إغلاق القائمة", "Close menu"] : ["القائمة", "Menu"];
    menuBtn.setAttribute("data-al-ar", lab[0]); menuBtn.setAttribute("data-al-en", lab[1]);
    menuBtn.setAttribute("aria-label", AR() ? lab[0] : lab[1]);
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener("click", function () { setMenu(sheet.hidden); });
    sheet.addEventListener("click", function (e) { if (e.target === sheet) setMenu(false); });
    $$("a", sheet).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !sheet.hidden) { setMenu(false); menuBtn.focus(); }
      if (e.key === "Tab" && !sheet.hidden) { // keep focus inside the open sheet
        var f = $$("a,button", sheet).concat([menuBtn]);
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    addEventListener("resize", function () { if (innerWidth > 1020) setMenu(false); });
  }

  /* ---------- reveal on scroll, with a short stagger between siblings ---------- */
  var counters = $$(".count[data-to]");
  function fmt(el, v) {
    var dec = +(el.getAttribute("data-dec") || 0);
    return (el.getAttribute("data-sign") || "") + v.toFixed(dec) + (el.getAttribute("data-suffix") || "");
  }
  function countUp(el) {
    if (el.getAttribute("data-done")) return;
    el.setAttribute("data-done", "1");
    var to = parseFloat(el.getAttribute("data-to")), t0 = 0, D = 1700;
    function f(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(el, to * e);
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  if (MOTION && "IntersectionObserver" in window) {
    counters.forEach(function (c) { c.textContent = fmt(c, 0); });
    $$(".rv").forEach(function (el) {
      if (el.style.getPropertyValue("--k")) return;
      var sib = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("rv"); });
      el.style.setProperty("--k", Math.min(sib.indexOf(el), 6));
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, group = [el];
        var par = el.parentNode;
        if (par && par.hasAttribute && par.hasAttribute("data-swipe")) group = Array.prototype.slice.call(par.children);
        group.forEach(function (g) {
          g.classList.add("in");
          io.unobserve(g);
          $$(".count[data-to]", g).forEach(countUp);
        });
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });
    $$(".rv, .rv-h, .steps-wrap, .ch").forEach(function (el) { io.observe(el); });
  } else {
    $$(".rv, .rv-h, .steps-wrap, .ch").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- rotating ideas (fixed size: every idea sits in the same cell) ---------- */
  $$("[data-rotator]").forEach(function (box) {
    var figs = $$(".voice", box), tabs = $$(".vtab", box);
    var i = 0, timer = 0, paused = false, inView = false, auto = MOTION;
    var dur = +box.getAttribute("data-interval") || 7500;
    box.style.setProperty("--dur", dur + "ms");
    function arm() {
      clearTimeout(timer);
      box.classList.remove("auto");
      void box.offsetWidth; // restart the progress bar
      if (auto && !paused && inView && !document.hidden) {
        box.classList.add("auto");
        timer = setTimeout(function () { show(i + 1); }, dur);
      }
    }
    function show(n, focus) {
      i = (n + figs.length) % figs.length;
      figs.forEach(function (f, k) {
        var on = k === i;
        f.classList.toggle("is-on", on);
        if (on) { f.removeAttribute("aria-hidden"); f.inert = false; }
        else { f.setAttribute("aria-hidden", "true"); f.inert = true; }
      });
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
      if (focus) tabs[i].focus();
      arm();
    }
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { show(k); });
      t.addEventListener("keydown", function (e) {
        var fwd = AR() ? "ArrowLeft" : "ArrowRight", back = AR() ? "ArrowRight" : "ArrowLeft";
        if (e.key === fwd) { e.preventDefault(); show(i + 1, true); }
        if (e.key === back) { e.preventDefault(); show(i - 1, true); }
      });
    });
    var nx = $(".vnext", box), pv = $(".vprev", box);
    if (nx) nx.addEventListener("click", function () { show(i + 1); });
    if (pv) pv.addEventListener("click", function () { show(i - 1); });
    function hold(v) { paused = v; box.classList.toggle("paused", v); if (v) clearTimeout(timer); else arm(); }
    box.addEventListener("mouseenter", function () { hold(true); });
    box.addEventListener("mouseleave", function () { hold(false); });
    box.addEventListener("focusin", function () { hold(true); });
    box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget)) hold(false); });
    var sx = 0, sy = 0;
    box.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      var next = AR() ? dx > 0 : dx < 0;
      show(next ? i + 1 : i - 1);
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; arm(); }, { threshold: 0.35 }).observe(box);
    }
    document.addEventListener("visibilitychange", arm);
  });

  /* ---------- the Odoo 8–19 scale: each programme in its place ---------- */
  $$("[data-ruler]").forEach(function (box) {
    var marks = $$(".rmark", box), panels = $$(".rpanel", box);
    var i = 0, timer = 0, inView = false, held = false, auto = MOTION;
    var dur = +box.getAttribute("data-interval") || 5200;
    function arm() {
      clearTimeout(timer);
      if (auto && inView && !held && !document.hidden) timer = setTimeout(function () { show(i + 1); }, dur);
    }
    function show(n, focus) {
      i = (n + marks.length) % marks.length;
      marks.forEach(function (m, k) {
        var on = k === i;
        m.classList.toggle("is-on", on);
        m.setAttribute("aria-selected", on ? "true" : "false");
        m.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, k) {
        var on = k === i;
        p.classList.toggle("is-on", on);
        if (on) { p.removeAttribute("aria-hidden"); p.inert = false; } else { p.setAttribute("aria-hidden", "true"); p.inert = true; }
      });
      if (focus) marks[i].focus();
      arm();
    }
    marks.forEach(function (m, k) {
      m.addEventListener("click", function () { held = true; show(k); });
      m.addEventListener("keydown", function (e) {
        var fwd = AR() ? "ArrowLeft" : "ArrowRight", back = AR() ? "ArrowRight" : "ArrowLeft";
        if (e.key === fwd) { e.preventDefault(); held = true; show(i + 1, true); }
        if (e.key === back) { e.preventDefault(); held = true; show(i - 1, true); }
      });
    });
    box.addEventListener("mouseenter", function () { clearTimeout(timer); });
    box.addEventListener("mouseleave", function () { if (!held) arm(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; arm(); }, { threshold: 0.4 }).observe(box);
    }
    document.addEventListener("visibilitychange", arm);
  });

  /* ---------- swipe rows on phones: the centred card stands forward ---------- */
  $$("[data-swipe]").forEach(function (row) {
    var dots = row.nextElementSibling && row.nextElementSibling.classList.contains("swipe-dots") ? row.nextElementSibling : null;
    var items = Array.prototype.slice.call(row.children);
    if (dots) dots.innerHTML = items.map(function () { return "<i></i>"; }).join("");
    var pending = false;
    function update() {
      pending = false;
      var scroller = getComputedStyle(row).overflowX === "auto";
      row.classList.toggle("ready", scroller);
      if (scroller) row.setAttribute("tabindex", "0"); else row.removeAttribute("tabindex"); // keyboard users can scroll it too
      if (!scroller) { items.forEach(function (it) { it.classList.remove("is-center"); }); return; }
      var rr = row.getBoundingClientRect(), cx = rr.left + rr.width / 2, best = 0, bd = 1e9;
      items.forEach(function (it, k) {
        var r = it.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bd) { bd = d; best = k; }
      });
      items.forEach(function (it, k) { it.classList.toggle("is-center", k === best); });
      if (dots) Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === best); });
    }
    row.addEventListener("scroll", function () { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    hooks.push(function () { row.scrollLeft = 0; update(); });
    update();
  });

  /* ---------- the module map pauses its flowing light when off screen ---------- */
  $$(".modmap").forEach(function (m) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) { m.classList.toggle("paused", !es[0].isIntersecting); }).observe(m);
  });

  /* ---------- contact: pick a topic, the email starts itself ---------- */
  var chips = $$(".chip[data-topic]"), go = $("#composeGo"), subBox = $("#letterSub");
  function href() {
    var on = $(".chip.is-on");
    if (!on || !go || !CONFIG.EMAIL) return;
    var sub = on.getAttribute(AR() ? "data-sub-ar" : "data-sub-en");
    var hi = AR() ? "مرحبًا عثمان،\n\n" : "Hello Othman,\n\n";
    go.href = "mailto:" + CONFIG.EMAIL + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(hi);
  }
  function pick(btn, focus) {
    chips.forEach(function (c) {
      var on = c === btn;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-checked", on ? "true" : "false");
      c.tabIndex = on ? 0 : -1;
    });
    var key = btn.getAttribute("data-topic");
    if (subBox) $$("[data-sub]", subBox).forEach(function (s) { s.classList.toggle("is-on", s.getAttribute("data-sub") === key); });
    if (focus) btn.focus();
    href();
  }
  chips.forEach(function (c, k) {
    c.tabIndex = c.classList.contains("is-on") ? 0 : -1;
    c.addEventListener("click", function () { pick(c); });
    c.addEventListener("keydown", function (e) {
      var fwd = AR() ? "ArrowLeft" : "ArrowRight", back = AR() ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd || e.key === "ArrowDown") { e.preventDefault(); pick(chips[(k + 1) % chips.length], true); }
      if (e.key === back || e.key === "ArrowUp") { e.preventDefault(); pick(chips[(k - 1 + chips.length) % chips.length], true); }
    });
  });
  if (chips.length) { hooks.push(href); href(); }
  var copyBtn = $("#copyMail");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var text = copyBtn.getAttribute("data-copy") || CONFIG.EMAIL || "";
    function done() { copyBtn.classList.add("done"); setTimeout(function () { copyBtn.classList.remove("done"); }, 2200); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  /* ---------- start ---------- */
  setLang(root.lang || "ar", false);
  setTheme(root.getAttribute("data-theme") || "light", false);
})();
