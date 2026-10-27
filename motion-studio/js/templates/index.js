// Template registry. Each pack exports an array of templates (see kit.js).
import { CORE } from './pack-core.js';
import { TYPE } from './pack-type.js';
import { VISUAL } from './pack-visual.js';
import { TECH } from './pack-tech.js';
import { INFO } from './pack-info.js';
import { PRODUCT } from './pack-product.js';
import { ART } from './pack-art.js';
import { STORY } from './pack-story.js';
import { DATA } from './pack-data.js';

export const CATEGORIES = [
  ['intro', 'افتتاحيات'], ['hook', 'هوكات'], ['kinetic', 'نص متحرك'], ['list', 'قوائم وخطوات'], ['stats', 'أرقام'],
  ['chart', 'رسوم بيانية'], ['quote', 'اقتباسات'], ['tech', 'كود وتقنية'], ['flow', 'أتمتة'], ['ui', 'محادثات وإشعارات'],
  ['mockup', 'موكاب'], ['compare', 'مقارنات'], ['time', 'خط زمني'], ['3d', 'ثلاثي الأبعاد'], ['abstract', 'أشكال'],
  ['promo', 'إعلانات'], ['photo', 'صور'], ['edu', 'تعليم وشرح'], ['biz', 'أعمال وشركات'], ['event', 'مناسبات'], ['social', 'سوشال ميديا'], ['outro', 'خاتمة'],
];

export const TEMPLATES = [...CORE, ...TYPE, ...STORY, ...INFO, ...DATA, ...TECH, ...PRODUCT, ...VISUAL, ...ART];

export const DEMO = ['core-brand-hook', 'core-big-number', 'core-flow-4', 'core-checklist', 'core-outro'];
