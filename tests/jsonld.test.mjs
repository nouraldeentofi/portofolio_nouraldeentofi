import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDb } from '../scripts/lib/load.mjs';
import {
  personLd,
  PERSON_ON_PAGE,
  pageTitle,
  projectsLd,
  workflowsLd,
  credentialsLd,
  recommendationsLd,
  profilePageLd,
  faqLd,
  breadcrumbLd,
  websiteLd,
  toScriptTag,
} from '../scripts/lib/jsonld.mjs';

const db = loadDb('data');

test('person carries the identity graph and drops unresolved links', () => {
  const p = personLd(db, 'en');
  assert.equal(p['@type'], 'Person');
  assert.equal(p.name, 'Nour Aldeen Tofi');
  assert.equal(p.address.addressLocality, 'Al Khobar');
  assert.equal(p.address.addressCountry, 'SA');
  assert.ok(p.sameAs.some((u) => u.includes('linkedin.com/in/nouraldeentofi')));
  assert.ok(p.sameAs.every((u) => typeof u === 'string'), 'null sameAs entries must be dropped');
  // The skills are shown on the about page, so that node lists them.
  assert.ok(personLd(db, 'en', 'about').knowsAbout.includes('n8n'));
});

test('person renders in Arabic when asked', () => {
  const p = personLd(db, 'ar', '');
  assert.equal(p.name, 'نور الدين طفي');
  assert.ok(Array.isArray(p.alternateName));
  assert.ok(p.alternateName.includes('Nour Aldeen Tofi'));
});

/* Google: "Don't mark up content that is not visible to readers of the
   page", "even if the information is accurate". The same full node used to
   sit on every page: the phone number on the 404, sixty skills on the
   contact page. Now every page says who he is, and a page adds only what it
   shows. */
test('the Person node is slim everywhere, and a page adds only what it shows', () => {
  const slim = ['@context', '@type', '@id', 'name', 'jobTitle', 'url', 'image', 'address', 'sameAs'];
  const adds = {
    '': ['givenName', 'familyName', 'alternateName', 'description', 'knowsLanguage'],
    about: ['alternateName', 'email', 'knowsAbout', 'hasOccupation', 'seeks'],
    work: ['hasCredential', 'alumniOf'],
    contact: ['email', 'telephone', 'seeks'],
  };
  assert.deepEqual(Object.keys(PERSON_ON_PAGE).sort(), Object.keys(adds).sort());

  for (const lang of ['en', 'ar']) {
    // No page, an unknown page and a page that shows nothing more: the slim node.
    for (const page of [undefined, null, 'projects', 'showcase', 'automation', 'chat', 'projects/smart-scanner', '404']) {
      assert.deepEqual(Object.keys(personLd(db, lang, page)).sort(), [...slim].sort(), `${lang}/${page}`);
    }
    for (const [page, extra] of Object.entries(adds)) {
      assert.deepEqual(Object.keys(personLd(db, lang, page)).sort(), [...slim, ...extra].sort(), `${lang}/${page || 'home'}`);
    }
    // One person: the same @id, name and profiles on every node.
    const nodes = [undefined, '', 'about', 'work', 'contact'].map((page) => personLd(db, lang, page));
    for (const n of nodes) {
      assert.equal(n['@id'], `${db.profile.site}/#nour`);
      assert.deepEqual(n.sameAs, nodes[0].sameAs);
      assert.deepEqual(n.image, nodes[0].image);
    }
    // No key is ever emitted empty.
    for (const n of nodes) for (const [key, value] of Object.entries(n)) assert.notEqual(value, undefined, key);
  }
});

/* schema.org's email is the address itself. "mailto:" makes it a link. */
test('the email in the markup is a plain address', () => {
  for (const page of ['about', 'contact']) {
    assert.equal(personLd(db, 'en', page).email, db.profile.email);
    assert.ok(!JSON.stringify(personLd(db, 'en', page)).includes('mailto:'));
  }
  assert.equal(personLd(db, 'en', 'contact').telephone, db.profile.phone);
});

/* The Arabic page used to name his occupation in English. */
test('the occupation is named in the language of the page', () => {
  assert.equal(personLd(db, 'en', 'about').hasOccupation.name, 'AI Automation Engineer');
  assert.equal(personLd(db, 'ar', 'about').hasOccupation.name, 'مهندس أتمتة بالذكاء الاصطناعي');
  for (const lang of ['en', 'ar']) {
    const job = personLd(db, lang, 'about').hasOccupation;
    assert.equal(job.name, db.profile.availability.roles[lang][0]);
    assert.equal(job.occupationLocation.name, db.profile.location.city[lang]);
  }
});

test('alternateName carries every spelling variant, without duplicates', () => {
  const p = personLd(db, 'en', '');
  // The misspellings are listed deliberately, so a search for one still
  // resolves. This is the only place in the whole output that carries them.
  for (const wrong of db.profile.nameMisspellings) assert.ok(p.alternateName.includes(wrong));
  for (const real of db.profile.nameVariants.filter((n) => n !== p.name)) assert.ok(p.alternateName.includes(real));
  assert.ok(p.alternateName.includes('nouraldeentofi'));
  assert.equal(new Set(p.alternateName).size, p.alternateName.length, 'no duplicates');
  assert.ok(!p.alternateName.includes(p.name), 'the canonical name is not also an alias');
});

/* The list pages name each entry and where it is read in full, and nothing
   more: what the thing is lives once, on its own page. Google requires a
   price and a rating for a SoftwareApplication, and neither may be invented. */
test('the projects and systems lists are a position, a name and an address on this site', () => {
  for (const lang of ['en', 'ar']) {
    const prefix = lang === 'ar' ? '' : '/en';
    const projects = projectsLd(db, lang);
    assert.equal(projects['@type'], 'ItemList');
    assert.deepEqual(
      projects.itemListElement,
      db.projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: `${db.profile.site}${prefix}/projects/${p.id}` })),
    );

    const systems = workflowsLd(db, lang);
    assert.equal(systems.itemListElement.length, db.workflows.length);
    for (const [i, el] of systems.itemListElement.entries()) {
      assert.deepEqual(Object.keys(el), ['@type', 'position', 'name', 'url']);
      assert.equal(el.position, i + 1);
      assert.equal(el.name, db.workflows[i].name[lang]);
      assert.ok(el.url.startsWith(`${db.profile.site}${prefix}/`), `${lang}: ${el.url} is not on this site`);
    }
    // One with a page of its own, one shown on its product's page, one with neither.
    const urlOf = (id) => systems.itemListElement[db.workflows.findIndex((w) => w.id === id)].url;
    assert.equal(urlOf('google-review-reply'), `${db.profile.site}${prefix}/automation/google-review-reply`);
    assert.equal(urlOf('smart-scanner-pipeline'), `${db.profile.site}${prefix}/projects/smart-scanner#automation`);
    assert.equal(urlOf('crm-lead-cleaner'), `${db.profile.site}${prefix}/automation#crm-lead-cleaner`);

    assert.ok(!/SoftwareApplication|WebApplication|MobileApplication|offers|aggregateRating/.test(JSON.stringify([projects, systems])));
  }
});

test('certifications become credentials with their identifier', () => {
  const creds = credentialsLd(db, 'en');
  const advancedReact = creds.find((c) => c.name === 'Advanced React');
  assert.ok(advancedReact);
  assert.equal(advancedReact['@type'], 'EducationalOccupationalCredential');
  assert.equal(advancedReact.recognizedBy.name, 'Meta');
  assert.equal(advancedReact.identifier, '1OMX1QZY5G5Q');
});

/* Google reported every one as an invalid review: a person cannot be the
   thing reviewed. They are quotations about him instead. */
test('recommendations become quotations about the person, never reviews', () => {
  const quotes = recommendationsLd(db, 'en');
  assert.equal(quotes.length, db.testimonials.length);
  assert.equal(quotes[0]['@type'], 'Quotation');
  assert.equal(quotes[0].about['@id'], `${db.profile.site}/#nour`);
  assert.ok(quotes[0].text.length > 40);
  assert.ok(!JSON.stringify(quotes).includes('itemReviewed'));
});

/* The date is for the build to supply. A module under scripts/lib is a pure
   transform, so it is handed the timestamp and never reads the clock. */
test('the profile page carries the timestamp it is given, and invents none', () => {
  const stamp = '2026-11-15T00:00:00+03:00';
  assert.equal(profilePageLd(db, 'en', stamp).dateModified, stamp);
  assert.deepEqual(profilePageLd(db, 'en', stamp), profilePageLd(db, 'en', stamp));
  assert.ok(!('dateModified' in profilePageLd(db, 'en')), 'a date appeared from nowhere');
  assert.ok(!/new Date|Date\.now/.test(readFileSync('scripts/lib/jsonld.mjs', 'utf8')), 'jsonld.mjs reads the clock');
});

/* schema.org has separate fields for the two halves of a name, and a model
   that knows which half is the family name does not have to guess. */
test('the person states given and family name in the language of the page', () => {
  assert.equal(personLd(db, 'en', '').givenName, 'Nour Aldeen');
  assert.equal(personLd(db, 'en', '').familyName, 'Tofi');
  assert.equal(personLd(db, 'ar', '').givenName, 'نور الدين');
  assert.equal(personLd(db, 'ar', '').familyName, 'طفي');
});

/* sameAs says "this address is the same thing as this person". A product he
   built is not, however proud of it he is. */
test('sameAs lists his own profiles only, never a product', () => {
  const p = personLd(db, 'en');
  const products = db.profile.sameAs.filter((s) => s.identity === false);
  assert.deepEqual(products.map((s) => s.platform).sort(), ['Google Play', 'Smart Scanner']);
  for (const s of products) assert.ok(!p.sameAs.includes(s.url), `${s.platform} is in Person.sameAs`);
  for (const s of db.profile.sameAs.filter((x) => x.url && x.identity !== false)) assert.ok(p.sameAs.includes(s.url));
});

test('the person is described in words the home page shows', () => {
  for (const lang of ['en', 'ar']) assert.equal(personLd(db, lang, '').description, db.copy[lang].home.intro);
});

/* Google reads the site name from this node, and one @id must say one thing. */
test('the site is one node, the same in every language', () => {
  const site = websiteLd(db);
  assert.deepEqual(websiteLd(db, 'ar'), websiteLd(db, 'en'));
  assert.equal(site.url, `${db.profile.site}/`);
  assert.equal(site.name, 'Nour Aldeen Tofi');
  assert.deepEqual(site.alternateName, ['نور الدين طفي', 'Nour Tofi', 'nouraldeentofi.com']);
  assert.deepEqual(site.inLanguage, ['ar', 'en']);
  assert.deepEqual(site.publisher, { '@id': `${db.profile.site}/#nour` });
  assert.ok(!('description' in site), 'a description would differ by language');
});

test('faq entries become questions with accepted answers', () => {
  const faq = faqLd(db, 'en');
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, db.copy.en.about.faq.length);
  assert.equal(faq.mainEntity[0]['@type'], 'Question');
  assert.equal(faq.mainEntity[0].acceptedAnswer['@type'], 'Answer');
});

test('breadcrumbs are absolute and language-aware', () => {
  // The host comes from data/profile.json, never a literal here — otherwise
  // moving the site to a new domain fails a test that is not about domains.
  const ar = breadcrumbLd('projects', 'ar', db);
  assert.equal(ar['@type'], 'BreadcrumbList');
  assert.equal(ar.itemListElement.at(-1).item, `${db.profile.site}/projects`);
  assert.equal(ar.itemListElement[0].item, `${db.profile.site}/`);
  const en = breadcrumbLd('projects', 'en', db);
  assert.equal(en.itemListElement.at(-1).item, `${db.profile.site}/en/projects`);
  assert.equal(en.itemListElement[0].item, `${db.profile.site}/en/`);
});

/* A breadcrumb names a page by its label in the navigation, so the trail in
   a search result and the menu on the page call it the same thing. */
test('a breadcrumb names each page by its navigation label', () => {
  for (const lang of ['en', 'ar']) {
    for (const page of ['about', 'work', 'projects', 'showcase', 'automation', 'chat', 'contact']) {
      const [home, here] = breadcrumbLd(page, lang, db).itemListElement;
      assert.equal(home.name, db.copy[lang].nav.home);
      assert.equal(here.name, db.copy[lang].nav[page], `${lang}/${page}`);
      assert.equal(pageTitle(db, page, lang), db.copy[lang].nav[page]);
    }
  }
  assert.equal(breadcrumbLd('work', 'en', db).itemListElement[1].name, 'Experience');
  assert.equal(breadcrumbLd('showcase', 'ar', db).itemListElement[1].name, 'المواقع');
  assert.equal(breadcrumbLd('automation', 'en', db).itemListElement[1].name, 'Automation');
});

test('the home page has no breadcrumb: a trail of one is not eligible', () => {
  assert.equal(breadcrumbLd('', 'en', db), null);
  assert.equal(breadcrumbLd('', 'ar', db), null);
  assert.equal(breadcrumbLd('about', 'en', db).itemListElement.length, 2);
});

test('script tag emits parseable json-ld', () => {
  const tag = toScriptTag(personLd(db, 'en'));
  const json = tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('script tag escapes a closing script sequence', () => {
  const tag = toScriptTag({ '@context': 'https://schema.org', '@type': 'Thing', name: '</script>' });
  assert.ok(!/<\/script>\s*</.test(tag.slice(0, -20)), 'must not allow tag breakout');
});

test('multiple objects are combined into a single @graph', () => {
  const tag = toScriptTag(personLd(db, 'en'), faqLd(db, 'en'));
  const parsed = JSON.parse(tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  assert.equal(parsed['@context'], 'https://schema.org');
  assert.equal(parsed['@graph'].length, 2);
  assert.ok(!('@context' in parsed['@graph'][0]), 'inner objects must not repeat @context');
});
