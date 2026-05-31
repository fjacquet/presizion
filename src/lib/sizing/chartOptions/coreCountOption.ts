import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { baseGrid, categoryXAxis, valueYAxis } from './_shared';

export interface CoreCountRow {
  readonly name: string;
  readonly cores: number;
}

/** Vertical bar: total physical cores per scenario, with an As-Is markLine. */
export function buildCoreCountOption(
  rows: readonly CoreCountRow[],
  { asIsPcores }: { asIsPcores: number },
): EChartsOption {
  return {
    grid: baseGrid({ top: 36 }),
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: categoryXAxis(rows.map((r) => r.name)),
    yAxis: valueYAxis('Physical Cores', 44),
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
