import type { VsanFttPolicy, VsanCompressionFactor } from '../lib/sizing/vsanConstants';

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
  readonly cpuFrequencyGhz?: number;        // avg CPU clock frequency in GHz — required for GHz sizing mode
  readonly cpuModel?: string;               // display-only CPU model string extracted from import (e.g. "Xeon Gold 6526Y")
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
  /** 0 = no HA reserve, 1 = N+1 (one extra server), 2 = N+2 (two extra servers) */
  readonly haReserveCount: 0 | 1 | 2;
  readonly targetSpecint?: number;                // SPECint benchmark score for target server (SPECint mode)
  readonly targetCpuUtilizationPercent?: number;  // 1–100; display target (vCPU) or sizing driver (GHz mode)
  readonly targetRamUtilizationPercent?: number;  // 1–100; design target RAM util for new cluster
  readonly targetVmCount?: number;                // growth override: size for this VM count (scales vCPUs proportionally)
  readonly minServerCount?: number;               // pin floor: finalCount is never less than this value
  readonly targetCpuFrequencyGhz?: number;        // target server CPU clock frequency in GHz (GHz mode)

  // --- vSAN settings (Phase 18; all optional — absent = legacy sizing path, VSAN-12) ---
  readonly vsanFttPolicy?: VsanFttPolicy;              // VSAN-01 — triggers vSAN storage path when present
  readonly vsanCompressionFactor?: VsanCompressionFactor; // VSAN-08 — default 1.0 (no compression)
  readonly vsanSlackPercent?: number;                  // VSAN-05 — default 25%
  readonly vsanCpuOverheadPercent?: number;            // VSAN-06 — default 10%
  readonly vsanMemoryPerHostGb?: number;               // VSAN-07 — default 6 GB
  readonly vsanVmSwapEnabled?: boolean;                // VSAN-04 — default false (sparse swap)

  // --- Growth projections (Phase 19; all optional — default 0%, GROW-03) ---
  readonly cpuGrowthPercent?: number;        // GROW-01 — scales CPU demand by (1 + pct/100)
  readonly memoryGrowthPercent?: number;     // GROW-01 — scales memory demand by (1 + pct/100)
  readonly storageGrowthPercent?: number;    // GROW-01 — scales storage demand by (1 + pct/100)
}
