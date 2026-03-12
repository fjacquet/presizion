// VALIDATION.md: cross-cutting — useScenariosResults returns correct ScenarioResult[]
// Uses @testing-library/react renderHook
import { describe, it } from 'vitest';

// The hook reads from useClusterStore and useScenariosStore, then calls computeScenarioResult
// for each scenario. Results are computed on demand (never stored in Zustand).

describe('useScenariosResults', () => {
  it.todo('returns empty array when no scenarios in store');
  it.todo('returns one ScenarioResult per scenario in store');
  it.todo('result matches computeScenarioResult(cluster, scenario) for CPU-limited fixture');
  it.todo('result updates when cluster store changes');
  it.todo('result updates when scenarios store changes');
});
