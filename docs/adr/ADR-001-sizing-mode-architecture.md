# ADR-001: Two Mutually Exclusive Sizing Modes (vCPU vs SPECint)

**Date:** 2026-03-13
**Status:** Accepted
**Milestone:** v1.1

## Context

The original tool sizes CPU demand using the vCPU:pCore ratio formula:

```
ceil((totalVcpus × headroom) / vcpuToPcoreRatio / coresPerServer)
```

This approach works well for like-for-like refreshes where server generations are similar. However, when migrating to a significantly newer server generation (e.g., Xeon v5 → v8), raw core counts are misleading: a modern 32-core server may outperform an older 48-core server due to higher IPC and frequency.

SPECint benchmark scores provide a standardized measure of integer compute throughput per server, enabling performance-equivalence sizing:

```
ceil(existingServers × oldSPECint × headroom / targetSPECint)
```

The question was: should SPECint be a 4th constraint (alongside CPU/RAM/disk), or a separate mode that replaces the CPU constraint?

## Decision

SPECint is a **global mode switch**, not a 4th constraint. The two modes are mutually exclusive:

- **vCPU mode** (default): CPU constraint uses vCPU:pCore ratio formula. SPECint fields are hidden.
- **SPECint mode**: CPU constraint uses SPECint delta formula. vCPU:pCore ratio field is hidden. SPECint fields appear in Step 1 and each scenario card.

The mode is global (applies to all scenarios simultaneously), not per-scenario.

## Rationale

**Against a 4th constraint:** Adding SPECint as an additional constraint would mean the final server count is `max(CPU, RAM, disk, SPECint)`. This is mathematically incorrect — SPECint and vCPU ratio are two different ways to model the *same* constraint (compute capacity). Adding them both would double-count CPU demand.

**Against per-scenario mode:** Comparing a vCPU-sized scenario against a SPECint-sized scenario in the same table is misleading — the underlying assumptions are incomparable. A global mode ensures all scenarios use the same methodology.

**For global mode:** Clean UX — one toggle changes the entire analysis approach. No ambiguity in the comparison table.

## Consequences

- Zustand wizard store gains a `sizingMode: 'vcpu' | 'specint'` field.
- `OldCluster` schema gains optional `specintPerServer` field (required when mode is 'specint').
- `Scenario` schema gains optional `targetSpecint` field (required when mode is 'specint').
- `computeScenarioResult` branches on `sizingMode` for the CPU constraint.
- `CurrentClusterForm` and `ScenarioCard` conditionally render SPECint fields based on active mode.
- Formula strings in `display.ts` must branch on mode.
