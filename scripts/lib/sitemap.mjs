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

/**
 * `pages` is every page that has an address in both languages: the
 * navigation and the detail pages.
 *
 * `dates` maps the address of a page (`/en/about`) to the day its content
 * last changed, as `YYYY-MM-DD`. It comes from lastmod.mjs, which moves a
 * page's day only when what the page says has moved; nothing here reads the
 * clock. An address with no day carries no `lastmod`, which is better than
 * a date nobody gave.
 *
 * There is no `<priority>` and no `<changefreq>`: Google ignores both.
 *
 * `hosted` is the entry address of every copy of another site that is meant
 * to be found, and whose decision is no longer open (`hostedEntries` in
 * hosting.mjs), already absolute. Such an entry is an address and nothing
 * more: the copy is one page in one language as far as this site knows, so
 * it has no hreflang set, and its content changes in another repository, so
 * it has no date this build could vouch for.
 */
export function buildSitemap(pages, baseUrl, dates = {}, hosted = []) {
  const base = baseUrl.replace(/\/$/, '');

  const urls = LANGS.flatMap((lang) =>
    pages.map((page) => {
      const alternates = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${base}${path(page, l)}"/>`,
      ).join('\n');

      return [
        '  <url>',
        `    <loc>${base}${path(page, lang)}</loc>`,
        // The sitemap schema fixes the order of its own elements, and takes
        // elements of another namespace (the hreflang links) after them.
        ...(dates?.[path(page, lang)] ? [`    <lastmod>${dates[path(page, lang)]}</lastmod>`] : []),
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${path(page, X_DEFAULT)}"/>`,
        '  </url>',
      ].join('\n');
    }),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    ...hosted.map((address) => ['  <url>', `    <loc>${address}</loc>`, '  </url>'].join('\n')),
    '</urlset>',
    '',
  ].join('\n');
}
