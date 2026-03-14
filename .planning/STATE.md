---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — vSAN-Aware Sizing Engine
status: completed
stopped_at: Completed 19-03-PLAN.md
last_updated: "2026-03-14T22:15:29.998Z"
last_activity: 2026-03-14 — Phase 19 Plan 03 complete (growth display annotations + useVsanBreakdowns hook, 13 new tests, 4 files)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** v2.0 Phase 19 — Capacity Breakdown & Growth Wiring

## Current Position

Phase: 19 of 22 (Capacity Breakdown & Growth Wiring)
Plan: 3 of 3 complete
Status: Phase Complete
Last activity: 2026-03-14 — Phase 19 Plan 03 complete (growth display annotations + useVsanBreakdowns hook, 13 new tests, 4 files)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Average duration: 5 min
- Total execution time: 0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 16 | 2/2 | 11min | 6min |
| 17 | 3/3 | 14min | 5min |
| 18 | 2/2 | 6min | 3min |

| 19 | 3/3 | 7min | 2min |

*Updated after each plan completion*
| Phase 19 P03 | 3min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 roadmap]: Math before UI — Phase 18 (engine) must complete before Phase 20 (form UI)
- [v2.0 roadmap]: Phase 21 (charts) depends on Phase 19 (breakdown hook), not Phase 20 (form)
- [v2.0 roadmap]: VSAN-12: absent vSAN fields use legacy sizing path — no breaking change to existing scenarios
- [Phase 17-03]: Reset preserves presizion-theme in localStorage; only presizion-session is cleared
- [Phase 18-01]: raid5 multiplier = 1+1/3 (exact), not 1.33 (truncated)
- [Phase 18-01]: Compression applied BEFORE FTT in storage pipeline (VSAN-09)
- [Phase 18-01]: All vSAN Scenario fields optional -- absent = legacy sizing path (VSAN-12)
- [Phase 18-02]: vSAN CPU overhead only applied in GHz sizing mode (not vcpu/specint/aggressive)
- [Phase 18-02]: Disaggregated layout overrides vSAN for CALC-03 (diskLimitedCount=0 always)
- [Phase 18-02]: vSAN default constants re-exported from defaults.ts for Phase 20 form use
- [Phase 19-01]: Growth multiplies DEMAND not server count -- pipeline is demand x growthFactor x headroomFactor
- [Phase 19-01]: SPECint mode exempt from growth (benchmark comparison, not demand-driven)
- [Phase 19-01]: GHz mode applies cpuGrowthFactor to pCores (not vCPUs)
- [Phase 19-01]: Absent growth fields default to 0% via null-coalescing (same pattern as vSAN fields)
- [Phase 19-02]: Storage invariant: required = rawBeforeSlack (FTT + metadata, no slack); spare = slackSpace + haReserve
- [Phase 19-02]: CPU breakdown reports demand in GHz (vCPU * freq) for consistent unit reporting
- [Phase 19-02]: Storage HA reserve = 1/N of total cluster raw (distinct from CPU/Memory one-node reserve)
- [Phase 19-03]: Growth annotation inserted AFTER headroom and BEFORE first division in formula display strings
- [Phase 19-03]: useVsanBreakdowns calls computeScenarioResult internally (single-pass, not re-imported from useScenariosResults)

### Pending Todos

None

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-03-14T22:15:29.996Z
Stopped at: Completed 19-03-PLAN.md
Resume file: None
