// In-browser MP4 export: renders every frame with the same engine, encodes with WebCodecs (Mediabunny).
import { renderFrame, renderScene, createEnv, ASPECTS, timeline } from './engine/renderer.js';
import { renderAudio } from './engine/audio.js';
import { drawWatermark } from './engine/watermark.js';

const even = (v) => Math.max(2, Math.round(v / 2) * 2);

export async function canUseWebCodecs() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

export async function exportVideo(project, { scale = 1, fps = 30, sound = true, images, onProgress, signal, cover = true } = {}) {
  const [W, H] = ASPECTS[project.aspect] || ASPECTS['4:5'];
  const outW = even(W * scale), outH = even(H * scale);
  const total = timeline(project).total;
  // optional cover frame (poster) shown for 0.1 s at the very start: platforms use the first frame as thumbnail
  let coverScene = null, coverT = 0;
  if (cover && project.poster) {
    const ci = project.scenes.findIndex((s) => s.id === project.poster.scene);
    if (ci >= 0) { coverScene = project.scenes[ci]; coverT = project.poster.t || 0; }
  }
  const coverFrames = coverScene ? Math.max(1, Math.round(0.1 * fps)) : 0;
  const frames = Math.max(1, Math.ceil(total * fps)) + coverFrames;
  if (!(await canUseWebCodecs())) return recordFallback(project, { W, H, outW, outH, fps, total, images, onProgress, signal, sound });

  const MB = await import('./vendor/mediabunny.min.js');
  const bitrate = Math.round(outW * outH * fps * 0.17);
  const vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1', 'hevc'], { width: outW, height: outH, bitrate });
  if (!vcodec) return recordFallback(project, { W, H, outW, outH, fps, total, images, onProgress, signal, sound });
  let acodec = null;
  if (sound && (project.sound || {}).on !== false && typeof OfflineAudioContext !== 'undefined') {
    try { acodec = await MB.getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: 48000 }); } catch (e) { acodec = null; }
  }

  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(outW, outH) : Object.assign(document.createElement('canvas'), { width: outW, height: outH });
  const ctx = canvas.getContext('2d', { alpha: false });
  const env = createEnv(project, W, H, outW / W, { images });

  const output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
  const vsrc = new MB.CanvasSource(canvas, { codec: vcodec, bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(vsrc, { frameRate: fps });
  let asrc = null;
  if (acodec) {
    asrc = new MB.AudioBufferSource({ codec: acodec, bitrate: 160000 }, { startTimestamp: coverFrames / fps });
    output.addAudioTrack(asrc);
  }
  await output.start();
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    if (signal && signal.aborted) { await output.cancel(); throw new DOMException('cancelled', 'AbortError'); }
    const t = f / fps;
    if (f < coverFrames) { renderScene(ctx, coverScene, coverT, env); drawWatermark(ctx, env, project); }
    else renderFrame(ctx, project, (f - coverFrames) / fps, env);
    await vsrc.add(t, 1 / fps);
    if (f % 3 === 0) {
      const el = (performance.now() - t0) / 1000;
      onProgress && onProgress({ phase: 'video', p: (f + 1) / frames, frame: f + 1, frames, eta: (el / (f + 1)) * (frames - f - 1) });
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  if (asrc) {
    onProgress && onProgress({ phase: 'audio', p: 1, frame: frames, frames, eta: 0 });
    const buf = await renderAudio(project, (frames - coverFrames) / fps);
    await asrc.add(buf);
  }
  onProgress && onProgress({ phase: 'finalize', p: 1, frame: frames, frames, eta: 0 });
  await output.finalize();
  const blob = new Blob([output.target.buffer], { type: 'video/mp4' });
  return { blob, ext: 'mp4', codec: vcodec, audio: acodec, width: outW, height: outH };
}

// Real-time recording for browsers without WebCodecs (produces WebM).
async function recordFallback(project, { W, H, outW, outH, fps, total, images, onProgress, signal, sound }) {
  if (typeof MediaRecorder === 'undefined') throw new Error('هالمتصفح ما بيدعم تصدير الفيديو. جرّب Chrome أو Edge.');
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  const env = createEnv(project, W, H, outW / W, { images });
  const stream = canvas.captureStream(fps);
  let actx = null;
  if (sound && (project.sound || {}).on !== false) {
    try {
      actx = new AudioContext();
      const buf = await renderAudio(project, total, actx.sampleRate);
      const dst = actx.createMediaStreamDestination();
      const src = actx.createBufferSource();
      src.buffer = buf;
      src.connect(dst);
      dst.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      actx._src = src;
    } catch (e) { actx = null; }
  }
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  renderFrame(ctx, project, 0, env);
  rec.start(250);
  if (actx) actx._src.start();
  const start = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      if (signal && signal.aborted) return resolve();
      const t = (performance.now() - start) / 1000;
      if (t >= total) return resolve();
      renderFrame(ctx, project, t, env);
      onProgress && onProgress({ phase: 'video', p: t / total, frame: Math.round(t * fps), frames: Math.ceil(total * fps), eta: total - t });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  if (actx) actx.close();
  if (signal && signal.aborted) throw new DOMException('cancelled', 'AbortError');
  return { blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm', codec: 'vp9', audio: actx ? 'opus' : null, width: outW, height: outH };
}

// Save a file: artifact "downloads" capability when present, otherwise a normal download link.
export async function saveFile(blob, filename) {
  try {
    const cl = window.claude;
    if (cl && typeof cl.use === 'function') {
      const dl = await Promise.race([cl.use('downloads'), new Promise((r) => setTimeout(() => r(null), 4000))]);
      if (dl) {
        await dl.save({ filename, data: blob });
        return 'saved';
      }
    }
  } catch (e) {
    if (e && e.code === 'declined') return 'declined';
    if (e && e.code && e.code !== 'unavailable' && e.code !== 'not_granted') throw e;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'link';
}
