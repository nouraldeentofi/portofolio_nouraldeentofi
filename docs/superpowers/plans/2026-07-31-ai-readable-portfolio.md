# AI-Readable Bilingual Portfolio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace a single JS-rendered `chat.html` with a bilingual static portfolio whose every fact lives in one data layer and is readable by humans, crawlers, and AI agents.

**Architecture:** `data/*.json` is the single source of truth. Pure transform modules under `scripts/lib/` turn that data into JSON-LD, `llms.txt`, `sitemap.xml`, and `api/*.json`. `scripts/build.mjs` injects generated blocks into hand-authored HTML between `<!-- @gen:name -->` markers, so prose stays hand-written while every list and figure stays in sync. `scripts/validate.mjs` is the gate. `mcp/` exposes the same data as MCP tools.

**Tech Stack:** Vanilla HTML5, CSS (custom properties + logical properties), ES modules. Node ≥ 20 for the generator and tests (`node --test`, zero dependencies). `@modelcontextprotocol/sdk` is the only dependency, and only inside `mcp/`.

## Global Constraints

- The site must require **no build step to view or deploy**. Generated output is committed.
- **100% of content must be present in served HTML.** Nothing user-facing may be injected at runtime by JavaScript.
- Every fact appears in `data/` exactly once. Hand-written prose must contain **no figures** — all numbers live inside `@gen` blocks.
- Bilingual: English at root, Arabic under `ar/` with `dir="rtl"` and `lang="ar"`. Content parity is enforced by `validate.mjs`.
- Product name is **Smart Scanner** (never "Receipt Scanner").
- **Alessa Group must not appear anywhere.** Smart Scanner is presented as Nour's own product work with no employer named.
- Location is **Al Khobar, Eastern Province, Saudi Arabia** — never Riyadh, except for the Khwarizm Technologies role, which was Riyadh-remote.
- RTL is achieved with CSS logical properties (`margin-inline`, `padding-block`, `inset-inline`) — never physical `left`/`right`.
- Accessibility is a hard requirement: skip link, visible focus states, AA contrast in both themes, `prefers-reduced-motion` honoured.
- Unknown facts are `null` in `data/` with a sibling `"todo"` string. They must never render as a link.
- Node's built-in test runner only. No test framework, no bundler, no CSS preprocessor.

---

## File Structure

| File | Responsibility |
|---|---|
| `data/profile.json` | Identity, contact, `sameAs` graph, availability, CV links |
| `data/experience.json` | Employment history, newest first |
| `data/projects.json` | Product/app work (Smart Scanner, DFS Dashboard, GoldenTag, …) |
| `data/workflows.json` | n8n automations for the Automation Lab |
| `data/credentials.json` | 13 certifications with issuer and credential ID |
| `data/testimonials.json` | 4 LinkedIn recommendations |
| `data/skills.json` | Skills grouped by category |
| `data/copy/en.json`, `data/copy/ar.json` | All prose: page intros, principles, FAQ, UI strings |
| `scripts/lib/render.mjs` | `injectBlock(html, name, content)` — marker rewriting only |
| `scripts/lib/jsonld.mjs` | data → schema.org objects |
| `scripts/lib/llms.mjs` | data → `llms.txt`, `llms-full.txt` |
| `scripts/lib/sitemap.mjs` | page list → `sitemap.xml` |
| `scripts/lib/load.mjs` | Read and shape-check every `data/` file once |
| `scripts/build.mjs` | Orchestrate: load → render → write |
| `scripts/validate.mjs` | Assert correctness, exit non-zero on failure |
| `mcp/tools.js` | Pure query functions over the dataset |
| `mcp/server.js` | MCP protocol wiring only |
| `assets/js/chat/engine.js` | Render a conversation graph; knows nothing about Nour |
| `assets/js/chat/script.en.js`, `script.ar.js` | Conversation content; knows nothing about rendering |
| `assets/js/chat/live.js` | Disabled n8n webhook adapter |
| `assets/css/tokens.css` | Colour, type, spacing custom properties + light mode |
| `assets/css/base.css` | Reset, typography, focus, skip link |
| `assets/css/layout.css` | Header, footer, grid, containers |
| `assets/css/components.css` | Cards, badges, timeline, proof strip, quotes |
| `assets/css/chat.css` | Chat page only |
| `assets/css/rtl.css` | The few rules logical properties cannot cover |

---

## Phase 1 — Data layer

### Task 1: Repo scaffold and profile data

**Files:**
- Create: `.gitignore`, `data/profile.json`, `scripts/lib/load.mjs`
- Test: `tests/load.test.mjs`

**Interfaces:**
- Produces: `loadDb(dir = 'data') → { profile, experience, projects, workflows, credentials, testimonials, skills, copy: { en, ar } }`. Throws `Error` naming the file and missing key on any shape violation. In Task 1 it loads `profile` only; later tasks extend it.

- [ ] **Step 1: Initialise version control**

```bash
git init
printf 'node_modules/\n.DS_Store\n*.log\n' > .gitignore
```

- [ ] **Step 2: Write the failing test**

```js
// tests/load.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';

test('loads profile with required identity fields', () => {
  const db = loadDb('data');
  assert.equal(db.profile.email, 'nouraldeentofi@gmail.com');
  assert.equal(db.profile.location.countryCode, 'SA');
  assert.equal(db.profile.location.city.en, 'Al Khobar');
});

test('sameAs entries are either a valid url or an explicit null with a todo', () => {
  const db = loadDb('data');
  assert.ok(db.profile.sameAs.length > 0);
  for (const entry of db.profile.sameAs) {
    if (entry.url === null) {
      assert.equal(typeof entry.todo, 'string', `${entry.platform} null url needs a todo`);
    } else {
      assert.doesNotThrow(() => new URL(entry.url), `${entry.platform} url is malformed`);
    }
  }
});

test('throws a named error when a required key is missing', () => {
  assert.throws(() => loadDb('tests/fixtures/broken'), /profile\.json.*email/);
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `node --test tests/load.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/lib/load.mjs'`

- [ ] **Step 4: Write `data/profile.json`**

```json
{
  "name": { "en": "Nour Aldeen Tofi", "ar": "نور الدين توفي" },
  "headline": {
    "en": "AI Automation Engineer — n8n, LLM Agents, MCP · Senior Frontend Developer",
    "ar": "مهندس أتمتة بالذكاء الاصطناعي — n8n ووكلاء LLM وMCP · مطوّر واجهات أمامية أول"
  },
  "location": {
    "city": { "en": "Al Khobar", "ar": "الخبر" },
    "region": { "en": "Eastern Province", "ar": "المنطقة الشرقية" },
    "country": { "en": "Saudi Arabia", "ar": "المملكة العربية السعودية" },
    "countryCode": "SA"
  },
  "email": "nouraldeentofi@gmail.com",
  "phone": "+966547972944",
  "site": "https://nouraldeentofi.netlify.app",
  "languages": [
    { "code": "ar", "name": { "en": "Arabic", "ar": "العربية" }, "level": { "en": "Native", "ar": "اللغة الأم" } },
    { "code": "en", "name": { "en": "English", "ar": "الإنجليزية" }, "level": { "en": "Professional working proficiency", "ar": "إجادة مهنية" } }
  ],
  "sameAs": [
    { "platform": "LinkedIn", "url": "https://www.linkedin.com/in/nour-aldeen-tofi-19b116240" },
    { "platform": "Portfolio", "url": "https://nouraldeentofi.netlify.app" },
    { "platform": "Smart Scanner", "url": "https://receipt.nexleadtech.com" },
    { "platform": "Google Play", "url": "https://play.google.com/store/apps/details?id=com.leadbridge.golden_tag" },
    { "platform": "GitHub", "url": null, "todo": "Awaiting GitHub URL from Nour" },
    { "platform": "FIDE", "url": null, "todo": "Confirm ratings.fide.com/profile/7618166 belongs to Nour before publishing" }
  ],
  "availability": {
    "openToWork": true,
    "arrangements": { "en": ["On-site", "Hybrid", "Remote"], "ar": ["في الموقع", "هجين", "عن بُعد"] }
  },
  "cv": [
    { "id": "automation", "file": "assets/cv/Nour_Aldeen_Tofi_Automation.pdf", "label": { "en": "Automation CV", "ar": "السيرة الذاتية — الأتمتة" } },
    { "id": "engineering", "file": "assets/cv/Nour_Aldeen_Tofi.pdf", "label": { "en": "Engineering CV", "ar": "السيرة الذاتية — الهندسة" } }
  ]
}
```

- [ ] **Step 5: Write `scripts/lib/load.mjs`**

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(dir, name) {
  const path = join(dir, name);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${name}: could not read or parse — ${err.message}`);
  }
}

function requireKeys(obj, keys, file) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], obj);
    if (value === undefined) throw new Error(`${file}: missing required key "${key}"`);
  }
}

export function loadDb(dir = 'data') {
  const profile = readJson(dir, 'profile.json');
  requireKeys(profile, ['name.en', 'headline.en', 'email', 'phone', 'site',
    'location.countryCode', 'location.city.en', 'sameAs'], 'profile.json');
  return { profile };
}
```

- [ ] **Step 6: Create the broken fixture**

```bash
mkdir -p tests/fixtures/broken
printf '{"name":{"en":"x"},"headline":{"en":"x"},"site":"https://x.dev","phone":"+1","location":{"countryCode":"SA","city":{"en":"x"}},"sameAs":[]}' > tests/fixtures/broken/profile.json
```

- [ ] **Step 7: Run tests and confirm they pass**

Run: `node --test tests/`
Expected: PASS, 3 tests

- [ ] **Step 8: Copy the CVs into the repo**

```bash
mkdir -p assets/cv
cp "/c/Users/LEGION/Downloads/Nour_Aldeen_Tofi.pdf" assets/cv/
cp "/c/Users/LEGION/Downloads/Nour_Aldeen_Tofi_Automation.pdf" assets/cv/
```

- [ ] **Step 9: Commit**

```bash
git add .gitignore data scripts tests assets/cv docs
git commit -m "feat(data): add profile source of truth and shape-checked loader"
```

---

### Task 2: Experience, projects, and workflow data

**Files:**
- Create: `data/experience.json`, `data/projects.json`, `data/workflows.json`
- Modify: `scripts/lib/load.mjs`
- Test: `tests/load.test.mjs`

**Interfaces:**
- Produces: `db.experience` (array, newest first, each `{ id, role:{en,ar}, company, location:{en,ar}, start, end|null, current, bullets:{en:[],ar:[]}, stack:[] }`), `db.projects` (each `{ id, name, tagline:{en,ar}, year, role:{en,ar}, problem:{en,ar}, built:{en,ar}, stack:[], metrics:[{label:{en,ar},value}], url|null, featured:bool }`), `db.workflows` (each `{ id, name:{en,ar}, year, summary:{en,ar}, trigger, services:[], outcome:{en,ar} }`).
- Dates are ISO `YYYY-MM`. `end: null` means current.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/load.test.mjs
test('experience is newest-first and never mentions Alessa', () => {
  const db = loadDb('data');
  const dates = db.experience.map(e => e.start);
  assert.deepEqual([...dates].sort().reverse(), dates, 'experience must be newest first');
  const blob = JSON.stringify(db).toLowerCase();
  assert.ok(!blob.includes('alessa'), 'Alessa Group must not appear in any data file');
});

test('the flagship product is named Smart Scanner everywhere', () => {
  const db = loadDb('data');
  const blob = JSON.stringify(db);
  assert.ok(blob.includes('Smart Scanner'));
  assert.ok(!blob.includes('Receipt Scanner'), 'use Smart Scanner, never Receipt Scanner');
});

test('every project and workflow carries both languages', () => {
  const db = loadDb('data');
  for (const item of [...db.projects, ...db.workflows]) {
    assert.equal(typeof item.summary?.ar ?? item.tagline?.ar, 'string', `${item.id} missing Arabic`);
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/`
Expected: FAIL — `db.experience is not iterable`

- [ ] **Step 3: Write `data/experience.json`**

Six entries, newest first. Content is transcribed from the engineering CV verbatim in
English and translated to Arabic:

1. `dfs-supervisor` — Software Engineering Supervisor, Distinctive Frontier Co. for Safety Equipment L.L.C, Al Khobar, `2026-01` → null. Bullets: lead frontend across internal business platforms in Arabic and English with React and TypeScript; define coding standards, review 100% of frontend code before merge, mentor developers; translate product ideas into shipped features with backend (Laravel) and UI/UX; introduce internal workflow automation with n8n and OpenAI.
2. `nexlead-coordinator` — Freelance Project Coordinator, NexLead, Remote, `2025-03` → null. Bullets: gather requirements, define scope and acceptance criteria, break projects into user stories; manage execution, timelines, cost estimates across frontend, backend, UI/UX; delivered GoldenTag to Google Play.
3. `dfs-frontend` — Frontend Developer / Project Coordinator, Distinctive Frontier, Al Khobar, `2025-01` → `2026-01`. Bullets: built dashboard-based internal platform combining Jira-style task tracking with quotation management; implemented 3 core modules replacing spreadsheet processes; coordinated frontend/backend delivery; promoted to Supervisor within 12 months.
4. `khwarizm-frontend` — Frontend Developer (Part-Time), Khwarizm Technologies, Riyadh (Remote), `2024-09` → `2025-04`. Bullets: responsive dashboard with React and Tailwind; converted Figma to pixel-accurate accessible interfaces; code reviews and standards.
5. `minicodeleader-frontend` — Frontend Developer (Freelance), Minicodeleader, Remote, `2023-06` → `2024-02`. Bullets: kids education platform UI with React and Material-UI; Figma to reusable components.
6. `kalamoon` — treated as education, not experience; it belongs in `credentials.json` (Task 3).

- [ ] **Step 4: Write `data/projects.json`**

Five entries. `smart-scanner` is `featured: true`; the rest `false`.

- `smart-scanner` (2026) — Arabic-first AI receipt-scanning SaaS. Problem: invoices sleep in pockets until month-end, global tools cannot read Arabic invoices. Built: complete React 19 + TypeScript frontend, three role-based apps (admin, employee, accountant), bilingual Arabic-default UI with full RTL, custom i18n and logical CSS properties, guided upload with in-page camera capture, receipt browser with 13+ server-side filters, Excel export, feature gating across 4 subscription tiers, GitHub Actions CI/CD with strict type checks and atomic SSH deploys. Metrics: `204` source files, `494` automated tests, `70+` fields extracted, `13+` server-side filters, `4` subscription tiers. Stack: React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library, n8n, OpenAI GPT-4.1 Vision, GitHub Actions. URL `https://receipt.nexleadtech.com`.
- `dfs-dashboard` (2025–2026) — internal CRM + Quotation platform. Stack: React 19 (Vite), TypeScript, Tailwind CSS v4, Axios, TanStack React Query, React Hook Form, React Router, Laravel Echo, @hello-pangea/dnd. URL `null`, `todo: "internal product — no public URL"`.
- `goldentag` (2025) — jewelry store management app: inventory, employees, barcode scanning, USD/SYP exchange rates, sales logging, TXT export. Role: coordination end-to-end. URL: the Play Store link.
- `business-card-extractor` (2026) — photo → structured contact data in Google Sheets → vCard saved to phone in one tap. No custom backend; n8n plus GPT-4o Vision. Stack: React, TypeScript, Tailwind CSS, n8n, OpenAI, Google Sheets.
- `mcp-search-server` (2026) — MCP server exposing a search tool over real data, wired to Claude for natural-language queries.

- [ ] **Step 5: Write `data/workflows.json`**

Six entries, transcribed from the automation CV:

- `teacher-assistant-bot` (2025→) — Arabic natural-language Telegram assistant for a private tutor: students, schedules, cancellations, dues. AI agent calls custom CRUD tools under strict business rules; usage metering, free-trial gating, session memory, lesson reminders in Saudi time. Services: n8n AI Agent, OpenAI, Google Sheets, MySQL, Telegram, Webhooks.
- `smart-scanner-pipeline` (2026) — webhook → GPT-4.1 Vision parsing → validation → deduplication → persistence. 70+ fields plus line items, tuned for handwritten Arabic invoices and ZATCA e-invoice fields, with line-item expense classification at extraction time.
- `ai-job-match` (2026) — 5 scheduled daily queries across LinkedIn, Indeed, Glassdoor; structured-JSON LLM evaluator scoring fit 1–10; dedupe against n8n Data Tables; Telegram delivery; human-in-the-loop approval; tailored AI cover letters via Gmail.
- `smart-lead-finder` (2025) — multi-query place search via Serper.dev, website scraping for emails and WhatsApp numbers, prioritisation scoring, duplicate-safe appends to segmented sheets across Saudi and Jordanian markets.
- `lesson-quality-evaluator` (2026) — webhook service transcribing lesson video with AssemblyAI speaker diarization, returning structured JSON scoring teacher quality and student engagement.
- `crm-lead-cleaner` (2026) — removes duplicates, validates emails, flags missing fields, splits Clean/Rejected with reasons, emits a quality summary per run.

- [ ] **Step 6: Extend the loader**

```js
export function loadDb(dir = 'data') {
  const profile = readJson(dir, 'profile.json');
  requireKeys(profile, ['name.en', 'headline.en', 'email', 'phone', 'site',
    'location.countryCode', 'location.city.en', 'sameAs'], 'profile.json');

  const experience = readJson(dir, 'experience.json');
  const projects = readJson(dir, 'projects.json');
  const workflows = readJson(dir, 'workflows.json');

  for (const [file, rows, keys] of [
    ['experience.json', experience, ['id', 'role', 'company', 'start']],
    ['projects.json', projects, ['id', 'name', 'tagline', 'stack']],
    ['workflows.json', workflows, ['id', 'name', 'summary', 'services']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}]`));
  }

  return { profile, experience, projects, workflows };
}
```

- [ ] **Step 7: Run tests and confirm they pass**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add data scripts tests
git commit -m "feat(data): add experience, projects, and n8n workflow records"
```

---

### Task 3: Credentials, testimonials, skills, and bilingual copy

**Files:**
- Create: `data/credentials.json`, `data/testimonials.json`, `data/skills.json`, `data/copy/en.json`, `data/copy/ar.json`
- Modify: `scripts/lib/load.mjs`
- Test: `tests/load.test.mjs`

**Interfaces:**
- Produces: `db.credentials` (`{ id, name:{en,ar}, issuer, issued, credentialId|null, url|null, kind: 'certification'|'education'|'award' }`), `db.testimonials` (`{ id, author, title, relationship:{en,ar}, date, lang, quote:{en,ar} }`), `db.skills` (`{ category:{en,ar}, items:[] }`), `db.copy.en` / `db.copy.ar` (page prose keyed by page then section).
- `copy` keys used by later tasks: `nav.*`, `home.intro`, `home.proofLabel`, `about.body`, `about.principles[]`, `about.faq[]`, `work.intro`, `projects.intro`, `automation.intro`, `contact.intro`, `footer.*`.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/load.test.mjs
test('every certification records its issuer and credential id', () => {
  const db = loadDb('data');
  const certs = db.credentials.filter(c => c.kind === 'certification');
  assert.equal(certs.length, 12);
  for (const c of certs) assert.ok(c.issuer, `${c.id} missing issuer`);
});

test('all four recommendations are present', () => {
  const db = loadDb('data');
  assert.equal(db.testimonials.length, 4);
  const authors = db.testimonials.map(t => t.author).sort();
  assert.deepEqual(authors, ['George Drouj', 'Haitham Zedan', 'Hamza Shansho', 'Tawheed Malkat']);
});

test('English and Arabic copy expose identical key sets', () => {
  const db = loadDb('data');
  const flatten = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${p}${k}.`) : [`${p}${k}`]);
  assert.deepEqual(flatten(db.copy.en).sort(), flatten(db.copy.ar).sort());
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/`
Expected: FAIL — `db.credentials is not iterable`

- [ ] **Step 3: Write `data/credentials.json`**

Twelve certifications plus one education entry plus one award:

| id | name | issuer | issued | credentialId |
|---|---|---|---|---|
| `jira-roadmaps` | How to use roadmaps in Jira | Coursera Project Network | 2025-05 | LK38V6C4Z8JI |
| `jira-user-stories` | Create User Stories in Jira | Coursera Project Network | 2025-05 | TBR0Y7OAFNAY |
| `jira-start` | Get started with Jira | Coursera Project Network | 2025-05 | UJB8ZR6XQQIQ |
| `ts-react` | TypeScript in React: Get started | Coursera Project Network | 2025-05 | O5Q2441FNT75 |
| `markdown` | Learn Markdown | Scrimba | 2025-04 | 2ZF1TPIS79DV |
| `pm-initiation` | Project Initiation: Starting a Successful Project | Google | 2025-04 | E2FQ4VK5Y8E1 |
| `pm-foundations` | Foundations of Project Management | Google | 2025-03 | 4Y8FUR9QHWM4 |
| `advanced-react` | Advanced React | Meta | 2025-01 | 1OMX1QZY5G5Q |
| `clean-code` | Clean Code Basics: How to Write Maintainable Code | Scrimba | 2024-11 | F72A6F85NYPT |
| `python-ds-ai` | Python for Data Science, AI & Development | IBM | 2024-11 | UCC3I1P3TIIU |
| `tailwind` | Tailwind CSS From Scratch | Packt | 2024-10 | VWW2LONJ33FO |
| `prompt-engineering` | Generative AI: Prompt Engineering Basics | IBM | 2024-10 | 7RRDE0FY184F |

Plus `kalamoon` (`kind: "education"`, Bachelor of Information Technology Engineering,
University of Kalamoon, 2019-09 → 2024-08) and `acpc` (`kind: "award"`, ACPC / ICPC,
issuer `ICPC — International Collegiate Programming Contest`, 2021-09).

- [ ] **Step 4: Write `data/testimonials.json`**

Four entries, quotes verbatim. Three were written in Arabic (`lang: "ar"`) and need an
English translation in `quote.en`; George Drouj's was written in English (`lang: "en"`)
and needs an Arabic translation in `quote.ar`.

- `george-drouj` — George Drouj, SDE @ noon · Codeforces Master · ACPC Bronze Medalist, 2026-02-05, relationship: coached Nour in competitive programming, senior but not a direct manager.
- `haitham-zedan` — Haitham Zedan, Software Engineer · Laravel PHP Developer, 2026-02-05, worked with Nour on the same team across two companies.
- `tawheed-malkat` — Tawheed Malkat, IT Engineer · Senior UI/UX Designer, 2026-02-05, same team at NexLead.
- `hamza-shansho` — Hamza Shansho, Mobile Application Developer · Flutter, 2026-02-05, graduation project teammate.

- [ ] **Step 5: Write `data/skills.json`**

Five categories, ordered automation-first: Automation & AI; Frontend; Data & Backend;
Tooling & Delivery; Coordination. Populate from the automation CV's Technical Skills
section, merged with the engineering CV's.

- [ ] **Step 6: Write `data/copy/en.json` and `data/copy/ar.json`**

Identical key sets. Prose only — no figures, since every number lives in an `@gen`
block. Includes six FAQ pairs aimed at what a recruiter or an LLM would ask: *What does
Nour do? What is Smart Scanner? Does he work in Arabic? Is he open to work? What is his
automation stack? How do I contact him?*

- [ ] **Step 7: Extend the loader to read all seven files plus copy, then run tests**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add data scripts tests
git commit -m "feat(data): add credentials, testimonials, skills, and bilingual copy"
```

---

## Phase 2 — Generator and validator

### Task 4: Marker injection

**Files:**
- Create: `scripts/lib/render.mjs`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Produces: `injectBlock(html, name, content) → string`. Replaces everything between
  `<!-- @gen:NAME -->` and `<!-- /@gen:NAME -->`, preserving the markers. Throws if
  either marker is absent or if the closing marker precedes the opening one.
- Produces: `escapeHtml(str) → string`.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectBlock, escapeHtml } from '../scripts/lib/render.mjs';

const page = `<main>\n<!-- @gen:projects -->\nold\n<!-- /@gen:projects -->\n</main>`;

test('replaces content between markers and keeps the markers', () => {
  const out = injectBlock(page, 'projects', '<article>new</article>');
  assert.match(out, /<!-- @gen:projects -->/);
  assert.match(out, /<article>new<\/article>/);
  assert.ok(!out.includes('old'));
});

test('leaves the rest of the document untouched', () => {
  const out = injectBlock(page, 'projects', 'x');
  assert.ok(out.startsWith('<main>'));
  assert.ok(out.trimEnd().endsWith('</main>'));
});

test('throws a helpful error when the marker is missing', () => {
  assert.throws(() => injectBlock(page, 'nope', 'x'), /marker "nope" not found/);
});

test('throws when markers are inverted', () => {
  const bad = `<!-- /@gen:a -->x<!-- @gen:a -->`;
  assert.throws(() => injectBlock(bad, 'a', 'x'), /out of order/);
});

test('escapes html-significant characters', () => {
  assert.equal(escapeHtml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/render.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```js
export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function injectBlock(html, name, content) {
  const open = `<!-- @gen:${name} -->`;
  const close = `<!-- /@gen:${name} -->`;
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start === -1 || end === -1) {
    throw new Error(`render: marker "${name}" not found`);
  }
  if (end < start) {
    throw new Error(`render: markers for "${name}" are out of order`);
  }
  return html.slice(0, start + open.length) + '\n' + content + '\n' + html.slice(end);
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `node --test tests/render.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/render.mjs tests/render.test.mjs
git commit -m "feat(build): add marker-block injection"
```

---

### Task 5: JSON-LD generation

**Files:**
- Create: `scripts/lib/jsonld.mjs`
- Test: `tests/jsonld.test.mjs`

**Interfaces:**
- Produces: `personLd(db, lang)`, `websiteLd(db, lang)`, `profilePageLd(db, lang)`, `projectsLd(db, lang)`, `credentialsLd(db, lang)`, `reviewsLd(db, lang)`, `faqLd(db, lang)`, `breadcrumbLd(page, lang, db)`, and `toScriptTag(...objects) → string`.
- Every function returns a plain object with `@context` and `@type`. `toScriptTag` wraps one or more in a single `<script type="application/ld+json">` using `@graph` when given more than one.
- **`personLd` must omit any `sameAs` entry whose `url` is `null`.**

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { personLd, toScriptTag, projectsLd } from '../scripts/lib/jsonld.mjs';

const db = loadDb('data');

test('person carries the identity graph and drops unresolved links', () => {
  const p = personLd(db, 'en');
  assert.equal(p['@type'], 'Person');
  assert.equal(p.name, 'Nour Aldeen Tofi');
  assert.equal(p.address.addressLocality, 'Al Khobar');
  assert.ok(p.sameAs.includes('https://www.linkedin.com/in/nour-aldeen-tofi-19b116240'));
  assert.ok(!p.sameAs.includes(null), 'null sameAs entries must be dropped');
  assert.ok(p.sameAs.every(u => typeof u === 'string'));
});

test('projects become SoftwareApplication entries in an ItemList', () => {
  const list = projectsLd(db, 'en');
  assert.equal(list['@type'], 'ItemList');
  assert.ok(list.itemListElement.length >= 5);
  assert.equal(list.itemListElement[0].item['@type'], 'SoftwareApplication');
});

test('script tag emits parseable json-ld', () => {
  const tag = toScriptTag(personLd(db, 'en'));
  const json = tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('script tag escapes a closing script sequence', () => {
  const tag = toScriptTag({ '@context': 'https://schema.org', '@type': 'Thing', name: '</script>' });
  assert.ok(!tag.includes('</script><'), 'must not allow tag breakout');
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/jsonld.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `scripts/lib/jsonld.mjs`**

Key details the implementer must honour:

```js
const CTX = 'https://schema.org';

export function personLd(db, lang) {
  const { profile } = db;
  return {
    '@context': CTX,
    '@type': 'Person',
    '@id': `${profile.site}/#nour`,
    name: profile.name[lang],
    alternateName: profile.name[lang === 'en' ? 'ar' : 'en'],
    jobTitle: profile.headline[lang],
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    url: profile.site,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city[lang],
      addressRegion: profile.location.region[lang],
      addressCountry: profile.location.countryCode,
    },
    knowsLanguage: profile.languages.map(l => l.code),
    sameAs: profile.sameAs.filter(s => s.url).map(s => s.url),
    knowsAbout: db.skills.flatMap(g => g.items),
    hasCredential: credentialsLd(db, lang),
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Kalamoon' },
    worksFor: db.experience.filter(e => e.end === null)
      .map(e => ({ '@type': 'Organization', name: e.company })),
  };
}

export function toScriptTag(...objects) {
  const payload = objects.length === 1
    ? objects[0]
    : { '@context': CTX, '@graph': objects.map(({ '@context': _, ...rest }) => rest) };
  const json = JSON.stringify(payload, null, 2).replaceAll('</', '<\\/');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
```

`projectsLd` maps each project to `{ '@type': 'ListItem', position, item: { '@type': 'SoftwareApplication', name, description, applicationCategory, url?, offers?… } }`, omitting `url` when null. `credentialsLd` maps certifications to `EducationalOccupationalCredential` with `credentialCategory`, `recognizedBy`, and `identifier`. `reviewsLd` maps testimonials to `Review` with `itemReviewed` pointing at `${site}/#nour`. `faqLd` maps `copy[lang].about.faq` to `FAQPage` → `Question` → `acceptedAnswer`.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test tests/jsonld.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/jsonld.mjs tests/jsonld.test.mjs
git commit -m "feat(build): generate schema.org json-ld from the data layer"
```

---

### Task 6: llms.txt, sitemap, and the public API

**Files:**
- Create: `scripts/lib/llms.mjs`, `scripts/lib/sitemap.mjs`, `scripts/lib/api.mjs`
- Test: `tests/llms.test.mjs`, `tests/sitemap.test.mjs`, `tests/api.test.mjs`

**Interfaces:**
- Produces: `buildLlmsTxt(db) → string`, `buildLlmsFullTxt(db) → string`, `buildSitemap(pages, baseUrl) → string`, `buildApiProfile(db)`, `buildApiProjects(db)`, `buildResumeJson(db)`.
- `PAGES` is a shared constant exported from `scripts/lib/sitemap.mjs`: `['', 'about', 'work', 'projects', 'automation', 'chat', 'contact']`, each rendered for both `''` and `ar/` prefixes.
- `buildResumeJson` conforms to the JSON Resume schema (`basics`, `work`, `education`, `certificates`, `skills`, `projects`, `languages`).

- [ ] **Step 1: Write the failing tests**

```js
// tests/llms.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from '../scripts/lib/llms.mjs';

const db = loadDb('data');

test('llms.txt opens with an H1 and a blockquote summary', () => {
  const txt = buildLlmsTxt(db);
  assert.match(txt, /^# Nour Aldeen Tofi\n/);
  assert.match(txt, /\n> /);
});

test('llms.txt links every page and never emits a null href', () => {
  const txt = buildLlmsTxt(db);
  for (const page of ['about', 'work', 'projects', 'automation', 'contact']) {
    assert.ok(txt.includes(`/${page}.html`), `missing link to ${page}`);
  }
  assert.ok(!txt.includes('(null)'));
});

test('llms-full.txt contains the flagship product and its real figures', () => {
  const full = buildLlmsFullTxt(db);
  assert.ok(full.includes('Smart Scanner'));
  assert.ok(full.includes('494'));
  assert.ok(!full.includes('Alessa'));
});
```

```js
// tests/sitemap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap, PAGES } from '../scripts/lib/sitemap.mjs';

test('emits one url per page per language with hreflang alternates', () => {
  const xml = buildSitemap(PAGES, 'https://nouraldeentofi.netlify.app');
  const count = (xml.match(/<url>/g) || []).length;
  assert.equal(count, PAGES.length * 2);
  assert.match(xml, /hreflang="ar"/);
  assert.match(xml, /hreflang="en"/);
  assert.match(xml, /hreflang="x-default"/);
});
```

```js
// tests/api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { buildResumeJson } from '../scripts/lib/api.mjs';

test('resume.json matches the JSON Resume shape', () => {
  const r = buildResumeJson(loadDb('data'));
  assert.equal(r.basics.name, 'Nour Aldeen Tofi');
  assert.equal(r.basics.location.countryCode, 'SA');
  assert.ok(Array.isArray(r.work) && r.work.length >= 5);
  assert.ok(r.work.every(w => w.startDate));
  assert.ok(Array.isArray(r.certificates) && r.certificates.length === 12);
  assert.ok(r.basics.profiles.every(p => typeof p.url === 'string'));
});
```

- [ ] **Step 2: Run and confirm all three fail**

Run: `node --test tests/`
Expected: FAIL — three modules not found

- [ ] **Step 3: Implement the three modules**

`buildLlmsTxt` follows the llms.txt convention: `# Title`, a `> summary` blockquote, a
short prose paragraph, then `## Section` headings with `- [label](url): note` lists.
Sections: Start here, Projects, Automation, Experience, Credentials, Machine-readable,
Contact. `buildLlmsFullTxt` renders the entire dataset as one linear markdown document.
`buildSitemap` emits `xhtml:link` alternates so both languages are linked. `api.mjs`
flattens the dataset for direct agent consumption.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/lib tests
git commit -m "feat(build): generate llms.txt, sitemap, and the public json api"
```

---

### Task 7: Build orchestration and validation gate

**Files:**
- Create: `scripts/build.mjs`, `scripts/validate.mjs`, `package.json`
- Test: `tests/validate.test.mjs`

**Interfaces:**
- `node scripts/build.mjs` writes: every `@gen` block in all 16 pages, `llms.txt`, `llms-full.txt`, `sitemap.xml`, `api/profile.json`, `api/projects.json`, `api/resume.json`. Exits non-zero and writes nothing on any error.
- `node scripts/validate.mjs` exits `0` on success, `1` on failure, printing one line per violation.
- `package.json` declares `"type": "module"` and scripts `build`, `validate`, `test`. It is a dev convenience only; **the site never depends on it**.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAll } from '../scripts/validate.mjs';

test('reports unresolved sameAs entries as warnings, not failures', () => {
  const { warnings, errors } = checkAll();
  assert.ok(warnings.some(w => /GitHub/.test(w)), 'pending GitHub link should warn');
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('a page missing a required @gen marker is an error', () => {
  const { errors } = checkAll({ pages: ['tests/fixtures/no-markers.html'] });
  assert.ok(errors.some(e => /marker/.test(e)));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/validate.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `scripts/build.mjs`**

Build into memory first, write only after every page succeeds, so a failure never
leaves half-generated output on disk.

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadDb } from './lib/load.mjs';
import { injectBlock } from './lib/render.mjs';
import { PAGES, buildSitemap } from './lib/sitemap.mjs';
import { buildLlmsTxt, buildLlmsFullTxt } from './lib/llms.mjs';
import { buildApiProfile, buildApiProjects, buildResumeJson } from './lib/api.mjs';
import * as ld from './lib/jsonld.mjs';

const db = loadDb('data');
const pending = new Map();
const stage = (path, content) => pending.set(path, content);

for (const lang of ['en', 'ar']) {
  const prefix = lang === 'en' ? '' : 'ar/';
  for (const page of PAGES) {
    const file = `${prefix}${page || 'index'}.html`;
    let html = readFileSync(file, 'utf8');
    for (const [name, content] of blocksFor(page, lang, db)) {
      html = injectBlock(html, name, content);
    }
    stage(file, html);
  }
}

stage('llms.txt', buildLlmsTxt(db));
stage('llms-full.txt', buildLlmsFullTxt(db));
stage('sitemap.xml', buildSitemap(PAGES, db.profile.site));
stage('api/profile.json', JSON.stringify(buildApiProfile(db), null, 2));
stage('api/projects.json', JSON.stringify(buildApiProjects(db), null, 2));
stage('api/resume.json', JSON.stringify(buildResumeJson(db), null, 2));

for (const [path, content] of pending) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
console.log(`build: wrote ${pending.size} files`);
```

`blocksFor(page, lang, db)` returns the `[markerName, html]` pairs each page needs — it
is the one place that maps pages to their generated content.

- [ ] **Step 4: Implement `scripts/validate.mjs`**

`checkAll({ pages } = {})` returns `{ errors: string[], warnings: string[] }` and runs
the six checks from spec §8: JSON-LD parses with required fields; internal links
resolve; external URLs are well-formed; AR/EN parity by section count; no `TODO` in
shipped output; `data/` shapes match. Unresolved `sameAs` entries are **warnings**;
everything else is an **error**. The CLI entry point prints both and calls
`process.exit(errors.length ? 1 : 0)`.

- [ ] **Step 5: Run tests and confirm pass**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts package.json tests
git commit -m "feat(build): add build orchestration and the validation gate"
```

---

## Phase 3 — English site

### Task 8: Design tokens and base styles

**Files:**
- Create: `assets/css/tokens.css`, `assets/css/base.css`, `assets/css/layout.css`, `assets/css/components.css`

**Interfaces:**
- Produces the class contract every page and every generated block relies on:
  `.container`, `.site-header`, `.site-footer`, `.skip-link`, `.hero`, `.proof`,
  `.proof__item`, `.card`, `.card--featured`, `.card__meta`, `.badge`, `.timeline`,
  `.timeline__item`, `.quote`, `.quote__author`, `.cta`, `.btn`, `.btn--ghost`,
  `.lang-switch`, `.theme-toggle`.
- Tokens: `--bg`, `--panel`, `--fg`, `--dim`, `--line`, `--lime`, `--mint`, `--accent-ink`,
  `--space-*`, `--radius-*`, `--font-sans`, `--font-arabic`.

- [ ] **Step 1: Write `tokens.css`**

Carry over the existing identity — `--bg:#0f1216`, `--panel:#151a21`, `--fg:#eef2f6`,
`--lime:#b8ff5c`, `--mint:#5ce1a9` — and add a light theme under
`:root[data-theme="light"]` plus `@media (prefers-color-scheme: light)`. Verify AA
contrast for `--dim` on `--bg` in both themes; darken the light-mode dim value until it
passes.

- [ ] **Step 2: Write `base.css`**

Reset, `:focus-visible` outline using `--lime`, `.skip-link` visible on focus,
`prefers-reduced-motion` block disabling animation and transition, and font stacks:
Figtree for Latin, an Arabic face (IBM Plex Sans Arabic) for `:lang(ar)`.

- [ ] **Step 3: Write `layout.css` and `components.css`**

Use logical properties throughout — `margin-inline`, `padding-inline`, `border-inline-start`,
`inset-inline-start`. No `left` or `right` anywhere.

- [ ] **Step 4: Verify no physical properties slipped in**

Run: `grep -nE '(^|[^-])(left|right):' assets/css/*.css`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add assets/css
git commit -m "feat(ui): add design tokens, base styles, layout, and components"
```

---

### Task 9: Home, about, and work pages

**Files:**
- Create: `index.html`, `about.html`, `work.html`, `assets/js/main.js`

**Interfaces:**
- Consumes: the class contract from Task 8, the marker names from Task 7's `blocksFor`.
- Produces: markers `home-proof`, `home-featured`, `home-automation`, `home-projects`, `home-quote`, `head-ld` (on every page), `about-faq`, `about-skills`, `work-timeline`, `work-testimonials`, `work-credentials`.
- `main.js` handles only theme toggle persistence and mobile nav. **It must not render content.**

- [ ] **Step 1: Write `index.html`**

Full semantic document: `<html lang="en">`, skip link, header with nav and language
switch pointing at `/ar/index.html`, `<main>` with an `<h1>` carrying the name and a
`<p>` carrying the headline, then the five marker blocks, then footer. `head-ld` markers
sit in `<head>`.

- [ ] **Step 2: Write `about.html` and `work.html`**

Same shell. `about.html` carries hand-written prose from `copy.en.about.body` plus the
`about-faq` and `about-skills` blocks. `work.html` carries the three work markers.

- [ ] **Step 3: Write `main.js`**

```js
const KEY = 'nt-theme';
const root = document.documentElement;
const stored = localStorage.getItem(KEY);
if (stored) root.dataset.theme = stored;

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  localStorage.setItem(KEY, next);
});
```

- [ ] **Step 4: Build and confirm content reaches the HTML**

Run: `node scripts/build.mjs && grep -c '494' index.html`
Expected: at least `1` — proving the figure is in served HTML, not injected at runtime

- [ ] **Step 5: Commit**

```bash
git add index.html about.html work.html assets/js/main.js
git commit -m "feat(site): add home, about, and work pages"
```

---

### Task 10: Projects, automation, contact, and 404

**Files:**
- Create: `projects.html`, `automation.html`, `contact.html`, `404.html`

**Interfaces:**
- Produces markers: `projects-list`, `automation-list`, `automation-case`, `contact-links`, `contact-cv`, `contact-mcp`.
- `contact-links` **must skip any `sameAs` entry with a null url** rather than render a dead anchor.

- [ ] **Step 1: Write the four pages using the Task 9 shell**

`automation.html` leads with the Automation Lab intro, then `automation-list` (six
workflows as cards showing trigger, services, and outcome), then `automation-case` — the
IF-node routing study: PDFs carry extractable text, so routing them to a text model
instead of a vision model cut per-document cost by 75%, with a fallback back to vision
when extraction returns empty.

- [ ] **Step 2: Build and validate**

Run: `node scripts/build.mjs && node scripts/validate.mjs`
Expected: `0` errors; warnings for the pending GitHub and FIDE links

- [ ] **Step 3: Confirm no dead links rendered**

Run: `grep -rn 'href="null"\|href=""' *.html`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add projects.html automation.html contact.html 404.html
git commit -m "feat(site): add projects, automation lab, contact, and 404"
```

---

### Task 11: Chat page, split into engine and script

**Files:**
- Create: `assets/js/chat/engine.js`, `assets/js/chat/script.en.js`, `assets/js/chat/live.js`, `assets/css/chat.css`
- Modify: `chat.html`
- Test: `tests/chat-script.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks except tokens.
- Produces: `createChat({ mount, script, strings }) → { start() }` from `engine.js`; `SCRIPT` (a `{ nodeId: { msgs, card?, msgs2?, opts } }` graph) from `script.en.js`; `createLiveAdapter({ endpoint })` from `live.js`, exported but **not wired**.
- Every `opts` target must exist as a node id. Missing ids fall back to `menu` at runtime.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT } from '../assets/js/chat/script.en.js';

test('every option points at a node that exists', () => {
  for (const [id, node] of Object.entries(SCRIPT)) {
    for (const [, target] of node.opts ?? []) {
      assert.ok(SCRIPT[target], `${id} → "${target}" does not exist`);
    }
  }
});

test('the script states Al Khobar and never Riyadh as his base', () => {
  const blob = JSON.stringify(SCRIPT);
  assert.ok(blob.includes('Al Khobar'));
  assert.ok(!/based in Riyadh/i.test(blob));
});

test('the script leads with automation', () => {
  assert.ok(/n8n|automation/i.test(JSON.stringify(SCRIPT.start)));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/chat-script.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Extract the engine from the old `chat.html`**

Lift the existing `addMsg`, `addCard`, `typeThen`, `runNode`, `showOpts`, and `blip`
logic verbatim into `engine.js`, but parameterise it: no module-level DOM lookups, no
reference to `NODES`. Take `mount` and `script` as arguments.

- [ ] **Step 4: Write `script.en.js`**

Rewrite the conversation for the new positioning: automation first, correct location,
Smart Scanner by name, the four unpublished automations, and the promotion story. Keep
the chess and anime personality — it is the reason the page works. Never mention Alessa.

- [ ] **Step 5: Rewrite `chat.html` with a static fallback**

Below the chat mount, include a `<section class="chat-fallback">` containing every
message as readable HTML inside `<!-- @gen:chat-transcript -->` markers, so crawlers
read the full conversation. Hide it visually with a class, **not** with `display:none` —
use a clip-based visually-hidden utility so it stays in the accessibility tree.

- [ ] **Step 6: Run tests, build, and validate**

Run: `node --test tests/ && node scripts/build.mjs && node scripts/validate.mjs`
Expected: PASS, then `0` errors

- [ ] **Step 7: Commit**

```bash
git add assets/js/chat assets/css/chat.css chat.html tests/chat-script.test.mjs
git commit -m "refactor(chat): split engine from script and add a crawlable transcript"
```

---

### Task 12: Agent-facing files

**Files:**
- Create: `robots.txt`, `humans.txt`, `_headers`, `_redirects`
- Generated by build: `llms.txt`, `llms-full.txt`, `sitemap.xml`, `api/*.json`

- [ ] **Step 1: Write `robots.txt`**

```
# Nour Aldeen Tofi — nouraldeentofi.netlify.app
# AI agents welcome. Structured profile: /llms.txt · /api/resume.json
# MCP server: /mcp/README.md

User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: cohere-ai
Allow: /

Sitemap: https://nouraldeentofi.netlify.app/sitemap.xml
```

- [ ] **Step 2: Write `_headers`**

```
/api/*
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 3: Write `_redirects`**

```
/cv        /assets/cv/Nour_Aldeen_Tofi.pdf          302
/cv/auto   /assets/cv/Nour_Aldeen_Tofi_Automation.pdf 302
/resume    /api/resume.json                          302
/ar        /ar/index.html                            200
/*         /404.html                                 404
```

- [ ] **Step 4: Confirm the generated files exist and are non-empty**

Run: `node scripts/build.mjs && wc -c llms.txt llms-full.txt sitemap.xml api/resume.json`
Expected: all four greater than zero

- [ ] **Step 5: Commit**

```bash
git add robots.txt humans.txt _headers _redirects llms.txt llms-full.txt sitemap.xml api
git commit -m "feat(ai): add robots, llms.txt, headers, redirects, and the public api"
```

---

## Phase 4 — Arabic mirror

### Task 13: Arabic pages and RTL

**Files:**
- Create: `ar/index.html`, `ar/about.html`, `ar/work.html`, `ar/projects.html`, `ar/automation.html`, `ar/chat.html`, `ar/contact.html`, `ar/404.html`, `assets/css/rtl.css`, `assets/js/chat/script.ar.js`

**Interfaces:**
- Consumes: every marker name from Tasks 9–11, identical set, and `db.copy.ar`.
- Each Arabic page sets `<html lang="ar" dir="rtl">`, links `rtl.css` after `components.css`, and points its language switch at the English equivalent.
- Each page pair carries reciprocal `<link rel="alternate" hreflang>` tags.

- [ ] **Step 1: Copy each English page and switch language attributes, nav targets, and prose**

- [ ] **Step 2: Write `rtl.css`**

Only what logical properties cannot express — mirrored decorative gradients, and
`.chat .msg.user { border-start-end-radius }` corrections.

- [ ] **Step 3: Write `script.ar.js` with the same node ids as `script.en.js`**

- [ ] **Step 4: Add the parity test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT as EN } from '../assets/js/chat/script.en.js';
import { SCRIPT as AR } from '../assets/js/chat/script.ar.js';

test('both chat scripts expose identical node ids', () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(AR).sort());
});
```

- [ ] **Step 5: Build, validate, and confirm parity passes**

Run: `node scripts/build.mjs && node scripts/validate.mjs && node --test tests/`
Expected: `0` errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add ar assets/css/rtl.css assets/js/chat/script.ar.js tests
git commit -m "feat(i18n): add the Arabic RTL mirror"
```

---

## Phase 5 — MCP server

### Task 14: MCP tools

**Files:**
- Create: `mcp/tools.js`, `mcp/package.json`
- Test: `tests/mcp-tools.test.mjs`

**Interfaces:**
- Produces pure functions, each taking `(db, args)` and returning a plain object:
  `getProfile(db, { lang })`, `searchProjects(db, { query, tech, limit })`,
  `getExperience(db, { company })`, `getWorkflows(db, {})`, `getCredentials(db, {})`,
  `getTestimonials(db, {})`.
- Invalid arguments throw `Error` with a message naming the argument. `searchProjects`
  matches case-insensitively across name, tagline, and stack; `limit` defaults to `10`.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from '../scripts/lib/load.mjs';
import { getProfile, searchProjects, getExperience } from '../mcp/tools.js';

const db = loadDb('data');

test('getProfile returns identity in the requested language', () => {
  assert.equal(getProfile(db, { lang: 'en' }).name, 'Nour Aldeen Tofi');
  assert.equal(getProfile(db, { lang: 'ar' }).name, 'نور الدين توفي');
});

test('getProfile rejects an unknown language', () => {
  assert.throws(() => getProfile(db, { lang: 'fr' }), /lang/);
});

test('searchProjects matches on stack, case-insensitively', () => {
  const hits = searchProjects(db, { query: 'n8n' });
  assert.ok(hits.length > 0);
  assert.ok(hits.some(p => p.id === 'smart-scanner'));
});

test('searchProjects honours limit', () => {
  assert.equal(searchProjects(db, { query: '', limit: 2 }).length, 2);
});

test('getExperience filters by company substring', () => {
  const hits = getExperience(db, { company: 'NexLead' });
  assert.equal(hits.length, 1);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/mcp-tools.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `mcp/tools.js`**

```js
const LANGS = new Set(['en', 'ar']);

function assertLang(lang) {
  if (!LANGS.has(lang)) throw new Error(`lang: expected "en" or "ar", got "${lang}"`);
}

export function getProfile(db, { lang = 'en' } = {}) {
  assertLang(lang);
  const p = db.profile;
  return {
    name: p.name[lang],
    headline: p.headline[lang],
    location: `${p.location.city[lang]}, ${p.location.country[lang]}`,
    email: p.email,
    languages: p.languages.map(l => `${l.name[lang]} (${l.level[lang]})`),
    links: p.sameAs.filter(s => s.url).map(s => ({ platform: s.platform, url: s.url })),
    openToWork: p.availability.openToWork,
  };
}

export function searchProjects(db, { query = '', tech = null, limit = 10 } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit: expected a positive integer');
  const q = query.toLowerCase();
  return db.projects
    .filter(p => {
      const hay = `${p.name} ${p.tagline.en} ${p.stack.join(' ')}`.toLowerCase();
      return hay.includes(q) && (!tech || p.stack.some(s => s.toLowerCase() === tech.toLowerCase()));
    })
    .slice(0, limit);
}

export function getExperience(db, { company = null } = {}) {
  if (!company) return db.experience;
  return db.experience.filter(e => e.company.toLowerCase().includes(company.toLowerCase()));
}

export const getWorkflows = (db) => db.workflows;
export const getCredentials = (db) => db.credentials;
export const getTestimonials = (db) => db.testimonials;
```

- [ ] **Step 4: Run and confirm pass**

Run: `node --test tests/mcp-tools.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add mcp/tools.js mcp/package.json tests/mcp-tools.test.mjs
git commit -m "feat(mcp): add pure query tools over the data layer"
```

---

### Task 15: MCP server and documentation

**Files:**
- Create: `mcp/server.js`, `mcp/README.md`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: every function from `mcp/tools.js`, and `loadDb` from `scripts/lib/load.mjs`.
- `mcp/server.js` registers six tools over stdio using `@modelcontextprotocol/sdk`, each with a JSON Schema input and a description written for an agent deciding whether to call it.

- [ ] **Step 1: Install the SDK inside `mcp/` only**

```bash
cd mcp && npm install @modelcontextprotocol/sdk
```

- [ ] **Step 2: Implement `server.js`**

Wire each tool, catching thrown errors and returning them as `isError` content so a bad
argument never crashes the server.

- [ ] **Step 3: Verify the server starts and lists its tools**

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp/server.js
```
Expected: JSON listing all six tool names

- [ ] **Step 4: Write `mcp/README.md`**

Include the copy-paste `claude_desktop_config.json` block so a recruiter can install the
server, plus one example question per tool.

- [ ] **Step 5: Write `README.md` and `CLAUDE.md`**

`README.md`: what the site is, how to run `build`/`validate`/`test`, how to deploy.
`CLAUDE.md`: the rules an AI agent editing this repo must follow — never hand-edit
inside `@gen` markers, facts go in `data/` only, prose carries no figures, logical
properties only, run `validate` before committing.

- [ ] **Step 6: Full green run**

Run: `node --test tests/ && node scripts/build.mjs && node scripts/validate.mjs`
Expected: all tests pass, build writes its files, validate exits `0`

- [ ] **Step 7: Commit**

```bash
git add mcp README.md CLAUDE.md
git commit -m "feat(mcp): add the stdio server and repo documentation"
```

---

## Deferred — awaiting Nour

These are wired as `null` with a `todo` and reported by `validate.mjs` as warnings. Each
is a one-line edit in `data/profile.json` followed by `node scripts/build.mjs`.

- [ ] GitHub URL → `profile.sameAs[GitHub].url`
- [ ] FIDE confirmation → `profile.sameAs[FIDE].url`
- [ ] Real n8n workflow data → enrich `data/workflows.json` once `/mcp` auth lands
- [ ] Arabic copy proofread by Nour before deploy
- [ ] Optional: enable `assets/js/chat/live.js` against an n8n webhook

---

## Self-Review

**Spec coverage.** §4.1 layout → Tasks 1–15. §4.2 generator → Tasks 4, 7. §4.3 module
boundaries → the File Structure table. §5① content in HTML → Tasks 9–11, verified by the
`grep -c '494'` step. §5② JSON-LD → Task 5. §5③ agent files → Tasks 6, 12. §5④ MCP →
Tasks 14–15. §6 content plan → Tasks 9–11, 13. §7 design language → Task 8. §8
correctness → Task 7, plus per-task test steps. §9 open items → the Deferred section.
§10 non-goals honoured: `package.json` is dev-only, `live.js` ships disabled. §11 risks →
parity test, `@gen` markers documented in `CLAUDE.md`, prose-carries-no-figures rule in
Global Constraints.

**Placeholder scan.** No `TBD` or "handle edge cases" steps. Every code step carries real
code. Task 3 and Task 9 specify content by enumeration rather than by full literal, which
is deliberate for prose — the fields, counts, and sources are exact.

**Type consistency.** `loadDb(dir)` returns the same shape in Tasks 1, 2, 3, 14.
`injectBlock(html, name, content)` is called identically in Tasks 4 and 7. `SCRIPT` is the
same export name in `script.en.js` and `script.ar.js`. `checkAll()` returns
`{ errors, warnings }` in both Task 7 steps. `PAGES` is exported once from `sitemap.mjs`
and consumed in `build.mjs`.
