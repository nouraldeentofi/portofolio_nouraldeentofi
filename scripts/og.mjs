#!/usr/bin/env node
/**
 * Photograph the share card: scripts/og/og.html -> the image named as
 * `ogImage` in data/profile.json (assets/img/og.png).
 *
 *   npm run og
 *
 * The card is one hand-written HTML page, 1200 by 630, in the site's own
 * colours (assets/css/tokens.css) and fonts. Its words are placeholders that
 * lib/og.mjs fills from data/profile.json, and headless Chrome takes the
 * picture. So change the HTML or the data and run this again; never edit the
 * PNG itself, which is how the old card came to carry a title he had dropped.
 *
 * Needs Chrome or Edge (or CHROME_PATH), and a connection for the web fonts.
 * Run `npm run check` afterwards: the build measures the new file.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDb } from './lib/load.mjs';
import { imageSize } from './lib/image-size.mjs';
import { renderOgCard } from './lib/og.mjs';

/** The size every platform that unfolds a link expects a card in. */
const SIZE = [1200, 630];

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
  console.error('og: no Chrome or Edge found. Set CHROME_PATH to the browser executable.');
  process.exit(1);
}

const db = loadDb('data');
const source = resolve('scripts/og/og.html');
const out = resolve(db.profile.ogImage);
// A throwaway folder: the browser profile, so a Chrome that is already open
// cannot swallow the job, and the filled copy of the card beside it.
const work = mkdtempSync(join(tmpdir(), 'og-card-'));
const filled = join(work, 'card.html');

try {
  // The card names its stylesheet and the portrait relative to its own
  // folder, so the filled copy is told where that folder is.
  writeFileSync(filled, renderOgCard(readFileSync(source, 'utf8'), db, pathToFileURL(resolve('scripts/og') + '/').href), 'utf8');
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      `--user-data-dir=${join(work, 'profile')}`,
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      '--virtual-time-budget=15000',
      `--window-size=${SIZE.join(',')}`,
      `--screenshot=${out}`,
      pathToFileURL(filled).href,
    ],
    { stdio: 'ignore' },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}

const size = imageSize(readFileSync(out));
if (size?.[0] !== SIZE[0] || size?.[1] !== SIZE[1]) {
  console.error(`og: ${out} came out ${size ? size.join(' x ') : 'unreadable'}, expected ${SIZE.join(' x ')}`);
  process.exit(1);
}

console.log(`og: wrote ${out} (${SIZE.join(' x ')}, ${Math.round(statSync(out).size / 1024)} KB)`);
