// usage: node test/export.mjs <out.mp4> [scale] [fps]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'fs';
const [,, out, scale = '0.5', fps = '30'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
await page.goto('http://localhost:8765/index.html');
await page.waitForTimeout(2500);
const t0 = Date.now();
const res = await page.evaluate(async ([scale, fps]) => {
  const { S } = await import('/js/editor/store.js');
  const { images } = await import('/js/editor/stage.js');
  const { exportVideo } = await import('/js/export.js');
  const r = await exportVideo(JSON.parse(JSON.stringify(S.project)), { scale: +scale, fps: +fps, sound: true, images });
  const buf = new Uint8Array(await r.blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { b64: btoa(bin), codec: r.codec, audio: r.audio, w: r.width, h: r.height, ext: r.ext };
}, [scale, fps]);
fs.writeFileSync(out, Buffer.from(res.b64, 'base64'));
console.log('codec', res.codec, 'audio', res.audio, res.w + 'x' + res.h, res.ext, 'took', ((Date.now() - t0) / 1000).toFixed(1) + 's');
await browser.close();
