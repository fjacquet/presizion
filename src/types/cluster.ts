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
  readonly existingServerCount?: number;   // number of existing servers (SPECint mode)
  readonly specintPerServer?: number;       // SPECint benchmark score per existing server (SPECint mode)
  readonly cpuUtilizationPercent?: number;  // 0–100; absent means 100% (no right-sizing)
  readonly ramUtilizationPercent?: number;  // 0–100; absent means 100% (no right-sizing)
  readonly avgRamPerVmGb?: number;          // average RAM per VM (GB) — seeds Step 2 scenario defaults
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
  readonly targetSpecint?: number;          // SPECint benchmark score for target server (SPECint mode)
}
