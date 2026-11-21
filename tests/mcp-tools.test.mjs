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
  assert.equal(getProfile(db, { lang: 'ar' }).name, 'نور الدين طفي');
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

/* Between jobs there is no current role at all, and that must read as such. */
test('getExperience flags exactly the roles that are still running', () => {
  for (const e of getExperience(db, {})) assert.equal(e.current, e.end === null, `${e.company}: current disagrees with end`);
});

test('getWorkflows returns every automation with its outcome', () => {
  const rows = getWorkflows(db, {});
  assert.equal(rows.length, db.workflows.length);
  assert.ok(rows.every((w) => typeof w.outcome === 'string' && w.outcome.length > 10));
});

test('getCredentials can filter to certifications', () => {
  assert.equal(getCredentials(db, { kind: 'certification' }).length, 13);
});

test('getTestimonials returns every recommendation with both languages resolved', () => {
  const rows = getTestimonials(db, { lang: 'ar' });
  assert.equal(rows.length, db.testimonials.length);
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

/* A year is a pair in the data when its wording differs by language
   ("2025 to 2026", "2025 حتى الآن"). A tool answers in one language, so it
   hands out the words of that language, never the pair. */
test('a year is given in the language asked for, as text', () => {
  for (const lang of ['en', 'ar']) {
    const years = [...searchProjects(db, { lang, limit: 100 }), ...getWorkflows(db, { lang })].map((x) => x.year);
    assert.ok(years.length >= db.projects.length, 'every project and system is asked');
    for (const year of years) assert.equal(typeof year, 'string', `${lang}: ${JSON.stringify(year)}`);
  }
  const dfs = (lang) => searchProjects(db, { query: 'DFS', lang }).find((p) => p.id === 'dfs-dashboard').year;
  assert.equal(dfs('en'), '2025 to 2026');
  assert.equal(dfs('ar'), '2025 إلى 2026');
});
