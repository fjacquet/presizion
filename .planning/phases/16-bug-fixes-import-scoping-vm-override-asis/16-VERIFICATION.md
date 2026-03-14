---
phase: 16-bug-fixes-import-scoping-vm-override-asis
verified: 2026-03-14T15:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: null
gaps: []
human_verification: []
---

# Phase 16: Bug Fixes — Import Scoping, VM Override, As-Is Verification Report

**Phase Goal:** Fix all data-integrity bugs that produce incorrect sizing results.
**Verified:** 2026-03-14T15:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Selecting a single cluster scope populates ESX host config fields (ramPerServerGb, socketsPerServer, coresPerSocket, totalPcores, existingServerCount) for that cluster only | VERIFIED | `liveopticParser.ts` lines 112-156 group hosts by scope key with 3-tier priority; `computeEsxFields()` merges fields into `rawByScope.get(scopeKey)`; 6 new tests in `liveopticParser.test.ts` confirm per-scope behavior |
| 2 | Selecting a single cluster scope shows CPU/RAM utilization from hosts in that cluster only | VERIFIED | `liveopticParser.ts` lines 176-225 build `perfByScopeKey` from `hostScopeMap`, compute per-scope avg CPU/RAM, merge into `rawByScope` entries |
| 3 | Selecting 'All' scopes aggregates totalPcores and existingServerCount as sums, ramPerServerGb as representative with heterogeneity warning | VERIFIED | `scopeAggregator.ts` lines 67-125: `sumTotalPcores` and `sumExistingServerCount` are summed; `ramPerServerValues` checked via `new Set` — if `size > 1`, pushes "Heterogeneous RAM/server detected" warning |
| 4 | When ESX Hosts sheet has no cluster column and no host-to-cluster mapping, ESX data falls back to global scope with a warning | VERIFIED | `liveopticParser.ts` lines 132-145: `usedFallback` flag triggers warning "Host-to-cluster mapping unavailable; ESX host config applied globally." |
| 5 | RVTools vHost sheet extracts sockets, cores, and RAM per host, scoped per cluster | VERIFIED | `rvtoolsParser.ts` lines 50-71 (`computeVhostEsxFields`) and lines 180-228 group vHost rows by scope, compute ESX fields, merge into `rawByScope`; 4 new tests in `rvtoolsParser.test.ts` |
| 6 | When targetVmCount overrides VM count, RAM-limited server count uses the overridden count | VERIFIED | `constraints.ts` line 132: `serverCountByRam(effectiveVmCount, ...)` where `effectiveVmCount = scenario.targetVmCount ?? cluster.totalVms`; FIX-VM-01 test confirms `ramLimitedCount=7` for `targetVmCount=200` |
| 7 | When targetVmCount overrides VM count, Disk-limited server count uses the overridden count | VERIFIED | `constraints.ts` lines 141-149: `serverCountByDisk(effectiveVmCount, ...)` uses same `effectiveVmCount`; FIX-VM-02 test confirms `diskLimitedCount=4` for `targetVmCount=200` |
| 8 | As-Is column shows VMs/Server computed as totalVms / existingServerCount | VERIFIED | `ComparisonTable.tsx` lines 175-177: guard `existingServerCount > 0` then `(totalVms / existingServerCount).toFixed(1)`; FIX-ASIS-01 test confirms "15.0" for 300 VMs / 20 servers |
| 9 | As-Is column shows CPU Util % and RAM Util % from imported data | VERIFIED | `ComparisonTable.tsx` lines 209-211 and 235-237: render `cpuUtilizationPercent.toFixed(1)%` and `ramUtilizationPercent.toFixed(1)%` with `\u2014` fallback; FIX-ASIS-02 tests confirm "48.0%" and "65.0%" |
| 10 | As-Is column shows Total Disk Required in disaggregated mode | VERIFIED | `ComparisonTable.tsx` lines 262-264: `layoutMode === 'disaggregated' && currentCluster.totalDiskGb` → `${Math.round(totalDiskGb).toLocaleString()} GB`; FIX-ASIS-03 tests confirm "50,000 GB" in disaggregated, `\u2014` in HCI |
| 11 | As-Is column shows N/A for Limiting Resource and Headroom rows | VERIFIED | `ComparisonTable.tsx` line 130: `<TableCell className="text-center bg-muted/30">N/A</TableCell>` (Limiting Resource); line 189: `N/A` (Headroom); FIX-ASIS-04 tests confirm both cells |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/utils/import/columnResolver.ts` | Extended RVTOOLS_VHOST_ALIASES and LIVEOPTICS_ESX_HOSTS_ALIASES with cluster column | VERIFIED | `cluster_name: ['Cluster', 'cluster', 'Cluster Name']` in LIVEOPTICS_ESX_HOSTS_ALIASES (line 37); `cpu_sockets`, `cpu_cores_total`, `memory_mb` in RVTOOLS_VHOST_ALIASES (lines 25-27) |
| `src/lib/utils/import/liveopticParser.ts` | Per-cluster ESX host config and performance scoping | VERIFIED | `hostToCluster` map built in `aggregate()` (line 271); `computeEsxFields()` helper (line 65); per-scope ESX merge in `parseXlsx()` (lines 112-156); per-scope perf merge (lines 176-225) |
| `src/lib/utils/import/rvtoolsParser.ts` | Per-cluster vHost config scoping with sockets/cores/RAM | VERIFIED | `hostToCluster` map built during vInfo loop (line 100); `computeVhostEsxFields()` helper (line 50); per-scope ESX fields (lines 180-228) |
| `src/lib/utils/import/scopeAggregator.ts` | Additive aggregation for pCores/serverCount, heterogeneity warning for RAM | VERIFIED | Additive sums lines 67-75; heterogeneity check lines 120-126; weighted-average utilization lines 128-134 |
| `src/lib/sizing/__tests__/constraints.test.ts` | VM override test coverage for RAM and disk formulas | VERIFIED | `describe('FIX-VM-01/02: targetVmCount override propagates to RAM and Disk', ...)` block at lines 344-370; 4 tests |
| `src/components/step3/ComparisonTable.tsx` | As-Is column with computed VMs/Server, utilization, disk, and N/A markers | VERIFIED | Lines 130, 175-177, 189, 209-211, 235-237, 262-264 all populate As-Is cells with real data or N/A |
| `src/components/step3/__tests__/ComparisonTable.test.tsx` | Tests for As-Is column data rendering | VERIFIED | `describe('FIX-ASIS: As-Is column data rendering', ...)` block with 9 tests covering all 4 FIX-ASIS requirements |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `liveopticParser.ts` | `columnResolver.ts` | `resolveColumns` called with `LIVEOPTICS_ESX_HOSTS_ALIASES` | WIRED | Lines 101 and 184 call `resolveColumns(Object.keys(firstRow), LIVEOPTICS_ESX_HOSTS_ALIASES, new Set())` |
| `rvtoolsParser.ts` | `columnResolver.ts` | `resolveColumns` called with `RVTOOLS_VHOST_ALIASES` | WIRED | Line 167 calls `resolveColumns(Object.keys(firstRow), RVTOOLS_VHOST_ALIASES, new Set())` |
| `scopeAggregator.ts` | `index.ts` | `ScopeData` type used for per-scope map | WIRED | Line 1 imports `ScopeData from './index'`; function signature `aggregateScopes(rawByScope: Map<string, ScopeData>)` |
| `ComparisonTable.tsx` | `useClusterStore.ts` | `currentCluster` fields accessed for As-Is column | WIRED | Line 42 `const currentCluster = useClusterStore(...)` then all As-Is cells reference `currentCluster.existingServerCount`, `currentCluster.totalVms`, `currentCluster.cpuUtilizationPercent`, `currentCluster.ramUtilizationPercent`, `currentCluster.totalDiskGb` |
| `constraints.test.ts` | `constraints.ts` | `computeScenarioResult` called with scenarios containing `targetVmCount` | WIRED | Lines 347-348 and 360-361 call `computeScenarioResult(VM_OVERRIDE_CLUSTER, { ...VM_OVERRIDE_SCENARIO_BASE, targetVmCount: 200 })` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FIX-SCOPE-01 | 16-01 | LiveOptics ESX host config scoped per cluster, not first host row globally | SATISFIED | `liveopticParser.ts` `computeEsxFields()` + `hostsByScopeKey` grouping; 6 tests pass |
| FIX-SCOPE-02 | 16-01 | Per-scope ScopeData includes host config fields; switching filter updates host config | SATISFIED | `rawByScope.set(scopeKey, { ...existing, ...esxFields })` merges per-cluster ESX into each scope entry |
| FIX-SCOPE-03 | 16-01 | "All" scope sums pCores/serverCount, uses representative RAM with warning | SATISFIED | `scopeAggregator.ts` additive sums + heterogeneity warning confirmed by 8 tests |
| FIX-SCOPE-04 | 16-01 | ESX Performance CPU/RAM utilization scoped per cluster | SATISFIED | `liveopticParser.ts` `perfByScopeKey` grouping; per-scope avg CPU/RAM merged into `rawByScope` |
| FIX-SCOPE-05 | 16-01 | Fallback to global scope with warning when no cluster column on ESX Hosts | SATISFIED | `usedFallback` flag + "Host-to-cluster mapping unavailable" warning |
| FIX-SCOPE-06 | 16-01 | RVTools vHost scoping gap audited and fixed | SATISFIED | `rvtoolsParser.ts` `computeVhostEsxFields()` + per-scope grouping; 4 new tests pass |
| FIX-VM-01 | 16-02 | targetVmCount override: RAM-limited formula uses overridden count | SATISFIED | `constraints.ts` line 132 uses `effectiveVmCount`; 2 tests confirm correct values |
| FIX-VM-02 | 16-02 | targetVmCount override: Disk-limited formula uses overridden count | SATISFIED | `constraints.ts` line 144 uses `effectiveVmCount`; 2 tests confirm correct values |
| FIX-ASIS-01 | 16-02 | As-Is column shows VMs/Server as totalVms / existingServerCount | SATISFIED | `ComparisonTable.tsx` lines 175-177; FIX-ASIS-01 tests confirm "15.0" |
| FIX-ASIS-02 | 16-02 | As-Is column shows CPU Util % and RAM Util % from imported data | SATISFIED | `ComparisonTable.tsx` lines 209-211 and 235-237; FIX-ASIS-02 tests confirm "48.0%" and "65.0%" |
| FIX-ASIS-03 | 16-02 | As-Is column shows Total Disk from totalDiskGb | SATISFIED | `ComparisonTable.tsx` lines 262-264; FIX-ASIS-03 tests confirm "50,000 GB" in disaggregated |
| FIX-ASIS-04 | 16-02 | N/A shown for non-applicable As-Is cells | SATISFIED | `ComparisonTable.tsx` lines 130 and 189; FIX-ASIS-04 tests confirm both cells |

All 12 requirement IDs are accounted for. No orphaned requirements were found for Phase 16.

---

## Anti-Patterns Found

No blockers or warnings detected.

Scan results for files modified in Phase 16:

| File | TODO/FIXME | Empty returns | console.log only | Severity |
|------|------------|---------------|-----------------|----------|
| `columnResolver.ts` | 0 | 0 | 0 | None |
| `liveopticParser.ts` | 0 | 0 | 0 | None |
| `rvtoolsParser.ts` | 0 | 0 | 0 | None |
| `scopeAggregator.ts` | 0 | 0 | 0 | None |
| `constraints.test.ts` | 0 | 0 | 0 | None |
| `ComparisonTable.tsx` | 0 | 0 | 0 | None |
| `ComparisonTable.test.tsx` | 0 | 0 | 0 | None |

---

## Human Verification Required

None. All goal truths are mechanically verifiable — the fixes address data computation and rendering, which are fully covered by the 409-test suite.

---

## Test Run Summary

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| `liveopticParser.test.ts` | included in import suite | — | — |
| `rvtoolsParser.test.ts` | included in import suite | — | — |
| `scopeAggregator.test.ts` | included in import suite | — | — |
| Import suite (3 files) | 53 | 53 | 0 |
| `constraints.test.ts` | 36 | 36 | 0 |
| `ComparisonTable.test.tsx` | 29 | 29 | 0 |
| **Full suite** | **409** | **409** | **0** |
| TypeScript (`tsc --noEmit`) | — | — | 0 errors |

---

## Commit Verification

All documented commits exist in git history:

| Hash | Description |
|------|-------------|
| `3ae543a` | test(16-01): add failing tests for per-scope ESX host config and performance |
| `7dc2ae5` | feat(16-01): scope ESX host config and performance per cluster in both parsers |
| `9b8ec4b` | test(16-01): add failing tests for additive ESX aggregation and heterogeneous RAM warning |
| `ada5379` | fix(16-01): sum additive ESX fields and detect heterogeneous RAM in scopeAggregator |
| `4d4389c` | test(16-02): add VM override tests for RAM and Disk formulas |
| `c3f7ede` | test(16-02): add failing FIX-ASIS tests for As-Is column data rendering |
| `c249a7c` | feat(16-02): populate As-Is column with real computed values |

---

## Gaps Summary

No gaps. All 12 requirements (FIX-SCOPE-01..06, FIX-VM-01..02, FIX-ASIS-01..04) are implemented with substantive code, correct wiring, and passing tests. The phase goal — "Fix all data-integrity bugs that produce incorrect sizing results" — is fully achieved.

---

_Verified: 2026-03-14T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
