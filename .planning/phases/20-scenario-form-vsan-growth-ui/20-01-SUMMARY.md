---
phase: 20-scenario-form-vsan-growth-ui
plan: 01
subsystem: ui
tags: [react, zod, vsan, growth, form, collapsible, scenario-card]

# Dependency graph
requires:
  - phase: 18-vsan-sizing-engine
    provides: vsanConstants (FTT_POLICY_MAP, COMPRESSION_FACTOR_LABELS), defaults re-exports
  - phase: 19-capacity-breakdown-growth
    provides: growth field definitions in Scenario interface
provides:
  - 9 new optional Zod schema fields for vSAN and growth in scenarioSchema
  - VsanGrowthSection collapsible sub-component for ScenarioCard
  - Full form integration wired through existing reactive form.watch loop
affects: [21-vsan-charts, 22-final-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [collapsible-section-with-aria, controller-native-select, conditional-layoutmode-rendering]

key-files:
  created:
    - src/components/step2/VsanGrowthSection.tsx
    - src/components/step2/__tests__/VsanGrowthSection.test.tsx
  modified:
    - src/schemas/scenarioSchema.ts
    - src/components/step2/ScenarioCard.tsx

key-decisions:
  - "Native <select> for FTT/Compression dropdowns (consistent with Input styling via Tailwind classes)"
  - "Controlled collapse state in ScenarioCard (open/onToggle props), not internal VsanGrowthSection state"
  - "No .default() on vsanSlackPercent/vsanCpuOverheadPercent/vsanMemoryPerHostGb -- absent = legacy path (VSAN-12)"

patterns-established:
  - "Collapsible section pattern: button[aria-expanded] + conditional render + ChevronDown rotation"
  - "Controller + native <select> pattern for enum dropdowns in form sections"

requirements-completed: [FORM-01, FORM-02, FORM-03, FORM-04]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 20 Plan 01: vSAN & Growth Form Section Summary

**Collapsible vSAN & Growth section with 9 form fields (FTT policy, compression, slack, CPU overhead, memory/host, VM swap, CPU/memory/storage growth) wired through reactive form.watch loop for live sizing updates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T05:43:45Z
- **Completed:** 2026-03-15T05:47:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended scenarioSchema with 9 new optional Zod fields (6 vSAN + 3 growth) preserving VSAN-12 legacy path
- Created VsanGrowthSection sub-component (~230 lines) with collapsible toggle, HCI-conditional vSAN fields, and always-visible growth fields
- Integrated into ScenarioCard with zero changes to the existing reactive form.watch -> updateScenario loop
- All 12 new FORM-01..04 tests pass, 512 total tests pass, tsc -b clean

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for FORM-01..04** - `47dd6fb` (test)
2. **Task 1 (GREEN): Schema + VsanGrowthSection + ScenarioCard integration** - `a433fe2` (feat)
3. **Task 2: Full regression + build verification** - `f647bef` (fix: unused import)

## Files Created/Modified
- `src/schemas/scenarioSchema.ts` - 9 new optional vSAN/growth Zod fields
- `src/components/step2/VsanGrowthSection.tsx` - Collapsible vSAN & Growth form sub-component
- `src/components/step2/ScenarioCard.tsx` - Import + state + JSX integration of VsanGrowthSection
- `src/components/step2/__tests__/VsanGrowthSection.test.tsx` - 12 test cases for FORM-01..04

## Decisions Made
- Used native `<select>` for FTT Policy and Compression Factor dropdowns (matching Input styling via shared Tailwind classes) rather than a custom shadcn Select -- simpler, no additional dependency
- Controlled collapse state lives in ScenarioCard (open/onToggle props), keeping VsanGrowthSection purely presentational
- No `.default()` on optional numeric vSAN fields -- absent = legacy sizing path per VSAN-12 decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused VsanCompressionFactor type import**
- **Found during:** Task 2 (tsc -b build check)
- **Issue:** VsanCompressionFactor type imported but not used in VsanGrowthSection.tsx (TS6133)
- **Fix:** Removed unused import
- **Files modified:** src/components/step2/VsanGrowthSection.tsx
- **Verification:** tsc -b compiles cleanly
- **Committed in:** f647bef (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial unused import cleanup. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All vSAN and growth form fields are wired and reactive -- Phase 21 (charts) can render vSAN breakdown data
- Schema validation ensures type-safe data flow from form to Zustand store to sizing engine
- No blockers for subsequent phases

---
*Phase: 20-scenario-form-vsan-growth-ui*
*Completed: 2026-03-15*
