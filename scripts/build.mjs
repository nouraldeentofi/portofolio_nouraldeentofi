#!/usr/bin/env node
/**
 * Build every static artefact from `data/`.
 *
 * Everything is rendered into memory first (`buildSite` in lib/site.mjs) and
 * written only once every page has succeeded, so a failure never leaves
 * half-generated output on disk.
 *
 *   node scripts/build.mjs
 */

import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadDb } from './lib/load.mjs';
import { LANGS } from './lib/sitemap.mjs';
import { DETAIL_FOLDERS, staleDetailFiles } from './lib/details.mjs';
import { buildSite } from './lib/site.mjs';

/**
 * Midnight today in Riyadh, as a full timestamp with its offset.
 *
 * This is the one place the build reads the clock. Everything under
 * scripts/lib is a pure transform, so the date is handed to it on the data
 * instead: the ProfilePage date, the footer year, the sitemap's lastmod and
 * the API's `generated` all come from here. Midnight rather than the second,
 * so two builds on the same day write the same files.
 */
function buildStamp(now = new Date()) {
  const riyadh = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return `${riyadh.toISOString().slice(0, 10)}T00:00:00+03:00`;
}

/**
 * What is on disk in the folders the detail pages are generated into, in
 * both languages. A folder that does not exist yet simply holds nothing.
 */
function generatedDetailFiles() {
  const folders = LANGS.flatMap((lang) => DETAIL_FOLDERS.map((folder) => `${lang === 'ar' ? '' : 'en/'}${folder}`));
  return folders.flatMap((folder) => {
    try {
      return readdirSync(folder).map((name) => `${folder}/${name}`);
    } catch {
      return [];
    }
  });
}

function main() {
  const db = { ...loadDb('data'), build: { modified: buildStamp() } };
  const pending = buildSite(db);

  for (const [path, content] of pending) {
    const dir = dirname(path);
    if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
    writeFileSync(path, content, 'utf8');
  }

  // A project or a system that left the data leaves its page behind, still
  // served and still indexed. `staleDetailFiles` only ever names an .html
  // file directly inside a generated folder that this build did not write.
  const stale = staleDetailFiles(generatedDetailFiles(), [...pending.keys()]);
  for (const path of stale) unlinkSync(path);

  const pending_todos = db.profile.sameAs.filter((s) => !s.url).map((s) => s.platform);
  console.log(`build: wrote ${pending.size} files`);
  if (stale.length) console.log(`build: removed ${stale.length} page(s) whose entry is gone: ${stale.join(', ')}`);
  if (pending_todos.length) {
    console.log(`build: ${pending_todos.length} link(s) still pending — ${pending_todos.join(', ')}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
}
