import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';
import { buildSitemap, PAGES, LANGS } from '../scripts/lib/sitemap.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from '../scripts/lib/api.mjs';
import { TEMPLATES } from '../scripts/lib/pages.mjs';

const db = loadDb('data');

test('llms.txt opens with an H1 and a blockquote summary', () => {
  const txt = buildLlmsTxt(db);
  assert.match(txt, /^# Nour Aldeen Tofi\n/);
  assert.match(txt, /\n> /);
});

test('llms.txt links every page and never emits a null href', () => {
  const txt = buildLlmsTxt(db);
  for (const page of ['about', 'work', 'projects', 'automation', 'contact']) {
    assert.ok(txt.includes(`/${page}.html`), `missing link to ${page}`);
  }
  assert.ok(!txt.includes('(null)'));
  assert.ok(!txt.includes('undefined'));
});

test('llms-full.txt contains the flagship product and its real figures', () => {
  const full = buildLlmsFullTxt(db);
  assert.ok(full.includes('Smart Scanner'));
  assert.ok(full.includes('494'));
  assert.ok(full.includes('Teacher Assistant AI Bot'));
  assert.ok(!full.includes('Alessa'));
  assert.ok(!full.includes('undefined'));
});

test('llms-full.txt renders in Arabic too', () => {
  const full = buildLlmsFullTxt(db, 'ar');
  assert.ok(full.includes('نور الدين طفي'));
  assert.ok(!full.includes('undefined'));
});

test('sitemap emits one url per page per language with hreflang alternates', () => {
  const xml = buildSitemap(PAGES, db.profile.site);
  assert.equal((xml.match(/<url>/g) || []).length, PAGES.length * LANGS.length);
  assert.match(xml, /hreflang="ar"/);
  assert.match(xml, /hreflang="en"/);
  assert.match(xml, /hreflang="x-default"/);
  assert.ok(!xml.includes('//index.html'));
});

test('resume.json matches the JSON Resume shape', () => {
  const r = buildResumeJson(db);
  assert.equal(r.basics.name, 'Nour Aldeen Tofi');
  assert.equal(r.basics.location.countryCode, 'SA');
  assert.ok(Array.isArray(r.work) && r.work.length === 5);
  assert.ok(r.work.every((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.startDate)));
  assert.equal(r.certificates.length, 12);
  assert.ok(r.basics.profiles.every((p) => typeof p.url === 'string'));
  assert.equal(r.education[0].institution, 'University of Kalamoon');
});

test('the public api never leaks an unresolved link', () => {
  const profile = buildApiProfile(db);
  assert.ok(profile.links.every((l) => typeof l.url === 'string' && l.url.startsWith('http')));
  const projects = buildApiProjects(db);
  assert.equal(projects.projects.length, db.projects.length);
  assert.equal(projects.workflows.length, db.workflows.length);
});

test('every generated artefact is serialisable json', () => {
  for (const build of [buildApiProfile, buildApiProjects, buildResumeJson]) {
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(build(db))));
  }
});

/* The phone tab bar is the only navigation below 768px, so "every page is in
   it" is a correctness property, not a preference. It used to be built from a
   hardcoded four and had silently fallen three pages behind. */
test('the phone tab bar links every page, in both languages', () => {
  for (const lang of LANGS) {
    const bar = TEMPLATES[''](db, lang).match(/<nav class="mobile-tabs"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(bar, `${lang}: no tab bar rendered`);

    for (const page of PAGES) {
      const href = `${page === '' ? 'index' : page}.html`;
      assert.ok(bar.includes(`href="${href}"`), `${lang}: tab bar is missing ${href}`);
    }
  }
});

test('tab labels come from navShort and are never blank', () => {
  for (const lang of LANGS) {
    const bar = TEMPLATES[''](db, lang).match(/<nav class="mobile-tabs"[\s\S]*?<\/nav>/)[0];
    const labels = [...bar.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]);

    assert.equal(labels.length, PAGES.length);
    assert.ok(labels.every((l) => l.trim().length > 0), `${lang}: a tab rendered an empty label`);
    assert.ok(labels.includes(db.copy[lang].navShort.automation));
  }
});

test('no page ships a hamburger — the tab bar is the whole phone nav', () => {
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const html = TEMPLATES[page](db, lang);
      assert.ok(!html.includes('nav-toggle'), `${lang}/${page || 'index'} still renders a nav toggle`);
    }
  }
});
