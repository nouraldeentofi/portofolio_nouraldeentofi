/**
 * A page of its own for every project and every automation system.
 *
 * The list pages describe many things at once, so none of them can answer a
 * search for one of them. Each entry that has enough to say gets an address
 * that carries its full description: `/projects/<id>` and `/automation/<id>`.
 *
 * This module decides which entries those are, where each one lives, and
 * what its page is called in a search result. Everything that lists or links
 * (the build, the sitemap, the list pages, the llms files, the API, the
 * validator and the tests) asks here, so they cannot disagree.
 *
 * Pure: data in, plain values out.
 */

import { pagePath } from './sitemap.mjs';

/** The folders the build writes detail pages into, once per language. */
export const DETAIL_FOLDERS = ['projects', 'automation'];

/** On a project page, the section that shows the workflow behind the product. */
export const ENGINE_ANCHOR = 'automation';

/** The project a workflow is the engine of, when there is one. */
export const productOf = (db, w) => db.projects.find((p) => p.workflow === w.id);

/** The workflow a project names as its engine, when it names one. */
export const engineOf = (db, p) => (p.workflow ? db.workflows.find((w) => w.id === p.workflow) : undefined);

/**
 * Where a product stands is where its engine stands: Smart Scanner is in
 * private beta because its pipeline is. A project with no engine has no
 * status of its own.
 */
export const productStatus = (db, p) => engineOf(db, p)?.status;

/**
 * Whether a workflow gets a page of its own.
 *
 * It needs both a curated flow and a canvas screenshot: without them the
 * page would only repeat its card. And a workflow that is the engine of a
 * product is shown on that product's page instead, so one thing is not
 * described at two addresses.
 */
export const hasOwnPage = (db, w) => Boolean(w.flow && w.canvas && !productOf(db, w));

/**
 * Every detail page, projects first, in the order of the data.
 *
 * `page` is the key the rest of the generator knows a page by: handed to
 * `pagePath` it gives the address, and with `.html` it is the file.
 */
export function detailPages(db) {
  return [
    ...db.projects.map((p) => ({ kind: 'project', id: p.id, parent: 'projects', page: `projects/${p.id}`, entry: p })),
    ...db.workflows
      .filter((w) => hasOwnPage(db, w))
      .map((w) => ({ kind: 'system', id: w.id, parent: 'automation', page: `automation/${w.id}`, entry: w })),
  ];
}

/** Where a project is read in full. Every project has a page. */
export const projectHref = (p, lang) => pagePath(`projects/${p.id}`, lang);

/**
 * Where a workflow is read in full: its own page, or the section of the
 * product page that shows it, or, when it has neither, its card on the list.
 */
export function systemHref(db, w, lang) {
  if (hasOwnPage(db, w)) return pagePath(`automation/${w.id}`, lang);
  const product = productOf(db, w);
  if (product) return `${projectHref(product, lang)}#${ENGINE_ANCHOR}`;
  return `${pagePath('automation', lang)}#${w.id}`;
}

/** Whether `systemHref` leads to more than the workflow's own card. */
export const hasDetail = (db, w) => hasOwnPage(db, w) || Boolean(productOf(db, w));

/* ------------------------------------------------------------- the head */

/** A project's name is one string in both languages; a system's is per language. */
export const detailName = (d, lang) => (d.kind === 'project' ? d.entry.name : d.entry.name[lang]);

/**
 * The line under the heading, and the second half of the title.
 *
 * `headline` in the data says what the thing is in the words people search
 * for. An entry without one falls back to its category or kind, which is
 * what its card shows.
 */
export const detailHeadline = (d, lang) =>
  d.entry.headline?.[lang] ?? (d.kind === 'project' ? d.entry.category[lang] : d.entry.kind[lang]);

/** A search result shows about this much of a title before it cuts it. */
export const TITLE_ROOM = 65;

/**
 * The longest a detail title may be. What a search result cuts is the end
 * of a title, and the end is the headline, the part that says what the page
 * is about. So a headline leaves out what the name already says, and a test
 * holds every entry to this bound.
 */
export const TITLE_LIMIT = 80;

/**
 * "<name>: <headline>", with his name appended only while the whole title
 * still fits. A title that is cut loses its end, and the end must not be the
 * part that says what the page is about.
 */
export function detailTitle(db, d, lang) {
  const title = `${detailName(d, lang)}: ${detailHeadline(d, lang)}`;
  const signed = `${title} | ${db.profile.name[lang]}`;
  return signed.length <= TITLE_ROOM ? signed : title;
}

/** A search result shows about this much of a description. */
export const DESCRIPTION_ROOM = 160;

/**
 * Text cut to fit a description: whole sentences while they fit, and
 * otherwise a whole clause, or failing that whole words, followed by an
 * ellipsis.
 *
 * "Otherwise" is when the first sentence alone is too long, and also when
 * the sentences that fit fill less than half the room: a description that
 * stops after one short opening sentence, with the point of the entry still
 * to come, is one a search engine replaces with text of its own choosing.
 *
 * A sentence ends at a full stop or a question or exclamation mark that is
 * followed by a space or by nothing, so "GPT-4.1" is not an ending.
 *
 * A cut in the middle of a sentence is made at the last clause break (a
 * comma, a semicolon or a colon, in either script, followed by a space)
 * when there is one in the back half of the room: "...read by touch…" says
 * something whole, "...and a file for…" stops on a word that leads nowhere.
 * Only without such a break is the cut made at the last word.
 */
export function clip(text, room = DESCRIPTION_ROOM) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= room) return clean;

  let end = -1;
  for (const m of clean.matchAll(/[.!?؟](?= |$)/g)) {
    if (m.index + 1 > room) break;
    end = m.index + 1;
  }
  if (end >= room / 2) return clean.slice(0, end);

  const words = clean.slice(0, room - 1);
  const clause = [...words.matchAll(/[,;:،؛](?= )/g)].at(-1)?.index ?? -1;
  if (clause >= room / 2) return `${words.slice(0, clause)}…`;

  const cut = words.lastIndexOf(' ');
  return `${(cut > 0 ? words.slice(0, cut) : words).replace(/[\s,;:،؛]+$/, '')}…`;
}

/** The tagline of a project or the summary of a system, cut to fit. */
export const detailDescription = (d, lang) => clip((d.kind === 'project' ? d.entry.tagline : d.entry.summary)[lang]);

/**
 * A share card is shown wide. A picture much wider or much squarer than this
 * is cropped down the middle by the sites that show it.
 */
const SHARE_RATIO = { min: 1.5, max: 2.25 };

/**
 * A share image is a PNG or a JPEG. Some of the places a link is pasted into
 * do not unfold a WebP file, and a link with no picture is a worse preview
 * than one with the site's own card.
 */
export const isShareable = (path) => /\.(?:png|jpe?g)$/i.test(path ?? '');

/**
 * The picture a detail page is shared with: the project's desktop
 * screenshot, or the workflow canvas when its shape suits a share card.
 * Returns the file with its real size, or null, and the page then falls back
 * to the site's own share card.
 *
 * Only a file a link preview can show is a candidate (`isShareable`). The
 * screenshots and canvases are WebP today, so every detail page is shared
 * with the site's card for now; the rule that prefers a screenshot or a wide
 * canvas is kept for the day one of them exists as a PNG or a JPEG. The
 * `image` of the page's CreativeWork node is not decided here: it stays the
 * real screenshot or canvas, which the page shows.
 *
 * `db.imageSizes` is measured from the files by the loader, so the size
 * announced beside the image is the size of that image.
 */
export function detailImage(db, d) {
  const sized = (path) => {
    const size = isShareable(path) ? db.imageSizes?.[path] : null;
    return size ? { path, width: size[0], height: size[1] } : null;
  };

  const shot = d.kind === 'project' ? sized(d.entry.images?.desktop) : null;
  if (shot) return shot;

  const canvas = sized((d.kind === 'project' ? engineOf(db, d.entry) : d.entry)?.canvas);
  if (canvas && canvas.width >= SHARE_RATIO.min * canvas.height && canvas.width <= SHARE_RATIO.max * canvas.height) return canvas;
  return null;
}

/* ----------------------------------------------------------- neighbours */

/** The other projects in the same group, for the foot of a project page. */
export const relatedProjects = (db, p) => db.projects.filter((x) => x.id !== p.id && x.group === p.group);

/**
 * The other systems built for the same audience, for the foot of a system
 * page. Only those a reader can open: a system with a page of its own, or
 * one shown on its product's page.
 *
 * An entry with `"neighbour": false` is offered beside no other system. It
 * keeps its card on the automation page and its own page, and is reached
 * from there only: the daily job search is a system he built for himself,
 * and a client reading about an inbox or a booking bot is not shown it.
 */
export const relatedSystems = (db, w) =>
  db.workflows.filter(
    (x) => x.id !== w.id && x.neighbour !== false && hasDetail(db, x) && (x.audience ?? []).some((a) => (w.audience ?? []).includes(a)),
  );

/**
 * For the foot of a project page that shows an engine: the systems built for
 * the same audience as that engine which have a page of their own. Without
 * this a system page can be reached from its list page alone.
 *
 * A system shown on another product's page is left out: it has no address
 * of its own, and a card for it here would only lead to that product's page.
 */
export function engineNeighbours(db, p) {
  const engine = engineOf(db, p);
  return engine ? relatedSystems(db, engine).filter((w) => hasOwnPage(db, w)) : [];
}

/* ------------------------------------------------------------ the files */

/**
 * Generated detail pages that no entry stands behind any more.
 *
 * `existing` is what is on disk and `staged` what this build wrote, both as
 * paths from the site root. Only an `.html` file directly inside one of the
 * generated folders can be stale: nothing else is ever a candidate, so the
 * build cannot delete a file it did not write.
 */
export function staleDetailFiles(existing, staged) {
  const wanted = new Set(staged);
  const generated = new RegExp(`^(?:en/)?(?:${DETAIL_FOLDERS.join('|')})/[^/]+\\.html$`);
  return existing.filter((file) => generated.test(file) && !wanted.has(file));
}
