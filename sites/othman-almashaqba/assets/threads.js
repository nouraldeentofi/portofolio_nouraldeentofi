/* Othman Almashaqba: the living thread field, and the magnifier on the Approach page.

   Threads arrive tangled at the start of the line of reading (right in Arabic, left in
   English) and leave as ordered lanes, the way he re-engineers a process before he
   automates it. In the home hero they untangle as they pass behind his portrait; in page
   heads and the closing band they run as a band. Scrolling straightens them further.
   Canvas 2D, one requestAnimationFrame per field, paused when off screen or hidden.
   With reduced motion each field is drawn once, still. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var REDUCED = false;
  try { REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var TAU = Math.PI * 2;

  function rand(seed) { // small deterministic PRNG, so every visit draws the same knot
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------------------------------------------------ */
  function Field(canvas, seed) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kind = canvas.getAttribute("data-threads");          // "hero" | "band"
    this.soft = canvas.getAttribute("data-density") === "soft";
    this.host = canvas.parentElement;
    this.gate = this.kind === "hero" ? document.getElementById("heroGate") : null;
    this.copy = this.kind === "hero" ? document.getElementById("heroCopy") : null;
    this.strip = this.kind === "hero" ? this.host.querySelector(".hero-strip") : null;
    this.k = 0; this.kTarget = 0;
    this.visible = true; this.raf = 0;
    this.t0 = performance.now() - 4000;
    this.seed = seed;
    this.bed = !!this.host.classList.contains("bed"); // threads under a glass card
    this.measure();
  }

  Field.prototype.colors = function () {
    var cs = getComputedStyle(this.c);
    this.ca = (cs.getPropertyValue("--th-a") || "").trim() || "139,90,60";
    this.cb = (cs.getPropertyValue("--th-b") || "").trim() || "58,98,194";
    this.dark = root.getAttribute("data-theme") === "dark" || this.host.classList.contains("cta-band");
  };

  Field.prototype.measure = function () {
    if (this.strip) { // on phones the hero threads live in a strip; keep the canvas to that strip
      var stripOn = this.strip.offsetHeight > 0;
      if (stripOn) {
        var hr = this.host.getBoundingClientRect(), s0 = this.strip.getBoundingClientRect();
        this.c.style.top = Math.round(s0.top - hr.top - 24) + "px";
        this.c.style.height = Math.round(s0.height + 48) + "px";
      } else { this.c.style.top = ""; this.c.style.height = ""; }
    }
    var r = this.c.getBoundingClientRect();
    var W = Math.max(1, r.width), H = Math.max(1, r.height);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.c.width = Math.round(W * dpr);
    this.c.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = W; this.H = H;
    this.rtl = root.dir === "rtl";
    this.small = W < 700;
    this.colors();

    // geometry in flow coordinates: u runs from the start edge (0) to the end edge (W)
    var g = null;
    if (this.gate && this.copy) {
      var gr = this.gate.getBoundingClientRect(), cr = this.copy.getBoundingClientRect();
      var beside = gr.width > 0 && gr.top < cr.bottom - 40 && gr.bottom > cr.top + 40;
      if (beside) {
        var u0 = this.rtl ? (r.right - gr.right) : (gr.left - r.left);
        // the knot lives below the words and rises into the lower half of the portrait
        var kb = H - 18, kt = Math.max(cr.bottom - r.top + 18, H * 0.5);
        if (kb - kt < 120) kt = kb - 120;
        g = { u0: u0, u1: u0 + gr.width, y: gr.top - r.top + gr.height * 0.68, span: gr.height * 0.5, kt: kt, kb: kb };
      }
    }
    if (!g) {
      var cy, band;
      if (this.strip && this.strip.offsetHeight) {
        var sr = this.strip.getBoundingClientRect();
        cy = sr.top - r.top + sr.height / 2; band = sr.height;
      } else {
        cy = H * 0.5; band = H * 0.84;
      }
      g = { u0: W * 0.54, u1: W * 0.54, y: cy, span: band * 0.62, band: band };
    }
    this.g = g;

    var N = this.kind === "hero" ? (this.small ? 15 : 24) : (this.small ? 11 : 17);
    if (this.soft) N = this.small ? 10 : 14;
    var R = rand(this.seed + (this.small ? 5 : 0));
    var top, bot;
    if (g.band) { top = g.y - g.band * 0.46; bot = g.y + g.band * 0.46; this.mid = g.y; this.half = g.band * 0.5; }
    else { top = g.kt; bot = g.kb; }
    this.mid = (top + bot) / 2; this.half = (bot - top) / 2;
    this.th = [];
    for (var i = 0; i < N; i++) {
      var o = N > 1 ? (i / (N - 1)) * 2 - 1 : 0;
      this.th.push({
        lane: g.y + o * g.span / 2,
        pinch: g.y + o * g.span * 0.17,
        base: lerp(top, bot, R()),
        amp: (bot - top) * (0.2 + R() * 0.28),
        h: [[1.1 + R() * 1.5, R() * TAU, 0.035 + R() * 0.05, 0.6 + R() * 0.3],
            [2.4 + R() * 2.2, R() * TAU, 0.05 + R() * 0.07, 0.26 + R() * 0.2],
            [4.4 + R() * 3.0, R() * TAU, 0.07 + R() * 0.08, 0.1 + R() * 0.1]],
        lx: (0.02 + R() * 0.045) * Math.max(W, 600), lf: 1.4 + R() * 2.4, lp: R() * TAU, lw: 0.04 + R() * 0.06,
        w: R() < 0.2 ? 1.7 : 1.2,
        a: 0.5 + R() * 0.5
      });
    }
    this.pulses = [];
    var P = this.small ? 4 : 7;
    for (var p = 0; p < P; p++) this.pulses.push({ i: (R() * N) | 0, u: R(), v: 0.035 + R() * 0.035, len: 36 + R() * 44 });
    this.gradient();
    this.draw(this.time());
  };

  Field.prototype.gradient = function () {
    var ctx = this.ctx, W = this.W, g = this.g;
    var x0 = this.rtl ? W : 0, x1 = this.rtl ? 0 : W;
    var grad = ctx.createLinearGradient(x0, 0, x1, 0);
    var al = this.dark ? 0.5 : 0.4, bl = this.dark ? 0.62 : 0.52;
    var mid = clamp(g.u0 / W, 0.08, 0.92);
    grad.addColorStop(0, "rgba(" + this.ca + "," + (al * 0.6).toFixed(3) + ")");
    grad.addColorStop(mid * 0.72, "rgba(" + this.ca + "," + al + ")");
    grad.addColorStop(Math.min(0.99, mid + 0.04), "rgba(" + this.cb + "," + bl + ")");
    grad.addColorStop(1, "rgba(" + this.cb + "," + (bl * 0.8).toFixed(3) + ")");
    this.grad = grad;
  };

  Field.prototype.time = function () { return (performance.now() - this.t0) / 1000; };

  Field.prototype.draw = function (t) {
    var ctx = this.ctx, W = this.W, H = this.H, g = this.g, k = this.k, rtl = this.rtl;
    ctx.clearRect(0, 0, W, H);
    var u0 = Math.max(80, g.u0), u1 = g.u1, uc = (g.u0 + u1) / 2;
    var sig = Math.max(70, (u1 - g.u0) * 0.8);
    var tEnd = u0 * (g.band ? 0.46 : 0.58), fade = Math.max(50, u0 - tEnd);
    var straight = 1 - k;
    var step = this.small ? 6 : 7;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = this.grad;
    for (var n = 0; n < this.th.length; n++) {
      var th = this.th[n];
      ctx.globalAlpha = th.a;
      ctx.lineWidth = th.w;
      ctx.beginPath();
      var first = true;
      for (var u = -24; u <= W + 24; u += (u < u0 + 30 ? step : 22)) {
        var wt = (u <= tEnd ? 1 : 1 - smooth((u - tEnd) / fade)) * straight;
        var s = u / u0, yt = th.base;
        for (var j = 0; j < 3; j++) {
          var hh = th.h[j];
          yt += th.amp * hh[3] * Math.sin(TAU * hh[0] * s + hh[1] + hh[2] * t * TAU);
        }
        yt = this.mid + this.half * Math.tanh((yt - this.mid) / this.half); // keep the knot inside its band
        var pin = Math.exp(-Math.pow((u - uc) / sig, 2));
        var yo = th.lane + (th.pinch - th.lane) * pin;
        var y = yo + (yt - yo) * wt;
        var x = u + th.lx * Math.sin(TAU * th.lf * s + th.lp + th.lw * t * TAU) * wt;
        var X = rtl ? W - x : x;
        if (first) { ctx.moveTo(X, y); first = false; } else ctx.lineTo(X, y);
      }
      ctx.stroke();
    }
    // light travelling along the ordered lanes: the work flowing once it is in order
    var su = u1 + 12, span = W - su;
    if (span > 70) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      for (var p = 0; p < this.pulses.length; p++) {
        var pu = this.pulses[p], lane = this.th[pu.i].lane;
        var pos = su + ((pu.u + t * pu.v) % 1) * (span + pu.len) - pu.len;
        var a = Math.max(su, pos), b = Math.min(W, pos + pu.len);
        if (b <= a + 2) continue;
        var A = rtl ? W - a : a, B = rtl ? W - b : b;
        var gr = ctx.createLinearGradient(A, 0, B, 0);
        gr.addColorStop(0, "rgba(" + this.cb + ",0)");
        gr.addColorStop(1, "rgba(" + this.cb + "," + (this.dark ? 0.95 : 0.8) + ")");
        ctx.strokeStyle = gr;
        ctx.beginPath(); ctx.moveTo(A, lane); ctx.lineTo(B, lane); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  Field.prototype.target = function () {
    // how far the reader has gone past this field: 0 = tangled, 1 = in order
    var r = this.host.getBoundingClientRect(), vh = window.innerHeight || 800;
    if (this.kind === "hero" || this.host.classList.contains("phead")) {
      this.kTarget = clamp(-r.top / (r.height * 0.62), 0, 1);
    } else {
      this.kTarget = clamp((vh - r.top) / (vh * 0.9 + r.height * 0.5) * 1.1 - 0.15, 0, 1);
    }
  };

  var scrolling = false, scrollTimer = 0;
  Field.prototype.tick = function () {
    var self = this;
    this.raf = 0;
    if (!this.visible || document.hidden) return;
    this.n = (this.n || 0) + 1;
    // half the work while the reader is scrolling; threads under glass always run at half rate,
    // and on phones they stay still, so the blur above them is not redrawn every frame
    if (this.bed && this.small) { this.raf = 0; return; }
    if ((!scrolling && !this.bed) || (this.n & 1)) {
      this.k += (this.kTarget - this.k) * (scrolling ? 0.14 : 0.07);
      this.draw(this.time());
    }
    this.raf = requestAnimationFrame(function () { self.tick(); });
  };
  Field.prototype.start = function () {
    if (REDUCED || this.raf || !this.visible || document.hidden) return;
    var self = this;
    this.raf = requestAnimationFrame(function () { self.tick(); });
  };
  Field.prototype.still = function () { // reduced motion: one calm frame, half untangled
    this.k = 0.32;
    this.draw(6);
  };

  /* ------------------------------------------------------------------ */
  var fields = [];
  function init() {
    var cs = Array.prototype.slice.call(document.querySelectorAll("canvas[data-threads]"));
    cs.forEach(function (c, i) {
      if (!c.getContext) return;
      var f = new Field(c, 11 + i * 17);
      fields.push(f);
      f.target(); f.k = f.kTarget;
      if (REDUCED) f.still(); else f.draw(f.time());
    });
    if (!fields.length) return;

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          fields.forEach(function (f) {
            if (f.c !== e.target) return;
            f.visible = e.isIntersecting;
            if (f.visible) f.start();
          });
        });
      }, { rootMargin: "80px 0px" });
      fields.forEach(function (f) { io.observe(f.c); });
    }
    fields.forEach(function (f) { f.start(); });

    var pending = false;
    addEventListener("scroll", function () {
      scrolling = true; clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { scrolling = false; }, 140);
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        fields.forEach(function (f) { f.target(); if (REDUCED) { f.k = 0.32; } });
      });
    }, { passive: true });

    var rt = 0;
    function remeasure() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        fields.forEach(function (f) { f.measure(); f.target(); if (REDUCED) f.still(); });
      }, 120);
    }
    addEventListener("resize", remeasure);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(remeasure);
      fields.forEach(function (f) { ro.observe(f.host); });
    }
    document.addEventListener("oa:lang", function () { fields.forEach(function (f) { f.measure(); if (REDUCED) f.still(); }); });
    document.addEventListener("oa:theme", function () { fields.forEach(function (f) { f.colors(); f.gradient(); f.draw(f.time()); if (REDUCED) f.still(); }); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) fields.forEach(function (f) { f.start(); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  }

  /* ------------------------------------------------------------------ */
  /* Approach page: one lens passing over a clear process and a confused one.
     Inside the lens both are enlarged, the clear one into more of the same order,
     the confused one into bigger mistakes. */
  function lens() {
    var fig = document.getElementById("lensDemo");
    if (!fig) return;
    var NS = "http://www.w3.org/2000/svg";
    var rows = fig.querySelector("#lensRows"), zoom = fig.querySelector("#lensZoom");
    var hole = fig.querySelector("#lensHole"), glass = fig.querySelector("#lensGlass");
    var R = rand(29);
    function make(g) {
      var i, x, el;
      for (i = 0; i < 14; i++) { // the clear process: even steps
        x = 30 + i * 34;
        el = document.createElementNS(NS, "rect");
        el.setAttribute("x", x); el.setAttribute("y", 52); el.setAttribute("width", 12); el.setAttribute("height", 46); el.setAttribute("rx", 3);
        el.setAttribute("class", "lr-a"); g.appendChild(el);
      }
      R = rand(29);
      for (i = 0; i < 14; i++) { // the confused one: uneven, crooked, out of step
        var h = 14 + R() * 46, w = 8 + R() * 10;
        x = 26 + i * 34 + (R() - 0.5) * 20;
        var y = 222 - h / 2 + (R() - 0.5) * 26, rot = (R() - 0.5) * 56;
        el = document.createElementNS(NS, "rect");
        el.setAttribute("x", x.toFixed(1)); el.setAttribute("y", y.toFixed(1)); el.setAttribute("width", w.toFixed(1)); el.setAttribute("height", h.toFixed(1)); el.setAttribute("rx", 3);
        el.setAttribute("transform", "rotate(" + rot.toFixed(1) + " " + (x + w / 2).toFixed(1) + " " + (y + h / 2).toFixed(1) + ")");
        el.setAttribute("class", "lr-b"); g.appendChild(el);
      }
    }
    make(rows); make(zoom);
    var t0 = performance.now(), raf = 0, visible = false;
    function place(t) {
      var cx = 260 + 168 * Math.sin(t * 0.36), cy = 150 + 74 * Math.sin(t * 0.72);
      hole.setAttribute("cx", cx.toFixed(1)); hole.setAttribute("cy", cy.toFixed(1));
      glass.setAttribute("transform", "translate(" + (cx - 150).toFixed(1) + " " + (cy - 150).toFixed(1) + ")");
      zoom.setAttribute("transform", "translate(" + cx.toFixed(1) + " " + cy.toFixed(1) + ") scale(1.7) translate(" + (-cx).toFixed(1) + " " + (-cy).toFixed(1) + ")");
    }
    function frame() {
      raf = 0;
      if (!visible || document.hidden) return;
      place((performance.now() - t0) / 1000 + 2.2);
      raf = requestAnimationFrame(frame);
    }
    place(2.2);
    if (REDUCED) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(fig);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
  }

  function boot() { init(); lens(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
