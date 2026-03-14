# ADR-006: Frozen ScenarioResult Objects

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.0

## Context

`ScenarioResult` is a derived data structure computed by `computeScenarioResult()` in `constraints.ts` and consumed by multiple UI components (comparison tables, charts, export utilities). Because it flows through React props and hooks, there is a risk that a component could accidentally mutate the result object -- for example, by sorting an array in place, reassigning a field for display formatting, or passing the object to a library that modifies it.

Since `ScenarioResult` is computed on read (see ADR-002), any silent mutation would cause inconsistencies between components that share the same reference within a render cycle.

## Decision

Every `ScenarioResult` object is wrapped in `Object.freeze()` at creation time, immediately before it is returned from `computeScenarioResult()`. The `ScenarioResult` interface in `src/types/results.ts` marks all fields as `readonly`.

```ts
return Object.freeze({
  cpuLimitedCount,
  ramLimitedCount,
  diskLimitedCount,
  rawCount,
  requiredCount,
  finalCount,
  limitingResource,
  haReserveCount,
  haReserveApplied,
  achievedVcpuToPCoreRatio,
  vmsPerServer,
  cpuUtilizationPercent,
  ramUtilizationPercent,
  diskUtilizationPercent,
});
```

## Rationale

- **Defense in depth**: TypeScript `readonly` prevents mutations at compile time; `Object.freeze()` catches them at runtime. Together they cover both type-checked code and any `as`-casted or untyped paths.
- **Fail-fast in development**: In strict mode, assigning to a frozen property throws a `TypeError`. This surfaces bugs immediately rather than allowing silent data corruption.
- **Zero cost for correct code**: Code that already treats results as immutable is unaffected. The freeze is a one-time shallow operation on a flat object with ~14 numeric/boolean/string fields -- negligible overhead.
- **Complements derive-on-read (ADR-002)**: Since results are recomputed each render, freezing ensures that no component can "poison" a shared reference for other consumers within the same render pass.

## Consequences

- Components must create new objects (e.g., spread syntax) when they need to transform result data for display purposes. They cannot modify the result in place.
- `Object.freeze()` is shallow. If `ScenarioResult` ever gains nested object or array fields, those would need `Object.freeze()` applied recursively. Currently all fields are primitives, so shallow freeze is sufficient.
- Unit tests that attempt to mutate results (e.g., `result.finalCount = 99`) will throw in strict mode, which validates the invariant.
