import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flowDiagram, layer, MAX_PER_ROW } from '../scripts/lib/diagram.mjs';
import { loadDb } from '../scripts/lib/load.mjs';

const N = (id, kind = 'logic') => ({ id, kind, label: { en: `Step ${id}`, ar: `خطوة ${id}` } });
const chain = (n) => ({
  nodes: Array.from({ length: n }, (_, i) => N(String.fromCharCode(97 + i), i === 0 ? 'trigger' : 'logic')),
  edges: Array.from({ length: n - 1 }, (_, i) => [String.fromCharCode(97 + i), String.fromCharCode(98 + i)]),
});

test('every edge points forward: columns follow the longest path', () => {
  const d = layer([N('a'), N('b'), N('c')], [['a', 'b'], ['b', 'c'], ['a', 'c']]);
  assert.deepEqual(d, { a: 0, b: 1, c: 2 });
});

test('a cycle is refused rather than drawn', () => {
  assert.throws(() => layer([N('a'), N('b')], [['a', 'b'], ['b', 'a']]), /cycle/);
});

test('an edge to an unknown node is refused', () => {
  assert.throws(() => flowDiagram({ nodes: [N('a')], edges: [['a', 'z']] }, 'en', { id: 'x', title: 'x' }), /unknown node/);
});

test('every label is real text in the SVG, with a title and an ordered description', () => {
  const svg = flowDiagram(chain(3), 'en', { id: 't', title: 'Test flow' });
  for (const l of ['Step a', 'Step b', 'Step c']) assert.ok(svg.includes(`>${l}</text>`), l);
  assert.match(svg, /<title id="wf-t-en-t">Test flow<\/title>/);
  assert.match(svg, /<desc id="wf-t-en-d">Step a → Step b → Step c<\/desc>/);
  assert.equal((svg.match(/class="wf__edge"/g) ?? []).length, 2);
});

test('long flows wrap into rows instead of growing wider', () => {
  const wide = flowDiagram(chain(9), 'en', { id: 'w', title: 'w' });
  const short = flowDiagram(chain(MAX_PER_ROW), 'en', { id: 's', title: 's' });
  const w = (svg) => Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
  const h = (svg) => Number(svg.match(/viewBox="0 0 \d+ (\d+)"/)[1]);
  assert.ok(w(wide) <= w(short), 'nine steps are no wider than five');
  assert.ok(h(wide) > h(short), 'the extra steps went to a second row');
});

test('Arabic mirrors the layout: the first step sits on the right', () => {
  const xOf = (svg, label) => Number(svg.split(`>${label}</text>`)[0].match(/<rect x="([\d.]+)"[^>]*>(?![\s\S]*<rect)/)[1]);
  const en = flowDiagram(chain(2), 'en', { id: 'm', title: 'm' });
  const ar = flowDiagram(chain(2), 'ar', { id: 'm', title: 'm' });
  assert.ok(xOf(en, 'Step a') < xOf(en, 'Step b'));
  assert.ok(xOf(ar, 'خطوة a') > xOf(ar, 'خطوة b'));
});

test('every system flow in the data draws in both languages', () => {
  const db = loadDb('data');
  for (const w of db.workflows.filter((x) => x.flow)) {
    for (const lang of ['en', 'ar']) {
      assert.doesNotThrow(() => flowDiagram(w.flow, lang, { id: w.id, title: w.name[lang] }), `${w.id} (${lang})`);
    }
  }
});
