/**
 * The whole site, rendered into memory.
 *
 * `buildSite` returns every file the build writes, keyed by its path from
 * the site root. scripts/build.mjs puts them on disk; the tests read the
 * same map, so "every page the build writes" means the same pages in both
 * places.
 *
 * Pure: `db` in, a map of strings out. `db.build` is what the build adds to
 * the data: `modified`, the day of the build, and `lastmod`, the state the
 * last build left (see lastmod.mjs). The day of the build reaches the output
 * in two places only: the year in the footer, and the date of a page whose
 * content changed since that state was written. Built again on another day
 * from the same data and the state it wrote, every file comes out the same.
 */

import { PAGES, LANGS, buildSitemap, pagePath } from './sitemap.mjs';
import { LASTMOD_FILE, stampPages, pageDates, latestChange, serializeState } from './lastmod.mjs';
import { detailPages } from './details.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from './llms.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from './api.mjs';
import { TEMPLATES, notFound, buildRedirects, buildDetailPages } from './pages.mjs';
import { injectBlock } from './render.mjs';
import { buildTranscript } from './transcript.mjs';

/**
 * The file a page is written to: `en/about.html`, `index.html`,
 * `en/projects/<id>.html`.
 *
 * Always `<page>.html`, never `<page>/index.html`: the host serves the first
 * at `/en/projects/<id>` and would serve the second at an address ending in
 * a slash, which is a different address from the one every link names.
 */
export const pageFile = (page, lang) => `${lang === 'ar' ? '' : 'en/'}${page === '' ? 'index' : page}.html`;

/**
 * Every page that has an address in both languages: the navigation, then
 * the detail pages. The sitemap lists exactly these.
 */
export const sitePages = (db) => [...PAGES, ...detailPages(db).map((d) => d.page)];

export function buildSite(db) {
  const files = new Map();
  const stage = (path, content) => {
    // Two entries that claim one address would silently overwrite each other.
    if (files.has(path)) throw new Error(`build: two pages want to be written to ${path}`);
    files.set(path, content);
  };

  // Every page the sitemap lists, with the address it lists it at.
  const listed = [];
  const stagePage = (page, lang, html) => {
    stage(pageFile(page, lang), html);
    listed.push({ address: pagePath(page, lang), html });
  };

  for (const lang of LANGS) {
    for (const page of PAGES) {
      let html = TEMPLATES[page](db, lang);

      // The chat page carries a crawlable transcript of the conversation.
      if (page === 'chat') {
        html = injectBlock(html, 'chat-transcript', buildTranscript(lang, db.copy[lang]));
      }

      stagePage(page, lang, html);
    }

    // A page for every project and every automation system that has one.
    for (const { page, html } of buildDetailPages(db, lang)) stagePage(page, lang, html);

    stage(pageFile('404', lang), notFound(db, lang));
  }

  // The day each page last changed: the day its content was first seen as
  // it is now, which is today only for a page that is new or different.
  const stamps = stampPages(listed, db.build?.lastmod, db.build?.modified?.slice(0, 10));
  // The API files say when they were generated. That is the day the newest
  // page changed, not the day of this build: the same data gives the same
  // files, so a build that changes nothing writes nothing new.
  const latest = latestChange(stamps);
  const dated = latest ? { ...db, build: { ...db.build, modified: `${latest}T00:00:00+03:00` } } : db;

  // The shortcuts are real files, so they work on any host and /cv carries the CV's fingerprint.
  for (const { path, html } of buildRedirects(db)) stage(path, html);

  stage('llms.txt', buildLlmsTxt(db, 'en'));
  stage('llms-full.txt', buildLlmsFullTxt(db, 'en'));
  stage('sitemap.xml', buildSitemap(sitePages(db), db.profile.site, pageDates(stamps)));
  // Not part of the site: what the next build compares against. It is
  // written with the rest so that it is committed with the rest.
  stage(LASTMOD_FILE, serializeState(stamps));
  // IndexNow asks for the key as a file at the site root, to prove the site owns it.
  if (db.profile.indexNow?.key) stage(`${db.profile.indexNow.key}.txt`, db.profile.indexNow.key);
  stage('api/profile.json', JSON.stringify(buildApiProfile(dated), null, 2) + '\n');
  stage('api/projects.json', JSON.stringify(buildApiProjects(dated), null, 2) + '\n');
  stage('api/resume.json', JSON.stringify(buildResumeJson(db), null, 2) + '\n');

  return files;
}
