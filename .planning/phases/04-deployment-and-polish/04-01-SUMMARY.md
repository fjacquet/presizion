---
phase: 04-deployment-and-polish
plan: 01
subsystem: infra
tags: [vite, github-actions, github-pages, deployment, testing, vitest]

# Dependency graph
requires:
  - phase: 03-comparison-export-and-wizard-shell
    provides: Completed React application with 155 passing tests ready for deployment
provides:
  - Vite base path /presizion/ for correct GitHub Pages asset resolution
  - GitHub Actions CI/CD workflow deploying to GitHub Pages on push to main
  - Wave 0 test stubs for dark mode (3 it.todo) and formula display (6 it.todo)
affects:
  - 04-02 (dark mode plan fills darkMode.test.ts stubs)
  - 04-03 (formula display plan fills display.test.ts stubs)

# Tech tracking
tech-stack:
  added: [github-actions, actions/checkout@v4, actions/setup-node@v4, actions/configure-pages@v5, actions/upload-pages-artifact@v3, actions/deploy-pages@v4]
  patterns: [base-path deployment for GitHub Pages subpath, Wave 0 test stub pattern with it.todo]

key-files:
  created:
    - .github/workflows/deploy.yml
    - src/__tests__/darkMode.test.ts
    - src/lib/sizing/__tests__/display.test.ts
  modified:
    - vite.config.ts

key-decisions:
  - "Wave 0 stubs use it.todo (not it.skip) so Vitest counts as pending not failing — suite exits 0"
  - "GitHub Pages deployment workflow triggers on push to main and workflow_dispatch for manual runs"
  - "base: '/presizion/' added as first field in vite.config.ts defineConfig — before plugins for clarity"

patterns-established:
  - "Wave 0 stub pattern: create it.todo stubs in target test file locations so Wave 2 plans fill real tests against known file paths"
  - "GitHub Pages deploy workflow: separate build and deploy jobs with concurrency group to prevent simultaneous deploys"

requirements-completed: [DEPLOY-01, UX-06]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 4 Plan 01: Deployment Foundation and Wave 0 Test Stubs Summary

**Vite base path /presizion/ configured for GitHub Pages, automated deploy workflow created, and 8 it.todo stubs planted for Wave 2 dark mode and formula display plans**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T21:19:57Z
- **Completed:** 2026-03-12T21:21:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `base: '/presizion/'` to vite.config.ts so all built JS/CSS/favicon assets resolve at the correct GitHub Pages subpath
- Created `.github/workflows/deploy.yml` with build + deploy-pages@v4 jobs, triggered on push to main and workflow_dispatch
- Created `src/__tests__/darkMode.test.ts` (3 it.todo stubs, UX-06) and `src/lib/sizing/__tests__/display.test.ts` (6 it.todo stubs, CALC-07)
- Full test suite: 155 passing + 9 pending (todo), exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add base path to vite.config.ts and create GitHub Actions workflow** - `ffba12d` (chore)
2. **Task 2: Create Nyquist Wave 0 test stubs (darkMode.test.ts and display.test.ts)** - `decdbd0` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `vite.config.ts` - Added `base: '/presizion/'` as first field in defineConfig
- `.github/workflows/deploy.yml` - Two-job CI/CD pipeline: build then deploy-pages@v4
- `src/__tests__/darkMode.test.ts` - 3 it.todo stubs for UX-06 dark mode behavior
- `src/lib/sizing/__tests__/display.test.ts` - 6 it.todo stubs for CALC-07 formula display functions

## Decisions Made

- Wave 0 stubs use `it.todo` (not `it.skip`) so Vitest counts them as pending not failing — test suite always exits 0
- GitHub Pages workflow uses `concurrency: group: pages, cancel-in-progress: false` to avoid race conditions on rapid pushes
- `base: '/presizion/'` placed as first field in defineConfig for clarity of intent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - `npm run build` succeeded on first attempt; Vitest confirmed 8 pending stubs with exit 0.

## User Setup Required

**External services require manual configuration.**

GitHub Pages must be enabled before the deploy workflow can publish:
- Visit: https://github.com/fjacquet/presizion/settings/pages
- Set Source to "GitHub Actions"
- First push to main after this setup will trigger the deploy workflow

## Next Phase Readiness

- Deployment infrastructure is in place; Wave 1 execution can proceed with confidence builds will publish
- darkMode.test.ts stubs ready for Plan 04-02 (dark mode implementation)
- display.test.ts stubs ready for Plan 04-03 (formula display implementation)
- No blockers; all success criteria confirmed

## Self-Check: PASSED

- FOUND: vite.config.ts (contains `base: '/presizion/'`)
- FOUND: .github/workflows/deploy.yml
- FOUND: src/__tests__/darkMode.test.ts
- FOUND: src/lib/sizing/__tests__/display.test.ts
- FOUND: 04-01-SUMMARY.md
- FOUND: commit ffba12d (Task 1 — vite.config.ts + deploy.yml)
- FOUND: commit decdbd0 (Task 2 — Wave 0 stubs)

---
*Phase: 04-deployment-and-polish*
*Completed: 2026-03-12*
