import { create } from 'zustand'
import type { OldCluster } from '../types/cluster'
import type { ScopeData } from '@/lib/utils/import'
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator'
import { useClusterStore } from './useClusterStore'

interface ImportState {
  rawByScope: Map<string, ScopeData> | null
  scopeLabels: Record<string, string>
  activeScope: string[]
  scopeOptions: string[]
  setImportBuffer: (
    rawByScope: Map<string, ScopeData>,
    scopeLabels: Record<string, string>,
    activeScope: string[],
  ) => void
  setActiveScope: (scope: string[]) => void
  clearImport: () => void
}

export const useImportStore = create<ImportState>((set, get) => ({
  rawByScope: null,
  scopeLabels: {},
  activeScope: [],
  scopeOptions: [],

  setImportBuffer: (rawByScope, scopeLabels, activeScope) => {
    set({
      rawByScope,
      scopeLabels,
      activeScope,
      scopeOptions: [...rawByScope.keys()],
    })
  },

  setActiveScope: (scope) => {
    const { rawByScope } = get()
    if (rawByScope == null) return
    set({ activeScope: scope })
    const aggregate = aggregateScopes(rawByScope, scope)
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
    }
    useClusterStore.getState().setCurrentCluster(cluster)
  },

  clearImport: () => set({
    rawByScope: null,
    scopeLabels: {},
    activeScope: [],
    scopeOptions: [],
  }),
}))
