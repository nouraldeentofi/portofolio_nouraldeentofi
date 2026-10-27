// Keeps every font the project uses loaded, then refreshes text layout.
import { loadFonts } from '../engine/fonts.js';
import { clearTextCache } from '../engine/text.js';
import { resolveTheme } from '../engine/themes.js';
import { S, emit } from './store.js';
import { requestRender } from './stage.js';

export function projectFonts(project = S.project) {
  const th = resolveTheme(project);
  const names = new Set([...th.fonts.display, ...th.fonts.body, ...th.fonts.mono]);
  for (const sc of project.scenes) for (const e of sc.elements || []) if (e.font && e.font[0] !== '@') names.add(e.font);
  return [...names];
}

export async function ensureFonts(names) {
  await loadFonts(names.filter((n) => n && n[0] !== '@'));
  clearTextCache();
  requestRender();
  emit('thumbs');
}

export function syncProjectFonts() {
  return ensureFonts(projectFonts());
}
