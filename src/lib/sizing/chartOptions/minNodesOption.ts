import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { baseGrid } from './_shared';

export interface MinNodesRow {
  readonly name: string;
  readonly nodes: number;
  readonly isBinding: boolean;
}

/**
 * Horizontal bar: minimum node count per constraint. The binding constraint
 * (highest node count) is brand-colored; non-binding constraints are slate.
 */
export function buildMinNodesOption(rows: readonly MinNodesRow[]): EChartsOption {
  return {
    grid: baseGrid({ top: 12, right: 56, bottom: 12, left: 12 }),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1 },
    // ECharts category y-axis renders bottom-up; inverse so the first row is on top.
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
