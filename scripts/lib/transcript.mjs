/**
 * Renders a chat script as a static, readable transcript.
 *
 * The chat itself is JavaScript, which crawlers do not run. This turns the
 * same conversation graph into plain HTML so every answer in it is indexable.
 */

import { SCRIPT as EN } from '../../assets/js/chat/script.en.js';
import { SCRIPT as AR } from '../../assets/js/chat/script.ar.js';

const SCRIPTS = { en: EN, ar: AR };

/** Strip presentational tags but keep the text; cards become their own block. */
function textOf(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTranscript(lang = 'en') {
  const script = SCRIPTS[lang];
  if (!script) throw new Error(`transcript: unknown language "${lang}"`);

  const seen = new Set();
  const out = [];

  // Walk the graph breadth-first from `start` so the transcript follows the
  // same order a visitor would encounter.
  const queue = ['start'];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id) || !script[id]) continue;
    seen.add(id);

    const node = script[id];
    const lines = [...(node.msgs ?? []), ...(node.card ? [node.card] : []), ...(node.msgs2 ?? [])];

    out.push(`<section class="transcript__node" id="say-${id}">`);
    for (const line of lines) {
      const text = textOf(line);
      if (text) out.push(`  <p>${text}</p>`);
    }
    out.push('</section>');

    for (const [, next] of node.opts ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }

  return out.join('\n');
}
