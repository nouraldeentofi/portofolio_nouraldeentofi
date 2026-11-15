/**
 * The share card: the picture a link to the site unfolds into.
 *
 * `scripts/og/og.html` is the card as a page, with `{{placeholders}}` where
 * the words go. This module fills them from `data/profile.json`, so the card
 * cannot say a title he no longer uses: the old one was exported by hand
 * and kept "Senior" long after the data dropped it. `scripts/og.mjs` then
 * photographs the filled page.
 *
 * Pure: data and a template in, a string out.
 */

import { escapeHtml } from './render.mjs';

/**
 * The words on the card, each one taken from the data as it stands.
 *
 * The headline is written as "<role>: <what in> · <second role>". The card
 * sets the three parts on two lines, so they are split here; a headline in
 * another shape still comes out whole, as the role.
 */
export function ogCardFields(db) {
  const { profile } = db;
  // The dot between the roles is written with a non-breaking space before it.
  const [first, ...rest] = profile.headline.en.split(/\s+·\s+/);
  const colon = first.indexOf(': ');
  const place = `${profile.location.city.en}, ${profile.location.country.en}`;

  return {
    nameEn: profile.name.en,
    nameAr: profile.name.ar,
    role: colon === -1 ? first : first.slice(0, colon),
    focus: colon === -1 ? '' : first.slice(colon + 2),
    // The second role and where he is, on one quiet line.
    more: [...rest, place].join(' · '),
    host: new URL(profile.site).host,
    image: profile.image ?? '',
  };
}

/**
 * The template with every placeholder filled, and a `<base>` so that the
 * addresses in it (`../../assets/...`) resolve from wherever the filled copy
 * is written. A placeholder the data has no word for is an error: a card
 * must not ship with a hole in it.
 */
export function renderOgCard(template, db, baseHref) {
  const fields = ogCardFields(db);
  const filled = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in fields)) throw new Error(`og card: the template asks for "${key}", which the data does not give`);
    return escapeHtml(fields[key]);
  });
  return filled.replace('<head>', `<head>\n<base href="${escapeHtml(baseHref)}">`);
}
