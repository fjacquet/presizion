---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: — Scope, Persistence & Branding
status: planning
stopped_at: Completed 13-import-scope-filter-02-PLAN.md
last_updated: "2026-03-13T20:59:38.813Z"
last_activity: 2026-03-13 — Roadmap written; 13 requirements mapped across 5 phases (11-15)
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 8
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** v1.3 roadmap defined — ready to plan Phase 11

## Current Position

Phase: Not started (roadmap defined, planning next)
Plan: —
Status: Planning
Last activity: 2026-03-13 — Roadmap written; 13 requirements mapped across 5 phases (11-15)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*
| Phase 11-branding-and-tech-debt P02 | 2 | 3 tasks | 3 files |
| Phase 11-branding-and-tech-debt P01 | 5 | 2 tasks | 3 files |
| Phase 12-dark-mode-toggle P01 | 3 | 2 tasks | 3 files |
| Phase 12-dark-mode-toggle P02 | 3 | 2 tasks | 3 files |
| Phase 13-import-scope-filter P01 | 4 | 1 tasks | 9 files |
| Phase 13-import-scope-filter P02 | 15 | 1 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.2 complete]: All 10 phases shipped; 254 tests passing; 0 ESLint errors
- [v1.3 start]: Research skipped — all features are well-understood patterns
- [v1.3 start]: Phases start at 11 (continuing from v1.2 phase numbering)
- [v1.3 scope]: TD-04 (RAM formula display) merged into Phase 11 alongside branding — small fix
- [v1.3 roadmap]: 5 phases defined (11-15); 13/13 requirements mapped; plan counts TBD
- [Phase 11-branding-and-tech-debt]: Logo uses /presizion/logo.svg absolute path with Vite base path; img tag (not inline SVG) keeps WizardShell small
- [Phase 11-branding-and-tech-debt]: Favicon: blue #3B82F6 rounded-square background with white P mark for maximum contrast at small sizes
- [Phase 11-branding-and-tech-debt]: TD-04: ramUtilizationPercent=100 treated as absent — omits factor from display (no-op at 100%)
- [Phase 11-branding-and-tech-debt]: TD-04: Utilization factor inserted before ramPerVmGb in formula string, matching cpuFormulaString pattern
- [Phase 12-dark-mode-toggle]: Tests stub localStorage globally before store import to capture module-load-time readStored() call
- [Phase 12-dark-mode-toggle]: Anti-flash script uses var (not const/let) for pre-parse context compatibility
- [Phase 12-dark-mode-toggle]: STORAGE_KEY 'presizion-theme' is single source of truth across useThemeStore and anti-flash script
- [Phase 12-dark-mode-toggle]: ThemeToggle uses relative+absolute Tailwind pattern in WizardShell header to keep centered layout intact
- [Phase 13-import-scope-filter]: ScopeData type alias defined in index.ts to avoid circular imports; rawByScope optional in interface but always populated by parsers
- [Phase 13-import-scope-filter]: Scope key format: dc||cluster when both present, cluster alone when cluster-only, __all__ when neither column exists
- [Phase 13-import-scope-filter]: aggregateScopes() copies ESX fields from first selected scope that has them; per-scope rawByScope omits ESX data (host-to-cluster mapping unavailable)
- [Phase 13-import-scope-filter]: Checkbox component wraps @base-ui/react/checkbox; ScopeSelector extracted as sub-component to keep ImportPreviewModal under 150 lines; prevResult state comparison pattern avoids react-hooks/set-state-in-effect; ESX fields read from result directly, not previewCluster

### Pending Todos

- Plan Phase 11 (Branding & Tech Debt) — next step

### Blockers/Concerns

- [BRAND-01]: Nano-Banana image generation required for logo/favicon — needs tool availability check at plan time

## Session Continuity

Last session: 2026-03-13T20:56:09.659Z
Stopped at: Completed 13-import-scope-filter-02-PLAN.md
Resume file: None
