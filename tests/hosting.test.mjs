import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  keepFile,
  rewriteUrls,
  siteUrl,
  INDEX_VALUES,
  hostingProblems,
  wantsIndex,
  hostedEntries,
  isPending,
  strayCopies,
  pageSignals,
  NOINDEX_NOFOLLOW,
  applyIndexing,
  cleanAddresses,
  cleanPage,
  absoluteHeadAddresses,
  moveFormerHosts,
  stripRatings,
  ratingMarkup,
  transformFile,
  restoreCopy,
  replaceCopy,
  copyFileProblems,
} from '../scripts/lib/hosting.mjs';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildSite } from '../scripts/lib/site.mjs';

const hosting = { domain: 'https://nouraldeentofi.com', owner: 'nouraldeentofi', formerHosts: ['nouraldeentofi.netlify.app'] };
const site = { repo: 'aya-rady', branch: 'main', path: 'sites/aya-rady', index: true };
const hidden = { repo: 'karam', branch: 'main', path: 'sites/karam', index: false };
const gallery = { repo: 'portfolio-gallery', branch: 'main', path: 'gallery', index: 'root-only' };

const NOINDEX = '<meta name="robots" content="noindex, follow">';
const CLOSED = '<meta name="robots" content="noindex, nofollow">';

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

/* A repository's test pages were served at /motion-studio/test/engine, and
   seventeen robots.txt files sat where no crawler reads one. */
test('a top-level test folder and a robots.txt at any depth are not the site; a 404 page is', () => {
  for (const rel of ['test/engine.html', 'test/app.mjs', 'robots.txt', 'v2/robots.txt']) {
    assert.ok(!keepFile(rel), rel);
  }
  // The host serves the nearest 404.html, so each copy keeps its own.
  // A folder called test further down belongs to the site.
  for (const rel of ['404.html', 'en/404.html', 'js/test/fixture.js', 'sitemap.xml', 'robots.html']) {
    assert.ok(keepFile(rel), rel);
  }
});

test('a working file is the same working file in any case', () => {
  for (const rel of ['Test/engine.html', 'TESTS/qa.js', 'Robots.TXT', 'v2/ROBOTS.txt', 'README.MD', 'cname', 'Package.json', 'Source/build.PY']) {
    assert.ok(!keepFile(rel), rel);
  }
  // A page or a picture is not a working file because its name is written large.
  for (const rel of ['Index.html', 'Assets/Logo.PNG', 'js/Test/fixture.js']) {
    assert.ok(keepFile(rel), rel);
  }
});

/* ------------------------------------------------- the indexing decision */

test('every copy needs a decision: true, false or "root-only", with no default', () => {
  assert.deepEqual(INDEX_VALUES, [true, false, 'root-only']);
  assert.deepEqual(hostingProblems({ ...hosting, sites: [site, hidden, gallery] }), []);

  const { index, ...undecided } = site;
  assert.match(hostingProblems({ ...hosting, sites: [undecided] })[0], /aya-rady.*"index" must be true, false or "root-only"/);
  for (const bad of ['yes', 'false', null, 1, 'root']) {
    assert.equal(hostingProblems({ ...hosting, sites: [{ ...site, index: bad }] }).length, 1, String(bad));
  }
  assert.match(hostingProblems({ ...hosting, formerHosts: ['https://old.example/'], sites: [site] })[0], /formerHosts/);
  assert.match(hostingProblems({ ...hosting, sites: undefined })[0], /sites/);
});

/* The sync replaces the whole folder a path names. With only "a non-empty
   string" asked of it, the path could be ".", "assets" or "../outside". */
test('a copy lives in a folder of its own: a path the sync must not replace is refused', () => {
  const check = (over, others = []) => hostingProblems({ ...hosting, sites: [{ ...site, ...over }, ...others] });
  for (const path of ['sites/aya-rady', 'gallery', 'motion-studio', 'umrah-guide', 'sites/assets', 'sites/2nd-site']) {
    assert.deepEqual(check({ path }), [], path);
  }
  for (const path of ['.', '..', '../outside', 'sites/', 'sites/a/b', 'sites/../data', 'sites/..', 'C:/Users', 'C:\\Users', '/gallery', 'gallery/', 'Gallery', 'sites/Aya', 'my_site', 'a b', '-x', '.git', 'node_modules']) {
    assert.match(check({ path })[0] ?? '', /"path" must be sites\/<name> or one plain folder name/, path);
  }
  // A folder the main site owns is not a copy's to take.
  for (const path of ['sites', 'assets', 'api', 'en', 'projects', 'automation', 'cv', 'resume', 'profile', 'data', 'scripts', 'tests', 'mcp', 'docs']) {
    assert.match(check({ path })[0] ?? '', new RegExp(`"path" names ${path}/, a folder the main site owns`), path);
  }
  // Two entries with one path: the second sync would delete the first copy.
  assert.deepEqual(check({}, [{ ...hidden, path: site.path }]), ['hosting.json (karam): "path" sites/aya-rady is the path of another entry too']);
  // One entry inside another: syncing the outer one deletes the inner one.
  assert.match(check({ path: 'gallery' }, [{ ...hidden, path: 'gallery/v2' }]).join('\n'), /\(karam\): "path" gallery\/v2 lies inside the path of another entry/);
  assert.match(check({ path: 'sites' }, [hidden]).join('\n'), /\(karam\): "path" sites\/karam lies inside the path of another entry/);
});

test('"dir" is empty or a folder inside the repository, never a way out of it', () => {
  const check = (dir) => hostingProblems({ ...hosting, sites: [{ ...site, dir }] });
  for (const dir of [undefined, '', 'docs', 'build/site', 'v2.1', 'dist_web']) assert.deepEqual(check(dir), [], String(dir));
  for (const dir of ['..', '../other', 'docs/..', 'docs/../..', '/docs', 'docs/', './docs', '.', 'C:\\Users', 'C:/Users', 'my docs', 7, null]) {
    assert.match(check(dir)[0] ?? '', /"dir" must be empty or a folder inside the repository/, String(dir));
  }
});

test('the loader refuses a hosting file with an undecided copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-hosting-'));
  try {
    cpSync('data', dir, { recursive: true });
    assert.doesNotThrow(() => loadDb(dir));
    const map = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
    delete map.sites[0].index;
    writeFileSync(join(dir, 'hosting.json'), JSON.stringify(map));
    assert.throws(() => loadDb(dir), /hosting\.json \(aya-rady\): "index" must be true, false or "root-only"/);
    // A path the sync must not replace stops the same three.
    const owned = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
    owned.sites[0].path = 'assets';
    writeFileSync(join(dir, 'hosting.json'), JSON.stringify(owned));
    assert.throws(() => loadDb(dir), /hosting\.json \(aya-rady\): "path" names assets\/, a folder the main site owns/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('which pages a decision wants in search', () => {
  assert.ok(wantsIndex(site, 'index.html') && wantsIndex(site, 'about.html') && wantsIndex(site, 'en/index.html'));
  assert.ok(!wantsIndex(hidden, 'index.html') && !wantsIndex(hidden, 'v2/index.html'));
  assert.ok(wantsIndex(gallery, 'index.html'));
  // Only the entry page: a page called index.html further down is a study like any other.
  assert.ok(!wantsIndex(gallery, 'atm.html') && !wantsIndex(gallery, 'en/index.html'));
});

const page = (head) => `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n${head}</head>\n<body><p>Hello</p></body>\n</html>\n`;

test('a copy kept out of search: every page ends up with one robots meta that says noindex', () => {
  // No robots meta: one is added, on its own line, after the charset.
  const bare = applyIndexing(page('  <title>My page</title>\n'), hidden, 'index.html', hosting);
  assert.equal(bare, page(`  ${NOINDEX}\n  <title>My page</title>\n`));

  // An existing one is replaced where it stands, however it was written. A
  // page that did not ask for its links to be left alone has them followed.
  for (const old of [
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta name="robots" content="noindex">',
    "<meta content='index' name='robots' />",
    '<META NAME=robots CONTENT="all">',
    // "none" as the value of another rule is not the directive.
    '<meta name="robots" content="index, max-image-preview:none">',
    '<meta name="robots" content="max-snippet: -1, max-image-preview: none">',
  ]) {
    assert.equal(applyIndexing(page(`  <title>T</title>\n  ${old}\n`), hidden, 'about.html', hosting), page(`  <title>T</title>\n  ${NOINDEX}\n`), old);
  }

  // Two become one, and the line of the second goes with it.
  const twice = page('  <meta name="robots" content="index">\n  <title>T</title>\n  <meta name="robots" content="max-snippet:-1">\n');
  assert.equal(applyIndexing(twice, hidden, 'index.html', hosting), page(`  ${NOINDEX}\n  <title>T</title>\n`));

  // Done twice, it changes nothing the second time.
  assert.equal(applyIndexing(bare, hidden, 'index.html', hosting), bare);
  assert.deepEqual(pageSignals(bare).robots, ['noindex, follow']);
});

/* The data decides about the index and nothing else. Eighty one pages of
   nine copies said "noindex, nofollow" in their own repositories, and the
   sync wrote "noindex, follow" over it: the one place where a copy was left
   more open than its owner had asked. */
test('the owner\'s nofollow stays: a page that said it ends with "noindex, nofollow"', () => {
  assert.equal(CLOSED, `<meta name="robots" content="${NOINDEX_NOFOLLOW}">`);
  for (const old of [
    '<meta name="robots" content="noindex, nofollow">',
    '<meta name="robots" content="noindex,nofollow">',
    '<meta name="robots" content="none">',
    '<meta name="robots" content="nofollow">',
    '<meta name="robots" content="index, nofollow, max-image-preview:large">',
    '<META NAME="ROBOTS" CONTENT="NOINDEX, NOFOLLOW">',
    "<meta content='None' name='robots' />",
  ]) {
    assert.equal(applyIndexing(page(`  <title>T</title>\n  ${old}\n`), hidden, 'about.html', hosting), page(`  <title>T</title>\n  ${CLOSED}\n`), old);
  }

  // Of two robots metas, the stricter word is the one that is kept.
  const twice = page('  <meta name="robots" content="index">\n  <title>T</title>\n  <meta name="robots" content="nofollow">\n');
  assert.equal(applyIndexing(twice, hidden, 'index.html', hosting), page(`  ${CLOSED}\n  <title>T</title>\n`));

  // A page behind the entry page of a "root-only" copy is held the same way.
  assert.deepEqual(pageSignals(applyIndexing(page(`  ${CLOSED}\n`), gallery, 'atm.html', hosting)).robots, ['noindex, nofollow']);
  // Another crawler's own meta is not the page's robots meta.
  assert.deepEqual(pageSignals(applyIndexing(page('  <meta name="googlebot" content="nofollow">\n'), hidden, 'a.html', hosting)).robots, ['noindex, follow']);

  // Through the whole sync, done twice, and past the gate.
  const once = transformFile(page(`  ${CLOSED}\n`), 'about.html', hidden, hosting);
  assert.equal(once, page(`  ${CLOSED}\n`));
  assert.equal(transformFile(once, 'about.html', hidden, hosting), once);
  assert.deepEqual(copyFileProblems(once, 'about.html', hidden, hosting), []);
  // A copy meant to be found keeps whatever its owner wrote.
  assert.equal(applyIndexing(page(`  ${CLOSED}\n`), site, 'about.html', hosting), page(`  ${CLOSED}\n`));
});

test('a robots meta in a comment or a script is not one, and other meta tags are left alone', () => {
  const head = '  <!-- <meta name="robots" content="index"> -->\n  <meta name="googlebot" content="index">\n  <script>var s = \'<meta name="robots" content="index">\';</script>\n';
  const out = applyIndexing(page(head), hidden, 'index.html', hosting);
  assert.equal(out, page(`  ${NOINDEX}\n${head}`));
  assert.deepEqual(pageSignals(out).robots, ['noindex, follow']);
});

test('a page written without a head still gets its noindex, as early as the markup allows', () => {
  const stub = '<!doctype html><meta charset="utf-8"><title>404</title><a href="index.html">Home</a>';
  assert.equal(applyIndexing(stub, hidden, '404.html', hosting), `<!doctype html><meta charset="utf-8">${NOINDEX}<title>404</title><a href="index.html">Home</a>`);
  assert.equal(applyIndexing('<html><body>x</body></html>', hidden, 'a.html', hosting), `<html>${NOINDEX}<body>x</body></html>`);
  assert.equal(applyIndexing('<p>x</p>', hidden, 'a.html', hosting), `${NOINDEX}\n<p>x</p>`);
  // <header> is not <head>.
  assert.equal(applyIndexing('<html><header>x</header></html>', hidden, 'a.html', hosting), `<html>${NOINDEX}<header>x</header></html>`);
  // A file with Windows line ends keeps them.
  assert.equal(applyIndexing('<html>\r\n<head>\r\n  <title>T</title>\r\n</head>\r\n</html>', hidden, 'a.html', hosting), `<html>\r\n<head>\r\n${NOINDEX}\r\n  <title>T</title>\r\n</head>\r\n</html>`);
});

/* A tag is the page's own word only in its head. Further down it may sit in
   a template or in the srcdoc of a frame, where writing beside it breaks
   what the visitor sees and leaves the page with no real noindex. */
test('a tag is written into the head, wherever else a charset line stands', () => {
  // The only charset line is in a template in the body.
  const inTemplate = '<html>\n<head>\n  <title>T</title>\n</head>\n<body>\n  <template><meta charset="utf-8"><p>x</p></template>\n</body>\n</html>\n';
  assert.equal(applyIndexing(inTemplate, hidden, 'a.html', hosting), inTemplate.replace('<head>\n', `<head>\n${NOINDEX}\n`));

  // The only one is in the srcdoc of a frame: a tag written there would end the attribute.
  const inFrame = '<html><head><title>T</title></head><body><iframe srcdoc="<meta charset=\'utf-8\'><p>x</p>"></iframe></body></html>';
  assert.equal(applyIndexing(inFrame, hidden, 'a.html', hosting), inFrame.replace('<head>', `<head>${NOINDEX}`));
  assert.equal(applyIndexing(inFrame, site, 'index.html', hosting), inFrame.replace('<head>', '<head><link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/">'));

  // A head that is never closed ends where the body begins.
  const open = '<html><head><title>T</title><body><meta charset="utf-8"><p>x</p></body></html>';
  assert.equal(applyIndexing(open, hidden, 'a.html', hosting), open.replace('<head>', `<head>${NOINDEX}`));
});

test('a robots meta or a canonical below the head is not one: the gate does not count it', () => {
  const below = '<template><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/"></template>';
  const inBody = page('  <title>T</title>\n').replace('<p>Hello</p>', below);
  assert.deepEqual(pageSignals(inBody), { robots: [], canonicals: [], alternates: [], ogUrls: [] });
  assert.match(copyFileProblems(inBody, 'index.html', hidden, hosting)[0], /carries no noindex in its head/);
  assert.match(copyFileProblems(inBody, 'index.html', site, hosting)[0], /has no canonical/);

  // The sync gives the page a real one, and leaves the body as its owner wrote it.
  const closed = applyIndexing(inBody, hidden, 'index.html', hosting);
  assert.deepEqual(pageSignals(closed).robots, ['noindex, follow']);
  const found = applyIndexing(inBody, site, 'index.html', hosting);
  assert.deepEqual(pageSignals(found).canonicals, ['https://nouraldeentofi.com/sites/aya-rady/']);
  for (const out of [closed, found]) assert.ok(out.includes(`<body>${below}</body>`), 'the body was rewritten');
});

test('a script that holds the opening of a comment is still a script: the tags after it are read', () => {
  const tricky = page('  <script>var open = "<!--";</script>\n  <meta name="robots" content="index, follow">\n  <link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/">\n  <!-- the end -->\n');
  assert.deepEqual(pageSignals(tricky), { robots: ['index, follow'], canonicals: ['https://nouraldeentofi.com/sites/aya-rady/'], alternates: [], ogUrls: [] });
  // One robots meta is replaced, no second one is written beside it, and no second canonical.
  assert.equal(applyIndexing(tricky, hidden, 'a.html', hosting), tricky.replace('<meta name="robots" content="index, follow">', NOINDEX));
  assert.equal(applyIndexing(tricky, site, 'index.html', hosting), tricky);

  // The other way round, a comment that holds a script tag is still a comment.
  const commented = page('  <!-- <script> -->\n  <meta name="robots" content="index">\n  <!-- </script> -->\n');
  assert.deepEqual(pageSignals(commented).robots, ['index']);
  // And a style that holds either is still a style.
  const styled = page('  <style>a::after { content: "<!-- <script>"; }</style>\n  <meta name="robots" content="index">\n  <!-- x -->\n');
  assert.deepEqual(pageSignals(styled).robots, ['index']);
});

test('"root-only": the entry page stays in search with a canonical, every page behind it is noindex', () => {
  const entry = applyIndexing(page('  <title>Gallery</title>\n'), gallery, 'index.html', hosting);
  assert.equal(entry, page('  <link rel="canonical" href="https://nouraldeentofi.com/gallery/">\n  <title>Gallery</title>\n'));
  assert.deepEqual(pageSignals(entry), { robots: [], canonicals: ['https://nouraldeentofi.com/gallery/'], alternates: [], ogUrls: [] });
  assert.equal(applyIndexing(entry, gallery, 'index.html', hosting), entry);

  const study = applyIndexing(page('  <title>ATM</title>\n'), gallery, 'atm.html', hosting);
  assert.deepEqual(pageSignals(study), { robots: ['noindex, follow'], canonicals: [], alternates: [], ogUrls: [] });
});

test('a copy meant to be found: the client\'s own robots tags and canonical are left alone', () => {
  for (const head of [
    '  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">\n  <link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/">\n',
    // The client's own noindex page stays noindex, and gets no canonical beside it.
    '  <meta name="robots" content="noindex">\n',
    // An inner page with nothing is not given anything.
  ]) {
    assert.equal(applyIndexing(page(head), site, 'index.html', hosting), page(head));
  }
  assert.equal(applyIndexing(page('  <title>About</title>\n'), site, 'about.html', hosting), page('  <title>About</title>\n'));
  // Only the entry page with no canonical gains one, naming the clean address.
  assert.equal(
    applyIndexing(page('  <title>Home</title>\n'), site, 'index.html', hosting),
    page('  <link rel="canonical" href="https://nouraldeentofi.com/sites/aya-rady/">\n  <title>Home</title>\n'),
  );
});

/* ------------------------------------------------------ clean addresses */

const BASE = 'https://nouraldeentofi.com/sites/aya-rady';

test("a copy's own absolute addresses lose their .html, the way the host serves them", () => {
  const clean = (text) => cleanAddresses(text, site, hosting);
  assert.equal(clean(`<link rel="canonical" href="${BASE}/about.html">`), `<link rel="canonical" href="${BASE}/about">`);
  assert.equal(clean(`<link rel="alternate" hreflang="en" href="${BASE}/en/index.html">`), `<link rel="alternate" hreflang="en" href="${BASE}/en/">`);
  assert.equal(clean(`<meta property="og:url" content='${BASE}/index.html'>`), `<meta property="og:url" content='${BASE}/'>`);
  // The fragment and the query survive.
  assert.equal(clean(`"${BASE}/x.html#frag" "${BASE}/x.html?a=1&b=2" "${BASE}/en/index.html#top"`), `"${BASE}/x#frag" "${BASE}/x?a=1&b=2" "${BASE}/en/#top"`);
  // A sitemap entry, and an address at the end of a line or of the text.
  assert.equal(clean(`<loc>${BASE}/work/site.html</loc>\n${BASE}/a.html\n${BASE}/b.html`), `<loc>${BASE}/work/site</loc>\n${BASE}/a\n${BASE}/b`);
  // JSON-LD inside the page.
  assert.equal(clean(`{"@id":"${BASE}/about.html#person","url":"${BASE}/about.html"}`), `{"@id":"${BASE}/about#person","url":"${BASE}/about"}`);
});

test('other addresses are not touched: external ones, other copies, images and links in the body', () => {
  for (const text of [
    '<link rel="canonical" href="https://example.com/sites/aya-rady/about.html">',
    '<a href="https://nouraldeentofi.com/sites/aya-rady-two/about.html">',
    '<a href="https://nouraldeentofi.com/sites/karam/index.html">',
    '<a href="https://nouraldeentofi.com/about.html">',
    `<meta property="og:image" content="${BASE}/assets/img/og.jpg">`,
    `<img src="${BASE}/assets/about.html.png">`,
    '<a href="about.html">About</a> <a href="./index.html#top">Home</a> <a href="/sites/aya-rady/about.html">',
    `${BASE}/`,
    `${BASE}`,
    `${BASE}/about`,
  ]) {
    assert.equal(cleanAddresses(text, site, hosting), text, text);
  }
});

/* On a page the cleaning ran over the whole file, so an address the visitor
   reads, copies from a field or runs in a script lost its .html as well.
   Nothing in the copies had one, which is the only reason nothing moved. */
test('on a page, only the tags a crawler reads and the structured data are cleaned', () => {
  const body = [
    `<p>Copy this: ${BASE}/guide.html</p>`,
    `<input value="${BASE}/guide.html">`,
    `<a href="${BASE}/about.html">About</a>`,
    `<script>const self = "${BASE}/index.html";</script>`,
  ].join('');
  const head = [
    `  <link rel="canonical" href="${BASE}/about.html">`,
    `  <link rel="alternate" hreflang="en" href="${BASE}/en/about.html#top">`,
    `  <meta property="og:url" content="${BASE}/about.html">`,
    `  <meta property="og:image" content="${BASE}/og.jpg">`,
    `  <script type="application/ld+json">{"@id":"${BASE}/about.html#person","url":"${BASE}/index.html"}</script>`,
    '',
  ].join('\n');
  const source = page(head).replace('<p>Hello</p>', `${body}<script type="application/ld+json">{"url":"${BASE}/en/index.html"}</script>`);

  const out = cleanPage(source, site, hosting);
  assert.deepEqual(pageSignals(out), { robots: [], canonicals: [`${BASE}/about`], alternates: [`${BASE}/en/about#top`], ogUrls: [`${BASE}/about`] });
  assert.ok(out.includes(`{"@id":"${BASE}/about#person","url":"${BASE}/"}`), 'structured data in the head was not cleaned');
  assert.ok(out.includes(`{"url":"${BASE}/en/"}`), 'structured data in the body was not cleaned');
  assert.ok(out.includes(body), 'something a visitor reads or uses was rewritten');
  assert.equal(cleanPage(out, site, hosting), out);

  // The whole sync does the same, and a page with nothing to clean comes back as it went in.
  assert.ok(transformFile(source, 'about.html', site, hosting).includes(body));
  assert.equal(cleanPage(page(`  <title>T</title>\n`).replace('<p>Hello</p>', body), site, hosting), page(`  <title>T</title>\n`).replace('<p>Hello</p>', body));

  // A sitemap is nothing but addresses for a crawler: it is cleaned throughout, inside CDATA too.
  assert.equal(
    transformFile(`<loc><![CDATA[${BASE}/about.html]]></loc><xhtml:link rel="alternate" hreflang="en" href="${BASE}/en/index.html"/>`, 'sitemap.xml', site, hosting),
    `<loc><![CDATA[${BASE}/about]]></loc><xhtml:link rel="alternate" hreflang="en" href="${BASE}/en/"/>`,
  );
});

/* A page that has moved leaves a stub whose canonical is "journey.html" or
   "../impact/x.html": the same redirected address, written relative. */
test('a relative canonical, hreflang or og:url is written in full, so it can be cleaned', () => {
  const full = (html, rel) => absoluteHeadAddresses(html, site, rel, hosting);
  assert.equal(full('<link rel="canonical" href="journey.html">', 'career.html'), `<link rel="canonical" href="${BASE}/journey.html">`);
  assert.equal(full('<link rel="canonical" href="../impact/x.html">', 'work/old.html'), `<link rel="canonical" href="${BASE}/impact/x.html">`);
  assert.equal(full("<link rel=alternate hreflang=en href='en/'>", 'index.html'), `<link rel=alternate hreflang=en href="${BASE}/en/">`);
  assert.equal(full('<meta property="og:url" content="./">', 'en/index.html'), `<meta property="og:url" content="${BASE}/en/">`);
  assert.equal(full('<link rel="canonical" href="/sites/aya-rady/about.html">', 'about.html'), `<link rel="canonical" href="${BASE}/about.html">`);

  // Through the whole sync the stub ends up naming the clean address.
  const stub = '<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=journey.html"><link rel="canonical" href="journey.html"></head><body><a href="journey.html">continue</a></body></html>';
  assert.equal(transformFile(stub, 'career.html', site, hosting), stub.replace('<link rel="canonical" href="journey.html">', `<link rel="canonical" href="${BASE}/journey">`));

  // Absolute addresses, other tags and the body are left as they are.
  for (const html of [
    `<link rel="canonical" href="${BASE}/about.html">`,
    '<link rel="canonical" href="https://example.com/x.html">',
    '<link rel="canonical" href="//example.com/x.html">',
    '<link rel="stylesheet" href="css/site.css"><link rel="icon" href="favicon.ico">',
    '<meta property="og:image" content="assets/og.jpg">',
    '<a href="about.html">About</a><!-- <link rel="canonical" href="about.html"> -->',
  ]) {
    assert.equal(full(html, 'about.html'), html, html);
  }
});

test('a former host becomes the domain, with its scheme or as bare link text', () => {
  const move = (text) => moveFormerHosts(text, hosting);
  assert.equal(
    move('<a href="https://nouraldeentofi.netlify.app" target="_blank">WEBSITE nouraldeentofi.netlify.app</a>'),
    '<a href="https://nouraldeentofi.com" target="_blank">WEBSITE nouraldeentofi.com</a>',
  );
  assert.equal(move('http://nouraldeentofi.netlify.app/#contact'), 'https://nouraldeentofi.com/#contact');
  assert.equal(move('See https://nouraldeentofi.netlify.app.'), 'See https://nouraldeentofi.com.');
  // Another site on the same service, or a longer name, is someone else's.
  for (const text of ['https://other.netlify.app/', 'https://nouraldeentofi.netlify.app.evil.example/', 'https://my-nouraldeentofi.netlify.app/']) {
    assert.equal(move(text), text, text);
  }
  // No list, nothing to move.
  assert.equal(moveFormerHosts('https://nouraldeentofi.netlify.app', { domain: hosting.domain }), 'https://nouraldeentofi.netlify.app');
});

/* ------------------------------------------------------ no borrowed stars */

const ld = (json) => `<script type="application/ld+json">\n${json}\n</script>`;
const RESTAURANT =
  '{"@context":"https://schema.org","@type":"Restaurant","name":"الريم","telephone":"+966500000000","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"210"},"sameAs":["https://www.instagram.com/x/"]}';

test('rating markup leaves the JSON-LD of a copy, and nothing else moves', () => {
  const visible = '<p class="stars">4.8 from 210 reviews on Google</p>';
  const out = stripRatings(`<head>${ld(RESTAURANT)}</head><body>${visible}</body>`);
  assert.equal(
    out,
    `<head>${ld('{"@context":"https://schema.org","@type":"Restaurant","name":"الريم","telephone":"+966500000000","sameAs":["https://www.instagram.com/x/"]}')}</head><body>${visible}</body>`,
  );
  assert.deepEqual(ratingMarkup(out), []);

  // Reviews as members, and Review nodes in a graph, at any depth.
  const graph = ld(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'LocalBusiness', name: 'A', review: [{ '@type': 'Review', reviewBody: 'Good' }], makesOffer: { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'S', aggregateRating: { ratingValue: 5 } } } },
        { '@type': 'Review', itemReviewed: { '@id': '#a' } },
        { '@type': ['Thing', 'AggregateRating'], ratingValue: 5 },
        { '@type': 'WebSite', name: 'W' },
      ],
    }),
  );
  const kept = JSON.parse(stripRatings(graph).match(/<script[^>]*>([\s\S]*)<\/script>/)[1]);
  assert.deepEqual(kept, {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'LocalBusiness', name: 'A', makesOffer: { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'S' } } },
      { '@type': 'WebSite', name: 'W' },
    ],
  });

  // A block that is nothing but a rating goes altogether.
  assert.equal(stripRatings(`<head>${ld('{"@type":"AggregateRating","ratingValue":5}')}</head>`), '<head></head>');
});

test('a block with no rating is returned byte for byte, and so is one that does not parse', () => {
  const pretty = ld('{\n  "@type": "Person",\n  "name": "A \\u0628",\n  "url": "https:\\/\\/example.com\\/"\n}');
  assert.equal(stripRatings(pretty), pretty);
  const broken = ld('{"@type":"Restaurant","aggregateRating":{"ratingValue":4.8},}');
  assert.equal(stripRatings(broken), broken);
  // A word in the text of the page is not markup.
  const text = '<p>Read every review and the aggregateRating we were given.</p><script>var review = {"aggregateRating": 1};</script>';
  assert.equal(stripRatings(text), text);
  assert.deepEqual(ratingMarkup(text), []);
});

test('a rewritten block keeps its layout and cannot close its own script tag', () => {
  const out = stripRatings(ld('{\n  "@type": "Restaurant",\n  "description": "a </script> b",\n  "aggregateRating": { "ratingValue": 4.8 }\n}'.replace('</script>', '<\\/script>')));
  assert.equal(out, ld('{\n  "@type": "Restaurant",\n  "description": "a \\u003c/script> b"\n}'));

  // A comment opening followed by a script opening would keep the block's
  // own closing tag from closing it, and the rest of the page would be
  // swallowed. No "<" is left bare, and the text reads back the same.
  const text = 'x <!-- <script> y </script> z <b>';
  const trap = stripRatings(ld(JSON.stringify({ '@type': 'Restaurant', description: text, aggregateRating: { ratingValue: 5 } }).replaceAll('</', '<\\/')));
  const inner = trap.match(/^<script[^>]*>([\s\S]*)<\/script>$/)[1];
  assert.ok(!inner.includes('<'), inner);
  assert.deepEqual(JSON.parse(inner), { '@type': 'Restaurant', description: text });
});

test('a rating typed with the schema prefix is a rating', () => {
  assert.deepEqual(ratingMarkup(ld('{"@type":"schema:Review","reviewBody":"x"}')), ['JSON-LD: a Review node']);
  assert.deepEqual(ratingMarkup(ld('{"@type":["Thing","schema:AggregateRating"],"ratingValue":5}')), ['JSON-LD: a Thing AggregateRating node']);
  assert.equal(stripRatings(`<head>${ld('{"@type":"schema:AggregateRating","ratingValue":5}')}</head>`), '<head></head>');
  const graph = ld(JSON.stringify({ '@graph': [{ '@type': 'schema:Review', reviewBody: 'Good' }, { '@type': 'https://schema.org/Review' }, { '@type': 'schema:WebSite', name: 'W' }] }));
  assert.deepEqual(JSON.parse(stripRatings(graph).match(/<script[^>]*>([\s\S]*)<\/script>/)[1]), { '@graph': [{ '@type': 'schema:WebSite', name: 'W' }] });
  // In a block that does not parse, the gate still sees it, in a list as well.
  for (const body of ['{"@type":"schema:Review",}', '{"@type":["Review"],}', '{"@type": [ "https://schema.org/AggregateRating" ],}']) {
    assert.deepEqual(ratingMarkup(ld(body)), ['JSON-LD that does not parse, and names a rating'], body);
  }
});

test('the gate sees rating markup in every form it takes', () => {
  assert.deepEqual(ratingMarkup(ld(RESTAURANT)), ['JSON-LD: "aggregateRating" on Restaurant']);
  assert.deepEqual(ratingMarkup(ld('[{"@type":"Review","reviewBody":"x"}]')), ['JSON-LD: a Review node']);
  assert.deepEqual(ratingMarkup(ld('{"@type":"Restaurant","aggregateRating":{"ratingValue":4.8},}')), ['JSON-LD that does not parse, and names a rating']);
  assert.equal(ratingMarkup('<div itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating"><span itemprop="ratingValue">4.8</span></div>').length, 2);
  assert.equal(ratingMarkup('<div typeof="schema:Review"><span property="schema:reviewRating">5</span></div>').length, 2);
  assert.deepEqual(ratingMarkup(`<head>${ld('{"@type":"Person","name":"A"}')}</head><p>4.8 from 210 reviews on Google</p>`), []);
});

/* ------------------------------------------------------ one file, synced */

test('one page through the whole sync: moved, cleaned, without stars, with its decision', () => {
  const source = page(
    [
      '  <title>About</title>',
      '  <meta name="robots" content="index, follow">',
      '  <link rel="canonical" href="https://nouraldeentofi.github.io/aya-rady/about.html">',
      '  <meta property="og:image" content="https://nouraldeentofi.github.io/aya-rady/og.jpg">',
      `  ${ld(RESTAURANT).replaceAll('\n', '')}`,
      '',
    ].join('\n'),
  ).replace('<p>Hello</p>', '<a href="about.html">About</a> <a href="https://nouraldeentofi.netlify.app">Nour</a>');

  const open = transformFile(source, 'about.html', site, hosting);
  assert.deepEqual(pageSignals(open), { robots: ['index, follow'], canonicals: [`${BASE}/about`], alternates: [], ogUrls: [] });
  assert.ok(open.includes(`content="${BASE}/og.jpg"`));
  assert.ok(open.includes('<a href="about.html">About</a> <a href="https://nouraldeentofi.com">Nour</a>'), 'a link in the body was rewritten, or the former host was not');
  assert.ok(!open.includes('aggregateRating'));
  assert.deepEqual(copyFileProblems(open, 'about.html', site, hosting), []);

  const closed = transformFile(source, 'about.html', { ...site, index: false }, hosting);
  assert.deepEqual(pageSignals(closed).robots, ['noindex, follow']);
  assert.deepEqual(copyFileProblems(closed, 'about.html', { ...site, index: false }, hosting), []);

  // A sitemap is cleaned; a script is moved to the domain and otherwise left alone.
  assert.equal(transformFile('<loc>https://nouraldeentofi.github.io/aya-rady/about.html</loc>', 'sitemap.xml', site, hosting), `<loc>${BASE}/about</loc>`);
  assert.equal(transformFile('fetch("https://nouraldeentofi.github.io/aya-rady/about.html")', 'js/app.js', site, hosting), `fetch("${BASE}/about.html")`);
});

/* ------------------------------------------------------ the gate */

test('the gate fails a copy that does not keep its decision or its clean addresses', () => {
  const problems = (text, rel, s = site) => copyFileProblems(text, rel, s, hosting);

  assert.match(problems(page('  <title>T</title>\n'), 'index.html', hidden)[0], /carries no noindex/);
  assert.match(problems(page('  <meta name="robots" content="index">\n'), 'atm.html', gallery)[0], /carries no noindex/);
  assert.match(problems(page('  <title>T</title>\n'), 'index.html', gallery)[0], /has no canonical/);
  assert.match(problems(page('  <title>T</title>\n'), 'index.html')[0], /has no canonical/);
  // The client's own noindex entry page needs none, and neither does an inner page.
  assert.deepEqual(problems(page('  <meta name="robots" content="noindex">\n'), 'index.html'), []);
  assert.deepEqual(problems(page('  <title>T</title>\n'), 'about.html'), []);

  for (const [head, name] of [
    [`<link rel="canonical" href="${BASE}/about.html">`, 'canonical'],
    [`<link rel="alternate" hreflang="en" href="${BASE}/en/index.html#en">`, 'hreflang'],
    [`<meta property="og:url" content="${BASE}/about.html?x=1">`, 'og:url'],
    ['<link rel="canonical" href="about.html">', 'canonical'],
  ]) {
    assert.match(problems(page(`  ${head}\n`), 'about.html')[0], new RegExp(`its ${name} is .* an address the host redirects`), head);
  }
  // Another site's address is its owner's business.
  assert.deepEqual(problems(page('  <link rel="canonical" href="https://example.com/about.html">\n'), 'about.html'), []);

  assert.match(problems(`<loc>${BASE}/about.html</loc>`, 'sitemap.xml')[0], /an address the host redirects/);
  assert.deepEqual(problems(`<loc>${BASE}/about</loc><loc>${BASE}/</loc>`, 'sitemap.xml'), []);

  assert.match(problems(page(`  ${ld(RESTAURANT)}\n`), 'about.html')[0], /rating markup/);
  assert.match(problems('<a href="https://nouraldeentofi.netlify.app">x</a>', 'about.html')[0], /nouraldeentofi\.netlify\.app/);
  assert.match(problems('', 'test/engine.html')[0], /not part of the site/);
  assert.match(problems('', 'robots.txt')[0], /not part of the site/);
});

/* The entry address is what the showcase links and what the sitemap may
   list. A canonical that names the client's own domain, or another page,
   tells Google the page at that address is not the one to keep. */
test('the gate: the entry page of a copy meant to be found names its own clean address as its canonical', () => {
  const entry = (canonical, s = site) => copyFileProblems(page(`  <link rel="canonical" href="${canonical}">\n`), 'index.html', s, hosting);
  assert.deepEqual(entry(`${BASE}/`), []);
  assert.deepEqual(entry('https://nouraldeentofi.com/gallery/', gallery), []);
  for (const other of ['https://client.example/', `${BASE}/about`, BASE, `${BASE}/?ref=x`, 'https://nouraldeentofi.com/', 'https://nouraldeentofi.com/sites/karam/']) {
    assert.deepEqual(entry(other), [`is the entry page of a copy meant to be found, and its canonical is ${other}, not ${BASE}/`], other);
  }
  assert.deepEqual(entry(''), [`is the entry page of a copy meant to be found, and its canonical is empty, not ${BASE}/`]);
  assert.match(entry(`${BASE}/`, gallery)[0], /its canonical is .*\/sites\/aya-rady\/, not https:\/\/nouraldeentofi\.com\/gallery\/$/);
  // Two canonicals, one of them wrong, is one problem.
  assert.equal(copyFileProblems(page(`  <link rel="canonical" href="${BASE}/">\n  <link rel="canonical" href="https://client.example/">\n`), 'index.html', site, hosting).length, 1);

  // Only the entry page is held to it: an inner page, a page its owner keeps
  // out of search and a copy kept out of search answer for themselves.
  assert.deepEqual(copyFileProblems(page('  <link rel="canonical" href="https://client.example/about">\n'), 'about.html', site, hosting), []);
  assert.deepEqual(copyFileProblems(page('  <meta name="robots" content="noindex">\n  <link rel="canonical" href="https://client.example/">\n'), 'index.html', site, hosting), []);
  assert.deepEqual(copyFileProblems(page(`  ${NOINDEX}\n  <link rel="canonical" href="https://client.example/">\n`), 'index.html', hidden, hosting), []);
});

test('the gate knows an address of its own domain however it is written', () => {
  const canonical = (address) => copyFileProblems(page(`  <link rel="canonical" href="${address}">\n`), 'about.html', site, hosting);
  for (const address of [
    `${BASE}/about.html`,
    'http://nouraldeentofi.com/sites/aya-rady/about.html',
    'https://NourAldeenTofi.COM/sites/aya-rady/about.html',
    'https://nouraldeentofi.com:443/sites/aya-rady/about.html',
    'http://nouraldeentofi.com:80/sites/aya-rady/about.html',
    'https://www.nouraldeentofi.com/sites/aya-rady/about.html',
    '//nouraldeentofi.com/sites/aya-rady/about.html',
    '/sites/aya-rady/about.html',
    'about.html?x=1#y',
    `${BASE}/About.HTML`,
  ]) {
    assert.deepEqual(canonical(address), [`its canonical is ${address}, an address the host redirects`], address);
  }
  // Another site's address is its owner's business, and so is anything that is not a page.
  for (const address of [
    'https://example.com/about.html',
    '//example.com/about.html',
    'https://nouraldeentofi.com.example.org/about.html',
    'https://my-nouraldeentofi.com/about.html',
    'mailto:someone@example.html',
    `${BASE}/about`,
    `${BASE}/about?file=x.html`,
    `${BASE}/about#x.html`,
    'http://[broken/about.html',
  ]) {
    assert.deepEqual(canonical(address), [], address);
  }
});

test('the gate reads every address a nested sitemap names', () => {
  const sitemap = (xml) => copyFileProblems(xml, 'sitemap.xml', site, hosting);
  const redirected = (address) => [`lists ${address}, an address the host redirects`];
  assert.deepEqual(sitemap(`<url><loc>${BASE}/about.html</loc></url>`), redirected(`${BASE}/about.html`));
  // Inside CDATA, under a prefix, and as the address of another language.
  assert.deepEqual(sitemap(`<url><loc><![CDATA[${BASE}/about.html]]></loc></url>`), redirected(`${BASE}/about.html`));
  assert.deepEqual(sitemap(`<sm:url><sm:loc>\n  ${BASE}/en/index.html\n</sm:loc></sm:url>`), redirected(`${BASE}/en/index.html`));
  assert.deepEqual(sitemap(`<url><loc>${BASE}/</loc><xhtml:link rel="alternate" hreflang="en" href="${BASE}/en/about.html"/></url>`), redirected(`${BASE}/en/about.html`));
  assert.deepEqual(sitemap(`<url><loc>${BASE}/</loc><xhtml:link rel='alternate' hreflang='en' href='http://NOURALDEENTOFI.com/sites/aya-rady/en/about.html'/></url>`), redirected('http://NOURALDEENTOFI.com/sites/aya-rady/en/about.html'));
  // Clean addresses, pictures and other sites pass.
  assert.deepEqual(
    sitemap(`<url><loc>${BASE}/</loc><loc><![CDATA[${BASE}/about]]></loc><image:image><image:loc>${BASE}/img/a.html.jpg</image:loc></image:image><xhtml:link rel="alternate" hreflang="en" href="${BASE}/en/"/><loc>https://example.com/a.html</loc></url>`),
    [],
  );
});

test('to the gate, "none" keeps a page out of search as "noindex" does, in any case', () => {
  const robots = (content, rel = 'index.html', s = hidden) => copyFileProblems(page(`  <meta name="robots" content="${content}">\n`), rel, s, hosting);
  for (const content of ['none', 'None', 'NOINDEX, FOLLOW', 'noindex,nofollow', 'max-image-preview:large, none']) assert.deepEqual(robots(content), [], content);
  // "none" as the value of another rule keeps nothing out.
  for (const content of ['index, follow', 'max-image-preview:none', 'max-image-preview: none', 'nofollow', 'nonexistent']) {
    assert.match(robots(content)[0] ?? '', /carries no noindex in its head/, content);
  }
  // An entry page its owner closed with "none" is not asked for a canonical.
  assert.deepEqual(robots('none', 'index.html', site), []);
  assert.equal(applyIndexing(page('  <meta name="robots" content="none">\n'), site, 'index.html', hosting), page('  <meta name="robots" content="none">\n'));
});

test('the gate knows a working file in any case', () => {
  for (const rel of ['Test/engine.html', 'Robots.TXT', 'v2/ROBOTS.txt', 'README.MD']) {
    assert.match(copyFileProblems('', rel, site, hosting)[0], /not part of the site/, rel);
  }
});

/* A copy taken out of the data was read by nothing and served all the same. */
test('a folder under sites/ that no entry stands behind is found', () => {
  const map = { ...hosting, sites: [site, hidden, gallery] };
  assert.deepEqual(strayCopies(['aya-rady', 'karam'], map), []);
  // A former client, what a sync that was cut short leaves behind, and a copy that lives at the root.
  assert.deepEqual(strayCopies(['aya-rady', 'old-client', 'karam.sync', 'karam.old', 'gallery', 'Karam'], map), ['old-client', 'karam.sync', 'karam.old', 'gallery', 'Karam']);
  assert.deepEqual(strayCopies(['x'], undefined), ['x']);

  // The repository holds none, and validate asks.
  assert.deepEqual(strayCopies(readdirSync('sites'), JSON.parse(readFileSync('data/hosting.json', 'utf8'))), []);
  assert.ok(readFileSync('scripts/validate.mjs', 'utf8').includes("strayCopies(readdirSync('sites'), db.hosting)"), 'validate.mjs no longer looks for folders with no entry');
});

/* ------------------------------------------------------ one copy, replaced */

/*
 * A disk that holds folders by name and can be told which step fails:
 * `fail` is asked before every move and every removal. A move onto a folder
 * that exists fails by itself, as it does on Windows.
 */
function disk(folders, fail = () => false) {
  const held = new Map(Object.entries(folders));
  const steps = [];
  return {
    held: () => Object.fromEntries(held),
    steps,
    existsSync: (path) => held.has(path),
    renameSync: (from, to) => {
      steps.push(`move ${from} ${to}`);
      if (fail('move', from, to)) throw new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`);
      if (!held.has(from)) throw new Error(`ENOENT: no such file or directory, rename '${from}'`);
      if (held.has(to)) throw new Error(`EPERM: '${to}' is in the way`);
      held.set(to, held.get(from));
      held.delete(from);
    },
    rmSync: (path) => {
      steps.push(`remove ${path}`);
      if (fail('remove', path, steps.filter((step) => step === `remove ${path}`).length)) throw new Error(`EBUSY: resource busy or locked, rmdir '${path}'`);
      held.delete(path);
    },
  };
}

const [DEST, FRESH, OLD] = ['sites/karam', 'sites/karam.sync', 'sites/karam.old'];
const moveIn = (kind, from, to) => kind === 'move' && from === FRESH && to === DEST;
const putBack = (kind, from, to) => kind === 'move' && from === OLD && to === DEST;

test('a new copy takes the place of the old one, and the old one comes back when it cannot', () => {
  // The usual run, and the first sync of a site.
  let d = disk({ [DEST]: 'previous', [FRESH]: 'new' });
  assert.equal(replaceCopy(DEST, FRESH, d), null);
  assert.deepEqual(d.held(), { [DEST]: 'new' });
  d = disk({ [FRESH]: 'new' });
  assert.equal(replaceCopy(DEST, FRESH, d), null);
  assert.deepEqual(d.held(), { [DEST]: 'new' });
  // What an earlier run could not delete is not a copy: it goes, and the copy in place is replaced.
  d = disk({ [DEST]: 'previous', [OLD]: 'before that', [FRESH]: 'new' });
  assert.equal(replaceCopy(DEST, FRESH, d), null);
  assert.deepEqual(d.held(), { [DEST]: 'new' });

  // The new copy cannot be moved in: the old one is back, and nothing is said to be stranded.
  d = disk({ [DEST]: 'previous', [FRESH]: 'new' }, moveIn);
  assert.throws(() => replaceCopy(DEST, FRESH, d), (error) => /EPERM/.test(error.message) && error.stranded === undefined);
  assert.deepEqual(d.held(), { [DEST]: 'previous', [FRESH]: 'new' });
  // The old copy cannot step aside: nothing has moved.
  d = disk({ [DEST]: 'previous', [FRESH]: 'new' }, (kind, from, to) => kind === 'move' && to === OLD);
  assert.throws(() => replaceCopy(DEST, FRESH, d), (error) => error.stranded === undefined);
  assert.deepEqual(d.held(), { [DEST]: 'previous', [FRESH]: 'new' });

  // The new copy stands and the old one cannot be deleted: a sentence, not a failure.
  d = disk({ [DEST]: 'previous', [FRESH]: 'new' }, (kind, path, nth) => kind === 'remove' && path === OLD && nth === 2);
  assert.equal(replaceCopy(DEST, FRESH, d), `${OLD}/ could not be removed (EBUSY: resource busy or locked, rmdir '${OLD}'); delete it by hand before committing`);
  assert.deepEqual(d.held(), { [DEST]: 'new', [OLD]: 'previous' });
});

/* A run that was stopped between the two moves left the only copy aside.
   The next run deleted it before its own copy stood, so when that one could
   not be moved in either, no copy was left and the run said the folder was
   "left as it was". */
test('a copy an earlier run left aside is put back before anything is deleted', () => {
  // The run after fails to move its copy in: the copy that was aside is in its place.
  let d = disk({ [OLD]: 'previous', [FRESH]: 'new' }, moveIn);
  assert.throws(() => replaceCopy(DEST, FRESH, d), (error) => error.stranded === undefined);
  assert.deepEqual(d.held(), { [DEST]: 'previous', [FRESH]: 'new' });
  assert.equal(d.steps[0], `move ${OLD} ${DEST}`, 'the put-back is the first thing that happens');
  // The run after, when it succeeds.
  d = disk({ [OLD]: 'previous', [FRESH]: 'new' });
  assert.equal(replaceCopy(DEST, FRESH, d), null);
  assert.deepEqual(d.held(), { [DEST]: 'new' });

  // Neither the new copy nor the old one can be moved: the old one is named, and is still there.
  d = disk({ [DEST]: 'previous', [FRESH]: 'new' }, (...step) => moveIn(...step) || putBack(...step));
  assert.throws(() => replaceCopy(DEST, FRESH, d), (error) => error.stranded === OLD && error.message.includes(`rename '${FRESH}' -> '${DEST}'`));
  assert.deepEqual(d.held(), { [OLD]: 'previous', [FRESH]: 'new' });
  // A copy that is aside and cannot be moved back is named too, and nothing is deleted.
  d = disk({ [OLD]: 'previous', [FRESH]: 'new' }, putBack);
  assert.throws(() => replaceCopy(DEST, FRESH, d), (error) => error.stranded === OLD);
  assert.deepEqual(d.held(), { [OLD]: 'previous', [FRESH]: 'new' });
  assert.ok(!d.steps.some((step) => step.startsWith('remove')), 'something was deleted while the only copy was aside');

  // By itself, before a clone: back when there is no copy in place, and only then.
  d = disk({ [OLD]: 'previous' });
  assert.equal(restoreCopy(DEST, d), true);
  assert.deepEqual(d.held(), { [DEST]: 'previous' });
  for (const folders of [{ [DEST]: 'copy' }, { [DEST]: 'copy', [OLD]: 'leftover' }, {}]) {
    d = disk(folders);
    assert.equal(restoreCopy(DEST, d), false);
    assert.deepEqual(d.held(), folders);
    assert.deepEqual(d.steps, []);
  }
  d = disk({ [OLD]: 'previous' }, putBack);
  assert.throws(() => restoreCopy(DEST, d), (error) => error.stranded === OLD);
});

test('the sync replaces a copy on a real disk the same way, and does it through these two functions', () => {
  const root = mkdtempSync(join(tmpdir(), 'swap-'));
  const fs = { existsSync, renameSync, rmSync };
  const [dest, fresh, old] = [join(root, 'karam'), join(root, 'karam.sync'), join(root, 'karam.old')];
  const folder = (path, file) => {
    mkdirSync(join(path, 'img'), { recursive: true });
    writeFileSync(join(path, 'img', file), file);
  };
  try {
    folder(dest, 'previous.txt');
    folder(fresh, 'new.txt');
    assert.equal(replaceCopy(dest, fresh, fs), null);
    assert.deepEqual(readdirSync(root), ['karam']);
    assert.deepEqual(readdirSync(join(dest, 'img')), ['new.txt']);

    // What a stopped run leaves: the copy aside, nothing in its place.
    renameSync(dest, old);
    assert.equal(restoreCopy(dest, fs), true);
    assert.deepEqual(readdirSync(root), ['karam']);
    renameSync(dest, old);
    folder(fresh, 'newer.txt');
    assert.equal(replaceCopy(dest, fresh, fs), null);
    assert.deepEqual(readdirSync(root), ['karam']);
    assert.deepEqual(readdirSync(join(dest, 'img')), ['newer.txt']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const sync = readFileSync('scripts/sync-sites.mjs', 'utf8');
  assert.ok(sync.includes('restoreCopy(dest, { existsSync, renameSync })'), 'the sync no longer puts a stranded copy back first');
  assert.ok(sync.includes('replaceCopy(dest, fresh, { existsSync, renameSync, rmSync })'), 'the sync no longer replaces a copy through replaceCopy');
  assert.ok(sync.indexOf('restoreCopy(dest,') < sync.indexOf('tmp = clone(site)'), 'the put-back comes after the clone, which may fail');
  assert.ok(!/function replaceCopy/.test(sync) && sync.includes('error.stranded'), 'the sync does not say where a stranded copy is');
});

/* ------------------------------------------------------ the repository */

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

test('a copy left open with the client still to be asked says so in the data', () => {
  const map = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
  assert.deepEqual(hostingProblems(map), []);
  // Nothing a build prints: a note for whoever reads the file next.
  for (const s of map.sites) if (s.todo !== undefined) assert.equal(typeof s.todo, 'string', s.repo);
});

/* The sitemap is the list of addresses meant for search. A copy that is kept
   out of search must never be on it, and a copy that is on it is someone
   else's page: it has no other language here and no date the build knows. */
test('a copy whose decision is still open is not submitted, and is not closed either', () => {
  const asked = { ...site, repo: 'asked', path: 'sites/asked', todo: 'The owner still has to confirm with the client.' };
  const waiting = { ...hidden, repo: 'waiting', path: 'sites/waiting', todo: 'Kept out until it has a real title.' };
  assert.ok(isPending(asked) && isPending(waiting));
  assert.ok(!isPending(site) && !isPending({ ...site, todo: '' }) && !isPending({ ...site, todo: null }));
  assert.deepEqual(hostedEntries({ ...hosting, sites: [site, asked, hidden, waiting, gallery, { ...gallery, repo: 'lab', path: 'lab', todo: 'To be confirmed.' }] }), [
    'https://nouraldeentofi.com/sites/aya-rady/',
    'https://nouraldeentofi.com/gallery/',
  ]);

  // Its pages stay exactly as indexable as its repository left them.
  const html = page('  <meta name="robots" content="index, follow">\n  <link rel="canonical" href="https://nouraldeentofi.com/sites/asked/">\n');
  assert.equal(transformFile(html, 'index.html', asked, hosting), html);
  assert.deepEqual(copyFileProblems(html, 'index.html', asked, hosting), []);
});

test('the main sitemap lists the entry address of every copy meant to be found and confirmed, and of no other', () => {
  const db = loadDb('data');
  const map = db.hosting;
  const entries = hostedEntries(map);
  assert.deepEqual(entries, map.sites.filter((s) => (s.index === true || s.index === 'root-only') && !s.todo).map((s) => siteUrl(s, map)));
  assert.ok(entries.length > 0 && entries.length < map.sites.length);
  assert.deepEqual(hostedEntries(undefined), []);

  const sitemap = buildSite({ ...db, build: { modified: '2026-11-15T00:00:00+03:00' } }).get('sitemap.xml');
  const blocks = new Map([...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => [block.match(/<loc>([^<]*)<\/loc>/)[1], block.trim()]));
  for (const s of map.sites) {
    const address = siteUrl(s, map);
    if (s.index === false) {
      assert.ok(!sitemap.includes(`/${s.path}/`), `${s.path} is kept out of search, and is in the sitemap`);
    } else if (s.todo) {
      assert.ok(!sitemap.includes(`/${s.path}/`), `${s.path} still carries a todo, and is in the sitemap`);
    } else {
      assert.equal(sitemap.split(`<loc>${address}</loc>`).length - 1, 1, address);
      assert.equal(blocks.get(address), `<loc>${address}</loc>`, `${address}: carries more than its address`);
    }
  }
});
