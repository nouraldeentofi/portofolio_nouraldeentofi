#!/usr/bin/env node
/**
 * The gate. Run after every build.
 *
 *   node scripts/validate.mjs
 *
 * Errors fail the build (exit 1). Warnings are reported but tolerated —
 * an unresolved link is a known gap, not a defect.
 */

import { readFileSync, existsSync } from 'node:fs';
import { loadDb } from './lib/load.mjs';
import { PAGES, LANGS } from './lib/sitemap.mjs';
import { checkRedirects, checkHeaders, parseRedirects, misspellingLeaks, MISSPELLED_NAME } from './lib/gates.mjs';

const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/**
 * The file on disk behind a link.
 *
 * Pages are linked by their clean address (`/en/about`, `/en/`), and the host
 * serves `en/about.html` and `en/index.html` behind those.
 */
function toFile(target, dir) {
  // Neither the fragment nor the query is part of the path on disk.
  // Stylesheets carry a `?v=` fingerprint so a CDN cannot serve a stale
  // copy; without stripping it, every one of them reads as missing.
  const clean = target.split('#')[0].split('?')[0];
  if (!clean) return null;
  const path = clean.startsWith('/') ? clean.slice(1) : clean.startsWith('../') ? clean.slice(3) : `${dir}${clean}`;
  if (path === '' || path.endsWith('/')) return `${path}index.html`;
  return /\.[a-z0-9]+$/i.test(path) ? path : `${path}.html`;
}

function pageFiles() {
  return LANGS.flatMap((lang) =>
    [...PAGES, '404'].map((p) => ({
      lang,
      page: p,
      file: `${lang === 'ar' ? '' : 'en/'}${p === '' ? 'index' : p}.html`,
    })),
  );
}

export function checkAll({ pages = pageFiles() } = {}) {
  errors.length = 0;
  warnings.length = 0;

  const db = loadDb('data');

  // 1 — unresolved identity links are warnings, and must never be rendered.
  for (const s of db.profile.sameAs) {
    if (!s.url) warn(`pending link: ${s.platform} — ${s.todo ?? 'no note'}`);
    else if (!/^https?:\/\//.test(s.url)) fail(`profile.json: ${s.platform} url is not absolute`);
  }
  if (!db.profile.image) warn('pending: no portrait set — Person.image is omitted (the generated ogImage covers the social preview)');
  if (!db.profile.analytics?.tag) warn(`pending: Google Analytics is off — ${db.profile.analytics?.todo ?? 'no Google tag ID'}`);

  const indexNowKey = db.profile.indexNow?.key;
  if (indexNowKey && (!existsSync(`${indexNowKey}.txt`) || readFileSync(`${indexNowKey}.txt`, 'utf8') !== indexNowKey)) {
    fail(`${indexNowKey}.txt: missing or wrong — the IndexNow key file must hold the key; run npm run build`);
  }

  // 1a: the two files the host reads. They are written by hand, so they are
  // held to the data and to the list of addresses that must stay closed.
  const redirects = existsSync('_redirects') ? readFileSync('_redirects', 'utf8') : '';
  const headers = existsSync('_headers') ? readFileSync('_headers', 'utf8') : '';
  for (const problem of [...checkRedirects(redirects), ...checkHeaders(headers, db.profile)]) fail(problem);
  // A redirect to a file that is not there turns one dead address into another.
  for (const r of parseRedirects(redirects)) {
    // An address on another host, or one built from a placeholder, is not a file here.
    if (r.to.includes(':')) continue;
    const target = toFile(r.to, '');
    if (target && !existsSync(target)) fail(`_redirects: ${r.from} points at ${r.to}, which does not exist`);
  }

  const sectionCounts = {};
  // The WebSite node of the first page read: every other page must match it.
  let siteNode = null;

  for (const { lang, page, file } of pages) {
    if (!existsSync(file)) { fail(`${file}: missing — run npm run build`); continue; }
    const html = readFileSync(file, 'utf8');

    // 2 — JSON-LD must parse and carry required fields.
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!blocks.length) fail(`${file}: no JSON-LD block`);
    const graph = [];
    for (const [, json] of blocks) {
      let parsed;
      try {
        parsed = JSON.parse(json.replaceAll('<\\/', '</'));
      } catch (err) {
        fail(`${file}: JSON-LD does not parse — ${err.message}`);
        continue;
      }
      const nodes = parsed['@graph'] ?? [parsed];
      graph.push(...nodes);
      const person = nodes.find((n) => n['@type'] === 'Person');
      if (person) {
        for (const key of ['name', 'jobTitle', 'sameAs', 'address']) {
          if (person[key] === undefined) fail(`${file}: Person is missing "${key}"`);
        }
        if (person.sameAs.some((u) => typeof u !== 'string')) fail(`${file}: Person.sameAs contains a non-string`);
      }
    }

    // 2a: one site name. Google reads it from the WebSite node and og:site_name,
    // and two answers under one @id leave the choice to Google.
    const website = graph.find((n) => n['@type'] === 'WebSite' && String(n['@id']).endsWith('#website'));
    if (!website) fail(`${file}: no WebSite node`);
    else {
      siteNode ??= JSON.stringify(website);
      if (JSON.stringify(website) !== siteNode) fail(`${file}: its WebSite node differs from the one on other pages`);
      if (!html.includes(`<meta property="og:site_name" content="${website.name}">`)) {
        fail(`${file}: og:site_name is missing or does not match WebSite.name`);
      }
    }

    // 2b: only the home page is his ProfilePage, and Google wants its date as
    // a full timestamp. A 404 that borrows the home head must not claim it.
    const profilePage = graph.find((n) => n['@type'] === 'ProfilePage');
    if (page !== '' && profilePage) fail(`${file}: carries a ProfilePage, which belongs to the home page only`);
    if (page === '' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(profilePage?.dateModified ?? '')) {
      fail(`${file}: ProfilePage.dateModified is missing or not a full timestamp with an offset`);
    }
    // A breadcrumb with one item is not eligible for anything.
    if (graph.some((n) => n['@type'] === 'BreadcrumbList' && n.itemListElement.length < 2)) {
      fail(`${file}: a one-item breadcrumb`);
    }

    // 2c: the family name is طفي. The misspelling is a different word, and it
    // may appear only where no reader looks: alternateName on the Person.
    for (const place of misspellingLeaks(html)) {
      fail(`${file}: the misspelled family name appears in ${place}; only Person.alternateName may carry it`);
    }

    // 3 — no dead or placeholder links.
    for (const bad of html.match(/href="(null|undefined|)"/g) ?? []) fail(`${file}: dead link ${bad}`);

    // 4 — no leaked placeholder text in shipped output.
    if (/\bTODO\b/.test(html)) fail(`${file}: contains a TODO marker`);
    if (/>undefined</.test(html)) fail(`${file}: rendered "undefined"`);

    // 5 — content rules.
    if (/Receipt Scanner/.test(html)) fail(`${file}: uses "Receipt Scanner" — the product is "Smart Scanner"`);
    if (/Alessa/i.test(html)) fail(`${file}: mentions Alessa Group, which must stay off the site`);
    if (/ZATCA/i.test(html)) fail(`${file}: mentions ZATCA, which was taken off the site on request`);
    if (/github\.io/i.test(html)) fail(`${file}: links to github.io — every site lives on nouraldeentofi.com now (data/hosting.json)`);
    if (/manhom/i.test(html)) fail(`${file}: names a crawled site — the scraper's crawl mode is described, never its target`);
    // Nour asked for no em dashes anywhere a reader or a crawler looks. Only
    // code comments inside inline scripts and styles may keep theirs.
    const readable = html
      .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    for (const [hit] of readable.matchAll(/.{0,30}—.{0,30}/g)) fail(`${file}: em dash in "${hit.trim()}"`);

    // 6 — language attributes.
    const expectDir = lang === 'ar' ? 'rtl' : 'ltr';
    if (!new RegExp(`<html lang="${lang}" dir="${expectDir}">`).test(html)) {
      fail(`${file}: wrong lang/dir attributes — expected lang="${lang}" dir="${expectDir}"`);
    }

    // 7 — accessibility basics.
    if (!/class="skip-link"/.test(html)) fail(`${file}: missing skip link`);
    if ((html.match(/<h1[ >]/g) ?? []).length !== 1) fail(`${file}: must have exactly one h1`);

    // 8 — internal links resolve.
    const dir = lang === 'ar' ? '' : 'en/';
    for (const [, target] of html.matchAll(/href="(?!https?:|mailto:|tel:|#)([^"]+)"/g)) {
      // Neither the fragment nor the query is part of the path on disk.
      // Stylesheets carry a `?v=` fingerprint so a CDN cannot serve a stale
      // copy; without stripping it, every one of them reads as missing.
      const resolved = toFile(target, dir);
      if (!resolved) continue;
      if (!existsSync(resolved)) fail(`${file}: link "${target}" resolves to missing ${resolved}`);
    }

    // 8a — pages are named by their clean address, never the .html one.
    //
    // The host redirects /about.html to /about. A link, canonical or hreflang
    // that names the .html form sends every reader and crawler through that
    // redirect, and tells Google about two addresses for one page.
    for (const [, target] of html.matchAll(/(?:href|content)="([^"]*\.html(?:[#?][^"]*)?)"/g)) {
      if (/^https?:/.test(target) && !target.startsWith(db.profile.site)) continue;
      fail(`${file}: "${target}" names a page by its .html address — use pagePath()`);
    }

    // 8b — navigation must never cross language trees.
    //
    // The plain "does it resolve" check above is not enough: `../about.html`
    // from an English page resolves to a real file — the *Arabic* one. That
    // silently dumped English readers back into Arabic on every nav click.
    // Only the deliberate language switch may cross.
    for (const [, attrs, href] of html.matchAll(/<a\s+([^>]*?)href="([^"]+)"/g)) {
      if (attrs.includes('lang-switch')) continue;
      if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
      const resolved = toFile(href, dir);
      // Only a link to a page has a language; a PDF or an image does not.
      if (!resolved?.endsWith('.html')) continue;
      const targetIsEnglish = resolved.startsWith('en/');
      if (targetIsEnglish !== (lang === 'en')) {
        fail(`${file}: link "${href}" leaves the ${lang} tree (goes to ${resolved})`);
      }
    }

    // 8c — links that leave the page open in a new tab, safely.
    //
    // `target="_blank"` without `rel="noopener"` hands the opened page a
    // handle back to this one (reverse tabnabbing), so both are required.
    for (const [tag, href] of html.matchAll(/<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g).map((m) => [m[0], m[1]])) {
      if (!tag.includes('target="_blank"')) fail(`${file}: external link to ${href} does not open in a new tab`);
      else if (!/rel="[^"]*noopener/.test(tag)) fail(`${file}: external link to ${href} is missing rel="noopener"`);
    }

    // 8d — every summary block on the home page must lead somewhere.
    //
    // These links are an optional argument to section(). Passing them to the
    // wrong function fails silently — the block renderer simply ignores the
    // extra argument and the link never appears. This catches that.
    if (page === '') {
      const HOME_SECTIONS = ['proof', 'featured', 'automation', 'projects', 'showcase', 'quotes'];
      for (const id of HOME_SECTIONS) {
        const block = html.split(`id="${id}"`)[1]?.split('</section>')[0] ?? '';
        if (!block.includes('class="section__more"')) {
          fail(`${file}: home section "${id}" has no link out to its page`);
        }
      }
    }

    // 8e: a link to one item on a page must have that item to land on.
    //
    // Cards link to `/projects#smart-scanner`. If the id is renamed, the link
    // still resolves to a real file and quietly lands on the top of the page.
    for (const [, target, fragment] of html.matchAll(/href="(?!https?:|mailto:|tel:)([^"#]*)#([^"]+)"/g)) {
      const resolved = target ? toFile(target, dir) : file;
      if (!resolved?.endsWith('.html') || !existsSync(resolved)) continue;
      const there = resolved === file ? html : readFileSync(resolved, 'utf8');
      if (!there.includes(` id="${fragment}"`)) fail(`${file}: link "${target}#${fragment}" has nothing to land on in ${resolved}`);
    }

    sectionCounts[`${page}:${lang}`] = (html.match(/<section/g) ?? []).length;
  }

  // 9 — AR/EN parity.
  for (const page of [...PAGES, '404']) {
    const en = sectionCounts[`${page}:en`];
    const ar = sectionCounts[`${page}:ar`];
    if (en !== undefined && ar !== undefined && en !== ar) {
      fail(`parity: ${page || 'index'} has ${en} sections in English but ${ar} in Arabic`);
    }
  }

  // 10 — generated artefacts exist and are non-trivial.
  for (const f of ['llms.txt', 'llms-full.txt', 'sitemap.xml', 'api/profile.json', 'api/projects.json', 'api/resume.json', 'robots.txt']) {
    if (!existsSync(f)) fail(`${f}: missing`);
    else if (readFileSync(f, 'utf8').trim().length < 80) fail(`${f}: suspiciously small`);
    // These are read by language models as his own words about himself.
    else if (MISSPELLED_NAME.test(readFileSync(f, 'utf8'))) fail(`${f}: carries the misspelled family name`);
  }

  return { errors: [...errors], warnings: [...warnings] };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('validate.mjs')) {
  const { errors: errs, warnings: warns } = checkAll();
  for (const w of warns) console.log(`  warn  ${w}`);
  for (const e of errs) console.error(`  ERROR ${e}`);
  console.log(`\nvalidate: ${errs.length} error(s), ${warns.length} warning(s)`);
  process.exit(errs.length ? 1 : 0);
}
