import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/**
 * Every asset the pages link to by URL.
 *
 * The CDN in front of the site caches `/assets/css/*` for seven days. An
 * edited stylesheet therefore stayed invisible for a week: visitors got the
 * new HTML — which has a much shorter TTL — wearing the old styles, so the
 * header photo arrived unstyled and nothing looked the way it does locally.
 *
 * Hashing the contents into the query string gives every edit a URL the cache
 * has never seen, which turns that long TTL from a hazard into the win it was
 * meant to be. Nothing needs purging by hand again.
 *
 * CSS is covered completely — no stylesheet `@import`s another, so every file
 * is linked from the HTML and every file gets its own fingerprint.
 */
const VERSIONED_ASSETS = [
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/motion.css',
  'assets/css/chat.css',
  'assets/css/responsive.css',
  'assets/css/rtl.css',
  'assets/js/main.js',
  'assets/js/chat/boot.en.js',
  'assets/js/chat/boot.ar.js',
  'assets/img/nour.jpg',
  'assets/img/nour-96.png',
  'assets/img/icon-32.png',
  'assets/img/icon-180.png',
];

function fingerprintAssets() {
  const out = {};
  for (const file of VERSIONED_ASSETS) {
    try {
      out[file] = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
    } catch {
      // A missing asset is the build's business to notice, not the loader's.
      // Leaving it unversioned keeps the URL working rather than inventing one.
      out[file] = null;
    }
  }
  return out;
}

function readJson(dir, name) {
  const path = join(dir, name);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${name}: could not read or parse — ${err.message}`);
  }
}

function requireKeys(obj, keys, file) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], obj);
    if (value === undefined) throw new Error(`${file}: missing required key "${key}"`);
  }
}

export function loadDb(dir = 'data') {
  const profile = readJson(dir, 'profile.json');
  requireKeys(
    profile,
    ['name.en', 'headline.en', 'email', 'phone', 'site', 'location.countryCode', 'location.city.en', 'sameAs'],
    'profile.json',
  );

  const experience = readJson(dir, 'experience.json');
  const projects = readJson(dir, 'projects.json');
  const workflows = readJson(dir, 'workflows.json');

  for (const [file, rows, keys] of [
    ['experience.json', experience, ['id', 'role.en', 'role.ar', 'company', 'start', 'bullets.en', 'bullets.ar']],
    ['projects.json', projects, ['id', 'name', 'tagline.en', 'tagline.ar', 'stack']],
    ['workflows.json', workflows, ['id', 'name.en', 'name.ar', 'summary.en', 'summary.ar', 'services']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}] (${row.id ?? 'no id'})`));
  }

  const credentials = readJson(dir, 'credentials.json');
  const testimonials = readJson(dir, 'testimonials.json');
  const skills = readJson(dir, 'skills.json');

  for (const [file, rows, keys] of [
    ['credentials.json', credentials, ['id', 'kind', 'name.en', 'name.ar', 'issuer', 'issued']],
    ['testimonials.json', testimonials, ['id', 'author', 'title.en', 'title.ar', 'quote.en', 'quote.ar']],
    ['skills.json', skills, ['id', 'category.en', 'category.ar', 'items']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}] (${row.id ?? 'no id'})`));
  }

  const caseStudy = readJson(dir, 'case-study.json');
  requireKeys(caseStudy, ['figures', 'flow.trigger', 'flow.decision', 'flow.branches', 'scale'], 'case-study.json');

  const links = readJson(dir, 'links.json');
  for (const group of ['people', 'organizations']) {
    if (!links[group]) throw new Error(`links.json: missing "${group}"`);
    for (const [name, entry] of Object.entries(links[group])) {
      if (entry.url === null && typeof entry.todo !== 'string') {
        throw new Error(`links.json: ${group}."${name}" has a null url and no todo`);
      }
    }
  }

  const copy = {
    en: readJson(join(dir, 'copy'), 'en.json'),
    ar: readJson(join(dir, 'copy'), 'ar.json'),
  };

  return {
    profile,
    experience,
    projects,
    workflows,
    credentials,
    testimonials,
    skills,
    caseStudy,
    links,
    copy,
    assetVersions: fingerprintAssets(),
  };
}
