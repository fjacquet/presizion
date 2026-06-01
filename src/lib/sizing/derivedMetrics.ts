import type { OldCluster } from '@/types/cluster';

/**
 * Derived per-VM / ratio metrics for the Step 1 metrics panel.
 *
 * Pure sizing math (kept out of the component per the architecture rule that
 * all formulas live in `src/lib/sizing/`). Returns `null` when the inputs
 * required for a ratio are absent; the UI is responsible for formatting and
 * the em-dash placeholder.
 *
 * Note: `vmsPerServer` is NOT here — it comes from the computed ScenarioResult
 * (first scenario), and `avgRamPerVmGb` is a raw imported field, not a ratio.
 */
export interface DerivedClusterMetrics {
  /** Total vCPUs ÷ total physical cores (oversubscription ratio). */
  vcpuToPcoreRatio: number | null;
  /** Total vCPUs ÷ total VMs. */
  avgVcpuPerVm: number | null;
  /** Total RAM GB ÷ total VMs (null when no cluster total RAM). */
  avgRamPerVmGb: number | null;
  /** Total disk GB ÷ total VMs. */
  avgDiskPerVmGb: number | null;
}

export function deriveClusterMetrics(cluster: OldCluster): DerivedClusterMetrics {
  return {
    vcpuToPcoreRatio: cluster.totalPcores > 0 ? cluster.totalVcpus / cluster.totalPcores : null,
    avgVcpuPerVm: cluster.totalVms > 0 ? cluster.totalVcpus / cluster.totalVms : null,
    avgRamPerVmGb:
      cluster.totalRamGb != null && cluster.totalVms > 0
        ? cluster.totalRamGb / cluster.totalVms
        : null,
    avgDiskPerVmGb:
      cluster.totalDiskGb != null && cluster.totalVms > 0
        ? cluster.totalDiskGb / cluster.totalVms
        : null,
  };
}
