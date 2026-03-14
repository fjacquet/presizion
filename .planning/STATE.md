---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: — Bug Fixes, Chart Polish & UX
status: completed
stopped_at: Completed 16-01-PLAN.md (Phase 16 fully complete)
last_updated: "2026-03-14T14:25:31.092Z"
last_activity: 2026-03-14 — Completed 16-01 (Import Scoping ESX Per-Cluster Fix)
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** v1.4 — Phase 16 executing

## Current Position

Phase: 16-bug-fixes-import-scoping-vm-override-asis
Plan: 2 of 2 complete
Status: Phase 16 complete (all plans done)
Last activity: 2026-03-14 — Completed 16-01 (Import Scoping ESX Per-Cluster Fix)

Progress: [==========] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: 6 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 16 | 2/2 | 11min | 6min |

*Updated after each plan completion*

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
- [Phase 14-persistent-scope-widget]: useImportStore calls useClusterStore.getState().setCurrentCluster() directly inside setActiveScope — avoids hook-in-hook constraint while keeping re-aggregation logic in the store
- [Phase 14-persistent-scope-widget]: setImportBuffer called only when result.rawByScope != null — JSON imports bypass useImportStore entirely
- [Phase 14-persistent-scope-widget]: vi.mock factories must not reference outer variables; use vi.mocked() in beforeEach to set return values
- [Phase 14-persistent-scope-widget]: ScopeBadge self-hides via return null when scopeOptions.length <= 1 — no conditional wrapper needed in Step1CurrentCluster
- [Phase 14-persistent-scope-widget]: Dialog pending state initialized from activeScope on open — prevents live mutations while user is selecting; shadcn dialog.tsx added via npx shadcn@latest add dialog using base-ui/react/dialog primitives
- [Phase 08-v12-planning-backfill]: STATE.md Task 2 skipped: resetting to v1.2 complete values would destroy v1.3 context; STATE.md correctly reflects ongoing v1.3 work
- [Phase 15-persistence]: STORAGE_KEY 'presizion-session' is the single source of truth for localStorage persistence
- [Phase 15-persistence]: Boot restore is synchronous before createRoot — no flicker, no empty-state render
- [Phase 15-persistence]: Zod v4 UUID validation is stricter than v3 — test fixtures must use valid RFC 4122 UUIDs
- [Phase 15-persistence]: URL hash takes priority over localStorage on boot; history.replaceState clears hash after restore; Share button copies base64url session URL
- [Phase 16-02]: VM override tests confirm existing code correctness -- no bug fix needed, tests are the deliverable
- [Phase 16-02]: As-Is cells use em-dash for unavailable data and literal N/A for not-applicable concepts
- [Phase 16-02]: Disk As-Is cell shows totalDiskGb only in disaggregated mode; HCI mode shows em-dash
- [Phase 16-01]: Host-to-cluster mapping priority: direct Cluster column on ESX sheet > host column on VMs/vInfo > __all__ fallback with warning
- [Phase 16-01]: Additive ESX fields (totalPcores, existingServerCount) are summed; representative fields (sockets, cores/socket) use first scope
- [Phase 16-01]: Heterogeneous RAM/server triggers warning string but still uses first cluster value as representative
- [Phase 16-01]: CPU/RAM utilization weighted by existingServerCount per scope, not simple average

### Pending Todos

- None (Phase 16 complete)

### Blockers/Concerns

- None

## Session Continuity

Last session: 2026-03-14
Stopped at: Completed 16-01-PLAN.md (Phase 16 fully complete)
Resume file: None
