import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';
import { buildSitemap, PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from '../scripts/lib/api.mjs';
import { TEMPLATES, notFound, buildRedirects } from '../scripts/lib/pages.mjs';
import { contactCv, headMeta } from '../scripts/lib/blocks.mjs';
import { personLd } from '../scripts/lib/jsonld.mjs';

const db = loadDb('data');

test('llms.txt opens with an H1 and a blockquote summary', () => {
  const txt = buildLlmsTxt(db);
  assert.match(txt, /^# Nour Aldeen Tofi\n/);
  assert.match(txt, /\n> /);
});

test('llms.txt links every page and never emits a null href', () => {
  const txt = buildLlmsTxt(db);
  for (const page of ['about', 'work', 'projects', 'automation', 'contact']) {
    assert.ok(txt.includes(`(${db.profile.site}/en/${page})`), `missing link to ${page}`);
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
  // The host redirects every .html address, so the sitemap must list none.
  assert.ok(!xml.includes('.html'), 'the sitemap lists an address the host redirects');
  assert.ok(xml.includes(`<loc>${db.profile.site}/</loc>`));
  assert.ok(xml.includes(`<loc>${db.profile.site}/en/about</loc>`));
});

/* One address per page, everywhere a crawler looks: /about.html redirects to
   /about, and Google listed both until every signal agreed on the clean one. */
test('canonical, hreflang and og:url all use the clean address', () => {
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const head = headMeta(db, page, lang);
      assert.ok(head.includes(`<link rel="canonical" href="${db.profile.site}${pagePath(page, lang)}">`), `${lang}/${page}: canonical`);
      assert.ok(head.includes(`<meta property="og:url" content="${db.profile.site}${pagePath(page, lang)}">`), `${lang}/${page}: og:url`);
      assert.ok(!head.includes('.html"'), `${lang}/${page || 'index'}: the head names an .html address`);
    }
  }
  assert.equal(pagePath('', 'ar'), '/');
  assert.equal(pagePath('', 'en'), '/en/');
  assert.equal(pagePath('work', 'en'), '/en/work');
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

/* JSON Resume defines certificates[].url as a URL. A credential ID is not one,
   and a parser that trusts the field renders it as a dead link. The ID still
   travels in the JSON-LD identifier, llms-full.txt, and the MCP tool. */
test('resume.json never puts a non-URL in a certificate url field', () => {
  const r = buildResumeJson(db);
  for (const c of r.certificates) {
    if (!('url' in c)) continue;
    assert.match(c.url, /^https?:\/\//, `${c.name} has a non-URL url: ${c.url}`);
  }
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
      const href = pagePath(page, lang);
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

/* Every shortcut is a real file, so it works on hosts that ignore _redirects.
   These four are the ones robots.txt and the README hand out. */
test('every documented shortcut is a real file, not a redirect rule', () => {
  const stubs = buildRedirects(db);

  assert.deepEqual(
    stubs.map((s) => s.path).sort(),
    ['cv/auto/index.html', 'cv/index.html', 'profile/index.html', 'resume/index.html'],
  );

  for (const s of stubs) {
    assert.match(s.html, /<meta name="robots" content="noindex/, `${s.path} is indexable`);
    assert.match(s.html, /<meta http-equiv="refresh" content="0;\s*url=/, `${s.path} never redirects`);
    assert.ok(s.html.includes(`href="${s.target}"`), `${s.path} has no fallback link`);
  }
});

test('the shortcuts resolve to the real files named in data', () => {
  const target = Object.fromEntries(buildRedirects(db).map((s) => [s.path, s.target]));

  assert.match(target['cv/index.html'], /^\/assets\/cv\/Nour_Aldeen_Tofi\.pdf\?v=[0-9a-f]{8}$/);
  assert.equal(target['cv/auto/index.html'], target['cv/index.html']);
  assert.equal(target['resume/index.html'], '/api/resume.json');
  assert.equal(target['profile/index.html'], '/api/profile.json');
});

/* A new CV keeps its file name, and the CDN keeps a PDF for a day. Without the
   fingerprint, visitors download the old CV long after the new one ships. */
test('every way to the CV carries its fingerprint', () => {
  const cvUrl = buildRedirects(db).find((s) => s.path === 'cv/index.html').target;
  for (const lang of LANGS) {
    assert.ok(contactCv(db, lang).includes(`href="${cvUrl}" download`), `${lang}: the download button skips the fingerprint`);
  }

  const rules = readFileSync('_redirects', 'utf8').split('\n').map((line) => line.trim().split(/\s+/)[0]);
  for (const path of ['/cv', '/cv/auto']) {
    assert.ok(!rules.includes(path), `_redirects answers ${path} with the bare PDF before the generated page can`);
  }
});

/* The 404 is a real 200-status file at /404.html and /en/404.html. Without this
   it is a crawlable page carrying the home page's title and description. */
test('the 404 page tells crawlers not to index it', () => {
  for (const lang of LANGS) {
    assert.match(
      notFound(db, lang),
      /<meta name="robots" content="noindex/,
      `${lang}: 404 is indexable`,
    );
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

/* One sitewide description reads as boilerplate to a search engine; each
   page states its own subject in its title and description. */
test('every page has its own title and description', () => {
  for (const lang of LANGS) {
    const heads = PAGES.map((page) => headMeta(db, page, lang));
    const titles = heads.map((h) => h.match(/<title>([^<]*)<\/title>/)[1]);
    const descriptions = heads.map((h) => h.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.equal(new Set(titles).size, PAGES.length, `${lang}: two pages share a title`);
    assert.equal(new Set(descriptions).size, PAGES.length, `${lang}: two pages share a description`);
    for (const t of titles) assert.ok(t.includes(db.profile.name[lang]), `${lang}: "${t}" does not name him`);
  }
});

test('llms files and page heads carry no em dash', () => {
  for (const txt of [buildLlmsTxt(db), buildLlmsFullTxt(db)]) assert.ok(!txt.includes('—'), 'an llms file has an em dash');
  for (const lang of LANGS) {
    for (const page of PAGES) assert.ok(!headMeta(db, page, lang).includes('—'), `${lang}/${page || 'index'}: em dash in the head`);
  }
});

test('Google Analytics loads only once a measurement ID is set', () => {
  assert.ok(!headMeta(db, '', 'en').includes('googletagmanager'), 'a tag is emitted with no ID');
  const withId = { ...db, profile: { ...db.profile, analytics: { ga4: 'G-TEST1234' } } };
  const head = headMeta(withId, '', 'en');
  assert.ok(head.includes('googletagmanager.com/gtag/js?id=G-TEST1234'));
  assert.ok(head.includes("gtag('config','G-TEST1234')"));
});

/* He left DFS: no current employer may be claimed, and what he seeks is stated. */
test('the Person names no current employer between jobs, and says what he seeks', () => {
  for (const lang of LANGS) {
    const p = personLd(db, lang);
    const running = db.experience.filter((e) => e.end === null).length;
    assert.equal('worksFor' in p, running > 0, `${lang}: worksFor disagrees with the experience data`);
    assert.equal(p.seeks.name, db.profile.availability.roles[lang].join(', '));
    assert.deepEqual(p.seeks.areaServed, db.profile.availability.areas[lang]);
    assert.equal(p.image['@type'], 'ImageObject');
    assert.equal(p.image.creditText, db.profile.name[lang]);
  }
});
