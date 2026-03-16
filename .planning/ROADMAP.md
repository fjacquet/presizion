# Roadmap: Cluster Refresh Sizing Tool

## Milestones

- ✅ **v1.2 — Visualization, File Import & Tech Debt** — Phases 1-10 (shipped 2026-03-13)
- ✅ **v1.3 — Scope, Persistence & Branding** — Phases 11-15 (shipped 2026-03-14)
- ✅ **v1.4 — Bug Fixes, Chart Polish & UX** — Phases 16-17 (shipped 2026-03-14)
- ✅ **v2.0 — vSAN-Aware Sizing Engine** — Phases 18-22 (shipped 2026-03-15)
- ✅ **v2.1 — Import UX & Scope Fixes** — Phases 23-24 (shipped 2026-03-15)
- ✅ **v2.2 — SPEC Search Integration** — Phases 25-26 (shipped 2026-03-15)
- 🚧 **v2.4 — Mobile UX & Web App Manifest** — Phases 27-31 (in progress)

## Phases

<details>
<summary>✅ v1.2 — Visualization, File Import & Tech Debt (Phases 1-10) — SHIPPED 2026-03-13</summary>

Full details: `.planning/milestones/v1.2-ROADMAP.md`

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-12
- [x] Phase 2: Input Forms (4/4 plans) — completed 2026-03-12
- [x] Phase 3: Comparison, Export, and Wizard Shell (3/3 plans) — completed 2026-03-12
- [x] Phase 4: Deployment and Polish (4/4 plans) — completed 2026-03-12
- [x] Phase 5: SPECint and Utilization Formula Engine (3/3 plans) — completed 2026-03-13
- [x] Phase 6: Conditional UI Wiring (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Enhanced Export and As-Is/To-Be Report (3/3 plans) — completed 2026-03-13
- [x] Phase 8: v1.2 Planning Backfill (1/1 plan) — completed 2026-03-13
- [x] Phase 9: v1.2 Charts (2/2 plans) — completed 2026-03-13
- [x] Phase 10: v1.2 File Import (3/3 plans) — completed 2026-03-13

</details>

<details>
<summary>✅ v1.3 — Scope, Persistence & Branding (Phases 11-15) — SHIPPED 2026-03-14</summary>

Full details: `.planning/milestones/v1.3-ROADMAP.md`

- [x] Phase 11: Branding & Tech Debt (2/2 plans) — completed 2026-03-13
- [x] Phase 12: Dark Mode Toggle (2/2 plans) — completed 2026-03-13
- [x] Phase 13: Import Scope Filter (2/2 plans) — completed 2026-03-13
- [x] Phase 14: Persistent Scope Widget (2/2 plans) — completed 2026-03-13
- [x] Phase 15: Persistence (2/2 plans) — completed 2026-03-14

</details>

<details>
<summary>✅ v1.4 — Bug Fixes, Chart Polish & UX (Phases 16-17) — SHIPPED 2026-03-14</summary>

Full details: `.planning/milestones/v1.4-ROADMAP.md`

- [x] Phase 16: Bug Fixes — Import Scoping, VM Override & As-Is (2/2 plans) — completed 2026-03-14
- [x] Phase 17: Chart Polish, SPECrate UX & Reset (3/3 plans) — completed 2026-03-14

</details>

<details>
<summary>✅ v2.0 — vSAN-Aware Sizing Engine (Phases 18-22) — SHIPPED 2026-03-15</summary>

Full details: `.planning/milestones/v2.0-ROADMAP.md`

- [x] Phase 18: vSAN Formula Engine (2/2 plans) — completed 2026-03-14
- [x] Phase 19: Capacity Breakdown & Growth Wiring (3/3 plans) — completed 2026-03-14
- [x] Phase 20: Scenario Form — vSAN & Growth UI (1/1 plan) — completed 2026-03-15
- [x] Phase 21: Capacity Charts (1/1 plan) — completed 2026-03-15
- [x] Phase 22: PDF & PPTX Report Export (3/3 plans) — completed 2026-03-15

</details>

<details>
<summary>✅ v2.1 — Import UX & Scope Fixes (Phases 23-24) — SHIPPED 2026-03-15</summary>

Full details: `.planning/milestones/v2.1-ROADMAP.md`

- [x] Phase 23: Scope Aggregation Fixes (2/2 plans) — completed 2026-03-15
- [x] Phase 24: Average VM Metrics (1/1 plan) — completed 2026-03-15

</details>

<details>
<summary>✅ v2.2 — SPEC Search Integration (Phases 25-26) — SHIPPED 2026-03-15</summary>

Full details: `.planning/milestones/v2.2-ROADMAP.md`

- [x] Phase 25: SPEC Lookup Service (2/2 plans) — completed 2026-03-15
- [x] Phase 26: SPEC Lookup UI (2/2 plans) — completed 2026-03-15

</details>

### v2.4 — Mobile UX & Web App Manifest (In Progress)

**Milestone Goal:** Retrofit Presizion for phone use — every step usable at 390px with proper touch targets, no horizontal overflow, and installable from iOS/Android home screen via web app manifest.

- [x] **Phase 27: Web App Manifest & Icons** - Installable PWA identity: manifest file, icon PNGs, and iOS/Android meta tags in index.html (completed 2026-03-16)
- [x] **Phase 28: Global Mobile Foundation & Wizard Shell** - Viewport sizing, overflow control, touch targets, compact header/nav that underpin all three steps (completed 2026-03-16)
- [x] **Phase 29: Step 1 Mobile Form Layout** - Single-column form grids, touch-friendly inputs, and ImportPreviewModal as a mobile bottom Drawer (completed 2026-03-16)
- [x] **Phase 30: Step 2 Scenario Cards** - Stacked full-width scenario cards with collapsed grids and responsive vSAN/SPEC sections at 390px (completed 2026-03-16)
- [ ] **Phase 31: Step 3 Review & Export** - Horizontally-scrollable comparison table, responsive chart heights, bottom-sheet export actions, and iOS PDF fallback

## Phase Details

### Phase 18: vSAN Formula Engine

**Goal**: The sizing library can compute vSAN-aware storage demand (raw vs usable with FTT, metadata, swap, slack), deduct vSAN CPU overhead from available cores, and deduct vSAN memory per host — all as pure TypeScript functions with unit tests, with no UI dependency.
**Depends on**: Phase 17 (existing constraints.ts / formulas.ts)
**Requirements**: VSAN-01, VSAN-02, VSAN-03, VSAN-04, VSAN-05, VSAN-06, VSAN-07, VSAN-08, VSAN-09, VSAN-10, VSAN-11, VSAN-12
**Success Criteria** (what must be TRUE):

  1. Given a usable storage demand and an FTT policy, the engine returns correct raw storage (usable x fttMultiplier) for all six policy options
  2. Compression/dedup factor reduces the effective storage demand before FTT multiplication, matching the formula: effectiveUsable = demand / dedupFactor
  3. vSAN metadata overhead (2% of usable) and configurable slack space (default 25%) are added to the raw storage total
  4. vSAN CPU overhead (default 10%) reduces available GHz per node before server count is calculated
  5. vSAN memory overhead per host (default 6 GB) reduces available RAM per node before memory-limited count is calculated
  6. FTT policy enforces the correct minimum node floor (Mirror FTT=1: 3, FTT=2: 5, FTT=3: 7, RAID-5: 4, RAID-6: 6)
**Plans:** 2/2 plans complete

Plans:

- [x] 18-01-PLAN.md — vSAN constants, types, formula functions with TDD tests, Scenario interface extension
- [x] 18-02-PLAN.md — Wire vSAN formulas into constraints.ts + integration tests

### Phase 19: Capacity Breakdown & Growth Wiring

**Goal**: Users who have defined a scenario receive a complete capacity breakdown for CPU, Memory, and Storage — showing Required, Reserved, HA Reserve, Spare, Excess, and Total Configured — with growth factors applied to all demand inputs before overhead calculation.
**Depends on**: Phase 18
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06, GROW-01, GROW-02, GROW-03, GROW-04
**Success Criteria** (what must be TRUE):

  1. CPU, Memory, and Storage capacity breakdown rows (Required / Reserved / HA / Spare / Excess / Total) are computable for any scenario result
  2. The invariant Required + Spare + Excess = Total Configured holds for every row in every scenario
  3. HA Reserve for CPU/Memory equals one host worth of capacity; for storage equals 1/N of cluster raw capacity
  4. Setting CPU Growth to 20% causes the effective CPU demand to increase by 20% before any overhead is applied, and the formula display string shows the growth factor
  5. Growth fields default to 0% and absent vSAN fields fall through to the legacy non-vSAN sizing path without error
**Plans:** 3/3 plans complete

Plans:

- [x] 19-01-PLAN.md — Growth fields on Scenario + growth pre-multiply in constraints.ts
- [x] 19-02-PLAN.md — Breakdown types + computeVsanBreakdown pure function (TDD)
- [x] 19-03-PLAN.md — Formula display growth annotations + useVsanBreakdowns hook

### Phase 20: Scenario Form — vSAN & Growth UI

**Goal**: Users can configure vSAN storage policy, compression, overhead percentages, and per-resource growth rates directly in the ScenarioCard form without leaving Step 2, and these settings immediately affect the live server count displayed.
**Depends on**: Phase 19
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04
**Success Criteria** (what must be TRUE):

  1. A collapsible "vSAN & Growth" section appears in each ScenarioCard and is collapsed by default
  2. The vSAN sub-section (FTT policy, compression factor, slack %, CPU overhead %, memory per host GB, VM swap toggle) is only visible when layoutMode is HCI
  3. The Growth sub-section (CPU %, Memory %, Storage %) is visible in both HCI and disaggregated layout modes
  4. Changing any vSAN or growth field causes the live server count in the same ScenarioCard to update without a page reload
**Plans:** 1/1 plans complete

Plans:

- [x] 20-01-PLAN.md — Extend scenarioSchema + VsanGrowthSection component + ScenarioCard integration + FORM-01..04 tests

### Phase 21: Capacity Charts

**Goal**: Users can see stacked horizontal bar charts showing Required / Spare / Excess capacity with percentage labels for each resource, and a min-nodes-per-constraint bar chart identifying the binding constraint — and can download both as PNG for use in presentations.
**Depends on**: Phase 19
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04
**Success Criteria** (what must be TRUE):

  1. A stacked horizontal bar chart renders for each of CPU GHz, Memory GiB, Raw Storage TiB, and Usable Storage TiB — with Required / Spare / Excess segments and percentage labels
  2. A min-nodes-per-constraint horizontal bar chart renders showing the minimum node count driven by CPU, Memory, Storage, FT&HA, and VMs, clearly indicating which constraint is binding
  3. Both charts use the existing CHART_COLORS professional palette and are consistent with existing chart styling
  4. Both charts have a PNG download button that saves the chart as an image file
**Plans:** 1/1 plans complete

Plans:

- [x] 21-01-PLAN.md — CapacityStackedChart + MinNodesChart components with tests, wired into Step3ReviewExport

### Phase 22: PDF & PPTX Report Export

**Goal**: Users can export a professional PDF report or PowerPoint presentation from Step 3 that contains the project title page, executive summary, capacity breakdown tables, embedded chart images, and scenario comparison -- generated entirely in the browser without any server call.
**Depends on**: Phase 21
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PPTX-01, PPTX-02, PPTX-03, PPTX-04, PPTX-05
**Success Criteria** (what must be TRUE):

  1. "Export PDF" and "Export PPTX" buttons appear in the Step 3 export toolbar alongside existing export buttons
  2. Clicking either button generates and downloads the respective file without any network request
  3. Both PDF and PPTX contain a title page with project info, an executive summary table, capacity breakdown tables for CPU, Memory, and Storage, chart images, and the scenario comparison table
  4. The stacked capacity chart and min-nodes chart are embedded as rasterized images in both formats
  5. All export libraries (jsPDF, jspdf-autotable, pptxgenjs) are lazy-loaded and do not affect initial page load time
**Plans:** 3/3 plans complete

Plans:

- [x] 22-01-PLAN.md — Install deps (jspdf, jspdf-autotable, pptxgenjs) + shared chartCapture utility + lift chart refs to Step3ReviewExport
- [x] 22-02-PLAN.md — PDF export (exportPdf.ts + Export PDF button)
- [x] 22-03-PLAN.md — PPTX export (exportPptx.ts + Export PPTX button)

### Phase 23: Scope Aggregation Fixes

**Goal**: The scope selector and "All" aggregation behave correctly — clusterless hosts are excluded from "All" and appear as named "Standalone" scopes, the representative RAM/server for multi-scope selection uses a host-count-weighted average, and the scope dropdown shows host counts so users can make informed scope choices.
**Depends on**: Phase 22
**Requirements**: SCOPE-07, SCOPE-08, SCOPE-09, SCOPE-10
**Success Criteria** (what must be TRUE):

  1. Selecting "All" in the scope selector aggregates only named clusters; hosts with no cluster membership do not contribute to the "All" totals
  2. Clusterless hosts that belong to a datacenter appear as a selectable "Standalone (datacenter-name)" scope entry in the scope selector
  3. When multiple scopes are selected, the RAM/server value displayed in Step 1 is a host-count-weighted average across those scopes, not the value from whichever scope was first
  4. Each scope entry in the selector shows its host count in parentheses (e.g., "vxr-clu-win (16 hosts)") giving users immediate sizing context
**Plans:** 2/2 plans complete

Plans:

- [x] 23-01-PLAN.md — Fix parser standalone routing (RVTools + LiveOptics) and weighted RAM/server in aggregator
- [x] 23-02-PLAN.md — Host count display in scope selector UI (ImportPreviewModal + ScopeBadge)

### Phase 24: Average VM Metrics

**Goal**: After importing cluster data, users see average per-VM resource consumption (vCPU, RAM, Disk) in the Step 1 derived metrics panel, and those values are automatically seeded into new scenario defaults so initial scenario sizing reflects actual workload density.
**Depends on**: Phase 23
**Requirements**: AVG-01, AVG-02, AVG-03, AVG-04
**Success Criteria** (what must be TRUE):

  1. The Step 1 derived metrics section shows "Avg vCPU/VM" computed as totalVcpus / totalVms after any import
  2. The Step 1 derived metrics section shows "Avg RAM/VM (GiB)" computed from imported RAM totals after any import
  3. The Step 1 derived metrics section shows "Avg Disk/VM (GiB)" computed from imported disk totals after any import
  4. When a new scenario is added after import, its RAM/VM and Disk/VM default fields are pre-populated with the values derived from the import data
**Plans:** 1/1 plans complete

Plans:

- [x] 24-01-PLAN.md — Add avg vCPU/RAM/Disk per VM to DerivedMetricsPanel + verify scenario seeding

### Phase 25: SPEC Lookup Service

**Goal**: A pure TypeScript service exists that derives a URL-safe slug from any CPU model string, fetches matching SPECrate2017 results from the spec-search GitHub Pages API, handles errors and empty results gracefully, exposes a configurable API base URL in `src/lib/config.ts`, and updates the existing "Look up SPECrate" button to open the spec-search web UI pre-filtered by the detected CPU model.
**Depends on**: Phase 24
**Requirements**: SPEC-LOOKUP-01, SPEC-LOOKUP-05, SPEC-LOOKUP-06, SPEC-LOOKUP-07, SPEC-LOOKUP-08
**Success Criteria** (what must be TRUE):

  1. Given "Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz", the slug function returns "intel-xeon-gold-6526y" (normalizes to lowercase, strips noise words, collapses non-alphanumeric to hyphens)
  2. When a CPU model is detected from import, the service fetches `{baseUrl}/data/processors/{slug}.json` and returns the parsed results array
  3. When the API is unreachable or returns a non-200 response, the service returns an empty results array and does not throw — manual entry remains available
  4. When the API returns results but none match the CPU model, the service surfaces an explicit "no results" state distinct from an error state
  5. The spec-search API base URL is defined as a named constant in `src/lib/config.ts` and the existing "Look up SPECrate" button opens spec-search pre-filtered by CPU slug instead of spec.org
**Plans:** 2/2 plans complete

Plans:

- [x] 25-01-PLAN.md — TDD: specLookup service (cpuModelToSlug + fetchSpecResults + types) and config.ts constants
- [x] 25-02-PLAN.md — Update CurrentClusterForm "Look up SPECrate" button to open spec-search

### Phase 26: SPEC Lookup UI

**Goal**: Users see a collapsible SPECrate results panel in both Step 1 and Step 2 that displays auto-fetched benchmark results (vendor, system, base score, cores, chips) for the detected CPU model, and can click any result to immediately populate the `specintPerServer` field — eliminating the need to visit any external website.
**Depends on**: Phase 25
**Requirements**: SPEC-LOOKUP-02, SPEC-LOOKUP-03, SPEC-LOOKUP-04
**Success Criteria** (what must be TRUE):

  1. After import with a recognized CPU model, a SPECrate results panel appears in Step 1 showing at least: vendor, system name, SPECrate2017_int_base score, core count, and chip count for each matching result
  2. Clicking a result row in the Step 1 panel auto-fills the `specintPerServer` field with the selected base score without any further user action
  3. A equivalent SPECrate results panel and auto-fill mechanism is present in Step 2 (ScenarioCard) for the target server CPU model
  4. When no CPU model is detected or the lookup returns no results, the panel shows a clear fallback message; the manual `specintPerServer` entry field remains accessible at all times
**Plans:** 2/2 plans complete

Plans:

- [x] 26-01-PLAN.md — useSpecLookup hook + SpecResultsPanel component + Step 1 integration
- [x] 26-02-PLAN.md — Step 2 ScenarioCard target CPU search + SPEC results panel + regression check

### Phase 27: Web App Manifest & Icons

**Goal**: Presizion is installable to the iPhone and Android home screen — users tapping "Add to Home Screen" get the Presizion icon, a standalone launch experience (no browser chrome), and a themed address bar matching the app's brand color.
**Depends on**: Phase 26
**Requirements**: MANIFEST-01, MANIFEST-02, MANIFEST-03, MANIFEST-04, MANIFEST-05, MANIFEST-06
**Success Criteria** (what must be TRUE):

  1. Opening Presizion in Chrome on Android and tapping "Add to Home Screen" installs it with the correct Presizion icon (192px) and launches in standalone mode (no browser chrome visible)
  2. Opening Presizion in Safari on iPhone and tapping "Add to Home Screen" installs it with the Presizion icon (180px apple-touch-icon), not a page screenshot
  3. The browser address bar displays the app's brand theme-color when the page is active (visible in Chrome on Android and supported browsers)
  4. Launching Presizion from the home screen opens to `/presizion/` without a 404, regardless of iOS or Android
  5. The viewport renders without unexpected white bars or clipped edges on iPhone — `viewport-fit=cover` is applied and safe-area insets are available for future use
**Plans**: 1 plan

Plans:

- [x] 27-01-PLAN.md — Icon generation script + manifest.webmanifest + index.html meta tags (MANIFEST-01..06)

### Phase 28: Global Mobile Foundation & Wizard Shell

**Goal**: The WizardShell and global CSS provide a stable mobile base that all three wizard steps build on — correct viewport height, no page-level horizontal overflow, touch-friendly minimum target sizes, and compact navigation elements that fit on a 390px screen without wrapping or clipping.
**Depends on**: Phase 27
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):

  1. On an iPhone 14 (390px viewport), the app footer/navigation is not hidden behind the Safari address bar — content ends above the browser chrome, not behind it
  2. Tapping any input in any wizard step does not trigger iOS Safari's auto-zoom — all inputs remain at their original zoom level after focus
  3. All interactive elements (buttons, step indicators, toggles, links) are tappable without precision — each has at least a 44px touch target
  4. The header toolbar (logo, theme toggle, Store-Predict link) fits on a single line at 390px without text wrapping or icons being cut off
  5. The SizingModeToggle wraps to two lines if needed at 390px but does not cause horizontal page scroll
**Plans**: 2 plans

Plans:

- [x] 28-01-PLAN.md — Global CSS: iOS auto-zoom prevention (16px input font-size), dvh viewport height, overflow-x containment (MOBILE-01, MOBILE-02, MOBILE-04)
- [x] 28-02-PLAN.md — WizardShell compact header, 44px touch targets, StepIndicator circles, SizingModeToggle flex-wrap, sticky Back/Next nav (MOBILE-03, NAV-01..04)

### Phase 29: Step 1 Mobile Form Layout

**Goal**: A presales engineer on a phone can enter or import current cluster data in Step 1 without horizontal scrolling, pinching, or squinting — every form section stacks to a single column, import works via a bottom drawer, and all inputs meet touch-target requirements.
**Depends on**: Phase 28
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05
**Success Criteria** (what must be TRUE):

  1. All CurrentClusterForm input groups display as single-column stacks at 390px — no field is clipped or requires horizontal scroll to reach
  2. The DerivedMetricsPanel collapses from 5 columns to 2-3 columns at 390px — all metric values are readable without overflow
  3. The SPEC results panel table is horizontally scrollable at 390px — a user can swipe to reveal additional columns without causing page-level scroll
  4. On a phone, tapping the file import button opens the ImportPreviewModal as a bottom drawer that slides up from the screen edge, not a center dialog that may be clipped
  5. The file import button and scope badge are fully readable and tappable at 390px — neither is truncated or overlapping another element
**Plans**: 2 plans

Plans:

- [x] 29-01-PLAN.md — CurrentClusterForm grid audit: grid-cols-1 sm:grid-cols-N throughout all form sections (FORM-01, FORM-02, FORM-05)
- [x] 29-02-PLAN.md — ImportPreviewModal Dialog-to-Drawer on mobile + SPEC results panel horizontal scroll (FORM-03, FORM-04)

### Phase 30: Step 2 Scenario Cards

**Goal**: A presales engineer on a phone can define and review sizing scenarios in Step 2 — scenario cards stack full-width, all configuration grids collapse to readable column counts, and the vSAN/SPEC lookup sections remain functional at 390px.
**Depends on**: Phase 28
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):

  1. At 390px, scenario cards stack vertically at full width — no two cards appear side by side, and each card's content is fully visible without horizontal scrolling
  2. The server config inputs (sockets/server, cores/socket, RAM/server, disk/server) display in a 2-column grid at 390px — all four inputs are visible without scrolling within the card
  3. The sizing assumptions inputs (vCPU ratio, headroom, utilization targets) display in a 2-column grid at 390px — all inputs are visible and tappable
  4. The vSAN & Growth collapsible section's internal fields are readable and enterable at 390px — no field is clipped or hidden outside the viewport
  5. The SPEC lookup search input and results panel in Step 2 are usable at 390px — the search field accepts input and results rows are readable without horizontal overflow
**Plans**: 1 plan

Plans:

- [ ] 30-01-PLAN.md — Mobile-first grids for ScenarioCard, VsanGrowthSection, ScenarioResults, Step2Scenarios header + CARD-05 verify (CARD-01..05)

### Phase 31: Step 3 Review & Export

**Goal**: A presales engineer on a phone can review sizing results and export them from Step 3 — the comparison table scrolls horizontally with a fixed first column, charts are sized for the phone screen, and all export options are reachable via a bottom sheet without a cramped button row.
**Depends on**: Phase 30
**Requirements**: REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04, REVIEW-05, REVIEW-06
**Success Criteria** (what must be TRUE):

  1. The comparison table scrolls horizontally at 390px — the "Metric" first column stays fixed while scenario columns scroll right, and no scenario data is hidden or inaccessible
  2. All four charts (sizing, core count, capacity stacked, min-nodes) render within the phone's visible area — chart height is shorter on mobile (h-48 equivalent) and no chart bleeds outside the viewport
  3. On mobile, the export options appear in a bottom sheet that slides up from the screen edge — the button row is not present in its desktop form, replaced by a single "Export" trigger
  4. On iOS Safari, tapping "Export PDF" opens the PDF in a new browser tab with a toast explaining how to save it — the export does not silently fail or show a broken download
  5. Tapping "Download Chart PNG" on mobile produces a downloadable PNG file — the chart canvas renders correctly on a high-density (3x) screen without blurring
  6. The core count chart and capacity stacked chart are legible at 390px width — axis labels, bar segments, and legend entries are readable without overlapping
**Plans**: TBD

Plans:

- [ ] 31-01-PLAN.md — ComparisonTable horizontal scroll + sticky first column + min-w-max inner table (REVIEW-01)
- [ ] 31-02-PLAN.md — All four charts responsive height (h-48 sm:h-72) + chart legibility at 390px (REVIEW-02, REVIEW-06)
- [ ] 31-03-PLAN.md — Export bottom sheet (shadcn Sheet) + iOS PDF/PPTX fallback + PNG devicePixelRatio fix (REVIEW-03, REVIEW-04, REVIEW-05)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-12 |
| 2. Input Forms | v1.0 | 4/4 | Complete | 2026-03-12 |
| 3. Comparison, Export, and Wizard Shell | v1.0 | 3/3 | Complete | 2026-03-12 |
| 4. Deployment and Polish | v1.0 | 4/4 | Complete | 2026-03-12 |
| 5. SPECint and Utilization Formula Engine | v1.1 | 3/3 | Complete | 2026-03-13 |
| 6. Conditional UI Wiring | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Enhanced Export and As-Is/To-Be Report | v1.1 | 3/3 | Complete | 2026-03-13 |
| 8. v1.2 Planning Backfill | v1.2 | 1/1 | Complete | 2026-03-13 |
| 9. v1.2 Charts | v1.2 | 2/2 | Complete | 2026-03-13 |
| 10. v1.2 File Import | v1.2 | 3/3 | Complete | 2026-03-13 |
| 11. Branding & Tech Debt | v1.3 | 2/2 | Complete | 2026-03-13 |
| 12. Dark Mode Toggle | v1.3 | 2/2 | Complete | 2026-03-13 |
| 13. Import Scope Filter | v1.3 | 2/2 | Complete | 2026-03-13 |
| 14. Persistent Scope Widget | v1.3 | 2/2 | Complete | 2026-03-13 |
| 15. Persistence | v1.3 | 2/2 | Complete | 2026-03-14 |
| 16. Bug Fixes — Import Scoping, VM Override & As-Is | v1.4 | 2/2 | Complete | 2026-03-14 |
| 17. Chart Polish, SPECrate UX & Reset | v1.4 | 3/3 | Complete | 2026-03-14 |
| 18. vSAN Formula Engine | v2.0 | 2/2 | Complete | 2026-03-14 |
| 19. Capacity Breakdown & Growth Wiring | v2.0 | 3/3 | Complete | 2026-03-14 |
| 20. Scenario Form — vSAN & Growth UI | v2.0 | 1/1 | Complete | 2026-03-15 |
| 21. Capacity Charts | v2.0 | 1/1 | Complete | 2026-03-15 |
| 22. PDF & PPTX Report Export | v2.0 | 3/3 | Complete | 2026-03-15 |
| 23. Scope Aggregation Fixes | v2.1 | 2/2 | Complete | 2026-03-15 |
| 24. Average VM Metrics | v2.1 | 1/1 | Complete | 2026-03-15 |
| 25. SPEC Lookup Service | v2.2 | 2/2 | Complete | 2026-03-15 |
| 26. SPEC Lookup UI | v2.2 | 2/2 | Complete | 2026-03-15 |
| 27. Web App Manifest & Icons | v2.4 | 1/1 | Complete | 2026-03-16 |
| 28. Global Mobile Foundation & Wizard Shell | v2.4 | 2/2 | Complete | 2026-03-16 |
| 29. Step 1 Mobile Form Layout | v2.4 | 2/2 | Complete | 2026-03-16 |
| 30. Step 2 Scenario Cards | 1/1 | Complete    | 2026-03-16 | - |
| 31. Step 3 Review & Export | v2.4 | 0/3 | Not started | - |
