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
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { keepFile, isText, rewriteUrls, siteUrl } from './lib/hosting.mjs';

const hosting = JSON.parse(readFileSync('data/hosting.json', 'utf8'));
const only = new Set(process.argv.slice(2));

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '.git') walk(p, root, out);
    } else out.push(relative(root, p).replaceAll('\\', '/'));
  }
  return out;
}

for (const site of hosting.sites) {
  if (only.size && !only.has(site.repo)) continue;
  const tmp = mkdtempSync(join(tmpdir(), 'site-'));
  try {
    execFileSync('gh', ['repo', 'clone', `${hosting.owner}/${site.repo}`, tmp, '--', '-q', '--depth', '1', '--branch', site.branch], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const src = join(tmp, site.dir || '');
    const dest = site.path;
    rmSync(dest, { recursive: true, force: true });
    let files = 0;
    for (const rel of walk(src)) {
      if (!keepFile(rel)) continue;
      const to = join(dest, rel);
      mkdirSync(dirname(to), { recursive: true });
      if (isText(rel)) writeFileSync(to, rewriteUrls(readFileSync(join(src, rel), 'utf8'), site, hosting));
      else cpSync(join(src, rel), to);
      files += 1;
    }
    console.log(`ok  ${site.repo} -> ${siteUrl(site, hosting)}  (${files} files)`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
