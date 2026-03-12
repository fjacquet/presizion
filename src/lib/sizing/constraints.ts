import type { OldCluster, Scenario } from '../../types/cluster';
import type { ScenarioResult, LimitingResource } from '../../types/results';
import { serverCountByCpu, serverCountByRam, serverCountByDisk } from './formulas';

/**
 * Determines which resource constraint drove the final (maximum) server count.
 *
 * Tie-breaking priority when counts are equal: cpu > ram > disk.
 *
 * @param cpu   CPU-limited server count (integer, post-ceil)
 * @param ram   RAM-limited server count (integer, post-ceil)
 * @param disk  Disk-limited server count (integer, post-ceil)
 */
function determineLimitingResource(
  cpu: number,
  ram: number,
  disk: number,
): LimitingResource {
  if (cpu >= ram && cpu >= disk) return 'cpu';
  if (ram > cpu && ram >= disk) return 'ram';
  return 'disk';
}

/**
 * Public API: computes the full ScenarioResult for a given cluster + scenario pair.
 *
 * Applies CALC-01 through CALC-06:
 *   CALC-01: CPU-limited server count
 *   CALC-02: RAM-limited server count
 *   CALC-03: Disk-limited server count
 *   CALC-04: N+1 HA reserve (adds exactly 1 if haReserveEnabled)
 *   CALC-05: Max constraint selection + limiting resource identification
 *   CALC-06: Utilization metrics (achievedVcpuToPCoreRatio, vmsPerServer, utilization %)
 *
 * The returned object is frozen — it is never mutated after creation.
 *
 * @param cluster  Current environment metrics (OldCluster)
 * @param scenario Target server configuration and sizing assumptions (Scenario)
 */
export function computeScenarioResult(
  cluster: OldCluster,
  scenario: Scenario,
): ScenarioResult {
  // headroomFactor = 1 + headroomPercent/100
  // e.g. 20% headroom → factor = 1.20
  const headroomFactor = 1 + scenario.headroomPercent / 100;

  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  // CALC-01: CPU-limited count
  const cpuLimitedCount = serverCountByCpu(
    cluster.totalVcpus,
    headroomFactor,
    scenario.targetVcpuToPCoreRatio,
    coresPerServer,
  );

  // CALC-02: RAM-limited count
  const ramLimitedCount = serverCountByRam(
    cluster.totalVms,
    scenario.ramPerVmGb,
    headroomFactor,
    scenario.ramPerServerGb,
  );

  // CALC-03: Disk-limited count
  const diskLimitedCount = serverCountByDisk(
    cluster.totalVms,
    scenario.diskPerVmGb,
    headroomFactor,
    scenario.diskPerServerGb,
  );

  // CALC-05: Final count is the maximum of the three constraints
  const rawCount = Math.max(cpuLimitedCount, ramLimitedCount, diskLimitedCount);

  // CALC-04: N+1 HA — adds exactly 1 server after the max(), not before
  const haReserveApplied = scenario.haReserveEnabled;
  const finalCount = haReserveApplied ? rawCount + 1 : rawCount;

  // CALC-05: Limiting resource — determined from the raw counts (before HA)
  const limitingResource = determineLimitingResource(
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
  );

  // CALC-06: Utilization metrics (use finalCount as denominator)
  const achievedVcpuToPCoreRatio =
    cluster.totalVcpus / (finalCount * coresPerServer);

  const vmsPerServer = cluster.totalVms / finalCount;

  const cpuUtilizationPercent =
    (cluster.totalVcpus /
      scenario.targetVcpuToPCoreRatio /
      (finalCount * coresPerServer)) *
    100;

  const ramUtilizationPercent =
    (cluster.totalVms * scenario.ramPerVmGb) /
    (finalCount * scenario.ramPerServerGb) *
    100;

  const diskUtilizationPercent =
    (cluster.totalVms * scenario.diskPerVmGb) /
    (finalCount * scenario.diskPerServerGb) *
    100;

  return Object.freeze({
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
    rawCount,
    finalCount,
    limitingResource,
    haReserveApplied,
    achievedVcpuToPCoreRatio,
    vmsPerServer,
    cpuUtilizationPercent,
    ramUtilizationPercent,
    diskUtilizationPercent,
  });
}
