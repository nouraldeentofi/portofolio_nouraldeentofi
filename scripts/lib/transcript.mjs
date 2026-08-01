/**
 * Renders a chat script as a static, readable transcript table.
 *
 * The chat itself is JavaScript, which crawlers do not run. This turns the
 * same conversation graph into a plain HTML table — one row per topic — so
 * every answer is indexable, and a reader can scan the whole conversation
 * without clicking through it.
 */

import { SCRIPT as EN } from '../../assets/js/chat/script.en.js';
import { SCRIPT as AR } from '../../assets/js/chat/script.ar.js';
import { escapeHtml } from './render.mjs';

const SCRIPTS = { en: EN, ar: AR };

/** Strip presentational markup but keep the words. */
function textOf(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A readable name for each node, taken from the button that leads to it.
 * The opening node has no button pointing at it, so it takes a fallback.
 */
function labelMap(script) {
  const labels = new Map();
  for (const node of Object.values(script)) {
    for (const [label, target] of node.opts ?? []) {
      if (!labels.has(target)) labels.set(target, textOf(label));
    }
  }
  return labels;
}

export function buildTranscript(lang = 'en', copy = null) {
  const script = SCRIPTS[lang];
  if (!script) throw new Error(`transcript: unknown language "${lang}"`);

  const t = copy?.chat ?? {};
  const headTopic = t.transcriptTopic ?? 'Topic';
  const headAnswer = t.transcriptAnswer ?? 'What Nour says';
  const openingLabel = t.transcriptOpening ?? 'Opening';

  const labels = labelMap(script);
  const seen = new Set();
  const rows = [];

  // Breadth-first from `start`, so the table follows the order a visitor
  // would meet the conversation in.
  const queue = ['start'];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id) || !script[id]) continue;
    seen.add(id);

    const node = script[id];
    const lines = [...(node.msgs ?? []), ...(node.card ? [node.card] : []), ...(node.msgs2 ?? [])]
      .map(textOf)
      .filter(Boolean);

    const label = id === 'start' ? openingLabel : (labels.get(id) ?? id);

    rows.push(
      `    <tr class="transcript__row" id="say-${escapeHtml(id)}">\n` +
        `      <th scope="row"><button type="button" class="transcript__toggle" aria-expanded="false" aria-controls="answer-${escapeHtml(id)}">${escapeHtml(label)}</button></th>\n` +
        `      <td id="answer-${escapeHtml(id)}">${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}</td>\n` +
        `    </tr>`,
    );

    for (const [, next] of node.opts ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }

  return [
    '<div class="table-wrap">',
    '  <table class="transcript__table">',
    '    <thead>',
    `      <tr><th scope="col">${escapeHtml(headTopic)}</th><th scope="col">${escapeHtml(headAnswer)}</th></tr>`,
    '    </thead>',
    '    <tbody>',
    ...rows,
    '    </tbody>',
    '  </table>',
    '</div>',
  ].join('\n');
}
