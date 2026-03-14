import { useClusterStore } from '../store/useClusterStore';
import { useScenariosStore } from '../store/useScenariosStore';
import { useWizardStore } from '../store/useWizardStore';
import { computeScenarioResult } from '../lib/sizing/constraints';
import { computeVsanBreakdown } from '../lib/sizing/vsanBreakdown';
import type { VsanCapacityBreakdown } from '../types/breakdown';

/**
 * Derives VsanCapacityBreakdown[] from store state on demand.
 *
 * Calls computeScenarioResult internally (not re-imported from useScenariosResults)
 * because it needs both the result AND the breakdown in a single pass.
 *
 * Pattern: derive-on-read (never cache breakdowns in state).
 *
 * @returns One VsanCapacityBreakdown per scenario in useScenariosStore, in order.
 *          Returns empty array if no scenarios are stored.
 */
export function useVsanBreakdowns(): readonly VsanCapacityBreakdown[] {
  const currentCluster = useClusterStore((state) => state.currentCluster);
  const scenarios = useScenariosStore((state) => state.scenarios);
  const sizingMode = useWizardStore((state) => state.sizingMode);
  const layoutMode = useWizardStore((state) => state.layoutMode);

  return scenarios.map((scenario) => {
    const result = computeScenarioResult(currentCluster, scenario, sizingMode, layoutMode);
    return computeVsanBreakdown(currentCluster, scenario, result);
  });
}
