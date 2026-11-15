/**
 * The pages as service pages.
 *
 * Search Console showed no impressions for any search about what he does,
 * because no page said it in the words people type: the headings were nav
 * labels and the phrases with real demand were nowhere in visible text. These
 * tests hold each page to what it now has to say, and hold every sentence of
 * it to the data it is built on.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { TEMPLATES, notFound } from '../scripts/lib/pages.mjs';
import { headMeta, monthYear, periodWords } from '../scripts/lib/blocks.mjs';
import { servicesLd } from '../scripts/lib/jsonld.mjs';
import { OFFERS, SERVICE_SYSTEMS, homeOffers, automationServices } from '../scripts/lib/offers.mjs';
import { PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { byCompany } from '../scripts/lib/experience.mjs';

const loaded = loadDb('data');
const db = { ...loaded, build: { modified: '2026-11-15T00:00:00+03:00' } };

const page = (name, lang, data = db) => TEMPLATES[name](data, lang);

/** Every JSON-LD node on a page, flattened out of its @graph. */
function ldNodes(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(([, json]) => {
    const parsed = JSON.parse(json.replaceAll('<\\/', '</'));
    return parsed['@graph'] ?? [parsed];
  });
}

const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** What a visitor can read: the body, without scripts, tags or attributes. */
function visibleText(html) {
  return unescape(
    html
      .slice(html.indexOf('<body>'))
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
}

const h1Of = (html) => unescape(html.match(/<h1[^>]*>([^<]*)<\/h1>/)[1]);
const titleOf = (head) => unescape(head.match(/<title>([^<]*)<\/title>/)[1]);
const descriptionOf = (head) => unescape(head.match(/<meta name="description" content="([^"]*)"/)[1]);

/** The ids of the page's sections, in order; the hero has none. */
const sectionIds = (html) => [...html.matchAll(/<section class="(?:section|hero)"(?: id="([^"]*)")?/g)].map((m) => m[1] ?? null);

/* ------------------------------------------------ titles and descriptions */

/* Each phrase is one people type into Google in Saudi Arabia. A title that
   loses it goes back to ranking for nothing. */
test('titles and descriptions carry the words people search for', () => {
  const expected = {
    en: {
      '': ['n8n automation', 'WhatsApp and Telegram bots', 'Arabic invoice extraction', 'Al Khobar, Saudi Arabia'],
      about: ['AI Automation Engineer in Al Khobar'],
      work: ['Technical Lead', 'Frontend Developer', 'React', 'Available immediately'],
      projects: ['Smart Scanner', 'CV Screener', 'Arabic invoices'],
      showcase: ['Website Design in Al Khobar and Dammam', 'Independent web developer', 'restaurants', 'Dhahran'],
      automation: ['n8n Developer', 'AI Automation in Saudi Arabia', 'Google review replies', 'CV screening'],
      contact: ['Hire Nour Aldeen Tofi'],
    },
    ar: {
      '': ['أتمتة الأعمال', 'بوتات واتساب وتيليجرام', 'قراءة الفواتير العربية', 'في الخبر بالسعودية'],
      about: ['في الخبر بالسعودية'],
      work: ['قائد تقني', 'مطوّر واجهات أمامية', 'متاح للعمل فوراً'],
      projects: ['برنامج لقراءة الفواتير', 'نظام لفرز السير الذاتية'],
      showcase: ['تصميم مواقع في الخبر والدمام', 'مطوّر مواقع مستقل', 'المطاعم', 'المنطقة الشرقية'],
      automation: ['مطوّر n8n', 'أتمتة الأعمال بالذكاء الاصطناعي', 'الرد على تقييمات قوقل', 'فرز السير الذاتية'],
      contact: ['وظّفه'],
    },
  };

  for (const lang of LANGS) {
    for (const [name, phrases] of Object.entries(expected[lang])) {
      const head = headMeta(db, name, lang);
      const both = `${titleOf(head)} ${descriptionOf(head)}`;
      for (const phrase of phrases) assert.ok(both.includes(phrase), `${lang}/${name || 'index'}: "${phrase}" is missing from the title and description`);
    }
  }
});

/* He is one person. A page that calls him a company or an agency promises
   something a client will not find. */
test('nothing calls him a company or an agency', () => {
  for (const lang of LANGS) {
    for (const name of PAGES) {
      const html = page(name, lang);
      const said = `${titleOf(html)} ${descriptionOf(html)} ${h1Of(html)}`;
      assert.ok(!/\bagency\b|\bweb design company\b|وكالة|شركة تصميم|شركة برمجة/i.test(said), `${lang}/${name || 'index'}: ${said}`);
    }
  }
});

/* The bare word "الخبر" also means "the news". Written with its preposition
   and next to a place nobody mistakes, it can only be the city. */
test('in Arabic the city is never a bare word a search engine could read as "the news"', () => {
  const c = db.copy.ar;
  const strings = [
    ...Object.values(c.meta.pages).flatMap((p) => [p.title, p.description]),
    c.work.lead,
    c.showcase.lead,
    c.showcase.where,
    c.automation.lead,
    c.home.intro,
    c.home.availability,
  ];
  for (const s of strings.filter((x) => x.includes('الخبر'))) {
    assert.match(s, /(في|ب)الخبر|في الخبر/, `the city has no preposition in: ${s}`);
    assert.match(s, /الدمام|المنطقة الشرقية|السعودية/, `the city stands alone in: ${s}`);
  }
});

/* ---------------------------------------------------------------- headings */

test('every page heading says what the page is, not what the nav calls it', () => {
  const h1 = {
    en: {
      about: 'About Nour Aldeen Tofi',
      work: 'Experience and recommendations',
      projects: 'AI products and web apps I built',
      showcase: 'Websites I design and build',
      automation: 'n8n and AI automation for businesses',
      contact: 'Contact Nour Aldeen Tofi',
    },
    ar: {
      about: 'عن نور الدين طفي',
      work: 'الخبرة والتوصيات',
      projects: 'منتجات ذكاء اصطناعي وتطبيقات ويب بنيتها',
      showcase: 'مواقع أصمّمها وأبرمجها',
      automation: 'أتمتة الأعمال بالذكاء الاصطناعي و n8n',
      contact: 'تواصل مع نور الدين طفي',
    },
  };

  for (const lang of LANGS) {
    for (const [name, heading] of Object.entries(h1[lang])) {
      const html = page(name, lang);
      assert.equal(h1Of(html), heading, `${lang}/${name}`);
      assert.notEqual(heading, db.copy[lang].nav[name], `${lang}/${name}: the heading is the nav label again`);
      // The nav keeps its short label: the two are separate keys on purpose.
      assert.ok(html.includes(`aria-current="page">${db.copy[lang].nav[name]}</a>`), `${lang}/${name}: the nav label changed`);
    }
  }
});

test('a page whose heading opens with its nav label does not print the label above it', () => {
  for (const lang of LANGS) {
    for (const name of PAGES.filter((p) => p !== '')) {
      const html = page(name, lang);
      const eyebrow = html.match(/<p class="hero__eyebrow">([^<]*)<\/p>/)?.[1];
      if (eyebrow) assert.ok(!h1Of(html).startsWith(unescape(eyebrow)), `${lang}/${name}: "${eyebrow}" is said twice`);
    }
  }
});

test('the service pages open with a lead that says who he is and where', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    for (const name of ['work', 'showcase', 'automation']) {
      const hero = page(name, lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0];
      assert.ok(unescape(hero).includes(`<p class="hero__headline hero__headline--lead">${c[name].lead}</p>`), `${lang}/${name}: the lead is not in the hero`);
      assert.ok(c[name].lead.includes(db.profile.location.city[lang]), `${lang}/${name}: the lead does not name his city`);
    }
  }
});

/* ---------------------------------------------------------- automation page */

test('the automation page says what he automates before it lists the systems', () => {
  for (const lang of LANGS) {
    const html = page('automation', lang);
    const c = db.copy[lang].automation;
    assert.deepEqual(sectionIds(html).slice(0, 3), [null, 'services', 'systems'], `${lang}: section order`);

    const block = html.split('id="services"')[1].split('</section>')[0];
    const text = unescape(block);
    assert.ok(text.includes(`<h2>${c.servicesTitle}</h2>`));
    assert.equal(block.split('<article').length - 1, c.services.length);
    for (const s of c.services) {
      assert.ok(text.includes(`<h3 class="card__title">${s.title}</h3>`), `${lang}: ${s.id} has no heading`);
      assert.ok(text.includes(s.body), `${lang}: ${s.id} has no body`);
    }

    // The process is a list a reader can count, in the order it happens.
    assert.ok(text.includes(c.processTitle));
    const steps = block.match(/<ol class="steps steps--row">[\s\S]*?<\/ol>/)[0];
    assert.deepEqual([...steps.matchAll(/<p>([^<]*)<\/p>/g)].map((m) => unescape(m[1])), c.process);
  }
});

/* A service card is a claim in plain words. Each one names the systems that
   back it, and links to them on the same page. */
test('every automation service is backed by systems that exist, and links to them', () => {
  assert.deepEqual(db.copy.en.automation.services.map((s) => s.id), db.copy.ar.automation.services.map((s) => s.id));
  assert.deepEqual(db.copy.en.automation.services.map((s) => s.id).sort(), Object.keys(SERVICE_SYSTEMS).sort());

  const known = new Set(db.workflows.map((w) => w.id));
  for (const [service, ids] of Object.entries(SERVICE_SYSTEMS)) {
    assert.ok(ids.length > 0, `${service} is backed by nothing`);
    for (const id of ids) assert.ok(known.has(id), `${service} points at "${id}", which is not in workflows.json`);
  }

  for (const lang of LANGS) {
    const html = page('automation', lang);
    for (const s of automationServices(db, lang)) {
      const card = html.split(`id="service-${s.id}"`)[1].split('</article>')[0];
      for (const w of s.systems) {
        assert.ok(unescape(card).includes(`<a href="#${w.id}">${w.name[lang]}</a>`), `${lang}: ${s.id} does not link to ${w.id}`);
        assert.ok(html.includes(` id="${w.id}"`), `${lang}: #${w.id} is not on the page`);
      }
    }
  }
});

/* What each sentence promises, checked against what the data says the
   system does. If a system changes, the sentence has to change with it. */
test('the service sentences match what the systems in the data do', () => {
  const w = Object.fromEntries(db.workflows.map((x) => [x.id, x]));
  const says = (id, pattern) => assert.match(JSON.stringify([w[id].summary.en, w[id].highlights.en, w[id].outcome.en]), pattern, `${id} no longer says ${pattern}`);

  says('smart-scanner-pipeline', /photo or a PDF/);
  says('smart-scanner-pipeline', /handwritten Arabic/);
  says('smart-scanner-pipeline', /line items/);
  says('whatsapp-booking', /WhatsApp buttons/);
  says('teacher-assistant-bot', /tools under strict business rules rather than guessing/);
  says('google-review-reply', /owner on Telegram/);
  says('unified-inbox', /every channel/);
  says('unified-inbox', /sender's own dialect/);
  says('cv-screener', /quoted evidence/);
  says('universal-web-scraper', /spreadsheet/);
  says('smart-lead-finder', /[Pp]rioritisation scoring/);
  says('crm-lead-cleaner', /reason on every rejection/);

  const scanner = db.projects.find((p) => p.id === 'cv-screener');
  assert.match(scanner.built.en, /Arabic and English/, 'CV Screener no longer says it handles both languages');
});

test('an unknown service or offer stops the build instead of rendering a dead card', () => {
  const withService = structuredClone(loaded);
  withService.copy.en.automation.services[0].id = 'nope';
  assert.throws(() => page('automation', 'en', withService), /unknown service "nope"/);

  const withOffer = structuredClone(loaded);
  withOffer.copy.ar.home.offers[0].id = 'nope';
  assert.throws(() => page('', 'ar', withOffer), /unknown offer "nope"/);
});

/* ------------------------------------------------------------ showcase page */

test('the showcase says what a client gets and where he works, above the gallery', () => {
  for (const lang of LANGS) {
    const html = page('showcase', lang);
    const c = db.copy[lang].showcase;
    assert.deepEqual(sectionIds(html).slice(0, 3), [null, 'offer', 'sites'], `${lang}: section order`);

    const block = unescape(html.split('id="offer"')[1].split('</section>')[0]);
    assert.ok(block.includes(`<h2 class="card__title">${c.offerTitle}</h2>`));
    assert.ok(block.includes(`<h2 class="card__title">${c.whereTitle}</h2>`));
    assert.deepEqual([...block.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]), c.offer);
    assert.ok(block.includes(c.where));
  }
  for (const city of ['Al Khobar', 'Dammam', 'Dhahran']) assert.ok(db.copy.en.showcase.where.includes(city));
  for (const city of ['الخبر', 'الدمام', 'الظهران']) assert.ok(db.copy.ar.showcase.where.includes(city));
});

/* The line for shops promises ordering or booking through WhatsApp. That is
   only honest while a real shop site in the gallery does it. */
test('the offer to shops is true of real sites in the gallery', () => {
  const shops = db.showcase.sites.filter((s) => s.segment === 'shops' && s.url);
  const onWhatsApp = shops.filter((s) => s.tags.includes('WhatsApp'));
  assert.ok(onWhatsApp.some((s) => /order/i.test(JSON.stringify([s.concept.en, s.highlights.en]))), 'no shop site takes orders through WhatsApp');
  assert.ok(onWhatsApp.some((s) => /booking/i.test(JSON.stringify(s.highlights.en))), 'no shop site takes bookings through WhatsApp');
  assert.ok(shops.some((s) => /Al Khobar/.test(s.role.en)), 'no shop site is in his own city');
});

/* ---------------------------------------------------------------- home page */

test('the home hero says he is available, only while the data says so', () => {
  for (const lang of LANGS) {
    const hero = page('', lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    const note = `<p class="hero__note">${db.copy[lang].home.availability}</p>`;
    assert.ok(hero.includes(note), `${lang}: no availability line`);
    assert.ok(hero.indexOf('hero__intro') < hero.indexOf(note) && hero.indexOf(note) < hero.indexOf('hero__actions'), `${lang}: the line is out of place`);

    for (const availability of [{ ...db.profile.availability, openToWork: false }, { ...db.profile.availability, immediate: false }]) {
      const busy = page('', lang, { ...db, profile: { ...db.profile, availability } });
      assert.ok(!busy.includes('hero__note'), `${lang}: says available when the data does not`);
    }
  }
});

test('the home page offers three things right under the hero, each leading to its page', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(OFFERS).map(([id, o]) => [id, o.page])), {
    automation: 'automation',
    websites: 'showcase',
    frontend: 'work',
  });
  assert.deepEqual(db.copy.en.home.offers.map((o) => o.id), ['automation', 'websites', 'frontend']);
  assert.deepEqual(db.copy.ar.home.offers.map((o) => o.id), ['automation', 'websites', 'frontend']);

  for (const lang of LANGS) {
    const html = page('', lang);
    assert.deepEqual(sectionIds(html).slice(0, 2), [null, 'offers'], `${lang}: the offers are not right after the hero`);
    const block = unescape(html.split('id="offers"')[1].split('</section>')[0]);
    assert.ok(block.includes(`<h2>${db.copy[lang].home.offersTitle}</h2>`));

    for (const o of homeOffers(db, lang)) {
      const to = pagePath(o.page, lang);
      assert.ok(block.includes(`<h3 class="card__title"><a href="${to}">${o.title}</a></h3>`), `${lang}: ${o.id} title`);
      assert.ok(block.includes(`<p class="card__body">${o.body}</p>`), `${lang}: ${o.id} body`);
      assert.ok(block.includes(`<a class="btn btn--ghost" href="${to}">${o.cta}</a>`), `${lang}: ${o.id} button`);
    }
  }
});

test('each offer is a schema.org Service, on the home page only, in the words on the page', () => {
  for (const lang of LANGS) {
    const html = page('', lang);
    const text = visibleText(html);
    const services = ldNodes(html).filter((n) => n['@type'] === 'Service');
    assert.deepEqual(services, servicesLd(db, lang).map(({ '@context': _ctx, ...rest }) => rest));
    assert.equal(services.length, db.copy[lang].home.offers.length);

    for (const [i, s] of services.entries()) {
      const offer = homeOffers(db, lang)[i];
      assert.equal(s.name, offer.title);
      assert.equal(s.description, offer.body);
      assert.ok(text.includes(s.name) && text.includes(s.description), `${lang}: ${offer.id} is described in words the page does not show`);
      assert.equal(s['@id'], `${db.profile.site}${pagePath('', lang)}#offer-${offer.id}`);
      assert.ok(html.includes(` id="offer-${offer.id}"`), `${lang}: the Service points at a card that is not on the page`);
      assert.equal(typeof s.serviceType, 'string');
      assert.deepEqual(s.provider, { '@id': `${db.profile.site}/#nour` });
      assert.deepEqual(s.areaServed, { '@type': 'Country', name: db.profile.location.country[lang] });
      assert.deepEqual(s.availableChannel.availableLanguage, ['ar', 'en']);
      assert.equal(s.url, `${db.profile.site}${pagePath(offer.page, lang)}`);
      assert.equal(s.availableChannel.serviceUrl, s.url);
      // No price and no rating: the site states neither.
      for (const key of ['offers', 'price', 'priceRange', 'aggregateRating', 'review']) assert.ok(!(key in s), `${lang}: a Service carries "${key}"`);
    }
    assert.equal(new Set(services.map((s) => s['@id'])).size, services.length, `${lang}: two services share an @id`);
  }

  // He is a person offering services, never a business listing.
  for (const lang of LANGS) {
    for (const name of PAGES) {
      const types = ldNodes(page(name, lang)).map((n) => n['@type']);
      assert.ok(!types.some((t) => /LocalBusiness|Organization|ProfessionalService/.test(String(t))), `${lang}/${name || 'index'}: ${types}`);
      if (name !== '') assert.ok(!types.includes('Service'), `${lang}/${name}: a Service off the home page`);
    }
    assert.ok(!ldNodes(notFound(db, lang)).some((n) => n['@type'] === 'Service'), `${lang}: the 404 offers services`);
  }
});

/* The home intro is what llms.txt and Person.description quote, so it was
   cut to two sentences. What it used to say still has to be said somewhere. */
test('nothing true was lost when the home intro was shortened', () => {
  const en = db.copy.en.about.body.join(' ');
  assert.match(en, /read Arabic and English documents, validate them, catch what does not belong/);
  assert.match(en, /sheets, CRMs and dashboards/);
  assert.match(en, /Software Engineering Supervisor/);
  assert.match(en, /gather requirements[\s\S]*break work into tasks[\s\S]*keep delivery on schedule/);

  const ar = db.copy.ar.about.body.join(' ');
  assert.match(ar, /تقرأ المستندات بالعربية والإنجليزية، وتتحقّق منها، وتلتقط ما لا ينتمي إليها/);
  assert.match(ar, /مشرف هندسة برمجيات/);

  for (const lang of LANGS) {
    assert.ok(db.copy[lang].home.intro.length < 260, `${lang}: the intro grew back`);
    assert.ok(!/\d/.test(db.copy[lang].home.intro.replace(/n8n/g, '')), `${lang}: a figure in the intro`);
  }
});

/* -------------------------------------------------------------------- links */

/* A link to "/projects#smart-scanner" that lands on the top of the page is
   a broken promise the plain "does the file exist" check never sees. */
test('every link to an item on another page lands on that item', () => {
  const html = Object.fromEntries(LANGS.flatMap((lang) => PAGES.map((name) => [pagePath(name, lang), page(name, lang)])));

  for (const [from, source] of Object.entries(html)) {
    for (const [, target, fragment] of source.matchAll(/href="(\/[^"#?]*)#([^"]+)"/g)) {
      assert.ok(html[target], `${from}: links to ${target}, which is not a page`);
      assert.ok(html[target].includes(` id="${fragment}"`), `${from}: ${target}#${fragment} has nothing to land on`);
    }
    for (const [, fragment] of source.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(source.includes(` id="${fragment}"`), `${from}: #${fragment} has nothing to land on`);
    }
  }
});

test('every card title on the home page is a link to that item, named by its name', () => {
  for (const lang of LANGS) {
    const html = unescape(page('', lang));
    const block = (id) => html.split(`<section class="section" id="${id}">`)[1].split('</section>')[0];
    const featured = db.projects.find((p) => p.featured);

    assert.ok(block('featured').includes(`<h3 class="card__title"><a href="${pagePath('projects', lang)}#${featured.id}">${featured.name}</a></h3>`));
    for (const w of db.workflows.slice(0, 3)) {
      assert.ok(block('automation').includes(`<h3 class="card__title"><a href="${pagePath('automation', lang)}#${w.id}">${w.name[lang]}</a></h3>`), `${lang}: ${w.id}`);
    }
    const projectTitles = [...block('projects').matchAll(/<h3 class="card__title">([\s\S]*?)<\/h3>/g)].map((m) => m[1]);
    assert.ok(projectTitles.length > 0);
    for (const t of projectTitles) assert.match(t, new RegExp(`^<a href="${pagePath('projects', lang)}#[a-z0-9-]+">[^<]+</a>$`), `${lang}: ${t}`);
    const siteTitles = [...block('showcase').matchAll(/<h3 class="card__title">([\s\S]*?)<\/h3>/g)].map((m) => m[1]);
    for (const t of siteTitles) assert.match(t, new RegExp(`^<a href="${pagePath('showcase', lang)}#[a-z0-9-]+">[^<]+</a>$`), `${lang}: ${t}`);
  }
});

/* A reader who arrives on a deep page from a search reaches its foot with a
   next step, the same one the home page ends on. */
test('the deep pages end with the call to action', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    for (const name of ['', 'about', 'work', 'projects', 'automation', 'showcase']) {
      const html = unescape(page(name, lang));
      const last = html.slice(html.lastIndexOf('<section'), html.indexOf('</main>'));
      const title = name === 'showcase' ? c.showcase.ctaTitle : c.home.ctaTitle;
      const body = name === 'showcase' ? c.showcase.ctaBody : c.home.ctaBody;
      assert.ok(last.includes('<div class="cta">'), `${lang}/${name || 'index'}: does not end with the call to action`);
      assert.ok(last.includes(`<h2>${title}</h2>`) && last.includes(`<p>${body}</p>`), `${lang}/${name || 'index'}: wrong words`);
      assert.ok(last.includes(`<a class="btn" href="${pagePath('contact', lang)}">${c.home.ctaButton}</a>`), `${lang}/${name || 'index'}: no button to the contact page`);
      assert.equal(html.split('<div class="cta">').length - 1, 1, `${lang}/${name || 'index'}: more than one call to action`);
    }
  }
});

/* -------------------------------------------------------------------- dates */

test('a month is written in words, in the language of the page, with Latin digits', () => {
  assert.equal(monthYear('2025-01', 'en'), 'January 2025');
  assert.equal(monthYear('2026-11', 'ar'), 'نوفمبر 2026');
  assert.equal(monthYear('2026-11-03', 'en'), 'November 2026');
  assert.equal(monthYear('2026-02-05', 'ar'), 'فبراير 2026');
  assert.equal(monthYear('2021', 'en'), '2021');

  assert.equal(periodWords('2025-01', '2026-11', 'en', db.copy.en), 'January 2025 to November 2026');
  assert.equal(periodWords('2025-01', '2026-11', 'ar', db.copy.ar), 'يناير 2025 إلى نوفمبر 2026');
  assert.equal(periodWords('2025-01', null, 'en', db.copy.en), 'January 2025 to present');
  assert.equal(periodWords('2025-01', null, 'ar', db.copy.ar), 'يناير 2025 حتى الآن');
});

test('the work page shows every date in words and keeps the month for machines', () => {
  for (const lang of LANGS) {
    const html = page('work', lang);
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const text = visibleText(html);

    for (const g of byCompany(db.experience)) {
      assert.ok(text.includes(periodWords(g.start, g.end, lang, db.copy[lang])), `${lang}: ${g.company} tenure`);
      for (const r of g.roles) {
        assert.ok(text.includes(periodWords(r.start, r.end, lang, db.copy[lang])), `${lang}: ${r.id}`);
        assert.ok(main.includes(`<time datetime="${r.start}">${monthYear(r.start, lang)}</time>`), `${lang}: ${r.id} lost its datetime`);
      }
    }
    for (const cr of db.credentials) {
      assert.ok(main.includes(`datetime="${cr.issued}">${monthYear(cr.issued, lang)}</time>`), `${lang}: ${cr.id}`);
    }
    assert.ok(!/\b\d{4}-\d{2}\b/.test(text), `${lang}: a raw month is visible: ${text.match(/.{0,20}\b\d{4}-\d{2}\b.{0,20}/)?.[0]}`);
  }
});

/* ------------------------------------------------------------ Arabic polish */

/* In an Arabic sentence the two apps are written the way people in Saudi
   Arabia write them. The Latin names stay in the stack badges, which are
   lists of product names and not sentences. */
test('Arabic sentences write واتساب and تيليجرام, one spelling each', () => {
  const hits = [];
  const walk = (node, path, arabic) => {
    if (typeof node === 'string') {
      if (arabic && /[؀-ۿ]/.test(node) && /Telegram|WhatsApp|تيليغرام|تلغرام|تلجرام|تليجرام|واتس اب|وتساب/.test(node)) hits.push(`${path}: ${node.slice(0, 80)}`);
    } else if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`, arabic));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, arabic || k === 'ar');
  };
  const { copy, ...data } = loaded;
  walk(copy.ar, 'copy.ar', true);
  walk(data, 'data', false);
  assert.deepEqual(hits, []);
});
