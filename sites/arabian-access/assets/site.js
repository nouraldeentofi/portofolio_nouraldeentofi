/* Arabian Access — site behaviour (vanilla, no frameworks) */
(() => {
  "use strict";
  window.__aa = 1;
  const d = document, root = d.documentElement;
  const RTL = root.dir === "rtl";
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const I = JSON.parse(($("#i18n") || {}).textContent || "{}");
  const mq = (q) => window.matchMedia(q);
  const RM = mq("(prefers-reduced-motion: reduce)");
  const TOUCH = mq("(hover: none)");
  const SHEETY = mq("(max-width: 760px)");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const raf = (fn) => requestAnimationFrame(fn);
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ""));

  /* ---------------------------------------------------------- theme + language */
  const themeBtn = $("[data-theme-toggle]");
  const metaTheme = $("#meta-theme");
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      themeBtn.setAttribute("aria-label", t === "dark" ? themeBtn.dataset.lLight : themeBtn.dataset.lDark);
    }
    if (metaTheme) metaTheme.setAttribute("content", t === "dark" ? "#060E22" : "#F4F7FC");
  }
  applyTheme(root.getAttribute("data-theme") || "light");
  themeBtn && themeBtn.addEventListener("click", () => {
    const t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(t); store.set("aa-theme", t);
  });
  $$("[data-lang]").forEach((a) => a.addEventListener("click", (e) => {
    store.set("aa-lang", a.dataset.lang);
    const sec = currentSection();
    if (sec && sec !== "hero") { e.preventDefault(); location.href = a.getAttribute("href") + "#" + sec; }
  }));

  /* ---------------------------------------------------------- header, progress, scroll-linked fallbacks */
  const hdr = $("#hdr");
  const SDA = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  const prog = $(".progress span");
  const proc = $(".proc");
  const whyPic = $(".why__pic");
  const heroMedia = $(".hero__media"), heroHead = $(".hero__head");
  let lastY = window.scrollY, ticking = false, locked = false;
  function onScroll() {
    const y = window.scrollY;
    hdr.classList.toggle("is-scrolled", y > 8);
    if (!locked) {
      if (y > 240 && y - lastY > 6) hdr.classList.add("is-hidden");
      else if (lastY - y > 6 || y < 120) hdr.classList.remove("is-hidden");
    }
    lastY = y;
    if (!SDA) {
      const vh = innerHeight, max = root.scrollHeight - vh;
      prog && prog.style.setProperty("--sp", max > 0 ? (y / max).toFixed(4) : 0);
      if (proc) {
        const r = proc.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.5 + r.height * 0.5)));
        proc.style.setProperty("--pw", (1 - p).toFixed(3));
        proc.style.setProperty("--pv", p.toFixed(3));
      }
      if (whyPic && !RM.matches) {
        const r = whyPic.parentElement.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        whyPic.style.setProperty("--py", (-p * r.height * 0.15).toFixed(1));
      }
      if (!RM.matches) {
        const ho = Math.min(1, Math.max(0, y / (vh * 0.8))).toFixed(3);
        heroMedia && heroMedia.style.setProperty("--ho", ho);
        heroHead && heroHead.style.setProperty("--ho", ho);
      }
    }
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- reveal on enter */
  const rvs = $$(".rv");
  if (RM.matches) rvs.forEach((el) => el.classList.add("in"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach((el) => io.observe(el));
    // pause looping animations that are off screen (battery)
    const pio = new IntersectionObserver((ents) => ents.forEach((e) => e.target.classList.toggle("is-paused", !e.isIntersecting)), { rootMargin: "80px" });
    $$("[data-anim]").forEach((el) => pio.observe(el));
  } else rvs.forEach((el) => el.classList.add("in"));

  /* ---------------------------------------------------------- live open / closed (Asia/Riyadh) */
  const H = I.hours || { open: 9, close: 19, closed: [5] };
  function riyadhNow() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Riyadh", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(new Date());
    const g = (t) => (parts.find((p) => p.type === t) || {}).value;
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
    return { y: +g("year"), m: +g("month") - 1, d: +g("day"), h: +g("hour") % 24, min: +g("minute"), wd };
  }
  function liveState() {
    const n = riyadhNow();
    const isOpenDay = !H.closed.includes(n.wd);
    if (isOpenDay && n.h >= H.open && n.h < H.close) return { open: true, text: fmt(I.live.open, { close: I.closeAt }) };
    let when;
    if (isOpenDay && n.h < H.open) when = I.live.today;
    else {
      let k = 1, wd = (n.wd + 1) % 7;
      while (H.closed.includes(wd)) { k++; wd = (wd + 1) % 7; }
      when = k === 1 ? I.live.tomorrow : I.wd[wd];
    }
    return { open: false, text: fmt(I.live.closed, { when, open: I.openAt }) };
  }
  function paintLive() {
    const s = liveState();
    $$("[data-live]").forEach((el) => {
      el.classList.toggle("is-open", s.open); el.classList.toggle("is-closed", !s.open);
      $(".live__txt", el).textContent = s.text;
    });
  }
  paintLive(); setInterval(paintLive, 60000);

  /* ---------------------------------------------------------- hero journey card */
  const jr = $$(".jr__row");
  if (jr.length) {
    let k = 0;
    const step = () => {
      jr.forEach((r, i) => { r.classList.toggle("is-on", i === k); r.classList.toggle("is-done", i < k); });
      k = (k + 1) % (jr.length + 1);
    };
    step();
    if (!RM.matches) setInterval(() => { if (!$(".hero").classList.contains("is-paused")) step(); }, 2300);
  }

  /* ---------------------------------------------------------- audience tabs */
  $$("[data-tabs]").forEach((box) => {
    const seg = $(".seg", box), tabs = $$('[role="tab"]', box), pans = $$('[role="tabpanel"]', box);
    function sel(i, focus) {
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", j === i ? "true" : "false"); t.tabIndex = j === i ? 0 : -1; });
      pans.forEach((p, j) => { p.classList.toggle("is-on", j === i); p.toggleAttribute("inert", j !== i); });
      seg.style.setProperty("--seg-i", i);
      if (focus) tabs[i].focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => sel(i));
      t.addEventListener("keydown", (e) => {
        const fwd = RTL ? "ArrowLeft" : "ArrowRight", back = RTL ? "ArrowRight" : "ArrowLeft";
        if (e.key === fwd) { e.preventDefault(); sel((i + 1) % tabs.length, true); }
        if (e.key === back) { e.preventDefault(); sel((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
  });

  /* ---------------------------------------------------------- pillars (auto-advance) */
  $$("[data-pillars]").forEach((box) => {
    const items = $$(".pil", box), btns = $$(".pil__b", box), ds = $$(".pil__d", box);
    const DUR = 6000; let i = 0, timer = null, resume = null, visible = false;
    box.style.setProperty("--pt", DUR + "ms");
    function sel(n) {
      i = n;
      items.forEach((it, j) => { it.classList.remove("is-on"); btns[j].setAttribute("aria-expanded", "false"); });
      ds.forEach((x) => x.classList.remove("is-on"));
      void box.offsetWidth; // restart bar animation
      items[n].classList.add("is-on"); btns[n].setAttribute("aria-expanded", "true"); ds[n].classList.add("is-on");
    }
    function start() { stop(); if (RM.matches || !visible) return; box.classList.add("is-auto"); timer = setInterval(() => sel((i + 1) % items.length), DUR); }
    function stop() { clearInterval(timer); timer = null; box.classList.remove("is-auto"); }
    btns.forEach((b, n) => b.addEventListener("click", () => { sel(n); stop(); clearTimeout(resume); resume = setTimeout(() => { resume = null; start(); }, 14000); }));
    btns.forEach((b) => b.addEventListener("click", () => { resume = resume || 1; }, { capture: true }));
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (!visible) stop(); else if (!timer && !resume) start();
    }, { threshold: 0.35 }).observe(box);
  });

  /* ---------------------------------------------------------- swipe rows (dots, centre card, autoplay) */
  $$("[data-row]").forEach((row) => {
    const cards = $$("[data-card]", row);
    const sib = row.nextElementSibling;
    const dotsBox = sib ? (sib.classList.contains("dots") ? sib : $(".dots", sib)) : null;
    const btnPrev = sib && $("[data-row-prev]", sib), btnNext = sib && $("[data-row-next]", sib);
    const dots = dotsBox ? $$(".dot", dotsBox) : [];
    const auto = +row.dataset.auto || 0;
    let idx = 0, timer = null, idleT = null, inView = false, hovering = false;
    const scrollable = () => row.scrollWidth > row.clientWidth + 4;
    const centerMode = () => TOUCH.matches || SHEETY.matches;
    function padStart() { const cs = getComputedStyle(row); return parseFloat(RTL ? cs.paddingRight : cs.paddingLeft) || 0; }
    function deltaFor(card) {
      const r = row.getBoundingClientRect(), c = card.getBoundingClientRect();
      if (centerMode()) return (c.left + c.width / 2) - (r.left + r.width / 2);
      return RTL ? c.right - (r.right - padStart()) : c.left - (r.left + padStart());
    }
    function reachable() {
      // indices of cards whose snap position is reachable (so the last dots don't duplicate)
      if (!scrollable()) return [];
      const max = row.scrollWidth - row.clientWidth; const out = []; let seenMax = false;
      const cur = Math.abs(row.scrollLeft);
      cards.forEach((c, n) => {
        const pos = cur + (RTL ? -deltaFor(c) : deltaFor(c));
        if (pos >= max - 2) { if (!seenMax) { out.push(n); seenMax = true; } } else out.push(n);
      });
      return out;
    }
    let reach = [];
    function layoutDots() {
      reach = reachable();
      dots.forEach((dt, n) => { dt.hidden = !(n < reach.length); });
      if (dotsBox) dotsBox.style.visibility = reach.length > 1 ? "visible" : "hidden";
      update();
    }
    function update() {
      if (!scrollable()) { cards.forEach((c) => c.classList.remove("is-center")); return; }
      let best = 0, bd = Infinity;
      cards.forEach((c, n) => { const dd = Math.abs(deltaFor(c)); if (dd < bd) { bd = dd; best = n; } });
      const atEnd = Math.abs(row.scrollLeft) >= row.scrollWidth - row.clientWidth - 2;
      idx = best;
      let di = reach.indexOf(best);
      if (di < 0 || (atEnd && !centerMode())) di = reach.length - 1;
      dots.forEach((dt, n) => { dt.classList.toggle("is-on", n === di); dt.setAttribute("aria-current", n === di ? "true" : "false"); });
      const cm = centerMode();
      cards.forEach((c, n) => c.classList.toggle("is-center", cm && n === best));
    }
    function go(n, smooth = true) {
      const c = cards[Math.max(0, Math.min(cards.length - 1, n))];
      row.scrollBy({ left: deltaFor(c), behavior: smooth && !RM.matches ? "smooth" : "auto" });
    }
    let st = false;
    row.addEventListener("scroll", () => { if (!st) { st = true; raf(() => { update(); st = false; }); } }, { passive: true });
    btnNext && btnNext.addEventListener("click", () => { next(); pause(); });
    btnPrev && btnPrev.addEventListener("click", () => { const cur = reach.indexOf(idx); go(cur > 0 ? reach[cur - 1] : (atStart() ? reach[reach.length - 1] : idx - 1)); pause(); });
    function atStart() { return Math.abs(row.scrollLeft) < 2; }
    window.addEventListener("resize", () => raf(layoutDots));
    layoutDots();
    function next() {
      if (!scrollable()) return;
      const atEnd = Math.abs(row.scrollLeft) >= row.scrollWidth - row.clientWidth - 2;
      if (atEnd) go(0); else go(idx + 1);
    }
    function play() { clearInterval(timer); timer = null; if (!auto || RM.matches || !inView || hovering) return; timer = setInterval(next, auto); }
    function pause() { clearInterval(timer); timer = null; clearTimeout(idleT); idleT = setTimeout(play, 7000); }
    if (auto) {
      row.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; clearInterval(timer); timer = null; } });
      row.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; play(); } });
      row.addEventListener("touchstart", pause, { passive: true });
      row.addEventListener("wheel", pause, { passive: true });
      row.addEventListener("focusin", () => { clearInterval(timer); timer = null; });
      row.addEventListener("focusout", play);
      if ("IntersectionObserver" in window) new IntersectionObserver((e) => { inView = e[0].isIntersecting; inView ? play() : (clearInterval(timer), timer = null); }, { threshold: 0.5 }).observe(row);
      d.addEventListener("visibilitychange", () => d.hidden ? (clearInterval(timer), timer = null) : play());
    }
  });

  /* ---------------------------------------------------------- scroll lock + bottom sheet */
  let lockCount = 0;
  function lock(on) {
    lockCount += on ? 1 : -1; lockCount = Math.max(0, lockCount);
    root.classList.toggle("is-locked", lockCount > 0);
    locked = lockCount > 0;
  }
  const sheet = $("#sheet"), sheetBody = $(".sheet__body", sheet), sheetTitle = $("#sheet-title");
  let sheetState = null;
  function openSheet(title, node, onClose) {
    closeSheet(true);
    sheetState = { node, parent: node.parentNode, next: node.nextSibling, onClose, ret: d.activeElement };
    sheetTitle.textContent = title;
    sheetBody.appendChild(node);
    sheet.hidden = false; lock(true);
    raf(() => raf(() => sheet.classList.add("is-on")));
    setTimeout(() => {
      const f = node.matches(".sel__list") ? node : ($(".cal__d.is-sel", node) || $(".cal__d:not([disabled])", node) || $("button:not([disabled])", node));
      f && f.focus({ preventScroll: true });
      const a = $('[aria-selected="true"]', node); a && a.scrollIntoView({ block: "nearest" });
    }, 60);
  }
  function closeSheet(instant) {
    if (!sheetState) return;
    const s = sheetState; sheetState = null;
    sheet.classList.remove("is-on");
    const done = () => { s.parent.insertBefore(s.node, s.next); sheet.hidden = true; };
    instant ? done() : setTimeout(done, 380);
    lock(false);
    s.onClose && s.onClose();
    s.ret && s.ret.focus && s.ret.focus({ preventScroll: true });
  }
  $$("[data-sheet-close]", sheet).forEach((b) => b.addEventListener("click", () => closeSheet()));
  // swipe the sheet down to close
  (() => {
    const panel = $(".sheet__panel", sheet); let y0 = null, dy = 0;
    panel.addEventListener("touchstart", (e) => { if (sheetBody.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
    panel.addEventListener("touchmove", (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = dy ? `translateY(${dy}px)` : ""; }, { passive: true });
    panel.addEventListener("touchend", () => { panel.style.transform = ""; if (dy > 90) closeSheet(); y0 = null; dy = 0; });
  })();

  /* ---------------------------------------------------------- request form */
  const form = $("[data-form]");
  if (form) initForm(form);

  function initForm(form) {
    const state = {};
    const steps = $$(".req__step", form);
    const btnBack = $("[data-back]", form), btnNext = $("[data-next]", form), btnSend = $("[data-send]", form);
    const err = $(".req__err", form);
    let cur = 1;
    const selects = {};
    let openCtl = null;
    const useSheet = () => SHEETY.matches;

    function closeOpen() { if (openCtl) openCtl.close(); }
    d.addEventListener("pointerdown", (e) => { if (openCtl && !openCtl.el.contains(e.target) && !sheet.contains(e.target)) closeOpen(); });
    d.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (sheetState) closeSheet(); else closeOpen(); } });

    /* custom select */
    $$("[data-select]", form).forEach((el) => {
      const name = el.dataset.name, btn = $(".sel__btn", el), list = $(".sel__list", el), val = $(".sel__v", el), input = $("input", el);
      const opts = () => $$('[role="option"]', list);
      val.classList.add("is-ph");
      let act = -1;
      const api = {
        el, name,
        open() {
          if (openCtl && openCtl !== api) openCtl.close();
          openCtl = api; el.classList.add("is-open"); btn.setAttribute("aria-expanded", "true");
          const sIdx = opts().findIndex((o) => o.getAttribute("aria-selected") === "true");
          setAct(sIdx >= 0 ? sIdx : nextEnabled(-1, 1));
          if (useSheet()) { openSheet(el.dataset.sheetTitle, list, () => api.close(true)); }
          else {
            list.classList.remove("is-up");
            const r = btn.getBoundingClientRect(); const need = Math.min(330, list.scrollHeight + 16);
            if (innerHeight - r.bottom < need && r.top > need) list.classList.add("is-up");
            list.focus({ preventScroll: true });
            const a = opts()[act]; a && a.scrollIntoView({ block: "nearest" });
          }
        },
        close(fromSheet) {
          el.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false");
          if (openCtl === api) openCtl = null;
          if (!fromSheet && sheetState && sheetState.node === list) closeSheet();
        },
        set(v, silent) {
          const o = opts().find((x) => x.dataset.value === v);
          opts().forEach((x) => x.setAttribute("aria-selected", x === o ? "true" : "false"));
          input.value = o ? v : "";
          val.textContent = o ? $("span", o).textContent : val.dataset.ph;
          val.classList.toggle("is-ph", !o);
          state[name] = o ? v : "";
          state[name + "_label"] = o ? $("span", o).textContent : "";
          if (o) el.closest(".field").classList.remove("is-err");
          if (!silent) form.dispatchEvent(new CustomEvent("aa:change", { detail: name }));
        },
        disable(fn) {
          opts().forEach((o) => o.setAttribute("aria-disabled", fn(o.dataset.value) ? "true" : "false"));
          if (state[name] && fn(state[name])) api.set("");
        },
      };
      function nextEnabled(from, dir) {
        const os = opts(); let n = from;
        for (let k = 0; k < os.length; k++) { n = (n + dir + os.length) % os.length; if (os[n].getAttribute("aria-disabled") !== "true") return n; }
        return -1;
      }
      function setAct(n) {
        act = n; opts().forEach((o, j) => o.classList.toggle("is-act", j === n));
        const o = opts()[n]; if (o) { list.setAttribute("aria-activedescendant", o.id); if (!useSheet()) o.scrollIntoView({ block: "nearest" }); }
      }
      btn.addEventListener("click", () => (el.classList.contains("is-open") ? api.close() : api.open()));
      btn.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); api.open(); } });
      list.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setAct(nextEnabled(act, 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setAct(nextEnabled(act, -1)); }
        else if (e.key === "Home") { e.preventDefault(); setAct(nextEnabled(-1, 1)); }
        else if (e.key === "End") { e.preventDefault(); setAct(nextEnabled(0, -1)); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const o = opts()[act]; if (o && o.getAttribute("aria-disabled") !== "true") { api.set(o.dataset.value); api.close(); btn.focus(); } }
        else if (e.key === "Tab") api.close();
      });
      list.addEventListener("click", (e) => {
        const o = e.target.closest('[role="option"]'); if (!o || o.getAttribute("aria-disabled") === "true") return;
        api.set(o.dataset.value); api.close(); btn.focus({ preventScroll: true });
      });
      selects[name] = api;
    });

    /* radios */
    $$('input[name="type"]', form).forEach((r) => r.addEventListener("change", () => {
      state.type = r.value; state.type_label = I.types[r.value];
      r.closest(".field").classList.remove("is-err");
    }));

    /* text inputs */
    $$(".inp", form).forEach((inp) => inp.addEventListener("input", () => {
      state[inp.name] = inp.value.trim();
      if (inp.value.trim()) inp.closest(".field").classList.remove("is-err");
    }));

    /* date picker + quick chips */
    const dt = $("[data-date]", form), dtBtn = $(".dt__btn", dt), cal = $(".cal", dt), dtVal = $(".sel__v", dt), dtIn = $("input", dt);
    const chips = $("[data-qchips]", form);
    dtVal.classList.add("is-ph");
    const LAST_SLOT = H.close - 1; // last start hour
    const utc = (y, m, dd) => Date.UTC(y, m, dd);
    const now = riyadhNow();
    const today = utc(now.y, now.m, now.d);
    const DAY = 864e5;
    const dow = (t) => new Date(t).getUTCDay();
    const iso = (t) => new Date(t).toISOString().slice(0, 10);
    const isOk = (t) => {
      if (t < today) return false;
      if (H.closed.includes(dow(t))) return false;
      if (t === today) { const n = riyadhNow(); if (n.h >= LAST_SLOT) return false; }
      return true;
    };
    let view = { y: now.y, m: now.m };
    function label(t, short) {
      const x = new Date(t); const wd = I.wd[x.getUTCDay()];
      const dd = x.getUTCDate(), mo = I.months[x.getUTCMonth()], yy = x.getUTCFullYear();
      if (short) return `${wd} ${dd}`;
      return `${wd}، ${dd} ${mo}${yy !== now.y ? " " + yy : ""}`.replace("، ", RTL ? "، " : ", ");
    }
    function setDate(t, silent) {
      state.date = t ? iso(t) : ""; dtIn.value = state.date;
      state.date_t = t || 0;
      dtVal.textContent = t ? label(t) : dtVal.dataset.ph; dtVal.classList.toggle("is-ph", !t);
      if (t) { dt.closest(".field").classList.remove("is-err"); view = { y: new Date(t).getUTCFullYear(), m: new Date(t).getUTCMonth() }; }
      $$(".qchip", chips).forEach((c) => c.classList.toggle("is-on", +c.dataset.t === t));
      // times: if today, block past hours
      if (selects.time) {
        const n = riyadhNow();
        selects.time.disable((v) => t === today && parseInt(v, 10) <= n.h);
      }
      if (!silent) form.dispatchEvent(new CustomEvent("aa:change", { detail: "date" }));
    }
    function renderCal() {
      const first = utc(view.y, view.m, 1), days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
      const lead = dow(first);
      const canPrev = utc(view.y, view.m, 1) > utc(now.y, now.m, 1);
      const maxM = utc(now.y, now.m + 6, 1); const canNext = utc(view.y, view.m + 1, 1) < maxM;
      let h = `<div class="cal__h"><p class="cal__m" aria-live="polite">${I.months[view.m]} <span class="ltr">${view.y}</span></p><div class="cal__nav">
        <button type="button" class="icon-btn" data-cal="-1" aria-label="${I.prevMonth}" ${canPrev ? "" : "disabled"}><svg class="ico ico--s ico--back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button>
        <button type="button" class="icon-btn" data-cal="1" aria-label="${I.nextMonth}" ${canNext ? "" : "disabled"}><svg class="ico ico--s ico--fwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button></div></div>`;
      h += `<div class="cal__g" role="grid">` + I.wdShort.map((w, i) => `<span class="cal__wd${i === 5 ? " is-off" : ""}" aria-hidden="true">${w}</span>`).join("");
      for (let k = 0; k < lead; k++) h += "<span></span>";
      for (let dd = 1; dd <= days; dd++) {
        const t = utc(view.y, view.m, dd), ok = isOk(t);
        const cls = ["cal__d", t === today ? "is-today" : "", t === state.date_t ? "is-sel" : ""].join(" ");
        h += `<button type="button" class="${cls}" data-t="${t}" ${ok ? "" : "disabled"} aria-label="${label(t)}" aria-pressed="${t === state.date_t}"><span class="ltr">${dd}</span></button>`;
      }
      h += "</div>";
      cal.innerHTML = h;
    }
    cal.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-cal]");
      if (nav) { view.m += +nav.dataset.cal; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } renderCal(); const b = $(`[data-cal="${nav.dataset.cal}"]`, cal); b && !b.disabled && b.focus(); return; }
      const b = e.target.closest(".cal__d"); if (!b || b.disabled) return;
      setDate(+b.dataset.t); dtApi.close(); dtBtn.focus({ preventScroll: true });
    });
    cal.addEventListener("keydown", (e) => {
      const b = e.target.closest(".cal__d"); if (!b) return;
      const map = { ArrowRight: RTL ? -1 : 1, ArrowLeft: RTL ? 1 : -1, ArrowDown: 7, ArrowUp: -7 };
      if (map[e.key] == null) return;
      e.preventDefault();
      const all = $$(".cal__d", cal); let n = all.indexOf(b) + map[e.key];
      while (all[n] && all[n].disabled) n += Math.sign(map[e.key]);
      all[n] && all[n].focus();
    });
    const dtApi = {
      el: dt,
      open() {
        if (openCtl && openCtl !== dtApi) openCtl.close();
        openCtl = dtApi; renderCal(); dt.classList.add("is-open"); dtBtn.setAttribute("aria-expanded", "true");
        if (useSheet()) openSheet(cal.dataset.sheetTitle, cal, () => dtApi.close(true));
        else {
          cal.classList.remove("is-up"); const r = dtBtn.getBoundingClientRect();
          if (innerHeight - r.bottom < 380 && r.top > 380) cal.classList.add("is-up");
          setTimeout(() => { const f = $(".cal__d.is-sel", cal) || $(".cal__d:not([disabled])", cal); f && f.focus({ preventScroll: true }); }, 30);
        }
      },
      close(fromSheet) {
        dt.classList.remove("is-open"); dtBtn.setAttribute("aria-expanded", "false");
        if (openCtl === dtApi) openCtl = null;
        if (!fromSheet && sheetState && sheetState.node === cal) closeSheet();
      },
    };
    dtBtn.addEventListener("click", () => (dt.classList.contains("is-open") ? dtApi.close() : dtApi.open()));
    // quick chips: next 4 open days
    (() => {
      const out = []; let t = today;
      while (out.length < 4 && t < today + 40 * DAY) { if (isOk(t)) out.push(t); t += DAY; }
      chips.innerHTML = out.map((t) => {
        const lab = t === today ? I.live.today : t === today + DAY ? I.live.tomorrow : label(t, true);
        return `<button type="button" class="qchip" data-t="${t}">${lab}</button>`;
      }).join("");
      chips.addEventListener("click", (e) => { const c = e.target.closest(".qchip"); if (c) setDate(+c.dataset.t); });
    })();

    /* steps */
    function fieldOf(el) { return el.closest(".field"); }
    function validate(n) {
      const bad = [];
      if (n === 1) {
        if (!state.service) bad.push(fieldOf(selects.service.el));
        if (!state.type) bad.push(fieldOf($(".rads", form)));
      } else if (n === 2) {
        if (!state.mode) bad.push(fieldOf(selects.mode.el));
        if (!state.date) bad.push(fieldOf(dt));
        if (!state.time) bad.push(fieldOf(selects.time.el));
      } else if (n === 3) {
        const nm = $('input[name="name"]', form); state.name = nm.value.trim();
        if (!state.name) bad.push(fieldOf(nm));
        if (!state.city) bad.push(fieldOf(selects.city.el));
      }
      $$(".field", steps[n - 1]).forEach((f) => f.classList.toggle("is-err", bad.includes(f)));
      err.classList.toggle("is-on", bad.length > 0);
      $("span", err).textContent = bad.length ? I.err : "";
      if (bad.length) {
        const f = bad[0]; const c = $("button, input", f);
        c && c.focus({ preventScroll: true });
        const r = f.getBoundingClientRect(); if (r.top < 80 || r.bottom > innerHeight - 100) f.scrollIntoView({ block: "center", behavior: RM.matches ? "auto" : "smooth" });
      }
      return bad.length === 0;
    }
    function when() {
      if (!state.date_t) return "";
      return label(state.date_t) + (state.time_label ? " — " + state.time_label : "");
    }
    function fillSummary() {
      $('[data-sum="service"]', form).textContent = state.service_label || "—";
      $('[data-sum="type"]', form).textContent = state.type_label || "—";
      $('[data-sum="when"]', form).textContent = when() || "—";
    }
    function go(n, focus = true) {
      closeOpen();
      const prev = cur; cur = n;
      steps.forEach((s, i) => {
        const k = i + 1;
        s.classList.toggle("is-on", k === n);
        s.classList.toggle("is-prev", k < n);
        s.toggleAttribute("inert", k !== n);
      });
      $("[data-step-num]", form).textContent = n;
      $(".req__bar span", form).style.setProperty("--p", (n / 3).toFixed(4));
      btnBack.classList.toggle("is-hide", n === 1);
      btnNext.classList.toggle("is-hide", n === 3); btnNext.tabIndex = n === 3 ? -1 : 0;
      btnSend.classList.toggle("is-hide", n !== 3); btnSend.tabIndex = n === 3 ? 0 : -1;
      err.classList.remove("is-on");
      if (n === 3) fillSummary();
      if (focus && prev !== n) {
        const r = form.getBoundingClientRect();
        if (r.top < 60) form.scrollIntoView({ block: "start", behavior: RM.matches ? "auto" : "smooth" });
        const first = $(".req__step.is-on button, .req__step.is-on input:not([type=hidden])", form);
        setTimeout(() => first && first.focus({ preventScroll: true }), 80);
      }
    }
    btnNext.addEventListener("click", () => { if (validate(cur)) go(cur + 1); });
    btnBack.addEventListener("click", () => go(Math.max(1, cur - 1)));
    $$("[data-goto]", form).forEach((b) => b.addEventListener("click", () => go(+b.dataset.goto)));
    $$(".inp", form).forEach((inp) => inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return; e.preventDefault();
      const ins = $$(".req__step.is-on .inp", form); const k = ins.indexOf(inp);
      if (ins[k + 1]) ins[k + 1].focus(); else inp.blur();
    }));
    form.addEventListener("aa:change", (e) => { if (e.detail === "time" || e.detail === "date") fillSummary(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (cur !== 3) { if (validate(cur)) go(cur + 1); return; }
      if (!validate(3)) return;
      state.company = ($('input[name="company"]', form).value || "").trim();
      state.activity = ($('input[name="activity"]', form).value || "").trim();
      const W = I.wa, lines = [W.hello, ""];
      const add = (k, v) => v && lines.push(`• ${k}: ${v}`);
      add(W.service, state.service_label); add(W.type, state.type_label); add(W.activity, state.activity);
      add(W.mode, state.mode_label); add(W.when, when()); add(W.city, state.city_label);
      add(W.name, state.name); add(W.company, state.company);
      lines.push("", W.footer);
      const url = `https://wa.me/${I.wa_number}?text=${encodeURIComponent(lines.join("\n"))}`;
      form.dataset.lastUrl = url;
      const w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url;
    });
    // focusing step stays put when steps change
    go(1, false);

    /* prefill from service / audience buttons */
    $$("[data-prefill-service], [data-prefill-type]").forEach((a) => a.addEventListener("click", () => {
      if (a.dataset.prefillService) selects.service.set(a.dataset.prefillService);
      if (a.dataset.prefillType) {
        const r = $(`input[name="type"][value="${a.dataset.prefillType}"]`, form);
        if (r) { r.checked = true; r.dispatchEvent(new Event("change")); }
      }
      go(1, false);
    }));

    /* hide the dock while typing */
    form.addEventListener("focusin", (e) => { if (e.target.matches(".inp")) dockHide("type", true); });
    form.addEventListener("focusout", (e) => { if (e.target.matches(".inp")) dockHide("type", false); });
    window.__aaForm = { state, go, selects, setDate };
  }

  /* ---------------------------------------------------------- dock + nav highlight */
  const dock = $(".dock");
  const dockReasons = new Set();
  function dockHide(reason, on) {
    on ? dockReasons.add(reason) : dockReasons.delete(reason);
    dock && dock.classList.toggle("is-hidden", dockReasons.size > 0);
  }
  const navLinks = $$("[data-nav]"), dockLinks = $$("[data-dock]");
  const secIds = ["hero", "audience", "services", "process", "why", "stories", "faq", "request", "visit"];
  const secs = secIds.map((id) => d.getElementById(id)).filter(Boolean);
  let curSec = "hero";
  function currentSection() { return curSec; }
  function paintNav() {
    const map = { audience: "hero" };
    const dk = map[curSec] || curSec;
    navLinks.forEach((a) => a.classList.toggle("is-on", a.dataset.nav === curSec));
    dockLinks.forEach((a) => a.classList.toggle("is-on", a.dataset.dock === dk));
  }
  function pickSection() {
    const mid = innerHeight * 0.38; let found = secs[0];
    secs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= mid) found = s; });
    if (found && found.id !== curSec) { curSec = found.id; paintNav(); }
    const req = d.getElementById("request");
    if (req) { const r = req.getBoundingClientRect(); dockHide("form", r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45); }
  }
  let ps = false;
  window.addEventListener("scroll", () => { if (!ps) { ps = true; raf(() => { pickSection(); ps = false; }); } }, { passive: true });
  pickSection(); paintNav();

  /* ---------------------------------------------------------- lightbox */
  const lb = $("#lb");
  if (lb) {
    const items = JSON.parse(lb.dataset.items || "[]");
    const im = $(".lb__img", lb), cap = $(".lb__cap", lb), ci = $("[data-lb-i]", lb), cn = $("[data-lb-n]", lb);
    let i = 0, ret = null, x0 = null;
    cn.textContent = items.length;
    function show(n, swap) {
      i = (n + items.length) % items.length; const it = items[i];
      const put = () => { im.src = it.src; im.width = it.w; im.height = it.h; im.alt = it.alt; cap.textContent = it.alt; ci.textContent = i + 1; im.classList.remove("is-swap"); };
      if (swap && !RM.matches) { im.classList.add("is-swap"); setTimeout(put, 180); } else put();
    }
    function open(n) { ret = d.activeElement; show(n); lb.hidden = false; lock(true); raf(() => raf(() => lb.classList.add("is-on"))); setTimeout(() => $(".lb__close", lb).focus(), 50); }
    function close() { lb.classList.remove("is-on"); setTimeout(() => { lb.hidden = true; }, 350); lock(false); ret && ret.focus({ preventScroll: true }); }
    $$("[data-lb]").forEach((b) => b.addEventListener("click", () => open(+b.dataset.lb)));
    let swiped = false;
    $$("[data-lb-close]", lb).forEach((b) => b.addEventListener("click", () => { if (swiped) { swiped = false; return; } close(); }));
    $("[data-lb-next]", lb).addEventListener("click", () => show(i + 1, true));
    $("[data-lb-prev]", lb).addEventListener("click", () => show(i - 1, true));
    lb.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      const nx = RTL ? "ArrowLeft" : "ArrowRight", pv = RTL ? "ArrowRight" : "ArrowLeft";
      if (e.key === nx) show(i + 1, true);
      if (e.key === pv) show(i - 1, true);
      if (e.key === "Tab") { const f = $$("button", lb); const k = f.indexOf(d.activeElement); if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    lb.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    lb.addEventListener("pointerup", (e) => {
      if (x0 == null) return; const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { swiped = e.target.classList.contains("lb__bg"); const fwd = RTL ? dx > 0 : dx < 0; show(i + (fwd ? 1 : -1), true); }
    });
  }
})();
