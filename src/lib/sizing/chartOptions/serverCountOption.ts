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
