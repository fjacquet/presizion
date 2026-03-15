# ADR-007: Utilization as Input Scaler (Not a Separate Constraint)

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.1

## Context

Cluster sizing must account for the fact that existing clusters are rarely running at 100% of their provisioned capacity. Two architectural approaches were considered:

1. **Utilization as a separate constraint**: Treat utilization as an independent dimension that produces its own server count, then take `max(cpu, ram, disk, utilization)`. This would be a 4th (or 5th) constraint in the sizing pipeline.

2. **Utilization as an input scaler**: Multiply the raw demand figures by the observed utilization percentage before feeding them into the existing CPU and RAM constraint formulas. This adjusts the "effective demand" rather than adding a new constraint.

## Decision

Observed utilization percentages (`cpuUtilizationPercent`, `ramUtilizationPercent`) are **input scalers** that reduce the effective demand fed into the existing constraint formulas. They are not separate constraints.

For RAM, the scaler is applied directly in `serverCountByRam()`:

```
ceil( totalVms * ramPerVmGb * (ramUtilPct/100) * headroom / (targetRamUtilPct/100) / ramPerServerGb )
```

For CPU, the treatment depends on the sizing mode:

- **vCPU mode**: utilization is not applied to the server count formula (the vCPU:pCore ratio is a hard assignment-density cap). Utilization only affects the display metric (CALC-06).
- **Aggressive mode**: utilization scales demand directly via `serverCountByCpuAggressive()`: `ceil(totalVcpus * (cpuUtilPct/100) * headroom / coresPerServer)`.
- **GHz mode**: utilization is embedded in the GHz demand calculation: `demandGhz = totalPcores * freq * (cpuUtilPct/100)`.

Disk is not scaled by utilization (disk is a capacity concern, not a utilization one).

## Rationale

- **Right-sizing**: A cluster running at 65% CPU utilization is over-provisioned by 35%. Scaling demand by observed utilization enables right-sizing, which is a key differentiator for presales sizing scenarios.
- **Mathematically correct**: Utilization is not an independent resource dimension -- it is a measure of how much of an existing resource (CPU, RAM) is actually consumed. Treating it as a separate constraint would be dimensionally incorrect.
- **Composable with headroom**: The scaler composes naturally with the growth headroom factor. Effective demand = raw demand *utilization* headroom. These are independent multiplicative adjustments.
- **Backward-compatible**: When utilization is not provided, it defaults to 100%, which produces identical results to the pre-utilization formulas.

## Consequences

- `OldCluster` gains optional `cpuUtilizationPercent` and `ramUtilizationPercent` fields (default 100 when absent).
- `Scenario` gains optional `targetCpuUtilizationPercent` and `targetRamUtilizationPercent` fields for design targets on the new cluster.
- Formula functions accept utilization parameters but default to 100, preserving backward compatibility.
- The vCPU mode intentionally ignores CPU utilization in the server count formula -- this is by design, not a gap. The ratio cap is a policy constraint, not a demand estimate.
