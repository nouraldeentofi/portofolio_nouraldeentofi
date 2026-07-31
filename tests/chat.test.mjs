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

test('transcript renders every reachable node as plain text', () => {
  const t = buildTranscript('en');
  assert.ok(t.includes('Smart Scanner'));
  assert.ok(t.includes('494'));
  assert.ok(!t.includes('<b>'), 'presentational tags must be stripped');
  assert.ok(!t.includes('<div'), 'card markup must be stripped');
  for (const id of Object.keys(EN)) assert.ok(t.includes(`id="say-${id}"`), `missing node ${id}`);
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
