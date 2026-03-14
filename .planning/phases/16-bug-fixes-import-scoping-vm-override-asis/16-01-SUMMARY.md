---
phase: 16-bug-fixes-import-scoping-vm-override-asis
plan: 01
subsystem: import
tags: [rvtools, liveoptics, scoping, esx-hosts, vhost, aggregation, tdd]

# Dependency graph
requires:
  - phase: 13-import-scope-filter
    provides: ScopeData type, rawByScope map, scope detection in parsers
provides:
  - Per-cluster ESX host config (sockets, cores, RAM, pCores, server count) in rawByScope entries
  - Per-cluster CPU/RAM utilization from ESX Performance in rawByScope entries
  - Additive aggregation for pCores/serverCount across scopes
  - Heterogeneous RAM detection with warning
  - Weighted-average utilization by server count
  - RVTools vHost sockets/cores/RAM extraction per cluster
affects: [14-persistent-scope-widget, sizing-engine, step1-current-cluster]

# Tech tracking
tech-stack:
  added: []
  patterns: [host-to-cluster-mapping, per-scope-esx-fields, weighted-average-aggregation]

key-files:
  created: []
  modified:
    - src/lib/utils/import/columnResolver.ts
    - src/lib/utils/import/liveopticParser.ts
    - src/lib/utils/import/rvtoolsParser.ts
    - src/lib/utils/import/scopeAggregator.ts
    - src/lib/utils/import/__tests__/liveopticParser.test.ts
    - src/lib/utils/import/__tests__/rvtoolsParser.test.ts
    - src/lib/utils/import/__tests__/scopeAggregator.test.ts

key-decisions:
  - "Host-to-cluster mapping priority: direct Cluster column on ESX sheet > host column on VMs/vInfo > __all__ fallback with warning"
  - "Additive ESX fields (totalPcores, existingServerCount) are summed; representative fields (sockets, cores/socket) use first scope"
  - "Heterogeneous RAM/server triggers warning string but still uses first cluster value as representative"
  - "CPU/RAM utilization weighted by existingServerCount per scope, not simple average"
  - "RVTools vHost Memory column is MB (divide by 1024 for GB); LiveOptics ESX Hosts Memory is KiB (divide by 1024^2)"

patterns-established:
  - "Per-scope ESX field population: parsers compute ESX fields per hostsByScopeKey then merge into rawByScope entries"
  - "Host-to-cluster mapping: built during VM row iteration, reused by ESX/vHost/Perf blocks"
  - "computeEsxFields helper: shared logic for deriving sockets, cores/socket, RAM, pCores from host group"

requirements-completed: [FIX-SCOPE-01, FIX-SCOPE-02, FIX-SCOPE-03, FIX-SCOPE-04, FIX-SCOPE-05, FIX-SCOPE-06]

# Metrics
duration: 7min
completed: 2026-03-14
---

# Phase 16 Plan 01: Import Scoping Fix Summary

**Per-cluster ESX host config and performance scoping in LiveOptics/RVTools parsers with additive aggregation and heterogeneous RAM warning**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-14T14:12:53Z
- **Completed:** 2026-03-14T14:19:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- LiveOptics parser now populates per-scope ESX host config (existingServerCount, totalPcores, socketsPerServer, coresPerSocket, ramPerServerGb) and per-scope CPU/RAM utilization from ESX Performance sheet
- RVTools parser now extracts per-scope host config from vHost sheet using new cpu_sockets, cpu_cores_total, memory_mb column aliases
- scopeAggregator sums additive fields (totalPcores, existingServerCount) across scopes, detects heterogeneous RAM with warning, and computes weighted-average utilization by server count
- Host-to-cluster mapping uses three-tier priority: direct Cluster column on ESX/vHost sheet, host column on VMs/vInfo mapped to cluster, fallback to __all__ with warning
- All 77 import tests pass; zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for per-scope ESX** - `3ae543a` (test)
2. **Task 1 GREEN: Scope ESX host config and performance per cluster** - `7dc2ae5` (feat)
3. **Task 2 RED: Failing tests for additive ESX aggregation** - `9b8ec4b` (test)
4. **Task 2 GREEN: Sum additive ESX fields and detect heterogeneous RAM** - `ada5379` (fix)

## Files Created/Modified
- `src/lib/utils/import/columnResolver.ts` - Added cluster_name alias to LIVEOPTICS_ESX_HOSTS_ALIASES; added cpu_sockets, cpu_cores_total, memory_mb to RVTOOLS_VHOST_ALIASES
- `src/lib/utils/import/liveopticParser.ts` - aggregate() builds hostToCluster map; ESX Hosts/Performance blocks scope per cluster with 3-tier priority; computeEsxFields helper
- `src/lib/utils/import/rvtoolsParser.ts` - Builds hostToCluster from vInfo Host column; vHost block groups by cluster for per-scope ESX; computeVhostEsxFields helper
- `src/lib/utils/import/scopeAggregator.ts` - Additive totalPcores/existingServerCount; heterogeneous RAM warning; weighted-average utilization
- `src/lib/utils/import/__tests__/liveopticParser.test.ts` - 6 new tests for per-scope ESX host config and performance
- `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` - 4 new tests for per-scope vHost config
- `src/lib/utils/import/__tests__/scopeAggregator.test.ts` - 8 new/updated tests for additive aggregation and heterogeneous RAM

## Decisions Made
- Host-to-cluster mapping priority: direct Cluster column on ESX sheet > host column on VMs/vInfo > __all__ fallback with warning
- Additive ESX fields (totalPcores, existingServerCount) are summed; representative fields (sockets, cores/socket) use first scope
- Heterogeneous RAM/server triggers warning string but still uses first cluster value as representative
- CPU/RAM utilization weighted by existingServerCount per scope, not simple average
- RVTools vHost Memory column is MB (divide by 1024 for GB); LiveOptics ESX Hosts Memory is KiB (divide by 1024^2)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assertion for heterogeneous RAM warning**
- **Found during:** Task 2 (scopeAggregator TDD GREEN)
- **Issue:** `expect.stringContaining` inside `toContain` does not work on arrays -- Vitest `toContain` checks for strict equality
- **Fix:** Changed to `result.warnings.some((w) => w.includes('Heterogeneous RAM'))` pattern
- **Files modified:** src/lib/utils/import/__tests__/scopeAggregator.test.ts
- **Verification:** All 15 scopeAggregator tests pass
- **Committed in:** ada5379 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test assertion fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-scope ESX data now flows through rawByScope, ready for sizing engine to consume
- scopeAggregator handles multi-scope selection correctly with additive and weighted behaviors
- Ready for Phase 16 Plan 02 (VM Override Tests & As-Is Column)

## Self-Check: PASSED

All 7 modified files verified on disk. All 4 commits (3ae543a, 7dc2ae5, 9b8ec4b, ada5379) verified in git log. 77 import tests pass. Zero TypeScript errors.

---
*Phase: 16-bug-fixes-import-scoping-vm-override-asis*
*Completed: 2026-03-14*
