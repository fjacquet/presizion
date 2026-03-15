import type { ScopeData } from './index'

type RawByScopeMap = Map<string, ScopeData>

/**
 * Re-aggregates a subset of per-scope data into a single combined result.
 * Sums numeric fields, computes weighted average RAM per VM, flattens warnings.
 *
 * ESX field aggregation:
 * - Additive: totalPcores, existingServerCount (summed across scopes)
 * - Representative: socketsPerServer, coresPerSocket, cpuModel, cpuFrequencyGhz (first scope)
 * - Weighted average by host count: ramPerServerGb (warns if heterogeneous)
 * - Weighted average by server count: cpuUtilizationPercent, ramUtilizationPercent
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

  // Additive ESX fields
  let sumTotalPcores = 0
  let hasTotalPcores = false
  let sumExistingServerCount = 0
  let hasExistingServerCount = false

  // Representative ESX fields (from first scope that has them)
  let repSocketsPerServer: number | undefined
  let repCoresPerSocket: number | undefined
  let repCpuModel: string | undefined
  let repCpuFrequencyGhz: number | undefined

  // RAM per server: host-count-weighted average
  const ramPerServerEntries: { ram: number; hosts: number }[] = []

  // Weighted average utilization
  let weightedCpuUtilSum = 0
  let weightedRamUtilSum = 0
  let cpuUtilServerCount = 0
  let ramUtilServerCount = 0

  for (const scope of selected) {
    totalVcpus += scope.totalVcpus
    totalVms += scope.totalVms
    totalDiskGb += scope.totalDiskGb
    totalVmCount += scope.vmCount
    weightedRamSum += scope.avgRamPerVmGb * scope.vmCount
    allWarnings.push(...scope.warnings)

    // Additive fields
    if (scope.totalPcores !== undefined) {
      sumTotalPcores += scope.totalPcores
      hasTotalPcores = true
    }
    if (scope.existingServerCount !== undefined) {
      sumExistingServerCount += scope.existingServerCount
      hasExistingServerCount = true
    }

    // Representative fields (first scope that has them)
    if (repSocketsPerServer === undefined && scope.socketsPerServer !== undefined) {
      repSocketsPerServer = scope.socketsPerServer
    }
    if (repCoresPerSocket === undefined && scope.coresPerSocket !== undefined) {
      repCoresPerSocket = scope.coresPerSocket
    }
    if (repCpuModel === undefined && scope.cpuModel !== undefined) {
      repCpuModel = scope.cpuModel
    }
    if (repCpuFrequencyGhz === undefined && scope.cpuFrequencyGhz !== undefined) {
      repCpuFrequencyGhz = scope.cpuFrequencyGhz
    }

    // RAM per server: collect (ram, hostCount) tuples for weighted average
    if (scope.ramPerServerGb !== undefined) {
      ramPerServerEntries.push({ ram: scope.ramPerServerGb, hosts: scope.existingServerCount ?? 1 })
    }

    // Weighted utilization (by existingServerCount)
    if (scope.cpuUtilizationPercent !== undefined && scope.existingServerCount !== undefined) {
      weightedCpuUtilSum += scope.cpuUtilizationPercent * scope.existingServerCount
      cpuUtilServerCount += scope.existingServerCount
    }
    if (scope.ramUtilizationPercent !== undefined && scope.existingServerCount !== undefined) {
      weightedRamUtilSum += scope.ramUtilizationPercent * scope.existingServerCount
      ramUtilServerCount += scope.existingServerCount
    }
  }

  const avgRamPerVmGb = totalVmCount > 0 ? weightedRamSum / totalVmCount : 0

  // Build ESX fields
  const esxFields: Partial<ScopeData> = {}

  if (hasTotalPcores) esxFields.totalPcores = sumTotalPcores
  if (hasExistingServerCount) esxFields.existingServerCount = sumExistingServerCount
  if (repSocketsPerServer !== undefined) esxFields.socketsPerServer = repSocketsPerServer
  if (repCoresPerSocket !== undefined) esxFields.coresPerSocket = repCoresPerSocket
  if (repCpuModel !== undefined) esxFields.cpuModel = repCpuModel
  if (repCpuFrequencyGhz !== undefined) esxFields.cpuFrequencyGhz = repCpuFrequencyGhz

  // RAM per server: host-count-weighted average
  if (ramPerServerEntries.length > 0) {
    const totalHosts = ramPerServerEntries.reduce((s, e) => s + e.hosts, 0)
    esxFields.ramPerServerGb = Math.round(
      ramPerServerEntries.reduce((s, e) => s + e.ram * e.hosts, 0) / totalHosts
    )
    const uniqueRam = new Set(ramPerServerEntries.map(e => e.ram))
    if (uniqueRam.size > 1) {
      allWarnings.push('Heterogeneous RAM/server detected across clusters -- using host-count-weighted average.')
    }
  }

  // Weighted average utilization
  if (cpuUtilServerCount > 0) {
    esxFields.cpuUtilizationPercent = Math.round(weightedCpuUtilSum / cpuUtilServerCount)
  }
  if (ramUtilServerCount > 0) {
    esxFields.ramUtilizationPercent = Math.round(weightedRamUtilSum / ramUtilServerCount)
  }

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
