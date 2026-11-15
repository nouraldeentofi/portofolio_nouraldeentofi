/**
 * Pure helpers for `scripts/sync-sites.mjs` and `scripts/validate.mjs`: which
 * files of a site's deploy branch are the site, how its GitHub Pages
 * addresses become addresses on Nour's own domain, and what a copy says to a
 * search engine once it lives there. Data in, string, boolean or list out.
 *
 * The copies belong to other repositories, so nothing here rewrites what a
 * visitor reads. The transforms only touch what a crawler reads: the robots
 * meta, the canonical, the addresses a page gives for itself, and rating
 * markup that the domain is not allowed to carry.
 */

/*
 * Working files that sit next to a site in its repository but are not part of
 * it. The folders only count at the top: a site may well have its own
 * `js/templates/`, and that one is the site. `test` is a repository's test
 * pages: on the domain they were served to anyone, and to Google.
 */
const SKIP_DIRS = new Set(['.git', '.github', 'source', 'test', 'tests', 'tools', 'templates', 'deploy', 'preview', 'node_modules']);
/*
 * `robots.txt` is read at the root of a host and nowhere else, so a copy's
 * own one, at any depth, is a file nobody reads. `404.html` is not here on
 * purpose: the host serves the nearest one, so each copy keeps its own.
 */
const SKIP_FILES = new Set(['package.json', 'package-lock.json', '.gitignore', '.gitattributes', '.nojekyll', 'CNAME', 'robots.txt']);
const SKIP_EXT = /\.(md|py|sh|j2|ya?ml|toml|env|pem|key)$/i;

/** Is this path (relative to the site root, `/`-separated) part of the site? */
export function keepFile(rel) {
  const parts = rel.split('/');
  if (parts.length > 1 && SKIP_DIRS.has(parts[0])) return false;
  if (parts.includes('.git')) return false;
  const name = parts.at(-1);
  return !SKIP_FILES.has(name) && !SKIP_EXT.test(name);
}

/** Text files whose addresses are rewritten; everything else is copied as is. */
export const isText = (rel) => /\.(html?|xml|txt|json|webmanifest|m?js|css|svg)$/i.test(rel);

const isPage = (rel) => /\.html?$/i.test(rel);
const isXml = (rel) => /\.xml$/i.test(rel);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const domainOf = (hosting) => hosting.domain.replace(/\/$/, '');

/**
 * Every address a site had on GitHub Pages, under its repository name or an
 * alias, moved to its path on the domain:
 *   https://<owner>.github.io/<name>/x  ->  https://<domain>/<path>/x
 *   "/<name>/x" (root-relative)          ->  "/<path>/x"
 */
export function rewriteUrls(text, site, hosting) {
  const domain = domainOf(hosting);
  let out = text;
  for (const name of [site.repo, ...(site.aliases ?? [])]) {
    const abs = new RegExp(`https?://${esc(hosting.owner)}\\.github\\.io/${esc(name)}(?=[/"'\\s?#)<\\]]|$)`, 'g');
    out = out.replace(abs, `${domain}/${site.path}`);
    const rel = new RegExp(`(["'(=\\s])/${esc(name)}/`, 'g');
    out = out.replace(rel, `$1/${site.path}/`);
  }
  return out;
}

/** The public address of a hosted site. */
export const siteUrl = (site, hosting) => `${domainOf(hosting)}/${site.path}/`;

/* ------------------------------------------------- the indexing decision */

/**
 * The three answers to "may a search engine list this copy?", written as
 * `index` on every entry of data/hosting.json:
 *
 *   true         the copy is meant to be found here, and its own robots tags stand
 *   false        every page carries noindex: it is a sample, linked from the showcase
 *   "root-only"  the entry page is meant to be found, every page behind it is not
 *
 * There is no default. A copy with no decision would be listed or hidden by
 * accident, so loading the data fails until someone has decided.
 */
export const INDEX_VALUES = [true, false, 'root-only'];

/** The page a copy is entered through: `/<path>/`. */
export const ENTRY = 'index.html';

/** What is wrong with data/hosting.json, as a list; empty when it is sound. */
export function hostingProblems(hosting) {
  const problems = [];
  if (!Array.isArray(hosting?.sites)) return ['hosting.json: expected "sites" to be an array'];
  for (const site of hosting.sites) {
    const at = `hosting.json (${site.repo ?? site.path ?? 'no repo'})`;
    for (const key of ['repo', 'branch', 'path']) {
      if (typeof site[key] !== 'string' || !site[key]) problems.push(`${at}: missing "${key}"`);
    }
    if (!INDEX_VALUES.includes(site.index)) {
      problems.push(`${at}: "index" must be true, false or "root-only": say whether search engines may list this copy`);
    }
  }
  const former = hosting.formerHosts ?? [];
  if (!Array.isArray(former) || former.some((h) => typeof h !== 'string' || !/^[a-z0-9.-]+\.[a-z]+$/i.test(h))) {
    problems.push('hosting.json: "formerHosts" is a list of bare host names, such as "example.netlify.app"');
  }
  return problems;
}

/** Does the decision in the data want this page of the copy in search? */
export const wantsIndex = (site, rel) => site.index === true || (site.index === 'root-only' && rel === ENTRY);

/**
 * The addresses the main sitemap lists for the copies: the entry address of
 * each one that is meant to be found, and never one that is not.
 */
export const hostedEntries = (hosting) => (hosting?.sites ?? []).filter((site) => site.index !== false).map((site) => siteUrl(site, hosting));

/* ------------------------------------------------------ reading a page */

const blank = (text) => ' '.repeat(text.length);

/**
 * The page with its comments, scripts and styles blanked out, character for
 * character, so a tag found in the result sits at the same place in the
 * page. A robots meta inside a comment is not a robots meta, and replacing
 * it there would leave the page without one.
 */
const mask = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => open + blank(body) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, body, close) => open + blank(body) + close);

const tagsOf = (html, pattern) =>
  [...mask(html).matchAll(pattern)].map((m) => ({ index: m.index, end: m.index + m[0].length, tag: m[0] }));

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

const metasOf = (html) => tagsOf(html, /<meta\b[^>]*>/gi);
const linksOf = (html) => tagsOf(html, /<link\b[^>]*>/gi);
const isRobots = (t) => attr(t.tag, 'name')?.toLowerCase() === 'robots';
const isCanonical = (t) => (attr(t.tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical');

/**
 * What a page tells a search engine about itself: the content of every
 * robots meta, and every address it names as its own.
 */
export function pageSignals(html) {
  const metas = metasOf(html);
  const links = linksOf(html);
  return {
    robots: metas.filter(isRobots).map((t) => attr(t.tag, 'content') ?? ''),
    canonicals: links.filter(isCanonical).map((t) => attr(t.tag, 'href') ?? ''),
    alternates: links.filter((t) => attr(t.tag, 'hreflang') !== null).map((t) => attr(t.tag, 'href') ?? ''),
    ogUrls: metas.filter((t) => attr(t.tag, 'property')?.toLowerCase() === 'og:url').map((t) => attr(t.tag, 'content') ?? ''),
  };
}

const isNoindex = (html) => pageSignals(html).robots.some((content) => /\bnoindex\b/i.test(content));

/* ------------------------------------------------------ writing a page */

/** What a page that stays out of search says. Links on it are still followed. */
export const NOINDEX_FOLLOW = 'noindex, follow';

/**
 * A tag added to the head: after the charset line when there is one (it has
 * to stay within the first bytes of the file), else straight after `<head>`,
 * and for a page written without a head, as early as the markup allows. On a
 * page laid out one tag to a line, the new tag takes a line of its own with
 * the same indent.
 */
function insertInHead(html, tag) {
  const masked = mask(html);
  const anchor =
    /<meta\b[^>]*\bcharset\b[^>]*>/i.exec(masked) ??
    /<head(?:\s[^>]*)?>/i.exec(masked) ??
    /<html(?:\s[^>]*)?>/i.exec(masked) ??
    /<!doctype[^>]*>/i.exec(masked);
  if (!anchor) return `${tag}\n${html}`;

  const at = anchor.index + anchor[0].length;
  const lineStart = html.lastIndexOf('\n', anchor.index) + 1;
  const indent = html.slice(lineStart, anchor.index);
  const ownLine = /^[ \t]*$/.test(indent) && /^[ \t]*\r?\n/.test(html.slice(at));
  const newline = html[lineStart - 2] === '\r' || html.slice(at, at + 2) === '\r\n' ? '\r\n' : '\n';
  return html.slice(0, at) + (ownLine ? `${newline}${indent}${tag}` : tag) + html.slice(at);
}

/** Take a tag out, and the line it stood on when it stood there alone. */
function cut(html, index, end) {
  const lineStart = html.lastIndexOf('\n', index - 1) + 1;
  const rest = /^[ \t]*\r?\n/.exec(html.slice(end));
  if (/^[ \t]*$/.test(html.slice(lineStart, index)) && rest) return html.slice(0, lineStart) + html.slice(end + rest[0].length);
  return html.slice(0, index) + html.slice(end);
}

/** Exactly one robots meta, with this content: the first is replaced, the rest go. */
function setRobots(html, content) {
  const want = `<meta name="robots" content="${content}">`;
  const found = metasOf(html).filter(isRobots);
  if (!found.length) return insertInHead(html, want);
  let out = html;
  // From the end, so the places of the earlier tags do not move.
  for (const t of found.slice(1).reverse()) out = cut(out, t.index, t.end);
  return out.slice(0, found[0].index) + want + out.slice(found[0].end);
}

/**
 * The decision in data/hosting.json, written into one copied page.
 *
 * A page that is not meant to be found ends up with one robots meta,
 * "noindex, follow", whatever it carried before. A page that is meant to be
 * found keeps the robots tags its owner wrote, and the entry page gets a
 * canonical naming its clean address when it has none: without one, Google
 * chooses between `/gallery/`, `/gallery/index.html` and whatever else
 * links to it.
 */
export function applyIndexing(html, site, rel, hosting) {
  if (!wantsIndex(site, rel)) return setRobots(html, NOINDEX_FOLLOW);
  if (rel === ENTRY && !isNoindex(html) && !pageSignals(html).canonicals.length) {
    return insertInHead(html, `<link rel="canonical" href="${siteUrl(site, hosting)}">`);
  }
  return html;
}

/* ------------------------------------------------------ clean addresses */

/**
 * The copy's own absolute addresses, as the host serves them.
 *
 * The host answers `/about.html` with a redirect to `/about`, so a canonical,
 * hreflang, og:url or sitemap entry ending in `.html` names an address that
 * is never the page. Only an absolute address of this copy is touched: those
 * are the ones a page gives for itself in its head, its structured data and
 * its sitemap. Links in the body are relative and stay as their owner wrote
 * them, and so do other sites' addresses and anything that is not a page.
 *
 *   https://<domain>/<path>/about.html       ->  https://<domain>/<path>/about
 *   https://<domain>/<path>/en/index.html#x  ->  https://<domain>/<path>/en/#x
 */
export function cleanAddresses(text, site, hosting) {
  const base = `${domainOf(hosting)}/${site.path}`;
  // An address ends at a quote, a bracket, white space, or where its query or fragment begins.
  const own = new RegExp(`${esc(base)}(?![\\w.-])(/[^"'\\s<>#?)&\\\\]*)?`, 'g');
  return text.replace(own, (whole, path = '') => {
    if (/\/index\.html$/i.test(path)) return base + path.slice(0, -'index.html'.length);
    if (/\.html$/i.test(path)) return base + path.slice(0, -'.html'.length);
    return whole;
  });
}

const withAttr = (tag, name, value) =>
  tag.replace(new RegExp(`(\\s${name}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s"'>]+)`, 'i'), (_, before) => `${before}"${value}"`);

/**
 * The address a page gives for itself, written in full.
 *
 * A canonical, an hreflang link or an og:url written relative to the page
 * ("journey.html", "../impact/x.html") names the same `.html` address the
 * host redirects, only in a form `cleanAddresses` cannot see. Those three
 * tags, and nothing else, have a relative address resolved against the
 * page's own, so the next step can clean it. Google asks for absolute
 * addresses in all three anyway.
 */
export function absoluteHeadAddresses(html, site, rel, hosting) {
  const own = `${siteUrl(site, hosting)}${rel}`;
  const named = [
    ...linksOf(html).filter((t) => isCanonical(t) || attr(t.tag, 'hreflang') !== null).map((t) => ({ ...t, name: 'href' })),
    ...metasOf(html).filter((t) => attr(t.tag, 'property')?.toLowerCase() === 'og:url').map((t) => ({ ...t, name: 'content' })),
  ].sort((a, b) => b.index - a.index);

  let out = html;
  // From the end, so the places of the earlier tags do not move.
  for (const t of named) {
    const value = attr(t.tag, t.name);
    if (!value || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(value)) continue;
    let full;
    try {
      full = new URL(value, own).href;
    } catch {
      continue;
    }
    out = out.slice(0, t.index) + withAttr(t.tag, t.name, full) + out.slice(t.end);
  }
  return out;
}

/**
 * Hosts the portfolio used to live on. They only redirect to the domain now,
 * so a copy that still links to one sends every visitor through a redirect.
 * With its scheme the host becomes the domain; named bare, as link text, it
 * becomes the domain's own name.
 */
export function moveFormerHosts(text, hosting) {
  const domain = domainOf(hosting);
  const bare = domain.replace(/^https?:\/\//, '');
  let out = text;
  for (const host of hosting.formerHosts ?? []) {
    out = out.replace(new RegExp(`https?://${esc(host)}(?![\\w-]|\\.\\w)`, 'gi'), domain);
    out = out.replace(new RegExp(`(?<![\\w.-])${esc(host)}(?![\\w-]|\\.\\w)`, 'gi'), bare);
  }
  return out;
}

/** The former hosts a text still names. */
export const formerHostHits = (text, hosting) =>
  (hosting.formerHosts ?? []).filter((host) => new RegExp(`(?<![\\w.-])${esc(host)}(?![\\w-]|\\.\\w)`, 'i').test(text));

/* ------------------------------------------------------ no borrowed stars */

/*
 * Google's review rules: a rating in the markup has to come from visitors of
 * the page itself. A figure copied from Google Maps, or a business rating
 * itself, is not that, and marking it up can cost the whole domain its rich
 * results. The copies are not ours to judge one by one, so none of them
 * carries rating markup here. The words on the page ("rated so much on
 * Google") are the owner's and stay.
 */
const RATING_MEMBERS = new Set(['aggregateRating', 'review', 'reviews']);
const RATING_TYPES = new Set(['Review', 'CriticReview', 'UserReview', 'EmployerReview', 'AggregateRating', 'EmployerAggregateRating']);

const typesOf = (node) => [node['@type']].flat().filter((t) => typeof t === 'string').map((t) => t.replace(/^https?:\/\/schema\.org\//, ''));
const isRatingNode = (node) => typesOf(node).some((t) => RATING_TYPES.has(t));

const LD_BLOCKS = /(<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>)([\s\S]*?)(<\/script>)/gi;

/** Every place a parsed JSON-LD value carries a rating, as short labels. */
function ratingsIn(value, found = []) {
  if (Array.isArray(value)) value.forEach((v) => ratingsIn(v, found));
  else if (value && typeof value === 'object') {
    if (isRatingNode(value)) found.push(`a ${typesOf(value).join(' ')} node`);
    for (const [key, child] of Object.entries(value)) {
      if (RATING_MEMBERS.has(key)) found.push(`"${key}" on ${typesOf(value).join(' ') || 'a node'}`);
      else ratingsIn(child, found);
    }
  }
  return found;
}

const GONE = Symbol('removed');

/** The value without its ratings, or GONE when the value itself was one. */
function withoutRatings(value) {
  if (Array.isArray(value)) return value.map(withoutRatings).filter((v) => v !== GONE);
  if (!value || typeof value !== 'object') return value;
  if (isRatingNode(value)) return GONE;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (RATING_MEMBERS.has(key)) continue;
    const kept = withoutRatings(child);
    if (kept !== GONE) out[key] = kept;
  }
  return out;
}

/**
 * A copied page without rating markup: `aggregateRating` and `review`
 * members and Review or AggregateRating nodes leave its JSON-LD, and nothing
 * else moves. A block with no rating is returned byte for byte; a block that
 * does not parse is left as it is (`ratingMarkup` still reports it).
 */
export function stripRatings(html) {
  return html.replace(LD_BLOCKS, (whole, open, body, close) => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return whole;
    }
    if (!ratingsIn(parsed).length) return whole;
    const kept = withoutRatings(parsed);
    // The block was nothing but a rating.
    if (kept === GONE) return '';
    const json = JSON.stringify(kept, null, body.trim().includes('\n') ? 2 : 0).replaceAll('</', '<\\/');
    return open + body.match(/^\s*/)[0] + json + body.match(/\s*$/)[0] + close;
  });
}

/**
 * Where a page carries rating markup: in its JSON-LD, parsed or not, and in
 * microdata or RDFa attributes. An empty list means it carries none.
 */
export function ratingMarkup(html) {
  const found = [];
  for (const [, , body] of html.matchAll(LD_BLOCKS)) {
    try {
      found.push(...ratingsIn(JSON.parse(body)).map((where) => `JSON-LD: ${where}`));
    } catch {
      if (/"(?:aggregateRating|reviews?)"\s*:|"@type"\s*:\s*"(?:Review|AggregateRating)"/.test(body)) {
        found.push('JSON-LD that does not parse, and names a rating');
      }
    }
  }
  const tags = mask(html);
  if (/\s(?:itemprop|property)\s*=\s*["']?(?:[a-z]+:)?(?:aggregateRating|reviewRating|ratingValue|review)["'\s>]/i.test(tags)) found.push('a rating in microdata or RDFa');
  if (/\s(?:itemtype|typeof)\s*=\s*["'][^"']*\b(?:AggregateRating|Review)["']/i.test(tags)) found.push('a Review or AggregateRating item in microdata or RDFa');
  return found;
}

/* ------------------------------------------------------ one file, synced */

/**
 * Everything the sync does to one text file of a copy, in order: its old
 * addresses move to the domain; a page names itself in full; a page or a
 * sitemap has its own addresses lose their `.html`; a page then loses its
 * rating markup and gains what the indexing decision asks for.
 */
export function transformFile(text, rel, site, hosting) {
  let out = moveFormerHosts(rewriteUrls(text, site, hosting), hosting);
  if (isPage(rel)) out = absoluteHeadAddresses(out, site, rel, hosting);
  if (isPage(rel) || isXml(rel)) out = cleanAddresses(out, site, hosting);
  if (isPage(rel)) out = applyIndexing(stripRatings(out), site, rel, hosting);
  return out;
}

/* ------------------------------------------------------ the gate */

/** An address of this domain, or a relative one, that names a page by its file. */
const namesHtmlFile = (address, hosting) => {
  const external = /^https?:\/\//i.test(address) && !address.startsWith(`${domainOf(hosting)}/`);
  return !external && /\.html$/i.test(address.split(/[#?]/)[0]);
};

/**
 * What is wrong with one file of a copy as it stands in this repository, as
 * a list `validate` reports. It holds the copy to the decision in the data
 * and to what the sync promises, so a copy edited by hand, or synced before
 * a decision changed, fails here instead of in search results.
 *
 * Another site's address is its owner's business: only an address on this
 * domain, or a relative one, is held to the clean form.
 */
export function copyFileProblems(text, rel, site, hosting) {
  const problems = [];
  if (!keepFile(rel)) return ['is not part of the site (a test page, a nested robots.txt or a working file)'];
  if (!isText(rel)) return problems;

  for (const host of formerHostHits(text, hosting)) problems.push(`still names ${host}, which only redirects to the domain`);

  if (isXml(rel)) {
    for (const [, loc] of text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      if (namesHtmlFile(loc, hosting)) problems.push(`lists ${loc}, an address the host redirects`);
    }
  }
  if (!isPage(rel)) return problems;

  const signals = pageSignals(text);
  const noindex = signals.robots.some((content) => /\bnoindex\b/i.test(content));
  if (!wantsIndex(site, rel)) {
    if (!noindex) problems.push(`carries no noindex, but data/hosting.json keeps it out of search ("index": ${JSON.stringify(site.index)})`);
  } else if (rel === ENTRY && !noindex && !signals.canonicals.length) {
    problems.push('is the entry page of a copy meant to be found, and has no canonical');
  }
  for (const [name, addresses] of [['canonical', signals.canonicals], ['hreflang', signals.alternates], ['og:url', signals.ogUrls]]) {
    for (const address of addresses) {
      if (namesHtmlFile(address, hosting)) problems.push(`its ${name} is ${address}, an address the host redirects`);
    }
  }
  for (const where of ratingMarkup(text)) problems.push(`carries rating markup (${where}): a rating on this domain must come from its own visitors`);
  return problems;
}
