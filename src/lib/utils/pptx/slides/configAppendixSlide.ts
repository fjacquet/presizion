/**
 * Configuration & Assumptions appendix — used only as an overflow when the
 * config table cannot fit beneath the sizing table on the merged executive
 * slide (e.g. HCI layouts with storage rows, or vSAN configs). When it fits,
 * the config table is rendered inline on the summary slide instead.
 */

import type PptxGenJS from 'pptxgenjs';
import i18n from '@/i18n';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { PPTX_COLORS } from '../primitives/colors';
import { buildConfigMetrics, renderComparisonTable } from './_comparison';
import { addFooter, addHeader } from './_layout';

interface ConfigAppendixData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  /** When false (disaggregated layout), storage/disk rows are omitted. */
  showStorage: boolean;
}

export function addConfigAppendixSlide(
  pptx: PptxGenJS,
  d: ConfigAppendixData,
  date: string,
  num: number,
): void {
  const t = i18n.t.bind(i18n);
  const { scenarios, showStorage } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  const headerBottom = addHeader(s, t('pptx:slide.configAppendix'));

  renderComparisonTable(s, buildConfigMetrics(d), headerBottom + 0.1, scenarios, showStorage);

  addFooter(s, date, num);
}
