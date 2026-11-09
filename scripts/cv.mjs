#!/usr/bin/env node
/**
 * Print the CV: scripts/cv/cv.html -> the PDF named in data/profile.json.
 *
 *   npm run cv
 *
 * The CV is one hand-written HTML file, printed by headless Chrome. Text in
 * the PDF is stored in the HTML's order, which is the order an applicant
 * tracking system reads it in. So change the HTML and print again; never
 * edit the PDF itself, which leaves the new text out of place for parsers.
 *
 * Needs Chrome or Edge (or CHROME_PATH), and a connection for the web font.
 * Run `npm run check` afterwards: the build fingerprints the new file.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDb } from './lib/load.mjs';

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((path) => path && existsSync(path));

if (!chrome) {
  console.error('cv: no Chrome or Edge found. Set CHROME_PATH to the browser executable.');
  process.exit(1);
}

const source = resolve('scripts/cv/cv.html');
const out = resolve(loadDb('data').profile.cv[0].file);
// A throwaway profile, so a Chrome that is already open cannot swallow the job.
const profile = mkdtempSync(join(tmpdir(), 'cv-print-'));

try {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      `--user-data-dir=${profile}`,
      '--no-pdf-header-footer',
      '--virtual-time-budget=15000',
      `--print-to-pdf=${out}`,
      pathToFileURL(source).href,
    ],
    { stdio: 'ignore' },
  );
} finally {
  rmSync(profile, { recursive: true, force: true });
}

console.log(`cv: wrote ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
