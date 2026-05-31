import { expect, it } from 'vitest';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { MIDNIGHT_EXECUTIVE_DARK, MIDNIGHT_EXECUTIVE_LIGHT, STATUS_COLORS } from '../echartsTheme';

it('light theme leads its palette with the brand series and is transparent', () => {
  expect(MIDNIGHT_EXECUTIVE_LIGHT.color[0]).toBe(CHART_COLORS[0]); // #3245b7
  expect(MIDNIGHT_EXECUTIVE_LIGHT.backgroundColor).toBe('transparent');
});

it('dark theme uses lighter axis text than light theme (legibility on dark)', () => {
  expect(MIDNIGHT_EXECUTIVE_DARK.textStyle.color).toBe('#94a3b8'); // slate-400
  expect(MIDNIGHT_EXECUTIVE_LIGHT.textStyle.color).toBe('#64748b'); // slate-500
});

it('zrender-safe: no theme color is an oklch() string', () => {
  const blob = JSON.stringify([MIDNIGHT_EXECUTIVE_LIGHT, MIDNIGHT_EXECUTIVE_DARK, STATUS_COLORS]);
  expect(blob).not.toContain('oklch');
});

it('STATUS_COLORS expose binding/as-is + util bands as hex', () => {
  expect(STATUS_COLORS.asIs).toBe('#94a3b8'); // slate-400
  expect(STATUS_COLORS.binding).toBe(CHART_COLORS[0]);
  for (const c of Object.values(STATUS_COLORS)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
});
