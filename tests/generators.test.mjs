import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';
import { buildSitemap, PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from '../scripts/lib/api.mjs';
import { TEMPLATES, notFound, buildRedirects } from '../scripts/lib/pages.mjs';
import { contactCv, contactLinks, headMeta, periodWords, ROBOTS_INDEXABLE, ROBOTS_NOINDEX } from '../scripts/lib/blocks.mjs';
import { byCompany } from '../scripts/lib/experience.mjs';
import { personLd } from '../scripts/lib/jsonld.mjs';
import { homeOffers, automationServices } from '../scripts/lib/offers.mjs';
import { buildSite } from '../scripts/lib/site.mjs';
import { parseRedirects } from '../scripts/lib/gates.mjs';

const db = loadDb('data');
// What the build adds: the one date the output carries.
const built = { ...db, build: { modified: '2026-11-15T00:00:00+03:00' } };

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

/* robots.txt sends AI agents to these two files instead of the pages. What
   the service pages say he offers, and where, has to be in them, in the
   pages' own words. */
test('the llms files say what he offers, in the words of the pages', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const short = buildLlmsTxt(db, lang);
    const full = buildLlmsFullTxt(db, lang);
    const base = db.profile.site;

    for (const o of homeOffers(db, lang)) {
      const line = `- [${o.title}](${base}${pagePath(o.page, lang)}): ${o.body}`;
      assert.ok(short.includes(line), `${lang}: llms.txt does not offer "${o.title}"`);
      assert.ok(full.includes(line), `${lang}: llms-full.txt does not offer "${o.title}"`);
    }
    // The map says it before it lists the pages; the profile right after "About".
    assert.ok(short.indexOf('## What he offers') < short.indexOf('## Start here'));
    assert.ok(full.indexOf('## About') < full.indexOf('## What he offers') && full.indexOf('## What he offers') < full.indexOf('## How he works'));
    assert.equal(short.split('## What he offers').length - 1, 1);
    assert.equal(full.split('## What he offers').length - 1, 1);

    const section = full.slice(full.indexOf('## What he offers'), full.indexOf('## How he works'));
    assert.ok(section.includes(c.automation.lead) && section.includes(c.showcase.lead), `${lang}: a lead is missing`);
    for (const s of automationServices(db, lang)) {
      const line = section.split('\n').find((l) => l.startsWith(`- **${s.title}.** ${s.body}`));
      assert.ok(line, `${lang}: the service "${s.title}" is missing`);
      // Each claim names the systems behind it, with the status the page gives them.
      for (const w of s.systems) assert.ok(line.includes(`${w.name[lang]} (${c.ui.status[w.status]})`), `${lang}: ${s.id} does not name ${w.id}`);
    }
    c.automation.process.forEach((step, i) => assert.ok(section.includes(`\n${i + 1}. ${step}\n`), `${lang}: step ${i + 1}`));
    for (const line of c.showcase.offer) assert.ok(section.includes(`\n- ${line}\n`), `${lang}: ${line}`);
    assert.ok(section.includes(c.showcase.where), `${lang}: where he works is missing`);
  }

  // The words an assistant is asked for.
  const full = buildLlmsFullTxt(db);
  assert.match(full, /n8n developer/);
  assert.match(full, /independent web developer/);
  for (const city of ['Al Khobar', 'Dammam', 'Dhahran']) assert.ok(full.includes(city));
});

/* Everything under scripts/lib is a pure transform: the build hands it the
   one date the output carries. Rendered at two different moments from the
   same data, every artefact has to come out the same. */
test('nothing the build writes depends on the clock', (t) => {
  // Every file the build writes, the detail pages included.
  const everything = () => JSON.stringify([...buildSite(built)]);
  assert.ok(buildSite(built).has('en/projects/smart-scanner.html') && buildSite(built).has('sitemap.xml'));

  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-15T09:00:00Z') });
  const first = everything();
  t.mock.timers.setTime(new Date('2031-03-02T21:30:00Z').getTime());
  assert.equal(new Date().getFullYear(), 2031, 'the clock did not move, so this test proves nothing');
  assert.equal(everything(), first);
});

test('the sitemap and the API carry the dates they are given, and no other', () => {
  // A day for every address, and the sitemap repeats each one beside it.
  const dates = Object.fromEntries(LANGS.flatMap((lang) => PAGES.map((page) => [pagePath(page, lang), '2026-11-15'])));
  const xml = buildSitemap(PAGES, db.profile.site, dates);
  assert.equal((xml.match(/<lastmod>2026-11-15<\/lastmod>/g) || []).length, PAGES.length * LANGS.length);
  assert.ok(!buildSitemap(PAGES, db.profile.site).includes('lastmod'), 'a date appeared that nobody gave');

  // A day for one address dates that address only.
  const one = buildSitemap(PAGES, db.profile.site, { '/en/about': '2026-03-02' });
  assert.equal((one.match(/<lastmod>/g) || []).length, 1);
  // Straight after the address: the sitemap schema fixes the order of its own
  // elements (loc, then lastmod) and takes the hreflang links after them.
  assert.match(one, /<loc>[^<]*\/en\/about<\/loc>\s*<lastmod>2026-03-02<\/lastmod>\s*<xhtml:link/);
  // Google ignores both, so neither is written.
  assert.ok(!/<priority>|<changefreq>/.test(xml));

  assert.equal(buildApiProfile(built).generated, built.build.modified);
  assert.equal(buildApiProjects(built).generated, built.build.modified);
  assert.ok(!('generated' in JSON.parse(JSON.stringify(buildApiProfile(db)))));
});

test('sitemap emits one url per page per language with hreflang alternates', () => {
  const xml = buildSitemap(PAGES, db.profile.site);
  assert.equal((xml.match(/<url>/g) || []).length, PAGES.length * LANGS.length);
  assert.match(xml, /hreflang="ar"/);
  assert.match(xml, /hreflang="en"/);
  assert.match(xml, /hreflang="x-default"/);
  // A browser set to neither language is offered English, on every page.
  for (const page of PAGES) {
    assert.equal(xml.split(`<xhtml:link rel="alternate" hreflang="x-default" href="${db.profile.site}${pagePath(page, 'en')}"/>`).length - 1, LANGS.length, `x-default of /${page}`);
  }
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
  // A day, or a bare year when only the year is known: the schema accepts both.
  assert.ok(r.work.every((w) => /^\d{4}(-\d{2}-\d{2})?$/.test(w.startDate)));
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

/* Eight tabs share a phone's width, so a tab label has a budget: the longest
   one the bar has always carried ("Projects", and its Arabic). A tab says
   the same thing as the navigation, in the same word or a shorter form of
   it, never a different idea: "Lab" did not say what the page offers. */
test('a tab label is the navigation label or a shorter form of it, within the budget', () => {
  const budget = { en: 'Projects'.length, ar: 'المشاريع'.length };
  for (const lang of LANGS) {
    const { nav, navShort } = db.copy[lang];
    assert.deepEqual(Object.keys(navShort), Object.keys(nav));
    for (const [key, label] of Object.entries(navShort)) {
      assert.ok(label.length <= budget[lang], `${lang}: the tab "${label}" is longer than the bar has room for`);
      assert.ok(label === nav[key] || label.length < nav[key].length, `${lang}: the tab "${label}" is not a short form of "${nav[key]}"`);
    }
    assert.ok(!Object.values({ ...nav, ...navShort }).some((l) => /\bLab\b|مختبر|Showcase|معرض/.test(l)), `${lang}: an old label is back`);
  }
  // Short forms of the same word, or the word the page has always gone by.
  assert.deepEqual(
    Object.fromEntries(Object.entries(db.copy.en.navShort).filter(([key, label]) => label !== db.copy.en.nav[key])),
    { work: 'Work', showcase: 'Sites', automation: 'Auto' },
  );
  assert.deepEqual(db.copy.ar.navShort, db.copy.ar.nav, 'every Arabic label fits the bar as it is');
});

/* A page has two navigation landmarks, and a screen reader lists them by
   their labels. Both used to be labelled with the word of the Home link,
   which named neither and made them one and the same. */
test('the two navigation landmarks say what they are, each in its own words', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    for (const html of [TEMPLATES[''](db, lang), TEMPLATES.contact(db, lang), notFound(db, lang)]) {
      const labels = [...html.matchAll(/<nav class="(site-nav|mobile-tabs)" aria-label="([^"]*)">/g)].map((m) => [m[1], m[2]]);
      assert.deepEqual(labels, [['site-nav', c.ui.navMain], ['mobile-tabs', c.ui.navTabs]], lang);
    }
    assert.notEqual(c.ui.navMain, c.ui.navTabs);
    for (const label of [c.ui.navMain, c.ui.navTabs]) assert.ok(label !== c.nav.home && label.trim().length > 0, `${lang}: "${label}"`);
  }
  assert.ok(!/[A-Za-z]/.test(db.copy.ar.ui.navMain + db.copy.ar.ui.navTabs), 'an Arabic landmark labelled in English');
});

/* "Email" and "Phone" were typed into the template, so the Arabic contact
   page printed them in English above an Arabic value label. The other rows
   are the names of the places his profiles are on, the same in both. */
test('the contact rows that are words are in the language of the page', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const rows = [...contactLinks(db, lang).matchAll(/<a href="([^"]*)"[^>]*>[\s\S]*?<span class="platform">([^<]*)<\/span>/g)].map((m) => [m[1].split(':')[0], m[2]]);
    assert.deepEqual(rows.slice(0, 2), [['mailto', c.contact.emailLabel], ['tel', c.contact.phoneLabel]], lang);
    assert.ok(rows.length > 2 && rows.slice(2).every(([scheme]) => scheme === 'https'), `${lang}: the profile rows`);
  }
  assert.deepEqual([db.copy.en.contact.emailLabel, db.copy.en.contact.phoneLabel], ['Email', 'Phone']);
  assert.ok(!/[A-Za-z]/.test(db.copy.ar.contact.emailLabel + db.copy.ar.contact.phoneLabel), 'an Arabic label in English');
  assert.ok(!contactLinks(db, 'ar').includes('<span class="platform">Email</span>') && !contactLinks(db, 'ar').includes('<span class="platform">Phone</span>'));
});

/* The names a search result may show as sitelinks are the words of these
   links, so each says what its page offers. */
test('the navigation names each page by what it offers, in both languages', () => {
  assert.deepEqual(
    [db.copy.en.nav.work, db.copy.en.nav.showcase, db.copy.en.nav.automation],
    ['Experience', 'Websites', 'Automation'],
  );
  assert.deepEqual(
    [db.copy.ar.nav.work, db.copy.ar.nav.showcase, db.copy.ar.nav.automation],
    ['الخبرة', 'المواقع', 'الأتمتة'],
  );
  for (const lang of LANGS) {
    const html = TEMPLATES[''](db, lang);
    const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];
    for (const page of PAGES) {
      const key = page === '' ? 'home' : page;
      assert.ok(nav.includes(`<a href="${pagePath(page, lang)}"${page === '' ? ' aria-current="page"' : ''}>${db.copy[lang].nav[key]}</a>`), `${lang}: ${key}`);
    }
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
    // One canonical, with the host: a relative one is resolved against
    // wherever the stub happens to be served.
    const canonicals = [...s.html.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
    assert.equal(canonicals.length, 1, `${s.path}: one canonical`);
    assert.ok(canonicals[0].startsWith(`${db.profile.site}/`), `${s.path}: the canonical "${canonicals[0]}" is not absolute`);
    assert.ok(!canonicals[0].includes('?'), `${s.path}: the canonical carries a fingerprint`);
  }
  const canonical = Object.fromEntries(stubs.map((s) => [s.path, s.canonical]));
  assert.equal(canonical['resume/index.html'], `${db.profile.site}/api/resume.json`);
  assert.equal(canonical['profile/index.html'], `${db.profile.site}/api/profile.json`);
});

/* Where the host reads _redirects, the two JSON shortcuts are permanent
   redirects in both forms. The folders exist as generated pages, so without
   the rule for the form with the slash that one would be answered by the page. */
test('the JSON shortcuts are permanent redirects, with and without the slash', () => {
  const rules = parseRedirects(readFileSync('_redirects', 'utf8'));
  for (const [from, to] of [['/resume', '/api/resume.json'], ['/resume/', '/api/resume.json'], ['/profile', '/api/profile.json'], ['/profile/', '/api/profile.json']]) {
    assert.deepEqual(rules.find((r) => r.from === from), { from, to, status: 301 }, from);
  }
  // Every one of them comes before the catch-all, which answers first otherwise.
  const catchAll = rules.findIndex((r) => r.from === '/*');
  for (const from of ['/resume', '/resume/', '/profile', '/profile/']) assert.ok(rules.findIndex((r) => r.from === from) < catchAll, from);
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

/* The 404 is a real 200-status file at /404 and /en/404, and the host serves
   it at every address that does not exist. It used to carry the home page's
   title, description, canonical and hreflang set beside its noindex: "do not
   index me" and "my real address is the home page" in one head. */
test('the 404 page stays out of search and names no address as its own', () => {
  for (const lang of LANGS) {
    const html = notFound(db, lang);
    const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)">/g)].map((m) => m[1]);
    assert.deepEqual(robots, ['noindex, follow'], `${lang}: 404 is indexable`);

    assert.ok(!html.includes('rel="canonical"'), `${lang}: a canonical beside noindex`);
    assert.ok(!/<link rel="alternate" hreflang=/.test(html), `${lang}: the 404 is not one of a set of translations`);
    assert.ok(!html.includes('property="og:url"'), `${lang}: og:url`);

    // Its own words, from the copy, not the home page's.
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    const description = html.match(/<meta name="description" content="([^"]*)">/)[1];
    const home = headMeta(db, '', lang);
    assert.equal(title, db.copy[lang].meta.notFound.title);
    assert.ok(title.endsWith(`| ${db.profile.name[lang]}`), `${lang}: "${title}" does not name him`);
    assert.ok(!home.includes(`<title>${title}</title>`) && !home.includes(`content="${description}"`), `${lang}: the 404 repeats the home page`);
    assert.ok(html.includes(`<p class="hero__headline">${db.copy[lang].meta.notFound.heading}</p>`));
    for (const text of Object.values(db.copy[lang].meta.notFound)) assert.ok(!text.includes('—') && !/\d/.test(text), `${lang}: ${text}`);

    // What a lost visitor needs is still there: the way home and the other language.
    assert.ok(html.includes(`<a class="btn" href="${pagePath('', lang)}">`));
    assert.ok(html.includes(`<a class="lang-switch" href="${pagePath('', lang === 'ar' ? 'en' : 'ar')}"`));

    // It is laid out as the home page is, but the visitor is not on the home
    // page: no link in the header or in the tab bar is marked as where they are.
    assert.ok(!html.includes('aria-current'), `${lang}: the 404 marks a page as the current one`);
    for (const page of PAGES) assert.ok(html.includes(`<a href="${pagePath(page, lang)}">`), `${lang}: the link to ${page || 'home'} is gone from the header`);
    // The home page itself still is.
    assert.equal(TEMPLATES[''](db, lang).split('aria-current="page"').length - 1, 2, `${lang}: the home page marks itself in both navigations`);
  }
});

/* Without max-image-preview:large Google keeps to a default-sized thumbnail
   of a page's picture. One robots meta on every page, so there is one place
   that says what a page allows. */
test('every page meant for search carries one robots meta that allows a large preview', () => {
  const pages = [...buildSite(built)].filter(([path]) => path.endsWith('.html') && !/^(cv|resume|profile)\//.test(path));
  assert.ok(pages.length > PAGES.length * LANGS.length, 'the detail pages are not in the walk');
  for (const [path, html] of pages) {
    const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)">/g)].map((m) => m[1]);
    assert.equal(robots.length, 1, `${path}: ${robots.length} robots metas`);
    if (/(^|\/)404\.html$/.test(path)) {
      assert.equal(robots[0], ROBOTS_NOINDEX, path);
    } else {
      assert.equal(robots[0], 'max-image-preview:large, max-snippet:-1, max-video-preview:-1', path);
      assert.equal(robots[0], ROBOTS_INDEXABLE);
      assert.ok(!robots[0].includes('noindex'), path);
    }
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

test('Google Analytics loads only once a tag ID is set, in the form Analytics gives for it', () => {
  const withTag = (analytics) => headMeta({ ...db, profile: { ...db.profile, analytics } }, '', 'en');

  assert.ok(!withTag({ tag: null }).includes('googletagmanager'), 'a tag is emitted with no ID');

  const container = withTag({ tag: 'GTM-TEST123' });
  assert.ok(container.includes('googletagmanager.com/gtm.js?id=GTM-TEST123'));
  assert.ok(container.includes("gtag('js',new Date());"));
  assert.ok(!container.includes("gtag('config'"), 'a container tag already knows its stream');

  const stream = withTag({ tag: 'G-TEST1234' });
  assert.ok(stream.includes('googletagmanager.com/gtag/js?id=G-TEST1234'));
  assert.ok(stream.includes("gtag('config','G-TEST1234')"));
});

test('every page carries the Google tag exactly once', () => {
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const html = TEMPLATES[page](db, lang);
      assert.equal(html.split(`gtm.js?id=${db.profile.analytics.tag}`).length - 1, 1, `${lang}/${page || 'index'}`);
    }
  }
});

/* He left DFS: no current employer may be claimed, and what he seeks is stated. */
test('the Person names no current employer between jobs, and says what he seeks', () => {
  for (const lang of LANGS) {
    // The employers are on the experience page, so that node would name one.
    const running = db.experience.filter((e) => e.end === null && !e.selfEmployed).length;
    assert.equal('worksFor' in personLd(db, lang, 'work'), running > 0, `${lang}: worksFor disagrees with the experience data`);
    // What he is looking for is shown on the contact page, role by role.
    const p = personLd(db, lang, 'contact');
    assert.equal(p.seeks.name, db.profile.availability.roles[lang].join(', '));
    assert.deepEqual(p.seeks.areaServed, db.profile.availability.areas[lang]);
    // The portrait is on every page, so every node carries it.
    assert.equal(personLd(db, lang).image['@type'], 'ImageObject');
    assert.equal(personLd(db, lang).image.creditText, db.profile.name[lang]);
  }
});

/* A promotion is one tenure: both DFS roles sit in one card that runs from the
   first day of the first role to the last day of the second. */
test('roles at one employer render as one entry spanning the whole tenure', () => {
  const groups = byCompany(db.experience);
  const companies = groups.map((g) => g.company);
  assert.equal(new Set(companies).size, companies.length, 'an employer appears twice: its roles are not adjacent in experience.json');

  for (const lang of LANGS) {
    const html = TEMPLATES.work(db, lang);
    for (const g of groups.filter((x) => x.roles.length > 1)) {
      const cards = html.split('<li data-reveal class="timeline__item').slice(1);
      const card = cards.find((li) => li.includes(g.roles[0].role[lang]));
      assert.ok(card.startsWith(' timeline__item--group'), `${lang}: ${g.company} is not grouped`);
      for (const r of g.roles) assert.ok(card.includes(r.role[lang]), `${lang}: ${r.id} missing from its company card`);
      // The tenure is written in words, each end of it in a <time> of its own.
      const tenure = card.replace(/<[^>]+>/g, '');
      assert.ok(tenure.includes(periodWords(g.start, g.end, lang, db.copy[lang])), `${lang}: ${g.company} does not show its whole tenure`);
    }
  }
});
