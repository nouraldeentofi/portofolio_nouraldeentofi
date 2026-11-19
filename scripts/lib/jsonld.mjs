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
import { homeOffers } from './offers.mjs';
import { detailName, projectHref, systemHref } from './details.mjs';

const CTX = 'https://schema.org';

const base = (db) => db.profile.site.replace(/\/$/, '');

/**
 * What a page is called in a breadcrumb: its label in the navigation
 * (`nav` in the copy), so the trail in the markup, the trail a visitor sees
 * on a detail page and the menu all call a page by one name.
 */
export const pageTitle = (db, page, lang) => db.copy[lang].nav[page === '' ? 'home' : page];

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

/**
 * What every page says about him: who he is, what he does, where he is, the
 * portrait in the header and the profiles that are his.
 *
 * His name and the portrait are on every page. His title and his address
 * are not printed on every one of them (a project page shows neither), and
 * they are kept all the same: they are what makes the node an identity, the
 * same person on every page, and `scripts/validate.mjs` requires name,
 * jobTitle, sameAs and address of any Person node. Everything beyond these
 * is held to the page that shows it (`PERSON_ON_PAGE`), and a test reads
 * the page for each value.
 */
const PERSON_EVERYWHERE = ['@context', '@type', '@id', 'name', 'jobTitle', 'url', 'image', 'address', 'sameAs'];

/**
 * What only one page shows, and so only that page's node carries. Google
 * asks that structured data describe what a visitor can read on the page it
 * sits on, "even if the information is accurate": the phone number is on
 * the contact page, the certificates on the experience page, the skills on
 * the about page.
 *
 * The home page is his ProfilePage, so its node is complete as an identity
 * on its own: both halves of the name, every spelling, the description and
 * the languages. The spellings ride on the about page as well, where the
 * answer to "how is his name written" lists them. What he is looking for
 * (`seeks`) is on the contact page only, which prints every role and every
 * place; the about page speaks of them in its own words, in the questions,
 * and words that paraphrase a value are not that value on the page. A page
 * that is not listed here, such as the 404 or the page of one project,
 * carries the slim node.
 */
export const PERSON_ON_PAGE = {
  '': ['givenName', 'familyName', 'alternateName', 'description', 'knowsLanguage'],
  about: ['alternateName', 'email', 'knowsAbout', 'hasOccupation'],
  work: ['hasCredential', 'alumniOf', 'worksFor'],
  contact: ['email', 'telephone', 'seeks'],
};

/**
 * `page` is the key of the page the node is for (`''`, `about`, `work`,
 * `contact`, ...). The `@id` is the same everywhere, so every node is the
 * same person; without a page, or for a page that shows nothing more about
 * him, the node is the slim one.
 */
export function personLd(db, lang, page = null) {
  const keep = new Set([...PERSON_EVERYWHERE, ...(PERSON_ON_PAGE[page] ?? [])]);
  return Object.fromEntries(Object.entries(personFields(db, lang)).filter(([key, value]) => keep.has(key) && value !== undefined));
}

/* Everything the site could say about him as a Person, in one place.
   `personLd` hands each page the part of it that page shows. */
function personFields(db, lang) {
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
    // The list rides on the home and the about node only (PERSON_ON_PAGE).
    alternateName: [
      ...new Set([profile.name[other], ...(profile.nameVariants ?? []), ...(profile.nameMisspellings ?? [])]),
    ].filter((n) => n !== profile.name[lang]),
    jobTitle: profile.headline[lang],
    // The words a visitor reads at the top of the home page. Google expects
    // structured data to describe what is on the page, and the tagline is
    // not rendered anywhere a visitor can see it.
    description: db.copy[lang].home.intro,
    // A plain address: schema.org's email is the address itself, not a link to it.
    email: profile.email,
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
    // Only a role that is still running is a current employer, and
    // self-employment names none. Between jobs the key is left out rather
    // than emitted empty.
    ...(() => {
      const current = db.experience
        .filter((e) => e.end === null && !e.selfEmployed)
        .map((e) => ({ '@type': 'Organization', name: e.company, ...entitySameAs(db, 'organizations', e.company) }));
      return current.length ? { worksFor: current } : {};
    })(),
    hasOccupation: {
      '@type': 'Occupation',
      // The first role he names in the data, in the language of the page.
      name: profile.availability.roles?.[lang]?.[0] ?? profile.headline[lang],
      occupationLocation: { '@type': 'City', name: profile.location.city[lang] },
      skills: db.skills.find((g) => g.id === 'automation-ai').items.join(', '),
    },
    seeks: profile.availability.openToWork
      ? {
          '@type': 'Demand',
          name: profile.availability.roles?.[lang].join(', ') ?? 'Automation and frontend engineering opportunities',
          ...(profile.availability.areas ? { areaServed: profile.availability.areas[lang] } : {}),
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
 * When the facts of his identity last changed, as a full timestamp:
 * `updated` in data/profile.json at midnight in Riyadh.
 *
 * It is set by hand, when the name, the title, the links, the portrait or
 * the location change, and not by the build. Google asks that a profile's
 * dateModified reflect changes a person made to the profile; a date that
 * moved with every build would say the profile changes daily. Null when the
 * data gives none.
 */
export const profileModified = (db) => (db.profile.updated ? `${db.profile.updated}T00:00:00+03:00` : null);

/**
 * `modified` is a full timestamp with an offset ("2026-11-15T00:00:00+03:00"):
 * Google rejects a bare date here. It is handed in (see `profileModified`),
 * because this module must not read the clock; without one the key is left
 * out rather than guessed.
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

/**
 * What he offers, one Service per card on the home page.
 *
 * The name and the description are the card's own words, so the markup says
 * nothing a visitor cannot read. He is the provider, as a person: this is not
 * a LocalBusiness, and it carries no price and no rating, because the site
 * states neither. The languages sit on the channel, which is where
 * schema.org puts them: a Service has no availableLanguage of its own.
 */
export function servicesLd(db, lang) {
  return homeOffers(db, lang).map((o) => {
    const url = pageUrl(db, o.page, lang);
    return {
      '@context': CTX,
      '@type': 'Service',
      // The address of the card itself, so the node points at the words it repeats.
      '@id': `${pageUrl(db, '', lang)}#offer-${o.id}`,
      name: o.title,
      description: o.body,
      serviceType: o.serviceType,
      provider: { '@id': `${base(db)}/#nour` },
      areaServed: { '@type': 'Country', name: db.profile.location.country[lang] },
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: url,
        availableLanguage: db.profile.languages.map((l) => l.code),
      },
      url,
    };
  });
}

/**
 * The projects page as a list of the pages it leads to.
 *
 * Each entry is a position, a name and the address of that project's own
 * page on this site. What the project is, who made it and what it looks like
 * is said once, on that page (`detailLd`), not repeated here in brief.
 */
export function projectsLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].projects.title,
    itemListElement: db.projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: `${base(db)}${projectHref(p, lang)}`,
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

/**
 * The automation page as a list, in the same shape as `projectsLd`.
 *
 * The address is where the system is read in full (`systemHref`): its own
 * page, the section of its product's page, or, for one that has neither, its
 * card on the list page itself.
 */
export function workflowsLd(db, lang) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name: db.copy[lang].automation.title,
    itemListElement: db.workflows.map((w, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: w.name[lang],
      url: `${base(db)}${systemHref(db, w, lang)}`,
    })),
  };
}

/** The first four digits of a year, which the data may write as "2025 to present". */
const yearCreated = (year) => String(typeof year === 'object' ? year.en : year).slice(0, 4);

/**
 * The thing a detail page is about: one project or one automation system.
 *
 * A CreativeWork in both cases, on purpose. Google requires a price and a
 * rating before it accepts a SoftwareApplication, a WebApplication or a
 * MobileApplication, and the site states neither, so neither is invented to
 * make a type validate. Every value here is one the page shows: the name is
 * its heading, the description its lead, the keywords its badges, the year
 * the line under the heading, and the image the screenshot or the canvas in
 * the page.
 *
 * He is the `author` of what he built. A product he coordinated, with others
 * writing the code, carries `credit: "contributor"` in the data, and the node
 * then names him as `contributor`: the page prints his role, and the markup
 * must not claim more than that role.
 */
export function detailLd(db, lang, d) {
  const url = pageUrl(db, d.page, lang);
  const e = d.entry;
  const picture = d.kind === 'project' ? e.images?.desktop : e.canvas;
  const keywords = d.kind === 'project' ? e.stack : e.services;

  return {
    '@context': CTX,
    '@type': 'CreativeWork',
    // The address of the page's own content, the way a Service names its card.
    '@id': `${url}#main`,
    name: detailName(d, lang),
    description: (d.kind === 'project' ? e.tagline : e.summary)[lang],
    url,
    ...(picture ? { image: `${base(db)}/${picture}` } : {}),
    [e.credit === 'contributor' ? 'contributor' : 'author']: { '@id': `${base(db)}/#nour` },
    dateCreated: yearCreated(e.year),
    ...(keywords?.length ? { keywords: keywords.join(', ') } : {}),
    inLanguage: lang,
  };
}

/** Home, the list page, then the item itself: the trail a detail page shows above its heading. */
export function detailBreadcrumbLd(db, lang, d) {
  const step = (position, name, page) => ({ '@type': 'ListItem', position, name, item: pageUrl(db, page, lang) });
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: [
      step(1, pageTitle(db, '', lang), ''),
      step(2, pageTitle(db, d.parent, lang), d.parent),
      step(3, detailName(d, lang), d.page),
    ],
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
        // Self-employment is a way of working, not an organisation.
        ...(e.selfEmployed
          ? {}
          : {
              memberOf: {
                '@type': 'Organization',
                name: e.company,
                ...entitySameAs(db, 'organizations', e.company),
              },
            }),
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
  const home = { '@type': 'ListItem', position: 1, name: pageTitle(db, '', lang), item: pageUrl(db, '', lang) };

  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: [
      home,
      { '@type': 'ListItem', position: 2, name: pageTitle(db, page, lang), item: pageUrl(db, page, lang) },
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
