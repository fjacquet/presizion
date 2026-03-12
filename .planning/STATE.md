---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 04-deployment-and-polish-03-PLAN.md
last_updated: "2026-03-12T21:26:45.580Z"
last_activity: 2026-03-12 — Phase 3 plan 02 complete; 155 tests green; ComparisonTable + export utils delivered
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** Phase 3: Comparison, Export & UX Polish

## Current Position

Phase: 3 of 4 (Comparison, Export & UX Polish)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-12 — Phase 3 plan 02 complete; 155 tests green; ComparisonTable + export utils delivered

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 4 | 2 tasks | 17 files |
| Phase 01-foundation P02 | 3 | 2 tasks | 9 files |
| Phase 01-foundation P04 | 3 | 1 tasks | 2 files |
| Phase 01-foundation P03 | 6 | 2 tasks | 8 files |
| Phase 02-input-forms P01 | 4min | 2 tasks | 16 files |
| Phase 02-input-forms P02 | 35min | 4 tasks | 6 files |
| Phase 02-input-forms P03 | 8min | 2 tasks | 4 files |
| Phase 02-input-forms P04 | 5min | 2 tasks | 7 files |
| Phase 03-comparison-export-and-wizard-shell P01 | 1 | 2 tasks | 6 files |
| Phase 03-comparison-export-and-wizard-shell P02 | 5min | 2 tasks | 7 files |
| Phase 03-comparison-export-and-wizard-shell P03 | 3 | 2 tasks | 5 files |
| Phase 04-deployment-and-polish P01 | 2 | 2 tasks | 4 files |
| Phase 04-deployment-and-polish P02 | 1 | 2 tasks | 3 files |
| Phase 04-deployment-and-polish P04 | 2min | 1 tasks | 2 files |
| Phase 04-deployment-and-polish P03 | 2 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: No pre-defined server SKUs — user-input only to stay vendor-neutral
- [Init]: Industry defaults 4:1 vCPU:pCore, 20% headroom — widely accepted starting points
- [Init]: localStorage persistence deferred to v1.1 — not blocking core workflow
- [Init]: GitHub Pages deployment — zero infra, matches static-only constraint
- [Research]: Math before UI — sizing library must be correct before any component depends on it
- [Phase 01-foundation]: Scaffolded via temp directory copy to bypass create-vite non-empty directory guard
- [Phase 01-foundation]: Separate vitest.config.ts from vite.config.ts to avoid type conflicts
- [Phase 01-foundation]: growthHeadroomFactor passed as multiplicative factor (1.20) to formula functions — callers compute 1 + percent/100
- [Phase 01-foundation]: HA reserve +1 applied after Math.max() of three constraints, not before
- [Phase 01-foundation]: Object.freeze() on ScenarioResult enforces immutability at runtime; utilization metrics use finalCount as denominator
- [Phase 01-foundation]: Display functions import from formulas.ts (DRY) rather than duplicating Math.ceil logic — single source of truth for sizing math
- [Phase 01-foundation]: Display interfaces accept headroomPercent (not headroomFactor) — conversion to multiplicative factor is internal to display module, matches user mental model
- [Phase 01-foundation]: z.preprocess (not z.coerce.number) for numeric Zod fields — empty string inputs throw ZodError, protecting form validation
- [Phase 01-foundation]: ScenarioResult never stored in Zustand — useScenariosResults derives on demand (derive-on-read pattern)
- [Phase 01-foundation]: Default values imported from defaults.ts into schemas — single source of truth for DEFAULT_VCPU_TO_PCORE_RATIO and DEFAULT_HEADROOM_PERCENT
- [Phase 02-input-forms P02]: data-testid required on shadcn Input elements because FormControl wraps label htmlFor to div, breaking getByLabelText and spinbutton role queries
- [Phase 02-input-forms P02]: NumericFormField extracted to reduce repetition and keep form components near 150-line guideline
- [Phase 02-input-forms P02]: vitest.config.ts needs resolve.alias for @ to match vite.config.ts for component test imports
- [Phase 02-input-forms P03]: form.watch(callback) subscription (not useEffect+watched-dep) to avoid infinite Zustand setState loop in ScenarioCard
- [Phase 02-input-forms P03]: Form wrapper must wrap entire Card (including CardHeader) so FormField can access FormProvider context
- [Phase 02-input-forms P03]: Use getByText for label assertions (FormControl renders div wrapper, breaking getByLabelText linkage)
- [Phase 02-input-forms P04]: vi.mock step components in WizardShell tests to isolate routing from form rendering
- [Phase 02-input-forms P04]: zodResolver with z.preprocess schemas requires as any cast — input type is unknown but useForm expects concrete output type
- [Phase 02-input-forms P04]: Control<T, any, T> third type param required in NumericFormField interface when z.preprocess resolver is used
- [Phase 02-input-forms P04]: TooltipTrigger from base-ui/react does not support asChild prop — remove to fix TypeScript error
- [Phase 03-comparison-export-and-wizard-shell]: Nyquist Wave 0 stubs use it.todo (not it.skip) so Vitest counts them as pending not failing — test suite exits 0
- [Phase 03-comparison-export-and-wizard-shell]: shadcn table installed in wave 0 plan so wave 1 implementation plans can import @/components/ui/table without extra CLI step
- [Phase 03-comparison-export-and-wizard-shell]: Step3ReviewExport stub created by 03-03 so WizardShell import resolves during parallel execution — 03-02 replaces stub with full implementation
- [Phase 03-02]: csvEscape exported (not private) for direct unit testing of escape logic
- [Phase 03-02]: utilizationClass exported from ComparisonTable.tsx so tests can unit-test color logic in isolation
- [Phase 03-02]: downloadCsv anchor click verified via URL.revokeObjectURL assertion — avoids createElement mock stack overflow in jsdom
- [Phase 04-deployment-and-polish]: Wave 0 stubs use it.todo (not it.skip) so Vitest counts as pending not failing — suite exits 0
- [Phase 04-deployment-and-polish]: GitHub Pages deploy workflow triggers on push to main and workflow_dispatch; base: '/presizion/' in vite.config.ts for correct asset resolution
- [Phase 04-deployment-and-polish]: Pure function extraction for anti-flash script: test applyDarkModeClass() in isolation, not the DOM directly — cleaner and framework-agnostic
- [Phase 04-deployment-and-polish]: Dark color pairing: text-*-600 (light) / dark:text-*-400 (dark) — lighter 400 shades for adequate contrast on dark backgrounds
- [Phase 04-deployment-and-polish]: useRef for timeout ID (not useState) — avoids extra re-render for clipboard feedback state
- [Phase 04-deployment-and-polish]: useEffect cleanup clears setTimeout on unmount — prevents setState-after-unmount warning in UX-06 copied state
- [Phase 04-deployment-and-polish]: display.ts co-located in src/lib/sizing/ alongside formulas.ts; formula strings show 100+headroomPercent% format; useClusterStore added to ScenarioResults for formula params

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Reference spreadsheet fixture values needed — at least 3 known input/output pairs required for unit test fixtures; must be provided or verified by project owner before Phase 1 can be completed
- [Phase 1]: Confirm exact vCPU:pCore default with project owner if target users have a specific workload profile (VDI-heavy, DB-heavy)

## Session Continuity

Last session: 2026-03-12T21:26:45.577Z
Stopped at: Completed 04-deployment-and-polish-03-PLAN.md
Resume file: None
