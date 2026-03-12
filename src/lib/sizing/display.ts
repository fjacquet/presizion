/**
 * Formula display string generators.
 *
 * CALC-07: Each key output displays its formula and the specific input parameters used.
 *
 * Convention (from STATE.md):
 * - Functions accept headroomPercent (user mental model), NOT headroomFactor.
 * - Conversion to multiplicative factor (1 + percent/100) is done internally here.
 * - coresPerServer is pre-computed by the caller (socketsPerServer * coresPerSocket).
 *
 * No React or UI imports — pure TypeScript string formatting only.
 */

export interface CpuFormulaParams {
  readonly totalVcpus: number
  readonly headroomPercent: number
  readonly targetVcpuToPCoreRatio: number
  readonly coresPerServer: number
}

export interface RamFormulaParams {
  readonly totalVms: number
  readonly ramPerVmGb: number
  readonly headroomPercent: number
  readonly ramPerServerGb: number
}

export interface DiskFormulaParams {
  readonly totalVms: number
  readonly diskPerVmGb: number
  readonly headroomPercent: number
  readonly diskPerServerGb: number
}

/**
 * Returns a human-readable formula string for the CPU-limited server count (CALC-01).
 * Format: ceil(totalVcpus × headroom% / ratio / coresPerServer)
 *
 * Example: "ceil(2000 × 120% / 4 / 48)"
 */
export function cpuFormulaString(params: CpuFormulaParams): string {
  const { totalVcpus, headroomPercent, targetVcpuToPCoreRatio, coresPerServer } = params
  const headroomDisplay = `${100 + headroomPercent}%`
  return `ceil(${totalVcpus} × ${headroomDisplay} / ${targetVcpuToPCoreRatio} / ${coresPerServer})`
}

/**
 * Returns a human-readable formula string for the RAM-limited server count (CALC-02).
 * Format: ceil(totalVms × ramPerVmGb × headroom% / ramPerServerGb)
 *
 * Example: "ceil(300 × 16 GB × 120% / 512 GB)"
 */
export function ramFormulaString(params: RamFormulaParams): string {
  const { totalVms, ramPerVmGb, headroomPercent, ramPerServerGb } = params
  const headroomDisplay = `${100 + headroomPercent}%`
  return `ceil(${totalVms} × ${ramPerVmGb} GB × ${headroomDisplay} / ${ramPerServerGb} GB)`
}

/**
 * Returns a human-readable formula string for the disk-limited server count (CALC-03).
 * Format: ceil(totalVms × diskPerVmGb × headroom% / diskPerServerGb)
 *
 * Example: "ceil(300 × 100 GB × 120% / 20000 GB)"
 */
export function diskFormulaString(params: DiskFormulaParams): string {
  const { totalVms, diskPerVmGb, headroomPercent, diskPerServerGb } = params
  const headroomDisplay = `${100 + headroomPercent}%`
  return `ceil(${totalVms} × ${diskPerVmGb} GB × ${headroomDisplay} / ${diskPerServerGb} GB)`
}
