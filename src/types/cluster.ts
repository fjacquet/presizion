/**
 * Represents the existing cluster being replaced.
 * All fields reflect metrics gathered from the current environment.
 */
export interface OldCluster {
  readonly totalVcpus: number;
  readonly totalPcores: number;
  readonly totalVms: number;
  readonly totalDiskGb?: number;
  readonly socketsPerServer?: number;
  readonly coresPerSocket?: number;
  readonly ramPerServerGb?: number;
}

/**
 * Represents a target server configuration and sizing assumptions
 * used to compute how many new servers are required.
 */
export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly socketsPerServer: number;
  readonly coresPerSocket: number;
  readonly ramPerServerGb: number;
  readonly diskPerServerGb: number;
  readonly targetVcpuToPCoreRatio: number;
  readonly ramPerVmGb: number;
  readonly diskPerVmGb: number;
  readonly headroomPercent: number;
  readonly haReserveEnabled: boolean;
}
