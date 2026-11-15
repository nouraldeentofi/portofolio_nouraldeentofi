/**
 * schema.org JSON-LD generation.
 *
 * The `sameAs` array produced by `personLd` is the mechanism that resolves
 * scattered accounts (LinkedIn, GitHub, YouTube, Codeforces) into a single
 * entity for search engines and language models. It lists only profiles that
 * are him: a product he built is not the same thing as the person, so an
 * entry marked `identity: false` stays out. Unresolved links (url === null)
 * are dropped rather than emitted as dead references.
 *
 * Nothing here reads the clock. A date that belongs in the output is handed
 * in by the build, so the same data always gives the same markup.
 */

import { pagePath } from './sitemap.mjs';

const CTX = 'https://schema.org';

const PAGE_TITLES = {
  '': { en: 'Home', ar: 'الرئيسية' },
  about: { en: 'About', ar: 'نبذة' },
  work: { en: 'Work', ar: 'المسيرة' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  showcase: { en: 'Showcase', ar: 'معرض المواقع' },
  automation: { en: 'Automation Lab', ar: 'مختبر الأتمتة' },
  chat: { en: 'Chat', ar: 'محادثة' },
  contact: { en: 'Contact', ar: 'تواصل' },
};

const base = (db) => db.profile.site.replace(/\/$/, '');

/**
 * `sameAs` for a named person or organisation, when `data/links.json` knows
 * one. Emitting it turns a bare name into a resolvable entity, which is how
 * a search engine or model connects "Haitham Zedan" here to the same person
 * elsewhere. Unknown names get no key at all rather than a guess.
 */
const entitySameAs = (db, group, name) => {
  const url = db.links?.[group]?.[name]?.url;
  return url ? { sameAs: url } : {};
};

export function pageUrl(db, page, lang) {
  return `${base(db)}${pagePath(page, lang)}`;
}

export function credentialsLd(db, lang) {
  return db.credentials
    .filter((c) => c.kind === 'certification')
    .map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name[lang],
      credentialCategory: 'certificate',
      recognizedBy: {
        '@type': 'Organization',
        name: c.issuer,
        ...entitySameAs(db, 'organizations', c.issuer),
      },
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
    ...(profile.nameParts
      ? { givenName: profile.nameParts.given[lang], familyName: profile.nameParts.family[lang] }
      : {}),
    // Every spelling people actually use, so a model or search engine that
    // meets any variant resolves it to this same person. The name being
    // rendered is excluded: a canonical name is not its own alias.
    //
    // This is the one place the misspellings are allowed. Nobody reads an
    // alternateName, but a search for the wrong spelling still has to find
    // him; everywhere a person or a language model reads, they stay out.
    alternateName: [
      ...new Set([profile.name[other], ...(profile.nameVariants ?? []), ...(profile.nameMisspellings ?? [])]),
    ].filter((n) => n !== profile.name[lang]),
    jobTitle: profile.headline[lang],
    // The words a visitor reads at the top of the home page. Google expects
    // structured data to describe what is on the page, and the tagline is
    // not rendered anywhere a visitor can see it.
    description: db.copy[lang].home.intro,
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    url: base(db),
    // `image` is emitted only once a real portrait exists: a broken image
    // reference in structured data is worse than an absent one. As an
    // ImageObject it carries creator, credit and copyright, which Google
    // Images shows next to the photo.
    ...(profile.image
      ? {
          image: {
            '@type': 'ImageObject',
            contentUrl: `${base(db)}/${profile.image}`,
            caption: `${profile.name[lang]}${lang === 'ar' ? '، ' : ', '}${profile.headline[lang]}`,
            creator: { '@id': `${base(db)}/#nour` },
            creditText: profile.name[lang],
            copyrightNotice: `© ${profile.name[lang]}`,
          },
        }
      : {}),
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
    sameAs: profile.sameAs.filter((s) => s.url && s.identity !== false).map((s) => s.url),
    knowsAbout: db.skills.flatMap((g) => g.items),
    hasCredential: credentialsLd(db, lang),
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'University of Kalamoon',
      ...entitySameAs(db, 'organizations', 'University of Kalamoon'),
    },
    // Only a role that is still running is a current employer. Between jobs
    // the key is left out rather than emitted empty.
    ...(() => {
      const current = db.experience
        .filter((e) => e.end === null)
        .map((e) => ({ '@type': 'Organization', name: e.company, ...entitySameAs(db, 'organizations', e.company) }));
      return current.length ? { worksFor: current } : {};
    })(),
    hasOccupation: {
      '@type': 'Occupation',
      name: 'AI Automation Engineer',
      occupationLocation: { '@type': 'City', name: profile.location.city[lang] },
      skills: db.skills.find((g) => g.id === 'automation-ai').items.join(', '),
    },
    seeks: profile.availability.openToWork
      ? {
          '@type': 'Demand',
          name: profile.availability.roles?.[lang].join(', ') ?? 'Automation and frontend engineering opportunities',
          ...(profile.availability.areas ? { areaServed: profile.availability.areas[lang] } : {}),
          ...(profile.availability.since ? { availabilityStarts: profile.availability.since } : {}),
        }
      : undefined,
  };
}

/**
 * The site, as one node that is identical on every page in both languages.
 *
 * Google takes the site name from the WebSite node and `og:site_name` of the
 * domain root, and one `@id` must describe one thing. It used to carry a
 * different name, address and description per language, which left Google to
 * pick between two answers. So there is no `lang` argument: the address is
 * the root, the name is the Latin one, and the Arabic name, the short form
 * and the host are the alternatives it may show instead.
 */
export function websiteLd(db) {
  const { profile } = db;
  return {
    '@context': CTX,
    '@type': 'WebSite',
    '@id': `${base(db)}/#website`,
    url: `${base(db)}/`,
    name: profile.name.en,
    alternateName: [profile.name.ar, profile.shortName?.en, new URL(profile.site).host].filter(Boolean),
    inLanguage: ['ar', 'en'],
    publisher: { '@id': `${base(db)}/#nour` },
  };
}

/**
 * `modified` is a full timestamp with an offset ("2026-11-15T00:00:00+03:00"):
 * Google rejects a bare date here. The build passes it in, because this module
 * must not read the clock; without one the key is left out rather than guessed.
 */
export function profilePageLd(db, lang, modified = null) {
  return {
    '@context': CTX,
    '@type': 'ProfilePage',
    '@id': `${pageUrl(db, '', lang)}#profilepage`,
    url: pageUrl(db, '', lang),
    inLanguage: lang,
    mainEntity: { '@id': `${base(db)}/#nour` },
    ...(modified ? { dateModified: modified } : {}),
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
        ...(p.images ? { image: `${base(db)}/${p.images.desktop}` } : {}),
        ...(p.stack?.length ? { keywords: p.stack.join(', ') } : {}),
      },
    })),
  };
}

/**
 * Client sites as WebSite entries. Nour is the creator; the person or shop
 * the site belongs to is named in the description, never claimed as author.
 */
export function showcaseLd(db, lang) {
  const { sites, lab } = db.showcase;
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].showcase.title,
    itemListElement: [...sites, lab].map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'WebSite',
        name: s.name[lang],
        description: (s.role ?? s.tagline)[lang],
        creator: { '@id': `${base(db)}/#nour` },
        image: `${base(db)}/${s.images.desktop}`,
        ...(s.url ? { url: s.url } : {}),
        ...(s.year ? { dateCreated: s.year } : {}),
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
        memberOf: {
          '@type': 'Organization',
          name: e.company,
          ...entitySameAs(db, 'organizations', e.company),
        },
      },
    })),
  };
}

/**
 * Recommendations as quotations about Nour, each attributed to its author.
 *
 * Not `Review`: Google only accepts reviews of products, businesses, books
 * and the like, and reported every one of these as invalid because a person
 * cannot be the thing reviewed. A quotation says the same and breaks no rule.
 */
export function recommendationsLd(db, lang) {
  return db.testimonials.map((t) => ({
    '@context': CTX,
    '@type': 'Quotation',
    about: { '@id': `${base(db)}/#nour` },
    creator: {
      '@type': 'Person',
      name: t.author,
      jobTitle: t.title[lang],
      ...entitySameAs(db, 'people', t.author),
    },
    dateCreated: t.date,
    text: t.quote[lang],
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

/**
 * The trail from the home page to this one. The home page has none: a
 * breadcrumb with a single item is not eligible for anything, so it returns
 * null and `toScriptTag` drops it.
 */
export function breadcrumbLd(page, lang, db) {
  if (page === '') return null;
  const home = { '@type': 'ListItem', position: 1, name: PAGE_TITLES[''][lang], item: pageUrl(db, '', lang) };

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
