# Architecture Research — v2.0 vSAN-Aware Sizing Engine

**Researched:** 2026-03-14
**Confidence:** HIGH

## 1. Where Do vSAN Parameters Live?

**Decision: Extend Scenario interface with optional fields.** No new Zustand store.

New fields on `Scenario`:
- `vsanFttPolicy?: 'mirror-1' | 'mirror-2' | 'mirror-3' | 'raid5' | 'raid6'`
- `vsanCompressionFactor?: number` (1.0 = none, 1.5 = conservative, etc.)
- `vsanSlackPercent?: number` (default 25)
- `vsanMemoryPerHostGb?: number` (default 6)
- `cpuGrowthPercent?: number` (default 0)
- `memoryGrowthPercent?: number` (default 0)
- `storageGrowthPercent?: number` (default 0)

**UI:** New collapsible "vSAN & Growth" section in ScenarioCard (Step 2). Collapsed by default. Only visible when layoutMode === 'hci'.

**Why not a new store:** These are per-scenario settings (different scenarios might compare Mirror vs RAID-5). Keeping them on Scenario preserves the existing derive-on-read pattern.

## 2. Capacity Breakdown Type

**New type parallel to ScenarioResult:**

```typescript
interface VsanCapacityBreakdown {
  cpu: ResourceBreakdown;
  memory: ResourceBreakdown;
  storage: StorageBreakdown;
  minNodesByConstraint: Record<string, number>; // CPU, Memory, Storage, FT&HA, VMs
}

interface ResourceBreakdown {
  required: number;
  reservedMaxUtil: number;
  haReserve: number;
  spare: number;    // reservedMaxUtil + haReserve
  excess: number;
  total: number;
}

interface StorageBreakdown extends ResourceBreakdown {
  usableRequired: number;
  rawRequired: number;
  fttOverhead: number;
  slackSpace: number;
}
```

**New hook: `useVsanBreakdowns()`** — parallel to `useScenariosResults()`. Reads from same stores, returns `VsanCapacityBreakdown[]`. Existing `useScenariosResults` unchanged.

## 3. Storage Raw vs Usable

**Replace CALC-03 branch in constraints.ts** when vSAN fields are present:

```
if (scenario.vsanFttPolicy) {
  // vSAN-aware path: compute raw from usable
  diskLimitedCount = serverCountByVsanStorage(...)
} else {
  // Legacy path: existing serverCountByDisk unchanged
  diskLimitedCount = serverCountByDisk(...)
}
```

No breaking changes — existing behavior preserved when vSAN fields are absent.

## 4. Stacked Horizontal Bar Charts

**New component: `CapacityStackedChart`** — separate from SizingChart.

Recharts pattern:
```tsx
<BarChart layout="vertical" data={capacityData}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="resource" />
  <Bar dataKey="required" stackId="capacity" fill={CHART_COLORS[0]} />
  <Bar dataKey="spare" stackId="capacity" fill={CHART_COLORS[3]} />
  <Bar dataKey="excess" stackId="capacity" fill={CHART_COLORS[1]} />
</BarChart>
```

## 5. Growth Projections

**Pre-computation on demand inputs:**

```typescript
const growthFactor = 1 + (scenario.cpuGrowthPercent ?? 0) / 100;
const effectiveVcpus = baseVcpus * growthFactor;
```

Applied in `computeScenarioResult` before constraint calculations. NOT post-multiply on server count.

## 6. PDF Report Export

**jsPDF + jspdf-autotable** via dynamic import in `src/lib/utils/exportPdf.ts`.

For charts: use existing `downloadChartPng` approach — render chart SVG to canvas, then embed canvas image in PDF via `doc.addImage()`.

Pattern:
1. Build PDF structure (title page, executive summary, breakdown tables, charts)
2. For each chart: SVG -> canvas -> PNG data URL -> addImage
3. For each table: jspdf-autotable renders directly from data arrays

## 7. Build Order

| Phase | What | Dependencies |
|-------|------|-------------|
| 18 | vSAN formula engine (constants, storage pipeline, capacity breakdown types) | None |
| 19 | Wire into constraints.ts + new useVsanBreakdowns hook | Phase 18 |
| 20 | Scenario form: vSAN settings UI (FTT, compression, slack, growth) | Phase 19 |
| 21 | Capacity breakdown table + stacked charts + min-nodes chart | Phase 19-20 |
| 22 | PDF report export | Phase 21 |

## Key Architecture Principles

1. **Derive-on-read preserved** — VsanCapacityBreakdown computed in hook, never stored
2. **No new Zustand store** — vSAN params live on Scenario
3. **No breaking changes** — existing constraints path untouched when vSAN fields absent
4. **Lazy loading** — jsPDF loaded only on export click (same pattern as xlsx)
5. **GiB internally** — all storage computations in GiB; display can convert to TiB for large values
