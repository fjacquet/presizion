# Project Research Summary

**Project:** Presizion v2.4 — Mobile-First Responsive Redesign + Web App Manifest
**Domain:** Mobile UX retrofit for data-dense React presales sizing tool
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

Presizion v2.4 is a presentational-only upgrade to a working desktop application. The core challenge is retrofitting mobile responsiveness onto a data-dense, multi-step wizard designed for desktop presales use. All four research streams agree on the same conclusion: the existing stack (React 19 + Tailwind v4 + shadcn/ui + Recharts) is fully sufficient — no new runtime dependencies are required except a one-time dev-side icon generation tool. The changes are additive, low-risk, and purely CSS/markup-level with one structural exception (ImportPreviewModal Dialog-to-Drawer on mobile). The sizing formula layer and all Zustand stores remain untouched.

The recommended approach follows a strict "mobile-first Tailwind class layering" pattern: write base classes for 390px (iPhone 14/15), then add `sm:` overrides for 640px+. The architecture research identified a clear build order — manifest and icons first (zero regression risk), then WizardShell shell layout, then per-step forms and cards, then charts last (needs stable surrounding layout before device testing). The most consequential UX decision confirmed by FEATURES.md is to keep the Step 3 comparison table as a horizontally scrollable table with a sticky first column — not convert it to cards. Cards would destroy the side-by-side scenario comparison, which is the core product value.

The key risks are iOS-specific: Safari's auto-zoom on sub-16px inputs (M-1), the `100vh` clipping bug (M-2), the manifest `apple-touch-icon` requirement (M-4), and jsPDF/PPTX blob download failure on Safari (M-8). All have known mitigations. The iOS PDF export pitfall carries the highest remediation cost if discovered late — it requires rearchitecting the export path and can only be tested on a physical device. Every other pitfall resolves with a single CSS rule or HTML tag addition.

## Key Findings

### Recommended Stack

The existing stack handles everything. Tailwind v4 breakpoints (`sm` = 640px, `md` = 768px), `overflow-x-auto`, `min-h-[44px]`, `env(safe-area-inset-bottom)`, and `100dvh` are all built in. Recharts `ResponsiveContainer` already handles width scaling — only height needs a Tailwind wrapper class. The one new dependency is `@vite-pwa/assets-generator` as a dev-only CLI for icon generation. The `vite-plugin-pwa` full plugin must be avoided — it installs service worker infrastructure that is explicitly out of scope and has a known conflict with Vite 8's `manifest.json` build output.

**Core technologies:**
- Tailwind CSS v4 (already installed): all mobile responsive utilities, breakpoints, safe-area env() — no plugin needed
- shadcn/ui Drawer (add via `npx shadcn@latest add drawer`): ImportPreviewModal mobile bottom-sheet path
- Recharts ResponsiveContainer (already installed): width-responsive; height fixed via Tailwind wrapper `h-48 sm:h-72` pattern
- @vite-pwa/assets-generator (new dev dep only): one-time CLI to generate 180/192/512px PNGs from source SVG
- manual `public/manifest.webmanifest` (new static file): no build plugin needed; Vite copies `public/` verbatim

**Critical constraints:** `xlsx@0.18.5` locked — do not touch. `vite-plugin-pwa` must NOT be installed (Vite 8 conflict + service worker out of scope). `sm:` in Tailwind means 640px+ — it is NOT a mobile breakpoint; unprefixed classes are the mobile default.

### Expected Features

**Must have (table stakes for v2.4):**
- Single-column form layout in Step 1 — multi-column grids clip at 390px
- Touch targets minimum 44px height on all inputs, buttons, selects (iOS HIG + WCAG 2.5.5)
- Horizontal-scroll comparison table with sticky first column in Step 3 (NN/G confirmed: only correct pattern for comparison tables)
- Responsive chart height — charts must not overflow 390px viewport
- `overflow-x: hidden` at wizard shell level to prevent page-level horizontal scroll bleed
- Web app manifest (`manifest.webmanifest`) with 192x192 + 512x512 icons
- `apple-touch-icon` 180x180 PNG + `<link>` in index.html (iOS Safari ignores manifest icons; this tag is mandatory)
- `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style` meta tags (must appear together)
- `theme-color` meta tag with light/dark media query variants

**Should have (differentiators for v2.4):**
- Bottom sheet / drawer for export actions (7 export buttons overflow at 390px; shadcn Sheet already available)
- Collapsible form sections on mobile for Step 1 advanced options
- Sticky bottom wizard nav bar with iOS safe-area inset padding
- Maskable icon for Android adaptive launcher (20% safe zone required)

**Defer to v2.5+:**
- Compact scenario card summary-first / expand-to-edit pattern
- Dedicated mobile bottom tab bar replacing top step indicators
- Progressive disclosure toggles for Step 3 capacity breakdown rows

**Anti-features confirmed by research (do not implement):**
- Service worker / offline caching (explicitly out of scope per PROJECT.md; infrequent use makes caching unhelpful)
- Touch swipe for wizard step navigation (conflicts with file drag-drop zone in Step 1)
- Native Web Share API for exports (iOS Safari has no PDF blob support via Web Share as of 2026)
- Full card-view conversion for comparison table (destroys column-per-scenario comparison value)

### Architecture Approach

The redesign is purely presentational. No Zustand stores, sizing formulas, Zod schemas, or calculation hooks change. The one structural exception is `ImportPreviewModal`, which gains a `useIsMobile` hook and conditionally renders shadcn Drawer (bottom sheet) on narrow viewports vs. the existing Dialog on desktop. All other changes are Tailwind class additions to existing components: mobile-first class layering replaces current desktop-biased grids.

**Major components and their mobile changes:**
1. `index.html` — add manifest link, dual theme-color, apple-touch-icon, apple meta tags
2. `public/manifest.webmanifest` (new) — PWA identity file; icon references must use `/presizion/` base prefix
3. `WizardShell` — compact header on xs, sticky bottom nav bar, `pb-20` on main, `100dvh` fix
4. `StepIndicator` + `SizingModeToggle` — touch target 44px, `flex-wrap` on mode toggle
5. `Step1CurrentCluster` + `CurrentClusterForm` — `grid-cols-1 sm:grid-cols-N` audit throughout all sections
6. `ImportPreviewModal` — Dialog + Drawer responsive pattern (install shadcn Drawer)
7. `ScenarioCard` + `ScenarioResults` — collapse 4-col grids to 1-col on xs
8. `Step3ReviewExport` — `flex flex-wrap gap-2` on export button row + shadcn Sheet bottom drawer
9. `ComparisonTable` — `min-w-max` on inner Table to prevent collapse instead of scroll
10. All four charts — `h-48 sm:h-72` wrapper div, `height="100%"` on ResponsiveContainer

**Key pattern rule:** Every existing `grid-cols-2` or `grid-cols-4` without a mobile base must become `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`. Using `sm:grid-cols-1` to "reset" is wrong — `sm:` applies at 640px+, not on mobile.

**Icon generation pipeline:** `public/icons.svg` (existing) → one-time `node scripts/gen-icons.mjs` using `sharp` devDependency → `apple-touch-icon.png` (180x180), `icon-192.png`, `icon-512.png` in `public/`.

### Critical Pitfalls

1. **M-1: iOS Safari auto-zoom on sub-16px inputs** — Safari auto-zooms when any input has computed font-size below 16px (Tailwind `text-sm` = 14px). Fix globally with `@media (hover: none) { input { font-size: 16px; } }` in global CSS. Do NOT use `maximum-scale=1` (WCAG violation). Must address before any per-step mobile layout work.

2. **M-2: `100vh` clips content behind iOS browser chrome** — iOS Safari calculates `100vh` as the chrome-hidden height; on page load with chrome visible, content clips below fold. Replace `min-height: 100vh` with `min-height: 100dvh` (add `100vh` fallback for Safari < 16.0). Address in WizardShell phase.

3. **M-3 + M-4: Two manifest pitfalls that always travel together** — (a) `start_url` and `scope` must be `/presizion/` not `/` — wrong path causes 404 on home screen launch; (b) iOS Safari ignores manifest icons entirely — `<link rel="apple-touch-icon">` in `index.html` is non-negotiable. Verify in Chrome DevTools Application tab for M-3; verify on physical iPhone for M-4.

4. **M-6: Comparison table overflow propagates to page body** — A table wider than 390px with only `overflow-x-auto` on its wrapper will still cause page-level horizontal scroll if an ancestor element lacks `overflow-x: hidden`. Wrap table in `overflow-x-auto w-full` AND add `overflow-x: hidden` to the wizard shell. Also add `min-w-max` to inner `<Table>` — without it the browser compresses columns to fit rather than scroll.

5. **M-8: jsPDF/PPTX download broken on iOS Safari** — Safari revokes blob URLs before fetch completes. For PDF: use `window.open(blobUrl)` for inline viewing with a "Tap share icon to save" toast. For PPTX: show an explicit unsupported message (do not silently fail). Test on physical device only — simulator does not replicate blob behavior. This is the highest-cost pitfall if caught after launch.

## Implications for Roadmap

Both ARCHITECTURE.md and PITFALLS.md converge on the same dependency-ordered build sequence. The phases below follow that order with FEATURES.md P1/P2 priorities and PITFALLS.md phase-to-pitfall mapping.

### Phase A: Web App Manifest + Icons

**Rationale:** Pure addition to `public/` and `index.html`. Zero regression risk. No component changes. Independent of all other work. Must come first so icon files exist when manifest and meta tags reference them. Addresses all three manifest pitfalls (M-3, M-4, M-5) in complete isolation from component work.
**Delivers:** Installable PWA branding — home screen icon on iOS and Android, standalone launch, theme-color address bar styling.
**Addresses:** All P1 manifest features (manifest, apple-touch-icon, apple meta tags, theme-color, maskable icon).
**Avoids:** M-3 (wrong start_url/scope), M-4 (iOS ignores manifest icons), M-5 (status-bar-style without standalone capable tag).
**Implementation tasks:** Install `@vite-pwa/assets-generator` (dev dep), run icon generation script, create `manifest.webmanifest` in `public/`, add meta tags to `index.html`.

### Phase B: WizardShell + Global Mobile Foundation

**Rationale:** The shell container dimensions affect all per-step layout work. The `100dvh` fix, `overflow-x: hidden` at shell level, sticky bottom nav, compact header, and safe-area insets must be established before per-step audits — otherwise component measurements reference a broken parent. The global CSS input font-size rule (M-1 fix) belongs here as a single-file change that covers all inputs across all steps.
**Delivers:** Correct viewport sizing, no page-level horizontal scroll, thumb-reachable navigation bar, iOS safe-area support across all steps.
**Addresses:** Step navigation P1 feature, sticky nav bar P2 feature.
**Avoids:** M-1 (auto-zoom — global CSS), M-2 (100vh clipping — 100dvh), M-6 (page overflow — overflow-x:hidden on shell).
**Implementation tasks:** WizardShell sticky bottom nav + `pb-20` on main, `100dvh` in root CSS, `overflow-x: hidden` on shell, SizingModeToggle `flex-wrap` + touch targets, StepIndicator 44px height.

### Phase C: Step 1 Mobile Form Layout

**Rationale:** Step 1 is the entry point and most form-dense step. All grid-to-single-column audits concentrate here. Must come after Phase B so shell dimensions are correct. ImportPreviewModal Drawer (the one structural change in this milestone) lives here since it is invoked from Step 1's FileImportButton — scoping it here keeps the structural change isolated and early.
**Delivers:** Fully responsive current-cluster data entry on 390px — all grids single-column on mobile, full-width buttons, touch-safe inputs, Import modal usable as a bottom Drawer.
**Addresses:** P1 single-column form layout, P1 44px touch targets, P2 collapsible form sections.
**Avoids:** Per-component grid overflow, ImportPreviewModal cramped on mobile.
**Implementation tasks:** `Step1CurrentCluster` header stack, `CurrentClusterForm` grid audit, `DerivedMetricsPanel` 2-column verification, `FileImportButton` full-width, `ImportPreviewModal` Dialog-to-Drawer (install shadcn Drawer, add `useIsMobile` hook).

### Phase D: Step 2 Scenario Cards

**Rationale:** Depends on Phase B shell layout for correct card widths. Independent of Step 1 and Step 3 — no shared components with those steps. Primarily mechanical: collapse 4-column grids to 1-column and verify card stacking and constraint result panels.
**Delivers:** Readable scenario configuration on 390px — single-column card inputs, stacked constraint results, VsanGrowthSection grid audited.
**Addresses:** P1 scenario card stacking.
**Avoids:** Component-level grid overflow on 390px.
**Implementation tasks:** `Step2Scenarios` header `flex-col`, `ScenarioCard` grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`, `ScenarioResults` `grid-cols-1 sm:grid-cols-3`, `VsanGrowthSection` internal grid audit.

### Phase E: Step 3 Export + Table + Charts

**Rationale:** Must come last. Chart device testing is the acceptance criterion and cannot happen until surrounding layout is stable. Table overflow fix depends on shell-level `overflow-x: hidden` from Phase B. iOS export pitfall (M-8) requires physical device testing. The `downloadChartPng.ts` devicePixelRatio fix (M-9) naturally co-locates with chart work.
**Delivers:** Comparison table scrollable on mobile with sticky first column, charts correctly sized, export buttons accessible via bottom sheet on 390px, PNG exports sharp on 3x retina screens.
**Addresses:** P1 comparison table + sticky column, P1 responsive charts, P2 export bottom sheet.
**Avoids:** M-6 (table collapse — inner min-width fix), M-7 (Recharts resize failure — min-w-0 on parent + width="100%"), M-8 (iOS PDF/PPTX export — inline viewer + toast), M-9 (PNG blurry on 3x — devicePixelRatio scaling).
**Implementation tasks:** `ComparisonTable` min-width + touch-action pan-x, all four charts `h-48 sm:h-72` + `height="100%"`, `Step3ReviewExport` flex-wrap + shadcn Sheet export drawer, `downloadChartPng.ts` `Math.min(devicePixelRatio, 2)` scaling.

### Phase Ordering Rationale

- Manifest before components: zero regression risk; creates icon assets referenced by later meta tags.
- WizardShell before steps: shell overflow and viewport settings affect all per-step dimension calculations; global CSS M-1 fix applied once rather than per-component.
- Step 1 before Step 2: ImportPreviewModal structural change (Dialog+Drawer) is the most complex single-component change; better to tackle early while iteration scope is limited.
- Step 3 last: charts require stable surrounding layout for device testing; iOS export (M-8) testing requires physical device availability; all other phases must be stable first.

### Research Flags

Phases with standard, well-documented patterns — no additional research needed:
- **Phase A (Manifest):** MDN, Apple developer docs, and PITFALLS.md cover all cases explicitly. Mechanical implementation.
- **Phase B (WizardShell):** Tailwind `100dvh`, `overflow-x: hidden`, safe-area env() all well-documented. Sticky nav code example in ARCHITECTURE.md.
- **Phase C (Step 1 forms):** Tailwind grid breakpoints are mechanical. ImportPreviewModal Drawer pattern has full code example in ARCHITECTURE.md.
- **Phase D (Step 2 cards):** Same grid pattern as Phase C — purely mechanical.

Phases that may need targeted investigation during implementation:
- **Phase E, iOS export (M-8):** The `window.open(blobUrl)` PDF approach needs testing on a physical iPhone before implementation begins. If it fails, the `datauristring` + hidden anchor fallback has its own Safari quirks. Flag: ensure physical iPhone access before starting Phase E export work.
- **Phase E, Recharts resize (M-7):** If `min-w-0` parent + `ResponsiveContainer width="100%"` does not resolve orientation-change resize, the `key={orientationType}` force-remount fallback adds complexity. Research the specific Recharts 2.15.4 behavior before assuming the simple fix works.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official Tailwind v4, MDN, Apple developer, and Recharts docs. @vite-pwa/assets-generator verified via npm page and GitHub README (MEDIUM on that specific tool, HIGH overall). |
| Features | HIGH | NN/G research on mobile tables, Apple developer docs for iOS meta tags, and Recharts docs cross-confirmed. Feature priorities align consistently across sources. |
| Architecture | HIGH | Build order and component change map derived from established Tailwind mobile-first patterns. ImportPreviewModal Drawer pattern backed by official shadcn docs with code example. |
| Pitfalls | HIGH | All 9 pitfalls sourced from official bug trackers (jsPDF GitHub, Recharts GitHub), official Apple docs, MDN, and CSS-Tricks. M-8 confirmed by multiple jsPDF GitHub issues with explicit iOS Safari reproduction steps. |

**Overall confidence:** HIGH

### Gaps to Address

- **devicePixelRatio handling in downloadChartPng.ts:** The fix (`Math.min(window.devicePixelRatio, 2)`) is confirmed, but the existing utility needs auditing — dpr scaling may already be present for 2x desktop screens, requiring only extension to 3x, not a full rewrite.
- **shadcn Drawer installation:** `npx shadcn@latest add drawer` is the documented command. Verify against the project's pinned shadcn version before running — Vaul may already be installed as a transitive dependency, in which case only the component wrapper needs adding.
- **VsanGrowthSection grid internals:** Marked as "audit internal grids" in ARCHITECTURE.md. Exact grid structure not enumerated in research. Treat as same pattern as ScenarioCard but verify during implementation.
- **iOS PPTX export UX:** M-8 mitigation recommends a toast explaining Safari limitation. Decide during implementation whether to disable the PPTX button on iOS or show the toast after attempting download — both are valid UX choices not resolved by research alone.

## Sources

### Primary (HIGH confidence)

- [Tailwind CSS v4 Responsive Design](https://tailwindcss.com/docs/responsive-design) — breakpoints, mobile-first approach, breakpoint variables
- [MDN: Web Application Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) — manifest field reference, start_url, scope
- [MDN: Making PWAs Installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — minimum manifest requirements, service worker not required
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) — apple-touch-icon, apple-mobile-web-app-capable, status-bar-style
- [Recharts ResponsiveContainer API](https://recharts.org/?p=%2Fen-US%2Fapi%2FResponsiveContainer) — width/height props, resize behavior
- [shadcn/ui Drawer Component](https://ui.shadcn.com/docs/components/radix/drawer) — Vaul drawer, mobile bottom sheet
- [NN/G: Mobile Tables](https://www.nngroup.com/articles/mobile-tables/) — horizontal scroll + sticky first column as correct pattern for comparison tables
- [NN/G: Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/) — export action grouping on mobile
- [jsPDF GitHub Issue #3059](https://github.com/parallax/jsPDF/issues/3059) — iOS Safari blob URL failure confirmed
- [Recharts GitHub Issue #172](https://github.com/recharts/recharts/issues/172) — ResponsiveContainer resize failure on orientation change

### Secondary (MEDIUM confidence)

- [CSS-Tricks: 16px text prevents iOS form zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/) — M-1 auto-zoom fix
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/) — authoritative iOS Safari PWA behavior tracker
- [web.dev: Web App Manifest](https://web.dev/learn/pwa/web-app-manifest) — icon sizing, maskable icon purpose field
- [Understanding svh, lvh, dvh](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a) — M-2 100dvh fix rationale
- [vite-pwa/assets-generator GitHub](https://github.com/vite-pwa/assets-generator) — minimal2023 preset, CLI usage

### Tertiary (LOW confidence — validate during implementation)

- Recharts + `@container` query interaction — one source notes potential ResizeObserver conflict with container queries; validate before using container queries on chart wrappers
- shadcn Drawer exact install command for this project's pinned shadcn version — verify `npx shadcn@latest add drawer` before running

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
