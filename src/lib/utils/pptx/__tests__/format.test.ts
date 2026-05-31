import { expect, it } from 'vitest';
import { f1, utilBandColor } from '../format';
import { PPTX_COLORS } from '../primitives/colors';

it('f1 formats to one decimal place', () => {
  expect(f1(74.36)).toBe('74.4');
  expect(f1(10)).toBe('10.0');
});

it('utilBandColor maps utilization % to status bands', () => {
  expect(utilBandColor(50)).toBe(PPTX_COLORS.utilLow); // < 70 green
  expect(utilBandColor(80)).toBe(PPTX_COLORS.utilMid); // 70–85 orange
  expect(utilBandColor(95)).toBe(PPTX_COLORS.utilHigh); // > 85 red
});
