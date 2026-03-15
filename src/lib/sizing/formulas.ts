/**
 * Pure formula functions for cluster sizing constraints.
 *
 * IMPORTANT: growthHeadroomFactor is already a multiplicative factor,
 * e.g. 1.20 for 20% headroom. Do NOT add 1 to this value — callers
 * (constraints.ts) compute it as `1 + headroomPercent / 100` before passing here.
 *
 * Math.ceil is applied ONLY at the final return of each function.
 * No intermediate rounding is performed to preserve accuracy.
 *
 * No React or UI imports — pure TypeScript math only.
 */

/**
 * Computes the number of servers required when CPU is the limiting constraint.
 *
 * The vCPU:pCore ratio is a hard assignment-density cap: the cluster must never
 * assign more than targetVcpuToPCoreRatio vCPUs per physical core, regardless of
 * current CPU utilization. cpuUtilizationPercent is intentionally excluded here —
 * it only affects the result display metric (CALC-06), not the server count.
 *
 * Formula (CALC-01):
 *   ceil( totalVcpus * growthHeadroomFactor / targetVcpuToPCoreRatio / coresPerServer )
 *
 * @param totalVcpus              Total vCPUs consumed by all VMs in the cluster
 * @param growthHeadroomFactor    1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param targetVcpuToPCoreRatio  Target vCPU-to-physical-core overcommit ratio (hard cap, e.g. 4)
 * @param coresPerServer          Physical cores per new target server (sockets * coresPerSocket)
 */
export function serverCountByCpu(
  totalVcpus: number,
  growthHeadroomFactor: number,
  targetVcpuToPCoreRatio: number,
  coresPerServer: number,
): number {
  return Math.ceil(
    (totalVcpus * growthHeadroomFactor) / targetVcpuToPCoreRatio / coresPerServer,
  );
}

/**
 * Computes the number of servers required when RAM is the limiting constraint.
 *
 * Formula (CALC-02):
 *   ceil( totalVms * ramPerVmGb * (ramUtilPct/100) * growthHeadroomFactor / (targetRamUtilPct/100) / ramPerServerGb )
 *
 * @param totalVms            Total number of virtual machines in the cluster
 * @param ramPerVmGb          Average RAM consumed per VM (GB)
 * @param growthHeadroomFactor 1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param ramPerServerGb      Total RAM capacity per new target server (GB)
 * @param ramUtilPct          Current RAM utilization % (0–100); default 100 = no right-sizing
 * @param targetRamUtilPct    Design target RAM utilization % for the new cluster (1–100); default 100
 */
export function serverCountByRam(
  totalVms: number,
  ramPerVmGb: number,
  growthHeadroomFactor: number,
  ramPerServerGb: number,
  ramUtilPct: number = 100,
  targetRamUtilPct: number = 100,
): number {
  // Guard: percent values must be 0-100, not 0-1 (ratios)
  const safeRamUtil = ramUtilPct > 0 && ramUtilPct <= 100 ? ramUtilPct : 100;
  const safeTargetUtil = targetRamUtilPct > 0 && targetRamUtilPct <= 100 ? targetRamUtilPct : 100;
  return Math.ceil(
    (totalVms * ramPerVmGb * (safeRamUtil / 100) * growthHeadroomFactor) /
      (safeTargetUtil / 100) /
      ramPerServerGb,
  );
}

/**
 * Computes the number of servers required when disk is the limiting constraint.
 *
 * Formula (CALC-03):
 *   ceil( totalVms * diskPerVmGb * growthHeadroomFactor / diskPerServerGb )
 *
 * @param totalVms           Total number of virtual machines in the cluster
 * @param diskPerVmGb        Average disk consumed per VM (GB)
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param diskPerServerGb    Total disk capacity per new target server (GB)
 */
export function serverCountByDisk(
  totalVms: number,
  diskPerVmGb: number,
  growthHeadroomFactor: number,
  diskPerServerGb: number,
): number {
  return Math.ceil(
    (totalVms * diskPerVmGb * growthHeadroomFactor) / diskPerServerGb,
  );
}

/**
 * Computes the number of servers required when SPECint performance is the limiting constraint.
 *
 * Formula (CALC-SPECint):
 *   ceil( existingServers * oldSPECintPerServer * growthHeadroomFactor / targetSPECint )
 *
 * Returns 0 if targetSPECint <= 0 (zero-guard) or existingServers is 0.
 *
 * @param existingServers      Number of existing servers in the old cluster
 * @param oldSPECintPerServer  SPECint benchmark score per existing server
 * @param growthHeadroomFactor 1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param targetSPECint        SPECint benchmark score of the new target server
 */
export function serverCountBySpecint(
  existingServers: number,
  oldSPECintPerServer: number,
  growthHeadroomFactor: number,
  targetSPECint: number,
): number {
  if (targetSPECint <= 0) return 0;
  return Math.ceil(
    (existingServers * oldSPECintPerServer * growthHeadroomFactor) / targetSPECint,
  );
}

/**
 * Computes the number of servers required in Aggressive mode.
 *
 * The vCPU:pCore ratio cap is intentionally bypassed. The observed CPU
 * utilization drives density directly — the user explicitly accepts the risk
 * of overcommit beyond the standard ratio.
 *
 * Formula (CALC-01-AGG):
 *   ceil( totalVcpus * (cpuUtilPct/100) * growthHeadroomFactor / coresPerServer )
 *
 * @param totalVcpus          Total vCPUs assigned in the cluster
 * @param cpuUtilPct          Observed average CPU utilization (0–100)
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param coresPerServer      Physical cores per new target server
 */
export function serverCountByCpuAggressive(
  totalVcpus: number,
  cpuUtilPct: number,
  growthHeadroomFactor: number,
  coresPerServer: number,
): number {
  return Math.ceil(
    (totalVcpus * (cpuUtilPct / 100) * growthHeadroomFactor) / coresPerServer,
  );
}

/**
 * Computes the number of servers required in GHz mode.
 *
 * Demand is measured in GHz: pCores × existingFreq × observedUtil.
 * Each new server provides: coresPerServer × newFreq × targetUtil GHz.
 *
 * Formula (CALC-01-GHZ):
 *   demandGhz = totalPcores × cpuFrequencyGhz × (cpuUtilPct/100)
 *   ghzPerServer = coresPerServer × targetCpuFrequencyGhz × (targetCpuUtilPct/100)
 *   ceil( demandGhz × growthHeadroomFactor / ghzPerServer )
 *
 * Returns 0 if either frequency is ≤ 0 (zero-guard).
 *
 * @param totalPcores             Physical cores in the existing cluster
 * @param cpuFrequencyGhz         Existing CPU clock frequency in GHz
 * @param cpuUtilPct              Observed average CPU utilization (0–100)
 * @param growthHeadroomFactor    1 + headroomPercent/100
 * @param targetCpuFrequencyGhz   New server CPU clock frequency in GHz
 * @param coresPerServer          Physical cores per new target server
 * @param targetCpuUtilPct        Design target CPU utilization for new servers (0–100, default 100)
 */
export function serverCountByGhz(
  totalPcores: number,
  cpuFrequencyGhz: number,
  cpuUtilPct: number,
  growthHeadroomFactor: number,
  targetCpuFrequencyGhz: number,
  coresPerServer: number,
  targetCpuUtilPct: number = 100,
): number {
  if (cpuFrequencyGhz <= 0 || targetCpuFrequencyGhz <= 0) return 0;
  const demandGhz = totalPcores * cpuFrequencyGhz * (cpuUtilPct / 100);
  const ghzPerServer = coresPerServer * targetCpuFrequencyGhz * (targetCpuUtilPct / 100);
  if (ghzPerServer <= 0) return 0;
  return Math.ceil((demandGhz * growthHeadroomFactor) / ghzPerServer);
}
