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

## v1.1 — In Progress

**Goal:** Add SPECint performance-based sizing mode, right-sizing via observed utilization, and enhanced export (JSON + print/PDF).

**Phases:** 5+ (continuing from phase 4)

**Started:** 2026-03-13
