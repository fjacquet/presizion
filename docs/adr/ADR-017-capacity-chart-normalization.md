# ADR-017: Capacity Chart Normalization to 100%

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.0

## Context

The comparison view includes stacked bar charts showing CPU, memory, and storage utilization per scenario. When rendered with absolute values, storage bars (e.g., 50 TB) dwarf memory bars (e.g., 512 GB), and CPU bars (core counts) use a completely different scale. This makes the chart visually misleading: storage always dominates, and it is impossible to compare proportional utilization across resource types at a glance.

VxRail cluster reports use normalized (percentage-based) capacity bars where each row represents a resource type at the same width, with fill indicating utilization percentage.

## Decision

Stacked capacity bars render at equal width, normalized to 100% per row. Each segment shows a percentage label (e.g., "72%") rather than an absolute value. Absolute values are available via tooltip or in the adjacent data table. This applies to CPU, memory, and storage rows in the capacity chart.

## Rationale

- **Visual comparability**: Normalized bars let users instantly see that memory is 85% utilized while CPU is only 40%, regardless of the absolute magnitudes involved.
- **VxRail report consistency**: Presales engineers are accustomed to the normalized bar style from VxRail Sizing Tool outputs and cluster health reports.
- **Absolute values remain accessible**: The data table and tooltips provide exact GiB/TiB/core values for users who need them.
- **Avoids misleading charts**: Absolute-scale bars suggest storage is the bottleneck in almost every scenario simply because its numbers are larger, even when storage utilization percentage is low.

## Consequences

- The chart component receives utilization percentages, not raw values, as its primary data input
- Tooltips must be implemented to surface absolute values on hover
- Color coding per resource type (CPU, memory, storage) remains consistent across all chart instances
- If a future requirement demands absolute-scale comparison (e.g., cost per GB), a separate chart type can be added without changing the default normalized view
