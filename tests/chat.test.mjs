import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.ok(en.includes('Project Coordinator &amp; Automation Builder') && en.includes('Python for Data Science &amp; AI'));
  // Decoding must not let markup through: what was text is escaped again.
  assert.ok(!/<(?!\/?(?:div|table|thead|tbody|tr|th|td|p|button)\b)/.test(en), 'a tag the transcript did not write itself');
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
  // each topic is a real button, so rows open by click and by keyboard
  assert.match(t, /<button type="button" class="transcript__toggle" aria-expanded="false" aria-controls="answer-start">Opening<\/button>/);
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
