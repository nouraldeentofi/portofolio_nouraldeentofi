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
data/*.json ──► scripts/build.mjs ──► *.html, ar/*.html
                                      llms.txt, llms-full.txt
                                      sitemap.xml, api/*.json
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
| `npm test` | Run the unit tests (58 of them) |
| `npm run check` | All three, in order |

---

## Editing content

**Never edit the `.html` files.** They are generated and your changes will be
overwritten on the next build. Edit these instead:

| To change… | Edit |
|---|---|
| Name, contact, links, availability | `data/profile.json` |
| Jobs and responsibilities | `data/experience.json` |
| Products and applications | `data/projects.json` |
| n8n automations | `data/workflows.json` |
| Certificates, education, awards | `data/credentials.json` |
| Recommendations | `data/testimonials.json` |
| Skill groups | `data/skills.json` |
| All prose, both languages | `data/copy/en.json`, `data/copy/ar.json` |
| The chat conversation | `assets/js/chat/script.en.js`, `script.ar.js` |
| Colours, spacing, fonts | `assets/css/tokens.css` |

Then: `npm run build && npm run validate`.

---

## Why it is built this way

The previous version of this portfolio put all of its content in a JavaScript object and
rendered it at runtime. Fetching the live site as a crawler returned exactly one string:
the name. Everything else was invisible to search engines and language models.

This version fixes that with four stacked layers:

1. **Content is in the HTML.** Nothing user-facing is injected by JavaScript.
2. **An identity graph.** A `Person` JSON-LD block whose `sameAs` array links every
   platform, which is how search engines and LLMs decide that scattered accounts are one
   person. Plus `SoftwareApplication`, `EducationalOccupationalCredential` (with real
   credential IDs), `Review`, `FAQPage`, and `BreadcrumbList`.
3. **Agent-native files.** `llms.txt`, `llms-full.txt`, a CORS-open JSON API including a
   [JSON Resume](https://jsonresume.org)–standard `resume.json`, and a `robots.txt` that
   explicitly *allows* GPTBot, ClaudeBot, PerplexityBot, Google-Extended and friends —
   which most sites block by accident.
4. **An MCP server.** See [`mcp/README.md`](mcp/README.md). An AI assistant can query
   this profile as tools instead of scraping it.

---

## Deploying

It is a static site, so any host works. For Netlify, connect the repository and use:

- **Build command:** `npm run build`
- **Publish directory:** `.`

`_headers` and `_redirects` are already configured for Netlify — CORS on `/api/*`,
caching, and shortcuts like `/cv` and `/resume`.

If your host has no build step at all, that is fine too: the generated files are
committed, so the repository can be served as-is.

---

## Still outstanding

`npm run validate` reports these as warnings on every run, by design:

- **GitHub URL** — set `data/profile.json` → `sameAs` → GitHub → `url`. This is the most
  valuable missing edge in the identity graph.
- **FIDE profile** — confirm it belongs to Nour, then fill in the same way.
- **Portrait** — add `assets/img/nour.jpg` and set `profile.image` to that path. Until
  then `Person.image` and the social preview are correctly omitted rather than broken.

Each is a one-line edit followed by `npm run build`.
