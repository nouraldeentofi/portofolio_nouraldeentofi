/**
 * The day each page last changed, for the sitemap's `<lastmod>`.
 *
 * Google uses `lastmod` only while it is "consistently and verifiably
 * accurate". A sitemap that stamps every address with the day of the build
 * says that every page changed every time anything was rebuilt, so the
 * whole column is ignored. A date here moves only when what the page says
 * has moved.
 *
 * How: each page is reduced to the part a reader or a search engine would
 * call its content, and that is hashed. The hashes are kept, with the day
 * each one was first seen, in a committed file (`LASTMOD_FILE`). The next
 * build compares: the same hash keeps its day, a new hash gets today.
 *
 * Pure: pages and the previous state in, the new state out. The build reads
 * and writes the file, and hands in the day.
 */

import { createHash } from 'node:crypto';

/**
 * Where the state is kept between builds. Under `scripts/`, which the host
 * closes (`PRIVATE_PATHS` in gates.mjs): it is bookkeeping for the build,
 * not part of the site and not a fact about him, so it is not in `data/`.
 */
export const LASTMOD_FILE = 'scripts/lastmod.json';

/**
 * A hash of what a page says: its title, its description, everything inside
 * `<main>` and its structured data.
 *
 * Left out, because a change there is not a change to the page: the
 * navigation and the footer, which are the same on every page; the
 * stylesheets and scripts in the head; and the `?v=` fingerprints, which
 * move when a stylesheet or the CV is replaced. Nothing that is hashed
 * carries the day of the build, so building again changes no hash.
 */
export function pageFingerprint(html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';
  const main = html.match(/<main[\s>][\s\S]*<\/main>/)?.[0] ?? '';
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const content = [title, description, main, ...ld].join('\n').replace(/\?v=[0-9a-f]{8}/g, '');
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * The new state: for every page, its hash and the day that hash was first
 * seen.
 *
 * `pages` is `[{ address, html }]`, the address being the clean one the
 * sitemap lists (`/en/about`). `previous` is the state the last build left,
 * and `today` the day of this build as `YYYY-MM-DD`. A page whose hash is in
 * `previous` keeps its day; a new or changed page gets `today`; a page that
 * is gone is dropped. Without a day to give, a changed page carries none,
 * which the sitemap then leaves out: better than a date nobody gave.
 */
export function stampPages(pages, previous = {}, today = null) {
  const state = {};
  for (const { address, html } of pages) {
    const hash = pageFingerprint(html);
    const before = previous?.[address];
    const date = (before?.hash === hash && before.date) || today;
    state[address] = { hash, ...(date ? { date } : {}) };
  }
  return state;
}

/** The days alone, by address: what `buildSitemap` takes. */
export const pageDates = (state) =>
  Object.fromEntries(Object.entries(state).filter(([, s]) => s.date).map(([address, s]) => [address, s.date]));

/** The day the newest page changed, or null when no page has a day. */
export const latestChange = (state) => Object.values(pageDates(state)).sort().at(-1) ?? null;

/** The state as the file holds it: one page per line, in a stable order, so a diff shows which page moved. */
export function serializeState(state) {
  const lines = Object.keys(state)
    .sort()
    .map((address) => `  ${JSON.stringify(address)}: ${JSON.stringify(state[address])}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}
