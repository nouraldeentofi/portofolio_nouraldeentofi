/**
 * Checks worth unit-testing, kept apart from validate.mjs.
 *
 * Pure: text in, rules or a list of problems out. `validate.mjs` reads the
 * real files and reports whatever these return, and the tests feed them
 * broken input to prove each one actually fails.
 */

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
 */
const DETAIL_ADDRESSES = /^\/(?:en\/|ar\/)?(?:projects|automation)\//;

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
 * page: robots.txt opens with a note to AI agents, and robots.txt and
 * llms.txt both point at the MCP server's README.
 */
export const PUBLIC_HAND_KEPT = ['robots.txt', 'mcp/README.md'];

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
