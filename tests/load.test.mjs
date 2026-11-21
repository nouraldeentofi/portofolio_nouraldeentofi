import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, isCalendarDay, RESERVED_IDS, STATUSES } from '../scripts/lib/load.mjs';
import { byCompany } from '../scripts/lib/experience.mjs';
import { existsSync, cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MISSPELLED_NAME } from '../scripts/lib/gates.mjs';

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
  // Newest first, by employer: a company's roles stay together (a promotion is
  // one tenure), employers are ordered by when they ended (still running first),
  // and roles inside one employer by when they started.
  const groups = byCompany(db.experience);
  const ends = groups.map((g) => g.end ?? '9999-12');
  assert.deepEqual([...ends].sort().reverse(), ends, 'employers must be newest first by end date');
  for (const g of groups) {
    const starts = g.roles.map((r) => r.start);
    assert.deepEqual([...starts].sort().reverse(), starts, `${g.company}: roles must be newest first`);
  }
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
  assert.equal(certs.length, 13);
  for (const c of certs) {
    assert.ok(c.issuer, `${c.id} missing issuer`);
    assert.ok(c.credentialId, `${c.id} missing credential id`);
  }
  // Newest first, as the experience page lists them.
  const issued = certs.map((c) => c.issued);
  assert.deepEqual([...issued].sort().reverse(), issued, 'certifications must be newest first');
  const claude = certs.find((c) => c.credentialId === 'NR6XYML8054R');
  assert.equal(claude?.name.en, 'Building Apps and AI Agents with Claude Code');
  assert.equal(claude.issuer, 'Coursera');
  assert.equal(claude.issued, '2026-10');
});

/* The prices are printed on the websites page, and a price printed online
   binds the seller: one with half a label or an amount that is not a whole
   number stops the build instead of reaching the page. */
test('the loader refuses a price it cannot print as it stands', () => {
  const db = loadDb('data');
  assert.deepEqual(db.showcase.prices.currency, { en: 'SAR', ar: 'ريال' });
  assert.deepEqual(db.showcase.prices.items.map((p) => p.amount), [750, 999]);

  const dir = mkdtempSync(join(tmpdir(), 'portfolio-prices-'));
  try {
    const load = (change) => {
      cpSync('data', dir, { recursive: true });
      const showcase = JSON.parse(readFileSync('data/showcase.json', 'utf8'));
      change(showcase.prices, showcase);
      writeFileSync(join(dir, 'showcase.json'), JSON.stringify(showcase));
      return loadDb(dir);
    };
    assert.doesNotThrow(() => load(() => {}));
    assert.throws(() => load((p, s) => { delete s.prices; }), /showcase\.json prices: missing required key "currency\.en"/);
    assert.throws(() => load((p) => { delete p.currency.ar; }), /showcase\.json prices: missing required key "currency\.ar"/);
    assert.throws(() => load((p) => { p.items = []; }), /expected "items" to be a list of prices/);
    assert.throws(() => load((p) => { delete p.items[1].label.ar; }), /prices\.items\[1\] \(shop-or-restaurant\): missing required key "label\.ar"/);
    for (const amount of ['750', 0, -1, 749.5]) {
      assert.throws(() => load((p) => { p.items[0].amount = amount; }), /an amount is a whole number above zero/, String(amount));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* A status is a claim about a real system, and each one the data may carry
   is printed by a label in both languages. "beta" sits between live and
   built: it runs, for the people let in only, and is not open to everyone.
   Anything else, or a status with no label, stops the build. */
test('the loader accepts only the statuses it can label', () => {
  assert.deepEqual(STATUSES, ['client', 'live', 'beta', 'built']);
  const db = loadDb('data');
  for (const w of db.workflows) assert.ok(STATUSES.includes(w.status), `${w.id}: ${w.status}`);

  const dir = mkdtempSync(join(tmpdir(), 'portfolio-status-'));
  try {
    const load = (change) => {
      cpSync('data', dir, { recursive: true });
      const workflows = JSON.parse(readFileSync('data/workflows.json', 'utf8'));
      const copy = { en: JSON.parse(readFileSync('data/copy/en.json', 'utf8')), ar: JSON.parse(readFileSync('data/copy/ar.json', 'utf8')) };
      change(workflows, copy);
      writeFileSync(join(dir, 'workflows.json'), JSON.stringify(workflows));
      for (const lang of ['en', 'ar']) writeFileSync(join(dir, 'copy', `${lang}.json`), JSON.stringify(copy[lang]));
      return loadDb(dir);
    };
    assert.doesNotThrow(() => load(() => {}));
    assert.throws(() => load((w) => { w[0].status = 'production'; }), /workflows\.json \(universal-web-scraper\): unknown status "production"/);
    assert.throws(() => load((w, c) => { delete c.ar.ui.status.beta; }), /copy\/ar\.json: ui\.status must label client, live, beta, built/);
    assert.throws(() => load((w, c) => { c.en.ui.status.demo = 'Demo'; }), /copy\/en\.json: ui\.status must label/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every recommendation the site shows is present, newest first', () => {
  const db = loadDb('data');
  const authors = db.testimonials.map((t) => t.author).sort();
  assert.deepEqual(authors, ['George Drouj', 'Hamza Shansho', 'Sameeh Hussein', 'Tareq Nasif', 'Tawheed Malkat']);
  const dates = db.testimonials.map((t) => t.date);
  assert.deepEqual([...dates].sort().reverse(), dates, 'recommendations must be newest first');
  for (const t of db.testimonials) assert.ok(['en', 'ar'].includes(t.lang), `${t.id}: lang must say which language the author wrote in`);
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
    ['automation.services', db.copy.en.automation.services, db.copy.ar.automation.services],
    ['automation.process', db.copy.en.automation.process, db.copy.ar.automation.process],
    ['showcase.offer', db.copy.en.showcase.offer, db.copy.ar.showcase.offer],
    ['home.offers', db.copy.en.home.offers, db.copy.ar.home.offers],
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

test('the Arabic name is spelled طفي, and the misspelling is kept in a list of its own', () => {
  const db = loadDb('data');

  assert.equal(db.profile.name.ar, 'نور الدين طفي', 'canonical Arabic name');
  assert.equal(db.profile.nameParts.family.ar, 'طفي');
  assert.equal(db.profile.shortName.ar, 'نور طفي');

  // The misspelling reads as a different word ("passed away"). People do type
  // it, so it is kept for a search to resolve, but in exactly one place in the
  // data: nameMisspellings, apart from the real spellings, so that nothing
  // which prints his names can pick it up. What ships is tested in
  // identity.test.mjs: there it may reach Person.alternateName and nothing else.
  const { nameMisspellings, ...rest } = db.profile;
  assert.ok(nameMisspellings.length > 0, 'the misspelling should be listed for entity resolution');
  assert.ok(nameMisspellings.every((n) => MISSPELLED_NAME.test(n)), 'nameMisspellings holds something that is not one');
  assert.ok(!MISSPELLED_NAME.test(JSON.stringify({ ...db, profile: rest })), 'the misspelling must appear only in profile.nameMisspellings');
});

/* "توفير" (saving) is a real word in the copy that starts with the same four
   letters. The check has to tell the two apart or it is useless. */
test('the misspelling check matches the name and not the word for saving', () => {
  assert.ok(MISSPELLED_NAME.test('نور الدين توفي'));
  assert.ok(MISSPELLED_NAME.test('نور توفي'));
  assert.ok(MISSPELLED_NAME.test('"توفي"'));
  assert.ok(!MISSPELLED_NAME.test('توفير لكل مستند'));
  assert.ok(!MISSPELLED_NAME.test('تُصنّف محلياً توفيراً للكلفة'));
  assert.ok(!MISSPELLED_NAME.test('نور الدين طفي'));
});

test('every entity named on the site has a links.json entry', () => {
  const db = loadDb('data');
  const known = { ...db.links.people, ...db.links.organizations };

  const named = new Set([
    ...db.experience.filter((e) => !e.selfEmployed).map((e) => e.company),
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
        continue;
      }
      assert.doesNotThrow(() => new URL(entry.url), `${name} url is malformed`);

      // https unless the destination genuinely has none, and says so.
      if (!entry.url.startsWith('https://')) {
        assert.match(entry.url, /^http:\/\//, `${name} must be http or https`);
        assert.equal(
          typeof entry.insecure,
          'string',
          `${name} is http — record why in an "insecure" note, so the exception is deliberate`,
        );
      }
    }
  }
});

test('no private or tracking-laden urls are stored', () => {
  const db = loadDb('data');

  // Parameters that carry UI state or tracking, as opposed to content. A
  // ?lang=en is part of the address; a ?feedView=all is where someone's
  // browser happened to be looking.
  const JUNK_PARAMS = ['feedView', 'originalSubdomain', 'trk', 'trkInfo', 'ref', 'source'];

  const all = [
    ...Object.values({ ...db.links.people, ...db.links.organizations }),
    ...db.profile.sameAs,
  ];

  for (const { url } of all) {
    if (!url) continue;
    assert.ok(!url.includes('/admin/'), `${url} is an admin URL — it 404s for visitors`);
    assert.ok(!/\/posts\/?$/.test(url), `${url} points at a posts tab, not the profile`);

    const params = new URL(url).searchParams;
    for (const junk of JUNK_PARAMS) {
      assert.ok(!params.has(junk), `${url} carries "${junk}"; store the clean canonical URL`);
    }
    for (const [key] of params) {
      assert.ok(!key.startsWith('utm_'), `${url} carries campaign tracking`);
    }
  }
});

test('every recommender resolves to a real profile', () => {
  const db = loadDb('data');
  for (const t of db.testimonials) {
    const entry = db.links.people[t.author];
    assert.ok(entry?.url, `${t.author} vouches for Nour but has no profile link`);
  }
});

test('linkifyPeople links names without mangling numbers', async () => {
  const { linkifyPeople } = await import('../scripts/lib/render.mjs');
  const db = loadDb('data');

  const out = linkifyPeople(db, 'Extracts 70 fields. Coached by George Drouj.', 'en');
  assert.match(out, /Extracts 70 fields/, 'plain numbers must survive untouched');
  assert.match(out, /href="https:\/\/www\.linkedin\.com\/in\/georgedrouj/);
  assert.match(out, /target="_blank"/);

  // an Arabic alias resolves to the same profile (a made-up person, so no real name is needed)
  const withAlias = { ...db, links: { ...db.links, people: { 'Sara Example': { url: 'https://www.linkedin.com/in/sara-example/', aliases: ['سارة مثال'] } } } };
  const ar = linkifyPeople(withAlias, 'من إعداد سارة مثال.', 'ar');
  assert.match(ar, /href="https:\/\/www\.linkedin\.com\/in\/sara-example/);

  // organisations are deliberately NOT linked inside prose
  const g = linkifyPeople(db, 'Stored in Google Sheets and Google Drive.', 'en');
  assert.ok(!g.includes('<a '), 'Google Sheets must not become a link');

  // text with no known name is escaped and otherwise unchanged
  assert.equal(linkifyPeople(db, 'a < b & c', 'en'), 'a &lt; b &amp; c');
});

test('every showcase site ships both screenshots, and an unpublished one carries a todo', () => {
  const db = loadDb('data');
  for (const s of [...db.showcase.sites, db.showcase.lab]) {
    for (const path of Object.values(s.images)) assert.ok(existsSync(path), `${s.id}: missing ${path}`);
    if (s.url === null) assert.equal(typeof s.todo, 'string', `${s.id}: null url without a todo`);
  }
});

/* A picture has one address: the bare one the structured data and og:image
   name. A fingerprint would make a second, and a third the day the file is
   re-shot. The stylesheets, the scripts and the CV keep theirs, because the
   browser caches those hard. */
test('no picture is fingerprinted, and the stylesheets, scripts and CV still are', () => {
  const db = loadDb('data');
  const pictures = [
    ...db.showcase.sites.flatMap((s) => Object.values(s.images)),
    ...Object.values(db.showcase.lab.images),
    ...db.workflows.filter((w) => w.canvas).map((w) => w.canvas),
    ...db.projects.flatMap((p) => Object.values(p.images ?? {})),
    db.profile.image,
    db.profile.ogImage,
    'assets/img/nour-96.png',
    'assets/img/icon-32.png',
    'assets/img/icon-180.png',
  ];
  for (const path of pictures) assert.ok(!(path in db.assetVersions), `${path} is fingerprinted`);
  assert.ok(!Object.keys(db.assetVersions).some((path) => path.startsWith('assets/img/')));

  for (const path of ['assets/css/tokens.css', 'assets/css/components.css', 'assets/js/main.js', 'assets/js/chat/boot.en.js', db.profile.cv[0].file]) {
    assert.match(db.assetVersions[path] ?? '', /^[0-9a-f]{8}$/, `${path} has no fingerprint`);
  }
  // The sizes are still measured from the files, fingerprint or not.
  for (const s of db.showcase.sites) assert.ok(Array.isArray(db.imageSizes[s.images.desktop]), `${s.id}: the screenshot was not measured`);
  assert.deepEqual(db.imageSizes[db.profile.ogImage], [1200, 630]);
});

/* A showcase tag is the name of a technology, one string for both languages,
   or a plain-language label written in each. */
test('a showcase tag is a string or a pair with both languages', () => {
  const db = loadDb('data');
  const tags = [...db.showcase.sites, db.showcase.lab].flatMap((s) => s.tags ?? []);
  assert.ok(tags.some((t) => typeof t === 'object'), 'no plain-language tag is translated');
  for (const t of tags) {
    if (typeof t === 'string') continue;
    assert.deepEqual(Object.keys(t), ['en', 'ar']);
    assert.ok(/[\u0600-\u06FF]/.test(t.ar) && !/[\u0600-\u06FF]/.test(t.en), JSON.stringify(t));
  }
  // The plain-language ones are pairs everywhere; a technology stays one Latin string.
  for (const t of tags.filter((x) => typeof x === 'string')) {
    assert.ok(!/^(Arabic|English)( \+ (Arabic|English))?$|^Dark mode$|^Mobile first$/.test(t), `"${t}" is plain language, and would print in English on the Arabic page`);
    assert.ok(!/[\u0600-\u06FF]/.test(t), `"${t}": a technology keeps its Latin name`);
  }
});

test('the profile carries the day it was last changed by hand', () => {
  const db = loadDb('data');
  assert.match(db.profile.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(db.profile.updated)));
  assert.ok(isCalendarDay(db.profile.updated));
});

/* That day becomes the ProfilePage's dateModified. A day that does not exist
   used to pass: parsing rolls 30 February forward into March instead of
   refusing it, and the page would have shipped a date nobody can have meant. */
test('a day that does not exist is refused, by the check and by the loader', () => {
  for (const day of ['2026-11-15', '2024-02-29', '2026-12-31', '2000-01-01']) assert.ok(isCalendarDay(day), day);
  for (const day of ['2026-02-30', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-11-00', '2026-11-32']) assert.ok(!isCalendarDay(day), day);
  for (const day of ['2026-11-5', '15-11-2026', '2026/11/15', '2026-11-15T00:00:00Z', '', null, undefined, 20261115]) assert.ok(!isCalendarDay(day), String(day));

  const dir = mkdtempSync(join(tmpdir(), 'portfolio-profile-'));
  try {
    const load = (updated) => {
      cpSync('data', dir, { recursive: true });
      const profile = JSON.parse(readFileSync('data/profile.json', 'utf8'));
      if (updated === undefined) delete profile.updated;
      else profile.updated = updated;
      writeFileSync(join(dir, 'profile.json'), JSON.stringify(profile));
      return loadDb(dir);
    };
    assert.doesNotThrow(() => load('2026-11-15'));
    for (const bad of ['2026-02-30', '2026-13-01', 'yesterday', undefined]) {
      assert.throws(() => load(bad), /"updated" must be a real day written as YYYY-MM-DD/, String(bad));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* An id is a file name in a folder the host serves. Two names mean something
   to the host by themselves, so no entry may take them (the refusal itself
   is tested with the other loader refusals, in details.test.mjs). */
test('no project or workflow is named by a file name the host reserves', () => {
  assert.deepEqual(RESERVED_IDS, ['index', '404']);
  const db = loadDb('data');
  for (const row of [...db.projects, ...db.workflows]) assert.ok(!RESERVED_IDS.includes(row.id), row.id);
});

test('a workflow canvas, when set, is a real file', () => {
  const db = loadDb('data');
  for (const w of db.workflows.filter((x) => x.canvas)) assert.ok(existsSync(w.canvas), `${w.id}: missing ${w.canvas}`);
});
