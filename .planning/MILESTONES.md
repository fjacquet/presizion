# Milestones: Cluster Refresh Sizing Tool

## v2.0 -- vSAN-Aware Sizing Engine (Shipped: 2026-03-15)

**Goal:** Bring Presizion to VxRail Sizer-level quality with vSAN-aware storage sizing, capacity breakdowns, growth projections, and professional report export.

**What shipped:**

- Phase 18: vSAN formula engine -- FTT policies, compression/dedup, CPU/memory/storage overhead, min-node floors
- Phase 19: Capacity breakdown tables (Required/Spare/HA/Excess/Total) + growth projection wiring (compound pre-multiply)
- Phase 20: Collapsible "vSAN & Growth" form section in ScenarioCard
- Phase 21: Stacked capacity bar charts (normalized to 100%) + min-nodes-per-constraint chart with PNG download
- Phase 22: Professional PDF + PPTX export with dark cover, KPI callouts, As-Is/To-Be, assumptions, chart images
- Post-phase: clickable step indicators, Store-Predict link, ratio display as N.N:1, standalone scope labeling

**Requirements shipped:** 40/40 (VSAN-01..12, CAP-01..06, GROW-01..04, FORM-01..04, VIZ-01..04, PDF-01..05, PPTX-01..05)

**Codebase at completion:** 541 Vitest tests, jsPDF + pptxgenjs + pptxgenjs lazy-loaded

**Archive:**
- Roadmap: `.planning/milestones/v2.0-ROADMAP.md`
- Requirements: `.planning/milestones/v2.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

**Last phase number:** 22

---

## v1.4 — Bug Fixes, Chart Polish & UX (Shipped: 2026-03-14)

**Goal:** Fix data-integrity bugs, polish charts for presentation quality, improve SPECrate workflow, add reset capability.

**What shipped:**

- Phase 16: Per-cluster ESX host config scoping in LiveOptics/RVTools parsers, VM override test coverage, As-Is column populated with real values
- Phase 17: Chart legends + data labels + professional palette + PNG download, SPECrate read-only fields + lookup link with clipboard copy, Reset button with confirmation dialog
- 6 post-phase hotfixes: scope key priority, ImportPreviewModal ESX fields, cpuModel propagation, CPU Description alias, formula display VM count, chart redesign

**Requirements shipped:** 27/27 (FIX-SCOPE-01..06, FIX-VM-01..02, FIX-ASIS-01..04, CHART-04..07, SPEC-06..09, SPEC-LINK-01..03, RESET-01..04)

**Codebase at completion:** ~6,131 lines TypeScript (src/), 441 Vitest tests

**Archive:**

- Roadmap: `.planning/milestones/v1.4-ROADMAP.md`
- Requirements: `.planning/milestones/v1.4-REQUIREMENTS.md`
- Audit: `.planning/milestones/v1.4-MILESTONE-AUDIT.md`

**Last phase number:** 17

---

## v1.3 Scope, Persistence & Branding (Shipped: 2026-03-14)

**Phases completed:** 7 phases, 10 plans, 0 tasks

**Key accomplishments:**
- (none recorded)

---

## v1.0 — MVP (completed 2026-03-12)

**Goal:** Ship a working, deployable sizing tool that correctly calculates server counts from cluster metrics and presents results in a clean 3-step wizard.

**What shipped:**

- Phase 1: Sizing library (CPU/RAM/disk formulas), Zustand stores, Zod schemas, formula display strings
- Phase 2: 3-step wizard, Step 1 current cluster form, Step 2 scenario cards with live calculation
- Phase 3: Side-by-side comparison table, CSV download, clipboard copy, beforeunload guard
- Phase 4: GitHub Pages deploy (`base: '/presizion/'`), dark mode (OS preference), formula display inline, "Copied!" clipboard feedback

**Requirements shipped:** 27/27 (INPUT-01–05, SCEN-01–05, CALC-01–07, COMP-01–02, EXPO-01–02, UX-01–06, DEPLOY-01)

**Last phase number:** 4

---

## v1.1 — Visualization, File Import & Tech Debt (completed 2026-03-13)

**Goal:** Add SPECint performance-based sizing mode, right-sizing via observed utilization, and enhanced export (JSON + print/PDF).

**What shipped:**

- Phase 5: SPECint formula engine (serverCountBySpecint, utilization right-sizing, LimitingResource extended to 4-way union)
- Phase 6: Conditional SPECint/utilization UI fields in Step 1 and ScenarioCard
- Phase 7: As-Is reference column in ComparisonTable, JSON download, @media print CSS, unconditional existingServerCount

**Requirements shipped:** 12/12 (PERF-01–05, UTIL-01–03, EXPO-03–04, REPT-01–02)

**Last phase number:** 7

---

## v1.2 — Charts, File Import & Tech Debt (completed 2026-03-13)

**Goal:** Add Recharts bar chart visualization, RVTools/LiveOptics file import, and close v1.1 display tech debt.

**What shipped:**

- Phase 8: Documentation backfill (ROADMAP/REQUIREMENTS/STATE artifacts) + parseNumericInput dead code deleted (254 tests pass)
- Phase 9: SizingChart (Recharts BarChart), SPECint bar label, PNG download via SVG→canvas
- Phase 10: FileImportButton + ImportPreviewModal + format detection (RVTools vInfo/LiveOptics VMs) + column alias maps ported from store-predict

**Requirements shipped:** 8/8 (CHART-01–03, IMPORT-01–02, TD-01–03)

**Codebase at completion:** ~6,445 lines TypeScript, 254 Vitest tests

**Archive:**

- Roadmap: `.planning/milestones/v1.2-ROADMAP.md`
- Requirements: `.planning/milestones/v1.2-REQUIREMENTS.md`
- Audit: `.planning/v1.2-MILESTONE-AUDIT.md`

**Last phase number:** 10
