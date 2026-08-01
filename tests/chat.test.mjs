import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT as EN } from '../assets/js/chat/script.en.js';
import { SCRIPT as AR } from '../assets/js/chat/script.ar.js';
import { buildTranscript } from '../scripts/lib/transcript.mjs';

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
