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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadDb } from '../scripts/lib/load.mjs';
import { PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { buildSite, sitePages, pageFile } from '../scripts/lib/site.mjs';
import { detailPages } from '../scripts/lib/details.mjs';
import { shotAlt, tagsOf, aboutPortrait, ROBOTS_INDEXABLE, ROBOTS_NOINDEX } from '../scripts/lib/blocks.mjs';
import { LASTMOD_FILE, pageFingerprint, parseState, stampPages, pageDates, latestChange, serializeState } from '../scripts/lib/lastmod.mjs';
import { ogCardFields, renderOgCard } from '../scripts/lib/og.mjs';
import { hostedEntries, aiClosedPaths } from '../scripts/lib/hosting.mjs';
import {
  parseHeaders,
  parseRedirects,
  emDashHits,
  fingerprintedImages,
  PUBLIC_HAND_KEPT,
  relativeAddresses,
  searchHeadProblems,
  onHost,
  sitemapEntries,
  sitemapProblems,
  lastmodProblems,
  robotsGroups,
  robotsProblems,
} from '../scripts/lib/gates.mjs';

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

  // Stacked above the story it stands in the middle of the column, in either
  // direction; beside the story it goes back to the edge of its own column.
  const [stacked, wide] = rules.split('@media (min-width: 900px)');
  assert.match(stacked, /\.about-portrait \{[^}]*margin-inline: auto;/);
  assert.match(stacked, /\.about-portrait figcaption \{[^}]*text-align: center;/);
  assert.match(wide, /\.about-portrait \{[^}]*margin-inline: 0;/);
  assert.match(wide, /\.about-portrait figcaption \{ text-align: start; \}/);
});

/* The contact page scrolled sideways on a phone: one badge, "Riyadh and
   anywhere in Saudi Arabia (open to relocation)", was held to a single line
   wider than the screen. A badge longer than its row breaks inside itself. */
test('a badge may wrap, so a long one cannot push the page sideways', () => {
  const css = readFileSync('assets/css/components.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const badge = css.match(/\.badge \{[^}]*\}/)[0];
  assert.ok(!/white-space:\s*nowrap/.test(badge), '.badge is held to one line again');
  assert.match(badge, /max-inline-size: 100%;/);
  assert.match(css.match(/\.badges \{[^}]*\}/)[0], /flex-wrap: wrap;/);
  // The longest ones are on the contact page, where it showed.
  const longest = Math.max(...Object.values(db.profile.availability.areas).flat().map((a) => a.length));
  assert.ok(longest > 40, 'the badge that caused it is gone; the rule still stands');
});

/* Two of the roles on the Arabic contact page read in the wrong order: the
   rule that kept technology names left to right also turned an Arabic phrase
   that ends in a Latin name, so "n8n" stood before the words it closes. A
   badge now takes its direction from its own first letter. */
test('a badge reads in the direction of its own first letter', () => {
  const rule = readFileSync('assets/css/rtl.css', 'utf8').match(/\[dir='rtl'\] \.badge \{[^}]*\}/)[0];
  assert.match(rule, /unicode-bidi: plaintext;/);
  assert.ok(!/direction:\s*ltr/.test(rule), 'every badge is forced left to right again');
  // The case that showed it is still in the data: Arabic words first, a Latin name last.
  assert.ok(db.profile.availability.roles.ar.some((r) => /^[\u0600-\u06FF]/.test(r) && /[A-Za-z0-9.)]$/.test(r)));
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

  // What he is looking for is read role by role and place by place, on every
  // page whose node says it. That is the contact page, and no other: the
  // about page speaks of the roles in its own words, which is not the same
  // as showing them.
  const seeking = [];
  for (const { lang, page, at, doc } of everyPage) {
    const p = person(doc);
    if (!('seeks' in p)) continue;
    seeking.push(page);
    const text = visibleText(doc);
    assert.equal(p.seeks.name, db.profile.availability.roles[lang].join(', '), at);
    for (const role of db.profile.availability.roles[lang]) assert.ok(text.includes(role), `${at}: "${role}" is in the markup but not on the page`);
    assert.deepEqual(p.seeks.areaServed, db.profile.availability.areas[lang], at);
    // The month he became available is printed nowhere, so the markup does not say it either.
    assert.deepEqual(Object.keys(p.seeks).sort(), ['@type', 'areaServed', 'name'], `${at}: a value in seeks that the page does not print`);
    for (const area of p.seeks.areaServed) assert.ok(text.includes(area), `${at}: "${area}" is in the markup but not on the page`);
  }
  assert.deepEqual(seeking, ['contact', 'contact']);
  // The reason the about page does not carry it: not every role is printed there.
  for (const lang of LANGS) {
    const text = visibleText(html('about', lang));
    assert.ok(db.profile.availability.roles[lang].some((role) => !text.includes(role)), `${lang}: the about page now shows every role, so its node may say so`);
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
  assert.deepEqual(PUBLIC_HAND_KEPT, ['robots.txt', 'humans.txt', 'mcp/README.md']);
  for (const file of PUBLIC_HAND_KEPT) assert.ok(existsSync(file), `${file}: listed, but not there to be read`);
  // The description in package.json is not served, and is held to the rule all the same.
  assert.deepEqual(emDashHits(JSON.parse(readFileSync('package.json', 'utf8')).description), []);
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
/* The copies of other sites are on the sitemap by address only: they change
   in another repository, so this build has no date to give them
   (hosting.test.mjs). What is dated is every page the build writes. */
const copies = new Set(hostedEntries(loaded.hosting));
const lastmods = (built) =>
  Object.fromEntries(
    [...built.get('sitemap.xml').matchAll(/<url>([\s\S]*?)<\/url>/g)]
      .map(([, entry]) => [entry.match(/<loc>([^<]*)<\/loc>/)[1], entry.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1]])
      .filter(([address]) => !copies.has(address))
      .map(([address, date]) => [address.replace(site, ''), date]),
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

/* The state is committed with the pages. If it and the sitemap ever part,
   the dates in the sitemap are no longer the days the pages changed.

   This runs before the build (`npm run check` is test, build, validate), so
   it holds the committed files to one another and to nothing else. Whether
   there is an entry for every page of the data is checked after the build,
   by `validate`: asked here, it failed the first run after an entry was
   added to `data/`, before the build that would have written it. */
test('the committed state and the committed sitemap give the same dates', () => {
  const state = parseState(readFileSync(LASTMOD_FILE, 'utf8'));
  const sitemap = readFileSync('sitemap.xml', 'utf8');
  assert.ok(!/<priority>|<changefreq>/.test(sitemap));
  const dates = Object.fromEntries(sitemapEntries(sitemap).map((entry) => [entry.loc, entry.lastmod]));
  assert.ok(Object.keys(state).length >= PAGES.length * LANGS.length);
  for (const [address, kept] of Object.entries(state)) {
    assert.match(kept.hash, /^[0-9a-f]{16}$/, address);
    assert.match(kept.date, /^\d{4}-\d{2}-\d{2}$/, address);
    assert.equal(dates[`${site}${address}`], kept.date, `sitemap.xml and ${LASTMOD_FILE} disagree about ${address}; run npm run build`);
  }
  // Every dated entry of the sitemap is one the state vouches for.
  for (const [loc, date] of Object.entries(dates)) {
    if (date) assert.equal(state[loc.replace(site, '')]?.date, date, `${loc} is dated, but ${LASTMOD_FILE} does not know it`);
  }
});

/* A data file that gains an entry must not stop the tests before the build
   has had its turn: built in memory with one more project, everything this
   file checks about dates still holds against the state the build writes. */
test('an entry added to the data does not need the committed files to know it yet', () => {
  const committed = parseState(readFileSync(LASTMOD_FILE, 'utf8'));
  const more = { ...loaded, projects: [...loaded.projects, { ...loaded.projects.at(-1), id: 'one-more', name: 'One More', headline: { en: 'A page that is new today', ar: 'صفحة جديدة اليوم' } }] };
  const built = build('2027-03-01', committed, more);
  const state = stateOf(built);
  assert.equal(state['/en/projects/one-more'].date, '2027-03-01');
  assert.ok(!('/en/projects/one-more' in committed));
  assert.deepEqual(lastmodProblems(built.get('sitemap.xml'), state, LANGS.map((lang) => ({ address: pagePath('projects/one-more', lang), html: built.get(pageFile('projects/one-more', lang)) })), site), []);
});

/* ------------------------------------------- the state file, read strictly */

/* A state that cannot be read used to count as no state at all: every page
   was dated today, the build wrote that down, and nothing ever reported it.
   Only a file that is not there starts from nothing. */
test('only a missing state file starts from nothing; one that cannot be read stops the build', () => {
  assert.deepEqual(parseState(null), {});
  assert.deepEqual(parseState(undefined), {});
  assert.deepEqual(parseState('{}'), {});
  const kept = { '/en/about': { hash: '0123456789abcdef', date: '2026-11-15' } };
  assert.deepEqual(parseState(serializeState(kept)), kept);

  for (const broken of ['', '<<<<<<< HEAD\n{}\n=======\n{}\n>>>>>>> other', '{ "/en/about": { "hash": "0123', '{"a":1},']) {
    assert.throws(() => parseState(broken), /scripts\/lastmod\.json is not valid JSON[\s\S]*restore scripts\/lastmod\.json from git/, JSON.stringify(broken));
  }
  for (const wrong of ['null', '[]', '"2026-11-15"', '42', 'true']) {
    assert.throws(() => parseState(wrong), /does not hold one entry per page/, wrong);
  }

  // What reading such a file as "no state" would have done: one date for every page.
  const pages = [{ address: '/a', html: '<main id="main">a</main>' }, { address: '/b', html: '<main id="main">b</main>' }];
  const before = stampPages(pages, {}, '2026-01-01');
  for (const lost of [null, [], {}]) assert.deepEqual(pageDates(stampPages(pages, lost, '2026-09-09')), { '/a': '2026-09-09', '/b': '2026-09-09' });
  assert.deepEqual(pageDates(stampPages(pages, before, '2026-09-09')), { '/a': '2026-01-01', '/b': '2026-01-01' });

  // The build reads the file through it, and forgives nothing but a missing file.
  const script = readFileSync('scripts/build.mjs', 'utf8');
  const reader = script.slice(script.indexOf('function lastmodState()'), script.indexOf('function main()'));
  assert.match(reader, /err\.code !== 'ENOENT'\) throw/);
  assert.match(reader, /return parseState\(text\);/);
  assert.ok(!/catch \{\s*return \{\};/.test(reader), 'any failure to read the state is swallowed again');
});

/* ------------------------------------------ gates on what the build writes */

/* validate runs these on every page and on the sitemap. Each is fed the real
   output, which must pass, and then a broken one, which must not. */

test('the gate for relative addresses passes the pages and catches each kind', () => {
  for (const { at, doc } of everyPage) assert.deepEqual(relativeAddresses(doc), [], at);

  assert.deepEqual(relativeAddresses('<link rel="stylesheet" href="assets/css/base.css">'), ['href="assets/css/base.css"']);
  assert.deepEqual(relativeAddresses('<img src="../assets/img/nour.jpg" alt="">'), ['src="../assets/img/nour.jpg"']);
  assert.deepEqual(relativeAddresses('<a class="btn" href="about">About</a> <form action="send.php">'), ['href="about"', 'action="send.php"']);
  assert.deepEqual(relativeAddresses('<video poster="shot.png"></video><img srcset="a.png 2x" src="/a.png">'), ['poster="shot.png"', 'srcset="a.png 2x"']);
  // From the root, on another host, inside the page, or not an address to fetch.
  const fine = '<a href="/en/about">a</a><a href="https://example.com/x">b</a><a href="#main">c</a><a href="mailto:a@b.c">d</a><a href="tel:+1">e</a><img src="data:image/png;base64,AA==" alt="">';
  assert.deepEqual(relativeAddresses(fine), []);
});

test('the gate for the head of a page passes the pages and catches each way of leaving search', () => {
  const rules = { indexable: ROBOTS_INDEXABLE, noindex: ROBOTS_NOINDEX };
  for (const { lang, page, at, doc } of everyPage) {
    const own = page === '404' ? null : `${site}${pagePath(page, lang)}`;
    assert.deepEqual(searchHeadProblems(doc, { own, ...rules }), [], at);
  }

  const own = `${site}/en/projects/khatm`;
  const good = html('projects/khatm', 'en');
  const broken = (change) => searchHeadProblems(change(good), { own, ...rules });
  // A canonical that hands the page's place to the list, a second one, none at all.
  assert.match(broken((d) => d.replace(`<link rel="canonical" href="${own}">`, `<link rel="canonical" href="${site}/en/projects">`))[0], /canonical must be exactly .*\/en\/projects\/khatm, found .*\/en\/projects$/);
  assert.equal(broken((d) => d.replace('<link rel="canonical"', `<link rel="canonical" href="${site}/en/">\n<link rel="canonical"`)).length, 1);
  // A second one after the true one: the first is right, and there are still two.
  const twice = (second) => broken((d) => d.replace(`<link rel="canonical" href="${own}">`, `<link rel="canonical" href="${own}">\n<link rel="canonical" href="${second}">`));
  assert.deepEqual(twice(`${site}/en/projects`), [`canonical must be exactly ${own}, found ${own}, ${site}/en/projects`]);
  assert.deepEqual(twice(own), [`canonical must be exactly ${own}, found ${own}, ${own}`]);
  assert.match(broken((d) => d.replace(`<link rel="canonical" href="${own}">`, ''))[0], /found none/);
  assert.match(broken((d) => d.replace(own, `${own}.html`))[0], /canonical must be exactly/);
  // A noindex, a second robots meta, a robots meta that drops the large preview, none.
  assert.ok(broken((d) => d.replace(`content="${ROBOTS_INDEXABLE}"`, 'content="noindex, follow"')).some((p) => p.includes('carries noindex')));
  assert.match(broken((d) => d.replace('<meta name="robots"', '<meta name="robots" content="max-snippet:-1">\n<meta name="robots"'))[0], /expected one robots meta/);
  assert.match(broken((d) => d.replace(`content="${ROBOTS_INDEXABLE}"`, 'content="max-snippet:-1"'))[0], /expected one robots meta with "max-image-preview:large/);
  assert.match(broken((d) => d.replace(`<meta name="robots" content="${ROBOTS_INDEXABLE}">`, ''))[0], /found none/);

  // The 404 page: exactly one noindex, and no address named as its own.
  const lost = html('404', 'en');
  const brokenLost = (change) => searchHeadProblems(change(lost), { own: null, ...rules });
  assert.match(brokenLost((d) => d.replace(ROBOTS_NOINDEX, ROBOTS_INDEXABLE))[0], /must carry exactly one robots meta, "noindex, follow"/);
  assert.match(brokenLost((d) => d.replace('<meta name="robots"', '<meta name="robots" content="noindex">\n<meta name="robots"'))[0], /exactly one robots meta/);
  assert.match(brokenLost((d) => d.replace('</title>', `</title>\n<link rel="canonical" href="${site}/">`))[0], /carries a canonical/);
  assert.match(brokenLost((d) => d.replace('</title>', `</title>\n<link rel="alternate" hreflang="ar" href="${site}/">`))[0], /carries hreflang links/);
  assert.match(brokenLost((d) => d.replace('</title>', `</title>\n<meta property="og:url" content="${site}/">`))[0], /carries og:url/);
  // A page held to the wrong rule fails it: the two kinds cannot be confused.
  assert.ok(searchHeadProblems(lost, { own, ...rules }).length > 0 && searchHeadProblems(good, { own: null, ...rules }).length > 0);
});

test('the gate for the sitemap passes the build and catches a page missing, listed twice, or not a page', () => {
  const xml = files.get('sitemap.xml');
  const pages = LANGS.flatMap((lang) => sitePages(db).map((page) => `${site}${pagePath(page, lang)}`));
  const hosted = hostedEntries(db.hosting);
  const closed = [`${site}/sites/kept-out/`];
  const check = (text, over = {}) => sitemapProblems(text, { site, pages, hosted, closed, ...over });
  assert.deepEqual(check(xml), []);
  assert.equal(sitemapEntries(xml).length, pages.length + hosted.length);

  const url = (loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>\n`;
  const add = (loc) => xml.replace('</urlset>', `${url(loc)}</urlset>`);
  const about = `${site}/en/about`;
  // A page that is not listed, and one listed twice.
  assert.deepEqual(check(xml.replace(new RegExp(`  <url>\\s*<loc>${about}</loc>[\\s\\S]*?</url>\\n`), '')), [`sitemap.xml: ${about} must be listed exactly once`]);
  assert.deepEqual(check(add(about)), [`sitemap.xml: ${about} must be listed exactly once`]);
  // A page the data has and the sitemap does not know yet.
  assert.deepEqual(check(xml, { pages: [...pages, `${site}/en/projects/one-more`] }), [`sitemap.xml: ${site}/en/projects/one-more must be listed exactly once`]);
  // An address on this host that is neither a page nor the entry of a copy.
  for (const stray of [`${site}/en/about.html`, `${site}/en/projects/gone`, `${site}/data/profile.json`, `${site}/sites/aya-rady/about`, site]) {
    assert.deepEqual(check(add(stray)), [`sitemap.xml: lists ${stray}, which is neither a page the build writes nor the entry of a copy`], stray);
  }
  // The same host written another way is still this host: with http, with www, in
  // capitals, with a port, or with no host at all. None of these is the address of a page.
  const name = new URL(site).host;
  for (const stray of [`http://${name}/en/about`, `https://www.${name}/en/about`, `https://${name.toUpperCase()}/en/x`, `https://${name}:443/x`, `https://${name}:8443/en/about`, `//${name}/en/about`, '/en/about']) {
    assert.deepEqual(check(add(stray)), [`sitemap.xml: lists ${stray}, which is neither a page the build writes nor the entry of a copy`], stray);
  }
  const hosts = [
    [`${site}/en/about`, true],
    [`  http://WWW.${name.toUpperCase()}/  `, true],
    ['about', true],
    [`https://${name}.example.com/`, false],
    [`https://not${name}/`, false],
    [`https://wwwx${name}/`, false],
    ['https://example.com/', false],
    ['http://', false],
    [undefined, false],
  ];
  for (const [address, on] of hosts) assert.equal(onHost(address, site), on, String(address));
  // The same name with the closing dot of a fully qualified name is this host too.
  assert.equal(onHost(`https://${name}./en/about`, site), true);
  assert.deepEqual(check(add(`https://${name}./en/about`)), [`sitemap.xml: lists https://${name}./en/about, which is neither a page the build writes nor the entry of a copy`]);
  // An entry a crawler cannot read is not passed over as an address somewhere else:
  // one with no <loc>, and one whose <loc> is no address (a broken port, a bare scheme, a word).
  assert.deepEqual(check(xml.replace('</urlset>', '  <url>\n  </url>\n</urlset>')), ['sitemap.xml: 1 entry has no <loc>']);
  assert.deepEqual(check(xml.replace('</urlset>', '  <url>\n  </url>\n  <url><lastmod>2026-11-15</lastmod></url>\n</urlset>')), ['sitemap.xml: 2 entries have no <loc>']);
  for (const broken of [`https://${name}:abc/en/about`, `https://${name}:99999/en/about`, 'http://', 'ftp://example.com/file', 'mailto:someone@example.com']) {
    assert.deepEqual(check(add(broken)), [`sitemap.xml: lists "${broken}", which is not an address a crawler can read`], broken);
  }
  // A copy that is meant to be found and is not offered, and one kept out of search that is.
  if (hosted.length) assert.match(check(xml, { hosted: [...hosted, `${site}/sites/new-client/`] })[0], /sites\/new-client\/ must be listed exactly once \(data\/hosting\.json/);
  assert.deepEqual(check(add(`${site}/sites/kept-out/`)), [`sitemap.xml: lists ${site}/sites/kept-out/, but data/hosting.json keeps ${site}/sites/kept-out/ out of search`]);
  assert.match(check(add(`${site}/sites/kept-out/menu`))[0], /keeps .*\/sites\/kept-out\/ out of search/);
  // A copy whose client has still to confirm is not submitted either, by its entry or by a page behind it.
  const asked = `${site}/sites/asked/`;
  assert.deepEqual(check(add(asked), { pending: [asked] }), [
    `sitemap.xml: lists ${asked}, but the entry of ${asked} in data/hosting.json still carries a todo: a copy is not submitted before its client has confirmed`,
  ]);
  assert.match(check(add(`${asked}menu`), { pending: [asked] })[0], /still carries a todo/);
  // The data has such copies today, and none of them is in the sitemap the build writes.
  const open = db.hosting.sites.filter((s) => s.index !== false && s.todo).map((s) => `${site}/${s.path}/`);
  assert.deepEqual(check(xml, { pending: open }), []);
  for (const address of open) assert.match(check(add(address), { pending: open })[0], /still carries a todo/);
  // Another host is not this gate's business; the two tags Google ignores are.
  assert.deepEqual(check(add('https://example.com/')), []);
  assert.deepEqual(check(xml.replace('</loc>', '</loc>\n    <priority>0.8</priority>')), ['sitemap.xml: carries <priority> or <changefreq>, which Google ignores']);
  assert.equal(check(xml.replace('</loc>', '</loc>\n    <changefreq>daily</changefreq>')).length, 1);
});

test('the gate for the dates passes the build and catches a page, a state or a sitemap that moved alone', () => {
  const first = build(DAY);
  const xml = first.get('sitemap.xml');
  const state = stateOf(first);
  const pages = LANGS.flatMap((lang) => sitePages(db).map((page) => ({ address: pagePath(page, lang), html: first.get(pageFile(page, lang)) })));
  assert.deepEqual(lastmodProblems(xml, state, pages, site), []);

  const about = pages.find((p) => p.address === '/en/about');
  const only = (change) => lastmodProblems(change.xml ?? xml, change.state ?? state, [change.page ?? about], site);
  // The page was edited by hand after the build.
  assert.deepEqual(only({ page: { ...about, html: about.html.replace('</main>', '<p>One more line.</p></main>') } }), [`${LASTMOD_FILE}: /en/about has changed since its date was recorded; run npm run build`]);
  // The state lost the page, lost its date, or was given another one.
  const { '/en/about': kept, ...rest } = state;
  assert.deepEqual(only({ state: rest }), [`${LASTMOD_FILE}: no entry for /en/about; run npm run build`]);
  assert.ok(only({ state: { ...rest, '/en/about': { hash: kept.hash } } }).some((p) => p === `${LASTMOD_FILE}: /en/about has no date`));
  assert.deepEqual(only({ state: { ...rest, '/en/about': { ...kept, date: '2026-01-01' } } }), [`sitemap.xml: lastmod of /en/about is ${DAY}, but its content last changed on 2026-01-01`]);
  assert.match(only({ state: { ...rest, '/en/about': { ...kept, hash: 'ffffffffffffffff' } } })[0], /has changed since its date was recorded/);
  // The sitemap was edited: another day, or no day.
  const entry = new RegExp(`(<loc>${site}/en/about</loc>\\s*)<lastmod>${DAY}</lastmod>`);
  assert.deepEqual(only({ xml: xml.replace(entry, '$1<lastmod>2027-01-01</lastmod>') }), [`sitemap.xml: lastmod of /en/about is 2027-01-01, but its content last changed on ${DAY}`]);
  assert.deepEqual(only({ xml: xml.replace(entry, '$1') }), [`sitemap.xml: lastmod of /en/about is missing, but its content last changed on ${DAY}`]);
  // No state at all: every page is reported, not passed over.
  assert.equal(lastmodProblems(xml, {}, pages, site).length, pages.length);

  // validate hands each of these gates the real files.
  const validate = readFileSync('scripts/validate.mjs', 'utf8');
  for (const gate of ['relativeAddresses(html)', 'searchHeadProblems(html,', 'sitemapProblems(xml,', 'lastmodProblems(xml, state,', "robotsProblems(readFileSync('robots.txt', 'utf8'),"]) assert.ok(validate.includes(gate), `validate.mjs no longer runs ${gate}`);
});

/* A robots.txt inside a folder has no force, so a client copy that asked
   crawlers of AI companies to stay out is closed at the root, in every group
   that names one. A search engine is never closed out of anything: a page it
   may not fetch cannot show it the noindex that keeps the page out of search. */
test('robots.txt keeps AI crawlers out of the copies that asked, and no search engine out of anything', () => {
  const robots = readFileSync('robots.txt', 'utf8').replace(/\r\n/g, '\n');
  const aiClosed = aiClosedPaths(db.hosting);
  const check = (text, closed = aiClosed) => robotsProblems(text, { aiClosed: closed });
  assert.deepEqual(check(robots), []);

  // The file as it is read: one group for everyone that closes nothing, and named groups that each close the same folders.
  const groups = robotsGroups(robots);
  const named = groups.filter((g) => !g.agents.includes('*'));
  assert.ok(aiClosed.length >= 2 && named.length >= 10, 'nothing is closed or nobody is named, so this proves nothing');
  // The crawlers asked to stay out, each in a group of its own. The gate cannot
  // know who should be named, so dropping one has to be a decision made here.
  assert.deepEqual(named.map((g) => g.agents.join(' + ')), [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Amazonbot', 'cohere-ai', 'Claude-User',
    'Claude-SearchBot', 'Meta-ExternalFetcher', 'Bytespider', 'MistralAI-User', 'DuckAssistBot', 'MistralAI-Index',
    'MistralAI-Training', 'meta-webindexer', 'Amzn-SearchBot', 'Amzn-User',
  ]);
  assert.deepEqual(groups.filter((g) => g.agents.includes('*')).map((g) => g.rules), [[{ rule: 'allow', path: '/' }]]);
  // The Disallow lines come first: a parser that stops at the first line that matches must not meet "Allow: /" before them.
  for (const g of named) assert.deepEqual(g.rules, [...aiClosed.map((path) => ({ rule: 'disallow', path })), { rule: 'allow', path: '/' }], g.agents.join(', '));
  // The pages behind those folders exist, and every one of them is out of search by its own tag.
  for (const path of aiClosed) assert.ok(existsSync(`${path.slice(1)}index.html`), path);

  // One crawler forgotten, in one folder.
  const one = `Disallow: ${aiClosed[0]}`;
  const forgotten = robots.replace(one, '# gone');
  assert.deepEqual(check(forgotten), [`robots.txt: ${named[0].agents[0]} is not kept out of ${aiClosed[0]}, which data/hosting.json closes to the crawlers of AI companies`]);
  // "Allow: /" above the Disallow lines of one group.
  const first = named[0].agents[0];
  const disallows = aiClosed.map((path) => `Disallow: ${path}`).join('\n');
  const flipped = robots.replace(`User-agent: ${first}\n${disallows}\nAllow: /`, `User-agent: ${first}\nAllow: /\n${disallows}`);
  assert.notEqual(flipped, robots, 'the group to flip was not found, so this proves nothing');
  assert.deepEqual(check(flipped), [`robots.txt: ${first} has an Allow line above a Disallow line: a crawler that obeys the first line that matches reads the folders below it as open`]);
  // An Allow longer than "/" can open a closed folder again (the longest match wins, and Allow wins a tie).
  for (const opener of [`${aiClosed[0]}`, `${aiClosed[0]}index.html`, `${aiClosed[0]}*`, '/sites/']) {
    const reopened = robots.replace(`User-agent: ${first}\n${disallows}\nAllow: /`, `User-agent: ${first}\n${disallows}\nAllow: /\nAllow: ${opener}`);
    assert.deepEqual(check(reopened), [`robots.txt: ${first} carries "Allow: ${opener}": the only Allow a group of AI crawlers keeps is "Allow: /", which cannot open a closed folder`], opener);
  }
  // A search engine and an AI crawler in one group would share rules that must differ.
  assert.match(check(`${robots}\nUser-agent: Googlebot\nUser-agent: GPTBot\nAllow: /\n`)[0], /^robots\.txt: Googlebot, GPTBot share one group, but a search engine and the crawler of an AI company need different rules$/);
  // A copy that newly asks: every named group is told.
  assert.equal(check(robots, [...aiClosed, '/sites/new-preview/']).length, named.length);
  // A folder closed that no entry asks for.
  assert.deepEqual(check(robots.replace(one, `${one}\nDisallow: /sites/aya-rady/`)), [`robots.txt: ${named[0].agents[0]} is kept out of /sites/aya-rady/, which no entry of data/hosting.json asks for`]);
  // The group for everyone closes a folder: search engines could no longer read its noindex.
  assert.match(check(robots.replace('User-agent: *\nAllow: /', `User-agent: *\nAllow: /\nDisallow: ${aiClosed[0]}`))[0], /^robots\.txt: \* is kept out of .* cannot read its noindex$/);
  // A search engine named on its own is held to the same.
  assert.deepEqual(check(`${robots}\nUser-agent: Googlebot\nDisallow: ${aiClosed[0]}\n`), [`robots.txt: Googlebot is kept out of ${aiClosed[0]}: a search engine that may not fetch a page cannot read its noindex`]);
  assert.deepEqual(check(`${robots}\nUser-agent: Googlebot\nUser-agent: bingbot\nAllow: /\n`), []);
  // Names that share a group share its rules; a comment and an empty Disallow close nothing.
  const shared = `User-agent: *\nAllow: /\n\nUser-agent: GPTBot # one\nUser-agent: ClaudeBot\nDisallow:\n${aiClosed.map((path) => `Disallow: ${path} # asked`).join('\n')}\n`;
  assert.deepEqual(robotsGroups(shared).map((g) => g.agents), [['*'], ['GPTBot', 'ClaudeBot']]);
  assert.deepEqual(check(shared), []);
  // No group for everyone, or two; and a file that names no AI crawler while a copy asks.
  assert.match(check(robots.replace('User-agent: *\nAllow: /\n', ''))[0], /expected one group for every crawler .* found 0/);
  assert.deepEqual(check('User-agent: *\nAllow: /\n'), ['robots.txt: names no crawler of an AI company, so nothing keeps them out of the copies that asked for it']);
  assert.deepEqual(check('User-agent: *\nAllow: /\n', []), []);
});

/* Each browser script, read as the module it is. A syntax error in one of
   them leaves no part of main.js running and, before the guards in the head,
   left every [data-reveal] block hidden, with every other test green. */
test('every script under assets/js parses as a module, and main.js runs each part on its own', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.js')) files.push(path);
    }
  };
  walk('assets/js');
  assert.ok(files.includes('assets/js/main.js') && files.includes('assets/js/motion.js') && files.length >= 5, files.join(', '));
  assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).type, 'module', 'node --check would read the scripts as CommonJS');
  for (const file of files) {
    const run = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(run.status, 0, `${file}: ${run.stderr}`);
  }

  // Every part main.js imports is started through run(), which catches what it throws.
  const main = readFileSync('assets/js/main.js', 'utf8');
  assert.match(main, /const run = \(part\) => \{\n {2}try \{\n {4}part\(\);\n {2}\} catch \(error\) \{\n {4}console\.error\(error\);\n {2}\}\n\};/);
  const imported = [...main.matchAll(/^\s+(init\w+),?$/gm)].map((m) => m[1]);
  const started = main.match(/\[([^\]]+)\]\.forEach\(run\);/)[1].split(',').map((s) => s.trim());
  const own = [...main.matchAll(/^function (init\w+)\(/gm)].map((m) => m[1]);
  assert.deepEqual([...started].sort(), [...imported, ...own].sort(), 'a part is started outside run(), or not at all');
  assert.ok(!/^init\w+\(\);$/m.test(main), 'a part is called bare, so its error stops the ones after it');
  assert.match(main, /forEach\(\(canvas\) => run\(\(\) => createWorkflowBackground\(canvas\)\)\)/);

  // The Arabic alt text of a canvas keeps its direction inside the frame that does not.
  const rtl = readFileSync('assets/css/rtl.css', 'utf8');
  assert.match(rtl, /\[dir='rtl'\] \.canvas-shot__scroll img,\n\[dir='rtl'\] \.lightbox__body img \{\n {2}direction: rtl;\n\}/);

  // validate fails, not warns, on robots.txt and on what a stopped sync leaves.
  const validate = readFileSync('scripts/validate.mjs', 'utf8');
  assert.ok(validate.includes("for (const problem of robotsProblems(readFileSync('robots.txt', 'utf8'), { aiClosed: aiClosedPaths(db.hosting) })) fail(problem);"));
  assert.match(validate, /for \(const folder of leftoverFolders\(db\.hosting\)\) \{\n {4}if \(!folder\.startsWith\('sites\/'\) && existsSync\(folder\)\) \{\n {6}fail\(/);
});
