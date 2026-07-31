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

/** Names of every `@gen` marker present in a document. */
export function markersIn(html) {
  return [...html.matchAll(/<!-- @gen:([a-z0-9-]+) -->/g)].map((m) => m[1]);
}

/** Join an array of strings as indented HTML children. */
export function joinBlocks(parts, indent = '        ') {
  return parts
    .filter(Boolean)
    .map((p) => p.split('\n').map((line) => (line ? indent + line : line)).join('\n'))
    .join('\n');
}
