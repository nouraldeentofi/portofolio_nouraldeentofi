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
 * A copy is replaced only once its successor is whole. The new copy is
 * written into a folder beside the old one (`<path>.sync`) and takes its
 * place at the end, so a wrong "dir", a file that cannot be read or any
 * other failure on the way leaves the copy as it was. A repository that
 * cannot be cloned is tried three times. Whatever fails, the other sites
 * are still synced, and the run ends with an error that names each one
 * that was not.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { keepFile, isText, transformFile, siteUrl, hostingProblems, ENTRY } from './lib/hosting.mjs';

const hosting = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
const only = new Set(process.argv.slice(2));
const ATTEMPTS = 3;

// A copy with no indexing decision would be synced as if it had one, and a
// path that is not a copy's own folder would be deleted as if it were.
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

/**
 * The site as it will be served, written into `fresh` from the clone in
 * `tmp`. Nothing of the copy in the repository is touched here. Returns the
 * number of files written.
 */
function writeCopy(site, tmp, fresh) {
  const src = join(tmp, site.dir || '');
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    throw new Error(`the repository has no folder "${site.dir}" on ${site.branch}: check "dir" in data/hosting.json`);
  }
  const files = walk(src).filter(keepFile);
  if (!files.includes(ENTRY)) throw new Error(`no ${ENTRY} in ${site.dir ? `"${site.dir}"` : 'the root'} of the repository on ${site.branch}`);
  for (const rel of files) {
    const to = join(fresh, rel);
    mkdirSync(dirname(to), { recursive: true });
    if (isText(rel)) writeFileSync(to, transformFile(readFileSync(join(src, rel), 'utf8'), rel, site, hosting));
    else cpSync(join(src, rel), to);
  }
  return files.length;
}

/**
 * The new copy takes the place of the old one. The old one steps aside
 * first and is only deleted once the new one stands, so if the new one
 * cannot be moved in, the old one is put back.
 */
function replaceCopy(dest, fresh) {
  const old = `${dest}.old`;
  rmSync(old, { recursive: true, force: true });
  const had = existsSync(dest);
  if (had) renameSync(dest, old);
  try {
    renameSync(fresh, dest);
  } catch (error) {
    if (had) renameSync(old, dest);
    throw error;
  }
  // The new copy stands. An old one that cannot be removed is not a failed sync.
  try {
    rmSync(old, { recursive: true, force: true });
  } catch (error) {
    console.error(`sites: ${old}/ could not be removed (${error.message}); delete it by hand before committing`);
  }
}

const failed = [];

for (const site of hosting.sites) {
  if (only.size && !only.has(site.repo)) continue;
  const dest = site.path;
  const fresh = `${dest}.sync`;
  let tmp = null;
  try {
    tmp = clone(site);
    if (!tmp) throw new Error('could not be cloned');
    rmSync(fresh, { recursive: true, force: true });
    const files = writeCopy(site, tmp, fresh);
    replaceCopy(dest, fresh);
    console.log(`ok  ${site.repo} -> ${siteUrl(site, hosting)}  (${files} files, index: ${site.index})`);
  } catch (error) {
    failed.push(site.repo);
    console.error(`FAIL  ${site.repo}: ${error.message}; ${dest}/ is left as it was`);
  } finally {
    // Neither may stay behind: the first is half a copy, the second a whole clone.
    try {
      rmSync(fresh, { recursive: true, force: true });
      if (tmp) rmSync(tmp, { recursive: true, force: true });
    } catch (error) {
      console.error(`sites: could not clean up after ${site.repo}: ${error.message}`);
    }
  }
}

if (failed.length) {
  console.error(`sites: not synced, and left as they were: ${failed.join(', ')}`);
  process.exit(1);
}
