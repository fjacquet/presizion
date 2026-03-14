import type { OldCluster, Scenario } from '../../types/cluster';
import type { ScenarioResult, LimitingResource } from '../../types/results';
import {
  serverCountByCpu,
  serverCountByCpuAggressive,
  serverCountByGhz,
  serverCountByRam,
  serverCountByDisk,
  serverCountBySpecint,
} from './formulas';
import {
  serverCountByVsanStorage,
  computeVsanEffectiveGhzPerNode,
  computeVsanEffectiveRamPerNode,
} from './vsanFormulas';
import { VSAN_DEFAULT_SLACK_PERCENT } from './vsanConstants';

/**
 * Sizing mode — determines which CPU/performance formula drives CALC-01.
 *
 * - 'vcpu':       vCPU:pCore ratio hard cap (default).
 * - 'specint':    SPECrate2017 benchmark score comparison.
 * - 'aggressive': Observed CPU utilization drives density; ratio cap bypassed.
 * - 'ghz':        Clock-frequency × utilization drives demand and capacity.
 */
export type SizingMode = 'vcpu' | 'specint' | 'aggressive' | 'ghz';

/**
 * Layout mode — determines whether disk is a server-level constraint.
 *
 * - 'hci':           Hyperconverged: disk lives inside the compute nodes (disk counted).
 * - 'disaggregated': External storage (SAN/NAS): disk constraint excluded from sizing.
 */
export type LayoutMode = 'hci' | 'disaggregated';

/**
 * Determines which resource constraint drove the final (maximum) server count.
 *
 * Tie-breaking priority when counts are equal: cpu/specint/ghz > ram > disk.
 * The cpu slot returns 'specint' or 'ghz' when the respective mode is active.
 */
function determineLimitingResource(
  cpu: number,
  ram: number,
  disk: number,
  sizingMode: SizingMode = 'vcpu',
): LimitingResource {
  if (cpu >= ram && cpu >= disk) {
    if (sizingMode === 'specint') return 'specint';
    if (sizingMode === 'ghz') return 'ghz';
    return 'cpu';
  }
  if (ram > cpu && ram >= disk) return 'ram';
  return 'disk';
}

/**
 * Public API: computes the full ScenarioResult for a given cluster + scenario pair.
 *
 * Applies CALC-01 through CALC-06:
 *   CALC-01: CPU-limited count (formula depends on sizingMode)
 *   CALC-02: RAM-limited count
 *   CALC-03: Disk-limited count (0 in disaggregated layout mode)
 *   CALC-04: HA reserve (adds haReserveCount servers after the max)
 *   CALC-05: Max constraint selection + limiting resource identification
 *   CALC-06: Utilization metrics
 *
 * When scenario.targetVmCount is set, RAM/disk formulas use the target count and
 * vCPUs are scaled proportionally (effectiveVcpus = totalVcpus × targetVmCount / totalVms).
 *
 * The returned object is frozen — it is never mutated after creation.
 *
 * @param cluster      Current environment metrics (OldCluster)
 * @param scenario     Target server configuration and sizing assumptions (Scenario)
 * @param sizingMode   CPU formula selection (default 'vcpu')
 * @param layoutMode   Disk constraint inclusion (default 'hci')
 */
export function computeScenarioResult(
  cluster: OldCluster,
  scenario: Scenario,
  sizingMode: SizingMode = 'vcpu',
  layoutMode: LayoutMode = 'hci',
): ScenarioResult {
  const headroomFactor = 1 + scenario.headroomPercent / 100;
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  // Effective VM and vCPU counts — scaled when targetVmCount overrides cluster.totalVms
  const effectiveVmCount = scenario.targetVmCount ?? cluster.totalVms;
  const effectiveVcpus =
    scenario.targetVmCount && cluster.totalVms > 0
      ? Math.round(cluster.totalVcpus * (scenario.targetVmCount / cluster.totalVms))
      : cluster.totalVcpus;

  const cpuUtilPct = cluster.cpuUtilizationPercent ?? 100;
  const targetCpuUtilPct = scenario.targetCpuUtilizationPercent ?? 100;

  // CALC-01: CPU/performance-limited count (formula depends on sizingMode)
  let cpuLimitedCount: number;
  if (sizingMode === 'specint') {
    cpuLimitedCount = serverCountBySpecint(
      cluster.existingServerCount ?? 0,
      cluster.specintPerServer ?? 0,
      headroomFactor,
      scenario.targetSpecint ?? 0,
    );
  } else if (sizingMode === 'aggressive') {
    // Ratio cap bypassed: observed utilization drives density
    cpuLimitedCount = serverCountByCpuAggressive(
      effectiveVcpus,
      cpuUtilPct,
      headroomFactor,
      coresPerServer,
    );
  } else if (sizingMode === 'ghz') {
    // CALC-01-GHZ: When vSAN is active, deduct CPU overhead from target per-core GHz
    const rawTargetFreqGhz = scenario.targetCpuFrequencyGhz ?? 1;
    const effectiveTargetFreqGhz = scenario.vsanFttPolicy
      ? computeVsanEffectiveGhzPerNode(rawTargetFreqGhz, scenario.vsanCpuOverheadPercent)
      : rawTargetFreqGhz;
    cpuLimitedCount = serverCountByGhz(
      cluster.totalPcores,
      cluster.cpuFrequencyGhz ?? 1,
      cpuUtilPct,
      headroomFactor,
      effectiveTargetFreqGhz,
      coresPerServer,
      targetCpuUtilPct,
    );
  } else {
    // 'vcpu': ratio is a hard assignment-density cap; cpuUtilPct not used here
    cpuLimitedCount = serverCountByCpu(
      effectiveVcpus,
      headroomFactor,
      scenario.targetVcpuToPCoreRatio,
      coresPerServer,
    );
  }

  // CALC-02: RAM-limited count
  const ramUtilPct = cluster.ramUtilizationPercent ?? 100;
  const targetRamUtilPct = scenario.targetRamUtilizationPercent ?? 100;
  const effectiveRamPerServerGb = scenario.vsanFttPolicy
    ? computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)
    : scenario.ramPerServerGb;
  const ramLimitedCount = serverCountByRam(
    effectiveVmCount,
    scenario.ramPerVmGb,
    headroomFactor,
    effectiveRamPerServerGb,
    ramUtilPct,
    targetRamUtilPct,
  );

  // CALC-03: Disk/Storage-limited count
  let diskLimitedCount: number;
  if (layoutMode === 'disaggregated') {
    diskLimitedCount = 0;
  } else if (scenario.vsanFttPolicy) {
    // vSAN-aware path (VSAN-02, VSAN-11)
    const usableGib = effectiveVmCount * scenario.diskPerVmGb;
    diskLimitedCount = serverCountByVsanStorage(
      usableGib,
      scenario.diskPerServerGb,
      scenario.vsanFttPolicy,
      {
        compressionFactor: scenario.vsanCompressionFactor ?? 1.0,
        vmSwapEnabled: scenario.vsanVmSwapEnabled ?? false,
        totalVmRamGib: effectiveVmCount * scenario.ramPerVmGb,
        slackPercent: scenario.vsanSlackPercent ?? VSAN_DEFAULT_SLACK_PERCENT,
      },
    );
  } else {
    // Legacy path — unchanged (VSAN-12)
    diskLimitedCount = serverCountByDisk(
      effectiveVmCount,
      scenario.diskPerVmGb,
      headroomFactor,
      scenario.diskPerServerGb,
    );
  }

  // CALC-05: Limiting resource — determined from the raw counts (before HA)
  const limitingResource = determineLimitingResource(
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
    sizingMode,
  );

  // CALC-05: Raw count is the maximum of all active constraints
  const rawCount = Math.max(cpuLimitedCount, ramLimitedCount, diskLimitedCount);

  // CALC-04: HA reserve — add 0, 1, or 2 servers after the constraint max
  const haReserveCount = scenario.haReserveCount ?? 0;
  const withHA = rawCount + haReserveCount;

  // Pin floor: finalCount is never less than minServerCount when set
  const finalCount =
    scenario.minServerCount != null ? Math.max(withHA, scenario.minServerCount) : withHA;

  const requiredCount = rawCount;
  const haReserveApplied = haReserveCount > 0;

  // CALC-06: Utilization metrics (use finalCount as denominator)
  const achievedVcpuToPCoreRatio =
    finalCount > 0 ? effectiveVcpus / (finalCount * coresPerServer) : 0;

  const vmsPerServer = finalCount > 0 ? effectiveVmCount / finalCount : 0;

  // CPU util % applies the same factor used in CALC-01 display
  const cpuUtilizationPercent =
    finalCount > 0
      ? (effectiveVcpus * (cpuUtilPct / 100) /
          scenario.targetVcpuToPCoreRatio /
          (finalCount * coresPerServer)) *
        100
      : 0;

  const ramUtilizationPercent =
    finalCount > 0
      ? ((effectiveVmCount * scenario.ramPerVmGb * (ramUtilPct / 100)) /
          (finalCount * scenario.ramPerServerGb)) *
        100
      : 0;

  const diskUtilizationPercent =
    finalCount > 0
      ? ((effectiveVmCount * scenario.diskPerVmGb) /
          (finalCount * scenario.diskPerServerGb)) *
        100
      : 0;

  return Object.freeze({
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
    rawCount,
    requiredCount,
    finalCount,
    limitingResource,
    haReserveCount,
    haReserveApplied,
    achievedVcpuToPCoreRatio,
    vmsPerServer,
    cpuUtilizationPercent,
    ramUtilizationPercent,
    diskUtilizationPercent,
  });
}
