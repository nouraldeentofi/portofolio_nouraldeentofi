/**
 * Marker-block injection.
 *
 * Pages are hand-authored HTML. Repeating lists live between markers:
 *
 *   <!-- @gen:projects -->  ...generated...  <!-- /@gen:projects -->
 *
 * `injectBlock` rewrites only the span between them, so prose and layout
 * written by a human are never touched by the generator.
 */

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Anything leaving this site opens in a new tab, safely. */
export const isExternal = (url) => /^https?:\/\//.test(String(url));

/**
 * Attributes for a link that leaves the site. `noopener noreferrer` closes
 * the reverse-tabnabbing hole that bare `target="_blank"` opens.
 */
export const extAttrs = (url) => (isExternal(url) ? ' target="_blank" rel="noopener noreferrer"' : '');

/** Screen-reader note appended inside external links. */
export const newTabHint = (label) =>
  `<span class="visually-hidden"> (${escapeHtml(label)})</span>`;

export function injectBlock(html, name, content) {
  const open = `<!-- @gen:${name} -->`;
  const close = `<!-- /@gen:${name} -->`;
  const start = html.indexOf(open);
  const end = html.indexOf(close);

  if (start === -1 || end === -1) {
    throw new Error(`render: marker "${name}" not found`);
  }
  if (end < start) {
    throw new Error(`render: markers for "${name}" are out of order`);
  }

  return html.slice(0, start + open.length) + '\n' + content + '\n' + html.slice(end);
}
