import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ids = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:8765/test/grid.html');
await page.waitForFunction(() => window.ready);
const res = await page.evaluate(async (ids) => {
  const { TEMPLATES } = await import('/js/templates/index.js');
  const R = await import('/js/engine/renderer.js');
  const { drawBackground } = await import('/js/engine/backgrounds.js');
  const { loadFonts } = await import('/js/engine/fonts.js');
  await loadFonts(['Figtree', 'IBM Plex Sans Arabic', 'JetBrains Mono']);
  const c = document.createElement('canvas'); c.width = 940; c.height = 1175;
  const ctx = c.getContext('2d', { willReadFrequently: false });
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  const out = [];
  for (const id of ids) {
    const t = TEMPLATES.find((x) => x.id === id);
    const env = R.createEnv({ theme: 'night', aspect: '4:5', scenes: [] }, 1080, 1350, 940 / 1080);
    R.renderScene(ctx, t.scene, 3, env); flush();
    const times = [0.1, 0.4, 0.8, 1.2, 2, 3, 4];
    ctx.setTransform(env.px, 0, 0, env.px, 0, 0);
    let worst = 0;
    for (const tm of times) { const a = performance.now(); drawBackground(ctx, t.scene.bg, tm, env, t.scene.duration); flush(); worst = Math.max(worst, performance.now() - a); }
    out.push([id, 'bg:' + t.scene.bg.type, worst.toFixed(1)]);
    for (const el of t.scene.elements) {
      let w = 0, at = 0;
      for (const tm of times) { const a = performance.now(); R.drawElement(ctx, el, tm, t.scene.duration, env, null); flush(); const d = performance.now() - a; if (d > w) { w = d; at = tm; } }
      out.push([id, el.type + ':' + ((el.anim||{}).in||'') + (el.glass ? '(glass)' : ''), w.toFixed(1) + 'ms @' + at]);
    }
  }
  return out;
}, ids);
for (const r of res) console.log(r.join('\t'));
await browser.close();
