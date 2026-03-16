# Feature Research — v2.4 Mobile-First Responsive UX & Web App Manifest

**Domain:** Mobile UX for data-dense presales sizing tool (multi-step wizard, complex tables, charts, export)
**Researched:** 2026-03-16
**Confidence:** HIGH (NN/G, Apple developer docs, Tailwind docs, Recharts docs verified across multiple sources)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any mobile-capable web app must have. Missing these = product feels broken on phone.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-column form layout on mobile | Multi-column grids clip at 390px; users expect forms to stack vertically | LOW | Tailwind `grid-cols-1 sm:grid-cols-2` pattern covers it |
| Touch target minimum 44px height | iOS HIG and WCAG 2.5.5 require 44x44px; smaller targets cause mis-taps | LOW | All inputs, buttons, selects need `min-h-[44px]` |
| Horizontally scrollable comparison table with fixed first column | NNgroup confirmed: for tables wider than screen, users expect left column (row labels) to stay anchored | MEDIUM | CSS `overflow-x: auto` wrapper + `sticky left-0` on first column |
| Readable chart on narrow screen | Charts must not overflow 390px viewport; fixed-width charts break mobile | LOW | Already using ResponsiveContainer — verify `aspect-ratio` + min-height |
| Step navigation accessible by thumb | Wizard nav at top of screen is hard to reach; users expect swipe or bottom nav | MEDIUM | Sticky step indicator bar at top is acceptable if tappable; step indicators must remain clickable |
| Viewport meta tag correct | `<meta name="viewport" content="width=device-width, initial-scale=1">` prevents iOS zoom | LOW | Likely already present via Vite template — verify |
| No horizontal page overflow | Body scroll must be vertical only; layout must not cause page-wide horizontal scroll | MEDIUM | Audit every fixed-width element; `overflow-x: hidden` on body as safety net |
| Web app manifest (`manifest.webmanifest`) | Chrome/Android "Add to Home Screen" prompt; progressive enhancement | LOW | JSON file with name, short_name, icons, theme_color, background_color, display |
| `apple-touch-icon` 180x180 PNG | iOS Safari "Add to Home Screen" uses this icon; without it Safari auto-generates a blurry screenshot | LOW | Single 180x180 PNG in `/public/`, linked via `<link rel="apple-touch-icon">` |
| `apple-mobile-web-app-capable` meta tag | Enables standalone (chromeless) launch from iOS home screen | LOW | `<meta name="apple-mobile-web-app-capable" content="yes">` |
| `apple-mobile-web-app-status-bar-style` | Controls iOS status bar color in standalone mode | LOW | Use `black-translucent` for dark theme compatibility |

### Differentiators (Competitive Advantage)

Features that make this tool genuinely good on mobile, not just "not broken."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Collapsible form sections on mobile | Reduces cognitive overload; "Advanced / vSAN / Growth" sections hidden by default on narrow screens | MEDIUM | Use `<details>` or Radix Collapsible; already used for vSAN form — extend pattern |
| Compact scenario cards with expand-to-edit | Step 2 cards are dense; mobile users benefit from summary-first, expand to edit pattern | MEDIUM | Cards show key outputs (server count, limiting resource); tap to expand inputs |
| Bottom sheet / drawer for export actions | 7 export buttons in a row overflows on 390px; grouping them in a bottom sheet is the mobile-native pattern | MEDIUM | shadcn/ui `Sheet` component with `side="bottom"`; keep top-3 most-used as quick actions |
| Maskable icon for Android adaptive launcher | Android adaptive launchers apply circular/squircle mask; centered icon with solid background looks polished | LOW | Generate maskable variant with 20% safe zone padding; add `"purpose": "maskable"` in manifest |
| Icon sizes: 192x192 + 512x512 PWA icons | Chrome install prompt requires 192 and 512; these also serve Android home screen | LOW | PNG exports from SVG wordmark at both sizes |
| `theme-color` meta tag | Browser chrome (address bar) matches Presizion brand color | LOW | `<meta name="theme-color" content="#[brand-color]">` — use dark-mode media query variant |
| Responsive chart height scaling | On 390px, tall charts waste viewport; charts should be shorter on mobile (e.g., 200px vs 350px desktop) | LOW | Tailwind `h-[200px] sm:h-[350px]` wrapper around ResponsiveContainer |
| Sticky "Next / Back" wizard nav bar | On long-form pages, scroll-to-find nav is frustrating; sticky bottom bar is thumb-reachable | MEDIUM | `fixed bottom-0` bar with Next/Back; must account for iOS safe area inset (`pb-safe`) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full card-view conversion for comparison table | Looks cleaner | Loses side-by-side comparison value — the entire point of the table is columns per scenario; cards destroy that | Horizontal scroll with sticky first column — users can swipe through scenarios |
| Infinite accordion expansion for all table rows | Reduces visible rows | On a comparison table, hiding rows behind taps means users can't see patterns across resources at once | Show all rows; let horizontal scroll handle column overflow |
| Touch swipe for wizard step navigation | Feels native | Step 1 has file drag-drop import area; swipe conflicts; form fields scroll horizontally inside scroll containers | Use explicit Next/Back buttons; do not add swipe-step gesture |
| Service worker + offline caching | PWA "completeness" | Project.md explicitly out of scope; adds complexity (stale state bugs, cache invalidation) with no real benefit for infrequent presales tool use | Manifest-only approach for branding |
| Full-screen modal for file import on mobile | Avoids overflow | Import modal already has preview table — replacing it with full-screen creates back-navigation confusion | Ensure existing modal is `max-h-[90vh] overflow-y-auto` with a close button above the fold |
| Native share sheet for export | Elegant mobile pattern | Web Share API has no PDF blob support on iOS Safari as of 2025; PPTX is unsupported | Keep download buttons; wrap in bottom sheet for organization |
| Pinch-to-zoom chart | Mobile native feel | Recharts does not support pinch-to-zoom; implementation requires replacing charting library | Adequate default chart size + PNG download for offline review |

---

## Feature Dependencies

```
[Touch-safe 44px inputs]
    └──required by──> [Single-column form layout]

[Horizontal-scroll comparison table]
    └──requires──> [Sticky first column (CSS position: sticky)]

[Bottom sheet export drawer]
    └──requires──> [shadcn Sheet component (already in ui/)]
    └──enhances──> [Export buttons row (replaces overflow row on mobile)]

[Web app manifest]
    └──requires──> [192x192 + 512x512 PNG icons]
    └──requires──> [apple-touch-icon 180x180 PNG]
    └──enhances──> [theme-color meta tag]
    └──enhances──> [apple-mobile-web-app-capable meta tag]

[Maskable icon]
    └──requires──> [Web app manifest]

[Collapsible advanced sections]
    └──enhances──> [Single-column form layout]
    └──uses──> [Existing Radix Collapsible (already in vSAN form)]

[Sticky wizard nav bar]
    └──requires──> [iOS safe area inset (env(safe-area-inset-bottom))]
    └──conflicts──> [File drag-drop zone in Step 1] (swipe, not nav conflict)

[Responsive chart height]
    └──uses──> [Existing Recharts ResponsiveContainer]
    └──requires no──> [Library change]
```

### Dependency Notes

- **Bottom sheet requires Sheet component:** shadcn/ui `Sheet` is already listed in project's ui/ components — no new dependency.
- **Sticky first column conflicts with:** `overflow-x: auto` wrapper — the sticky cell must have a background color explicitly set or it becomes transparent during scroll.
- **Maskable icon requires design work:** The Presizion SVG wordmark may clip under mask if it fills the full canvas — needs 20% safe-zone margin on all sides.
- **iOS safe area inset:** Sticky bottom nav must add `padding-bottom: env(safe-area-inset-bottom)` for iPhone models with home indicator (iPhone X onward, including 14/15).

---

## MVP Definition

This is an additive milestone on top of a shipping product. "MVP" means minimum to call the milestone complete.

### Launch With (v2.4)

- [ ] Viewport meta confirmed + `overflow-x: hidden` on body
- [ ] Single-column form layout in Step 1 (all grids stack at < 640px)
- [ ] Touch target audit — all inputs/buttons/selects >= 44px height
- [ ] Step 2 scenario cards stack vertically (already cards, verify padding/spacing)
- [ ] Comparison table in Step 3: `overflow-x: auto` wrapper + sticky first column
- [ ] Charts: verify ResponsiveContainer fills width; reduce height on mobile via Tailwind class
- [ ] Export buttons: wrapped into bottom sheet on mobile (`sm:` breakpoint divides behaviors)
- [ ] Web app manifest (`/public/manifest.webmanifest`) with 192x192 + 512x512 icons
- [ ] `apple-touch-icon` 180x180 PNG + meta tag in `index.html`
- [ ] `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style` meta tags
- [ ] `theme-color` meta tag

### Add After Validation (v2.4.x)

- [ ] Collapsible advanced sections in Step 1 (vSAN, Growth already collapsible — audit others)
- [ ] Sticky bottom wizard nav bar with iOS safe area inset
- [ ] Compact scenario card summary-first with expand-to-edit pattern
- [ ] Maskable icon generation

### Future Consideration (v2.5+)

- [ ] Progressive disclosure for Step 3 capacity breakdown tables (hide rows behind "Show all" toggle)
- [ ] Dedicated mobile navigation redesign (bottom tab bar replacing top step indicators)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Single-column form layout | HIGH | LOW | P1 |
| 44px touch targets | HIGH | LOW | P1 |
| Horizontal-scroll comparison table + sticky column | HIGH | MEDIUM | P1 |
| Web app manifest + icons | MEDIUM | LOW | P1 |
| apple-touch-icon + iOS meta tags | MEDIUM | LOW | P1 |
| theme-color meta | LOW | LOW | P1 |
| Responsive chart height | MEDIUM | LOW | P1 |
| Bottom sheet export drawer | HIGH | MEDIUM | P2 |
| Collapsible form sections (mobile only) | MEDIUM | MEDIUM | P2 |
| Sticky wizard nav bar | MEDIUM | MEDIUM | P2 |
| Compact scenario card expand pattern | MEDIUM | HIGH | P3 |
| Maskable icon (Android polish) | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for v2.4 launch
- P2: Should have — add in this milestone if time allows
- P3: Defer to v2.5+

---

## Pattern Analysis: Key Mobile UX Decisions

### Data Tables: Horizontal Scroll + Sticky First Column (chosen)

NNgroup research confirms: for **comparison tables** where column-per-scenario juxtaposition is the core value, converting rows to cards destroys the product's purpose. The correct pattern is:
- Wrap table in `overflow-x: auto` scrollable container
- Lock the first column (row label) with `position: sticky; left: 0` + explicit background color
- Clip the last column slightly (~10px) to signal more columns exist (affordance for horizontal scroll)
- This pattern is used by Fidelity, Officeworks, and other data-heavy comparison UIs per NN/G research

Card view and accordion patterns are appropriate for **list tables** (one entity per row, no comparison needed). The Step 3 comparison table is explicitly a multi-column comparison — cards would eliminate the comparison.

### Charts: ResponsiveContainer + Height Class (chosen)

Recharts `ResponsiveContainer` already handles width scaling. Width is already correct. The only mobile fix needed is height: set `h-[200px] sm:h-[350px]` on the wrapper `<div>` so charts are readable but not viewport-consuming on mobile.

Do not replace Recharts with a "more mobile-friendly" library — this is overkill and would break 596 existing tests.

### Export Buttons: Bottom Sheet on Mobile (chosen)

7 export buttons in a row at `~48px` each = `~336px` minimum — that already hits the 390px limit. On mobile the row must collapse. Bottom sheet (using existing shadcn `Sheet`) is the established mobile pattern for "multiple secondary actions." The 2–3 most common exports (Copy URL, CSV, Print) can remain as quick-access icon buttons in the toolbar; the full export menu lives in the sheet.

### Wizard Navigation: Sticky Top Bar (chosen, with caveats)

Mobile wizard patterns (Oracle Alta, Material Stepper, NN/G guidance) recommend a visible step indicator. Since the 3 steps are defined and the indicator bar is already implemented, the mobile task is:
1. Ensure step indicator is tappable (44px height)
2. Consider making the bar sticky (`position: sticky; top: 0`) so it's always visible during long-form scroll
3. Do NOT add horizontal swipe navigation (conflicts with file drag-drop zone in Step 1)

### Manifest: Branding-Only (confirmed)

Per PROJECT.md: no service worker, no offline capability. Manifest purpose is "Add to Home Screen" icon + standalone launch chromeless. This is the correct scoping — a sizing tool used infrequently does not need offline caching.

---

## Competitor Feature Analysis

| Feature | Google Sheets Mobile | Airtable Mobile | Presizion v2.4 Approach |
|---------|---------------------|-----------------|------------------------|
| Complex data table | Horizontal scroll + pinch zoom | Card view per record | Horizontal scroll + sticky column (no pinch — not needed for fixed-row table) |
| Multi-step form | N/A | Wizard-like record creation | Sticky step indicator + explicit Next/Back |
| Export on mobile | Share sheet (limited) | Download + share | Bottom sheet with download options |
| Chart on mobile | Full-screen tap-to-expand | Static image | Responsive height + PNG download |
| App icon | Full PWA | Full PWA | Manifest icons + apple-touch-icon (no service worker) |

---

## Sources

- [Mobile Tables: Comparisons and Other Data Tables — Nielsen Norman Group](https://www.nngroup.com/articles/mobile-tables/)
- [How to Fit Big Tables on Small Screens — NN/G Video](https://www.nngroup.com/videos/big-tables-small-screens/)
- [Best Practices for Mobile Form Design — Smashing Magazine](https://www.smashingmagazine.com/2018/08/best-practices-for-mobile-form-design/)
- [User-friendly Mobile Data Tables — Design Bootcamp / Medium](https://medium.com/design-bootcamp/designing-user-friendly-data-tables-for-mobile-devices-c470c82403ad)
- [Data Table Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Accessible Front-End Patterns for Responsive Tables — Smashing Magazine](https://www.smashingmagazine.com/2022/12/accessible-front-end-patterns-responsive-tables-part2/)
- [Bottom Sheets: Definition and UX Guidelines — Nielsen Norman Group](https://www.nngroup.com/articles/bottom-sheet/)
- [Wizards: Definition and Design Recommendations — Nielsen Norman Group](https://www.nngroup.com/articles/wizards/)
- [Web Icons 2025: Touch Icons, Adaptive Icons & manifest.json — BrowserUX](https://browserux.com/blog/guides/web-icons/touch-adaptive-icons-manifest.html)
- [PWA Icon Requirements: The Complete 2025 Checklist](https://leandine.hashnode.dev/icogenie-pwa-icon-requirements)
- [Define your app icons — MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons)
- [Configuring Web Applications (apple-touch-icon) — Apple Developer](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Recharts ResponsiveContainer API](https://recharts.github.io/en-US/api/ResponsiveContainer/)
- [Responsive Design — Tailwind CSS Docs](https://tailwindcss.com/docs/responsive-design)
- [7 Mobile UX/UI Design Patterns Dominating 2026 — Sanjay Dey](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)

---

*Feature research for: Mobile-first responsive redesign + web app manifest (v2.4)*
*Researched: 2026-03-16*
