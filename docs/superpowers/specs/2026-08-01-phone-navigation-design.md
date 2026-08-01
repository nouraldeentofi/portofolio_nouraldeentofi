# Phone navigation: one nav, nothing hidden

**Date:** 2026-08-01
**Status:** approved

## The problem

On phones the site carries two navigations that list the same pages, and neither
one is correct.

The bottom tab bar (`mobileTabs` in `scripts/lib/pages.mjs`) is built from a
hardcoded list of four:

```js
const tabs = ['', 'projects', 'automation', 'contact'];
```

The site has seven pages. `about`, `work`, and `chat` are unreachable from it.
This is drift, not a decision: the tab bar is a hand-maintained second copy of
`PAGES`, so it fell behind the moment a page was added.

The top hamburger (`.nav-toggle` → `.site-nav[data-open]`) does list all seven,
but it only closes on link-click, Escape, and resize past 861px. Tapping the
page outside the open menu does nothing, which reads as a stuck menu.

Both navigations appear under the same breakpoint (`max-width: 767px`), so on
every phone the visitor is offered two ways to reach an identical set of links —
one incomplete, one awkward to dismiss.

## The decision

Complete the tab bar to all seven sections and delete the hamburger.

Deleting rather than fixing is the point. With no overlay there is no
outside-click handler to write, no focus trap, no scroll-lock, and no state that
can get stuck. The bug class is removed instead of handled.

Rejected alternatives:

- **Five tabs plus a "More" sheet.** Roomier targets, but it reintroduces a
  hidden layer — the hamburger moved to the bottom of the screen — and still
  needs dismiss-on-outside-tap.
- **Keep both navigations, fix the hamburger.** Lowest risk, but preserves the
  redundancy that is the actual defect.

## Design

### 1. Short labels live in `data/`

`data/copy/{en,ar}.json` gain a `navShort` block carrying all seven keys, so the
"identical key sets" rule in `tests/load.test.mjs` has something symmetric to
check, and any label can be retuned in data alone.

| key | `nav` | `navShort` |
|---|---|---|
| home | Home / الرئيسية | Home / الرئيسية |
| about | About / نبذة | About / نبذة |
| work | Work / المسيرة | Work / المسيرة |
| projects | Projects / المشاريع | Projects / المشاريع |
| automation | Automation Lab / مختبر الأتمتة | **Lab / أتمتة** |
| chat | Chat / محادثة | Chat / محادثة |
| contact | Contact / تواصل | Contact / تواصل |

Only `automation` shortens; full "Automation" does not fit at 320px. The other
six repeat their `nav` value deliberately.

The two languages shorten differently because they lose different words. English
keeps "Lab", the distinctive half of "Automation Lab". Arabic keeps "أتمتة"
(automation) and drops "مختبر" (lab), because the head noun carries the meaning
in Arabic and the modifier does not.

### 2. The tab bar iterates `PAGES`

`mobileTabs` drops its hardcoded array and walks the canonical `PAGES` export
from `scripts/lib/sitemap.mjs`, reading labels from `c.navShort[PAGE_KEY[t]]`.

After this the tab bar cannot drift: a page added to `PAGES` appears in it
automatically, the same way it already appears in the sitemap, the top nav, and
`llms.txt`.

### 3. The hamburger is deleted

- `.nav-toggle` comes out of `header()`.
- `.site-nav` stays `display: none` below 768px and is unchanged from 768px up.
- The phone header keeps brand, language switch, and theme toggle.

### 4. `initNav()` is deleted

Removed from `assets/js/motion.js`, with its import and call in
`assets/js/main.js`.

A consequence worth stating: phone navigation becomes pure HTML and CSS. Today
the hamburger requires JavaScript, which is why `layout.css` carries a separate
`html:not(.js) .site-nav` fallback block. That block goes too.

### 5. CSS

`.mobile-tabs a` retuned for seven across:

- `font-size: 0.62rem`, dropping to `0.56rem` at ≤360px
- tighter inline padding, `min-inline-size: 0` so flex children can shrink
- labels `white-space: nowrap`

The pipeline-dot `::before` and the gradient active-underline are unchanged —
the motif stays, only denser.

Deleted: `.nav-toggle` rules, the `.site-nav[data-open]` drawer with its
staggered item animations, `body.nav-is-open`, and the `html:not(.js)` fallback.

`body { padding-block-end: calc(56px + env(safe-area-inset-bottom, 0px)) }`
stays — the bar keeps its 56px height.

### 6. Tests

- the built tab bar links to every page in `PAGES`
- no `nav-toggle` survives in built HTML
- `navShort` exposes identical key sets across languages (extends the existing
  copy-parity test)

## Out of scope

Desktop and tablet navigation above 767px. `.site-nav` is untouched there.
