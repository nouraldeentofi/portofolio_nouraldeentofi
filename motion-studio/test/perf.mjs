import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:8765/test/grid.html');
await page.waitForFunction(() => window.ready);
const res = await page.evaluate(async () => {
  const { TEMPLATES } = await import('/js/templates/index.js');
  const { renderScene, createEnv } = await import('/js/engine/renderer.js');
  const { loadFonts } = await import('/js/engine/fonts.js');
  await loadFonts(['Figtree', 'IBM Plex Sans Arabic', 'JetBrains Mono']);
  const c = document.createElement('canvas'); c.width = 940; c.height = 1175;
  const ctx = c.getContext('2d');
  const out = [];
  for (const t of TEMPLATES) {
    const env = createEnv({ theme: 'night', aspect: '4:5', scenes: [] }, 1080, 1350, 940 / 1080);
    renderScene(ctx, t.scene, 0.01, env); ctx.getImageData(0,0,1,1);
    const N = 30; let worst = 0, wt = 0; const t0 = performance.now();
    for (let i = 0; i < N; i++) { const a = performance.now(); renderScene(ctx, t.scene, (i / N) * t.scene.duration, env); ctx.getImageData(0,0,1,1); const d = performance.now() - a; if (d > worst) { worst = d; wt = (i / N) * t.scene.duration; } }
    out.push([t.id, ((performance.now() - t0) / N).toFixed(1), worst.toFixed(1), "@" + wt.toFixed(2)]);
  }
  return out;
});
for (const r of res) console.log(r.join('\t'));
await browser.close();
