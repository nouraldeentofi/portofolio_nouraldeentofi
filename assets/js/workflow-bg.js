/**
 * Animated hero backgrounds — one visual family, seven variants.
 *
 * Every page draws the same language (nodes, edges, pulses, lime/mint) but
 * with its own metaphor, chosen via `data-variant` on the canvas:
 *
 *   graph  — home:       a full workflow pipeline, data pulsing left→right
 *   orbit  — about:      skills in slow orbit around a centre
 *   flow   — work:       one career line with milestone nodes and branches
 *   grid   — projects:   a wall of nodes lighting up in waves
 *   branch — automation: an IF-tree; pulses pick a route at every junction
 *   drift  — chat:       loose particles that link up when they meet
 *   signal — contact:    a source broadcasting rings to receivers
 *
 * Rules every variant obeys:
 *  - honours `prefers-reduced-motion` by drawing one static frame
 *  - stops when the tab is hidden or the canvas leaves the viewport
 *  - mirrors horizontally on RTL pages, so pipelines flow right→left
 *  - never blocks paint, never captures the pointer, degrades to nothing
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const RTL = document.documentElement.dir === 'rtl';

/** Deterministic pseudo-random in [0,1) — stable across resizes. */
const sr = (n) => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

/** Point on the S-curve between two nodes, as used by pipeline edges. */
function bezPoint(a, b, t) {
  const mx = (a.x + b.x) / 2;
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y,
  };
}

function edgePath(ctx, a, b) {
  const mx = (a.x + b.x) / 2;
  ctx.moveTo(a.x, a.y);
  ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
}

function dot(ctx, x, y, r, color, alpha) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
}

function ring(ctx, x, y, r, color, alpha) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.stroke();
}

/* ===================================================================== */
/* Variants                                                              */
/* ===================================================================== */

const VARIANTS = {
  /* ------------------------------------------------ graph (home) ----- */
  graph: {
    build(w, h) {
      const cols = w < 640 ? 3 : w < 1024 ? 4 : 6;
      const rows = w < 640 ? 3 : 4;
      const nodes = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const jx = sr(c * 12.99 + r * 78.23) - 0.5;
          const jy = sr(c * 39.35 + r * 11.14) - 0.5;
          nodes.push({
            col: c,
            x: ((c + 0.5) / cols) * w + jx * (w / cols) * 0.44,
            y: ((r + 0.5) / rows) * h + jy * (h / rows) * 0.52,
            r: 2.5 + sr(c * 7 + r) * 2,
            phase: sr(c + r * 13) * Math.PI * 2,
          });
        }
      }
      const edges = [];
      for (const a of nodes) {
        nodes
          .filter((n) => n.col === a.col + 1)
          .map((b) => ({ b, d: Math.hypot(b.x - a.x, b.y - a.y) }))
          .sort((p, q) => p.d - q.d)
          .slice(0, 2)
          .forEach(({ b }) => edges.push({ a, b }));
      }
      const pulses = edges
        .filter((_, i) => sr(i * 3.7) > 0.45)
        .map((e, i) => ({ edge: e, t: sr(i * 9.1), speed: 0.0016 + sr(i * 5.3) * 0.0022 }));
      return { nodes, edges, pulses };
    },
    draw(ctx, s, time, colors) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (const { a, b } of s.edges) edgePath(ctx, a, b);
      ctx.stroke();

      for (const n of s.nodes) {
        const breath = REDUCED ? 0.5 : Math.sin(time * 0.0012 + n.phase) * 0.5 + 0.5;
        dot(ctx, n.x, n.y, n.r + breath * 1.1, colors.mint, 0.22 + breath * 0.18);
        ring(ctx, n.x, n.y, (n.r + breath * 1.1) * 2.6, colors.mint, 0.07 + breath * 0.05);
      }

      if (!REDUCED) {
        for (const p of s.pulses) {
          const { x, y } = bezPoint(p.edge.a, p.edge.b, p.t);
          dot(ctx, x, y, 2.2, colors.lime, Math.sin(p.t * Math.PI) * 0.85);
          p.t += p.speed;
          if (p.t > 1) p.t = 0;
        }
      }
    },
  },

  /* ------------------------------------------------ orbit (about) ---- */
  orbit: {
    build(w, h) {
      const cx = w * 0.5;
      const cy = h * 0.45;
      const base = Math.min(w, h);
      const rings = [0.34, 0.58, 0.85].map((f, i) => ({
        radius: base * f * 0.42,
        count: 6 + i * 4,
        speed: (i % 2 ? -1 : 1) * (0.00005 + i * 0.00003),
        offset: sr(i * 17) * Math.PI * 2,
      }));
      return { cx, cy, rings };
    },
    draw(ctx, s, time, colors) {
      ctx.lineWidth = 1;
      dot(ctx, s.cx, s.cy, 4, colors.lime, 0.6);
      ring(ctx, s.cx, s.cy, 9, colors.lime, 0.2);

      for (const [i, r] of s.rings.entries()) {
        ring(ctx, s.cx, s.cy, r.radius, colors.line, 0.35);

        for (let k = 0; k < r.count; k++) {
          const ang = r.offset + (k / r.count) * Math.PI * 2 + time * r.speed;
          const x = s.cx + Math.cos(ang) * r.radius;
          const y = s.cy + Math.sin(ang) * r.radius;
          const breath = REDUCED ? 0.5 : Math.sin(time * 0.001 + k * 1.7 + i) * 0.5 + 0.5;
          dot(ctx, x, y, 2 + breath * 1.4, colors.mint, 0.2 + breath * 0.2);
        }

        if (!REDUCED) {
          // one bright satellite per ring, trailing a faint arc
          const ang = r.offset + time * r.speed * 7;
          ctx.beginPath();
          ctx.arc(s.cx, s.cy, r.radius, ang - 0.55, ang);
          ctx.strokeStyle = colors.lime;
          ctx.globalAlpha = 0.25;
          ctx.stroke();
          dot(ctx, s.cx + Math.cos(ang) * r.radius, s.cy + Math.sin(ang) * r.radius, 2.4, colors.lime, 0.8);
        }
      }
    },
  },

  /* ------------------------------------------------ flow (work) ------ */
  flow: {
    build(w, h) {
      const count = 7;
      const points = [];
      for (let i = 0; i < count; i++) {
        points.push({
          x: (i / (count - 1)) * w,
          y: h * 0.55 + (sr(i * 23.7) - 0.5) * h * 0.24,
        });
      }
      const lengths = [0];
      for (let i = 1; i < count; i++) {
        lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
      }
      const branches = points
        .filter((_, i) => i > 0 && i < count - 1 && sr(i * 31.1) > 0.4)
        .map((p, i) => ({
          from: p,
          to: { x: p.x + (sr(i * 7.7) - 0.5) * w * 0.06, y: p.y + (sr(i * 13.3) > 0.5 ? -1 : 1) * h * 0.2 },
        }));
      const pulses = [0, 1, 2].map((i) => ({ t: i / 3, speed: 0.00042 + sr(i * 11) * 0.0003 }));
      return { points, lengths, total: lengths[lengths.length - 1], branches, pulses };
    },
    draw(ctx, s, time, colors) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length - 1; i++) {
        const mx = (s.points[i].x + s.points[i + 1].x) / 2;
        const my = (s.points[i].y + s.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(s.points[i].x, s.points[i].y, mx, my);
      }
      ctx.lineTo(s.points.at(-1).x, s.points.at(-1).y);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (const b of s.branches) {
        ctx.moveTo(b.from.x, b.from.y);
        ctx.lineTo(b.to.x, b.to.y);
      }
      ctx.stroke();
      for (const b of s.branches) dot(ctx, b.to.x, b.to.y, 2, colors.mint, 0.3);

      for (const [i, p] of s.points.entries()) {
        const breath = REDUCED ? 0.5 : Math.sin(time * 0.0011 + i * 1.9) * 0.5 + 0.5;
        dot(ctx, p.x, p.y, 3 + breath * 1.6, colors.mint, 0.3 + breath * 0.25);
      }

      if (!REDUCED) {
        for (const p of s.pulses) {
          const target = p.t * s.total;
          let i = 1;
          while (i < s.lengths.length - 1 && s.lengths[i] < target) i++;
          const seg = (target - s.lengths[i - 1]) / (s.lengths[i] - s.lengths[i - 1] || 1);
          const x = s.points[i - 1].x + (s.points[i].x - s.points[i - 1].x) * seg;
          const y = s.points[i - 1].y + (s.points[i].y - s.points[i - 1].y) * seg;
          dot(ctx, x, y, 2.4, colors.lime, 0.85);
          p.t += p.speed;
          if (p.t > 1) p.t = 0;
        }
      }
    },
  },

  /* ------------------------------------------------ grid (projects) -- */
  grid: {
    build(w, h) {
      const cols = w < 640 ? 5 : 8;
      const rows = 4;
      const nodes = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          nodes.push({
            col: c,
            row: r,
            x: ((c + 0.5) / cols) * w + (sr(c * 3.3 + r * 9.9) - 0.5) * 10,
            y: ((r + 0.5) / rows) * h + (sr(c * 8.1 + r * 2.7) - 0.5) * 10,
            phase: sr(c * 5 + r * 3) * Math.PI * 2,
          });
        }
      }
      return { nodes, cols, rows };
    },
    draw(ctx, s, time, colors) {
      const at = (c, r) => s.nodes[c * s.rows + r];
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (const n of s.nodes) {
        const right = n.col < s.cols - 1 ? at(n.col + 1, n.row) : null;
        const down = n.row < s.rows - 1 ? at(n.col, n.row + 1) : null;
        if (right) { ctx.moveTo(n.x, n.y); ctx.lineTo(right.x, right.y); }
        if (down) { ctx.moveTo(n.x, n.y); ctx.lineTo(down.x, down.y); }
      }
      ctx.stroke();

      for (const n of s.nodes) {
        // a diagonal wave of activation sweeps the wall
        const a = REDUCED ? 0.5 : Math.sin(time * 0.0012 - (n.col + n.row) * 0.55) * 0.5 + 0.5;
        dot(ctx, n.x, n.y, 2 + a * 1.6, colors.mint, 0.12 + a * 0.3);
        if (!REDUCED && Math.sin(time * 0.0007 + n.phase * 7) > 0.985) {
          ring(ctx, n.x, n.y, 8, colors.lime, 0.5);
        }
      }
    },
  },

  /* ------------------------------------------------ branch (automation) */
  branch: {
    build(w, h) {
      const levels = [];
      for (let i = 0; i < 4; i++) {
        const count = 1 << i;
        const x = w * (0.1 + i * 0.27);
        const span = h * (0.18 + i * 0.24);
        const nodes = [];
        for (let j = 0; j < count; j++) {
          nodes.push({
            x,
            y: h * 0.5 + (count === 1 ? 0 : (j - (count - 1) / 2) * (span / (count - 1))),
            phase: sr(i * 7 + j * 3) * Math.PI * 2,
          });
        }
        levels.push(nodes);
      }
      const pulses = [0, 1, 2, 3].map((i) => ({
        leaf: Math.floor(sr(i * 4.2) * 8),
        t: sr(i * 6.6),
        speed: 0.0011 + sr(i * 2.9) * 0.0012,
      }));
      return { levels, pulses };
    },
    draw(ctx, s, time, colors) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        for (const [j, a] of s.levels[i].entries()) {
          edgePath(ctx, a, s.levels[i + 1][j * 2]);
          edgePath(ctx, a, s.levels[i + 1][j * 2 + 1]);
        }
      }
      ctx.stroke();

      for (const [i, level] of s.levels.entries()) {
        for (const n of level) {
          const breath = REDUCED ? 0.5 : Math.sin(time * 0.0012 + n.phase) * 0.5 + 0.5;
          const r = i === 0 ? 4 : 3 - i * 0.4;
          dot(ctx, n.x, n.y, r + breath, colors.mint, 0.25 + breath * 0.2);
        }
      }

      if (!REDUCED) {
        for (const p of s.pulses) {
          // route root → leaf: at every junction the pulse takes its branch,
          // exactly like an IF node routing a document
          const seg = Math.min(Math.floor(p.t * 3), 2);
          const local = p.t * 3 - seg;
          const a = s.levels[seg][p.leaf >> (3 - seg)];
          const b = s.levels[seg + 1][p.leaf >> (2 - seg)];
          const { x, y } = bezPoint(a, b, local);
          dot(ctx, x, y, 2.3, colors.lime, 0.85);
          if (local < 0.08) ring(ctx, a.x, a.y, 7, colors.lime, 0.4);
          p.t += p.speed;
          if (p.t > 1) {
            p.t = 0;
            p.leaf = Math.floor(sr(performance.now()) * 8);
          }
        }
      }
    },
  },

  /* ------------------------------------------------ drift (chat) ----- */
  drift: {
    build(w, h) {
      const count = w < 640 ? 16 : 26;
      const parts = [];
      for (let i = 0; i < count; i++) {
        parts.push({
          x: sr(i * 12.9) * w,
          y: sr(i * 78.2) * h,
          vy: -(0.006 + sr(i * 3.7) * 0.012),
          drift: sr(i * 9.4) * Math.PI * 2,
          r: 1.5 + sr(i * 5.1) * 1.5,
        });
      }
      return { parts, linkDist: Math.min(w, h) * 0.2, last: 0 };
    },
    draw(ctx, s, time, colors, w, h) {
      const dt = REDUCED ? 0 : Math.min(time - s.last || 16, 50);
      s.last = time;

      for (const p of s.parts) {
        p.y += p.vy * dt;
        p.x += Math.sin(time * 0.0004 + p.drift) * 0.08 * dt * 0.06;
        if (p.y < -12) { p.y = h + 12; p.x = sr(p.x + time) * w; }
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.mint;
      for (let i = 0; i < s.parts.length; i++) {
        for (let j = i + 1; j < s.parts.length; j++) {
          const a = s.parts[i];
          const b = s.parts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < s.linkDist) {
            ctx.globalAlpha = (1 - d / s.linkDist) * 0.14;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of s.parts) {
        const breath = REDUCED ? 0.5 : Math.sin(time * 0.001 + p.drift) * 0.5 + 0.5;
        dot(ctx, p.x, p.y, p.r + breath * 0.8, colors.mint, 0.2 + breath * 0.2);
      }
    },
  },

  /* ------------------------------------------------ signal (contact) - */
  signal: {
    build(w, h) {
      const source = { x: w * 0.12, y: h * 0.6 };
      const receivers = [];
      for (let i = 0; i < 5; i++) {
        receivers.push({
          x: w * (0.4 + sr(i * 21.7) * 0.55),
          y: h * (0.15 + sr(i * 47.3) * 0.7),
        });
      }
      const maxR = Math.max(...receivers.map((r) => Math.hypot(r.x - source.x, r.y - source.y))) + 40;
      return { source, receivers, maxR, period: 2600 };
    },
    draw(ctx, s, time, colors) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (const r of s.receivers) {
        ctx.moveTo(s.source.x, s.source.y);
        ctx.lineTo(r.x, r.y);
      }
      ctx.stroke();

      const breath = REDUCED ? 0.5 : Math.sin(time * 0.002) * 0.5 + 0.5;
      dot(ctx, s.source.x, s.source.y, 4 + breath * 1.5, colors.lime, 0.7);

      for (let k = 0; k < 3; k++) {
        const rr = (((REDUCED ? k * 900 : time) + (k * s.period) / 3) % s.period) / s.period * s.maxR;
        ring(ctx, s.source.x, s.source.y, rr, colors.mint, Math.max(0, (1 - rr / s.maxR)) * 0.3);

        for (const r of s.receivers) {
          const d = Math.hypot(r.x - s.source.x, r.y - s.source.y);
          if (Math.abs(d - rr) < 14) {
            dot(ctx, r.x, r.y, 3.4, colors.lime, 0.8);
            ring(ctx, r.x, r.y, 8, colors.lime, 0.3);
          }
        }
      }

      for (const r of s.receivers) dot(ctx, r.x, r.y, 2.4, colors.mint, 0.35);
    },
  },
};

/* ===================================================================== */
/* Shared runner                                                         */
/* ===================================================================== */

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

  const variant = VARIANTS[canvas.dataset.variant] ?? VARIANTS.graph;

  let state = null;
  let raf = null;
  let running = false;
  let w = 0;
  let h = 0;
  let colors = readTokens(document.documentElement);

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state = variant.build(w, h);
  }

  function draw(time = 0) {
    ctx.clearRect(0, 0, w, h);
    if (RTL) {
      // pipelines flow right→left in Arabic
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    variant.draw(ctx, state, time, colors, w, h);
    if (RTL) ctx.restore();
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

  const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0 });
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
