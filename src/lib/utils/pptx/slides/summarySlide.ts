/**
 * Executive Summary & Comparison slide — merges slides 2, 3 and the config
 * appendix onto one page.
 *
 * Labeled As-Is/To-Be KPI band on top, condensed As-Is vs To-Be sizing-results
 * table, then a "Configuration & Assumptions" section with the server-config /
 * sizing-assumptions table stacked below — matching the user's hand-built layout.
 */

import type PptxGenJS from 'pptxgenjs';
import i18n from '@/i18n';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { PPTX_COLORS } from '../primitives/colors';
import { buildConfigMetrics, buildSizingMetrics, renderComparisonTable } from './_comparison';
import { addFooter, addHeader, addKpiRow, M } from './_layout';

interface SummarySlideData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  /** When false (disaggregated layout), storage/disk rows are omitted. */
  showStorage: boolean;
}

/** Approximate rendered height (inches) of one comparison table row. */
const ROW_H = 0.265;

export function addSummarySlide(
  pptx: PptxGenJS,
  d: SummarySlideData,
  date: string,
  num: number,
  inlineConfig = true,
): void {
  const t = i18n.t.bind(i18n);
  const { cluster, scenarios, results, showStorage } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  addHeader(s, t('pptx:slide.execSummaryComparison'));

  // KPI callouts — explicitly labeled As-Is / To-Be so they never read as a
  // contradiction of the As-Is vs To-Be table below (they show the To-Be scenario).
  const bestResult = results[0];
  if (bestResult) {
    addKpiRow(
      s,
      [
        { value: String(cluster.existingServerCount ?? '?'), label: t('pptx:kpi.asIsServers') },
        {
          value: String(bestResult.finalCount),
          label: t('pptx:kpi.targetServers', { name: scenarios[0]?.name ?? 'Target' }),
        },
        {
          value: `${bestResult.cpuUtilizationPercent.toFixed(0)}%`,
          label: t('pptx:kpi.cpuUtilizationToBe'),
        },
        {
          value: `${bestResult.ramUtilizationPercent.toFixed(0)}%`,
          label: t('pptx:kpi.ramUtilizationToBe'),
        },
      ],
      1.2,
    );
  }

  // Sizing-results table.
  const sizingY = 2.25;
  const sizingRows = renderComparisonTable(
    s,
    buildSizingMetrics(d),
    sizingY,
    scenarios,
    showStorage,
  );

  // Configuration & Assumptions section, stacked below the sizing table — only
  // when the builder determined it fits (otherwise it gets its own appendix
  // slide). Rendered one point smaller so the headline sizing table dominates.
  if (inlineConfig) {
    const sectionY = sizingY + (sizingRows + 1) * ROW_H + 0.08;
    addSectionLabel(s, t('pptx:slide.configAppendix'), sectionY);
    renderComparisonTable(s, buildConfigMetrics(d), sectionY + 0.38, scenarios, showStorage, 9);
  }

  addFooter(s, date, num);
}

/**
 * Section divider + accent-marked bold label, used to separate the stacked
 * tables on the merged slide so the second one reads as an intentional section
 * rather than a repeated page title.
 */
function addSectionLabel(s: ReturnType<PptxGenJS['addSlide']>, text: string, y: number): void {
  // Thin hairline divider across the content width.
  s.addText('', { x: M, y: y - 0.06, w: 12, h: 0.013, fill: { color: PPTX_COLORS.hairline } });
  // Brand accent square.
  s.addText('', { x: M, y: y + 0.13, w: 0.16, h: 0.16, fill: { color: PPTX_COLORS.primary500 } });
  // Bold label.
  s.addText(text, {
    x: M + 0.28,
    y: y + 0.06,
    w: 11.5,
    h: 0.35,
    fontFace: 'Arial',
    fontSize: 13,
    bold: true,
    color: PPTX_COLORS.ink,
    margin: 0,
    valign: 'middle',
  });
}
