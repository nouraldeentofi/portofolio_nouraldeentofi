import { readFileSync, readdirSync } from 'node:fs';
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
 *
 * The gallery screenshots are listed by folder rather than by hand: they are
 * re-shot under the same names whenever a client site changes, and a new shot
 * behind an old URL is exactly the stale-cache problem described above.
 */
const VERSIONED_ASSETS = [
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/motion.css',
  'assets/css/gallery.css',
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

const VERSIONED_DIRS = ['assets/img/showcase', 'assets/img/workflows'];

function listDir(dir) {
  try {
    return readdirSync(dir).map((f) => `${dir}/${f}`);
  } catch {
    return [];
  }
}

function fingerprintAssets() {
  const out = {};
  for (const file of [...VERSIONED_ASSETS, ...VERSIONED_DIRS.flatMap(listDir)]) {
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
    ['workflows.json', workflows, ['id', 'name.en', 'name.ar', 'summary.en', 'summary.ar', 'services', 'tier', 'status', 'audience', 'flow']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}] (${row.id ?? 'no id'})`));
  }

  // A status is a claim about a real system. Only the three the page can
  // explain are allowed, and a flow, when present, must be drawable.
  for (const w of workflows) {
    if (!['client', 'live', 'built'].includes(w.status)) throw new Error(`workflows.json (${w.id}): unknown status "${w.status}"`);
    if (!['system', 'build'].includes(w.tier)) throw new Error(`workflows.json (${w.id}): unknown tier "${w.tier}"`);
    if (w.flow !== null && (!Array.isArray(w.flow.nodes) || !Array.isArray(w.flow.edges))) {
      throw new Error(`workflows.json (${w.id}): flow must be null or {nodes, edges}`);
    }
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

  const showcase = readJson(dir, 'showcase.json');
  if (!Array.isArray(showcase.sites)) throw new Error('showcase.json: expected "sites" to be an array');
  showcase.sites.forEach((row, i) => {
    const at = `showcase.json sites[${i}] (${row.id ?? 'no id'})`;
    requireKeys(row, ['id', 'name.en', 'name.ar', 'segment', 'role.en', 'role.ar', 'concept.en', 'concept.ar', 'highlights.en', 'highlights.ar', 'images.desktop', 'images.phone'], at);
    if (row.url === null && typeof row.todo !== 'string') throw new Error(`${at}: a null url needs a todo`);
  });
  requireKeys(showcase.lab ?? {}, ['id', 'name.en', 'name.ar', 'count', 'tagline.en', 'tagline.ar', 'url', 'images.desktop'], 'showcase.json lab');

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
    showcase,
    caseStudy,
    links,
    copy,
    assetVersions: fingerprintAssets(),
  };
}
