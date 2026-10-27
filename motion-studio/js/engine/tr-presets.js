// Named transition presets: id -> family + params. Ids are stable (saved in projects).
const AR = { left: '←', right: '→', up: '↑', down: '↓', upleft: '↖', upright: '↗', downleft: '↙', downright: '↘' };
const DIR8 = ['left', 'right', 'up', 'down', 'upleft', 'upright', 'downleft', 'downright'];
const DIR4 = ['left', 'right', 'up', 'down'];
// wipe angle (deg) -> arrow of travel
const ANG = [[0, '→'], [45, '↘'], [90, '↓'], [135, '↙'], [180, '←'], [225, '↖'], [270, '↑'], [315, '↗']];
const CORNERS = [['tl', 0, 0, '↖'], ['tr', 1, 0, '↗'], ['bl', 0, 1, '↙'], ['br', 1, 1, '↘']];
const EDGES = [['top', 0.5, 0, 'من فوق'], ['bottom', 0.5, 1, 'من تحت'], ['left', 0, 0.5, 'من اليسار'], ['right', 1, 0.5, 'من اليمين']];

export const TR_CATS = [
  ['basic', 'أساسي'], ['slide', 'انزلاق'], ['zoom', 'تقريب ودوران'], ['shape', 'أشكال'], ['wipe', 'مسح'], ['bars', 'شرائح'],
  ['tiles', 'مربعات'], ['3d', 'ثلاثي الأبعاد'], ['color', 'ألوان'], ['light', 'ضوء'], ['glitch', 'قلتش'], ['warp', 'تشويه'],
  ['particles', 'جزيئات'], ['pattern', 'أنماط'],
];

export const PRESETS = [];
const add = (id, label, cat, fam, params = {}, sound) => PRESETS.push({ id, label, cat, fam, params, sound });

// ---------------------------------------------------------------- the original 22 (behaviour kept)
add('cut', 'قطع', 'basic', 'cut');
add('fade', 'تلاشي', 'basic', 'fade', { ease: 'sineInOut' });
add('blur', 'ضباب', 'basic', 'blur', { ease: 'sineInOut' });
add('slide', 'دفع', 'slide', 'push', { dir: 'left' });
add('cover', 'تغطية', 'slide', 'cover', { dir: 'left' });
add('whip', 'سحبة سريعة', 'slide', 'whip', { dir: 'left' });
add('zoom', 'تقريب', 'zoom', 'zoom', { mode: 'cross' });
add('zoomThrough', 'عبور سريع', 'zoom', 'zoom', { mode: 'through', ease: 'linear' });
add('spin', 'دوران', 'zoom', 'spin', { turns: 0.19 });
add('circle', 'دائرة', 'shape', 'shape', { shape: 'circle', stroke: true });
add('diamond', 'معيّن', 'shape', 'shape', { shape: 'diamond' });
add('ink', 'حبر', 'shape', 'shape', { shape: 'blob' });
add('wipe', 'مسح', 'wipe', 'wipe', { angle: 180, edge: 'line' });
add('panel', 'لوح ملوّن', 'color', 'panel', { colors: ['@accent', '@secondary'], angle: 180 });
add('blinds', 'شرائح', 'bars', 'blinds', { n: 8 });
add('stripes', 'خطوط مائلة', 'bars', 'blinds', { orient: 'd', n: 12, grow: 'edge' });
add('split', 'باب منزلق', '3d', 'doors', { axis: 'v' });
add('flip', 'قلب', '3d', 'flip', { axis: 'x' });
add('cube', 'مكعب', '3d', 'cube', { dir: 'left' });
add('glitch', 'قلتش', 'glitch', 'glitch', {});
add('pixel', 'بكسلة', 'tiles', 'pixel', {});
add('tiles', 'مربعات', 'tiles', 'tiles', { pattern: 'random', anim: 'scale' });

// ---------------------------------------------------------------- basic
add('fade-fast', 'تلاشي سريع', 'basic', 'fade', { ease: 'expoInOut' });
add('fade-linear', 'تلاشي خطي', 'basic', 'fade', { ease: 'linear' });
add('fade-light', 'تلاشي مضيء', 'basic', 'fade', { mode: 'light', ease: 'sineInOut' });
add('fade-depth', 'تلاشي بعمق', 'basic', 'fade', { mode: 'depth' });
add('fade-rise', 'تلاشي صاعد', 'basic', 'fade', { mode: 'rise' });
add('fade-sink', 'تلاشي نازل', 'basic', 'fade', { mode: 'sink' });
add('fade-scale-in', 'تلاشي مع تكبير', 'basic', 'fade', { mode: 'scaleIn' });
add('fade-scale-out', 'تلاشي من قريب', 'basic', 'fade', { mode: 'scaleOut' });
add('blur-heavy', 'ضباب كثيف', 'basic', 'blur', { amount: 60, ease: 'sineInOut' });
add('blur-quick', 'ضباب سريع', 'basic', 'blur', { amount: 18, ease: 'expoInOut' });

// ---------------------------------------------------------------- slide
DIR8.filter((d) => d !== 'left').forEach((d) => add('push-' + d, 'دفع ' + AR[d], 'slide', 'push', { dir: d }));
DIR8.filter((d) => d !== 'left').forEach((d) => add('cover-' + d, 'تغطية ' + AR[d], 'slide', 'cover', { dir: d }));
DIR8.forEach((d) => add('uncover-' + d, 'كشف ' + AR[d], 'slide', 'uncover', { dir: d }));
['right', 'up', 'down'].forEach((d) => add('whip-' + d, 'سحبة سريعة ' + AR[d], 'slide', 'whip', { dir: d }));
DIR4.forEach((d) => add('push-cards-' + d, 'دفع بطاقات ' + AR[d], 'slide', 'push', { dir: d, scale: 0.16 }));
DIR4.forEach((d) => add('stack-' + d, 'بطاقة فوق بطاقة ' + AR[d], 'slide', 'stack', { dir: d }));
add('push-bounce-left', 'دفع مرن ←', 'slide', 'push', { dir: 'left', ease: 'backOutSoft' });
add('push-bounce-up', 'دفع مرن ↑', 'slide', 'push', { dir: 'up', ease: 'backOutSoft' });
add('carousel-left', 'دوّارة ←', 'slide', 'carousel', { dir: 'left' });
add('carousel-right', 'دوّارة →', 'slide', 'carousel', { dir: 'right' });
add('tilt-drop-left', 'سقوط مائل ↙', 'slide', 'tilt', { dir: 'left', ease: 'linear' });
add('tilt-drop-right', 'سقوط مائل ↘', 'slide', 'tilt', { dir: 'right', ease: 'linear' });

// ---------------------------------------------------------------- zoom + spin
add('zoom-in', 'غوص للداخل', 'zoom', 'zoom', { mode: 'in' });
add('zoom-out', 'ابتعاد', 'zoom', 'zoom', { mode: 'out' });
add('zoom-in-rot', 'غوص مع دوران', 'zoom', 'zoom', { mode: 'in', rot: 0.6 });
add('zoom-out-rot', 'ابتعاد مع دوران', 'zoom', 'zoom', { mode: 'out', rot: 0.6 });
add('zoom-cross-rot', 'تقريب ملتف', 'zoom', 'zoom', { mode: 'cross', rot: 0.5 });
add('zoom-blur', 'تقريب مشعّ', 'zoom', 'zoom', { mode: 'blur', ease: 'linear' });
add('zoom-punch', 'ضربة تقريب', 'zoom', 'zoom', { mode: 'punch', ease: 'linear' });
CORNERS.forEach(([c, x, y, a]) => add('zoom-corner-' + c, 'غوص للزاوية ' + a, 'zoom', 'zoom', { mode: 'in', ox: x * 0.8 + 0.1, oy: y * 0.8 + 0.1 }));
add('zoom-through-tl', 'عبور للزاوية ↖', 'zoom', 'zoom', { mode: 'through', ox: 0.2, oy: 0.2, ease: 'linear' });
add('zoom-through-br', 'عبور للزاوية ↘', 'zoom', 'zoom', { mode: 'through', ox: 0.8, oy: 0.8, ease: 'linear' });
add('spin-ccw', 'دوران عكسي', 'zoom', 'spin', { turns: 0.19, cw: false });
add('spin-full', 'لفّة كاملة', 'zoom', 'spin', { turns: 1 });
add('spin-flat', 'دوران مسطح', 'zoom', 'spin', { mode: 'flat', turns: 0.12 });
add('spin-flat-ccw', 'دوران مسطح عكسي', 'zoom', 'spin', { mode: 'flat', turns: 0.12, cw: false });

// ---------------------------------------------------------------- shapes
const SH = { star: 'نجمة', heart: 'شكل قلب', hexagon: 'سداسي', triangle: 'مثلث', square: 'مربع', cross: 'صليب', ring: 'حلقة', octagon: 'ثماني', pentagon: 'خماسي', squircle: 'مربع ناعم', circle: 'دائرة', diamond: 'معيّن' };
['star', 'heart', 'hexagon', 'triangle', 'square', 'cross', 'ring', 'octagon', 'pentagon', 'squircle'].forEach((s) => add('shape-' + s, SH[s], 'shape', 'shape', { shape: s }));
['circle', 'diamond', 'star', 'heart', 'hexagon', 'square', 'squircle'].forEach((s) => add('close-' + s, 'إغلاق ' + SH[s], 'shape', 'shape', { shape: s, close: true }));
CORNERS.forEach(([c, x, y, a]) => add('circle-' + c, 'دائرة من الزاوية ' + a, 'shape', 'shape', { shape: 'circle', ox: x, oy: y }));
EDGES.forEach(([c, x, y, l]) => add('circle-' + c, 'دائرة ' + l, 'shape', 'shape', { shape: 'circle', ox: x, oy: y, stroke: true }));
['star', 'square', 'triangle', 'hexagon', 'cross'].forEach((s) => add('spin-' + s, SH[s] + ' دوّارة', 'shape', 'shape', { shape: s, spin: 2.2 }));
['diamond', 'hexagon', 'heart'].forEach((s) => add('outline-' + s, SH[s] + ' بإطار', 'shape', 'shape', { shape: s, stroke: true }));
add('ink-bl', 'حبر من الزاوية ↙', 'shape', 'shape', { shape: 'blob', ox: 0, oy: 1 });
add('ink-tr', 'حبر من الزاوية ↗', 'shape', 'shape', { shape: 'blob', ox: 1, oy: 0 });
add('diamond-tl', 'معيّن من الزاوية ↖', 'shape', 'shape', { shape: 'diamond', ox: 0, oy: 0 });
add('diamond-br', 'معيّن من الزاوية ↘', 'shape', 'shape', { shape: 'diamond', ox: 1, oy: 1 });

// ---------------------------------------------------------------- wipes
ANG.forEach(([a, ar]) => add('wipe-hard-' + a, 'مسح حاد ' + ar, 'wipe', 'wipe', { angle: a }));
ANG.filter(([a]) => a !== 180).forEach(([a, ar]) => add('wipe-line-' + a, 'مسح بخط ' + ar, 'wipe', 'wipe', { angle: a, edge: 'line' }));
[[0, '→'], [90, '↓'], [180, '←'], [270, '↑']].forEach(([a, ar]) => add('wipe-glow-' + a, 'مسح ضوئي ' + ar, 'wipe', 'wipe', { angle: a, edge: 'glow' }));
add('wipe-double-0', 'مسح بخطين →', 'wipe', 'wipe', { angle: 0, edge: 'double' });
add('wipe-double-270', 'مسح بخطين ↑', 'wipe', 'wipe', { angle: 270, edge: 'double' });
ANG.forEach(([a, ar]) => add('wipe-soft-' + a, 'مسح ناعم ' + ar, 'wipe', 'softwipe', { angle: a }));
add('clock-cw', 'عقارب الساعة', 'wipe', 'clock', { start: -90 });
add('clock-ccw', 'عكس عقارب الساعة', 'wipe', 'clock', { start: -90, ccw: true });
add('clock-left', 'عقارب من اليسار', 'wipe', 'clock', { start: 180 });
add('clock-double', 'عقارب مزدوجة', 'wipe', 'clock', { start: -90, n: 2 });
add('clock-fan4', 'مروحة رباعية', 'wipe', 'clock', { start: -90, n: 4 });
add('fan-bl', 'مروحة من الزاوية ↙', 'wipe', 'clock', { ox: 0, oy: 1, start: -90, span: Math.PI / 2 });
add('fan-tr', 'مروحة من الزاوية ↗', 'wipe', 'clock', { ox: 1, oy: 0, start: 90, span: Math.PI / 2 });
add('fan-bottom', 'شروق نصف دائري', 'wipe', 'clock', { ox: 0.5, oy: 1, start: 180, span: Math.PI });
add('iris-open', 'نافذة تنفتح', 'wipe', 'iris', { mode: 'open' });
add('iris-close', 'نافذة تنسكر', 'wipe', 'iris', { mode: 'close' });
add('iris-round-open', 'نافذة دائرية الزوايا', 'wipe', 'iris', { mode: 'open', round: 0.25 });
add('iris-round-close', 'نافذة تنسكر بنعومة', 'wipe', 'iris', { mode: 'close', round: 0.25 });
add('barn-h', 'انفتاح أفقي', 'wipe', 'barn', { axis: 'h' });
add('barn-v', 'انفتاح عمودي', 'wipe', 'barn', { axis: 'v' });
add('barn-v-line', 'انفتاح بخطوط', 'wipe', 'barn', { axis: 'v', edge: true });

// ---------------------------------------------------------------- bars / strips
add('blinds-6', 'شرائح عريضة', 'bars', 'blinds', { n: 6 });
add('blinds-16', 'شرائح ناعمة', 'bars', 'blinds', { n: 16 });
add('blinds-28', 'شرائح رفيعة', 'bars', 'blinds', { n: 28, stagger: 0.8 });
add('blinds-center', 'شرائح من الوسط', 'bars', 'blinds', { n: 10, mode: 'center' });
add('blinds-alt', 'شرائح متناوبة', 'bars', 'blinds', { n: 12, mode: 'alt' });
add('blinds-v-8', 'ستائر عمودية', 'bars', 'blinds', { orient: 'v', n: 8 });
add('blinds-v-16', 'ستائر عمودية رفيعة', 'bars', 'blinds', { orient: 'v', n: 16 });
add('blinds-v-alt', 'ستائر متناوبة', 'bars', 'blinds', { orient: 'v', n: 12, mode: 'alt' });
add('stripes-8', 'خطوط مائلة عريضة', 'bars', 'blinds', { orient: 'd', n: 8, grow: 'edge' });
add('stripes-center', 'خطوط مائلة من الوسط', 'bars', 'blinds', { orient: 'd', n: 16, mode: 'center' });
add('comb-h', 'تمشيط أفقي', 'bars', 'blinds', { n: 10, grow: 'side', stagger: 0.3 });
add('comb-v', 'تمشيط عمودي', 'bars', 'blinds', { orient: 'v', n: 10, grow: 'side', stagger: 0.3 });
add('slices-5', 'شرائح منزلقة', 'bars', 'slices', { n: 5 });
add('slices-10', 'شرائح منزلقة رفيعة', 'bars', 'slices', { n: 10 });
add('slices-v-5', 'أعمدة منزلقة', 'bars', 'slices', { orient: 'v', n: 5 });
add('slices-v-10', 'أعمدة منزلقة رفيعة', 'bars', 'slices', { orient: 'v', n: 10 });
add('slices-bounce', 'شرائح مرنة', 'bars', 'slices', { n: 6, ease2: 'backOut' });
add('venetian-h', 'شرائح تنقلب', 'bars', 'venetian', { n: 10 });
add('venetian-v', 'أعمدة تنقلب', 'bars', 'venetian', { orient: 'v', n: 12 });
add('venetian-fine', 'شرائح تنقلب رفيعة', 'bars', 'venetian', { n: 20 });

// ---------------------------------------------------------------- tiles
const PAT = { random: 'عشوائي', rows: 'صفوف', cols: 'أعمدة', diag: 'قطري', spiral: 'حلزوني', center: 'من الوسط', checker: 'شطرنج' };
const AN = { scale: 'مربعات', flip: 'مربعات تنقلب', fade: 'مربعات تتلاشى' };
Object.keys(AN).forEach((an) => Object.keys(PAT).forEach((pt) => {
  if (an === 'scale' && pt === 'random') return;
  add(`tiles-${an}-${pt}`, `${AN[an]} ${PAT[pt]}`, 'tiles', 'tiles', { pattern: pt, anim: an });
}));
add('tiles-slide-random', 'مربعات تنزل عشوائي', 'tiles', 'tiles', { pattern: 'random', anim: 'slide' });
add('tiles-slide-rows', 'مربعات تنزل صفوف', 'tiles', 'tiles', { pattern: 'rows', anim: 'slide' });
add('tiles-spin-center', 'مربعات تلف من الوسط', 'tiles', 'tiles', { pattern: 'center', anim: 'spin' });
add('tiles-spin-diag', 'مربعات تلف قطري', 'tiles', 'tiles', { pattern: 'diag', anim: 'spin' });
add('tiles-big', 'مربعات كبيرة', 'tiles', 'tiles', { pattern: 'random', anim: 'scale', cols: 4 });
add('tiles-small', 'مربعات صغيرة', 'tiles', 'tiles', { pattern: 'random', anim: 'scale', cols: 16, win: 0.3 });
add('pixel-mosaic', 'موزاييك', 'tiles', 'pixel', { mode: 'mosaic' });
add('pixel-coarse', 'بكسلة خشنة', 'tiles', 'pixel', { max: 120 });
add('bubbles', 'فقاعات', 'tiles', 'bubbles', { n: 18 });
add('bubbles-small', 'فقاعات صغيرة', 'tiles', 'bubbles', { n: 40, size: 0.12 });
add('bubbles-hex', 'خلايا سداسية', 'tiles', 'bubbles', { n: 22, shape: 'hexagon' });
add('bubbles-square', 'مربعات متناثرة', 'tiles', 'bubbles', { n: 24, shape: 'square', size: 0.16 });
add('bubbles-star', 'نجوم متناثرة', 'tiles', 'bubbles', { n: 16, shape: 'star', size: 0.3 });
add('bubbles-heart', 'قلوب متناثرة', 'tiles', 'bubbles', { n: 14, shape: 'heart', size: 0.28 });

// ---------------------------------------------------------------- 3D
add('flip-y', 'قلب عمودي', '3d', 'flip', { axis: 'y' });
add('flip-tilt', 'قلب مائل', '3d', 'flip', { axis: 'x', tilt: 0.15 });
['right', 'up', 'down'].forEach((d) => add('cube-' + d, 'مكعب ' + AR[d], '3d', 'cube', { dir: d }));
add('door-v', 'باب بيفتح', '3d', 'door', { axis: 'v' });
add('door-h', 'باب علوي سفلي', '3d', 'door', { axis: 'h' });
add('page-left', 'قلب صفحة ←', '3d', 'page', { dir: 'left' });
add('page-right', 'قلب صفحة →', '3d', 'page', { dir: 'right' });
add('fold-v', 'طي أكورديون', '3d', 'fold', { axis: 'v' });
add('fold-h', 'طي أفقي', '3d', 'fold', { axis: 'h' });
add('fold-fine', 'طي ناعم', '3d', 'fold', { axis: 'v', n: 14 });
add('curtain-v', 'ستارة بتتسكر', '3d', 'curtain', { axis: 'v' });
add('curtain-h', 'ستارة أفقية', '3d', 'curtain', { axis: 'h' });
add('doors-h', 'باب منزلق أفقي', '3d', 'doors', { axis: 'h' });
add('doors-4', 'أربع أبواب', '3d', 'doors', { parts: 4 });
add('doors-diag', 'باب قطري', '3d', 'doors', { diag: true });
DIR4.forEach((d) => add('cardfly-' + d, 'بطاقة طايرة ' + AR[d], '3d', 'cardfly', { dir: d, ease: 'linear' }));

// ---------------------------------------------------------------- colour
add('dip-black', 'تعتيم أسود', 'color', 'dip', { color: '#000000' });
add('dip-white', 'تبييض', 'color', 'dip', { color: '#ffffff' });
add('dip-accent', 'غطسة باللون الأساسي', 'color', 'dip', { color: '@accent' });
add('dip-secondary', 'غطسة باللون الثانوي', 'color', 'dip', { color: '@secondary' });
add('dip-bg', 'غطسة بلون الخلفية', 'color', 'dip', { color: '@bg' });
add('dip-black-long', 'تعتيم طويل', 'color', 'dip', { color: '#000000', hold: 0.32 });
[[0, '→'], [90, '↓'], [270, '↑'], [180, '←']].forEach(([a, ar]) => add('panel1-' + a, 'لوح ' + ar, 'color', 'panel', { colors: ['@accent'], angle: a }));
[[0, '→'], [90, '↓'], [270, '↑'], [45, '↘']].forEach(([a, ar]) => add('panel2-' + a, 'لوحين ' + ar, 'color', 'panel', { colors: ['@accent', '@secondary'], angle: a }));
[[0, '→'], [180, '←'], [90, '↓'], [270, '↑']].forEach(([a, ar]) => add('panel3-' + a, 'ثلاث ألواح ' + ar, 'color', 'panel', { colors: ['@secondary', '@accent', '@fg'], angle: a }));
add('panel-diag-135', 'ألواح قطرية ↙', 'color', 'panel', { colors: ['@bg2', '@accent', '@fg'], angle: 135 });
add('panel-diag-315', 'ألواح قطرية ↗', 'color', 'panel', { colors: ['@fg', '@accent', '@bg2'], angle: 315 });
add('panel-ink-0', 'لوح حبر →', 'color', 'panel', { colors: ['@fg', '@bg'], angle: 0 });
add('panel-ink-270', 'لوح حبر ↑', 'color', 'panel', { colors: ['@fg', '@bg'], angle: 270 });
add('color-circle', 'دائرة ملوّنة', 'color', 'colorShape', { shape: 'circle', color: '@accent' });
add('color-diamond', 'معيّن ملوّن', 'color', 'colorShape', { shape: 'diamond', color: '@accent' });
add('color-square-tl', 'مربع ملوّن من الزاوية', 'color', 'colorShape', { shape: 'square', ox: 0, oy: 0, color: '@accent' });
add('color-circle-bottom', 'دائرة ملوّنة من تحت', 'color', 'colorShape', { shape: 'circle', ox: 0.5, oy: 1, color: '@secondary' });
add('color-star', 'نجمة ملوّنة', 'color', 'colorShape', { shape: 'star', color: '@accent', spin: 2 });
add('color-heart', 'قلب ملوّن', 'color', 'colorShape', { shape: 'heart', color: '@accent' });
add('color-hexagon', 'سداسي ملوّن', 'color', 'colorShape', { shape: 'hexagon', color: '@secondary', spin: 1 });
add('color-bg-circle', 'دائرة بلون الخلفية', 'color', 'colorShape', { shape: 'circle', color: '@bg2' });

// ---------------------------------------------------------------- light
add('flash-white', 'فلاش أبيض', 'light', 'flash', { color: '#ffffff', ease: 'linear' });
add('flash-accent', 'فلاش ملوّن', 'light', 'flash', { color: '@accent', ease: 'linear' });
add('flash-radial', 'فلاش دائري', 'light', 'flash', { color: '#ffffff', radial: true, ease: 'linear' });
add('flash-sharp', 'فلاش خاطف', 'light', 'flash', { color: '#ffffff', sharp: 6, ease: 'linear' });
add('leak-warm', 'تسريب ضوء دافئ', 'light', 'leak', {});
add('leak-accent', 'تسريب ضوء ملوّن', 'light', 'leak', { colors: ['@accent', '@secondary', '@fg'] });
add('leak-cool', 'تسريب ضوء بارد', 'light', 'leak', { colors: ['#4cc9f0', '#7b5cff', '#c3f0ff'] });
add('flare-white', 'وهج عدسة', 'light', 'flare', { color: '#ffffff' });
add('flare-accent', 'وهج ملوّن', 'light', 'flare', { color: '@accent', y: 0.3 });
add('bloom', 'توهج ناعم', 'light', 'bloom', {});
add('strobe', 'ستروب', 'light', 'strobe', { ease: 'linear' });
add('sunrise', 'شروق', 'light', 'sunrise', { color: '@accent' });
add('sunrise-warm', 'شروق دافئ', 'light', 'sunrise', { color: '#ffb347' });
add('burn', 'احتراق فيلم', 'light', 'mask', { field: 'clouds', edge: '#ff7a1a', soft: 0.03, band: 0.09, res: 180 });
add('burn-accent', 'احتراق بلون أساسي', 'light', 'mask', { field: 'clouds', edge: '@accent', soft: 0.03, band: 0.08, res: 180 });
add('burn-liquid', 'احتراق سائل', 'light', 'mask', { field: 'liquid', edge: '#ff9a3c', soft: 0.03, band: 0.07, res: 180 });

// ---------------------------------------------------------------- glitch
add('glitch-flash', 'قلتش مع فلاش', 'glitch', 'glitch', { flash: true });
add('glitch-heavy', 'قلتش قوي', 'glitch', 'glitch', { n: 30 });
add('glitch-rgb', 'انفصال ألوان', 'glitch', 'glitch', { mode: 'rgb' });
add('glitch-rgb-v', 'انفصال ألوان عمودي', 'glitch', 'glitch', { mode: 'rgbv' });
add('glitch-scan', 'خطوط مسح', 'glitch', 'glitch', { mode: 'scan' });
add('glitch-mosh', 'داتاموش', 'glitch', 'glitch', { mode: 'mosh' });
add('glitch-blocks', 'بلوكات رقمية', 'glitch', 'glitch', { mode: 'blocks' });
add('glitch-vhs', 'شريط VHS', 'glitch', 'glitch', { mode: 'vhs' });
add('glitch-jitter', 'ارتجاف', 'glitch', 'glitch', { mode: 'jitter' });
add('glitch-tear', 'تمزق شاشة', 'glitch', 'glitch', { mode: 'tear' });
add('glitch-noise', 'تشويش', 'glitch', 'glitch', { mode: 'noise' });

// ---------------------------------------------------------------- warp
add('ripple', 'تموّج', 'warp', 'ripple', {});
add('ripple-v', 'تموّج عمودي', 'warp', 'ripple', { axis: 'v' });
add('ripple-strong', 'موجة قوية', 'warp', 'ripple', { amp: 90, freq: 1.5 });
add('ripple-fine', 'اهتزاز ناعم', 'warp', 'ripple', { n: 56, freq: 8, amp: 18 });
add('stretch-h', 'مطّ أفقي', 'warp', 'stretch', { axis: 'h', ease: 'linear' });
add('stretch-v', 'مطّ عمودي', 'warp', 'stretch', { axis: 'v', ease: 'linear' });
add('stretch-hard', 'مطّ قوي', 'warp', 'stretch', { axis: 'h', amt: 10, ease: 'linear' });
add('swirl', 'دوامة', 'warp', 'swirl', { ease: 'linear' });
add('swirl-ccw', 'دوامة عكسية', 'warp', 'swirl', { ccw: true, ease: 'linear' });
add('twist', 'التفاف', 'warp', 'swirl', { twist: true, amt: 1.6, ease: 'linear' });
add('melt', 'ذوبان', 'warp', 'melt', {});
add('melt-up', 'تبخر', 'warp', 'melt', { up: true });
add('melt-wave', 'ذوبان موجي', 'warp', 'melt', { wave: true });
add('wobble', 'ترنح', 'warp', 'wobble', { ease: 'sineInOut' });

// ---------------------------------------------------------------- particles
add('shatter', 'تكسّر زجاج', 'particles', 'shatter', {});
add('shatter-corner', 'تكسّر من الزاوية', 'particles', 'shatter', { ox: 0.15, oy: 0.15 });
add('shatter-big', 'تكسّر كبير', 'particles', 'shatter', { cols: 3 });
add('dust-right', 'تفتت →', 'particles', 'dust', { dir: 'right' });
add('dust-left', 'تفتت ←', 'particles', 'dust', { dir: 'left' });
add('dust-up', 'تفتت ↑', 'particles', 'dust', { dir: 'up' });
add('dust-fine', 'تفتت ناعم', 'particles', 'dust', { dir: 'right', cols: 24 });
add('explode', 'انفجار قطع', 'particles', 'dust', { mode: 'explode', cols: 12 });
add('collapse', 'انهيار', 'particles', 'dust', { mode: 'fall', cols: 10 });
add('assemble', 'تجميع قطع', 'particles', 'assemble', {});
add('assemble-fine', 'تجميع قطع صغيرة', 'particles', 'assemble', { cols: 16 });
add('sand', 'أعمدة بتنزل', 'particles', 'sand', {});
add('sand-fine', 'رمل', 'particles', 'sand', { n: 60 });

// ---------------------------------------------------------------- pattern masks
const MASKS = [
  ['noise', 'تحلل نقاط', { soft: 0.12, res: 120 }], ['clouds', 'غيوم', {}], ['liquid', 'سائل', {}], ['radial', 'دائرة ناعمة', { soft: 0.12 }],
  ['angular', 'عقارب ناعمة', { soft: 0.06 }], ['spiral', 'حلزون', {}], ['plasma', 'بلازما', {}], ['waves', 'موج', { soft: 0.04, res: 200 }],
  ['bands', 'أشرطة متدرجة', { soft: 0.05 }], ['halftone', 'نقاط هافتون', { soft: 0.04, res: 220 }], ['diamonds', 'معيّنات', { soft: 0.04, res: 220 }],
  ['checker', 'شطرنج', { soft: 0.03, res: 200 }], ['starburst', 'انفجار نجمي', { soft: 0.05 }], ['rings', 'حلقات', { soft: 0.04, res: 200 }],
  ['crossField', 'صليب ناعم', {}], ['boxField', 'مربع متدرج', {}], ['hearts', 'قلب ناعم', { soft: 0.06 }], ['zigzag', 'متعرج', { soft: 0.03, res: 220 }],
  ['pixelsDiag', 'بكسلات قطرية', { soft: 0.05, res: 160 }],
];
MASKS.forEach(([f, l, o]) => add('mask-' + f, l, 'pattern', 'mask', { field: f, ...o }));
add('mask-radial-in', 'دائرة للداخل', 'pattern', 'mask', { field: 'radial', flipField: true, soft: 0.12 });
add('mask-clouds-rev', 'غيوم معكوسة', 'pattern', 'mask', { field: 'clouds', flipField: true });
