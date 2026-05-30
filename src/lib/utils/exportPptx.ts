/**
 * PPTX export utility: generates a PowerPoint presentation from sizing results.
 *
 * Requirements: PPTX-01 (export button), PPTX-02 (slide content),
 *               PPTX-03 (lazy-load), PPTX-05 (toolbar placement).
 *
 * Thin wrapper: lazy-load pptxgenjs (it is never in the main bundle) → capture
 * charts → resolve the logo → delegate slide composition to the vatlas-shaped
 * `pptx/` module (`buildDeck`) → write the file. Keeps its public 5-arg
 * signature so `Step3ReviewExport` is unaffected.
 */

import { chartRefToDataUrl } from '@/lib/utils/chartCapture';
import { getLogoDataUrl } from '@/lib/utils/logoDataUrl';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { buildDeck } from './pptx/builder';
import type { ScenarioCharts } from './pptx/chartTypes';

async function captureAllCharts(
  scenarios: readonly Scenario[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<readonly ScenarioCharts[]> {
  return Promise.all(
    scenarios.map(async (s) => ({
      capacity: await chartRefToDataUrl(chartRefs[`capacity-${s.id}`] ?? null),
      minnodes: await chartRefToDataUrl(chartRefs[`minnodes-${s.id}`] ?? null),
    })),
  );
}

/**
 * Generates and downloads a PowerPoint presentation containing a title slide,
 * an executive summary, an As-Is vs To-Be comparison table, and per-scenario
 * capacity / min-nodes chart slides (when chart captures are available).
 *
 * @param cluster    - Current cluster metrics
 * @param scenarios  - Target sizing scenarios
 * @param results    - Computed results (parallel array with scenarios)
 * @param breakdowns - Capacity breakdowns (parallel array with scenarios)
 * @param chartRefs  - Map of chart container refs keyed by "capacity-{id}" / "minnodes-{id}"
 */
export async function exportPptx(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const charts = await captureAllCharts(scenarios, chartRefs);
  const logoDataUrl = (await getLogoDataUrl().catch(() => undefined)) || undefined;

  const pptx = new PptxGenJS();
  pptx.author = 'Presizion';
  pptx.title = 'Cluster Sizing Report';

  buildDeck(pptx, {
    cluster,
    scenarios,
    results,
    breakdowns,
    charts,
    date: new Date().toLocaleDateString(),
    ...(logoDataUrl ? { logoDataUrl } : {}),
  });

  await pptx.writeFile({ fileName: 'presizion-sizing-report.pptx' });
}
