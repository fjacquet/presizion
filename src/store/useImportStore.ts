import { create } from 'zustand'
import type { OldCluster } from '../types/cluster'
import type { ScopeData, VmRow } from '@/lib/utils/import'
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator'
import { useClusterStore } from './useClusterStore'
import { useExclusionsStore } from './useExclusionsStore'
import { applyExclusions, aggregateVmRows } from '@/lib/utils/import/exclusions'

interface ImportState {
  rawByScope: Map<string, ScopeData> | null
  vmRowsByScope: Map<string, VmRow[]> | null
  scopeLabels: Record<string, string>
  activeScope: string[]
  scopeOptions: string[]
  setImportBuffer: (
    rawByScope: Map<string, ScopeData>,
    scopeLabels: Record<string, string>,
    activeScope: string[],
    vmRowsByScope?: Map<string, VmRow[]> | undefined,
  ) => void
  setActiveScope: (scope: string[]) => void
  recomputeCluster: () => void
  clearImport: () => void
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
    })
    get().recomputeCluster()
  },

  setActiveScope: (scope) => {
    if (get().rawByScope == null) return
    set({ activeScope: scope })
    get().recomputeCluster()
  },

  recomputeCluster: () => {
    const { rawByScope, vmRowsByScope, activeScope } = get()
    if (rawByScope == null) return

    let effectiveRawByScope = rawByScope
    if (vmRowsByScope != null) {
      const rules = useExclusionsStore.getState().rules
      const { filteredByScope } = applyExclusions(vmRowsByScope, rules)
      effectiveRawByScope = new Map(rawByScope)
      for (const [key, original] of rawByScope) {
        const filteredRows = filteredByScope.get(key) ?? []
        const vmDerived = aggregateVmRows(filteredRows)
        effectiveRawByScope.set(key, { ...original, ...vmDerived })
      }
    }

    const aggregate = aggregateScopes(effectiveRawByScope, activeScope)
    const cluster: OldCluster = {
      totalVcpus: aggregate.totalVcpus,
      totalPcores: aggregate.totalPcores ?? 0,
      totalVms: aggregate.totalVms,
      ...(aggregate.totalDiskGb != null && { totalDiskGb: aggregate.totalDiskGb }),
      ...(aggregate.existingServerCount != null && { existingServerCount: aggregate.existingServerCount }),
      ...(aggregate.socketsPerServer != null && { socketsPerServer: aggregate.socketsPerServer }),
      ...(aggregate.coresPerSocket != null && { coresPerSocket: aggregate.coresPerSocket }),
      ...(aggregate.ramPerServerGb != null && { ramPerServerGb: aggregate.ramPerServerGb }),
      ...(aggregate.cpuUtilizationPercent != null && { cpuUtilizationPercent: aggregate.cpuUtilizationPercent }),
      ...(aggregate.ramUtilizationPercent != null && { ramUtilizationPercent: aggregate.ramUtilizationPercent }),
      ...(aggregate.avgRamPerVmGb != null && { avgRamPerVmGb: aggregate.avgRamPerVmGb }),
      ...(aggregate.cpuModel != null && { cpuModel: aggregate.cpuModel }),
      ...(aggregate.cpuFrequencyGhz != null && { cpuFrequencyGhz: aggregate.cpuFrequencyGhz }),
      ...(aggregate.isStretchCluster != null && { isStretchCluster: aggregate.isStretchCluster }),
    }
    useClusterStore.getState().setCurrentCluster(cluster)
  },

  clearImport: () => set({
    rawByScope: null,
    vmRowsByScope: null,
    scopeLabels: {},
    activeScope: [],
    scopeOptions: [],
  }),
}))
