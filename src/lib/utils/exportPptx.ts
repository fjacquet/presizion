/**
 * PPTX export utility: generates a PowerPoint presentation from sizing results.
 *
 * Requirements: PPTX-01 (export button), PPTX-02 (slide content),
 *               PPTX-03 (lazy-load), PPTX-05 (toolbar placement).
 *
 * Thin wrapper: lazy-load pptxgenjs (it is never in the main bundle) → map the
 * pre-captured ECharts PNGs into per-scenario chart slots → resolve the logo →
 * delegate slide composition to the vatlas-shaped `pptx/` module (`buildDeck`)
 * → write the file.
 */

import i18n from '@/i18n';
import type { ChartCapture } from '@/lib/utils/chartImage';
import { getLogoDataUrl } from '@/lib/utils/logoDataUrl';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { buildDeck } from './pptx/builder';

/**
 * Generates and downloads a PowerPoint presentation containing a title slide,
 * an executive summary, an As-Is vs To-Be comparison table, and per-scenario
 * capacity / min-nodes chart slides (when chart captures are available).
 *
 * @param cluster    - Current cluster metrics
 * @param scenarios  - Target sizing scenarios
 * @param results    - Computed results (parallel array with scenarios)
 * @param breakdowns - Capacity breakdowns (parallel array with scenarios)
 * @param charts     - Pre-captured chart PNGs keyed by "capacity-{id}" / "minnodes-{id}"
 * @param showStorage - Whether to emit storage/disk rows. Pass `false` for the
 *                      disaggregated layout (mirrors the web hiding storage).
 *                      Defaults to `true` for back-compat (HCI output unchanged).
 */
export async function exportPptx(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  charts: Record<string, ChartCapture | null>,
  showStorage = true,
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const scenarioCharts = scenarios.map((s) => ({
    capacity: charts[`capacity-${s.id}`] ?? null,
    minnodes: charts[`minnodes-${s.id}`] ?? null,
  }));
  const logoDataUrl = (await getLogoDataUrl().catch(() => undefined)) || undefined;

  const pptx = new PptxGenJS();
  pptx.author = 'Presizion';
  pptx.title = i18n.t('pptx:slide.title');

  buildDeck(pptx, {
    cluster,
    scenarios,
    results,
    breakdowns,
    charts: scenarioCharts,
    showStorage,
    date: new Date().toLocaleDateString(),
    ...(logoDataUrl ? { logoDataUrl } : {}),
  });

  await pptx.writeFile({ fileName: 'presizion-sizing-report.pptx' });
}
