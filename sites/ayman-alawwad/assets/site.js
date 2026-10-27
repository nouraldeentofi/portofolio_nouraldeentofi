/* Ayman Alawwad — site behaviour (vanilla, no dependencies) */
(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const phone = matchMedia('(max-width: 899px)');

  /* ---------- theme ---------- */
  const KEY = 'aa-theme';
  const themeBtns = d.querySelectorAll('[data-theme-toggle]');
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : sysDark.matches;
  const syncTheme = () => {
    const dark = isDark();
    themeBtns.forEach(b => {
      b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('aria-pressed', String(dark));
    });
    const meta = d.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(m => m.setAttribute('content', dark ? '#121417' : '#F1ECE4'));
  };
  themeBtns.forEach(b => b.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
    syncTheme();
  if (sysDark.addEventListener) sysDark.addEventListener('change', syncTheme);
  }));
  syncTheme();

  /* ---------- header glass + progress fallback ---------- */
  const hdr = d.getElementById('hdr');
  const bar = d.querySelector('.progress span');
  const hasScrollTL = CSS.supports && CSS.supports('animation-timeline: scroll()');
  const heroTxt = d.querySelector('.hero-txt');
  const heroFrame = d.querySelector('.hero .frame');
  const bgPlans = d.querySelectorAll('.hero-bg .plan, .phead-bg .plan');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (hdr) hdr.classList.toggle('is-scrolled', y > 12);
    if (!hasScrollTL && !reduce) {
      const max = d.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const vh = innerHeight;
      if (heroTxt) {
        const p = Math.min(1, y / (vh * .75));
        heroTxt.style.opacity = String(1 - p * .85);
        heroTxt.style.transform = `translateY(${-40 * p}px)`;
      }
      if (heroFrame) {
        const p = Math.min(1, y / (vh * .9));
        heroFrame.style.transform = `translateY(${-60 * p}px) scale(${1 - .04 * p})`;
        heroFrame.style.opacity = String(1 - p * .5);
      }
      bgPlans.forEach(s => { s.style.transform = `translateY(${Math.min(80, y * .08)}px)`; });
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- reveal on enter ---------- */
  const rvAll = [...d.querySelectorAll('.rv')];
  const reveal = (els) => els.forEach((el, i) => { el.style.setProperty('--rd', `${Math.min(i, 6) * 0.09}s`); el.classList.add('in'); });
  if (!('IntersectionObserver' in window)) { reveal(rvAll); }
  else {
    const io = new IntersectionObserver((entries) => {
      const batch = [];
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.classList.contains('swipe-row')) { reveal([...e.target.querySelectorAll(':scope > .rv')]); return; }
        batch.push(e.target);
      });
      reveal(batch);
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    const rows = new Set();
    rvAll.forEach(el => {
      const row = el.parentElement && el.parentElement.classList.contains('swipe-row') ? el.parentElement : null;
      if (row) { if (!rows.has(row)) { rows.add(row); io.observe(row); } }
      else io.observe(el);
    });
  }

  /* ---------- count-up ---------- */
  const counts = d.querySelectorAll('.count[data-to]');
  if (counts.length && 'IntersectionObserver' in window && !reduce) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        const el = e.target, to = +el.dataset.to, dur = 1600, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent = String(Math.round(to * eased));
          if (k < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counts.forEach(c => co.observe(c));
  }

  /* ---------- pause concept drawings off screen ---------- */
  if ('IntersectionObserver' in window) {
    const po = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting));
    });
    d.querySelectorAll('.hero-bg, .phead-bg, .cta-bg, .seal-mark').forEach(el => po.observe(el));
  }

  /* ---------- swipe rows: centred card, dots, auto-rotate ---------- */
  d.querySelectorAll('[data-swipe]').forEach((sw) => {
    const row = sw.querySelector('.swipe-row');
    const dots = sw.querySelector('.dots');
    const items = [...row.children];
    if (!items.length) return;
    let btns = [];
    let cur = 0, timer = null, pausedUntil = 0, visible = false;

    const active = () => phone.matches && row.scrollWidth > row.clientWidth + 4;
    const build = () => {
      dots.innerHTML = '';
      btns = items.map((_, i) => {
        const b = d.createElement('button');
        b.type = 'button';
        b.tabIndex = -1;
        b.setAttribute('aria-label', `Show card ${i + 1} of ${items.length}`);
        b.addEventListener('click', () => { pause(); go(i); });
        dots.appendChild(b);
        return b;
      });
    };
    const mark = (i) => {
      cur = i;
      items.forEach((el, k) => el.classList.toggle('is-c', k === i));
      btns.forEach((b, k) => b.classList.toggle('is-on', k === i));
    };
    const go = (i) => {
      const el = items[i];
      const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
      row.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    };
    const nearest = () => {
      const mid = row.scrollLeft + row.clientWidth / 2;
      let best = 0, bd = Infinity;
      items.forEach((el, i) => {
        const c = el.offsetLeft + el.offsetWidth / 2;
        const dd = Math.abs(c - mid);
        if (dd < bd) { bd = dd; best = i; }
      });
      return best;
    };
    let raf = 0;
    row.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { if (active()) mark(nearest()); });
    }, { passive: true });
    const pause = () => { pausedUntil = Date.now() + 9000; };
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach(ev => row.addEventListener(ev, pause, { passive: true }));
    const tick = () => {
      if (!active() || !visible || reduce || Date.now() < pausedUntil || d.hidden) return;
      go((cur + 1) % items.length);
    };
    const setup = () => {
      if (active()) {
        sw.classList.add('is-js');
        row.tabIndex = 0;
        if (!btns.length) build();
        mark(nearest());
        if (!timer) timer = setInterval(tick, 5200);
      } else {
        sw.classList.remove('is-js');
        row.removeAttribute('tabindex');
        items.forEach(el => el.classList.remove('is-c'));
        clearInterval(timer); timer = null;
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(sw);
    }
    phone.addEventListener ? phone.addEventListener('change', setup) : phone.addListener(setup);
    addEventListener('resize', () => { if (active()) mark(nearest()); }, { passive: true });
    setup();
  });

  /* ---------- show / hide details (phones) ---------- */
  d.querySelectorAll('.more-btn').forEach((b) => {
    const panel = d.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    });
  });

  /* ---------- contact form → email draft ---------- */
  const form = d.getElementById('cform');
  if (form) {
    const err = d.getElementById('f-err');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const org = form.org.value.trim();
      const msg = form.msg.value.trim();
      [form.name, form.msg].forEach(f => f.classList.toggle('is-bad', !f.value.trim()));
      if (!name || !msg) {
        err.textContent = !name ? 'Please add your name.' : 'Please write a short message.';
        (!name ? form.name : form.msg).focus();
        return;
      }
      err.textContent = '';
      const subject = `Message from ${name}${org ? ' — ' + org : ''}`;
      const body = `${msg}\n\n${name}${org ? '\n' + org : ''}`;
      const href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      form.dataset.lastHref = href;
      location.href = href;
    });
  }

  /* ---------- copy executive bio ---------- */
  d.querySelectorAll('[data-copy]').forEach((b) => {
    const src = d.getElementById(b.dataset.copy);
    if (!src) return;
    let t = 0;
    b.addEventListener('click', async () => {
      const text = src.innerText.trim();
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch (e) {
        try {
          const r = d.createRange(); r.selectNodeContents(src);
          const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
          ok = d.execCommand && d.execCommand('copy');
        } catch (e2) { ok = false; }
      }
      b.classList.toggle('is-done', !!ok);
      b.setAttribute('aria-label', ok ? 'Copied' : 'Text selected, press copy');
      clearTimeout(t);
      t = setTimeout(() => { b.classList.remove('is-done'); b.removeAttribute('aria-label'); }, 2400);
    });
  });

  /* touch devices: make sure nothing keeps a hover look after a tap */
  if (touch) root.classList.add('touch');
})();
