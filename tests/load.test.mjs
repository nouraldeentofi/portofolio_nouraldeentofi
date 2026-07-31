import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';

test('loads profile with required identity fields', () => {
  const db = loadDb('data');
  assert.equal(db.profile.email, 'nouraldeentofi@gmail.com');
  assert.equal(db.profile.location.countryCode, 'SA');
  assert.equal(db.profile.location.city.en, 'Al Khobar');
});

test('sameAs entries are either a valid url or an explicit null with a todo', () => {
  const db = loadDb('data');
  assert.ok(db.profile.sameAs.length > 0);
  for (const entry of db.profile.sameAs) {
    if (entry.url === null) {
      assert.equal(typeof entry.todo, 'string', `${entry.platform} null url needs a todo`);
    } else {
      assert.doesNotThrow(() => new URL(entry.url), `${entry.platform} url is malformed`);
    }
  }
});

test('throws a named error when a required key is missing', () => {
  assert.throws(() => loadDb('tests/fixtures/broken'), /profile\.json.*email/);
});

test('experience is newest-first and never mentions Alessa', () => {
  const db = loadDb('data');
  const dates = db.experience.map((e) => e.start);
  assert.deepEqual([...dates].sort().reverse(), dates, 'experience must be newest first');
  const blob = JSON.stringify(db).toLowerCase();
  assert.ok(!blob.includes('alessa'), 'Alessa Group must not appear in any data file');
});

test('the flagship product is named Smart Scanner everywhere', () => {
  const db = loadDb('data');
  const blob = JSON.stringify(db);
  assert.ok(blob.includes('Smart Scanner'));
  assert.ok(!blob.includes('Receipt Scanner'), 'use Smart Scanner, never Receipt Scanner');
});

test('every project and workflow carries both languages', () => {
  const db = loadDb('data');
  for (const item of [...db.projects, ...db.workflows]) {
    const ar = item.summary?.ar ?? item.tagline?.ar;
    assert.equal(typeof ar, 'string', `${item.id} missing Arabic`);
  }
});

test('every certification records its issuer and credential id', () => {
  const db = loadDb('data');
  const certs = db.credentials.filter((c) => c.kind === 'certification');
  assert.equal(certs.length, 12);
  for (const c of certs) {
    assert.ok(c.issuer, `${c.id} missing issuer`);
    assert.ok(c.credentialId, `${c.id} missing credential id`);
  }
});

test('all four recommendations are present', () => {
  const db = loadDb('data');
  assert.equal(db.testimonials.length, 4);
  const authors = db.testimonials.map((t) => t.author).sort();
  assert.deepEqual(authors, ['George Drouj', 'Haitham Zedan', 'Hamza Shansho', 'Tawheed Malkat']);
});

test('English and Arabic copy expose identical key sets', () => {
  const db = loadDb('data');
  const flatten = (o, p = '') =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${p}${k}.`) : [`${p}${k}`],
    );
  assert.deepEqual(flatten(db.copy.en).sort(), flatten(db.copy.ar).sort());
});

test('copy arrays are the same length in both languages', () => {
  const db = loadDb('data');
  const pairs = [
    ['about.body', db.copy.en.about.body, db.copy.ar.about.body],
    ['about.principles', db.copy.en.about.principles, db.copy.ar.about.principles],
    ['about.faq', db.copy.en.about.faq, db.copy.ar.about.faq],
    ['automation.caseBody', db.copy.en.automation.caseBody, db.copy.ar.automation.caseBody],
  ];
  for (const [name, en, ar] of pairs) {
    assert.equal(en.length, ar.length, `${name} length differs between languages`);
  }
});

test('the site never claims Riyadh as his base', () => {
  const db = loadDb('data');
  const current = db.experience.filter((e) => e.end === null);
  for (const role of current) {
    assert.ok(!/Riyadh/i.test(role.location.en), `${role.id} must not be based in Riyadh`);
  }
});

test('the Arabic name is spelled طفي, never توفي', () => {
  const db = loadDb('data');
  const blob = JSON.stringify(db);
  assert.ok(blob.includes('نور الدين طفي'), 'canonical Arabic name missing');
  assert.ok(
    !blob.includes('نور الدين توفي'),
    'توفي is a different word (reads as "passed away") — the name is طفي',
  );
});

test('every entity named on the site has a links.json entry', () => {
  const db = loadDb('data');
  const known = { ...db.links.people, ...db.links.organizations };

  const named = new Set([
    ...db.experience.map((e) => e.company),
    ...db.testimonials.map((t) => t.author),
    ...db.credentials.map((c) => c.issuer),
  ]);

  for (const name of named) {
    assert.ok(known[name], `"${name}" is named on the site but missing from links.json`);
  }
});

test('links.json urls are absolute, or null with a todo', () => {
  const db = loadDb('data');
  for (const group of ['people', 'organizations']) {
    for (const [name, entry] of Object.entries(db.links[group])) {
      if (entry.url === null) {
        assert.equal(typeof entry.todo, 'string', `${name} needs a todo`);
      } else {
        assert.doesNotThrow(() => new URL(entry.url), `${name} url is malformed`);
        assert.match(entry.url, /^https:\/\//, `${name} should use https`);
      }
    }
  }
});
