// Google Fonts catalogue + on-demand loader.
// q = the css2 "family=" value (weights verified against Google Fonts).

export const FONTS = [
  // Latin / English
  { f: 'Figtree', q: 'Figtree:wght@300..900', ar: false },
  { f: 'Inter', q: 'Inter:wght@300..900', ar: false },
  { f: 'Sora', q: 'Sora:wght@300..800', ar: false },
  { f: 'Outfit', q: 'Outfit:wght@300..900', ar: false },
  { f: 'Space Grotesk', q: 'Space+Grotesk:wght@300..700', ar: false },
  { f: 'Syne', q: 'Syne:wght@400..800', ar: false },
  { f: 'Unbounded', q: 'Unbounded:wght@300..900', ar: false },
  { f: 'Bricolage Grotesque', q: 'Bricolage+Grotesque:wght@300..800', ar: false },
  { f: 'Manrope', q: 'Manrope:wght@300..800', ar: false },
  { f: 'Poppins', q: 'Poppins:wght@300;400;600;700;800;900', ar: false },
  { f: 'Montserrat', q: 'Montserrat:wght@300..900', ar: false },
  { f: 'Playfair Display', q: 'Playfair+Display:wght@400..900', ar: false },
  { f: 'DM Serif Display', q: 'DM+Serif+Display', ar: false },
  { f: 'Instrument Serif', q: 'Instrument+Serif', ar: false },
  { f: 'Bebas Neue', q: 'Bebas+Neue', ar: false },
  { f: 'Anton', q: 'Anton', ar: false },
  { f: 'Archivo Black', q: 'Archivo+Black', ar: false },
  { f: 'Space Mono', q: 'Space+Mono:wght@400;700', ar: false },
  { f: 'JetBrains Mono', q: 'JetBrains+Mono:wght@300..800', ar: false },
  { f: 'Fira Code', q: 'Fira+Code:wght@300..700', ar: false },
  // Arabic
  { f: 'IBM Plex Sans Arabic', q: 'IBM+Plex+Sans+Arabic:wght@300;400;500;600;700', ar: true },
  { f: 'Cairo', q: 'Cairo:wght@300..900', ar: true },
  { f: 'Tajawal', q: 'Tajawal:wght@300;400;500;700;800;900', ar: true },
  { f: 'Almarai', q: 'Almarai:wght@300;400;700;800', ar: true },
  { f: 'Changa', q: 'Changa:wght@300..800', ar: true },
  { f: 'Readex Pro', q: 'Readex+Pro:wght@300..700', ar: true },
  { f: 'Alexandria', q: 'Alexandria:wght@300..900', ar: true },
  { f: 'Noto Kufi Arabic', q: 'Noto+Kufi+Arabic:wght@300..900', ar: true },
  { f: 'Kufam', q: 'Kufam:wght@400..900', ar: true },
  { f: 'El Messiri', q: 'El+Messiri:wght@400..700', ar: true },
  { f: 'Reem Kufi', q: 'Reem+Kufi:wght@400..700', ar: true },
  { f: 'Noto Naskh Arabic', q: 'Noto+Naskh+Arabic:wght@400..700', ar: true },
  { f: 'Amiri', q: 'Amiri:wght@400;700', ar: true },
  { f: 'Aref Ruqaa', q: 'Aref+Ruqaa:wght@400;700', ar: true },
  { f: 'Lemonada', q: 'Lemonada:wght@300..700', ar: true },
  { f: 'Marhey', q: 'Marhey:wght@300..700', ar: true },
  { f: 'Lalezar', q: 'Lalezar', ar: true },
  { f: 'Rakkas', q: 'Rakkas', ar: true },
  { f: 'Vazirmatn', q: 'Vazirmatn:wght@300..900', ar: true },
];
export const FONT_BY_NAME = Object.fromEntries(FONTS.map((x) => [x.f, x]));

const requested = new Set();
const ready = new Map();

function inject(name) {
  const meta = FONT_BY_NAME[name];
  if (!meta || requested.has(name) || typeof document === 'undefined') return;
  requested.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${meta.q}&display=swap`;
  document.head.appendChild(link);
}

// Ensures a family is downloaded for Latin + Arabic glyphs before canvas use.
export function loadFont(name) {
  if (!FONT_BY_NAME[name]) return Promise.resolve();
  if (ready.has(name)) return ready.get(name);
  inject(name);
  const meta = FONT_BY_NAME[name];
  const weights = meta.q.includes('wght') ? [400, 700] : [400];
  const samples = meta.ar ? ['Aa1', 'نور'] : ['Aa1'];
  const p = (async () => {
    if (typeof document === 'undefined' || !document.fonts) return;
    // the stylesheet has to arrive before fonts.load can match a face
    for (let i = 0; i < 40; i++) {
      const jobs = [];
      for (const w of weights) for (const s of samples) jobs.push(document.fonts.load(`${w} 40px "${name}"`, s));
      const res = await Promise.all(jobs).catch(() => []);
      if (res.some((r) => r && r.length)) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  })();
  ready.set(name, p);
  return p;
}

export function loadFonts(names) {
  return Promise.all([...new Set(names)].filter(Boolean).map(loadFont));
}
