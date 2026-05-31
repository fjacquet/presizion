import type { EChartsOption } from 'echarts/types/dist/shared';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { baseGrid } from './_shared';

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

/** Normalize an absolute row to percentages (capped so the stack tops at 100%). */
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
      fontWeight: 'bold' as const,
      fontSize: 11,
    },
  });
  return {
    grid: baseGrid({ top: 8, right: 40, bottom: 8, left: 90 }),
    legend: { show: false },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { seriesName: string; dataIndex: number };
        const abs = absRows[p.dataIndex];
        if (!abs) return '';
        const key = p.seriesName.toLowerCase() as keyof Pcts;
        const val = abs[key as keyof CapacityAbsRow] as number;
        const pct = abs.total > 0 ? ((val / abs.total) * 100).toFixed(1) : '0.0';
        return `${p.seriesName}: ${val.toFixed(1)} (${pct}% of ${abs.total.toFixed(1)})`;
      },
    },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: {
      type: 'category',
      data: absRows.map((r) => r.name),
      inverse: true,
      axisLabel: { fontSize: 11 },
    },
    series: [
      seg('required', 'Required', STATUS_COLORS.required),
      seg('spare', 'Spare', STATUS_COLORS.spare),
      seg('excess', 'Excess', STATUS_COLORS.excess),
    ],
  };
}
