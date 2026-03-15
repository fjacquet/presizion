# Phase 21: Capacity Charts - Research

**Researched:** 2026-03-15
**Domain:** Recharts horizontal stacked bar charts, percentage labeling, PNG download
**Confidence:** HIGH

## Summary

Phase 21 introduces two new chart components that visualize capacity breakdowns derived
from the already-built `useVsanBreakdowns()` hook (Phase 19). The infrastructure is
nearly complete: `CHART_COLORS`, `downloadChartPng()`, Recharts 2.15, and two reference
chart components (`SizingChart`, `CoreCountChart`) all exist and follow patterns we must
mirror exactly.

The key technical challenge is using Recharts `layout="vertical"` with multiple `Bar`
components sharing a `stackId` to produce horizontal stacked bars. Percentage labels
must be rendered via a custom label function (not the default `LabelList`) because
Recharts positions default labels at cumulative totals in stacked mode, not at individual
segment centers. The second chart (`MinNodesChart`) is a simpler non-stacked horizontal
bar chart with one `Bar` per row.

Both charts render per-scenario data from `useVsanBreakdowns()`. When no scenarios exist
the components return `null` (matching the existing guard pattern). Each chart needs a
`useRef<HTMLDivElement>` wrapper and a "Download PNG" button wired to `downloadChartPng`.

**Primary recommendation:** Follow the `CoreCountChart` / `SizingChart` pattern exactly
for structure, ref, download button, and mock-in-test approach. Only the data shape and
bar orientation (vertical layout) differ from the existing charts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIZ-01 | Stacked horizontal bar chart: Required / Spare / Excess with percentage labels for CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB | `ResourceBreakdown.required/spare/excess/total` fields feed directly into this; custom label renders `(value/total*100).toFixed(0)%` |
| VIZ-02 | Min Nodes per Constraint horizontal bar chart: CPU, Memory, Storage, FT&HA, VMs — identifies binding constraint | `VsanCapacityBreakdown.minNodesByConstraint` Record has keys `cpu`, `memory`, `storage`, `ftha`, `vms` |
| VIZ-03 | Both charts downloadable as PNG | `downloadChartPng(ref, filename)` utility already handles this |
| VIZ-04 | Charts use existing CHART_COLORS professional palette | `CHART_COLORS` already defined in `src/lib/sizing/chartColors.ts` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.4 (installed) | Stacked horizontal bar charts with custom labels | Already used in project, `layout="vertical"` supports horizontal bars |
| react | 19.2.4 (installed) | Component framework | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useVsanBreakdowns` hook | (local) | Derives `VsanCapacityBreakdown[]` from Zustand stores | Call at top of each chart component |
| `downloadChartPng` util | (local) | SVG-to-canvas-to-PNG download | One call per chart's Download PNG button |
| `CHART_COLORS` | (local) | Shared color palette | Use for segment fills; Required=`[0]`, Spare=`[1]`, Excess=`[2]` |
| `useScenariosStore` | (local) | Scenario count for null guard | `scenarios.length === 0` returns `null` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts custom label fn | LabelList component | LabelList shows cumulative value on stacked bars — wrong; custom fn required |
| `useVsanBreakdowns` | calling `computeVsanBreakdown` directly | Hook already handles store wiring; don't duplicate |

**Installation:** No new packages needed — all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/components/step3/
├── CapacityStackedChart.tsx   # VIZ-01 — horizontal stacked bars (Required/Spare/Excess)
├── MinNodesChart.tsx          # VIZ-02 — horizontal bar, one bar per constraint
├── __tests__/
│   ├── CapacityStackedChart.test.tsx
│   └── MinNodesChart.test.tsx
└── Step3ReviewExport.tsx      # (existing) — import both new charts here
```

### Pattern 1: Horizontal Stacked Bar Chart (CapacityStackedChart)

**What:** One row per resource (CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB).
Each row has three colored segments: Required (CHART_COLORS[0] blue), Spare (CHART_COLORS[1]
green), Excess (CHART_COLORS[2] amber). Percentage labels render inside each segment when
the segment is wide enough.

**When to use:** Whenever you need multiple stacked horizontal bars in a single chart.

**Data shape per row:**
```typescript
// Source: src/types/breakdown.ts (ResourceBreakdown)
interface CapacityRow {
  name: string;         // e.g. "CPU GHz", "Memory GiB"
  required: number;
  spare: number;
  excess: number;       // can be negative — clamp to 0 for rendering
  total: number;
}
```

**Recharts configuration:**
```tsx
// Source: recharts.github.io/en-US/api/BarChart + issue #643 pattern
<BarChart data={rows} layout="vertical" margin={{ top: 8, right: 80, left: 120, bottom: 8 }}>
  <XAxis type="number" hide />
  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
  <Tooltip formatter={(v: number) => v.toFixed(1)} />
  <Legend />
  <Bar dataKey="required" name="Required" stackId="cap" fill={CHART_COLORS[0]}
    label={(props) => <SegmentLabel {...props} total={props.total} />} />
  <Bar dataKey="spare"    name="Spare"    stackId="cap" fill={CHART_COLORS[1]}
    label={(props) => <SegmentLabel {...props} total={props.total} />} />
  <Bar dataKey="excess"   name="Excess"   stackId="cap" fill={CHART_COLORS[2]}
    label={(props) => <SegmentLabel {...props} total={props.total} />} />
</BarChart>
```

**Custom percentage label (render only when segment wide enough):**
```tsx
// Source: recharts issue #643 — custom label function pattern
function SegmentLabel(props: {
  x?: number; y?: number; width?: number; height?: number;
  value?: number; total?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0, total = 1 } = props
  if (width < 30 || !total) return null  // too narrow to label
  const pct = ((value / total) * 100).toFixed(0)
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      dy={4}
      textAnchor="middle"
      fill="#fff"
      fontSize={11}
      fontWeight={600}
    >
      {pct}%
    </text>
  )
}
```

**Multi-scenario handling:** Render one `CapacityStackedChart` per scenario (inside a
`map`) with a section heading showing the scenario name. Alternatively, use tabbed
display if the scenario count is large. The simpler path: one chart block per scenario
in a `div.space-y-8`.

### Pattern 2: Min Nodes per Constraint Chart (MinNodesChart)

**What:** One row per constraint key. Five constraints from `minNodesByConstraint`:
`cpu`, `memory`, `storage`, `ftha` (FT&HA), `vms`. Highlight the binding constraint
(the one matching `finalCount`) with a distinct color or annotation.

**Data shape:**
```typescript
// Source: src/lib/sizing/vsanBreakdown.ts — minNodesByConstraint keys
const CONSTRAINT_LABELS: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  storage: 'Storage',
  ftha: 'FT & HA',
  vms: 'VM Count',
}
```

**Recharts configuration:**
```tsx
<BarChart data={constraintRows} layout="vertical"
  margin={{ top: 8, right: 60, left: 90, bottom: 8 }}>
  <XAxis type="number" allowDecimals={false} />
  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
  <Tooltip />
  <Bar dataKey="nodes" name="Min Nodes">
    <LabelList dataKey="nodes" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
    {constraintRows.map((row, idx) => (
      <Cell
        key={idx}
        fill={row.isBinding ? CHART_COLORS[0] : '#94a3b8'}  // blue for binding, slate for others
      />
    ))}
  </Bar>
</BarChart>
```

### Anti-Patterns to Avoid

- **Negative excess in chart:** `excess` can be negative when cluster is undersized.
  Clamp to `Math.max(0, excess)` before passing to Recharts to prevent rendering errors.
- **Default LabelList on stacked bars:** Shows cumulative total, not segment value.
  Always use custom label function on stacked segments.
- **Calling computeScenarioResult directly:** Use `useVsanBreakdowns()` hook which
  handles that internally. Do not import `computeScenarioResult` in chart components.
- **Not mocking Recharts in tests:** `ResponsiveContainer` collapses to 0px in jsdom.
  Copy the vi.mock('recharts') block from `SizingChart.test.tsx` exactly.
- **Importing useVsanBreakdowns without mocking in tests:** Mock the hook, return
  fixture `VsanCapacityBreakdown[]` data; don't test breakdown computation in chart tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG-to-PNG download | Custom canvas pipeline | `downloadChartPng(ref, filename)` | Already handles 2x resolution, blob, anchor click |
| Color palette | Custom color constants | `CHART_COLORS` | Already defined, consistent with existing charts |
| Horizontal bars | CSS flex-based bars | Recharts `layout="vertical"` BarChart | Animation, tooltip, legend all handled |
| Percentage calculation | Inline math | `(value / total * 100).toFixed(0)` in custom label | Simple enough inline, but clamp denominator to avoid div-by-zero |

**Key insight:** This phase is almost entirely composition of already-built primitives.
The only genuinely new code is: (1) data shaping from `VsanCapacityBreakdown` fields
into chart row arrays, and (2) the custom `SegmentLabel` function.

## Common Pitfalls

### Pitfall 1: Negative Excess Values
**What goes wrong:** When a scenario is undersized, `excess` is negative. Recharts
renders negative stacked bars leftward, breaking the visual layout.
**Why it happens:** `excess = total - required - spare` can be negative by design.
**How to avoid:** Clamp: `excess: Math.max(0, breakdown.cpu.excess)` when building
the row array.
**Warning signs:** Bar extends past container boundary or renders in opposite direction.

### Pitfall 2: Wrong Label Position on Stacked Bars
**What goes wrong:** Using `<LabelList>` on a stacked `Bar` shows the cumulative total
at the right edge, not the per-segment percentage.
**Why it happens:** Recharts LabelList position "insideEnd" on stacked bars uses the
stacked endpoint, not segment center.
**How to avoid:** Use the custom label prop function pattern (see Pattern 1 above).
Render `null` when `width < 30` to skip labels on thin segments.
**Warning signs:** All three segments show the same label value, or label appears
outside the segment.

### Pitfall 3: Per-Scenario vs Aggregate Chart Layout
**What goes wrong:** Rendering all scenarios in one stacked chart with 4 rows × N
scenarios produces an oversized chart that is hard to read.
**Why it happens:** VIZ-01 says "for each resource" — ambiguous whether it's per
scenario or aggregate.
**How to avoid:** Render one chart block per scenario, clearly headed with scenario
name. This matches the "side-by-side comparison" theme of Step 3 and keeps each chart
focused (4 rows max).
**Warning signs:** Chart height exceeds viewport, bars become too thin to label.

### Pitfall 4: Usable vs Raw Storage Units
**What goes wrong:** Showing GiB values for storage when TiB is expected by VIZ-01.
**Why it happens:** All `StorageBreakdown` values are internally in GiB (VSAN-10).
**How to avoid:** Convert GiB to TiB (divide by 1024) when populating the chart rows
for storage resources. Do this in the data-shaping step, not in the label formatter.
**Warning signs:** Storage values appear ~1000x larger than CPU/Memory numbers.

### Pitfall 5: ResponsiveContainer Zero Height in Tests
**What goes wrong:** Test renders 0-height chart, assertions fail or throw.
**Why it happens:** jsdom has no layout engine; `ResponsiveContainer` gets 0×0.
**How to avoid:** Mock recharts module identically to `SizingChart.test.tsx`. The
mock replaces `ResponsiveContainer` with a plain `<div>`.
**Warning signs:** Test output shows empty container or height-related errors.

### Pitfall 6: ftha Key Capitalization
**What goes wrong:** Display label shows "ftha" instead of "FT & HA".
**Why it happens:** `minNodesByConstraint` uses the key `ftha` (lowercase, no space).
**How to avoid:** Maintain a `CONSTRAINT_LABELS` lookup map in the component. Always
map through it before rendering.

## Code Examples

Verified patterns from existing codebase and Recharts docs:

### Empty Guard Pattern (matches SizingChart, CoreCountChart)
```tsx
// Source: src/components/step3/CoreCountChart.tsx line 33
const breakdowns = useVsanBreakdowns()
const scenarios = useScenariosStore((s) => s.scenarios)
if (scenarios.length === 0) return null
```

### Ref + Download Button Pattern
```tsx
// Source: src/components/step3/CoreCountChart.tsx lines 30, 40-50
const containerRef = useRef<HTMLDivElement | null>(null)
// ...
<div className="flex items-center justify-between">
  <h3 className="text-sm font-medium text-muted-foreground">
    Capacity Breakdown — {scenario.name}
  </h3>
  <Button
    variant="outline"
    size="sm"
    onClick={() => downloadChartPng(containerRef, 'capacity-chart.png')}
    aria-label="Download chart as PNG"
  >
    Download PNG
  </Button>
</div>
<div ref={containerRef}>
  <ResponsiveContainer width="100%" height={220}>
    {/* chart */}
  </ResponsiveContainer>
</div>
```

### GiB to TiB conversion for Storage rows
```typescript
// Source: inferred from VSAN-10 (REQUIREMENTS.md) — all storage in GiB internally
const GIB_TO_TIB = 1 / 1024

function storageRow(label: string, bd: StorageBreakdown, field: 'required' | 'spare' | 'excess' | 'total') {
  return {
    name: label,
    required: bd.required * GIB_TO_TIB,
    spare:    bd.spare    * GIB_TO_TIB,
    excess:   Math.max(0, bd.excess) * GIB_TO_TIB,
    total:    bd.total    * GIB_TO_TIB,
  }
}
```

### Recharts vi.mock block (required in every chart test)
```tsx
// Source: src/components/step3/__tests__/SizingChart.test.tsx lines 7-18
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ name, children }: { name: string; children?: React.ReactNode }) => <span data-testid="bar-series">{name}{children}</span>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => <div data-testid="legend" />,
  LabelList: ({ dataKey }: { dataKey: string }) => <span data-testid="label-list">{dataKey}</span>,
  Cell: () => null,
}))
```

### Hook mock pattern for chart tests
```tsx
// Source: src/components/step3/__tests__/CoreCountChart.test.tsx line 22-27
vi.mock('@/hooks/useVsanBreakdowns', () => ({
  useVsanBreakdowns: vi.fn(),
}))
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns'
// ...
vi.mocked(useVsanBreakdowns).mockReturnValue([fixtureBreakdown])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-test `useScenariosResults` mock | Same pattern extended to `useVsanBreakdowns` | Phase 19 | Hook now returns `VsanCapacityBreakdown[]` |
| Separate chart files | Each chart one file ≤150 lines | Throughout | Both new charts fit easily in one file each |
| LabelList inside stacked bars | Custom label prop function | Recharts known limitation | Must implement custom `SegmentLabel` |

**Deprecated/outdated:**
- Nothing deprecated in scope. Recharts `layout="vertical"` has been stable since v2.

## Open Questions

1. **Multi-scenario display strategy**
   - What we know: VIZ-01 says "for each resource" — could mean per-resource across all scenarios in one chart, or one chart per scenario
   - What's unclear: Whether chart height scales acceptably with 3+ scenarios in a single chart (4 resources × N scenarios = 4N rows)
   - Recommendation: One `CapacityStackedChart` per scenario (iterate `breakdowns`). This bounds each chart to 4 rows and avoids overflow.

2. **Usable Storage vs Raw Storage both in VIZ-01**
   - What we know: VIZ-01 mentions "CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB" — 4 rows
   - What's unclear: `StorageBreakdown` has both `rawRequired` and `usableRequired` — which fields map to "Usable Storage TiB" chart row
   - Recommendation: The "Usable Storage TiB" row uses `usableRequired` (demand, before FTT) as `required`, with `spare` and `excess` derived proportionally from the usable-tier. The "Raw Storage TiB" row uses the `required / spare / excess / total` fields directly (they represent raw tier). The planner should decide whether to show both rows in a single chart or treat usable as a reference line.

## Sources

### Primary (HIGH confidence)
- `src/components/step3/SizingChart.tsx` — ref pattern, download button, Recharts imports
- `src/components/step3/CoreCountChart.tsx` — single-bar horizontal pattern (reference impl)
- `src/lib/sizing/chartColors.ts` — `CHART_COLORS` palette
- `src/lib/utils/downloadChartPng.ts` — download utility API
- `src/types/breakdown.ts` — `ResourceBreakdown`, `StorageBreakdown`, `VsanCapacityBreakdown`
- `src/hooks/useVsanBreakdowns.ts` — hook return type and dependency
- `src/lib/sizing/vsanBreakdown.ts` — `minNodesByConstraint` key names
- `package.json` — recharts 2.15.4 confirmed installed

### Secondary (MEDIUM confidence)
- [Recharts BarChart API](https://recharts.github.io/en-US/api/BarChart/) — `layout="vertical"` prop (verified via official site)
- [Recharts Bar API](https://recharts.github.io/en-US/api/Bar/) — `stackId`, `label` custom function prop (verified)
- [Recharts issue #643](https://github.com/recharts/recharts/issues/643) — custom label function required for stacked bars (community-verified pattern)

### Tertiary (LOW confidence)
- WebSearch for horizontal stacked bar with percentage labels — corroborates custom label approach; not single authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use in the project
- Architecture: HIGH — patterns directly copied from existing chart components in codebase
- Pitfalls: HIGH — most are derived from reading actual source code (negative excess, GiB/TiB, test mocking)
- Label approach: MEDIUM — custom label function pattern verified via official issue + docs, not a dedicated docs page

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (Recharts 2.x API is stable; project deps are locked)
