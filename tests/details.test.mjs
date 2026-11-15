/**
 * A page of its own for every project and every automation system.
 *
 * The list pages describe many things at once, so none of them can answer a
 * search for one of them. These tests hold the detail pages to what makes
 * them worth an address: the right set of entries, one clean address each in
 * both languages, a title and a description no other page shares, a head
 * that agrees with the sitemap, and a body that says everything the data
 * holds and nothing it does not.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadDb } from '../scripts/lib/load.mjs';
import { PAGES, LANGS, pagePath, X_DEFAULT } from '../scripts/lib/sitemap.mjs';
import { buildSite, sitePages, pageFile } from '../scripts/lib/site.mjs';
import {
  DETAIL_FOLDERS,
  ENGINE_ANCHOR,
  TITLE_ROOM,
  DESCRIPTION_ROOM,
  detailPages,
  detailName,
  detailHeadline,
  detailTitle,
  detailDescription,
  detailImage,
  clip,
  engineOf,
  productOf,
  hasOwnPage,
  projectHref,
  systemHref,
  relatedProjects,
  relatedSystems,
  staleDetailFiles,
} from '../scripts/lib/details.mjs';
import { imageSize } from '../scripts/lib/image-size.mjs';
import { flowOrder } from '../scripts/lib/diagram.mjs';
import { checkRedirects } from '../scripts/lib/gates.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';
import { buildApiProjects } from '../scripts/lib/api.mjs';
import { yearOf } from '../scripts/lib/blocks.mjs';

const loaded = loadDb('data');
const db = { ...loaded, build: { modified: '2026-11-15T00:00:00+03:00' } };
const site = db.profile.site;

/** Every file the build writes, by its path from the site root. */
const files = buildSite(db);
const details = detailPages(db);
const html = (page, lang) => files.get(pageFile(page, lang));

/** Every page that has an address, as `{ lang, page, address, html }`. */
const everyPage = LANGS.flatMap((lang) =>
  sitePages(db).map((page) => ({ lang, page, address: `${site}${pagePath(page, lang)}`, html: html(page, lang) })),
);

/** Every JSON-LD node on a page, flattened out of its @graph. */
function ldNodes(doc) {
  return [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(([, json]) => {
    const parsed = JSON.parse(json.replaceAll('<\\/', '</'));
    return parsed['@graph'] ?? [parsed];
  });
}

const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/**
 * What a visitor can read: the body, without scripts, tags or attributes,
 * and without the notes that are there for a screen reader only.
 */
function visibleText(doc) {
  return unescape(
    doc
      .slice(doc.indexOf('<body>'))
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<span class="visually-hidden">[^<]*<\/span>/g, '')
      // A link inside a sentence adds no space around the name it wraps.
      .replace(/<\/?(?:a|em|b|strong)\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();
const titleOf = (doc) => unescape(doc.match(/<title>([^<]*)<\/title>/)[1]);
const descriptionOf = (doc) => unescape(doc.match(/<meta name="description" content="([^"]*)"/)[1]);
const metaOf = (doc, property) => doc.match(new RegExp(`<meta property="${property}" content="([^"]*)">`))?.[1];
const mainOf = (doc) => doc.slice(doc.indexOf('<main'), doc.indexOf('</main>'));

/** The hreflang set of a page's head, as `{ ar, en, 'x-default' }`. */
const alternatesOf = (doc) =>
  Object.fromEntries([...doc.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]));

const SYSTEM_PAGES = [
  'teacher-assistant-bot',
  'telegram-publisher',
  'unified-inbox',
  'google-review-reply',
  'ai-job-match',
  'receipt-verify',
  'whatsapp-booking',
  'whatsapp-group',
  'social-auto-publisher',
  'smart-lead-finder',
  'lesson-quality-evaluator',
  'ai-email-campaign',
];

/* ------------------------------------------------------ which entries */

/* Every project has a page. A workflow has one when it has both a curated
   flow and a canvas, unless it is the engine of a product: then it is shown
   on that product's page, so one thing is not described at two addresses. */
test('the detail pages are every project, and every system with a flow and a canvas that is not a product engine', () => {
  assert.deepEqual(details.filter((d) => d.kind === 'project').map((d) => d.id), db.projects.map((p) => p.id));
  assert.deepEqual(details.filter((d) => d.kind === 'system').map((d) => d.id), SYSTEM_PAGES);

  const engines = Object.fromEntries(db.projects.filter((p) => p.workflow).map((p) => [p.id, p.workflow]));
  assert.deepEqual(engines, {
    'smart-scanner': 'smart-scanner-pipeline',
    'cv-screener': 'cv-screener',
    'universal-web-scraper': 'universal-web-scraper',
  });

  for (const w of db.workflows) {
    const product = productOf(db, w);
    assert.equal(hasOwnPage(db, w), Boolean(w.flow && w.canvas && !product), w.id);
    if (product) assert.equal(engineOf(db, product), w, `${w.id}: the pairing does not read back`);
  }
  // No flow and no canvas: nothing to show that its card does not show.
  const cleaner = db.workflows.find((w) => w.id === 'crm-lead-cleaner');
  assert.ok(!cleaner.flow && !cleaner.canvas && !hasOwnPage(db, cleaner));

  for (const d of details) {
    assert.equal(d.page, `${d.parent}/${d.id}`);
    assert.ok(DETAIL_FOLDERS.includes(d.parent));
    assert.match(d.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${d.id}: an id is an address`);
  }
  assert.equal(new Set(details.map((d) => d.page)).size, details.length);
});

/* The pairing and the headline are typed by hand in data/. A wrong one must
   stop the build, not print "undefined" or write two pages to one address. */
test('the loader refuses a pairing or a headline it cannot use', () => {
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-data-'));
  try {
    const load = (change) => {
      cpSync('data', dir, { recursive: true });
      const projects = JSON.parse(readFileSync('data/projects.json', 'utf8'));
      const workflows = JSON.parse(readFileSync('data/workflows.json', 'utf8'));
      change(projects, workflows);
      writeFileSync(join(dir, 'projects.json'), JSON.stringify(projects));
      writeFileSync(join(dir, 'workflows.json'), JSON.stringify(workflows));
      return loadDb(dir);
    };

    assert.doesNotThrow(() => load(() => {}));
    assert.throws(() => load((p) => { p[0].workflow = 'no-such-workflow'; }), /workflow "no-such-workflow" is not in workflows\.json/);
    assert.throws(() => load((p) => { p[3].workflow = p[0].workflow; }), /already belongs to smart-scanner/);
    assert.throws(() => load((p) => { delete p[0].headline.ar; }), /headline needs both "en" and "ar"/);
    assert.throws(() => load((p, w) => { delete w[2].headline.en; }), /headline needs both "en" and "ar"/);
    assert.throws(() => load((p) => { p[0].id = 'Smart Scanner'; }), /an id is lowercase letters, digits and hyphens/);
    assert.throws(() => load((p, w) => { w[1].id = w[0].id; }), /is used twice/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ---------------------------------------------------------- the files */

/* `projects/<id>.html` is served at /projects/<id>. `projects/<id>/index.html`
   would be served at an address ending in a slash, a second address for one
   page, and every link on the site names the first. */
test('every detail page is written once per language, as <id>.html and never <id>/index.html', () => {
  for (const d of details) {
    assert.equal(pageFile(d.page, 'ar'), `${d.parent}/${d.id}.html`);
    assert.equal(pageFile(d.page, 'en'), `en/${d.parent}/${d.id}.html`);
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      assert.ok(doc, `${lang}/${d.page}: not written`);
      assert.ok(doc.includes(`<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`), `${lang}/${d.page}: wrong language`);
    }
  }

  const generated = [...files.keys()].filter((f) => new RegExp(`^(en/)?(${DETAIL_FOLDERS.join('|')})/`).test(f));
  assert.equal(generated.length, details.length * LANGS.length);
  for (const f of generated) assert.match(f, /^(en\/)?(projects|automation)\/[a-z0-9-]+\.html$/, `${f}: not <id>.html`);

  // The list pages still sit beside the folders that share their name.
  for (const parent of DETAIL_FOLDERS) for (const lang of LANGS) assert.ok(files.has(pageFile(parent, lang)));
});

/* An entry that leaves the data leaves a page behind, still served and still
   in the index. The build removes it, and must never remove anything else. */
test('a stale detail page is removed, and only inside the four generated folders', () => {
  const staged = ['projects/khatm.html', 'en/projects/khatm.html', 'automation/unified-inbox.html', 'index.html'];
  const onDisk = [
    ...staged,
    'projects/gone.html',
    'en/projects/gone.html',
    'automation/gone.html',
    'en/automation/gone.html',
    // Not pages of ours to delete, wherever they are.
    'projects/notes.txt',
    'projects/gone/index.html',
    'en/gone.html',
    'about.html',
    'sites/projects/gone.html',
    'motion-studio/projects/gone.html',
    'assets/projects/gone.html',
  ];
  assert.deepEqual(staleDetailFiles(onDisk, staged), ['projects/gone.html', 'en/projects/gone.html', 'automation/gone.html', 'en/automation/gone.html']);
  assert.deepEqual(staleDetailFiles(staged, staged), []);
  assert.deepEqual(staleDetailFiles([], staged), []);
});

/* An address a page names relative to itself works from / and breaks one
   level down, and on the 404 page, which is served wherever it was asked for. */
test('no generated page names an asset or a page relative to itself', () => {
  const pages = [...files].filter(([path]) => path.endsWith('.html'));
  assert.ok(pages.length > details.length * LANGS.length);
  for (const [path, doc] of pages) {
    const relative = [...doc.matchAll(/\s(href|src|srcset|poster|action)="(?!https?:|mailto:|tel:|#|data:|\/)([^"]*)"/g)].map((m) => `${m[1]}="${m[2]}"`);
    assert.deepEqual(relative, [], `${path}: relative to the page`);
    assert.ok(!/url\((?!['"]?(?:#|\/|data:|https?:))/.test(doc), `${path}: a relative url() in a style`);
  }
  // The stylesheets, the script and the icons, from the root, at every depth.
  for (const lang of LANGS) {
    for (const page of ['', 'projects', 'projects/smart-scanner', 'automation/unified-inbox', '404']) {
      const doc = files.get(pageFile(page, lang));
      for (const asset of ['/assets/css/base.css?v=', '/assets/js/main.js?v=', '/assets/img/icon-32.png?v=', '/assets/img/nour-96.png?v=']) {
        assert.ok(doc.includes(`="${asset}`), `${lang}/${page}: ${asset}`);
      }
    }
    assert.ok(files.get(pageFile('chat', lang)).includes(`src="/assets/js/chat/boot.${lang}.js?v=`), `${lang}: the chat script`);
  }
});

/* ------------------------------------------------------------ the head */

test('the title is "<name>: <headline>", signed with his name only while it all fits', () => {
  const entry = (name, headline) => ({ kind: 'project', entry: { name, headline: { en: headline, ar: headline } } });
  const sign = ` | ${db.profile.name.en}`;

  assert.equal(detailTitle(db, entry('Khatm', 'Open-source invoicing'), 'en'), `Khatm: Open-source invoicing${sign}`);
  // Exactly at the limit it still fits; one character more and the name goes.
  const fits = 'x'.repeat(TITLE_ROOM - 'Khatm: '.length - sign.length);
  assert.equal(detailTitle(db, entry('Khatm', fits), 'en').length, TITLE_ROOM);
  assert.ok(detailTitle(db, entry('Khatm', fits), 'en').endsWith(sign));
  assert.equal(detailTitle(db, entry('Khatm', `${fits}x`), 'en'), `Khatm: ${fits}x`);
  // Without a search headline the category or the kind stands in.
  assert.equal(detailHeadline({ kind: 'project', entry: { category: { en: 'AI tooling' } } }, 'en'), 'AI tooling');
  assert.equal(detailHeadline({ kind: 'system', entry: { kind: { ar: 'بوت حجز' } } }, 'ar'), 'بوت حجز');

  for (const d of details) {
    for (const lang of LANGS) {
      const title = titleOf(html(d.page, lang));
      const plain = `${detailName(d, lang)}: ${detailHeadline(d, lang)}`;
      assert.equal(title, detailTitle(db, d, lang), `${lang}/${d.page}`);
      assert.ok(title === plain || (title === `${plain} | ${db.profile.name[lang]}` && title.length <= TITLE_ROOM), `${lang}/${d.page}: ${title}`);
      assert.equal(metaOf(html(d.page, lang), 'og:title'), html(d.page, lang).match(/<title>([^<]*)<\/title>/)[1]);
    }
  }
});

/* A product keeps its name in both languages: Smart Scanner is Smart Scanner
   on the Arabic page too, in the heading, the title and the markup. */
test('a product name is never translated or changed', () => {
  for (const d of details.filter((x) => x.kind === 'project')) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      assert.equal(detailName(d, lang), d.entry.name);
      assert.ok(titleOf(doc).startsWith(`${d.entry.name}: `), `${lang}/${d.page}: ${titleOf(doc)}`);
      assert.equal(unescape(doc.match(/<h1[^>]*>([^<]*)<\/h1>/)[1]), d.entry.name);
    }
  }
  assert.ok(db.projects.some((p) => p.name === 'Smart Scanner'));
});

test('a description is cut at a sentence end, or at a word with an ellipsis, and never runs over', () => {
  const a = 'One two three four five six seven eight nine ten eleven twelve thirteen.'; // 72
  const b = 'Fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one.'; // 71
  const c = 'This third sentence would take the whole text past the room there is.';

  // It all fits: nothing is cut.
  assert.equal(clip(`${a} ${b}`), `${a} ${b}`);
  // Whole sentences while they fit.
  assert.equal(clip(`${a} ${b} ${c}`), `${a} ${b}`);
  // The first sentence alone is too long: whole words, then an ellipsis.
  const long = `${'word '.repeat(40)}end.`;
  const cut = clip(long);
  assert.ok(cut.endsWith('word…') && cut.length <= DESCRIPTION_ROOM && cut.length > DESCRIPTION_ROOM - 6, cut);
  // One short opening sentence would leave most of the room empty: it goes on.
  const short = clip(`Short opener. ${long}`);
  assert.ok(short.startsWith('Short opener. word word') && short.endsWith('word…') && short.length <= DESCRIPTION_ROOM, short);
  // Half the room is enough: from there on a whole sentence is kept whole.
  assert.equal(clip(`${'x'.repeat(79)}. ${long}`), `${'x'.repeat(79)}.`);
  // A full stop inside a name is not the end of a sentence.
  assert.equal(clip('Parsed with GPT-4.1 Vision and saved. Next.', 40), 'Parsed with GPT-4.1 Vision and saved.');
  // Arabic ends a question with its own mark, and a clause with its own comma.
  assert.equal(clip('هل تعمل؟ نعم تعمل دائماً.', 12), 'هل تعمل؟');
  assert.equal(clip('كلمة أولى، كلمة ثانية وثالثة', 12), 'كلمة أولى…');
  assert.equal(clip('  spaced \n out  '), 'spaced out');

  for (const d of details) {
    for (const lang of LANGS) {
      const source = (d.kind === 'project' ? d.entry.tagline : d.entry.summary)[lang];
      const description = descriptionOf(html(d.page, lang));
      assert.equal(description, detailDescription(d, lang), `${lang}/${d.page}`);
      assert.ok(description.length > 40 && description.length <= DESCRIPTION_ROOM, `${lang}/${d.page}: ${description.length}`);
      assert.ok(description.endsWith('…') ? source.startsWith(description.slice(0, -1)) : source.startsWith(description), `${lang}/${d.page}: not the entry's own words`);
      assert.equal(unescape(metaOf(html(d.page, lang), 'og:description')), description);
    }
  }
});

/* Several pages under one title is the boilerplate Google warns about: it
   cannot tell them apart in a result, and neither can a reader. The 404
   pages are left out: they carry noindex and are in no result. */
test('no two pages share a title or a description', () => {
  const seen = { title: new Map(), description: new Map() };
  for (const { lang, page, html: doc } of everyPage) {
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(doc), `${lang}/${page}: a page with an address carries noindex`);
    for (const [kind, value] of [['title', titleOf(doc)], ['description', descriptionOf(doc)]]) {
      const at = `${lang}/${page || 'index'}`;
      assert.ok(value.trim().length > 0, `${at}: empty ${kind}`);
      assert.ok(!seen[kind].has(value), `${at} and ${seen[kind].get(value)} share the ${kind} "${value}"`);
      seen[kind].set(value, at);
    }
  }
  assert.equal(seen.title.size, (PAGES.length + details.length) * LANGS.length);
});

/* One address per page, everywhere a crawler looks, and each language
   version pointing at the other. Google ignores an hreflang pair that does
   not point both ways, and trusts a sitemap less when it contradicts the page. */
test('every page lists itself, the other language and x-default, the counterpart lists it back, and the sitemap agrees', () => {
  const written = new Map(everyPage.map((p) => [p.address, p]));
  assert.equal(written.size, everyPage.length);
  assert.equal(X_DEFAULT, 'en');

  const sitemap = files.get('sitemap.xml');
  const inSitemap = new Map(
    [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => [
      block.match(/<loc>([^<]*)<\/loc>/)[1],
      Object.fromEntries([...block.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((m) => [m[1], m[2]])),
    ]),
  );
  assert.deepEqual([...inSitemap.keys()].sort(), [...written.keys()].sort(), 'the sitemap and the pages written are not the same set');

  for (const { lang, page, address, html: doc } of everyPage) {
    const at = `${lang}/${page || 'index'}`;
    const other = lang === 'ar' ? 'en' : 'ar';
    const set = alternatesOf(doc);

    assert.deepEqual(Object.keys(set).sort(), ['ar', 'en', 'x-default'], at);
    assert.equal(set[lang], address, `${at}: does not list itself`);
    assert.equal(set[other], `${site}${pagePath(page, other)}`, `${at}: the other language`);
    assert.equal(set['x-default'], `${site}${pagePath(page, 'en')}`, `${at}: x-default is not the English version`);
    for (const target of Object.values(set)) {
      assert.ok(written.has(target), `${at}: lists ${target}, which the build did not write`);
      assert.ok(!target.includes('.html'), `${at}: ${target}`);
    }
    assert.deepEqual(alternatesOf(written.get(set[other]).html), set, `${at}: the counterpart does not list the same set back`);
    assert.deepEqual(inSitemap.get(address), set, `${at}: the sitemap gives a different set`);

    assert.deepEqual([...doc.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]), [address], `${at}: canonical`);
    assert.equal(metaOf(doc, 'og:url'), address, `${at}: og:url`);
  }
});

/* The switch in the header goes to the same page in the other language, and
   a visitor whose saved language differs from the link they followed is
   moved to that same page too, one level down, with its query and fragment. */
test('the language switch and the stored-language redirect work one level deeper', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const other = lang === 'ar' ? 'en' : 'ar';
      assert.ok(
        html(d.page, lang).includes(`<a class="lang-switch" href="${pagePath(d.page, other)}" lang="${other}" hreflang="${other}">`),
        `${lang}/${d.page}: the switch does not lead to the same page`,
      );
    }
  }

  // The script itself, run against an address and a saved choice.
  const script = html('projects/smart-scanner', 'en').match(/<script>\s*(\/\* Set before first paint[\s\S]*?)<\/script>/)[1];
  const land = (saved, pathname, search = '', hash = '') => {
    let moved = null;
    vm.runInNewContext(script, {
      document: { documentElement: { classList: { add() {} }, dataset: {} } },
      localStorage: { getItem: (key) => (key === 'nt-lang' ? saved : null) },
      location: { pathname, search, hash, replace: (to) => { moved = to; } },
    });
    return moved;
  };

  assert.equal(land('en', '/projects/smart-scanner'), '/en/projects/smart-scanner');
  assert.equal(land('ar', '/en/projects/smart-scanner'), '/projects/smart-scanner');
  assert.equal(land('en', '/automation/unified-inbox', '?from=card', '#overview'), '/en/automation/unified-inbox?from=card#overview');
  assert.equal(land('ar', '/en/projects/cv-screener', '', `#${ENGINE_ANCHOR}`), `/projects/cv-screener#${ENGINE_ANCHOR}`);
  // Already in the saved language, or no choice saved: nobody is moved.
  assert.equal(land('en', '/en/automation/unified-inbox'), null);
  assert.equal(land('ar', '/projects/khatm'), null);
  assert.equal(land(null, '/en/projects/khatm'), null);
  // The pages that existed before still behave as they did.
  assert.equal(land('en', '/'), '/en/');
  assert.equal(land('ar', '/en/'), '/');
  assert.equal(land('ar', '/en'), '/');
  assert.equal(land('en', '/about', '', '#faq'), '/en/about#faq');
});

/* --------------------------------------------------- the share picture */

/* A page is shared with a picture of the thing it is about when one suits a
   wide card, and the size announced beside it is the size of that file. */
test('og:image is the screenshot, a canvas of the right shape, or the share card, with its real size', () => {
  const expected = (d) => {
    if (d.kind === 'project' && d.entry.images?.desktop) return d.entry.images.desktop;
    const canvas = (d.kind === 'project' ? engineOf(db, d.entry) : d.entry)?.canvas;
    if (canvas) {
      const [w, h] = imageSize(readFileSync(canvas));
      if (w >= 1.5 * h && w <= 2.25 * h) return canvas;
    }
    return db.profile.ogImage;
  };

  const used = new Set();
  for (const d of details) {
    const path = expected(d);
    used.add(path === db.profile.ogImage ? 'card' : d.kind === 'project' && path === d.entry.images?.desktop ? 'screenshot' : 'canvas');
    assert.equal(detailImage(db, d)?.path ?? db.profile.ogImage, path, d.page);
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      assert.equal(metaOf(doc, 'og:image'), `${site}/${path}`, `${lang}/${d.page}`);
      assert.ok(doc.includes(`<meta name="twitter:image" content="${site}/${path}">`), `${lang}/${d.page}: twitter:image`);
      assert.ok(metaOf(doc, 'og:image:alt').length > 0);
    }
  }
  // All three cases really occur, so each branch of the rule is exercised.
  assert.deepEqual([...used].sort(), ['canvas', 'card', 'screenshot']);
  assert.equal(detailImage(db, details.find((d) => d.id === 'google-review-reply')).path, 'assets/img/workflows/google-review-reply.webp');

  // Every page, old and new: the size in the head is the size of the file.
  for (const { lang, page, html: doc } of everyPage) {
    const file = metaOf(doc, 'og:image').replace(`${site}/`, '');
    assert.ok(existsSync(file), `${lang}/${page}: ${file} is missing`);
    assert.deepEqual([Number(metaOf(doc, 'og:image:width')), Number(metaOf(doc, 'og:image:height'))], imageSize(readFileSync(file)), `${lang}/${page}: ${file}`);
  }
});

test('an image is measured from its own bytes', () => {
  const png = Buffer.alloc(32);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(630, 20);
  assert.deepEqual(imageSize(png), [1200, 630]);

  const webp = (chunk) => {
    const b = Buffer.alloc(32);
    b.write('RIFF', 0, 'latin1');
    b.write('WEBP', 8, 'latin1');
    b.write(chunk, 12, 'latin1');
    return b;
  };
  const extended = webp('VP8X');
  extended.writeUIntLE(1558, 24, 3);
  extended.writeUIntLE(740, 27, 3);
  assert.deepEqual(imageSize(extended), [1559, 741]);

  const lossy = webp('VP8 ');
  lossy.writeUInt16LE(1200, 26);
  lossy.writeUInt16LE(750, 28);
  assert.deepEqual(imageSize(lossy), [1200, 750]);

  const lossless = webp('VP8L');
  lossless.writeUInt32LE((389) | (843 << 14), 21);
  assert.deepEqual(imageSize(lossless), [390, 844]);

  assert.equal(imageSize(Buffer.from('not an image, whatever its name says')), null);
  assert.equal(imageSize(Buffer.alloc(4)), null);

  // The sizes typed into the data are the sizes of the files.
  for (const w of db.workflows.filter((x) => x.canvas)) {
    assert.deepEqual(w.canvasSize, imageSize(readFileSync(w.canvas)), `${w.id}: canvasSize is not the size of ${w.canvas}`);
    assert.deepEqual(db.imageSizes[w.canvas], w.canvasSize);
  }
});

/* ------------------------------------------------------ structured data */

test('each detail page carries a three-step breadcrumb, in the head and above the heading, saying the same', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const at = `${lang}/${d.page}`;
      const crumbs = ldNodes(doc).filter((n) => n['@type'] === 'BreadcrumbList');
      assert.equal(crumbs.length, 1, at);
      const steps = crumbs[0].itemListElement;
      assert.deepEqual(steps.map((s) => s.position), [1, 2, 3], at);
      assert.deepEqual(steps.map((s) => s.item), [`${site}${pagePath('', lang)}`, `${site}${pagePath(d.parent, lang)}`, `${site}${pagePath(d.page, lang)}`], at);
      assert.equal(steps[2].name, detailName(d, lang));

      const nav = doc.match(/<nav class="crumbs" aria-label="([^"]*)">([\s\S]*?)<\/nav>/);
      assert.ok(nav, `${at}: no visible breadcrumb`);
      assert.equal(unescape(nav[1]), db.copy[lang].ui.breadcrumb);
      const items = [...nav[2].matchAll(/<li(?: aria-current="page")?>(?:<a href="([^"]*)">)?([^<]*)(?:<\/a>)?<\/li>/g)];
      assert.deepEqual(items.map((m) => unescape(m[2])), steps.map((s) => s.name), `${at}: the trail on the page and the trail in the head differ`);
      assert.deepEqual(items.map((m) => m[1]), [pagePath('', lang), pagePath(d.parent, lang), undefined], `${at}: the last step is the page itself, not a link`);
      assert.ok(nav[2].includes(`<li aria-current="page">${doc.match(/<h1[^>]*>([^<]*)<\/h1>/)[1]}</li>`), at);
      // The trail comes before the heading it leads to.
      assert.ok(doc.indexOf('<nav class="crumbs"') < doc.indexOf('<h1'), at);
    }
  }
});

/* One node says what the page is about, in values the page shows. It is a
   CreativeWork: Google requires an offer and a rating before it accepts any
   of the application types, and the site states neither. */
test('the main node of a detail page is a CreativeWork made of what the page shows', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const at = `${lang}/${d.page}`;
      const url = `${site}${pagePath(d.page, lang)}`;
      const nodes = ldNodes(doc);
      const text = visibleText(doc);
      const main = nodes.filter((n) => n['@type'] === 'CreativeWork');
      assert.equal(main.length, 1, `${at}: expected one CreativeWork`);
      const node = main[0];
      const x = d.entry;

      assert.equal(node['@id'], `${url}#main`);
      assert.ok(doc.includes('<main id="main">'), `${at}: the node points at content that is not there`);
      assert.equal(node.url, url);
      assert.equal(node.name, detailName(d, lang));
      assert.equal(node.description, (d.kind === 'project' ? x.tagline : x.summary)[lang]);
      assert.deepEqual(node.author, { '@id': `${site}/#nour` });
      assert.equal(node.inLanguage, lang);
      assert.match(node.dateCreated, /^\d{4}$/);
      assert.equal(node.keywords, (d.kind === 'project' ? x.stack : x.services).join(', '));

      // Nothing in the markup that a visitor cannot read on the page.
      assert.ok(text.includes(node.name), `${at}: name`);
      assert.ok(text.includes(squash(node.description)), `${at}: description`);
      assert.ok(text.includes(node.dateCreated) && yearOf(x.year, lang).startsWith(node.dateCreated), `${at}: the year`);
      for (const word of node.keywords.split(', ')) assert.ok(text.includes(word), `${at}: keyword "${word}" is not on the page`);

      const picture = d.kind === 'project' ? x.images?.desktop : x.canvas;
      assert.equal(node.image, picture ? `${site}/${picture}` : undefined, `${at}: image`);
      if (picture) assert.ok(mainOf(doc).includes(`<img src="/${picture}`), `${at}: the image in the markup is not shown in the page`);

      // No type Google wants a price and a rating for, and neither invented.
      const types = nodes.map((n) => String(n['@type']));
      assert.deepEqual(types.sort(), ['BreadcrumbList', 'CreativeWork', 'Person', 'WebSite'], at);
      const all = JSON.stringify(nodes);
      for (const banned of ['SoftwareApplication', 'WebApplication', 'MobileApplication', 'FAQPage', '"offers"', '"price"', '"aggregateRating"', '"review"', 'LocalBusiness']) {
        assert.ok(!all.includes(banned), `${at}: ${banned}`);
      }
    }
  }
});

test('the list page names each entry by the address of its own page', () => {
  for (const lang of LANGS) {
    for (const parent of DETAIL_FOLDERS) {
      const list = ldNodes(html(parent, lang)).find((n) => n['@type'] === 'ItemList');
      for (const el of list.itemListElement) assert.deepEqual(Object.keys(el), ['@type', 'position', 'name', 'url'], `${lang}/${parent}`);

      for (const d of details.filter((x) => x.parent === parent)) {
        const node = ldNodes(html(d.page, lang)).find((n) => n['@type'] === 'CreativeWork');
        const item = list.itemListElement.find((el) => el.url === node.url);
        assert.ok(item, `${lang}/${d.page}: the list page does not point at this page`);
        assert.equal(item.name, node.name);
      }
    }
  }
});

/* ------------------------------------------------------------ the body */

test('a detail page has one heading, the name, with the search headline and the lead under it', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const at = `${lang}/${d.page}`;
      const x = d.entry;
      assert.equal((doc.match(/<h1[ >]/g) ?? []).length, 1, at);

      const hero = unescape(doc.match(/<section class="hero">[\s\S]*?<\/section>/)[0]);
      assert.ok(hero.includes(`<h1>${detailName(d, lang)}</h1>`), at);
      assert.ok(hero.includes(`<p class="hero__headline">${x.headline[lang]}</p>`), `${at}: headline`);
      assert.ok(hero.includes(`<p class="hero__intro">${(d.kind === 'project' ? x.tagline : x.summary)[lang]}</p>`), `${at}: lead`);
      assert.ok(hero.indexOf('<h1>') < hero.indexOf('hero__headline') && hero.indexOf('hero__headline') < hero.indexOf('hero__intro'), `${at}: order`);
      // What kind of thing it is, and the year, stay on the page beside the headline.
      assert.ok(hero.includes(`<span>${(d.kind === 'project' ? x.category : x.kind)[lang]}</span>`), `${at}: category`);
      assert.ok(hero.includes(`<span>${yearOf(x.year, lang)}</span>`), `${at}: year`);
      // The headline is for this page: the card on the list keeps its category.
      assert.ok(!html(d.parent, lang).includes(doc.match(/<p class="hero__headline">([^<]*)<\/p>/)[1]), `${at}: the headline leaked onto the list`);
    }
  }
  // Every entry with a page has a headline in both languages, and it holds no figure.
  for (const d of details) {
    for (const lang of LANGS) assert.ok(d.entry.headline?.[lang] && !/\d/.test(d.entry.headline[lang].replace(/n8n|B2B/g, '')), `${d.page}: headline (${lang})`);
  }
});

/* The headline is a claim in a search result. Each one is held to a phrase
   in the entry's own data, so it cannot say more than the entry does. */
test('the search headlines say no more than the data', () => {
  const says = (text, pattern, what) => assert.match(JSON.stringify(text), pattern, what);
  const p = Object.fromEntries(db.projects.map((x) => [x.id, x]));
  const w = Object.fromEntries(db.workflows.map((x) => [x.id, x]));

  says([engineOf(db, p['smart-scanner']).summary.en], /reads Arabic, English, and mixed documents/, 'Smart Scanner reads both languages');
  says([p['cv-screener'].built.en], /Arabic and English/, 'CV Screener handles both languages');
  says([p['universal-web-scraper'].tagline.en], /whole site out[\s\S]*Excel file/, 'the scraper fills an Excel file from a whole site');
  says([p['motion-studio'].tagline.en], /for free, in the browser/, 'Motion Studio is free and in the browser');
  says([p['braille-certificate'].tagline.en], /training certificate[\s\S]*Arabic Braille/, 'Braille certificates');
  says([p.khatm.tagline.en], /open-source e-invoicing program for businesses in Saudi Arabia/, 'Khatm');
  says([p['umrah-guide'].tagline.en, p['umrah-guide'].built.en], /offline/, 'the Umrah guide works offline');
  says([p['dfs-dashboard'].category.en, p['dfs-dashboard'].tagline.en], /Internal platform[\s\S]*CRM and quotation platform/, 'DFS is an internal CRM and quotation platform');
  assert.ok(!/custom/i.test(p['dfs-dashboard'].headline.en), 'the data calls the DFS platform internal, not custom');
  says([p.goldentag.tagline.en], /jewelry store management app shipped to the Google Play Store/, 'GoldenTag');
  says([p['business-card-extractor'].built.en], /saves straight to the phone/, 'the card lands in the contacts');
  says([p['mcp-search-server'].tagline.en], /lets an AI model query real data/, 'the MCP server');

  says([w['teacher-assistant-bot'].summary.en, w['teacher-assistant-bot'].services], /private tutor[\s\S]*Telegram/, 'tutor on Telegram');
  says([w['telegram-publisher'].summary.en], /publish posts to LinkedIn, Instagram and Reddit from a Telegram chat/, 'publishing from Telegram');
  says([w['unified-inbox'].summary.en], /every channel land in one inbox[\s\S]*draft reply/, 'one inbox with drafted replies');
  says([w['google-review-reply'].summary.en, w['google-review-reply'].highlights.en], /Google reviews[\s\S]*posted automatically/, 'review replies are automatic');
  says([w['ai-job-match'].summary.en, w['ai-job-match'].highlights.en], /daily search[\s\S]*Telegram[\s\S]*approval/, 'daily search with approval');
  says([w['receipt-verify'].summary.en], /bank-transfer receipt is read by a vision model/, 'receipts are read by vision');
  says([w['whatsapp-booking'].summary.en, w['whatsapp-booking'].kind.en], /WhatsApp buttons[\s\S]*Booking bot for shops/, 'bookings through buttons, for shops');
  says([w['whatsapp-group'].summary.en], /Excel or CSV of contacts[\s\S]*group is created, everyone is added/, 'a list becomes a group');
  says([w['social-auto-publisher'].summary.en], /captions for each platform and a branded image/, 'captions and branded images');
  says([w['smart-lead-finder'].summary.en], /B2B lead generation across the Saudi and Jordanian markets/, 'leads in two markets');
  says([w['lesson-quality-evaluator'].summary.en], /lesson videos[\s\S]*scoring teacher quality/, 'lessons are scored');
  says([w['ai-email-campaign'].summary.en], /Each contact gets an email written for them/, 'an email per contact');

  // The scraper is described by what it does, never by a site it was built against.
  for (const lang of LANGS) {
    const doc = html('projects/universal-web-scraper', lang);
    assert.ok(!/manhom/i.test(doc));
    assert.ok(!/\b[a-z0-9-]+\.(?:com|net|org|sa|io)\b/i.test(visibleText(doc).replace(/nouraldeentofi\.com/g, '')), `${lang}: the scraper page names a site`);
  }
});

test('a project page shows the problem, what he built, his role, the figures and the stack', () => {
  for (const d of details.filter((x) => x.kind === 'project')) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const main = unescape(mainOf(doc));
      const text = visibleText(doc);
      const c = db.copy[lang];
      const p = d.entry;
      const at = `${lang}/${d.page}`;

      const order = [c.ui.problem, c.ui.built, c.ui.role].map((label) => main.indexOf(`<h2 class="detail__title">${label}</h2>`));
      assert.ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2], `${at}: the three headings`);
      for (const part of [p.problem, p.built, p.role]) assert.ok(text.includes(squash(part[lang])), `${at}: a part of the text is missing`);
      if (p.context) assert.ok(text.includes(squash(p.context[lang])), `${at}: context`);

      for (const m of p.metrics ?? []) {
        assert.ok(main.includes(`<span class="proof__value" data-count>${m.value}</span><span class="proof__label">${m.label[lang]}</span>`), `${at}: ${m.value}`);
      }
      for (const tech of p.stack) assert.ok(main.includes(`<li class="badge">${tech}</li>`), `${at}: ${tech}`);

      const button = `<a class="btn" href="${p.url}" target="_blank" rel="noopener noreferrer">${c.ui.visitLive}`;
      assert.equal(doc.match(/<section class="hero">[\s\S]*?<\/section>/)[0].includes(button), Boolean(p.url), `${at}: the button to the live product`);
      assert.ok(!main.includes('href="null"') && !text.includes('undefined'), at);
    }
  }
});

/* The picture is in the page, in a figure, beside words that say what it
   is: that is what Google Images reads. A canvas is far wider than a page,
   so it scrolls inside its own frame and the page does not. */
test('screenshots and canvases are shown in the page, captioned, with their real size', () => {
  const sizeOf = (path) => imageSize(readFileSync(path));
  const imgTag = (doc, path) => doc.match(new RegExp(`<img src="/${path.replaceAll('.', '\\.')}[^"]*"[^>]*>`, 'g')) ?? [];

  for (const d of details) {
    for (const lang of LANGS) {
      const doc = mainOf(html(d.page, lang));
      const c = db.copy[lang];
      const at = `${lang}/${d.page}`;

      const shots = d.kind === 'project' ? d.entry.images : null;
      assert.equal(doc.includes('<figure class="shots"'), Boolean(shots), `${at}: screenshots figure`);
      if (shots) {
        const figure = unescape(doc.match(/<figure class="shots"[\s\S]*?<\/figure>/)[0]);
        assert.ok(figure.includes(`<figcaption class="shots__caption">${c.detail.shots.replace('{name}', d.entry.name)}</figcaption>`), `${at}: caption`);
        for (const path of [shots.desktop, shots.phone]) {
          const [w, h] = sizeOf(path);
          const tag = imgTag(figure, path);
          assert.equal(tag.length, 1, `${at}: ${path}`);
          assert.ok(tag[0].includes(` width="${w}" height="${h}"`), `${at}: ${path} is announced at a size it does not have`);
          assert.match(tag[0], / alt="[^"]{10,}"/);
        }
        // Before the text it illustrates.
        assert.ok(doc.indexOf('<figure class="shots"') < doc.indexOf('class="detail__title"'), `${at}: order`);
      }

      const w = d.kind === 'project' ? engineOf(db, d.entry) : d.entry;
      assert.equal(doc.includes('<figure class="canvas-shot'), Boolean(w?.canvas), `${at}: canvas figure`);
      if (!w?.canvas) continue;

      const name = w.name[lang];
      const caption = `${name}: ${c.ui.canvasCaption}`;
      const figure = unescape(doc.match(/<figure class="canvas-shot[\s\S]*?<\/figure>/)[0]);
      const [width, height] = sizeOf(w.canvas);
      const tag = imgTag(figure, w.canvas);
      assert.equal(tag.length, 1, at);
      assert.ok(tag[0].includes(` alt="${caption}" width="${width}" height="${height}"`), `${at}: ${tag[0]}`);
      assert.ok(figure.includes(`<figcaption class="canvas-shot__caption"><span>${caption}</span>`), `${at}: the caption does not name the system`);
      // The image sits in the frame that scrolls, which the keyboard can reach.
      assert.match(figure, /<div class="canvas-shot__scroll" role="group" aria-label="[^"]+" tabindex="0" style="--canvas-h:\d+px">\s*<img /, at);

      // The curated diagram is still there, and so is the full-size viewer.
      assert.ok(doc.includes(`<svg class="wf"`), `${at}: no diagram`);
      assert.ok(doc.includes(`<dialog class="lightbox" id="canvas-${w.id}"`), `${at}: the viewer is gone`);
      assert.ok(doc.includes(`data-dialog-open="canvas-${w.id}"`), `${at}: nothing opens the viewer`);
    }
  }

  // The frame scrolls sideways inside itself, in either direction of text.
  const css = readFileSync('assets/css/detail.css', 'utf8');
  const frame = css.match(/\.canvas-shot__scroll \{[^}]*\}/)[0];
  assert.match(frame, /overflow-x: auto;/);
  assert.match(frame, /direction: ltr;/);
  assert.match(css.match(/\.canvas-shot__scroll img \{[^}]*\}/)[0], /max-inline-size: none;/);
});

test('the stylesheet of the detail pages uses logical properties only, and only they load it', () => {
  const css = readFileSync('assets/css/detail.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/(^|[\s;{])(left|right|margin-left|margin-right|padding-left|padding-right|border-left|border-right)\s*:/m.test(css), 'a physical property');
  assert.ok(!/text-align:\s*(left|right)/.test(css) && !/float:/.test(css));
  assert.ok(!css.includes('—'));

  for (const lang of LANGS) {
    for (const page of sitePages(db)) {
      const doc = html(page, lang);
      const isDetail = page.includes('/');
      assert.equal(doc.includes('/assets/css/detail.css?v='), isDetail, `${lang}/${page}: detail.css`);
      if (isDetail) {
        assert.ok(doc.includes('/assets/css/gallery.css?v='), `${lang}/${page}: the components it reuses`);
        assert.ok(doc.indexOf('/assets/css/detail.css') < doc.indexOf('/assets/css/responsive.css'), `${lang}/${page}: the touch layout must load last`);
      }
    }
  }
});

test('a system page shows its status, who it is for, what it handles, how it works and the outcome', () => {
  for (const d of details.filter((x) => x.kind === 'system')) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const main = unescape(mainOf(doc));
      const text = visibleText(doc);
      const c = db.copy[lang];
      const w = d.entry;
      const at = `${lang}/${d.page}`;

      const hero = unescape(doc.match(/<section class="hero">[\s\S]*?<\/section>/)[0]);
      // The same honest status the list gives it, and the audience it was built for.
      assert.ok(hero.includes(`<span class="status status--${w.status}">${c.ui.status[w.status]}</span>`), `${at}: status`);
      assert.ok(html('automation', lang).includes(`<span class="status status--${w.status}">${unescape(c.ui.status[w.status])}</span>`));
      for (const a of w.audience) assert.ok(hero.includes(`<span>${c.automation.audiences[a]}</span>`), `${at}: audience ${a}`);

      const heads = [c.detail.handles, c.detail.how, c.ui.canvasCaption, c.ui.outcome].map((t) => main.indexOf(`<h2>${t}</h2>`));
      assert.ok(heads.every((i) => i > 0) && heads.every((i, n) => n === 0 || heads[n - 1] < i), `${at}: the parts, in order: ${heads}`);

      for (const h of w.highlights[lang]) assert.ok(text.includes(squash(h)), `${at}: a highlight is missing`);
      assert.ok(main.includes(`<dt>${c.ui.trigger}</dt><dd>${w.trigger[lang]}</dd>`), `${at}: trigger`);
      for (const s of w.services) assert.ok(main.includes(`<li class="badge">${s}</li>`), `${at}: ${s}`);
      assert.ok(text.includes(squash(w.outcome[lang])), `${at}: outcome`);

      // The flow, as text in the page: every step, numbered, in the order it runs.
      const list = main.match(/<ol class="steps steps--row detail__steps">[\s\S]*?<\/ol>/)[0];
      const steps = [...list.matchAll(/<span class="steps__num" aria-hidden="true">(\d+)<\/span>\s*<p>([^<]*?)(?: <span class="steps__service">([^<]*)<\/span>)?<\/p>/g)];
      const ordered = flowOrder(w.flow);
      assert.deepEqual(steps.map((m) => Number(m[1])), ordered.map((_, i) => i + 1), at);
      assert.deepEqual(steps.map((m) => m[2]), ordered.map((n) => n.label[lang]), `${at}: step labels`);
      assert.deepEqual(steps.map((m) => m[3]), ordered.map((n) => n.service), `${at}: step services`);
      assert.ok(main.indexOf('<ol class="steps') < main.indexOf('<svg class="wf"'), `${at}: the list comes before the diagram`);

      // How big it is, with the units, from the data.
      const count = main.match(/<span class="system__count">([\s\S]*?)<\/span>/)[1].replace(/<[^>]+>/g, '');
      assert.ok(count.includes(String(w.workflowCount)) && count.includes(String(w.nodeCount)), `${at}: ${count}`);
      assert.ok(count.includes(c.ui.nodesUnit) && count.includes(w.workflowCount === 1 ? c.ui.workflowUnit : c.ui.workflowsUnit), `${at}: ${count}`);
      assert.ok(!/\b1 workflows\b/.test(count), `${at}: "${count}"`);
    }
  }
});

test('the steps of a flow are listed after the steps that lead to them, otherwise as curated', () => {
  const node = (id) => ({ id });
  const ids = (flow) => flowOrder(flow).map((n) => n.id);

  // Already in order: left as it is.
  assert.deepEqual(ids({ nodes: ['a', 'b', 'c'].map(node), edges: [['a', 'b'], ['b', 'c']] }), ['a', 'b', 'c']);
  // A step written before the one that leads to it moves after it.
  assert.deepEqual(ids({ nodes: ['a', 'd', 'b', 'c'].map(node), edges: [['a', 'b'], ['b', 'c'], ['c', 'd']] }), ['a', 'b', 'c', 'd']);
  // Two triggers and a merge: each branch in the order it was curated.
  assert.deepEqual(ids({ nodes: ['a', 'b', 'x', 'm'].map(node), edges: [['a', 'b'], ['b', 'm'], ['x', 'm']] }), ['a', 'b', 'x', 'm']);
  assert.throws(() => flowOrder({ nodes: ['a', 'b'].map(node), edges: [['a', 'b'], ['b', 'a']] }), /cycle/);
  assert.throws(() => flowOrder({ nodes: ['a'].map(node), edges: [['a', 'z']] }), /unknown node/);

  for (const w of db.workflows.filter((x) => x.flow)) {
    const order = flowOrder(w.flow).map((n) => n.id);
    assert.deepEqual([...order].sort(), w.flow.nodes.map((n) => n.id).sort(), `${w.id}: a step was lost or repeated`);
    for (const [a, b] of w.flow.edges) assert.ok(order.indexOf(a) < order.indexOf(b), `${w.id}: ${b} is listed before ${a}`);
  }
});

/* The three workflows that are the engine of a product have no page of
   their own. Everything they have to say is on the product's page. */
test('a product page shows the automation behind it, and only a product with an engine has that section', () => {
  for (const d of details.filter((x) => x.kind === 'project')) {
    const w = engineOf(db, d.entry);
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const c = db.copy[lang];
      const at = `${lang}/${d.page}`;
      assert.equal(doc.includes(`<section class="section" id="${ENGINE_ANCHOR}">`), Boolean(w), at);
      assert.equal(visibleText(doc).includes(c.detail.engineTitle), Boolean(w), at);
      if (!w) continue;

      const block = unescape(doc.split(`<section class="section" id="${ENGINE_ANCHOR}">`)[1].split('</section>')[0]);
      const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      assert.ok(block.includes(`<h2>${c.detail.engineTitle}</h2>`), at);
      assert.ok(block.includes(`<span class="status status--${w.status}">${c.ui.status[w.status]}</span><span>${w.name[lang]}</span>`), `${at}: status and name`);
      assert.ok(text.includes(squash(w.summary[lang])), `${at}: summary`);
      for (const h of w.highlights[lang]) assert.ok(text.includes(squash(h)), `${at}: a highlight`);
      for (const n of flowOrder(w.flow)) assert.ok(text.includes(n.label[lang]), `${at}: step "${n.label[lang]}"`);
      assert.ok(text.includes(squash(w.outcome[lang])), `${at}: outcome`);
      // One level under the section's own heading.
      for (const part of [c.detail.handles, c.detail.how, c.ui.canvasCaption, c.ui.outcome]) {
        assert.ok(block.includes(`<h3 class="detail__title detail__title--part" data-reveal>${part}</h3>`), `${at}: ${part}`);
      }
      assert.ok(doc.indexOf('id="overview"') < doc.indexOf(`id="${ENGINE_ANCHOR}"`), `${at}: after the product itself`);
    }
  }
});

test('a detail page ends with its neighbours and the call to action', () => {
  for (const d of details) {
    const neighbours = d.kind === 'project' ? relatedProjects(db, d.entry) : relatedSystems(db, d.entry);
    for (const lang of LANGS) {
      const doc = unescape(html(d.page, lang));
      const c = db.copy[lang];
      const at = `${lang}/${d.page}`;

      assert.equal(doc.includes('<section class="section" id="more">'), neighbours.length > 0, `${at}: the neighbours section`);
      if (neighbours.length) {
        const block = doc.split('<section class="section" id="more">')[1].split('</section>')[0];
        assert.ok(block.includes(`<h2>${d.kind === 'project' ? c.detail.moreProjects : c.detail.moreSystems}</h2>`), at);
        const links = [...block.matchAll(/<h3 class="card__title"><a href="([^"]*)">([^<]*)<\/a><\/h3>/g)].map((m) => [m[1], m[2]]);
        assert.deepEqual(
          links,
          neighbours.map((x) => (d.kind === 'project' ? [projectHref(x, lang), x.name] : [systemHref(db, x, lang), x.name[lang]])),
          at,
        );
        assert.ok(!links.some(([to]) => to === pagePath(d.page, lang)), `${at}: links to itself`);
      }

      const last = doc.slice(doc.lastIndexOf('<section'), doc.indexOf('</main>'));
      assert.ok(last.includes('<div class="cta">') && last.includes(`<h2>${c.home.ctaTitle}</h2>`), `${at}: does not end with the call to action`);
      assert.ok(last.includes(`<a class="btn" href="${pagePath('contact', lang)}">${c.home.ctaButton}</a>`), at);
      assert.equal(doc.split('<div class="cta">').length - 1, 1, at);
    }
  }

  // Same group, never itself; same audience, and only what a reader can open.
  const scanner = db.projects.find((p) => p.id === 'smart-scanner');
  assert.ok(relatedProjects(db, scanner).length > 0 && relatedProjects(db, scanner).every((p) => p.group === 'ai' && p.id !== 'smart-scanner'));
  for (const w of db.workflows) {
    for (const other of relatedSystems(db, w)) {
      assert.ok(other.id !== w.id && other.audience.some((a) => w.audience.includes(a)));
      assert.notEqual(systemHref(db, other, 'en'), `/en/automation#${other.id}`, `${w.id}: offers ${other.id}, which has only a card`);
    }
  }
  assert.ok(!relatedSystems(db, db.workflows.find((w) => w.id === 'smart-lead-finder')).some((w) => w.id === 'crm-lead-cleaner'));
});

test('on a detail page the navigation marks the list page it belongs to, not a page it is not', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const c = db.copy[lang];
      for (const nav of [doc.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0], doc.match(/<nav class="mobile-tabs"[\s\S]*?<\/nav>/)[0]]) {
        assert.ok(!nav.includes('aria-current="page"'), `${lang}/${d.page}: a nav link claims to be this page`);
        assert.equal(nav.split('aria-current="true"').length - 1, 1);
        assert.ok(nav.includes(`<a href="${pagePath(d.parent, lang)}" aria-current="true">`), `${lang}/${d.page}: ${d.parent} is not marked`);
      }
      assert.ok(doc.includes(`aria-current="true">${c.nav[d.parent]}</a>`));
    }
  }
  // The highlight follows the attribute, whichever value it holds.
  const css = ['layout.css', 'responsive.css', 'rtl.css'].map((f) => readFileSync(`assets/css/${f}`, 'utf8')).join('\n');
  assert.ok(!css.includes("[aria-current='page']"), 'a style still asks for aria-current="page" only');
  assert.match(css, /\.site-nav a\[aria-current\]/);
  assert.match(css, /\.mobile-tabs a\[aria-current\]/);
});

/* ------------------------------------------------ everything that links */

test('every card on the list pages leads to its detail page, by its name and by a short link', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const projects = unescape(html('projects', lang));
    for (const p of db.projects) {
      const card = projects.split(` id="${p.id}">`)[1]?.split('</article>')[0];
      assert.ok(card, `${lang}: the card of ${p.id} lost its id`);
      const to = pagePath(`projects/${p.id}`, lang);
      assert.ok(card.includes(`<h3 class="card__title"><a href="${to}">${p.name}</a></h3>`), `${lang}: ${p.id} title`);
      assert.ok(card.includes(`<a class="btn btn--ghost" href="${to}">${c.ui.details}<span class="visually-hidden">: ${p.name}</span></a>`), `${lang}: ${p.id} details link`);
    }

    const automation = unescape(html('automation', lang));
    for (const w of db.workflows) {
      const card = automation.split(`class="card system${w.featured ? ' card--featured' : ''}" id="${w.id}">`)[1]?.split('</article>')[0];
      assert.ok(card, `${lang}: the card of ${w.id} lost its id`);
      const product = productOf(db, w);
      const to = hasOwnPage(db, w) ? pagePath(`automation/${w.id}`, lang) : product ? `${pagePath(`projects/${product.id}`, lang)}#${ENGINE_ANCHOR}` : null;
      if (to) {
        assert.equal(systemHref(db, w, lang), to);
        assert.ok(card.includes(`<h3 class="card__title"><a href="${to}">${w.name[lang]}</a></h3>`), `${lang}: ${w.id} title`);
        assert.ok(card.includes(`<a class="btn btn--ghost" href="${to}">${c.ui.details}<span class="visually-hidden">: ${w.name[lang]}</span></a>`), `${lang}: ${w.id} details link`);
      } else {
        // Nothing more to read than this card: no link that leads back to it.
        assert.ok(card.includes(`<h3 class="card__title">${w.name[lang]}</h3>`), `${lang}: ${w.id}`);
        assert.ok(!card.includes(c.ui.details), `${lang}: ${w.id} offers details it does not have`);
        assert.equal(systemHref(db, w, lang), `${pagePath('automation', lang)}#${w.id}`);
      }
    }
  }
});

test('the sitemap, the llms files and the API all name every detail page', () => {
  const sitemap = files.get('sitemap.xml');
  const short = buildLlmsTxt(db);
  const full = buildLlmsFullTxt(db);
  const api = buildApiProjects(db);

  assert.equal((sitemap.match(/<url>/g) ?? []).length, (PAGES.length + details.length) * LANGS.length);
  assert.ok(!sitemap.includes('.html'));

  const section = short.slice(short.indexOf('## A page for each project and system'), short.indexOf('## Projects'));
  assert.ok(short.indexOf('## Start here') < short.indexOf('## A page for each project and system'));
  assert.equal(section.split('\n').filter((l) => l.startsWith('- [')).length, details.length);

  for (const d of details) {
    for (const lang of LANGS) {
      const address = `${site}${pagePath(d.page, lang)}`;
      assert.equal(sitemap.split(`<loc>${address}</loc>`).length - 1, 1, `sitemap: ${address}`);
    }
    // The file agents are sent to names the English address, the name and what it is.
    const en = `${site}${pagePath(d.page, 'en')}`;
    assert.ok(section.includes(`- [${detailName(d, 'en')}](${en}): ${detailHeadline(d, 'en')}\n`), `llms.txt: ${d.page}`);
    assert.ok(full.includes(`**Page.** ${en}\n`), `llms-full.txt: ${d.page}`);

    const row = (d.kind === 'project' ? api.projects : api.workflows).find((x) => x.id === d.id);
    assert.deepEqual(row.page, { en, ar: `${site}${pagePath(d.page, 'ar')}` }, `api: ${d.page}`);
  }
  // A detail page ranks below the page that lists it.
  assert.match(sitemap, /<loc>[^<]*\/projects\/khatm<\/loc>[\s\S]*?<priority>0\.6<\/priority>/);

  // A workflow shown on its product's page names that page; one with only a card, the card.
  const row = (id) => api.workflows.find((x) => x.id === id).page.en;
  assert.equal(row('cv-screener'), `${site}/en/projects/cv-screener#${ENGINE_ANCHOR}`);
  assert.equal(row('crm-lead-cleaner'), `${site}/en/automation#crm-lead-cleaner`);
  assert.ok(full.includes(`**Page.** ${site}/en/projects/universal-web-scraper#${ENGINE_ANCHOR}\n`));
  assert.ok(!full.includes('/en/automation#crm-lead-cleaner'), 'a card is not a page to send a reader to');
  assert.ok(!short.includes('undefined') && !full.includes('undefined'));
});

/* ---------------------------------------------- nothing gets in the way */

/* Three ways a detail page can be taken out of search without anyone
   meaning to: a redirect rule that answers before the file, a noindex, and a
   canonical that hands the page's place to the list. */
test('no redirect, noindex or borrowed canonical stands between a detail page and a search', () => {
  const redirects = readFileSync('_redirects', 'utf8');
  assert.deepEqual(checkRedirects(redirects), []);
  for (const rule of ['/projects/*  /projects  302', '/automation/*  /automation  301', '/en/projects/*  /en/projects  301', '/en/automation/unified-inbox  /en/automation  302']) {
    const problems = checkRedirects(`${rule}\n${redirects}`);
    assert.ok(problems.some((p) => p.includes(rule.split(/\s+/)[0])), `"${rule}" went unnoticed`);
  }
  // The list pages themselves, and the old /ar/ tree, are not under a generated folder.
  assert.deepEqual(checkRedirects(`${redirects}\n/projects  /en/projects  302\n`), []);

  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      assert.ok(!/noindex/.test(doc), `${lang}/${d.page}: noindex`);
      const canonical = doc.match(/<link rel="canonical" href="([^"]*)">/)[1];
      assert.equal(canonical, `${site}${pagePath(d.page, lang)}`);
      assert.notEqual(canonical, `${site}${pagePath(d.parent, lang)}`, `${lang}/${d.page}: the canonical is the list page`);
      assert.ok(!doc.includes('http-equiv="refresh"'), `${lang}/${d.page}: redirects away`);
    }
  }
});

test('a detail page keeps the content rules of the whole site', () => {
  for (const d of details) {
    for (const lang of LANGS) {
      const doc = html(d.page, lang);
      const at = `${lang}/${d.page}`;
      const readable = doc.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
      assert.ok(!readable.includes('—'), `${at}: an em dash`);
      assert.ok(!/Alessa|ZATCA|Receipt Scanner|github\.io/i.test(doc), `${at}: something that is kept off the site`);
      assert.ok(!/\bTODO\b|>undefined<|href="(null|undefined|)"/.test(doc), `${at}: a placeholder`);
      assert.ok(!/\bagency\b|وكالة|شركة تصميم/i.test(`${titleOf(doc)} ${descriptionOf(doc)}`), `${at}: he is one person`);
      // External links open in a new tab, safely.
      for (const [tag] of doc.matchAll(/<a\s[^>]*href="https?:\/\/[^"]+"[^>]*>/g)) assert.match(tag, /target="_blank" rel="[^"]*noopener/, at);
    }
  }
  // The new labels are words, never figures: a number comes from the data.
  for (const lang of LANGS) {
    const c = db.copy[lang];
    for (const s of [...Object.values(c.detail), c.ui.details, c.ui.breadcrumb, c.ui.canvasOf, c.ui.allProjects, c.ui.allSystems, c.ui.allSites, c.ui.workflowUnit]) {
      assert.ok(!/\d/.test(s.replace(/n8n/g, '')) && !s.includes('—'), `${lang}: "${s}"`);
    }
  }
});

/* ----------------------------------------------------------- link text */

/* Read out of context, a link should still say where it goes. */
test('link text names the thing it leads to', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];

    // A client site is linked by its name; the new-tab hint stays for a screen reader.
    const showcase = unescape(html('showcase', lang));
    for (const s of db.showcase.sites) {
      const card = showcase.split(` id="${s.id}" data-reveal>`)[1].split('</li>')[0];
      const title = card.match(/<h3 class="card__title">([\s\S]*?)<\/h3>/)[1];
      if (s.url) {
        assert.equal(title, `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name[lang]}<span class="visually-hidden"> (${c.ui.opensInNewTab})</span></a>`, `${lang}: ${s.id}`);
      } else {
        assert.equal(title, s.name[lang], `${lang}: ${s.id} has no public address to link`);
      }
    }
    const lab = db.showcase.lab;
    assert.ok(showcase.includes(`<h3 class="card__title"><a href="${lab.url}" target="_blank" rel="noopener noreferrer">${lab.name[lang]}<span class="visually-hidden">`), `${lang}: the lab`);

    // The link to a canvas says whose canvas it is.
    assert.match(c.ui.canvasOf, /\{name\}/);
    const pages = [html('automation', lang), ...details.map((d) => html(d.page, lang))].map(unescape);
    const links = pages.flatMap((doc) => [...doc.matchAll(/<a class="canvas-open"[^>]*data-dialog-open="canvas-([^"]+)"[^>]*>([^<]*)</g)].map((m) => [m[1], m[2]]));
    assert.ok(links.length >= db.workflows.filter((w) => w.canvas).length * 2);
    for (const [id, text] of links) {
      const w = db.workflows.find((x) => x.id === id);
      assert.equal(text, c.ui.canvasOf.replace('{name}', w.name[lang]), `${lang}: the canvas link of ${id}`);
    }

    // The links beside the home page headings say what is behind them.
    const home = unescape(html('', lang));
    const more = (id) => home.split(`<section class="section" id="${id}">`)[1].split('</section>')[0].match(/<a class="section__more" href="([^"]*)">([^<]*)</).slice(1);
    assert.deepEqual(more('featured'), [pagePath('projects', lang), c.ui.allProjects]);
    assert.deepEqual(more('projects'), [pagePath('projects', lang), c.ui.allProjects]);
    assert.deepEqual(more('automation'), [pagePath('automation', lang), c.ui.allSystems]);
    assert.deepEqual(more('showcase'), [pagePath('showcase', lang), c.ui.allSites]);
  }
  assert.deepEqual([db.copy.en.ui.allProjects, db.copy.en.ui.allSystems, db.copy.en.ui.allSites], ['All projects', 'All systems', 'All websites']);
  assert.ok(!('seeAll' in db.copy.en.ui) && !('seeAll' in db.copy.ar.ui), 'a link that only says "see all" is back');
  for (const [, doc] of files) if (typeof doc === 'string') assert.ok(!/>See all<|>عرض الكل</.test(doc));
});
