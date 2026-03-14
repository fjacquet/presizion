# Roadmap: Cluster Refresh Sizing Tool

## Milestones

- ✅ **v1.2 — Visualization, File Import & Tech Debt** — Phases 1-10 (shipped 2026-03-13)
- 🚧 **v1.3 — Scope, Persistence & Branding** — Phases 11-15 (in progress)

## Phases

<details>
<summary>✅ v1.2 — Visualization, File Import & Tech Debt (Phases 1-10) — SHIPPED 2026-03-13</summary>

Full details: `.planning/milestones/v1.2-ROADMAP.md`

### v1.0

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-12
- [x] Phase 2: Input Forms (4/4 plans) — completed 2026-03-12
- [x] Phase 3: Comparison, Export, and Wizard Shell (3/3 plans) — completed 2026-03-12
- [x] Phase 4: Deployment and Polish (4/4 plans) — completed 2026-03-12

### v1.1

- [x] Phase 5: SPECint and Utilization Formula Engine (3/3 plans) — completed 2026-03-13
- [x] Phase 6: Conditional UI Wiring (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Enhanced Export and As-Is/To-Be Report (3/3 plans) — completed 2026-03-13

### v1.2

- [x] Phase 8: v1.2 Planning Backfill (1/1 plan) — completed 2026-03-13
- [x] Phase 9: v1.2 Charts (2/2 plans) — completed 2026-03-13
- [x] Phase 10: v1.2 File Import (3/3 plans) — completed 2026-03-13

</details>

### 🚧 v1.3 — Scope, Persistence & Branding (In Progress)

**Milestone Goal:** Add cluster-scoped import filtering, localStorage/URL-share persistence, manual dark-mode toggle, and Presizion brand assets.

- [x] **Phase 11: Branding & Tech Debt** — Presizion logo, custom favicon, and RAM formula display fix (completed 2026-03-13)
- [x] **Phase 12: Dark Mode Toggle** — Header theme toggle with localStorage persistence and OS fallback (completed 2026-03-13)
- [x] **Phase 13: Import Scope Filter** — Parser detects clusters/datacenters; modal lets user select scope before populating Step 1 (completed 2026-03-13)
- [x] **Phase 14: Persistent Scope Widget** — Step 1 scope badge shows active clusters; re-aggregates data on scope change (completed 2026-03-13)
- [ ] **Phase 15: Persistence** — localStorage auto-restore and shareable URL hash encoding full session state

## Phase Details

### Phase 9: v1.2 Charts

**Goal**: Bar chart comparison of server counts across all scenarios with PNG download
**Depends on**: Phase 7
**Requirements**: CHART-01, CHART-02, CHART-03
**Success Criteria** (what must be TRUE):

  1. Step 3 displays a Recharts BarChart comparing CPU/RAM/disk-limited counts per scenario
  2. CPU bar label shows "SPECint-limited" when sizingMode is specint
  3. "Download PNG" button triggers SVG→canvas→PNG download of the chart

**Plans**: 2 plans

Plans:

- [x] 09-01-PLAN.md — Install recharts + Wave 0 stubs (Wave 1)
- [x] 09-02-PLAN.md — SizingChart component + Step 3 integration (Wave 2)

### Phase 10: v1.2 File Import

**Goal**: RVTools xlsx and LiveOptics zip/xlsx/csv file import with preview modal
**Depends on**: Phase 7
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03
**Success Criteria** (what must be TRUE):

  1. FileImportButton in Step 1 accepts .xlsx/.csv/.zip and detects RVTools vs LiveOptics format
  2. ImportPreviewModal shows derived metrics and requires "Apply" before populating CurrentClusterForm
  3. After Apply, CurrentClusterForm fields update to reflect imported cluster values

**Plans**: 3 plans

Plans:

- [x] 10-01-PLAN.md — Install xlsx + jszip + Wave 0 stubs (Wave 1)
- [x] 10-02-PLAN.md — Port parsers from store-predict: fileValidation, columnResolver, formatDetector, rvtoolsParser, liveopticParser (Wave 2)
- [x] 10-03-PLAN.md — FileImportButton + ImportPreviewModal + Step 1 wiring + form sync (Wave 2)

### Phase 11: Branding & Tech Debt

**Goal**: Users see the Presizion brand identity in the app and the RAM formula display is accurate
**Depends on**: Phase 10
**Requirements**: BRAND-01, BRAND-02, TD-04
**Success Criteria** (what must be TRUE):

  1. The Presizion logo appears in the app header (modern abstract, blue/slate palette)
  2. The browser tab shows a custom Presizion favicon instead of the Vite default
  3. When a RAM utilization % is entered in Step 2, the RAM formula display includes the utilization factor (e.g., "× 80%")
  4. RAM formula display behavior mirrors the existing CPU formula display (TD-01 parity)
**Plans**: 2 plans
Plans:

- [ ] 11-01-PLAN.md — RAM formula display fix (TD-04): add ramUtilizationPercent to RamFormulaParams and ramFormulaString; wire from ScenarioResults
- [ ] 11-02-PLAN.md — Presizion branding assets: create logo.svg and favicon.svg; integrate logo in WizardShell header

### Phase 12: Dark Mode Toggle

**Goal**: Users can manually switch between light and dark mode; the choice persists across sessions
**Depends on**: Phase 11
**Requirements**: THEME-01, THEME-02, THEME-03
**Success Criteria** (what must be TRUE):

  1. A Sun/Moon toggle button is visible in the app header on every step
  2. Clicking the toggle switches the entire app between light and dark mode immediately
  3. Refreshing or reopening the page restores the last manually-chosen theme
  4. On first visit (no stored preference), the app respects the user's OS dark/light mode setting
**Plans**: 2 plans
Plans:

- [ ] 12-01-PLAN.md — useThemeStore (Zustand) with localStorage persistence + updated index.html anti-flash script
- [ ] 12-02-PLAN.md — ThemeToggle Sun/Moon component + WizardShell header integration

### Phase 13: Import Scope Filter

**Goal**: Users importing multi-cluster files can choose which cluster(s) to include before Step 1 is populated
**Depends on**: Phase 12
**Requirements**: SCOPE-01, SCOPE-02
**Success Criteria** (what must be TRUE):

  1. Importing a file with multiple distinct clusters or datacenters surfaces those names after parsing
  2. The import preview modal shows a scope selector (checkboxes) defaulting to all clusters selected
  3. Confirming the import with a subset of clusters populates Step 1 with only the selected scope's aggregated data
  4. Importing a single-cluster file skips the scope selector (no unnecessary UI)
**Plans**: 2 plans
Plans:

- [ ] 13-01-PLAN.md — Parser scope detection: extend ClusterImportResult, add cluster/datacenter alias maps, update rvtoolsParser + liveopticParser, create scopeAggregator.ts utility (TDD)
- [ ] 13-02-PLAN.md — ImportPreviewModal scope selector UI: checkboxes for multi-cluster imports, live re-aggregation preview, Apply with selected scope

### Phase 14: Persistent Scope Widget

**Goal**: Users can see and change the active scope filter from Step 1 at any time without re-importing the file
**Depends on**: Phase 13
**Requirements**: SCOPE-03, SCOPE-04
**Success Criteria** (what must be TRUE):

  1. After a multi-cluster import, a scope badge appears in the Step 1 header showing active cluster names
  2. The scope badge includes an edit affordance (icon/link) that opens the scope selector
  3. Changing the scope selection in Step 1 immediately re-aggregates and updates all Step 1 fields
  4. The scope badge is not shown when no file has been imported or the file had only one cluster
**Plans**: 2 plans
Plans:

- [ ] 14-01-PLAN.md — useImportStore (Zustand) with re-aggregation wiring + ImportPreviewModal setImportBuffer call on Apply
- [ ] 14-02-PLAN.md — ScopeBadge component with edit dialog + Step1CurrentCluster integration

### Phase 15: Persistence

**Goal**: Users never lose their work — session state auto-saves and can be shared via URL
**Depends on**: Phase 14
**Requirements**: PERS-01, PERS-02, PERS-03
**Success Criteria** (what must be TRUE):

  1. Refreshing or closing and reopening the app restores the last-entered cluster inputs and all scenarios automatically
  2. A Share button in Step 3 copies a URL containing the full session state encoded as a base64 hash
  3. Opening a shared URL restores the sender's exact cluster inputs and scenarios on load
  4. A URL hash takes priority over localStorage when both are present
**Plans**: 2 plans

Plans:

- [ ] 15-01-PLAN.md — Persistence utility (serialize/deserialize/localStorage) + auto-save store subscribers + boot restore (Wave 1)
- [ ] 15-02-PLAN.md — URL hash encode/decode + boot priority logic + Share button in Step 3 (Wave 2)

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
| 8. v1.2 Planning Backfill | 1/1 | Complete   | 2026-03-14 | 2026-03-13 |
| 9. v1.2 Charts | v1.2 | 2/2 | Complete | 2026-03-13 |
| 10. v1.2 File Import | v1.2 | 3/3 | Complete | 2026-03-13 |
| 11. Branding & Tech Debt | 2/2 | Complete    | 2026-03-13 | - |
| 12. Dark Mode Toggle | 2/2 | Complete    | 2026-03-13 | - |
| 13. Import Scope Filter | 2/2 | Complete    | 2026-03-13 | - |
| 14. Persistent Scope Widget | 2/2 | Complete   | 2026-03-13 | - |
| 15. Persistence | 1/2 | In Progress|  | - |
