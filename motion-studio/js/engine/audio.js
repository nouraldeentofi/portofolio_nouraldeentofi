// Synthesized sound effects (Web Audio only, no music) + an optional uploaded audio track.
// One event list drives the live preview and the export, so what you hear is what you get.
//
// Data model
//   project.sound = { on, volume, pack, cats: { transition, entrance, typing, counter, ui, custom, track }, track: { src, name, volume, offset, fadeIn, fadeOut, loop } | null }
//   scene.sfx     = { transition: 'auto' | 'none' | soundId, transitionVol, events: [{ id, t, kind, vol, pitch }] }
//   element       = { sfx: 'auto' | 'none' | soundId, sfxVol, sfxDelay, sfxPitch }
import { timeline } from './renderer.js';
import { sr, clamp } from './util.js';

// ---------------------------------------------------------------- catalogue
export const SOUND_CATS = [
  ['whoosh', 'هوا وانتقالات'], ['pop', 'فقاعات وظهور'], ['click', 'كليك وواجهات'], ['type', 'كتابة'], ['tick', 'تكتكة وعدّاد'],
  ['chime', 'رنين وإشعارات'], ['impact', 'ضربات'], ['perc', 'إيقاع منفرد'], ['digital', 'رقمي'], ['magic', 'سحري'], ['misc', 'متنوع'],
];

export const SOUNDS = [
  // whoosh
  { id: 'whoosh', name: 'هوا', cat: 'whoosh' }, { id: 'whoosh-soft', name: 'هوا ناعم', cat: 'whoosh' }, { id: 'whoosh-short', name: 'هوا قصير', cat: 'whoosh' },
  { id: 'whoosh-long', name: 'هوا طويل', cat: 'whoosh' }, { id: 'whoosh-up', name: 'هوا صاعد', cat: 'whoosh' }, { id: 'whoosh-down', name: 'هوا نازل', cat: 'whoosh' },
  { id: 'whoosh-reverse', name: 'هوا معكوس', cat: 'whoosh' }, { id: 'whoosh-air', name: 'نسمة', cat: 'whoosh' }, { id: 'whoosh-deep', name: 'هوا عميق', cat: 'whoosh' },
  { id: 'swish', name: 'سويش', cat: 'whoosh' }, { id: 'swish-fast', name: 'سويش سريع', cat: 'whoosh' }, { id: 'swoosh-in', name: 'سووش دخول', cat: 'whoosh' },
  { id: 'swoosh-out', name: 'سووش خروج', cat: 'whoosh' },
  // pop
  { id: 'pop', name: 'فقاعة', cat: 'pop' }, { id: 'pop-soft', name: 'فقاعة ناعمة', cat: 'pop' }, { id: 'pop-high', name: 'فقاعة حادة', cat: 'pop' },
  { id: 'pop-low', name: 'فقاعة عميقة', cat: 'pop' }, { id: 'bubble', name: 'بقبقة', cat: 'pop' }, { id: 'bubble-double', name: 'بقبقة مزدوجة', cat: 'pop' },
  { id: 'plop', name: 'نقطة مي', cat: 'pop' }, { id: 'boop', name: 'بوب', cat: 'pop' },
  // click
  { id: 'click', name: 'كليك', cat: 'click' }, { id: 'click-soft', name: 'كليك ناعم', cat: 'click' }, { id: 'click-mouse', name: 'كليك ماوس', cat: 'click' },
  { id: 'click-ui', name: 'كليك واجهة', cat: 'click' }, { id: 'toggle', name: 'مفتاح تشغيل', cat: 'click' }, { id: 'tap', name: 'نقرة خشب', cat: 'click' },
  { id: 'switch', name: 'سويتش', cat: 'click' },
  // type
  { id: 'type', name: 'كيبورد', cat: 'type' }, { id: 'type-soft', name: 'كيبورد ناعم', cat: 'type' }, { id: 'typewriter', name: 'آلة كاتبة', cat: 'type' },
  { id: 'keyboard-mech', name: 'كيبورد ميكانيكي', cat: 'type' },
  // tick
  { id: 'tick', name: 'تك', cat: 'tick' }, { id: 'tick-soft', name: 'تك ناعم', cat: 'tick' }, { id: 'tick-wood', name: 'تك خشب', cat: 'tick' },
  { id: 'tick-clock', name: 'تكة ساعة', cat: 'tick' }, { id: 'count-blip', name: 'بليب عدّاد', cat: 'tick' },
  // chime
  { id: 'chime', name: 'رنة', cat: 'chime' }, { id: 'bell', name: 'جرس', cat: 'chime' }, { id: 'ding', name: 'دينغ', cat: 'chime' },
  { id: 'ding-double', name: 'دينغ مزدوج', cat: 'chime' }, { id: 'success', name: 'نجاح', cat: 'chime' }, { id: 'notify', name: 'إشعار', cat: 'chime' },
  { id: 'notify-soft', name: 'إشعار ناعم', cat: 'chime' }, { id: 'cash', name: 'كاش', cat: 'chime' }, { id: 'sparkle-chime', name: 'رنين لامع', cat: 'chime' },
  { id: 'message-in', name: 'رسالة واصلة', cat: 'chime' }, { id: 'message-out', name: 'رسالة مبعوتة', cat: 'chime' },
  // impact
  { id: 'thud', name: 'ضربة مكتومة', cat: 'impact' }, { id: 'boom', name: 'بوم', cat: 'impact' }, { id: 'sub-drop', name: 'هبوط عميق', cat: 'impact' },
  { id: 'impact-soft', name: 'ضربة ناعمة', cat: 'impact' }, { id: 'impact-hard', name: 'ضربة قوية', cat: 'impact' }, { id: 'slam', name: 'صفقة', cat: 'impact' },
  { id: 'punch-hit', name: 'لكمة', cat: 'impact' }, { id: 'deep-hit', name: 'ضربة سينمائية', cat: 'impact' },
  // perc (single hits)
  { id: 'kick', name: 'كيك', cat: 'perc' }, { id: 'snare', name: 'سنير', cat: 'perc' }, { id: 'clap', name: 'تصفيق', cat: 'perc' },
  { id: 'hat', name: 'هاي هات', cat: 'perc' }, { id: 'rim', name: 'ريم', cat: 'perc' }, { id: 'tom', name: 'توم', cat: 'perc' },
  // digital
  { id: 'glitch', name: 'قلتش', cat: 'digital' }, { id: 'glitch-short', name: 'قلتش قصير', cat: 'digital' }, { id: 'laser', name: 'ليزر', cat: 'digital' },
  { id: 'zap', name: 'زاب', cat: 'digital' }, { id: 'beep', name: 'بيب', cat: 'digital' }, { id: 'blip', name: 'بليب', cat: 'digital' },
  { id: 'data', name: 'بيانات', cat: 'digital' }, { id: 'error', name: 'خطأ', cat: 'digital' }, { id: 'scan', name: 'مسح', cat: 'digital' },
  { id: 'power-up', name: 'تشغيل', cat: 'digital' }, { id: 'power-down', name: 'إطفاء', cat: 'digital' },
  // magic
  { id: 'sparkle', name: 'لمعة', cat: 'magic' }, { id: 'magic', name: 'سحر', cat: 'magic' }, { id: 'twinkle', name: 'بريق', cat: 'magic' },
  { id: 'riser', name: 'تصاعد', cat: 'magic' }, { id: 'riser-short', name: 'تصاعد قصير', cat: 'magic' }, { id: 'reveal', name: 'كشف', cat: 'magic' },
  // misc
  { id: 'heartbeat', name: 'نبضة قلب', cat: 'misc' }, { id: 'camera', name: 'كاميرا', cat: 'misc' }, { id: 'paper', name: 'ورق', cat: 'misc' },
  { id: 'page-flip', name: 'قلب صفحة', cat: 'misc' }, { id: 'swipe', name: 'سحبة جوال', cat: 'misc' }, { id: 'pencil', name: 'قلم', cat: 'misc' },
  { id: 'stamp', name: 'ختم', cat: 'misc' },
];
export const SOUND_BY_ID = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));

// Packs decide which sound each kind of moment gets when an element is on 'auto'.
export const SOUND_PACKS = [
  { id: 'soft', name: 'ناعم', map: { transition: 'whoosh', entrance: 'pop-soft', entranceBig: 'whoosh-soft', typing: 'type-soft', counterTick: 'tick-soft', counterEnd: 'chime', ui: 'click-soft', draw: 'swish', chat: 'bubble', node: 'click-soft', notify: 'notify-soft' } },
  { id: 'tech', name: 'تقني', map: { transition: 'scan', entrance: 'blip', entranceBig: 'zap', typing: 'keyboard-mech', counterTick: 'tick', counterEnd: 'power-up', ui: 'click-ui', draw: 'scan', chat: 'message-in', node: 'beep', notify: 'notify' } },
  { id: 'cinematic', name: 'سينمائي', map: { transition: 'whoosh-deep', entrance: 'whoosh-soft', entranceBig: 'deep-hit', typing: 'typewriter', counterTick: 'tick-clock', counterEnd: 'impact-soft', ui: 'click-soft', draw: 'swish', chat: 'pop-soft', node: 'tap', notify: 'bell' } },
  { id: 'playful', name: 'مرح', map: { transition: 'swish-fast', entrance: 'bubble', entranceBig: 'boop', typing: 'type', counterTick: 'count-blip', counterEnd: 'success', ui: 'toggle', draw: 'swish', chat: 'plop', node: 'bubble-double', notify: 'ding-double' } },
  { id: 'minimal', name: 'بسيط', map: { transition: 'whoosh-soft', entrance: 'none', entranceBig: 'whoosh-air', typing: 'type-soft', counterTick: 'none', counterEnd: 'ding', ui: 'click-soft', draw: 'none', chat: 'pop-soft', node: 'click-soft', notify: 'notify-soft' } },
  { id: 'retro', name: 'ريترو', map: { transition: 'laser', entrance: 'blip', entranceBig: 'power-up', typing: 'typewriter', counterTick: 'beep', counterEnd: 'cash', ui: 'switch', draw: 'zap', chat: 'boop', node: 'blip', notify: 'beep' } },
  { id: 'punchy', name: 'قوي', map: { transition: 'whoosh', entrance: 'punch-hit', entranceBig: 'impact-hard', typing: 'keyboard-mech', counterTick: 'tick-wood', counterEnd: 'boom', ui: 'click', draw: 'swish-fast', chat: 'pop', node: 'rim', notify: 'ding' } },
  { id: 'magic', name: 'سحري', map: { transition: 'magic', entrance: 'twinkle', entranceBig: 'reveal', typing: 'type-soft', counterTick: 'tick-soft', counterEnd: 'sparkle-chime', ui: 'click-soft', draw: 'sparkle', chat: 'bubble', node: 'twinkle', notify: 'chime' } },
];
const PACK_BY_ID = Object.fromEntries(SOUND_PACKS.map((p) => [p.id, p]));
const CAT_KEYS = ['transition', 'entrance', 'typing', 'counter', 'ui', 'custom', 'track'];
export const SOUND_EVENT_CATS = [
  ['transition', 'الانتقالات'], ['entrance', 'ظهور العناصر'], ['typing', 'الكتابة'], ['counter', 'العدادات'], ['ui', 'واجهات ومحادثات'], ['custom', 'أصواتك المضافة'], ['track', 'ملف الصوت المرفوع'],
];

const HEAVY_IN = new Set(['slam', 'zoomIn', 'pushIn', 'zoomRot', 'track']);
const catMul = (snd, k) => clamp((snd.cats && snd.cats[k] != null ? snd.cats[k] : 1), 0, 2);

// ---------------------------------------------------------------- event list
// → sorted [{ t, kind, gain, pitch, src: { scene, el, auto, cat, id? } }]
export function sfxEvents(project) {
  const snd = project.sound || {};
  const pack = PACK_BY_ID[snd.pack] || SOUND_PACKS[0];
  const M = pack.map;
  const ev = [];
  const tl = timeline(project);
  tl.items.forEach((it, si) => {
    const sc = it.scene, S0 = it.start;
    const sx = sc.sfx || {};
    // transition into this scene
    const tr = sc.transition;
    if (si > 0 && tr && tr.type && tr.type !== 'cut') {
      const ov = sx.transition && sx.transition !== 'auto' ? sx.transition : null;
      const kind = ov || (/glitch/i.test(tr.type) ? 'glitch' : M.transition);
      if (kind && kind !== 'none') ev.push({ t: S0, kind, gain: 0.9 * clamp(sx.transitionVol ?? 1, 0, 2) * catMul(snd, 'transition'), pitch: 1, src: { scene: si, el: null, auto: !ov, cat: 'transition' } });
    } else if (si > 0 && sx.transition && sx.transition !== 'auto' && sx.transition !== 'none') {
      // an explicit transition sound still plays on a hard cut
      ev.push({ t: S0, kind: sx.transition, gain: 0.9 * clamp(sx.transitionVol ?? 1, 0, 2) * catMul(snd, 'transition'), pitch: 1, src: { scene: si, el: null, auto: false, cat: 'transition' } });
    }
    let budget = 9;
    for (const el of sc.elements || []) {
      if (el.hidden) continue;
      const a = el.anim || {};
      const t0 = S0 + (a.start ?? 0) + (el.sfxDelay ?? 0);
      if (t0 >= it.end || t0 < 0) continue;
      const vol = clamp(el.sfxVol ?? 1, 0, 2);
      const pitch = clamp(el.sfxPitch ?? 1, 0.5, 2);
      const mode = el.sfx || 'auto';
      if (mode === 'none') continue;
      const src = (cat, auto) => ({ scene: si, el: el.id || null, auto, cat });
      const push = (t, kind, g, cat, auto = true) => {
        if (!kind || kind === 'none' || t >= it.end) return;
        ev.push({ t, kind, gain: g * vol * catMul(snd, cat), pitch, src: src(cat, auto) });
      };
      const series = (kind, from, dur, step, g, cat) => {
        if (!kind || kind === 'none') return;
        for (let t = from; t < Math.min(from + dur, it.end); t += step) push(t, kind, g * (0.75 + sr(t * 91.7) * 0.5), cat);
      };
      const catOf = () => {
        if (el.type === 'counter') return 'counter';
        if (el.type === 'code' || (el.type === 'text' && (a.in === 'typewriter' || a.in === 'scramble'))) return 'typing';
        if (['chat', 'flow', 'notify', 'timeline'].includes(el.type)) return 'ui';
        return 'entrance';
      };
      if (mode !== 'auto') { push(t0, mode, 0.8, catOf(), false); continue; }
      switch (el.type) {
        case 'text': {
          if (a.in === 'typewriter') { series(M.typing, t0, a.dur ?? 0.7, 0.07, 0.8, 'typing'); break; }
          if (a.in === 'scramble') { series(M.counterTick === 'none' ? 'tick-soft' : M.counterTick, t0, a.dur ?? 0.7, 0.06, 0.6, 'typing'); break; }
          if (!a.in || a.in === 'none' || a.in === 'fade') break;
          if (budget-- <= 0) break;
          push(t0, HEAVY_IN.has(a.in) || (el.size ?? 80) >= 70 ? M.entranceBig : M.entrance, 0.8, 'entrance');
          break;
        }
        case 'counter': {
          const cd = el.countDur ?? 1.8;
          series(M.counterTick, t0 + 0.1, cd * 0.8, 0.07, 0.55, 'counter');
          push(t0 + 0.1 + cd * 0.85, M.counterEnd, 0.7, 'counter');
          break;
        }
        case 'code': {
          const chars = (el.lines || []).join('').length;
          series(M.typing, t0 + (a.dur ?? 0.5) * 0.6, Math.min(8, chars / (el.cps ?? 40)), 0.065, 0.7, 'typing');
          break;
        }
        case 'chat': {
          let tt = t0;
          (el.messages || []).forEach((m, k) => {
            if (k > 0 && !m.me) tt += 0.75;
            push(tt, m.me ? M.chat : M.notify === 'none' ? M.chat : M.chat, 0.8, 'ui');
            tt += el.interval ?? 1.1;
          });
          break;
        }
        case 'flow': (el.nodes || [1, 2, 3]).forEach((_, k) => push(t0 + k * (a.stagger ?? 0.4), M.node, 0.8, 'ui')); break;
        case 'list': (el.items || []).forEach((_, k) => push(t0 + k * (a.stagger ?? 0.18), M.entrance === 'none' ? 'none' : M.entrance, 0.6, 'entrance')); break;
        case 'timeline': (el.items || []).forEach((_, k) => push(t0 + k * (a.stagger ?? 0.45), M.node, 0.7, 'ui')); break;
        case 'notify': if (budget-- > 0) push(t0, M.notify, 0.8, 'ui'); break;
        case 'signature': case 'corners': if (budget-- > 0) push(t0, M.draw === 'none' ? M.ui : M.draw, 0.8, 'entrance'); break;
        case 'icon': case 'shape': case 'image': case 'device': case 'donut': case 'bars':
          if (!a.in || a.in === 'none' || a.in === 'fade') break;
          if (budget-- <= 0) break;
          push(t0, a.in === 'draw' ? M.draw : M.entrance, 0.8, 'entrance');
          break;
        default: break;
      }
    }
    // sounds the user placed by hand
    for (const e of sx.events || []) {
      if (!e || !e.kind || e.kind === 'none') continue;
      const t = S0 + (e.t ?? 0);
      if (e.t < 0 || t >= it.end) continue;
      ev.push({ t, kind: e.kind, gain: clamp(e.vol ?? 1, 0, 2) * catMul(snd, 'custom'), pitch: clamp(e.pitch ?? 1, 0.5, 2), src: { scene: si, el: null, auto: false, cat: 'custom', id: e.id } });
    }
  });
  return ev.filter((e) => e.gain > 0.0005).sort((x, y) => x.t - y.t);
}

// ---------------------------------------------------------------- synthesis
const noiseCache = new Map(); // `${sampleRate}:${color}` -> AudioBuffer
function noiseBuf(ctx, color = 'white') {
  const key = ctx.sampleRate + ':' + color;
  let b = noiseCache.get(key);
  if (b) return b;
  const n = Math.floor(ctx.sampleRate * 2);
  b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = sr(i * 0.731 + 1.3) * 2 - 1;
    if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    } else if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    } else d[i] = w;
  }
  noiseCache.set(key, b);
  return b;
}

// small plate-style reverb, one per context and output
const reverbs = new WeakMap();
function reverbIn(ctx, dest) {
  let m = reverbs.get(ctx);
  if (!m) { m = new Map(); reverbs.set(ctx, m); }
  let r = m.get(dest);
  if (r) return r;
  const len = Math.floor(ctx.sampleRate * 1.6);
  const imp = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = imp.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (sr(i * 1.913 + ch * 77.7) * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.55;
  }
  const conv = ctx.createConvolver();
  conv.buffer = imp;
  const send = ctx.createGain();
  send.gain.value = 0.35;
  send.connect(conv);
  conv.connect(dest);
  m.set(dest, send);
  return send;
}

// builder bound to one event: frequencies scale with pitch p
function kit(ctx, out, T, p) {
  const k = {
    T,
    env(peak, attack, decay, at = 0, hold = 0, to = out) {
      const g = ctx.createGain();
      const s = T + at;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), s + Math.max(0.001, attack));
      if (hold > 0) g.gain.setValueAtTime(Math.max(0.0002, peak), s + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, s + attack + hold + Math.max(0.005, decay));
      g.connect(to);
      return g;
    },
    osc(type, f0, f1, dur, at = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      const s = T + at;
      o.frequency.setValueAtTime(Math.max(1, f0 * p), s);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * p), s + Math.max(0.005, dur));
      o.start(s);
      o.stop(s + dur + 0.08);
      return o;
    },
    noise(dur, at = 0, color = 'white') {
      const b = ctx.createBufferSource();
      b.buffer = noiseBuf(ctx, color);
      const s = T + at;
      b.start(s, (sr(T * 13.1 + at * 7.7) * 1.2) % 1.2);
      b.stop(s + dur + 0.08);
      return b;
    },
    filter(type, f0, f1, dur, Q = 1, at = 0) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = Q;
      const s = T + at;
      f.frequency.setValueAtTime(Math.min(20000, Math.max(20, f0 * p)), s);
      if (f1) f.frequency.exponentialRampToValueAtTime(Math.min(20000, Math.max(20, f1 * p)), s + Math.max(0.005, dur));
      return f;
    },
    // chain helpers
    tone(type, f0, f1, dur, peak, attack, decay, at = 0, to = out) {
      k.osc(type, f0, f1, dur, at).connect(k.env(peak, attack, decay, at, 0, to));
    },
    hiss(dur, ftype, f0, f1, Q, peak, attack, decay, at = 0, color = 'white', to = out) {
      const f = k.filter(ftype, f0, f1, dur, Q, at);
      k.noise(dur, at, color).connect(f);
      f.connect(k.env(peak, attack, decay, at, 0, to));
    },
    verb() { return reverbIn(ctx, out); },
  };
  return k;
}

const R = {
  // ---- whoosh
  whoosh: (k) => k.hiss(0.62, 'bandpass', 380, 2600, 0.9, 0.22, 0.16, 0.42, 0, 'pink'),
  'whoosh-soft': (k) => k.hiss(0.4, 'bandpass', 700, 2200, 0.8, 0.1, 0.08, 0.28, 0, 'pink'),
  'whoosh-short': (k) => k.hiss(0.22, 'bandpass', 900, 3200, 1, 0.16, 0.05, 0.16, 0, 'pink'),
  'whoosh-long': (k) => k.hiss(1.4, 'bandpass', 250, 1800, 0.7, 0.2, 0.45, 0.9, 0, 'pink'),
  'whoosh-up': (k) => k.hiss(0.5, 'bandpass', 300, 4200, 1.4, 0.18, 0.35, 0.12, 0, 'pink'),
  'whoosh-down': (k) => k.hiss(0.6, 'bandpass', 3500, 300, 1.2, 0.18, 0.05, 0.5, 0, 'pink'),
  'whoosh-reverse': (k) => k.hiss(0.66, 'bandpass', 400, 3000, 1, 0.2, 0.6, 0.03, 0, 'pink'),
  'whoosh-air': (k) => k.hiss(0.5, 'highpass', 2500, 6000, 0.7, 0.08, 0.1, 0.35),
  'whoosh-deep': (k) => { k.hiss(0.75, 'lowpass', 900, 200, 0.8, 0.35, 0.12, 0.55, 0, 'brown'); k.tone('sine', 70, 40, 0.6, 0.12, 0.08, 0.45); },
  swish: (k) => k.hiss(0.45, 'bandpass', 1800, 5200, 1.2, 0.08, 0.12, 0.3),
  'swish-fast': (k) => k.hiss(0.17, 'bandpass', 2500, 6500, 1.5, 0.1, 0.03, 0.12),
  'swoosh-in': (k) => k.hiss(0.58, 'bandpass', 300, 2800, 1, 0.2, 0.5, 0.05, 0, 'pink'),
  'swoosh-out': (k) => k.hiss(0.65, 'bandpass', 2800, 300, 1, 0.2, 0.01, 0.6, 0, 'pink'),
  // ---- pop
  pop: (k) => k.tone('sine', 620, 260, 0.12, 0.2, 0.004, 0.11),
  'pop-soft': (k) => k.tone('sine', 480, 240, 0.1, 0.12, 0.006, 0.09),
  'pop-high': (k) => k.tone('sine', 1100, 520, 0.09, 0.14, 0.003, 0.08),
  'pop-low': (k) => k.tone('sine', 300, 120, 0.15, 0.25, 0.005, 0.14),
  bubble: (k) => k.tone('sine', 300, 900, 0.1, 0.16, 0.005, 0.1),
  'bubble-double': (k) => { k.tone('sine', 280, 800, 0.09, 0.14, 0.005, 0.09); k.tone('sine', 360, 1000, 0.09, 0.12, 0.005, 0.09, 0.09); },
  plop: (k) => k.tone('sine', 400, 1400, 0.06, 0.15, 0.002, 0.12),
  boop: (k) => k.tone('triangle', 520, 480, 0.18, 0.14, 0.01, 0.16),
  // ---- click
  click: (k) => k.tone('triangle', 1800, 900, 0.05, 0.16, 0.002, 0.05),
  'click-soft': (k) => k.tone('sine', 1400, 900, 0.04, 0.08, 0.001, 0.04),
  'click-mouse': (k) => { k.hiss(0.03, 'highpass', 3000, null, 0.7, 0.12, 0.001, 0.02); k.hiss(0.03, 'highpass', 2200, null, 0.7, 0.08, 0.001, 0.02, 0.07); },
  'click-ui': (k) => { const f = k.filter('lowpass', 4000, null, 0.04, 0.7); k.osc('square', 2400, null, 0.04).connect(f); f.connect(k.env(0.06, 0.001, 0.03)); },
  toggle: (k) => { k.tone('sine', 900, null, 0.05, 0.08, 0.002, 0.04); k.tone('sine', 1300, null, 0.06, 0.08, 0.002, 0.05, 0.05); },
  tap: (k) => { k.tone('sine', 880, 600, 0.06, 0.12, 0.001, 0.06); k.hiss(0.05, 'bandpass', 2000, null, 4, 0.08, 0.001, 0.04); },
  switch: (k) => { k.hiss(0.03, 'bandpass', 4000, null, 2, 0.12, 0.001, 0.015); k.tone('sine', 200, 160, 0.05, 0.1, 0.001, 0.04); },
  // ---- type
  type: (k) => k.hiss(0.05, 'bandpass', 2400 + sr(k.T * 7.7) * 1600, null, 2.5, 0.11, 0.001, 0.035),
  'type-soft': (k) => k.hiss(0.04, 'bandpass', 2000 + sr(k.T * 5.3) * 800, null, 2, 0.09, 0.001, 0.03),
  typewriter: (k) => { k.hiss(0.06, 'bandpass', 1800, null, 1.5, 0.16, 0.001, 0.05); k.tone('triangle', 300, 220, 0.05, 0.08, 0.001, 0.04); },
  'keyboard-mech': (k) => { k.hiss(0.03, 'highpass', 2500 + sr(k.T * 3.1) * 1200, null, 0.8, 0.12, 0.001, 0.025); k.hiss(0.06, 'bandpass', 900, null, 3, 0.09, 0.003, 0.05); },
  // ---- tick
  tick: (k) => { const f = k.filter('lowpass', 6000, null, 0.03, 0.7); k.osc('square', 2600, 2400, 0.03).connect(f); f.connect(k.env(0.07, 0.001, 0.025)); },
  'tick-soft': (k) => k.tone('sine', 2200, null, 0.025, 0.05, 0.001, 0.02),
  'tick-wood': (k) => { k.tone('sine', 1200, 900, 0.04, 0.1, 0.001, 0.03); k.hiss(0.03, 'bandpass', 2500, null, 6, 0.06, 0.001, 0.02); },
  'tick-clock': (k) => k.tone('triangle', 3000, 2700, 0.02, 0.06, 0.001, 0.015),
  'count-blip': (k) => k.tone('sine', 1500, null, 0.05, 0.06, 0.002, 0.04),
  // ---- chime
  chime: (k) => { const v = k.verb(); k.tone('sine', 880, null, 1, 0.1, 0.006, 0.9); k.tone('sine', 1320, null, 1, 0.05, 0.006, 0.9); k.tone('sine', 880, null, 1, 0.05, 0.006, 0.9, 0, v); },
  bell: (k) => { const v = k.verb(); [[660, 0.1, 1.4], [660 * 2.76, 0.04, 0.9], [660 * 5.4, 0.02, 0.5]].forEach(([f, g, d]) => { k.tone('sine', f, null, d, g, 0.003, d); k.tone('sine', f, null, d, g * 0.5, 0.003, d, 0, v); }); },
  ding: (k) => { k.tone('sine', 1568, null, 0.7, 0.1, 0.003, 0.7); k.tone('sine', 3136, null, 0.4, 0.03, 0.003, 0.4); k.tone('sine', 1568, null, 0.7, 0.05, 0.003, 0.7, 0, k.verb()); },
  'ding-double': (k) => { k.tone('sine', 1318, null, 0.5, 0.09, 0.003, 0.45); k.tone('sine', 1760, null, 0.6, 0.09, 0.003, 0.55, 0.12); },
  success: (k) => { const v = k.verb(); [784, 988, 1175].forEach((f, i) => { k.tone('sine', f, null, 0.4, 0.09, 0.004, 0.35, i * 0.08); k.tone('sine', f, null, 0.4, 0.04, 0.004, 0.35, i * 0.08, v); }); },
  notify: (k) => { k.tone('triangle', 880, null, 0.28, 0.1, 0.004, 0.25); k.tone('triangle', 1175, null, 0.3, 0.1, 0.004, 0.28, 0.1); },
  'notify-soft': (k) => { k.tone('sine', 740, null, 0.32, 0.07, 0.006, 0.3); k.tone('sine', 988, null, 0.34, 0.07, 0.006, 0.32, 0.12); },
  cash: (k) => { k.tone('sine', 2637, null, 0.5, 0.07, 0.002, 0.5); k.tone('sine', 3136, null, 0.5, 0.05, 0.002, 0.45, 0.05); k.hiss(0.15, 'bandpass', 6000, null, 1, 0.07, 0.002, 0.12, 0.02); },
  'sparkle-chime': (k) => { const v = k.verb(); [2093, 2637, 3136, 4186].forEach((f, i) => { k.tone('sine', f, null, 0.5, 0.05, 0.002, 0.5, i * 0.03); k.tone('sine', f, null, 0.5, 0.03, 0.002, 0.5, i * 0.03, v); }); },
  'message-in': (k) => { k.tone('sine', 1046, null, 0.12, 0.09, 0.003, 0.12); k.tone('sine', 1568, null, 0.14, 0.09, 0.003, 0.14, 0.08); },
  'message-out': (k) => k.tone('sine', 900, 1500, 0.12, 0.08, 0.003, 0.12),
  // ---- impact
  thud: (k) => k.tone('sine', 110, 48, 0.32, 0.42, 0.006, 0.3),
  boom: (k) => { k.tone('sine', 80, 35, 0.9, 0.5, 0.008, 0.9); k.hiss(0.5, 'lowpass', 400, 120, 0.7, 0.25, 0.005, 0.5, 0, 'brown'); k.tone('sine', 80, 35, 0.9, 0.2, 0.008, 0.9, 0, k.verb()); },
  'sub-drop': (k) => k.tone('sine', 120, 30, 1.2, 0.45, 0.01, 1.2),
  'impact-soft': (k) => { k.tone('sine', 90, 50, 0.26, 0.3, 0.005, 0.25); k.hiss(0.12, 'lowpass', 800, null, 0.7, 0.12, 0.002, 0.12); },
  'impact-hard': (k) => { k.tone('sine', 140, 45, 0.36, 0.4, 0.003, 0.35); k.hiss(0.16, 'bandpass', 1500, 500, 0.5, 0.22, 0.001, 0.15); k.hiss(0.16, 'bandpass', 1500, 500, 0.5, 0.12, 0.001, 0.15, 0, 'white', k.verb()); },
  slam: (k) => { k.hiss(0.22, 'lowpass', 2500, 600, 0.7, 0.4, 0.001, 0.2); k.tone('sine', 90, 40, 0.3, 0.4, 0.002, 0.3); },
  'punch-hit': (k) => { k.tone('sine', 160, 60, 0.13, 0.4, 0.002, 0.12); k.hiss(0.06, 'bandpass', 1200, null, 1, 0.2, 0.001, 0.05); },
  'deep-hit': (k) => { k.tone('sine', 60, 40, 0.6, 0.5, 0.01, 0.6); k.tone('sine', 60, 40, 0.6, 0.3, 0.01, 0.6, 0, k.verb()); k.hiss(0.1, 'lowpass', 600, null, 0.7, 0.15, 0.002, 0.1, 0, 'brown'); },
  // ---- perc
  kick: (k) => k.tone('sine', 150, 45, 0.26, 0.55, 0.002, 0.25),
  snare: (k) => { k.hiss(0.2, 'bandpass', 1800, null, 0.7, 0.3, 0.001, 0.18); k.tone('triangle', 220, 180, 0.09, 0.2, 0.001, 0.08); },
  clap: (k) => { [0, 0.012, 0.024].forEach((d) => k.hiss(0.02, 'bandpass', 1200, null, 1, 0.25, 0.001, 0.02, d)); k.hiss(0.16, 'bandpass', 1200, null, 1, 0.2, 0.001, 0.15, 0.03); },
  hat: (k) => k.hiss(0.05, 'highpass', 7000, null, 0.7, 0.12, 0.001, 0.04),
  rim: (k) => { k.tone('triangle', 1700, null, 0.03, 0.12, 0.001, 0.03); k.tone('square', 800, null, 0.02, 0.05, 0.001, 0.02); },
  tom: (k) => k.tone('sine', 220, 140, 0.32, 0.4, 0.003, 0.3),
  // ---- digital
  glitch: (k) => { const f = k.filter('lowpass', 1400, null, 0.26, 0.7); k.osc('square', 180, 90, 0.26).connect(f); f.connect(k.env(0.14, 0.002, 0.25)); },
  'glitch-short': (k) => { const f = k.filter('lowpass', 2200, null, 0.09, 0.7); k.osc('square', 600, 200, 0.09).connect(f); f.connect(k.env(0.1, 0.001, 0.08)); k.hiss(0.05, 'highpass', 3000, null, 0.7, 0.06, 0.001, 0.04, 0.03); },
  laser: (k) => { const f = k.filter('lowpass', 3000, null, 0.25, 0.7); k.osc('sawtooth', 2200, 180, 0.25).connect(f); f.connect(k.env(0.1, 0.002, 0.25)); },
  zap: (k) => { const f = k.filter('lowpass', 3500, null, 0.12, 0.7); k.osc('square', 1200, 80, 0.12).connect(f); f.connect(k.env(0.1, 0.001, 0.12)); },
  beep: (k) => { const f = k.filter('lowpass', 3000, null, 0.18, 0.7); k.osc('square', 1000, null, 0.18).connect(f); f.connect(k.env(0.06, 0.002, 0.1, 0, 0.05)); },
  blip: (k) => { const f = k.filter('lowpass', 4000, null, 0.06, 0.7); k.osc('square', 1400, 1600, 0.06).connect(f); f.connect(k.env(0.06, 0.001, 0.05)); },
  data: (k) => { for (let i = 0; i < 6; i++) { const fr = 800 + sr(k.T * 3.3 + i * 9.1) * 1600; const f = k.filter('lowpass', 4000, null, 0.03, 0.7, i * 0.035); k.osc('square', fr, null, 0.03, i * 0.035).connect(f); f.connect(k.env(0.05, 0.001, 0.025, i * 0.035)); } },
  error: (k) => { [0, 0.18].forEach((d) => { const f = k.filter('lowpass', 900, null, 0.16, 0.7, d); k.osc('sawtooth', 160, null, 0.16, d).connect(f); f.connect(k.env(0.12, 0.005, 0.15, d)); }); },
  scan: (k) => k.tone('sine', 400, 2400, 0.5, 0.06, 0.1, 0.4),
  'power-up': (k) => { const f = k.filter('lowpass', 2500, null, 0.42, 0.7); k.osc('triangle', 220, 880, 0.42).connect(f); f.connect(k.env(0.08, 0.05, 0.35)); },
  'power-down': (k) => k.tone('triangle', 880, 110, 0.52, 0.1, 0.01, 0.5),
  // ---- magic
  sparkle: (k) => { const v = k.verb(); for (let i = 0; i < 6; i++) { const f = 2500 + sr(k.T * 1.7 + i * 4.4) * 2500; k.tone('sine', f, null, 0.28, 0.04, 0.002, 0.25, i * 0.04); k.tone('sine', f, null, 0.28, 0.03, 0.002, 0.25, i * 0.04, v); } },
  magic: (k) => { const v = k.verb(); [1046, 1318, 1568, 2093, 2637].forEach((f, i) => { k.tone('sine', f, null, 0.45, 0.05, 0.002, 0.4, i * 0.05); k.tone('sine', f, null, 0.45, 0.03, 0.002, 0.4, i * 0.05, v); }); k.hiss(0.75, 'highpass', 6000, null, 0.7, 0.03, 0.3, 0.4); },
  twinkle: (k) => { k.tone('sine', 2637, null, 0.32, 0.05, 0.002, 0.3); k.tone('sine', 3520, null, 0.34, 0.05, 0.002, 0.3, 0.06); k.tone('sine', 3520, null, 0.34, 0.03, 0.002, 0.3, 0.06, k.verb()); },
  riser: (k) => { k.hiss(1.5, 'bandpass', 300, 3000, 1, 0.18, 1.4, 0.05, 0, 'pink'); k.tone('sine', 200, 800, 1.45, 0.05, 1.4, 0.05); },
  'riser-short': (k) => { k.hiss(0.62, 'bandpass', 400, 3200, 1, 0.16, 0.56, 0.04, 0, 'pink'); k.tone('sine', 260, 900, 0.6, 0.04, 0.56, 0.04); },
  reveal: (k) => { k.hiss(0.52, 'bandpass', 400, 3200, 1, 0.14, 0.48, 0.03, 0, 'pink'); k.tone('sine', 90, 50, 0.26, 0.3, 0.005, 0.25, 0.52); k.tone('sine', 2637, null, 0.4, 0.04, 0.002, 0.35, 0.53, k.verb()); },
  // ---- misc
  heartbeat: (k) => { k.tone('sine', 70, 50, 0.13, 0.4, 0.005, 0.12); k.tone('sine', 66, 48, 0.12, 0.3, 0.005, 0.11, 0.22); },
  camera: (k) => { k.hiss(0.04, 'bandpass', 3000, null, 1, 0.2, 0.001, 0.03); k.hiss(0.06, 'bandpass', 1500, null, 1, 0.15, 0.001, 0.05, 0.08); k.tone('triangle', 1800, 900, 0.03, 0.06, 0.001, 0.03, 0.08); },
  paper: (k) => { for (let i = 0; i < 6; i++) k.hiss(0.05, 'bandpass', 3500, null, 0.7, 0.05 + sr(k.T + i) * 0.04, 0.005, 0.04, sr(k.T * 3 + i * 1.7) * 0.22); },
  'page-flip': (k) => { k.hiss(0.22, 'bandpass', 1500, 4500, 0.8, 0.12, 0.05, 0.15); k.hiss(0.12, 'bandpass', 3000, null, 1, 0.05, 0.01, 0.1, 0.18); },
  swipe: (k) => k.hiss(0.11, 'highpass', 1500, 5000, 0.7, 0.1, 0.02, 0.08),
  pencil: (k) => { for (let i = 0; i < 8; i++) k.hiss(0.035, 'bandpass', 3000 + sr(k.T + i * 2.2) * 800, null, 3, 0.08, 0.004, 0.03, i * 0.045); },
  stamp: (k) => { k.tone('sine', 120, 60, 0.12, 0.3, 0.002, 0.1); k.hiss(0.09, 'lowpass', 1200, null, 0.7, 0.3, 0.001, 0.08); },
};

// Schedules one effect into any BaseAudioContext.
export function playSfx(ctx, dest, kind, when, gain = 1, pitch = 1) {
  const fn = R[kind];
  if (!fn || !(gain > 0)) return;
  const out = ctx.createGain();
  out.gain.value = clamp(gain, 0, 2.5);
  out.connect(dest);
  try { fn(kit(ctx, out, Math.max(0, when), clamp(pitch || 1, 0.25, 4))); } catch (e) { /* a bad node graph must never break playback */ }
}

// ---------------------------------------------------------------- uploaded track
const trackCache = new Map(); // src -> Promise<AudioBuffer>
function dataUrlBytes(src) {
  const i = src.indexOf(',');
  const meta = src.slice(0, i), body = src.slice(i + 1);
  if (/;base64/i.test(meta)) {
    const bin = atob(body);
    const u = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
    return u.buffer;
  }
  return new TextEncoder().encode(decodeURIComponent(body)).buffer;
}
export function decodeTrack(ctx, src) {
  if (!src) return Promise.reject(new Error('no track'));
  let p = trackCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const ab = dataUrlBytes(src);
      // callback form also works on older Safari
      const r = ctx.decodeAudioData(ab, res, rej);
      if (r && typeof r.then === 'function') r.then(res, rej);
    });
    p.catch(() => trackCache.delete(src));
    trackCache.set(src, p);
  }
  return p;
}
function scheduleTrack(ctx, dest, buf, tr, total, startAt, from) {
  // startAt: context time that corresponds to video time `from`
  const vol = clamp(tr.volume ?? 0.6, 0, 2);
  const off = tr.offset ?? 0;
  let pos = from - off;
  let when = startAt;
  if (pos < 0) { when += -pos; pos = 0; }
  if (tr.loop) pos %= buf.duration;
  else if (pos >= buf.duration) return null;
  const videoAt = (ct) => from + (ct - startAt);
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = !!tr.loop;
  const g = ctx.createGain();
  s.connect(g);
  g.connect(dest);
  // volume curve: fades are measured on the video timeline
  const fi = Math.max(0, tr.fadeIn ?? 0), fo = Math.max(0, tr.fadeOut ?? 0);
  const trackStartV = off; // video time where the track begins
  const endV = Math.min(total, tr.loop ? total : off + buf.duration);
  const level = (v) => {
    let k = 1;
    if (fi > 0) k = Math.min(k, clamp((v - trackStartV) / fi));
    if (fo > 0) k = Math.min(k, clamp((endV - v) / fo));
    return vol * k;
  };
  const ctAt = (v) => startAt + (v - from);
  const vNow = videoAt(when);
  g.gain.setValueAtTime(Math.max(0.0001, level(vNow)), when);
  const keys = [];
  if (fi > 0 && trackStartV + fi > vNow) keys.push(trackStartV + fi);
  if (fo > 0) { if (endV - fo > vNow) keys.push(endV - fo); if (endV > vNow) keys.push(endV); }
  keys.sort((x, y) => x - y).forEach((v) => g.gain.linearRampToValueAtTime(Math.max(0.0001, level(v)), ctAt(v)));
  s.start(when, pos);
  s.stop(startAt + Math.max(0, total - from) + 0.02);
  return s;
}

// ---------------------------------------------------------------- export mix
export async function renderAudio(project, duration, sampleRate = 48000) {
  const snd = project.sound || {};
  const len = Math.max(1, Math.ceil(duration * sampleRate));
  const ctx = new OfflineAudioContext(2, len, sampleRate);
  const vol = clamp(snd.volume ?? 0.7, 0, 1);
  const master = ctx.createGain();
  master.gain.value = vol * 1.1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  // brick-wall-ish limiter after the glue compressor
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  lim.attack.value = 0.001;
  lim.release.value = 0.08;
  master.connect(comp);
  comp.connect(lim);
  lim.connect(ctx.destination);
  if (snd.on !== false) {
    for (const e of sfxEvents(project)) if (e.t < duration - 0.02) playSfx(ctx, master, e.kind, Math.max(0, e.t), e.gain, e.pitch);
    const tr = snd.track;
    if (tr && tr.src) {
      try {
        const buf = await decodeTrack(ctx, tr.src);
        const tg = ctx.createGain();
        tg.gain.value = vol * catMul(snd, 'track');
        tg.connect(lim);
        scheduleTrack(ctx, tg, buf, tr, duration, 0, 0);
      } catch (e) { /* undecodable file: export without it */ }
    }
  }
  const out = await ctx.startRendering();
  // final safety: never hand a clipping buffer to the encoder
  let peak = 0;
  for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; } }
  if (peak > 0.96) {
    const k = 0.95 / peak;
    for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  }
  return out;
}

// ---------------------------------------------------------------- live preview
let live = null, liveGain = null, auditionGain = null;
export function audioUnlock() {
  if (!live) {
    try {
      live = new (window.AudioContext || window.webkitAudioContext)();
      liveGain = live.createGain();
      const lim = live.createDynamicsCompressor();
      lim.threshold.value = -3; lim.knee.value = 2; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.1;
      liveGain.connect(lim);
      lim.connect(live.destination);
      auditionGain = live.createGain();
      auditionGain.gain.value = 0.8;
      auditionGain.connect(live.destination);
    } catch (e) { live = null; }
  }
  if (live && live.state === 'suspended') live.resume();
  return live;
}

// audition one sound from the UI
export function previewSound(kind, gain = 1, pitch = 1) {
  const ctx = audioUnlock();
  if (!ctx) return;
  playSfx(ctx, auditionGain, kind, ctx.currentTime + 0.02, gain, pitch);
}

let cache = { p: null, v: -1, at: 0, ev: [] };
let version = 0;
export function invalidateSfx() { version++; }
function liveEvents(project) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (cache.p !== project || cache.v !== version || now - cache.at > 600) cache = { p: project, v: version, at: now, ev: sfxEvents(project) };
  return cache.ev;
}
export function liveTick(project, from, to, enabled) {
  if (!live || !enabled || to < from || to - from > 0.25) return;
  const snd = project.sound || {};
  if (snd.on === false) return;
  liveGain.gain.value = clamp(snd.volume ?? 0.7, 0, 1) * 0.9;
  for (const e of liveEvents(project)) if (e.t >= from && e.t < to) playSfx(live, liveGain, e.kind, live.currentTime + 0.01, e.gain, e.pitch);
}

// keep the uploaded track in sync with playback: call on play / seek, liveStop on pause
const liveTrack = { node: null, gain: null, token: 0 };
export async function liveStart(project, t = 0) {
  liveStop();
  const ctx = audioUnlock();
  if (!ctx) return;
  const snd = project.sound || {};
  const tr = snd.track;
  if (snd.on === false || !tr || !tr.src) return;
  const token = ++liveTrack.token;
  let buf;
  try { buf = await decodeTrack(ctx, tr.src); } catch (e) { return; }
  if (token !== liveTrack.token) return;
  const total = timeline(project).total;
  if (t >= total) return;
  const g = ctx.createGain();
  g.gain.value = clamp(snd.volume ?? 0.7, 0, 1) * catMul(snd, 'track');
  g.connect(ctx.destination);
  liveTrack.gain = g;
  liveTrack.node = scheduleTrack(ctx, g, buf, tr, total, ctx.currentTime + 0.03, t);
}
export function liveStop() {
  liveTrack.token++;
  if (liveTrack.node) { try { liveTrack.node.stop(); } catch (e) { /* already stopped */ } }
  if (liveTrack.gain) { try { liveTrack.gain.disconnect(); } catch (e) { /* ignore */ } }
  liveTrack.node = null;
  liveTrack.gain = null;
}

export const SOUND_CAT_KEYS = CAT_KEYS;
