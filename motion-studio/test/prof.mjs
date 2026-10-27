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
  const ctx = c.getContext('2d');
  const out = [];
  for (const id of ids) {
    const t = TEMPLATES.find((x) => x.id === id);
    const env = R.createEnv({ theme: 'night', aspect: '4:5', scenes: [] }, 1080, 1350, 940 / 1080);
    const time = t.scene.duration * 0.7;
    R.renderScene(ctx, t.scene, time, env); // warm
    ctx.setTransform(env.px, 0, 0, env.px, 0, 0);
    let a = performance.now();
    for (let k = 0; k < 5; k++) drawBackground(ctx, t.scene.bg, time, env, t.scene.duration);
    out.push([id, 'bg:' + t.scene.bg.type, ((performance.now() - a) / 5).toFixed(1)]);
    for (const el of t.scene.elements) {
      a = performance.now();
      for (let k = 0; k < 5; k++) R.drawElement(ctx, el, time, t.scene.duration, env, null);
      out.push([id, el.type + (el.glass ? '(glass)' : '') + (el.shadow ? '(shadow)' : ''), ((performance.now() - a) / 5).toFixed(1)]);
    }
  }
  return out;
}, ids);
for (const r of res) console.log(r.join('\t'));
await browser.close();
