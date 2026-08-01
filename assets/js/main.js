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

/* ------------------------------------------------------------------ boot */

initTheme();
initLang();
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
