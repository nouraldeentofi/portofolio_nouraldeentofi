// usage: node test/app.mjs <out.png> [width] [height] [actions...]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, out, w = '1440', hgt = '900', ...acts] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +hgt } });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,3).join('\n')));
await page.goto('http://localhost:8765/index.html');
await page.waitForTimeout(2500);
for (const a of acts) {
  const [kind, arg, arg2] = a.split('::');
  try {
    if (kind === 'click') await page.click(arg, { timeout: 3000 });
    else if (kind === 'wait') await page.waitForTimeout(+arg);
    else if (kind === 'eval') console.log('eval:', JSON.stringify(await page.evaluate(arg)));
    else if (kind === 'shot') await page.screenshot({ path: arg });
    else if (kind === 'dblclick') { const [x,y] = arg.split(',').map(Number); await page.mouse.dblclick(x,y); }
    else if (kind === 'mclick') { const [x,y] = arg.split(',').map(Number); await page.mouse.click(x,y); }
    else if (kind === 'drag') { const [x,y,x2,y2] = arg.split(',').map(Number); await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x2,y2,{steps:8}); await page.mouse.up(); }
    else if (kind === 'type') await page.keyboard.type(arg);
    else if (kind === 'key') await page.keyboard.press(arg);
  } catch (e) { logs.push('action ' + a + ' failed: ' + e.message.split('\n')[0]); }
}
await page.screenshot({ path: out });
console.log(logs.length ? logs.join('\n') : 'no console errors');
await browser.close();
