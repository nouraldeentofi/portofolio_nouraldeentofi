/**
 * The canonical page list. Everything that walks the navigation iterates this.
 *
 * The pages that come from the data, one for each project and each
 * automation system, are listed by `detailPages` in details.mjs.
 */
export const PAGES = ['', 'about', 'work', 'projects', 'showcase', 'automation', 'chat', 'contact'];

export const LANGS = ['en', 'ar'];

/**
 * The address a page is served at, from the site root: `/about`, `/en/about`,
 * and `/` or `/en/` for the two home pages.
 *
 * No `.html`: the host answers `/about.html` with a redirect to `/about`, so
 * the clean form is the only one that never redirects. Canonicals, hreflang,
 * the sitemap, structured data and every link between pages use it, so a
 * search engine is only ever told about one address per page.
 */
export const pagePath = (page, lang) => `${lang === 'ar' ? '' : '/en'}/${page}`;

const path = pagePath;

/**
 * The language a visitor is offered when their browser asks for neither
 * Arabic nor English. English, on every page: an Arabic reader is already
 * served by `hreflang="ar"`, so this only decides what someone with, say, a
 * French or an Urdu browser is shown. The head of every page (`headMeta` in
 * blocks.mjs) reads it from here, so the two can never disagree. Nothing
 * redirects: the root address still serves Arabic.
 */
export const X_DEFAULT = 'en';

/* The home page first, then the pages of the navigation, then the pages one
   level down. */
const priority = (page) => (page === '' ? '1.0' : page.includes('/') ? '0.6' : '0.8');

/**
 * `pages` is every page that has an address in both languages: the
 * navigation and the detail pages.
 *
 * `today` is the day of the build as `YYYY-MM-DD`, handed in by
 * scripts/build.mjs so nothing here reads the clock. Without it the entries
 * carry no `lastmod`, which is better than a date nobody gave.
 */
export function buildSitemap(pages, baseUrl, today = null) {
  const base = baseUrl.replace(/\/$/, '');

  const urls = LANGS.flatMap((lang) =>
    pages.map((page) => {
      const alternates = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${base}${path(page, l)}"/>`,
      ).join('\n');

      return [
        '  <url>',
        `    <loc>${base}${path(page, lang)}</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${path(page, X_DEFAULT)}"/>`,
        ...(today ? [`    <lastmod>${today}</lastmod>`] : []),
        `    <priority>${priority(page)}</priority>`,
        '  </url>',
      ].join('\n');
    }),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
