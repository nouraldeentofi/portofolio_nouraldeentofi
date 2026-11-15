/**
 * His name, the site's name, and the addresses the host must keep closed.
 *
 * These are the things a search engine reads to decide who this site is
 * about and what to call it, so each one is pinned here against the real
 * output and the real `_redirects` and `_headers`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from '../scripts/lib/api.mjs';
import { TEMPLATES, notFound, buildRedirects } from '../scripts/lib/pages.mjs';
import { headMeta, aboutFaq, contactLinks } from '../scripts/lib/blocks.mjs';
import { buildTranscript } from '../scripts/lib/transcript.mjs';
import { PAGES, LANGS } from '../scripts/lib/sitemap.mjs';
import { DETAIL_FOLDERS } from '../scripts/lib/details.mjs';
import { buildDetailPages } from '../scripts/lib/pages.mjs';
import { toScriptTag } from '../scripts/lib/jsonld.mjs';
import {
  PRIVATE_PATHS,
  parseRedirects,
  parseHeaders,
  checkRedirects,
  checkHeaders,
  misspellingLeaks,
  MISSPELLED_NAME,
} from '../scripts/lib/gates.mjs';

const loaded = loadDb('data');
// What the build adds: the one date the pages carry.
const db = { ...loaded, build: { modified: '2026-11-15T00:00:00+03:00' } };

const redirects = readFileSync('_redirects', 'utf8');
const headers = readFileSync('_headers', 'utf8');

/** Every JSON-LD node on a page, flattened out of its @graph. */
function ldNodes(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(([, json]) => {
    const parsed = JSON.parse(json.replaceAll('<\\/', '</'));
    return parsed['@graph'] ?? [parsed];
  });
}

/** What a visitor can read: the body, without scripts, tags or attributes. */
function visibleText(html) {
  return html
    .slice(html.indexOf('<body>'))
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/* The navigation, the 404, and a page for each project and system (`detail`). */
const everyPage = () =>
  LANGS.flatMap((lang) => [
    ...PAGES.map((page) => ({ lang, page, html: TEMPLATES[page](db, lang) })),
    { lang, page: '404', html: notFound(db, lang) },
    ...buildDetailPages(db, lang).map(({ page, html }) => ({ lang, page, html, detail: true })),
  ]);

/* ------------------------------------------------------------ the leak */

/* Cloudflare Pages publishes the whole repository. Until these rules existed,
   CLAUDE.md, the tests, the scripts and the data files all answered on the
   live site, and some of them name things that are kept off it on purpose. */
test('every internal file is closed at the host', () => {
  assert.deepEqual(checkRedirects(redirects), []);

  const rules = parseRedirects(redirects);
  for (const path of PRIVATE_PATHS) {
    assert.deepEqual(rules.find((r) => r.from === path), { from: path, to: '/', status: 301 });
  }
  // The repository's own top-level folders that are not part of the site.
  for (const dir of ['docs', 'tests', 'scripts', 'data']) assert.ok(PRIVATE_PATHS.includes(`/${dir}/*`));
});

test('removing or weakening any one of those rules fails the gate', () => {
  for (const path of PRIVATE_PATHS) {
    const without = redirects.split('\n').filter((line) => line.trim().split(/\s+/)[0] !== path).join('\n');
    assert.ok(checkRedirects(without).some((p) => p.includes(path)), `${path} can be removed unnoticed`);
  }

  const softened = redirects.replace(/^\/data\/\*\s+\/\s+301$/m, '/data/*  /  302');
  assert.notEqual(softened, redirects);
  assert.ok(checkRedirects(softened).some((p) => p.includes('/data/*')), 'a 302 is not a closed door');

  // Cloudflare Pages answers a rule that names no status with a 302.
  const unstated = redirects.replace(/^\/data\/\*\s+\/\s+301$/m, '/data/*  /');
  assert.notEqual(unstated, redirects);
  assert.equal(parseRedirects(unstated).find((r) => r.from === '/data/*').status, 302);
  assert.ok(checkRedirects(unstated).some((p) => p.includes('/data/*')), 'a rule with no status is a 302, not a closed door');

  // First match wins: a private path below the catch-all is never reached.
  const below = `/*  /404.html  404\n${redirects}`;
  assert.ok(checkRedirects(below).some((p) => p.includes('comes after /*')));
});

/* The gate above only protects the paths it already lists. This one looks
   at what the repository actually tracks at its root: each entry is either
   part of the site or closed, so a new notes file or tooling folder cannot
   start being served without someone deciding which of the two it is. */
test('every file and folder at the root of the repository is either the site or closed', (t) => {
  let tracked;
  try {
    tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    t.skip('not a git checkout');
    return;
  }
  const roots = [...new Set(tracked.map((f) => f.split('/')[0]))];

  const hosting = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
  const site = new Set([
    // The pages, in both languages, and what the build writes beside them.
    ...PAGES.map((p) => `${p === '' ? 'index' : p}.html`),
    '404.html', 'en', 'api', 'cv', 'resume', 'profile', 'llms.txt', 'llms-full.txt', 'sitemap.xml',
    // One page for each project and each automation system.
    ...DETAIL_FOLDERS,
    // Written by hand, and meant to be read.
    'assets', 'mcp', 'robots.txt', 'humans.txt', 'me.png',
    // Read by the host or by a search engine to prove the site is his.
    '_redirects', '_headers', 'CNAME', '.nojekyll', 'google8fa9cd6fb89c6800.html',
    ...(db.profile.indexNow?.key ? [`${db.profile.indexNow.key}.txt`] : []),
    // The client sites and apps copied in by npm run sites.
    ...hosting.sites.map((s) => s.path.split('/')[0]),
  ]);
  const closed = new Set(PRIVATE_PATHS.map((p) => p.replace(/^\//, '').replace(/\/\*$/, '')));

  for (const name of roots) {
    assert.ok(site.has(name) || closed.has(name), `/${name} is tracked at the root but is neither listed as part of the site nor closed in PRIVATE_PATHS`);
    assert.ok(!(site.has(name) && closed.has(name)), `/${name} is listed as both public and closed`);
  }
});

/* robots.txt and llms.txt both hand out /mcp/README.md. */
test('the MCP folder stays public, and holds nothing that must stay off the site', () => {
  assert.ok(!parseRedirects(redirects).some((r) => r.from.startsWith('/mcp')));
  assert.ok(checkRedirects(`${redirects}\n/mcp/*  /  301\n`).some((p) => p.includes('/mcp/*')));

  for (const file of ['mcp/README.md', 'mcp/server.js', 'mcp/tools.js']) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/alessa|zatca/i.test(text), `${file} names something that is kept off the site`);
    assert.ok(!MISSPELLED_NAME.test(text), `${file} misspells his name`);
  }
});

test('addresses that moved still land on a real file', () => {
  const rules = parseRedirects(redirects);
  const cv = `/${db.profile.cv[0].file}`;

  // The old automation CV, which search engines still hold.
  assert.deepEqual(rules.find((r) => r.from === '/assets/cv/Nour_Aldeen_Tofi_Automation.pdf'), {
    from: '/assets/cv/Nour_Aldeen_Tofi_Automation.pdf',
    to: cv,
    status: 301,
  });
  assert.ok(existsSync(cv.slice(1)));

  const favicon = rules.find((r) => r.from === '/favicon.ico');
  assert.equal(favicon.status, 301);
  assert.ok(existsSync(favicon.to.slice(1)), 'the favicon redirect points at a missing file');
});

/* --------------------------------------------------------- the headers */

/* The pages.dev address is a complete copy of the site. noindex belongs on
   that host and nowhere else: on a path rule it would cover the real domain. */
test('noindex can only ever reach the pages.dev copy', () => {
  assert.deepEqual(checkHeaders(headers, db.profile), []);

  const robots = parseHeaders(headers).filter((r) => r.headers.some((h) => h.name === 'X-Robots-Tag'));
  assert.deepEqual(robots.map((r) => r.match), ['https://nouraldeentofi.pages.dev/*']);
  assert.equal(robots[0].headers[0].value, 'noindex');

  for (const match of ['/*', '/en/*', `${db.profile.site}/*`, 'https://pages.dev.example.com/*']) {
    const widened = `${headers}\n${match}\n  X-Robots-Tag: noindex\n`;
    assert.ok(checkHeaders(widened, db.profile).some((p) => p.includes(`"${match}"`)), `noindex on ${match} went unnoticed`);
  }

  const removed = headers.replace('  X-Robots-Tag: noindex\n', '');
  assert.ok(checkHeaders(removed, db.profile).some((p) => p.includes('X-Robots-Tag')));
});

/* The CV is linked with a ?v= fingerprint so nobody downloads a stale copy.
   To a search engine that is a new address with every version, unless the
   file and the /cv doorway both name the one that does not change. */
test('the CV has one canonical address, without the fingerprint', () => {
  const file = db.profile.cv[0].file;
  const bare = `${db.profile.site}/${file}`;

  const rule = parseHeaders(headers).find((r) => r.match === `/${file}`);
  assert.equal(rule.headers.find((h) => h.name === 'Link').value, `<${bare}>; rel="canonical"`);

  // The header is written by hand, so the gate holds it to the data.
  assert.ok(checkHeaders(headers, { ...db.profile, site: 'https://example.com' }).length > 0);
  assert.ok(checkHeaders(headers, { ...db.profile, cv: [{ file: 'assets/cv/Other.pdf' }] }).length > 0);

  const stubs = buildRedirects(db);
  for (const path of ['cv/index.html', 'cv/auto/index.html']) {
    const stub = stubs.find((s) => s.path === path);
    assert.match(stub.target, /\?v=[0-9a-f]{8}$/);
    assert.ok(stub.html.includes(`<link rel="canonical" href="${bare}">`), `${path}: canonical is not the bare address`);
    assert.ok(stub.html.includes(`content="0; url=${stub.target}"`), `${path}: the refresh lost the fingerprint`);
    assert.ok(stub.html.includes(`<a href="${stub.target}">`), `${path}: the link lost the fingerprint`);
  }
});

/* ------------------------------------------------------- one site name */

test('every page, in both languages, carries the identical WebSite node and site name', () => {
  const pages = everyPage();
  const first = ldNodes(pages[0].html).find((n) => n['@type'] === 'WebSite');
  assert.equal(first.name, 'Nour Aldeen Tofi');
  assert.equal(first.url, `${db.profile.site}/`);

  for (const { lang, page, html } of pages) {
    const at = `${lang}/${page || 'index'}`;
    const site = ldNodes(html).filter((n) => n['@type'] === 'WebSite');
    assert.equal(site.length, 1, `${at}: expected one WebSite node`);
    assert.deepEqual(site[0], first, `${at}: its WebSite node differs`);
    assert.ok(html.includes('<meta property="og:site_name" content="Nour Aldeen Tofi">'), `${at}: og:site_name`);
  }
  for (const lang of LANGS) {
    for (const page of PAGES) assert.ok(headMeta(db, page, lang).includes('og:site_name'));
  }
});

/* ------------------------------------------- both scripts of the name */

/* The Arabic pages never showed the Latin name and the English pages never
   showed the Arabic one, so a search in one script that landed on the other
   language found nothing it had typed. */
test('each home page shows his name in both scripts', () => {
  for (const lang of LANGS) {
    const other = lang === 'ar' ? 'en' : 'ar';
    const dir = other === 'ar' ? 'rtl' : 'ltr';
    const html = TEMPLATES[''](db, lang);
    const text = visibleText(html);

    for (const l of LANGS) assert.ok(text.includes(db.profile.name[l]), `${lang}: the ${l} name is not visible`);

    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    assert.ok(title.startsWith(`${db.profile.name[lang]} (${db.profile.name[other]}) | `), `${lang}: title is "${title}"`);

    // Directly under the heading, marked as the language and direction it is.
    const line = `<p class="hero__altname" lang="${other}" dir="${dir}">${db.profile.name[other]}</p>`;
    const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    assert.match(hero.replace(/\s+/g, ' '), new RegExp(`${db.profile.name[lang]}</h1> ${line.replace(/[()]/g, '.')}`));

    const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.ok(
      footer.includes(`${db.profile.name[lang]} · <span lang="${other}" dir="${dir}">${db.profile.name[other]}</span> · `),
      `${lang}: the footer does not carry both names`,
    );
  }
});

test('the other-script name is a caption on the home page only, and never a second h1', () => {
  for (const { lang, page, html } of everyPage()) {
    const count = html.split('class="hero__altname"').length - 1;
    assert.equal(count, page === '' ? 1 : 0, `${lang}/${page || 'index'}`);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  }
});

/* The honest, visible home for the other spellings: a question people ask. */
test('the FAQ says how his name is written, second in both languages', () => {
  const en = db.copy.en.about.faq[1];
  const ar = db.copy.ar.about.faq[1];
  assert.equal(en.q, "How is Nour Aldeen Tofi's name written?");
  assert.equal(ar.q, 'كيف يُكتب اسم نور الدين طفي؟');

  for (const f of [en, ar]) {
    for (const name of ['نور الدين طفي', 'Nour Aldeen Tofi', 'Nouraldeen Tofi', 'Nour Al-Deen Tofi', 'Nour Aldin Tofi', 'Nour Eddin Tofi', 'Noor Aldeen Tofi', 'Nour Aldeen Toufi', 'Nour Tofi', 'nouraldeentofi']) {
      assert.ok(f.a.includes(name), `"${name}" is missing from: ${f.q}`);
    }
    assert.ok(!MISSPELLED_NAME.test(f.a) && !f.a.includes('—') && !/\d/.test(f.a));
  }
  // The handle is his on the profiles the answer names, and it names no
  // more than that: his Codeforces profile goes by another one.
  for (const f of [en, ar]) {
    assert.ok(!/everywhere|كل المنصات|جميع المنصات/.test(f.a), `the handle is not the same everywhere: ${f.q}`);
    const named = db.profile.sameAs.filter((s) => s.url && s.identity !== false && f.a.includes(s.platform));
    assert.deepEqual(named.map((s) => s.platform).sort(), ['GitHub', 'LinkedIn', 'YouTube']);
    for (const s of named) assert.ok(s.url.includes('nouraldeentofi'), `${s.platform} does not use the handle the FAQ gives`);
  }
  // Every spelling the answer offers is one the data lists as real.
  for (const name of ['Nouraldeen Tofi', 'Nour Al-Deen Tofi', 'Nour Aldin Tofi', 'Nour Eddin Tofi', 'Noor Aldeen Tofi', 'Nour Aldeen Toufi', 'Nour Tofi']) {
    assert.ok(db.profile.nameVariants.includes(name), `${name} is in the FAQ but not in nameVariants`);
  }

  for (const lang of LANGS) {
    assert.ok(aboutFaq(db, lang).includes(db.copy[lang].about.faq[1].q.replace("'", '&#39;')) || aboutFaq(db, lang).includes(db.copy[lang].about.faq[1].q));
    const faqPage = ldNodes(TEMPLATES.about(db, lang)).find((n) => n['@type'] === 'FAQPage');
    assert.equal(faqPage.mainEntity[1].name, db.copy[lang].about.faq[1].q);
    assert.ok(buildLlmsFullTxt(db, lang).includes(db.copy[lang].about.faq[1].a));
  }
});

/* ------------------------------------------------------- the alias data */

test('the alias list holds real spellings only', () => {
  const { nameVariants, nameMisspellings } = db.profile;
  for (const name of ['Nour Al Deen Tofi', 'Nour Aldin Tofi', 'Nour Eddin Tofi', 'Noureddine Tofi', 'Nour El Din Tofi', 'Noor Aldeen Tofi', 'نورالدين طفي', 'نور الدين الطفي', 'نور طفي', 'Nour Tofi', 'nouraldeentofi']) {
    assert.ok(nameVariants.includes(name), `${name} is missing from nameVariants`);
  }
  assert.equal(new Set(nameVariants).size, nameVariants.length, 'a spelling is listed twice');
  assert.ok(!nameVariants.some((n) => MISSPELLED_NAME.test(n)), 'a misspelling is listed as a real spelling');
  assert.deepEqual(nameMisspellings, ['نور الدين توفي', 'نور توفي']);
});

/* The misspelling is a different Arabic word. It has to exist somewhere, so a
   search for it still finds him, and that somewhere is a field nobody reads. */
test('the misspelled name ships nowhere except Person.alternateName', () => {
  const documents = {
    'llms.txt': buildLlmsTxt(db),
    'llms.txt (ar)': buildLlmsTxt(db, 'ar'),
    'llms-full.txt': buildLlmsFullTxt(db),
    'llms-full.txt (ar)': buildLlmsFullTxt(db, 'ar'),
    'api/profile.json': JSON.stringify(buildApiProfile(db)),
    'api/projects.json': JSON.stringify(buildApiProjects(db)),
    'api/resume.json': JSON.stringify(buildResumeJson(db)),
    'api/resume.json (ar)': JSON.stringify(buildResumeJson(db, 'ar')),
    'transcript (en)': buildTranscript('en', db.copy.en),
    'transcript (ar)': buildTranscript('ar', db.copy.ar),
    ...Object.fromEntries(buildRedirects(db).map((s) => [s.path, s.html])),
  };
  for (const [name, text] of Object.entries(documents)) {
    assert.ok(!MISSPELLED_NAME.test(text), `${name} carries the misspelled name`);
  }
  // The real spellings do travel, so a model that meets one resolves it.
  assert.deepEqual(buildApiProfile(db).nameVariants, db.profile.nameVariants);
  assert.ok(buildLlmsTxt(db).includes(db.profile.nameVariants.join(' · ')));

  for (const { lang, page, html } of everyPage()) {
    assert.deepEqual(misspellingLeaks(html), [], `${lang}/${page || 'index'}`);
    const person = ldNodes(html).find((n) => n['@type'] === 'Person');
    for (const wrong of db.profile.nameMisspellings) {
      assert.ok(person.alternateName.includes(wrong), `${lang}/${page || 'index'}: a search for the misspelling no longer resolves`);
    }
  }
});

test('the misspelling check catches a leak wherever it lands', () => {
  const wrong = db.profile.nameMisspellings[0];
  const person = { '@context': 'https://schema.org', '@type': 'Person', name: 'x', alternateName: [wrong] };

  assert.deepEqual(misspellingLeaks(`<p>ok</p>${toScriptTag(person)}`), []);
  assert.deepEqual(misspellingLeaks(`<p>${wrong}</p>`), ['the page itself']);
  assert.deepEqual(misspellingLeaks(`<img alt="${wrong}">`), ['the page itself']);
  assert.deepEqual(misspellingLeaks(toScriptTag({ ...person, description: wrong })), ['JSON-LD Person']);
  assert.deepEqual(misspellingLeaks(toScriptTag({ '@context': 'https://schema.org', '@type': 'WebSite', alternateName: [wrong] })), ['JSON-LD WebSite']);
});

/* -------------------------------------------------- the identity graph */

test('a product link stays with his links, though it is not part of his identity', () => {
  const scanner = db.profile.sameAs.find((s) => s.platform === 'Smart Scanner');
  assert.ok(buildApiProfile(db).links.some((l) => l.url === scanner.url));
  assert.ok(buildLlmsTxt(db).includes(scanner.url));
  assert.ok(contactLinks(db, 'en').includes(scanner.url));

  for (const { lang, page, html } of everyPage()) {
    const person = ldNodes(html).find((n) => n['@type'] === 'Person');
    for (const s of db.profile.sameAs.filter((x) => x.identity === false)) {
      assert.ok(!person.sameAs.includes(s.url), `${lang}/${page || 'index'}: ${s.platform} is in Person.sameAs`);
    }
  }
});

test('the person is described in words a visitor can read on the home page', () => {
  for (const lang of LANGS) {
    const html = TEMPLATES[''](db, lang);
    const person = ldNodes(html).find((n) => n['@type'] === 'Person');
    const squash = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
    assert.ok(squash(visibleText(html)).includes(squash(person.description)), `${lang}: Person.description is not on the page`);
  }
});

test('only the home page is his ProfilePage, with the date the build gave it', () => {
  for (const { lang, page, html, detail } of everyPage()) {
    const at = `${lang}/${page || 'index'}`;
    const nodes = ldNodes(html);
    const profilePage = nodes.find((n) => n['@type'] === 'ProfilePage');
    const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList');
    if (detail) {
      // Home, the list page, the page itself.
      assert.equal(profilePage, undefined, at);
      assert.equal(crumbs.itemListElement.length, 3, at);
      continue;
    }

    if (page === '') {
      assert.equal(profilePage.dateModified, db.build.modified, at);
      assert.equal(crumbs, undefined, `${at}: a one-item breadcrumb`);
    } else if (page === '404') {
      // It borrows the home page's head, but it is not the home page.
      assert.equal(profilePage, undefined, `${at}: a 404 claims to be his ProfilePage`);
      assert.equal(crumbs, undefined, at);
      assert.deepEqual(nodes.map((n) => n['@type']).sort(), ['Person', 'WebSite']);
    } else {
      assert.equal(profilePage, undefined, at);
      assert.equal(crumbs.itemListElement.length, 2, at);
    }
  }
});

test('the home page carries the date the build gave it, and no other', () => {
  const stamp = (modified) => TEMPLATES['']({ ...loaded, build: { modified } }, 'en');
  assert.ok(stamp('2020-01-01T00:00:00+03:00').includes('"dateModified": "2020-01-01T00:00:00+03:00"'));
  assert.ok(!TEMPLATES[''](loaded, 'en').includes('dateModified'), 'a date appeared that the build did not give');

  // The footer year is the build's year too, not the year of the clock.
  assert.ok(stamp('2020-01-01T00:00:00+03:00').includes(`© 2020 ${db.profile.name.en}`));
  assert.ok(TEMPLATES[''](loaded, 'en').includes(`© ${db.profile.name.en}`), 'a year appeared that the build did not give');
});

/* A visitor whose saved language differs from the link they were sent is
   moved to the same page in their language. Links to one item are the norm
   now, so the move has to keep the fragment, and the query with it. */
test('the language redirect keeps the query and the fragment', () => {
  for (const { lang, page, html } of everyPage()) {
    const script = html.match(/<script>\s*\/\* Set before first paint[\s\S]*?<\/script>/)?.[0];
    assert.ok(script, `${lang}/${page || 'index'}: no language script`);
    assert.ok(script.includes('var q=location.search+location.hash;'));
    const moves = [...script.matchAll(/location\.replace\(([^;]*)\);/g)].map((m) => m[1]);
    assert.equal(moves.length, 2);
    for (const to of moves) assert.ok(to.endsWith('+q'), `${lang}/${page || 'index'}: a redirect drops the fragment: ${to}`);
  }
});
