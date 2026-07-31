/* Theme persistence only. This file never renders content — every word on
   the site is already in the HTML before JavaScript runs. */
const KEY = 'nt-theme';
const root = document.documentElement;

const stored = localStorage.getItem(KEY);
if (stored === 'light' || stored === 'dark') root.dataset.theme = stored;

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const current =
    root.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const next = current === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  localStorage.setItem(KEY, next);
});
