/**
 * vSAN sizing constants and type definitions.
 *
 * All overhead defaults, FTT policy specifications, and compression factor
 * options are defined here. Formula functions in vsanFormulas.ts import from
 * this module -- no sizing logic lives here, only data.
 *
 * @module vsanConstants
 */

// =====================================================================
// FTT Policy Types & Map
// =====================================================================

/**
 * Supported vSAN Failures-To-Tolerate policies.
 *
 * - mirror-1/2/3: RAID-1 mirroring at FTT=1, 2, 3
 * - raid5: erasure coding FTT=1 (RAID-5)
 * - raid6: erasure coding FTT=2 (RAID-6)
 */
export type VsanFttPolicy = 'mirror-1' | 'mirror-2' | 'mirror-3' | 'raid5' | 'raid6';

/**
 * Specification for a single FTT policy.
 *
 * @property multiplier - Raw-to-usable storage multiplier (e.g. 2.0 for mirror-1)
 * @property minNodes   - Minimum host count required by this policy
 * @property label      - Human-readable label for UI display
 */
export interface FttPolicySpec {
  readonly multiplier: number;
  readonly minNodes: number;
  readonly label: string;
}

/**
 * Map of each FTT policy to its specification.
 *
 * CRITICAL: raid5 multiplier is `1 + 1/3` (exact), NOT 1.33 (truncated).
 */
export const FTT_POLICY_MAP: Readonly<Record<VsanFttPolicy, FttPolicySpec>> = {
  'mirror-1': { multiplier: 2.0, minNodes: 3, label: 'RAID-1 (FTT=1, Mirror)' },
  'mirror-2': { multiplier: 3.0, minNodes: 5, label: 'RAID-1 (FTT=2, Mirror)' },
  'mirror-3': { multiplier: 4.0, minNodes: 7, label: 'RAID-1 (FTT=3, Mirror)' },
  'raid5':    { multiplier: 1 + 1 / 3, minNodes: 4, label: 'RAID-5 (FTT=1, Erasure Coding)' },
  'raid6':    { multiplier: 1.5, minNodes: 6, label: 'RAID-6 (FTT=2, Erasure Coding)' },
} as const;

// =====================================================================
// Compression Factor
// =====================================================================

/**
 * Supported vSAN compression/deduplication factors.
 *
 * 1.0 = no compression (default), higher = more aggressive.
 */
export type VsanCompressionFactor = 1.0 | 1.3 | 1.5 | 2.0 | 3.0;

/** Human-readable labels for each compression factor. */
export const COMPRESSION_FACTOR_LABELS: Readonly<Record<VsanCompressionFactor, string>> = {
  1.0: 'None (1.0x)',
  1.3: 'Low (1.3x)',
  1.5: 'Medium (1.5x)',
  2.0: 'High (2.0x)',
  3.0: 'Very High (3.0x)',
} as const;

// =====================================================================
// Overhead Defaults
// =====================================================================

/** vSAN metadata overhead as a fraction of usable capacity (VSAN-03). */
export const VSAN_METADATA_OVERHEAD_RATIO = 0.02;

/** Default slack space percentage (VSAN-05). */
export const VSAN_DEFAULT_SLACK_PERCENT = 25;

/** Default vSAN CPU overhead percentage per host (VSAN-06). */
export const VSAN_DEFAULT_CPU_OVERHEAD_PCT = 10;

/** Default vSAN memory overhead per host in GB (VSAN-07). */
export const VSAN_DEFAULT_MEMORY_PER_HOST_GB = 6;
