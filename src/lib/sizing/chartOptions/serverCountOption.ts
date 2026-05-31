import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { baseGrid, categoryXAxis, valueYAxis } from './_shared';

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
    grid: baseGrid({ top: 24 }),
    tooltip: { trigger: 'axis' },
    xAxis: categoryXAxis(rows.map((r) => r.name)),
    yAxis: valueYAxis('Servers', 36),
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
