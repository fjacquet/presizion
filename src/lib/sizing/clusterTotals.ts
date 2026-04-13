import type { OldCluster, Scenario } from '../../types/cluster'
import type { ScenarioResult } from '../../types/results'

/**
 * Computes the effective (grown) vCPU count for a To-Be scenario.
 * Mirrors the effectiveVcpus + cpuGrowthFactor logic in constraints.ts.
 */
export function toBeVcpus(cluster: OldCluster, scenario: Scenario): number {
  const effective = scenario.targetVmCount && cluster.totalVms > 0
    ? Math.round(cluster.totalVcpus * (scenario.targetVmCount / cluster.totalVms))
    : cluster.totalVcpus
  return Math.round(effective * (1 + (scenario.cpuGrowthPercent ?? 0) / 100))
}

/** Total physical cores for a To-Be scenario. */
export function toBePcores(scenario: Scenario, result: ScenarioResult): number {
  return result.finalCount * scenario.socketsPerServer * scenario.coresPerSocket
}

/** Effective VM count for a To-Be scenario. */
export function toBeVms(cluster: OldCluster, scenario: Scenario): number {
  return scenario.targetVmCount ?? cluster.totalVms
}

/** Total cluster RAM (GB) for a To-Be scenario. */
export function toBeRamGb(scenario: Scenario, result: ScenarioResult): number {
  return result.finalCount * scenario.ramPerServerGb
}

/** Total cluster disk (GB) for a To-Be scenario (HCI/vSAN). */
export function toBeDiskGb(scenario: Scenario, result: ScenarioResult): number {
  return result.finalCount * scenario.diskPerServerGb
}

/** Total disk required (GB) for a disaggregated scenario. */
export function toBeDisaggregatedDiskGb(cluster: OldCluster, scenario: Scenario): number {
  const effectiveVmCount = scenario.targetVmCount ?? cluster.totalVms
  const headroomFactor = 1 + scenario.headroomPercent / 100
  const storageGrowthFactor = 1 + (scenario.storageGrowthPercent ?? 0) / 100
  return Math.round(effectiveVmCount * scenario.diskPerVmGb * storageGrowthFactor * headroomFactor)
}

/** As-Is total RAM (GB), derived from server count × RAM per server. */
export function asIsRamGb(cluster: OldCluster): number | undefined {
  if (cluster.existingServerCount && cluster.ramPerServerGb) {
    return cluster.existingServerCount * cluster.ramPerServerGb
  }
  return undefined
}
