/**
 * Capacity breakdown types for CPU, Memory, and Storage resources.
 *
 * These interfaces define the data layer for stacked capacity charts (Phase 21)
 * and PDF report tables (Phase 22).
 *
 * @module breakdown
 */

/**
 * Capacity breakdown for a single resource (CPU or Memory).
 *
 * Invariant (CAP-06): required + spare + excess === total
 * where spare = reservedMaxUtil + haReserve
 */
export interface ResourceBreakdown {
  readonly vmsRequired: number;       // demand from VMs (after growth, before overhead)
  readonly vsanConsumption: number;   // vSAN overhead contribution (0 when no vSAN)
  readonly required: number;          // vmsRequired + vsanConsumption
  readonly reservedMaxUtil: number;   // required / maxUtilPct * (1 - maxUtilPct) (CAP-05)
  readonly haReserve: number;         // one host worth of capacity (CAP-04)
  readonly spare: number;             // reservedMaxUtil + haReserve
  readonly excess: number;            // total - required - spare (can be negative)
  readonly total: number;             // finalCount * capacityPerNode
}

/**
 * Storage capacity breakdown with additional vSAN decomposition rows.
 * Extends ResourceBreakdown; all values in GiB internally (VSAN-10).
 *
 * Invariant (CAP-06): required + spare + excess === total
 * where required = rawBeforeSlack, spare = slackSpace + haReserve
 */
export interface StorageBreakdown extends ResourceBreakdown {
  readonly usableRequired: number;    // VM usable storage demand in GiB
  readonly swapOverhead: number;      // VM swap space in GiB (0 when disabled)
  readonly metadataOverhead: number;  // vSAN metadata in GiB
  readonly fttOverhead: number;       // extra copies due to FTT multiplier
  readonly rawRequired: number;       // total raw storage after full pipeline (includes slack)
  readonly slackSpace: number;        // vSAN slack reserve in GiB
}

/**
 * Complete capacity breakdown for one scenario.
 * Produced by computeVsanBreakdown().
 */
export interface VsanCapacityBreakdown {
  readonly scenarioId: string;
  readonly cpu: ResourceBreakdown;
  readonly memory: ResourceBreakdown;
  readonly storage: StorageBreakdown;
  readonly minNodesByConstraint: Record<string, number>;
}
