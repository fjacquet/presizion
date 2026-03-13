---
phase: 12-dark-mode-toggle
plan: "01"
subsystem: ui
tags: [zustand, theme, dark-mode, localStorage, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "useThemeStore Zustand store with Theme type (light/dark/system), setTheme, resolvedTheme"
  - "Anti-flash script in index.html checks localStorage before OS matchMedia"
affects: [12-02, ThemeToggle component, any component consuming useThemeStore]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store initialized from localStorage at module load time"
    - "DOM side-effect (classList.toggle) inside setTheme action"
    - "resolvedTheme() reads OS pref via window.matchMedia as late-binding function"
    - "Anti-flash inline script uses var + try/catch for pre-parse safety"

key-files:
  created:
    - src/store/useThemeStore.ts
    - src/store/__tests__/useThemeStore.test.ts
  modified:
    - index.html

key-decisions:
  - "Tests mock localStorage via vi.stubGlobal before module import to capture module-load-time readStored()"
  - "Anti-flash script uses var (not const/let) for maximum pre-parse context compatibility"
  - "STORAGE_KEY constant 'presizion-theme' is the single source of truth across store and anti-flash script"

patterns-established:
  - "Pattern: Zustand stores can have DOM side-effects in actions (classList.toggle) — justified for theme synchronization"
  - "Pattern: resolvedTheme is a function (not state) to ensure it reads live matchMedia at call time"

requirements-completed: [THEME-02, THEME-03]

# Metrics
duration: 3min
completed: "2026-03-13"
---

# Phase 12 Plan 01: useThemeStore + Anti-flash Script Summary

**Zustand theme store (light/dark/system) with localStorage persistence, DOM class sync, and anti-flash index.html inline script**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T20:24:26Z
- **Completed:** 2026-03-13T20:27:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented useThemeStore with full Theme type (light/dark/system), setTheme and resolvedTheme
- Wrote 10 behavior tests covering localStorage init, DOM class toggling, and matchMedia OS pref mocking
- Updated index.html anti-flash script to read localStorage first before falling back to OS preference

## Task Commits

Each task was committed atomically:

1. **Task 1: useThemeStore TDD (RED -> GREEN)** - `e528a9c` (feat)
2. **Task 2: Update index.html anti-flash script** - `ddd9997` (feat)

_Note: TDD tasks combined RED and GREEN commits — tests were written first, then implementation, verified in single commit._

## Files Created/Modified

- `src/store/useThemeStore.ts` - Zustand store: Theme type, STORAGE_KEY, setTheme with localStorage + classList.toggle, resolvedTheme with matchMedia fallback
- `src/store/__tests__/useThemeStore.test.ts` - 10 vitest tests using vi.stubGlobal for localStorage and matchMedia
- `index.html` - Anti-flash inline script updated to check localStorage('presizion-theme') before OS matchMedia

## Decisions Made

- Tests stub localStorage globally before importing the store module, because readStored() executes at module load time. This ensures the initial theme value is testable via setState() rather than re-importing.
- Anti-flash script uses `var` (not `const`/`let`) to be safe in pre-parse script context.
- The `STORAGE_KEY = 'presizion-theme'` constant in the store matches the hardcoded string in the anti-flash script — a deliberate redundancy for zero-dependency inline script compatibility.

## Deviations from Plan

None — plan executed exactly as written.

The test approach deviated slightly from the plan's suggestion of `vi.stubGlobal` on localStorage in `beforeEach`: because the store module calls `readStored()` at import time, stubbing must happen before the first import. The final solution stubs globals at module scope and uses `useThemeStore.setState()` in tests to set the theme for each test case. This is a test implementation detail, not a behavioral deviation.

## Issues Encountered

- jsdom environment had `localStorage.clear is not a function` — caused by the `--localstorage-file` vitest flag without a valid path. Fixed by switching from `localStorage.clear()` to manually clearing a `Record<string, string>` backing the mock.

## Next Phase Readiness

- useThemeStore is ready for ThemeToggle component consumption (Wave 2 / Plan 02)
- resolvedTheme() function correctly returns 'light' or 'dark' — never 'system'
- No blockers

---
_Phase: 12-dark-mode-toggle_
_Completed: 2026-03-13_

## Self-Check: PASSED

- src/store/useThemeStore.ts: FOUND
- src/store/**tests**/useThemeStore.test.ts: FOUND
- .planning/phases/12-dark-mode-toggle/12-01-SUMMARY.md: FOUND
- Commit e528a9c: FOUND
- Commit ddd9997: FOUND
