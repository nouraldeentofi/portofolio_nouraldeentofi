#!/usr/bin/env node
/**
 * Build every static artefact from `data/`.
 *
 * Everything is rendered into memory first and written only once every page
 * has succeeded, so a failure never leaves half-generated output on disk.
 *
 *   node scripts/build.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadDb } from './lib/load.mjs';
import { PAGES, LANGS, buildSitemap } from './lib/sitemap.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from './lib/llms.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from './lib/api.mjs';
import { TEMPLATES, notFound, buildRedirects } from './lib/pages.mjs';
import { injectBlock } from './lib/render.mjs';
import { buildTranscript } from './lib/transcript.mjs';

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

function main() {
  const db = { ...loadDb('data'), build: { modified: buildStamp() } };
  const pending = new Map();
  const stage = (path, content) => pending.set(path, content);

  for (const lang of LANGS) {
    const dir = lang === 'ar' ? '' : 'en/';

    for (const page of PAGES) {
      const file = `${dir}${page === '' ? 'index' : page}.html`;
      let html = TEMPLATES[page](db, lang);

      // The chat page carries a crawlable transcript of the conversation.
      if (page === 'chat') {
        html = injectBlock(html, 'chat-transcript', buildTranscript(lang, db.copy[lang]));
      }

      stage(file, html);
    }

    stage(`${dir}404.html`, notFound(db, lang));
  }

  // The shortcuts are real files, so they work on any host and /cv carries the CV's fingerprint.
  for (const { path, html } of buildRedirects(db)) stage(path, html);

  stage('llms.txt', buildLlmsTxt(db, 'en'));
  stage('llms-full.txt', buildLlmsFullTxt(db, 'en'));
  stage('sitemap.xml', buildSitemap(PAGES, db.profile.site, db.build.modified.slice(0, 10)));
  // IndexNow asks for the key as a file at the site root, to prove the site owns it.
  if (db.profile.indexNow?.key) stage(`${db.profile.indexNow.key}.txt`, db.profile.indexNow.key);
  stage('api/profile.json', JSON.stringify(buildApiProfile(db), null, 2) + '\n');
  stage('api/projects.json', JSON.stringify(buildApiProjects(db), null, 2) + '\n');
  stage('api/resume.json', JSON.stringify(buildResumeJson(db), null, 2) + '\n');

  for (const [path, content] of pending) {
    const dir = dirname(path);
    if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
    writeFileSync(path, content, 'utf8');
  }

  const pending_todos = db.profile.sameAs.filter((s) => !s.url).map((s) => s.platform);
  console.log(`build: wrote ${pending.size} files`);
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
