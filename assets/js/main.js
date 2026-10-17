/**
 * Entry point.
 *
 * This file never renders content — every word on the site is already in the
 * HTML before JavaScript runs. Everything here is enhancement: theme, motion,
 * and the workflow background.
 *
 * Navigation is deliberately absent: the phone tab bar and the desktop nav are
 * both plain links, so they work with scripts disabled.
 */

import {
  initReveal,
  initCounters,
  initSpine,
  initHeader,
  initTranscript,
} from './motion.js';
import { createWorkflowBackground } from './workflow-bg.js';

/* ----------------------------------------------------------------- theme */

const KEY = 'nt-theme';
const root = document.documentElement;

function currentTheme() {
  // Light is the site default; dark only ever comes from the user's toggle.
  return root.dataset.theme || 'light';
}

function initTheme() {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;

  const icon = button.querySelector('.theme-toggle__icon');

  const sync = () => {
    const isLight = currentTheme() === 'light';
    button.setAttribute('aria-pressed', String(isLight));
    if (icon) icon.textContent = isLight ? '☀' : '☾';
  };

  button.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private browsing — the toggle still works for this session */
    }
    sync();
  });

  sync();
}

/* -------------------------------------------------------------- language */

/* The head script redirects arrivals to the stored language; this remembers
   the choice whenever the visitor uses the switch. */
function initLang() {
  const s = document.querySelector('.lang-switch');
  if (!s) return;
  s.addEventListener('click', () => {
    try {
      localStorage.setItem('nt-lang', s.getAttribute('hreflang') || 'ar');
    } catch {
      /* private browsing — the link still navigates */
    }
  });
}

/* -------------------------------------------------------------- portrait */

/* The trigger is a plain link to the image file, so it already works with
   scripts off. Here it is upgraded to open the dialog that is already in the
   HTML — nothing is rendered, only shown. */
function initPortrait() {
  const dialog = document.getElementById('portrait');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  document.querySelectorAll('.portrait-open').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      // Let modified clicks do what the visitor asked: new tab, save, etc.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      dialog.showModal();
    });
  });

  // Clicking the backdrop closes it. The dialog fills no more than its image,
  // so a click landing on the element itself but outside that box is a
  // backdrop click.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

/* --------------------------------------------------------------- filters */

/* A gallery's cards are all in the HTML; a filter only hides the ones that
   do not match. The bar ships `hidden` and appears here, because without
   this script it would be buttons that do nothing. One bar per page. */
function initFilters() {
  const bar = document.querySelector('[data-filter-bar]');
  if (!bar) return;
  const buttons = [...bar.querySelectorAll('[data-filter]')];
  const items = [...document.querySelectorAll('[data-filter-item]')];
  const scopes = [...document.querySelectorAll('[data-filter-scope]')];

  const apply = (key) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
    items.forEach((item) => {
      const groups = (item.dataset.group || '').split(' ');
      item.classList.toggle('is-filtered-out', key !== 'all' && !groups.includes(key));
    });
    scopes.forEach((scope) => {
      const visible = scope.querySelector('[data-filter-item]:not(.is-filtered-out)');
      scope.classList.toggle('is-empty', !visible);
    });
  };

  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (button) apply(button.dataset.filter);
  });

  bar.hidden = false;
}

/* --------------------------------------------------------------- dialogs */

/* A link to a full-size image that, with scripts on, opens the dialog that is
   already in the HTML beside it. Modified clicks still open the file. */
function initDialogs() {
  document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.dialogOpen);
    if (!dialog || typeof dialog.showModal !== 'function') return;
    trigger.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      dialog.showModal();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

/* -------------------------------------------------------------- diagrams */

/* Pulses run only while a diagram is on screen — dozens of animated paths
   off-screen would cost battery for nothing. */
function initDiagrams() {
  const diagrams = document.querySelectorAll('svg.wf');
  if (!diagrams.length) return;
  if (!('IntersectionObserver' in window)) {
    diagrams.forEach((d) => d.classList.add('is-live'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle('is-live', entry.isIntersecting)),
    { rootMargin: '80px 0px' },
  );
  diagrams.forEach((d) => io.observe(d));
}

/* ------------------------------------------------------------------ boot */

initTheme();
initLang();
initPortrait();
initFilters();
initDialogs();
initDiagrams();
initHeader();
initReveal();
initCounters();
initSpine();
initTranscript();

// Every hero carries a variant of the workflow animation — the page's own
// metaphor in the shared visual language. One instance per canvas.
document.querySelectorAll('canvas[data-workflow]').forEach((canvas) => {
  createWorkflowBackground(canvas);
});
