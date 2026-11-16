/**
 * Pure helpers for `scripts/sync-sites.mjs` and `scripts/validate.mjs`: which
 * files of a site's deploy branch are the site, how its GitHub Pages
 * addresses become addresses on Nour's own domain, and what a copy says to a
 * search engine once it lives there. Data in, string, boolean or list out.
 * The two functions that move folders, `restoreCopy` and `replaceCopy`, do it
 * with the file functions they are handed and with nothing else.
 *
 * The copies belong to other repositories, so the transforms touch what a
 * crawler reads: the robots meta, the canonical, the addresses a page gives
 * for itself in its head and its structured data, and rating markup that the
 * domain is not allowed to carry. One thing a visitor does see: a link, or a
 * link text, that names a host the portfolio used to live on names the
 * domain instead (`moveFormerHosts`).
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
const SKIP_FILES = new Set(['package.json', 'package-lock.json', '.gitignore', '.gitattributes', '.nojekyll', 'cname', 'robots.txt']);
const SKIP_EXT = /\.(md|py|sh|j2|ya?ml|toml|env|pem|key)$/i;

/**
 * Is this path (relative to the site root, `/`-separated) part of the site?
 * Names are compared without regard to case: `Test/` and `Robots.TXT` are
 * the same working files as `test/` and `robots.txt`.
 */
export function keepFile(rel) {
  const parts = rel.toLowerCase().split('/');
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

/*
 * Where a copy may live. The sync replaces the whole folder named by `path`,
 * so a path it would be wrong to delete is refused before anything runs: a
 * copy is `sites/<name>` or one plain folder at the root, and never a folder
 * the main site owns.
 */
const COPY_PATH = /^(?:sites\/)?[a-z0-9][a-z0-9-]*$/;
const OWN_FOLDERS = new Set(['sites', 'assets', 'api', 'en', 'projects', 'automation', 'cv', 'resume', 'profile', 'data', 'scripts', 'tests', 'mcp', 'docs']);
/* The folder of a repository the site is read from: plain names, going down. */
const PLAIN_DIR = /^[\w.-]+(?:\/[\w.-]+)*$/;
const plainDir = (dir) => PLAIN_DIR.test(dir) && !dir.split('/').some((part) => /^\.+$/.test(part));

/** What is wrong with data/hosting.json, as a list; empty when it is sound. */
export function hostingProblems(hosting) {
  const problems = [];
  if (!Array.isArray(hosting?.sites)) return ['hosting.json: expected "sites" to be an array'];
  const taken = new Set();
  for (const site of hosting.sites) {
    const at = `hosting.json (${site.repo ?? site.path ?? 'no repo'})`;
    for (const key of ['repo', 'branch', 'path']) {
      if (typeof site[key] !== 'string' || !site[key]) problems.push(`${at}: missing "${key}"`);
    }
    if (!INDEX_VALUES.includes(site.index)) {
      problems.push(`${at}: "index" must be true, false or "root-only": say whether search engines may list this copy`);
    }
    if (typeof site.path === 'string' && site.path) {
      if (!COPY_PATH.test(site.path)) {
        problems.push(`${at}: "path" must be sites/<name> or one plain folder name, in lower case: the sync replaces that whole folder`);
      } else if (OWN_FOLDERS.has(site.path)) {
        problems.push(`${at}: "path" names ${site.path}/, a folder the main site owns`);
      } else if (taken.has(site.path)) {
        problems.push(`${at}: "path" ${site.path} is the path of another entry too`);
      }
      if (hosting.sites.some((other) => other !== site && typeof other.path === 'string' && other.path && site.path.startsWith(`${other.path}/`))) {
        problems.push(`${at}: "path" ${site.path} lies inside the path of another entry`);
      }
      taken.add(site.path);
    }
    if (site.dir !== undefined && site.dir !== '' && (typeof site.dir !== 'string' || !plainDir(site.dir))) {
      problems.push(`${at}: "dir" must be empty or a folder inside the repository, such as "docs", with no ".."`);
    }
    if (site.aiCrawlers !== undefined && (site.aiCrawlers !== false || site.index !== false)) {
      problems.push(`${at}: "aiCrawlers" may only be false, and only on a copy whose "index" is false: it closes a copy that is already out of search to the crawlers of AI companies as well`);
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
 * Is the decision on this copy still open? A `todo` beside `index` says the
 * owner has yet to confirm it with the client.
 */
export const isPending = (site) => Boolean(site.todo);

/**
 * The folders robots.txt closes to the crawlers of AI companies: the copies
 * whose own repository asked for that (`aiCrawlers: false`). A robots.txt
 * inside a folder has no force, so the wish is kept at the root, and only
 * for the crawlers named there: a rule for every crawler would hide the
 * noindex of these pages from the search engines that must read it. Each
 * folder is written the way a robots rule names one, "/sites/name/".
 */
export const aiClosedPaths = (hosting) => (hosting?.sites ?? []).filter((site) => site.aiCrawlers === false).map((site) => `/${site.path}/`);

/**
 * The addresses the main sitemap lists for the copies: the entry address of
 * each one that is meant to be found, and never one that is not. A copy whose
 * decision is still open is left out as well: it stays as indexable as its
 * repository left it, but nobody submits it before the client has said yes.
 */
export const hostedEntries = (hosting) =>
  (hosting?.sites ?? []).filter((site) => site.index !== false && !isPending(site)).map((site) => siteUrl(site, hosting));

/**
 * The names under `sites/` that no entry of data/hosting.json stands behind.
 * Such a folder is served like any other, with no decision about search and
 * nothing that holds it to one: a copy taken out of the data must leave the
 * repository with its entry.
 */
export const strayCopies = (names, hosting) => names.filter((name) => !(hosting?.sites ?? []).some((site) => site.path === `sites/${name}`));

/* ------------------------------------------------------ reading a page */

const blank = (text) => ' '.repeat(text.length);

const HIDDEN = /<!--[\s\S]*?-->|(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;

/**
 * The page with its comments, scripts and styles blanked out, character for
 * character, so a tag found in the result sits at the same place in the
 * page. A robots meta inside a comment is not a robots meta, and replacing
 * it there would leave the page without one.
 *
 * One pass, so whichever of the three opens first is the one that is read:
 * a script that holds the characters of a comment opening is still a script,
 * and does not hide the tags that follow it.
 */
const mask = (html) =>
  html.replace(HIDDEN, (whole, scriptOpen, script, scriptClose, styleOpen, style, styleClose) => {
    if (scriptOpen !== undefined) return scriptOpen + blank(script) + scriptClose;
    if (styleOpen !== undefined) return styleOpen + blank(style) + styleClose;
    return blank(whole);
  });

/**
 * The head of a page, masked: everything before the first `</head>`, or
 * before `<body` on a page that never closes its head. A page written
 * without either is all head, which is how a browser reads a stub.
 *
 * A robots meta or a canonical counts only here. Further down it may sit in
 * a `<template>`, a `<textarea>` or the `srcdoc` of a frame, where it says
 * nothing to a search engine, and where a tag written beside it would break
 * what the visitor sees.
 */
const headOf = (html) => {
  const masked = mask(html);
  const end = /<\/head\s*>|<body\b/i.exec(masked);
  return end ? masked.slice(0, end.index) : masked;
};

const tagsOf = (html, pattern) =>
  [...headOf(html).matchAll(pattern)].map((m) => ({ index: m.index, end: m.index + m[0].length, tag: m[0] }));

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

const metasOf = (html) => tagsOf(html, /<meta\b[^>]*>/gi);
const linksOf = (html) => tagsOf(html, /<link\b[^>]*>/gi);
const isRobots = (t) => attr(t.tag, 'name')?.toLowerCase() === 'robots';
const isCanonical = (t) => (attr(t.tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical');

/**
 * What a page tells a search engine about itself, in its head: the content
 * of every robots meta, and every address it names as its own.
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

/** The directives of one robots meta, in lower case: "NOINDEX, Follow" says noindex and follow. */
const directives = (content) => content.toLowerCase().replace(/:\s+/g, ':').split(/[\s,]+/).filter(Boolean);
const says = (robots, ...words) => robots.some((content) => directives(content).some((d) => words.includes(d)));

/* "none" is the short form of "noindex, nofollow". */
const closesIndex = (robots) => says(robots, 'noindex', 'none');
const closesLinks = (robots) => says(robots, 'nofollow', 'none');

/* ------------------------------------------------------ writing a page */

/** What a page that stays out of search says. Links on it are still followed. */
export const NOINDEX_FOLLOW = 'noindex, follow';
/** The same, on a page whose owner had already asked that its links are not followed. */
export const NOINDEX_NOFOLLOW = 'noindex, nofollow';

/**
 * A tag added to the head: after the charset line when there is one (it has
 * to stay within the first bytes of the file), else straight after `<head>`,
 * and for a page written without a head, as early as the markup allows. On a
 * page laid out one tag to a line, the new tag takes a line of its own with
 * the same indent.
 */
function insertInHead(html, tag) {
  // Only the head is searched: a charset line further down is not the page's own.
  const head = headOf(html);
  const anchor =
    /<meta\b[^>]*\bcharset\b[^>]*>/i.exec(head) ??
    /<head(?:\s[^>]*)?>/i.exec(head) ??
    /<html(?:\s[^>]*)?>/i.exec(head) ??
    /<!doctype[^>]*>/i.exec(head);
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
 * A page that is not meant to be found ends up with one robots meta that
 * says noindex. The data decides about the index and nothing else, so the
 * owner's word about links stands: a page that said "nofollow" or "none"
 * ends with "noindex, nofollow", and every other one, with a robots meta or
 * without, with "noindex, follow". The copy is never left more open than its
 * own repository asked for.
 *
 * A page that is meant to be found keeps the robots tags its owner wrote,
 * and the entry page gets a canonical naming its clean address when it has
 * none: without one, Google chooses between `/gallery/`,
 * `/gallery/index.html` and whatever else links to it.
 */
export function applyIndexing(html, site, rel, hosting) {
  const { robots, canonicals } = pageSignals(html);
  if (!wantsIndex(site, rel)) return setRobots(html, closesLinks(robots) ? NOINDEX_NOFOLLOW : NOINDEX_FOLLOW);
  if (rel === ENTRY && !closesIndex(robots) && !canonicals.length) {
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
 * is never the page. Only an absolute address of this copy is touched, and
 * other sites' addresses and anything that is not a page stay as they are.
 *
 * This works on whatever text it is handed. The sync hands it a whole
 * sitemap, but of a page only the places where the page names itself to a
 * crawler (`cleanPage`).
 *
 *   https://<domain>/<path>/about.html       ->  https://<domain>/<path>/about
 *   https://<domain>/<path>/en/index.html#x  ->  https://<domain>/<path>/en/#x
 */
export function cleanAddresses(text, site, hosting) {
  const base = `${domainOf(hosting)}/${site.path}`;
  // An address ends at a quote, a bracket, white space, or where its query or fragment begins.
  const own = new RegExp(`${esc(base)}(?![\\w.-])(/[^"'\\s<>#?)&\\\\\\]]*)?`, 'g');
  return text.replace(own, (whole, path = '') => {
    if (/\/index\.html$/i.test(path)) return base + path.slice(0, -'index.html'.length);
    if (/\.html$/i.test(path)) return base + path.slice(0, -'.html'.length);
    return whole;
  });
}

const withAttr = (tag, name, value) =>
  tag.replace(new RegExp(`(\\s${name}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s"'>]+)`, 'i'), (_, before) => `${before}"${value}"`);

/**
 * The three tags in which a page names its own address, canonical, hreflang
 * and og:url, each with the attribute that holds it. From the last to the
 * first, so a caller that rewrites them one by one does not move the places
 * of the ones still to come.
 */
const selfAddressTags = (html) =>
  [
    ...linksOf(html).filter((t) => isCanonical(t) || attr(t.tag, 'hreflang') !== null).map((t) => ({ ...t, name: 'href' })),
    ...metasOf(html).filter((t) => attr(t.tag, 'property')?.toLowerCase() === 'og:url').map((t) => ({ ...t, name: 'content' })),
  ].sort((a, b) => b.index - a.index);

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
  let out = html;
  for (const t of selfAddressTags(html)) {
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

/* A type is written "Review", "schema:Review" or as the address of the term. */
const typesOf = (node) => [node['@type']].flat().filter((t) => typeof t === 'string').map((t) => t.replace(/^(?:https?:\/\/schema\.org\/|schema:)/, ''));
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
    // Every "<" is written as its escape, which JSON reads as the same
    // character. Left bare, "</script" would close the block, and "<!--"
    // followed by "<script" would keep the block's own closing tag from
    // closing it, which swallows the rest of the page.
    const json = JSON.stringify(kept, null, body.trim().includes('\n') ? 2 : 0).replaceAll('<', '\\u003c');
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
      if (/"(?:aggregateRating|reviews?)"\s*:|"@type"\s*:\s*\[?\s*"(?:schema:|https?:\/\/schema\.org\/)?(?:Review|AggregateRating)"/.test(body)) {
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
 * A page's own addresses in the clean form, in the places where it names
 * itself to a crawler and nowhere else: the canonical, hreflang and og:url
 * tags of its head, and its JSON-LD blocks. An address the visitor reads or
 * uses, in the text, in a form field or in a script, is the owner's and
 * stays as written.
 */
export function cleanPage(html, site, hosting) {
  let out = html;
  for (const t of selfAddressTags(html)) out = out.slice(0, t.index) + cleanAddresses(t.tag, site, hosting) + out.slice(t.end);
  return out.replace(LD_BLOCKS, (_, open, body, close) => open + cleanAddresses(body, site, hosting) + close);
}

/**
 * Everything the sync does to one text file of a copy, in order: its old
 * addresses move to the domain; a page names itself in full, and has its own
 * addresses lose their `.html` in its head tags and its structured data; a
 * sitemap has them lose it throughout; a page then loses its rating markup
 * and gains what the indexing decision asks for.
 */
export function transformFile(text, rel, site, hosting) {
  let out = moveFormerHosts(rewriteUrls(text, site, hosting), hosting);
  if (isXml(rel)) out = cleanAddresses(out, site, hosting);
  if (isPage(rel)) out = applyIndexing(stripRatings(cleanPage(absoluteHeadAddresses(out, site, rel, hosting), site, hosting)), site, rel, hosting);
  return out;
}

/* ------------------------------------------------------ one copy, replaced */

/*
 * Where a copy waits while its successor moves in. The folders are moved
 * with the functions handed in (`existsSync`, `renameSync` and `rmSync` of
 * node:fs, for the sync), so this file still reaches for no disk of its own
 * and a test can make any step fail.
 */
const asideOf = (dest) => `${dest}.old`;
const strandedIn = (old, error) => Object.assign(error, { stranded: old });

/**
 * The folders a sync that was stopped half way can leave beside the copies:
 * the half-written `<path>.sync` and the copy that stepped aside,
 * `<path>.old`. Git ignores both, and `validate` fails while one is there:
 * committed, it would be served with no entry and no decision behind it.
 */
export const leftoverFolders = (hosting) => (hosting?.sites ?? []).flatMap((site) => [`${site.path}.sync`, asideOf(site.path)]);

/**
 * A copy that an earlier run left aside goes back to its place.
 *
 * A run that was stopped between the two moves of `replaceCopy`, or whose
 * put-back failed, left the only copy in `<path>.old` and nothing in
 * `<path>`. Returns true when it put one back. With a copy in its place
 * there is nothing to do, whatever is aside. Throws, naming the folder in
 * `stranded`, when the copy cannot be moved back.
 *
 * A folder is a copy when its entry page is there, not when a folder of that
 * name is, in its place and aside alike. A folder aside that holds no entry
 * page is not put back: it is a leftover, and `replaceCopy` deletes it. An
 * empty or half-made `<path>` beside a real copy in `<path>.old` is the one
 * state in which the only copy is the one aside, and `replaceCopy` would go
 * on to delete it. Nothing is moved or deleted by guesswork then: the error
 * names the folder aside in `stranded` and says so in `inTheWay`, and a
 * person removes what is in the way.
 */
export function restoreCopy(dest, { existsSync, renameSync }) {
  const old = asideOf(dest);
  const isCopy = (path) => existsSync(`${path}/${ENTRY}`);
  if (isCopy(dest) || !isCopy(old)) return false;
  if (existsSync(dest)) {
    const error = new Error(`${dest}/ holds no ${ENTRY} while ${old}/ waits beside it`);
    throw Object.assign(strandedIn(old, error), { inTheWay: dest });
  }
  try {
    renameSync(old, dest);
  } catch (error) {
    throw strandedIn(old, error);
  }
  return true;
}

/**
 * The new copy takes the place of the old one.
 *
 * The old one steps aside first and is deleted only once the new one
 * stands, so if the new one cannot be moved in, the old one is put back. A
 * copy an earlier run left aside goes back before anything is deleted
 * (`restoreCopy`), or a second failure would leave no copy at all.
 *
 * Throws when the new copy does not stand. `dest` is then as it was, with
 * one exception: the previous copy could not be put back either, and the
 * error says where it is in `stranded`. Returns null, or one sentence when
 * the new copy stands and the old one could not be deleted, which is not a
 * failed sync.
 */
export function replaceCopy(dest, fresh, { existsSync, renameSync, rmSync }) {
  const old = asideOf(dest);
  restoreCopy(dest, { existsSync, renameSync });
  rmSync(old, { recursive: true, force: true });
  const had = existsSync(dest);
  if (had) renameSync(dest, old);
  try {
    renameSync(fresh, dest);
  } catch (error) {
    if (had) {
      try {
        renameSync(old, dest);
      } catch {
        throw strandedIn(old, error);
      }
    }
    throw error;
  }
  try {
    rmSync(old, { recursive: true, force: true });
    return null;
  } catch (error) {
    return `${old}/ could not be removed (${error.message}); delete it by hand before committing`;
  }
}

/* ------------------------------------------------------ the gate */

const bareHost = (address) => new URL(address).hostname.replace(/^www\./, '');

/**
 * An address of this domain, or a relative one, that names a page by its
 * file. The domain is recognised however it is written: in any case, with
 * http, with its default port or with www, since each of those still lands
 * on this host and is redirected there.
 */
const namesHtmlFile = (address, hosting) => {
  let url;
  try {
    url = new URL(address.trim(), `${domainOf(hosting)}/`);
  } catch {
    return false;
  }
  return /^https?:$/.test(url.protocol) && bareHost(url.href) === bareHost(domainOf(hosting)) && /\.html$/i.test(url.pathname);
};

/**
 * Every address a nested sitemap names: each `<loc>`, under any prefix and
 * inside CDATA or not, and each `href`, which is where an alternate language
 * is given.
 */
const sitemapAddresses = (xml) => [
  ...[...xml.matchAll(/<(?:[\w-]+:)?loc\b[^>]*>\s*(?:<!\[CDATA\[\s*)?([^<\]\s]+)/gi)].map((m) => m[1]),
  ...[...xml.matchAll(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2]),
];

/**
 * What is wrong with one file of a copy as it stands in this repository, as
 * a list `validate` reports. It holds the copy to the decision in the data
 * and to what the sync promises, so a copy edited by hand, or synced before
 * a decision changed, fails here instead of in search results. A robots meta
 * and a canonical are read in the head only (`pageSignals`): one written
 * further down does not count.
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
    for (const address of sitemapAddresses(text)) {
      if (namesHtmlFile(address, hosting)) problems.push(`lists ${address}, an address the host redirects`);
    }
  }
  if (!isPage(rel)) return problems;

  const signals = pageSignals(text);
  const noindex = closesIndex(signals.robots);
  if (!wantsIndex(site, rel)) {
    if (!noindex) problems.push(`carries no noindex in its head, but data/hosting.json keeps it out of search ("index": ${JSON.stringify(site.index)})`);
  } else if (rel === ENTRY && !noindex) {
    // The entry address is what the showcase links and what a sitemap may
    // list, so the page has to name that address as its own, and no other.
    const own = siteUrl(site, hosting);
    if (!signals.canonicals.length) problems.push('is the entry page of a copy meant to be found, and has no canonical');
    for (const canonical of signals.canonicals) {
      if (canonical !== own) problems.push(`is the entry page of a copy meant to be found, and its canonical is ${canonical ? canonical : 'empty'}, not ${own}`);
    }
  }
  for (const [name, addresses] of [['canonical', signals.canonicals], ['hreflang', signals.alternates], ['og:url', signals.ogUrls]]) {
    for (const address of addresses) {
      if (namesHtmlFile(address, hosting)) problems.push(`its ${name} is ${address}, an address the host redirects`);
    }
  }
  for (const where of ratingMarkup(text)) problems.push(`carries rating markup (${where}): a rating on this domain must come from its own visitors`);
  return problems;
}
