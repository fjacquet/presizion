import type { OldCluster, Scenario } from '../../types/cluster'
import type { ScenarioResult } from '../../types/results'

/**
 * Computes the projected vCPU demand for a To-Be scenario.
 * Applies the growth buffer (the safety buffer is reflected in the server
 * count, not in projected demand). Mirrors effectiveVcpus in constraints.ts.
 */
export function toBeVcpus(cluster: OldCluster, scenario: Scenario): number {
  return Math.round(cluster.totalVcpus * (1 + (scenario.growthPercent ?? 0) / 100))
}

/** Total physical cores for a To-Be scenario. */
export function toBePcores(scenario: Scenario, result: ScenarioResult): number {
  return result.finalCount * scenario.socketsPerServer * scenario.coresPerSocket
}

/** Effective VM count for a To-Be scenario. */
export function toBeVms(cluster: OldCluster, _scenario?: Scenario): number {
  void _scenario
  return cluster.totalVms
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
  const effectiveVmCount = cluster.totalVms
  const demandFactor =
    (1 + (scenario.growthPercent ?? 0) / 100) * (1 + (scenario.safetyPercent ?? 0) / 100)
  return Math.round(effectiveVmCount * scenario.diskPerVmGb * demandFactor)
}

/** As-Is total RAM (GB), derived from server count × RAM per server. */
export function asIsRamGb(cluster: OldCluster): number | undefined {
  if (cluster.existingServerCount && cluster.ramPerServerGb) {
    return cluster.existingServerCount * cluster.ramPerServerGb
  }
  return undefined
}
