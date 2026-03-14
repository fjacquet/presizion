---
phase: 18-vsan-formula-engine
verified: 2026-03-14T22:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 18: vSAN Formula Engine Verification Report

**Phase Goal:** The sizing library can compute vSAN-aware storage demand (raw vs usable with FTT, metadata, swap, slack), deduct vSAN CPU overhead from available cores, and deduct vSAN memory per host — all as pure TypeScript functions with unit tests, with no UI dependency.
**Verified:** 2026-03-14T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Given a usable storage demand and an FTT policy, computeVsanStorageRaw returns correct raw storage for all six policy options (5 policies + none fallback) | VERIFIED | vsanFormulas.test.ts lines 17-101: 6 tests cover mirror-1, mirror-2, raid5, raid6, default compression, zero-guard |
| 2 | Compression/dedup factor reduces effective storage demand before FTT multiplication, not after | VERIFIED | vsanFormulas.ts lines 78-87: Step 1 (compression) explicitly precedes Step 3 (FTT); VSAN-09 comment in JSDoc header |
| 3 | vSAN metadata overhead (2% of usable) and configurable slack space (default 25%) are added to the raw storage total | VERIFIED | vsanFormulas.ts lines 90-94: raw += usableGib * VSAN_METADATA_OVERHEAD_RATIO; rawWithSlack = raw / slackFraction |
| 4 | vSAN CPU overhead (default 10%) reduces available GHz per node | VERIFIED | vsanFormulas.ts lines 113-118: computeVsanEffectiveGhzPerNode returns nodeGhz * (1 - pct/100); constraints.ts lines 116-119 wires this into CALC-01-GHZ |
| 5 | vSAN memory overhead per host (default 6 GB) reduces available RAM per node | VERIFIED | vsanFormulas.ts lines 136-141: computeVsanEffectiveRamPerNode returns Math.max(0, ramPerNodeGb - memGb); constraints.ts lines 142-144 wires this into CALC-02 |
| 6 | FTT policy enforces correct minimum node floor (Mirror FTT=1: 3, FTT=2: 5, FTT=3: 7, RAID-5: 4, RAID-6: 6) | VERIFIED | vsanConstants.ts lines 43-47: FTT_POLICY_MAP with minNodes per policy; vsanFormulas.test.ts lines 150-183: 6 min-node floor tests all pass |
| 7 | serverCountByVsanStorage returns correct server counts with min-node floor enforcement | VERIFIED | vsanFormulas.ts lines 172-198: Math.max(storageCount, minNodes); all 19 unit tests pass |
| 8 | When scenario.vsanFttPolicy is set, CALC-03 uses vSAN storage pipeline instead of legacy serverCountByDisk | VERIFIED | constraints.ts lines 155-171: else if (scenario.vsanFttPolicy) branch calls serverCountByVsanStorage; integration test at line 420 passes |
| 9 | When scenario.vsanFttPolicy is absent, CALC-03 uses legacy serverCountByDisk path unchanged (VSAN-12) | VERIFIED | constraints.ts lines 172-180: else branch calls serverCountByDisk unchanged; integration regression test at line 433 verifies exact legacy values |
| 10 | When scenario.vsanMemoryPerHostGb is set, CALC-02 deducts vSAN memory per host from available RAM per node | VERIFIED | constraints.ts lines 142-144: effectiveRamPerServerGb conditional; integration test at line 474 proves 512 - 6 = 506 effective RAM |
| 11 | When scenario.vsanCpuOverheadPercent is set in GHz mode, CALC-01-GHZ deducts vSAN CPU overhead from available GHz per node | VERIFIED | constraints.ts lines 116-119: effectiveTargetFreqGhz conditional; integration test at line 509 shows 8 vs 7 servers with/without vSAN CPU overhead |
| 12 | FTT min-node floor is enforced by the vSAN storage path, raising final server count when storage count is below the floor | VERIFIED | Integration test at line 459: mirror-2 on 3 VMs → diskLimitedCount = 5 (not 1) |
| 13 | createDefaultScenario still returns a valid Scenario with no vSAN fields (legacy-compatible) | VERIFIED | defaults.ts lines 56-71: createDefaultScenario() has no vSAN fields; existing constraints tests all pass without vSAN fields |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/sizing/vsanConstants.ts` | FTT policy map, compression factor types, overhead default constants | VERIFIED | 85 lines; exports VsanFttPolicy, FttPolicySpec, FTT_POLICY_MAP (raid5 = 1+1/3), VsanCompressionFactor, COMPRESSION_FACTOR_LABELS, VSAN_METADATA_OVERHEAD_RATIO=0.02, VSAN_DEFAULT_SLACK_PERCENT=25, VSAN_DEFAULT_CPU_OVERHEAD_PCT=10, VSAN_DEFAULT_MEMORY_PER_HOST_GB=6 |
| `src/lib/sizing/vsanFormulas.ts` | Pure vSAN formula functions (storage pipeline, CPU/RAM overhead, server count) | VERIFIED | 199 lines; exports computeVsanStorageRaw (5-step pipeline), computeVsanEffectiveGhzPerNode, computeVsanEffectiveRamPerNode, serverCountByVsanStorage; zero-guards on compressionFactor and rawPerNodeGib; no UI imports |
| `src/lib/sizing/__tests__/vsanFormulas.test.ts` | Unit tests for all vSAN formulas with reference values | VERIFIED | 184 lines (min_lines: 120 satisfied); 19 tests covering all formula functions and edge cases; all pass |
| `src/types/cluster.ts` | Scenario interface extended with optional vSAN fields | VERIFIED | Lines 48-54: 6 optional vSAN fields with correct type imports from vsanConstants.ts; no breaking changes to existing fields |
| `src/lib/sizing/constraints.ts` | computeScenarioResult with conditional vSAN branches in CALC-01-GHZ, CALC-02, CALC-03 | VERIFIED | Lines 11-16: imports from vsanFormulas and vsanConstants; three-way CALC-03 (disaggregated/vSAN/legacy); CALC-02 effectiveRamPerServerGb; CALC-01-GHZ effectiveTargetFreqGhz |
| `src/lib/sizing/defaults.ts` | createDefaultScenario unchanged, with optional vSAN default constants exported | VERIFIED | Lines 1-9: re-exports 3 vSAN constants for Phase 20; createDefaultScenario() unchanged (no vSAN fields) |
| `src/lib/sizing/__tests__/constraints.test.ts` | Integration tests for vSAN-enabled scenarios through computeScenarioResult | VERIFIED | 579 lines; lines 387-577: 8 vSAN integration tests in dedicated describe block; all 43 constraints tests pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/sizing/vsanFormulas.ts` | `src/lib/sizing/vsanConstants.ts` | imports FTT_POLICY_MAP, overhead constants | WIRED | Line 16-22: imports FTT_POLICY_MAP, VSAN_METADATA_OVERHEAD_RATIO, VSAN_DEFAULT_SLACK_PERCENT, VSAN_DEFAULT_CPU_OVERHEAD_PCT, VSAN_DEFAULT_MEMORY_PER_HOST_GB |
| `src/lib/sizing/vsanFormulas.ts` | `src/lib/sizing/vsanConstants.ts` | VsanFttPolicy type used in all function signatures | WIRED | Line 23: import type { VsanFttPolicy }; used in VsanStorageParams (line 36), serverCountByVsanStorage (line 175) |
| `src/lib/sizing/constraints.ts` | `src/lib/sizing/vsanFormulas.ts` | imports serverCountByVsanStorage, computeVsanEffectiveGhzPerNode, computeVsanEffectiveRamPerNode | WIRED | Lines 11-15: multi-line import block; all three functions actively used in computation paths |
| `src/lib/sizing/constraints.ts` | `src/lib/sizing/vsanConstants.ts` | imports VSAN_DEFAULT_SLACK_PERCENT for default parameter | WIRED | Line 16: import { VSAN_DEFAULT_SLACK_PERCENT }; used at line 169 in CALC-03 vSAN path |
| `src/lib/sizing/constraints.ts` | `src/types/cluster.ts` | reads scenario.vsanFttPolicy to branch between vSAN and legacy paths | WIRED | Lines 117, 142, 158, 164: four uses of scenario.vsanFttPolicy as branch gate |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VSAN-01 | 18-01 | FTT policy selection (5 policies) | SATISFIED | VsanFttPolicy type in vsanConstants.ts: 'mirror-1'\|'mirror-2'\|'mirror-3'\|'raid5'\|'raid6'; Scenario.vsanFttPolicy optional field |
| VSAN-02 | 18-01 | Storage Raw = Usable * FTT multiplier | SATISFIED | vsanFormulas.ts Step 3: raw = effectiveUsable * policy.multiplier; multipliers in FTT_POLICY_MAP |
| VSAN-03 | 18-01 | Metadata overhead ~2% of usable | SATISFIED | VSAN_METADATA_OVERHEAD_RATIO = 0.02; vsanFormulas.ts line 90: raw += usableGib * VSAN_METADATA_OVERHEAD_RATIO |
| VSAN-04 | 18-01 | VM swap overhead toggle (default OFF) | SATISFIED | VsanStorageParams.vmSwapEnabled optional; Step 2 in computeVsanStorageRaw; Scenario.vsanVmSwapEnabled optional field |
| VSAN-05 | 18-01 | Slack space percentage (default 25%) | SATISFIED | VSAN_DEFAULT_SLACK_PERCENT = 25; slackPercent optional param with default |
| VSAN-06 | 18-01/02 | CPU overhead (default 10%) deducted per node | SATISFIED | computeVsanEffectiveGhzPerNode; CALC-01-GHZ conditional in constraints.ts lines 116-119; integration test at line 509 |
| VSAN-07 | 18-01/02 | Memory overhead per host (default 6 GB) | SATISFIED | computeVsanEffectiveRamPerNode with default 6 GB; CALC-02 conditional in constraints.ts lines 142-144 |
| VSAN-08 | 18-01 | Compression/dedup factor (1.0/1.3/1.5/2.0/3.0) | SATISFIED | VsanCompressionFactor type; COMPRESSION_FACTOR_LABELS; VsanStorageParams.compressionFactor; Scenario.vsanCompressionFactor |
| VSAN-09 | 18-01 | Compression BEFORE FTT multiplication | SATISFIED | vsanFormulas.ts Steps 1 then 3; JSDoc comment "VSAN-09 invariant: compression BEFORE FTT"; tests verify this ordering |
| VSAN-10 | 18-01 | GiB internal computation | SATISFIED | Module JSDoc: "All *Gb/*Gib values from Scenario are treated as GiB (binary) throughout the vSAN pipeline (VSAN-10)." |
| VSAN-11 | 18-01/02 | FTT min node count enforcement | SATISFIED | FTT_POLICY_MAP minNodes; Math.max(storageCount, minNodes) in serverCountByVsanStorage; propagates through computeScenarioResult CALC-03 |
| VSAN-12 | 18-01/02 | vSAN fields optional; absent = legacy path | SATISFIED | All Scenario vSAN fields optional; createDefaultScenario() has no vSAN fields; constraints.ts else branch calls legacy serverCountByDisk; integration regression test confirms identical values |

All 12 VSAN requirements are accounted for across Plans 01 and 02. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | - |

No anti-patterns found. No TODO/FIXME/placeholder comments, no empty implementations, no `any` types in phase files, no stub handlers.

### Human Verification Required

None. Phase 18 delivers pure TypeScript formula functions with no UI component. All behaviors are fully verifiable through unit and integration tests.

### Gaps Summary

No gaps. All 13 must-have truths verified. All 7 required artifacts exist, are substantive, and are properly wired. All 12 VSAN requirements (VSAN-01 through VSAN-12) are satisfied with code evidence. The full test suite passes (467/467 tests, 0 failures). TypeScript compiles cleanly with no errors.

The phase goal is fully achieved: the sizing library computes vSAN-aware storage demand via a correct 5-step pipeline (compression before FTT, metadata overhead, slack space), enforces FTT minimum node floors for all 5 policies, deducts vSAN CPU overhead from available GHz per node in GHz sizing mode, and deducts vSAN memory overhead from available RAM per node — all as pure TypeScript functions with comprehensive unit tests and zero UI dependencies.

---
_Verified: 2026-03-14T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
