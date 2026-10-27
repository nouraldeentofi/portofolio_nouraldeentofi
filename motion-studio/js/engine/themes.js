// Themes: Nour's four brand themes first, then extra palettes.
// Colors are referenced from elements as '@token' or '@token/0.4' (with alpha).
import { parseColor, rgba } from './util.js';

const BRAND_FONTS = {
  display: ['Figtree', 'IBM Plex Sans Arabic'],
  body: ['Figtree', 'IBM Plex Sans Arabic'],
  mono: ['Cascadia Code', 'JetBrains Mono', 'IBM Plex Sans Arabic'],
};

export const THEMES = [
  {
    id: 'night', name: 'ليل', en: 'Night', group: 'brand', dark: true,
    c: {
      bg: '#0F1216', bg2: '#151A21', card: '#151A21', raised: '#1C232D', fg: '#EEF2F6', muted: 'rgba(238,242,246,0.72)',
      accent: '#B8FF5C', secondary: '#5CE1A9', ink: '#10281A', line: 'rgba(238,242,246,0.12)',
      glowA: 'rgba(184,255,92,0.13)', glowB: 'rgba(92,225,169,0.11)',
      meshNode: '#5CE1A9', meshLine: '#EEF2F6', meshPulse: '#B8FF5C',
    },
    mesh: { alpha: 0.72, line: 0.22, glows: true },
    fonts: BRAND_FONTS,
  },
  {
    id: 'day', name: 'نهار', en: 'Day', group: 'brand', dark: false,
    c: {
      bg: '#F7F9FB', bg2: '#EEF2F6', card: '#FFFFFF', raised: '#EEF2F6', fg: '#101820', muted: '#3A4450',
      accent: '#3F7D10', secondary: '#0F7A58', ink: '#FFFFFF', line: 'rgba(16,24,32,0.12)',
      marker: '#B8FF5C', markerInk: '#10281A',
      window: '#0F1216', windowFg: '#EEF2F6', windowAccent: '#B8FF5C',
      glowA: 'rgba(63,125,16,0.13)', glowB: 'rgba(15,122,88,0.11)',
      meshNode: '#0F7A58', meshLine: '#101820', meshPulse: '#3F7D10',
    },
    mesh: { alpha: 0.72, line: 0.26, glows: true },
    fonts: BRAND_FONTS,
  },
  {
    id: 'forest', name: 'غابة', en: 'Forest', group: 'brand', dark: true,
    c: {
      bg: '#0E241B', bg2: '#143226', card: '#143226', raised: '#1A3D2F', fg: '#E8F3EC', muted: '#A9C4B5',
      accent: '#B8FF5C', secondary: '#7FD9B0', ink: '#10281A', line: 'rgba(232,243,236,0.12)',
      glowA: 'rgba(184,255,92,0.10)', glowB: 'rgba(127,217,176,0.12)',
      meshNode: '#7FD9B0', meshLine: '#E8F3EC', meshPulse: '#B8FF5C',
    },
    mesh: { alpha: 0.72, line: 0.22, glows: true },
    fonts: BRAND_FONTS,
  },
  {
    id: 'signal', name: 'إشارة', en: 'Signal', group: 'brand', dark: false,
    c: {
      bg: '#B8FF5C', bg2: '#A8F04A', card: '#0F1216', raised: '#0F1216', fg: '#10281A', muted: 'rgba(16,40,26,0.72)',
      accent: '#10281A', secondary: '#10281A', ink: '#B8FF5C', line: 'rgba(16,40,26,0.14)',
      window: '#0F1216', windowFg: '#EEF2F6', windowAccent: '#B8FF5C',
      glowA: 'rgba(16,40,26,0)', glowB: 'rgba(16,40,26,0)',
      meshNode: '#10281A', meshLine: '#10281A', meshPulse: '#0F1216',
    },
    mesh: { alpha: 0.5, line: 0.3, glows: false },
    fonts: BRAND_FONTS,
  },
  {
    id: 'ocean', name: 'محيط', en: 'Ocean', group: 'extra', dark: true,
    c: {
      bg: '#08131F', bg2: '#0D2235', card: '#10202F', raised: '#16293B', fg: '#EAF4FF', muted: 'rgba(234,244,255,0.7)',
      accent: '#4CC9F0', secondary: '#7B8CFF', ink: '#04121C',
    },
    fonts: { display: ['Sora', 'Readex Pro'], body: ['Sora', 'Readex Pro'], mono: ['JetBrains Mono', 'Readex Pro'] },
  },
  {
    id: 'aurora', name: 'شفق', en: 'Aurora', group: 'extra', dark: true,
    c: {
      bg: '#050816', bg2: '#0B1030', card: '#0E1330', raised: '#151B40', fg: '#EDF0FF', muted: 'rgba(237,240,255,0.7)',
      accent: '#7CFFCB', secondary: '#A78BFA', ink: '#03140D',
    },
    fonts: { display: ['Sora', 'Alexandria'], body: ['Sora', 'Alexandria'], mono: ['JetBrains Mono', 'Alexandria'] },
  },
  {
    id: 'sunset', name: 'غروب', en: 'Sunset', group: 'extra', dark: true,
    c: {
      bg: '#1A0E12', bg2: '#2A1218', card: '#24141A', raised: '#301A22', fg: '#FFF1EA', muted: 'rgba(255,241,234,0.72)',
      accent: '#FF7A50', secondary: '#FFC65C', ink: '#2A0E05',
    },
    fonts: { display: ['Outfit', 'Cairo'], body: ['Outfit', 'Cairo'], mono: ['JetBrains Mono', 'Cairo'] },
  },
  {
    id: 'neon', name: 'نيون', en: 'Neon', group: 'extra', dark: true,
    c: {
      bg: '#07060F', bg2: '#120A26', card: '#110E22', raised: '#1A1530', fg: '#F4F0FF', muted: 'rgba(244,240,255,0.7)',
      accent: '#FF3EA5', secondary: '#33E1FF', ink: '#23021A',
    },
    fonts: { display: ['Unbounded', 'Changa'], body: ['Outfit', 'Changa'], mono: ['JetBrains Mono', 'Changa'] },
  },
  {
    id: 'royal', name: 'ملكي', en: 'Royal', group: 'extra', dark: true,
    c: {
      bg: '#110D22', bg2: '#1C1638', card: '#191431', raised: '#221B40', fg: '#F3EEFF', muted: 'rgba(243,238,255,0.7)',
      accent: '#C9A8FF', secondary: '#FFD37A', ink: '#1B0F3A',
    },
    fonts: { display: ['Playfair Display', 'El Messiri'], body: ['Figtree', 'El Messiri'], mono: ['JetBrains Mono', 'El Messiri'] },
  },
  {
    id: 'emerald', name: 'زمرد', en: 'Emerald', group: 'extra', dark: true,
    c: {
      bg: '#06201B', bg2: '#0A2E27', card: '#0C2A23', raised: '#12352D', fg: '#EFF8F3', muted: 'rgba(239,248,243,0.7)',
      accent: '#E8C468', secondary: '#4FD1A5', ink: '#2A1E02',
    },
    fonts: { display: ['Space Grotesk', 'Alexandria'], body: ['Space Grotesk', 'Alexandria'], mono: ['JetBrains Mono', 'Alexandria'] },
  },
  {
    id: 'desert', name: 'صحراء', en: 'Desert', group: 'extra', dark: true,
    c: {
      bg: '#1E1610', bg2: '#2C2016', card: '#271D15', raised: '#33261C', fg: '#FBEFDF', muted: 'rgba(251,239,223,0.7)',
      accent: '#F2B266', secondary: '#E07A5F', ink: '#2A1704',
    },
    fonts: { display: ['Syne', 'Reem Kufi'], body: ['Manrope', 'Tajawal'], mono: ['JetBrains Mono', 'Tajawal'] },
  },
  {
    id: 'crimson', name: 'قرمزي', en: 'Crimson', group: 'extra', dark: true,
    c: {
      bg: '#12080A', bg2: '#220C10', card: '#1C0D11', raised: '#261318', fg: '#FFEDEF', muted: 'rgba(255,237,239,0.7)',
      accent: '#FF4D5E', secondary: '#FFB4A2', ink: '#2A0308',
    },
    fonts: { display: ['Montserrat', 'Noto Kufi Arabic'], body: ['Montserrat', 'Noto Kufi Arabic'], mono: ['JetBrains Mono', 'Noto Kufi Arabic'] },
  },
  {
    id: 'coffee', name: 'قهوة', en: 'Coffee', group: 'extra', dark: true,
    c: {
      bg: '#17110E', bg2: '#231A15', card: '#201814', raised: '#2B211B', fg: '#F6ECE3', muted: 'rgba(246,236,227,0.7)',
      accent: '#D9A066', secondary: '#9CC5A1', ink: '#23140A',
    },
    fonts: { display: ['DM Serif Display', 'Amiri'], body: ['Figtree', 'IBM Plex Sans Arabic'], mono: ['JetBrains Mono', 'IBM Plex Sans Arabic'] },
  },
  {
    id: 'matrix', name: 'ماتريكس', en: 'Matrix', group: 'extra', dark: true,
    c: {
      bg: '#020804', bg2: '#04140A', card: '#061209', raised: '#0A1C10', fg: '#D7FFE0', muted: 'rgba(215,255,224,0.65)',
      accent: '#39FF6A', secondary: '#00C2A8', ink: '#021006',
    },
    fonts: { display: ['Space Mono', 'Kufam'], body: ['JetBrains Mono', 'Kufam'], mono: ['JetBrains Mono', 'Kufam'] },
  },
  {
    id: 'mono', name: 'أبيض وأسود', en: 'Mono', group: 'extra', dark: true,
    c: {
      bg: '#0B0B0C', bg2: '#161618', card: '#141416', raised: '#1D1D20', fg: '#F5F5F5', muted: 'rgba(245,245,245,0.62)',
      accent: '#FFFFFF', secondary: '#9A9A9A', ink: '#0B0B0C',
    },
    fonts: { display: ['Inter', 'IBM Plex Sans Arabic'], body: ['Inter', 'IBM Plex Sans Arabic'], mono: ['JetBrains Mono', 'IBM Plex Sans Arabic'] },
  },
  {
    id: 'paper', name: 'ورق', en: 'Paper', group: 'extra', dark: false,
    c: {
      bg: '#FBFAF7', bg2: '#EFEDE7', card: '#FFFFFF', raised: '#F2F0EA', fg: '#141414', muted: '#55524C',
      accent: '#E4572E', secondary: '#1F4E79', ink: '#FFFFFF',
    },
    fonts: { display: ['DM Serif Display', 'Noto Naskh Arabic'], body: ['Figtree', 'IBM Plex Sans Arabic'], mono: ['JetBrains Mono', 'IBM Plex Sans Arabic'] },
  },
  {
    id: 'arctic', name: 'جليد', en: 'Arctic', group: 'extra', dark: false,
    c: {
      bg: '#F1F6FB', bg2: '#E2ECF6', card: '#FFFFFF', raised: '#E8F0F8', fg: '#0B2540', muted: '#3D5672',
      accent: '#0A66FF', secondary: '#00A3A3', ink: '#FFFFFF',
    },
    fonts: { display: ['Manrope', 'Tajawal'], body: ['Manrope', 'Tajawal'], mono: ['JetBrains Mono', 'Tajawal'] },
  },
  {
    id: 'lavender', name: 'لافندر', en: 'Lavender', group: 'extra', dark: false,
    c: {
      bg: '#F6F4FF', bg2: '#ECE8FF', card: '#FFFFFF', raised: '#EEEAFE', fg: '#1D1642', muted: '#4D4675',
      accent: '#6A4BFF', secondary: '#E0559A', ink: '#FFFFFF',
    },
    fonts: { display: ['Poppins', 'Cairo'], body: ['Poppins', 'Cairo'], mono: ['JetBrains Mono', 'Cairo'] },
  },
  {
    id: 'candy', name: 'حلوى', en: 'Candy', group: 'extra', dark: false,
    c: {
      bg: '#FFF1F6', bg2: '#FFE1EC', card: '#FFFFFF', raised: '#FFE8F0', fg: '#2A0B1E', muted: '#6B4A5C',
      accent: '#E2367A', secondary: '#6C5CE7', ink: '#FFFFFF',
    },
    fonts: { display: ['Bricolage Grotesque', 'Lemonada'], body: ['Bricolage Grotesque', 'Cairo'], mono: ['JetBrains Mono', 'Cairo'] },
  },
  {
    id: 'bolt', name: 'أصفر جريء', en: 'Bolt', group: 'extra', dark: false,
    c: {
      bg: '#FFD60A', bg2: '#FFC300', card: '#111111', raised: '#1C1C1C', fg: '#111111', muted: 'rgba(17,17,17,0.72)',
      accent: '#111111', secondary: '#E8341C', ink: '#FFD60A', window: '#111111', windowFg: '#FFFFFF', windowAccent: '#FFD60A',
    },
    fonts: { display: ['Anton', 'Lalezar'], body: ['Inter', 'Cairo'], mono: ['JetBrains Mono', 'Cairo'] },
  },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// Editable token list shown in the colour panel.
export const TOKENS = [
  ['bg', 'الخلفية'], ['bg2', 'خلفية ثانية'], ['card', 'البطاقات'], ['fg', 'النص'], ['muted', 'نص خافت'],
  ['accent', 'اللون الأساسي'], ['secondary', 'اللون الثانوي'], ['ink', 'نص فوق الأساسي'],
];

// Fully resolved theme for a project (base theme + user overrides).
export function resolveTheme(project) {
  const base = THEME_BY_ID[project.theme] || THEMES[0];
  const o = project.themeOverrides || {};
  const c = { ...base.c, ...(o.colors || {}) };
  const dark = base.dark;
  c.line = c.line || rgba(c.fg, 0.12);
  c.window = (o.colors && o.colors.window) || base.c.window || c.card;
  c.windowFg = base.c.windowFg || c.fg;
  c.windowAccent = base.c.windowAccent || c.accent;
  c.marker = base.c.marker && !(o.colors && o.colors.accent) ? base.c.marker : c.marker || c.accent;
  c.markerInk = base.c.markerInk && !(o.colors && o.colors.accent) ? base.c.markerInk : c.markerInk || c.ink;
  c.glowA = o.colors && o.colors.accent ? rgba(c.accent, 0.13) : base.c.glowA || rgba(c.accent, 0.14);
  c.glowB = o.colors && o.colors.secondary ? rgba(c.secondary, 0.11) : base.c.glowB || rgba(c.secondary, 0.12);
  c.meshNode = (o.colors && o.colors.secondary) || base.c.meshNode || c.secondary;
  c.meshLine = base.c.meshLine || c.fg;
  c.meshPulse = (o.colors && o.colors.accent) || base.c.meshPulse || c.accent;
  c.white = '#FFFFFF';
  c.black = '#000000';
  const fonts = {
    display: (o.fonts && o.fonts.display) || base.fonts.display,
    body: (o.fonts && o.fonts.body) || base.fonts.body,
    mono: (o.fonts && o.fonts.mono) || base.fonts.mono,
  };
  return {
    id: base.id,
    dark,
    c,
    mesh: base.mesh || { alpha: 0.7, line: 0.22, glows: true },
    fonts,
  };
}

export function color(spec, theme, fallback = '#000') {
  if (spec == null || spec === '') return fallback;
  if (typeof spec !== 'string') return fallback;
  if (spec[0] !== '@') return spec;
  const slash = spec.indexOf('/');
  const key = slash > 0 ? spec.slice(1, slash) : spec.slice(1);
  const a = slash > 0 ? parseFloat(spec.slice(slash + 1)) : 1;
  const base = theme.c[key];
  if (!base) return fallback;
  return a === 1 ? base : rgba(base, a);
}

// Font handling -------------------------------------------------------------
export const SINGLE_WEIGHT = new Set(['Anton', 'Bebas Neue', 'Lalezar', 'Rakkas', 'DM Serif Display', 'Instrument Serif', 'Archivo Black']);

export function fontStack(spec, theme) {
  let fams;
  if (!spec || spec === '@display') fams = theme.fonts.display;
  else if (spec === '@body') fams = theme.fonts.body;
  else if (spec === '@mono') fams = theme.fonts.mono;
  else fams = [spec, theme.fonts.display[theme.fonts.display.length - 1]];
  return fams;
}
export function fontString(spec, theme, weight, px) {
  const fams = fontStack(spec, theme);
  const w = SINGLE_WEIGHT.has(fams[0]) ? 400 : weight || 400;
  return `${w} ${Math.max(1, px).toFixed(2)}px ${fams.map((f) => `"${f}"`).join(', ')}, system-ui, sans-serif`;
}

// a readable text colour on top of any fill
export function contrastOn(fill) {
  const p = parseColor(fill);
  const l = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
  return l > 150 ? '#10181F' : '#FFFFFF';
}
