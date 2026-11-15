#!/usr/bin/env node
/**
 * Copies every hosted site (data/hosting.json) from its repository into this
 * one, so it is served from Nour's own domain instead of GitHub Pages.
 *
 *   npm run sites                 # every site
 *   npm run sites -- aya-rady     # only the named repositories
 *
 * Uses the `gh` CLI, so private repositories work as long as `gh` is signed in.
 * The copies are generated: edit a site in its own repository, then run this.
 *
 * A copy is not a plain copy. Each text file goes through `transformFile` in
 * lib/hosting.mjs, which moves its old addresses to the domain, gives its
 * pages the clean addresses the host serves, takes rating markup out, and
 * writes the indexing decision of data/hosting.json ("index") into every
 * page. Working files, test pages and nested robots.txt files are left
 * behind (`keepFile`). `npm run validate` then holds every copy to the same
 * rules, so a copy that was synced before a decision changed fails there.
 *
 * A repository that cannot be cloned keeps the copy it has: it is tried
 * three times, the others are still synced, and the run ends with an error
 * that names it.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { keepFile, isText, transformFile, siteUrl, hostingProblems } from './lib/hosting.mjs';

const hosting = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
const only = new Set(process.argv.slice(2));
const ATTEMPTS = 3;

// A copy with no indexing decision would be synced as if it had one.
const undecided = hostingProblems(hosting);
if (undecided.length) {
  for (const problem of undecided) console.error(`sites: ${problem}`);
  process.exit(1);
}
const unknown = [...only].filter((name) => !hosting.sites.some((site) => site.repo === name));
if (unknown.length) {
  console.error(`sites: not in data/hosting.json: ${unknown.join(', ')}`);
  process.exit(1);
}

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '.git') walk(p, root, out);
    } else out.push(relative(root, p).replaceAll('\\', '/'));
  }
  return out;
}

/** A shallow clone of the deploy branch, or null when every attempt failed. */
function clone(site) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const tmp = mkdtempSync(join(tmpdir(), 'site-'));
    try {
      execFileSync('gh', ['repo', 'clone', `${hosting.owner}/${site.repo}`, tmp, '--', '-q', '--depth', '1', '--branch', site.branch], {
        stdio: ['ignore', 'ignore', 'inherit'],
      });
      return tmp;
    } catch {
      rmSync(tmp, { recursive: true, force: true });
      console.error(`retry  ${site.repo}: clone failed (attempt ${attempt} of ${ATTEMPTS})`);
    }
  }
  return null;
}

const failed = [];

for (const site of hosting.sites) {
  if (only.size && !only.has(site.repo)) continue;
  const tmp = clone(site);
  if (!tmp) {
    failed.push(site.repo);
    console.error(`FAIL  ${site.repo}: could not be cloned, ${site.path}/ is left as it was`);
    continue;
  }
  try {
    const src = join(tmp, site.dir || '');
    const dest = site.path;
    rmSync(dest, { recursive: true, force: true });
    let files = 0;
    for (const rel of walk(src)) {
      if (!keepFile(rel)) continue;
      const to = join(dest, rel);
      mkdirSync(dirname(to), { recursive: true });
      if (isText(rel)) writeFileSync(to, transformFile(readFileSync(join(src, rel), 'utf8'), rel, site, hosting));
      else cpSync(join(src, rel), to);
      files += 1;
    }
    console.log(`ok  ${site.repo} -> ${siteUrl(site, hosting)}  (${files} files, index: ${site.index})`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed.length) {
  console.error(`sites: not synced, and left as they were: ${failed.join(', ')}`);
  process.exit(1);
}
