/**
 * Page templates.
 *
 * Each function returns a complete HTML document. Everything a reader or a
 * crawler needs is inlined here at build time — no runtime rendering.
 */

import { escapeHtml } from './render.mjs';
import * as B from './blocks.mjs';
import { PAGES } from './sitemap.mjs';

const e = escapeHtml;
const PAGE_KEY = { '': 'home', about: 'about', work: 'work', projects: 'projects', automation: 'automation', chat: 'chat', contact: 'contact' };

const rel = (page, lang) => {
  const prefix = lang === 'en' ? '' : '../';
  return `${prefix}${page === '' ? 'index' : page}.html`;
};

const asset = (path, lang) => `${lang === 'en' ? '' : '../'}${path}`;

function header(db, page, lang) {
  const c = db.copy[lang];
  const initials = 'NT';

  const nav = PAGES.map((p) => {
    const current = p === page ? ' aria-current="page"' : '';
    return `        <a href="${rel(p, lang)}"${current}>${e(c.nav[PAGE_KEY[p]])}</a>`;
  }).join('\n');

  // The language switch points at the same page in the other tree.
  const otherHref = lang === 'en' ? `ar/${page === '' ? 'index' : page}.html` : `../${page === '' ? 'index' : page}.html`;

  return `  <header class="site-header">
    <div class="container site-header__inner">
      <a class="brand" href="${rel('', lang)}">
        <span class="brand__mark" aria-hidden="true">${initials}</span>
        <span>${e(db.profile.name[lang])}</span>
      </a>
      <nav class="site-nav" aria-label="${e(c.nav.home)}">
${nav}
      </nav>
      <div class="header__tools">
        <a class="lang-switch" href="${otherHref}" lang="${lang === 'en' ? 'ar' : 'en'}" hreflang="${lang === 'en' ? 'ar' : 'en'}">${e(c.meta.langLabel)}</a>
        <button class="theme-toggle" type="button" aria-label="${e(c.ui.toggleTheme)}">◐</button>
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
        <li><a href="${asset('llms.txt', lang)}">llms.txt</a></li>
        <li><a href="${asset('api/resume.json', lang)}">resume.json</a></li>
        <li><a href="mailto:${e(db.profile.email)}">${e(c.ui.emailMe)}</a></li>
      </ul>
    </div>
  </footer>`;
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${B.headMeta(db, page, lang)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset('assets/css/tokens.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/base.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/layout.css', lang)}">
<link rel="stylesheet" href="${asset('assets/css/components.css', lang)}">${
    page === 'chat' ? `\n<link rel="stylesheet" href="${asset('assets/css/chat.css', lang)}">` : ''
  }${lang === 'ar' ? `\n<link rel="stylesheet" href="${asset('assets/css/rtl.css', lang)}">` : ''}
${B.headLd(db, page, lang)}
</head>
<body>
<a class="skip-link" href="#main">${e(c.ui.skipToContent)}</a>
${header(db, page, lang)}
<main id="main">
${main}
</main>
${footer(db, lang)}
<script src="${asset('assets/js/main.js', lang)}" type="module"></script>${
    page === 'chat' ? `\n<script src="${asset(`assets/js/chat/boot.${lang}.js`, lang)}" type="module"></script>` : ''
  }
</body>
</html>
`;
}

const section = (id, eyebrow, title, lead, body) => `  <section class="section" id="${id}">
    <div class="container">
      <div class="section__head">
        ${eyebrow ? `<p class="section__eyebrow">${e(eyebrow)}</p>` : ''}
        <h2>${e(title)}</h2>
        ${lead ? `<p class="section__lead">${e(lead)}</p>` : ''}
      </div>
${body}
    </div>
  </section>`;

/* ------------------------------------------------------------------ pages */

function home(db, lang) {
  const c = db.copy[lang];
  const p = db.profile;

  const main = `  <section class="hero">
    <div class="container">
      <p class="section__eyebrow">${e(c.home.eyebrow)}</p>
      <h1 class="hero__name">${e(p.name[lang])}</h1>
      <p class="hero__headline">${e(p.headline[lang])}</p>
      <p class="hero__intro">${e(c.home.intro)}</p>
      <div class="hero__actions">
        <a class="btn" href="${rel('contact', lang)}">${e(c.home.ctaButton)}</a>
        <a class="btn btn--ghost" href="${rel('automation', lang)}">${e(c.nav.automation)}</a>
      </div>
    </div>
  </section>

${section('proof', c.home.proofLabel, c.home.proofLabel, null, B.homeProof(db, lang))}

${section('featured', c.home.featuredLabel, c.home.featuredLabel, null, B.homeFeatured(db, lang))}

${section('automation', c.home.automationLabel, c.home.automationLabel, c.home.automationLead, `      <div class="grid grid--3">\n${B.homeAutomation(db, lang)}\n      </div>`)}

${section('projects', c.home.projectsLabel, c.home.projectsLabel, c.home.projectsLead, `      <div class="grid grid--3">\n${B.homeProjects(db, lang)}\n      </div>`)}

${section('quotes', c.home.quoteLabel, c.home.quoteLabel, null, `      <div class="grid grid--2">\n${B.homeQuote(db, lang)}\n      </div>`)}

  <section class="section">
    <div class="container">
      <div class="cta">
        <h2>${e(c.home.ctaTitle)}</h2>
        <p>${e(c.home.ctaBody)}</p>
        <a class="btn" href="${rel('contact', lang)}">${e(c.home.ctaButton)}</a>
      </div>
    </div>
  </section>`;

  return shell(db, '', lang, main);
}

function about(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.about.title)}</h1>
      <p class="hero__headline">${e(c.about.lead)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="prose">
${B.aboutBody(db, lang)}
      </div>
    </div>
  </section>

${section('principles', null, c.about.principlesTitle, null, `      <div class="grid grid--2">\n${B.aboutPrinciples(db, lang)}\n      </div>`)}

${section('skills', null, c.about.skillsTitle, null, `      <div class="grid grid--2">\n${B.aboutSkills(db, lang)}\n      </div>`)}

${section('personal', null, c.about.personalTitle, null, `      <div class="prose"><p>${e(c.about.personal)}</p></div>`)}

${section('faq', null, c.about.faqTitle, null, `      <div class="grid">\n${B.aboutFaq(db, lang)}\n      </div>`)}`;

  return shell(db, 'about', lang, main);
}

function work(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.work.title)}</h1>
      <p class="hero__headline">${e(c.work.lead)}</p>
    </div>
  </section>

${section('timeline', null, c.work.timelineTitle, null, B.workTimeline(db, lang))}

${section('testimonials', null, c.work.testimonialsTitle, null, `      <div class="grid grid--2">\n${B.workTestimonials(db, lang)}\n      </div>`)}

${section('credentials', null, c.work.credentialsTitle, null, B.workCredentials(db, lang))}

${section('education', null, c.work.educationTitle, null, B.workEducation(db, lang))}`;

  return shell(db, 'work', lang, main);
}

function projects(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.projects.title)}</h1>
      <p class="hero__headline">${e(c.projects.lead)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="grid grid--2">
${B.projectsList(db, lang)}
      </div>
    </div>
  </section>`;

  return shell(db, 'projects', lang, main);
}

function automation(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.automation.title)}</h1>
      <p class="hero__headline">${e(c.automation.lead)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="grid grid--2">
${B.automationList(db, lang)}
      </div>
    </div>
  </section>

${section('cost-case', null, c.automation.caseTitle, null, `      <div class="prose">\n${B.automationCase(db, lang)}\n      </div>`)}`;

  return shell(db, 'automation', lang, main);
}

function contact(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.contact.title)}</h1>
      <p class="hero__headline">${e(c.contact.lead)}</p>
    </div>
  </section>

${section('links', null, c.contact.linksTitle, null, B.contactLinks(db, lang))}

${section('availability', null, c.contact.availabilityTitle, null, `      <div class="card">${B.contactAvailability(db, lang)}</div>`)}

${section('cv', null, c.contact.cvTitle, c.contact.cvNote, B.contactCv(db, lang))}

${section('mcp', null, c.contact.mcpTitle, c.contact.mcpBody, B.contactMcp(db, lang))}`;

  return shell(db, 'contact', lang, main);
}

function chat(db, lang) {
  const c = db.copy[lang];

  const main = `  <section class="hero">
    <div class="container">
      <h1>${e(c.chat.title)}</h1>
      <p class="hero__headline">${e(c.chat.lead)}</p>
    </div>
  </section>

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

${section('transcript', null, c.chat.transcriptTitle, c.chat.transcriptNote, `      <div class="prose" id="chat-transcript">\n<!-- @gen:chat-transcript -->\n<!-- /@gen:chat-transcript -->\n      </div>`)}`;

  return shell(db, 'chat', lang, main);
}

function notFound(db, lang) {
  const c = db.copy[lang];
  const main = `  <section class="hero">
    <div class="container">
      <h1>404</h1>
      <p class="hero__headline">${lang === 'en' ? 'That page does not exist.' : 'هذه الصفحة غير موجودة.'}</p>
      <div class="hero__actions"><a class="btn" href="${rel('', lang)}">${e(c.nav.home)}</a></div>
    </div>
  </section>`;
  return shell(db, '', lang, main);
}

export const TEMPLATES = { '': home, about, work, projects, automation, chat, contact };
export { notFound };
