// Draw soft content (big gradients, blurry blobs) into a small canvas covering
// the frame + overscan, then scale it up. Visually identical for soft shapes, far cheaper.
import { makeCanvas } from './util.js';

const M = 0.22;
const cache = new Map();
export function soft(ctx, env, key, k, drawFn) {
  const X = -env.W * M, Y = -env.H * M, FW = env.W * (1 + 2 * M), FH = env.H * (1 + 2 * M);
  const s = Math.max(0.02, k * env.px);
  const cw = Math.max(8, Math.ceil(FW * s)), ch = Math.max(8, Math.ceil(FH * s));
  let c = cache.get(key);
  if (!c || c.width !== cw || c.height !== ch) {
    c = makeCanvas(cw, ch);
    cache.set(key, c);
  }
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, cw, ch);
  x.setTransform(s, 0, 0, s, -X * s, -Y * s);
  drawFn(x);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(c, 0, 0, cw, ch, X, Y, FW, FH);
  ctx.restore();
}
