import type { Scenario } from '../../types/cluster';

/**
 * VMware general-purpose recommendation for mixed workloads.
 * VDI-heavy or DB-heavy workloads may warrant a lower ratio (e.g., 2:1 or 3:1).
 * CALC-01 reference default.
 */
export const DEFAULT_VCPU_TO_PCORE_RATIO = 4;

/**
 * 20% headroom means the cluster runs at approximately 80% utilisation under
 * normal load, leaving capacity for spikes and maintenance.
 * Industry-standard starting point; project owner should validate for target workload.
 */
export const DEFAULT_HEADROOM_PERCENT = 20;

/**
 * Headroom percentage already provides a sufficient capacity buffer.
 * Users may opt in to an explicit +1 server (N+1 HA) for additional resilience.
 * CALC-04.
 */
export const DEFAULT_HA_RESERVE_ENABLED = false;

/**
 * Returns a Scenario populated with industry-standard defaults.
 * Generates a fresh UUID for the scenario id each time it is called.
 */
export function createDefaultScenario(): Scenario {
  return {
    id: crypto.randomUUID(),
    name: 'New Scenario',
    socketsPerServer: 2,
    coresPerSocket: 20,
    ramPerServerGb: 512,
    diskPerServerGb: 10000,
    targetVcpuToPCoreRatio: DEFAULT_VCPU_TO_PCORE_RATIO,
    ramPerVmGb: 4,
    diskPerVmGb: 50,
    headroomPercent: DEFAULT_HEADROOM_PERCENT,
    haReserveEnabled: DEFAULT_HA_RESERVE_ENABLED,
  };
}
