# ADR-004: Observed Utilization as Input Scaler (Not Output Target)

**Date:** 2026-03-13
**Status:** Accepted
**Milestone:** v1.1

## Context

Two related but distinct utilization concepts exist in cluster sizing:

1. **Observed current utilization** (input): "My existing cluster is running at 65% CPU and 70% RAM today." This scales *demand* — if you're only using 65% of your current CPU, you don't need a 1:1 replacement.

2. **Target utilization** (output target): "I want the new cluster to run at no more than 80% CPU utilization." This sets a maximum headroom constraint.

The PRD (FR-3) mentions both. The question for v1.1 was which to implement and how.

## Decision

Implement **observed current utilization as an input scaler** (UTIL-01/02/03). When CPU utilization % is provided, the effective vCPU demand scales by that percentage:

```
effectiveTotalVcpus = totalVcpus × (cpuUtilizationPercent / 100)
```

The RAM formula scales similarly. The disk formula is not scaled (disk is a capacity concern, not an utilization one).

Target utilization output constraints are deferred to v2.

## Rationale

- **Right-sizing vs. replacement**: Without utilization data, the tool sizes for 100% of installed capacity. A cluster running at 65% CPU is systematically over-provisioned by 35%. Observed utilization enables right-sizing — a key differentiator for presales use cases.
- **Simpler mental model**: Input scalers are straightforward: "How much of my current cluster am I actually using?" Output targets ("keep utilization below 80%") introduce a different kind of constraint that interacts non-trivially with headroom and requires careful UI explanation.
- **Backward-compatible**: When utilization % is not provided (blank/empty), the scaler defaults to 100% — identical to the v1.0 behavior. No breaking change.
- **Formula clarity**: The formula string updates to show the scaler explicitly: `ceil(totalVcpus × utilPct% × headroom% / ratio / cores)`.

## Consequences

- `OldCluster` schema gains two optional fields: `cpuUtilizationPercent` and `ramUtilizationPercent`.
- Formula functions in `formulas.ts` gain optional `cpuUtilPct` and `ramUtilPct` parameters (default 100).
- `display.ts` formula strings include the utilization scaler when non-100%.
- `CurrentClusterForm` gains two optional numeric inputs in Step 1.
- The `useScenariosResults()` hook passes utilization values from `useClusterStore()` to formula functions.
