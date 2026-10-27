/* Layal Joumaa — site behaviour. No dependencies. */

/* Fill these in when you have them. Empty values stay hidden on the site. */
var CONFIG = {
  linkedin: "https://www.linkedin.com/in/layal-j-b01a39201/",
  email: "",     // e.g. "hello@example.com"
  whatsapp: ""   // international digits only, e.g. "9639XXXXXXXX"
};

(function () {
  var root = document.documentElement;
  root.classList.add("js-ok");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOTION = root.classList.contains("motion");
  var FINE = false;
  try { FINE = matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) {}
  var hooks = []; // things to re-render when the language changes
  var AR = function () { return root.lang === "ar"; };

  /* ---------- language ---------- */
  function setLang(l) {
    root.lang = l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    var t = root.getAttribute("data-title-" + l);
    if (t) document.title = t;
    var b = $("#langBtn");
    if (b) {
      b.textContent = l === "ar" ? "EN" : "عربي";
      b.setAttribute("aria-label", l === "ar" ? "Switch to English" : "التبديل إلى العربية");
      b.setAttribute("lang", l === "ar" ? "en" : "ar");
    }
    $$("[data-ph-" + l + "]").forEach(function (el) { el.placeholder = el.getAttribute("data-ph-" + l); });
    $$("[data-al-" + l + "]").forEach(function (el) { el.setAttribute("aria-label", el.getAttribute("data-al-" + l)); });
    try { localStorage.setItem("lj-lang", l); } catch (e) {}
    hooks.forEach(function (f) { f(); });
  }
  var langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", function () { setLang(AR() ? "en" : "ar"); });

  /* ---------- phone & tablet menu: a full sheet ---------- */
  var menu = $("#menuBtn"), nav = $("#nav");
  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle("open", open);
    root.classList.toggle("menu-open", open);
    if (menu) {
      menu.setAttribute("aria-expanded", open ? "true" : "false");
      var lab = $(".vh", menu); if (lab) lab.textContent = open ? (AR() ? "إغلاق القائمة" : "Close menu") : (AR() ? "القائمة" : "Menu");
    }
  }
  if (menu && nav) {
    menu.addEventListener("click", function (e) { e.stopPropagation(); setMenu(!nav.classList.contains("open")); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menu.focus(); } });
    addEventListener("resize", function () { if (innerWidth > 1020) setMenu(false); });
  }

  /* ---------- CONFIG ---------- */
  $$(".js-li").forEach(function (a) { a.href = CONFIG.linkedin; });
  var em = $("#rowEmail"), wa = $("#rowWa");
  if (em && CONFIG.email) { em.hidden = false; em.href = "mailto:" + CONFIG.email; $("small", em).textContent = CONFIG.email; }
  if (wa && CONFIG.whatsapp) { wa.hidden = false; wa.href = "https://wa.me/" + CONFIG.whatsapp; $("small", wa).textContent = "+" + CONFIG.whatsapp; }

  /* ---------- little bursts of petals (her 🤍 energy) ---------- */
  function burst(x, y, n) {
    if (!MOTION) return;
    var cols = ["#EE7F2D", "#F4DDD9", "#E9C2BC", "#F7A266", "#ffffff"];
    for (var i = 0; i < (n || 18); i++) {
      var p = document.createElement("span");
      p.className = "petal";
      p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = cols[i % cols.length];
      document.body.appendChild(p);
      var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
      var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 30;
      var anim = p.animate([
        { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: "translate(calc(-50% + " + dx.toFixed(0) + "px), calc(-50% + " + dy.toFixed(0) + "px)) rotate(" + (Math.random() * 360 - 180).toFixed(0) + "deg)", opacity: 1, offset: .6 },
        { transform: "translate(calc(-50% + " + (dx * 1.2).toFixed(0) + "px), calc(-50% + " + (dy + 70).toFixed(0) + "px)) rotate(" + (Math.random() * 540 - 270).toFixed(0) + "deg)", opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
  }
  function centerOf(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

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

  /* DM keywords (PROFILE / SHIFT) */
  $$(".kw[data-kw]").forEach(function (b) {
    b.addEventListener("click", function () {
      copy(b.getAttribute("data-kw"), function () {
        b.setAttribute("data-done", "");
        var c = centerOf(b); burst(c[0], c[1]);
        var s = b.closest("section, .direct");
        s = s && $(".kw-status", s);
        if (s) s.textContent = AR()
          ? "انسخت «" + b.getAttribute("data-kw") + "». الصقها برسالة على LinkedIn."
          : "Copied “" + b.getAttribute("data-kw") + "”. Paste it in a LinkedIn message.";
        setTimeout(function () { b.removeAttribute("data-done"); }, 2400);
      });
    });
  });

  /* ---------- home: the opening ----------
     A sample CV line is struck with her red pen and rewritten, the page flips and folds into a
     paper plane, and the plane flies from Syria across the dotted map to where her clients work,
     landing on a pin that opens into her real headline. The finished state is plain HTML and CSS;
     this only plays over it, once per session, and never with reduced motion. One clock drives
     every layer (Web Animations, transform/opacity/stroke-dashoffset only), so pausing, skipping
     and replaying are each one line. */
  var fl = $("#flight");
  if (fl) (function () {
    var KEY = "lj-flight", T = 5700, anims = [], playing = false, first = true, inView = true;
    var replay = $(".fl-replay", fl), view = $(".fl-view", fl), world = $(".fl-world", fl), cv = $(".fl-cv", fl);
    var VB = fl.getAttribute("data-vb").split(" ").map(Number);
    var R = fl.getAttribute("data-route").split(" ").map(Number);
    var S = [R[0], R[1]], C = [R[2], R[3]], E = [R[4], R[5]];

    function bez(x1, y1, x2, y2) { // CSS cubic-bezier as a function, to keep JS maths in step with WAAPI easing
      return function (x) {
        if (x <= 0) return 0; if (x >= 1) return 1;
        var t = x;
        for (var i = 0; i < 10; i++) {
          var cx = 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t - x;
          var dx = 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
          if (Math.abs(cx) < 1e-5 || Math.abs(dx) < 1e-6) break;
          t = Math.max(0, Math.min(1, t - cx / dx));
        }
        return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
      };
    }
    var CAM = [.55, 0, .2, 1], camE = bez.apply(null, CAM), planeE = bez(.42, 0, .25, 1);
    var C0 = 2950, C1 = 4550, F0 = 3020, F1 = 4800;
    function cb(a) { return "cubic-bezier(" + a.join(",") + ")"; }

    // the plane's route: a quadratic arc, walked at even speed
    function q(t) { var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * S[0] + b * C[0] + c * E[0], a * S[1] + b * C[1] + c * E[1]]; }
    function qd(t) { return [2 * (1 - t) * (C[0] - S[0]) + 2 * t * (E[0] - C[0]), 2 * (1 - t) * (C[1] - S[1]) + 2 * t * (E[1] - C[1])]; }
    var LUT = [0], N = 240, prev = q(0);
    for (var i = 1; i <= N; i++) { var p = q(i / N); LUT.push(LUT[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
    function tAt(f) {
      var target = f * LUT[N], lo = 0, hi = N;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (LUT[mid] < target) lo = mid; else hi = mid; }
      var span = LUT[hi] - LUT[lo] || 1;
      return (lo + (target - LUT[lo]) / span) / N;
    }
    function deg(v) { return Math.atan2(v[1], v[0]) * 180 / Math.PI; }

    // one animation per element and property, all on the same clock (duration T)
    function K(el, frames) {
      if (!el) return;
      var kf = frames.map(function (f) { var o = {}; for (var k in f[1]) o[k] = f[1][k]; o.offset = Math.min(1, f[0] / T); if (f[2]) o.easing = f[2]; return o; });
      if (kf[0].offset > 0) { var a = {}; for (var k in frames[0][1]) a[k] = frames[0][1][k]; a.offset = 0; kf.unshift(a); }
      if (kf[kf.length - 1].offset < 1) { var z = {}; for (var k2 in frames[frames.length - 1][1]) z[k2] = frames[frames.length - 1][1][k2]; z.offset = 1; kf.push(z); }
      anims.push(el.animate(kf, { duration: T, fill: "both" }));
    }

    function play() {
      if (!fl.animate || !MOTION) return done();
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      root.classList.add("intro"); fl.classList.add("playing"); playing = true;
      if (replay) replay.hidden = true;
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}

      // camera: start close on Syria, right under the CV page, then pull back to the whole route
      var W = world.offsetWidth, WH = world.offsetHeight, pxu = W / VB[2];
      var ox = (S[0] - VB[0]) / VB[2], oy = (S[1] - VB[1]) / VB[3];
      var cx = cv.offsetLeft + cv.offsetWidth / 2, cy = cv.offsetTop + cv.offsetHeight / 2;
      var s0 = 2.6, tx = cx - (view.offsetLeft + ox * W), ty = cy - (view.offsetTop + oy * WH);
      function cam(e) { return "translate(" + (tx * (1 - e)).toFixed(2) + "px," + (ty * (1 - e)).toFixed(2) + "px) scale(" + (s0 + (1 - s0) * e).toFixed(4) + ")"; }
      function camAt(ms) { return camE(Math.max(0, Math.min(1, (ms - C0) / (C1 - C0)))); }
      K(world, [[0, { transform: cam(0) }], [C0, { transform: cam(0) }, cb(CAM)], [C1, { transform: cam(1) }]]);
      K(view, [[0, { opacity: 0 }], [450, { opacity: .6 }], [C0, { opacity: .6 }], [3600, { opacity: 1 }]]);

      // 1. the red pen: the vague line is struck word by word, the sharp one is written in
      $$(".fl-old [data-l]", fl).forEach(function (line) {
        $$(".fx", line).forEach(function (x, i) {
          var a = 300 + i * 85;
          K(x, [[a, { transform: "scaleX(0)" }, "cubic-bezier(.6,0,.3,1)"], [a + 190, { transform: "scaleX(1)" }]]);
        });
      });
      K($(".fl-old", fl), [[950, { opacity: 1 }], [1200, { opacity: .55 }]]);
      K($(".fl-hi", fl), [[800, { transform: "scaleX(0)" }, "cubic-bezier(.6,0,.3,1)"], [1050, { transform: "scaleX(1)" }]]);
      $$(".fl-new [data-l]", fl).forEach(function (line) {
        $$(".fw", line).forEach(function (w, i) {
          var a = 900 + i * 70;
          K(w, [[a, { opacity: 0, transform: "translateY(6px)" }, "cubic-bezier(.2,.8,.2,1)"], [a + 260, { opacity: 1, transform: "translateY(0px)" }]]);
        });
      });
      K($(".fl-note", fl), [[1050, { opacity: 0, transform: "translateY(8px)" }, "cubic-bezier(.2,.8,.2,1)"], [1400, { opacity: 1, transform: "translateY(0px)" }], [2120, { opacity: 1, transform: "translateY(0px)" }], [2260, { opacity: 0, transform: "translateY(0px)" }]]);
      K($(".fl-fill", fl), [[850, { transform: "scaleX(.25)" }, "cubic-bezier(.3,.7,.3,1)"], [1950, { transform: "scaleX(1)" }]]);
      K($(".fl-ok", fl), [[1950, { transform: "scale(0)" }, "ease-out"], [2080, { transform: "scale(1.3)" }, "ease-in"], [2180, { transform: "scale(1)" }]]);

      // 2. the page turns over and folds into a plane
      var H = deg(qd(0));
      K($(".fl-paper", fl), [[2200, { transform: "rotateY(0deg)" }, "ease-in"], [2380, { transform: "rotateY(90deg)" }], [2380, { transform: "rotateY(-90deg)" }, "ease-out"], [2560, { transform: "rotateY(0deg)" }]]);
      K($(".fl-front", fl), [[2380, { opacity: 1 }], [2380, { opacity: 0 }]]);
      K($(".fl-back", fl), [[2380, { opacity: 0 }], [2380, { opacity: 1 }]]);
      K($(".fl-flap.l", fl), [[2580, { transform: "rotate3d(-1,1,0,0deg)" }, "cubic-bezier(.5,0,.3,1)"], [2860, { transform: "rotate3d(-1,1,0,180deg)" }]]);
      K($(".fl-flap.r", fl), [[2640, { transform: "rotate3d(1,1,0,0deg)" }, "cubic-bezier(.5,0,.3,1)"], [2920, { transform: "rotate3d(1,1,0,180deg)" }]]);
      K(cv, [[2920, { opacity: 1, transform: "rotate(0deg) scale(1,1)" }, "cubic-bezier(.5,0,.7,1)"], [3070, { opacity: 0, transform: "rotate(" + H.toFixed(1) + "deg) scale(.1,.16)" }]]);

      // 3. the flight: plane, dotted trail and camera share one set of samples
      var D0 = 50, D1 = W < 480 ? 28 : 32, n = 40, pf = [], tf = [], last = H;
      function size(ms) { return D0 + (D1 - D0) * camAt(ms); }
      function scaleAt(ms) { return size(ms) / (56 * pxu * (s0 + (1 - s0) * camAt(ms))); }
      function pose(x, y, a, k) { return "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) rotate(" + a.toFixed(2) + "deg) scale(" + k.toFixed(4) + ")"; }
      pf.push([2900, { opacity: 0, transform: pose(S[0], S[1], H, scaleAt(2900) * .35) }, "cubic-bezier(.2,.8,.2,1)"]);
      pf.push([F0, { opacity: 1, transform: pose(S[0], S[1], H, scaleAt(F0)) }]);
      tf.push([F0, { strokeDashoffset: 1 }]);
      for (var j = 1; j <= n; j++) {
        var u = j / n, ms = F0 + (F1 - F0) * u, f = planeE(u), tt = tAt(f), p = q(tt), a = deg(qd(tt));
        while (a - last > 180) a -= 360;
        while (a - last < -180) a += 360;
        last = a;
        pf.push([ms, { opacity: 1, transform: pose(p[0], p[1], a, scaleAt(ms)) }]);
        tf.push([ms, { strokeDashoffset: 1 - f }]);
      }
      pf.push([F1 + 160, { opacity: 0, transform: pose(E[0], E[1], last, scaleAt(F1) * .2) }]);
      K($(".fl-plane", fl), pf);
      K($('.fl-rev[data-k="us"]', fl), tf);
      K($('.fl-rev[data-k="gulf"]', fl), [[3150, { strokeDashoffset: 1 }, "cubic-bezier(.5,0,.3,1)"], [3900, { strokeDashoffset: 0 }]]);
      K($('.fl-rev[data-k="eu"]', fl), [[3350, { strokeDashoffset: 1 }, "cubic-bezier(.5,0,.3,1)"], [4150, { strokeDashoffset: 0 }]]);

      // 4. pins land, the US pin opens into her profile
      function pop(sel, at) {
        var pin = $(sel, fl); if (!pin) return;
        K(pin, [[at, { opacity: 0, transform: "scale(0)" }, "cubic-bezier(.2,.8,.2,1)"], [at + 200, { opacity: 1, transform: "scale(1.35)" }, "ease-in-out"], [at + 380, { opacity: 1, transform: "scale(1)" }]]);
        K($(".lab", pin), [[at + 120, { opacity: 0, transform: "translateY(4px)" }, "ease-out"], [at + 420, { opacity: 1, transform: "translateY(0px)" }]]);
      }
      K($(".fl-origin", fl), [[3250, { opacity: 0 }], [3550, { opacity: 1 }]]);
      K($(".fl-origin .lab", fl), [[3700, { opacity: 0 }], [4000, { opacity: 1 }]]);
      pop('.fl-pin[data-k="gulf"]', 3820);
      pop('.fl-pin[data-k="eu"]', 4070);
      pop('.fl-pin[data-k="us"]', F1 - 40);
      K($(".fl-stem", fl), [[F1 + 40, { opacity: 0, transform: "scaleY(0)" }, "cubic-bezier(.5,0,.3,1)"], [F1 + 300, { opacity: 1, transform: "scaleY(1)" }]]);
      K($(".fl-card", fl), [[F1 + 160, { opacity: 0, transform: "translateY(14px) scale(.9)" }, "cubic-bezier(.2,.8,.2,1)"], [5600, { opacity: 1, transform: "translateY(0px) scale(1)" }]]);

      var end = anims[anims.length - 1];
      if (end) end.finished.then(done, function () {});
      else done();
    }

    function done() {
      if (!playing && !root.classList.contains("intro")) return;
      playing = false;
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      root.classList.remove("intro"); fl.classList.remove("playing");
      if (replay && MOTION) replay.hidden = false;
    }

    // pause with the tab, skip when it scrolls away or the layout changes, tap or Escape to skip
    document.addEventListener("visibilitychange", function () {
      if (playing) anims.forEach(function (a) { if (document.hidden) a.pause(); else a.play(); });
    });
    var lastW = innerWidth;
    addEventListener("resize", function () { if (innerWidth !== lastW) { lastW = innerWidth; if (playing) done(); } });
    fl.addEventListener("click", function (e) { if (playing && !e.target.closest(".fl-replay")) done(); });
    document.addEventListener("keydown", function (e) { if (playing && e.key === "Escape") done(); });
    if (replay) replay.addEventListener("click", function () { if (!playing) play(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        inView = es[es.length - 1].isIntersecting;
        fl.classList.toggle("idle", !inView); // the ambient loop rests off-screen
        if (first) { first = false; if (root.classList.contains("intro")) { if (inView) play(); else done(); } return; }
        if (!inView && playing) done();
      }, { threshold: 0.2 }).observe(fl);
    } else done();
    if (replay && MOTION && !root.classList.contains("intro")) replay.hidden = false;
  })();
  else root.classList.remove("intro");

  /* ---------- ideas: filter + surprise me ---------- */
  var chips = $$(".chip[data-f]");
  if (chips.length) {
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.getAttribute("data-f"), shown = 0;
        chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        $$(".post").forEach(function (p, i) {
          var ok = f === "all" || p.getAttribute("data-t") === f;
          p.hidden = !ok;
          if (ok) { shown++; if (MOTION) p.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: shown * 40, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" }); }
        });
        var live = $("#feedCount");
        if (live) live.textContent = AR() ? shown + " فكرة" : shown + (shown === 1 ? " idea" : " ideas");
      });
    });
  }
  var sb = $("#surprise");
  if (sb) sb.addEventListener("click", function () {
    var vis = $$(".post").filter(function (p) { return !p.hidden; });
    if (!vis.length) return;
    $$(".post.picked").forEach(function (p) { p.classList.remove("picked"); });
    var p = vis[Math.floor(Math.random() * vis.length)];
    p.classList.add("picked");
    p.scrollIntoView({ behavior: MOTION ? "smooth" : "auto", block: "center" });
    setTimeout(function () { var c = centerOf(p); burst(c[0], c[1] - 40, 14); }, MOTION ? 500 : 0);
  });

  /* ---------- contact: three taps to a ready message ---------- */
  var wiz = $("#wiz");
  var T = {
    ar: {
      hi: "مرحبا ليال 👋",
      me: function (n, r) { return n && r ? "أنا " + n + "، " + r + "." : n ? "أنا " + n + "." : r ? "أنا " + r + "." : ""; },
      stage: { grad: "تخرجت حديثاً وعم دوّر على أول فرصة حقيقية.", exp: "عندي خبرة بمجالي، وبدي ملف مهني يعكسها صح.", shift: "عم فكّر انتقل لمجال جديد بدون ما خسر خبرتي.", team: "بمثّل شركة، وبدنا صورة مهنية موحّدة لفريقنا." },
      svc: { cv: "الـCV", cover: "الـCover Letter ورسالتي للـHR", li: "الـLinkedIn", both: "الـCV والـLinkedIn مع بعض", shift: "الـCareer Shift والـPositioning", brand: "المحتوى والـPersonal Brand", team: "ملفات الفريق بنفس الـDNA" },
      market: { sy: "سوق العمل بسوريا", gulf: "فرص بالخليج", eu: "فرص بأوروبا", us: "فرص بأمريكا", open: "سوق لسا عم حدده" },
      want: function (s, m) { return "بدي اشتغل معك على " + s + "، والهدف " + m + "."; },
      end: "مرفق الـCV الحالي، وبتمنى نحكي عن الخطوة الجاية 🙏",
      copied: "انسخت ✓ افتح LinkedIn والصقها برسالة لليال، وأرفق الـCV."
    },
    en: {
      hi: "Hi Layal 👋",
      me: function (n, r) { return n && r ? "I'm " + n + ", " + r + "." : n ? "I'm " + n + "." : r ? "I'm " + r + "." : ""; },
      stage: { grad: "I've just graduated and I'm looking for my first real opportunity.", exp: "I have experience in my field and want a profile that shows it properly.", shift: "I'm planning to move into a new field without losing what I've built.", team: "I represent a company and we want one professional look across our team." },
      svc: { cv: "my CV", cover: "my cover letter and message to HR", li: "my LinkedIn", both: "my CV and LinkedIn together", shift: "my career shift and positioning", brand: "my content and personal brand", team: "our team's profiles with one shared DNA" },
      market: { sy: "jobs in Syria", gulf: "opportunities in the Gulf", eu: "opportunities in Europe", us: "opportunities in the US", open: "a market I'm still deciding on" },
      want: function (s, m) { return "I'd like to work with you on " + s + ", aiming for " + m + "."; },
      end: "My current CV is attached. I'd love to talk about the next step 🙏",
      copied: "Copied ✓ Open LinkedIn, paste it in a message to Layal and attach your CV."
    }
  };
  if (wiz) {
    var panes = $$(".wiz-pane", wiz), stepEls = $$(".wiz-steps li", wiz), step = 0, LAST = panes.length - 1;
    var back = $("#wizBack"), nextB = $("#wizNext"), msgTyping = null;
    var val = function (n) { var el = wiz.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ""; };
    function message() {
      var L = T[root.lang] || T.ar;
      var name = ($("#fName").value || "").trim(), role = ($("#fRole").value || "").trim();
      return [L.hi, "", [L.me(name, role), L.stage[val("stage")] || ""].filter(Boolean).join(" "),
        L.want(L.svc[val("svc")] || L.svc.both, L.market[val("market")] || L.market.open), "", L.end].join("\n");
    }
    function renderMsg(animate) {
      var out = $("#msgOut"), text = message();
      clearTimeout(msgTyping);
      if (!animate || !MOTION) { out.textContent = text; out.classList.remove("typing"); return; }
      var k = 0; out.classList.add("typing");
      (function stepT() { k = Math.min(text.length, k + 2); out.textContent = text.slice(0, k); if (k < text.length) msgTyping = setTimeout(stepT, 14); else out.classList.remove("typing"); })();
    }
    // the letter beside the form writes one line per answer, and folds into its envelope on copy
    var letter = $("#letter");
    function picks() {
      $$(".pick", wiz).forEach(function (chip) {
        var n = chip.getAttribute("data-for"), el = wiz.querySelector('input[name="' + n + '"]:checked');
        chip.hidden = !el;
        if (el) { var tile = el.closest(".tile"); $(".pk", chip).innerHTML = $(".ti", tile).innerHTML + " " + $("b", tile).innerHTML; }
      });
      if (letter) {
        $$(".lt-line", letter).forEach(function (line) {
          var el = wiz.querySelector('input[name="' + line.getAttribute("data-for") + '"]:checked');
          line.classList.toggle("on", !!el);
          if (el) { var tile = el.closest(".tile"); $(".lt-v", line).innerHTML = $(".ti", tile).innerHTML + " " + $("b", tile).innerHTML; }
          else $(".lt-v", line).textContent = "";
        });
        letter.classList.remove("sent");
      }
    }
    function go(n, dir) {
      n = Math.max(0, Math.min(LAST, n));
      panes.forEach(function (p, i) {
        p.classList.toggle("on", i === n);
        p.classList.toggle("before", i < n);
        p.setAttribute("aria-hidden", i === n ? "false" : "true");
        if ("inert" in p) p.inert = i !== n;
      });
      stepEls.forEach(function (li, i) { li.classList.toggle("done", i < n); li.classList.toggle("now", i === n); });
      if (paneH[n]) stageEl.style.height = paneH[n] + "px";
      wiz.style.setProperty("--prog", (n / LAST));
      step = n;
      back.disabled = n === 0;
      var needs = panes[n].getAttribute("data-name");
      nextB.hidden = n === LAST;
      nextB.disabled = !!needs && !val(needs);
      picks();
      if (n === LAST) renderMsg(true);
    }
    $$(".tile input", wiz).forEach(function (inp) {
      var tile = inp.closest(".tile");
      inp.addEventListener("change", function () {
        nextB.disabled = false; picks();
        tile.classList.remove("pop"); void tile.offsetWidth; tile.classList.add("pop");
      });
      tile.addEventListener("click", function (e) {
        // a real tap on the tile moves on by itself; keyboard selection (arrows, space) only selects,
        // and the label's forwarded click on the input (detail 0) is ignored
        if (e.detail > 0 && e.target !== inp) {
          var c = centerOf(tile); burst(c[0], c[1], 10);
          var at = step; setTimeout(function () { if (step === at) go(step + 1); }, MOTION ? 380 : 0);
        }
      });
    });
    back.addEventListener("click", function () { go(step - 1); });
    nextB.addEventListener("click", function () { go(step + 1); });
    $$(".pick", wiz).forEach(function (chip) {
      chip.addEventListener("click", function () { go(+chip.getAttribute("data-step")); });
    });
    $("#fName").addEventListener("input", function () { renderMsg(false); });
    $("#fRole").addEventListener("input", function () { renderMsg(false); });
    $("#copyMsg").addEventListener("click", function () {
      var btn = this;
      renderMsg(false);
      copy($("#msgOut").textContent, function () {
        $("#msgStatus").textContent = (T[root.lang] || T.ar).copied;
        var c = centerOf(btn); burst(c[0], c[1], 26);
        btn.classList.add("done");
        if (letter) letter.classList.add("sent");
      });
    });
    // arriving from a service card: that service is already ticked
    try {
      var pre = new URLSearchParams(location.search).get("svc");
      var inp = pre && wiz.querySelector('input[name="svc"][value="' + pre.replace(/[^a-z]/g, "") + '"]');
      if (inp) inp.checked = true;
    } catch (e) {}
    var stageEl = $(".wiz-stage", wiz);
    function fitStage() {
      var probe = document.createElement("div");
      probe.className = "wiz";
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden;padding:0;border:0;box-shadow:none;width:" + stageEl.clientWidth + "px";
      var clones = [];
      panes.forEach(function (p) {
        var c = p.cloneNode(true);
        $$("[id]", c).forEach(function (e) { e.removeAttribute("id"); });
        $$('input[type="radio"]', c).forEach(function (i) { i.name = "probe-" + i.name; });
        if (p.classList.contains("final")) { var o = $(".out", c); if (o) o.textContent = message(); $$(".pick", c).forEach(function (b) { b.hidden = false; }); }
        c.classList.add("on"); c.classList.remove("before");
        c.style.cssText = "position:static;opacity:1;translate:none;transition:none";
        probe.appendChild(c); clones.push(c);
      });
      document.body.appendChild(probe);
      paneH = clones.map(function (c) { return Math.ceil(c.offsetHeight + 6); });
      probe.remove();
      sizeStage();
    }
    var paneH = [];
    function sizeStage() { if (paneH[step]) stageEl.style.height = paneH[step] + "px"; }
    var rzW;
    addEventListener("resize", function () { clearTimeout(rzW); rzW = setTimeout(fitStage, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStage);
    hooks.push(function () { picks(); if (step === LAST) renderMsg(false); fitStage(); });
    fitStage();
    go(0);
  }

  /* ---------- services page: index follows you ---------- */
  var svIdx = $$(".sv-index a");
  if (svIdx.length && "IntersectionObserver" in window) {
    var svIo = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        svIdx.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("on", on);
          if (on) {
            var bar = a.parentNode, br = bar.getBoundingClientRect(), ar = a.getBoundingClientRect();
            if (bar.scrollWidth > bar.clientWidth + 2) bar.scrollBy({ left: (ar.left + ar.width / 2) - (br.left + br.width / 2), behavior: MOTION ? "smooth" : "auto" });
          }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$(".sv[id]").forEach(function (el) { svIo.observe(el); });
  }

  /* ---------- nav: a pill that slides to what you point at ---------- */
  var navEl = $("#nav");
  if (navEl && FINE) {
    var pill = document.createElement("span"); pill.className = "nav-pill"; pill.setAttribute("aria-hidden", "true");
    navEl.appendChild(pill);
    var curLink = $('a[aria-current="page"]', navEl);
    function place(a, show) {
      if (!a || getComputedStyle(navEl).position !== "relative") return;
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
      pill.classList.toggle("show", !!show);
    }
    $$("a", navEl).forEach(function (a) {
      a.addEventListener("pointerenter", function () { navEl.classList.add("hovering"); place(a, true); });
      a.addEventListener("pointerdown", function () { pill.classList.add("press"); a.classList.add("press"); });
      a.addEventListener("pointerup", function () { pill.classList.remove("press"); a.classList.remove("press"); });
      a.addEventListener("pointerleave", function () { pill.classList.remove("press"); a.classList.remove("press"); });
    });
    navEl.addEventListener("pointerleave", function () { navEl.classList.remove("hovering"); place(curLink, false); });
    addEventListener("resize", function () { place(curLink, false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(curLink, false); });
    hooks.push(function () { setTimeout(function () { place(curLink, false); }, 30); });
  }

  /* ---------- headline lab ---------- */
  var hl = $("#hl");
  if (hl) {
    var ROLE = /(engineer|developer|designer|manager|accountant|analyst|specialist|consultant|writer|teacher|doctor|nurse|pharmacist|architect|marketer|marketing|sales|hr|recruiter|lead|officer|coordinator|administrator|technician|lawyer|researcher|founder|student|graduate|مهندس|مطور|مطوّر|مصمم|مصممة|مدير|مديرة|محاسب|محاسبة|محلل|أخصائي|اخصائي|مستشار|كاتب|كاتبة|معلم|معلمة|مدرس|طبيب|صيدلي|ممرض|مسوق|مبيعات|موارد بشرية|منسق|محامي|باحث|مؤسس|خريج|طالب)/i;
    var SEEK = /(looking for|seeking|open to work|job ?seeker|available for|in search of|searching for|باحث عن عمل|باحثة عن عمل|ابحث عن|أبحث عن|عم دور|عم دوّر|بدور على شغل|متاح للعمل|متاحة للعمل)/i;
    var PROOF_W = /(\d|certified|معتمد|معتمدة|react|python|excel|figma|sql|power ?bi|autocad|sap|photoshop|seo|aws|azure|java|ccna|pmp|cpa|acca)/i;
    var PROOF = { test: function (v) { return PROOF_W.test(v) || /\b[A-Z]{2,6}\b/.test(v); } };
    var VALUE = /(help|helping|build|building|turn|grow|deliver|بساعد|اساعد|أساعد|ببني|أبني|بحوّل|بطوّر|خبرة|experience|expert|خبير|خبيرة|\+)/i;
    var MSG = {
      ar: ["اكتب الـHeadline تبعك وشوف شو بيفهم الزائر.", "الزائر رح يمرق بدون ما يعرف مين انت 👀", "في بداية… بس لسا ما بيوقّف الشخص الصح.", "في بداية حلوة. خطوتين وبيصير بيحكي عنك.", "قريب كتير! خطوة صغيرة وبيصير بيحكي عنك.", "هيك بيحكي عنك قبل المقابلة 🤍 تأكد إن الـProfile كله ماشي بنفس الاتجاه."],
      en: ["Type your headline and see what a visitor understands.", "A visitor will scroll past without knowing who you are 👀", "It's a start, but it won't stop the right person yet.", "A good start. Two more steps and it speaks for you.", "So close! One small step and it speaks for you.", "That speaks for you before the interview 🤍 Make sure the whole profile points the same way."]
    };
    var EX = ["Fresh graduate looking for job opportunities", "Network Engineer | CCNA | Building secure networks for growing teams in the Gulf"];
    var exI = 0;
    function check() {
      var v = hl.value.trim();
      var segs = v.split(/\s*(?:\|\||\||•|·|–|—|،|,|\/)\s*/).filter(Boolean);
      var first = (segs[0] || "").split(/\s+/).filter(Boolean);
      var res = {
        who: v.length > 0 && (ROLE.test(segs[0] || "") || first.length >= 2) && !/^(student|graduate|طالب|خريج)$/i.test(segs[0] || ""),
        value: v.length > 0 && (segs.length >= 2 || VALUE.test(v)),
        direction: v.length > 0 && !SEEK.test(v),
        proof: PROOF.test(v),
        length: v.length >= 50 && v.length <= 220
      };
      var keys = Object.keys(res), score = 0;
      keys.forEach(function (k) {
        var li = $('.checks [data-k="' + k + '"]');
        if (li) li.classList.toggle("ok", res[k]);
        if (res[k]) score++;
      });
      var pct = v ? score * 20 : 0;
      $("#hlCount").textContent = v.length + "/220";
      var ring = $("#hlRing"), num = $("#hlScore");
      if (ring) ring.style.strokeDashoffset = String(1 - pct / 100);
      if (num) num.textContent = pct;
      $("#hlVerdict").textContent = (MSG[root.lang] || MSG.ar)[v ? Math.min(5, Math.max(1, score)) : 0];
      $(".lab-out").classList.toggle("great", pct === 100);
    }
    hl.addEventListener("input", check);
    $("#hlTry").addEventListener("click", function () {
      var s = EX[exI++ % EX.length], k = 0;
      hl.value = "";
      if (!MOTION) { hl.value = s; check(); return; }
      (function step() { k++; hl.value = s.slice(0, k); check(); if (k < s.length) setTimeout(step, 22); else if (exI % 2 === 0) { var c = centerOf($(".score")); burst(c[0], c[1], 20); } })();
    });
    hooks.push(check);
  }

  /* ---------- career-shift checklist ---------- */
  var shiftBox = $("#shiftList");
  if (shiftBox) {
    var boxes = $$('input[type="checkbox"]', shiftBox), saved = [];
    try { saved = JSON.parse(localStorage.getItem("lj-shift") || "[]"); } catch (e) {}
    boxes.forEach(function (b, i) { b.checked = !!saved[i]; });
    function prog(celebrate) {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      $("#shiftBar").style.transform = "scaleX(" + n / boxes.length + ")";
      $("#shiftN").textContent = n + "/" + boxes.length;
      $("#shiftDone").hidden = n !== boxes.length;
      try { localStorage.setItem("lj-shift", JSON.stringify(boxes.map(function (b) { return b.checked; }))); } catch (e) {}
      if (celebrate && n === boxes.length) { var c = centerOf($("#shiftDone")); burst(c[0], c[1], 28); }
    }
    boxes.forEach(function (b) {
      b.addEventListener("change", function () {
        prog(true);
        var d = b.closest("details"); if (b.checked && d) d.classList.add("done"); else if (d) d.classList.remove("done");
      });
      if (b.checked) b.closest("details").classList.add("done");
    });
    prog(false);
  }

  /* ---------- stories map ---------- */
  $$(".dest").forEach(function (g) {
    var ids = (g.getAttribute("data-to") || "").split(" ");
    function on(v) {
      g.classList.toggle("on", v);
      $$('.arc[data-to="' + g.getAttribute("data-key") + '"]').forEach(function (a) { a.classList.toggle("on", v); });
      ids.forEach(function (id) { var s = document.getElementById(id); if (s) s.classList.toggle("hl", v); });
    }
    g.addEventListener("mouseenter", function () { on(true); });
    g.addEventListener("mouseleave", function () { on(false); });
    g.addEventListener("focus", function () { on(true); });
    g.addEventListener("blur", function () { on(false); });
    function go() { var s = document.getElementById(ids[0]); if (s) s.scrollIntoView({ behavior: MOTION ? "smooth" : "auto", block: "center" }); }
    g.addEventListener("click", go);
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  if (!MOTION) $$("svg").forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
  var mapFig = $(".map"), mapSvg = mapFig && $("svg", mapFig), wideVB = mapSvg && mapSvg.getAttribute("viewBox");
  function fitMap() {
    if (!mapSvg) return;
    var narrow = innerWidth < 640;
    mapFig.classList.toggle("narrow", narrow);
    mapSvg.setAttribute("viewBox", narrow ? "596 -40 470 370" : wideVB);
  }
  fitMap(); addEventListener("resize", fitMap);

  /* ---------- reveal on scroll ---------- */
  var ARABIC = /[؀-ۿ]/;
  function splitWords(el) {
    if (el.getAttribute("data-split-done")) return;
    el.setAttribute("data-split-done", "1");
    var idx = 0;
    (function walk(node, rtlRun) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 1) {
          if (ch.tagName === "BR" || ch.classList.contains("w")) return;
          var l = ch.getAttribute("data-l");
          if (l) idx = 0;
          walk(ch, l ? l === "ar" : rtlRun);
          return;
        }
        if (ch.nodeType !== 3 || !ch.nodeValue.trim()) return;
        // words become chunks; inside Arabic text a run of Latin words stays one chunk
        // so the bidi order of "Personal Branding" survives the split
        var out = [];
        ch.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { out.push({ s: tok }); return; }
          var n = out.length;
          // Latin that continues Latin (even "الـCareer" + "Shift") must stay in one chunk
          if (rtlRun && n >= 2 && out[n - 1].s !== undefined && out[n - 2].w !== undefined &&
              /[A-Za-z0-9)\]]$/.test(out[n - 2].w) && /^[A-Za-z0-9(\[+]/.test(tok)) {
            out[n - 2].w += out[n - 1].s + tok; out.pop(); return;
          }
          out.push({ w: tok });
        });
        var frag = document.createDocumentFragment();
        out.forEach(function (o) {
          if (o.s !== undefined) { frag.appendChild(document.createTextNode(o.s)); return; }
          var s = document.createElement("span"); s.className = "w"; s.style.setProperty("--i", idx++);
          s.textContent = o.w; frag.appendChild(s);
        });
        node.replaceChild(frag, ch);
      });
    })(el, root.lang === "ar");
  }

  if (MOTION && "IntersectionObserver" in window) {
    $$(".display, .h2, .pull").forEach(splitWords);
    var groups = [".story", ".idea", ".post", ".svc", ".fact", ".steps li", ".index li", ".system li", ".shift details", ".faq details", ".proof .pf", ".aside .box", ".direct > *"];
    groups.forEach(function (sel) {
      $$(sel).forEach(function (el) {
        var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.setAttribute("data-rv", "up"); el.style.setProperty("--d", Math.min(sib, 8) * 70 + "ms");
      });
    });
    $$(".pc").forEach(function (el) { el.setAttribute("data-rv", ""); });
    $$(".display, .h2, .pull, .lede, .frame, .squig, .map, .lab-out, .cta-row, .reach, .growth, .shift-prog, .sv, .wiz").forEach(function (el) { if (!el.hasAttribute("data-rv")) el.setAttribute("data-rv", ""); });
    $$(".note").forEach(function (el) { if (!el.closest(".sheet")) el.setAttribute("data-write", ""); });
    $$(".stamp").forEach(function (el, i) { el.setAttribute("data-stamp", ""); });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
        $$("[data-count]", e.target).concat(e.target.hasAttribute("data-count") ? [e.target] : []).forEach(count);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$("[data-rv], [data-stamp]").forEach(function (el) { io.observe(el); });
    // a margin note starts fully clipped, so the observer would see zero area and never fire:
    // watch its parent instead and write every note inside it
    var ioW = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$("[data-write]", e.target).forEach(function (w) { w.classList.add("in"); });
        ioW.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$("[data-write]").forEach(function (el) { ioW.observe(el.parentNode); });
    var io2 = new IntersectionObserver(function (ents) { ents.forEach(function (e) { if (e.isIntersecting) { count(e.target); io2.unobserve(e.target); } }); }, { threshold: 0.4 });
    $$("[data-count]").forEach(function (el) { io2.observe(el); });
  } else {
    root.classList.remove("motion");
  }

  /* ---------- counters ---------- */
  function count(el) {
    if (el.getAttribute("data-counted")) return;
    el.setAttribute("data-counted", "1");
    var to = parseFloat(el.getAttribute("data-count")), t0 = performance.now(), dur = 1600;
    (function f(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ---------- pointer life: tilt, magnetic buttons, parallax ---------- */
  if (MOTION && FINE) {
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (x * 7).toFixed(2) + "deg"); el.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
        el.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%"); el.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
    $$(".btn, .kw, .lang").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = ""; });
    });
    var par = $$("[data-depth]"), hero = $(".hero");
    var px = 0, py = 0;
    if (hero && par.length) {
      hero.addEventListener("pointermove", function (e) { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; });
      (function raf() {
        par.forEach(function (el) { var d = parseFloat(el.getAttribute("data-depth")); el.style.translate = (px * d * -22).toFixed(1) + "px " + (py * d * -16).toFixed(1) + "px"; });
        requestAnimationFrame(raf);
      })();
    }
  }

  /* ---------- scroll: progress pen line + marquee speed ---------- */
  var topBar = $(".top");
  var bar = $(".progress"), tracks = [], lastY = scrollY, vel = 0;
  if (MOTION) $$(".mq-track").forEach(function (tr) {
    var rev = tr.parentNode.classList.contains("rev");
    var a = tr.animate(rev ? [{ transform: "translateX(-50%)" }, { transform: "translateX(0)" }] : [{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: 42000, iterations: Infinity });
    tracks.push(a);
    tr.parentNode.addEventListener("mouseenter", function () { a.playbackRate = 0.25; });
    tr.parentNode.addEventListener("mouseleave", function () { a.playbackRate = 1; });
  });
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? scrollY / h : 0) + ")";
    if (topBar) topBar.classList.toggle("raised", scrollY > 8);
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (tracks.length) (function tick() {
    var dy = Math.abs(scrollY - lastY); lastY = scrollY; vel += (dy - vel) * 0.1;
    tracks.forEach(function (a) { if (a.playbackRate >= 1 || a.playbackRate === 0) a.playbackRate = 1 + Math.min(vel, 40) * 0.12; });
    requestAnimationFrame(tick);
  })();

  /* ---------- timelines that walk with the reader ---------- */
  var trails = $$("[data-trail]");
  if (trails.length) {
    if (!MOTION) trails.forEach(function (tr) { tr.classList.add("done"); $$("li", tr).forEach(function (li) { li.classList.add("lit"); }); });
    else {
      var st = trails.map(function (tr) { return { el: tr, line: $(".trail-line", tr), items: $$("ol > li", tr), cur: 0 }; });
      (function trailTick() {
        st.forEach(function (o) {
          var lr = o.line.getBoundingClientRect();
          if (lr.bottom < -200 || lr.top > innerHeight + 200) return;
          var target = Math.max(0, Math.min(lr.height, innerHeight * 0.62 - lr.top));
          o.cur += (target - o.cur) * 0.16;
          if (Math.abs(target - o.cur) < 0.4) o.cur = target;
          o.el.style.setProperty("--p", o.cur.toFixed(1) + "px");
          o.el.classList.toggle("done", o.cur >= lr.height - 1);
          var tip = lr.top + o.cur;
          o.items.forEach(function (li) { li.classList.toggle("lit", li.getBoundingClientRect().top + 26 <= tip + 2); });
        });
        requestAnimationFrame(trailTick);
      })();
    }
  }

  /* ---------- phones: swipe rows with dots ---------- */
  var PHONE = matchMedia("(max-width: 640px)");
  $$("[data-snap]").forEach(function (row) {
    var items = Array.prototype.slice.call(row.children), dotsEl = null, cur = -1;
    function build() {
      if (dotsEl) { dotsEl.remove(); dotsEl = null; }
      if (!PHONE.matches || items.length < 2) return;
      dotsEl = document.createElement("div"); dotsEl.className = "snap-dots";
      items.forEach(function (it, i) {
        var b = document.createElement("button"); b.type = "button";
        b.setAttribute("aria-label", (i + 1) + " / " + items.length);
        b.addEventListener("click", function () {
          var rr = row.getBoundingClientRect(), ir = it.getBoundingClientRect();
          row.scrollBy({ left: (ir.left + ir.width / 2) - (rr.left + rr.width / 2), behavior: MOTION ? "smooth" : "auto" });
        });
        dotsEl.appendChild(b);
      });
      row.parentNode.insertBefore(dotsEl, row.nextSibling);
      cur = -1; sync();
    }
    function sync() {
      if (!dotsEl) return;
      var rr = row.getBoundingClientRect(), mid = rr.left + rr.width / 2, best = 0, bd = 1e9;
      items.forEach(function (it, i) { var r = it.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best === cur) return; cur = best;
      Array.prototype.forEach.call(dotsEl.children, function (b, i) { b.classList.toggle("on", i === best); });
      items.forEach(function (it, i) { it.classList.toggle("snap-on", i === best); });
    }
    var raf = 0;
    row.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    if (PHONE.addEventListener) PHONE.addEventListener("change", build);
    build();
  });

  /* ---------- phones: a message button that waits at the bottom ---------- */
  var dockEl = $("#dock");
  if (dockEl) {
    var footEl = $(".foot");
    var dockTick = function () {
      var show = scrollY > innerHeight * 0.55;
      if (footEl && footEl.getBoundingClientRect().top < innerHeight - 40) show = false;
      dockEl.classList.toggle("show", show);
    };
    addEventListener("scroll", dockTick, { passive: true }); dockTick();
  }

  /* ---------- init ---------- */
  setLang(root.lang === "en" ? "en" : "ar");
})();
