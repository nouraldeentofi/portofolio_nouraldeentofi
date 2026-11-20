/**
 * HTML for every `@gen` marker.
 *
 * This is the single place that turns data into markup. Pages own their
 * prose and layout; this module owns every repeating list and every figure.
 */

import { escapeHtml, extAttrs, newTabHint, linkifyPeople } from './render.mjs';
import * as ld from './jsonld.mjs';
import { flowDiagram, flowOrder } from './diagram.mjs';
import { pagePath, X_DEFAULT } from './sitemap.mjs';
import { byCompany, companyName } from './experience.mjs';
import { homeOffers as offersOf, automationServices as servicesOf } from './offers.mjs';
import { phoneDisplay, whatsappUrl, whatsappFirst } from './contact.mjs';
import {
  detailName,
  engineOf,
  productOf,
  hasDetail,
  projectHref,
  systemHref,
  relatedProjects,
  relatedSystems,
  engineNeighbours,
} from './details.mjs';

const e = escapeHtml;
const base = (db) => db.profile.site.replace(/\/$/, '');
const href = pagePath;

/**
 * A year is usually one string shared by both languages ("2026"). It becomes
 * `{en, ar}` the moment the wording differs — "2025 — present" must not show
 * the English word "present" on the Arabic page.
 */
export const yearOf = (y, lang) => (y && typeof y === 'object' ? y[lang] : y);

const PAGE_KEY = { '': 'home', about: 'about', work: 'work', projects: 'projects', showcase: 'showcase', automation: 'automation', chat: 'chat', contact: 'contact' };

/* Words, not a dash: "2025-01 to 2026-11", and "حتى الآن" with no "إلى" in front of it. */
export function period(start, end, c) {
  return end ? `${start} ${c.ui.to} ${end}` : `${start} ${c.ui.toPresent}`;
}

/* "November 2026" / "نوفمبر 2026", with Latin digits like every other date on the site.
   Takes a day ("2026-11-03") or a month ("2026-11"); a bare year is already words. */
export const monthYear = (iso, lang) =>
  /^\d{4}$/.test(iso)
    ? iso
    : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`),
      );

/**
 * A period the way a visitor reads it: "January 2025 to November 2026",
 * "يناير 2025 إلى نوفمبر 2026". A recruiter skimming the page should not have
 * to decode "2025-01". `period` above stays as it is for the llms files,
 * where the bare month is exactly what a model wants.
 */
export function periodWords(start, end, lang, c) {
  return end ? `${monthYear(start, lang)} ${c.ui.to} ${monthYear(end, lang)}` : `${monthYear(start, lang)} ${c.ui.toPresent}`;
}

/* One date on a page: the words for the reader, the month itself kept in `datetime` for a machine. */
const dateHtml = (iso, lang, cls = '') =>
  `<time${cls ? ` class="${cls}"` : ''} datetime="${e(iso)}">${e(monthYear(iso, lang))}</time>`;

/* `periodWords`, as markup. */
function periodHtml(start, end, lang, c) {
  return end
    ? `${dateHtml(start, lang)} ${e(c.ui.to)} ${dateHtml(end, lang)}`
    : `${dateHtml(start, lang)} ${e(c.ui.toPresent)}`;
}

const list = (items, cls = '') => `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

/**
 * Renders a person's or organisation's name, linked to their own page when
 * `data/links.json` knows one. An unknown entity renders as plain text —
 * a wrong link to a real person is far worse than no link.
 */
function entity(db, group, name, lang) {
  const url = db.links?.[group]?.[name]?.url ?? null;
  const label = e(name);
  if (!url) return label;
  return `<a class="entity" href="${e(url)}"${extAttrs(url)}>${label}${newTabHint(db.copy[lang].ui.opensInNewTab)}</a>`;
}

/** Prose that may name a person — escaped, with any known name linked. */
const prose = (db, text, lang) => linkifyPeople(db, text, lang);

export function aboutPersonal(db, lang) {
  const c = db.copy[lang];
  return `<div class="card card--row" data-reveal>
  <div class="card__main">
    <p class="card__body">${prose(db, c.about.personal, lang)}</p>
  </div>
  <aside class="card__aside">
    <ul class="badges badges--interests">
${(c.about.interests ?? []).map((i) => `      <li class="badge badge--interest">${e(i)}</li>`).join('\n')}
    </ul>
  </aside>
</div>`;
}

const org = (db, name, lang) => entity(db, 'organizations', name, lang);
const person = (db, name, lang) => entity(db, 'people', name, lang);

const badges = (items) =>
  `<ul class="badges">${items.map((s) => `<li class="badge">${e(s)}</li>`).join('')}</ul>`;

/**
 * A showcase tag in the language of the page.
 *
 * A technology is one string, the same in both languages: "RTL", "JSON-LD",
 * "Canvas" are what people in the field read and search for, in Arabic too.
 * A plain-language label ("Dark mode", "Arabic + English") is an
 * `{ en, ar }` pair, so the Arabic page does not print English words that
 * are not names.
 */
export const tagsOf = (tags, lang) => (tags ?? []).map((t) => (typeof t === 'string' ? t : t[lang]));

/* ------------------------------------------------------------------ head */

/*
 * Google Analytics, once a measurement ID is set in profile.json. The tag
 * only measures; it renders nothing, so every page reads the same without it.
 */
const analyticsTags = (db) => {
  const id = db.profile.analytics?.tag;
  if (!id) return [];
  const boot = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`;
  // Analytics hands out one of two snippets. A GTM- tag is a container that
  // already knows which stream it reports to; a bare G- ID has to be named.
  return id.startsWith('GTM-')
    ? [`<script async src="https://www.googletagmanager.com/gtm.js?id=${id}"></script>`, `<script>${boot}</script>`]
    : [`<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`, `<script>${boot}gtag('config','${id}');</script>`];
};

/**
 * What a page that may be shown in search allows Google to show of it: a
 * large image preview instead of a thumbnail, and a text or video snippet of
 * any length. Without the first rule Google keeps to a default-sized image.
 */
export const ROBOTS_INDEXABLE = 'max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/** A page that must stay out of search. `follow`, so the links out of it still count. */
export const ROBOTS_NOINDEX = 'noindex, follow';

/**
 * `meta` is for a page that is not in the navigation and so has no entry in
 * the copy: a detail page hands in its own title and description, and the
 * picture it is shared with (`{ path, width, height, alt }`), built from the
 * data of the entry it is about.
 *
 * `noindex` is the 404. It is served at whatever address was not found, so
 * it has no address of its own to name: no canonical, no hreflang set and no
 * og:url. A page that says "do not index me" and "my real address is the
 * home page" in one breath asks two things of a search engine at once. Its
 * title and description are its own (`meta.notFound` in the copy), not the
 * home page's.
 */
export function headMeta(db, page, lang, { noindex = false, meta = null } = {}) {
  const c = db.copy[lang];
  const other = lang === 'en' ? 'ar' : 'en';
  // Each page names what it is about and what people search for, rather than
  // one sitewide description that search engines treat as boilerplate.
  const own = meta ?? (noindex ? c.meta.notFound : c.meta.pages?.[PAGE_KEY[page]]);
  const title =
    own?.title ??
    (page === ''
      ? `${db.profile.name[lang]} | ${db.profile.headline[lang]}`
      : `${c.nav[PAGE_KEY[page]]} | ${db.profile.name[lang]}`);
  const description = own?.description ?? c.meta.description;
  const url = `${base(db)}${href(page, lang)}`;
  // The page's own picture when it has one; otherwise the generated share
  // card, not the portrait: profile.image stays reserved for a real photo and
  // its own structured-data treatment. Either way the size announced is the
  // size of that file, measured by the loader.
  // The alt text of the card says what is on the card, his name and what he
  // does, on whichever page it is shared from: a product page shared with the
  // card must not describe a product the picture does not show.
  const cardSize = db.imageSizes?.[db.profile.ogImage];
  const card = db.profile.ogImage
    ? {
        path: db.profile.ogImage,
        width: cardSize?.[0],
        height: cardSize?.[1],
        alt: `${db.profile.name[lang]} | ${db.profile.headline[lang]}`,
      }
    : null;
  const picture = meta?.image ?? card;
  const ogImage = picture ? `${base(db)}/${picture.path}` : null;

  return [
    `<title>${e(title)}</title>`,
    `<meta name="description" content="${e(description)}">`,
    // Exactly one robots meta on every page, so there is one place to look.
    `<meta name="robots" content="${noindex ? ROBOTS_NOINDEX : ROBOTS_INDEXABLE}">`,
    ...(noindex
      ? []
      : [
          `<link rel="canonical" href="${url}">`,
          `<link rel="alternate" hreflang="${lang}" href="${url}">`,
          `<link rel="alternate" hreflang="${other}" href="${base(db)}${href(page, other)}">`,
          // What a browser set to neither language is offered: see X_DEFAULT in
          // sitemap.mjs, which the sitemap reads too, so the two cannot disagree.
          `<link rel="alternate" hreflang="x-default" href="${base(db)}${href(page, X_DEFAULT)}">`,
        ]),
    // The pages of the navigation are about him. A detail page is about a
    // thing he made.
    `<meta property="og:type" content="${meta ? 'website' : 'profile'}">`,
    // One site name on every page in both languages, the same one the WebSite
    // node gives: Google reads it from here and will not choose between two.
    `<meta property="og:site_name" content="${e(db.profile.name.en)}">`,
    `<meta property="og:title" content="${e(title)}">`,
    `<meta property="og:description" content="${e(description)}">`,
    ...(noindex ? [] : [`<meta property="og:url" content="${url}">`]),
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ar_SA'}">`,
    `<meta property="og:locale:alternate" content="${lang === 'en' ? 'ar_SA' : 'en_US'}">`,
    ...(ogImage
      ? [
          `<meta property="og:image" content="${ogImage}">`,
          ...(picture.width && picture.height
            ? [
                `<meta property="og:image:width" content="${picture.width}">`,
                `<meta property="og:image:height" content="${picture.height}">`,
              ]
            : []),
          `<meta property="og:image:alt" content="${e(picture.alt ?? title)}">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<meta name="twitter:image" content="${ogImage}">`,
        ]
      : [`<meta name="twitter:card" content="summary">`]),
    `<meta name="author" content="${e(db.profile.name[lang])}">`,
    ...analyticsTags(db),
  ].join('\n');
}

/**
 * `pageLd: false` is for a page that is laid out as another page is, which is
 * the 404: it carries the site-wide nodes, but it is not the home page, so it
 * must not announce itself as his ProfilePage, and its Person node is the
 * slim one, not the home page's.
 *
 * The ProfilePage date is `updated` in data/profile.json, set by hand when
 * his identity facts change (`ld.profileModified`). It is not the day of the
 * build: nothing in here reads the clock, and the profile does not change
 * because the site was rebuilt.
 *
 * `nodes` is for a page outside the navigation: a detail page hands in its
 * own breadcrumb and the node for the thing it is about.
 */
export function headLd(db, page, lang, { pageLd = true, nodes = null } = {}) {
  // The Person node carries what this page shows about him and no more.
  const site = [ld.personLd(db, lang, pageLd && !nodes ? page : null), ld.websiteLd(db)];
  if (!pageLd) return ld.toScriptTag(...site);
  if (nodes) return ld.toScriptTag(...site, ...nodes);

  const extra = {
    '': [ld.profilePageLd(db, lang, ld.profileModified(db)), ...ld.servicesLd(db, lang)],
    about: [ld.faqLd(db, lang)],
    work: [ld.experienceLd(db, lang), ...ld.recommendationsLd(db, lang)],
    projects: [ld.projectsLd(db, lang)],
    showcase: [ld.showcaseLd(db, lang)],
    automation: [ld.workflowsLd(db, lang)],
    contact: [ld.contactPageLd(db, lang)],
    chat: [],
  }[page] ?? [];

  return ld.toScriptTag(...site, ld.breadcrumbLd(page, lang, db), ...extra);
}

/* ------------------------------------------------------------------ home */

/**
 * The address of one item on its list page: the page plus the item's id.
 *
 * A card on the home page links its title to the item, so the words of the
 * link are the name of the thing, and the reader lands on that thing, not on
 * the top of a long list. Projects and automation systems have a page of
 * their own to land on (`projectHref` and `systemHref` in details.mjs); a
 * client site has none, so its card leads here.
 */
const itemHref = (page, id, lang) => `${href(page, lang)}#${e(id)}`;

/* A sentence with a name in it: "n8n canvas: {name}", "{name} on desktop and phone". */
const named = (pattern, name) => pattern.replace('{name}', name);

/**
 * The short link from a card to the page of the thing it shows. The visible
 * word is the same on every card, so the name follows it for anyone who
 * hears the link read out on its own.
 */
const namedLink = (label, to, name) =>
  `<a class="btn btn--ghost" href="${to}">${e(label)}<span class="visually-hidden">: ${e(name)}</span></a>`;

const detailsLink = (c, to, name) => namedLink(c.ui.details, to, name);

/**
 * What the button to a project's public address says. A listing on Google
 * Play is not a site to visit, so it is named as what it is; every other
 * address is the live product.
 */
export const liveLabel = (c, url) => (/^https?:\/\/play\.google\.com\//.test(url) ? c.ui.visitPlay : c.ui.visitLive);

/** That button, in the weight the card asks for. */
export const liveLink = (c, url, cls = 'btn') =>
  `<a class="${cls}" href="${e(url)}"${extAttrs(url)}>${e(liveLabel(c, url))}${newTabHint(c.ui.opensInNewTab)}</a>`;

/**
 * What he offers, right under the hero: one card per offer, each leading to
 * the page that covers it. The title is the link, so the page it points at
 * is named in the words people search for; the button repeats it for a thumb.
 *
 * Each part of the offer is a line of its own (`OFFER_PARTS` in offers.mjs):
 * the job, the example, the next step, and the tools last and quiet.
 */
export function homeOffers(db, lang) {
  const line = (cls, text) => (text ? `\n  <p class="${cls}">${e(text)}</p>` : '');
  return offersOf(db, lang)
    .map((o) => {
      const to = href(o.page, lang);
      return `<article data-reveal class="card" id="offer-${e(o.id)}">
  <h3 class="card__title"><a href="${to}">${e(o.title)}</a></h3>${line('card__body', o.body)}${line('card__body', o.example)}${line('card__body', o.next)}${line('card__tools', o.tools)}
  <div class="card__foot"><a class="btn btn--ghost" href="${to}">${e(o.cta)}</a></div>
</article>`;
    })
    .join('\n');
}

/**
 * The figures of the "In numbers" strip, each read from the data.
 *
 * A figure earns its place here when a reader who is not an engineer can
 * weigh it, or when an engineer would ask for it first: the sites delivered,
 * what the invoice product reads and how fast, what the routing saved, the
 * tests and the load test. Counts of things made (workflows, source files)
 * stay on the project and system pages, where the reader who wants them
 * looks.
 *
 * A product figure is named by its project and its value, and keeps the
 * label the project page prints, so the two cannot disagree. One that has
 * left the data stops the build instead of leaving a gap in the strip.
 *
 * The Arabic noun after the number of sites is the form for eleven to
 * ninety-nine. Outside that range the label has to be rewritten.
 */
const HOME_PROOF = [
  ['smart-scanner', '70+'],
  ['smart-scanner', '~10'],
  ['smart-scanner', '494'],
  ['cv-screener', '5,000'],
];

export function homeProofFigures(db) {
  const metric = ([id, value]) => {
    const found = db.projects.find((p) => p.id === id)?.metrics?.find((m) => m.value === value);
    if (!found) throw new Error(`blocks.mjs: the home page shows "${value}" of ${id}, which is not in projects.json`);
    return found;
  };
  const saving = db.caseStudy?.figures?.find((f) => f.id === 'saving');
  if (!saving) throw new Error('blocks.mjs: the home page shows the saving of the cost case study, which is not in case-study.json');
  const [fields, seconds, tests, cvs] = HOME_PROOF.map(metric);

  return [
    { value: String(db.showcase.sites.length), label: { en: 'websites for professionals, companies and shops', ar: 'موقعاً للأفراد والشركات والمحلات' } },
    fields,
    seconds,
    // "About", as every other text of his says it: the saving is a measured average.
    { value: `~${saving.value}`, label: { en: 'lower AI cost per document', ar: 'انخفاض في تكلفة الذكاء الاصطناعي لكل مستند' } },
    tests,
    cvs,
  ];
}

export function homeProof(db, lang) {
  const picks = homeProofFigures(db);

  return `<ul class="proof">
${picks
  .map(
    (m) => `  <li class="proof__item">
    <span class="proof__value" data-count>${e(m.value)}</span>
    <span class="proof__label">${e(m.label[lang])}</span>
  </li>`,
  )
  .join('\n')}
</ul>`;
}

export function homeFeatured(db, lang) {
  const p = db.projects.find((x) => x.featured);
  const c = db.copy[lang];

  return `<article data-reveal class="card card--featured">
  <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(yearOf(p.year, lang))}</span></p>
  <h3 class="card__title"><a href="${projectHref(p, lang)}">${e(p.name)}</a></h3>
  <p class="card__body">${e(p.tagline[lang])}</p>
  <dl class="card__body">
    <dt>${e(c.ui.problem)}</dt><dd>${prose(db, p.problem[lang], lang)}</dd>
    <dt>${e(c.ui.built)}</dt><dd>${prose(db, p.built[lang], lang)}</dd>
    <dt>${e(c.ui.role)}</dt><dd>${prose(db, p.role[lang], lang)}</dd>
  </dl>
  ${badges(p.stack)}
  <div class="card__foot">
    ${p.url ? liveLink(c, p.url) : ''}
    ${namedLink(c.ui.viewProject, projectHref(p, lang), p.name)}
  </div>
</article>`;
}

/**
 * The button of a system card on the home page says what it opens: the
 * details of a system that has a page of its own, or the project whose page
 * shows it, named by that project.
 */
function systemButton(db, w, lang) {
  const c = db.copy[lang];
  const product = productOf(db, w);
  return product ? namedLink(c.ui.viewProject, systemHref(db, w, lang), product.name) : detailsLink(c, systemHref(db, w, lang), w.name[lang]);
}

/**
 * Three systems on the home page, each told by what it changed.
 *
 * The section above them promises work taken over from people, so a card
 * prints the outcome of its system and the honest status the automation page
 * gives it. How the system is built, the summary an engineer reads, stays on
 * its own page and on the automation page.
 */
export function homeAutomation(db, lang) {
  const c = db.copy[lang];
  return db.workflows
    .slice(0, 3)
    .map(
      (w) => `<article data-reveal class="card">
  <p class="card__meta"><span class="status status--${e(w.status)}">${e(c.ui.status[w.status])}</span><span>${e(w.kind[lang])}</span><span>${e(yearOf(w.year, lang))}</span></p>
  <h3 class="card__title"><a href="${systemHref(db, w, lang)}">${e(w.name[lang])}</a></h3>
  <p class="card__body">${prose(db, w.outcome[lang], lang)}</p>
  ${badges(w.services.slice(0, 4))}
  <div class="card__foot">${systemButton(db, w, lang)}</div>
</article>`,
    )
    .join('\n');
}

/** The home page shows a handful; the projects page has every one. */
const HOME_PROJECTS = 6;

export function homeProjects(db, lang) {
  const c = db.copy[lang];
  return db.projects
    .filter((p) => !p.featured)
    .slice(0, HOME_PROJECTS)
    .map(
      (p) => `<article data-reveal class="card">
  <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(yearOf(p.year, lang))}</span></p>
  <h3 class="card__title"><a href="${projectHref(p, lang)}">${e(p.name)}</a></h3>
  <p class="card__body">${e(p.tagline[lang])}</p>
  ${badges(p.stack.slice(0, 4))}
  <div class="card__foot">${p.url ? liveLink(c, p.url, 'btn btn--ghost') : ''}</div>
</article>`,
    )
    .join('\n');
}

/** The sentences of a text, each with the mark that ends it. */
const sentencesOf = (text) => String(text).trim().split(/(?<=[.!?؟])\s+/);

/* The most a quote may run to on the home page, in either language. */
const QUOTE_LIMIT = 450;

/**
 * The opening of a recommendation, cut where a sentence ends.
 *
 * The home page used to cut each quote at a fixed number of characters, which
 * stopped it inside a word, with an ellipsis, on a page that sells care. Now
 * a quote is shown whole when it fits, and otherwise as its first sentences:
 * as many as fit in every language at once, so the Arabic and the English
 * card end on the same sentence. The words are the recommender's own; only
 * the place where the excerpt stops is chosen here.
 *
 * `quote` is `{ en, ar }`. A translation that splits into a different number
 * of sentences is cut on its own, by the same rule.
 */
export function quoteExcerpt(quote, lang, limit = QUOTE_LIMIT) {
  const parts = Object.fromEntries(Object.entries(quote).map(([l, text]) => [l, sentencesOf(text)]));
  const fits = (sentences, n) => sentences.slice(0, n).join(' ').length <= limit;
  const inStep = new Set(Object.values(parts).map((x) => x.length)).size === 1;
  const group = inStep ? Object.values(parts) : [parts[lang]];

  let n = parts[lang].length;
  while (n > 1 && !group.every((sentences) => fits(sentences, n))) n -= 1;
  return parts[lang].slice(0, n).join(' ');
}

export function homeQuote(db, lang) {
  return db.testimonials
    .filter((t) => t.featured)
    .slice(0, 2)
    .map(
      (t) => `<figure data-reveal class="quote">
  <blockquote class="quote__body">${e(quoteExcerpt(t.quote, lang))}</blockquote>
  <figcaption class="quote__author">${person(db, t.author, lang)}<span class="quote__role">${e(t.title[lang])}</span></figcaption>
</figure>`,
    )
    .join('\n');
}

/* ----------------------------------------------------------------- about */

/**
 * His portrait, beside the story about him.
 *
 * Until now the photo was only the small avatar in the header and the
 * full-size view behind it, which is closed until someone opens it. Google
 * reads the words around an image to decide what it shows, and most searches
 * that reach this site are for his name, so the picture stands where the
 * text about him is, with an alt that describes it and a caption that names
 * him. The address is the bare one, the same the Person node gives.
 *
 * Not lazy: on a phone it is the first thing under the heading. Nothing is
 * rendered while the data has no portrait.
 */
export function aboutPortrait(db, lang) {
  if (!db.profile.image) return '';
  const c = db.copy[lang].about;
  return `<figure class="about-portrait" data-reveal>
  <img src="/${e(db.profile.image)}" alt="${e(c.portraitAlt)}" width="720" height="720" decoding="async">
  <figcaption>${e(c.portraitCaption)}</figcaption>
</figure>`;
}

export function aboutBody(db, lang) {
  // The story is told as a pipeline: each paragraph is a node on a line,
  // the same motif the background and the page spine use.
  return `<div class="narrative">
${db.copy[lang].about.body
    .map(
      (p, i) => `  <p class="narrative__step${i === 0 ? ' narrative__step--lead' : ''}" data-reveal>${prose(db, p, lang)}</p>`,
    )
    .join('\n')}
</div>`;
}

export function aboutPrinciples(db, lang) {
  return db.copy[lang].about.principles
    .map(
      (p, i) => `<article data-reveal class="card card--row">
  <div class="card__main">
    <h3 class="card__title">${e(p.title)}</h3>
    <p class="card__body">${prose(db, p.body, lang)}</p>
  </div>
  <aside class="card__aside card__aside--index">
    <span class="card__index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
  </aside>
</article>`,
    )
    .join('\n');
}

export function aboutSkills(db, lang) {
  const c = db.copy[lang];
  return db.skills
    .map(
      (g) => `<article data-reveal class="card card--row">
  <div class="card__main">
    <h3 class="card__title">${e(g.category[lang])}</h3>
    ${badges(g.items)}
  </div>
  <aside class="card__aside">
    <ul class="proof proof--inline">
      <li class="proof__item">
        <span class="proof__value" data-count>${g.items.length}</span>
        <span class="proof__label">${e(c.about.skillsCountLabel)}</span>
      </li>
    </ul>
  </aside>
</article>`,
    )
    .join('\n');
}

export function aboutFaq(db, lang) {
  return db.copy[lang].about.faq
    .map(
      (f) => `<details data-reveal class="card card--faq">
  <summary><strong>${e(f.q)}</strong></summary>
  <p class="card__body">${prose(db, f.a, lang)}</p>
</details>`,
    )
    .join('\n');
}

/* ------------------------------------------------------------------ work */

export function workTimeline(db, lang) {
  const c = db.copy[lang];
  const current = (end) => (end === null ? ' timeline__item--current' : '');

  const single = (x) => `  <li data-reveal class="timeline__item${current(x.end)}">
    <p class="timeline__period">${periodHtml(x.start, x.end, lang, c)}</p>
    <h3 class="timeline__role">${e(x.role[lang])}</h3>
    <p class="timeline__org">${org(db, companyName(x.company, lang), lang)} · ${e(x.location[lang])} · ${e(x.type[lang])}</p>
    ${list(x.bullets[lang].map((b) => prose(db, b, lang)), 'timeline__bullets')}
    ${badges(x.stack)}
  </li>`;

  // Several roles at one employer: the company and the whole tenure first,
  // then each role with its own dates, newest first.
  const group = (g) => {
    const latest = g.roles[0];
    return `  <li data-reveal class="timeline__item timeline__item--group${current(g.end)}">
    <p class="timeline__period">${periodHtml(g.start, g.end, lang, c)}</p>
    <h3 class="timeline__role">${org(db, companyName(g.company, lang), lang)}</h3>
    <p class="timeline__org">${e(latest.location[lang])} · ${e(latest.type[lang])}</p>
    <ol class="timeline__steps">
${g.roles
  .map(
    (x) => `      <li class="timeline__step">
        <h4 class="timeline__step-role">${e(x.role[lang])}</h4>
        <p class="timeline__period">${periodHtml(x.start, x.end, lang, c)}</p>
        ${list(x.bullets[lang].map((b) => prose(db, b, lang)), 'timeline__bullets')}
        ${badges(x.stack)}
      </li>`,
  )
  .join('\n')}
    </ol>
  </li>`;
  };

  return `<ol class="timeline">
${byCompany(db.experience)
  .map((g) => (g.roles.length === 1 ? single(g.roles[0]) : group(g)))
  .join('\n')}
</ol>`;
}

/*
 * Recommendations, newest first as they are in the data. Each one says who
 * wrote it, how they knew Nour and when, and whether this is a translation:
 * a quote shown in the other language from the one its author wrote in is
 * marked as such, so nobody reads a translation as the author's own words.
 */
export function workTestimonials(db, lang) {
  const c = db.copy[lang];
  return db.testimonials
    .map(
      (t) => `<figure data-reveal class="quote" lang="${lang}">
  <blockquote class="quote__body">${e(t.quote[lang])}</blockquote>
  <figcaption class="quote__author">${person(db, t.author, lang)}<span class="quote__role">${e(t.title[lang])}</span><span class="quote__meta">${e(t.relationship[lang])} · ${dateHtml(t.date, lang)}${
    t.lang !== lang ? ` · ${e(c.work.quoteTranslated)}` : ''
  }</span></figcaption>
</figure>`,
    )
    .join('\n');
}

export function workCredentials(db, lang) {
  const c = db.copy[lang];
  return `<ul class="creds creds--grid">
${db.credentials
  .filter((x) => x.kind === 'certification')
  .map(
    (x) => `  <li class="cred" data-reveal>
    <span class="cred__issuer">${org(db, x.issuer, lang)}</span>
    <span class="cred__name">${e(x.name[lang])}</span>
    <span class="cred__foot">
      ${dateHtml(x.issued, lang, 'cred__date')}
      ${x.credentialId ? `<span class="cred__id" title="${e(c.ui.credentialId)}">${e(x.credentialId)}</span>` : ''}
    </span>
  </li>`,
  )
  .join('\n')}
</ul>`;
}

export function workEducation(db, lang) {
  const c = db.copy[lang];
  return `<ul class="creds creds--feature">
${db.credentials
  .filter((x) => x.kind !== 'certification')
  .map(
    (x) => `  <li class="cred cred--feature" data-reveal>
    <span class="cred__kind">${e(x.kind === 'award' ? '★' : '✦')}</span>
    <span class="cred__body">
      <span class="cred__name">${e(x.name[lang])}</span>
      <span class="cred__issuer">${org(db, x.issuer, lang)} · ${x.start ? periodHtml(x.start, x.issued, lang, c) : dateHtml(x.issued, lang)}</span>
      ${x.note ? `<span class="cred__note">${e(x.note[lang])}</span>` : ''}
    </span>
  </li>`,
  )
  .join('\n')}
</ul>`;
}

/* -------------------------------------------------------------- projects */

/**
 * The list of projects. A card is a summary: what the thing is, his role,
 * the figures, the stack and the way to its page. The problem, what he built
 * and the context are told once, on `/projects/<id>` (`projectBody`), so the
 * list does not compete with its own detail pages for the same sentences.
 */
export function projectsList(db, lang) {
  const c = db.copy[lang];
  const counts = {};
  for (const p of db.projects) counts[p.group] = (counts[p.group] ?? 0) + 1;
  const cards = db.projects
    .map(
      (p) => `<article data-reveal data-filter-item data-group="${e(p.group)}" class="card card--row card--summary${p.featured ? ' card--featured' : ''}${
        p.images ? ' has-media' : ''
      }" id="${e(p.id)}">${p.images ? `
  <div class="card__media">${deviceStage(db, p, lang)}</div>` : ''}
  <div class="card__main">
    <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(yearOf(p.year, lang))}</span></p>
    <h2 class="card__title"><a href="${projectHref(p, lang)}">${e(p.name)}</a></h2>
    <p class="card__body">${e(p.tagline[lang])}</p>
    <dl class="card__body">
      <dt>${e(c.ui.role)}</dt><dd>${prose(db, p.role[lang], lang)}</dd>
    </dl>
  </div>
  <aside class="card__aside">
    ${
      p.metrics?.length
        ? `<ul class="proof proof--inline">${p.metrics
            .map(
              (m) =>
                `<li class="proof__item"><span class="proof__value" data-count>${e(m.value)}</span><span class="proof__label">${e(m.label[lang])}</span></li>`,
            )
            .join('')}</ul>`
        : ''
    }
    <dl class="card__body"><dt>${e(c.ui.stack)}</dt><dd>${badges(p.stack)}</dd></dl>
    <div class="card__foot">${p.url ? liveLink(c, p.url) : ''}${detailsLink(c, projectHref(p, lang), p.name)}</div>
  </aside>
</article>`,
    )
    .join('\n');
  return `${filterBar(c, Object.entries(c.projects.groups), counts, db.projects.length)}
<div class="stack" data-filter-list>
${cards}
</div>`;
}

/* -------------------------------------------------------------- showcase */

/**
 * The address of an asset, from the site root, fingerprinted when the loader
 * fingerprints it.
 *
 * From the root, so the same markup works at any depth: `/`, `/en/`,
 * `/en/projects/<id>`, and the 404 page, which is served at whatever address
 * was not found. A stylesheet, a script and the CV carry a hash, because each
 * keeps its file name and a browser that saw the old one would keep showing
 * it. A picture never does: it has one address wherever it is named (see
 * `VERSIONED_ASSETS` in load.mjs).
 */
export const assetUrl = (db, path) => {
  const v = db.assetVersions?.[path];
  return v ? `/${path}?v=${v}` : `/${path}`;
};

const img = assetUrl;

/**
 * The filter bar for a gallery. Shipped `hidden`: without JavaScript it would
 * be buttons that do nothing, and every card is already on the page anyway.
 */
function filterBar(c, groups, counts, total) {
  return `<div class="filters" data-filter-bar hidden>
  <span class="filters__label" aria-hidden="true">${e(c.ui.filterLabel)}</span>
  <button class="filter" type="button" data-filter="all" aria-pressed="true">${e(c.ui.filterAll)} <span class="filter__count">${total}</span></button>
${groups
  .filter(([key]) => counts[key])
  .map(
    ([key, label]) =>
      `  <button class="filter" type="button" data-filter="${e(key)}" aria-pressed="false">${e(label)} <span class="filter__count">${counts[key]}</span></button>`,
  )
  .join('\n')}
</div>`;
}

/**
 * The alt text of a screenshot says what the picture shows, and whose it is:
 * "Screenshot of the website of Aya Rady, Personal branding strategist for
 * experts and consultants, desktop view".
 *
 * It does not name Nour. These are pictures of other people's sites, and an
 * image search for his name should find his portrait, not thirty-nine
 * screenshots that each repeat it.
 *
 * `s` is a client site, which belongs to a `segment` of the showcase and is
 * called a website, with what its owner does; or a project or the design
 * lab, which is named as it is: a project is an app, and its `role` is what
 * Nour did on it, not what it is. `view` is `shotDesktop` or `shotPhone`.
 */
export function shotAlt(db, s, view, lang) {
  const ui = db.copy[lang].ui;
  // A project's name is one string; a site's is per language.
  const name = typeof s.name === 'string' ? s.name : s.name[lang];
  const site = Boolean(s.segment && s.role);
  return (site ? ui.shotOfSite : ui.shotOf)
    .replace('{name}', name)
    .replace('{role}', site ? s.role[lang] : '')
    .replace('{view}', ui[view]);
}

/**
 * A browser window holding the desktop shot, with the phone leaning on it.
 *
 * With a `caption` the stage sits inside a figure of its own, under which
 * the caption names what is shown. That is how a detail page shows it: an
 * image with words beside it that say what it is. The caption cannot go
 * inside the stage itself, where the phone hangs over the bottom edge.
 */
function deviceStage(db, s, lang, { phone = true, caption = null } = {}) {
  // A project's name is one string; a site's is per language.
  const name = typeof s.name === 'string' ? s.name : s.name[lang];
  const host = s.url ? s.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : name;
  const tag = caption ? 'div' : 'figure';
  const stage = `<${tag} class="show__media">
    <span class="browser">
      <span class="browser__bar" aria-hidden="true"><i></i><i></i><i></i><span class="browser__url">${e(host)}</span></span>
      <img src="${img(db, s.images.desktop)}" alt="${e(shotAlt(db, s, 'shotDesktop', lang))}" width="1200" height="750" loading="lazy" decoding="async">
    </span>${
      phone && s.images.phone
        ? `
    <span class="phone"><img src="${img(db, s.images.phone)}" alt="${e(shotAlt(db, s, 'shotPhone', lang))}" width="390" height="844" loading="lazy" decoding="async"></span>`
        : ''
    }
  </${tag}>`;
  return caption
    ? `<figure class="shots" data-reveal>
  ${stage}
  <figcaption class="shots__caption">${e(caption)}</figcaption>
</figure>`
    : stage;
}

/* The name of a site as a link to it, when it has a public address: the
   words of the link are then the name of the site, not "visit the site". */
const siteTitle = (c, name, url) =>
  url ? `<a href="${e(url)}"${extAttrs(url)}>${e(name)}${newTabHint(c.ui.opensInNewTab)}</a>` : e(name);

function siteCard(db, s, lang) {
  const c = db.copy[lang];
  const foot = s.url
    ? `<a class="btn btn--ghost" href="${e(s.url)}"${extAttrs(s.url)}>${e(c.ui.visitSite)}${newTabHint(c.ui.opensInNewTab)}</a>`
    : `<span class="note-private">${e(c.ui.privateSite)}</span>`;
  return `<li class="show" data-filter-item data-group="${e(s.segment)}" id="${e(s.id)}" data-reveal>
  ${deviceStage(db, s, lang)}
  <div class="show__body">
    <p class="card__meta"><span>${e(c.showcase.segments[s.segment])}</span><span>${e(yearOf(s.year, lang))}</span></p>
    <h3 class="card__title">${siteTitle(c, s.name[lang], s.url)}</h3>
    <p class="show__role">${e(s.role[lang])}</p>
    <dl class="card__body"><dt>${e(c.ui.idea)}</dt><dd>${e(s.concept[lang])}</dd></dl>
    ${list(s.highlights[lang].map(e), 'card__list')}
    ${badges(tagsOf(s.tags, lang))}
    <div class="card__foot">${foot}</div>
  </div>
</li>`;
}

export function showcaseList(db, lang) {
  const c = db.copy[lang];
  const { sites } = db.showcase;
  const counts = {};
  for (const s of sites) counts[s.segment] = (counts[s.segment] ?? 0) + 1;

  return `${filterBar(c, Object.entries(c.showcase.segments), counts, sites.length)}
<ul class="shows" data-filter-list>
${sites.map((s) => siteCard(db, s, lang)).join('\n')}
</ul>`;
}

export function showcaseLab(db, lang) {
  const c = db.copy[lang];
  const l = db.showcase.lab;
  return `<article class="lab" id="${e(l.id)}" data-reveal>
  ${deviceStage(db, l, lang, { phone: false })}
  <div class="show__body">
    <p class="lab__count"><b data-count>${e(l.count)}</b><span>${e(l.countLabel[lang])}</span></p>
    <h3 class="card__title">${siteTitle(c, l.name[lang], l.url)}</h3>
    <p class="card__body">${e(l.tagline[lang])}</p>
    ${badges(tagsOf(l.tags, lang))}
    <div class="card__foot"><a class="btn" href="${e(l.url)}"${extAttrs(l.url)}>${e(c.showcase.labButton)}${newTabHint(c.ui.opensInNewTab)}</a></div>
  </div>
</article>`;
}

/**
 * What a client gets and where he works, in plain words above the gallery.
 *
 * One card in two parts: the list on one side, the place on the other. Both
 * headings are real headings, so the page says what is on offer before it
 * shows a single screenshot.
 */
export function showcaseOffer(db, lang) {
  const c = db.copy[lang].showcase;
  return `<div class="card card--row" data-reveal>
  <div class="card__main">
    <h2 class="card__title">${e(c.offerTitle)}</h2>
    ${list(c.offer.map(e), 'card__list')}
  </div>
  <div class="card__aside">
    <h2 class="card__title">${e(c.whereTitle)}</h2>
    <p class="card__body">${e(c.where)}</p>
  </div>
</div>`;
}

/** Three sites on the home page — one of each kind where possible. */
export function homeShowcase(db, lang) {
  const c = db.copy[lang];
  const { sites } = db.showcase;
  const picks = [];
  for (const seg of ['people', 'shops', 'companies']) {
    const s = sites.find((x) => x.segment === seg && x.url && !picks.includes(x));
    if (s) picks.push(s);
  }
  return picks
    .map(
      (s) => `<article data-reveal class="show">
  ${deviceStage(db, s, lang)}
  <div class="show__body">
    <p class="card__meta"><span>${e(c.showcase.segments[s.segment])}</span><span>${e(yearOf(s.year, lang))}</span></p>
    <h3 class="card__title"><a href="${itemHref('showcase', s.id, lang)}">${e(s.name[lang])}</a></h3>
    <p class="show__role">${e(s.role[lang])}</p>
  </div>
</article>`,
    )
    .join('\n');
}

/* ------------------------------------------------------------ automation */

/** Every workflow across every system — the honest count. */
export const workflowTotal = (db) => db.workflows.reduce((s, w) => s + (w.workflowCount ?? 1), 0);

/* "5 workflows · 74 nodes", or nothing for a system that states no count.
   Arabic takes the label first ("العقد: 7"): a bare number before a noun
   would need a different noun form for every number. English needs only the
   singular, for a system that is a single workflow. */
function systemCount(w, lang, c) {
  if (!w.workflowCount) return '';
  const unit = (n, label) => (lang === 'ar' ? `${e(label)}: <b>${e(n)}</b>` : `<b>${e(n)}</b> ${e(label)}`);
  return `<span class="system__count">${unit(w.workflowCount, w.workflowCount === 1 ? c.ui.workflowUnit : c.ui.workflowsUnit)}${
    w.nodeCount ? ` · ${unit(w.nodeCount, c.ui.nodesUnit)}` : ''
  }</span>`;
}

const canvasDialogId = (w) => `canvas-${w.id}`;

/* "<name>: The real canvas in n8n", the caption under the screenshot and the name of its viewer. */
const canvasCaption = (w, lang, c) => `${w.name[lang]}: ${c.ui.canvasCaption}`;

/* The alt text of that screenshot says what the picture shows: the nodes of
   the system and how they connect. The caption beside it already names it. */
const canvasAlt = (w, lang, c) => named(c.ui.canvasAlt, w.name[lang]);

/* The link that opens the full-size canvas. It says which system the canvas
   belongs to: fifteen links that all read "see the canvas" tell a reader, or
   a search engine, nothing about where each one goes. */
function canvasLink(db, w, lang) {
  if (!w.canvas) return '';
  const c = db.copy[lang];
  return `<a class="canvas-open" href="${img(db, w.canvas)}" data-dialog-open="${canvasDialogId(w)}" target="_blank" rel="noopener">${e(named(c.ui.canvasOf, w.name[lang]))}${newTabHint(c.ui.opensInNewTab)}</a>`;
}

/* The viewer: the canvas at its real size in a dialog, which main.js opens
   from the link above. The image is in the HTML whether or not it opens. */
function canvasDialog(db, w, lang) {
  if (!w.canvas) return '';
  const c = db.copy[lang];
  const name = w.name[lang];
  return `
  <dialog class="lightbox" id="${canvasDialogId(w)}" aria-label="${e(canvasCaption(w, lang, c))}">
    <div class="lightbox__head">
      <span>${e(name)} · ${e(c.ui.canvasCaption)}${
        (w.canvasSize?.[0] ?? 0) > 1280 ? ` <span class="lightbox__hint">${e(c.ui.panHint)}</span>` : ''
      }</span>
      <form method="dialog"><button class="lightbox__close" aria-label="${e(c.ui.closeCanvas)}">&times;</button></form>
    </div>
    <div class="lightbox__body"><img src="${img(db, w.canvas)}" alt="${e(canvasAlt(w, lang, c))}"${
      w.canvasSize ? ` width="${w.canvasSize[0]}" height="${w.canvasSize[1]}"` : ''
    } loading="lazy" decoding="async"></div>
  </dialog>`;
}

/* The curated diagram, captioned with the size of the system and the way to
   the real canvas. A system with no flow keeps only the caption. */
function systemDiagram(db, w, lang) {
  const count = systemCount(w, lang, db.copy[lang]);
  const link = canvasLink(db, w, lang);
  if (!w.flow) return count || link ? `<p class="system__caption">${count}${link}</p>` : '';
  return `<figure class="system__diagram">
    <div class="wf-frame">
      ${flowDiagram(w.flow, lang, { id: w.id, title: w.name[lang] })}
    </div>
    <figcaption class="system__caption">${count}${link}</figcaption>
  </figure>`;
}

function systemCard(db, w, lang, { compact = false } = {}) {
  const c = db.copy[lang];
  const name = w.name[lang];
  // The title leads to where the system is read in full. One with neither a
  // page nor a product page has only this card, so its title stays plain.
  const to = hasDetail(db, w) ? systemHref(db, w, lang) : null;

  return `<article data-reveal data-filter-item data-group="${e((w.audience ?? []).join(' '))}" class="card system${w.featured ? ' card--featured' : ''}" id="${e(w.id)}">
  <p class="card__meta"><span class="status status--${e(w.status)}">${e(c.ui.status[w.status])}</span><span>${e(w.kind[lang])}</span><span>${e(yearOf(w.year, lang))}</span></p>
  <h3 class="card__title">${to ? `<a href="${to}">${e(name)}</a>` : e(name)}</h3>
  <p class="card__body">${prose(db, w.summary[lang], lang)}</p>
  ${systemDiagram(db, w, lang)}
  <div class="system__detail">
    ${list(w.highlights[lang].slice(0, compact ? 3 : undefined).map((h) => prose(db, h, lang)), 'card__list')}
    <dl class="card__body">
      <dt>${e(c.ui.trigger)}</dt><dd>${e(w.trigger[lang])}</dd>
      <dt>${e(c.ui.services)}</dt><dd>${badges(w.services)}</dd>
      ${compact ? '' : `<dt>${e(c.ui.outcome)}</dt><dd>${prose(db, w.outcome[lang], lang)}</dd>`}
    </dl>
  </div>${to ? `
  <div class="card__foot">${detailsLink(c, to, name)}</div>` : ''}${canvasDialog(db, w, lang)}
</article>`;
}

/**
 * What he automates, in the words a business owner would use, before the
 * list of systems that only an engineer would search for by name.
 *
 * Each card ends with the systems that back it: the sentence is the claim,
 * the link is the proof. A system is linked where it is read in full
 * (`systemHref`): its own page, the page of the product it runs, or, for one
 * that has neither, its card further down this page.
 */
export function automationServices(db, lang) {
  return servicesOf(db, lang)
    .map(
      (s) => `<article data-reveal class="card" id="service-${e(s.id)}">
  <h3 class="card__title">${e(s.title)}</h3>
  <p class="card__body">${e(s.body)}</p>
  <ul class="card__links">
${s.systems.map((w) => `    <li><a href="${systemHref(db, w, lang)}">${e(w.name[lang])}</a></li>`).join('\n')}
  </ul>
</article>`,
    )
    .join('\n');
}

/** How a project runs, as numbered steps: the same component the cost case study uses. */
export function automationProcess(db, lang) {
  return `<ol class="steps steps--row">
${db.copy[lang].automation.process
  .map(
    (step, i) => `  <li class="steps__item" data-reveal>
    <span class="steps__num" aria-hidden="true">${i + 1}</span>
    <p>${e(step)}</p>
  </li>`,
  )
  .join('\n')}
</ol>`;
}

export function automationSystems(db, lang, tier) {
  const c = db.copy[lang];
  const rows = db.workflows.filter((w) => w.tier === tier);
  return rows.map((w) => systemCard(db, w, lang, { compact: tier !== 'system' })).join('\n');
}

/** One filter bar drives both tiers — they share the `data-filter-list` scope of the page. */
export function automationFilters(db, lang) {
  const c = db.copy[lang];
  const counts = {};
  for (const w of db.workflows) for (const a of w.audience ?? []) counts[a] = (counts[a] ?? 0) + 1;
  return filterBar(c, Object.entries(c.automation.audiences), counts, db.workflows.length);
}

export function automationLegend(db, lang) {
  const c = db.copy[lang];
  return `<ul class="legend">
${['client', 'live', 'built']
  .map((s) => `  <li><span class="status status--${s}">${e(c.ui.status[s])}</span></li>`)
  .join('\n')}
  <li>${e(c.automation.diagramNote)}</li>
</ul>`;
}

export function automationCase(db, lang) {
  const cs = db.caseStudy;
  const f = cs.flow;

  const figures = cs.figures
    .map(
      (x) => `      <li class="figure figure--${e(x.tone)}">
        <span class="figure__value">${e(x.value)}</span>
        <span class="figure__label">${e(x.label[lang])}</span>
      </li>`,
    )
    .join('\n');

  const branches = f.branches
    .map(
      (b) => `        <li class="flow__branch flow__branch--${e(b.tone)}">
          <span class="flow__answer">${e(b.answer[lang])}</span>
          <span class="flow__node">
            <span class="flow__node-label">${e(b.node[lang])}</span>
            <span class="flow__cost">${e(b.cost)}</span>
          </span>
        </li>`,
    )
    .join('\n');

  // The prose becomes numbered steps: mistake, reason, fix, caveat.
  const steps = db.copy[lang].automation.caseBody
    .map(
      (para, i) => `      <li class="steps__item" data-reveal>
        <span class="steps__num" aria-hidden="true">${i + 1}</span>
        <p>${prose(db, para, lang)}</p>
      </li>`,
    )
    .join('\n');

  return `<div class="case">
  <ul class="case__figures">
${figures}
  </ul>

  <figure class="flow" data-reveal>
    <span class="flow__node flow__node--trigger">${e(f.trigger[lang])}</span>
    <span class="flow__stem" aria-hidden="true"></span>
    <span class="flow__node flow__node--decision">${e(f.decision[lang])}</span>
    <ul class="flow__branches">
${branches}
    </ul>
    <figcaption class="flow__fallback">${e(f.fallback[lang])}</figcaption>
  </figure>

  <p class="case__scale">
    <span class="case__basis">${e(cs.scale.basis[lang])}</span>
    <span class="case__delta">
      <s>${e(cs.scale.before)}</s>
      <span aria-hidden="true">→</span>
      <strong>${e(cs.scale.after)}</strong>
    </span>
  </p>

  <ol class="steps">
${steps}
  </ol>
</div>`;
}

/* ---------------------------------------------------------- detail pages */

/*
 * A page of its own for one project or one automation system. Everything on
 * it comes from the entry in data/: these blocks only lay it out, with the
 * same components the list pages use.
 */

/**
 * The trail above the heading: home, the list page, this page. The names are
 * the ones the BreadcrumbList in the head gives (`ld.pageTitle`).
 */
export function detailCrumbs(db, lang, d) {
  const c = db.copy[lang];
  return `<nav class="crumbs" aria-label="${e(c.ui.breadcrumb)}">
        <ol>
          <li><a href="${href('', lang)}">${e(ld.pageTitle(db, '', lang))}</a></li>
          <li><a href="${href(d.parent, lang)}">${e(ld.pageTitle(db, d.parent, lang))}</a></li>
          <li aria-current="page">${e(detailName(d, lang))}</li>
        </ol>
      </nav>`;
}

/**
 * The quiet line under the headline: for a system its honest status and who
 * it is for, then what kind of thing this is and the year.
 *
 * The category or kind is left out when the entry has no search headline,
 * because the line above it is then already the category.
 */
export function detailFacts(db, lang, d) {
  const c = db.copy[lang];
  const x = d.entry;
  const parts = [];
  if (d.kind === 'system') {
    parts.push(`<span class="status status--${e(x.status)}">${e(c.ui.status[x.status])}</span>`);
    for (const a of x.audience ?? []) parts.push(`<span>${e(c.automation.audiences[a])}</span>`);
  }
  if (x.headline) parts.push(`<span>${e((d.kind === 'project' ? x.category : x.kind)[lang])}</span>`);
  parts.push(`<span>${e(yearOf(x.year, lang))}</span>`);
  return `<p class="card__meta detail__meta">${parts.join('')}</p>`;
}

/**
 * What the head of a detail page says: the title and description from
 * details.mjs, and the picture the page is shared with, described by the
 * same words as the image in the page.
 */
export function detailHead(db, lang, d, { title, description, image }) {
  if (!image) return { title, description, image: null };
  const alt =
    d.kind === 'project' && image.path === d.entry.images?.desktop
      ? shotAlt(db, d.entry, 'shotDesktop', lang)
      : canvasAlt(d.kind === 'project' ? engineOf(db, d.entry) : d.entry, lang, db.copy[lang]);
  return { title, description, image: { ...image, alt } };
}

/* A heading for one part of a detail page. On a system page the parts are
   the page's own sections; inside "the automation behind it" on a project
   page they sit one level down. */
const partHead = (level, title, lead = null) =>
  level === 2
    ? `<div class="section__head" data-reveal>
      <div class="section__titlebar"><h2>${e(title)}</h2></div>${lead ? `
      <p class="section__lead">${e(lead)}</p>` : ''}
    </div>`
    : `<h3 class="detail__title detail__title--part" data-reveal>${e(title)}</h3>${lead ? `
    <p class="detail__lead">${e(lead)}</p>` : ''}`;

/* A canvas wider than this, at the height the page shows it, does not fit a
   desktop column either, so the hint to scroll is shown at every width. */
const CANVAS_SHOWN = { height: 380, fits: 1000 };

/**
 * The real n8n canvas, shown in the page.
 *
 * The curated diagram says how the system works; this is the evidence that
 * it exists. It is an `<img>` in a `<figure>` with a caption naming the
 * system, which is what an image search reads, and an alt that describes
 * the picture. A canvas is far wider than a page, so it scrolls inside its
 * own frame, starting from the trigger in either language, and the page
 * itself never scrolls sideways. The frame can take focus, so the keyboard
 * can scroll it too; it is named by the caption, not by a sentence of its
 * own that a screen reader would hear a second time.
 */
function canvasFigure(db, w, lang) {
  const c = db.copy[lang];
  const [width, height] = db.imageSizes?.[w.canvas] ?? w.canvasSize ?? [];
  const captionId = `canvas-caption-${w.id}`;
  const shownWidth = width && height ? width * Math.min(1, CANVAS_SHOWN.height / height) : 0;
  return `<figure class="canvas-shot${shownWidth > CANVAS_SHOWN.fits ? ' canvas-shot--wide' : ''}" data-reveal>
      <div class="canvas-shot__scroll" role="group" aria-labelledby="${captionId}" tabindex="0"${height ? ` style="--canvas-h:${height}px"` : ''}>
        <img src="${img(db, w.canvas)}" alt="${e(canvasAlt(w, lang, c))}"${width && height ? ` width="${width}" height="${height}"` : ''} loading="lazy" decoding="async">
      </div>
      <figcaption class="canvas-shot__caption"><span id="${captionId}">${e(canvasCaption(w, lang, c))}</span><span class="canvas-shot__hint">${e(c.ui.panHint)}</span></figcaption>
    </figure>`;
}

/**
 * Everything a system has to say after its summary: what it handles, how it
 * works as numbered steps and as a diagram, the real canvas, and the outcome.
 *
 * The steps are the curated flow in the order it runs (`flowOrder`), written
 * as text in the page: the diagram draws the same labels, but a list is what
 * a reader on a phone, a screen reader and a search engine can follow.
 *
 * A graph that branches is flattened by that list, so the alternatives after
 * a fork read as one step after another. The note above the list says so
 * (`detail.howNote`), and the note about where the diagram comes from sits
 * with the diagram, in the singular: this page has one.
 */
export function systemBody(db, lang, w, { level = 2 } = {}) {
  const c = db.copy[lang];

  const handles = `<div class="detail__part">
    ${partHead(level, c.detail.handles)}
    <div class="card card--row" data-reveal>
      <div class="card__main">
        ${list(w.highlights[lang].map((h) => prose(db, h, lang)), 'card__list')}
      </div>
      <aside class="card__aside">
        <dl class="card__body">
          <dt>${e(c.ui.trigger)}</dt><dd>${e(w.trigger[lang])}</dd>
          <dt>${e(c.ui.services)}</dt><dd>${badges(w.services)}</dd>
        </dl>
      </aside>
    </div>
  </div>`;

  const how = w.flow
    ? `
  <div class="detail__part">
    ${partHead(level, c.detail.how, c.detail.howNote)}
    <ol class="steps steps--row detail__steps">
${flowOrder(w.flow)
  .map(
    (n, i) => `      <li class="steps__item" data-reveal>
        <span class="steps__num" aria-hidden="true">${i + 1}</span>
        <p>${e(n.label[lang])}${n.service ? ` <span class="steps__service">${e(n.service)}</span>` : ''}</p>
      </li>`,
  )
  .join('\n')}
    </ol>
    <p class="detail__note" data-reveal>${e(c.detail.diagramNote)}</p>
    ${systemDiagram(db, w, lang)}
  </div>`
    : '';

  const canvas = w.canvas
    ? `
  <div class="detail__part">
    ${partHead(level, c.ui.canvasCaption)}
    ${canvasFigure(db, w, lang)}
  </div>`
    : '';

  return `<div class="detail">
  ${handles}${how}${canvas}
  <div class="detail__part">
    ${partHead(level, c.ui.outcome)}
    <p class="detail__outcome" data-reveal>${prose(db, w.outcome[lang], lang)}</p>
  </div>${canvasDialog(db, w, lang)}
</div>`;
}

/**
 * The body of a project page: the screenshots when there are any, then the
 * problem, what he built and his role as headed text, with the figures and
 * the stack beside it. The context of an entry, when it has one, is why the
 * problem matters now, so it follows the problem.
 *
 * The heading over the figures says "In numbers", so it is printed only when
 * every one of them is a number: "Live" and "MCP" are facts worth showing,
 * but not under that heading.
 */
export function projectBody(db, lang, p) {
  const c = db.copy[lang];
  const shots = p.images ? `${deviceStage(db, p, lang, { caption: named(c.detail.shots, p.name) })}\n  ` : '';
  const numeric = (p.metrics ?? []).every((m) => /\d/.test(m.value));
  const metrics = p.metrics?.length
    ? `${numeric ? `<h2 class="detail__title">${e(c.detail.numbers)}</h2>\n      ` : ''}<ul class="proof proof--inline">${p.metrics
        .map(
          (m) =>
            `<li class="proof__item"><span class="proof__value" data-count>${e(m.value)}</span><span class="proof__label">${e(m.label[lang])}</span></li>`,
        )
        .join('')}</ul>
      `
    : '';

  return `<div class="detail">
  ${shots}<div class="card card--row" data-reveal>
    <div class="card__main">
      <h2 class="detail__title">${e(c.ui.problem)}</h2>
      <p class="detail__text">${prose(db, p.problem[lang], lang)}</p>${p.context ? `
      <p class="detail__text"><em>${prose(db, p.context[lang], lang)}</em></p>` : ''}
      <h2 class="detail__title">${e(c.ui.built)}</h2>
      <p class="detail__text">${prose(db, p.built[lang], lang)}</p>
      <h2 class="detail__title">${e(c.ui.role)}</h2>
      <p class="detail__text">${prose(db, p.role[lang], lang)}</p>
    </div>
    <aside class="card__aside">
      ${metrics}<h2 class="detail__title">${e(c.ui.stack)}</h2>
      ${badges(p.stack)}
    </aside>
  </div>
</div>`;
}

/**
 * "The automation behind it": the workflow a product names as its engine,
 * shown in full on the product's page. That workflow has no page of its own,
 * so this is where its card on the automation page leads.
 */
export function projectEngine(db, lang, p) {
  const w = engineOf(db, p);
  if (!w) return '';
  const c = db.copy[lang];
  return `      <div class="section__head" data-reveal>
        <div class="section__titlebar"><h2>${e(c.detail.engineTitle)}</h2></div>
        <p class="card__meta detail__meta"><span class="status status--${e(w.status)}">${e(c.ui.status[w.status])}</span><span>${e(w.name[lang])}</span><span>${e(w.kind[lang])}</span></p>
        <p class="section__lead">${prose(db, w.summary[lang], lang)}</p>
      </div>
${systemBody(db, lang, w, { level: 3 })}`;
}

/**
 * The foot of a detail page, as groups of cards, each `{ id, title, cards }`:
 * the other projects of the same group, or the other systems built for the
 * same audience. A project that shows an engine adds the systems built for
 * the audience of that engine (`engineNeighbours`), so a system page is
 * reached from more than its list page. A group with nothing in it is left
 * out, and the list is empty when there are none.
 */
export function detailRelated(db, lang, d) {
  const c = db.copy[lang];
  const projectCard = (p) => `<article data-reveal class="card">
  <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(yearOf(p.year, lang))}</span></p>
  <h3 class="card__title"><a href="${projectHref(p, lang)}">${e(p.name)}</a></h3>
  <p class="card__body">${e(p.headline?.[lang] ?? p.tagline[lang])}</p>
</article>`;
  const systemCardShort = (w) => `<article data-reveal class="card">
  <p class="card__meta"><span class="status status--${e(w.status)}">${e(c.ui.status[w.status])}</span><span>${e(yearOf(w.year, lang))}</span></p>
  <h3 class="card__title"><a href="${systemHref(db, w, lang)}">${e(w.name[lang])}</a></h3>
  <p class="card__body">${e(w.headline?.[lang] ?? w.kind[lang])}</p>
</article>`;

  const groups =
    d.kind === 'project'
      ? [
          { id: 'more', title: c.detail.moreProjects, cards: relatedProjects(db, d.entry).map(projectCard) },
          { id: 'more-systems', title: c.detail.moreSystems, cards: engineNeighbours(db, d.entry).map(systemCardShort) },
        ]
      : [{ id: 'more', title: c.detail.moreSystems, cards: relatedSystems(db, d.entry).map(systemCardShort) }];

  return groups.filter((g) => g.cards.length).map((g) => ({ ...g, cards: g.cards.join('\n') }));
}

/* --------------------------------------------------------------- contact */

/**
 * The address of a WhatsApp chat with him, with the first line of the
 * message written in the language of the page (see contact.mjs).
 */
export const whatsappHref = (db, lang) => whatsappUrl(db.profile, db.copy[lang].contact.whatsappText);

/**
 * The button that opens that chat. `cls` is the weight the place asks for:
 * the primary button where WhatsApp comes first, a quiet one beside email.
 */
export function whatsappButton(db, lang, cls = 'btn') {
  const c = db.copy[lang];
  const url = whatsappHref(db, lang);
  return `<a class="${cls}" href="${e(url)}"${extAttrs(url)}>${e(c.ui.whatsappMe)}${newTabHint(c.ui.opensInNewTab)}</a>`;
}

export function contactLinks(db, lang) {
  const { profile } = db;
  const c = db.copy[lang];
  const phone = phoneDisplay(profile.phone);
  const email = { platform: c.contact.emailLabel, url: `mailto:${profile.email}`, value: profile.email };
  const whatsapp = { platform: c.contact.whatsappLabel, url: whatsappHref(db, lang), value: phone };
  const rows = [
    // The three that are words, in the language of the page: the direct ways
    // to reach him, with WhatsApp first where its readers write there first
    // and beside email everywhere. The rest are the names of the places his
    // profiles are on, the same in both languages.
    ...(whatsappFirst(lang) ? [whatsapp, email] : [email, whatsapp]),
    { platform: c.contact.phoneLabel, url: `tel:${profile.phone}`, value: phone },
    // Unresolved links are skipped entirely — never rendered as dead anchors.
    // `contactChannel: false` marks a link that belongs in the identity graph
    // but is not a way to reach him (a product page, say).
    ...profile.sameAs
      .filter((s) => s.url && s.contactChannel !== false)
      .map((s) => ({ platform: s.platform, url: s.url, value: s.url.replace(/^https?:\/\//, '') })),
  ];

  return `<ul class="linklist linklist--grid">
${rows
  .map(
    (r) => `  <li><a href="${e(r.url)}"${extAttrs(r.url)}>
    <span class="linklist__mark" aria-hidden="true"></span>
    <span class="linklist__text">
      <span class="platform">${e(r.platform)}</span>
      <span class="value">${e(r.value)}</span>
    </span>${extAttrs(r.url) ? newTabHint(c.ui.opensInNewTab) : ''}
  </a></li>`,
  )
  .join('\n')}
</ul>`;
}

export function contactCv(db, lang) {
  const c = db.copy[lang];
  return `<ul class="linklist">
${db.profile.cv
  .map(
    (cv) => `  <li><a href="${e(img(db, cv.file))}" download>
    <span class="linklist__mark linklist__mark--download" aria-hidden="true"></span>
    <span class="linklist__text">
      <span class="platform">${e(cv.label[lang])}</span>
      <span class="value value--label">${e(c.ui.downloadCv)} · PDF</span>
    </span>
  </a></li>`,
  )
  .join('\n')}
</ul>`;
}

export function contactAvailability(db, lang) {
  const a = db.profile.availability;
  const c = db.copy[lang];
  return `<h3 class="card__title">${e(c.contact.availabilityTitle)}</h3>
<p class="card__body">${e(db.profile.location.city[lang])}${lang === 'ar' ? '،' : ','} ${e(db.profile.location.country[lang])}${a.openToWork ? ` · ${e(c.contact.availableNow)}` : ''}</p>
${badges(a.arrangements[lang])}${
    a.roles
      ? `
<h4 class="card__title card__title--sub">${e(c.contact.rolesTitle)}</h4>
${badges(a.roles[lang])}
<h4 class="card__title card__title--sub">${e(c.contact.areasTitle)}</h4>
${badges(a.areas[lang])}`
      : ''
  }`;
}

export function contactMcp(db, lang) {
  const b = base(db);
  const snippet = JSON.stringify(
    { mcpServers: { 'nour-profile': { command: 'node', args: ['/path/to/portfolio/mcp/server.js'] } } },
    null,
    2,
  );

  const hint = newTabHint(db.copy[lang].ui.opensInNewTab);
  const row = (path, name, note) =>
    `  <li><a href="${b}${path}" target="_blank" rel="noopener"><span class="platform">${e(name)}</span><span class="value">${e(note)}</span>${hint}</a></li>`;

  return `<ul class="linklist">
${row('/llms.txt', 'llms.txt', 'site index for language models')}
${row('/llms-full.txt', 'llms-full.txt', 'complete profile, one document')}
${row('/api/profile.json', 'profile.json', 'identity and links')}
${row('/api/resume.json', 'resume.json', 'JSON Resume standard')}
</ul>
<pre><code>${e(snippet)}</code></pre>`;
}
