import { useClusterStore } from '../store/useClusterStore';
import { useScenariosStore } from '../store/useScenariosStore';
import { computeScenarioResult } from '../lib/sizing/constraints';
import type { ScenarioResult } from '../types/results';

/**
 * Derives ScenarioResult[] from store state on demand.
 *
 * Reads currentCluster from useClusterStore and scenarios[] from useScenariosStore,
 * then maps each scenario through computeScenarioResult. Results are NEVER stored
 * in Zustand — this hook is the only place results are computed.
 *
 * Pattern: derive-on-read (never cache results in state).
 *
 * @returns One ScenarioResult per scenario in useScenariosStore, in order.
 *          Returns empty array if no scenarios are stored.
 */
export function useScenariosResults(): readonly ScenarioResult[] {
  const currentCluster = useClusterStore((state) => state.currentCluster);
  const scenarios = useScenariosStore((state) => state.scenarios);

  return scenarios.map((scenario) => computeScenarioResult(currentCluster, scenario));
}
