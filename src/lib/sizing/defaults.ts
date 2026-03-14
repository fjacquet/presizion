import type { Scenario } from '../../types/cluster';
import {
  VSAN_DEFAULT_SLACK_PERCENT,
  VSAN_DEFAULT_CPU_OVERHEAD_PCT,
  VSAN_DEFAULT_MEMORY_PER_HOST_GB,
} from './vsanConstants';

// Re-export vSAN defaults for form component consumption (Phase 20)
export { VSAN_DEFAULT_SLACK_PERCENT, VSAN_DEFAULT_CPU_OVERHEAD_PCT, VSAN_DEFAULT_MEMORY_PER_HOST_GB };

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
 * Users may opt in to N+1 or N+2 HA reserve for additional resilience.
 * 0 = no reserve, 1 = N+1 (one extra server), 2 = N+2 (two extra servers).
 * CALC-04.
 */
export const DEFAULT_HA_RESERVE_COUNT: 0 | 1 | 2 = 0;

/**
 * Default target CPU utilization for the new cluster (100 = fill to capacity).
 * Set lower (e.g. 80) to leave steady-state headroom above the headroom growth buffer.
 */
export const DEFAULT_TARGET_CPU_UTILIZATION_PERCENT = 100;

/**
 * Default target RAM utilization for the new cluster (100 = fill to capacity).
 */
export const DEFAULT_TARGET_RAM_UTILIZATION_PERCENT = 100;

/**
 * SPECrate2017_int_base score for a Dell PowerEdge R660 with 2× Intel Xeon Gold 6526Y
 * (2 sockets × 16 cores = 32 pCores). Measured result from spec.org/cpu2017/results/
 * (res2024q1/cpu2017-20240112-40552). Replace with the actual score for the target hardware.
 */
export const DEFAULT_TARGET_SPECINT = 337;

/**
 * Returns a Scenario populated with industry-standard defaults.
 * Default server profile: Dell PowerEdge R660, 2× Intel Xeon Gold 6526Y.
 * Generates a fresh UUID for the scenario id each time it is called.
 */
export function createDefaultScenario(): Scenario {
  return {
    id: crypto.randomUUID(),
    name: 'New Scenario',
    socketsPerServer: 2,
    coresPerSocket: 16,
    ramPerServerGb: 512,
    diskPerServerGb: 10000,
    targetVcpuToPCoreRatio: DEFAULT_VCPU_TO_PCORE_RATIO,
    ramPerVmGb: 4,
    diskPerVmGb: 50,
    headroomPercent: DEFAULT_HEADROOM_PERCENT,
    haReserveCount: DEFAULT_HA_RESERVE_COUNT,
    targetSpecint: DEFAULT_TARGET_SPECINT,
  };
}
