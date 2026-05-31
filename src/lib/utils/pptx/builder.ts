/** PPTX deck composition root — emits slides in a fixed order onto a passed
 *  pptx instance. Pure-ish: no lazy import, no writeFile (that is the
 *  exportPptx wrapper's job), so the deck structure is unit-testable. */
import type PptxGenJS from 'pptxgenjs';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import type { ScenarioCharts } from './chartTypes';
import { addComparisonSlide } from './slides/comparisonSlide';
import { addScenarioChartSlides } from './slides/scenarioChartSlide';
import { addSummarySlide } from './slides/summarySlide';
import { addTitleSlide } from './slides/titleSlide';

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
  let num = 0;
  addTitleSlide(pptx, d);
  num++;
  addSummarySlide(pptx, d, d.date, ++num);
  addComparisonSlide(pptx, d, d.date, ++num);
  addScenarioChartSlides(pptx, d, d.date, num);
}
