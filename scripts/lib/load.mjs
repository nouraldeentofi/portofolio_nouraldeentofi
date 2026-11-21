import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { imageSize } from './image-size.mjs';
import { hostingProblems } from './hosting.mjs';

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
 * The CV is listed by folder: a new CV replaces the old one under the same
 * name, and the CDN keeps a PDF for a day.
 *
 * Images are not here, on purpose. A picture under `assets/img/` has one
 * address everywhere it is named: in an `<img>`, in `og:image` and in the
 * structured data. Google ties what it knows about an image to that address,
 * and a fingerprint would give a re-shot screenshot a new one, and a second
 * one beside the bare address the JSON-LD names. They stay fresh another
 * way: `_headers` has browsers revalidate `/assets/img/*` on every visit.
 */
const VERSIONED_ASSETS = [
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/motion.css',
  'assets/css/gallery.css',
  'assets/css/chat.css',
  'assets/css/detail.css',
  'assets/css/responsive.css',
  'assets/css/rtl.css',
  'assets/js/main.js',
  'assets/js/chat/boot.en.js',
  'assets/js/chat/boot.ar.js',
];

const VERSIONED_DIRS = ['assets/cv'];

/** The folders of pictures a page announces a size for: screenshots and canvases. */
const IMAGE_DIRS = ['assets/img/showcase', 'assets/img/workflows', 'assets/img/projects'];

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

/**
 * The real pixel size of every picture a page announces a size for: the
 * screenshots, the workflow canvases and the share card. Measured from the
 * files, so `og:image:width` can never disagree with the image it names.
 * A file that is missing or in an unknown format is simply left out.
 */
function measureImages(extra = []) {
  const out = {};
  for (const file of [...IMAGE_DIRS.flatMap(listDir), ...extra]) {
    try {
      const size = imageSize(readFileSync(file));
      if (size) out[file] = size;
    } catch {
      // A missing image is reported where it is used, not here.
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

/**
 * Whether a string is a day that exists, written as YYYY-MM-DD.
 *
 * Parsing alone is not enough: an impossible day such as 2026-02-30 is
 * rolled forward into March instead of being refused. So the day is parsed
 * and written back, and it must come out as it went in.
 */
export function isCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

/** File names the host treats specially, so no page of an entry may take them. */
export const RESERVED_IDS = ['index', '404'];

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

  // The day his identity facts last changed, set by hand. It becomes the
  // ProfilePage's dateModified, which has to be a real calendar day.
  if (!isCalendarDay(profile.updated)) {
    throw new Error('profile.json: "updated" must be a real day written as YYYY-MM-DD');
  }

  // The Google tag ID is pasted straight into a script tag, so it has to be
  // exactly an ID and nothing else.
  const tag = profile.analytics?.tag;
  if (tag != null && !/^(G|GTM)-[A-Z0-9]{4,}$/.test(tag)) {
    throw new Error(`profile.json: analytics.tag "${tag}" is not a Google tag ID (GTM-XXXXXXX or G-XXXXXXXXXX)`);
  }

  // The IndexNow key becomes a file name at the site root.
  const indexNowKey = profile.indexNow?.key;
  if (indexNowKey != null && !/^[a-f0-9]{8,128}$/.test(indexNowKey)) {
    throw new Error('profile.json: indexNow.key must be 8 to 128 lowercase hex characters');
  }

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

  // An id is an address (/projects/<id>) and a file name, in both languages.
  for (const [file, rows] of [['projects.json', projects], ['workflows.json', workflows]]) {
    for (const row of rows) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.id)) throw new Error(`${file} (${row.id}): an id is lowercase letters, digits and hyphens`);
      // The host gives these two file names a meaning of their own: a
      // `404.html` in a folder answers every missing address under it, and
      // an `index.html` is served at the folder's address, a second one
      // beside the list page.
      if (RESERVED_IDS.includes(row.id)) throw new Error(`${file} (${row.id}): "${row.id}" is reserved by the host and cannot be an id`);
    }
    const ids = rows.map((r) => r.id);
    const twice = ids.find((id, i) => ids.indexOf(id) !== i);
    if (twice) throw new Error(`${file}: the id "${twice}" is used twice`);
  }

  // A project's group is a filter on the projects page, so it must be one the
  // bar has a label for.
  for (const p of projects) {
    if (!['ai', 'tools', 'apps'].includes(p.group)) throw new Error(`projects.json (${p.id}): unknown group "${p.group}"`);
  }

  // A search headline is optional, but half of one would print "undefined"
  // under a heading in the other language.
  for (const [file, rows] of [['projects.json', projects], ['workflows.json', workflows]]) {
    for (const row of rows) {
      if (row.headline !== undefined && (typeof row.headline?.en !== 'string' || typeof row.headline?.ar !== 'string')) {
        throw new Error(`${file} (${row.id}): headline needs both "en" and "ar"`);
      }
    }
  }

  // A project may name the workflow that is its engine. That workflow is then
  // shown on the project's page and gets none of its own, so the name has to
  // be a real one, and one workflow cannot be the engine of two products.
  const engines = new Map();
  for (const p of projects) {
    if (p.workflow === undefined) continue;
    if (!workflows.some((w) => w.id === p.workflow)) throw new Error(`projects.json (${p.id}): workflow "${p.workflow}" is not in workflows.json`);
    if (engines.has(p.workflow)) throw new Error(`projects.json (${p.id}): workflow "${p.workflow}" already belongs to ${engines.get(p.workflow)}`);
    engines.set(p.workflow, p.id);
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

  // A price printed online binds the seller, so each one is printed exactly
  // as the data has it: a kind of site in both languages and a whole amount
  // in one currency. Half of one would print "undefined" beside a price.
  requireKeys(showcase.prices ?? {}, ['currency.en', 'currency.ar', 'items'], 'showcase.json prices');
  if (!Array.isArray(showcase.prices.items) || showcase.prices.items.length === 0) throw new Error('showcase.json prices: expected "items" to be a list of prices');
  showcase.prices.items.forEach((row, i) => {
    const at = `showcase.json prices.items[${i}] (${row.id ?? 'no id'})`;
    requireKeys(row, ['id', 'label.en', 'label.ar', 'amount'], at);
    if (!Number.isInteger(row.amount) || row.amount <= 0) throw new Error(`${at}: an amount is a whole number above zero`);
  });

  // A tag is the name of a technology, one string for both languages, or a
  // plain-language label written in each. Half a pair would print
  // "undefined" on a badge in the other language.
  for (const row of [...showcase.sites, showcase.lab]) {
    for (const tag of row.tags ?? []) {
      const pair = tag && typeof tag === 'object' && typeof tag.en === 'string' && typeof tag.ar === 'string';
      if (typeof tag !== 'string' && !pair) throw new Error(`showcase.json (${row.id}): a tag is a string or needs both "en" and "ar"`);
    }
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

  // Every copy of another site on the domain says whether search engines
  // may list it. There is no default: an entry without a decision stops the
  // build, the tests and the sync alike, and so does one whose path is not
  // a folder of its own, which the sync would replace all the same.
  const hosting = readJson(dir, 'hosting.json');
  const [unsound] = hostingProblems(hosting);
  if (unsound) throw new Error(unsound);

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
    hosting,
    copy,
    assetVersions: fingerprintAssets(),
    imageSizes: measureImages([profile.ogImage].filter(Boolean)),
  };
}
