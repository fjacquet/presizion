/**
 * Shared ECharts axis/grid helpers for the Step-3 chart option builders.
 *
 * These factor out the repeated category-x-axis / value-y-axis / grid patterns
 * while letting each builder pass its intentional divergences (grid `top`,
 * axis `nameGap`, legend) through params/overrides. Pure data — no React/DOM.
 */
import type { EChartsOption } from 'echarts/types/dist/shared';

type GridOption = NonNullable<EChartsOption['grid']>;
type XAxisOption = NonNullable<EChartsOption['xAxis']>;
type YAxisOption = NonNullable<EChartsOption['yAxis']>;

/** Base grid (containLabel) with optional per-chart overrides. */
export function baseGrid(overrides?: Partial<GridOption>): GridOption {
  return {
    top: 24,
    right: 16,
    bottom: 56,
    left: 48,
    containLabel: true,
    ...overrides,
  };
}

/** Rotated category x-axis used by the vertical bar charts. */
export function categoryXAxis(names: readonly string[]): XAxisOption {
  return {
    type: 'category',
    data: [...names],
    axisLabel: { rotate: 30, interval: 0 },
  };
}

/** Named value y-axis (vertical-middle title) with a tunable gap. */
export function valueYAxis(name: string, nameGap: number): YAxisOption {
  return {
    type: 'value',
    name,
    nameLocation: 'middle',
    nameGap,
  };
}
