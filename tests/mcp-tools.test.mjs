import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import {
  getProfile,
  searchProjects,
  getWorkflows,
  getExperience,
  getCredentials,
  getTestimonials,
  answerFaq,
  TOOLS,
} from '../mcp/tools.js';

const db = loadDb('data');

test('getProfile returns identity in the requested language', () => {
  assert.equal(getProfile(db, { lang: 'en' }).name, 'Nour Aldeen Tofi');
  assert.equal(getProfile(db, { lang: 'ar' }).name, 'نور الدين توفي');
});

test('getProfile rejects an unknown language', () => {
  assert.throws(() => getProfile(db, { lang: 'fr' }), /lang/);
});

test('getProfile never exposes an unresolved link', () => {
  assert.ok(getProfile(db, {}).links.every((l) => typeof l.url === 'string'));
});

test('searchProjects matches on stack, case-insensitively', () => {
  const hits = searchProjects(db, { query: 'n8n' });
  assert.ok(hits.length > 0);
  assert.ok(hits.some((p) => p.id === 'smart-scanner'));
});

test('searchProjects honours limit and filters by tech', () => {
  assert.equal(searchProjects(db, { query: '', limit: 2 }).length, 2);
  assert.ok(searchProjects(db, { tech: 'React' }).every((p) => p.stack.join(' ').includes('React')));
});

test('searchProjects rejects a nonsense limit', () => {
  assert.throws(() => searchProjects(db, { limit: 0 }), /limit/);
});

test('getExperience filters by company substring', () => {
  assert.equal(getExperience(db, { company: 'NexLead' }).length, 1);
  assert.equal(getExperience(db, {}).length, 5);
});

test('getExperience flags the current roles', () => {
  const current = getExperience(db, {}).filter((e) => e.current);
  assert.ok(current.length >= 1);
  assert.ok(current.every((e) => e.end === null));
});

test('getWorkflows returns every automation with its outcome', () => {
  const rows = getWorkflows(db, {});
  assert.equal(rows.length, 6);
  assert.ok(rows.every((w) => typeof w.outcome === 'string' && w.outcome.length > 10));
});

test('getCredentials can filter to certifications', () => {
  assert.equal(getCredentials(db, { kind: 'certification' }).length, 12);
});

test('getTestimonials returns all four with both languages resolved', () => {
  const rows = getTestimonials(db, { lang: 'ar' });
  assert.equal(rows.length, 4);
  assert.ok(rows.every((t) => t.quote.length > 40));
});

test('answerFaq matches a natural-language question', () => {
  const a = answerFaq(db, { question: 'what is smart scanner?' });
  assert.equal(a.matched, true);
  assert.match(a.answer, /Smart Scanner/);
});

test('answerFaq falls back to listing questions when nothing matches', () => {
  const a = answerFaq(db, { question: 'zzzzz qqqqq' });
  assert.equal(a.matched, false);
  assert.ok(Array.isArray(a.available) && a.available.length > 0);
});

test('every registered tool has a description and a working handler', () => {
  assert.equal(TOOLS.length, 7);
  for (const t of TOOLS) {
    assert.ok(t.description.length > 40, `${t.name} needs a useful description`);
    assert.equal(t.inputSchema.type, 'object');
    assert.doesNotThrow(() => t.handler(db, t.name === 'answer_faq' ? { question: 'who' } : {}));
  }
});
