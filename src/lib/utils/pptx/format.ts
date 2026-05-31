/**
 * Number + utilization formatting for the PPTX deck. Single-locale for now;
 * sub-project E adds i18n. Thresholds match the on-screen util color coding.
 */
import { PPTX_COLORS } from './primitives/colors';

/** Format a number to one decimal place. */
export function f1(n: number): string {
  return n.toFixed(1);
}

/** Utilization % → status-band hex (no `#`): <70 low, ≤85 mid, else high. */
export function utilBandColor(pct: number): string {
  if (pct < 70) return PPTX_COLORS.utilLow;
  if (pct <= 85) return PPTX_COLORS.utilMid;
  return PPTX_COLORS.utilHigh;
}
