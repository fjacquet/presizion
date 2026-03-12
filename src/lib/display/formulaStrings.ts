/**
 * Formula display string functions for CALC-07.
 *
 * Each function takes the same inputs as its corresponding formula function
 * in src/lib/sizing/formulas.ts and returns a human-readable string showing
 * the formula with substituted values — used by UI components to display
 * transparent calculation logic inline.
 *
 * Output format: "ceil(<inputs>) = <result> servers"
 *
 * ZERO React imports — this is a pure TypeScript string-building module.
 */

import {
  serverCountByCpu,
  serverCountByRam,
  serverCountByDisk,
} from '../sizing/formulas';

// ─── Parameter interfaces ───────────────────────────────────────────────────

export interface CpuFormulaParams {
  /** Total vCPUs consumed by all VMs in the cluster */
  totalVcpus: number;
  /** Headroom percentage, e.g. 20 for 20% */
  headroomPercent: number;
  /** Target vCPU-to-physical-core overcommit ratio, e.g. 4 */
  targetVcpuToPCoreRatio: number;
  /** Physical cores per new target server */
  coresPerServer: number;
}

export interface RamFormulaParams {
  /** Total number of virtual machines in the cluster */
  totalVms: number;
  /** Average RAM consumed per VM (GB) */
  ramPerVmGb: number;
  /** Headroom percentage, e.g. 20 for 20% */
  headroomPercent: number;
  /** Total RAM capacity per new target server (GB) */
  ramPerServerGb: number;
}

export interface DiskFormulaParams {
  /** Total number of virtual machines in the cluster */
  totalVms: number;
  /** Average disk consumed per VM (GB) */
  diskPerVmGb: number;
  /** Headroom percentage, e.g. 20 for 20% */
  headroomPercent: number;
  /** Total disk capacity per new target server (GB) */
  diskPerServerGb: number;
}

// ─── Display functions ──────────────────────────────────────────────────────

/**
 * Returns a human-readable CPU formula string with substituted values.
 *
 * Example:
 *   getCpuFormulaString({ totalVcpus: 3200, headroomPercent: 20, targetVcpuToPCoreRatio: 4, coresPerServer: 40 })
 *   → "ceil(3200 × 1.20 / 4 / 40) = 24 servers"
 */
export function getCpuFormulaString(params: CpuFormulaParams): string {
  const { totalVcpus, headroomPercent, targetVcpuToPCoreRatio, coresPerServer } = params;
  const headroomFactor = 1 + headroomPercent / 100;
  const result = serverCountByCpu(totalVcpus, headroomFactor, targetVcpuToPCoreRatio, coresPerServer);
  return `ceil(${totalVcpus} × ${headroomFactor.toFixed(2)} / ${targetVcpuToPCoreRatio} / ${coresPerServer}) = ${result} servers`;
}

/**
 * Returns a human-readable RAM formula string with substituted values.
 *
 * Example:
 *   getRamFormulaString({ totalVms: 500, ramPerVmGb: 16, headroomPercent: 20, ramPerServerGb: 512 })
 *   → "ceil(500 × 16 × 1.20 / 512) = 19 servers"
 */
export function getRamFormulaString(params: RamFormulaParams): string {
  const { totalVms, ramPerVmGb, headroomPercent, ramPerServerGb } = params;
  const headroomFactor = 1 + headroomPercent / 100;
  const result = serverCountByRam(totalVms, ramPerVmGb, headroomFactor, ramPerServerGb);
  return `ceil(${totalVms} × ${ramPerVmGb} × ${headroomFactor.toFixed(2)} / ${ramPerServerGb}) = ${result} servers`;
}

/**
 * Returns a human-readable disk formula string with substituted values.
 *
 * Example:
 *   getDiskFormulaString({ totalVms: 200, diskPerVmGb: 500, headroomPercent: 20, diskPerServerGb: 10000 })
 *   → "ceil(200 × 500 × 1.20 / 10000) = 12 servers"
 */
export function getDiskFormulaString(params: DiskFormulaParams): string {
  const { totalVms, diskPerVmGb, headroomPercent, diskPerServerGb } = params;
  const headroomFactor = 1 + headroomPercent / 100;
  const result = serverCountByDisk(totalVms, diskPerVmGb, headroomFactor, diskPerServerGb);
  return `ceil(${totalVms} × ${diskPerVmGb} × ${headroomFactor.toFixed(2)} / ${diskPerServerGb}) = ${result} servers`;
}
