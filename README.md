# Nour Aldeen Tofi — portfolio

A bilingual (Arabic/English) static portfolio built so that **people and AI agents can both read all of it**.

Every fact lives in one place (`data/`). A small Node script regenerates the pages, the
structured data, the agent files, and the public JSON API from it. The site itself has
**zero runtime dependencies** — no framework, no bundler, no JavaScript required to read
a single word.

---

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer. Nothing else — there is no
`npm install` step, because the site has no dependencies.

```bash
# 1. build the site from data/
npm run build

# 2. check nothing is broken
npm run validate

# 3. serve it locally
npx serve .
```

Then open the URL it prints (usually <http://localhost:3000>).

**Prefer no download at all?** Any static server works:

```bash
python -m http.server 8000      # then open http://localhost:8000
```

**Do not just double-click `index.html`.** Opening it as a `file://` URL breaks ES
modules and absolute paths, so the theme toggle and chat will not run. Use a server.

### Everything at once

```bash
npm run check    # test → build → validate
```

---

## How it fits together

```
data/*.json ──► scripts/build.mjs ──► *.html, en/*.html
                                      projects/<id>.html, automation/<id>.html
                                      llms.txt, llms-full.txt
                                      sitemap.xml, api/*.json
                                      scripts/lastmod.json (page dates)
                     │
                     └─ scripts/validate.mjs  (the gate)

data/*.json ──► mcp/server.js  ──► AI assistants, over stdio
```

**Change a fact once, and it propagates everywhere.** Edit `data/`, run `npm run build`,
and the pages, JSON-LD, `llms.txt`, résumé, and MCP server all update together. This is
the whole point of the architecture — there is no second place to remember.

| Command | What it does |
|---|---|
| `npm run build` | Regenerate every page and artefact from `data/` |
| `npm run validate` | Check JSON-LD, links, AR/EN parity, accessibility basics |
| `npm test` | Run the unit tests |
| `npm run check` | All three, in order |
| `npm run sites` | Copy every hosted client site and app from its own repository (`data/hosting.json`) |
| `npm run cv` | Print the CV from `scripts/cv/cv.html` to the PDF |
| `npm run og` | Photograph the share card from `scripts/og/og.html` to `assets/img/og.png` |

---

## Editing content

**Never edit the `.html` files**, including everything in `projects/`, `automation/`,
`en/projects/` and `en/automation/`. They are generated and your changes will be
overwritten on the next build. Edit these instead:

| To change… | Edit |
|---|---|
| Name, contact, links, availability | `data/profile.json` |
| Jobs and responsibilities | `data/experience.json` |
| Products and applications | `data/projects.json` |
| n8n automation systems (status, diagram, canvas) | `data/workflows.json` |
| Client websites and the design lab | `data/showcase.json` |
| Certificates, education, awards | `data/credentials.json` |
| Recommendations | `data/testimonials.json` |
| Skill groups | `data/skills.json` |
| All prose, both languages | `data/copy/en.json`, `data/copy/ar.json` |
| The chat conversation | `assets/js/chat/script.en.js`, `script.ar.js` |
| Colours, spacing, fonts | `assets/css/tokens.css` |

Then: `npm run build && npm run validate`.

### The share card

The picture a link to the site unfolds into (`assets/img/og.png`, 1200 by 630) is built
the way the CV is: `scripts/og/og.html` is the card as a page, in the site's own colours
and fonts, and `npm run og` fills its words from `data/profile.json` and photographs it
with headless Chrome or Edge. Change the layout in the HTML, the words in the data, and
run it again, then `npm run check`. Never edit or re-export the PNG by hand, and keep its
file name.

### Dates

- The sitemap gives every page a `<lastmod>`: the day what the page says last changed,
  not the day of the build. The build hashes the title, description, main content and
  structured data of each page, compares with `scripts/lastmod.json`, and gives today's
  date only to a page whose hash is new. Commit that file with the pages; never edit it.
- `updated` in `data/profile.json` is the date on the home page's ProfilePage. Set it by
  hand when his name, title, links, portrait or location change.
- A build on another day from unchanged data writes the same files, byte for byte.

### Images

A picture under `assets/img/` is linked by its bare address everywhere: in the page, in
`og:image` and in the structured data. Images carry **no `?v=` fingerprint** (stylesheets,
scripts and the CV still do), so a search engine sees one address per picture; `_headers`
has browsers revalidate `/assets/img/*` instead, so a re-shot screenshot still shows at
once. Alt text says what the picture shows.

### A page for each project and system

Every project gets a page of its own at `/projects/<id>`, and every automation system
that has both a curated `flow` and a `canvas` screenshot gets one at `/automation/<id>`
(Arabic at the root, English under `/en/`). To add one, add the entry to
`data/projects.json` or `data/workflows.json` and build: the page, its links from the
list page and the home page, the sitemap entry and the line in `llms.txt` all follow.
Remove the entry and the next build deletes its page.

Two optional fields shape the page:

- `headline` (`{ "en", "ar" }`): one line that says what the thing is in the words
  people search for. It is the line under the heading and the second half of the page
  title. It may say no more than the rest of the entry does, and it leaves out what the
  name already says: the title `<name>: <headline>` is held to eighty characters, and to
  seventy unless the name alone is long.
- `workflow` on a project: the id of the n8n workflow that is its engine. That workflow
  is then shown in full on the project's page ("The automation behind it") and gets no
  page of its own; its card on the automation page leads to the project.

The card of a project on `/projects` is a summary (what it is, his role, the figures, the
stack). The problem, what he built and the context are told on its own page only, so the
list does not repeat its detail pages. A detail page is shared with a picture only when
there is a PNG or a JPEG to share: the screenshots and canvases are WebP, which some
link previews do not show, so for now every detail page names the site's share card.

---

## Why it is built this way

The previous version of this portfolio put all of its content in a JavaScript object and
rendered it at runtime. Fetching the live site as a crawler returned exactly one string:
the name. Everything else was invisible to search engines and language models.

This version fixes that with four stacked layers:

1. **Content is in the HTML.** Nothing user-facing is injected by JavaScript.
2. **An identity graph.** A `Person` JSON-LD block whose `sameAs` array links every
   platform, which is how search engines and LLMs decide that scattered accounts are one
   person. Plus `CreativeWork` for each project and system, `EducationalOccupationalCredential`
   (with real credential IDs), `Quotation`, `FAQPage`, and `BreadcrumbList`. Each page's
   markup says only what that page shows: the Person node is slim everywhere, and the
   phone number, the certificates and the skills ride only on the page that prints them.
3. **Agent-native files.** `llms.txt`, `llms-full.txt`, a CORS-open JSON API including a
   [JSON Resume](https://jsonresume.org)–standard `resume.json`, and a `robots.txt` that
   explicitly *allows* GPTBot, ClaudeBot, PerplexityBot, Google-Extended and friends —
   which most sites block by accident.
4. **An MCP server.** See [`mcp/README.md`](mcp/README.md). An AI assistant can query
   this profile as tools instead of scraping it.

---

## Deploying

It is a static site, so any host works. `nouraldeentofi.com` is served by **Cloudflare
Pages**, which deploys this repository on every push to `main` (it works with a private
repository too). `_headers` and `_redirects` take effect there as written.

Cloudflare Pages publishes the whole repository, not a build folder, so anything
committed here is public unless a rule closes it. `_redirects` therefore opens with
rules that send the internal files to the home page: `/CLAUDE.md`, `/README.md`,
`/package.json`, the git dotfiles, and everything under `/docs/`, `/tests/`,
`/scripts/` and `/data/`. `/mcp/` stays public, because `robots.txt` and `llms.txt`
hand out `/mcp/README.md`. When you add a top-level file or folder that is not part of
the site, add it to `PRIVATE_PATHS` in `scripts/lib/gates.mjs` and to `_redirects`:
`npm run validate` fails if a listed rule is missing, and a test fails on anything tracked
at the root that is neither listed there nor part of the site.

Two modules under `scripts/lib/` are worth knowing before you touch a page:
`offers.mjs` ties each thing he offers to the page or the systems it leads to, and
`gates.mjs` holds the checks `validate` runs on the files written by hand (`_redirects`,
`_headers`, `robots.txt`, `humans.txt`, `mcp/README.md`) and on what the build writes
(relative addresses, the canonical and robots meta of each page, the sitemap and
`scripts/lastmod.json`). The misspelling of his family name that
people type lives only in `nameMisspellings` in `data/profile.json` and ships only as an
`alternateName` in the structured data; `gates.mjs` fails the build if it shows anywhere
a reader looks.

In every page's head, `hreflang="x-default"` names the **English** version, as it does in
the sitemap; the root address still serves Arabic. A page meant for search carries one
robots meta that allows a large image preview. The 404 pages carry `noindex, follow` and
name no address as their own.

`_headers` sends `X-Robots-Tag: noindex` on the `pages.dev` address only, which serves
a full copy of the site, and a canonical `Link` header with the CV so its fingerprinted
links all count as one document. `validate` fails if a noindex rule is ever written for
anything but a `pages.dev` host, or if the canonical stops matching `data/profile.json`.

#### One setting in Cloudflare: Browser Cache TTL

`_headers` also says how long a browser may keep each kind of file: a week for the
stylesheets, which are fingerprinted, and no time at all for pictures, scripts and the CV
(`Cache-Control: public, max-age=0, must-revalidate`), which keep their address when they
change. Those rules reach a visitor only while the Cloudflare zone lets the site's own
headers stand. This is set once, by the owner, in the Cloudflare dashboard for
`nouraldeentofi.com`:

**Caching, Configuration, Browser Cache TTL: Respect Existing Headers.**

With any other value Cloudflare replaces `Cache-Control` with its own time (four hours by
default). That mattered little while every picture carried a `?v=` fingerprint. It matters
now: a re-shot screenshot keeps its address, so a returning visitor can be shown the old
one for those four hours, and the modules `main.js` imports by bare address can lag a new
`main.js` by as long.

Two checks, after the setting is saved and after any change to the caching rules:

```bash
curl -sI https://nouraldeentofi.com/assets/img/nour.jpg | grep -i cache-control
curl -sI https://nouraldeentofi.com/assets/js/main.js   | grep -i cache-control
```

Both must answer `cache-control: public, max-age=0, must-revalidate`. An answer of
`max-age=14400` means the zone is still overriding the header.

There is no build step on the host, so **the generated files must be committed**. Run
`npm run check` and commit the result — pushing the source alone deploys nothing.

After a push has deployed, `npm run indexnow` tells Bing, Yandex, Naver and Seznam that
the pages changed (IndexNow, no account needed). The key lives in `data/profile.json`
and the build writes it to `<key>.txt` at the site root, which is how the engines check
that the site owns it. Google does not use IndexNow; it reads `sitemap.xml`.

### Client sites and apps on the domain

Every client site, the design gallery and the browser apps are served from this
repository too, at `/sites/<name>/`, `/gallery/`, `/motion-studio/` and `/umrah-guide/`.
`data/hosting.json` maps each one to its own repository and deploy branch;
`npm run sites` copies them in, leaves out working files (READMEs, briefs, build
scripts, tests) and moves every `github.io` address to `nouraldeentofi.com`. Those
repositories can stay private: the script reads them through the signed-in `gh` CLI.
To update one site, change it in its own repository, then `npm run sites -- <repo>`
and commit. `npm run validate` fails if any page still links to `github.io`.

Every entry in `data/hosting.json` also says whether search engines may list the copy.
`index` is required, and loading the data fails without it:

| `index` | Meaning | What the sync writes |
|---|---|---|
| `true` | The copy is meant to be found at this address | Nothing over the client's own robots tags; a self canonical on the entry page if it has none |
| `false` | A sample, linked from the showcase only | One `noindex, follow` robots meta on every page |
| `"root-only"` | Only the entry page is meant to be found (the gallery) | `noindex, follow` on every page except the entry page |

Set `true` only when the client wants to be found on Google at this address; a `todo`
beside the value records a confirmation that is still open. The main `sitemap.xml` lists
the entry address of every copy that is not `false`.

The sync changes what a crawler reads and nothing a visitor reads. Besides the decision
above, for every copy it:

- gives canonicals, hreflang links, `og:url`, JSON-LD addresses and nested sitemaps the
  clean address the host serves (`/about`, never `/about.html`); links in the body are
  left as their owner wrote them;
- moves links to a former host of the portfolio (`formerHosts` in `data/hosting.json`)
  to the domain;
- removes rating markup (`aggregateRating`, `review`) from JSON-LD, because a rating
  copied from another site must not be marked up here; the words on the page stay;
- leaves behind a top-level `test` folder and every nested `robots.txt` (only the one at
  the root of the domain is read). A copy keeps its own `404.html`: the host serves the
  nearest one.

A repository that cannot be cloned is tried three times; its copy then stays as it was,
the others are still synced, and the run ends with an error naming it. `npm run validate`
holds every copy to all of the above, so a hand edit or a stale copy fails there.

The shortcuts `/cv` (and the legacy `/cv/auto`, which now points to the same single CV), `/resume` and `/profile` are real generated files
(`cv/index.html` and friends), each a noindex page that redirects to its target. On
Cloudflare Pages the `_redirects` rules answer first (`/resume` and `/profile` with a 301,
with and without the closing slash), except for the CV: a rule could only
name the bare PDF, which the CDN would keep serving for a day after a new one ships, so
`_redirects` leaves `/cv` and `/cv/auto` to the generated pages, which link to the
fingerprinted PDF. To replace the CV, overwrite `assets/cv/Nour_Aldeen_Tofi.pdf`, run
`npm run check` and push: every link changes with the file. The generated files also keep
the shortcuts working on a host that ignores `_headers` and `_redirects`, such as GitHub
Pages. Netlify reads both files as written too (build command `npm run build`, publish
directory `.`).

---

## Still outstanding

`npm run validate` reports these as warnings on every run, by design:

- **FIDE profile** — confirm it belongs to Nour, then fill in the same way.

It is a one-line edit followed by `npm run build`.
