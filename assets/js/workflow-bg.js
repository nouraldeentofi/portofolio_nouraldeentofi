/**
 * The living background: one connected node mesh over the ENTIRE page.
 *
 * Not fixed — the canvas is laid over the whole document and scrolls with
 * it. Nodes are scattered from the very top to the very bottom, every node
 * is linked to its nearest neighbours, and pulses travel through the mesh
 * hopping from node to node — the same picture in the header continues
 * behind every section to the footer.
 *
 * Depth without WebGL: each node carries a z value that scales its size,
 * brightness, and halo, so the mesh reads as a 3D field at 2D cost.
 *
 * Per-page character comes from parameter presets (density, links per node,
 * pulse traffic, speed) picked via `data-variant` — one family, seven moods.
 *
 * Discipline:
 *  - `prefers-reduced-motion` → one static frame, nothing moves
 *  - only the visible band is redrawn each frame (clip + cull), so a
 *    6000px-tall canvas costs no more than a viewport-sized one
 *  - the backing store is pixel-capped; a huge page lowers resolution
 *    instead of exhausting memory
 *  - rebuilds when the document grows (FAQ opens, fonts load, resize)
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Deterministic pseudo-random in [0,1) — stable across rebuilds. */
const sr = (n) => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

/* Density and traffic per page — same language, different mood. */
const PRESETS = {
  graph:  { cell: 150, k: 3, traffic: 1.0, speed: 1.0 },
  orbit:  { cell: 170, k: 2, traffic: 0.7, speed: 0.8 },
  flow:   { cell: 155, k: 2, traffic: 0.9, speed: 1.1 },
  grid:   { cell: 140, k: 3, traffic: 0.9, speed: 0.9 },
  branch: { cell: 150, k: 3, traffic: 1.1, speed: 1.2 },
  drift:  { cell: 180, k: 2, traffic: 0.6, speed: 0.7 },
  signal: { cell: 155, k: 2, traffic: 0.9, speed: 1.0 },
};

const MAX_PIXELS = 4_500_000;

function readTokens(el) {
  const s = getComputedStyle(el);
  return {
    lime: s.getPropertyValue('--lime').trim() || '#b8ff5c',
    mint: s.getPropertyValue('--mint').trim() || '#5ce1a9',
    line: s.getPropertyValue('--line-strong').trim() || 'rgba(238,242,246,.22)',
  };
}

export function createWorkflowBackground(canvas) {
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return { destroy() {} };

  const preset = PRESETS[canvas.dataset.variant] ?? PRESETS.graph;

  let nodes = [];
  let edges = [];
  let adjacency = [];
  let pulses = [];
  let raf = null;
  let running = false;
  let w = 0;
  let h = 0;
  let colors = readTokens(document.documentElement);

  const dot = (x, y, r, color, alpha) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  };

  const halo = (x, y, r, color, alpha) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.stroke();
  };

  function build() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    if (w < 1 || h < 1) return;

    // Pixel-capped backing store: a very tall page trades resolution,
    // never memory.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, Math.sqrt(MAX_PIXELS / (w * h)));
    canvas.width = Math.max(1, Math.floor(w * scale));
    canvas.height = Math.max(1, Math.floor(h * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // --- nodes: a jittered grid over the WHOLE document, with depth
    const cols = Math.max(3, Math.round(w / preset.cell));
    const rows = Math.max(4, Math.round(h / preset.cell));
    nodes = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const seed = c * 127.1 + r * 311.7;
        const z = 0.55 + sr(seed * 1.3) * 0.45; // 0.55 far … 1 near
        nodes.push({
          x: ((c + 0.5) / cols) * w + (sr(seed) - 0.5) * (w / cols) * 0.9,
          y: ((r + 0.5) / rows) * h + (sr(seed * 2.1) - 0.5) * (h / rows) * 0.9,
          z,
          r: (1.6 + sr(seed * 3.7) * 2.2) * z,
          phase: sr(seed * 5.3) * Math.PI * 2,
        });
      }
    }

    // --- edges: every node linked to its k nearest neighbours
    edges = [];
    const seen = new Set();
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, preset.k)
        .forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ i, j });
          }
        });
    });

    adjacency = nodes.map(() => []);
    edges.forEach((e, idx) => {
      adjacency[e.i].push(idx);
      adjacency[e.j].push(idx);
    });

    // --- pulses: traffic scales with page height
    const count = Math.round(Math.min(36, Math.max(6, h / 420)) * preset.traffic);
    pulses = [];
    for (let p = 0; p < count; p++) {
      const ei = Math.floor(sr(p * 17.3) * edges.length);
      pulses.push({
        edge: ei,
        from: edges[ei].i,
        t: sr(p * 7.7),
        speed: (0.0018 + sr(p * 3.1) * 0.002) * preset.speed,
      });
    }
  }

  /** Draw everything intersecting [y0, y1]; clip so nothing double-paints. */
  function drawRegion(time, y0, y1, clip) {
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, y1 - y0);
      ctx.clip();
      ctx.clearRect(0, y0, w, y1 - y0);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.line;
    for (const e of edges) {
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (Math.max(a.y, b.y) < y0 || Math.min(a.y, b.y) > y1) continue;
      ctx.globalAlpha = 0.22 + ((a.z + b.z) / 2) * 0.34;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      if (n.y < y0 - 24 || n.y > y1 + 24) continue;
      const breath = REDUCED ? 0.5 : Math.sin(time * 0.0012 + n.phase) * 0.5 + 0.5;
      dot(n.x, n.y, n.r + breath * 1.2, colors.mint, (0.28 + breath * 0.3) * n.z);
      if (n.z > 0.85) halo(n.x, n.y, (n.r + breath) * 2.5, colors.mint, 0.1 + breath * 0.07);
    }

    if (!REDUCED) {
      for (const p of pulses) {
        const e = edges[p.edge];
        const a = nodes[p.from];
        const b = nodes[e.i === p.from ? e.j : e.i];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        if (y >= y0 && y <= y1) {
          dot(x, y, 2.4, colors.lime, Math.sin(p.t * Math.PI) * 0.9);
        }
        p.t += p.speed;
        if (p.t >= 1) {
          // arrived — carry on through the network from this node
          const arrived = e.i === p.from ? e.j : e.i;
          const options = adjacency[arrived];
          p.edge = options[Math.floor(sr(arrived * 3.7 + time) * options.length)] ?? p.edge;
          p.from = arrived;
          p.t = 0;
        }
      }
    }

    if (clip) ctx.restore();
    ctx.globalAlpha = 1;
  }

  function frame(time) {
    const pad = 150;
    drawRegion(time, window.scrollY - pad, window.scrollY + window.innerHeight + pad, true);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || REDUCED) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  let rebuildTimer;
  const rebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      build();
      drawRegion(performance.now(), 0, h, false);
    }, 180);
  };

  window.addEventListener('resize', rebuild);

  // The document grows when FAQ items open or fonts settle — follow it.
  const sizeObserver = new ResizeObserver(() => {
    const docH = document.body.getBoundingClientRect().height;
    if (Math.abs(docH - h) > 40) rebuild();
  });
  sizeObserver.observe(document.body);

  const themeObserver = new MutationObserver(() => {
    colors = readTokens(document.documentElement);
    drawRegion(performance.now(), 0, h, false);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  build();
  drawRegion(0, 0, h, false);
  if (!REDUCED) start();

  return {
    destroy() {
      stop();
      sizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('resize', rebuild);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
