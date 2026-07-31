/**
 * Animated workflow-graph background.
 *
 * Nodes connected by edges, with data pulses travelling along them — a moving
 * picture of what Nour actually builds. Decoration that means something.
 *
 * Rules it obeys:
 *  - honours `prefers-reduced-motion` by drawing the graph once, statically
 *  - stops entirely when the tab is hidden or the canvas scrolls out of view
 *  - never blocks paint: content is already on screen before this runs
 *  - degrades to nothing at all if canvas is unavailable
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Sub-pages run the same graph at a quieter density, so every hero on the
  // site is one visual idea at two volumes.
  const sparse = canvas.dataset.density === 'sparse';

  let nodes = [];
  let edges = [];
  let pulses = [];
  let raf = null;
  let running = false;
  let w = 0;
  let h = 0;
  let colors = readTokens(document.documentElement);

  const COLS = () => (w < 640 ? 3 : w < 1024 ? (sparse ? 3 : 4) : sparse ? 4 : 6);
  const ROWS = () => (sparse ? 2 : w < 640 ? 3 : 4);

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = COLS();
    const rows = ROWS();
    nodes = [];

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // Deterministic jitter keeps the layout stable across resizes.
        const jx = Math.sin((c * 12.9898 + r * 78.233) * 43758.5453) % 1;
        const jy = Math.sin((c * 39.3468 + r * 11.135) * 24634.6345) % 1;
        nodes.push({
          id: `${c}-${r}`,
          col: c,
          x: ((c + 0.5) / cols) * w + jx * (w / cols) * 0.22,
          y: ((r + 0.5) / rows) * h + jy * (h / rows) * 0.26,
          r: 2.5 + Math.abs(jx) * 2,
          phase: Math.abs(jy) * Math.PI * 2,
        });
      }
    }

    // Edges only ever run left → right, like a real pipeline.
    edges = [];
    for (const a of nodes) {
      const next = nodes.filter((n) => n.col === a.col + 1);
      if (!next.length) continue;
      next
        .map((b) => ({ b, d: Math.hypot(b.x - a.x, b.y - a.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 2)
        .forEach(({ b }) => edges.push({ a, b }));
    }

    pulses = edges
      .filter(() => Math.random() > (sparse ? 0.65 : 0.45))
      .map((e) => ({ edge: e, t: Math.random(), speed: 0.0016 + Math.random() * 0.0022 }));
  }

  function draw(time = 0) {
    ctx.clearRect(0, 0, w, h);

    // edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.line;
    ctx.globalAlpha = 0.5;
    for (const { a, b } of edges) {
      const mx = (a.x + b.x) / 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
      ctx.stroke();
    }

    // nodes — a slow breath, not a blink
    ctx.globalAlpha = 1;
    for (const n of nodes) {
      const breath = REDUCED ? 0 : Math.sin(time * 0.0012 + n.phase) * 0.5 + 0.5;
      const radius = n.r + breath * 1.1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.mint;
      ctx.globalAlpha = 0.22 + breath * 0.18;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, radius * 2.6, 0, Math.PI * 2);
      ctx.strokeStyle = colors.mint;
      ctx.globalAlpha = 0.07 + breath * 0.05;
      ctx.stroke();
    }

    // pulses — the data actually moving through the pipeline
    if (!REDUCED) {
      for (const p of pulses) {
        const { a, b } = p.edge;
        const mx = (a.x + b.x) / 2;
        const t = p.t;
        const u = 1 - t;
        // cubic bezier point
        const x = u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x;
        const y = u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y;

        const fade = Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = colors.lime;
        ctx.globalAlpha = fade * 0.85;
        ctx.fill();

        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.speed = 0.0016 + Math.random() * 0.0022;
        }
      }
    }

    ctx.globalAlpha = 1;
  }

  function loop(time) {
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || REDUCED) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // Only animate while actually on screen.
  const io = new IntersectionObserver(
    ([entry]) => (entry.isIntersecting ? start() : stop()),
    { threshold: 0 },
  );
  io.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      draw(performance.now());
    }, 150);
  };
  window.addEventListener('resize', onResize);

  // Theme changes swap the palette underneath us.
  const themeObserver = new MutationObserver(() => {
    colors = readTokens(document.documentElement);
    draw(performance.now());
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  build();
  draw(0);
  if (!REDUCED) start();

  return {
    destroy() {
      stop();
      io.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
