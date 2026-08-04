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

function main() {
  const db = loadDb('data');
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

  // GitHub Pages has no redirect rules, so the shortcuts are real files.
  for (const { path, html } of buildRedirects(db)) stage(path, html);

  stage('llms.txt', buildLlmsTxt(db, 'en'));
  stage('llms-full.txt', buildLlmsFullTxt(db, 'en'));
  stage('sitemap.xml', buildSitemap(PAGES, db.profile.site));
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
