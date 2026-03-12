# Roadmap: Cluster Refresh Sizing Tool

## Overview

This tool is built bottom-up: math first, state second, UI third. Phase 1 establishes the correctness foundation — pure TypeScript sizing formulas with unit tests against reference spreadsheet fixtures, alongside Zustand state slices and Zod schemas. Phase 2 constructs the two data-entry steps with live calculation feedback and full form validation. Phase 3 completes the MVP with the comparison table, all export formats, and the wizard shell tying all steps together. Phase 4 deploys the finished application to GitHub Pages and adds the UI polish that was deliberately deferred.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Sizing library, data types, Zod schemas, and Zustand state slices — correctness engine before any UI
- [ ] **Phase 2: Input Forms** - Steps 1 and 2 with live calculation feedback, per-field validation, and formula display
- [ ] **Phase 3: Comparison, Export, and Wizard Shell** - Step 3 comparison table, all export formats, and full wizard navigation
- [ ] **Phase 4: Deployment and Polish** - GitHub Pages deployment, formula tooltips, utilization indicators, and clipboard feedback

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
**Plans**: TBD

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
**Plans**: TBD

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
**Plans**: TBD

### Phase 4: Deployment and Polish
**Goal**: The application is publicly accessible on GitHub Pages and all inline formula displays, utilization indicators, and user feedback elements are complete
**Depends on**: Phase 3
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. `vite build` produces a `dist/` folder and `npx serve dist` serves the application at the configured base path with no blank page or 404 errors
  2. The deployed GitHub Pages URL loads the application in under 2 seconds on a standard connection and all wizard steps function identically to the local development build
  3. Each key output value in Steps 2 and 3 displays its formula string and the specific parameter values used, visible inline without requiring a tooltip hover
  4. Utilization percentages are color-coded green/amber/red and the limiting resource per scenario is visually highlighted in the comparison table
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Input Forms | 0/TBD | Not started | - |
| 3. Comparison, Export, and Wizard Shell | 0/TBD | Not started | - |
| 4. Deployment and Polish | 0/TBD | Not started | - |
