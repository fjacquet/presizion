import { expect, it } from 'vitest';
import { buildCoreCountOption } from '../coreCountOption';

it('plots cores per scenario with a data label', () => {
  const opt = buildCoreCountOption([{ name: 'A', cores: 240 }], { asIsPcores: 0 });
  const s = (opt.series as { data: number[]; markLine?: unknown }[])[0];
  expect(s?.data).toEqual([240]);
  expect(s?.markLine).toBeUndefined(); // no As-Is line when 0
});

it('adds an As-Is markLine when asIsPcores > 0', () => {
  const opt = buildCoreCountOption([{ name: 'A', cores: 240 }], { asIsPcores: 200 });
  const s = (opt.series as { markLine: { data: { yAxis: number }[] } }[])[0];
  expect(s?.markLine.data[0]?.yAxis).toBe(200);
});
