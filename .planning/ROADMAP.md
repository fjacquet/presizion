# Roadmap: Cluster Refresh Sizing Tool

## Overview

This tool is built bottom-up: math first, state second, UI third. Phase 1 establishes the correctness foundation — pure TypeScript sizing formulas with unit tests against reference spreadsheet fixtures, alongside Zustand state slices and Zod schemas. Phase 2 constructs the two data-entry steps with live calculation feedback and full form validation. Phase 3 completes the MVP with the comparison table, all export formats, and the wizard shell tying all steps together. Phase 4 deploys the finished application to GitHub Pages and adds the UI polish that was deliberately deferred.

v1.1 continues with the same bottom-up discipline: Phase 5 extends the formula engine and schemas for SPECint mode and utilization right-sizing before any UI is touched. Phase 6 wires the new conditional fields into the existing Step 1 and scenario forms. Phase 7 adds the two enhanced export formats (JSON download and print CSS).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0

- [x] **Phase 1: Foundation** - Sizing library, data types, Zod schemas, and Zustand state slices — correctness engine before any UI (completed 2026-03-12)
- [ ] **Phase 2: Input Forms** - Steps 1 and 2 with live calculation feedback, per-field validation, and formula display
- [x] **Phase 3: Comparison, Export, and Wizard Shell** - Step 3 comparison table, all export formats, and full wizard navigation (completed 2026-03-12)
- [x] **Phase 4: Deployment and Polish** - GitHub Pages deployment, formula tooltips, utilization indicators, and clipboard feedback (completed 2026-03-12)

### v1.1

- [x] **Phase 5: SPECint and Utilization Formula Engine** - Schema extensions, formula rewrites, and unit test coverage for SPECint mode and utilization right-sizing — no UI changes (completed 2026-03-13)
- [x] **Phase 6: Conditional UI Wiring** - Step 1 and ScenarioCard conditional fields for SPECint and utilization inputs, with updated results and comparison displays (completed 2026-03-13)
- [ ] **Phase 7: Enhanced Export and As-Is/To-Be Report** - As-Is reference column in Step 3, JSON download, print/PDF layout, and Step 1 server config cleanup

## Phase Details

### Phase 1: Foundation

**Goal**: A fully unit-tested calculation engine whose outputs match the reference spreadsheet, with all data types, schemas, and state management in place — before any UI is built
**Depends on**: Nothing (first phase)
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07
**Success Criteria** (what must be TRUE):

  1. Vitest suite passes with at least 3 reference spreadsheet input/output fixture pairs for CPU-limited, RAM-limited, and disk-limited scenarios, each within 0.001 tolerance
  2. `parseNumericInput` helper correctly handles empty strings, zero, and non-negative values, preventing NaN from reaching any formula function
  3. N+1 HA reserve is a first-class formula parameter in `constraints.ts` — server count with HA enabled equals server count without HA plus one
  4. All three Zustand slices (wizard navigation, cluster data, scenarios) are defined and typed; `useScenariosResults` hook returns correct `ScenarioResult[]` for fixture inputs
  5. TypeScript strict-mode build completes with zero errors across `src/lib/sizing/`, `src/store/`, and `src/schemas/`
**Plans**: 4 plans

Plans:

- [ ] 01-01-PLAN.md — Scaffold Vite project and create all test stubs (Wave 0)
- [ ] 01-02-PLAN.md — Type contracts, defaults, formula functions, computeScenarioResult (CALC-01 to CALC-06)
- [ ] 01-03-PLAN.md — Zod schemas, Zustand stores, useScenariosResults hook
- [ ] 01-04-PLAN.md — Formula display strings module (CALC-07)

### Phase 2: Input Forms

**Goal**: Users can enter current cluster data and define scenarios, with live server count outputs visible and full inline validation enforced at each field
**Depends on**: Phase 1
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

  1. User can fill in all current cluster fields (average VM config, cluster totals, existing server config) and the derived metrics panel updates within 200ms showing correct vCPU:pCore ratio and VMs/server figures
  2. User cannot advance from Step 1 to Step 2 when required fields contain invalid or empty values; inline error messages explain each invalid field
  3. User can create multiple scenarios, each with a distinct name, server configuration, and sizing assumptions; scenario results (CPU-, RAM-, and disk-limited counts) update live as values change
  4. New scenarios are pre-populated with the industry default assumptions (4:1 vCPU:pCore, 20% headroom, N+1 off); user can override any assumption per scenario
  5. User can duplicate an existing scenario and the duplicate is immediately editable as an independent variant with no shared state
**Plans**: 4 plans

Plans:

- [ ] 02-01-PLAN.md — Install UI stack (Tailwind v4/PostCSS, shadcn/ui, react-hook-form) and create Nyquist Wave 0 test stubs (Wave 0)
- [ ] 02-02-PLAN.md — Step 1: CurrentClusterForm, DerivedMetricsPanel, Step1CurrentCluster (INPUT-01 to INPUT-05, UX-03)
- [ ] 02-03-PLAN.md — Step 2: ScenarioCard, ScenarioResults, Step2Scenarios (SCEN-01 to SCEN-05)
- [ ] 02-04-PLAN.md — WizardShell, StepIndicator, App.tsx wiring (UX-01, UX-02)

### Phase 3: Comparison, Export, and Wizard Shell

**Goal**: Users can review all scenario results side by side, export a plain-text summary to clipboard and a CSV file, and navigate the full 3-step wizard with guarded transitions
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05
**Success Criteria** (what must be TRUE):

  1. Step 3 comparison table shows all defined scenarios side by side with scenario name, final server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, and CPU/RAM/disk utilization percentages
  2. Clicking "Copy summary" places a plain-text block on the clipboard containing current cluster inputs, per-scenario assumptions, and per-scenario results — the text pastes cleanly into an email or slide
  3. Clicking "Download CSV" triggers a file download containing all input fields and output metrics for every scenario in RFC 4180-compliant CSV format
  4. Wizard step indicator is always visible; navigating back to Step 1 or 2 and changing values immediately refreshes Step 3 outputs
  5. Browser prompts the user before navigating away from the page when any input data has been entered
**Plans**: 3 plans

Plans:

- [ ] 03-01-PLAN.md — Install shadcn table and create Nyquist Wave 0 test stubs for all 6 Phase 3 requirements (Wave 1)
- [x] 03-02-PLAN.md — ComparisonTable, Step3ReviewExport, clipboard.ts, export.ts (COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04) (Wave 2, parallel)
- [ ] 03-03-PLAN.md — useBeforeUnload hook, WizardShell Step 2 Next + Step 3 routing (UX-05 + wizard completion) (Wave 2, parallel)

### Phase 4: Deployment and Polish

**Goal**: The application is publicly accessible on GitHub Pages, supports dark mode, and all inline formula displays, utilization indicators, and user feedback elements are complete
**Depends on**: Phase 3
**Requirements**: DEPLOY-01, UX-06
**Success Criteria** (what must be TRUE):

  1. `vite build` produces a `dist/` folder and `npx serve dist` serves the application at the configured base path with no blank page or 404 errors
  2. The deployed GitHub Pages URL loads the application in under 2 seconds on a standard connection and all wizard steps function identically to the local development build
  3. Each key output value in Steps 2 and 3 displays its formula string and the specific parameter values used, visible inline without requiring a tooltip hover
  4. Utilization percentages are color-coded green/amber/red and the limiting resource per scenario is visually highlighted in the comparison table
  5. The application respects the user's OS dark-mode preference; all text, backgrounds, borders, and color-coded utilization cells render correctly in both light and dark mode
**Plans**: 4 plans

Plans:

- [ ] 04-01-PLAN.md — Nyquist Wave 0 stubs (darkMode.test.ts, display.test.ts) + vite.config.ts base path + GitHub Actions workflow (DEPLOY-01, UX-06)
- [ ] 04-02-PLAN.md — Dark mode: anti-flash script in index.html + dark: variants in ComparisonTable (UX-06)
- [ ] 04-03-PLAN.md — Formula display: create display.ts + wire into ScenarioResults (DEPLOY-01 / CALC-07)
- [ ] 04-04-PLAN.md — Clipboard feedback: "Copied!" state in Step3ReviewExport (UX-06)

### Phase 5: SPECint and Utilization Formula Engine

**Goal**: The sizing formulas, type contracts, Zod schemas, and Zustand store correctly handle SPECint mode and utilization right-sizing — with full test coverage — before any UI change is made
**Depends on**: Phase 4
**Requirements**: PERF-01, PERF-04, PERF-05, UTIL-01, UTIL-02, UTIL-03
**Success Criteria** (what must be TRUE):

  1. User can set a global sizing mode (vCPU or SPECint) via the Zustand wizard store, and `computeScenarioResult` returns the correct server count using `ceil(existingServers × oldSPECint × headroom / targetSPECint)` for the CPU constraint when SPECint mode is active
  2. When observed CPU utilization % is provided, the effective CPU demand scales by that percentage (e.g., 60% utilization on a 1000 vCPU cluster sizes to 600 effective vCPUs); when RAM utilization % is provided, the RAM demand scales equivalently
  3. The limiting resource label returned by `computeScenarioResult` is "SPECint" when SPECint mode is active and the SPECint constraint drives the final server count
  4. Vitest suite passes with fixture pairs covering: SPECint mode CPU-limited, vCPU mode unchanged, utilization-scaled CPU, utilization-scaled RAM, and combined SPECint + utilization scenarios
  5. TypeScript strict-mode build completes with zero errors after all schema, type, and store changes
**Plans**: 3 plans

Plans:

- [ ] 05-01-PLAN.md — Type contracts, Zod schemas, useWizardStore sizingMode, Wave 0 it.todo stubs (Wave 1)
- [ ] 05-02-PLAN.md — Formula engine: serverCountBySpecint, utilization params, computeScenarioResult branch, display strings (Wave 2, TDD)
- [ ] 05-03-PLAN.md — useScenariosResults hook integration, store/schema test stubs filled, build verification (Wave 2, parallel)

### Phase 6: Conditional UI Wiring

**Goal**: Users can see and interact with the SPECint and utilization fields in the existing wizard steps, with results and the comparison table reflecting the active mode
**Depends on**: Phase 5
**Requirements**: PERF-02, PERF-03
**Success Criteria** (what must be TRUE):

  1. A mode toggle (vCPU / SPECint) is visible and accessible in the wizard; selecting SPECint reveals the SPECint score field in Step 1 and the target SPECint field on each scenario card, while switching back to vCPU mode hides those fields
  2. The SPECint score fields in Step 1 and each scenario card validate as positive numbers; the user cannot advance past the relevant step while a required SPECint field is empty or invalid when SPECint mode is active
  3. ScenarioResults and the comparison table display the "SPECint" limiting resource label — with the correct server count — when SPECint mode is active and that constraint is the bottleneck
  4. CPU and RAM utilization % fields appear in Step 1; when values are entered, scenario server counts and formula display strings update live to reflect right-sized demand
**Plans**: 2 plans

Plans:

- [ ] 06-01-PLAN.md — Wave 0 test stubs (SizingModeToggle, ComparisonTable) + SizingModeToggle component wired into WizardShell (Wave 1)
- [ ] 06-02-PLAN.md — Conditional SPECint fields in CurrentClusterForm and ScenarioCard + ScenarioResults SPECint row + ComparisonTable label fix (Wave 2)

### Phase 7: Enhanced Export and As-Is/To-Be Report

**Goal**: Users get a complete as-is/to-be comparison report — an "As-Is" reference column in Step 3, JSON download, and print/PDF layout — plus a cleaned-up Step 1 server config section
**Depends on**: Phase 6
**Requirements**: EXPO-03, EXPO-04, REPT-01, REPT-02
**Success Criteria** (what must be TRUE):

  1. Clicking "Download JSON" in Step 3 triggers a file download containing all current cluster inputs, all scenario configurations, and all computed outputs in valid, pretty-printed JSON
  2. The downloaded JSON file is self-contained and human-readable: field names match the application's internal naming and all numeric values are present without truncation
  3. Invoking browser print (Ctrl+P / Cmd+P) from Step 3 renders a clean single-column layout: no buttons, no wizard chrome, no truncated table columns, and utilization color coding preserved in print
  4. The print layout fits standard A4/Letter paper width without horizontal scrolling or clipped content
  5. Step 3 comparison table has an "As-Is" reference column showing: existing server count, sockets × cores/server, total pCores (derived or entered), and observed vCPU:pCore ratio
  6. Step 1 shows `existingServerCount` in "Existing Server Config" unconditionally (not SPECint-only); `totalPcores` is optional and auto-derived when count + sockets + cores/socket are all provided
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete    | 2026-03-12 |
| 2. Input Forms | 3/4 | In progress | - |
| 3. Comparison, Export, and Wizard Shell | 2/3 | Complete    | 2026-03-12 |
| 4. Deployment and Polish | 4/4 | Complete   | 2026-03-12 |
| 5. SPECint and Utilization Formula Engine | 3/3 | Complete    | 2026-03-13 |
| 6. Conditional UI Wiring | 2/2 | Complete    | 2026-03-13 |
| 7. Enhanced Export | 0/TBD | Not started | - |
