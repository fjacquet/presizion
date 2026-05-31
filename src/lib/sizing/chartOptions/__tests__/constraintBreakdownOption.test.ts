import { expect, it } from 'vitest';
import { buildConstraintBreakdownOption } from '../constraintBreakdownOption';

const rows = [{ name: 'A', cpu: 5, ram: 3, disk: 2 }];

it('emits cpu/ram series + disk when showDisk', () => {
  const opt = buildConstraintBreakdownOption(rows, { cpuBarName: 'CPU-limited', showDisk: true });
  const names = (opt.series as { name: string }[]).map((s) => s.name);
  expect(names).toEqual(['CPU-limited', 'RAM-limited', 'Disk-limited']);
});

it('omits disk series when showDisk is false', () => {
  const opt = buildConstraintBreakdownOption(rows, { cpuBarName: 'CPU-limited', showDisk: false });
  const names = (opt.series as { name: string }[]).map((s) => s.name);
  expect(names).toEqual(['CPU-limited', 'RAM-limited']);
});
