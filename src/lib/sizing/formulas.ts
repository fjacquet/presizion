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
 *   ceil( totalVcpus * growthHeadroomFactor / targetVcpuToPCoreRatio / coresPerServer )
 *
 * @param totalVcpus         Total vCPUs consumed by all VMs in the cluster
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param targetVcpuToPCoreRatio  Target vCPU-to-physical-core overcommit ratio (e.g. 4)
 * @param coresPerServer     Physical cores per new target server (sockets * coresPerSocket)
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
 *   ceil( totalVms * ramPerVmGb * growthHeadroomFactor / ramPerServerGb )
 *
 * @param totalVms           Total number of virtual machines in the cluster
 * @param ramPerVmGb         Average RAM consumed per VM (GB)
 * @param growthHeadroomFactor  1 + headroomPercent/100 (e.g. 1.20 for 20% headroom)
 * @param ramPerServerGb     Total RAM capacity per new target server (GB)
 */
export function serverCountByRam(
  totalVms: number,
  ramPerVmGb: number,
  growthHeadroomFactor: number,
  ramPerServerGb: number,
): number {
  return Math.ceil(
    (totalVms * ramPerVmGb * growthHeadroomFactor) / ramPerServerGb,
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
