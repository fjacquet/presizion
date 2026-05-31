import type { EChartsOption } from 'echarts/types/dist/shared';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { baseGrid, categoryXAxis, valueYAxis } from './_shared';

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
    {
      type: 'bar' as const,
      name: cpuBarName,
      data: rows.map((r) => r.cpu),
      itemStyle: { color: CHART_COLORS[0] },
      label,
    },
    {
      type: 'bar' as const,
      name: 'RAM-limited',
      data: rows.map((r) => r.ram),
      itemStyle: { color: CHART_COLORS[1] },
      label,
    },
    ...(showDisk
      ? [
          {
            type: 'bar' as const,
            name: 'Disk-limited',
            data: rows.map((r) => r.disk ?? 0),
            itemStyle: { color: CHART_COLORS[2] },
            label,
          },
        ]
      : []),
  ];
  return {
    grid: baseGrid({ top: 36 }),
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: categoryXAxis(names),
    yAxis: valueYAxis('Servers', 36),
    series,
  };
}
