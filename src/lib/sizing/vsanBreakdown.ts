/**
 * Capacity breakdown computation for CPU, Memory, and Storage resources.
 *
 * Produces the data layer for Phase 21 stacked capacity charts and Phase 22
 * PDF report tables. The CAP-06 invariant holds for every row:
 *   required + spare + excess === total
 *
 * No React or UI imports -- pure TypeScript math only.
 *
 * @module vsanBreakdown
 */

import type { OldCluster, Scenario } from '../../types/cluster';
import type { ScenarioResult } from '../../types/results';
import type {
  ResourceBreakdown,
  StorageBreakdown,
  VsanCapacityBreakdown,
} from '../../types/breakdown';
import {
  FTT_POLICY_MAP,
  VSAN_METADATA_OVERHEAD_RATIO,
  VSAN_DEFAULT_SLACK_PERCENT,
  VSAN_DEFAULT_CPU_OVERHEAD_PCT,
  VSAN_DEFAULT_MEMORY_PER_HOST_GB,
} from './vsanConstants';

/**
 * Computes the capacity breakdown for a pre-computed ScenarioResult.
 *
 * @param cluster  - Current environment metrics (OldCluster)
 * @param scenario - Target server configuration and sizing assumptions (Scenario)
 * @param result   - Pre-computed ScenarioResult (NOT recomputed internally)
 * @returns VsanCapacityBreakdown with CPU, Memory, Storage rows
 */
export function computeVsanBreakdown(
  cluster: OldCluster,
  scenario: Scenario,
  result: ScenarioResult,
): VsanCapacityBreakdown {
  const { finalCount } = result;
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;
  const freqGhz = scenario.targetCpuFrequencyGhz ?? 1;
  const isVsan = scenario.vsanFttPolicy !== undefined;

  // Effective VM count (with targetVmCount override)
  const effectiveVmCount = scenario.targetVmCount ?? cluster.totalVms;

  // =====================================================================
  // CPU Breakdown (CAP-01)
  // =====================================================================
  const cpuBreakdown = computeCpuBreakdown(
    cluster,
    scenario,
    result,
    coresPerServer,
    freqGhz,
    isVsan,
  );

  // =====================================================================
  // Memory Breakdown (CAP-02)
  // =====================================================================
  const memoryBreakdown = computeMemoryBreakdown(
    cluster,
    scenario,
    result,
    effectiveVmCount,
    isVsan,
  );

  // =====================================================================
  // Storage Breakdown (CAP-03)
  // =====================================================================
  const storageBreakdown = computeStorageBreakdown(
    cluster,
    scenario,
    result,
    effectiveVmCount,
    isVsan,
  );

  // =====================================================================
  // minNodesByConstraint
  // =====================================================================
  const minNodesByConstraint: Record<string, number> = {
    cpu: result.cpuLimitedCount,
    memory: result.ramLimitedCount,
    storage: result.diskLimitedCount,
    ftha: result.haReserveCount,
    vms:
      result.vmsPerServer > 0
        ? Math.ceil(effectiveVmCount / result.vmsPerServer)
        : 0,
  };

  return Object.freeze({
    scenarioId: scenario.id,
    cpu: cpuBreakdown,
    memory: memoryBreakdown,
    storage: storageBreakdown,
    minNodesByConstraint,
  });
}

// =====================================================================
// Internal: CPU Breakdown
// =====================================================================

function computeCpuBreakdown(
  cluster: OldCluster,
  scenario: Scenario,
  result: ScenarioResult,
  coresPerServer: number,
  freqGhz: number,
  isVsan: boolean,
): ResourceBreakdown {
  const { finalCount } = result;
  const targetCpuUtilPct = scenario.targetCpuUtilizationPercent ?? 100;

  // Demand: vCPU count * target frequency (GHz reporting)
  const vmsRequired = cluster.totalVcpus * freqGhz;

  // Total configured GHz for the cluster
  const totalConfiguredGhz = finalCount * coresPerServer * freqGhz;

  // vSAN CPU overhead: percentage of total configured GHz
  const vsanCpuOverheadPct = scenario.vsanCpuOverheadPercent ?? VSAN_DEFAULT_CPU_OVERHEAD_PCT;
  const vsanConsumption = isVsan ? totalConfiguredGhz * (vsanCpuOverheadPct / 100) : 0;

  const required = vmsRequired + vsanConsumption;

  // Total = cluster capacity
  const total = totalConfiguredGhz;

  // HA Reserve = one node worth of capacity
  const haReserve = coresPerServer * freqGhz;

  // Max utilization reserve (CAP-05)
  const reservedMaxUtil = computeMaxUtilReserve(required, targetCpuUtilPct);

  // Spare = reservedMaxUtil + haReserve
  const spare = reservedMaxUtil + haReserve;

  // Excess = total - required - spare (can be negative)
  const excess = total - required - spare;

  return Object.freeze({
    vmsRequired,
    vsanConsumption,
    required,
    reservedMaxUtil,
    haReserve,
    spare,
    excess,
    total,
  });
}

// =====================================================================
// Internal: Memory Breakdown
// =====================================================================

function computeMemoryBreakdown(
  cluster: OldCluster,
  scenario: Scenario,
  result: ScenarioResult,
  effectiveVmCount: number,
  isVsan: boolean,
): ResourceBreakdown {
  const { finalCount } = result;
  const targetRamUtilPct = scenario.targetRamUtilizationPercent ?? 100;

  // Demand: VM count * RAM per VM
  const vmsRequired = effectiveVmCount * scenario.ramPerVmGb;

  // vSAN memory overhead: per-host memory reservation
  const vsanMemPerHost = scenario.vsanMemoryPerHostGb ?? VSAN_DEFAULT_MEMORY_PER_HOST_GB;
  const vsanConsumption = isVsan ? finalCount * vsanMemPerHost : 0;

  const required = vmsRequired + vsanConsumption;

  // Total = cluster RAM capacity
  const total = finalCount * scenario.ramPerServerGb;

  // HA Reserve = one node worth of RAM
  const haReserve = scenario.ramPerServerGb;

  // Max utilization reserve (CAP-05)
  const reservedMaxUtil = computeMaxUtilReserve(required, targetRamUtilPct);

  const spare = reservedMaxUtil + haReserve;
  const excess = total - required - spare;

  return Object.freeze({
    vmsRequired,
    vsanConsumption,
    required,
    reservedMaxUtil,
    haReserve,
    spare,
    excess,
    total,
  });
}

// =====================================================================
// Internal: Storage Breakdown
// =====================================================================

function computeStorageBreakdown(
  _cluster: OldCluster,
  scenario: Scenario,
  result: ScenarioResult,
  effectiveVmCount: number,
  isVsan: boolean,
): StorageBreakdown {
  const { finalCount } = result;

  // Total raw capacity of the cluster
  const total = finalCount * scenario.diskPerServerGb;

  // Disaggregated layout: all zeros when diskPerServerGb = 0 or diskLimitedCount = 0
  if (total === 0) {
    return Object.freeze({
      vmsRequired: 0,
      vsanConsumption: 0,
      required: 0,
      reservedMaxUtil: 0,
      haReserve: 0,
      spare: 0,
      excess: 0,
      total: 0,
      usableRequired: 0,
      swapOverhead: 0,
      metadataOverhead: 0,
      fttOverhead: 0,
      rawRequired: 0,
      slackSpace: 0,
    });
  }

  // Usable storage demand
  const usableRequired = effectiveVmCount * scenario.diskPerVmGb;

  if (!isVsan) {
    // Non-vSAN: simple path
    const required = usableRequired;
    const haReserve = finalCount > 0 ? total / finalCount : 0;
    const spare = haReserve;
    const excess = total - required - spare;

    return Object.freeze({
      vmsRequired: usableRequired,
      vsanConsumption: 0,
      required,
      reservedMaxUtil: 0,
      haReserve,
      spare,
      excess,
      total,
      usableRequired,
      swapOverhead: 0,
      metadataOverhead: 0,
      fttOverhead: 0,
      rawRequired: usableRequired,
      slackSpace: 0,
    });
  }

  // vSAN path: decompose the storage pipeline
  const fttPolicy = scenario.vsanFttPolicy!;
  const policy = FTT_POLICY_MAP[fttPolicy];
  const compressionFactor = Math.max(scenario.vsanCompressionFactor ?? 1.0, 1.0);
  const slackPercent = scenario.vsanSlackPercent ?? VSAN_DEFAULT_SLACK_PERCENT;
  const vmSwapEnabled = scenario.vsanVmSwapEnabled ?? false;
  const totalVmRamGib = effectiveVmCount * scenario.ramPerVmGb;

  // Step 1: Apply compression
  let effectiveUsable = usableRequired / compressionFactor;

  // Step 2: Add VM swap if enabled
  const swapOverhead = vmSwapEnabled ? totalVmRamGib : 0;
  if (vmSwapEnabled) {
    effectiveUsable += totalVmRamGib;
  }

  // Step 3: Apply FTT multiplier
  const afterFtt = effectiveUsable * policy.multiplier;
  const fttOverhead = afterFtt - effectiveUsable;

  // Step 4: Add metadata overhead
  const metadataOverhead = usableRequired * VSAN_METADATA_OVERHEAD_RATIO;
  const rawBeforeSlack = afterFtt + metadataOverhead;

  // Step 5: Apply slack
  const slackFraction = 1 - slackPercent / 100;
  const rawRequired = rawBeforeSlack / slackFraction;
  const slackSpace = rawRequired - rawBeforeSlack;

  // For the invariant: required = rawBeforeSlack (FTT + metadata, no slack)
  const required = rawBeforeSlack;

  // vSAN consumption for the "vmsRequired + vsanConsumption = required" relationship:
  // vsanConsumption = required - usableRequired (all overhead combined)
  const vsanConsumption = required - usableRequired;

  // HA Reserve = 1/N of cluster raw capacity
  const haReserve = finalCount > 0 ? total / finalCount : 0;

  // Spare = slackSpace + haReserve (slack is displayed separately from required)
  const spare = slackSpace + haReserve;

  // Excess = total - required - spare
  const excess = total - required - spare;

  return Object.freeze({
    vmsRequired: usableRequired,
    vsanConsumption,
    required,
    reservedMaxUtil: 0,
    haReserve,
    spare,
    excess,
    total,
    usableRequired,
    swapOverhead,
    metadataOverhead,
    fttOverhead,
    rawRequired,
    slackSpace,
  });
}

// =====================================================================
// Internal: Max Utilization Reserve (CAP-05)
// =====================================================================

/**
 * Computes the max utilization reserve.
 * Formula: required / maxUtilPct * (1 - maxUtilPct)
 * When maxUtilPct = 100, reserve is 0.
 */
function computeMaxUtilReserve(required: number, maxUtilPct: number): number {
  if (maxUtilPct >= 100 || maxUtilPct <= 0) return 0;
  const fraction = maxUtilPct / 100;
  return (required / fraction) * (1 - fraction);
}
