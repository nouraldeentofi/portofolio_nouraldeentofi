/**
 * Checks worth unit-testing, kept apart from validate.mjs.
 *
 * Pure: text in, rules or a list of problems out. `validate.mjs` reads the
 * real files and reports whatever these return, and the tests feed them
 * broken input to prove each one actually fails.
 */

import { LASTMOD_FILE, pageFingerprint } from './lastmod.mjs';

/**
 * Addresses that must never serve a file.
 *
 * Cloudflare Pages publishes the whole repository, so the source, the tests,
 * the notes and the data files were all public, and several of them name
 * things that are kept off the site on purpose. `_redirects` is answered
 * before static files, so a rule for each one closes it. `/mcp/` is not here:
 * robots.txt and llms.txt hand out `/mcp/README.md`.
 */
export const PRIVATE_PATHS = [
  '/CLAUDE.md',
  '/README.md',
  '/package.json',
  '/package-lock.json',
  '/.gitignore',
  '/.gitattributes',
  '/docs/*',
  '/tests/*',
  '/scripts/*',
  '/data/*',
];

/**
 * `_redirects` as rules, in file order. Comments and blank lines are dropped.
 *
 * A rule written without a status is a 302: that is what Cloudflare Pages
 * answers with, so it is what the gate has to see.
 */
export function parseRedirects(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/);
      return { from, to, status: Number(status ?? 302) };
    });
}

/**
 * `_headers` as rules: an unindented line is the address a rule matches, and
 * the indented lines under it are its headers.
 */
export function parseHeaders(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      rules.push({ match: raw.trim(), headers: [] });
      continue;
    }
    const at = raw.indexOf(':');
    rules.at(-1)?.headers.push({ name: raw.slice(0, at).trim(), value: raw.slice(at + 1).trim() });
  }
  return rules;
}

/**
 * The folders the build writes one page per project and per system into.
 * Kept here as addresses, because this module reads `_redirects`, not data.
 *
 * The language in front of the folder may be written out, or stand as a
 * placeholder or a splat (`/:lang/projects/*`, `/*` + `/automation/*`): such
 * a rule answers for every detail page just as the literal one does.
 */
const DETAIL_ADDRESSES = /^\/(?:(?:en|ar|:[A-Za-z_]\w*|\*)\/)?(?:projects|automation)\//;

export function checkRedirects(text) {
  const problems = [];
  const rules = parseRedirects(text);
  // The first rule that matches wins, so a private path listed after the
  // catch-all would never be reached.
  const catchAll = rules.findIndex((r) => r.from === '/*');

  for (const path of PRIVATE_PATHS) {
    const at = rules.findIndex((r) => r.from === path);
    if (at === -1) problems.push(`_redirects: no rule for ${path}, so the host serves it to anyone who asks`);
    else if (rules[at].to !== '/' || rules[at].status !== 301) problems.push(`_redirects: ${path} must go to / with a 301`);
    else if (catchAll !== -1 && at > catchAll) problems.push(`_redirects: ${path} comes after /*, which answers first`);
  }

  for (const r of rules) {
    if (r.from === '/mcp' || r.from.startsWith('/mcp/')) {
      problems.push(`_redirects: ${r.from} is redirected, but robots.txt and llms.txt hand out /mcp/README.md`);
    }
    // A rule under /projects/ or /automation/ is answered before the page
    // itself. One that sends an unknown id to the list page would turn every
    // mistyped address into a second copy of that list instead of a 404.
    if (DETAIL_ADDRESSES.test(r.from)) {
      problems.push(`_redirects: ${r.from} is redirected, but the pages under it are real files and an unknown id must stay a 404`);
    }
  }
  return problems;
}

/** A rule that only ever matches a pages.dev host: an absolute address, not a path. */
const PAGES_DEV_ONLY = /^https:\/\/[a-z0-9:.-]+\.pages\.dev\//i;

export function checkHeaders(text, profile) {
  const problems = [];
  const rules = parseHeaders(text);
  const named = (h, name) => h.name.toLowerCase() === name;

  // noindex on a path rule would apply to the real domain too, and take the
  // whole site out of search. It may only ever be scoped to the duplicate host.
  const robots = rules.filter((r) => r.headers.some((h) => named(h, 'x-robots-tag')));
  for (const r of robots) {
    if (!PAGES_DEV_ONLY.test(r.match)) problems.push(`_headers: X-Robots-Tag on "${r.match}" is not scoped to a pages.dev host`);
  }
  if (!robots.length) problems.push('_headers: no X-Robots-Tag rule for the pages.dev host, which serves a full copy of the site');

  // The canonical is written by hand in _headers, so it is held to the data.
  const cv = profile.cv[0].file;
  const want = `<${profile.site.replace(/\/$/, '')}/${cv}>; rel="canonical"`;
  const canonicals = rules.flatMap((r) =>
    r.headers.filter((h) => named(h, 'link') && h.value.includes('rel="canonical"')).map((h) => ({ match: r.match, value: h.value })),
  );
  if (!canonicals.some((c) => c.match === `/${cv}` && c.value === want)) problems.push(`_headers: /${cv} must send Link: ${want}`);
  for (const c of canonicals) {
    if (c.value !== want) problems.push(`_headers: the canonical on "${c.match}" does not match profile.site and profile.cv`);
  }
  return problems;
}

/**
 * Every em dash in a text, each with a little of what surrounds it, so the
 * report says where to look. Nour asked for none anywhere a reader or a
 * crawler looks; an empty list means the text is clean.
 */
export const emDashHits = (text) => [...text.matchAll(/.{0,30}—.{0,30}/g)].map(([hit]) => hit.trim());

/**
 * The files written by hand that the site hands out, and so are read like a
 * page: robots.txt opens with a note to AI agents, robots.txt and llms.txt
 * both point at the MCP server's README, and humans.txt is served to anyone
 * who asks for it.
 */
export const PUBLIC_HAND_KEPT = ['robots.txt', 'humans.txt', 'mcp/README.md'];

/**
 * Every address a page names relative to itself, as `attr="value"`.
 *
 * A page one level down (/en/projects/<id>) resolves a relative address
 * against its own folder, and the 404 page against whatever address was not
 * found. "assets/css/base.css" works from / and breaks from both, so every
 * address starts at the site root.
 */
export const relativeAddresses = (html) =>
  [...html.matchAll(/\s(href|src|srcset|poster|action)="(?!https?:|mailto:|tel:|#|data:|\/)([^"]+)"/g)].map(([, attr, target]) => `${attr}="${target}"`);

/**
 * What the head of a page tells a search engine, held to what the page is.
 *
 * `own` is the page's clean address in full, in its own language. A page
 * meant for search names exactly that as its one canonical, carries no
 * noindex, and has one robots meta, `indexable`: a detail page that pointed
 * its canonical at the list page would hand its place in search to the list.
 *
 * `own` is null for the 404 page, which is served at whatever address was
 * not found. It carries one robots meta, `noindex`, and names no address as
 * its own: noindex beside a canonical asks for two things at once.
 */
export function searchHeadProblems(html, { own, indexable, noindex }) {
  const problems = [];
  const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)">/g)].map((m) => m[1]);
  const found = robots.length ? robots.map((r) => `"${r}"`).join(', ') : 'none';

  if (own === null) {
    if (robots.length !== 1 || robots[0] !== noindex) problems.push(`the 404 page must carry exactly one robots meta, "${noindex}", found ${found}`);
    for (const [name, pattern] of [['a canonical', /<link rel="canonical"/], ['hreflang links', /<link rel="alternate" hreflang=/], ['og:url', /<meta property="og:url"/]]) {
      if (pattern.test(html)) problems.push(`the 404 page carries ${name}, but it has no address of its own`);
    }
    return problems;
  }

  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
  if (canonicals.length !== 1 || canonicals[0] !== own) problems.push(`canonical must be exactly ${own}, found ${canonicals.join(', ') || 'none'}`);
  if (robots.some((r) => /noindex/.test(r))) problems.push('carries noindex, but it is a page meant to be found');
  if (robots.length !== 1 || robots[0] !== indexable) problems.push(`expected one robots meta with "${indexable}", found ${found}`);
  return problems;
}

/* A host name as it is compared: without "www" and without the closing dot of a
   fully qualified name. `URL` has already put it in lower case. */
const bareHost = (url) => url.hostname.replace(/\.$/, '').replace(/^www\./, '');

/* Can a crawler read this as an address: http or https, and one `URL` can parse? */
const readable = (address) => {
  try {
    return /^https?:$/.test(new URL(address).protocol);
  } catch {
    return false;
  }
};

/**
 * Is this address on the host of `site`? The name decides, not the
 * spelling: http, capitals, "www" and a port all still land on this host. An
 * address with no host of its own is read from `site`, as a crawler would
 * read it. Something that is no address at all is on no host.
 */
export function onHost(address, site) {
  if (typeof address !== 'string') return false;
  try {
    return bareHost(new URL(address.trim(), site)) === bareHost(new URL(site));
  } catch {
    return false;
  }
}

/** Every entry of a sitemap, as `{ loc, lastmod }` in file order. */
export const sitemapEntries = (xml) =>
  [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
    loc: entry.match(/<loc>([^<]*)<\/loc>/)?.[1],
    lastmod: entry.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1],
  }));

/**
 * The sitemap against what the site is.
 *
 * `site` is the address of the site without a closing slash. `pages` is the
 * clean address, in full, of every page the build writes; `hosted` the
 * entry address of every copy of another site that is meant to be found;
 * `closed` the address every copy kept out of search lives under; `pending`
 * the address of every copy whose decision the owner has still to confirm
 * with the client. Each page and each entry is listed exactly once, nothing
 * under a closed or a pending copy is offered, and nothing else on this
 * host is listed at all: an address that is neither a page nor a copy sends
 * a crawler to a 404, or to a page nobody decided should be found. The host
 * is known by its name however the address is written (`onHost`), so a
 * page listed with http, with www or with a port is not passed over as an
 * address somewhere else. An entry a crawler cannot read at all, one with
 * no `<loc>` or with something that is no address, is a problem too: it
 * would otherwise pass in silence as "somewhere else".
 */
export function sitemapProblems(xml, { site, pages = [], hosted = [], closed = [], pending = [] }) {
  const problems = [];
  const entries = sitemapEntries(xml);
  const locs = entries.map((entry) => entry.loc).filter((loc) => loc !== undefined);
  const times = (address) => locs.filter((l) => l === address).length;
  const empty = entries.length - locs.length;
  if (empty) problems.push(`sitemap.xml: ${empty} ${empty === 1 ? 'entry has' : 'entries have'} no <loc>`);

  for (const address of pages) {
    if (times(address) !== 1) problems.push(`sitemap.xml: ${address} must be listed exactly once`);
  }
  for (const address of hosted) {
    if (times(address) !== 1) problems.push(`sitemap.xml: ${address} must be listed exactly once (data/hosting.json says it is meant to be found)`);
  }

  const known = new Set([...pages, ...hosted]);
  for (const loc of new Set(locs)) {
    if (known.has(loc)) continue;
    const copy = closed.find((prefix) => loc?.startsWith(prefix));
    const open = pending.find((prefix) => loc?.startsWith(prefix));
    if (copy) problems.push(`sitemap.xml: lists ${loc}, but data/hosting.json keeps ${copy} out of search`);
    else if (open) problems.push(`sitemap.xml: lists ${loc}, but the entry of ${open} in data/hosting.json still carries a todo: a copy is not submitted before its client has confirmed`);
    else if (onHost(loc, site)) problems.push(`sitemap.xml: lists ${loc}, which is neither a page the build writes nor the entry of a copy`);
    else if (!readable(loc)) problems.push(`sitemap.xml: lists "${loc}", which is not an address a crawler can read`);
  }

  if (/<priority>|<changefreq>/.test(xml)) problems.push('sitemap.xml: carries <priority> or <changefreq>, which Google ignores');
  return problems;
}

/**
 * A page's lastmod is the day its content last changed.
 *
 * `state` is what the build recorded (lastmod.mjs): a hash of each page and
 * the day that hash was first seen. `pages` is `[{ address, html }]`, the
 * address as the state keys it (`/en/about`) and the page as it is on disk.
 * Every page has an entry, the entry's hash is the hash of that page, it has
 * a day, and the sitemap repeats that day. Anything else means a page was
 * changed, or the state was, without a build in between.
 */
export function lastmodProblems(xml, state, pages, site) {
  const problems = [];
  const dates = Object.fromEntries(sitemapEntries(xml).map((entry) => [entry.loc, entry.lastmod]));
  for (const { address, html } of pages) {
    const kept = state?.[address];
    if (!kept) {
      problems.push(`${LASTMOD_FILE}: no entry for ${address}; run npm run build`);
      continue;
    }
    if (kept.hash !== pageFingerprint(html)) problems.push(`${LASTMOD_FILE}: ${address} has changed since its date was recorded; run npm run build`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(kept.date ?? '')) problems.push(`${LASTMOD_FILE}: ${address} has no date`);
    if (dates[`${site}${address}`] !== kept.date) problems.push(`sitemap.xml: lastmod of ${address} is ${dates[`${site}${address}`] ?? 'missing'}, but its content last changed on ${kept.date}`);
  }
  return problems;
}

/**
 * A picture under /assets/img/ named with a query string, anywhere in a
 * page: an `<img>`, `og:image` or the structured data.
 *
 * An image has one address. Google ties what it knows about a picture to the
 * address it was found at, so "nour.jpg" and "nour.jpg?v=1a2b3c4d" are two
 * pictures to it, and the second becomes a third the day the file changes.
 */
export const fingerprintedImages = (html) => [...html.matchAll(/\/assets\/img\/[^"'\s<>)?]*\?[^"'\s<>)]*/g)].map(([hit]) => hit);

/**
 * The family name misspelled, as a whole word.
 *
 * The lookarounds matter: "توفير" (saving) is an ordinary word in the copy
 * that begins with the same four letters, and it must not trip this.
 */
export const MISSPELLED_NAME = /(?<![\u0621-\u064A])توفي(?![\u0621-\u0652])/;

const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

/**
 * Where a built page shows the misspelling, other than the one place it is
 * allowed: `alternateName` on the Person node, which no visitor reads.
 * Returns the places as short labels; an empty list means the page is clean.
 */
export function misspellingLeaks(html) {
  const places = [];
  if (MISSPELLED_NAME.test(html.replace(LD_BLOCK, ''))) places.push('the page itself');

  for (const [, json] of html.matchAll(LD_BLOCK)) {
    let parsed;
    try {
      parsed = JSON.parse(json.replaceAll('<\\/', '</'));
    } catch {
      continue; // unparseable JSON-LD is reported by the validator on its own
    }
    for (const node of parsed['@graph'] ?? [parsed]) {
      const { alternateName, ...rest } = node;
      const checked = node['@type'] === 'Person' ? rest : node;
      if (MISSPELLED_NAME.test(JSON.stringify(checked))) places.push(`JSON-LD ${node['@type']}`);
    }
  }
  return places;
}

/* ------------------------------------------------------------ robots.txt */

/** The groups of a robots.txt: the crawlers each one names and its rules, in file order. */
export function robotsGroups(text) {
  const groups = [];
  let group = null;
  let naming = false; // "User-agent" lines that follow one another share one group
  for (const raw of text.split(/\r?\n/)) {
    const field = raw.replace(/#.*$/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!field) continue;
    const key = field[1].toLowerCase();
    const value = field[2].trim();
    if (key === 'user-agent') {
      if (!naming) groups.push((group = { agents: [], rules: [] }));
      group.agents.push(value);
      naming = true;
    } else {
      naming = false;
      if (key === 'allow' || key === 'disallow') group?.rules.push({ rule: key, path: value });
    }
  }
  return groups;
}

/* Crawlers of search engines. They must be able to fetch a page to read its noindex. */
const SEARCH_CRAWLER = /^(?:googlebot(?:-[a-z]+)?|bingbot|msnbot|slurp|duckduckbot|yandex(?:bot)?|baiduspider|applebot)$/i;

/**
 * robots.txt against the copies of other sites.
 *
 * `aiClosed` are the folders ("/sites/name/") of the copies whose own
 * repository asked the crawlers of AI companies to stay out
 * (`aiClosedPaths` in hosting.mjs). Every group that names such a crawler
 * closes each of those folders and nothing else. The group for every crawler
 * ("*") and a group for a search engine close nothing at all: a search engine
 * that may not fetch a page cannot read its noindex, and an address it may
 * not fetch can still be listed by its link alone.
 */
export function robotsProblems(text, { aiClosed = [] } = {}) {
  const problems = [];
  const groups = robotsGroups(text);
  const closedBy = (group) => group.rules.filter((r) => r.rule === 'disallow' && r.path).map((r) => r.path);
  const open = (group) => group.agents.some((agent) => agent === '*' || SEARCH_CRAWLER.test(agent));

  const everyone = groups.filter((group) => group.agents.includes('*')).length;
  if (everyone !== 1) problems.push(`robots.txt: expected one group for every crawler ("User-agent: *"), found ${everyone}`);

  for (const group of groups) {
    const who = group.agents.join(', ');
    // A search engine and another crawler in one group share its rules, and
    // the two need different ones.
    const engines = group.agents.filter((agent) => agent === '*' || SEARCH_CRAWLER.test(agent));
    if (engines.length && engines.length < group.agents.length) {
      problems.push(`robots.txt: ${who} share one group, but a search engine and the crawler of an AI company need different rules`);
    }
    if (open(group)) {
      for (const path of closedBy(group)) {
        problems.push(`robots.txt: ${who} is kept out of ${path}: a search engine that may not fetch a page cannot read its noindex`);
      }
      continue;
    }
    const closed = closedBy(group);
    // RFC 9309 takes the longest match, but some parsers stop at the first
    // line that matches: for them an "Allow: /" above a Disallow opens it again.
    const order = group.rules.filter((r) => r.path).map((r) => r.rule);
    if (order.includes('allow') && order.lastIndexOf('disallow') > order.indexOf('allow')) {
      problems.push(`robots.txt: ${who} has an Allow line above a Disallow line: a crawler that obeys the first line that matches reads the folders below it as open`);
    }
    // Under RFC 9309 the longest match wins and an Allow wins a tie, so any
    // Allow longer than "/" can open a closed folder again.
    for (const rule of group.rules.filter((r) => r.rule === 'allow' && r.path && r.path !== '/')) {
      problems.push(`robots.txt: ${who} carries "Allow: ${rule.path}": the only Allow a group of AI crawlers keeps is "Allow: /", which cannot open a closed folder`);
    }
    for (const path of aiClosed) {
      if (!closed.includes(path)) problems.push(`robots.txt: ${who} is not kept out of ${path}, which data/hosting.json closes to the crawlers of AI companies`);
    }
    for (const path of closed) {
      if (!aiClosed.includes(path)) problems.push(`robots.txt: ${who} is kept out of ${path}, which no entry of data/hosting.json asks for`);
    }
  }
  if (aiClosed.length && groups.every(open)) problems.push('robots.txt: names no crawler of an AI company, so nothing keeps them out of the copies that asked for it');
  return problems;
}
