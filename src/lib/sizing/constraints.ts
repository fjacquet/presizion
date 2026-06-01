import type { OldCluster, Scenario } from '../../types/cluster';
import type { LimitingResource, ScenarioResult } from '../../types/results';
import {
  serverCountByCpu,
  serverCountByDisk,
  serverCountByGhz,
  serverCountByRam,
  serverCountBySpecint,
} from './formulas';
import { assessSingleVmFit } from './singleVmFit';
import { VSAN_DEFAULT_SLACK_PERCENT } from './vsanConstants';
import {
  computeVsanEffectiveGhzPerNode,
  computeVsanEffectiveRamPerNode,
  serverCountByVsanStorage,
} from './vsanFormulas';

/**
 * Sizing mode — determines which CPU/performance formula drives CALC-01.
 *
 * - 'vcpu':        vCPU:pCore ratio hard cap (default).
 * - 'performance': performance-headroom sizing. Uses SPECrate2017 when a SPEC
 *                  override is present (target SPEC + existing-cluster SPEC),
 *                  otherwise falls back to clock-frequency (GHz × utilization).
 */
export type SizingMode = 'vcpu' | 'performance';

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
 * Tie-breaking priority when counts are equal: cpu/specint/ghz > ram > disk > vms.
 * The cpu slot carries the label the active CPU formula produced
 * ('cpu' | 'specint' | 'ghz'). The vms slot is the optional VM-density cap and
 * only wins when it strictly exceeds every other constraint.
 */
function determineLimitingResource(
  cpu: number,
  ram: number,
  disk: number,
  vms: number,
  cpuLabel: 'cpu' | 'specint' | 'ghz',
): LimitingResource {
  if (cpu >= ram && cpu >= disk && cpu >= vms) return cpuLabel;
  if (ram > cpu && ram >= disk && ram >= vms) return 'ram';
  if (disk > cpu && disk > ram && disk >= vms) return 'disk';
  return 'vms';
}

/**
 * Public API: computes the full ScenarioResult for a given cluster + scenario pair.
 *
 * Demand model: a single unified demand factor scales all resource demand:
 *   demandFactor = (1 + growthPercent/100) × (1 + safetyPercent/100)
 * growthPercent captures expected future workload growth; safetyPercent is the
 * operational "don't run hot" buffer. There is no separate target-utilization
 * division and no per-VM target-count override — observed cluster metrics are
 * used directly.
 *
 * Two sizing modes drive the CPU/performance constraint (CALC-01):
 *   - 'vcpu':        ceil(totalVcpus × demandFactor / ratio / coresPerServer)
 *   - 'performance': SPECrate when a SPEC override is present, else GHz mode.
 *
 * Applies CALC-01 through CALC-06:
 *   CALC-01: CPU/performance-limited count (formula depends on sizingMode)
 *   CALC-02: RAM-limited count
 *   CALC-03: Disk-limited count (0 in disaggregated layout mode)
 *   CALC-04: HA reserve (adds haReserveCount servers after the max)
 *   CALC-05: Max constraint selection + limiting resource identification
 *   CALC-06: Utilization metrics
 *
 * The returned object is frozen — it is never mutated after creation.
 *
 * @param cluster      Current environment metrics (OldCluster)
 * @param scenario     Target server configuration and sizing assumptions (Scenario)
 * @param sizingMode   CPU formula selection: 'vcpu' (default) or 'performance'
 * @param layoutMode   Disk constraint inclusion (default 'hci')
 */
export function computeScenarioResult(
  cluster: OldCluster,
  scenario: Scenario,
  sizingMode: SizingMode = 'vcpu',
  layoutMode: LayoutMode = 'hci',
): ScenarioResult {
  const growthFactor = 1 + (scenario.growthPercent ?? 0) / 100;
  const safetyFactor = 1 + (scenario.safetyPercent ?? 0) / 100;
  const demandFactor = growthFactor * safetyFactor;
  // In vCPU mode the vCPU:pCore ratio is itself the CPU headroom, so the safety
  // buffer must not also inflate the CPU count — CPU scales with growth only.
  // RAM/disk (and CPU in performance mode) keep the full growth×safety factor.
  const cpuDemandFactor = sizingMode === 'vcpu' ? growthFactor : demandFactor;
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  const effectiveVmCount = cluster.totalVms;
  const effectiveVcpus = cluster.totalVcpus;
  const cpuUtilPct = cluster.cpuUtilizationPercent ?? 100;

  // CALC-01: CPU/performance-limited count + which resource label it carries
  let cpuLimitedCount: number;
  let cpuResourceLabel: 'cpu' | 'specint' | 'ghz' = 'cpu';
  if (sizingMode === 'performance') {
    const hasSpec =
      (scenario.targetSpecint ?? 0) > 0 &&
      (cluster.existingServerCount ?? 0) > 0 &&
      (cluster.specintPerServer ?? 0) > 0;
    if (hasSpec) {
      cpuResourceLabel = 'specint';
      cpuLimitedCount = serverCountBySpecint(
        cluster.existingServerCount ?? 0,
        cluster.specintPerServer ?? 0,
        demandFactor,
        scenario.targetSpecint ?? 0,
      );
    } else {
      cpuResourceLabel = 'ghz';
      const rawTargetFreqGhz = scenario.targetCpuFrequencyGhz ?? 1;
      const effectiveTargetFreqGhz = scenario.vsanFttPolicy
        ? computeVsanEffectiveGhzPerNode(rawTargetFreqGhz, scenario.vsanCpuOverheadPercent)
        : rawTargetFreqGhz;
      cpuLimitedCount = serverCountByGhz(
        cluster.totalPcores,
        cluster.cpuFrequencyGhz ?? 1,
        cpuUtilPct,
        demandFactor,
        effectiveTargetFreqGhz,
        coresPerServer,
        100, // target util folded into the safety buffer
      );
    }
  } else {
    // 'vcpu': ratio is a hard assignment-density cap; cpuUtilPct not used here.
    // cpuDemandFactor excludes the safety buffer (headroom comes from the ratio).
    cpuLimitedCount = serverCountByCpu(
      effectiveVcpus,
      cpuDemandFactor,
      scenario.targetVcpuToPCoreRatio,
      coresPerServer,
    );
  }

  // CALC-02: RAM-limited count — observed util scales demand, no target-util division
  const ramUtilPct = cluster.ramUtilizationPercent ?? 100;
  const effectiveRamPerServerGb = scenario.vsanFttPolicy
    ? computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)
    : scenario.ramPerServerGb;
  const ramLimitedCount = serverCountByRam(
    effectiveVmCount,
    scenario.ramPerVmGb,
    demandFactor,
    effectiveRamPerServerGb,
    ramUtilPct,
    100, // no target-util division anymore
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
    // Legacy path (VSAN-12)
    diskLimitedCount = serverCountByDisk(
      effectiveVmCount,
      scenario.diskPerVmGb,
      demandFactor,
      scenario.diskPerServerGb,
    );
  }

  // CALC-VMS: VM-density cap. A host can run at most maxVmsPerHost VMs; when set,
  // this is a genuine constraint on the node count (demand scaled like RAM/disk).
  // Absent/0 → no cap → 0, which never wins the max or the limiting-resource pick.
  const maxVmsPerHost = scenario.maxVmsPerHost ?? 0;
  const vmsLimitedCount =
    maxVmsPerHost > 0 ? Math.ceil((effectiveVmCount * demandFactor) / maxVmsPerHost) : 0;

  // CALC-05: Limiting resource — determined from the raw counts (before HA)
  const limitingResource = determineLimitingResource(
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
    vmsLimitedCount,
    cpuResourceLabel,
  );

  // CALC-05: Raw count is the maximum of all active constraints
  const rawCount = Math.max(cpuLimitedCount, ramLimitedCount, diskLimitedCount, vmsLimitedCount);

  // CALC-STRETCH + CALC-04: stretched topology — each site carries the full
  // workload, so the workload is doubled for site symmetry (stretchPairedCount).
  // The HA reserve is a PER-SITE intent ("N+1 local"): in a stretch cluster it
  // applies to each site independently, so it is doubled along with the workload
  // (N+1 local → +2 total). Non-stretch clusters add the reserve once.
  const stretchApplied = cluster.isStretchCluster === true;
  const haReserveCount = scenario.haReserveCount ?? 0;

  let stretchPairedCount: number | undefined;
  let withHA: number;
  if (stretchApplied) {
    stretchPairedCount = rawCount * 2; // doubled workload (reserve-independent)
    withHA = (rawCount + haReserveCount) * 2; // one spare host per site
  } else {
    withHA = rawCount + haReserveCount;
  }

  // Pin floor: finalCount is never less than minServerCount when set
  const finalCount =
    scenario.minServerCount != null ? Math.max(withHA, scenario.minServerCount) : withHA;

  const requiredCount = rawCount;
  const haReserveApplied = haReserveCount > 0;

  // CALC-06: Utilization metrics (use finalCount as denominator, observed demand)
  const achievedVcpuToPCoreRatio =
    finalCount > 0 ? effectiveVcpus / (finalCount * coresPerServer) : 0;

  const vmsPerServer = finalCount > 0 ? effectiveVmCount / finalCount : 0;

  const cpuUtilizationPercent =
    finalCount > 0
      ? ((effectiveVcpus * (cpuUtilPct / 100)) /
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
      ? ((effectiveVmCount * scenario.diskPerVmGb) / (finalCount * scenario.diskPerServerGb)) * 100
      : 0;

  return Object.freeze({
    cpuLimitedCount,
    ramLimitedCount,
    diskLimitedCount,
    vmsLimitedCount,
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
    stretchApplied,
    singleVmFit: assessSingleVmFit(cluster, scenario),
    ...(stretchPairedCount !== undefined && { stretchPairedCount }),
  });
}
