import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import {
  personLd,
  projectsLd,
  credentialsLd,
  reviewsLd,
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
  assert.ok(p.sameAs.includes('https://www.linkedin.com/in/nour-aldeen-tofi-19b116240'));
  assert.ok(p.sameAs.every((u) => typeof u === 'string'), 'null sameAs entries must be dropped');
  assert.ok(p.knowsAbout.includes('n8n'));
});

test('person renders in Arabic when asked', () => {
  const p = personLd(db, 'ar');
  assert.equal(p.name, 'نور الدين توفي');
  assert.equal(p.alternateName, 'Nour Aldeen Tofi');
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

test('recommendations become reviews pointing at the person', () => {
  const reviews = reviewsLd(db, 'en');
  assert.equal(reviews.length, 4);
  assert.equal(reviews[0]['@type'], 'Review');
  assert.equal(reviews[0].itemReviewed['@id'], `${db.profile.site}/#nour`);
  assert.ok(reviews[0].reviewBody.length > 40);
});

test('faq entries become questions with accepted answers', () => {
  const faq = faqLd(db, 'en');
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, db.copy.en.about.faq.length);
  assert.equal(faq.mainEntity[0]['@type'], 'Question');
  assert.equal(faq.mainEntity[0].acceptedAnswer['@type'], 'Answer');
});

test('breadcrumbs are absolute and language-aware', () => {
  const crumbs = breadcrumbLd('projects', 'ar', db);
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.match(crumbs.itemListElement.at(-1).item, /\/ar\/projects\.html$/);
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
