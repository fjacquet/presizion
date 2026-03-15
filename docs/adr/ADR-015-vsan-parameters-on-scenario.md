# ADR-015: vSAN Parameters on Scenario (Not a New Store)

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.0

## Context

Sizing VxRail clusters with vSAN requires additional storage parameters: Failures to Tolerate (FTT) level, compression/deduplication ratios, vSAN slack space, CPU and memory overhead for vSAN processes, and VM swap reservation. These settings directly affect the number of servers required to meet storage and resource constraints.

A new Zustand store dedicated to vSAN configuration was considered, but this would break the existing derive-on-read pattern, add store proliferation, and complicate the Reset workflow which currently only needs to clear the scenario store.

## Decision

All vSAN settings (FTT, compression ratio, deduplication ratio, slack percentage, CPU overhead, memory overhead, VM swap reservation) are optional fields on the existing `Scenario` interface. They default to sensible VxRail values when not provided. Sizing formulas in `src/lib/sizing/` read these fields and factor them into storage and resource calculations.

## Rationale

- **Derive-on-read consistency**: vSAN parameters are scenario-level assumptions, just like vCPU:pCore ratio or headroom percentage. Keeping them on Scenario preserves the pattern where ScenarioResult is always derived from OldCluster + Scenario.
- **No store proliferation**: Adding a separate vSAN store would be the third store (after cluster and scenario). Every new store increases coupling surface and requires coordinated resets.
- **Multi-scenario comparison**: Different scenarios can use different vSAN configurations (e.g., FTT=1 vs FTT=2), enabling side-by-side comparison of the storage impact.
- **Reset simplicity**: Clearing all scenarios already resets vSAN parameters. No additional teardown logic required.

## Consequences

- The Scenario interface grows by 6-8 optional fields; TypeScript's optional chaining keeps this ergonomic
- Scenario form UI gains a collapsible "vSAN Settings" section with defaults pre-filled
- Export/import of scenarios automatically includes vSAN parameters with no additional wiring
- If vSAN parameters ever need to be shared across all scenarios, a "copy settings" action can propagate values without a separate store
