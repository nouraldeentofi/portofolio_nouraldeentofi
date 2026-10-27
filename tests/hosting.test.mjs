import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { keepFile, rewriteUrls, siteUrl } from '../scripts/lib/hosting.mjs';
import { loadDb } from '../scripts/lib/load.mjs';

const hosting = { domain: 'https://nouraldeentofi.com', owner: 'nouraldeentofi' };
const site = { repo: 'aya-rady', path: 'sites/aya-rady' };

test('GitHub Pages addresses move to the domain, absolute and root-relative', () => {
  assert.equal(
    rewriteUrls('<link rel="canonical" href="https://nouraldeentofi.github.io/aya-rady/about.html">', site, hosting),
    '<link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/about.html">',
  );
  assert.equal(rewriteUrls('"https://nouraldeentofi.github.io/aya-rady"', site, hosting), '"https://nouraldeentofi.com/sites/aya-rady"');
  assert.equal(rewriteUrls('start_url: "/aya-rady/"', site, hosting), 'start_url: "/sites/aya-rady/"');
});

test('a longer repository name and other sites are left alone', () => {
  const text = 'https://nouraldeentofi.github.io/aya-rady-two/ and https://nouraldeentofi.github.io/karam/';
  assert.equal(rewriteUrls(text, site, hosting), text);
});

test('an alias moves too', () => {
  const umrah = { repo: 'The-Complete-Umrah-Guide', path: 'umrah-guide', aliases: ['umrah-checklist'] };
  assert.equal(rewriteUrls('https://nouraldeentofi.github.io/umrah-checklist/', umrah, hosting), 'https://nouraldeentofi.com/umrah-guide/');
});

test('only the site is copied, never its working files', () => {
  for (const rel of ['index.html', 'en/about.html', 'assets/img/og.jpg', 'llms.txt', 'manifest.webmanifest', 'js/templates/index.js']) {
    assert.ok(keepFile(rel), rel);
  }
  for (const rel of ['README.md', 'brief.md', 'build.py', 'source/build.py', 'tests/qa.js', 'tools/og.html', '.github/workflows/ci.yml', 'CNAME']) {
    assert.ok(!keepFile(rel), rel);
  }
});

test('every hosted site is in the repository, and nothing on the site points at github.io', () => {
  const db = loadDb('data');
  const map = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
  for (const s of map.sites) assert.ok(existsSync(`${s.path}/index.html`), `${s.path}: run npm run sites`);
  const hosted = new Set(map.sites.map((s) => siteUrl(s, map)));
  for (const s of [...db.showcase.sites, db.showcase.lab]) {
    assert.ok(!/github\.io/.test(s.url ?? ''), `${s.id}: still on github.io`);
    if (s.url?.startsWith(`${map.domain}/`)) assert.ok(hosted.has(s.url), `${s.id}: ${s.url} is not in data/hosting.json`);
  }
  for (const p of db.projects) assert.ok(!/github\.io/.test(p.url ?? ''), `${p.id}: still on github.io`);
});
