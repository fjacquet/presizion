/**
 * Pure vSAN formula functions for storage pipeline, CPU/RAM overhead, and
 * server count calculations.
 *
 * All `*Gb`/`*Gib` values from Scenario are treated as GiB (binary)
 * throughout the vSAN pipeline (VSAN-10).
 *
 * Math.ceil is applied ONLY at the server-count level (serverCountByVsanStorage).
 * Intermediate pipeline functions return unrounded numbers to preserve accuracy.
 *
 * No React or UI imports -- pure TypeScript math only.
 *
 * @module vsanFormulas
 */

import {
  FTT_POLICY_MAP,
  VSAN_METADATA_OVERHEAD_RATIO,
  VSAN_DEFAULT_SLACK_PERCENT,
  VSAN_DEFAULT_CPU_OVERHEAD_PCT,
  VSAN_DEFAULT_MEMORY_PER_HOST_GB,
} from './vsanConstants';
import type { VsanFttPolicy } from './vsanConstants';

// =====================================================================
// Storage Pipeline
// =====================================================================

/**
 * Parameters for the vSAN raw storage computation.
 */
export interface VsanStorageParams {
  /** Total usable storage demand in GiB. */
  readonly usableGib: number;
  /** FTT policy determining redundancy multiplier and min-node floor. */
  readonly fttPolicy: VsanFttPolicy;
  /** Compression/dedup factor (default 1.0 = no compression). */
  readonly compressionFactor?: number;
  /** Whether VM swap space is provisioned as thick on vSAN. */
  readonly vmSwapEnabled?: boolean;
  /** Total VM RAM in GiB -- required when vmSwapEnabled is true. */
  readonly totalVmRamGib?: number;
  /** Slack space percentage (default 25%). */
  readonly slackPercent?: number;
}

/**
 * Computes the total raw vSAN storage required (GiB) for a given demand.
 *
 * 5-step pipeline (VSAN-09 invariant: compression BEFORE FTT):
 *   1. Apply compression: effectiveUsable = usableGib / compressionFactor
 *   2. Add swap if enabled: effectiveUsable += totalVmRamGib
 *   3. Apply FTT multiplier: raw = effectiveUsable * policyMultiplier
 *   4. Add metadata: raw += usableGib * VSAN_METADATA_OVERHEAD_RATIO
 *   5. Add slack: rawWithSlack = raw / (1 - slackPercent / 100)
 *
 * Zero-guard: compressionFactor is clamped to minimum 1.0.
 * No Math.ceil -- callers handle ceiling at server count level.
 *
 * @param params - Storage computation parameters
 * @returns Total raw storage required in GiB (unrounded)
 */
export function computeVsanStorageRaw(params: VsanStorageParams): number {
  const {
    usableGib,
    fttPolicy,
    compressionFactor: rawCompression,
    vmSwapEnabled = false,
    totalVmRamGib = 0,
    slackPercent = VSAN_DEFAULT_SLACK_PERCENT,
  } = params;

  const policy = FTT_POLICY_MAP[fttPolicy];

  // Zero-guard: compression factor must be >= 1.0
  const factor = Math.max(rawCompression ?? 1.0, 1.0);

  // Step 1: Apply compression (compression BEFORE FTT -- VSAN-09)
  let effectiveUsable = usableGib / factor;

  // Step 2: Add VM swap if enabled
  if (vmSwapEnabled) {
    effectiveUsable += totalVmRamGib;
  }

  // Step 3: Apply FTT multiplier
  let raw = effectiveUsable * policy.multiplier;

  // Step 4: Add metadata overhead (based on original usable, not compressed)
  raw += usableGib * VSAN_METADATA_OVERHEAD_RATIO;

  // Step 5: Add slack space
  const slackFraction = 1 - slackPercent / 100;
  const rawWithSlack = raw / slackFraction;

  return rawWithSlack;
}

// =====================================================================
// CPU Overhead
// =====================================================================

/**
 * Computes the effective GHz available per node after vSAN CPU overhead.
 *
 * Formula (VSAN-06):
 *   nodeGhz * (1 - vsanCpuOverheadPercent / 100)
 *
 * @param nodeGhz                - Total GHz capacity per node
 * @param vsanCpuOverheadPercent - vSAN CPU overhead percentage (default 10%)
 * @returns Effective GHz available for VMs
 */
export function computeVsanEffectiveGhzPerNode(
  nodeGhz: number,
  vsanCpuOverheadPercent: number = VSAN_DEFAULT_CPU_OVERHEAD_PCT,
): number {
  return nodeGhz * (1 - vsanCpuOverheadPercent / 100);
}

// =====================================================================
// Memory Overhead
// =====================================================================

/**
 * Computes the effective RAM available per node after vSAN memory overhead.
 *
 * Formula (VSAN-07):
 *   max(0, ramPerNodeGb - vsanMemoryPerHostGb)
 *
 * Clamped at 0 to prevent negative values.
 *
 * @param ramPerNodeGb       - Total RAM capacity per node in GB
 * @param vsanMemoryPerHostGb - vSAN memory overhead per host in GB (default 6 GB)
 * @returns Effective RAM available for VMs in GB
 */
export function computeVsanEffectiveRamPerNode(
  ramPerNodeGb: number,
  vsanMemoryPerHostGb: number = VSAN_DEFAULT_MEMORY_PER_HOST_GB,
): number {
  return Math.max(0, ramPerNodeGb - vsanMemoryPerHostGb);
}

// =====================================================================
// Server Count by vSAN Storage
// =====================================================================

/**
 * Options for server count by vSAN storage.
 */
export interface VsanServerCountOptions {
  readonly compressionFactor?: number;
  readonly vmSwapEnabled?: boolean;
  readonly totalVmRamGib?: number;
  readonly slackPercent?: number;
}

/**
 * Computes the number of servers required when vSAN storage is the constraint.
 *
 * Uses computeVsanStorageRaw for the full storage pipeline, then divides by
 * per-node raw capacity and applies Math.ceil. The result is then enforced
 * against the FTT policy minimum node floor via Math.max.
 *
 * Zero-guard: if rawPerNodeGib <= 0, returns the policy minimum node count.
 *
 * @param usableGib    - Total usable storage demand in GiB
 * @param rawPerNodeGib - Raw storage capacity per node in GiB
 * @param fttPolicy    - FTT policy (determines multiplier and min-node floor)
 * @param options      - Optional: compression, swap, slack settings
 * @returns Number of servers required (integer, >= policy minimum)
 */
export function serverCountByVsanStorage(
  usableGib: number,
  rawPerNodeGib: number,
  fttPolicy: VsanFttPolicy,
  options?: VsanServerCountOptions,
): number {
  const { minNodes } = FTT_POLICY_MAP[fttPolicy];

  // Zero-guard: no per-node capacity means we can only return the minimum
  if (rawPerNodeGib <= 0) {
    return minNodes;
  }

  const totalRaw = computeVsanStorageRaw({
    usableGib,
    fttPolicy,
    compressionFactor: options?.compressionFactor,
    vmSwapEnabled: options?.vmSwapEnabled,
    totalVmRamGib: options?.totalVmRamGib,
    slackPercent: options?.slackPercent,
  });

  const storageCount = Math.ceil(totalRaw / rawPerNodeGib);

  // Enforce FTT policy minimum node floor
  return Math.max(storageCount, minNodes);
}
