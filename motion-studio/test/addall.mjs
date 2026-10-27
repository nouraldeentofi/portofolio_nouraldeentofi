import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, out] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push('console: ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
await page.goto('http://localhost:8765/index.html');
await page.waitForTimeout(2000);
await page.click('[data-tab=elements]');
const n = await page.$$eval('#tab-elements .add-btn', (b) => b.length);
console.log('add buttons:', n);
for (let i = 0; i < n; i++) {
  const label = await page.$eval(`#tab-elements .add-btn >> nth=${i}`, (b) => b.textContent).catch(() => '?');
  if (/صورة/.test(label)) continue; // needs file picker
  await page.locator('#tab-elements .add-btn').nth(i).click();
  await page.waitForTimeout(60);
  const insp = await page.$eval('#inspector', (e) => e.querySelectorAll('.field, .toggle').length);
  if (insp < 3) logs.push('inspector thin for ' + label + ': ' + insp);
}
// icons too
const ni = await page.$$eval('#tab-elements .icon-pick button', (b) => b.length);
console.log('icons:', ni);
await page.locator('#tab-elements .icon-pick button').nth(5).click();
await page.waitForTimeout(500);
const count = await page.evaluate(async () => { const { scene } = await import('/js/editor/store.js'); return scene().elements.length; });
console.log('elements in scene:', count);
// undo/redo
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await page.waitForTimeout(100);
const after = await page.evaluate(async () => { const { scene } = await import('/js/editor/store.js'); return scene().elements.length; });
console.log('after undo:', after);
// scene inspector + remix
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.screenshot({ path: out });
console.log(logs.length ? logs.join('\n') : 'no errors');
await browser.close();
