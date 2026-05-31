# Presizion C — Recharts → ECharts Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Recharts with ECharts (`echarts` + `echarts-for-react`), driven by a shared Midnight Executive `echartsTheme`, so the four Step-3 charts render as crisp **SVG**, download as **SVG**, feed the PPTX deck as rasterized PNG, and the capacity breakdown numbers move into the CSV export.

**Architecture:** A single tree-shaken `<Chart>` wrapper (SVG renderer, both Midnight themes registered once, remounts on theme change) renders pure ECharts `option` objects produced by testable builder functions in `src/lib/sizing/chartOptions/`. On-screen "Download" exports the instance's SVG; the PPTX path rasterizes each instance's SVG → PNG (pptxgenjs needs raster) via a new `chartImage.ts`, replacing the retired `chartCapture.ts`/`downloadChartPng.ts`. The B3 `exportPptx` signature changes from DOM `chartRefs` to a pre-captured `ChartCapture` map.

**Tech Stack:** ECharts 6 (`echarts/core` modular), `echarts-for-react@^3`, Vitest. Palette reuses B's `chartColors.ts` brand hex (single source — coordinate, don't duplicate).

**Depends on:** B (Midnight palette + the `pptx/` module this rewires). **Locked decisions:** SVG renderer + SVG download (PPTX rasterizes internally); capacity breakdown numbers go to the CSV export, not baked into images.

---

## Spec coverage

Covers `docs/superpowers/specs/2026-05-30-presizion-C-echarts-migration-design.md`:
- Add ECharts deps / remove recharts → Task 1, Task 9
- Port `echartsTheme` (light+dark, registered once) → Task 1
- Thin `<Chart>` wrapper selecting light/dark from theme store → Task 1
- Re-implement the 4 charts as `option` objects → Tasks 2–5
- Replace PNG export with ECharts native export → Task 6 (resolved: SVG download; PPTX rasterizes)
- Open questions resolved: SVG renderer (not canvas); breakdown → CSV (Task 7); theme re-render via remount (Task 1); modular import + bundle check (Task 9).

## File structure

- `src/theme/echartsTheme.ts` (+ test) — light/dark ECharts theme objects + exported series/status colors.
- `src/components/charts/Chart.tsx` — the wrapper (registry + theme + instance handoff).
- `src/components/charts/useResolvedTheme.ts` — `'light'|'dark'` hook (store + OS).
- `src/lib/sizing/chartOptions/*.ts` (+ tests) — one pure builder per chart option.
- `src/lib/utils/chartImage.ts` (+ test) — `downloadChartSvg`, `instanceToPng`, `ChartCapture`.
- Rewritten: the 4 `src/components/step3/*Chart.tsx` + their tests.
- Modified: `src/lib/utils/export.ts` (+ test) — CSV breakdown; `src/lib/utils/exportPptx.ts` + `pptx/chartTypes.ts` + `pptx/slides/scenarioChartSlide.ts` + `exportPptx.test.ts` — capture rewire; `Step3ReviewExport.tsx` — instance registry.
- Deleted: `src/lib/utils/chartCapture.ts`, `src/lib/utils/downloadChartPng.ts`.

---

### Task 1: Foundation — deps, theme, `<Chart>` wrapper (TDD on theme)

**Files:**
- Modify: `package.json`
- Create: `src/theme/echartsTheme.ts`, `src/theme/__tests__/echartsTheme.test.ts`
- Create: `src/components/charts/useResolvedTheme.ts`, `src/components/charts/Chart.tsx`

- [ ] **Step 1: Add deps**

```bash
npm install echarts@^6 echarts-for-react@^3
```
(Recharts is removed in Task 9, after all consumers migrate.)

- [ ] **Step 2: Write the failing theme test**

Create `src/theme/__tests__/echartsTheme.test.ts`:

```ts
import { expect, it } from 'vitest';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import {
  MIDNIGHT_EXECUTIVE_DARK,
  MIDNIGHT_EXECUTIVE_LIGHT,
  STATUS_COLORS,
} from '../echartsTheme';

it('light theme leads its palette with the brand series and is transparent', () => {
  expect(MIDNIGHT_EXECUTIVE_LIGHT.color[0]).toBe(CHART_COLORS[0]); // #3245b7
  expect(MIDNIGHT_EXECUTIVE_LIGHT.backgroundColor).toBe('transparent');
});

it('dark theme uses lighter axis text than light theme (legibility on dark)', () => {
  expect(MIDNIGHT_EXECUTIVE_DARK.textStyle.color).toBe('#94a3b8'); // slate-400
  expect(MIDNIGHT_EXECUTIVE_LIGHT.textStyle.color).toBe('#64748b'); // slate-500
});

it('zrender-safe: no theme color is an oklch() string', () => {
  const blob = JSON.stringify([MIDNIGHT_EXECUTIVE_LIGHT, MIDNIGHT_EXECUTIVE_DARK, STATUS_COLORS]);
  expect(blob).not.toContain('oklch');
});

it('STATUS_COLORS expose binding/as-is + util bands as hex', () => {
  expect(STATUS_COLORS.asIs).toBe('#94a3b8'); // slate-400
  expect(STATUS_COLORS.binding).toBe(CHART_COLORS[0]);
  for (const c of Object.values(STATUS_COLORS)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
});
```

- [ ] **Step 3: Run it — RED**

Run: `npm run test -- echartsTheme`
Expected: FAIL — `../echartsTheme` does not exist.

- [ ] **Step 4: Implement the theme module**

Create `src/theme/echartsTheme.ts`:

```ts
/**
 * Midnight Executive ECharts theme — light + dark (sub-project C).
 *
 * Pure data module (no React/DOM). zrender (ECharts' renderer) parses only
 * hex/rgb(a)/hsl(a)/named — an `oklch()` string silently falls back to black —
 * so every value here is the sRGB-hex mirror of the `src/index.css` @theme
 * tokens. The brand series reuses `chartColors.ts` (single source); axis/grid
 * text use Tailwind slate hexes (never pure black/white).
 *
 * Registered once at module load by `<Chart>`:
 *   echarts.registerTheme('midnight-executive', MIDNIGHT_EXECUTIVE_LIGHT)
 *   echarts.registerTheme('midnight-executive-dark', MIDNIGHT_EXECUTIVE_DARK)
 */
import { CHART_COLORS } from '@/lib/sizing/chartColors';

const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';
const SLATE_200 = '#e2e8f0';
const SURFACE_700 = '#232933';
const SURFACE_800 = '#11161f';

/** Non-series semantic colors used directly by option builders. */
export const STATUS_COLORS = {
  /** As-Is reference bar/line + non-binding constraint bars (slate-400). */
  asIs: SLATE_400,
  nonBinding: SLATE_400,
  /** Binding constraint + primary series (brand primary-500). */
  binding: CHART_COLORS[0],
  /** Capacity stack segments. */
  required: CHART_COLORS[0],
  spare: CHART_COLORS[1],
  excess: CHART_COLORS[2],
} as const;

export interface MidnightEChartsTheme {
  readonly color: readonly string[];
  readonly backgroundColor: string;
  readonly textStyle: { readonly color: string };
  readonly categoryAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } };
    readonly splitLine: { readonly lineStyle: { readonly color: string } };
    readonly axisLabel: { readonly color: string };
  };
  readonly valueAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } };
    readonly splitLine: { readonly lineStyle: { readonly color: string } };
    readonly axisLabel: { readonly color: string };
  };
  readonly tooltip: {
    readonly backgroundColor: string;
    readonly borderColor: string;
    readonly textStyle: { readonly color: string };
  };
}

export const MIDNIGHT_EXECUTIVE_LIGHT: MidnightEChartsTheme = {
  color: [...CHART_COLORS],
  backgroundColor: 'transparent',
  textStyle: { color: SLATE_500 },
  categoryAxis: {
    axisLine: { lineStyle: { color: SLATE_500 } },
    splitLine: { lineStyle: { color: SLATE_200 } },
    axisLabel: { color: SLATE_500 },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: SLATE_500 } },
    splitLine: { lineStyle: { color: SLATE_200 } },
    axisLabel: { color: SLATE_500 },
  },
  tooltip: { backgroundColor: '#ffffff', borderColor: SLATE_200, textStyle: { color: SLATE_500 } },
};

export const MIDNIGHT_EXECUTIVE_DARK: MidnightEChartsTheme = {
  color: [...CHART_COLORS],
  backgroundColor: 'transparent',
  textStyle: { color: SLATE_400 },
  categoryAxis: {
    axisLine: { lineStyle: { color: SLATE_400 } },
    splitLine: { lineStyle: { color: SURFACE_700 } },
    axisLabel: { color: SLATE_400 },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: SLATE_400 } },
    splitLine: { lineStyle: { color: SURFACE_700 } },
    axisLabel: { color: SLATE_400 },
  },
  tooltip: { backgroundColor: SURFACE_800, borderColor: SURFACE_700, textStyle: { color: SLATE_400 } },
};
```

- [ ] **Step 5: Run it — GREEN**

Run: `npm run test -- echartsTheme`
Expected: PASS (4 tests).

- [ ] **Step 6: Create the resolved-theme hook**

Create `src/components/charts/useResolvedTheme.ts`:

```ts
import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Returns the currently resolved 'light' | 'dark', reacting to BOTH the
 * manual toggle (Zustand `theme`) AND OS changes while in 'system' mode.
 * Used to key/remount the ECharts instance (its theme is fixed at init).
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((s) => s.theme);
  const [osDark, setOsDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme === 'system' ? (osDark ? 'dark' : 'light') : theme;
}
```

- [ ] **Step 7: Create the `<Chart>` wrapper**

Create `src/components/charts/Chart.tsx`:

```tsx
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts/types/dist/shared';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { CSSProperties } from 'react';
import { MIDNIGHT_EXECUTIVE_DARK, MIDNIGHT_EXECUTIVE_LIGHT } from '@/theme/echartsTheme';
import { useResolvedTheme } from './useResolvedTheme';

// Tree-shaken registry — ONLY what the 4 step-3 charts use. The full `echarts`
// barrel (~1 MB) is forbidden; always import from echarts/core + subpaths.
// SVG renderer only (scalable download; PPTX rasterizes via chartImage.ts).
echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  SVGRenderer,
]);

echarts.registerTheme('midnight-executive', MIDNIGHT_EXECUTIVE_LIGHT);
echarts.registerTheme('midnight-executive-dark', MIDNIGHT_EXECUTIVE_DARK);

export type EChartsInstance = echarts.ECharts;

export interface ChartProps {
  option: EChartsOption;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  /** Receives the live instance for SVG download / PPTX capture. */
  onReady?: (instance: EChartsInstance) => void;
}

export function Chart({ option, style, className, ariaLabel, onReady }: ChartProps) {
  // ECharts fixes theme at init — remount on theme change by keying the node.
  const resolved = useResolvedTheme();
  const theme = resolved === 'dark' ? 'midnight-executive-dark' : 'midnight-executive';
  return (
    <ReactEChartsCore
      key={theme}
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      opts={{ renderer: 'svg' }}
      theme={theme}
      className={className}
      style={style ?? { height: '100%', width: '100%' }}
      aria-label={ariaLabel}
      onChartReady={onReady}
    />
  );
}
```

- [ ] **Step 8: Verify build + commit**

Run: `npm run build` (Recharts still present → still compiles).
Expected: success.

```bash
git add package.json package-lock.json src/theme/echartsTheme.ts src/theme/__tests__/echartsTheme.test.ts src/components/charts/
git commit -m "feat(charts): add ECharts theme + tree-shaken <Chart> wrapper (SVG)"
```

---

### Task 2: SizingChart → ECharts (2 sub-charts)

`SizingChart` renders two charts: **Server Count Comparison** (vertical bars; As-Is bar slate, scenario bars brand) and **Constraint Breakdown** (grouped bars: cpu/ram/disk). Each gets a pure option builder + a "Download SVG" button.

**Files:**
- Create: `src/lib/sizing/chartOptions/serverCountOption.ts`, `src/lib/sizing/chartOptions/constraintBreakdownOption.ts` (+ tests in `__tests__/`)
- Rewrite: `src/components/step3/SizingChart.tsx`, `src/components/step3/__tests__/SizingChart.test.tsx`

- [ ] **Step 1: Write the builder tests (RED)**

Create `src/lib/sizing/chartOptions/__tests__/serverCountOption.test.ts`:

```ts
import { expect, it } from 'vitest';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { buildServerCountOption } from '../serverCountOption';

const rows = [
  { name: 'As-Is', servers: 10, isAsIs: true },
  { name: 'Scenario A', servers: 7, isAsIs: false },
];

it('one category per row, values in series data', () => {
  const opt = buildServerCountOption(rows);
  expect(opt.xAxis).toMatchObject({ type: 'category', data: ['As-Is', 'Scenario A'] });
  const series = (opt.series as { data: { value: number }[] }[])[0];
  expect(series.data.map((d) => d.value)).toEqual([10, 7]);
});

it('colors As-Is slate and scenarios brand', () => {
  const opt = buildServerCountOption(rows);
  const data = (opt.series as { data: { itemStyle: { color: string } }[] }[])[0].data;
  expect(data[0].itemStyle.color).toBe(STATUS_COLORS.asIs);
  expect(data[1].itemStyle.color).toBe(CHART_COLORS[0]);
});
```

Create `src/lib/sizing/chartOptions/__tests__/constraintBreakdownOption.test.ts`:

```ts
import { expect, it } from 'vitest';
import { buildConstraintBreakdownOption } from '../constraintBreakdownOption';

const rows = [{ name: 'A', cpu: 5, ram: 3, disk: 2 }];

it('emits cpu/ram series + disk when showDisk', () => {
  const opt = buildConstraintBreakdownOption(rows, { cpuBarName: 'CPU-limited', showDisk: true });
  const names = (opt.series as { name: string }[]).map((s) => s.name);
  expect(names).toEqual(['CPU-limited', 'RAM-limited', 'Disk-limited']);
});

it('omits disk series when showDisk is false', () => {
  const opt = buildConstraintBreakdownOption(rows, { cpuBarName: 'CPU-limited', showDisk: false });
  const names = (opt.series as { name: string }[]).map((s) => s.name);
  expect(names).toEqual(['CPU-limited', 'RAM-limited']);
});
```

- [ ] **Step 2: Run — RED** · `npm run test -- chartOptions` → FAIL (modules missing).

- [ ] **Step 3: Implement the builders**

Create `src/lib/sizing/chartOptions/serverCountOption.ts`:

```ts
import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';

export interface ServerCountRow {
  readonly name: string;
  readonly servers: number;
  readonly isAsIs: boolean;
}

/** Vertical bar: final server count per scenario, As-Is bar in slate. */
export function buildServerCountOption(rows: readonly ServerCountRow[]): EChartsOption {
  let scenarioIdx = 0;
  const data = rows.map((r) => {
    const color = r.isAsIs
      ? STATUS_COLORS.asIs
      : (CHART_COLORS[scenarioIdx++ % CHART_COLORS.length] ?? STATUS_COLORS.asIs);
    return { value: r.servers, itemStyle: { color } };
  });
  return {
    grid: { top: 24, right: 16, bottom: 56, left: 48, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: rows.map((r) => r.name),
      axisLabel: { rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: 'Servers', nameLocation: 'middle', nameGap: 36 },
    series: [
      {
        type: 'bar',
        name: 'Servers Required',
        data,
        label: { show: true, position: 'top', fontWeight: 'bold', fontSize: 12 },
      },
    ],
  };
}
```

Create `src/lib/sizing/chartOptions/constraintBreakdownOption.ts`:

```ts
import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';

export interface ConstraintBreakdownRow {
  readonly name: string;
  readonly cpu: number;
  readonly ram: number;
  readonly disk?: number;
}

export interface ConstraintBreakdownOpts {
  readonly cpuBarName: string;
  readonly showDisk: boolean;
}

/** Grouped vertical bars: cpu/ram(/disk)-limited node counts per scenario. */
export function buildConstraintBreakdownOption(
  rows: readonly ConstraintBreakdownRow[],
  { cpuBarName, showDisk }: ConstraintBreakdownOpts,
): EChartsOption {
  const names = rows.map((r) => r.name);
  const label = { show: true, position: 'top' as const, fontSize: 11 };
  const series = [
    { type: 'bar' as const, name: cpuBarName, data: rows.map((r) => r.cpu), itemStyle: { color: CHART_COLORS[0] }, label },
    { type: 'bar' as const, name: 'RAM-limited', data: rows.map((r) => r.ram), itemStyle: { color: CHART_COLORS[1] }, label },
    ...(showDisk
      ? [{ type: 'bar' as const, name: 'Disk-limited', data: rows.map((r) => r.disk ?? 0), itemStyle: { color: CHART_COLORS[2] }, label }]
      : []),
  ];
  return {
    grid: { top: 36, right: 16, bottom: 56, left: 48, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 30, interval: 0 } },
    yAxis: { type: 'value', name: 'Servers', nameLocation: 'middle', nameGap: 36 },
    series,
  };
}
```

- [ ] **Step 4: Run — GREEN** · `npm run test -- chartOptions` → PASS.

- [ ] **Step 5: Rewrite `SizingChart.tsx`** to use `<Chart>` + builders + per-chart "Download SVG"

Keep the existing data-prep (`comparisonData`, `constraintData`, `cpuBarName`, `showDisk`, `hasAsIs`). Replace each Recharts block with:

```tsx
<div className="h-48 sm:h-72">
  <Chart
    option={buildServerCountOption(comparisonData)}
    ariaLabel="Server count comparison"
    onReady={(i) => { comparisonInstance.current = i; }}
  />
</div>
```

and the Download button: `onClick={() => comparisonInstance.current && downloadChartSvg(comparisonInstance.current, 'cluster-sizing-chart.svg')}` (label "Download SVG", `downloadChartSvg` from Task 6 — for this task, gate the handler on the instance ref and import will resolve once Task 6 lands; if executing strictly in order, do Task 6's `chartImage.ts` first or stub `downloadChartSvg` here and wire in Task 6). Use `useRef<EChartsInstance | null>(null)` for `comparisonInstance` and `constraintInstance`. Drop all `recharts` imports and the `downloadChartPng` import.

> **Ordering note:** `downloadChartSvg` lives in `chartImage.ts` (Task 6). To keep each task independently green, implement `chartImage.ts` (Task 6 Steps for `downloadChartSvg`) BEFORE wiring buttons here, or land Tasks 2–5 with buttons disabled and enable them in Task 6. Recommended: pull Task 6's `chartImage.ts` creation forward to the top of Task 2. The executor may reorder Task 6's `chartImage.ts` creation before Task 2 — note it in the commit.

- [ ] **Step 6: Rewrite `SizingChart.test.tsx`**

Replace the recharts-mock DOM assertions with: (a) the builder tests already cover option shape; (b) a render smoke test that mocks `<Chart>` to a stub and asserts the two headings + two "Download SVG" buttons render. Example mock:

```tsx
vi.mock('@/components/charts/Chart', () => ({
  Chart: ({ ariaLabel }: { ariaLabel?: string }) => <div data-testid="chart" aria-label={ariaLabel} />,
}));
```

Assert: returns null when no scenarios; renders "Server Count Comparison" + "Constraint Breakdown per Scenario"; two charts + two download buttons present.

- [ ] **Step 7: Verify + commit** · `npm run build && npm run test -- SizingChart chartOptions` GREEN.

```bash
git add src/lib/sizing/chartOptions/serverCountOption.ts src/lib/sizing/chartOptions/constraintBreakdownOption.ts src/lib/sizing/chartOptions/__tests__ src/components/step3/SizingChart.tsx src/components/step3/__tests__/SizingChart.test.tsx
git commit -m "feat(charts): migrate SizingChart to ECharts option builders"
```

---

### Task 3: CoreCountChart → ECharts

Vertical bar (physical cores per scenario) + an **As-Is markLine** when `cluster.totalPcores > 0`.

**Files:**
- Create: `src/lib/sizing/chartOptions/coreCountOption.ts` (+ test)
- Rewrite: `src/components/step3/CoreCountChart.tsx`, `__tests__/CoreCountChart.test.tsx`

- [ ] **Step 1: Builder test (RED)** — `coreCountOption.test.ts`:

```ts
import { expect, it } from 'vitest';
import { buildCoreCountOption } from '../coreCountOption';

it('plots cores per scenario with a data label', () => {
  const opt = buildCoreCountOption([{ name: 'A', cores: 240 }], { asIsPcores: 0 });
  const s = (opt.series as { data: number[]; markLine?: unknown }[])[0];
  expect(s.data).toEqual([240]);
  expect(s.markLine).toBeUndefined(); // no As-Is line when 0
});

it('adds an As-Is markLine when asIsPcores > 0', () => {
  const opt = buildCoreCountOption([{ name: 'A', cores: 240 }], { asIsPcores: 200 });
  const s = (opt.series as { markLine: { data: { yAxis: number }[] } }[])[0];
  expect(s.markLine.data[0].yAxis).toBe(200);
});
```

- [ ] **Step 2: Run — RED.**

- [ ] **Step 3: Implement `coreCountOption.ts`:**

```ts
import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';

export interface CoreCountRow {
  readonly name: string;
  readonly cores: number;
}

export function buildCoreCountOption(
  rows: readonly CoreCountRow[],
  { asIsPcores }: { asIsPcores: number },
): EChartsOption {
  return {
    grid: { top: 36, right: 16, bottom: 56, left: 48, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'category', data: rows.map((r) => r.name), axisLabel: { rotate: 30, interval: 0 } },
    yAxis: { type: 'value', name: 'Physical Cores', nameLocation: 'middle', nameGap: 44 },
    series: [
      {
        type: 'bar',
        name: 'Physical Cores',
        data: rows.map((r) => r.cores),
        itemStyle: { color: CHART_COLORS[0] },
        label: { show: true, position: 'top', fontSize: 11 },
        ...(asIsPcores > 0
          ? {
              markLine: {
                symbol: 'none',
                lineStyle: { color: STATUS_COLORS.asIs, type: 'dashed' },
                label: { formatter: 'As-Is', position: 'insideEndTop' },
                data: [{ yAxis: asIsPcores }],
              },
            }
          : {}),
      },
    ],
  };
}
```

- [ ] **Step 4: Run — GREEN.**

- [ ] **Step 5: Rewrite `CoreCountChart.tsx`** — keep `chartData` prep; render `<Chart option={buildCoreCountOption(chartData, { asIsPcores: currentCluster.totalPcores })} onReady={...} />`; "Download SVG" via instance ref; drop recharts + `downloadChartPng`.

- [ ] **Step 6: Rewrite `CoreCountChart.test.tsx`** — mock `<Chart>`; assert heading "Total Physical Cores per Scenario", null-when-empty, download button. Builder test covers the markLine/data.

- [ ] **Step 7: Verify + commit** · `npm run build && npm run test -- CoreCountChart coreCountOption` GREEN.

```bash
git add src/lib/sizing/chartOptions/coreCountOption.ts src/lib/sizing/chartOptions/__tests__/coreCountOption.test.ts src/components/step3/CoreCountChart.tsx src/components/step3/__tests__/CoreCountChart.test.tsx
git commit -m "feat(charts): migrate CoreCountChart to ECharts (As-Is markLine)"
```

---

### Task 4: MinNodesChart → ECharts

Per-scenario **horizontal** bar; binding constraint (max nodes) brand, others slate; node-count label at bar end. Feeds PPTX via the instance registry (Task 8).

**Files:**
- Create: `src/lib/sizing/chartOptions/minNodesOption.ts` (+ test)
- Rewrite: `src/components/step3/MinNodesChart.tsx`, `__tests__/MinNodesChart.test.tsx`

- [ ] **Step 1: Builder test (RED)** — `minNodesOption.test.ts`:

```ts
import { expect, it } from 'vitest';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { buildMinNodesOption } from '../minNodesOption';

const rows = [
  { name: 'CPU', nodes: 8, isBinding: true },
  { name: 'Memory', nodes: 5, isBinding: false },
];

it('horizontal bars, categories on the y-axis bottom-up', () => {
  const opt = buildMinNodesOption(rows);
  expect(opt.yAxis).toMatchObject({ type: 'category' });
  expect(opt.xAxis).toMatchObject({ type: 'value' });
});

it('colors binding brand, non-binding slate', () => {
  const data = (buildMinNodesOption(rows).series as { data: { itemStyle: { color: string } }[] }[])[0].data;
  expect(data[0].itemStyle.color).toBe(CHART_COLORS[0]);
  expect(data[1].itemStyle.color).toBe(STATUS_COLORS.nonBinding);
});
```

- [ ] **Step 2: Run — RED.**

- [ ] **Step 3: Implement `minNodesOption.ts`:**

```ts
import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';

export interface MinNodesRow {
  readonly name: string;
  readonly nodes: number;
  readonly isBinding: boolean;
}

export function buildMinNodesOption(rows: readonly MinNodesRow[]): EChartsOption {
  return {
    grid: { top: 12, right: 56, bottom: 12, left: 12, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1 },
    // ECharts category y-axis renders bottom-up; reverse so first row is on top.
    yAxis: { type: 'category', data: rows.map((r) => r.name), inverse: true },
    series: [
      {
        type: 'bar',
        name: 'Min Nodes',
        data: rows.map((r) => ({
          value: r.nodes,
          itemStyle: { color: r.isBinding ? CHART_COLORS[0] : STATUS_COLORS.nonBinding },
        })),
        label: { show: true, position: 'right', fontWeight: 'bold', fontSize: 11 },
      },
    ],
  };
}
```

- [ ] **Step 4: Run — GREEN.**

- [ ] **Step 5: Rewrite `MinNodesChart.tsx`** — keep `constraintRows` prep. Replace the `chartRefs`-DOM mechanism: instead of a DOM ref written into `chartRefs`, register the ECharts instance. Change the prop to an instance registry:

```tsx
export interface MinNodesChartProps {
  /** PPTX export hook: receives (`minnodes-${id}`, instance) on chart ready. */
  readonly onChartReady?: (key: string, instance: EChartsInstance) => void;
}
```

Render per scenario: `<Chart option={buildMinNodesOption(constraintRows)} onReady={(i) => { localRef.current[id] = i; onChartReady?.(\`minnodes-${id}\`, i); }} />`. "Download SVG" uses the local instance. Drop recharts + `downloadChartPng`.

- [ ] **Step 6: Rewrite `MinNodesChart.test.tsx`** — drop the recharts mock; mock `<Chart>`; assert null-when-empty, per-scenario headings, download button. Builder test covers colors/orientation.

- [ ] **Step 7: Verify + commit** · `npm run build && npm run test -- MinNodesChart minNodesOption` GREEN.

```bash
git add src/lib/sizing/chartOptions/minNodesOption.ts src/lib/sizing/chartOptions/__tests__/minNodesOption.test.ts src/components/step3/MinNodesChart.tsx src/components/step3/__tests__/MinNodesChart.test.tsx
git commit -m "feat(charts): migrate MinNodesChart to ECharts (instance registry for PPTX)"
```

---

### Task 5: CapacityStackedChart → ECharts

Per-scenario **horizontal stacked** bar, normalized to 100%: Required / Spare / Excess segments with in-segment `%` labels (`(!!)` when required overcommits), abs-value tooltip. Feeds PPTX (instance registry). The breakdown numbers move to CSV (Task 7) — no baked table here.

**Files:**
- Create: `src/lib/sizing/chartOptions/capacityOption.ts` (+ test)
- Rewrite: `src/components/step3/CapacityStackedChart.tsx`, `__tests__/CapacityStackedChart.test.tsx`

- [ ] **Step 1: Builder test (RED)** — `capacityOption.test.ts`:

```ts
import { expect, it } from 'vitest';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { buildCapacityOption, type CapacityAbsRow } from '../capacityOption';

const abs: CapacityAbsRow[] = [
  { name: 'CPU GHz', required: 60, spare: 20, excess: 20, total: 100 },
];

it('stacks required/spare/excess as one stack with brand colors', () => {
  const opt = buildCapacityOption(abs);
  const series = opt.series as { name: string; stack: string; itemStyle: { color: string } }[];
  expect(series.map((s) => s.name)).toEqual(['Required', 'Spare', 'Excess']);
  expect(series.every((s) => s.stack === 'cap')).toBe(true);
  expect(series[0].itemStyle.color).toBe(STATUS_COLORS.required);
});

it('normalizes to percentage of total (required=60%)', () => {
  const series = buildCapacityOption(abs).series as { data: number[] }[];
  expect(series[0].data[0]).toBeCloseTo(60);
});
```

- [ ] **Step 2: Run — RED.**

- [ ] **Step 3: Implement `capacityOption.ts`** — port `normalizeRow` + the segment-label logic from the current component into a pure builder:

```ts
import type { EChartsOption } from 'echarts/types/dist/shared';
import { STATUS_COLORS } from '@/theme/echartsTheme';

export interface CapacityAbsRow {
  readonly name: string;
  readonly required: number;
  readonly spare: number;
  readonly excess: number;
  readonly total: number;
}

interface Pcts {
  readonly required: number;
  readonly spare: number;
  readonly excess: number;
}

function normalize(abs: CapacityAbsRow): Pcts {
  if (abs.total === 0) return { required: 0, spare: 0, excess: 0 };
  const required = Math.min((abs.required / abs.total) * 100, 100);
  const spare = Math.min((abs.spare / abs.total) * 100, 100 - required);
  const excess = Math.max(0, 100 - required - spare);
  return { required, spare, excess };
}

/** Horizontal 100%-stacked capacity bars, one category per resource row. */
export function buildCapacityOption(absRows: readonly CapacityAbsRow[]): EChartsOption {
  const pcts = absRows.map(normalize);
  const seg = (key: keyof Pcts, name: string, color: string) => ({
    type: 'bar' as const,
    name,
    stack: 'cap',
    itemStyle: { color },
    data: pcts.map((p) => p[key]),
    label: {
      show: true,
      formatter: (params: { dataIndex: number }) => {
        const p = pcts[params.dataIndex];
        const abs = absRows[params.dataIndex];
        if (!p || !abs || abs.total === 0 || p[key] < 8) return '';
        const overcommit = key === 'required' && abs.required > abs.total;
        return `${p[key].toFixed(1)}%${overcommit ? ' (!!)' : ''}`;
      },
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 11,
    },
  });
  return {
    grid: { top: 8, right: 40, bottom: 8, left: 90, containLabel: true },
    legend: { show: false },
    tooltip: {
      trigger: 'item',
      formatter: (p: { seriesName: string; dataIndex: number }) => {
        const abs = absRows[p.dataIndex];
        if (!abs) return '';
        const key = p.seriesName.toLowerCase() as keyof Pcts;
        const val = abs[key as keyof CapacityAbsRow] as number;
        const pct = abs.total > 0 ? ((val / abs.total) * 100).toFixed(1) : '0.0';
        return `${p.seriesName}: ${val.toFixed(1)} (${pct}% of ${abs.total.toFixed(1)})`;
      },
    },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', data: absRows.map((r) => r.name), inverse: true, axisLabel: { fontSize: 11 } },
    series: [
      seg('required', 'Required', STATUS_COLORS.required),
      seg('spare', 'Spare', STATUS_COLORS.spare),
      seg('excess', 'Excess', STATUS_COLORS.excess),
    ],
  };
}
```

- [ ] **Step 4: Run — GREEN.**

- [ ] **Step 5: Rewrite `CapacityStackedChart.tsx`** — keep the per-scenario `absRows` computation (CPU/Memory/Storage/Usable, `showStorage` gating). Render `<Chart option={buildCapacityOption(absRows)} onReady={(i) => onChartReady?.(\`capacity-${id}\`, i)} />`. Keep the on-screen colored legend row (it uses `CHART_COLORS`). "Download SVG" via instance. Change the prop to `onChartReady?: (key: string, instance: EChartsInstance) => void` (mirror Task 4). Drop recharts + `downloadChartPng`.

- [ ] **Step 6: Rewrite `CapacityStackedChart.test.tsx`** — mock `<Chart>`; assert null-when-empty, per-scenario "Capacity Breakdown -- {name}" headings, the 3-item legend, download button. Builder test covers normalization/labels.

- [ ] **Step 7: Verify + commit** · `npm run build && npm run test -- CapacityStackedChart capacityOption` GREEN.

```bash
git add src/lib/sizing/chartOptions/capacityOption.ts src/lib/sizing/chartOptions/__tests__/capacityOption.test.ts src/components/step3/CapacityStackedChart.tsx src/components/step3/__tests__/CapacityStackedChart.test.tsx
git commit -m "feat(charts): migrate CapacityStackedChart to ECharts stacked bars"
```

---

### Task 6: Chart image utils — SVG download + PPTX rasterization (TDD)

Replace the DOM-capture utilities with ECharts-native ones.

**Files:**
- Create: `src/lib/utils/chartImage.ts` (+ test `__tests__/chartImage.test.ts`)
- Delete: `src/lib/utils/downloadChartPng.ts`, `src/lib/utils/chartCapture.ts`
- Wire: the "Download SVG" handlers in Tasks 2–5 (if not already pulled forward)

- [ ] **Step 1: Write the test (RED)** — `chartImage.test.ts` with a fake instance:

```ts
import { expect, it, vi } from 'vitest';
import { downloadChartSvg, instanceToPng, type EChartsLike } from '../chartImage';

const svg =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%2250%22%3E%3C%2Fsvg%3E';

const fakeInstance = (): EChartsLike => ({
  getDataURL: vi.fn(() => svg),
  getWidth: () => 100,
  getHeight: () => 50,
});

it('downloadChartSvg requests an svg data URL and triggers a download', () => {
  const inst = fakeInstance();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadChartSvg(inst, 'chart.svg');
  expect(inst.getDataURL).toHaveBeenCalledWith({ type: 'svg' });
  expect(click).toHaveBeenCalled();
  click.mockRestore();
});

it('instanceToPng returns logical width/height from the instance', async () => {
  // jsdom can't rasterize; instanceToPng resolves null on Image error — assert it does not throw.
  await expect(instanceToPng(fakeInstance())).resolves.toBeDefined();
});
```

- [ ] **Step 2: Run — RED.**

- [ ] **Step 3: Implement `chartImage.ts`:**

```ts
/**
 * ECharts image helpers (sub-project C) — replace the retired DOM-capture
 * utilities. `downloadChartSvg` exports the instance's scalable SVG;
 * `instanceToPng` rasterizes that SVG to a 2x PNG for the PPTX deck (pptxgenjs
 * embeds raster reliably; SVG poorly). The `ChartCapture` shape matches what
 * `pptx/slides/scenarioChartSlide.ts` consumes.
 */
export interface ChartCapture {
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

/** Minimal ECharts surface used here (keeps the util test-friendly). */
export interface EChartsLike {
  getDataURL(opts: { type: 'svg' | 'png'; pixelRatio?: number; backgroundColor?: string }): string;
  getWidth(): number;
  getHeight(): number;
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Download the chart as a scalable .svg file. */
export function downloadChartSvg(instance: EChartsLike, filename: string): void {
  const url = instance.getDataURL({ type: 'svg' });
  triggerDownload(url, filename);
}

/** Rasterize the instance's SVG to a white-background 2x PNG (PPTX embed). */
export function instanceToPng(instance: EChartsLike, scale = 2): Promise<ChartCapture | null> {
  const width = instance.getWidth();
  const height = instance.getHeight();
  const svgUrl = instance.getDataURL({ type: 'svg' });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}
```

- [ ] **Step 4: Run — GREEN.**

- [ ] **Step 5: Delete the retired utilities + confirm no importers remain**

```bash
git rm src/lib/utils/downloadChartPng.ts src/lib/utils/chartCapture.ts
grep -rn "downloadChartPng\|chartCapture\|chartRefToDataUrl" src --include="*.ts" --include="*.tsx"
```
Expected: only `pptx/chartTypes.ts` + `exportPptx.ts` may still reference `ChartCapture`/`chartRefToDataUrl` until Task 8. Update `pptx/chartTypes.ts` to import `ChartCapture` from `@/lib/utils/chartImage` instead of the deleted `chartCapture`.

- [ ] **Step 6: Ensure all four charts' "Download SVG" buttons import `downloadChartSvg`** and call it with the instance ref. Verify `npm run test -- SizingChart CoreCountChart MinNodesChart CapacityStackedChart` GREEN.

- [ ] **Step 7: Verify + commit** · `npm run build` (will FAIL only if Task 8 not yet done and exportPptx still calls `chartRefToDataUrl`; if so, proceed to Task 8 before building). Commit:

```bash
git add src/lib/utils/chartImage.ts src/lib/utils/__tests__/chartImage.test.ts src/lib/utils/pptx/chartTypes.ts
git commit -m "feat(charts): ECharts SVG download + PNG rasterization, retire DOM capture"
```

---

### Task 7: Move capacity breakdown into the CSV export (TDD)

**Files:**
- Modify: `src/lib/utils/export.ts`, `src/lib/utils/__tests__/export.test.ts`
- Modify: `src/components/step3/Step3ReviewExport.tsx` (pass breakdowns to `buildCsvContent`)

- [ ] **Step 1: Write the failing test** — append to `export.test.ts`:

```ts
it('appends a capacity breakdown section per scenario when breakdowns are provided', () => {
  const csv = buildCsvContent(cluster, [scenario], [result], [breakdown]);
  expect(csv).toContain('Capacity Breakdown');
  expect(csv).toContain('CPU GHz');
  expect(csv).toContain('Required,Spare,Excess,Total');
});
```

(Reuse the test file's existing `cluster`/`scenario`/`result` fixtures; add a `breakdown: VsanCapacityBreakdown` fixture mirroring `exportPptx.test.ts`.)

- [ ] **Step 2: Run — RED.**

- [ ] **Step 3: Extend `buildCsvContent`** to accept an optional `breakdowns` arg and append, after the scenario rows, a blank line + a `Capacity Breakdown` section per scenario (Resource, Required, Spare, Excess, Total for CPU GHz / Memory GiB / Raw Storage TiB / Usable Storage TiB). Signature becomes:

```ts
export function buildCsvContent(
  _cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[] = [],
): string {
```

Append (after the existing `rows`):

```ts
  breakdowns.forEach((bd, i) => {
    const name = scenarios[i]?.name ?? `Scenario ${i + 1}`;
    rows.push('', `Capacity Breakdown,${csvEscape(name)}`, 'Resource,Required,Spare,Excess,Total');
    const line = (label: string, r: { required: number; spare: number; excess: number; total: number }, div = 1) =>
      [label, r.required / div, r.spare / div, Math.max(0, r.excess) / div, r.total / div]
        .map((v) => (typeof v === 'number' ? v.toFixed(1) : v))
        .map(csvEscape)
        .join(',');
    rows.push(line('CPU GHz', bd.cpu));
    rows.push(line('Memory GiB', bd.memory));
    rows.push(line('Raw Storage TiB', bd.storage, 1024));
  });
```

(Import `VsanCapacityBreakdown` from `@/types/breakdown`.)

- [ ] **Step 4: Run — GREEN.**

- [ ] **Step 5: Wire Step 3** — in `Step3ReviewExport.tsx`, `handleDownloadCsv` passes `breakdowns`: `buildCsvContent(currentCluster, scenarios, results, breakdowns)` (the component already has `breakdowns = useVsanBreakdowns()`).

- [ ] **Step 6: Verify + commit** · `npm run build && npm run test -- export Step3ReviewExport` GREEN.

```bash
git add src/lib/utils/export.ts src/lib/utils/__tests__/export.test.ts src/components/step3/Step3ReviewExport.tsx
git commit -m "feat(export): add capacity breakdown section to CSV (replaces baked PNG table)"
```

---

### Task 8: Rewire the PPTX capture path to ECharts instances (TDD)

Replace B3's DOM `chartRefs` capture with pre-captured ECharts PNGs.

**Files:**
- Modify: `src/components/step3/Step3ReviewExport.tsx` (instance registry + capture), `src/lib/utils/exportPptx.ts`, `src/lib/utils/__tests__/exportPptx.test.ts`

- [ ] **Step 1: Step 3 — collect instances + capture on export**

In `Step3ReviewExport.tsx`: replace `chartRefs` with an instance registry `const chartInstances = useRef<Record<string, EChartsInstance>>({})`. Pass `onChartReady={(key, inst) => { chartInstances.current[key] = inst; }}` to `CapacityStackedChart` and `MinNodesChart`. In `handleExportPptx`, before calling `exportPptx`, build the capture map:

```ts
import { instanceToPng } from '@/lib/utils/chartImage';
// ...
const entries = Object.entries(chartInstances.current);
const captures = await Promise.all(entries.map(async ([k, inst]) => [k, await instanceToPng(inst)] as const));
const charts = Object.fromEntries(captures);
await exportPptx(currentCluster, scenarios, results, breakdowns, charts);
```

- [ ] **Step 2: Update `exportPptx` signature (RED via existing test first)**

Change the 5th param from `chartRefs: Record<string, HTMLDivElement | null>` to `charts: Record<string, ChartCapture | null>`. Remove `captureAllCharts` and the `chartRefToDataUrl` import. Map the flat `charts` map into the per-scenario `ScenarioCharts[]` the builder expects:

```ts
const scenarioCharts = scenarios.map((s) => ({
  capacity: charts[`capacity-${s.id}`] ?? null,
  minnodes: charts[`minnodes-${s.id}`] ?? null,
}));
```

`ScenarioCharts`/`ChartCapture` now come from `@/lib/utils/chartImage` (via `pptx/chartTypes.ts`). `pptx/slides/scenarioChartSlide.ts` is unchanged (still consumes `ChartCapture`).

- [ ] **Step 3: Update `exportPptx.test.ts`** — the test currently passes `{}` as `chartRefs` and mocks `chartCapture`. Update it to pass a `charts` map (e.g. `{}` for the no-charts cases — slide count stays 3) and drop the `chartCapture` mock. Keep all palette/font/slide-count assertions. Add one test: passing a `{ 'capacity-a': { dataUrl, width, height } }` capture yields an extra chart slide for that scenario.

- [ ] **Step 4: Verify** · `npm run build && npm run test -- exportPptx Step3ReviewExport` GREEN.

- [ ] **Step 5: Commit**

```bash
git add src/components/step3/Step3ReviewExport.tsx src/lib/utils/exportPptx.ts src/lib/utils/__tests__/exportPptx.test.ts
git commit -m "feat(pptx): capture ECharts instances as PNG (replace DOM chartRefs)"
```

---

### Task 9: Remove Recharts, bundle check, final verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Confirm no recharts importers remain**

```bash
grep -rn "from 'recharts'\|\"recharts\"" src
```
Expected: ZERO.

- [ ] **Step 2: Remove the dependency**

```bash
npm uninstall recharts
```

- [ ] **Step 3: Full verification**

Run:
```bash
npm run build
npm run test
npx biome check .   # NOT rtk lint
```
Expected: build success; full suite green; Biome 0 errors.

- [ ] **Step 4: Bundle check (modular ECharts)**

Inspect `npm run build` output: confirm an `echarts` chunk exists and the main bundle did not balloon (compare against the pre-C >500 kB advisory — ECharts modular + SVG renderer should land in a lazy/vendor chunk; the chart code is only on Step 3). Note the chart vendor chunk size in the commit message. If the main entry grew materially, lazy-load the chart components via `React.lazy` in `Step3ReviewExport` (Step-3-only) — `log` the decision.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(charts): remove recharts — ECharts migration complete"
```

---

## Self-review

- **Spec coverage:** deps swapped (T1/T9); theme ported + registered once (T1); `<Chart>` wrapper with light/dark from store + remount-on-change (T1); 4 charts re-implemented as option builders (T2–T5); native export — SVG download + PPTX rasterization (T6/T8); breakdown → CSV (T7); bundle check (T9). All spec bullets + the 4 open questions resolved.
- **Placeholder scan:** every builder/util/theme has full code; charts give exact render/handler wiring; CSV + PPTX give concrete signature changes. The only soft spot is the per-component data-prep (already exists verbatim in the current components — ported, not invented).
- **Type consistency:** `ChartCapture` is defined once in `chartImage.ts` and consumed by `pptx/chartTypes.ts` → `scenarioChartSlide.ts` (unchanged); `EChartsInstance` from `Chart.tsx`; option builders return `EChartsOption`; `buildCsvContent` gains an optional 4th arg (back-compatible). `onChartReady(key, instance)` signature is identical across MinNodes/Capacity and the Step-3 registry.
- **Ordering risk:** `downloadChartSvg` (T6) is used by the chart buttons (T2–T5); the executor should create `chartImage.ts` before wiring the buttons (noted in T2 Step 5 and T6). `exportPptx` won't build between T6 and T8 — land T8 in the same wave as T6, or keep the old `chartRefs` param until T8. Recommended execution waves: **(A)** T1; **(B)** T6 `chartImage.ts` then T2–T5; **(C)** T7 + T8; **(D)** T9.
- **a11y:** every `<Chart>` gets an `ariaLabel`; download buttons keep their `aria-label`s.
