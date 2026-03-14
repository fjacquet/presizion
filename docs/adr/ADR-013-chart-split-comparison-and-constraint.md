# ADR-013: Chart Split — Comparison + Constraint Breakdown

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.4

## Context

The original `SizingChart` rendered a single grouped bar chart with per-constraint bars (CPU-limited, RAM-limited, Disk-limited) for each scenario. The As-Is reference was shown as a dashed horizontal line. This was confusing: the legend showed constraint types while the x-axis showed scenario names, and the As-Is reference line was barely visible and its label got cut off.

For presales proposals, engineers need a clear "As-Is vs To-Be" visual comparison showing final server counts, not constraint breakdowns.

## Decision

Split `SizingChart` into two separate charts:

1. **Server Count Comparison** — Shows final server count per entity (As-Is bar in slate gray + scenario bars in colored palette). X-axis labels identify each bar; no legend needed. Has its own Download PNG button.

2. **Constraint Breakdown per Scenario** — Shows CPU/RAM/Disk constraint bars grouped by scenario with a legend identifying constraint types. Has its own Download PNG button.

Each chart has its own `useRef` container for independent PNG download.

## Rationale

- Presales engineers need a clear As-Is vs To-Be comparison for proposals
- The constraint breakdown is still valuable but is secondary information
- Having the As-Is as an actual bar (not a reference line) makes the comparison immediately readable
- Two simpler charts are easier to understand than one complex chart

## Consequences

- SizingChart.tsx is larger (~130 lines) but each chart section is self-contained
- Two Download PNG buttons instead of one
- Tests updated to expect 2 charts and 2 download buttons
- CoreCountChart remains a separate component with its own As-Is reference line
