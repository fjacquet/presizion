/** Shared slide geometry + header/KPI/footer helpers (vatlas _layout shape). */
import type PptxGenJS from 'pptxgenjs';
import { PPTX_COLORS } from '../primitives/colors';
import { SLIDE } from '../theme';

export const M = SLIDE.margin;

type Slide = ReturnType<PptxGenJS['addSlide']>;

/** Title header with a brand accent strip; returns the y below the header. */
export function addHeader(s: Slide, title: string): number {
  s.addText('', { x: 0, y: 0, w: 0.18, h: SLIDE.h, fill: { color: PPTX_COLORS.primary500 } });
  s.addText(title, {
    x: M,
    y: 0.3,
    w: SLIDE.w - 2 * M,
    h: 0.6,
    fontFace: 'Arial',
    fontSize: 20,
    bold: true,
    color: PPTX_COLORS.ink,
    margin: 0,
  });
  return 1.1;
}

/** Row of KPI callouts (value + label). Returns the y below the row. */
export function addKpiRow(
  s: Slide,
  items: ReadonlyArray<{ value: string; label: string }>,
  y: number,
): number {
  const colW = (SLIDE.w - 2 * M) / items.length;
  items.forEach((item, i) => {
    const x = M + i * colW;
    s.addText(item.value, {
      x,
      y,
      w: colW * 0.9,
      h: 0.6,
      shape: 'roundRect',
      rectRadius: 0.06,
      fill: { color: PPTX_COLORS.surface200 },
      fontFace: 'Consolas',
      fontSize: 22,
      bold: true,
      color: PPTX_COLORS.ink,
      align: 'center',
      valign: 'middle',
    });
    s.addText(item.label, {
      x,
      y: y + 0.65,
      w: colW * 0.9,
      h: 0.3,
      fontFace: 'Arial',
      fontSize: 11,
      color: PPTX_COLORS.inkMuted,
      align: 'center',
    });
  });
  return y + 1.1;
}

/** Footer: product mark + date + slide number. */
export function addFooter(s: Slide, date: string, num: number): void {
  s.addText(
    [
      {
        text: 'Presizion',
        options: { bold: true, color: PPTX_COLORS.primary500, fontSize: 8, fontFace: 'Arial' },
      },
      {
        text: `  |  ${date}  |  Slide ${num}`,
        options: { color: PPTX_COLORS.inkMuted, fontSize: 8, fontFace: 'Arial' },
      },
    ],
    { x: M, y: SLIDE.h - 0.45, w: SLIDE.w - 2 * M, h: 0.3 },
  );
}
