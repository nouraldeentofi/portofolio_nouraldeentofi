import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import {
  personLd,
  projectsLd,
  credentialsLd,
  recommendationsLd,
  profilePageLd,
  faqLd,
  breadcrumbLd,
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
  assert.ok(p.knowsAbout.includes('n8n'));
});

test('person renders in Arabic when asked', () => {
  const p = personLd(db, 'ar');
  assert.equal(p.name, 'نور الدين طفي');
  assert.ok(Array.isArray(p.alternateName));
  assert.ok(p.alternateName.includes('Nour Aldeen Tofi'));
});

test('alternateName carries every spelling variant, without duplicates', () => {
  const p = personLd(db, 'en');
  // the misspelling is listed deliberately, so a search for it still resolves
  assert.ok(p.alternateName.includes('نور الدين توفي'));
  assert.ok(p.alternateName.includes('nouraldeentofi'));
  assert.equal(new Set(p.alternateName).size, p.alternateName.length, 'no duplicates');
  assert.ok(!p.alternateName.includes(p.name), 'the canonical name is not also an alias');
});

test('projects become SoftwareApplication entries in an ItemList', () => {
  const list = projectsLd(db, 'en');
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.itemListElement.length, db.projects.length);
  assert.equal(list.itemListElement[0].item['@type'], 'SoftwareApplication');
  assert.equal(list.itemListElement[0].position, 1);
  for (const el of list.itemListElement) {
    assert.ok(!('url' in el.item) || typeof el.item.url === 'string');
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

test('the profile page carries a full timestamp, which Google requires', () => {
  assert.match(profilePageLd(db, 'en').dateModified, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
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
