import { expect, it } from 'vitest';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { STATUS_COLORS } from '@/theme/echartsTheme';
import { buildMinNodesOption } from '../minNodesOption';

const rows = [
  { name: 'CPU', nodes: 8, isBinding: true },
  { name: 'Memory', nodes: 5, isBinding: false },
];

it('horizontal bars, categories on the y-axis (inverse top-down)', () => {
  const opt = buildMinNodesOption(rows);
  expect(opt.yAxis).toMatchObject({ type: 'category', inverse: true });
  expect(opt.xAxis).toMatchObject({ type: 'value' });
});

it('colors binding brand, non-binding slate', () => {
  const data = (
    buildMinNodesOption(rows).series as { data: { itemStyle: { color: string } }[] }[]
  )[0]?.data;
  expect(data?.[0]?.itemStyle.color).toBe(CHART_COLORS[0]);
  expect(data?.[1]?.itemStyle.color).toBe(STATUS_COLORS.nonBinding);
});

it('places node-count labels at the bar end (right)', () => {
  const series = (buildMinNodesOption(rows).series as { label: { position: string } }[])[0];
  expect(series?.label.position).toBe('right');
});
