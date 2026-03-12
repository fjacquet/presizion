/**
 * The resource type that drove the final server count.
 * Whichever constraint produces the highest server count is the limiting resource.
 */
export type LimitingResource = 'cpu' | 'ram' | 'disk';

/**
 * The computed output from a sizing calculation for a given OldCluster + Scenario pair.
 * All fields are readonly — this object is never mutated after creation (Object.freeze).
 *
 * CALC-05: finalCount = max(cpuLimitedCount, ramLimitedCount, diskLimitedCount)
 * CALC-04: if haReserveEnabled, finalCount = rawCount + 1
 * CALC-06: utilization metrics derived from finalCount
 */
export interface ScenarioResult {
  readonly cpuLimitedCount: number;
  readonly ramLimitedCount: number;
  readonly diskLimitedCount: number;
  readonly rawCount: number;
  readonly finalCount: number;
  readonly limitingResource: LimitingResource;
  readonly haReserveApplied: boolean;
  readonly achievedVcpuToPCoreRatio: number;
  readonly vmsPerServer: number;
  readonly cpuUtilizationPercent: number;
  readonly ramUtilizationPercent: number;
  readonly diskUtilizationPercent: number;
}
