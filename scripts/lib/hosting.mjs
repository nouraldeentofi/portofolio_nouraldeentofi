/**
 * Pure helpers for `scripts/sync-sites.mjs`: which files of a site's deploy
 * branch are the site, and how its GitHub Pages addresses become addresses on
 * Nour's own domain. Data in, string or boolean out.
 */

/*
 * Working files that sit next to a site in its repository but are not part of
 * it. The folders only count at the top: a site may well have its own
 * `js/templates/`, and that one is the site.
 */
const SKIP_DIRS = new Set(['.git', '.github', 'source', 'tests', 'tools', 'templates', 'deploy', 'preview', 'node_modules']);
const SKIP_FILES = new Set(['package.json', 'package-lock.json', '.gitignore', '.gitattributes', '.nojekyll', 'CNAME']);
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

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every address a site had on GitHub Pages, under its repository name or an
 * alias, moved to its path on the domain:
 *   https://<owner>.github.io/<name>/x  ->  https://<domain>/<path>/x
 *   "/<name>/x" (root-relative)          ->  "/<path>/x"
 */
export function rewriteUrls(text, site, hosting) {
  const domain = hosting.domain.replace(/\/$/, '');
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
export const siteUrl = (site, hosting) => `${hosting.domain.replace(/\/$/, '')}/${site.path}/`;
