// VALIDATION.md: CALC-04 (N+1 HA), CALC-05 (max constraint + limiting resource), CALC-06 (utilization metrics)
import { describe, it, expect } from 'vitest';
import type { OldCluster, Scenario } from '../../../types/cluster';
import { computeScenarioResult } from '../constraints';
import { createDefaultScenario } from '../defaults';

/** Strip vSAN props from a scenario to produce a legacy (non-vSAN) scenario for comparison. */
function stripVsanProps<T extends Partial<Scenario>>(scenario: T): Omit<T, 'vsanFttPolicy' | 'vsanMemoryPerHostGb' | 'vsanCompressionFactor' | 'vsanSlackPercent' | 'vsanCpuOverheadPercent' | 'vsanVmSwapEnabled'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude from rest
  const { vsanFttPolicy, vsanMemoryPerHostGb, vsanCompressionFactor, vsanSlackPercent, vsanCpuOverheadPercent, vsanVmSwapEnabled, ...rest } = scenario;
  return rest;
}

// CPU-limited full scenario fixture (reused across CALC-04/05/06 tests)
// OldCluster: totalVcpus=3200, totalVms=100, totalPcores=800
// Scenario: sockets=2, coresPerSocket=20 (40 pCores/server), ram=1024GB/server, disk=50000GB/server
//           ratio=4, ramPerVm=2GB, diskPerVm=10GB, safety=20% (demandFactor=1.20), haReserve=false
// Expected: cpuCount=24, ramCount=1, diskCount=1, finalCount=24, limiting='cpu'
const CPU_LIMITED_CLUSTER = { totalVcpus: 3200, totalVms: 100, totalPcores: 800 };
const CPU_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'CPU-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
};

// RAM-limited scenario fixture
// OldCluster: totalVcpus=400, totalVms=500, totalPcores=200
// cpuCount=ceil(400*1.20/4/40)=ceil(3)=3, ramCount=ceil(500*16*1.20/512)=ceil(18.75)=19
// diskCount=ceil(500*10*1.20/50000)=ceil(0.12)=1 → final=19, limiting='ram'
const RAM_LIMITED_CLUSTER = { totalVcpus: 400, totalVms: 500, totalPcores: 200 };
const RAM_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'RAM-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 10,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
};

// Disk-limited scenario fixture
// OldCluster: totalVcpus=200, totalVms=200, totalPcores=100
// cpuCount=ceil(200*1.20/4/40)=ceil(1.5)=2, ramCount=ceil(200*2*1.20/1024)=ceil(0.47)=1
// diskCount=ceil(200*500*1.20/10000)=ceil(12)=12 → final=12, limiting='disk'
const DISK_LIMITED_CLUSTER = { totalVcpus: 200, totalVms: 200, totalPcores: 100 };
const DISK_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000003',
  name: 'Disk-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 10000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 500,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
};

// =====================================================================
// New demand-factor + 2-mode dispatch (Task 3)
// =====================================================================

const baseCluster: OldCluster = {
  totalVcpus: 1000, totalPcores: 200, totalVms: 100,
  totalDiskGb: 50000, cpuUtilizationPercent: 60, ramUtilizationPercent: 60,
  cpuFrequencyGhz: 2.5, existingServerCount: 10, specintPerServer: 300,
};

describe('computeScenarioResult — unified demand factor + 2-mode dispatch', () => {
  it('applies (1+growth)(1+safety) as a single demand factor', () => {
    const s = { ...createDefaultScenario(), growthPercent: 10, safetyPercent: 20,
      targetVcpuToPCoreRatio: 4, socketsPerServer: 2, coresPerSocket: 16 };
    // vCPU mode: ceil(1000 × 1.10 × 1.20 / 4 / 32) = ceil(10.3125) = 11
    const r = computeScenarioResult(baseCluster, s, 'vcpu', 'hci');
    expect(r.cpuLimitedCount).toBe(11);
  });

  it('performance mode uses GHz by default', () => {
    // NOTE: createDefaultScenario() sets targetSpecint, which would otherwise route
    // to SPEC mode. We omit it here (exactOptionalPropertyTypes forbids `undefined`)
    // so the GHz fallback is exercised (see report).
    const { targetSpecint: _omitSpec, ...defaults } = createDefaultScenario();
    void _omitSpec;
    const s = { ...defaults, growthPercent: 0, safetyPercent: 0,
      targetCpuFrequencyGhz: 3.0, socketsPerServer: 2, coresPerSocket: 16 };
    const r = computeScenarioResult(baseCluster, s, 'performance', 'hci');
    // demandGhz = 200 × 2.5 × 0.60 = 300 ; perServer = 32 × 3.0 × 1.0 = 96 ; ceil(300/96)=4
    expect(r.cpuLimitedCount).toBe(4);
    expect(r.limitingResource).toBe('ghz');
  });

  it('performance mode uses SPEC when a SPEC override is present', () => {
    const s = { ...createDefaultScenario(), growthPercent: 0, safetyPercent: 0,
      targetSpecint: 600 };
    const r = computeScenarioResult(baseCluster, s, 'performance', 'hci');
    // ceil(10 × 300 × 1.0 / 600) = 5
    expect(r.cpuLimitedCount).toBe(5);
    expect(r.limitingResource).toBe('specint');
  });
});

describe('computeScenarioResult', () => {
  describe('CALC-05: constraint selection and limiting resource', () => {
    it('CPU-limited: finalCount=24, limitingResource=cpu', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.cpuLimitedCount).toBe(24);
      expect(result.ramLimitedCount).toBe(1);
      expect(result.diskLimitedCount).toBe(1);
      expect(result.finalCount).toBe(24);
      expect(result.limitingResource).toBe('cpu');
      expect(result.haReserveApplied).toBe(false);
    });
    it('RAM-limited: finalCount=19, limitingResource=ram', () => {
      const result = computeScenarioResult(RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO);
      expect(result.finalCount).toBe(19);
      expect(result.limitingResource).toBe('ram');
    });
    it('disk-limited: finalCount=12, limitingResource=disk', () => {
      const result = computeScenarioResult(DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO);
      expect(result.finalCount).toBe(12);
      expect(result.limitingResource).toBe('disk');
    });
  });

  describe('CALC-04: HA reserve', () => {
    it('haReserveCount=0: finalCount equals rawCount', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.finalCount).toBe(result.rawCount);
      expect(result.haReserveApplied).toBe(false);
      expect(result.haReserveCount).toBe(0);
    });
    it('haReserveCount=1 (N+1): finalCount equals rawCount + 1', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 1 as const };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.finalCount).toBe(result.rawCount + 1);
      expect(result.haReserveApplied).toBe(true);
      expect(result.haReserveCount).toBe(1);
    });
    it('haReserveCount=1: adds exactly 1 (not a percentage) to final count', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 1 as const };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.finalCount).toBe(25);
    });
    it('haReserveCount=2 (N+2): finalCount equals rawCount + 2', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 2 as const };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.finalCount).toBe(result.rawCount + 2);
      expect(result.haReserveApplied).toBe(true);
      expect(result.haReserveCount).toBe(2);
    });
    it('requiredCount equals rawCount regardless of haReserveCount', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 2 as const };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.requiredCount).toBe(result.rawCount);
      expect(result.finalCount).toBe(result.rawCount + 2);
    });
  });

  describe('CALC-06: utilization metrics', () => {
    it('achievedVcpuToPCoreRatio is correct for CPU-limited fixture', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      // 3200 / (24 * 40) ≈ 3.333...
      const expected = 3200 / (24 * 40);
      expect(Math.abs(result.achievedVcpuToPCoreRatio - expected)).toBeLessThan(0.01);
    });
    it('vmsPerServer is correct for CPU-limited fixture', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      // 100 / 24 ≈ 4.166...
      const expected = 100 / 24;
      expect(Math.abs(result.vmsPerServer - expected)).toBeLessThan(0.01);
    });
    it('cpuUtilizationPercent is in range 0–100', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.cpuUtilizationPercent).toBeGreaterThanOrEqual(0);
      expect(result.cpuUtilizationPercent).toBeLessThanOrEqual(100);
    });
    it('ramUtilizationPercent is in range 0–100', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.ramUtilizationPercent).toBeGreaterThanOrEqual(0);
      expect(result.ramUtilizationPercent).toBeLessThanOrEqual(100);
    });
    it('diskUtilizationPercent is in range 0–100', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.diskUtilizationPercent).toBeGreaterThanOrEqual(0);
      expect(result.diskUtilizationPercent).toBeLessThanOrEqual(100);
    });
  });
});

// Performance/SPECint mode fixtures
// OldCluster: existingServers=10, specintPerServer=1200, totalVms=50, totalVcpus=500, totalPcores=100
// Scenario: targetSpecint=2400, safety=20% (demandFactor=1.20)
// SPECint count: ceil(10*1200*1.20/2400) = ceil(14400/2400) = 6
// RAM count: ceil(50*2*1.20/512) = ceil(0.23) = 1; Disk count: ceil(50*10*1.20/50000) = 1
// => finalCount=6, limitingResource='specint'
const SPECINT_CLUSTER = {
  totalVcpus: 500, totalVms: 50, totalPcores: 100,
  existingServerCount: 10, specintPerServer: 1200,
};
const SPECINT_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000004',
  name: 'SPECint',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
  targetSpecint: 2400,
};

// Utilization scaling fixtures
// CPU cluster: totalVcpus=1000, cpuUtilizationPercent=60
// vcpu mode ratio is a hard cap: ceil(1000 × 1.20 / 4 / 40) = ceil(7.5) = 8 (util ignored)
const UTIL_CPU_CLUSTER = {
  totalVcpus: 1000, totalVms: 100, totalPcores: 250,
  cpuUtilizationPercent: 60,
};
const UTIL_CPU_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000005',
  name: 'Util-CPU',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 2048, diskPerServerGb: 100000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
};

// RAM cluster: totalVms=500, ramUtilizationPercent=80
// ceil(500 * 16 * (80/100) * 1.20 / 512) = ceil(15) = 15
const UTIL_RAM_CLUSTER = {
  totalVcpus: 200, totalVms: 500, totalPcores: 100,
  ramUtilizationPercent: 80,
};
const UTIL_RAM_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000006',
  name: 'Util-RAM',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 100000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 10,
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
};

describe('computeScenarioResult — performance/SPECint mode (PERF-04, PERF-05)', () => {
  it('performance mode with SPEC override: cpuLimitedCount=ceil(10×1200×1.20/2400)=6, limitingResource=specint', () => {
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'performance');
    expect(result.cpuLimitedCount).toBe(6);
    expect(result.limitingResource).toBe('specint');
    expect(result.finalCount).toBe(6);
  });
  it('sizingMode=vcpu explicit: same result as default (regression)', () => {
    const withExplicit = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, 'vcpu');
    const withDefault = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(withExplicit.finalCount).toBe(withDefault.finalCount);
    expect(withExplicit.limitingResource).toBe(withDefault.limitingResource);
    expect(withDefault.finalCount).toBe(24);
  });
  it('limitingResource=specint only when specint count exceeds ram and disk', () => {
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'performance');
    // specint count (6) > ram count (1) and disk count (1), so specint is limiting
    expect(result.limitingResource).toBe('specint');
  });
  it('performance/SPEC mode ignores cpuUtilizationPercent (utilization is vcpu-mode only)', () => {
    const clusterWithUtil = { ...SPECINT_CLUSTER, cpuUtilizationPercent: 60 };
    const result = computeScenarioResult(clusterWithUtil, SPECINT_SCENARIO, 'performance');
    // Should still use specint formula: ceil(10*1200*1.20/2400) = 6
    expect(result.cpuLimitedCount).toBe(6);
    expect(result.limitingResource).toBe('specint');
  });
});

describe('computeScenarioResult — utilization scaling (UTIL-03)', () => {
  it('cpuUtilizationPercent=60: cpuLimitedCount = ceil(1000×1.20/4/40)=8 (ratio hard cap, util ignored)', () => {
    // cpuUtilPct does NOT reduce cpuLimitedCount — ratio is a hard assignment-density cap.
    const result = computeScenarioResult(UTIL_CPU_CLUSTER, UTIL_CPU_SCENARIO, 'vcpu');
    expect(result.cpuLimitedCount).toBe(8);
  });
  it('ramUtilizationPercent=80: ramLimitedCount = ceil(500×16×0.80×1.20/512)=15', () => {
    const result = computeScenarioResult(UTIL_RAM_CLUSTER, UTIL_RAM_SCENARIO, 'vcpu');
    expect(result.ramLimitedCount).toBe(15);
  });
  it('cpuUtilizationPercent result applies cpuUtilPct factor in display only: finalCount=8, util=46.9%', () => {
    const result = computeScenarioResult(UTIL_CPU_CLUSTER, UTIL_CPU_SCENARIO, 'vcpu');
    // finalCount=8 (ratio hard cap), cpuUtil = 1000×0.60/4/(8×40)×100 = 46.875%
    expect(result.cpuUtilizationPercent).toBeCloseTo(46.9, 1);
  });
  it('ramUtilizationPercent result applies ramUtilPct factor: 80% util reduces display %', () => {
    const result = computeScenarioResult(UTIL_RAM_CLUSTER, UTIL_RAM_SCENARIO, 'vcpu');
    // ramLimitedCount=15, ramUtil% = 500×16×0.80/(15×512)×100 = 83.3%
    expect(result.ramUtilizationPercent).toBeCloseTo(83.3, 1);
  });
  it('utilization=100 on both: same result as no utilization fields (regression)', () => {
    const clusterWith100 = { ...CPU_LIMITED_CLUSTER, cpuUtilizationPercent: 100, ramUtilizationPercent: 100 };
    const withUtil = computeScenarioResult(clusterWith100, CPU_LIMITED_SCENARIO);
    const withoutUtil = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(withUtil.finalCount).toBe(withoutUtil.finalCount);
    expect(withUtil.limitingResource).toBe(withoutUtil.limitingResource);
  });
});

describe('computeScenarioResult — GHz mode (performance fallback, CALC-01-GHZ)', () => {
  // Cluster: 200 pCores, 2.4GHz, 70% util; Scenario: 40 cores/server, 3.0GHz, safety=20%
  // demandFactor=1.20; ceil(200×2.4×0.70×1.2 / (40×3.0×1.0)) = ceil(403.2/120) = ceil(3.36) = 4
  // No SPEC fields on cluster/scenario → performance mode falls back to GHz.
  const GHZ_CLUSTER = { totalVcpus: 400, totalVms: 100, totalPcores: 200, cpuUtilizationPercent: 70, cpuFrequencyGhz: 2.4 };
  const GHZ_SCENARIO = {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'GHz',
    socketsPerServer: 2, coresPerSocket: 20,
    ramPerServerGb: 1024, diskPerServerGb: 100000,
    targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
    growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
    targetCpuFrequencyGhz: 3.0,
  };

  it('performance mode with no SPEC: cpuLimitedCount uses GHz formula', () => {
    const result = computeScenarioResult(GHZ_CLUSTER, GHZ_SCENARIO, 'performance');
    expect(result.cpuLimitedCount).toBe(4);
    expect(result.limitingResource).toBe('ghz');
  });
});

describe('computeScenarioResult — disaggregated layout', () => {
  it('disaggregated: diskLimitedCount always 0', () => {
    const result = computeScenarioResult(DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO, 'vcpu', 'disaggregated');
    expect(result.diskLimitedCount).toBe(0);
  });
  it('disaggregated: limitingResource is never disk', () => {
    const result = computeScenarioResult(DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO, 'vcpu', 'disaggregated');
    expect(result.limitingResource).not.toBe('disk');
  });
  it('hci (default): disk constraint active', () => {
    const result = computeScenarioResult(DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO, 'vcpu', 'hci');
    expect(result.diskLimitedCount).toBe(12);
    expect(result.limitingResource).toBe('disk');
  });
});

// VM count drives RAM and Disk demand directly from cluster.totalVms (no override)
const VM_DEMAND_CLUSTER = { totalVcpus: 1000, totalVms: 100, totalPcores: 200 };
const VM_DEMAND_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000020',
  name: 'VM-Demand',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 5000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 100,
  growthPercent: 0, safetyPercent: 0, haReserveCount: 0 as const,
};

describe('VM count drives RAM and Disk demand from cluster.totalVms', () => {
  it('RAM-limited uses totalVms=100 → ramLimitedCount=4', () => {
    // ceil(100 * 16 / 512) = ceil(3.125) = 4
    const result = computeScenarioResult(VM_DEMAND_CLUSTER, VM_DEMAND_SCENARIO);
    expect(result.ramLimitedCount).toBe(4);
  });
  it('Disk-limited uses totalVms=100 → diskLimitedCount=2', () => {
    // ceil(100 * 100 / 5000) = ceil(2) = 2
    const result = computeScenarioResult(VM_DEMAND_CLUSTER, VM_DEMAND_SCENARIO);
    expect(result.diskLimitedCount).toBe(2);
  });
});

describe('computeScenarioResult — minServerCount pin floor', () => {
  it('minServerCount > computed: finalCount = minServerCount', () => {
    const pinnedScenario = { ...CPU_LIMITED_SCENARIO, minServerCount: 100 };
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, pinnedScenario);
    expect(result.finalCount).toBe(100);
  });
  it('minServerCount < computed: finalCount unaffected', () => {
    const pinnedScenario = { ...CPU_LIMITED_SCENARIO, minServerCount: 1 };
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, pinnedScenario);
    expect(result.finalCount).toBe(24); // CPU-limited count wins
  });
});

describe('demand factor (growth × safety)', () => {
  it('growthPercent increases cpuLimitedCount: ceil(1000×1.20/4/40)=8 vs ceil(1000/4/40)=7', () => {
    const cluster = { totalVcpus: 1000, totalVms: 10, totalPcores: 250 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g01',
      name: 'CPU-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 10000, diskPerServerGb: 100000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
      growthPercent: 20, safetyPercent: 0, haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.cpuLimitedCount).toBe(8);

    const noGrowth = { ...scenario, growthPercent: 0 };
    const noGrowthResult = computeScenarioResult(cluster, noGrowth);
    expect(noGrowthResult.cpuLimitedCount).toBe(7);
  });

  it('growth and safety compound: (1+growth)(1+safety)', () => {
    // ceil(1000 × 1.20 × 1.20 / 4 / 40) = ceil(9) = 9
    const cluster = { totalVcpus: 1000, totalVms: 10, totalPcores: 250 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g02',
      name: 'Compound',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 10000, diskPerServerGb: 100000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
      growthPercent: 20, safetyPercent: 20, haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.cpuLimitedCount).toBe(9);
  });

  it('absent growth/safety fields treated as 0 demand', () => {
    const cluster = { totalVcpus: 1000, totalVms: 100, totalPcores: 250 };
    const baseScenario = {
      id: '00000000-0000-0000-0000-000000000g05',
      name: 'No-Demand',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 512, diskPerServerGb: 10000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 8, diskPerVmGb: 50,
      haReserveCount: 0 as const,
    } as unknown as Scenario;
    const zeroDemand = { ...baseScenario, growthPercent: 0, safetyPercent: 0 };
    const absentResult = computeScenarioResult(cluster, baseScenario);
    const zeroResult = computeScenarioResult(cluster, zeroDemand);
    expect(absentResult.cpuLimitedCount).toBe(zeroResult.cpuLimitedCount);
    expect(absentResult.ramLimitedCount).toBe(zeroResult.ramLimitedCount);
    expect(absentResult.diskLimitedCount).toBe(zeroResult.diskLimitedCount);
    expect(absentResult.finalCount).toBe(zeroResult.finalCount);
  });

  it('existing CPU-limited fixture produces unchanged results (regression guard)', () => {
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(result.cpuLimitedCount).toBe(24);
    expect(result.ramLimitedCount).toBe(1);
    expect(result.diskLimitedCount).toBe(1);
    expect(result.finalCount).toBe(24);
    expect(result.limitingResource).toBe('cpu');
  });
});

// =====================================================================
// vSAN Integration Tests (Phase 18, Plan 02)
// =====================================================================

// Fixture cluster for vSAN integration tests
const VSAN_CLUSTER = {
  totalVcpus: 800,
  totalPcores: 200,
  totalVms: 200,
  cpuFrequencyGhz: 2.4,
  cpuUtilizationPercent: 70,
};

// Fixture scenario with vSAN enabled (mirror-1, 1.5x compression, 25% slack)
const VSAN_SCENARIO = {
  id: '00000000-0000-0000-0000-0000000000a1',
  name: 'vSAN Test',
  socketsPerServer: 2,
  coresPerSocket: 20,
  ramPerServerGb: 512,
  diskPerServerGb: 10000, // 10 TiB raw per node
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 8,
  diskPerVmGb: 50, // 50 GiB usable per VM
  growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
  vsanFttPolicy: 'mirror-1' as const,
  vsanCompressionFactor: 1.5 as const,
  vsanSlackPercent: 25,
  vsanCpuOverheadPercent: 10,
  vsanMemoryPerHostGb: 6,
  vsanVmSwapEnabled: false,
};

describe('computeScenarioResult — vSAN integration (Phase 18)', () => {
  it('vSAN storage path: mirror-1 with 200 VMs, 50 GiB/VM, 1.5x compression → diskLimitedCount=3 (min-node floor)', () => {
    // 200 VMs × 50 GiB = 10000 GiB usable
    // Step 1: effectiveUsable = 10000 / 1.5 = 6666.667
    // Step 3: raw = 6666.667 × 2.0 = 13333.333
    // Step 4: metadata = 10000 × 0.02 = 200 → raw = 13533.333
    // Step 5: rawWithSlack = 13533.333 / 0.75 = 18044.444
    // serverCount = ceil(18044.444 / 10000) = 2; mirror-1 minNodes = 3 → max(2, 3) = 3
    const result = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO);
    expect(result.diskLimitedCount).toBe(3);
  });

  it('legacy regression: WITHOUT vsanFttPolicy produces identical results to legacy behavior (VSAN-12)', () => {
    const legacyScenario = {
      id: '00000000-0000-0000-0000-0000000000a2',
      name: 'Legacy Test',
      socketsPerServer: 2,
      coresPerSocket: 20,
      ramPerServerGb: 512,
      diskPerServerGb: 10000,
      targetVcpuToPCoreRatio: 4,
      ramPerVmGb: 8,
      diskPerVmGb: 50,
      growthPercent: 0, safetyPercent: 20, haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(VSAN_CLUSTER, legacyScenario);
    // Legacy: ceil(200 × 50 × 1.20 / 10000) = ceil(1.2) = 2
    expect(result.diskLimitedCount).toBe(2);
    // CPU count: ceil(800 × 1.20 / 4 / 40) = ceil(6) = 6
    expect(result.cpuLimitedCount).toBe(6);
    // RAM count: ceil(200 × 8 × 1.20 / 512) = ceil(3.75) = 4
    expect(result.ramLimitedCount).toBe(4);
    expect(result.finalCount).toBe(6);
    expect(result.limitingResource).toBe('cpu');
  });

  it('mirror-2 on tiny cluster (3 VMs): diskLimitedCount >= 5 (min-node floor for mirror-2)', () => {
    const tinyScenario = {
      ...VSAN_SCENARIO,
      id: '00000000-0000-0000-0000-0000000000a3',
      vsanFttPolicy: 'mirror-2' as const,
    };
    const tinyCluster = { ...VSAN_CLUSTER, totalVms: 3, totalVcpus: 12, totalPcores: 6 };
    const result = computeScenarioResult(tinyCluster, tinyScenario);
    expect(result.diskLimitedCount).toBeGreaterThanOrEqual(5);
    expect(result.diskLimitedCount).toBe(5);
  });

  it('vsanMemoryPerHostGb=6: effective RAM per server is 506 GB (deducted from 512)', () => {
    const result = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO);
    // RAM demand: 200 × 8 × 1.20 = 1920 GiB; effective RAM per server: 512 - 6 = 506
    // ramLimitedCount = ceil(1920 / 506) = ceil(3.794) = 4
    expect(result.ramLimitedCount).toBe(4);

    const highRamScenario = {
      ...VSAN_SCENARIO,
      id: '00000000-0000-0000-0000-0000000000a4',
      ramPerVmGb: 64, // 200 × 64 × 1.2 = 15360 demand
    };
    const vsanResult = computeScenarioResult(VSAN_CLUSTER, highRamScenario);
    // vSAN: ceil(15360 / 506) = ceil(30.355) = 31
    expect(vsanResult.ramLimitedCount).toBe(31);

    const legacyHighRamScenario = stripVsanProps(highRamScenario);
    const legacyResult = computeScenarioResult(VSAN_CLUSTER, legacyHighRamScenario);
    // Legacy: ceil(15360 / 512) = ceil(30.0) = 30
    expect(legacyResult.ramLimitedCount).toBe(30);
    expect(vsanResult.ramLimitedCount).toBeGreaterThan(legacyResult.ramLimitedCount);
  });

  it('vsanCpuOverheadPercent=10 in performance/GHz mode: CPU-limited count higher than without vSAN overhead', () => {
    const ghzVsanScenario = {
      ...VSAN_SCENARIO,
      id: '00000000-0000-0000-0000-0000000000a5',
      coresPerSocket: 10,
      targetCpuFrequencyGhz: 3.0,
    };
    // Demand: 200 × 2.4 × 0.70 × 1.2 = 403.2 GHz
    // vSAN: effectiveFreq = 3.0 × 0.90 = 2.7; capacity = 20 × 2.7 = 54 per node
    // ceil(403.2 / 54) = ceil(7.467) = 8
    const vsanResult = computeScenarioResult(VSAN_CLUSTER, ghzVsanScenario, 'performance');
    expect(vsanResult.cpuLimitedCount).toBe(8);

    const noVsanGhzScenario = stripVsanProps(ghzVsanScenario);
    // No vSAN: capacity = 20 × 3.0 = 60 per node; ceil(403.2 / 60) = ceil(6.72) = 7
    const noVsanResult = computeScenarioResult(VSAN_CLUSTER, noVsanGhzScenario, 'performance');
    expect(noVsanResult.cpuLimitedCount).toBe(7);

    expect(vsanResult.cpuLimitedCount).toBeGreaterThan(noVsanResult.cpuLimitedCount);
  });

  it('disaggregated layout with vsanFttPolicy set: diskLimitedCount = 0 (disaggregated overrides vSAN)', () => {
    const result = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO, 'vcpu', 'disaggregated');
    expect(result.diskLimitedCount).toBe(0);
  });

  it('vsanVmSwapEnabled=true increases storage-limited count', () => {
    const swapScenario = {
      ...VSAN_SCENARIO,
      id: '00000000-0000-0000-0000-0000000000a6',
      vsanVmSwapEnabled: true,
    };
    const noSwapResult = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO);
    const swapResult = computeScenarioResult(VSAN_CLUSTER, swapScenario);
    expect(swapResult.diskLimitedCount).toBe(3);
    expect(swapResult.diskLimitedCount).toBeGreaterThanOrEqual(noSwapResult.diskLimitedCount);

    const largeCluster = { ...VSAN_CLUSTER, totalVms: 800, totalVcpus: 3200, totalPcores: 800 };
    const largeSwapScenario = { ...swapScenario, ramPerVmGb: 16 };
    const largeNoSwapScenario = { ...VSAN_SCENARIO, id: swapScenario.id, ramPerVmGb: 16 };
    const largeSwap = computeScenarioResult(largeCluster, largeSwapScenario);
    const largeNoSwap = computeScenarioResult(largeCluster, largeNoSwapScenario);
    expect(largeSwap.diskLimitedCount).toBeGreaterThan(largeNoSwap.diskLimitedCount);
  });
});

// =====================================================================
// Stretch cluster: topology-aware sizing (CALC-STRETCH)
// =====================================================================

describe('computeScenarioResult — stretch cluster', () => {
  it('isStretchCluster=true doubles finalCount and sets stretchApplied', () => {
    const stretchedCluster = { ...CPU_LIMITED_CLUSTER, isStretchCluster: true };
    const result = computeScenarioResult(stretchedCluster, CPU_LIMITED_SCENARIO);
    expect(result.rawCount).toBe(24);
    expect(result.stretchApplied).toBe(true);
    expect(result.stretchPairedCount).toBe(48);
    expect(result.finalCount).toBe(48);
  });

  it('isStretchCluster=true preserves requiredCount (pre-stretch demand)', () => {
    const stretchedCluster = { ...CPU_LIMITED_CLUSTER, isStretchCluster: true };
    const result = computeScenarioResult(stretchedCluster, CPU_LIMITED_SCENARIO);
    expect(result.requiredCount).toBe(24);
  });

  it('stretch + haReserveCount=1 adds the reserve on top of the paired count', () => {
    const stretchedCluster = { ...CPU_LIMITED_CLUSTER, isStretchCluster: true };
    const stretchedScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 1 as const };
    const result = computeScenarioResult(stretchedCluster, stretchedScenario);
    expect(result.stretchPairedCount).toBe(48);
    expect(result.finalCount).toBe(49);
    expect(result.haReserveApplied).toBe(true);
  });

  it('stretch + haReserveCount=0 gives paired count exactly (stretch IS the HA mechanism)', () => {
    const stretchedCluster = { ...CPU_LIMITED_CLUSTER, isStretchCluster: true };
    const result = computeScenarioResult(stretchedCluster, CPU_LIMITED_SCENARIO);
    expect(result.finalCount).toBe(48);
    expect(result.haReserveApplied).toBe(false);
  });

  it('stretch respects minServerCount floor when paired count is smaller', () => {
    const stretchedCluster = { ...RAM_LIMITED_CLUSTER, isStretchCluster: true };
    const pinnedScenario = { ...RAM_LIMITED_SCENARIO, minServerCount: 100 };
    const result = computeScenarioResult(stretchedCluster, pinnedScenario);
    expect(result.stretchPairedCount).toBe(38);
    expect(result.finalCount).toBe(100);
  });

  it('stretch odd rawCount still produces even pairedCount (rawCount*2 is always even)', () => {
    const stretchedCluster = { ...RAM_LIMITED_CLUSTER, isStretchCluster: true };
    const result = computeScenarioResult(stretchedCluster, RAM_LIMITED_SCENARIO);
    expect(result.rawCount).toBe(19);
    expect(result.stretchPairedCount).toBe(38);
    expect(result.stretchPairedCount! % 2).toBe(0);
  });

  it('cluster without isStretchCluster: stretchApplied=false, no doubling (regression)', () => {
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(result.stretchApplied).toBe(false);
    expect(result.stretchPairedCount).toBeUndefined();
    expect(result.finalCount).toBe(24);
  });

  it('isStretchCluster=false explicitly: same as absent (regression)', () => {
    const notStretched = { ...CPU_LIMITED_CLUSTER, isStretchCluster: false };
    const result = computeScenarioResult(notStretched, CPU_LIMITED_SCENARIO);
    expect(result.stretchApplied).toBe(false);
    expect(result.finalCount).toBe(24);
  });

  it('stretch + performance/SPEC mode: pre-stretch count from specint formula, then doubled', () => {
    const stretchedSpecintCluster = { ...SPECINT_CLUSTER, isStretchCluster: true };
    const result = computeScenarioResult(stretchedSpecintCluster, SPECINT_SCENARIO, 'performance');
    expect(result.cpuLimitedCount).toBe(6);
    expect(result.rawCount).toBe(6);
    expect(result.stretchPairedCount).toBe(12);
    expect(result.finalCount).toBe(12);
    expect(result.limitingResource).toBe('specint');
  });
});

export { CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO, DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO };
