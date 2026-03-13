# Milestones: Cluster Refresh Sizing Tool

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
