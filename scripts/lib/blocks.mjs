/**
 * HTML for every `@gen` marker.
 *
 * This is the single place that turns data into markup. Pages own their
 * prose and layout; this module owns every repeating list and every figure.
 */

import { escapeHtml } from './render.mjs';
import * as ld from './jsonld.mjs';

const e = escapeHtml;
const base = (db) => db.profile.site.replace(/\/$/, '');
const langPath = (lang) => (lang === 'ar' ? '' : '/en');
const href = (page, lang) => `${langPath(lang)}/${page === '' ? 'index' : page}.html`;

const PAGE_KEY = { '': 'home', about: 'about', work: 'work', projects: 'projects', automation: 'automation', chat: 'chat', contact: 'contact' };

function period(start, end, presentLabel) {
  return `${start}<span aria-hidden="true"> — </span>${end ?? presentLabel}`;
}

const list = (items, cls = '') => `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const badges = (items) =>
  `<ul class="badges">${items.map((s) => `<li class="badge">${e(s)}</li>`).join('')}</ul>`;

/* ------------------------------------------------------------------ head */

export function headMeta(db, page, lang) {
  const c = db.copy[lang];
  const other = lang === 'en' ? 'ar' : 'en';
  const title =
    page === ''
      ? `${db.profile.name[lang]} — ${db.profile.headline[lang]}`
      : `${c.nav[PAGE_KEY[page]]} — ${db.profile.name[lang]}`;
  const url = `${base(db)}${href(page, lang)}`;

  return [
    `<title>${e(title)}</title>`,
    `<meta name="description" content="${e(c.meta.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="${lang}" href="${url}">`,
    `<link rel="alternate" hreflang="${other}" href="${base(db)}${href(page, other)}">`,
    `<link rel="alternate" hreflang="x-default" href="${base(db)}${href(page, 'en')}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:title" content="${e(title)}">`,
    `<meta property="og:description" content="${e(c.meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ar_SA'}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="author" content="${e(db.profile.name[lang])}">`,
  ].join('\n');
}

export function headLd(db, page, lang) {
  const common = [ld.personLd(db, lang), ld.websiteLd(db, lang), ld.breadcrumbLd(page, lang, db)];
  const extra = {
    '': [ld.profilePageLd(db, lang)],
    about: [ld.faqLd(db, lang)],
    work: [ld.experienceLd(db, lang), ...ld.reviewsLd(db, lang)],
    projects: [ld.projectsLd(db, lang)],
    automation: [ld.workflowsLd(db, lang)],
    contact: [ld.contactPageLd(db, lang)],
    chat: [],
  }[page] ?? [];

  return ld.toScriptTag(...common, ...extra);
}

/* ------------------------------------------------------------------ home */

export function homeProof(db, lang) {
  const featured = db.projects.find((p) => p.featured);
  const picks = [
    { value: String(db.workflows.length), label: { en: 'production workflows', ar: 'مسارات عمل إنتاجية' } },
    ...featured.metrics.slice(0, 3),
    { value: '75%', label: { en: 'AI cost cut by smart routing', ar: 'خفض تكلفة الذكاء الاصطناعي بالتوجيه الذكي' } },
  ];

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
  <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(p.year)}</span></p>
  <h3 class="card__title">${e(p.name)}</h3>
  <p class="card__body">${e(p.tagline[lang])}</p>
  <dl class="card__body">
    <dt>${e(c.ui.problem)}</dt><dd>${e(p.problem[lang])}</dd>
    <dt>${e(c.ui.built)}</dt><dd>${e(p.built[lang])}</dd>
    <dt>${e(c.ui.role)}</dt><dd>${e(p.role[lang])}</dd>
  </dl>
  ${badges(p.stack)}
  <div class="card__foot">
    ${p.url ? `<a class="btn" href="${e(p.url)}" rel="noopener">${e(c.ui.visitLive)}</a>` : ''}
    <a class="btn btn--ghost" href="${href('projects', lang)}">${e(c.ui.viewProject)}</a>
  </div>
</article>`;
}

export function homeAutomation(db, lang) {
  const c = db.copy[lang];
  return db.workflows
    .slice(0, 3)
    .map(
      (w) => `<article data-reveal class="card">
  <p class="card__meta"><span>${e(w.kind[lang])}</span><span>${e(w.year)}</span></p>
  <h3 class="card__title">${e(w.name[lang])}</h3>
  <p class="card__body">${e(w.summary[lang])}</p>
  ${badges(w.services.slice(0, 4))}
  <div class="card__foot"><a class="btn btn--ghost" href="${href('automation', lang)}">${e(c.ui.viewProject)}</a></div>
</article>`,
    )
    .join('\n');
}

export function homeProjects(db, lang) {
  const c = db.copy[lang];
  return db.projects
    .filter((p) => !p.featured)
    .map(
      (p) => `<article data-reveal class="card">
  <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(p.year)}</span></p>
  <h3 class="card__title">${e(p.name)}</h3>
  <p class="card__body">${e(p.tagline[lang])}</p>
  ${badges(p.stack.slice(0, 4))}
  <div class="card__foot">${
    p.url ? `<a class="btn btn--ghost" href="${e(p.url)}" rel="noopener">${e(c.ui.visitLive)}</a>` : ''
  }</div>
</article>`,
    )
    .join('\n');
}

export function homeQuote(db, lang) {
  return db.testimonials
    .filter((t) => t.featured)
    .slice(0, 2)
    .map(
      (t) => `<figure data-reveal class="quote">
  <blockquote class="quote__body">${e(t.quote[lang].slice(0, 280))}${t.quote[lang].length > 280 ? '…' : ''}</blockquote>
  <figcaption class="quote__author">${e(t.author)}<span class="quote__role">${e(t.title[lang])}</span></figcaption>
</figure>`,
    )
    .join('\n');
}

/* ----------------------------------------------------------------- about */

export function aboutBody(db, lang) {
  return db.copy[lang].about.body.map((p) => `<p>${e(p)}</p>`).join('\n');
}

export function aboutPrinciples(db, lang) {
  return db.copy[lang].about.principles
    .map(
      (p) => `<article data-reveal class="card">
  <h3 class="card__title">${e(p.title)}</h3>
  <p class="card__body">${e(p.body)}</p>
</article>`,
    )
    .join('\n');
}

export function aboutSkills(db, lang) {
  return db.skills
    .map(
      (g) => `<article data-reveal class="card">
  <h3 class="card__title">${e(g.category[lang])}</h3>
  ${badges(g.items)}
</article>`,
    )
    .join('\n');
}

export function aboutFaq(db, lang) {
  return db.copy[lang].about.faq
    .map(
      (f) => `<details data-reveal class="card">
  <summary><strong>${e(f.q)}</strong></summary>
  <p class="card__body">${e(f.a)}</p>
</details>`,
    )
    .join('\n');
}

/* ------------------------------------------------------------------ work */

export function workTimeline(db, lang) {
  const c = db.copy[lang];
  return `<ol class="timeline">
${db.experience
  .map(
    (x) => `  <li data-reveal class="timeline__item${x.end === null ? ' timeline__item--current' : ''}">
    <p class="timeline__period">${period(x.start, x.end, c.ui.present)}</p>
    <h3 class="timeline__role">${e(x.role[lang])}</h3>
    <p class="timeline__org">${e(x.company)} · ${e(x.location[lang])} · ${e(x.type[lang])}</p>
    ${list(x.bullets[lang].map(e), 'timeline__bullets')}
    ${badges(x.stack)}
  </li>`,
  )
  .join('\n')}
</ol>`;
}

export function workTestimonials(db, lang) {
  return db.testimonials
    .map(
      (t) => `<figure data-reveal class="quote">
  <blockquote class="quote__body">${e(t.quote[lang])}</blockquote>
  <figcaption class="quote__author">${e(t.author)}<span class="quote__role">${e(t.title[lang])} · ${e(t.relationship[lang])}</span></figcaption>
</figure>`,
    )
    .join('\n');
}

export function workCredentials(db, lang) {
  const c = db.copy[lang];
  return `<ul class="creds">
${db.credentials
  .filter((x) => x.kind === 'certification')
  .map(
    (x) => `  <li class="cred">
    <span class="cred__name">${e(x.name[lang])}</span>
    <span class="cred__issuer">${e(x.issuer)} · ${e(x.issued)}</span>
    ${x.credentialId ? `<span class="cred__id">${e(c.ui.credentialId)} ${e(x.credentialId)}</span>` : ''}
  </li>`,
  )
  .join('\n')}
</ul>`;
}

export function workEducation(db, lang) {
  return `<ul class="creds">
${db.credentials
  .filter((x) => x.kind !== 'certification')
  .map(
    (x) => `  <li class="cred">
    <span class="cred__name">${e(x.name[lang])}</span>
    <span class="cred__issuer">${e(x.issuer)} · ${e(x.start ? `${x.start} — ${x.issued}` : x.issued)}</span>
  </li>`,
  )
  .join('\n')}
</ul>`;
}

/* -------------------------------------------------------------- projects */

export function projectsList(db, lang) {
  const c = db.copy[lang];
  return db.projects
    .map(
      (p) => `<article data-reveal class="card card--row${p.featured ? ' card--featured' : ''}" id="${e(p.id)}">
  <div class="card__main">
    <p class="card__meta"><span>${e(p.category[lang])}</span><span>${e(p.year)}</span></p>
    <h3 class="card__title">${e(p.name)}</h3>
    <p class="card__body">${e(p.tagline[lang])}</p>
    <dl class="card__body">
      <dt>${e(c.ui.problem)}</dt><dd>${e(p.problem[lang])}</dd>
      <dt>${e(c.ui.built)}</dt><dd>${e(p.built[lang])}</dd>
      <dt>${e(c.ui.role)}</dt><dd>${e(p.role[lang])}</dd>
    </dl>
    ${p.context ? `<p class="card__body"><em>${e(p.context[lang])}</em></p>` : ''}
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
    ${p.url ? `<div class="card__foot"><a class="btn" href="${e(p.url)}" rel="noopener">${e(c.ui.visitLive)}</a></div>` : ''}
  </aside>
</article>`,
    )
    .join('\n');
}

/* ------------------------------------------------------------ automation */

export function automationList(db, lang) {
  const c = db.copy[lang];
  return db.workflows
    .map(
      (w) => `<article data-reveal class="card card--row" id="${e(w.id)}">
  <div class="card__main">
    <p class="card__meta"><span>${e(w.kind[lang])}</span><span>${e(w.year)}</span></p>
    <h3 class="card__title">${e(w.name[lang])}</h3>
    <p class="card__body">${e(w.summary[lang])}</p>
    ${list(w.highlights[lang].map(e), 'card__list')}
    <dl class="card__body"><dt>${e(c.ui.outcome)}</dt><dd>${e(w.outcome[lang])}</dd></dl>
  </div>
  <aside class="card__aside">
    <dl class="card__body">
      <dt>${e(c.ui.trigger)}</dt><dd>${e(w.trigger[lang])}</dd>
      <dt>${e(c.ui.services)}</dt><dd>${badges(w.services)}</dd>
    </dl>
  </aside>
</article>`,
    )
    .join('\n');
}

export function automationCase(db, lang) {
  return db.copy[lang].automation.caseBody.map((p) => `<p>${e(p)}</p>`).join('\n');
}

/* --------------------------------------------------------------- contact */

export function contactLinks(db, lang) {
  const { profile } = db;
  const rows = [
    { platform: 'Email', url: `mailto:${profile.email}`, value: profile.email },
    { platform: 'Phone', url: `tel:${profile.phone}`, value: profile.phone },
    // unresolved links are skipped entirely — never rendered as dead anchors
    ...profile.sameAs.filter((s) => s.url).map((s) => ({ platform: s.platform, url: s.url, value: s.url.replace(/^https?:\/\//, '') })),
  ];

  return `<ul class="linklist linklist--grid">
${rows
  .map(
    (r) => `  <li><a href="${e(r.url)}"${r.url.startsWith('http') ? ' rel="noopener"' : ''}>
    <span class="platform">${e(r.platform)}</span><span class="value">${e(r.value)}</span>
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
    (cv) => `  <li><a href="/${e(cv.file)}" download>
    <span class="platform">${e(cv.label[lang])}</span><span class="value">${e(c.ui.downloadCv)} · PDF</span>
  </a></li>`,
  )
  .join('\n')}
</ul>`;
}

export function contactAvailability(db, lang) {
  const a = db.profile.availability;
  const c = db.copy[lang];
  return `${a.openToWork ? `<ul class="badges"><li class="badge badge--accent">${e(c.ui.openToWork)}</li></ul>` : ''}
<h3 class="card__title">${e(c.contact.availabilityTitle)}</h3>
<p class="card__body">${e(db.profile.location.city[lang])}, ${e(db.profile.location.country[lang])}</p>
${badges(a.arrangements[lang])}`;
}

export function contactMcp(db, lang) {
  const b = base(db);
  const snippet = JSON.stringify(
    { mcpServers: { 'nour-profile': { command: 'node', args: ['/path/to/portfolio/mcp/server.js'] } } },
    null,
    2,
  );

  return `<ul class="linklist">
  <li><a href="${b}/llms.txt"><span class="platform">llms.txt</span><span class="value">site index for language models</span></a></li>
  <li><a href="${b}/llms-full.txt"><span class="platform">llms-full.txt</span><span class="value">complete profile, one document</span></a></li>
  <li><a href="${b}/api/profile.json"><span class="platform">profile.json</span><span class="value">identity and links</span></a></li>
  <li><a href="${b}/api/resume.json"><span class="platform">resume.json</span><span class="value">JSON Resume standard</span></a></li>
</ul>
<pre><code>${e(snippet)}</code></pre>`;
}
