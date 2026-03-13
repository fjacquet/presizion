# ADR-002: Derive ScenarioResult On Read (Never Store in Zustand)

**Date:** 2026-03-12
**Status:** Accepted
**Milestone:** v1.0

## Context

`ScenarioResult` contains all computed outputs for a scenario (server counts, limiting resource, utilization percentages, formula strings). It is derived entirely from `OldCluster` + `Scenario` inputs with no side effects. The question was whether to store it in Zustand alongside the inputs or compute it on demand.

## Decision

`ScenarioResult` is **never stored in Zustand**. It is computed on demand by the `useScenariosResults()` hook, which reads `useClusterStore()` and `useScenariosStore()` and returns a fresh `ScenarioResult[]` array on every render where inputs have changed.

## Rationale

- **Single source of truth**: Storing derived state alongside its source creates synchronization risk. If inputs change, derived state must be invalidated — a class of bugs that cannot occur when derivation is on-read.
- **Correctness by construction**: Pure functions guarantee the same inputs always produce the same outputs. There is no stale cache to worry about.
- **Simplicity**: No Zustand action needed for "recalculate". Zustand holds only user inputs; React's re-render cycle handles recalculation automatically.
- **Performance**: The sizing calculations are O(1) arithmetic — recomputing on every render has unmeasurable cost. Memoization would add complexity for no practical benefit at this scale.

## Consequences

- `useScenariosResults()` is the single integration point between the formula layer and the UI layer.
- Components that need results import only `useScenariosResults()`, not any Zustand store directly.
- `ScenarioResult` objects are `Object.freeze()`d at creation to enforce immutability.
- Testing: formula correctness is tested via `src/lib/sizing/` unit tests; store tests verify inputs; hook tests verify the integration.
