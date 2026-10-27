// usage: node test/shot.mjs <project.json> <out-prefix> t1 t2 ...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'fs';
const [,, projFile, out, ...times] = process.argv;
const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:8765/test/engine.html');
await page.waitForFunction(() => window.ready);
await page.evaluate(async (p) => { await window.setup(p, 0.5); }, project);
for (const t of times) {
  await page.evaluate((t) => window.renderAt(+t), t);
  const el = await page.$('#c');
  await el.screenshot({ path: `${out}-${t}.png` });
}
const errs = await page.evaluate(() => window.errors);
if (errs.length) console.log('ERRORS:', [...new Set(errs)].slice(0, 20).join('\n'));
await browser.close();
