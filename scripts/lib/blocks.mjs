/**
 * HTML for every `@gen` marker.
 *
 * This is the single place that turns data into markup. Pages own their
 * prose and layout; this module owns every repeating list and every figure.
 */

import { escapeHtml, extAttrs, newTabHint, linkifyPeople } from './render.mjs';
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
    <dt>${e(c.ui.problem)}</dt><dd>${prose(db, p.problem[lang], lang)}</dd>
    <dt>${e(c.ui.built)}</dt><dd>${prose(db, p.built[lang], lang)}</dd>
    <dt>${e(c.ui.role)}</dt><dd>${prose(db, p.role[lang], lang)}</dd>
  </dl>
  ${badges(p.stack)}
  <div class="card__foot">
    ${p.url ? `<a class="btn" href="${e(p.url)}"${extAttrs(p.url)}>${e(c.ui.visitLive)}${newTabHint(c.ui.opensInNewTab)}</a>` : ''}
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
  <p class="card__body">${prose(db, w.summary[lang], lang)}</p>
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
    p.url ? `<a class="btn btn--ghost" href="${e(p.url)}"${extAttrs(p.url)}>${e(c.ui.visitLive)}${newTabHint(c.ui.opensInNewTab)}</a>` : ''
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
  <figcaption class="quote__author">${person(db, t.author, lang)}<span class="quote__role">${e(t.title[lang])}</span></figcaption>
</figure>`,
    )
    .join('\n');
}

/* ----------------------------------------------------------------- about */

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
  return `<ol class="timeline">
${db.experience
  .map(
    (x) => `  <li data-reveal class="timeline__item${x.end === null ? ' timeline__item--current' : ''}">
    <p class="timeline__period">${period(x.start, x.end, c.ui.present)}</p>
    <h3 class="timeline__role">${e(x.role[lang])}</h3>
    <p class="timeline__org">${org(db, x.company, lang)} · ${e(x.location[lang])} · ${e(x.type[lang])}</p>
    ${list(x.bullets[lang].map((b) => prose(db, b, lang)), 'timeline__bullets')}
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
  <figcaption class="quote__author">${person(db, t.author, lang)}<span class="quote__role">${e(t.title[lang])} · ${e(t.relationship[lang])}</span></figcaption>
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
      <time class="cred__date">${e(x.issued)}</time>
      ${x.credentialId ? `<span class="cred__id" title="${e(c.ui.credentialId)}">${e(x.credentialId)}</span>` : ''}
    </span>
  </li>`,
  )
  .join('\n')}
</ul>`;
}

export function workEducation(db, lang) {
  return `<ul class="creds creds--feature">
${db.credentials
  .filter((x) => x.kind !== 'certification')
  .map(
    (x) => `  <li class="cred cred--feature" data-reveal>
    <span class="cred__kind">${e(x.kind === 'award' ? '★' : '✦')}</span>
    <span class="cred__body">
      <span class="cred__name">${e(x.name[lang])}</span>
      <span class="cred__issuer">${org(db, x.issuer, lang)} · ${e(x.start ? `${x.start} — ${x.issued}` : x.issued)}</span>
      ${x.note ? `<span class="cred__note">${e(x.note[lang])}</span>` : ''}
    </span>
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
      <dt>${e(c.ui.problem)}</dt><dd>${prose(db, p.problem[lang], lang)}</dd>
      <dt>${e(c.ui.built)}</dt><dd>${prose(db, p.built[lang], lang)}</dd>
      <dt>${e(c.ui.role)}</dt><dd>${prose(db, p.role[lang], lang)}</dd>
    </dl>
    ${p.context ? `<p class="card__body"><em>${prose(db, p.context[lang], lang)}</em></p>` : ''}
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
    ${p.url ? `<div class="card__foot"><a class="btn" href="${e(p.url)}"${extAttrs(p.url)}>${e(c.ui.visitLive)}${newTabHint(c.ui.opensInNewTab)}</a></div>` : ''}
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
      (w) => `<article data-reveal class="card card--row${w.featured ? ' card--featured' : ''}" id="${e(w.id)}">
  <div class="card__main">
    <p class="card__meta"><span>${e(w.kind[lang])}</span><span>${e(w.year)}</span></p>
    <h3 class="card__title">${e(w.name[lang])}</h3>
    <p class="card__body">${prose(db, w.summary[lang], lang)}</p>
    ${list(w.highlights[lang].map((h) => prose(db, h, lang)), 'card__list')}
    <dl class="card__body"><dt>${e(c.ui.outcome)}</dt><dd>${prose(db, w.outcome[lang], lang)}</dd></dl>
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

/* --------------------------------------------------------------- contact */

export function contactLinks(db, lang) {
  const { profile } = db;
  const rows = [
    { platform: 'Email', url: `mailto:${profile.email}`, value: profile.email },
    { platform: 'Phone', url: `tel:${profile.phone}`, value: profile.phone },
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
    <span class="platform">${e(r.platform)}</span><span class="value">${e(r.value)}</span>${
      extAttrs(r.url) ? newTabHint(db.copy[lang].ui.opensInNewTab) : ''
    }
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
  return `<h3 class="card__title">${e(c.contact.availabilityTitle)}</h3>
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
