/**
 * schema.org JSON-LD generation.
 *
 * The `sameAs` array produced by `personLd` is the mechanism that resolves
 * scattered accounts — LinkedIn, GitHub, Play Store, product sites — into a
 * single entity for search engines and language models. Unresolved links
 * (url === null) are dropped rather than emitted as dead references.
 */

const CTX = 'https://schema.org';

const PAGE_TITLES = {
  '': { en: 'Home', ar: 'الرئيسية' },
  about: { en: 'About', ar: 'نبذة' },
  work: { en: 'Work', ar: 'المسيرة' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  automation: { en: 'Automation Lab', ar: 'مختبر الأتمتة' },
  chat: { en: 'Chat', ar: 'محادثة' },
  contact: { en: 'Contact', ar: 'تواصل' },
};

const base = (db) => db.profile.site.replace(/\/$/, '');
const langPath = (lang) => (lang === 'ar' ? '' : '/en');

export function pageUrl(db, page, lang) {
  return `${base(db)}${langPath(lang)}/${page === '' ? 'index' : page}.html`;
}

export function credentialsLd(db, lang) {
  return db.credentials
    .filter((c) => c.kind === 'certification')
    .map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name[lang],
      credentialCategory: 'certificate',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
      dateCreated: c.issued,
      ...(c.credentialId ? { identifier: c.credentialId } : {}),
    }));
}

export function personLd(db, lang) {
  const { profile } = db;
  const other = lang === 'en' ? 'ar' : 'en';

  return {
    '@context': CTX,
    '@type': 'Person',
    '@id': `${base(db)}/#nour`,
    name: profile.name[lang],
    alternateName: profile.name[other],
    jobTitle: profile.headline[lang],
    description: profile.tagline[lang],
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    url: base(db),
    // `image` is emitted only once a real portrait exists — a broken image
    // reference in structured data is worse than an absent one.
    ...(profile.image ? { image: `${base(db)}/${profile.image}` } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city[lang],
      addressRegion: profile.location.region[lang],
      addressCountry: profile.location.countryCode,
    },
    knowsLanguage: profile.languages.map((l) => ({
      '@type': 'Language',
      name: l.name[lang],
      alternateName: l.code,
    })),
    sameAs: profile.sameAs.filter((s) => s.url).map((s) => s.url),
    knowsAbout: db.skills.flatMap((g) => g.items),
    hasCredential: credentialsLd(db, lang),
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'University of Kalamoon',
      sameAs: 'https://uok.edu.sy/',
    },
    worksFor: db.experience
      .filter((e) => e.end === null)
      .map((e) => ({ '@type': 'Organization', name: e.company })),
    hasOccupation: {
      '@type': 'Occupation',
      name: 'AI Automation Engineer',
      occupationLocation: { '@type': 'City', name: profile.location.city[lang] },
      skills: db.skills.find((g) => g.id === 'automation-ai').items.join(', '),
    },
    seeks: profile.availability.openToWork
      ? { '@type': 'Demand', name: 'Automation and frontend engineering opportunities' }
      : undefined,
  };
}

export function websiteLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'WebSite',
    '@id': `${base(db)}/#website`,
    url: `${base(db)}${langPath(lang)}/`,
    name: db.copy[lang].meta.siteName,
    description: db.copy[lang].meta.description,
    inLanguage: lang,
    author: { '@id': `${base(db)}/#nour` },
  };
}

export function profilePageLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ProfilePage',
    '@id': `${pageUrl(db, '', lang)}#profilepage`,
    url: pageUrl(db, '', lang),
    inLanguage: lang,
    mainEntity: { '@id': `${base(db)}/#nour` },
    dateModified: new Date().toISOString().slice(0, 10),
  };
}

export function projectsLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].projects.title,
    itemListElement: db.projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: p.name,
        description: p.tagline[lang],
        applicationCategory: p.category[lang],
        datePublished: String(p.year).slice(0, 4),
        author: { '@id': `${base(db)}/#nour` },
        ...(p.url ? { url: p.url } : {}),
        ...(p.stack?.length ? { keywords: p.stack.join(', ') } : {}),
      },
    })),
  };
}

export function workflowsLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].automation.title,
    itemListElement: db.workflows.map((w, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: w.name[lang],
        description: w.summary[lang],
        genre: w.kind[lang],
        author: { '@id': `${base(db)}/#nour` },
        keywords: w.services.join(', '),
      },
    })),
  };
}

export function experienceLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].work.timelineTitle,
    itemListElement: db.experience.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'OrganizationRole',
        roleName: e.role[lang],
        startDate: e.start,
        ...(e.end ? { endDate: e.end } : {}),
        memberOf: { '@type': 'Organization', name: e.company },
      },
    })),
  };
}

export function reviewsLd(db, lang) {
  return db.testimonials.map((t) => ({
    '@context': CTX,
    '@type': 'Review',
    itemReviewed: { '@id': `${base(db)}/#nour` },
    author: { '@type': 'Person', name: t.author, jobTitle: t.title[lang] },
    datePublished: t.date,
    reviewBody: t.quote[lang],
    inLanguage: lang,
  }));
}

export function faqLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: db.copy[lang].about.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function contactPageLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ContactPage',
    url: pageUrl(db, 'contact', lang),
    inLanguage: lang,
    mainEntity: { '@id': `${base(db)}/#nour` },
  };
}

export function breadcrumbLd(page, lang, db) {
  const home = { '@type': 'ListItem', position: 1, name: PAGE_TITLES[''][lang], item: pageUrl(db, '', lang) };
  if (page === '') return { '@context': CTX, '@type': 'BreadcrumbList', itemListElement: [home] };

  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: [
      home,
      { '@type': 'ListItem', position: 2, name: PAGE_TITLES[page][lang], item: pageUrl(db, page, lang) },
    ],
  };
}

/** Wrap one or more schema objects in a single script tag, combining via @graph. */
export function toScriptTag(...objects) {
  const items = objects.filter(Boolean);
  const payload =
    items.length === 1
      ? items[0]
      : {
          '@context': CTX,
          '@graph': items.map(({ '@context': _ctx, ...rest }) => rest),
        };

  // `</` is escaped so a value containing "</script>" cannot break out of the tag.
  const json = JSON.stringify(payload, null, 2).replaceAll('</', '<\\/');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
