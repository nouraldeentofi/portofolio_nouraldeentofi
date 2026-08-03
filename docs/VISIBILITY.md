# Being findable as `nouraldeentofi`

How search engines and AI models decide that scattered accounts are **one person**:
they follow links between them. A profile that links to your site, and a site that
links back to that profile, form a confirmed pair. Do that across every platform and
you stop being four half-strangers and become one entity they can describe.

The handle is the cheap half. The links are the half that actually works.

---

## 1. Claim the handle everywhere

You already own `nouraldeentofi` on the two that matter most.

| Platform | Status | Action |
|---|---|---|
| Email | ✅ `nouraldeentofi@gmail.com` | — |
| LinkedIn | ✅ `/in/nouraldeentofi/` | — |
| Site | ✅ `nouraldeentofi.com` | — |
| GitHub | ✅ `github.com/nouraldeentofi` | — |
| X / Twitter | ❌ | Claim `@nouraldeentofi` |
| Dev.to or Medium | ❌ | Claim it; repost your LinkedIn write-ups |
| YouTube | ❌ | Claim the handle even if you never post |
| n8n community forum | ❌ | Same handle — this is where your buyers are |
| Stack Overflow | ❌ | Same handle |

**Claim a handle even on platforms you will not use.** It costs a minute and stops
someone else becoming the first `nouraldeentofi` a search returns.

### GitHub was renamed on 2026-08-01

`NourTofi` → `nouraldeentofi`, and the Pages repo with it, so the site moved from
`nourtofi.github.io` to `nouraldeentofi.github.io`. `data/profile.json` carries both
the site URL and the GitHub `sameAs`, so the rebuild propagated them everywhere.

### The site now lives at `nouraldeentofi.com` (2026-08)

The custom domain replaced the `*.github.io` host. `data/profile.json` is the single
source of the site URL, so every canonical, JSON-LD block, sitemap entry, `llms.txt`
link and API document points at `nouraldeentofi.com` after a rebuild. The `CNAME`
file in the repo root keeps GitHub Pages bound to the domain — do not delete it.
Old `*.github.io` URLs redirect to the custom domain as long as the Pages custom
domain stays configured.

**The old handle is now unclaimed.** GitHub redirects `github.com/NourTofi/*` only
until someone else takes the name, and the old Pages host stopped serving the moment
the rename landed — Pages does not redirect `*.github.io`. Anywhere `nourtofi.github.io`
was ever pasted is now a dead link: LinkedIn, CV PDFs, the Play Store listing.

---

## 2. Link back from every platform

This is the step people skip, and it is the one that does the work. **Every profile
must link to `nouraldeentofi.com`.**

- **LinkedIn** — put the site in the Website field *and* in your About text. Add the
  Featured section with Smart Scanner and the site.
- **GitHub** — create a profile README (a repo named `nouraldeentofi`). Put your
  headline, the site link, and your three strongest projects in it. This README is
  the single highest-value page you do not yet have: it is what appears when anyone
  — human or model — opens your GitHub.
- **Pin repositories** — Smart Scanner (if public), the MCP server, this portfolio.
  An empty-looking GitHub undercuts everything the site claims.
- **Google Play** — the GoldenTag listing already links to NexLead; make sure a
  developer page exists that points back to you.

---

## 3. Tell search engines the site exists

New sites are not found, they are submitted.

1. **Google Search Console** — <https://search.google.com/search-console>. Add the
   property, verify by DNS or the HTML file, submit `sitemap.xml`.
2. **Bing Webmaster Tools** — <https://www.bing.com/webmasters>. Same. Bing feeds
   ChatGPT search, so this one matters more than its market share suggests.
3. Ask for indexing of the two homepages explicitly:
   `nouraldeentofi.com/` (Arabic) and `/en/index.html` (English).

---

## 4. What this site already does for you

Built in and working — no action needed:

- **`sameAs` identity graph** — LinkedIn, GitHub, Smart Scanner, Google Play, all
  declared as the same `Person` in JSON-LD.
- **`alternateName` variants** — `Nour Aldeen Tofi`, `Nouraldeen Tofi`,
  `Nour Al-Deen Tofi`, `Nour Aldeen Toufi`, `nouraldeentofi`, `نور الدين طفي`, and
  the common misspelling `نور الدين توفي`. Someone searching any spelling still
  lands on you.
- **Recommenders and employers resolve** — each carries its own `sameAs`, so a model
  can verify *which* Haitham Zedan vouched for you.
- **`robots.txt` explicitly allows** GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended and friends. Most sites block these by accident.
- **`llms.txt` / `llms-full.txt`** — your whole profile as one clean document.
- **`/api/*.json`** — CORS-open, including a JSON Resume–standard `resume.json`.
- **MCP server** — an assistant can query your experience directly.
- **Bilingual** — Arabic at the root, English at `/en/`, correct `hreflang`. Arabic
  is where your competition is thinnest.

---

## 5. The compounding part

Your LinkedIn posts already perform (670 impressions on the Smart Scanner post). Each
one that links back to the site strengthens the association between your name and
your subject matter.

Two habits worth keeping:

1. **Every post links to the site.** Even a passing mention.
2. **Write in Arabic about Arabic document AI and ZATCA.** Almost nobody is competing
   for those terms, and you have shipped real work in exactly that space. Being the
   obvious answer to a narrow question beats being invisible on a broad one.

---

## Priority order

1. Rename GitHub to `nouraldeentofi`, then update `data/profile.json` and rebuild.
2. Write the GitHub profile README and pin your repositories.
3. Submit to Google Search Console and Bing Webmaster Tools.
4. Add the site link to every existing profile.
5. Claim the remaining handles.
