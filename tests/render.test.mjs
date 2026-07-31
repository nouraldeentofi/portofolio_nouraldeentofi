import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectBlock, escapeHtml } from '../scripts/lib/render.mjs';

const page = `<main>\n<!-- @gen:projects -->\nold\n<!-- /@gen:projects -->\n</main>`;

test('replaces content between markers and keeps the markers', () => {
  const out = injectBlock(page, 'projects', '<article>new</article>');
  assert.match(out, /<!-- @gen:projects -->/);
  assert.match(out, /<!-- \/@gen:projects -->/);
  assert.match(out, /<article>new<\/article>/);
  assert.ok(!out.includes('old'));
});

test('leaves the rest of the document untouched', () => {
  const out = injectBlock(page, 'projects', 'x');
  assert.ok(out.startsWith('<main>'));
  assert.ok(out.trimEnd().endsWith('</main>'));
});

test('is idempotent — running twice gives the same result', () => {
  const once = injectBlock(page, 'projects', '<b>hi</b>');
  const twice = injectBlock(once, 'projects', '<b>hi</b>');
  assert.equal(once, twice);
});

test('throws a helpful error when the marker is missing', () => {
  assert.throws(() => injectBlock(page, 'nope', 'x'), /marker "nope" not found/);
});

test('throws when markers are inverted', () => {
  const bad = `<!-- /@gen:a -->x<!-- @gen:a -->`;
  assert.throws(() => injectBlock(bad, 'a', 'x'), /out of order/);
});

test('escapes html-significant characters', () => {
  assert.equal(escapeHtml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});
