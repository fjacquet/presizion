/**
 * Midnight Executive PPTX theme — Arial body/headings, Consolas metrics,
 * 16:9 wide deck on the shipped sRGB-hex palette. Pure const module (no
 * React, no DOM), shaped like vatlas's pptx/theme.ts. Low text density:
 * the deck presents; the on-screen Step 3 review carries the detail.
 */
import { PPTX_COLORS } from './primitives/colors';

export const SLIDE = {
  /** pptxgenjs LAYOUT_WIDE = 13.333 × 7.5 in (16:9). */
  w: 13.333,
  h: 7.5,
  margin: 0.5,
} as const;

export const PPTX_THEME = {
  layout: 'LAYOUT_WIDE',
  bg: PPTX_COLORS.paper,
  title: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 28, bold: true },
  heading: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 20, bold: true },
  body: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 12 },
  muted: { color: PPTX_COLORS.inkMuted, fontFace: 'Arial', fontSize: 11 },
  /** Metric values: Consolas, tabular — mirrors the on-screen idiom. */
  metric: { color: PPTX_COLORS.ink, fontFace: 'Consolas', fontSize: 12, bold: true },
  /** Table header fill (brand) + white text. */
  tableHeader: { fill: PPTX_COLORS.primary500, color: PPTX_COLORS.paper },
  series: [PPTX_COLORS.primary500, PPTX_COLORS.primary300, PPTX_COLORS.primary200],
  flagFill: PPTX_COLORS.accent,
} as const;
