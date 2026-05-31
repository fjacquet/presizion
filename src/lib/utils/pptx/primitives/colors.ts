/**
 * Midnight Executive palette for pptxgenjs (sub-project B).
 *
 * pptxgenjs convention: hex WITHOUT the leading `#`. Values mirror the
 * sRGB-hex form of `src/index.css` `@theme` tokens and `chartColors.ts` —
 * the single brand source shared with the web app and the ECharts theme (C).
 * Gold is the factual threshold marker only, never a verdict.
 */
export const PPTX_COLORS = {
  primary500: '3245b7',
  primary300: '819ae9',
  primary200: 'b0c2f9',
  surface200: 'd4d8de',
  surface700: '232933',
  surface800: '11161f',
  accent: 'f9b935',
  ink: '0f172a',
  inkMuted: '475569',
  paper: 'ffffff',
  pageBg: 'f8fafc',
  hairline: 'e2e8f0',
  /** Utilization status bands (match @theme util-low/mid/high). */
  utilLow: '4aa342',
  utilMid: 'ef8700',
  utilHigh: 'df202e',
} as const;

export type PptxColor = (typeof PPTX_COLORS)[keyof typeof PPTX_COLORS];
