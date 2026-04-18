/**
 * The resource type that drove the final server count.
 * Whichever constraint produces the highest server count is the limiting resource.
 */
export type LimitingResource = 'cpu' | 'ram' | 'disk' | 'specint' | 'ghz';

/**
 * The computed output from a sizing calculation for a given OldCluster + Scenario pair.
 * All fields are readonly — this object is never mutated after creation (Object.freeze).
 *
 * CALC-05: finalCount = max(cpuLimitedCount, ramLimitedCount, diskLimitedCount)
 * CALC-04: finalCount = rawCount + haReserveCount (0, 1, or 2)
 * CALC-06: utilization metrics derived from finalCount
 */
export interface ScenarioResult {
  readonly cpuLimitedCount: number;
  readonly ramLimitedCount: number;
  readonly diskLimitedCount: number;
  readonly rawCount: number;
  /** Server count required by constraints alone, before HA margin */
  readonly requiredCount: number;
  readonly finalCount: number;
  readonly limitingResource: LimitingResource;
  /** Number of HA reserve servers added (0, 1, or 2) */
  readonly haReserveCount: number;
  /** True when haReserveCount > 0 */
  readonly haReserveApplied: boolean;
  readonly achievedVcpuToPCoreRatio: number;
  readonly vmsPerServer: number;
  readonly cpuUtilizationPercent: number;
  readonly ramUtilizationPercent: number;
  readonly diskUtilizationPercent: number;
  /** True when stretch-cluster doubling was applied (cluster.isStretchCluster === true) */
  readonly stretchApplied: boolean;
  /** Server count after stretch doubling + even-rounding, before HA reserve. Undefined when not applied. */
  readonly stretchPairedCount?: number;
}
