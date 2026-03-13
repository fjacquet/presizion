---
phase: 06-conditional-ui-wiring
plan: "01"
subsystem: ui-toggle
tags: [sizing-mode, toggle, wizard-shell, test-stubs, perf-02, perf-03]
dependency_graph:
  requires:
    - src/store/useWizardStore.ts
    - src/components/wizard/WizardShell.tsx
  provides:
    - src/components/wizard/SizingModeToggle.tsx
  affects:
    - src/components/wizard/WizardShell.tsx
    - src/components/step3/ComparisonTable.tsx
tech_stack:
  added: []
  patterns:
    - useWizardStore selector pattern for sizingMode / setSizingMode
    - role=group aria pattern for toggle button groups
    - aria-pressed for toggle button state
key_files:
  created:
    - src/components/wizard/SizingModeToggle.tsx
    - src/components/wizard/__tests__/SizingModeToggle.test.tsx
  modified:
    - src/components/wizard/WizardShell.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx
decisions:
  - "SizingModeToggle uses aria-pressed boolean attribute (not string) for toggle state — React renders true/false correctly for ARIA"
  - "toggle is visible in WizardShell header stub removed from filled tests (visual layout — manual only per VALIDATION.md)"
  - "Wave 0 stubs use it.todo (not it.skip) so Vitest counts as pending not failing — consistent with phase 3 and 4 pattern"
  - "PERF-03 stubs added to existing ComparisonTable.test.tsx as new describe block — avoids replacing existing full tests"
metrics:
  duration: "2 min"
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
requirements:
  - PERF-02
  - PERF-03
---

# Phase 06 Plan 01: SizingModeToggle and Wave 0 Stubs Summary

**One-liner:** vCPU/SPECint global toggle with aria-pressed state and role=group wired into WizardShell header on all wizard steps.

## What Was Built

### SizingModeToggle component (`src/components/wizard/SizingModeToggle.tsx`)

A simple but correctly-structured toggle button group that:

- Uses `role="group"` with `aria-label="Sizing mode"` for accessibility
- Has two `type="button"` buttons: "vCPU" and "SPECint"
- Reads `sizingMode` and `setSizingMode` from `useWizardStore` via selector pattern
- Reflects current mode via `aria-pressed` attribute on each button
- Active button gets `font-semibold underline`; inactive gets `text-muted-foreground`

### WizardShell integration (`src/components/wizard/WizardShell.tsx`)

- Imported and rendered `<SizingModeToggle />` in the `<header>` element
- Placed below the subtitle paragraph — visible on all 3 wizard steps

### Wave 0 test stubs

- `SizingModeToggle.test.tsx`: 5 `it.todo` stubs initially; 4 replaced with passing real tests + "toggle visible in header" removed (visual/manual)
- `ComparisonTable.test.tsx`: new `PERF-03` describe block with 2 `it.todo` stubs added

## Test Results

- Pre-existing tests: 205 → still passing
- New SizingModeToggle tests: 4 passing
- ComparisonTable PERF-03 stubs: 2 pending (it.todo)
- Total suite: 209 pass, 0 fail, 0 skip
- Build: zero TypeScript errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing feature] ComparisonTable.test.tsx already existed with full tests**

- **Found during:** Task 1
- **Issue:** The plan described creating ComparisonTable.test.tsx with stubs, but the file already existed from Phase 03 with 13 real passing tests
- **Fix:** Added a new `PERF-03` describe block with `it.todo` stubs alongside the existing tests rather than replacing them — preserving existing test coverage
- **Files modified:** `src/components/step3/__tests__/ComparisonTable.test.tsx`
- **Commit:** 44b7be1

## Self-Check

- [x] `src/components/wizard/SizingModeToggle.tsx` exists
- [x] `src/components/wizard/__tests__/SizingModeToggle.test.tsx` exists
- [x] `src/components/step3/__tests__/ComparisonTable.test.tsx` updated with PERF-03 stubs
- [x] `src/components/wizard/WizardShell.tsx` imports and renders SizingModeToggle
- [x] Commits `44b7be1` and `0fea240` exist
- [x] Full vitest suite: 209 pass, 0 fail
- [x] npm run build: exits 0

## Self-Check: PASSED
