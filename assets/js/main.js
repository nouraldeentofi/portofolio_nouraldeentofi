/**
 * Entry point.
 *
 * This file never renders content — every word on the site is already in the
 * HTML before JavaScript runs. Everything here is enhancement: theme, motion,
 * navigation, and the workflow background.
 */

import { initReveal, initCounters, initNav, initScrollProgress, initHeader } from './motion.js';
import { createWorkflowBackground } from './workflow-bg.js';

/* ----------------------------------------------------------------- theme */

const KEY = 'nt-theme';
const root = document.documentElement;

function currentTheme() {
  return (
    root.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );
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
initScrollProgress();

// Every hero carries the workflow graph — full density on the home page,
// sparse on subpages. One instance per canvas.
document.querySelectorAll('canvas[data-workflow]').forEach((canvas) => {
  createWorkflowBackground(canvas);
});
