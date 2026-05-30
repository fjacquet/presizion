/**
 * Shared pptxgenjs table-cell helpers for the slide builders. Centralizes the
 * brand header cell, alternating-fill data/plain cells, and the colored util-dot
 * cell so every slide renders byte-identical cells from one source of truth.
 */
import { utilBandColor } from '../format';
import { PPTX_COLORS } from '../primitives/colors';
import { PPTX_THEME } from '../theme';

/** Alternating row fill: even rows page-bg, odd rows paper. */
function rowFill(rowIdx: number): string {
  return rowIdx % 2 === 0 ? PPTX_COLORS.pageBg : PPTX_COLORS.paper;
}

/** Brand table-header cell (primary500 fill, white Arial bold). */
export function headerCell(text: string, fontSize = 10) {
  return {
    text,
    options: {
      bold: true,
      fill: { color: PPTX_THEME.tableHeader.fill },
      color: PPTX_THEME.tableHeader.color,
      fontSize,
      fontFace: 'Arial',
    },
  };
}

/** Alternating-row-fill data cell. `bold` switches to Arial label styling. */
export function dataCell(text: string, rowIdx: number, bold = false) {
  return {
    text,
    options: {
      fill: { color: rowFill(rowIdx) },
      fontSize: 10,
      fontFace: bold ? 'Arial' : 'Consolas',
      bold,
    },
  };
}

/** Colored util-dot cell (Arial dot + Consolas value) on the alternating fill. */
export function utilCell(pct: number, rowIdx: number) {
  return {
    text: [
      { text: '● ', options: { color: utilBandColor(pct), fontSize: 10, fontFace: 'Arial' } },
      {
        text: `${pct.toFixed(1)}%`,
        options: { color: PPTX_COLORS.ink, fontSize: 10, fontFace: 'Consolas' },
      },
    ],
    options: { fill: { color: rowFill(rowIdx) } },
  };
}

/** Plain alternating-fill cell; `mono` switches the value to Consolas. */
export function plainCell(text: string, rowIdx: number, mono = false) {
  return {
    text,
    options: {
      fill: { color: rowFill(rowIdx) },
      fontSize: 10,
      fontFace: mono ? 'Consolas' : 'Arial',
    },
  };
}
