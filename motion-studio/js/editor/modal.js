// Generic modal dialogs (wizard, template preview, poster, export, help).
import { h, icon } from './ui.js';

export const modalOpen = () => !!document.querySelector('#modalRoot .modal');

export function openModal({ title, sub, size = '', body, foot, onClose, closable = true } = {}) {
  const root = document.getElementById('modalRoot');
  const wrap = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' });
  const card = h('div', { class: 'modal-card ' + size });
  const titleEl = h('h2', {}, title || '');
  const subEl = h('p', { hidden: !sub }, sub || '');
  const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'إغلاق' }, icon('x'));
  const head = h('div', { class: 'modal-head' }, h('div', {}, titleEl, subEl), closable ? closeBtn : null);
  const bodyEl = h('div', { class: 'modal-body' });
  if (body) bodyEl.append(body);
  const footEl = h('div', { class: 'modal-foot', hidden: !foot });
  if (foot) footEl.append(...[].concat(foot));
  card.append(head, bodyEl, footEl);
  wrap.append(card);
  root.append(wrap);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    document.removeEventListener('keydown', onKey, true);
    onClose && onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && closable) { e.stopPropagation(); close(); }
  };
  closeBtn.addEventListener('click', close);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && closable) close(); });
  document.addEventListener('keydown', onKey, true);
  return {
    close,
    body: bodyEl,
    card,
    setTitle: (t, s) => { titleEl.textContent = t; subEl.textContent = s || ''; subEl.hidden = !s; },
    setFoot: (...kids) => { footEl.innerHTML = ''; footEl.append(...kids.flat().filter(Boolean)); footEl.hidden = !kids.flat().filter(Boolean).length; },
  };
}
