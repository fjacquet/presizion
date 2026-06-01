/** PPTX deck composition root — emits slides in a fixed order onto a passed
 *  pptx instance. Pure-ish: no lazy import, no writeFile (that is the
 *  exportPptx wrapper's job), so the deck structure is unit-testable. */
import type PptxGenJS from 'pptxgenjs';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import type { ScenarioCharts } from './chartTypes';
import { buildConfigMetrics, buildSizingMetrics, countVisibleMetrics } from './slides/_comparison';
import { addConfigAppendixSlide } from './slides/configAppendixSlide';
import { addScenarioChartSlides } from './slides/scenarioChartSlide';
import { addSummarySlide } from './slides/summarySlide';
import { addTitleSlide } from './slides/titleSlide';

/**
 * Max combined data rows (sizing + config) that fit beneath the KPI band on one
 * slide. Above this, the config table overflows to its own appendix slide so it
 * never runs past the footer. Derived empirically from rendered row height.
 */
const INLINE_CONFIG_ROW_BUDGET = 14;

export interface DeckData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  breakdowns: readonly VsanCapacityBreakdown[];
  charts: readonly ScenarioCharts[];
  date: string;
  /** Whether to emit storage/disk rows. False in disaggregated layout (mirrors web). */
  showStorage: boolean;
  logoDataUrl?: string;
}

export function buildDeck(pptx: PptxGenJS, d: DeckData): void {
  pptx.layout = 'LAYOUT_WIDE';

  // Decide whether the config table fits inline under the sizing table, or must
  // overflow to its own appendix slide.
  const sizingRows = countVisibleMetrics(buildSizingMetrics(d), d.showStorage);
  const configRows = countVisibleMetrics(buildConfigMetrics(d), d.showStorage);
  const inlineConfig = sizingRows + configRows <= INLINE_CONFIG_ROW_BUDGET;

  let num = 0;
  addTitleSlide(pptx, d);
  num++;
  // Merged Executive Summary & Comparison (+ Configuration & Assumptions when it fits).
  addSummarySlide(pptx, d, d.date, ++num, inlineConfig);
  // Per-scenario capacity + min-nodes chart slides (only when charts captured).
  num = addScenarioChartSlides(pptx, d, d.date, num);
  // Configuration & Assumptions on its own slide when it didn't fit inline.
  if (!inlineConfig) {
    addConfigAppendixSlide(pptx, d, d.date, ++num);
  }
}
