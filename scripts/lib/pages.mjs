/**
 * Page templates.
 *
 * Each function returns a complete HTML document. Everything a reader or a
 * crawler needs is inlined here at build time — no runtime rendering.
 */

import { escapeHtml, extAttrs, newTabHint } from './render.mjs';
import * as B from './blocks.mjs';
import { PAGES } from './sitemap.mjs';

const e = escapeHtml;
const PAGE_KEY = { '': 'home', about: 'about', work: 'work', projects: 'projects', automation: 'automation', chat: 'chat', contact: 'contact' };

/* Which whole-page background each page runs — one visual family, one
   metaphor per page. */
/* The 'For AI assistants' block on the contact page is hidden for now.
   Everything it advertised still exists and works — llms.txt, robots.txt,
   /api/*.json and the MCP server are untouched; only the visible section
   is suppressed. Flip to true to bring it back. */
const SHOW_MCP_SECTION = false;

const PAGE_VARIANT = { '': 'graph', about: 'orbit', work: 'flow', projects: 'grid', automation: 'branch', chat: 'drift', contact: 'signal' };

/**
 * A link to another page *in the same language*.
 *
 * Both language trees are flat and self-contained — Arabic at the root,
 * English in `/en/` — so pages are always siblings and never need a prefix.
 * (Assets are different: they live once at the root, so `asset()` below does
 * need to climb out of `/en/`.)
 */
const rel = (page) => `${page === '' ? 'index' : page}.html`;

const asset = (path, lang) => `${lang === 'ar' ? '' : '../'}${path}`;

function header(db, page, lang) {
  const c = db.copy[lang];
  const initials = 'NT';

  const nav = PAGES.map((p) => {
    const current = p === page ? ' aria-current="page"' : '';
    return `          <a href="${rel(p)}"${current}>${e(c.nav[PAGE_KEY[p]])}</a>`;
  }).join('\n');

  // The language switch points at the same page in the other tree.
  const otherHref = lang === 'ar' ? `en/${page === '' ? 'index' : page}.html` : `../${page === '' ? 'index' : page}.html`;

  return `  <header class="site-header">
    <div class="container site-header__inner">
      <a class="brand" href="${rel('')}">
        <span class="brand__mark" aria-hidden="true">${initials}</span>
        <span class="brand__name">${e(db.profile.name[lang])}</span>
      </a>
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

function footer(db, lang) {
  const c = db.copy[lang];
  const year = new Date().getFullYear();

  return `  <footer class="site-footer">
    <div class="container site-footer__inner">
      <div>
        <p>${e(c.footer.tagline)}</p>
        <p>© ${year} ${e(db.profile.name[lang])} · ${e(c.footer.builtWith)}</p>
      </div>
      <ul class="footer__links">
        <li><a href="${asset('llms.txt', lang)}" target="_blank" rel="noopener">llms.txt${newTabHint(c.ui.opensInNewTab)}</a></li>
        <li><a href="${asset('api/resume.json', lang)}" target="_blank" rel="noopener">resume.json${newTabHint(c.ui.opensInNewTab)}</a></li>
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
function mobileTabs(db, page, lang) {
  const c = db.copy[lang];

  return `  <nav class="mobile-tabs" aria-label="${e(c.nav.home)}">
${PAGES.map((t) => {
    const current = t === page ? ' aria-current="page"' : '';
    return `    <a href="${rel(t)}"${current}><span>${e(c.navShort[PAGE_KEY[t]])}</span></a>`;
  }).join('\n')}
  </nav>`;
}

function shell(db, page, lang, main) {
  const c = db.copy[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
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
${B.headMeta(db, page, lang)}
<script>
/* Set before first paint so reveals never flash, and the stored theme never
   flickers. Also tells CSS that JavaScript is available — without this class
   nothing is ever hidden. */
(function(){var r=document.documentElement;r.classList.add('js');
try{var t=localStorage.getItem('nt-theme');if(t==='light'||t==='dark')r.dataset.theme=t;}catch(e){}
/* honour the visitor's last language choice on every arrival */
try{var L=localStorage.getItem('nt-lang');var p=location.pathname;
var en=p==='/en'||p.slice(0,4)==='/en/';
if(L==='en'&&!en){location.replace(p==='/'?'/en/index.html':'/en'+p);}
else if(L==='ar'&&en){location.replace(p==='/en'?'/':(p.slice(3)||'/'));}}catch(e){}})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset('assets/css/tokens.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/base.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/layout.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/components.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/motion.css', lang)}">${
    page === 'chat' ? `\n<link rel="stylesheet" href="${asset('assets/css/chat.css', lang)}">` : ''
  }
<link rel="stylesheet" href="${asset('assets/css/responsive.css', lang)}">${
    lang === 'ar' ? `\n<link rel="stylesheet" href="${asset('assets/css/rtl.css', lang)}">` : ''
  }
${B.headLd(db, page, lang)}
</head>
<body>
<canvas class="site-bg" data-workflow data-variant="${PAGE_VARIANT[page] ?? 'drift'}" aria-hidden="true"></canvas>
<a class="skip-link" href="#main">${e(c.ui.skipToContent)}</a>
${header(db, page, lang)}
<main id="main">
<div class="page-spine" aria-hidden="true"><span class="page-spine__fill"></span></div>
${main}
</main>
${footer(db, lang)}
${mobileTabs(db, page, lang)}
<script src="${asset('assets/js/main.js', lang)}" type="module"></script>${
    page === 'chat' ? `\n<script src="${asset(`assets/js/chat/boot.${lang}.js`, lang)}" type="module"></script>` : ''
  }
</body>
</html>
`;
}

/**
 * A page section.
 *
 * `more` turns the heading into a link and adds a "see all" affordance, so a
 * summary block on the home page leads to the page that covers it in full.
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
 */
function heroBlock({ eyebrow = null, heading, headingClass = '', headline = null, intro = null, actions = null }) {
  return `  <section class="hero">
    <div class="container">
${eyebrow ? `      <p class="hero__eyebrow">${e(eyebrow)}</p>\n` : ''}      <h1${headingClass ? ` class="${headingClass}"` : ''}>${e(heading)}</h1>
${headline ? `      <p class="hero__headline">${e(headline)}</p>\n` : ''}${intro ? `      <p class="hero__intro">${e(intro)}</p>\n` : ''}${actions ? `      <div class="hero__actions">\n${actions}\n      </div>\n` : ''}    </div>
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
    headline: p.headline[lang],
    intro: c.home.intro,
    actions: `        <a class="btn" href="${rel('contact')}">${e(c.home.ctaButton)}</a>
        <a class="btn btn--ghost" href="${rel('automation')}">${e(c.nav.automation)}</a>`,
  })}

${section('proof', c.home.proofLabel, c.home.proofLabel, null, B.homeProof(db, lang), { href: rel('about'), label: c.nav.about })}

${section('featured', c.home.featuredLabel, c.home.featuredLabel, null, B.homeFeatured(db, lang), { href: rel('projects'), label: c.ui.seeAll })}

${section('automation', c.home.automationLabel, c.home.automationLabel, c.home.automationLead, `      <div class="grid grid--3">\n${B.homeAutomation(db, lang)}\n      </div>`, { href: rel('automation'), label: c.nav.automation })}

${section('projects', c.home.projectsLabel, c.home.projectsLabel, c.home.projectsLead, `      <div class="grid grid--3">\n${B.homeProjects(db, lang)}\n      </div>`, { href: rel('projects'), label: c.nav.projects })}

${section('quotes', c.home.quoteLabel, c.home.quoteLabel, null, `      <div class="grid grid--2">\n${B.homeQuote(db, lang)}\n      </div>`, { href: rel('work'), label: c.nav.work })}

  <section class="section">
    <div class="container">
      <div class="cta">
        <h2>${e(c.home.ctaTitle)}</h2>
        <p>${e(c.home.ctaBody)}</p>
        <a class="btn" href="${rel('contact')}">${e(c.home.ctaButton)}</a>
      </div>
    </div>
  </section>`;

  return shell(db, '', lang, main);
}

function about(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: c.nav.about, heading: c.about.title, headline: c.about.lead })}

  <section class="section">
    <div class="container">
${B.aboutBody(db, lang)}
    </div>
  </section>

${section('principles', null, c.about.principlesTitle, null, `      <div class="stack">\n${B.aboutPrinciples(db, lang)}\n      </div>`)}

${section('skills', null, c.about.skillsTitle, null, `      <div class="stack">\n${B.aboutSkills(db, lang)}\n      </div>`)}

${section('personal', null, c.about.personalTitle, null, `      <div class="stack">${B.aboutPersonal(db, lang)}</div>`)}

${section('faq', null, c.about.faqTitle, null, `      <div class="stack">\n${B.aboutFaq(db, lang)}\n      </div>`)}`;

  return shell(db, 'about', lang, main);
}

function work(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: c.nav.work, heading: c.work.title, headline: c.work.lead })}

${section('timeline', null, c.work.timelineTitle, null, B.workTimeline(db, lang))}

${section('testimonials', null, c.work.testimonialsTitle, null, `      <div class="masonry">\n${B.workTestimonials(db, lang)}\n      </div>`)}

${section('credentials', null, c.work.credentialsTitle, null, B.workCredentials(db, lang))}

${section('education', null, c.work.educationTitle, null, B.workEducation(db, lang))}`;

  return shell(db, 'work', lang, main);
}

function projects(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: c.nav.projects, heading: c.projects.title, headline: c.projects.lead })}

  <section class="section">
    <div class="container">
      <div class="stack">
${B.projectsList(db, lang)}
      </div>
    </div>
  </section>`;

  return shell(db, 'projects', lang, main);
}

function automation(db, lang) {
  const c = db.copy[lang];

  const main = `${heroBlock({ eyebrow: c.nav.automation, heading: c.automation.title, headline: c.automation.lead })}

  <section class="section">
    <div class="container">
      <div class="stack">
${B.automationList(db, lang)}
      </div>
    </div>
  </section>

${section('cost-case', null, c.automation.caseTitle, null, `${B.automationCase(db, lang)}`)}`;

  return shell(db, 'automation', lang, main);
}

function contact(db, lang) {
  const c = db.copy[lang];
  const p = db.profile;
  const linkedin = p.sameAs.find((x) => x.platform === 'LinkedIn')?.url;
  const github = p.sameAs.find((x) => x.platform === 'GitHub')?.url;

  const main = `${heroBlock({
    eyebrow: c.nav.contact,
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

  const main = `${heroBlock({ eyebrow: c.nav.chat, heading: c.chat.title, headline: c.chat.lead })}

  <section class="section">
    <div class="container">
      <div class="chat" id="chat">
        <div class="chat__head">
          <span class="brand__mark" aria-hidden="true">NT</span>
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

function notFound(db, lang) {
  const c = db.copy[lang];
  const main = `${heroBlock({
    heading: '404',
    headline: lang === 'en' ? 'That page does not exist.' : 'هذه الصفحة غير موجودة.',
    actions: `        <a class="btn" href="${rel('')}">${e(c.nav.home)}</a>`,
  })}`;
  return shell(db, '', lang, main);
}

export const TEMPLATES = { '': home, about, work, projects, automation, chat, contact };
export { notFound };
