# Phase 1: Foundation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure TypeScript infrastructure: sizing formula engine, data types, Zod schemas, and Zustand state slices. Nothing the user sees directly — this is the correctness foundation that every downstream phase depends on. UI is explicitly out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Test Fixtures
- No external reference spreadsheet — the PRD Figure 1 data was illustrative only; the app defines its own formulas from the spec
- Use hand-crafted fixtures that isolate each constraint: one CPU-limited case, one RAM-limited case, one disk-limited case
- Boundary/rounding edge cases must be explicitly tested — inputs designed to land near integer boundaries verify `Math.ceil()` correctness (pitfalls research flagged this as highest-risk formula bug)
- Tests live in Vitest; strict mode TS build must pass with zero errors

### Formula API Shape
- Single exported function: `computeScenarioResult(cluster: OldCluster, scenario: Scenario): ScenarioResult`
- One call per scenario update returns the full result object (server counts per constraint, final count, limiting resource, utilization percentages)
- Internal helper functions per constraint (CPU/RAM/disk) are fine but are implementation details — only `computeScenarioResult` is the public contract
- Formula display strings (for CALC-07 inline rendering in UI) live in a **separate display module** (`src/lib/display/` or similar), not inside `src/lib/sizing/` — keeps pure math isolated from presentation concerns

### Type Definitions
- Plain TypeScript numbers throughout — no branded types; TypeScript strict mode + descriptive field names (`totalVcpus`, `ramPerServerGb`) provide sufficient protection
- `OldCluster` and `Scenario` are `readonly` interfaces — all mutations go through Zustand actions to prevent accidental direct state mutation
- `ScenarioResult` is also readonly (derived, never mutated)

### Defaults Location
- All industry defaults defined in a single constants file: `src/lib/sizing/defaults.ts`
- This file is the single source of truth — imported by Zod schemas and Zustand store initializer
- Each constant includes a rationale comment explaining why that value (e.g., `// 4:1 is VMware's general-purpose recommendation for mixed workloads — adjust for VDI or compute-heavy profiles`)
- Initial defaults: `DEFAULT_VCPU_TO_PCORE_RATIO = 4`, `DEFAULT_HEADROOM_PERCENT = 20`, `DEFAULT_HA_RESERVE_ENABLED = false`

### Claude's Discretion
- Internal file naming within `src/lib/sizing/` (e.g., `constraints.ts` vs `formulas.ts`)
- `parseNumericInput` helper implementation details
- Zustand slice naming conventions (as long as they match ARCHITECTURE.md's three-slice pattern)
- Exact Zod schema structure for validation (field-level rules beyond non-negative)

</decisions>

<specifics>
## Specific Ideas

- Formula display lives outside the math module — this keeps `src/lib/sizing/` importable in any context without pulling in display dependencies
- The `defaults.ts` rationale comments are a first-class requirement, not a nice-to-have — future maintainers (and the user) need to know when to deviate from defaults

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project, no existing source code

### Established Patterns
- No prior patterns to carry forward; this phase establishes the foundational patterns

### Integration Points
- `src/lib/sizing/` → consumed by `useScenariosResults` hook (Phase 2)
- `src/lib/sizing/defaults.ts` → imported by Zod schemas (Phase 1) and Zustand store initial state (Phase 1)
- `src/lib/display/` → consumed by UI components in Phase 2+ for inline formula rendering
- Zustand slices → consumed by all React components from Phase 2 onward

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-12*
