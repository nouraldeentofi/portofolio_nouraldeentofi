import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCRIPT as EN } from '../assets/js/chat/script.en.js';
import { SCRIPT as AR } from '../assets/js/chat/script.ar.js';
import { buildTranscript, textOf } from '../scripts/lib/transcript.mjs';
import { loadDb } from '../scripts/lib/load.mjs';

for (const [name, SCRIPT] of [['en', EN], ['ar', AR]]) {
  test(`[${name}] every option points at a node that exists`, () => {
    for (const [id, node] of Object.entries(SCRIPT)) {
      for (const [, target] of node.opts ?? []) {
        assert.ok(SCRIPT[target], `${id} → "${target}" does not exist`);
      }
    }
  });

  test(`[${name}] every node is reachable from start`, () => {
    const seen = new Set();
    const queue = ['start'];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const [, next] of SCRIPT[id].opts ?? []) queue.push(next);
    }
    const orphans = Object.keys(SCRIPT).filter((id) => !seen.has(id));
    assert.deepEqual(orphans, [], `unreachable nodes: ${orphans.join(', ')}`);
  });
}

test('both chat scripts expose identical node ids', () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(AR).sort());
});

test('the script leads with automation and states Al Khobar', () => {
  const blob = JSON.stringify(EN);
  assert.match(JSON.stringify(EN.start), /automation/i);
  assert.ok(blob.includes('Al Khobar'));
  assert.ok(!/based in Riyadh/i.test(blob));
  assert.ok(!blob.includes('Alessa'));
  assert.ok(!blob.includes('Receipt Scanner'));
});

/* The automation answer used to say six systems were in production and that
   none was a demo, and then listed three the data marks "built", one of
   them a proof of concept. A status is a claim, in the chat as on the page. */
test('the automation answer claims no more than the status of each system it lists', () => {
  const db = loadDb('data');
  for (const [name, SCRIPT] of [['en', EN], ['ar', AR]]) {
    const answer = JSON.stringify(SCRIPT.automation);
    assert.ok(!/in production|None of these are demos|replaced work|في الإنتاج|عرض تجريبي|حلّ محلّ/.test(answer), `${name}: the automation answer overstates`);
    // The three words it uses for a status are the ones the automation page uses.
    const said = [...SCRIPT.automation.msgs, ...SCRIPT.automation.msgs2].join(' ');
    const status = db.copy[name].ui.status;
    assert.ok(said.toLowerCase().includes(status.live.toLowerCase()), `${name}: "${status.live}"`);
    assert.ok(said.toLowerCase().includes(status.built.toLowerCase()), `${name}: "${status.built}"`);
    assert.ok(said.includes(db.copy[name].nav.automation), `${name}: it does not say where the statuses are`);
    assert.ok(!/\d|[\u0660-\u0669]/.test(said), `${name}: a count that will drift`);
    // The card is headed by the name of the page it describes.
    assert.ok(SCRIPT.automation.card.includes(`<div class="chat__card-head">🤖 ${db.copy[name].nav.automation}</div>`), `${name}: the card head`);
    assert.ok(!/Automation Lab|مختبر الأتمتة/.test(JSON.stringify(SCRIPT)), `${name}: the old name of the automation page`);
  }
  // Why the old sentence was wrong: the card lists systems that are built, not running.
  const listed = ['smart-lead-finder', 'lesson-quality-evaluator', 'crm-lead-cleaner'].map((id) => db.workflows.find((w) => w.id === id));
  assert.ok(EN.automation.card.includes('Smart Lead Finder') && EN.automation.card.includes('CRM Lead Cleaner'));
  assert.deepEqual(listed.map((w) => w.status), ['built', 'built', 'built']);
  for (const lang of ['en', 'ar']) assert.ok(!/in production|None of these are demos|في الإنتاج|عرض تجريبي/.test(buildTranscript(lang)), `${lang}: the transcript`);
});

/* A chat message is HTML, so "&" is written "&amp;" in it. The transcript
   escapes its text itself, and printed the entity as it stood: "&amp;amp;"
   in the source, "&amp;" on the page. */
test('an ampersand in a chat message is an ampersand in the transcript', () => {
  assert.equal(textOf('<b>IBM</b> Python for Data Science &amp; AI<br>next'), 'IBM Python for Data Science & AI next');
  assert.equal(textOf('1 &lt; 2 &gt; 0, &quot;quoted&quot;, it&#39;s'), '1 < 2 > 0, "quoted", it\'s');
  // Decoded once: text that speaks about an entity keeps it.
  assert.equal(textOf('write &amp;amp; for an ampersand'), 'write &amp; for an ampersand');

  assert.ok(JSON.stringify(EN).includes('&amp;'), 'no chat message carries an ampersand any more, so this proves nothing');
  for (const lang of ['en', 'ar']) {
    const t = buildTranscript(lang);
    assert.ok(!t.includes('&amp;amp;') && !t.includes('&amp;lt;'), `${lang}: an entity escaped twice`);
  }
  const en = buildTranscript('en');
  assert.ok(en.includes('Frontend Developer &amp; Project Coordinator') && en.includes('Python for Data Science &amp; AI'));
  // Decoding must not let markup through: what was text is escaped again.
  assert.ok(!/<(?!\/?(?:div|table|thead|tbody|tr|th|td|p|button)\b)/.test(en), 'a tag the transcript did not write itself');
});

/* The Arabic data moved to Western digits, and the chat was the one place
   left that wrote a figure in Arabic-Indic digits, beside "React 19" and
   "1. d4" in the same answers and against "70" on the Smart Scanner page. */
test('the Arabic chat writes its numbers in Western digits, as the pages do', () => {
  // Arabic-Indic and Persian digits, and the percent, decimal and thousands signs that go with them.
  const other = /.{0,25}[\u0660-\u0669\u066A-\u066C\u06F0-\u06F9].{0,25}/;
  for (const file of ['assets/js/chat/script.ar.js', 'assets/js/chat/engine.js']) {
    const hit = readFileSync(file, 'utf8').match(other);
    assert.equal(hit, null, `${file}: "${hit?.[0]}"`);
  }
  const transcript = buildTranscript('ar');
  assert.equal(transcript.match(other), null, 'the Arabic transcript');
  for (const figure of ['من 1 إلى 10', 'أكثر من 70 حقلاً', '204 ملفات مصدرية', '494 اختباراً آلياً', 'نحو 3 أضعاف', 'بنحو 75%', '2019–2024', 'عام 2021']) {
    assert.ok(transcript.includes(figure), `the Arabic transcript lost "${figure}"`);
  }
  // The time beside a message is written by the browser, which is asked for the same digits.
  assert.ok(readFileSync('assets/js/chat/engine.js', 'utf8').includes("numberingSystem: 'latn'"), 'the time of a message follows the browser again');

  // Every answer gives the same figures in both languages. A digit inside a
  // word ("B2B") is part of a name and not a figure.
  const said = (node) => [...(node.msgs ?? []), node.card ?? '', ...(node.msgs2 ?? []), ...(node.opts ?? []).map(([label]) => label)].map(textOf).join(' ');
  const figures = (node) => (said(node).match(/(?<![A-Za-z\d])\d+(?![A-Za-z])/g) ?? []).sort();
  for (const id of Object.keys(EN)) assert.deepEqual(figures(AR[id]), figures(EN[id]), `${id}: the two languages give different figures`);
  assert.ok(figures(EN.smartscanner).includes('494') && figures(EN.history).length > 5, 'no figure was read, so this proves nothing');
});

test('transcript renders every reachable node as a table row', () => {
  const t = buildTranscript('en');
  assert.ok(t.includes('Smart Scanner'));
  assert.ok(t.includes('494'));

  // The chat's own markup must not survive into the transcript — only the
  // table wrapper the transcript builds itself is allowed.
  assert.ok(!t.includes('<b>'), 'bold tags must be stripped');
  assert.ok(!t.includes('<br'), 'line breaks must be stripped');
  assert.ok(!t.includes('chat__card'), 'chat card classes must be stripped');
  assert.ok(!t.includes('<a '), 'anchors must not survive into the transcript');

  assert.ok(t.includes('<table class="transcript__table">'), 'should render a table');
  assert.ok(t.includes('<thead>'), 'table needs a header row');
  for (const id of Object.keys(EN)) assert.ok(t.includes(`id="say-${id}"`), `missing node ${id}`);
});

test('transcript rows carry a readable topic taken from the chat buttons', () => {
  const t = buildTranscript('en', { chat: { transcriptTopic: 'Topic', transcriptAnswer: 'Answer', transcriptOpening: 'Opening' } });
  assert.match(t, /<th scope="col">Topic<\/th>/);
  // each topic is a real button, so rows open by click and by keyboard. It
  // claims no state in the HTML: without scripts every row is shown whole and
  // the button does nothing, so the script that clamps the rows says "closed".
  assert.match(t, /<button type="button" class="transcript__toggle" aria-controls="answer-start">Opening<\/button>/);
  assert.ok(!t.includes('aria-expanded'), 'the HTML says a row is collapsed while it is shown whole');
  assert.match(readFileSync('assets/js/motion.js', 'utf8'), /querySelectorAll\('\.transcript__toggle'\)\.forEach\(\(toggle\) => toggle\.setAttribute\('aria-expanded', 'false'\)\)/);
  // a node reached by a button borrows that button's wording
  assert.match(t, /class="transcript__toggle"[^>]*>[^<]*Smart Scanner[^<]*<\/button>/);
});

test('every transcript toggle controls a real answer cell', () => {
  const t = buildTranscript('en');
  const controls = [...t.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(controls.length > 0);
  for (const id of controls) {
    assert.ok(t.includes(`<td id="${id}">`), `${id} has no matching cell`);
  }
});

test('transcript renders in Arabic too', () => {
  const t = buildTranscript('ar');
  assert.ok(t.includes('نور'));
  assert.ok(!t.includes('<b>'));
});

test('transcript rejects an unknown language', () => {
  assert.throws(() => buildTranscript('fr'), /unknown language/);
});

test('collaborators named in the chat link to their profile', () => {
  for (const [name, SCRIPT] of [['en', EN], ['ar', AR]]) {
    const blob = JSON.stringify(SCRIPT);
    assert.match(blob, /linkedin\.com\/in\/haitham-zedan/, `${name} should link Haitham`);
    assert.match(blob, /rel=\\"noopener noreferrer\\"/, `${name} chat links need noopener`);
  }
});

test('the transcript strips chat markup but keeps collaborator names', () => {
  const t = buildTranscript('en');
  assert.ok(t.includes('Haitham Zedan'));
  assert.ok(!t.includes('<a '), 'anchors must not survive into the transcript');
});

/* The chat is written by hand. Its figures were held to each other and to
   literals in this file, so a number that moved in data/ left the chat and
   its transcript saying the old one with every test green. The figures a
   page prints from the data are read from the data here. */
test('the figures the chat gives are the ones in the data', () => {
  const db = loadDb('data');
  const scanner = db.projects.find((p) => p.id === 'smart-scanner');
  const metric = (label) => scanner.metrics.find((m) => m.label.en === label)?.value;
  const card = EN.smartscanner.card;
  for (const [value, words] of [[metric('fields extracted'), 'fields'], [metric('source files'), 'source files'], [metric('automated tests'), 'automated tests']]) {
    assert.ok(value && card.includes(`<b>${value} ${words}</b>`), `the chat does not say "${value} ${words}" as the Smart Scanner page does`);
  }

  // The timeline: one line for each role in the data, newest first, with its years.
  const years = (role) => {
    const [from, to] = [role.start.slice(0, 4), (role.end ?? role.start).slice(0, 4)];
    return from === to ? from : `${from}–${to.slice(2)}`;
  };
  const dated = (script) => [...script.history.card.matchAll(/<b>([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(dated(EN).slice(0, db.experience.length), db.experience.map(years));
  // The Arabic card gives the same years in the same order.
  assert.deepEqual(dated(AR), dated(EN));
});

/* The transcript is the one place a reader without scripts can read the
   answers. Its clamp, its openers and the signs of a working toggle live
   under .js, and the openers must outrank the clamp, or no row opens. */
test('without scripts every transcript row is whole, and with them a row opens', () => {
  const css = readFileSync('assets/css/components.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selectors: selector.split(',').map((s) => s.trim()), body }));
  const touching = (part) => rules.filter((r) => r.selectors.some((s) => s.includes(part)));
  // Specificity of a simple selector: ids, classes with attributes and pseudo-classes, elements with pseudo-elements.
  const weight = (s) => {
    const ids = (s.match(/#[\w-]+/g) ?? []).length;
    const classes = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
    const elements = (s.replace(/\[[^\]]*\]/g, '').match(/(?:^|[\s>+~])[a-z][\w-]*|::[\w-]+/g) ?? []).length;
    return ids * 10000 + classes * 100 + elements;
  };

  const clamp = rules.filter((r) => /line-clamp/.test(r.body) && r.selectors.some((s) => s.includes('transcript')));
  assert.deepEqual(clamp.map((r) => r.selectors), [['.js .transcript__table tbody td']], 'the clamp reaches a reader without scripts');
  const openers = touching('transcript__row').filter((r) => /--lines:\s*99/.test(r.body));
  assert.deepEqual(openers.map((r) => r.selectors), [['.js .transcript__row.is-open td', '.js .transcript__row:target td']]);
  for (const s of openers[0].selectors) assert.ok(weight(s) > weight(clamp[0].selectors[0]), `${s} no longer outranks the clamp, so no row opens`);
  // Whatever makes a toggle look like it works.
  for (const r of touching('transcript__toggle').filter((r) => /content:|cursor:\s*pointer|color:\s*var\(--lime\)/.test(r.body))) {
    for (const s of r.selectors) assert.ok(s.startsWith('.js '), `${s} makes a toggle look alive without scripts`);
  }
  assert.ok(touching('transcript__toggle').some((r) => r.selectors.includes(".js .transcript__toggle[aria-expanded='true']::after")));
});
