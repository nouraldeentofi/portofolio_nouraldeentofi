/**
 * Motion layer — strictly progressive enhancement.
 *
 * Content is visible in the HTML before any of this runs. The `.js` class is
 * set on <html> by an inline script in <head>, so the hidden-then-revealed
 * state only ever applies when JavaScript is actually running. With JS off,
 * or for a crawler, everything is simply visible.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------- scroll reveal */

export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (REDUCED || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        // Stagger siblings so a grid cascades instead of popping at once.
        const siblings = [...(el.parentElement?.children ?? [])].filter((n) => n.hasAttribute('data-reveal'));
        const index = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
        el.classList.add('is-revealed');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  targets.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------- counters */

/** Split "70+" or "~10s" into its numeric core and surrounding characters. */
function parseValue(text) {
  const match = String(text).match(/^(\D*?)(\d[\d,.]*)(.*)$/s);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const value = Number(digits.replace(/,/g, ''));
  return Number.isFinite(value) ? { prefix, value, suffix, decimals: (digits.split('.')[1] ?? '').length } : null;
}

export function initCounters() {
  const targets = document.querySelectorAll('[data-count]');
  if (!targets.length || REDUCED || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);

        const parsed = parseValue(el.textContent);
        if (!parsed) continue;

        const { prefix, value, suffix, decimals } = parsed;
        const duration = 1100;
        const start = performance.now();

        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          // easeOutExpo — fast, then settles
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          const current = (value * eased).toFixed(decimals);
          // Locale is pinned so digits match the static source text on every
          // device — an ar-SA browser would otherwise switch digit systems.
          el.textContent = `${prefix}${Number(current).toLocaleString('en-US')}${suffix}`;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = `${prefix}${value.toLocaleString('en-US')}${suffix}`;
        };

        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.5 },
  );

  targets.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------ mobile nav */

export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.open = String(open);
    document.body.classList.toggle('nav-is-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Never leave the menu stuck open when the layout returns to desktop.
  const mq = window.matchMedia('(min-width: 861px)');
  const sync = () => { if (mq.matches) setOpen(false); };
  mq.addEventListener?.('change', sync);
}

/* -------------------------------------------------------- scroll progress */

export function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar || REDUCED) return;

  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.transform = `scaleX(${pct / 100})`;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
}

/* ------------------------------------------------------------ header lift */

export function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let ticking = false;
  const update = () => {
    header.classList.toggle('is-stuck', window.scrollY > 12);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
}
