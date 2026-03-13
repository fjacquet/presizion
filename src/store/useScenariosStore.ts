import { create } from 'zustand';
import type { OldCluster, Scenario } from '../types/cluster';
import { createDefaultScenario } from '../lib/sizing/defaults';

/**
 * Scenarios state slice.
 * Stores the list of target scenarios for comparison in wizard Step 2.
 *
 * ScenarioResult is NEVER stored here — results are derived on demand by useScenariosResults hook.
 */
interface ScenariosStore {
  /** List of target server scenarios */
  scenarios: Scenario[];
  /** Append a new scenario initialized with industry-standard defaults, with optional overrides */
  addScenario: (overrides?: Partial<Scenario>) => void;
  /** Create a copy of an existing scenario with a new UUID and "(copy)" name suffix */
  duplicateScenario: (id: string) => void;
  /** Remove a scenario by its UUID */
  removeScenario: (id: string) => void;
  /** Merge a partial update into a scenario identified by UUID */
  updateScenario: (id: string, partial: Partial<Scenario>) => void;
  /** Replace the entire scenarios list (used by JSON session import) */
  setScenarios: (scenarios: Scenario[]) => void;
  /** Seed all existing scenarios with avg VM sizes derived from imported cluster data */
  seedFromCluster: (cluster: OldCluster) => void;
}

export const useScenariosStore = create<ScenariosStore>((set) => ({
  scenarios: [createDefaultScenario()],

  addScenario: (overrides) =>
    set((state) => ({
      scenarios: [...state.scenarios, { ...createDefaultScenario(), ...overrides }],
    })),

  duplicateScenario: (id) =>
    set((state) => {
      const source = state.scenarios.find((s) => s.id === id);
      if (!source) return state;
      const copy: Scenario = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copy)`,
      };
      return { scenarios: [...state.scenarios, copy] };
    }),

  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
    })),

  updateScenario: (id, partial) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...partial } : s,
      ),
    })),

  setScenarios: (scenarios) => set({ scenarios }),

  seedFromCluster: (cluster) =>
    set((state) => {
      const ramPerVmGb = cluster.avgRamPerVmGb
      const diskPerVmGb =
        cluster.totalDiskGb && cluster.totalVms
          ? Math.round((cluster.totalDiskGb / cluster.totalVms) * 10) / 10
          : undefined
      if (ramPerVmGb == null && diskPerVmGb == null) return state
      return {
        scenarios: state.scenarios.map((s) => ({
          ...s,
          ...(ramPerVmGb != null && { ramPerVmGb }),
          ...(diskPerVmGb != null && { diskPerVmGb }),
        })),
      }
    }),
}));
