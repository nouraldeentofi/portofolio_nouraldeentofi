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

/* ------------------------------------------------------------ transcript */

/**
 * Transcript rows open on click, and on keyboard activation via a real
 * button.
 *
 * Hover-to-expand was removed deliberately: with rows that grow on hover,
 * sweeping the mouse down the table made content jump under the pointer.
 * A click is a decision; a hover is an accident.
 */
export function initTranscript() {
  const table = document.querySelector('.transcript__table');
  if (!table) return;

  table.addEventListener('click', (event) => {
    const toggle = event.target.closest('.transcript__toggle');
    if (!toggle) return;

    const row = toggle.closest('.transcript__row');
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    row.classList.toggle('is-open', !open);
  });
}

/* ------------------------------------------------------------ page spine */

/**
 * The scroll-linked pipeline that ties the hero graph to the whole page:
 * a vertical line down the margin whose fill tracks reading progress, with
 * a node at every section that lights as you pass it. Scroll-driven only —
 * nothing moves on its own, so it stays on under reduced motion.
 */
export function initSpine() {
  const main = document.getElementById('main');
  const spine = main?.querySelector('.page-spine');
  if (!main || !spine) return;

  const sections = [...main.querySelectorAll('.section')];
  let ticking = false;

  const update = () => {
    const rect = main.getBoundingClientRect();
    const viewLine = window.innerHeight * 0.6;
    const progress = rect.height > 0 ? Math.min(Math.max((viewLine - rect.top) / rect.height, 0), 1) : 0;
    spine.style.setProperty('--spine-progress', progress.toFixed(4));

    const passLine = window.innerHeight * 0.55;
    for (const s of sections) {
      s.classList.toggle('is-passed', s.getBoundingClientRect().top < passLine);
    }
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
  window.addEventListener('resize', update);

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
