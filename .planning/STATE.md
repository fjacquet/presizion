---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: "- [x] **Phase 1: Foundation** - Sizing library, data types, Zod schemas, and Zustand state slices — correctness engine before any UI"
status: planning
stopped_at: Completed 07-enhanced-export-and-as-is-to-be-report-02-PLAN.md
last_updated: "2026-03-13T09:42:14.459Z"
last_activity: 2026-03-13 — v1.1 roadmap created; 10 requirements mapped to phases 5-7
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 23
  completed_plans: 23
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** Phase 5: SPECint and Utilization Formula Engine

## Current Position

Phase: 5 of 7 (SPECint and Utilization Formula Engine)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-13 — v1.1 roadmap created; 10 requirements mapped to phases 5-7

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**

- Total plans completed: 15
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
| Phase 05-specint-and-utilization-formula-engine P01 | 3 | 2 tasks | 9 files |
| Phase 05-specint-and-utilization-formula-engine P02 | 4 | 2 tasks | 8 files |
| Phase 05-specint-and-utilization-formula-engine P03 | 8 | 2 tasks | 6 files |
| Phase 06-conditional-ui-wiring P01 | 2 | 2 tasks | 4 files |
| Phase 06-conditional-ui-wiring P02 | 6 | 2 tasks | 7 files |
| Phase 07-enhanced-export-and-as-is-to-be-report P01 | 10 | 2 tasks | 4 files |
| Phase 07-enhanced-export-and-as-is-to-be-report P03 | 5 | 2 tasks | 5 files |
| Phase 07-enhanced-export-and-as-is-to-be-report P02 | 27 | 2 tasks | 4 files |

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
- [v1.1 Roadmap]: SPECint mode is a global store toggle — formula engine changes (Phase 5) must precede all UI wiring (Phase 6) to maintain math-before-UI discipline
- [v1.1 Roadmap]: UTIL-01/02 are Step 1 inputs extending OldCluster schema; UTIL-03 scales CPU/RAM effective demand before ceiling — same pattern as headroom factor
- [v1.1 Roadmap]: EXPO-03 (JSON) extends export.ts; EXPO-04 (print CSS) is pure @media print in index.css — both are self-contained and grouped in Phase 7
- [Phase 05-specint-and-utilization-formula-engine]: SizingMode exported as type alias from useWizardStore.ts for consumer imports
- [Phase 05-specint-and-utilization-formula-engine]: optionalPercent uses z.number().min(0).max(100) with z.preprocess — consistent with project pattern
- [Phase 05-specint-and-utilization-formula-engine]: LimitingResource extended to 4-way union including specint — TypeScript validates exhaustive switch coverage
- [Phase 05-specint-and-utilization-formula-engine]: sizingMode passed as optional 3rd param to computeScenarioResult (default 'vcpu') — no breaking change to existing callers
- [Phase 05-specint-and-utilization-formula-engine]: cpuUtilPct and ramUtilPct use default=100 — division by 100 yields 1.0 multiplier, identity for existing math ensuring zero regression
- [Phase 05-specint-and-utilization-formula-engine]: determineLimitingResource returns 'specint' when sizingMode='specint' and cpu-slot wins — consistent tie-breaking priority, avoids 4-arg refactor
- [Phase 05-specint-and-utilization-formula-engine]: Integration tests for useScenariosResults test computeScenarioResult directly (not renderHook) — pure formula testing avoids React test setup overhead
- [Phase 05-specint-and-utilization-formula-engine]: Exhaustive Record<LimitingResource, string> in ScenarioResults and Record<keyof CurrentClusterInput, string> in CurrentClusterForm — TypeScript enforces coverage of all union members at build time
- [Phase 06-conditional-ui-wiring]: SizingModeToggle uses aria-pressed boolean for toggle state; Wave 0 stubs use it.todo; PERF-03 stubs added to existing ComparisonTable.test.tsx describe block
- [Phase 06-conditional-ui-wiring]: RESOURCE_LABELS in ComparisonTable uses 'SPECint' (not 'SPECint-limited') for brevity in table cells; ScenarioResults uses 'SPECint-limited' for clarity
- [Phase 06-conditional-ui-wiring]: capitalize() removed from ComparisonTable.tsx after RESOURCE_LABELS replaced its only usage — TS6133 auto-fix
- [Phase 06-conditional-ui-wiring]: SPECint formula row in ScenarioResults renders outside the 3-col grid as a separate row below to avoid disrupting layout
- [Phase 07-enhanced-export-and-as-is-to-be-report]: printCss.test.ts uses real it() (not it.todo) for print-color-adjust check — intentionally RED as EXPO-04 leading indicator until Plan 03 adds print CSS
- [Phase 07-enhanced-export-and-as-is-to-be-report]: REPT-02 stubs placed in top-level describe block (not nested in CurrentClusterForm describe) to preserve existing test structure
- [Phase 07-enhanced-export-and-as-is-to-be-report]: normaliseCluster() enumerates all OldCluster optional fields with ?? null before JSON.stringify — replacer alone cannot produce null for absent (not undefined) keys
- [Phase 07-enhanced-export-and-as-is-to-be-report]: existingServerCount moved to always-visible Existing Server Config section; SPECint section now contains only specintPerServer
- [Phase 07-enhanced-export-and-as-is-to-be-report]: As-Is cells read directly from useClusterStore (not ScenarioResult type) per RESEARCH.md

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Reference spreadsheet fixture values needed — at least 3 known input/output pairs required for unit test fixtures; must be provided or verified by project owner before Phase 1 can be completed
- [Phase 1]: Confirm exact vCPU:pCore default with project owner if target users have a specific workload profile (VDI-heavy, DB-heavy)
- [Phase 5]: SPECint formula requires existingServers as an input — confirm OldCluster schema already stores this (INPUT-03 captures optional server count); plan must handle the case where existingServers is undefined

## Session Continuity

Last session: 2026-03-13T09:42:14.457Z
Stopped at: Completed 07-enhanced-export-and-as-is-to-be-report-02-PLAN.md
Resume file: None
