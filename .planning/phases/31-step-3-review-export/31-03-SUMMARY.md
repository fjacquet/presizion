---
phase: 31-step-3-review-export
plan: "03"
subsystem: ui
tags: [react, mobile, drawer, ios, pdf, pptx, export, hook]

# Dependency graph
requires:
  - phase: 29-step-1-mobile-form-layout
    provides: shadcn Drawer component and useIsMobile local hook pattern
  - phase: 31-step-3-review-export
    provides: plan 01 ComparisonTable and plan 02 chart responsive height

provides:
  - Shared useIsMobile hook at src/hooks/useIsMobile.ts
  - Mobile bottom-sheet export Drawer in Step3ReviewExport
  - iOS Safari PDF fallback (window.open bloburi)
  - iOS Safari PPTX guard with toast

affects:
  - Any future component needing mobile detection (use shared hook)
  - export utilities that may need iOS-aware download handling

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared useIsMobile hook extracted to src/hooks/ for reuse across components
    - iOS detection via /iphone|ipad|ipod/i.test(navigator.userAgent) in callers
    - Pre-open window.open synchronously before async PDF work (iOS popup blocker prevention)
    - Conditional desktop flat row / mobile Drawer render with isMobile boolean

key-files:
  created:
    - src/hooks/useIsMobile.ts
  modified:
    - src/components/step1/ImportPreviewModal.tsx
    - src/components/step3/Step3ReviewExport.tsx
    - src/lib/utils/exportPdf.ts
    - src/components/step3/__tests__/Step3ReviewExport.test.tsx
    - src/lib/utils/__tests__/exportPdf.test.ts

key-decisions:
  - "useIsMobile extracted to shared src/hooks/useIsMobile.ts — ImportPreviewModal now imports from shared hook"
  - "iOS PDF: caller pre-opens about:blank window synchronously before async export to bypass iOS popup blocker"
  - "iOS PPTX: guard is in the caller (Step3ReviewExport) not in exportPptx.ts — keeps export utility agnostic"
  - "exportPdf return type changed from void to { openedInNewTab: boolean } to communicate iOS path to caller"
  - "String() coercion used for blobUri instead of type assertion to satisfy TS strict on URL|string union"

patterns-established:
  - "Shared mobile detection: import { useIsMobile } from '@/hooks/useIsMobile' — do not redefine locally"
  - "iOS export pattern: detect isIOS, pre-open window synchronously, pass to export utility, show toast on success"

requirements-completed: [REVIEW-03, REVIEW-04, REVIEW-05]

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 31 Plan 03: Mobile Export Drawer + iOS Safari PDF/PPTX Fallbacks Summary

**Shared useIsMobile hook, bottom-sheet Drawer on mobile for all 6 export options, iOS PDF window.open fallback, and iOS PPTX toast guard — 653 tests green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T09:54:01Z
- **Completed:** 2026-03-16T10:00:25Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extracted `useIsMobile` from ImportPreviewModal into shared `src/hooks/useIsMobile.ts`, imported by both ImportPreviewModal and Step3ReviewExport
- Step3ReviewExport renders a single "Export / Share" Drawer trigger on mobile (all 6 export options in scrollable bottom sheet) and the flat 6-button row on desktop
- iOS PDF: `handleExportPdf` detects iOS, pre-opens `about:blank` synchronously before any async work, passes window to `exportPdf`, shows toast on success
- iOS PPTX: `handleExportPptx` guards early with `toast.info` on iOS — `exportPptx` is never called
- `exportPdf` return type changed to `{ openedInNewTab: boolean }` for caller feedback
- Full test suite passes: 653 tests (4 new tests covering mobile Drawer, desktop row, iOS PDF window.open, iOS PPTX toast)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract useIsMobile hook + mobile Drawer** - `ec92a7a` (feat)
2. **Task 2: iOS PDF fallback + PPTX guard + tests** - `b77a186` (feat)

## Files Created/Modified

- `src/hooks/useIsMobile.ts` - Shared hook: matchMedia (max-width: 639px) with SSR guard and resize listener
- `src/components/step1/ImportPreviewModal.tsx` - Removed local useIsMobile, imports from shared hook
- `src/components/step3/Step3ReviewExport.tsx` - Adds Drawer imports, isMobile hook, conditional mobile/desktop render, iOS guards in handlers
- `src/lib/utils/exportPdf.ts` - Adds optional iosWindow parameter, returns { openedInNewTab }, iOS blob URI path
- `src/components/step3/__tests__/Step3ReviewExport.test.tsx` - Added matchMedia mock + 4 new REVIEW-03/04 tests + vi.mock for exportPdf/exportPptx/sonner
- `src/lib/utils/__tests__/exportPdf.test.ts` - Updated return type assertion, added output mock to MockJsPDF

## Decisions Made

- useIsMobile extracted to shared hook (rather than duplicating in each component)
- iOS PDF uses pre-opened window + bloburi navigation (avoids popup blocker on iOS Safari)
- iOS PPTX guard lives in caller, not in exportPptx.ts (keeps export utility platform-agnostic)
- exportPdf return type void -> `{ openedInNewTab: boolean }` (enables caller to show contextual toast)
- `String()` coercion instead of `as string` cast for blobUri (satisfies TypeScript strict on `URL | string` union)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exportPdf.test.ts return type assertion after signature change**
- **Found during:** Task 2 (iOS PDF fallback implementation)
- **Issue:** Existing test `.resolves.toBeUndefined()` failed after exportPdf return type changed from void to `{ openedInNewTab: boolean }`
- **Fix:** Changed assertion to `.resolves.toMatchObject({ openedInNewTab: false })`, added `output` mock to MockJsPDF
- **Files modified:** src/lib/utils/__tests__/exportPdf.test.ts
- **Verification:** All 653 tests pass including exportPdf test suite
- **Committed in:** b77a186 (Task 2 commit)

**2. [Rule 1 - Bug] Added matchMedia mock to Step3ReviewExport.test.tsx**
- **Found during:** Task 1 verification (useIsMobile integration)
- **Issue:** Existing tests failed with `TypeError: window.matchMedia is not a function` when useIsMobile hook was added to Step3ReviewExport
- **Fix:** Added `Object.defineProperty(window, 'matchMedia', ...)` in beforeEach defaulting to matches: false (desktop)
- **Files modified:** src/components/step3/__tests__/Step3ReviewExport.test.tsx
- **Verification:** All 13 tests pass
- **Committed in:** ec92a7a (Task 1 commit)

**3. [Rule 1 - Bug] Used String() coercion for blobUri instead of type cast**
- **Found during:** Task 2 TypeScript check
- **Issue:** `doc.output('bloburi') as string` caused TS2352 — `URL` and `string` don't overlap sufficiently
- **Fix:** Changed to `String(doc.output('bloburi'))` which coerces safely
- **Files modified:** src/lib/utils/exportPdf.ts
- **Verification:** `npx tsc -b` clean
- **Committed in:** b77a186 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All auto-fixes necessary for correctness/type safety. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 31 plans 01-03 all complete: ComparisonTable horizontal scroll, chart responsive heights, and mobile export Drawer with iOS guards
- Phase 31 is fully complete
- For iOS Safari acceptance testing: physical iPhone device access needed to verify PDF opens in new tab and PPTX toast shows correctly (per STATE.md blocker note)

---
*Phase: 31-step-3-review-export*
*Completed: 2026-03-16*
