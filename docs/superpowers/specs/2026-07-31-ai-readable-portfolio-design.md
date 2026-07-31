# AI-Readable Bilingual Portfolio — Design

**Date:** 2026-07-31
**Owner:** Nour Aldeen Tofi
**Status:** Approved, ready for planning

---

## 1. Problem

The current portfolio is a single 231-line `chat.html`. It has three defects:

1. **Invisible to AI.** All content is injected at runtime from a JavaScript `NODES`
   object. Fetching the live site (`nouraldeentofi.netlify.app`) as a crawler returns
   exactly one string: `Nour Aldeen Tofi`. Every fact about him is unreadable to
   search engines and language models.
2. **Stale.** It says Riyadh (he is in Al Khobar), claims "~3 years of professional
   frontend work" as the whole identity, and contains zero automation or AI work —
   which is now his primary positioning.
3. **Monolithic.** Markup, styles, conversation data, and engine logic in one file.

## 2. Goal

A bilingual (Arabic/English) static portfolio that a human enjoys and an AI agent can
fully read, query, and cite — with every fact traceable to one source of truth.

**Success criteria**

- Fetching any page as a plain HTTP client returns the complete content as text.
- A `Person` entity links every platform Nour appears on via `sameAs`.
- An AI agent can retrieve his profile without scraping, via `/api/*.json` or MCP.
- Changing a fact requires editing exactly one file.
- Arabic and English pages stay at content parity, enforced automatically.

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Site shape | Multi-page + retained chat page | Maximum crawlable surface; keeps the distinctive artifact |
| Positioning | AI Automation first, Senior Frontend second | Matches LinkedIn headline and newest differentiated work |
| Languages | Bilingual AR + EN, real RTL | Doubles AI-readable text; the site itself proves the Arabic-first RTL skill both CVs claim |
| Stack | Vanilla static HTML/CSS/ES modules | 100% of content in source; no framework to age; deploys as-is |
| AI layer | Single source of truth + generator + MCP server | Prevents fact drift across ~30 locations; MCP demonstrates a claimed skill |
| Product name | **Smart Scanner** | Canonical in both CVs; live at `receipt.nexleadtech.com` |
| Alessa Group | **Omitted** | Not yet public on LinkedIn. Smart Scanner presented as his own product work, no employer named |

## 4. Architecture

### 4.1 Layout

```
new portfolio/
├── index.html  about.html  work.html  projects.html
├── automation.html  chat.html  contact.html  404.html
├── ar/                          # Arabic mirror, dir="rtl", same 8 pages
├── data/                        # SOURCE OF TRUTH — hand-edited
│   ├── profile.json             # identity, contact, sameAs graph
│   ├── experience.json  projects.json  workflows.json
│   ├── credentials.json  testimonials.json  skills.json
│   └── copy/ en.json  ar.json   # all prose, both languages
├── api/                         # GENERATED — machine-readable, CORS-open
│   └── profile.json  projects.json  resume.json
├── mcp/  server.js  tools.js  package.json  README.md
├── scripts/
│   ├── build.mjs  validate.mjs
│   └── lib/ jsonld.mjs  llms.mjs  sitemap.mjs  render.mjs
├── assets/
│   ├── css/ tokens.css base.css layout.css components.css chat.css rtl.css
│   ├── js/  main.js  chat/{engine,script.en,script.ar,live}.js
│   ├── cv/  Nour_Aldeen_Tofi.pdf  Nour_Aldeen_Tofi_Automation.pdf
│   └── img/
├── llms.txt  llms-full.txt  robots.txt  sitemap.xml  humans.txt
├── _headers  _redirects
└── README.md  CLAUDE.md
```

### 4.2 Source of truth and generation

The site requires **no build to view or deploy**. Netlify serves files directly.

A generator exists only to prevent fact drift. Pages are hand-authored HTML; repeating
lists sit between markers:

```html
<!-- @gen:projects -->
  ...generated cards...
<!-- /@gen:projects -->
```

`node scripts/build.mjs` rewrites **only** the span between markers, leaving all
hand-written prose and layout untouched. It also regenerates JSON-LD blocks, `llms.txt`,
`llms-full.txt`, `sitemap.xml`, and `api/*.json`. All output is committed.

Consequence: a fact is edited once in `data/`, one command propagates it everywhere.

### 4.3 Module boundaries

Each unit has one purpose and a stated interface.

| Unit | Purpose | Depends on |
|---|---|---|
| `data/*.json` | Hold facts. No logic. | nothing |
| `scripts/lib/jsonld.mjs` | `data → JSON-LD strings` | data shape |
| `scripts/lib/llms.mjs` | `data → llms.txt, llms-full.txt` | data shape |
| `scripts/lib/sitemap.mjs` | `pages → sitemap.xml` | page list |
| `scripts/lib/render.mjs` | `(html, marker, content) → html` | nothing |
| `scripts/build.mjs` | Orchestrate the above; write files | all lib modules |
| `scripts/validate.mjs` | Assert correctness; exit non-zero on failure | data + built output |
| `assets/js/chat/engine.js` | Render a conversation graph | a script object |
| `assets/js/chat/script.{en,ar}.js` | Conversation content | nothing |
| `assets/js/chat/live.js` | Optional n8n webhook adapter | engine interface |
| `mcp/tools.js` | Pure query functions over `data/` | data shape |
| `mcp/server.js` | MCP protocol wiring | tools.js |

`engine.js` knows nothing about Nour; `script.*.js` knows nothing about rendering.
`tools.js` is pure and unit-testable without a running MCP server.

## 5. The AI-visibility layer

Four stacked mechanisms.

### ① Content in the HTML

Every fact ships as text in the served document. This alone fixes the root defect.

### ② Structured data (JSON-LD)

| Page | Types |
|---|---|
| all | `Person`, `WebSite`, `BreadcrumbList` |
| index | `ProfilePage` + full `Person` (`sameAs`, `knowsAbout`, `hasCredential`, `alumniOf`, `worksFor`, `knowsLanguage`, `address`) |
| about | `AboutPage`, `FAQPage` |
| work | `ItemList` of roles, `Review` per recommendation |
| projects | `ItemList` of `SoftwareApplication` / `WebApplication` |
| automation | `ItemList` of `CreativeWork` |
| contact | `ContactPage` |

The `sameAs` array is the mechanism that resolves scattered accounts into one entity:
LinkedIn, GitHub, `receipt.nexleadtech.com`, the GoldenTag Play Store listing, this
site, and (pending confirmation) the FIDE profile.

### ③ Agent-native files

- `llms.txt` — indexed map of the site for language models
- `llms-full.txt` — the entire profile as one clean markdown document
- `robots.txt` — explicitly **allows** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot,
  Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended,
  CCBot, meta-externalagent, Amazonbot, cohere-ai. Most sites block these by accident.
- `_headers` — `Access-Control-Allow-Origin: *` on `/api/*` so any agent can fetch
  cross-origin

### ④ MCP server

Tools: `get_profile`, `search_projects`, `get_experience`, `get_workflows`,
`get_credentials`, `get_testimonials`. Reads `data/*.json` directly. Single dependency
(`@modelcontextprotocol/sdk`). `mcp/README.md` carries the `claude_desktop_config.json`
snippet, so a recruiter can install Nour as a queryable tool.

## 6. Content plan

Automation-first ordering throughout.

| Page | Contents |
|---|---|
| **Home** | Headline, positioning paragraph, proof strip (5+ production automations · 494 automated tests · 70+ fields extracted · 75% AI cost reduction · promoted in 12 months), Smart Scanner feature, automation cards, frontend cards, testimonial pull-quote |
| **About** | Narrative; working principles drawn from his own posts (API contracts before code, precision over speed, cost-aware model routing); education; ICPC; languages; hobbies; FAQ |
| **Work** | Timeline — DFS Supervisor (Jan 2026→), DFS Frontend/Coordinator (Jan 2025–Jan 2026), NexLead (Mar 2025→), Khwarizm (Sep 2024–Apr 2025), Minicodeleader (Jun 2023–Feb 2024), Kalamoon (2019–2024), ICPC/ACPC 2021 — plus all four recommendations in full |
| **Projects** | Smart Scanner (deep case study), DFS Dashboard, GoldenTag, Business Card Extractor, MCP server demo |
| **Automation Lab** | Teacher Assistant AI Bot, Smart Lead Finder, AI Job-Match Pipeline, Lesson Quality Evaluator, CRM Lead Cleaner, Smart Scanner pipeline, and the IF-node cost-routing case study |
| **Chat** | Rewritten with correct facts; engine split from script; bilingual; static fallback so crawlers read the conversation |
| **Contact** | Email, phone, LinkedIn, GitHub, availability, both CVs, MCP install snippet |

### Canonical facts

- Nour Aldeen Tofi — Al Khobar, Eastern Province, Saudi Arabia
- `nouraldeentofi@gmail.com` · +966 54 797 2944
- `linkedin.com/in/nour-aldeen-tofi-19b116240` · `nouraldeentofi.netlify.app`
- B.Eng Information Technology, University of Kalamoon, Sep 2019 – Aug 2024
- Arabic (native), English (professional working proficiency)
- 13 certifications with credential IDs (Meta, Google ×2, IBM ×2, Packt, Scrimba ×2,
  Coursera ×4, ICPC/ACPC)
- 4 recommendations: George Drouj, Hamza Shansho, Tawheed Malkat, Haitham Zedan

Where the CVs and LinkedIn disagree, the CVs win — they are more recent. The chat
file's "Riyadh" is wrong and is corrected to Al Khobar throughout.

## 7. Design language

The existing dark ground with lime/mint accent is retained and promoted into a token
system (`tokens.css`), plus a light mode. RTL is achieved primarily through CSS logical
properties, so `rtl.css` stays small.

Because "Web Accessibility" appears on the CV, the site must meet it: skip links, real
focus states, AA contrast in both themes, and the existing `prefers-reduced-motion`
handling preserved.

## 8. Correctness

`node scripts/validate.mjs` asserts, exiting non-zero on any failure:

1. Every JSON-LD block parses and carries its required fields.
2. Every internal link resolves to a file that exists.
3. Every `sameAs` and external URL is well-formed.
4. Arabic and English pages are at content parity (same sections, same item counts).
5. No `TODO` marker remains in shipped output.
6. Every `data/` file matches its expected shape.

**Runtime error handling.** The chat falls back to the menu node when a node id is
missing, and falls back to the scripted script if live mode is enabled and the webhook
fails or times out. The generator fails loudly naming the offending file and key rather
than writing partial output. MCP tools validate inputs and return structured errors.

**Testing.** `mcp/tools.js` is pure and gets unit tests. `scripts/lib/*.mjs` are pure
transforms and get unit tests. All tests run on Node's built-in runner (`node --test`),
so the site itself still needs no package manager. `validate.mjs` covers the integration
surface. Manual check: load both language trees in a browser, confirm RTL, and confirm
crawler visibility by asserting key facts appear in raw HTML.

## 9. Open items

Three facts are unavailable at design time. Each is wired through `data/profile.json`
as an explicit `null` flagged `TODO`, reported by `validate.mjs` on every run, so
nothing ships as a dead link and filling one in is a one-line edit:

1. **GitHub URL** — not supplied; not discoverable by search.
2. **n8n workflows** — the `claude.ai n8n` connector requires OAuth (`/mcp`). The
   Automation Lab is built from CV data and will be enriched once available.
3. **FIDE profile** — `ratings.fide.com/profile/7618166` matches his name and the chess
   theme, but is unconfirmed. Excluded from `sameAs` until confirmed.

## 10. Explicit non-goals

- No framework, bundler, or package manager for the site itself.
- No server, database, or analytics.
- No live LLM-backed chat in this phase. `assets/js/chat/live.js` ships as a documented,
  disabled adapter so it can be switched on later without restructuring.
- No changes to his LinkedIn, GitHub, or other external profiles. This site is the hub
  they point to.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Arabic copy reads as translated rather than native | Nour proofreads before deploy; flagged as a required review gate |
| Generated blocks overwritten by hand-edits | Markers are explicit and documented in `CLAUDE.md`; `validate.mjs` detects drift |
| Facts in prose drift from `data/` | Prose is deliberately kept free of numbers; all figures live inside generated blocks |
| Missing GitHub/n8n data weakens the Automation Lab | Page is built to absorb them additively; no restructuring needed |
