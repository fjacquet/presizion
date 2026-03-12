---
phase: 04-deployment-and-polish
plan: 02
subsystem: ui
tags: [dark-mode, tailwind, react, vitest, accessibility]

# Dependency graph
requires:
  - phase: 04-01
    provides: Wave 0 stubs (darkMode.test.ts with it.todo placeholders) and vite config with base path

provides:
  - Anti-flash dark mode script in index.html (synchronous, blocks first paint)
  - Real unit tests for anti-flash script logic (3 passing, replaces todos)
  - Dark mode color variants on utilizationClass() in ComparisonTable.tsx

affects:
  - Any future phase touching ComparisonTable or color-coded cells
  - Phase 04-03 if it adds more color-coded indicators

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function extraction pattern: anti-flash script logic tested in isolation via applyDarkModeClass() function
    - Dark mode color pairing: light 600 / dark 400 shades for adequate contrast on both backgrounds

key-files:
  created: []
  modified:
    - index.html
    - src/__tests__/darkMode.test.ts
    - src/components/step3/ComparisonTable.tsx

key-decisions:
  - "Pure function extraction for anti-flash script: test the logic as applyDarkModeClass() rather than DOM-testing index.html directly — cleaner, framework-agnostic"
  - "Dark color pairing: text-*-600 (light) / dark:text-*-400 (dark) — 400 shades lighter for adequate contrast on dark backgrounds"

patterns-established:
  - "Dark mode test pattern: extract blocking-script logic to pure function, test with vi.fn() mocks for matchMedia"

requirements-completed: [UX-06]

# Metrics
duration: 1min
completed: 2026-03-12
---

# Phase 4 Plan 02: Dark Mode Anti-Flash Script and Color Variants Summary

**Synchronous anti-flash `<script>` in `<head>` sets `.dark` on `<html>` before React renders; utilizationClass() color cells now render with adequate contrast in both light and dark mode**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-12T21:23:51Z
- **Completed:** 2026-03-12T21:25:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced 3 it.todo stubs in darkMode.test.ts with real passing tests (pure function approach)
- Added synchronous blocking anti-flash script to index.html `<head>` (reads matchMedia, sets .dark class before React hydration)
- Updated page title from "cluster-sizer-scaffold" to "Presizion — Cluster Refresh Sizing"
- Added dark: Tailwind variants to all three utilizationClass() branches (green/amber/red)
- Full test suite: 166 tests pass, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill darkMode.test.ts with real tests, then add anti-flash script to index.html** - `8a73569` (feat)
2. **Task 2: Add dark: color variants to utilizationClass in ComparisonTable.tsx** - `d17e4e4` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD tasks — tests written first, verified passing, then implementation added_

## Files Created/Modified
- `index.html` - Added synchronous anti-flash script in `<head>`, updated title to "Presizion — Cluster Refresh Sizing"
- `src/__tests__/darkMode.test.ts` - Replaced 3 it.todo stubs with real unit tests using applyDarkModeClass() pure function pattern
- `src/components/step3/ComparisonTable.tsx` - Added dark:text-red-400 / dark:text-amber-400 / dark:text-green-400 variants to utilizationClass()

## Decisions Made
- Pure function extraction for anti-flash script: test the logic as applyDarkModeClass() rather than DOM-testing index.html directly — cleaner, framework-agnostic, avoids jsdom matchMedia mocking complexity
- Dark color pairing: text-*-600 (light) / dark:text-*-400 (dark) — 400 shades are lighter and provide adequate contrast on dark backgrounds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - both TDD cycles completed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dark mode is fully wired: OS preference detected before first paint, all color-coded cells render correctly in both modes
- Manual smoke test needed: set OS to dark mode, run `npm run dev`, visit http://localhost:5173/presizion/ to confirm no white flash and dark colors are applied
- Phase 04-03 (if any) can build on the established dark mode infrastructure

---
*Phase: 04-deployment-and-polish*
*Completed: 2026-03-12*
