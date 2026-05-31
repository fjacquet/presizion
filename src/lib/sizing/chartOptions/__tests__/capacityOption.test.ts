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
  expect(series[0]?.itemStyle.color).toBe(STATUS_COLORS.required);
});

it('normalizes to percentage of total (required=60%)', () => {
  const series = buildCapacityOption(abs).series as { data: number[] }[];
  expect(series[0]?.data[0]).toBeCloseTo(60);
});

it('horizontal: category y-axis (inverse) + hidden value x-axis maxed at 100', () => {
  const opt = buildCapacityOption(abs);
  expect(opt.yAxis).toMatchObject({ type: 'category', inverse: true });
  expect(opt.xAxis).toMatchObject({ type: 'value', max: 100 });
});

it('caps required at 100% and flags overcommit via the label formatter', () => {
  const over: CapacityAbsRow[] = [
    { name: 'CPU GHz', required: 150, spare: 0, excess: 0, total: 100 },
  ];
  const series = buildCapacityOption(over).series as {
    data: number[];
    label: { formatter: (p: { dataIndex: number }) => string };
  }[];
  // required normalized to 100% (capped)
  expect(series[0]?.data[0]).toBeCloseTo(100);
  const label = series[0]?.label.formatter({ dataIndex: 0 });
  expect(label).toContain('(!!)');
});
