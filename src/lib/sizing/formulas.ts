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
 * Formula (CALC-01):
 *   ceil( totalVcpus * (cpuUtilPct/100) * growthHeadroomFactor / targetVcpuToPCoreRatio / coresPerServer )
 *
 * @param totalVcpus         Total vCPUs consumed by all VMs in the cluster
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param targetVcpuToPCoreRatio  Target vCPU-to-physical-core overcommit ratio (e.g. 4)
 * @param coresPerServer     Physical cores per new target server (sockets * coresPerSocket)
 * @param cpuUtilPct         CPU utilization percentage (0–100); default 100 = no right-sizing
 */
export function serverCountByCpu(
  totalVcpus: number,
  growthHeadroomFactor: number,
  targetVcpuToPCoreRatio: number,
  coresPerServer: number,
  cpuUtilPct: number = 100,
): number {
  return Math.ceil(
    (totalVcpus * (cpuUtilPct / 100) * growthHeadroomFactor) / targetVcpuToPCoreRatio / coresPerServer,
  );
}

/**
 * Computes the number of servers required when RAM is the limiting constraint.
 *
 * Formula (CALC-02):
 *   ceil( totalVms * ramPerVmGb * (ramUtilPct/100) * growthHeadroomFactor / ramPerServerGb )
 *
 * @param totalVms           Total number of virtual machines in the cluster
 * @param ramPerVmGb         Average RAM consumed per VM (GB)
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param ramPerServerGb     Total RAM capacity per new target server (GB)
 * @param ramUtilPct         RAM utilization percentage (0–100); default 100 = no right-sizing
 */
export function serverCountByRam(
  totalVms: number,
  ramPerVmGb: number,
  growthHeadroomFactor: number,
  ramPerServerGb: number,
  ramUtilPct: number = 100,
): number {
  return Math.ceil(
    (totalVms * ramPerVmGb * (ramUtilPct / 100) * growthHeadroomFactor) / ramPerServerGb,
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
