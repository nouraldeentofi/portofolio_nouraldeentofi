/**
 * Page templates.
 *
 * Each function returns a complete HTML document. Everything a reader or a
 * crawler needs is inlined here at build time — no runtime rendering.
 */

import { escapeHtml, extAttrs, newTabHint } from './render.mjs';
import * as B from './blocks.mjs';
import * as ld from './jsonld.mjs';
import { PAGES, LANGS, pagePath } from './sitemap.mjs';
import {
  ENGINE_ANCHOR,
  detailPages,
  detailName,
  detailHeadline,
  detailTitle,
  detailDescription,
  detailImage,
  engineOf,
} from './details.mjs';

const e = escapeHtml;
const PAGE_KEY = { '': 'home', about: 'about', work: 'work', projects: 'projects', showcase: 'showcase', automation: 'automation', chat: 'chat', contact: 'contact' };

/* Which whole-page background each page runs — one visual family, one
   metaphor per page. */
/* The 'For AI assistants' block on the contact page is hidden for now.
   Everything it advertised still exists and works — llms.txt, robots.txt,
   /api/*.json and the MCP server are untouched; only the visible section
   is suppressed. Flip to true to bring it back. */
const SHOW_MCP_SECTION = false;

const PAGE_VARIANT = { '': 'graph', about: 'orbit', work: 'flow', projects: 'grid', showcase: 'grid', automation: 'branch', chat: 'drift', contact: 'signal' };

/* The galleries' stylesheet, only where a gallery is on the page. */
const GALLERY_PAGES = new Set(['', 'projects', 'showcase', 'automation']);

/**
 * A link to another page *in the same language*, from the site root.
 *
 * Root-relative so it also works from the 404 page, which is served at
 * whatever address was not found. See `pagePath` for why there is no `.html`.
 */
const rel = pagePath;

/**
 * His name in the other script: Latin on the Arabic pages, Arabic on the
 * English ones.
 *
 * Each language used to show only its own spelling, so someone who searched
 * the Latin name and landed on the Arabic home page found no trace of what
 * they typed. `lang` and `dir` travel with the text, so a screen reader
 * pronounces it and the browser lays it out as the script it is.
 */
function otherName(db, lang) {
  const other = lang === 'ar' ? 'en' : 'ar';
  return { text: db.profile.name[other], lang: other, dir: other === 'ar' ? 'rtl' : 'ltr' };
}

/**
 * The address of a file, from the site root.
 *
 * Never relative to the page: a page one level down (`/en/projects/<id>`),
 * and the 404 page, which is served at whatever address was not found, would
 * each resolve a relative address somewhere else.
 */
const asset = (path) => `/${path}`;

/**
 * The same path, fingerprinted when the loader fingerprints it.
 *
 * Only stylesheets, scripts and the CV carry a hash: the browser caches them
 * hard. A picture keeps its bare address, so it is the same one in the page,
 * in `og:image` and in the structured data. `llms.txt` and the JSON API keep
 * clean URLs on purpose too: those are addresses other people quote, and a
 * hash in them would rot the moment we rebuild.
 * See `VERSIONED_ASSETS` in load.mjs for why the query string is there.
 */
const assetV = B.assetUrl;

/**
 * The portrait, as a plain link to the full-size file.
 *
 * With scripts off it simply opens the image — which is why it is an anchor
 * and not a button. `main.js` upgrades the same anchor into the dialog at the
 * foot of the page. Nothing here depends on JavaScript to be reachable.
 */
function portraitTrigger(db, lang, cls) {
  const c = db.copy[lang];
  const name = e(db.profile.name[lang]);
  return `<a class="${cls} portrait-open" href="${asset(db.profile.image)}" aria-label="${e(c.ui.viewPortrait)}">
          <img src="${asset('assets/img/nour-96.png')}" alt="${name}" width="36" height="36" decoding="async">
        </a>`;
}

/**
 * Marks where the reader is in a navigation. On the page itself that is
 * `aria-current="page"`. On a page one level down, the link to its list page
 * is marked as the current section instead: it is where the reader is, but
 * it is not the page they are on, and the link still leads somewhere.
 */
const currentMark = (item, page, section) =>
  item === page ? ' aria-current="page"' : item === section ? ' aria-current="true"' : '';

function header(db, page, lang, section = page) {
  const c = db.copy[lang];

  const nav = PAGES.map((p) => {
    return `          <a href="${rel(p, lang)}"${currentMark(p, page, section)}>${e(c.nav[PAGE_KEY[p]])}</a>`;
  }).join('\n');

  // The language switch points at the same page in the other tree.
  const otherHref = pagePath(page, lang === 'ar' ? 'en' : 'ar');

  return `  <header class="site-header">
    <div class="container site-header__inner">
      <div class="brand">
        ${portraitTrigger(db, lang, 'brand__mark')}
        <a class="brand__name" href="${rel('', lang)}">${e(db.profile.name[lang])}</a>
      </div>
      <nav class="site-nav" aria-label="${e(c.nav.home)}">
${nav}
      </nav>
      <div class="header__tools">
        <a class="lang-switch" href="${otherHref}" lang="${lang === 'en' ? 'ar' : 'en'}" hreflang="${lang === 'en' ? 'ar' : 'en'}">${e(c.meta.langLabel)}</a>
        <button class="theme-toggle" type="button" aria-label="${e(c.ui.toggleTheme)}" aria-pressed="false"><span class="theme-toggle__icon" aria-hidden="true">☀</span></button>
      </div>
    </div>
  </header>`;
}

/**
 * The year comes from the build's own date (`db.build.modified`, see
 * scripts/build.mjs), not from the clock, so the same data always gives the
 * same page. Rendered without a build date, the line simply has no year.
 */
function footer(db, lang) {
  const c = db.copy[lang];
  const year = db.build?.modified?.slice(0, 4);
  const alt = otherName(db, lang);

  return `  <footer class="site-footer">
    <div class="container site-footer__inner">
      <div>
        <p>${e(c.footer.tagline)}</p>
        <p>© ${year ? `${year} ` : ''}${e(db.profile.name[lang])} · <span lang="${alt.lang}" dir="${alt.dir}">${e(alt.text)}</span> · ${e(c.footer.builtWith)}</p>
      </div>
      <ul class="footer__links">
        <li><a href="${asset('llms.txt')}" target="_blank" rel="noopener">llms.txt${newTabHint(c.ui.opensInNewTab)}</a></li>
        <li><a href="${asset('api/resume.json')}" target="_blank" rel="noopener">resume.json${newTabHint(c.ui.opensInNewTab)}</a></li>
        <li><a href="mailto:${e(db.profile.email)}">${e(c.ui.emailMe)}</a></li>
      </ul>
    </div>
  </footer>`;
}

/**
 * The phone navigation — the only one below 768px, so it carries every page.
 *
 * It walks `PAGES` rather than a list of its own. An earlier version kept a
 * hardcoded four, which is exactly how About, Work and Chat came to be
 * unreachable on a phone: a second copy of the page list drifts the moment a
 * page is added. Labels come from `navShort`, which differs from `nav` only
 * where the full wording will not fit at 320px.
 */
function mobileTabs(db, page, lang, section = page) {
  const c = db.copy[lang];

  return `  <nav class="mobile-tabs" aria-label="${e(c.nav.home)}">
${PAGES.map((t) => {
    return `    <a href="${rel(t, lang)}"${currentMark(t, page, section)}><span>${e(c.navShort[PAGE_KEY[t]])}</span></a>`;
  }).join('\n')}
  </nav>`;
}

/**
 * The full-size portrait.
 *
 * Written into the HTML rather than assembled by script, so the image is in
 * the document for a crawler whether or not the dialog ever opens. `<dialog>`
 * brings focus handling and Escape-to-close for free; `main.js` only calls
 * `showModal()`.
 */
function portraitDialog(db, lang) {
  const c = db.copy[lang];
  return `  <dialog class="portrait" id="portrait" aria-label="${e(db.profile.name[lang])}">
    <form method="dialog">
      <button class="portrait__close" aria-label="${e(c.ui.closePortrait)}">&times;</button>
    </form>
    <img src="${asset(db.profile.image)}" alt="${e(db.profile.name[lang])}" width="720" height="720" loading="lazy" decoding="async">
  </dialog>`;
}

/**
 * The document around a page's content.
 *
 * `page` is the key of the page: one of `PAGES`, or `projects/<id>` and
 * `automation/<id>` for a detail page. A detail page also passes `section`,
 * the list page it belongs to, which decides the navigation mark, the
 * background and the stylesheets, and hands its own head in through
 * `opts.meta` and `opts.nodes` (see `headMeta` and `headLd` in blocks.mjs).
 */
function shell(db, page, lang, main, opts = {}) {
  const c = db.copy[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const section = opts.section ?? page;
  const detail = section !== page;
  const fonts =
    lang === 'ar'
      ? 'family=Figtree:wght@300;400;600;800&family=IBM+Plex+Sans+Arabic:wght@300;400;600;700'
      : 'family=Figtree:wght@300;400;600;800';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
${B.headMeta(db, page, lang, opts)}
<script>
/* Set before first paint so reveals never flash, and the stored theme never
   flickers. Also tells CSS that JavaScript is available: without this class
   nothing is ever hidden. */
(function(){var r=document.documentElement;r.classList.add('js');
try{var t=localStorage.getItem('nt-theme');if(t==='light'||t==='dark')r.dataset.theme=t;}catch(e){}
/* honour the visitor's last language choice on every arrival. The query and
   the fragment travel with it: ids are the same in both languages, so a link
   to one item still lands on that item. */
try{var L=localStorage.getItem('nt-lang');var p=location.pathname;var q=location.search+location.hash;
var en=p==='/en'||p.slice(0,4)==='/en/';
if(L==='en'&&!en){location.replace((p==='/'?'/en/':'/en'+p)+q);}
else if(L==='ar'&&en){location.replace((p==='/en'?'/':(p.slice(3)||'/'))+q);}}catch(e){}})();
</script>
<link rel="icon" type="image/png" sizes="180x180" href="${asset('assets/img/icon-180.png')}">
<link rel="icon" type="image/png" sizes="32x32" href="${asset('assets/img/icon-32.png')}">
<link rel="apple-touch-icon" sizes="180x180" href="${asset('assets/img/icon-180.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${assetV(db, 'assets/css/tokens.css')}">
<link rel="stylesheet" href="${assetV(db, 'assets/css/base.css')}">
<link rel="stylesheet" href="${assetV(db, 'assets/css/layout.css')}">
<link rel="stylesheet" href="${assetV(db, 'assets/css/components.css')}">
<link rel="stylesheet" href="${assetV(db, 'assets/css/motion.css')}">${
    GALLERY_PAGES.has(section) ? `\n<link rel="stylesheet" href="${assetV(db, 'assets/css/gallery.css')}">` : ''
  }${
    detail ? `\n<link rel="stylesheet" href="${assetV(db, 'assets/css/detail.css')}">` : ''
  }${
    page === 'chat' ? `\n<link rel="stylesheet" href="${assetV(db, 'assets/css/chat.css')}">` : ''
  }
<link rel="stylesheet" href="${assetV(db, 'assets/css/responsive.css')}">${
    lang === 'ar' ? `\n<link rel="stylesheet" href="${assetV(db, 'assets/css/rtl.css')}">` : ''
  }
${B.headLd(db, page, lang, opts)}
</head>
<body>
<canvas class="site-bg" data-workflow data-variant="${PAGE_VARIANT[section] ?? 'drift'}" aria-hidden="true"></canvas>
<a class="skip-link" href="#main">${e(c.ui.skipToContent)}</a>
${header(db, page, lang, section)}
<main id="main">
<div class="page-spine" aria-hidden="true"><span class="page-spine__fill"></span></div>
${main}
</main>
${footer(db, lang)}
${mobileTabs(db, page, lang, section)}
${portraitDialog(db, lang)}
<script src="${assetV(db, 'assets/js/main.js')}" type="module"></script>${
    page === 'chat' ? `\n<script src="${assetV(db, `assets/js/chat/boot.${lang}.js`)}" type="module"></script>` : ''
  }
</body>
</html>
`;
}

/**
 * A page section.
 *
 * `more` turns the heading into a link and adds a second link beside it, so
 * a summary block on the home page leads to the page that covers it in full.
 * The label says where it goes ("All projects", "All systems"): a link that
 * only says "see all" tells nobody what is behind it.
 */
const section = (id, eyebrow, title, lead, body, more = null) => `  <section class="section" id="${id}">
    <div class="container">
      <div class="section__head" data-reveal>
        ${eyebrow ? `<p class="section__eyebrow">${e(eyebrow)}</p>` : ''}
        <div class="section__titlebar">
          <h2>${more ? `<a class="section__titlelink" href="${e(more.href)}">${e(title)}</a>` : e(title)}</h2>
          ${more ? `<a class="section__more" href="${e(more.href)}">${e(more.label)}<span class="section__more-arrow" aria-hidden="true">→</span></a>` : ''}
        </div>
        ${lead ? `<p class="section__lead">${e(lead)}</p>` : ''}
      </div>
${body}
    </div>
  </section>`;

/**
 * Every page opens with the same visual idea: the animated workflow graph.
 * The home hero runs it at full density; subpages run a sparser, quieter
 * version of the same graph, so the whole site reads as one system.
 *
 * `altName` is the heading again in the other script (see `otherName`), as a
 * quiet line directly under it. Only the home page, whose heading is his
 * name, passes one.
 *
 * Under the heading a page has either a `headline`, one short line set like
 * a headline, or a `lead`, a few sentences that say what the page offers and
 * where, set as running text so a paragraph is not shouted. `note` is one
 * short line above the buttons, marked with a live dot.
 *
 * A detail page adds two things, both already markup: `crumbs`, the trail
 * back to its list page, above the heading, and `facts`, the quiet line of
 * status, kind and year under the headline.
 */
function heroBlock({ crumbs = null, eyebrow = null, heading, headingClass = '', altName = null, headline = null, facts = null, lead = null, intro = null, note = null, actions = null }) {
  return `  <section class="hero">
    <div class="container">
${crumbs ? `      ${crumbs}\n` : ''}${eyebrow ? `      <p class="hero__eyebrow">${e(eyebrow)}</p>\n` : ''}      <h1${headingClass ? ` class="${headingClass}"` : ''}>${e(heading)}</h1>
${altName ? `      <p class="hero__altname" lang="${altName.lang}" dir="${altName.dir}">${e(altName.text)}</p>\n` : ''}${headline ? `      <p class="hero__headline">${e(headline)}</p>\n` : ''}${facts ? `      ${facts}\n` : ''}${lead ? `      <p class="hero__headline hero__headline--lead">${e(lead)}</p>\n` : ''}${intro ? `      <p class="hero__intro">${e(intro)}</p>\n` : ''}${note ? `      <p class="hero__note">${e(note)}</p>\n` : ''}${actions ? `      <div class="hero__actions">\n${actions}\n      </div>\n` : ''}    </div>
  </section>`;
}

/**
 * The small line above a page's heading: the page's label in the navigation.
 *
 * Left out when the heading itself opens with that word, in either language,
 * so that both versions of a page are built alike: "Experience" above
 * "Experience and recommendations" says one thing twice. `key` is the page's
 * key in the copy, which holds both its `nav` label and its `title`.
 */
const eyebrowOf = (db, lang, key) =>
  LANGS.some((l) => db.copy[l][key].title.startsWith(db.copy[l].nav[key])) ? null : db.copy[lang].nav[key];

/**
 * Whether the pages may say he is available right now.
 *
 * It is a claim about today, so the data decides it, in one place: the home
 * hero and the work hero both ask here, and neither keeps the claim in a
 * sentence that would stay behind when the data changes.
 */
const availableNow = (db) => Boolean(db.profile.availability.openToWork && db.profile.availability.immediate);

/**
 * The closing call to action: a question, a sentence and one button to the
 * contact page.
 *
 * It ends the home page and every page a reader may land on from a search,
 * so nobody reaches the foot of a long page with nowhere to go next. The
 * words default to the home page's; the showcase passes its own.
 */
function ctaBlock(db, lang, { title = db.copy[lang].home.ctaTitle, body = db.copy[lang].home.ctaBody } = {}) {
  const c = db.copy[lang];
  return `  <section class="section">
    <div class="container">
      <div class="cta">
        <h2>${e(title)}</h2>
        <p>${e(body)}</p>
        <a class="btn" href="${rel('contact', lang)}">${e(c.home.ctaButton)}</a>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ pages */

function home(db, lang) {
  const c = db.copy[lang];
  const p = db.profile;

  const main = `${heroBlock({
    eyebrow: c.home.eyebrow,
    heading: p.name[lang],
    headingClass: 'hero__name',
    altName: otherName(db, lang),
    headline: p.headline[lang],
    intro: c.home.intro,
    note: availableNow(db) ? c.home.availability : null,
    actions: `        <a class="btn" href="${rel('contact', lang)}">${e(c.home.ctaButton)}</a>
        <a class="btn btn--ghost" href="${rel('automation', lang)}">${e(c.nav.automation)}</a>`,
  })}

${section('offers', null, c.home.offersTitle, null, `      <div class="grid grid--3">\n${B.homeOffers(db, lang)}\n      </div>`)}

${section('proof', c.home.proofLabel, c.home.proofLabel, null, B.homeProof(db, lang), { href: rel('about', lang), label: c.nav.about })}

${section('featured', c.home.featuredLabel, c.home.featuredLabel, null, B.homeFeatured(db, lang), { href: rel('projects', lang), label: c.ui.allProjects })}

${section('automation', c.home.automationLabel, c.home.automationLabel, c.home.automationLead, `      <div class="grid grid--3">\n${B.homeAutomation(db, lang)}\n      </div>`, { href: rel('automation', lang), label: c.ui.allSystems })}

${section('projects', c.home.projectsLabel, c.home.projectsLabel, c.home.projectsLead, `      <div class="grid grid--3">\n${B.homeProjects(db, lang)}\n      </div>`, { href: rel('projects', lang), label: c.ui.allProjects })}

${section('showcase', c.home.showcaseLabel, c.home.showcaseLabel, c.home.showcaseLead, `      <div class="grid grid--3">\n${B.homeShowcase(db, lang)}\n      </div>`, { href: rel('showcase', lang), label: c.ui.allSites })}

${section('quotes', c.home.quoteLabel, c.home.quoteLabel, null, `      <div class="grid grid--2">\n${B.homeQuote(db, lang)}\n      </div>`, { href: rel('work', lang), label: c.nav.work })}

${ctaBlock(db, lang)}`;

  return shell(db, '', lang, main);
}

function about(db, lang) {
  const c = db.copy[lang];
  // The portrait and the story share one row on a wide screen.
  const portrait = B.aboutPortrait(db, lang);
  const story = portrait ? `<div class="about-intro">\n${portrait}\n${B.aboutBody(db, lang)}\n</div>` : B.aboutBody(db, lang);

  // No eyebrow: the heading opens with the very word the nav label is.
  const main = `${heroBlock({ heading: c.about.title, headline: c.about.lead })}

  <section class="section">
    <div class="container">
${story}
    </div>
  </section>

${section('principles', null, c.about.principlesTitle, null, `      <div class="stack">\n${B.aboutPrinciples(db, lang)}\n      </div>`)}

${section('skills', null, c.about.skillsTitle, null, `      <div class="stack">\n${B.aboutSkills(db, lang)}\n      </div>`)}

${section('personal', null, c.about.personalTitle, null, `      <div class="stack">${B.aboutPersonal(db, lang)}</div>`)}

${section('faq', null, c.about.faqTitle, null, `      <div class="stack">\n${B.aboutFaq(db, lang)}\n      </div>`)}

${ctaBlock(db, lang)}`;

  return shell(db, 'about', lang, main);
}

/* Under the quotes: where every one of them can be checked, on LinkedIn. */
function recommendationsSource(db, lang) {
  const url = db.profile.recommendationsUrl;
  if (!url) return '';
  const c = db.copy[lang];
  return `\n      <p class="quote-source" data-reveal><a href="${e(url)}"${extAttrs(url)}>${e(c.work.testimonialsSource)}${newTabHint(c.ui.opensInNewTab)}</a></p>`;
}

function work(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({
    eyebrow: eyebrowOf(db, lang, 'work'),
    heading: c.work.title,
    lead: c.work.lead,
    note: availableNow(db) ? c.work.availability : null,
  })}

${section('timeline', null, c.work.timelineTitle, null, B.workTimeline(db, lang))}

${section('testimonials', null, c.work.testimonialsTitle, null, `      <div class="masonry">\n${B.workTestimonials(db, lang)}\n      </div>${recommendationsSource(db, lang)}`)}

${section('credentials', null, c.work.credentialsTitle, null, B.workCredentials(db, lang))}

${section('education', null, c.work.educationTitle, null, B.workEducation(db, lang))}

${ctaBlock(db, lang)}`;

  return shell(db, 'work', lang, main);
}

function projects(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: eyebrowOf(db, lang, 'projects'), heading: c.projects.title, headline: c.projects.lead })}

  <section class="section">
    <div class="container">
${B.projectsList(db, lang)}
    </div>
  </section>

${ctaBlock(db, lang)}`;

  return shell(db, 'projects', lang, main);
}

function showcase(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: eyebrowOf(db, lang, 'showcase'), heading: c.showcase.title, lead: c.showcase.lead })}

  <section class="section" id="offer">
    <div class="container">
${B.showcaseOffer(db, lang)}
    </div>
  </section>

  <section class="section" id="sites">
    <div class="container">
${B.showcaseList(db, lang)}
    </div>
  </section>

${section('lab', null, c.showcase.labTitle, c.showcase.labLead, B.showcaseLab(db, lang))}

${ctaBlock(db, lang, { title: c.showcase.ctaTitle, body: c.showcase.ctaBody })}`;

  return shell(db, 'showcase', lang, main);
}

/* Both tiers sit under one filter bar. Each section is a filter scope, so a
   tier with nothing left to show hides itself instead of leaving a heading
   over an empty grid. */
function automation(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: eyebrowOf(db, lang, 'automation'), heading: c.automation.title, lead: c.automation.lead })}

${section('services', null, c.automation.servicesTitle, null, `      <div class="grid grid--3">
${B.automationServices(db, lang)}
      </div>
      <div class="process">
        <h3 class="process__title" data-reveal>${e(c.automation.processTitle)}</h3>
${B.automationProcess(db, lang)}
      </div>`)}

  <section class="section" id="systems" data-filter-scope>
    <div class="container">
${B.automationFilters(db, lang)}
${B.automationLegend(db, lang)}
      <div class="section__head" data-reveal>
        <div class="section__titlebar"><h2>${e(c.automation.systemsTitle)}</h2></div>
        <p class="section__lead">${e(c.automation.systemsLead)}</p>
      </div>
      <div class="systems">
${B.automationSystems(db, lang, 'system')}
      </div>
    </div>
  </section>

  <section class="section" id="builds" data-filter-scope>
    <div class="container">
      <div class="section__head" data-reveal>
        <div class="section__titlebar"><h2>${e(c.automation.buildsTitle)}</h2></div>
        <p class="section__lead">${e(c.automation.buildsLead)}</p>
      </div>
      <div class="systems systems--compact">
${B.automationSystems(db, lang, 'build')}
      </div>
    </div>
  </section>

${section('cost-case', null, c.automation.caseTitle, null, `${B.automationCase(db, lang)}`)}

${ctaBlock(db, lang)}`;

  return shell(db, 'automation', lang, main);
}

function contact(db, lang) {
  const c = db.copy[lang];
  const p = db.profile;
  const linkedin = p.sameAs.find((x) => x.platform === 'LinkedIn')?.url;
  const github = p.sameAs.find((x) => x.platform === 'GitHub')?.url;

  // No eyebrow, for the same reason as the about page.
  const main = `${heroBlock({
    heading: c.contact.title,
    headline: c.contact.lead,
    actions: `        <a class="btn" href="mailto:${e(p.email)}">${e(c.ui.emailMe)}</a>${
      linkedin ? `
        <a class="btn btn--ghost" href="${e(linkedin)}"${extAttrs(linkedin)}>LinkedIn${newTabHint(c.ui.opensInNewTab)}</a>` : ''
    }${github ? `
        <a class="btn btn--ghost" href="${e(github)}"${extAttrs(github)}>GitHub${newTabHint(c.ui.opensInNewTab)}</a>` : ''}`,
  })}

${section('links', null, c.contact.linksTitle, null, B.contactLinks(db, lang))}

${section('details', null, c.contact.availabilityTitle, null, `      <div class="grid grid--2">
        <div class="card" data-reveal>
          ${B.contactAvailability(db, lang)}
        </div>
        <div class="card" data-reveal>
          <h3 class="card__title">${e(c.contact.cvTitle)}</h3>
          <p class="card__body">${e(c.contact.cvNote)}</p>
          ${B.contactCv(db, lang)}
        </div>
      </div>`)}

${SHOW_MCP_SECTION ? section('mcp', null, c.contact.mcpTitle, c.contact.mcpBody, B.contactMcp(db, lang)) : ''}`;

  return shell(db, 'contact', lang, main);
}

function chat(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: eyebrowOf(db, lang, 'chat'), heading: c.chat.title, headline: c.chat.lead })}

  <section class="section">
    <div class="container">
      <div class="chat" id="chat">
        <div class="chat__head">
          ${portraitTrigger(db, lang, 'brand__mark')}
          <span class="chat__who"><b>${e(db.profile.name[lang])}</b><span>${e(c.chat.status)}</span></span>
        </div>
        <div class="chat__thread" id="chat-thread" role="log" aria-live="polite"></div>
        <div class="chat__typing" id="chat-typing" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="chat__replies" id="chat-replies"></div>
      </div>
    </div>
  </section>

${section('transcript', null, c.chat.transcriptTitle, c.chat.transcriptNote, `      <details class="transcript" id="chat-transcript">\n        <summary>${e(c.ui.readTranscript)}</summary>\n<!-- @gen:chat-transcript -->\n<!-- /@gen:chat-transcript -->\n      </details>`)}`;

  return shell(db, 'chat', lang, main);
}

/* ---------------------------------------------------------- detail pages */

/**
 * The page of one project or one automation system (see details.mjs for
 * which entries get one).
 *
 * The heading is the name, the line under it says what the thing is in the
 * words people search for, and the lead is the entry's own tagline or
 * summary. Below that a project shows its screenshots, the problem, what he
 * built and his role, and the workflow behind it when it names one; a system
 * shows what it handles, how it works, the real canvas and the outcome. Both
 * end with their neighbours and the same call to action as the list pages.
 */
function detailPage(db, lang, d) {
  const c = db.copy[lang];
  const x = d.entry;
  const project = d.kind === 'project';

  const hero = heroBlock({
    crumbs: B.detailCrumbs(db, lang, d),
    heading: detailName(d, lang),
    headline: detailHeadline(d, lang),
    facts: B.detailFacts(db, lang, d),
    intro: (project ? x.tagline : x.summary)[lang],
    actions:
      project && x.url
        ? `        <a class="btn" href="${e(x.url)}"${extAttrs(x.url)}>${e(c.ui.visitLive)}${newTabHint(c.ui.opensInNewTab)}</a>`
        : null,
  });

  const body = `  <section class="section" id="overview">
    <div class="container">
${project ? B.projectBody(db, lang, x) : B.systemBody(db, lang, x)}
    </div>
  </section>`;

  const engine =
    project && engineOf(db, x)
      ? `

  <section class="section" id="${ENGINE_ANCHOR}">
    <div class="container">
${B.projectEngine(db, lang, x)}
    </div>
  </section>`
      : '';

  const related = B.detailRelated(db, lang, d);
  const more = related
    ? `

${section('more', null, project ? c.detail.moreProjects : c.detail.moreSystems, null, `      <div class="grid grid--3">\n${related}\n      </div>`)}`
    : '';

  const main = `${hero}

${body}${engine}${more}

${ctaBlock(db, lang)}`;

  return shell(db, d.page, lang, main, {
    section: d.parent,
    meta: B.detailHead(db, lang, d, {
      title: detailTitle(db, d, lang),
      description: detailDescription(d, lang),
      image: detailImage(db, d),
    }),
    nodes: [ld.detailBreadcrumbLd(db, lang, d), ld.detailLd(db, lang, d)],
  });
}

/** Every detail page in one language, as `{ page, html }`. */
export function buildDetailPages(db, lang) {
  return detailPages(db).map((d) => ({ page: d.page, html: detailPage(db, lang, d) }));
}

function notFound(db, lang) {
  const c = db.copy[lang];
  const main = `${heroBlock({
    heading: '404',
    headline: c.meta.notFound.heading,
    actions: `        <a class="btn" href="${rel('', lang)}">${e(c.nav.home)}</a>`,
  })}`;
  // The host serves this file, with status 404, at whatever address was not
  // found, and with status 200 at /404 itself. So it says noindex, names no
  // address as its own (see `headMeta`), and carries its own title. It is laid
  // out as the home page is, but it is not the home page, so it leaves out the
  // structured data that describes one.
  return shell(db, '', lang, main, { noindex: true, pageLd: false });
}

/**
 * The shortcut URLs, as real files.
 *
 * Each shortcut ships as a page that redirects three ways: a meta refresh for
 * browsers, a canonical for crawlers that follow it, and a plain link for
 * anything that honours neither. All are noindex: the destination is the
 * thing worth indexing, not the doorway. They work on any host, with or
 * without `_redirects`.
 *
 * `canonical` is always the full address, host included: Google asks for an
 * absolute one, and a relative canonical is resolved against wherever the
 * stub happens to be served. It also differs from `target` where the target
 * carries a fingerprint. The refresh and the link must name the fingerprinted
 * address, or a visitor gets the copy the CDN still holds; the canonical must
 * name the bare one, or every new version reads to a search engine as a new
 * document.
 */
function redirectStub(target, label, canonical) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${canonical}">
<title>${e(label)}</title>
</head>
<body>
<p><a href="${target}">${e(label)}</a></p>
</body>
</html>
`;
}

export function buildRedirects(db) {
  /* One CV. /cv/auto stays so links already shared for the old automation CV still land.
     `_redirects` has no rule for either on purpose: Cloudflare would answer it before
     these pages, and a rule can only name the bare PDF, which the CDN keeps for a day
     after a new CV ships. These carry its fingerprint instead.

     The canonical is the other way round: absolute and without the fingerprint, the
     one address the CV keeps across versions. `_headers` sends the same one with
     the PDF itself. */
  const cv = db.profile.cv[0];
  const v = db.assetVersions?.[cv.file];
  const cvUrl = v ? `/${cv.file}?v=${v}` : `/${cv.file}`;
  const site = db.profile.site.replace(/\/$/, '');
  const cvCanonical = `${site}/${cv.file}`;

  /* /resume and /profile are answered by `_redirects` with a 301 where the
     host reads that file; their targets carry no fingerprint, so a rule can
     name them. The pages stay for a host that does not. */
  return [
    { path: 'cv/index.html', target: cvUrl, label: 'CV', canonical: cvCanonical },
    { path: 'cv/auto/index.html', target: cvUrl, label: 'CV', canonical: cvCanonical },
    { path: 'resume/index.html', target: '/api/resume.json', label: 'Résumé (JSON Resume)', canonical: `${site}/api/resume.json` },
    { path: 'profile/index.html', target: '/api/profile.json', label: 'Profile JSON', canonical: `${site}/api/profile.json` },
  ].map((r) => ({ ...r, html: redirectStub(r.target, r.label, r.canonical) }));
}

export const TEMPLATES = { '': home, about, work, projects, showcase, automation, chat, contact };
export { notFound };
