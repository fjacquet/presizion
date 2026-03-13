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
  readonly cpuUtilizationPercent?: number
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

export interface SpecintFormulaParams {
  readonly existingServers: number
  readonly specintPerServer: number
  readonly headroomPercent: number
  readonly targetSpecint: number
}

/**
 * Returns a human-readable formula string for the CPU-limited server count (CALC-01).
 * When cpuUtilizationPercent is provided and not 100, includes utilization factor.
 *
 * Format without utilization: ceil(totalVcpus × headroom% / ratio / coresPerServer)
 * Format with utilization:    ceil(totalVcpus × utilPct% × headroom% / ratio / coresPerServer)
 *
 * Example (no util): "ceil(2000 × 120% / 4 / 48)"
 * Example (with util): "ceil(2000 × 70% × 120% / 4 / 48)"
 */
export function cpuFormulaString(params: CpuFormulaParams): string {
  const { totalVcpus, headroomPercent, targetVcpuToPCoreRatio, coresPerServer, cpuUtilizationPercent } = params
  const headroomDisplay = `${100 + headroomPercent}%`
  if (cpuUtilizationPercent !== undefined && cpuUtilizationPercent !== 100) {
    return `ceil(${totalVcpus} × ${cpuUtilizationPercent}% × ${headroomDisplay} / ${targetVcpuToPCoreRatio} / ${coresPerServer})`
  }
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

/**
 * Returns a human-readable formula string for the SPECrate2017_int_base-limited server count.
 * Format: ceil(existingServers servers × specintPerServer SPECrate2017_int_base × headroomFactor / targetSpecint SPECrate2017_int_base)
 *
 * Example: "ceil(10 servers × 337 SPECrate2017_int_base × 1.20 / 450 SPECrate2017_int_base)"
 */
export function specintFormulaString(params: SpecintFormulaParams): string {
  const { existingServers, specintPerServer, headroomPercent, targetSpecint } = params
  const headroomFactor = (1 + headroomPercent / 100).toFixed(2)
  return `ceil(${existingServers} servers × ${specintPerServer} SPECrate2017_int_base × ${headroomFactor} / ${targetSpecint} SPECrate2017_int_base)`
}
