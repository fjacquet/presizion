/**
 * Per-scenario chart-capture shape consumed by the PPTX slide builders.
 * Re-exports the existing capture type from `chartCapture` so the deck and
 * the wrapper share one source of truth.
 */
import type { ChartCapture } from '@/lib/utils/chartCapture';

export interface ScenarioCharts {
  readonly capacity: ChartCapture | null;
  readonly minnodes: ChartCapture | null;
}
