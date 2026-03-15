# Roadmap: Cluster Refresh Sizing Tool

## Milestones

- ✅ **v1.2 — Visualization, File Import & Tech Debt** — Phases 1-10 (shipped 2026-03-13)
- ✅ **v1.3 — Scope, Persistence & Branding** — Phases 11-15 (shipped 2026-03-14)
- ✅ **v1.4 — Bug Fixes, Chart Polish & UX** — Phases 16-17 (shipped 2026-03-14)
- 🚧 **v2.0 — vSAN-Aware Sizing Engine** — Phases 18-22 (in progress)

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

### v2.0 — vSAN-Aware Sizing Engine (In Progress)

**Milestone Goal:** Bring Presizion to VxRail Sizer-level quality with vSAN-aware storage sizing, capacity breakdown tables and charts, growth projections, and professional PDF/PPTX report export.

- [x] **Phase 18: vSAN Formula Engine** - Types, constants, and storage/CPU/memory pipeline (math before UI) (completed 2026-03-14)
- [x] **Phase 19: Capacity Breakdown & Growth Wiring** - Hook deriving breakdown rows + growth factor application into constraints pipeline (completed 2026-03-14)
- [x] **Phase 20: Scenario Form — vSAN & Growth UI** - Collapsible vSAN & Growth fields in ScenarioCard (completed 2026-03-15)
- [x] **Phase 21: Capacity Charts** - Stacked capacity bar chart + min-nodes per constraint chart with PNG download (completed 2026-03-15)
- [x] **Phase 22: PDF & PPTX Report Export** - Client-side PDF and PowerPoint generation with jsPDF, jspdf-autotable, pptxgenjs + capacity tables + embedded chart images (completed 2026-03-15)

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

- [ ] 19-01-PLAN.md — Growth fields on Scenario + growth pre-multiply in constraints.ts
- [ ] 19-02-PLAN.md — Breakdown types + computeVsanBreakdown pure function (TDD)
- [ ] 19-03-PLAN.md — Formula display growth annotations + useVsanBreakdowns hook

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

- [ ] 20-01-PLAN.md — Extend scenarioSchema + VsanGrowthSection component + ScenarioCard integration + FORM-01..04 tests

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

- [ ] 21-01-PLAN.md — CapacityStackedChart + MinNodesChart components with tests, wired into Step3ReviewExport

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

- [ ] 22-01-PLAN.md — Install deps (jspdf, jspdf-autotable, pptxgenjs) + shared chartCapture utility + lift chart refs to Step3ReviewExport
- [ ] 22-02-PLAN.md — PDF export (exportPdf.ts + Export PDF button)
- [ ] 22-03-PLAN.md — PPTX export (exportPptx.ts + Export PPTX button)

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
| 19. Capacity Breakdown & Growth Wiring | 3/3 | Complete    | 2026-03-14 | - |
| 20. Scenario Form — vSAN & Growth UI | 1/1 | Complete    | 2026-03-15 | - |
| 21. Capacity Charts | 1/1 | Complete    | 2026-03-15 | - |
| 22. PDF & PPTX Report Export | 3/3 | Complete    | 2026-03-15 | - |
