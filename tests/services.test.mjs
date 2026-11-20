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
import { readFileSync } from 'node:fs';
import { loadDb } from '../scripts/lib/load.mjs';
import { TEMPLATES, notFound } from '../scripts/lib/pages.mjs';
import { headMeta, monthYear, periodWords, tagsOf, homeProofFigures, quoteExcerpt } from '../scripts/lib/blocks.mjs';
import { phoneDigits, phoneDisplay, whatsappUrl, whatsappFirst } from '../scripts/lib/contact.mjs';
import { servicesLd } from '../scripts/lib/jsonld.mjs';
import { OFFERS, SERVICE_SYSTEMS, homeOffers, automationServices } from '../scripts/lib/offers.mjs';
import { PAGES, LANGS, pagePath } from '../scripts/lib/sitemap.mjs';
import { byCompany } from '../scripts/lib/experience.mjs';
import { buildSite, sitePages, pageFile } from '../scripts/lib/site.mjs';
import { projectHref, systemHref } from '../scripts/lib/details.mjs';

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
      about: ['AI Engineer in Al Khobar'],
      work: ['Frontend Developer', 'React', 'project manager and colleagues'],
      projects: ['AI Products', 'Web Apps', 'Free Browser Tools', 'invoice reading', 'CV screening'],
      showcase: ['Website Design in Al Khobar and Dammam', 'Independent web developer', 'restaurants', 'Dhahran'],
      automation: ['n8n Developer', 'AI Automation in Saudi Arabia', 'Google review replies', 'CV screening'],
      contact: ['Hire Nour Aldeen Tofi', 'full-time role', 'WhatsApp'],
    },
    ar: {
      '': ['أتمتة الأعمال', 'بوتات واتساب وتيليجرام', 'قراءة الفواتير العربية', 'في الخبر بالسعودية'],
      about: ['في الخبر بالسعودية'],
      work: ['مطوّر واجهات أمامية', 'مدير مشروعه وزملائه'],
      projects: ['منتجات ذكاء اصطناعي', 'تطبيقات ويب', 'أدوات مجانية', 'قراءة الفواتير', 'فرز السير الذاتية'],
      showcase: ['تصميم مواقع في الخبر والدمام', 'مطوّر مواقع مستقل', 'المطاعم', 'المنطقة الشرقية'],
      automation: ['مطوّر n8n', 'أتمتة الأعمال بالذكاء الاصطناعي', 'الرد على تقييمات قوقل', 'فرز السير الذاتية'],
      // "واعمل معه" speaks to a client and to an employer alike. The title
      // used to end in an order to employ him, which read as a plea and
      // told a business owner the page was not for him.
      contact: ['اعمل معه', 'فرص العمل بدوام كامل', 'واتساب'],
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

/* Each product has a page of its own, whose title opens with its name. The
   list page describes the collection and leaves the names to those pages:
   named in its title too, it competed with them for the same search. */
test('the projects list is titled as a collection, and names no product its own page is titled by', () => {
  for (const lang of LANGS) {
    const head = headMeta(db, 'projects', lang);
    const title = titleOf(head);
    const description = descriptionOf(head);
    for (const p of db.projects) {
      assert.ok(!title.includes(p.name) && !description.includes(p.name), `${lang}: the list page names ${p.name} in its title or description`);
    }
    assert.ok(title.length <= 65, `${lang}: "${title}" is ${title.length} characters`);
    assert.ok(title.endsWith(`| ${db.profile.name[lang]}`), `${lang}: "${title}"`);
    assert.ok(description.includes(db.profile.name[lang]), `${lang}: the description does not say whose they are`);
    assert.ok(!/\d/.test(`${title} ${description}`.replace(/n8n/g, '')) && !`${title} ${description}`.includes('—'), `${lang}: a figure or an em dash`);
  }
  // The same kinds of thing, in the same order, in both languages.
  const kinds = (text, words) => words.map((w) => text.indexOf(w));
  const en = kinds(db.copy.en.meta.pages.projects.description, ['invoice reading', 'CV screening', 'web scraping', 'e-invoicing']);
  const ar = kinds(db.copy.ar.meta.pages.projects.description, ['قراءة الفواتير', 'فرز السير الذاتية', 'سحب بيانات المواقع', 'الفوترة الإلكترونية']);
  for (const order of [en, ar]) assert.ok(order.every((at, i) => at > 0 && (i === 0 || order[i - 1] < at)), `the kinds are not all there, in order: ${order}`);
});

/* A title is cut at about seventy characters, and on these two pages the
   part that went missing was his name. */
test('the English work and showcase titles fit, and end with his name', () => {
  for (const name of ['work', 'showcase']) {
    const title = titleOf(headMeta(db, name, 'en'));
    assert.ok(title.length <= 70, `en/${name}: ${title.length} characters`);
    assert.ok(title.endsWith(`| ${db.profile.name.en}`), `en/${name}: "${title}"`);
  }
});

/* The work page is the one recruiters read, and a recruiter can check this
   sentence against LinkedIn. It may say "managers" only while the data
   records more than one person who managed him. */
test('the work description claims no more managers than the recommendations show', () => {
  const managers = db.testimonials.filter((t) => /managed him directly/.test(t.relationship.en));
  assert.ok(managers.length >= 1, 'no recommendation is from a manager, but the description says one is');
  if (managers.length < 2) {
    assert.ok(!/\bmanagers\b/i.test(db.copy.en.meta.pages.work.description), 'en: "managers", with one manager in the data');
    assert.ok(!/مديرين|مديريه|مدراء/.test(db.copy.ar.meta.pages.work.description), 'ar: managers in the plural, with one manager in the data');
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
      automation: 'أتمتة الأعمال بالذكاء الاصطناعي وn8n',
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

/* "Available immediately" is a claim about today. On the work page it is a
   line of its own, shown by the same rule as the home hero, and it is not in
   the lead or the search snippet, which would keep saying it after the data
   stopped. */
test('the work hero says he is available, only while the data says so', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const hero = page('work', lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    const note = `<p class="hero__note">${c.work.availability}</p>`;
    assert.ok(hero.includes(note), `${lang}: no availability line`);
    assert.ok(hero.indexOf('hero__headline--lead') < hero.indexOf(note), `${lang}: the line is above the lead`);

    for (const availability of [{ ...db.profile.availability, openToWork: false }]) {
      const busy = page('work', lang, { ...db, profile: { ...db.profile, availability } });
      assert.ok(!busy.includes('hero__note'), `${lang}: says available when the data does not`);
    }
  }
});

/* Copy that says "available now" outside the keys the data switches on and
   off. The home and work hero lines and the contact badge are gated; anything
   else found here has to be reworded by hand the day he is no longer free. */
const AVAILABLE_NOW = /available immediately|available now|متاح فوراً|متاح الآن|متاح للعمل فوراً/i;
const GATED_KEYS = new Set(['home.availability', 'work.availability', 'contact.availableNow']);

function ungatedAvailabilityClaims(copy) {
  const found = [];
  const walk = (node, path) => {
    if (typeof node === 'string') {
      if (AVAILABLE_NOW.test(node) && !GATED_KEYS.has(path)) found.push(path);
    } else if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(copy, '');
  return found;
}

test('no fixed sentence says he is available once the data says he is not', () => {
  const { openToWork } = db.profile.availability;
  for (const lang of LANGS) {
    const claims = ungatedAvailabilityClaims(db.copy[lang]);
    // The work lead and its search snippet are read by recruiters first, so
    // they never carry the claim, whatever the data says.
    assert.ok(!claims.some((p) => p === 'work.lead' || p.startsWith('meta.pages.work.')), `${lang}: ${claims}`);
    if (!openToWork) assert.deepEqual(claims, [], `${lang}: the data says he is not available, and these still say he is`);
  }
  // The detector does find a sentence that says it.
  assert.deepEqual(ungatedAvailabilityClaims({ a: { b: ['He is available immediately.'] }, home: { availability: 'Available now.' } }), ['a.b[0]']);
  assert.deepEqual(ungatedAvailabilityClaims({ x: 'وهو متاح للعمل فوراً.' }), ['x']);
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
   back it, and links each to where it is read in full: its own page, the
   page of the product it runs, or, for one that has neither, its card
   further down this page. */
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
        assert.ok(unescape(card).includes(`<a href="${systemHref(db, w, lang)}">${w.name[lang]}</a>`), `${lang}: ${s.id} does not link to ${w.id}`);
        assert.ok(html.includes(` id="${w.id}"`), `${lang}: the card of ${w.id} is not on the page`);
      }
    }
    // All three kinds of address occur, so each is exercised.
    const links = automationServices(db, lang).flatMap((s) => s.systems.map((w) => systemHref(db, w, lang)));
    assert.ok(links.includes(pagePath('automation/whatsapp-booking', lang)), `${lang}: a system with a page of its own`);
    assert.ok(links.includes(`${pagePath('projects/cv-screener', lang)}#automation`), `${lang}: an engine shown on its product's page`);
    assert.ok(links.includes(`${pagePath('automation', lang)}#crm-lead-cleaner`), `${lang}: a system with only a card`);
    assert.ok(!/<ul class="card__links">[\s\S]*?href="#/.test(html.split('id="services"')[1].split('</section>')[0]), `${lang}: a service still links to a bare fragment`);
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

/* The gallery sits right under these sentences, and each card is tagged with
   the languages its site speaks. While any of them speaks one language only,
   the page cannot promise two on every site. */
test('the showcase does not promise two languages on every site while some have one', () => {
  // A language tag is a pair, written in each language; the English form is the one read here.
  const speaks = (s) => tagsOf(s.tags, 'en').find((t) => /^(Arabic|English)( \+ (Arabic|English))?$/.test(t));
  const single = db.showcase.sites.filter((s) => /^(Arabic|English)$/.test(speaks(s) ?? ''));
  const both = db.showcase.sites.filter((s) => /\+/.test(speaks(s) ?? ''));
  assert.ok(both.length > 0, 'no site in the gallery is in both languages, but the page offers both');
  if (single.length === 0) return;

  const en = db.copy.en;
  const ar = db.copy.ar;
  for (const s of [en.showcase.lead, en.showcase.offer.join(' '), en.meta.pages.showcase.description, en.meta.pages.showcase.title]) {
    assert.ok(!/bilingual|from the first day/i.test(s), `en: promises both languages on every site: ${s}`);
  }
  assert.match(en.showcase.lead, /Arabic, English or both/);
  assert.ok(en.showcase.offer.some((line) => /Arabic, English or both/.test(line)));
  for (const s of [ar.showcase.lead, ar.showcase.offer.join(' ')]) {
    assert.ok(!/ثنائي|من اليوم الأول/.test(s), `ar: promises both languages on every site: ${s}`);
    assert.match(s, /بالعربية أو الإنجليزية أو باللغتين معاً/);
  }
});

/* The title of the page is the phrase people search. A title the body never
   echoes is one a search engine is more likely to rewrite, so the lead says
   it once, as a noun, the way it is typed. */
test('the showcase lead says the phrase its title is built on, once', () => {
  const phrase = { en: /website design/gi, ar: /تصميم مواقع/g };
  for (const lang of LANGS) {
    const c = db.copy[lang];
    assert.match(titleOf(headMeta(db, 'showcase', lang)), new RegExp(phrase[lang].source, 'i'));
    assert.equal(c.showcase.lead.match(phrase[lang])?.length, 1, `${lang}: the lead`);
    const body = [c.showcase.title, ...c.showcase.offer, c.showcase.where, c.showcase.labLead, c.showcase.ctaTitle, c.showcase.ctaBody].join(' ');
    assert.equal(body.match(phrase[lang]), null, `${lang}: the phrase is repeated outside the lead`);
  }
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

/* The role he is open to is one plain sentence under the buttons. Above
   them it read as part of the invitation the buttons make to a client, and
   a client took the whole first screen for a job search. */
test('the home hero says he is available, only while the data says so', () => {
  for (const lang of LANGS) {
    const hero = page('', lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    const note = `<p class="hero__note hero__note--after">${db.copy[lang].home.availability}</p>`;
    assert.ok(hero.includes(note), `${lang}: no availability line`);
    assert.ok(hero.indexOf('hero__intro') < hero.indexOf('hero__actions') && hero.indexOf('hero__actions') < hero.indexOf(note), `${lang}: the line is out of place`);

    for (const availability of [{ ...db.profile.availability, openToWork: false }]) {
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
      // The category is not copy, but it is still held to the words on the page.
      assert.ok(text.includes(s.serviceType), `${lang}: ${offer.id} has a serviceType the page does not show: "${s.serviceType}"`);
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
  assert.match(en, /At DFS I built the React and TypeScript frontend/);
  assert.match(en, /gather requirements[\s\S]*break work into tasks[\s\S]*keep delivery on schedule/);

  const ar = db.copy.ar.about.body.join(' ');
  assert.match(ar, /تقرأ المستندات بالعربية والإنجليزية، وتتحقّق منها، وتلتقط ما لا ينتمي إليها/);
  assert.match(ar, /في DFS بنيت واجهة منصّة CRM/);

  for (const lang of LANGS) {
    assert.ok(db.copy[lang].home.intro.length < 260, `${lang}: the intro grew back`);
    assert.ok(!/\d/.test(db.copy[lang].home.intro.replace(/n8n/g, '')), `${lang}: a figure in the intro`);
  }
});

/* The intro is Person.description and the opening of llms.txt in each
   language, so both have to say the same thing. */
test('the home intro says the same thing in both languages', () => {
  const en = db.copy.en.home.intro;
  const ar = db.copy.ar.home.intro;
  // The first sentence stands alone: what he builds, in the words every text of his uses.
  assert.ok(en.startsWith('I build the interface people use and the AI behind it, in Arabic and English. '));
  assert.ok(ar.startsWith('أبني الواجهة التي يستخدمها الناس، والذكاء الاصطناعي الذي يعمل خلفها، بالعربية والإنجليزية. '));
  // Then one example for each half, the same two in both languages.
  assert.match(en, /Smart Scanner[\s\S]*invoice[\s\S]*shop sites[\s\S]*WhatsApp/);
  assert.match(ar, /Smart Scanner[\s\S]*الفاتورة[\s\S]*مواقع المحلات[\s\S]*واتساب/);
  for (const text of [en, ar]) assert.equal(text.split(/(?<=\.)\s+/).length, 2, `two sentences, not: ${text}`);
  // No tool leads it: the names of the tools are the last line of the hero.
  assert.ok(!/React|TypeScript|n8n|LLM/.test(en + ar));
});

/* Each example in the intro is a claim, held to the data it is taken from. */
test('the examples in the home intro are true of the product and of real shop sites', () => {
  const scanner = db.workflows.find((w) => w.id === 'smart-scanner-pipeline');
  assert.match(JSON.stringify([scanner.summary.en, scanner.highlights.en, scanner.outcome.en]), /photo or a PDF/);
  const shops = db.showcase.sites.filter((s) => s.segment === 'shops' && s.url && s.tags.includes('WhatsApp'));
  assert.ok(shops.some((s) => /booking/i.test(JSON.stringify(s.highlights.en))), 'no shop site takes bookings on WhatsApp');
  assert.ok(shops.some((s) => /orders? arrive/i.test(JSON.stringify(s.highlights.en))), 'no shop site takes orders on WhatsApp');
});

/* The line under his name is what a visitor reads first. It opens with his
   title, which is also the page title, and then says what he builds and for
   whom in words an owner uses. The names of the tools moved to the quiet last
   line of the hero, where an engineer still finds them. */
test('the line under his name says what he does and for whom, and names no tool', () => {
  const title = { en: 'Frontend & AI Engineer', ar: 'مطوّر واجهات أمامية وتطبيقات ذكاء اصطناعي' };
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const hero = unescape(page('', lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0]);
    assert.ok(hero.includes(`<p class="hero__headline">${c.home.headline}</p>`), `${lang}: the line is not in the hero`);
    assert.ok(c.home.headline.startsWith(`${title[lang]}: `), `${lang}: the line does not open with his title`);
    assert.ok(titleOf(headMeta(db, '', lang)).includes(title[lang]), `${lang}: the page title lost his title`);
    assert.ok(db.profile.headline[lang].startsWith(title[lang]), `${lang}: the line and the structured data name two titles`);
    assert.ok(!/React|TypeScript|Next\.js|n8n|LLM|MCP/.test(c.home.headline), `${lang}: a tool name in the line under his name`);
    assert.ok(!/[A-Za-z]/.test(db.copy.ar.home.headline), 'Latin letters in the Arabic line: several names inside a right-to-left line break its order');
    assert.ok(c.home.headline.length <= 110 && !/\d/.test(c.home.headline) && !c.home.headline.includes('—'), `${lang}: ${c.home.headline}`);

    // The tools: one left-to-right run, last in the hero, under the role sentence.
    const stack = `<p class="hero__stack"><span dir="ltr">${c.home.stack}</span></p>`;
    assert.ok(hero.includes(stack), `${lang}: no stack line`);
    assert.ok(hero.indexOf('hero__note') < hero.indexOf(stack), `${lang}: the stack line is not last`);
    for (const tool of ['React', 'TypeScript', 'Next.js', 'n8n', 'MCP']) assert.ok(c.home.stack.includes(tool), `${lang}: ${tool}`);
    assert.ok(!/[؀-ۿ]/.test(c.home.stack), `${lang}: the stack line is names only`);
  }
  assert.equal(page('', 'en').split('<h1').length - 1, 1);
  assert.equal(h1Of(page('', 'ar')), db.profile.name.ar);
});

/* One short sentence, one family of roles, the same on the two pages an
   employer reads first. It never shares a sentence with the offer to clients:
   "roles and projects" in three fields read as someone who takes anything. */
test('the role he is open to is one sentence that names one role and no project', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    assert.equal(c.work.availability, c.home.availability, `${lang}: the two pages word it differently`);
    assert.equal(c.home.availability.split(/(?<=\.)\s+/).length, 1, `${lang}: more than one sentence`);
  }
  const en = db.copy.en;
  const ar = db.copy.ar;
  assert.match(en.home.availability, /^Open to a full-time role as a frontend and AI engineer, in Saudi Arabia or remote\.$/);
  assert.match(ar.home.availability, /^منفتح على فرص العمل بدوام كامل في تطوير الواجهات الأمامية وتطبيقات الذكاء الاصطناعي، في السعودية أو عن بُعد\.$/);
  for (const text of [en.home.availability, en.contact.availableNow, en.contact.rolesTitle, en.about.faq[4].a, en.about.faq[5].a, en.meta.pages.contact.description]) {
    assert.ok(!/projects?|freelance|looking for|automation roles/i.test(text.replace('He also builds websites and AI automation for businesses.', '')), `en: ${text}`);
  }
  for (const text of [ar.home.availability, ar.contact.availableNow, ar.contact.rolesTitle, ar.about.faq[4].a, ar.about.faq[5].a]) {
    assert.ok(!/مشاريع|العمل الحر|أبحث/.test(text), `ar: ${text}`);
  }
  // The freelance work keeps its own answer, so nothing is lost for a client.
  assert.match(en.about.faq[7].a, /websites for professionals, companies and shops[\s\S]*WhatsApp or by email/);
  assert.match(ar.about.faq[7].a, /مواقع للأفراد والشركات والمحلات[\s\S]*واتساب أو البريد الإلكتروني/);
  // The roles listed on the contact page are one family: the title, and its frontend half.
  assert.deepEqual(db.profile.availability.roles.en, ['Frontend & AI Engineer', 'Frontend Developer (React, TypeScript, Next.js)']);
  assert.equal(db.profile.availability.roles.ar.length, db.profile.availability.roles.en.length);
  // On-site, in the word Saudi job advertisements use: "في الموقع" reads as "on the website".
  assert.ok(db.profile.availability.arrangements.ar.includes('حضوري') && !JSON.stringify(db.profile.availability).includes('في الموقع'));
});

/* The dot beside the sentence was the sign every app uses for "online now".
   No page says he is available now, so no stylesheet draws it. */
test('no live dot stands beside the role sentence', () => {
  const css = readFileSync('assets/css/layout.css', 'utf8');
  assert.ok(css.includes('.hero__note'), 'the sentence lost its style');
  assert.ok(!/\.hero__note[^{]*::before/.test(css), 'the dot is back');
});

/* -------------------------------------------------------------------- links */

/* A link to "/projects#smart-scanner" that lands on the top of the page is
   a broken promise the plain "does the file exist" check never sees. */
test('every link to an item on another page lands on that item', () => {
  // Every page with an address, the detail pages included: a card on the
  // automation page leads to a section of a project page.
  const files = buildSite(db);
  const html = Object.fromEntries(LANGS.flatMap((lang) => sitePages(db).map((name) => [pagePath(name, lang), files.get(pageFile(name, lang))])));

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

    // A project and a system each have a page to land on (details.mjs); a
    // client site has none, so its card still leads to its place on the list.
    assert.ok(block('featured').includes(`<h3 class="card__title"><a href="${projectHref(featured, lang)}">${featured.name}</a></h3>`));
    assert.equal(projectHref(featured, lang), pagePath(`projects/${featured.id}`, lang));
    for (const w of db.workflows.slice(0, 3)) {
      assert.ok(block('automation').includes(`<h3 class="card__title"><a href="${systemHref(db, w, lang)}">${w.name[lang]}</a></h3>`), `${lang}: ${w.id}`);
    }
    const projectTitles = [...block('projects').matchAll(/<h3 class="card__title">([\s\S]*?)<\/h3>/g)].map((m) => m[1]);
    assert.ok(projectTitles.length > 0);
    for (const t of projectTitles) assert.match(t, new RegExp(`^<a href="${pagePath('projects', lang)}/[a-z0-9-]+">[^<]+</a>$`), `${lang}: ${t}`);
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
      // A page with one reader ends in words for that reader: a site, an
      // automation, or, on the page an employer lands on, the CV. The rest
      // end as the home page does, which speaks of both offers.
      const own = ['showcase', 'automation', 'work'].includes(name) ? c[name] : c.home;
      assert.ok(last.includes('<div class="cta">'), `${lang}/${name || 'index'}: does not end with the call to action`);
      assert.ok(last.includes(`<h2>${own.ctaTitle}</h2>`) && last.includes(`<p>${own.ctaBody}</p>`), `${lang}/${name || 'index'}: wrong words`);
      assert.match(last, new RegExp(`<a class="btn(?: btn--ghost)?" href="${pagePath('contact', lang)}">${c.home.ctaButton}</a>`), `${lang}/${name || 'index'}: no button to the contact page`);
      assert.equal(html.split('<div class="cta">').length - 1, 1, `${lang}/${name || 'index'}: more than one call to action`);

      // The experience page offers the CV; every other page offers WhatsApp beside the contact page.
      const wa = `href="${whatsappUrl(db.profile, c.contact.whatsappText)}"`;
      if (name === 'work') {
        assert.ok(last.includes(` download>${c.ui.downloadCv}</a>`) && !last.includes(wa), `${lang}/work: the closing block`);
        assert.ok(!/website|automat|موقعاً|أتمتة/.test(own.ctaTitle + own.ctaBody), `${lang}/work: the page an employer reads ends with an offer to clients`);
      } else {
        assert.ok(last.includes(wa), `${lang}/${name || 'index'}: no WhatsApp button`);
      }
    }
  }
});

/* -------------------------------------------------------------- WhatsApp */

/* The number is published once, in data/profile.json. Every WhatsApp address
   on the site is built from it, with the first line of the message written
   in the language of the page. */
test('the WhatsApp address is built from the one published number', () => {
  assert.equal(phoneDigits('+966 54 797-2944'), '966547972944');
  assert.equal(whatsappUrl({ phone: '+966500000000' }), 'https://wa.me/966500000000');
  assert.equal(whatsappUrl({ phone: '+966500000000' }, 'مرحباً، بخصوص '), `https://wa.me/966500000000?text=${encodeURIComponent('مرحباً، بخصوص ')}`);
  assert.throws(() => whatsappUrl({ phone: '' }), /no digits/);
  assert.equal(phoneDisplay('+966547972944'), '+966 54 797 2944');
  assert.equal(phoneDisplay('+4915112345678'), '+4915112345678', 'a number of another shape is printed as it is written');

  const digits = phoneDigits(db.profile.phone);
  const other = { ...db, profile: { ...db.profile, phone: '+966500000001' } };
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const url = whatsappUrl(db.profile, c.contact.whatsappText);
    assert.ok(url.startsWith(`https://wa.me/${digits}?text=`) && !url.includes('+'), `${lang}: ${url}`);
    assert.equal(decodeURIComponent(url.split('?text=')[1]), c.contact.whatsappText);

    for (const name of PAGES) {
      const html = page(name, lang);
      const links = [...html.matchAll(/href="(https:\/\/(?:wa\.me|api\.whatsapp\.com)[^"]*)"/g)].map((m) => unescape(m[1]));
      // Every one of them is that address, and it opens the way the other links that leave the site do.
      for (const link of links) assert.equal(link, url, `${lang}/${name || 'index'}`);
      if (links.length) assert.ok(html.includes(`href="${url.replaceAll('&', '&amp;')}" target="_blank" rel="noopener noreferrer"`), `${lang}/${name || 'index'}: the link does not open as an external link`);
      // A new number in the data reaches every page that links to WhatsApp.
      if (links.length) assert.ok(page(name, lang, other).includes('https://wa.me/966500000001?text=') && !page(name, lang, other).includes(digits), `${lang}/${name || 'index'}: the number is written somewhere else too`);
    }
    for (const name of ['', 'showcase', 'automation', 'contact']) {
      const hero = page(name, lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0];
      assert.ok(unescape(hero).includes(`href="${url}"`), `${lang}/${name || 'index'}: no WhatsApp button on the first screen`);
    }
  }
});

/* WhatsApp stands beside email, never in its place: the contact page keeps
   the email button, the email row and the phone row. Arabic readers are
   shown WhatsApp first; on the English page email leads. */
test('the contact page offers WhatsApp beside email, first for Arabic readers', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const html = unescape(page('contact', lang));
    const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    const buttons = [...hero.matchAll(/<a class="(btn(?: btn--ghost)?)" href="([^"]*)"[^>]*>([^<]*)/g)].map((m) => [m[1], m[2].split(/[:/]/)[0], m[3]]);
    const email = (cls) => [cls, 'mailto', c.ui.emailMe];
    const whatsapp = (cls) => [cls, 'https', c.ui.whatsappMe];
    assert.deepEqual(buttons.slice(0, 2), whatsappFirst(lang) ? [whatsapp('btn'), email('btn btn--ghost')] : [email('btn'), whatsapp('btn btn--ghost')], lang);
    assert.deepEqual(buttons.slice(2).map((b) => b[2]), ['LinkedIn'], `${lang}: a profile that is not a way to reach him is among the buttons`);
    assert.equal(buttons.filter((b) => b[0] === 'btn').length, 1, `${lang}: one primary button`);
    assert.notEqual(c.ui.emailMe, c.ui.whatsappMe);

    // The lead names both, and says nothing about which is faster or how soon he replies.
    assert.ok(hero.includes(`<p class="hero__headline">${c.contact.lead}</p>`));
    assert.ok(!/fastest|within|hours|أسرع|خلال|ساعة/.test(c.contact.lead), `${lang}: a promise in the lead`);
    assert.ok(html.includes(`mailto:${db.profile.email}`) && html.includes(`tel:${db.profile.phone}`), `${lang}: email or phone left the page`);
    assert.ok(visibleText(html).includes(phoneDisplay(db.profile.phone)), `${lang}: the number is not printed`);
  }
  assert.equal(whatsappFirst('ar'), true);
  assert.equal(whatsappFirst('en'), false);
  assert.match(db.copy.en.contact.lead, /email[\s\S]*WhatsApp/);
  assert.match(db.copy.ar.contact.lead, /واتساب[\s\S]*البريد الإلكتروني/);
});

/* A client who arrives with a project is told what to send before the page
   turns to roles, and the block for employers is named for them. */
test('the contact page speaks to a client first and names the block for employers', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const html = unescape(page('contact', lang));
    assert.deepEqual(sectionIds(html), [null, 'project', 'links', 'details'], lang);
    const project = html.split('id="project"')[1].split('</section>')[0];
    assert.ok(project.includes(`<h2>${c.contact.projectTitle}</h2>`) && project.includes(`<p class="section__lead">${c.contact.projectBody}</p>`), lang);
    const details = html.split('id="details"')[1].split('</section>')[0];
    assert.ok(details.includes(`<h2>${c.contact.hiringTitle}</h2>`), `${lang}: the employers' block has no heading of its own`);
    // "Work preferences" used to be printed twice in a row, as the section and as its first card.
    assert.equal(html.split(`>${c.contact.availabilityTitle}<`).length - 1, 1, `${lang}: a heading printed twice`);
    assert.notEqual(c.contact.hiringTitle, c.contact.availabilityTitle);
    assert.ok(details.includes(c.contact.availableNow) && details.includes(c.contact.rolesTitle));
  }
});

/* ----------------------------------------------------------- the offers */

/* A card on the home page is read by an owner, not by an engineer: no tool
   opens it, one example from delivered work stands in it, and it says what
   happens next. Each example is held to the data it is taken from. */
test('each offer opens with the job, gives one real example, and names no tool first', () => {
  const tools = /^(?:n8n|React|TypeScript|Next\.js|LLM)/;
  for (const lang of LANGS) {
    for (const o of db.copy[lang].home.offers) {
      assert.ok(!tools.test(o.body) && !/n8n|React|TypeScript/.test(o.title), `${lang}/${o.id}: a tool leads the card`);
      assert.match(o.body, lang === 'en' ? /One example: / : /مثال: /, `${lang}/${o.id}: no example`);
      assert.ok(!/\d/.test(o.body.replace(/n8n/g, '')), `${lang}/${o.id}: a figure in the card`);
    }
  }
  const [automation, websites, frontend] = db.copy.en.home.offers.map((o) => o.body);
  const [automationAr, websitesAr, frontendAr] = db.copy.ar.home.offers.map((o) => o.body);

  // The receipt check runs for a client, a chess club in Dammam, and its outcome is quoted.
  const receipts = db.workflows.find((w) => w.id === 'receipt-verify');
  assert.equal(receipts.status, 'client');
  assert.match(receipts.summary.en, /chess club[\s\S]*bank-transfer receipt/);
  assert.match(automation, /chess club in Dammam[\s\S]*bank-transfer receipt[\s\S]*registrations are confirmed without anyone opening one by hand/);
  assert.ok(automationAr.includes(receipts.outcome.ar.replace(/\.$/, '')), 'ar: the outcome of the receipt check is reworded');
  assert.match(db.showcase.sites.find((s) => s.id === 'gambit-tournaments').role.en, /chess club in Dammam/);
  // The two steps of "How a project runs" it borrows.
  assert.match(db.copy.en.automation.process[0], /real samples/);
  assert.match(db.copy.en.automation.process[2], /a person approving anything sensitive/);

  // The restaurant is in the gallery, in his city, and its orders do arrive on WhatsApp.
  const reem = db.showcase.sites.find((s) => s.id === 'alreem-mashwi');
  assert.ok(websites.includes(`${reem.name.en} in Al Khobar`) && websitesAr.includes(`${reem.name.ar} في الخبر`));
  assert.match(reem.role.en, /Al Khobar/);
  assert.ok(reem.highlights.en.includes("Orders arrive ready on the shop's WhatsApp") && websitesAr.includes('يصل الطلب جاهزاً على واتساب المحل'));
  assert.match(websites, /Arabic, English or both/);
  assert.match(websitesAr, /بالعربية أو الإنجليزية أو باللغتين معاً/);

  // What the experience data says he built at DFS, and what it replaced.
  const dfs = db.experience.find((r) => r.id === 'dfs-frontend');
  assert.match(dfs.bullets.en[0], /Built the frontend of the company's custom CRM and quotation platform[\s\S]*replacing spreadsheets and hand-made quotes in every department/);
  assert.match(dfs.company, /Safety Equipment/);
  assert.match(frontend, /at DFS, a safety-equipment company, I built the frontend of the CRM and quotation platform, and it replaced spreadsheets and hand-made quotes in every department/);
  assert.match(frontendAr, /في DFS[\s\S]*بنيت الواجهة الأمامية لمنصّة CRM وعروض الأسعار/);
  assert.match(db.copy.en.about.principles[0].title, /Agree the contract before the first line of code/);
});

/* -------------------------------------------------------- "In numbers" */

/* Six figures a reader can weigh, each read from the data: the sites
   delivered, what the invoice product reads and how fast, what the routing
   saved, the tests and the load test. A count of things made is not a result. */
test('the figures on the home page are results, each read from the data', () => {
  const figures = homeProofFigures(db);
  assert.deepEqual(figures.map((f) => f.value), [String(db.showcase.sites.length), '70+', '~10', '~75%', '494', '5,000']);
  const scanner = db.projects.find((p) => p.id === 'smart-scanner').metrics;
  const screener = db.projects.find((p) => p.id === 'cv-screener').metrics;
  for (const value of ['70+', '~10', '494']) assert.ok(figures.includes(scanner.find((m) => m.value === value)), `${value} is not the project's own metric`);
  assert.ok(figures.includes(screener.find((m) => m.value === '5,000')));
  assert.equal(db.caseStudy.figures.find((f) => f.id === 'saving').value, '75%');

  for (const lang of LANGS) {
    const strip = unescape(page('', lang).split('id="proof"')[1].split('</section>')[0]);
    const shown = [...strip.matchAll(/<span class="proof__value" data-count>([^<]*)<\/span>\s*<span class="proof__label">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
    assert.deepEqual(shown, figures.map((f) => [f.value, f.label[lang]]), lang);
    assert.ok(!/source files|workflows built|ملف مصدري|مسار عمل/.test(strip), `${lang}: a count of things made is back`);
  }
  // The Arabic noun after the number of sites holds from eleven to ninety-nine.
  assert.ok(db.showcase.sites.length >= 11 && db.showcase.sites.length <= 99, 'rewrite the Arabic label: its noun form no longer fits the count');

  const gone = structuredClone(loaded);
  gone.projects.find((p) => p.id === 'cv-screener').metrics = [];
  assert.throws(() => homeProofFigures(gone), /"5,000" of cv-screener/);
});

/* The cards under "Automation systems" say what each system changed and
   carry the status the automation page gives it. */
test('a system card on the home page prints the outcome and the honest status', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const block = unescape(page('', lang).split('<section class="section" id="automation">')[1].split('</section>')[0]);
    for (const w of db.workflows.slice(0, 3)) {
      const card = block.split(`">${w.name[lang]}</a></h3>`)[1].split('</article>')[0];
      assert.ok(card.includes(`<p class="card__body">${w.outcome[lang]}</p>`), `${lang}/${w.id}: outcome`);
      assert.ok(!block.includes(w.summary[lang]), `${lang}/${w.id}: the technical summary is on the home page`);
      assert.ok(block.includes(`<span class="status status--${w.status}">${c.ui.status[w.status]}</span>`), `${lang}/${w.id}: status`);
    }
  }
});

/* ------------------------------------------------------------- quotes */

test('a recommendation on the home page ends where a sentence ends, on the same one in both languages', () => {
  assert.equal(quoteExcerpt({ en: 'One. Two. Three.', ar: 'واحد. اثنان. ثلاثة.' }, 'en', 100), 'One. Two. Three.');
  assert.equal(quoteExcerpt({ en: 'One. Two. Three.', ar: 'واحد. اثنان. ثلاثة.' }, 'en', 12), 'One. Two.');
  assert.equal(quoteExcerpt({ en: 'One. Two. Three.', ar: 'واحد. اثنان. ثلاثة.' }, 'ar', 12), 'واحد. اثنان.');
  // The longer language decides for both, so the two cards stop together.
  assert.equal(quoteExcerpt({ en: 'One. Two.', ar: 'جملة أولى طويلة جداً. جملة ثانية.' }, 'en', 25), 'One.');
  // A first sentence longer than the limit is still printed whole, never cut inside.
  assert.equal(quoteExcerpt({ en: 'A very long first sentence. Two.', ar: 'أ. ب.' }, 'en', 5), 'A very long first sentence.');
  assert.equal(quoteExcerpt({ en: 'Is it? Yes.', ar: 'هل هو؟ نعم. حقاً.' }, 'ar', 8), 'هل هو؟');

  for (const lang of LANGS) {
    const block = unescape(page('', lang).split('<section class="section" id="quotes">')[1].split('</section>')[0]);
    const quotes = [...block.matchAll(/<blockquote class="quote__body">([^<]*)<\/blockquote>/g)].map((m) => m[1]);
    assert.equal(quotes.length, 2);
    for (const [i, t] of db.testimonials.filter((x) => x.featured).slice(0, 2).entries()) {
      assert.ok(t.quote[lang].startsWith(quotes[i]), `${lang}: the excerpt is not the opening of the recommendation`);
      assert.match(quotes[i], /[.!?؟]$/, `${lang}: "${quotes[i].slice(-30)}" stops inside a sentence`);
      assert.ok(!quotes[i].includes('…') && quotes[i].length <= 450, `${lang}: ${quotes[i].length} characters`);
      assert.equal(quotes[i].split(/(?<=[.!?؟])\s+/).length, quoteExcerpt(t.quote, 'en').split(/(?<=[.!?؟])\s+/).length, `${lang}: the two languages stop on different sentences`);
    }
    // Every recommendation can be checked where it was written.
    assert.ok(block.includes(`href="${db.profile.recommendationsUrl}"`) && block.includes(db.copy[lang].work.testimonialsSource), `${lang}: no way to the source`);
  }
  // The sentence a client looks for is inside the first excerpt.
  assert.match(quoteExcerpt(db.testimonials.find((t) => t.featured).quote, 'en'), /He is reliable, responsive, and always open to feedback\.$/);
});

/* The chat is a set of prepared answers. A line under his name that said
   "online" told a visitor he was on the other side of it. */
test('the chat does not claim he is online', () => {
  for (const lang of LANGS) {
    assert.ok(!/online|replies in|متصل|يردّ خلال/.test(db.copy[lang].chat.status), `${lang}: ${db.copy[lang].chat.status}`);
    assert.ok(page('chat', lang).includes(`<span>${db.copy[lang].chat.status}</span>`), `${lang}: the line is not under his name`);
  }
});

/* The daily job search stays a system he built, but no page says it writes
   applications with AI, and it is not filed where an employer looks for
   hiring tools. */
test('the job-search system promises no application written by AI', () => {
  const w = db.workflows.find((x) => x.id === 'ai-job-match');
  const said = JSON.stringify([w.summary, w.highlights, w.outcome, w.headline, w.kind]);
  assert.ok(!/cover letter|applications? (?:is|are) sent|رسائل تغطية|طلب توظيف/i.test(said), 'the page speaks of applications again');
  assert.equal(w.highlights.en.length, w.highlights.ar.length);
  assert.match(w.highlights.en.join(' '), /Nothing is sent without a person's approval on Telegram/);
});

/* --------------------------------------------------------- experience */

/* The page an employer lands on: the sentence about the role, and the CV
   one tap away, at the top and again at the foot. */
test('the experience page offers the CV under the role sentence', () => {
  const cv = db.profile.cv[0].file;
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const hero = unescape(page('work', lang).match(/<section class="hero">[\s\S]*?<\/section>/)[0]);
    assert.ok(hero.indexOf('hero__note') < hero.indexOf('hero__actions'), `${lang}: the buttons are above the sentence`);
    assert.match(hero, new RegExp(`<a class="btn" href="/${cv.replaceAll('.', '\\.')}(?:\\?v=[a-z0-9]+)?" download>${c.ui.downloadCv}</a>`), `${lang}: no CV button`);
    assert.ok(hero.includes(`<a class="btn btn--ghost" href="${pagePath('contact', lang)}">${c.home.ctaButton}</a>`), `${lang}: no way to the contact page`);
  }
});

/* The same fact, told the same way as on the CV: the result is the
   platform's, and the job has ended, so it is in the past tense. */
test('the quotation result is the platform\'s, in the past tense', () => {
  const dfs = db.experience.find((r) => r.id === 'dfs-frontend');
  assert.equal(dfs.bullets.en[1], 'With the platform, preparing a quotation took under two minutes once the data was entered, and all fifteen employees adopted it.');
  assert.ok(!/^Cut |is entered/.test(dfs.bullets.en[1]) && !dfs.bullets.ar[1].startsWith('اختصرت'));
  const metrics = db.projects.find((p) => p.id === 'dfs-dashboard').metrics;
  assert.deepEqual(metrics.map((m) => m.value), ['<2', '15']);
  assert.match(metrics[0].label.en, /with the platform, once the data is entered/);
});

/* ------------------------------------------------------- automation page */

/* The page that sells automation opens with the work an owner knows, and
   offers a way to write to him before the sixteen systems, not after them. */
test('the automation page opens with the work it takes over, and offers the next step early', () => {
  for (const lang of LANGS) {
    const c = db.copy[lang];
    const html = unescape(page('automation', lang));
    assert.ok(!/^(I am|أنا)/.test(c.automation.lead), `${lang}: the lead opens with him, not with the reader's work`);
    assert.ok(!/\bI am\b[^.]*\. I /.test(c.automation.lead) && !c.automation.lead.includes('أنا '), `${lang}: two sentences in a row open with "I"`);
    assert.ok(c.automation.lead.includes('n8n'), `${lang}: the lead lost the word the page is searched by`);

    const services = html.split('id="services"')[1].split('</section>')[0];
    const next = services.split('<div class="process__next"')[1];
    assert.ok(next && next.includes(`<p>${c.automation.processNext}</p>`), `${lang}: no next step under the process`);
    assert.ok(next.includes(`href="${whatsappUrl(db.profile, c.contact.whatsappText)}"`) && next.includes(`href="${pagePath('contact', lang)}"`), `${lang}: the next step has no buttons`);
    assert.ok(html.indexOf('process__next') < html.indexOf('id="systems"'), `${lang}: the next step comes after the systems`);
  }
  // The bots card says what the customer sees, in the words of the two systems behind it.
  const bots = db.copy.en.automation.services.find((s) => s.id === 'bots').body;
  const booking = db.workflows.find((w) => w.id === 'whatsapp-booking');
  const tutor = db.workflows.find((w) => w.id === 'teacher-assistant-bot');
  assert.match(booking.summary.en, /taps a service, then a time slot, in WhatsApp buttons[\s\S]*Google Calendar[\s\S]*confirmed back on WhatsApp/);
  assert.match(bots, /picks a service, then a time, from WhatsApp buttons[\s\S]*Google Calendar[\s\S]*confirmed back on WhatsApp/);
  assert.match(tutor.summary.en, /private tutor in Saudi Arabia[\s\S]*students, schedules, cancellations, and dues/);
  assert.match(bots, /private tutor in Saudi Arabia manages students, schedules and dues/);
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
/* One word per thing. Shops are محلات on the filter chips, so they are
   محلات in every sentence too; and a conjunction joins the Latin word it
   precedes ("وn8n"), the way the rest of the Arabic copy writes it. */
test('Arabic copy uses one word for shops and joins و to a Latin word', () => {
  const hits = [];
  const walk = (node, path) => {
    if (typeof node === 'string') {
      if (/متاجر/.test(node)) hits.push(`${path}: متاجر`);
      if (/(?<![\u0621-\u064A])و [A-Za-z]/.test(node)) hits.push(`${path}: a loose و before a Latin word`);
    } else if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(db.copy.ar, 'copy.ar');
  assert.deepEqual(hits, []);
  assert.equal(db.copy.ar.showcase.segments.shops, 'محلات');
});

/* Arabic that says what the English says, in the places a reviewer found it
   saying something else. */
test('the Arabic service cards say what the systems do', () => {
  const body = Object.fromEntries(db.copy.ar.automation.services.map((s) => [s.id, s.body]));
  // A reason for every rejected row, not a rejection of every row.
  assert.match(body.data, /سبب الرفض لكل صف مرفوض/);
  // The owner approves on Telegram; the review is not "from Telegram".
  assert.match(body.reviews, /يوافق صاحب العمل عبر تيليجرام/);
  assert.ok(!/سلبي من تيليجرام/.test(body.reviews));
  // The card and the system it links to name the product the same way.
  assert.match(body.reviews, /تقييمات Google/);
});

/* One thing, one spelling, and one set of digits. Excel was written two ways
   in the Arabic data, and a page showed "70+" a few lines above "٧٠": the
   dates, the figures and the captions are all in Western digits. */
test('the Arabic data writes Excel in Latin letters and every number in Western digits', () => {
  const names = ['projects', 'workflows', 'case-study', 'showcase', 'experience', 'credentials', 'testimonials', 'skills', 'profile', 'copy/ar'];
  for (const name of names) {
    const raw = readFileSync(`data/${name}.json`, 'utf8');
    assert.ok(!/[إا]كسل/.test(raw), `data/${name}.json: Excel in Arabic letters`);
    const digits = raw.match(/.{0,25}[\u0660-\u0669].{0,25}/);
    assert.equal(digits, null, `data/${name}.json: Arabic-Indic digits in "${digits?.[0]}"`);
  }
  assert.ok(/ملف Excel/.test(readFileSync('data/workflows.json', 'utf8')));
});

/* The labels of a flow are printed as the numbered steps of a page, under
   prose that already names the same things. They use the words of that
   prose: Smart Scanner reads invoices, the tutor is a مدرّس, and the marks
   the sentences carry are on the labels too. */
test('the step labels of a flow use the words of the page they are printed on', () => {
  const flow = (id) => db.workflows.find((w) => w.id === id).flow.nodes.map((n) => n.label);
  for (const label of flow('smart-scanner-pipeline')) {
    assert.ok(!/receipt/i.test(label.en) && !label.ar.includes('إيصال'), `Smart Scanner speaks of invoices, not "${label.en}" / "${label.ar}"`);
  }
  assert.ok(flow('smart-scanner-pipeline').some((l) => l.en === 'Invoice upload' && l.ar === 'رفع الفاتورة'));
  assert.ok(flow('smart-scanner-pipeline').some((l) => l.en === 'Valid invoice?' && l.ar === 'هل الفاتورة صالحة؟'));
  // The check for a chess club's registrations does read receipts.
  assert.ok(flow('receipt-verify').some((l) => l.en === 'Receipt upload'));
  assert.ok(flow('teacher-assistant-bot').some((l) => l.ar === 'الوكيل الذكي للمدرّس') && db.workflows.find((w) => w.id === 'teacher-assistant-bot').summary.ar.includes('المدرّس'));

  const labels = db.workflows.filter((w) => w.flow).flatMap((w) => w.flow.nodes.map((n) => n.label.ar));
  for (const bare of [/تلقائيا(?!ً)/, /آليا(?!ً)/, /مصرح/, /الموحد(?!ّ)/, /مولد(?!ّ)/, /مخصص/, /موجه/, /كمتجاهل/]) {
    assert.deepEqual(labels.filter((l) => bare.test(l)), [], `a label without the marks the prose carries: ${bare}`);
  }
});

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
