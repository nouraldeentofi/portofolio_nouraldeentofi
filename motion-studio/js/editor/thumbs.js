// Small helper: render any scene into a canvas in the project's theme and aspect.
import { renderScene, createEnv, ASPECTS, holdTime } from '../engine/renderer.js';
import { S } from './store.js';
import { images } from './stage.js';

const holdCache = new WeakMap();
export function sceneThumb(canvas, scene, time, project = S.project) {
  const [W, H] = ASPECTS[project.aspect] || ASPECTS['4:5'];
  const env = createEnv(project, W, H, canvas.width / W, { images });
  let t = time;
  if (t == null) {
    t = holdCache.get(scene);
    if (t == null) { t = holdTime(scene, env); holdCache.set(scene, t); }
  }
  try { renderScene(canvas.getContext('2d'), scene, t, env); } catch (e) { /* keep last frame */ }
}

export function thumbCanvas(width, project = S.project) {
  const [W, H] = ASPECTS[project.aspect] || ASPECTS['4:5'];
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((width * H) / W);
  return c;
}
