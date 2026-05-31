import type { OldCluster } from '../../types/cluster';

/**
 * Sizing requires observed utilization — we never silently assume 100%
 * (that over-sizes the cluster). Both CPU and RAM utilization must be set
 * (measured or explicitly estimated) before Step 2/3 may run.
 */
export function isClusterSizingReady(cluster: OldCluster): boolean {
  return cluster.cpuUtilizationPercent !== undefined && cluster.ramUtilizationPercent !== undefined;
}
