import type { ClusterImportResult, ScopeData } from './index'

type RawByScopeMap = Map<string, ScopeData>

/**
 * Re-aggregates a subset of per-scope data into a single combined result.
 * Sums numeric fields, computes weighted average RAM, flattens warnings,
 * and copies ESX fields from the first selected scope that has them.
 */
export function aggregateScopes(
  rawByScope: RawByScopeMap,
  selectedKeys: string[],
): ScopeData {
  if (selectedKeys.length === 0) {
    return { totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [] }
  }

  const selected = selectedKeys
    .map((k) => rawByScope.get(k))
    .filter((v): v is ScopeData => v !== undefined)

  if (selected.length === 0) {
    return { totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [] }
  }

  let totalVcpus = 0
  let totalVms = 0
  let totalDiskGb = 0
  let totalVmCount = 0
  let weightedRamSum = 0
  const allWarnings: string[] = []

  // ESX fields — copy from first scope that has them
  let esxFields: Partial<Pick<ClusterImportResult, 'totalPcores' | 'existingServerCount' | 'socketsPerServer' | 'coresPerSocket' | 'ramPerServerGb' | 'cpuUtilizationPercent' | 'ramUtilizationPercent'>> = {}

  for (const scope of selected) {
    totalVcpus += scope.totalVcpus
    totalVms += scope.totalVms
    totalDiskGb += scope.totalDiskGb
    totalVmCount += scope.vmCount
    weightedRamSum += scope.avgRamPerVmGb * scope.vmCount
    allWarnings.push(...scope.warnings)

    // Pick up ESX fields from first scope that has them
    if (
      Object.keys(esxFields).length === 0 &&
      (scope.totalPcores !== undefined ||
        scope.existingServerCount !== undefined ||
        scope.socketsPerServer !== undefined ||
        scope.coresPerSocket !== undefined ||
        scope.ramPerServerGb !== undefined ||
        scope.cpuUtilizationPercent !== undefined ||
        scope.ramUtilizationPercent !== undefined)
    ) {
      if (scope.totalPcores !== undefined) esxFields.totalPcores = scope.totalPcores
      if (scope.existingServerCount !== undefined) esxFields.existingServerCount = scope.existingServerCount
      if (scope.socketsPerServer !== undefined) esxFields.socketsPerServer = scope.socketsPerServer
      if (scope.coresPerSocket !== undefined) esxFields.coresPerSocket = scope.coresPerSocket
      if (scope.ramPerServerGb !== undefined) esxFields.ramPerServerGb = scope.ramPerServerGb
      if (scope.cpuUtilizationPercent !== undefined) esxFields.cpuUtilizationPercent = scope.cpuUtilizationPercent
      if (scope.ramUtilizationPercent !== undefined) esxFields.ramUtilizationPercent = scope.ramUtilizationPercent
    }
  }

  const avgRamPerVmGb = totalVmCount > 0 ? weightedRamSum / totalVmCount : 0

  return {
    totalVcpus,
    totalVms,
    totalDiskGb,
    avgRamPerVmGb,
    vmCount: totalVmCount,
    warnings: allWarnings,
    ...esxFields,
  }
}
