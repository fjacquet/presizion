import { expect, it } from 'vitest';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { buildServerCountOption } from '../serverCountOption';

const rows = [
  { name: 'As-Is', servers: 10, isAsIs: true },
  { name: 'Scenario A', servers: 7, isAsIs: false },
];

it('one category per row, values in series data', () => {
  const opt = buildServerCountOption(rows);
  expect(opt.xAxis).toMatchObject({ type: 'category', data: ['As-Is', 'Scenario A'] });
  const series = (opt.series as { data: { value: number }[] }[])[0];
  expect(series?.data.map((d) => d.value)).toEqual([10, 7]);
});

it('colors As-Is slate and scenarios brand', () => {
  const opt = buildServerCountOption(rows);
  const data = (opt.series as { data: { itemStyle: { color: string } }[] }[])[0]?.data;
  expect(data?.[0]?.itemStyle.color).toBe(STATUS_COLORS.asIs);
  expect(data?.[1]?.itemStyle.color).toBe(CHART_COLORS[0]);
});
