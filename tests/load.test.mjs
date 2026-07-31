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

test('the site never claims Riyadh as his base', () => {
  const db = loadDb('data');
  const current = db.experience.filter((e) => e.end === null);
  for (const role of current) {
    assert.ok(!/Riyadh/i.test(role.location.en), `${role.id} must not be based in Riyadh`);
  }
});
