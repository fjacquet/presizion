/**
 * Shared brand color palette for all bar charts — the Midnight Executive
 * series (sub-project B). These sRGB-hex values are the single source of
 * truth shared with the PPTX export (`pptx/primitives/colors.ts`, B3) and
 * the ECharts theme (sub-project C): primary ramp first, then status bands
 * and extra series colors.
 */
export const CHART_COLORS = [
  '#3245b7', // primary-500 — primary bar / CPU-limited
  '#819ae9', // primary-300 — series 2 / RAM-limited
  '#b0c2f9', // primary-200 — series 3 / Disk-limited
  '#4aa342', // util-low (green)
  '#ef8700', // util-mid (orange)
  '#df202e', // util-high (red)
] as const;
