/* Aya Rady — site behaviour. No dependencies. */

/* Fill these in or change them. Empty values stay hidden on the site. */
var CONFIG = {
  linkedin: "https://www.linkedin.com/in/ayarady/",
  whatsapp: "201099932035",              // international digits only (from her LinkedIn contact info, marked "Work")
  email: "ayaahmed2092006@gmail.com"
};

(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOTION = root.classList.contains("motion");
  var TOUCH = false;
  try { TOUCH = matchMedia("(hover: none)").matches; } catch (e) {}
  var AR = function () { return root.lang === "ar"; };
  var hooks = [];

  /* run a loop only while its element is on screen */
  function whenVisible(el, onShow, onHide) {
    if (!("IntersectionObserver" in window)) { onShow(); return; }
    new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) onShow(); else if (onHide) onHide(); });
    }, { threshold: 0.15 }).observe(el);
  }

  /* ---------- language ---------- */
  function setLang(l) {
    root.lang = l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    var title = root.getAttribute("data-title-" + l);
    if (title) document.title = title;
    var b = $("#langBtn");
    if (b) {
      b.textContent = l === "ar" ? "EN" : "عربي";
      b.setAttribute("lang", l === "ar" ? "en" : "ar");
      b.setAttribute("aria-label", l === "ar" ? "EN, Switch to English" : "عربي، التبديل إلى العربية");
    }
    var b2 = $("#langBtn2 .lr-t");
    if (b2) b2.textContent = l === "ar" ? "English" : "عربي";
    $$("[data-ph-" + l + "]").forEach(function (el) { el.placeholder = el.getAttribute("data-ph-" + l); });
    $$("[data-al-" + l + "]").forEach(function (el) { el.setAttribute("aria-label", el.getAttribute("data-al-" + l)); });
    try { localStorage.setItem("ar-lang", l); } catch (e) {}
    hooks.forEach(function (f) { f(); });
  }
  function toggleLang() { setLang(AR() ? "en" : "ar"); }
  if ($("#langBtn")) $("#langBtn").addEventListener("click", toggleLang);
  if ($("#langBtn2")) $("#langBtn2").addEventListener("click", toggleLang);

  /* ---------- CONFIG ---------- */
  $$(".js-li").forEach(function (a) { a.href = CONFIG.linkedin; });
  var waDisplay = CONFIG.whatsapp ? "+" + CONFIG.whatsapp.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, "$1 $2 $3 $4") : "";
  $$('[data-c="wa"]').forEach(function (a) {
    if (!CONFIG.whatsapp) return;
    a.hidden = false; a.href = "https://wa.me/" + CONFIG.whatsapp; $("small", a).textContent = waDisplay;
  });
  $$('[data-c="mail"]').forEach(function (a) {
    if (!CONFIG.email) return;
    a.hidden = false; a.href = "mailto:" + CONFIG.email; $("small", a).textContent = CONFIG.email;
  });

  /* ---------- header: tucks away while reading down on phones ---------- */
  var top = $("#top"), lastY = scrollY, PHONE = matchMedia("(max-width: 900px)");
  function onScroll() {
    var y = scrollY;
    if (top) {
      top.classList.toggle("raised", y > 8);
      if (PHONE.matches && !root.classList.contains("locked")) {
        if (y > lastY + 6 && y > 120) top.classList.add("hide");
        else if (y < lastY - 6 || y < 60) top.classList.remove("hide");
      } else top.classList.remove("hide");
    }
    lastY = y;
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  // hide the dock while typing so it never covers a field
  var dockEl = $("#dock");
  document.addEventListener("focusin", function (e) { if (dockEl && e.target.matches("input, textarea")) dockEl.style.visibility = "hidden"; });
  document.addEventListener("focusout", function (e) { if (dockEl && e.target.matches("input, textarea")) dockEl.style.visibility = ""; });

  /* ---------- phone: "More" bottom sheet ---------- */
  var sheet = $("#sheet"), moreBtn = $("#moreBtn");
  function setSheet(open) {
    if (!sheet) return;
    if (open) {
      sheet.hidden = false;
      root.classList.add("locked");
      requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add("open"); }); });
      setTimeout(function () { var f = $(".sheet-links a", sheet); if (f) f.focus({ preventScroll: true }); }, 60);
    } else {
      sheet.classList.remove("open");
      root.classList.remove("locked");
      setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, MOTION ? 400 : 0);
    }
    if (moreBtn) moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (sheet && moreBtn) {
    moreBtn.addEventListener("click", function () { setSheet(sheet.hidden); });
    $$("[data-close]", sheet).forEach(function (el) { el.addEventListener("click", function () { setSheet(false); moreBtn.focus(); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) { setSheet(false); moreBtn.focus(); } });
    $$(".sheet-links a", sheet).forEach(function (a) { a.addEventListener("click", function () { setSheet(false); }); });
    // swipe the panel down to close
    var panel = $(".sheet-panel", sheet), sy = null;
    panel.addEventListener("touchstart", function (e) { sy = panel.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    panel.addEventListener("touchend", function (e) { if (sy !== null && e.changedTouches[0].clientY - sy > 70) setSheet(false); sy = null; }, { passive: true });
    if (PHONE.addEventListener) PHONE.addEventListener("change", function () { if (!PHONE.matches) setSheet(false); });
  }

  /* ---------- home opening: the market is searching ----------
     The whole sequence is CSS (html.intro, set before first paint, once per session).
     Here: "search again" replays it, and the ambient loop rests while off screen. */
  var stage = $("#stage");
  if (stage && MOTION) {
    var again = $(".st-again", stage);
    if (again) {
      again.hidden = false;
      again.addEventListener("click", function () {
        root.classList.remove("intro");
        void stage.offsetWidth;   // restart every animation from its first frame
        root.classList.add("intro");
      });
    }
  }
  // ambient loops (opening, about sheet) rest while off screen
  if (MOTION) $$("#stage, #spec").forEach(function (el) {
    whenVisible(el, function () { el.classList.remove("off"); }, function () { el.classList.add("off"); });
  });

  /* ---------- method: Inside-Out ripple ---------- */
  var rings = $("#rings");
  if (rings) {
    var R = [86, 134, 182, 230], CORE = 52, MAXR = 276;
    var waveL = $(".wv-l", rings), waveF = $(".wv-f", rings);
    var labels = $$(".rl", rings), nameL = $(".name-l", rings);
    var people = $$(".pp", rings).map(function (c) { return { el: c, r: parseFloat(c.getAttribute("data-r")), until: 0 }; });
    var TRAVEL = 3200, REST = 1500, PERIOD = TRAVEL + REST, raf = 0, t0 = 0, running = false;
    var litUntil = [0, 0, 0, 0], nameUntil = 0;
    function allLit() { labels.forEach(function (l) { l.classList.add("lit"); }); people.forEach(function (p) { p.el.classList.add("lit"); }); if (nameL) nameL.classList.add("lit"); }
    function frame(now) {
      if (!t0) t0 = now;
      var ph = (now - t0) % PERIOD, k = Math.min(1, ph / TRAVEL);
      var e = 1 - Math.pow(1 - k, 2.2), r = CORE + (MAXR - CORE) * e;
      var on = ph < TRAVEL;
      var sc = "scale(" + (r / MAXR).toFixed(4) + ")";
      waveL.style.transform = sc; waveF.style.transform = sc;
      waveL.style.opacity = on ? (0.95 * (1 - k * 0.85)).toFixed(3) : 0;
      waveF.style.opacity = on ? (0.55 * (1 - k)).toFixed(3) : 0;
      R.forEach(function (rr, i) { if (on && Math.abs(r - rr) < 9) litUntil[i] = now + 1300; labels[i].classList.toggle("lit", now < litUntil[i]); });
      people.forEach(function (p) { if (on && r >= p.r && r - p.r < 14) p.until = now + 1500; p.el.classList.toggle("lit", now < p.until); });
      if (on && r > 250 && r < 262) nameUntil = now + 1800;
      if (nameL) nameL.classList.toggle("lit", now < nameUntil);
      raf = requestAnimationFrame(frame);
    }
    if (!MOTION) allLit();
    else whenVisible(rings, function () { rings.classList.remove("off"); if (!running) { running = true; t0 = 0; raf = requestAnimationFrame(frame); } },
                     function () { rings.classList.add("off"); running = false; cancelAnimationFrame(raf); });
  }

  /* ---------- before / after profile ---------- */
  $$(".ba").forEach(function (ba) {
    var btns = $$(".seg button", ba), timer = null, auto = MOTION, visible = false;
    function set(s) {
      ba.setAttribute("data-state", s);
      btns.forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-s") === s ? "true" : "false"); });
    }
    function loop() {
      clearTimeout(timer);
      if (!auto || !visible) return;
      timer = setTimeout(function () { set(ba.getAttribute("data-state") === "before" ? "after" : "before"); loop(); },
                         ba.getAttribute("data-state") === "before" ? 3200 : 5200);
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { auto = false; clearTimeout(timer); set(b.getAttribute("data-s")); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); var o = btns[b === btns[0] ? 1 : 0]; o.focus(); o.click(); }
      });
    });
    if (!MOTION) set("after");
    whenVisible(ba, function () { visible = true; loop(); }, function () { visible = false; clearTimeout(timer); });
  });

  /* ---------- the path: a dot walks from hidden expertise to a known name ---------- */
  $$(".path").forEach(function (path) {
    var track = $(".path-track", path), sts = $$(".st", path), raf = 0, t0 = 0, running = false;
    var DUR = 9000, HOLD = 1800, fc = 0;
    function stops() {
      var tr = track.getBoundingClientRect(), vert = tr.height > tr.width;
      return sts.map(function (st) {
        var d = $(".st-dot", st).getBoundingClientRect();
        if (vert) return (d.top + d.height / 2 - tr.top) / tr.height;
        var c = d.left + d.width / 2;
        return root.dir === "rtl" ? (tr.right - c) / tr.width : (c - tr.left) / tr.width;
      });
    }
    var S = [];
    function measure() { S = stops(); }
    function frame(now) {
      if (!t0) t0 = now;
      var ph = (now - t0) % (DUR + HOLD), p = Math.min(1, ph / DUR);
      path.style.setProperty("--p", p.toFixed(4));
      if ((++fc) % 30 === 0) measure();
      sts.forEach(function (st, i) { st.classList.toggle("lit", p >= S[i] - 0.004); });
      raf = requestAnimationFrame(frame);
    }
    if (!MOTION) { path.style.setProperty("--p", 1); sts.forEach(function (s) { s.classList.add("lit"); }); return; }
    measure(); addEventListener("resize", measure); hooks.push(function () { setTimeout(measure, 30); });
    whenVisible(path, function () { if (!running) { running = true; t0 = 0; measure(); raf = requestAnimationFrame(frame); } },
                function () { running = false; cancelAnimationFrame(raf); });
  });

  /* ---------- case study: four scattered topics become one position ---------- */
  var conv = $("#converge");
  if (conv) {
    if (!MOTION) conv.classList.add("go");
    else {
      var cvT = null;
      var cvLoop = function () { conv.classList.toggle("go"); cvT = setTimeout(cvLoop, conv.classList.contains("go") ? 4200 : 2200); };
      whenVisible(conv, function () { clearTimeout(cvT); cvT = setTimeout(cvLoop, 600); },
                  function () { clearTimeout(cvT); conv.classList.remove("go"); });
    }
  }

  /* ---------- counters ---------- */
  function fmt(v, dec) { return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US"); }
  function countUp(el, to, pre, suf, dec) {
    if (el.getAttribute("data-done")) return;
    el.setAttribute("data-done", "1");
    if (!MOTION) return;
    el.style.minWidth = el.getBoundingClientRect().width + "px";   // hold the final width while counting
    var t0 = performance.now(), dur = 1500;
    (function f(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + fmt(to * e, dec) + suf;
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; cio.unobserve(el);
        if (el.hasAttribute("data-count")) countUp(el, parseFloat(el.getAttribute("data-count")), "", "", 0);
        else countUp(el, parseFloat(el.getAttribute("data-to")), el.getAttribute("data-pre") || "", el.getAttribute("data-suf") || "", /\./.test(el.getAttribute("data-to")) ? 1 : 0);
      });
    }, { threshold: 0.6 });
    $$("[data-count], [data-to]").forEach(function (el) { cio.observe(el); });
  }

  /* ---------- phones: swipe rows with dots, rotating on their own ---------- */
  var PH = matchMedia("(max-width: 640px)");
  $$("[data-row]").forEach(function (row) {
    var items = function () { return Array.prototype.slice.call(row.children).filter(function (c) { return c.offsetParent !== null; }); };
    var dots = null, cur = 0, timer = null, visible = false, held = false;
    function go(i, smooth) {
      var its = items(); if (!its.length) return;
      var it = its[(i + its.length) % its.length], rr = row.getBoundingClientRect(), ir = it.getBoundingClientRect();
      row.scrollBy({ left: (ir.left + ir.width / 2) - (rr.left + rr.width / 2), behavior: smooth && MOTION ? "smooth" : "auto" });
    }
    function sync() {
      if (!dots) return;
      var rr = row.getBoundingClientRect(), mid = rr.left + rr.width / 2, best = 0, bd = 1e9;
      items().forEach(function (it, i) { var r = it.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cur = best;
      items().forEach(function (it, i) { it.classList.toggle("c", i === best); });
      if (many) { var c = $(".rd-count", dots); if (c) c.textContent = (best + 1) + " / " + items().length; return; }
      Array.prototype.forEach.call(dots.children, function (b, i) { b.classList.toggle("on", i === best); b.setAttribute("aria-current", i === best ? "true" : "false"); });
    }
    function arm() {
      clearTimeout(timer);
      if (!dots || !MOTION || !visible || held) return;
      timer = setTimeout(function () { go(cur + 1, true); arm(); }, 6000);
    }
    var many = false;
    function build() {
      if (dots) { dots.remove(); dots = null; }
      clearTimeout(timer);
      if (!PH.matches || items().length < 2) { row.removeAttribute("tabindex"); row.removeAttribute("role"); row.classList.remove("live"); items().forEach(function (it) { it.classList.remove("c"); }); return; }
      row.tabIndex = 0; row.setAttribute("role", "region"); row.classList.add("live");
      if (!row.getAttribute("aria-label")) row.setAttribute("aria-label", AR() ? "اسحب للمزيد" : "Swipe for more");
      var n = items().length; many = n > 5;
      dots = document.createElement("div"); dots.className = "row-dots" + (many ? " many" : "");
      if (many) {
        // long rows: previous / counter / next, every control a full touch target
        var prev = document.createElement("button"), next = document.createElement("button"), cnt = document.createElement("span");
        prev.type = next.type = "button"; prev.className = "rd-prev"; next.className = "rd-next"; cnt.className = "rd-count";
        prev.innerHTML = next.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
        prev.setAttribute("aria-label", AR() ? "السابق" : "Previous"); next.setAttribute("aria-label", AR() ? "التالي" : "Next");
        prev.addEventListener("click", function () { held = true; clearTimeout(timer); go(cur - 1, true); });
        next.addEventListener("click", function () { held = true; clearTimeout(timer); go(cur + 1, true); });
        dots.appendChild(prev); dots.appendChild(cnt); dots.appendChild(next);
      } else {
        items().forEach(function (it, i) {
          var b = document.createElement("button"); b.type = "button";
          b.setAttribute("aria-label", (i + 1) + " / " + n);
          b.addEventListener("click", function () { held = true; clearTimeout(timer); go(i, true); });
          dots.appendChild(b);
        });
      }
      row.parentNode.insertBefore(dots, row.nextSibling);
      sync(); arm();
    }
    var r = 0;
    row.addEventListener("scroll", function () { cancelAnimationFrame(r); r = requestAnimationFrame(sync); }, { passive: true });
    row.addEventListener("touchstart", function () { held = true; clearTimeout(timer); }, { passive: true });
    if (PH.addEventListener) PH.addEventListener("change", build);
    whenVisible(row, function () { visible = true; arm(); }, function () { visible = false; clearTimeout(timer); });
    build();
    hooks.push(function () { setTimeout(function () { go(cur, false); sync(); }, 30); });
  });

  /* ---------- copy helper ---------- */
  function copy(text, done) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  $$(".kw[data-kw]").forEach(function (b) {
    b.addEventListener("click", function () {
      var w = b.getAttribute("data-kw");
      copy(w, function () {
        b.classList.add("done");
        var s = $(".kw-status", b.parentNode);
        if (s) s.textContent = AR() ? "اتنسخت «" + w + "». الصقها في رسالة ليا على LinkedIn." : "Copied “" + w + "”. Paste it in a LinkedIn message to me.";
        setTimeout(function () { b.classList.remove("done"); }, 2400);
      });
    });
  });

  /* ---------- ideas filter ---------- */
  var chips = $$(".chip[data-f]");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.getAttribute("data-f"), n = 0;
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
      $$(".feed .idea").forEach(function (p) { var ok = f === "all" || p.getAttribute("data-t") === f; p.hidden = !ok; if (ok) n++; });
      var live = $("#feedCount"); if (live) live.textContent = AR() ? n + " فكرة" : n + (n === 1 ? " idea" : " ideas");
    });
  });

  /* ---------- method: the four-question gap check ---------- */
  var gapq = $("#gapq");
  if (gapq) {
    var G = JSON.parse(gapq.getAttribute("data-gaps"));
    var order = $$(".gq", gapq).map(function (f) { return f.getAttribute("data-k"); });
    function gapRender() {
      var ans = order.map(function (k, i) { var el = gapq.querySelector('input[name="g' + i + '"]:checked'); return el ? el.value : null; });
      $$(".meter i").forEach(function (m, i) { m.className = ans[i] === "1" ? "yes" : ans[i] === "0" ? "no" : ""; });
      var answered = ans.filter(function (a) { return a !== null; }).length;
      var first = ans.indexOf("0"), h = $("#goH"), p = $("#goP"), k = $("#goK"), cta = $("#goCta");
      if (!answered) { k.textContent = AR() ? "جاوب على الأسئلة، وهتظهر هنا." : "Answer the questions and it shows up here."; h.textContent = ""; p.textContent = ""; cta.hidden = true; return; }
      if (first >= 0) {
        var g = G[order[first]];
        k.textContent = AR() ? "أول فجوة من جوه لبرة:" : "Your first gap, from the inside out:";
        h.textContent = AR() ? g.ar : g.en;
        p.textContent = AR() ? g.gar : g.gen;
        cta.href = "contact.html?gap=" + order[first]; cta.hidden = false;
      } else if (answered === order.length) {
        k.textContent = AR() ? "الأربعة موجودين." : "All four are in place.";
        h.textContent = AR() ? "حلو جدًا." : "Very good.";
        p.textContent = AR() ? "الخطوة الجاية إننا نتأكد إنهم شغالين مع بعض في نفس الاتجاه، وإن الشخص المناسب يعرفك ويعرف ليه يختارك." : "Next is making sure they work together in one direction, so the right person knows you and why to choose you.";
        cta.href = "contact.html"; cta.hidden = false;
      } else {
        k.textContent = AR() ? "كمّل باقي الأسئلة…" : "Keep going…"; h.textContent = ""; p.textContent = ""; cta.hidden = true;
      }
    }
    gapq.addEventListener("change", function () {
      gapRender();
      var done = order.every(function (k, i) { return gapq.querySelector('input[name="g' + i + '"]:checked'); });
      var out = $("#gapOut"), r = out.getBoundingClientRect();
      if (done && PHONE.matches && r.top > innerHeight - 80) out.scrollIntoView({ behavior: MOTION ? "smooth" : "auto", block: "center" });
    });
    hooks.push(gapRender);
    gapRender();
  }

  /* ---------- contact: a ready first message ---------- */
  var builder = $("#builder");
  if (builder) {
    var T = {
      ar: {
        hi: "أهلًا يا آية 👋",
        me: function (n, f) { return n && f ? "أنا " + n + "، ومجالي " + f + "." : n ? "أنا " + n + "." : f ? "مجالي " + f + "." : ""; },
        who: { expert: "عندي خبرة حقيقية في مجالي، بس السوق لسه مش شايفها.", consultant: "بقدم استشارات، ونفسي خبرتي تبقى اسم الناس بتسأل عليه.", owner: "عندي بيزنس، ونفسي اسمي يبقى معروف في مجالي.", other: "" },
        need: { consult: "نفسي أحجز استشارة Personal Branding.", journey: "عندي اهتمام برحلة بناء استراتيجية البراند الشخصي.", partner: "عندي اهتمام بشراكة طويلة نبني فيها اسمي.", booklet: "ممكن أعرف أكتر عن الكتيب؟", gap: "نفسي أعمل اختبار The Expert Brand Gap™.", community: "نفسي أنضم للكوميونتي.", unsure: "ممكن تساعديني أعرف أبدأ منين؟" },
        gap: { pos: "في رأيي الفجوة عندي في التموضع: الناس مش فاهمين أنا مين وبساعد مين.", content: "في رأيي الفجوة في المحتوى: مش بيبين طريقة تفكيري.", magnet: "في رأيي الفجوة في الـLead Magnet: صعب أفرق المهتم الفعلي من المتابع.", network: "في رأيي الفجوة في العلاقات: الترشيحات قليلة.", unknown: "ولسه الفجوة مش واضحة لي." },
        end: "ممكن نتكلم عن الخطوة الجاية؟",
        copied: "اتنسخت ✓ افتح LinkedIn والصقها في رسالة ليا."
      },
      en: {
        hi: "Hi Aya 👋",
        me: function (n, f) { return n && f ? "I'm " + n + ", I work in " + f + "." : n ? "I'm " + n + "." : f ? "I work in " + f + "." : ""; },
        who: { expert: "I have real expertise in my field, but the market doesn't see it yet.", consultant: "I'm a consultant and want my expertise to become a name people ask for.", owner: "I run a business and want my name known in my field.", other: "" },
        need: { consult: "I'd like to book a personal branding consultation.", journey: "I'm interested in the personal-brand strategy journey.", partner: "I'm interested in a longer partnership to build my name.", booklet: "I'd like to know more about the booklet.", gap: "I'd like to take The Expert Brand Gap™.", community: "I'd like to join the community.", unsure: "Could you help me see where to start?" },
        gap: { pos: "I think my gap is positioning: people don't get who I am or who I help.", content: "I think my gap is content: it doesn't show how I think.", magnet: "I think my gap is the lead magnet: I can't tell who's really interested.", network: "I think my gap is networking: few referrals.", unknown: "I'm not sure yet where the gap is." },
        end: "Could we talk about the next step?",
        copied: "Copied ✓ Open LinkedIn and paste it in a message to me."
      }
    };
    var val = function (n) { var el = builder.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ""; };
    function message() {
      var L = T[root.lang] || T.ar, name = ($("#fName").value || "").trim(), field = ($("#fField").value || "").trim();
      var intro = [L.me(name, field), L.who[val("who")] || ""].filter(Boolean).join(" ");
      var mid = [intro, L.need[val("need")] || L.need.unsure, L.gap[val("gap")] || ""].filter(Boolean);
      return [L.hi, "", mid.join("\n"), "", L.end].join("\n");
    }
    var wa = $("#sendWa");
    function render() {
      var m = message();
      $("#msgOut").textContent = m;
      if (wa && CONFIG.whatsapp) { wa.hidden = false; wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(m); }
    }
    try {
      var q = new URLSearchParams(location.search);
      [["svc", "need"], ["gap", "gap"]].forEach(function (p) {
        var v = (q.get(p[0]) || "").replace(/[^a-z]/g, "");
        var el = v && builder.querySelector('input[name="' + p[1] + '"][value="' + v + '"]');
        if (el) el.checked = true;
      });
    } catch (e) {}
    builder.addEventListener("change", render);
    builder.addEventListener("input", render);
    $("#copyMsg").addEventListener("click", function () {
      render();
      copy($("#msgOut").textContent, function () {
        $("#msgStatus").textContent = (T[root.lang] || T.ar).copied;
        setTimeout(function () { window.open(CONFIG.linkedin, "_blank", "noopener"); }, 500);
      });
    });
    hooks.push(render);
    render();
  }


  /* ---------- the living background: Inside-Out ripples behind every page ---------- */
  var life = $("#life");
  if (life && life.getContext) {
    var ctx = life.getContext("2d"), W = 0, H = 0, DPR = 1, last = 0, lraf = 0;
    var SRC = [{ x: .84, y: .2, ph: 0 }, { x: .14, y: .78, ph: .5 }];
    SRC.forEach(function (s, si) {
      s.dots = [];
      for (var k = 0; k < 9; k++) s.dots.push({ a: (k / 9) * Math.PI * 2 + si, f: .22 + ((k * 37) % 40) / 100, glow: 0 });
    });
    function fit() {
      DPR = Math.min(PHONE.matches ? 1 : 1.5, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      life.width = Math.round(W * DPR); life.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function draw(now) {
      var R = Math.max(W, H) * .78, P = 15000, sy = MOTION ? scrollY * .12 : 0;
      ctx.clearRect(0, 0, W, H);
      SRC.forEach(function (s) {
        var cx = s.x * W, span = H * 1.7, cy = ((s.y * H - sy) % span + span) % span - H * .35;
        var waves = [];
        for (var k = 0; k < 5; k++) {
          var p = ((now / P) + s.ph + k / 5) % 1, r = 10 + p * R, a = Math.sin(Math.PI * p);
          waves.push(r);
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(23,48,77," + (.085 * a).toFixed(3) + ")"; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(124,195,230," + (.12 * a).toFixed(3) + ")"; ctx.lineWidth = 6; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = "rgba(23,48,77,.28)"; ctx.fill();
        s.dots.forEach(function (d) {
          var ang = d.a + now * .000018, rr = d.f * R, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          var hit = waves.some(function (w) { return Math.abs(w - rr) < 16; });
          d.glow += ((hit ? 1 : 0) - d.glow) * .08;
          ctx.beginPath(); ctx.arc(x, y, 3.2 + d.glow * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + Math.round(23 + d.glow * 213) + "," + Math.round(48 + d.glow * 77) + "," + Math.round(77 - d.glow * 24) + "," + (.22 + d.glow * .6).toFixed(3) + ")";
          ctx.fill();
        });
      });
    }
    function loop(now) {
      if (now - last > (PHONE.matches ? 48 : 33)) { last = now; draw(now); }   // slow ripples need only 20–30 fps
      lraf = requestAnimationFrame(loop);
    }
    fit(); addEventListener("resize", function () { fit(); if (!MOTION) draw(4000); });
    if (MOTION) {
      lraf = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", function () { cancelAnimationFrame(lraf); if (!document.hidden) lraf = requestAnimationFrame(loop); });
    } else draw(4000);
  }

  /* ---------- reveal while scrolling ---------- */
  var REVEAL = [
    ["side", ".sec-head .h2, .case-h, main .pull"],
    ["up", ".sec-head .lede, .aside-q, .rv, .mini, .offer, .self, .idea, .faq details, .results li, .st, .timeline li, .fact, .beat, .case-nums li, .bub, .gq, .direct .ccard, .direct .kw-box, .fourq, .rating, .msg-card, .real, .s6-text p, .price-note, .more, .case-label, .ba-src, .tags, .src, .cta-band > *"],
    ["zoom", ".profile, .converge, .builder"]
  ];
  var rvEls = [];
  if (MOTION || root.classList.contains("calm")) {
    REVEAL.forEach(function (g) {
      $$(g[1]).forEach(function (el) {
        if (el.closest(".hero") || (PH.matches && el.parentNode && el.parentNode.hasAttribute && el.parentNode.hasAttribute("data-row"))) return;
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(g[1]); });
        el.setAttribute("data-rv", g[0]);
        el.style.setProperty("--k", Math.min(5, sibs.indexOf(el)));
        rvEls.push(el);
      });
    });
    var scrollDriven = MOTION && window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
    if (!scrollDriven && "IntersectionObserver" in window) {
      var rio = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
      rvEls.forEach(function (el) { rio.observe(el); });
    } else if (!scrollDriven) rvEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- scroll-linked fallback (browsers without scroll timelines) ---------- */
  if (MOTION && !(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) {
    var sraf = 0;
    var sl = function () {
      var y = scrollY, vh = innerHeight, doc = document.documentElement.scrollHeight - vh;
      root.style.setProperty("--hp", Math.min(1, y / (vh * .8)).toFixed(3));
      root.style.setProperty("--hp2", Math.min(1, y / (vh * 1.2)).toFixed(3));
      root.style.setProperty("--dp", doc > 0 ? (y / doc).toFixed(4) : 0);
    };
    addEventListener("scroll", function () { cancelAnimationFrame(sraf); sraf = requestAnimationFrame(sl); }, { passive: true }); sl();
  }

  /* ---------- ripples in navy bands rest while off screen ---------- */
  $$(".rip-in").forEach(function (r) { whenVisible(r.parentNode, function () { r.classList.remove("off"); }, function () { r.classList.add("off"); }); });

  /* ---------- init ---------- */
  setLang(root.lang === "en" ? "en" : "ar");
})();
