/**
 * The site against Google's own documentation.
 *
 * An audit compared the pages with Google Search Central, and each test here
 * holds one of its findings closed: an image has one address, a screenshot
 * is described by what it shows, his portrait stands beside the text about
 * him, the share card says what the data says, the structured data of a page
 * describes what that page shows, and a date in the sitemap moves only when
 * the page it dates has changed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadDb } from '../scripts/lib/load.mjs';
import { PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { buildSite, sitePages, pageFile } from '../scripts/lib/site.mjs';
import { detailPages } from '../scripts/lib/details.mjs';
import { shotAlt, tagsOf, aboutPortrait } from '../scripts/lib/blocks.mjs';
import { LASTMOD_FILE, pageFingerprint, stampPages, pageDates, latestChange, serializeState } from '../scripts/lib/lastmod.mjs';
import { ogCardFields, renderOgCard } from '../scripts/lib/og.mjs';
import { parseHeaders, parseRedirects, emDashHits, fingerprintedImages, PUBLIC_HAND_KEPT } from '../scripts/lib/gates.mjs';

const loaded = loadDb('data');
const DAY = '2026-11-15';
const build = (day, lastmod, data = loaded) => buildSite({ ...data, build: { modified: `${day}T00:00:00+03:00`, ...(lastmod ? { lastmod } : {}) } });
const db = { ...loaded, build: { modified: `${DAY}T00:00:00+03:00` } };
const site = db.profile.site;

/** Every file the build writes, by its path from the site root. */
const files = buildSite(db);
const html = (page, lang) => files.get(pageFile(page, lang));
/** Every page a visitor can open: the navigation, the detail pages and the 404. */
const everyPage = LANGS.flatMap((lang) => [...sitePages(db), '404'].map((page) => ({ lang, page, at: `${lang}/${page || 'index'}`, doc: html(page, lang) })));

const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** What a visitor can read: the body, without scripts, tags or attributes. */
const visibleText = (doc) =>
  unescape(
    doc
      .slice(doc.indexOf('<body>'))
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<\/?(?:a|em|b|strong)\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

/** Every JSON-LD node on a page, flattened out of its @graph. */
const ldNodes = (doc) =>
  [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(([, json]) => {
    const parsed = JSON.parse(json.replaceAll('<\\/', '</'));
    return parsed['@graph'] ?? [parsed];
  });

/** Every `<img>` on a page, as `{ src, alt, tag }`. */
const images = (doc) =>
  [...doc.matchAll(/<img\s[^>]*>/g)].map(([tag]) => ({ tag, src: tag.match(/src="([^"]*)"/)?.[1], alt: unescape(tag.match(/alt="([^"]*)"/)?.[1] ?? '') }));

/* ------------------------------------------------- one address per image */

/* Google ties what it knows about a picture to the address it found it at.
   The pages used to name "nour.jpg?v=1a2b3c4d" in the <img> and "nour.jpg" in
   the structured data and og:image: two addresses for one picture, and the
   first changed every time the file did. */
test('a picture has one address everywhere it is named, with no fingerprint', () => {
  for (const { at, doc } of everyPage) {
    assert.deepEqual(fingerprintedImages(doc), [], `${at}: an image carries a query string`);
    for (const { src } of images(doc)) {
      assert.match(src, /^\/assets\/img\/[^?#]+$/, `${at}: ${src}`);
      assert.ok(existsSync(src.slice(1)), `${at}: ${src} is not a file`);
    }
    // The picture the page is shared with is named by the same bare address.
    const og = doc.match(/<meta property="og:image" content="([^"]*)">/)[1];
    assert.match(og, new RegExp(`^${site}/assets/img/[^?#]+$`), `${at}: og:image`);
    assert.ok(doc.includes(`<meta name="twitter:image" content="${og}">`), at);
  }

  // The portrait: the same address in the header link, the full-size view,
  // the about page and the Person node.
  for (const lang of LANGS) {
    const doc = html('about', lang);
    const bare = `/${db.profile.image}`;
    assert.equal(ldNodes(doc).find((n) => n['@type'] === 'Person').image.contentUrl, `${site}${bare}`);
    assert.equal(images(doc).filter((i) => i.src === bare).length, 2, `${lang}: the figure and the full-size view`);
    assert.ok(doc.includes(`portrait-open" href="${bare}"`), `${lang}: the link behind the avatar`);
  }

  // A screenshot or a canvas the structured data names is one the page shows, at that address.
  for (const { lang, page, at, doc } of everyPage) {
    const shown = new Set(images(doc).map((i) => `${site}${i.src}`));
    for (const node of ldNodes(doc)) {
      const named = [node.image, node.item?.image, ...(node.itemListElement ?? []).map((el) => el.item?.image)].filter((x) => typeof x === 'string');
      for (const address of named) assert.ok(shown.has(address), `${at}: ${address} is in the markup but not in an <img>`);
    }
    assert.ok(page !== undefined && lang);
  }
});

test('the check for a fingerprinted image catches one wherever it is written', () => {
  assert.deepEqual(fingerprintedImages('<img src="/assets/img/nour.jpg" alt="">'), []);
  assert.deepEqual(fingerprintedImages('<link rel="stylesheet" href="/assets/css/base.css?v=1a2b3c4d">'), []);
  assert.deepEqual(fingerprintedImages('<img src="/assets/img/nour.jpg?v=1a2b3c4d">'), ['/assets/img/nour.jpg?v=1a2b3c4d']);
  assert.deepEqual(fingerprintedImages('"image": "https://nouraldeentofi.com/assets/img/showcase/a.webp?v=9"'), ['/assets/img/showcase/a.webp?v=9']);
  assert.deepEqual(fingerprintedImages('<meta property="og:image" content="https://x.test/assets/img/og.png?1">'), ['/assets/img/og.png?1']);
});

/* Without the fingerprint a re-shot screenshot keeps its address, so the
   browser has to ask for it again instead of trusting its copy. Scripts
   import one another by bare address, so the same goes for them. */
test('the host has browsers revalidate pictures and scripts, and keep stylesheets', () => {
  const rules = Object.fromEntries(parseHeaders(readFileSync('_headers', 'utf8')).map((r) => [r.match, r.headers]));
  const cache = (match) => rules[match]?.find((h) => h.name === 'Cache-Control')?.value;
  assert.equal(cache('/assets/img/*'), 'public, max-age=0, must-revalidate');
  assert.equal(cache('/assets/js/*'), 'public, max-age=0, must-revalidate');
  assert.equal(cache('/assets/css/*'), 'public, max-age=604800', 'stylesheets are fingerprinted, so they keep their week');
  assert.equal(cache('/assets/cv/*'), 'public, max-age=0, must-revalidate');

  // The reason for the script rule: a module imports its neighbours without a fingerprint.
  assert.match(readFileSync('assets/js/main.js', 'utf8'), /from '\.\/[a-z-]+\.js'/);
});

/* ------------------------------------------------------------- alt text */

/* Every screenshot used to end "designed and built by Nour Aldeen Tofi":
   thirty-nine pictures of other people's sites, each carrying his name, on
   one page. An alt says what the picture shows. */
test('a screenshot is described by what it shows, and does not carry his name', () => {
  const aya = db.showcase.sites.find((s) => s.id === 'aya-rady');
  assert.equal(shotAlt(db, aya, 'shotDesktop', 'en'), 'Screenshot of the website of Aya Rady, Personal branding strategist for experts and consultants, desktop view');
  assert.equal(shotAlt(db, aya, 'shotPhone', 'ar'), 'لقطة شاشة من موقع آية راضي، استراتيجية علامة شخصية للخبراء والاستشاريين، نسخة الجوال');

  // A project is an app, not a website, and its `role` is what Nour did on it.
  const khatm = db.projects.find((p) => p.id === 'khatm');
  assert.equal(shotAlt(db, khatm, 'shotDesktop', 'en'), `Screenshot of ${khatm.name}, desktop view`);
  assert.equal(shotAlt(db, khatm, 'shotPhone', 'ar'), `لقطة شاشة من ${khatm.name}، نسخة الجوال`);
  assert.equal(shotAlt(db, db.showcase.lab, 'shotDesktop', 'en'), 'Screenshot of Portfolio Gallery, desktop view');

  for (const lang of LANGS) {
    for (const s of [...db.showcase.sites, db.showcase.lab, ...db.projects.filter((p) => p.images)]) {
      for (const view of ['shotDesktop', 'shotPhone']) {
        const alt = shotAlt(db, s, view, lang);
        assert.ok(!alt.includes(db.profile.name[lang]) && !/Nour|نور الدين/.test(alt.replace(s.name?.[lang] ?? s.name, '')), `${lang}/${s.id}: ${alt}`);
        assert.ok(!/[{}]|undefined/.test(alt) && !alt.includes('—') && !/,\s*,|،\s*،/.test(alt), `${lang}/${s.id}: ${alt}`);
        assert.equal(/website|موقع/.test(alt.replace(s.name?.[lang] ?? s.name, '')), Boolean(s.segment), `${lang}/${s.id}: only a client site is called a website`);
      }
    }
  }
});

test('on every page, only a picture of him is described by his name', () => {
  const portraits = new Set([`/${db.profile.image}`, '/assets/img/nour-96.png']);
  for (const { lang, at, doc } of everyPage) {
    for (const { src, alt, tag } of images(doc)) {
      assert.ok(alt.trim().length > 0, `${at}: ${src} has no alt`);
      assert.match(tag, /\swidth="\d+"\sheight="\d+"/, `${at}: ${src} has no size`);
      if (!portraits.has(src)) assert.ok(!alt.includes(db.profile.name[lang]), `${at}: "${alt}" puts his name on ${src}`);
    }
  }
  // The showcase is where it was worst.
  for (const lang of LANGS) {
    const shots = images(html('showcase', lang)).filter((i) => i.src.startsWith('/assets/img/showcase/'));
    assert.ok(shots.length >= db.showcase.sites.length * 2);
    assert.equal(new Set(shots.map((i) => i.alt)).size, shots.length, `${lang}: two screenshots share an alt`);
    for (const { alt } of shots) assert.ok(!/designed and built|تصميم وتطوير/.test(alt), alt);
  }
});

/* ----------------------------------------------------- the portrait */

/* Most searches that reach the site are for his name, and the only pictures
   of him were a 36 pixel avatar and a photo inside a closed dialog. Google
   reads the words around an image to decide what it shows. */
test('the about page shows his portrait beside the story, with an alt and a caption', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang].about;
    const doc = html('about', lang);
    const figure = doc.match(/<figure class="about-portrait"[\s\S]*?<\/figure>/)?.[0];
    assert.ok(figure, `${lang}: no portrait on the about page`);
    assert.equal(figure, aboutPortrait(db, lang));

    const [img] = images(figure);
    assert.equal(img.src, `/${db.profile.image}`);
    assert.equal(img.alt, c.portraitAlt);
    assert.match(img.tag, /width="720" height="720"/);
    assert.ok(!img.tag.includes('loading="lazy"'), `${lang}: it is the first thing under the heading on a phone`);
    assert.ok(unescape(figure).includes(`<figcaption>${c.portraitCaption}</figcaption>`));

    // The alt describes the picture; the caption names him and where he is.
    assert.ok(c.portraitAlt.includes(db.profile.name[lang]) && c.portraitAlt.length > db.profile.name[lang].length + 10);
    assert.ok(c.portraitCaption.includes(db.profile.name[lang]) && c.portraitCaption.includes(db.profile.location.city[lang]));
    for (const text of [c.portraitAlt, c.portraitCaption]) assert.ok(!text.includes('—') && !/\d/.test(text), text);

    // Beside the story, in one wrapper, and before it in the document.
    const intro = doc.match(/<div class="about-intro">[\s\S]*?<div class="narrative">/)?.[0];
    assert.ok(intro?.includes('class="about-portrait"'), `${lang}: the portrait is not with the story`);

    // The header avatar and the full-size view are still there.
    assert.ok(doc.includes('class="brand__mark portrait-open"') && doc.includes('<dialog class="portrait" id="portrait"'));
  }
  // Only the about page: the other pages have no text about him to stand beside.
  for (const { page, at, doc } of everyPage) assert.equal(doc.includes('class="about-portrait"'), page === 'about', at);
  // No portrait in the data, no figure and no empty frame.
  assert.equal(aboutPortrait({ ...db, profile: { ...db.profile, image: null } }, 'en'), '');
  assert.ok(existsSync('me.png'), 'the original he published is left where it is');
});

test('the portrait is laid out with logical properties, so the Arabic page mirrors it', () => {
  const css = readFileSync('assets/css/components.css', 'utf8');
  const block = css.slice(css.indexOf('the portrait beside the story'), css.indexOf('---------- transcript table'));
  assert.ok(block.includes('.about-intro') && block.includes('.about-portrait'));
  const rules = block.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/(^|[\s;{])(left|right|margin-left|margin-right|padding-left|padding-right|width|height)\s*:/m.test(rules), 'a physical property');
  assert.ok(!/text-align:\s*(left|right)/.test(rules) && !/float:/.test(rules));
  // One column on a phone, two from a tablet up.
  assert.match(rules, /@media \(min-width: 900px\) \{\s*\.about-intro \{[^}]*grid-template-columns:/);
  assert.ok(!readFileSync('assets/css/rtl.css', 'utf8').includes('about-'), 'it needs no right-to-left override');
});

/* ------------------------------------------------------- the share card */

/* The old card was exported by hand. It kept an em dash and the word
   "Senior" long after both were dropped everywhere else, because nothing
   tied it to the data. */
test('the share card takes its words from the data', () => {
  const f = ogCardFields(db);
  assert.equal(f.nameEn, db.profile.name.en);
  assert.equal(f.nameAr, db.profile.name.ar);
  assert.equal(f.host, 'nouraldeentofi.com');
  assert.equal(f.image, db.profile.image);
  // The three parts are the headline, and nothing but the headline and the place.
  const headline = db.profile.headline.en.replace(/\s+/g, ' ');
  assert.equal(`${f.role}: ${f.focus} · ${f.more}`.replace(/\s+/g, ' '), `${headline} · ${db.profile.location.city.en}, ${db.profile.location.country.en}`);
  for (const part of [f.role, f.focus]) assert.ok(part.length > 0 && db.profile.headline.en.includes(part));

  // A headline in another shape still comes out whole.
  const plain = ogCardFields({ ...db, profile: { ...db.profile, headline: { en: 'Engineer' } } });
  assert.deepEqual([plain.role, plain.focus, plain.more], ['Engineer', '', 'Al Khobar, Saudi Arabia']);
});

test('the filled card has every word in place, no em dash and no title he dropped', () => {
  const template = readFileSync('scripts/og/og.html', 'utf8');
  const card = renderOgCard(template, db, 'file:///somewhere/scripts/og/');
  const f = ogCardFields(db);

  assert.ok(!/\{\{|\}\}/.test(card), 'a placeholder was left unfilled');
  for (const word of [f.nameEn, f.nameAr, f.role, f.focus, f.host]) assert.ok(unescape(card).includes(`>${word}<`), `"${word}" is not on the card`);
  assert.ok(unescape(card).includes(`>${f.more}<`));
  assert.ok(card.includes('<base href="file:///somewhere/scripts/og/">'));
  assert.ok(card.includes(`<img src="../../${db.profile.image}"`), 'the portrait');

  const text = card.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!card.includes('—'), 'an em dash');
  assert.ok(!/Senior/i.test(card), 'a title he no longer uses');
  assert.ok(!/alessa|zatca/i.test(card));
  // No figures: the only digit on the card is the one in a product's name.
  assert.deepEqual(text.match(/\d+/g) ?? [], ['8'], 'a figure on the card');

  // The site's own colours and fonts, and the size a share card is shown at.
  assert.ok(template.includes('href="../../assets/css/tokens.css"') && template.includes('data-theme="dark"'));
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(template.match(/<style>[\s\S]*?<\/style>/)[0]), 'a colour typed by hand instead of a token');
  assert.match(template, /inline-size: 1200px;\s*block-size: 630px;/);
  assert.match(template, /family=Figtree[^"]*IBM\+Plex\+Sans\+Arabic/);
  assert.ok(template.includes('noindex'));

  // A template that asks for a word the data does not have is an error, not a hole.
  assert.throws(() => renderOgCard('<head></head>{{salary}}', db, 'file:///x/'), /salary/);
});

test('the share card on disk is the size the pages announce, and npm run og makes it', () => {
  assert.deepEqual(db.imageSizes[db.profile.ogImage], [1200, 630]);
  assert.equal(db.profile.ogImage, 'assets/img/og.png', 'the address of the card is quoted elsewhere and must not move');
  for (const lang of LANGS) {
    const doc = html('', lang);
    assert.ok(doc.includes(`<meta property="og:image" content="${site}/assets/img/og.png">`));
    assert.ok(doc.includes('<meta property="og:image:width" content="1200">') && doc.includes('<meta property="og:image:height" content="630">'));
  }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts.og, 'node scripts/og.mjs');
  const script = readFileSync('scripts/og.mjs', 'utf8');
  for (const flag of ['--headless=new', '--screenshot=', '--window-size=']) assert.ok(script.includes(flag), flag);
  assert.ok(script.includes("resolve('scripts/og/og.html')") && script.includes('db.profile.ogImage'));
});

/* ------------------------------------- markup says what the page shows */

/* "Don't mark up content that is not visible to readers of the page." The
   Person node of a page carries only what that page shows about him. */
test('what a page says about him in its markup is on that page', () => {
  const person = (doc) => ldNodes(doc).find((n) => n['@type'] === 'Person');
  const slim = ['@type', '@id', 'name', 'jobTitle', 'url', 'image', 'address', 'sameAs'];

  for (const { lang, page, at, doc } of everyPage) {
    const p = person(doc);
    const text = visibleText(doc);
    assert.ok(p, `${at}: no Person node`);
    assert.equal(p['@id'], `${site}/#nour`, at);

    if (!['', 'about', 'work', 'contact'].includes(page)) {
      assert.deepEqual(Object.keys(p).sort(), [...slim].sort(), `${at}: more than the slim node`);
    }
    if ('telephone' in p) assert.ok(text.includes(p.telephone), `${at}: the phone number is in the markup but not on the page`);
    if ('email' in p) {
      assert.equal(p.email, db.profile.email);
      assert.ok(text.includes(p.email), `${at}: the email is in the markup but not on the page`);
    }
    for (const skill of p.knowsAbout ?? []) assert.ok(text.includes(skill), `${at}: "${skill}" is not on the page`);
    for (const cred of p.hasCredential ?? []) {
      assert.ok(text.includes(cred.name), `${at}: "${cred.name}" is not on the page`);
      if (cred.identifier) assert.ok(text.includes(cred.identifier), `${at}: ${cred.identifier}`);
    }
    if (p.alumniOf) assert.ok(text.includes(p.alumniOf.name), `${at}: ${p.alumniOf.name}`);
    if (p.hasOccupation) assert.ok(text.includes(p.hasOccupation.name), `${at}: "${p.hasOccupation.name}" is not on the page`);
    if (p.description) assert.ok(text.includes(p.description.replace(/\s+/g, ' ')), `${at}: the description`);
    for (const l of p.knowsLanguage ?? []) assert.ok(text.includes(l.name), `${at}: ${l.name}`);
    if (p.givenName) assert.ok(text.includes(p.givenName) && text.includes(p.familyName), at);
    assert.equal('telephone' in p, page === 'contact', `${at}: the phone number belongs on the contact page only`);
    assert.equal('hasCredential' in p, page === 'work', `${at}: the certificates belong on the experience page only`);
    assert.equal('knowsAbout' in p, page === 'about', `${at}: the skills belong on the about page only`);
    assert.ok(lang);
  }

  // On the contact page, what he is looking for is shown role by role and place by place.
  for (const lang of LANGS) {
    const doc = html('contact', lang);
    const text = visibleText(doc);
    for (const role of db.profile.availability.roles[lang]) assert.ok(text.includes(role), `${lang}: ${role}`);
    for (const area of person(doc).seeks.areaServed) assert.ok(text.includes(area), `${lang}: ${area}`);
  }
  // The slim node is what makes the difference in weight: the page of one
  // project no longer ships sixty skills and twelve certificates.
  const weight = (doc) => JSON.stringify(person(doc)).length;
  assert.ok(weight(html('projects/smart-scanner', 'en')) * 3 < weight(html('about', 'en')) + weight(html('work', 'en')));
});

/* ----------------------------------------------- plain-language labels */

test('a plain-language tag is read in the language of the page, a technology keeps its name', () => {
  assert.deepEqual(tagsOf(['RTL', { en: 'Dark mode', ar: 'الوضع الداكن' }], 'ar'), ['RTL', 'الوضع الداكن']);
  assert.deepEqual(tagsOf(['RTL', { en: 'Dark mode', ar: 'الوضع الداكن' }], 'en'), ['RTL', 'Dark mode']);
  assert.deepEqual(tagsOf(undefined, 'en'), []);

  const badge = (t) => `<li class="badge">${t}</li>`;
  const ar = html('showcase', 'ar');
  const en = html('showcase', 'en');
  for (const [english, arabic] of [['Arabic + English', 'عربي وإنجليزي'], ['Dark mode', 'الوضع الداكن'], ['Mobile first', 'للجوال أولاً']]) {
    assert.ok(en.includes(badge(english)) && !en.includes(badge(arabic)), `en: ${english}`);
    assert.ok(ar.includes(badge(arabic)) && !ar.includes(badge(english)), `ar: ${english} is still printed in English`);
  }
  for (const tech of ['RTL', 'JSON-LD', 'llms.txt', 'Canvas']) assert.ok(ar.includes(badge(tech)) && en.includes(badge(tech)), tech);
  assert.ok(!ar.includes('[object Object]') && !en.includes('[object Object]'));
});

/* ------------------------------------------------------- a larger icon */

/* Google asks for a square icon larger than 48 pixels. The 180 pixel one was
   declared for Apple only; now it is the first rel="icon" a crawler meets. */
test('the larger icon is declared first, and the file names have not moved', () => {
  for (const { at, doc } of everyPage) {
    const icons = [...doc.matchAll(/<link rel="icon" type="image\/png" sizes="(\d+)x\d+" href="([^"]*)">/g)].map((m) => [Number(m[1]), m[2]]);
    assert.deepEqual(icons, [[180, '/assets/img/icon-180.png'], [32, '/assets/img/icon-32.png']], at);
    assert.ok(doc.includes('<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/icon-180.png">'), at);
  }
  assert.deepEqual(loaded.imageSizes['assets/img/og.png'], [1200, 630]);
  const favicon = parseRedirects(readFileSync('_redirects', 'utf8')).find((r) => r.from === '/favicon.ico');
  assert.deepEqual(favicon, { from: '/favicon.ico', to: '/assets/img/icon-32.png', status: 301 });
});

/* ------------------------------------------------- hand-kept public files */

test('the public files written by hand carry no em dash', () => {
  assert.deepEqual(PUBLIC_HAND_KEPT, ['robots.txt', 'mcp/README.md']);
  for (const file of PUBLIC_HAND_KEPT) assert.deepEqual(emDashHits(readFileSync(file, 'utf8')), [], file);

  assert.deepEqual(emDashHits('a comma, a colon: words'), []);
  assert.deepEqual(emDashHits('# Nour Aldeen Tofi — nouraldeentofi.com'), ['# Nour Aldeen Tofi — nouraldeentofi.com']);
  assert.equal(emDashHits('one — two\nthree — four').length, 2);
  // The validator runs the check on both files.
  const validate = readFileSync('scripts/validate.mjs', 'utf8');
  assert.match(validate, /for \(const f of PUBLIC_HAND_KEPT\)[\s\S]{0,200}emDashHits/);
});

/* ------------------------------------------------------ honest dates */

/* Google uses lastmod only while it is "consistently and verifiably
   accurate". Every address used to carry the day of the build, which says
   every page changed every time anything was rebuilt. */

const stateOf = (built) => JSON.parse(built.get(LASTMOD_FILE));
const lastmods = (built) =>
  Object.fromEntries(
    [...built.get('sitemap.xml').matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => [
      entry.match(/<loc>([^<]*)<\/loc>/)[1].replace(site, ''),
      entry.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1],
    ]),
  );

test('the first build dates every page with its day, and writes down what it saw', () => {
  const first = build(DAY);
  const state = stateOf(first);
  const addresses = LANGS.flatMap((lang) => sitePages(db).map((page) => pagePath(page, lang)));

  assert.deepEqual(Object.keys(state).sort(), [...addresses].sort(), 'one entry for every page in the sitemap, and no other');
  for (const address of addresses) {
    assert.match(state[address].hash, /^[0-9a-f]{16}$/);
    assert.equal(state[address].date, DAY);
  }
  assert.deepEqual(lastmods(first), Object.fromEntries(addresses.map((a) => [a, DAY])));
  // The 404 has no address, so it has no date.
  assert.ok(!Object.keys(state).some((a) => a.includes('404')));
  // The file is kept where the host does not publish it.
  assert.equal(LASTMOD_FILE, 'scripts/lastmod.json');
  assert.equal(first.get(LASTMOD_FILE), serializeState(state));
});

test('a build on another day, from the same data, writes the same files byte for byte', () => {
  const first = build(DAY);
  const later = build('2026-12-24', stateOf(first));
  assert.deepEqual([...later.keys()], [...first.keys()]);
  for (const [path, content] of first) assert.equal(later.get(path), content, `${path} changed, though nothing in the data did`);

  // And again from the state that build wrote: still the same.
  const third = build('2026-12-25', stateOf(later));
  assert.equal(third.get('sitemap.xml'), first.get('sitemap.xml'));
  assert.equal(third.get(LASTMOD_FILE), first.get(LASTMOD_FILE));
  assert.equal(third.get('api/profile.json'), first.get('api/profile.json'));
});

test('changing the words of one page moves the date of that page only', () => {
  const first = build(DAY);
  const edited = { ...loaded, copy: { ...loaded.copy, en: { ...loaded.copy.en, about: { ...loaded.copy.en.about, lead: 'A different sentence about how I work.' } } } };
  const later = build('2026-12-24', stateOf(first), edited);

  const moved = Object.entries(lastmods(later)).filter(([, date]) => date !== DAY);
  assert.deepEqual(moved, [['/en/about', '2026-12-24']]);
  assert.notEqual(stateOf(later)['/en/about'].hash, stateOf(first)['/en/about'].hash);
  assert.deepEqual(stateOf(later)['/about'], stateOf(first)['/about'], 'the Arabic page did not change');

  // A change in both languages moves both, and still nothing else.
  const both = {
    ...loaded,
    workflows: loaded.workflows.map((w) => (w.id === 'unified-inbox' ? { ...w, outcome: { en: 'A new outcome.', ar: 'نتيجة جديدة.' } } : w)),
  };
  const movedBoth = Object.entries(lastmods(build('2027-01-05', stateOf(first), both))).filter(([, date]) => date !== DAY).map(([a]) => a);
  assert.ok(movedBoth.includes('/en/automation/unified-inbox') && movedBoth.includes('/automation/unified-inbox'));
  assert.ok(movedBoth.every((a) => /automation|^\/(en\/)?$/.test(a)), `a page that does not show the system moved: ${movedBoth}`);
  assert.ok(!movedBoth.includes('/en/about') && !movedBoth.includes('/en/contact') && !movedBoth.includes('/en/projects/khatm'));

  // The API files say when they were generated: the day the newest page changed.
  assert.equal(JSON.parse(first.get('api/profile.json')).generated, `${DAY}T00:00:00+03:00`);
  assert.equal(JSON.parse(later.get('api/profile.json')).generated, '2026-12-24T00:00:00+03:00');
});

test('a new stylesheet, script or CV moves no date: only what a page says counts', () => {
  const first = build(DAY);
  const assetVersions = Object.fromEntries(Object.keys(loaded.assetVersions).map((path) => [path, 'deadbeef']));
  const later = build('2026-12-24', stateOf(first), { ...loaded, assetVersions });
  // The pages did change: the contact page links the CV by its fingerprint.
  assert.notEqual(later.get('en/contact.html'), first.get('en/contact.html'));
  assert.ok(later.get('en/contact.html').includes('.pdf?v=deadbeef'));
  assert.equal(later.get('sitemap.xml'), first.get('sitemap.xml'));
  assert.equal(later.get(LASTMOD_FILE), first.get(LASTMOD_FILE));

  // The year in the footer is the build's, and is not part of what a page says.
  const nextYear = build('2027-01-01', stateOf(first));
  assert.notEqual(nextYear.get('en/about.html'), first.get('en/about.html'));
  assert.equal(nextYear.get('sitemap.xml'), first.get('sitemap.xml'));
});

test('the profile date set by hand moves the home pages, and only them', () => {
  const first = build(DAY);
  const later = build('2027-02-03', stateOf(first), { ...loaded, profile: { ...loaded.profile, updated: '2027-02-03' } });
  const moved = Object.entries(lastmods(later)).filter(([, date]) => date !== DAY);
  assert.deepEqual(moved.sort(), [['/', '2027-02-03'], ['/en/', '2027-02-03']]);
});

test('a page that is new is dated the day it appears, and one that is gone leaves the state', () => {
  const first = build(DAY);
  const fewer = { ...loaded, projects: loaded.projects.filter((p) => p.id !== 'mcp-search-server') };
  const without = build(DAY, undefined, fewer);
  assert.ok(!('/en/projects/mcp-search-server' in stateOf(without)));

  const back = build('2026-12-24', stateOf(without));
  assert.equal(stateOf(back)['/en/projects/mcp-search-server'].date, '2026-12-24');
  assert.equal(stateOf(back)['/projects/mcp-search-server'].date, '2026-12-24');
  assert.equal(stateOf(back)['/en/contact'].date, DAY);
  assert.ok(detailPages(loaded).some((d) => d.id === 'mcp-search-server') && first.has('en/projects/mcp-search-server.html'));
});

test('the pieces of the date mechanism are pure and say what they do', () => {
  const page = (main, extra = '') => `<head><title>T</title><meta name="description" content="D">${extra}</head><body><nav>menu</nav><main id="main">${main}</main><footer>© 2026</footer></body>`;
  const hash = pageFingerprint(page('<p>one</p>'));
  assert.match(hash, /^[0-9a-f]{16}$/);
  assert.equal(pageFingerprint(page('<p>one</p>')), hash);
  assert.notEqual(pageFingerprint(page('<p>two</p>')), hash, 'the content');
  assert.notEqual(pageFingerprint(page('<p>one</p>').replace('<title>T', '<title>U')), hash, 'the title');
  assert.notEqual(pageFingerprint(page('<p>one</p>').replace('content="D"', 'content="E"')), hash, 'the description');
  assert.notEqual(pageFingerprint(page('<p>one</p>', '<script type="application/ld+json">{"a":1}</script>')), hash, 'the structured data');
  // Not content: the menu, the footer, a stylesheet, a fingerprint.
  assert.equal(pageFingerprint(page('<p>one</p>').replace('menu', 'other menu').replace('© 2026', '© 2027')), hash);
  assert.equal(pageFingerprint(page('<p>one</p>', '<link rel="stylesheet" href="/a.css?v=12345678">')), hash);
  assert.equal(pageFingerprint(page('<a href="/cv.pdf?v=aaaaaaaa">cv</a>')), pageFingerprint(page('<a href="/cv.pdf?v=bbbbbbbb">cv</a>')));

  const pages = [{ address: '/a', html: page('a') }, { address: '/b', html: page('b') }];
  const state = stampPages(pages, {}, '2026-01-01');
  assert.deepEqual(pageDates(state), { '/a': '2026-01-01', '/b': '2026-01-01' });
  const next = stampPages([{ address: '/a', html: page('a') }, { address: '/b', html: page('b, edited') }], state, '2026-02-02');
  assert.deepEqual(pageDates(next), { '/a': '2026-01-01', '/b': '2026-02-02' });
  assert.equal(latestChange(next), '2026-02-02');
  // No day to give: a changed page carries none, and the sitemap leaves it out.
  assert.deepEqual(pageDates(stampPages(pages)), {});
  assert.equal(latestChange(stampPages(pages)), null);
  assert.ok(!buildSite(loaded).get('sitemap.xml').includes('lastmod'), 'a date appeared that nobody gave');
  // One page per line, in a stable order, and it reads back as it was written.
  assert.deepEqual(JSON.parse(serializeState(next)), next);
  assert.equal(serializeState(next).split('\n').length, 5);
  assert.ok(!/new Date|Date\.now/.test(readFileSync('scripts/lib/lastmod.mjs', 'utf8')), 'lastmod.mjs reads the clock');
});

/* The state is committed with the pages. If it and the pages ever part, the
   dates in the sitemap are no longer the days the pages changed. */
test('the committed state matches the committed pages and sitemap', () => {
  const state = JSON.parse(readFileSync(LASTMOD_FILE, 'utf8'));
  const sitemap = readFileSync('sitemap.xml', 'utf8');
  assert.ok(!/<priority>|<changefreq>/.test(sitemap));
  for (const lang of LANGS) {
    for (const page of sitePages(db)) {
      const address = pagePath(page, lang);
      assert.ok(state[address], `${LASTMOD_FILE}: no entry for ${address}; run npm run build`);
      assert.match(state[address].date, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(sitemap, new RegExp(`<loc>${site}${address}</loc>(?:(?!</url>)[\\s\\S])*<lastmod>${state[address].date}</lastmod>`), address);
    }
  }
  assert.equal(Object.keys(state).length, sitePages(db).length * LANGS.length);
  assert.equal(PAGES.length > 0, true);
});
