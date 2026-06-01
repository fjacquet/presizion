/**
 * Formula display string generators.
 *
 * CALC-07: Each key output displays its formula and the specific input parameters used.
 *
 * Convention (from STATE.md):
 * - Functions accept safetyPercent (user mental model), NOT headroomFactor.
 * - Conversion to multiplicative factor (1 + percent/100) is done internally here.
 * - coresPerServer is pre-computed by the caller (socketsPerServer * coresPerSocket).
 *
 * No React or UI imports — pure TypeScript string formatting only.
 */

export interface CpuFormulaParams {
  readonly totalVcpus: number;
  readonly safetyPercent: number;
  readonly targetVcpuToPCoreRatio: number;
  readonly coresPerServer: number;
  readonly growthPercent?: number;
  /** vCPU mode excludes the safety buffer from CPU (headroom is the ratio). Default true. */
  readonly applySafety?: boolean;
}

export interface RamFormulaParams {
  readonly totalVms: number;
  readonly ramPerVmGb: number;
  readonly safetyPercent: number;
  readonly ramPerServerGb: number;
  readonly ramUtilizationPercent?: number;
  readonly growthPercent?: number;
}

export interface DiskFormulaParams {
  readonly totalVms: number;
  readonly diskPerVmGb: number;
  readonly safetyPercent: number;
  readonly diskPerServerGb: number;
  readonly growthPercent?: number;
}

export interface SpecintFormulaParams {
  readonly existingServers: number;
  readonly specintPerServer: number;
  readonly safetyPercent: number;
  readonly targetSpecint: number;
}

/**
 * Returns a human-readable formula string for the CPU-limited server count (CALC-01).
 *
 * vCPU sizing is a pure assignment-density cap: the count never depends on observed
 * CPU utilization (a parked VM still consumes its vCPU assignment). Utilization is
 * therefore NOT rendered here — doing so previously produced a formula string that
 * evaluated to a different number than the count shown beside it. Observed CPU % is
 * surfaced separately as a result output metric (CALC-06), not inside this formula.
 *
 * Format: ceil(totalVcpus × headroom% [× +growth% growth] / ratio / coresPerServer)
 * Example: "ceil(2000 × 120% / 4 / 48)"
 */
export function cpuFormulaString(params: CpuFormulaParams): string {
  const {
    totalVcpus,
    safetyPercent,
    targetVcpuToPCoreRatio,
    coresPerServer,
    growthPercent,
    applySafety = true,
  } = params;
  const growthSuffix = (growthPercent ?? 0) !== 0 ? ` × +${growthPercent}% growth` : '';
  // vCPU mode: no safety multiplier — the vCPU:pCore ratio is the CPU headroom.
  const headroomPrefix = applySafety ? ` × ${100 + safetyPercent}%` : '';
  return `ceil(${totalVcpus}${headroomPrefix}${growthSuffix} / ${targetVcpuToPCoreRatio} / ${coresPerServer})`;
}

/**
 * Returns a human-readable formula string for the RAM-limited server count (CALC-02).
 * When ramUtilizationPercent is provided and not 100, includes utilization factor.
 *
 * Format without utilization: ceil(totalVms × ramPerVmGb GB × headroom% / ramPerServerGb GB)
 * Format with utilization:    ceil(totalVms × utilPct% × ramPerVmGb GB × headroom% / ramPerServerGb GB)
 *
 * Example (no util): "ceil(300 × 16 GB × 120% / 512 GB)"
 * Example (with util): "ceil(300 × 80% × 16 GB × 120% / 512 GB)"
 */
export function ramFormulaString(params: RamFormulaParams): string {
  const {
    totalVms,
    ramPerVmGb,
    safetyPercent,
    ramPerServerGb,
    ramUtilizationPercent,
    growthPercent,
  } = params;
  const headroomDisplay = `${100 + safetyPercent}%`;
  const growthSuffix = (growthPercent ?? 0) !== 0 ? ` × +${growthPercent}% growth` : '';
  if (ramUtilizationPercent !== undefined && ramUtilizationPercent !== 100) {
    return `ceil(${totalVms} × ${ramUtilizationPercent}% × ${ramPerVmGb} GB × ${headroomDisplay}${growthSuffix} / ${ramPerServerGb} GB)`;
  }
  return `ceil(${totalVms} × ${ramPerVmGb} GB × ${headroomDisplay}${growthSuffix} / ${ramPerServerGb} GB)`;
}

/**
 * Returns a human-readable formula string for the disk-limited server count (CALC-03).
 * Format: ceil(totalVms × diskPerVmGb × headroom% / diskPerServerGb)
 *
 * Example: "ceil(300 × 100 GB × 120% / 20000 GB)"
 */
export function diskFormulaString(params: DiskFormulaParams): string {
  const { totalVms, diskPerVmGb, safetyPercent, diskPerServerGb, growthPercent } = params;
  const headroomDisplay = `${100 + safetyPercent}%`;
  const growthSuffix = (growthPercent ?? 0) !== 0 ? ` × +${growthPercent}% growth` : '';
  return `ceil(${totalVms} × ${diskPerVmGb} GB × ${headroomDisplay}${growthSuffix} / ${diskPerServerGb} GB)`;
}

/**
 * Returns a human-readable formula string for the SPECrate2017_int_base-limited server count.
 * Format: ceil(existingServers servers × specintPerServer SPECrate2017_int_base × headroomFactor / targetSpecint SPECrate2017_int_base)
 *
 * Example: "ceil(10 servers × 337 SPECrate2017_int_base × 1.20 / 450 SPECrate2017_int_base)"
 */
export function specintFormulaString(params: SpecintFormulaParams): string {
  const { existingServers, specintPerServer, safetyPercent, targetSpecint } = params;
  const headroomFactor = (1 + safetyPercent / 100).toFixed(2);
  return `ceil(${existingServers} servers × ${specintPerServer} SPECrate2017_int_base × ${headroomFactor} / ${targetSpecint} SPECrate2017_int_base)`;
}
