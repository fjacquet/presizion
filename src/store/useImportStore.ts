import { create } from 'zustand';
import type { ScopeData, VmRow } from '@/lib/utils/import';
import { aggregateVmRows, applyExclusions } from '@/lib/utils/import/exclusions';
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator';
import type { OldCluster } from '../types/cluster';
import { useClusterStore } from './useClusterStore';
import { useExclusionsStore } from './useExclusionsStore';

interface ImportState {
  rawByScope: Map<string, ScopeData> | null;
  vmRowsByScope: Map<string, VmRow[]> | null;
  scopeLabels: Record<string, string>;
  activeScope: string[];
  scopeOptions: string[];
  setImportBuffer: (
    rawByScope: Map<string, ScopeData>,
    scopeLabels: Record<string, string>,
    activeScope: string[],
    vmRowsByScope?: Map<string, VmRow[]> | undefined,
  ) => void;
  setActiveScope: (scope: string[]) => void;
  recomputeCluster: () => void;
  clearImport: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  rawByScope: null,
  vmRowsByScope: null,
  scopeLabels: {},
  activeScope: [],
  scopeOptions: [],

  setImportBuffer: (rawByScope, scopeLabels, activeScope, vmRowsByScope) => {
    set({
      rawByScope,
      vmRowsByScope: vmRowsByScope ?? null,
      scopeLabels,
      activeScope,
      scopeOptions: [...rawByScope.keys()],
    });
    get().recomputeCluster();
  },

  setActiveScope: (scope) => {
    if (get().rawByScope == null) return;
    set({ activeScope: scope });
    get().recomputeCluster();
  },

  recomputeCluster: () => {
    const { rawByScope, vmRowsByScope, activeScope } = get();
    if (rawByScope == null) return;

    let effectiveRawByScope = rawByScope;
    if (vmRowsByScope != null) {
      const rules = useExclusionsStore.getState().rules;
      const { filteredByScope } = applyExclusions(vmRowsByScope, rules);
      effectiveRawByScope = new Map(rawByScope);
      for (const [key, original] of rawByScope) {
        const filteredRows = filteredByScope.get(key) ?? [];
        const vmDerived = aggregateVmRows(filteredRows);
        effectiveRawByScope.set(key, { ...original, ...vmDerived });
      }
    }

    const aggregate = aggregateScopes(effectiveRawByScope, activeScope);
    // When per-VM consumed RAM is available (RVTools vMemory), right-size on the
    // workload's actual usage: derive RAM utilization as consumed ÷ provisioned
    // (VM-level), overriding the host-level "Memory usage %" the parser captured.
    const ramUtilizationPercent =
      aggregate.consumedRamGb != null && aggregate.totalRamGb > 0
        ? Math.min(
            100,
            Math.max(1, Math.round((aggregate.consumedRamGb / aggregate.totalRamGb) * 100)),
          )
        : aggregate.ramUtilizationPercent;
    const cluster: OldCluster = {
      totalVcpus: aggregate.totalVcpus,
      totalPcores: aggregate.totalPcores ?? 0,
      totalVms: aggregate.totalVms,
      ...(aggregate.totalDiskGb != null && { totalDiskGb: aggregate.totalDiskGb }),
      ...(aggregate.totalRamGb != null && { totalRamGb: aggregate.totalRamGb }),
      ...(aggregate.consumedRamGb != null && { consumedRamGb: aggregate.consumedRamGb }),
      ...(aggregate.existingServerCount != null && {
        existingServerCount: aggregate.existingServerCount,
      }),
      ...(aggregate.socketsPerServer != null && { socketsPerServer: aggregate.socketsPerServer }),
      ...(aggregate.coresPerSocket != null && { coresPerSocket: aggregate.coresPerSocket }),
      ...(aggregate.ramPerServerGb != null && { ramPerServerGb: aggregate.ramPerServerGb }),
      ...(aggregate.cpuUtilizationPercent != null && {
        cpuUtilizationPercent: aggregate.cpuUtilizationPercent,
      }),
      ...(ramUtilizationPercent != null && { ramUtilizationPercent }),
      ...(aggregate.avgRamPerVmGb != null && { avgRamPerVmGb: aggregate.avgRamPerVmGb }),
      ...(aggregate.cpuModel != null && { cpuModel: aggregate.cpuModel }),
      ...(aggregate.cpuFrequencyGhz != null && { cpuFrequencyGhz: aggregate.cpuFrequencyGhz }),
      ...(aggregate.isStretchCluster != null && { isStretchCluster: aggregate.isStretchCluster }),
    };
    useClusterStore.getState().setCurrentCluster(cluster);
  },

  clearImport: () =>
    set({
      rawByScope: null,
      vmRowsByScope: null,
      scopeLabels: {},
      activeScope: [],
      scopeOptions: [],
    }),
}));
