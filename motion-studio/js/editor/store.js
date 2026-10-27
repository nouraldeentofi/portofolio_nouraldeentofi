// App state, change events, undo history and autosave.
import { deepClone, uid, hashStr } from '../engine/util.js';

const listeners = {};
export const S = {
  project: null,
  sceneIdx: 0,
  selId: null,
  time: 0,
  playing: false,
  loopScene: false,
  sound: true,
};

export function on(kind, fn) { (listeners[kind] = listeners[kind] || []).push(fn); }
export function emit(...kinds) {
  for (const k of kinds) (listeners[k] || []).forEach((fn) => fn());
  if (kinds.includes('structure') || kinds.includes('theme') || kinds.includes('edit')) scheduleSave();
}

export const scene = () => S.project.scenes[S.sceneIdx] || S.project.scenes[0];
export const selected = () => (S.selId && scene() ? (scene().elements || []).find((e) => e.id === S.selId) || null : null);

export function sceneStart(i) {
  let t = 0;
  for (let k = 0; k < i; k++) t += S.project.scenes[k].duration;
  return t;
}
export const totalDur = () => S.project.scenes.reduce((a, s) => a + s.duration, 0);

// ---------------------------------------------------------------- history
// Large strings (uploaded images / audio as data URLs) are stored once and referenced from snapshots.
const big = new Map();
const MARK = '\u0000big:';
const pack = (p) => JSON.stringify(p, (k, v) => {
  if (typeof v === 'string' && v.length > 40000) {
    const key = MARK + hashStr(v).toString(36) + ':' + v.length;
    if (!big.has(key)) big.set(key, v);
    return key;
  }
  return v;
});
const unpack = (s) => JSON.parse(s, (k, v) => (typeof v === 'string' && v.startsWith(MARK) ? big.get(v) || '' : v));

const past = [];
const future = [];
let lastSnap = null;
export function resetHistory() {
  past.length = 0;
  future.length = 0;
  lastSnap = pack(S.project);
  emit('history');
}
export function commit() {
  const snap = pack(S.project);
  if (snap === lastSnap) return;
  if (lastSnap) past.push(lastSnap);
  if (past.length > 80) past.shift();
  future.length = 0;
  lastSnap = snap;
  scheduleSave();
  emit('history');
}
function restore(snap) {
  S.project = unpack(snap);
  lastSnap = snap;
  if (S.sceneIdx >= S.project.scenes.length) S.sceneIdx = Math.max(0, S.project.scenes.length - 1);
  if (S.selId && !selected()) S.selId = null;
  emit('structure', 'theme', 'select', 'render', 'history', 'sound');
}
export function undo() {
  if (!past.length) return;
  future.push(lastSnap);
  restore(past.pop());
}
export function redo() {
  if (!future.length) return;
  past.push(lastSnap);
  restore(future.pop());
}
export const canUndo = () => past.length > 0;
export const canRedo = () => future.length > 0;

// ---------------------------------------------------------------- autosave (IndexedDB, localStorage fallback)
const KEY = 'nour-motion-studio:v1';
let saveTimer = null;
function idb() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('nour-motion-studio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
async function idbSet(key, val) {
  const db = await idb();
  if (!db) throw new Error('no idb');
  await new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const tx = db.transaction('kv', 'readonly');
      const q = tx.objectStore('kv').get(key);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const data = { project: S.project, sceneIdx: S.sceneIdx, at: Date.now() };
    try { await idbSet(KEY, JSON.parse(JSON.stringify(data))); }
    catch (e) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e2) { /* storage full or blocked */ }
    }
  }, 700);
}
export async function loadSaved() {
  const ok = (d) => d && d.project && Array.isArray(d.project.scenes) && d.project.scenes.length;
  const fromIdb = await idbGet(KEY);
  if (ok(fromIdb)) return fromIdb;
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw && JSON.parse(raw);
    if (ok(d)) return d;
  } catch (e) { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------- model helpers
export function freshIds(sceneObj) {
  const s = deepClone(sceneObj);
  s.id = uid('s');
  s.elements = (s.elements || []).map((e) => ({ ...e, id: uid('e') }));
  return s;
}
export function newProject() {
  return { version: 1, aspect: '4:5', theme: 'night', themeOverrides: {}, fps: 30, scenes: [], sound: { on: true, volume: 0.7 } };
}
