#!/usr/bin/env node
/**
 * Tell search engines that pages changed, through IndexNow.
 *
 *   npm run indexnow            # every address in sitemap.xml
 *   npm run indexnow -- /work   # only the named paths
 *
 * One request reaches Bing, Yandex, Naver and Seznam; there is no account.
 * Run it after a push has deployed: the engines fetch `<key>.txt` from the
 * live site to check the key, so it does nothing for a site not yet live.
 */
import { readFileSync } from 'node:fs';
import { loadDb } from './lib/load.mjs';

const { profile } = loadDb('data');
const site = profile.site.replace(/\/$/, '');
const key = profile.indexNow?.key;
if (!key) {
  console.error('indexnow: no key in data/profile.json (indexNow.key)');
  process.exit(1);
}

const only = process.argv.slice(2);
const urlList = only.length
  ? only.map((path) => `${site}${path.startsWith('/') ? path : `/${path}`}`)
  : [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const live = await fetch(`${site}/${key}.txt`).then((r) => (r.ok ? r.text() : ''), () => '');
if (live.trim() !== key) {
  console.error(`indexnow: ${site}/${key}.txt is not live yet. Push, wait for the deploy, then run this again.`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList }),
});

// 200 and 202 both mean accepted; 202 is "received, key check pending".
if (res.status === 200 || res.status === 202) {
  console.log(`indexnow: submitted ${urlList.length} address(es), HTTP ${res.status}`);
} else {
  console.error(`indexnow: refused, HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
