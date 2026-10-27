// times composite() for every transition preset at 940x1175 (software renderer)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:8765/test/grid.html');
await page.waitForFunction(() => window.ready);
const res = await page.evaluate(async () => {
  const T = await import('/js/engine/transitions.js');
  const R = await import('/js/engine/renderer.js');
  const W = 940, H = 1175;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const A = mk(), B = mk(), out = mk();
  const env = R.createEnv({ theme: 'night', aspect: '4:5', scenes: [] }, 1080, 1350, W / 1080);
  R.renderScene(A.getContext('2d'), { duration: 3, bg: { type: 'aurora' }, elements: [{ id: 'x', type: 'text', x: 0.5, y: 0.5, text: 'A', size: 300, anim: { in: 'none' } }] }, 1, env);
  R.renderScene(B.getContext('2d'), { duration: 3, bg: { type: 'floor' }, elements: [{ id: 'y', type: 'text', x: 0.5, y: 0.3, text: 'B', size: 300, anim: { in: 'none' } }] }, 1, env);
  const ctx = out.getContext('2d');
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  const rows = [];
  for (const [id] of T.TRANSITIONS) {
    T.composite(ctx, { type: id }, 0.5, A, B, env); flush(); // warm caches
    let worst = 0, sum = 0;
    for (const p of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const a = performance.now();
      T.composite(ctx, { type: id }, p, A, B, env); flush();
      const d = performance.now() - a; sum += d; worst = Math.max(worst, d);
    }
    rows.push([id, +(sum / 5).toFixed(1), +worst.toFixed(1)]);
  }
  return rows;
});
res.sort((a, b) => b[2] - a[2]);
console.log('slowest:'); res.slice(0, 25).forEach((r) => console.log(r.join('\t')));
console.log('median worst', res[Math.floor(res.length / 2)][2], 'count >12ms', res.filter((r) => r[2] > 12).length);
await browser.close();
