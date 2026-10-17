/**
 * Workflow diagrams, drawn at build time.
 *
 * Every system in the Automation Lab carries a curated flow — the real node
 * graph compressed to the steps a reader can follow. This turns that flow into
 * an inline SVG in the site's own visual language: nodes are cards, edges are
 * the same lines the background draws, and a pulse travels along each edge.
 *
 * Inline rather than an image file, so every label is real text in the HTML:
 * readable by a crawler, a screen reader, and a language model alike.
 *
 * Long flows wrap like a snake — left to right, then back right to left on
 * the next row — so no diagram grows wider than a page and its labels keep
 * their real size. Arrowheads carry the direction where a row turns back.
 *
 * Pure: data in, string out.
 */

import { escapeHtml as e } from './render.mjs';

const KINDS = new Set(['trigger', 'ai', 'logic', 'data', 'io', 'human', 'output']);

export const MAX_PER_ROW = 5;

const NODE_H = 52;
const NODE_H_BARE = 38;
const COL_GAP = 44;
const ROW_GAP = 14;
const LANE_GAP = 46;
const PAD = 12;

/* No font metrics at build time, so widths are estimated per script. The
   estimate only has to be generous enough that no label touches its edge. */
const textWidth = (str, size) => {
  let w = 0;
  for (const ch of String(str)) {
    if (/[؀-ۿ]/.test(ch)) w += size * 0.5;
    else if (/[A-Z]/.test(ch)) w += size * 0.66;
    else if (ch === ' ') w += size * 0.3;
    else w += size * 0.55;
  }
  return w;
};

/**
 * Columns by longest path from a source, so every edge points forward.
 * Throws on a cycle — a diagram that loops back cannot be read in one
 * direction, and the data should say so rather than render something false.
 */
export function layer(nodes, edges) {
  const ids = nodes.map((n) => n.id);
  const known = new Set(ids);
  for (const [a, b] of edges) {
    if (!known.has(a) || !known.has(b)) throw new Error(`diagram: edge ${a} → ${b} names an unknown node`);
  }

  const depth = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let pass = 0; pass <= ids.length; pass += 1) {
    let changed = false;
    for (const [a, b] of edges) {
      if (depth[b] < depth[a] + 1) {
        depth[b] = depth[a] + 1;
        changed = true;
      }
    }
    if (!changed) return depth;
  }
  throw new Error('diagram: the flow contains a cycle');
}

/**
 * @param {{nodes: Array<{id: string, label: {en: string, ar: string}, kind: string, service?: string}>, edges: string[][]}} flow
 * @param {'en'|'ar'} lang
 * @param {{title: string, id: string}} meta
 */
export function flowDiagram(flow, lang, { title, id }) {
  const { nodes, edges } = flow;
  if (!nodes?.length) throw new Error(`diagram ${id}: no nodes`);
  for (const n of nodes) {
    if (!KINDS.has(n.kind)) throw new Error(`diagram ${id}: node "${n.id}" has unknown kind "${n.kind}"`);
  }

  const depth = layer(nodes, edges);
  const cols = [];
  for (const n of nodes) (cols[depth[n.id]] ??= []).push(n);

  // One pass of barycentre ordering keeps edges from crossing needlessly.
  const order = {};
  cols.forEach((col, ci) => {
    if (ci > 0) {
      const score = (n) => {
        const parents = edges.filter(([, b]) => b === n.id).map(([a]) => order[a]);
        return parents.length ? parents.reduce((s, x) => s + x, 0) / parents.length : 0;
      };
      col.sort((a, b) => score(a) - score(b));
    }
    col.forEach((n, i) => (order[n.id] = i));
  });

  // Rows of near-equal length: nine columns become five and four, not five
  // and a lonely four-node stub.
  const rowCount = Math.ceil(cols.length / MAX_PER_ROW);
  const perRow = Math.ceil(cols.length / rowCount);

  const label = (n) => n.label[lang];
  const nodeW = Math.ceil(
    Math.min(
      200,
      Math.max(
        124,
        ...nodes.map((n) => Math.max(textWidth(label(n), 12.5), n.service ? textWidth(n.service, 10) : 0) + 44),
      ),
    ),
  );
  const heightOf = (n) => (n.service ? NODE_H : NODE_H_BARE);
  const colHeight = (col) => col.reduce((s, n) => s + heightOf(n), 0) + ROW_GAP * (col.length - 1);

  const rows = Array.from({ length: rowCount }, (_, r) => cols.slice(r * perRow, (r + 1) * perRow));
  const rowH = rows.map((row) => Math.max(...row.map(colHeight)));
  const width = PAD * 2 + perRow * nodeW + (perRow - 1) * COL_GAP;
  const height = PAD * 2 + rowH.reduce((s, h) => s + h, 0) + LANE_GAP * (rowCount - 1);
  const rtl = lang === 'ar';

  // Lay out in left-to-right coordinates, then mirror the whole picture for
  // Arabic. Odd rows run backwards — that is the snake.
  const box = {};
  let top = PAD;
  rows.forEach((row, r) => {
    row.forEach((col, p) => {
      const slot = r % 2 === 1 ? perRow - 1 - p : p;
      const xLtr = PAD + slot * (nodeW + COL_GAP);
      const x = rtl ? width - xLtr - nodeW : xLtr;
      let y = top + (rowH[r] - colHeight(col)) / 2;
      for (const n of col) {
        box[n.id] = { x, y, w: nodeW, h: heightOf(n), row: r, col: r * perRow + p };
        y += heightOf(n) + ROW_GAP;
      }
    });
    top += rowH[r] + LANE_GAP;
  });

  const r1 = (v) => Math.round(v * 10) / 10;
  const arrowId = `wf-a-${id}-${lang}`;

  const edgePaths = edges.map(([a, b], i) => {
    const s = box[a];
    const t = box[b];
    let d;
    if (s.row === t.row) {
      const forward = t.x > s.x;
      const x1 = forward ? s.x + s.w : s.x;
      const x2 = forward ? t.x : t.x + t.w;
      const y1 = s.y + s.h / 2;
      const y2 = t.y + t.h / 2;
      const bend = (x2 - x1) / 2;
      d = `M${r1(x1)} ${r1(y1)} C${r1(x1 + bend)} ${r1(y1)} ${r1(x2 - bend)} ${r1(y2)} ${r1(x2)} ${r1(y2)}`;
    } else {
      // Down to the next row: leave from the bottom, arrive at the top.
      const x1 = s.x + s.w / 2;
      const x2 = t.x + t.w / 2;
      const y1 = s.y + s.h;
      const y2 = t.y;
      const bend = (y2 - y1) / 2;
      d = `M${r1(x1)} ${r1(y1)} C${r1(x1)} ${r1(y1 + bend)} ${r1(x2)} ${r1(y2 - bend)} ${r1(x2)} ${r1(y2)}`;
    }
    // The delay follows the column, so a pulse reads as one wave travelling
    // through the whole system rather than every edge firing at once.
    const delay = (s.col * 0.4 + (i % 3) * 0.12).toFixed(2);
    return `    <path class="wf__edge" d="${d}" marker-end="url(#${arrowId})"/>
    <path class="wf__pulse" d="${d}" pathLength="100" style="animation-delay:${delay}s"/>`;
  });

  const markX = (b) => (rtl ? b.x + b.w - 16 : b.x + 16);
  const textX = (b) => b.x + b.w / 2 + (rtl ? -6 : 6);

  const nodeEls = nodes.map((n) => {
    const b = box[n.id];
    const cy = b.y + b.h / 2;
    const ly = n.service ? cy - 4 : cy + 4.5;
    return `    <g class="wf__node wf__node--${n.kind}">
      <rect x="${r1(b.x)}" y="${r1(b.y)}" width="${b.w}" height="${b.h}" rx="11"/>
      <circle class="wf__mark" cx="${r1(markX(b))}" cy="${r1(cy)}" r="4.5"/>
      <text class="wf__label" x="${r1(textX(b))}" y="${r1(ly)}" text-anchor="middle">${e(label(n))}</text>${
        n.service
          ? `\n      <text class="wf__service" x="${r1(textX(b))}" y="${r1(cy + 13)}" text-anchor="middle">${e(n.service)}</text>`
          : ''
      }
    </g>`;
  });

  // The description spells the flow out in order, for anyone who cannot see it.
  const desc = cols.map((col) => col.map(label).join(' / ')).join(rtl ? ' ← ' : ' → ');
  const tid = `wf-${id}-${lang}-t`;
  const did = `wf-${id}-${lang}-d`;

  return `<svg class="wf" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="${tid} ${did}" style="--wf-w:${width}px">
    <title id="${tid}">${e(title)}</title>
    <desc id="${did}">${e(desc)}</desc>
    <defs><marker id="${arrowId}" class="wf__arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.8 L7 4 L0 7.2 Z"/></marker></defs>
${edgePaths.join('\n')}
${nodeEls.join('\n')}
  </svg>`;
}
