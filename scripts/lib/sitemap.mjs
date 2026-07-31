/** The canonical page list. Everything that walks the site iterates this. */
export const PAGES = ['', 'about', 'work', 'projects', 'automation', 'chat', 'contact'];

export const LANGS = ['en', 'ar'];

const path = (page, lang) => `${lang === 'ar' ? '' : '/en'}/${page === '' ? 'index' : page}.html`;

export function buildSitemap(pages, baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const urls = LANGS.flatMap((lang) =>
    pages.map((page) => {
      const alternates = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${base}${path(page, l)}"/>`,
      ).join('\n');

      return [
        '  <url>',
        `    <loc>${base}${path(page, lang)}</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${path(page, 'ar')}"/>`,
        `    <lastmod>${today}</lastmod>`,
        `    <priority>${page === '' ? '1.0' : '0.8'}</priority>`,
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
