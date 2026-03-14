---
phase: 13-import-scope-filter
plan: 01
subsystem: import
tags: [typescript, vitest, tdd, rvtools, liveoptics, scope-detection, xlsx]

# Dependency graph
requires:
  - phase: 12-dark-mode-toggle
    provides: completed baseline — 254 tests, 0 ESLint errors

provides:
  - ClusterImportResult extended with detectedScopes, scopeLabels, rawByScope fields
  - CLUSTER_ALIASES and DATACENTER_ALIASES in columnResolver.ts
  - Scope-aware rvtoolsParser producing per-cluster rawByScope map
  - Scope-aware liveopticParser producing per-cluster/datacenter rawByScope map
  - scopeAggregator.ts exporting aggregateScopes() pure function for re-aggregating subsets of scopes

affects:
  - 14-persistent-scope-widget (UI wave 2 consuming detectedScopes + rawByScope)
  - Any future import extension needing cluster scope context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ScopeAccum accumulator pattern: accumulate raw row totals (vcpus, memMib, diskMib, vmCount) in a Map during row iteration, then derive final values after the loop"
    - "Scope key format: dc||cluster when both present, cluster when cluster-only, __all__ when neither column exists"
    - "ScopeData type alias (Omit<ClusterImportResult, 'sourceFormat' | 'detectedScopes' | 'scopeLabels' | 'rawByScope'>) shared across parsers and aggregator"

key-files:
  created:
    - src/lib/utils/import/scopeAggregator.ts
    - src/lib/utils/import/__tests__/scopeAggregator.test.ts
  modified:
    - src/lib/utils/import/index.ts
    - src/lib/utils/import/columnResolver.ts
    - src/lib/utils/import/rvtoolsParser.ts
    - src/lib/utils/import/liveopticParser.ts
    - src/lib/utils/import/__tests__/columnResolver.test.ts
    - src/lib/utils/import/__tests__/rvtoolsParser.test.ts
    - src/lib/utils/import/__tests__/liveopticParser.test.ts

key-decisions:
  - "ScopeData type alias defined in index.ts to avoid circular imports between parsers and scopeAggregator"
  - "rawByScope marked optional (?: Map<...>) in ClusterImportResult to avoid JSON.stringify issues; parsers always populate it"
  - "Per-scope rawByScope entries omit ESX fields (totalPcores, etc.) — host-to-cluster mapping not available at parse time"
  - "aggregateScopes copies ESX fields from first selected scope that has them defined (not all scopes have ESX data)"
  - "scopeLabels format: 'cluster (dc)' when both present, cluster name alone when cluster-only, 'All' for __all__"

patterns-established:
  - "TDD RED-GREEN pattern: write failing tests first, then implement, then commit in single atomic commit"
  - "ScopeAccum intermediate type for accumulating raw MiB values before final conversion"

requirements-completed: [SCOPE-01]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 13 Plan 01: Import Scope Filter Summary

**Scope-aware RVTools and LiveOptics parsers with per-cluster rawByScope maps, CLUSTER/DATACENTER column aliases, and aggregateScopes() re-aggregation utility for Wave 2 UI consumption**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T20:40:56Z
- **Completed:** 2026-03-13T20:45:05Z
- **Tasks:** 1 (TDD: RED + GREEN combined)
- **Files modified:** 9

## Accomplishments

- Extended ClusterImportResult with three new optional fields: detectedScopes, scopeLabels, rawByScope
- Updated rvtoolsParser and liveopticParser to detect cluster/datacenter column variants using CLUSTER_ALIASES/DATACENTER_ALIASES and produce per-scope sub-aggregates
- Created scopeAggregator.ts with aggregateScopes() pure function that sums numeric fields, computes weighted-average RAM, flattens warnings, and copies ESX fields from first scope that has them
- Added 23 new tests across 4 test files; all 296 tests passing; 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD RED+GREEN - Scope detection + aggregation** - `5a05dd9` (feat)

_Note: TDD tasks may have multiple commits (test -> feat -> refactor); RED and GREEN were combined in single commit._

## Files Created/Modified

- `src/lib/utils/import/index.ts` - Added ScopeData type alias + detectedScopes/scopeLabels/rawByScope to ClusterImportResult
- `src/lib/utils/import/columnResolver.ts` - Added CLUSTER_ALIASES and DATACENTER_ALIASES exports
- `src/lib/utils/import/rvtoolsParser.ts` - Scope detection using ScopeAccum pattern, builds detectedScopes/scopeLabels/rawByScope
- `src/lib/utils/import/liveopticParser.ts` - Same scope detection in aggregate() function; ESX fields stay on top-level only
- `src/lib/utils/import/scopeAggregator.ts` - New file: aggregateScopes() pure function
- `src/lib/utils/import/__tests__/columnResolver.test.ts` - 6 new tests for CLUSTER_ALIASES and DATACENTER_ALIASES
- `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` - 5 new scope detection tests
- `src/lib/utils/import/__tests__/liveopticParser.test.ts` - 4 new scope detection tests (xlsx path)
- `src/lib/utils/import/__tests__/scopeAggregator.test.ts` - New file: 8 aggregateScopes tests

## Decisions Made

- ScopeData type alias defined in index.ts to avoid circular imports between parsers and scopeAggregator
- rawByScope marked optional (?: Map<...>) in ClusterImportResult to avoid JSON.stringify issues; parsers always populate it
- Per-scope rawByScope entries omit ESX fields — host-to-cluster mapping not available at parse time
- aggregateScopes copies ESX fields from first selected scope that has them defined
- scopeLabels format: 'cluster (dc)' when both present, cluster name alone when cluster-only, 'All' for **all**

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 (UI) in Phase 14 can now consume detectedScopes, scopeLabels, rawByScope from importFile()
- aggregateScopes() is available for the scope-selection modal to re-aggregate selected scopes into a ClusterImportResult
- All 296 tests passing; TypeScript strict mode; 0 ESLint errors expected

---
_Phase: 13-import-scope-filter_
_Completed: 2026-03-13_
