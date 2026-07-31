/**
 * Entry point.
 *
 * This file never renders content — every word on the site is already in the
 * HTML before JavaScript runs. Everything here is enhancement: theme, motion,
 * navigation, and the workflow background.
 */

import { initReveal, initCounters, initNav, initSpine, initHeader } from './motion.js';
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

/* ------------------------------------------------------------------ boot */

initTheme();
initNav();
initHeader();
initReveal();
initCounters();
initSpine();

// Every hero carries a variant of the workflow animation — the page's own
// metaphor in the shared visual language. One instance per canvas.
document.querySelectorAll('canvas[data-workflow]').forEach((canvas) => {
  createWorkflowBackground(canvas);
});
