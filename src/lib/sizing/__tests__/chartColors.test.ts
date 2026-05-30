import { expect, it } from 'vitest';
import { CHART_COLORS } from '../chartColors';

it('CHART_COLORS leads with the Midnight Executive brand series', () => {
  // Brand series shared with PPTX (PPTX_COLORS) and ECharts (sub-project C):
  // primary-500 / primary-300 / primary-200, then status bands + extra series.
  expect(CHART_COLORS[0]).toBe('#3245b7'); // primary-500 — primary bar
  expect(CHART_COLORS[1]).toBe('#819ae9'); // primary-300 — series 2
  expect(CHART_COLORS[2]).toBe('#b0c2f9'); // primary-200 — series 3
});

it('CHART_COLORS includes the utilization status bands', () => {
  expect(CHART_COLORS).toContain('#4aa342'); // util-low  (green)
  expect(CHART_COLORS).toContain('#ef8700'); // util-mid  (orange)
  expect(CHART_COLORS).toContain('#df202e'); // util-high (red)
});

it('CHART_COLORS values are all 6-digit hex', () => {
  for (const c of CHART_COLORS) {
    expect(c).toMatch(/^#[0-9a-f]{6}$/);
  }
});
