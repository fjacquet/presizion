/**
 * Per-scenario chart-capture shape consumed by the PPTX slide builders.
 * Re-exports the capture type from `chartImage` (the ECharts rasterizer) so the
 * deck and the wrapper share one source of truth.
 */
import type { ChartCapture } from '@/lib/utils/chartImage';

export interface ScenarioCharts {
  readonly capacity: ChartCapture | null;
  readonly minnodes: ChartCapture | null;
}
