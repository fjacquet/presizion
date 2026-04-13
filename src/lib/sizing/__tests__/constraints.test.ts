// VALIDATION.md: CALC-04 (N+1 HA), CALC-05 (max constraint + limiting resource), CALC-06 (utilization metrics)
// Imported function will come from src/lib/sizing/constraints.ts (Plan 02)
import { describe, it, expect } from 'vitest';
import type { Scenario } from '../../../types/cluster';
import { computeScenarioResult } from '../constraints';

/** Strip vSAN props from a scenario to produce a legacy (non-vSAN) scenario for comparison. */
function stripVsanProps<T extends Partial<Scenario>>(scenario: T): Omit<T, 'vsanFttPolicy' | 'vsanMemoryPerHostGb' | 'vsanCompressionFactor' | 'vsanSlackPercent' | 'vsanCpuOverheadPercent' | 'vsanVmSwapEnabled'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude from rest
  const { vsanFttPolicy, vsanMemoryPerHostGb, vsanCompressionFactor, vsanSlackPercent, vsanCpuOverheadPercent, vsanVmSwapEnabled, ...rest } = scenario;
  return rest;
}

// CPU-limited full scenario fixture (reused across CALC-04/05/06 tests)
// OldCluster: totalVcpus=3200, totalVms=100, totalPcores=800
// Scenario: sockets=2, coresPerSocket=20 (40 pCores/server), ram=1024GB/server, disk=50000GB/server
//           ratio=4, ramPerVm=2GB, diskPerVm=10GB, headroom=20%, haReserve=false
// Expected: cpuCount=24, ramCount=1, diskCount=1, finalCount=24, limiting='cpu'
// Utilization: achieved ratio = 3200/(24*40)=3.33, vmsPerServer=100/24=4.17
const CPU_LIMITED_CLUSTER = { totalVcpus: 3200, totalVms: 100, totalPcores: 800 };
const CPU_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'CPU-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
  headroomPercent: 20, haReserveCount: 0 as const,
};

// RAM-limited scenario fixture
// OldCluster: totalVcpus=400, totalVms=500, totalPcores=200
// Scenario: sockets=2, coresPerSocket=20, ram=512GB/server, disk=50000GB/server
//           ratio=4, ramPerVm=16GB, diskPerVm=10GB, headroom=20%, haReserve=false
// cpuCount=ceil(400*1.20/4/40)=ceil(3)=3, ramCount=ceil(500*16*1.20/512)=ceil(18.75)=19
// diskCount=ceil(500*10*1.20/50000)=ceil(0.12)=1 → final=19, limiting='ram'
const RAM_LIMITED_CLUSTER = { totalVcpus: 400, totalVms: 500, totalPcores: 200 };
const RAM_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'RAM-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 10,
  headroomPercent: 20, haReserveCount: 0 as const,
};

// Disk-limited scenario fixture
// OldCluster: totalVcpus=200, totalVms=200, totalPcores=100
// Scenario: sockets=2, coresPerSocket=20, ram=1024GB/server, disk=10000GB/server
//           ratio=4, ramPerVm=2GB, diskPerVm=500GB, headroom=20%, haReserve=false
// cpuCount=ceil(200*1.20/4/40)=ceil(1.5)=2, ramCount=ceil(200*2*1.20/1024)=ceil(0.47)=1
// diskCount=ceil(200*500*1.20/10000)=ceil(12)=12 → final=12, limiting='disk'
const DISK_LIMITED_CLUSTER = { totalVcpus: 200, totalVms: 200, totalPcores: 100 };
const DISK_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000003',
  name: 'Disk-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 10000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 500,
  headroomPercent: 20, haReserveCount: 0 as const,
};

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

// SPECint mode fixtures
// OldCluster: existingServers=10, specintPerServer=1200, totalVms=50, totalVcpus=500, totalPcores=100
// Scenario: targetSpecint=2400, headroom=20%, socketsPerServer=2, coresPerSocket=20, ram=512GB, disk=50000GB, ratio=4, ramPerVm=2, diskPerVm=10
// SPECint count: ceil(10*1200*1.20/2400) = ceil(14400/2400) = 6
// RAM count: ceil(50*2*1.20/512) = ceil(120/512) = ceil(0.23) = 1
// Disk count: ceil(50*10*1.20/50000) = ceil(0.012) = 1
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
  headroomPercent: 20, haReserveCount: 0 as const,
  targetSpecint: 2400,
};

// Utilization scaling fixtures
// CPU cluster: totalVcpus=1000, cpuUtilizationPercent=60
// With ratio=4, coresPerServer=40, headroom=20%:
// ceil(1000 * (60/100) * 1.20 / 4 / 40) = ceil(4.5) = 5
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
  headroomPercent: 20, haReserveCount: 0 as const,
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
  headroomPercent: 20, haReserveCount: 0 as const,
};

describe('computeScenarioResult — SPECint mode (PERF-04, PERF-05)', () => {
  it('sizingMode=specint: cpuLimitedCount=ceil(10×1200×1.20/2400)=6, limitingResource=specint', () => {
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'specint');
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
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'specint');
    // specint count (6) > ram count (1) and disk count (1), so specint is limiting
    expect(result.limitingResource).toBe('specint');
  });
  it('combined: specint mode ignores cpuUtilizationPercent (utilization is vcpu-mode only)', () => {
    // Even with cpuUtilizationPercent set, specint mode uses the specint formula
    const clusterWithUtil = { ...SPECINT_CLUSTER, cpuUtilizationPercent: 60 };
    const result = computeScenarioResult(clusterWithUtil, SPECINT_SCENARIO, 'specint');
    // Should still use specint formula: ceil(10*1200*1.20/2400) = 6
    expect(result.cpuLimitedCount).toBe(6);
    expect(result.limitingResource).toBe('specint');
  });
});

describe('computeScenarioResult — utilization scaling (UTIL-03)', () => {
  it('cpuUtilizationPercent=60: cpuLimitedCount = ceil(1000×1.20/4/40)=8 (ratio hard cap, util ignored)', () => {
    // cpuUtilPct does NOT reduce cpuLimitedCount — ratio is a hard assignment-density cap.
    // ceil(1000 × 1.20 / 4 / 40) = ceil(7.5) = 8, not 5
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

describe('computeScenarioResult — aggressive mode (CALC-01-AGG)', () => {
  // Cluster: 1000 vCPUs, 60% util; Scenario: 40 cores/server, 20% headroom
  // Aggressive: ceil(1000 × 0.60 × 1.20 / 40) = ceil(18) = 18
  const AGG_CLUSTER = { totalVcpus: 1000, totalVms: 100, totalPcores: 250, cpuUtilizationPercent: 60 };
  const AGG_SCENARIO = {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Aggressive',
    socketsPerServer: 2, coresPerSocket: 20,
    ramPerServerGb: 512, diskPerServerGb: 100000,
    targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
    headroomPercent: 20, haReserveCount: 0 as const,
  };

  it('aggressive mode: cpuLimitedCount bypasses ratio — ceil(1000×0.60×1.20/40)=18', () => {
    const result = computeScenarioResult(AGG_CLUSTER, AGG_SCENARIO, 'aggressive');
    expect(result.cpuLimitedCount).toBe(18);
    expect(result.limitingResource).toBe('cpu');
  });
  it('aggressive mode: same cluster in vcpu mode gives higher count (ratio hard cap)', () => {
    const aggResult = computeScenarioResult(AGG_CLUSTER, AGG_SCENARIO, 'aggressive');
    const vcpuResult = computeScenarioResult(AGG_CLUSTER, AGG_SCENARIO, 'vcpu');
    // Aggressive: ceil(1000×0.60×1.20/40)=18; vCPU: ceil(1000×1.20/4/40)=8 → RAM/Disk might win
    expect(aggResult.cpuLimitedCount).toBeGreaterThan(vcpuResult.cpuLimitedCount);
  });
});

describe('computeScenarioResult — GHz mode (CALC-01-GHZ)', () => {
  // Cluster: 200 pCores, 2.4GHz, 70% util; Scenario: 40 cores/server, 3.0GHz, 100% target, 20% headroom
  // ceil(200×2.4×0.70×1.2 / (40×3.0×1.0)) = ceil(403.2/120) = ceil(3.36) = 4
  const GHZ_CLUSTER = { totalVcpus: 400, totalVms: 100, totalPcores: 200, cpuUtilizationPercent: 70, cpuFrequencyGhz: 2.4 };
  const GHZ_SCENARIO = {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'GHz',
    socketsPerServer: 2, coresPerSocket: 20,
    ramPerServerGb: 1024, diskPerServerGb: 100000,
    targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
    headroomPercent: 20, haReserveCount: 0 as const,
    targetCpuFrequencyGhz: 3.0,
  };

  it('ghz mode: cpuLimitedCount uses GHz formula', () => {
    const result = computeScenarioResult(GHZ_CLUSTER, GHZ_SCENARIO, 'ghz');
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

describe('computeScenarioResult — targetVmCount growth override', () => {
  // CPU_LIMITED_CLUSTER: totalVms=100, totalVcpus=3200
  // targetVmCount=200: effectiveVcpus = 3200 × (200/100) = 6400; cpuLimitedCount = ceil(6400×1.2/4/40) = 48
  it('targetVmCount doubles vCPUs proportionally → double cpuLimitedCount', () => {
    const growthScenario = { ...CPU_LIMITED_SCENARIO, targetVmCount: 200 };
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, growthScenario);
    expect(result.cpuLimitedCount).toBe(48);
  });
  it('targetVmCount doubles RAM demand → doubles ramLimitedCount', () => {
    const growthScenario = { ...RAM_LIMITED_SCENARIO, targetVmCount: 1000 };
    const result = computeScenarioResult(RAM_LIMITED_CLUSTER, growthScenario);
    // RAM_LIMITED: 500 VMs × 16GB × 1.20 / 512 = 19; doubled → 38
    expect(result.ramLimitedCount).toBe(38);
  });
});

// FIX-VM-01/02 fixtures: VM override propagation to RAM and Disk
const VM_OVERRIDE_CLUSTER = { totalVcpus: 1000, totalVms: 100, totalPcores: 200 };
const VM_OVERRIDE_SCENARIO_BASE = {
  id: '00000000-0000-0000-0000-000000000020',
  name: 'VM-Override',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 5000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 100,
  headroomPercent: 0, haReserveCount: 0 as const,
};

describe('FIX-VM-01/02: targetVmCount override propagates to RAM and Disk', () => {
  it('FIX-VM-01: RAM-limited uses targetVmCount=200 → ramLimitedCount=7', () => {
    // ceil(200 * 16 / 512) = ceil(6.25) = 7
    const scenario = { ...VM_OVERRIDE_SCENARIO_BASE, targetVmCount: 200 };
    const result = computeScenarioResult(VM_OVERRIDE_CLUSTER, scenario);
    expect(result.ramLimitedCount).toBe(7);
  });

  it('FIX-VM-01: RAM-limited without override uses totalVms=100 → ramLimitedCount=4', () => {
    // ceil(100 * 16 / 512) = ceil(3.125) = 4
    const result = computeScenarioResult(VM_OVERRIDE_CLUSTER, VM_OVERRIDE_SCENARIO_BASE);
    expect(result.ramLimitedCount).toBe(4);
  });

  it('FIX-VM-02: Disk-limited uses targetVmCount=200 → diskLimitedCount=4', () => {
    // ceil(200 * 100 / 5000) = ceil(4) = 4
    const scenario = { ...VM_OVERRIDE_SCENARIO_BASE, targetVmCount: 200 };
    const result = computeScenarioResult(VM_OVERRIDE_CLUSTER, scenario);
    expect(result.diskLimitedCount).toBe(4);
  });

  it('FIX-VM-02: Disk-limited without override uses totalVms=100 → diskLimitedCount=2', () => {
    // ceil(100 * 100 / 5000) = ceil(2) = 2
    const result = computeScenarioResult(VM_OVERRIDE_CLUSTER, VM_OVERRIDE_SCENARIO_BASE);
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
  headroomPercent: 20,
  haReserveCount: 0 as const,
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
    // Step 2: no swap
    // Step 3: raw = 6666.667 × 2.0 = 13333.333
    // Step 4: metadata = 10000 × 0.02 = 200 → raw = 13533.333
    // Step 5: rawWithSlack = 13533.333 / 0.75 = 18044.444
    // serverCount = ceil(18044.444 / 10000) = 2
    // mirror-1 minNodes = 3 → max(2, 3) = 3
    const result = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO);
    expect(result.diskLimitedCount).toBe(3);
  });

  it('legacy regression: WITHOUT vsanFttPolicy produces identical results to legacy behavior (VSAN-12)', () => {
    // Same fixture but without any vSAN fields → legacy path
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
      headroomPercent: 20,
      haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(VSAN_CLUSTER, legacyScenario);
    // Legacy: ceil(200 × 50 × 1.20 / 10000) = ceil(12000/10000) = ceil(1.2) = 2
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
    // 3 VMs × 50 GiB = 150 GiB usable
    // Step 1: 150/1.5 = 100; Step 3: 100×3.0=300; Step 4: 300+3=303; Step 5: 303/0.75=404
    // ceil(404/10000) = 1; minNodes for mirror-2 = 5 → max(1, 5) = 5
    expect(result.diskLimitedCount).toBeGreaterThanOrEqual(5);
    expect(result.diskLimitedCount).toBe(5);
  });

  it('vsanMemoryPerHostGb=6: effective RAM per server is 506 GB (deducted from 512)', () => {
    const result = computeScenarioResult(VSAN_CLUSTER, VSAN_SCENARIO);
    // RAM demand: 200 × 8 × 1.20 = 1920 GiB
    // Effective RAM per server: 512 - 6 = 506
    // ramLimitedCount = ceil(1920 / 506) = ceil(3.794) = 4
    expect(result.ramLimitedCount).toBe(4);

    // Verify it differs from a non-vSAN scenario with ramPerServerGb=506 to confirm the deduction path is used
    // (The count is 4 either way for this fixture, but the formula goes through the vSAN branch)
    // We verify by checking a scenario where 6 GB matters: large VM RAM
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
    // vSAN RAM deduction produces 1 more server
    expect(vsanResult.ramLimitedCount).toBeGreaterThan(legacyResult.ramLimitedCount);
  });

  it('vsanCpuOverheadPercent=10 in GHz mode: CPU-limited count higher than without vSAN overhead', () => {
    // Use smaller coresPerSocket=10 (20 cores/server) to make the difference visible
    const ghzVsanScenario = {
      ...VSAN_SCENARIO,
      id: '00000000-0000-0000-0000-0000000000a5',
      coresPerSocket: 10,
      targetCpuFrequencyGhz: 3.0,
    };
    // Demand: 200 × 2.4 × 0.70 × 1.2 = 403.2 GHz
    // vSAN: effectiveFreq = 3.0 × 0.90 = 2.7; capacity = 20 × 2.7 = 54 per node
    // ceil(403.2 / 54) = ceil(7.467) = 8
    const vsanResult = computeScenarioResult(VSAN_CLUSTER, ghzVsanScenario, 'ghz');
    expect(vsanResult.cpuLimitedCount).toBe(8);

    const noVsanGhzScenario = stripVsanProps(ghzVsanScenario);
    // No vSAN: capacity = 20 × 3.0 = 60 per node
    // ceil(403.2 / 60) = ceil(6.72) = 7
    const noVsanResult = computeScenarioResult(VSAN_CLUSTER, noVsanGhzScenario, 'ghz');
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
    // With swap: effectiveUsable += totalVmRamGib = 200 × 8 = 1600 extra GiB
    // Step 1: 10000/1.5 = 6666.667
    // Step 2: 6666.667 + 1600 = 8266.667
    // Step 3: 8266.667 × 2.0 = 16533.333
    // Step 4: 16533.333 + 200 = 16733.333
    // Step 5: 16733.333 / 0.75 = 22311.111
    // ceil(22311.111 / 10000) = 3
    // min-node floor = 3 → max(3, 3) = 3
    expect(swapResult.diskLimitedCount).toBe(3);
    // Without swap was 3 (from min-node floor). With swap, math gives 3 as well (ceil=3 >= minNodes=3)
    // But the raw storage IS higher — verify with larger values to see the difference
    expect(swapResult.diskLimitedCount).toBeGreaterThanOrEqual(noSwapResult.diskLimitedCount);

    // Use a scenario with more VMs where the swap actually pushes over a boundary
    const largeCluster = { ...VSAN_CLUSTER, totalVms: 800, totalVcpus: 3200, totalPcores: 800 };
    const largeSwapScenario = { ...swapScenario, ramPerVmGb: 16 };
    const largeNoSwapScenario = { ...VSAN_SCENARIO, id: swapScenario.id, ramPerVmGb: 16 };
    const largeSwap = computeScenarioResult(largeCluster, largeSwapScenario);
    const largeNoSwap = computeScenarioResult(largeCluster, largeNoSwapScenario);
    // 800 VMs × 50 GiB = 40000 usable; ramGib = 800×16 = 12800
    // No swap: 40000/1.5 = 26666.67; 26666.67*2=53333.33; +800=54133.33; /0.75=72177.78; ceil/10000=8; max(8,3)=8
    // With swap: 26666.67+12800 = 39466.67; 39466.67*2=78933.33; +800=79733.33; /0.75=106311.11; ceil/10000=11; max(11,3)=11
    expect(largeSwap.diskLimitedCount).toBeGreaterThan(largeNoSwap.diskLimitedCount);
  });
});

// =====================================================================
// Growth Factor Wiring (Phase 19, Plan 01)
// =====================================================================

describe('Growth factor wiring (Phase 19)', () => {
  it('cpuGrowthPercent=20 increases cpuLimitedCount from 7 to 8', () => {
    // totalVcpus=1000, headroom=0%, ratio=4, coresPerServer=40
    // Without growth: ceil(1000/4/40) = ceil(6.25) = 7
    // With 20% growth: ceil(1200/4/40) = ceil(7.5) = 8
    const cluster = { totalVcpus: 1000, totalVms: 10, totalPcores: 250 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g01',
      name: 'CPU-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 10000, diskPerServerGb: 100000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
      headroomPercent: 0, haReserveCount: 0 as const,
      cpuGrowthPercent: 20,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.cpuLimitedCount).toBe(8);

    // Without growth: should be 7
    const noGrowth = { ...scenario, cpuGrowthPercent: 0, memoryGrowthPercent: 0, storageGrowthPercent: 0 };
    const noGrowthResult = computeScenarioResult(cluster, noGrowth);
    expect(noGrowthResult.cpuLimitedCount).toBe(7);
  });

  it('memoryGrowthPercent=50 increases ramLimitedCount from 1 to 2', () => {
    // totalVms=100, ramPerVmGb=4, ramPerServerGb=512, headroom=0%
    // Without growth: ceil(100*4/512) = ceil(0.78125) = 1
    // With 50% growth: ramPerVm effectively 6 → ceil(100*6/512) = ceil(1.171875) = 2
    const cluster = { totalVcpus: 10, totalVms: 100, totalPcores: 5 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g02',
      name: 'RAM-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 512, diskPerServerGb: 100000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 4, diskPerVmGb: 10,
      headroomPercent: 0, haReserveCount: 0 as const,
      memoryGrowthPercent: 50,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.ramLimitedCount).toBe(2);

    // Without growth: should be 1
    const noGrowth = { ...scenario, cpuGrowthPercent: 0, memoryGrowthPercent: 0, storageGrowthPercent: 0 };
    const noGrowthResult = computeScenarioResult(cluster, noGrowth);
    expect(noGrowthResult.ramLimitedCount).toBe(1);
  });

  it('storageGrowthPercent=100 doubles diskLimitedCount in legacy path', () => {
    // totalVms=100, diskPerVmGb=50, diskPerServerGb=5000, headroom=0%
    // Without growth: ceil(100*50/5000) = ceil(1) = 1
    // With 100% growth: diskPerVm effectively 100 → ceil(100*100/5000) = ceil(2) = 2
    const cluster = { totalVcpus: 10, totalVms: 100, totalPcores: 5 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g03',
      name: 'Disk-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 10000, diskPerServerGb: 5000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 50,
      headroomPercent: 0, haReserveCount: 0 as const,
      storageGrowthPercent: 100,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.diskLimitedCount).toBe(2);

    // Without growth: should be 1
    const noGrowth = { ...scenario, cpuGrowthPercent: 0, memoryGrowthPercent: 0, storageGrowthPercent: 0 };
    const noGrowthResult = computeScenarioResult(cluster, noGrowth);
    expect(noGrowthResult.diskLimitedCount).toBe(1);
  });

  it('storageGrowthPercent=100 in vSAN path doubles usableGib demand', () => {
    // Using mirror-1, no compression (factor 1.0), no swap, 25% slack, 200 VMs, 50 GiB/VM
    // Without growth: usableGib = 200*50 = 10000
    //   raw = 10000*2.0 = 20000; meta = 10000*0.02 = 200; raw = 20200; withSlack = 20200/0.75 = 26933.33
    //   ceil(26933.33/10000) = 3; max(3, 3) = 3
    // With 100% growth: usableGib = 200*100 = 20000 (diskPerVmGb*2.0)
    //   raw = 20000*2.0 = 40000; meta = 20000*0.02 = 400; raw = 40400; withSlack = 40400/0.75 = 53866.67
    //   ceil(53866.67/10000) = 6; max(6, 3) = 6
    const cluster = { totalVcpus: 800, totalVms: 200, totalPcores: 200 };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000g04',
      name: 'vSAN-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 10000, diskPerServerGb: 10000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 8, diskPerVmGb: 50,
      headroomPercent: 0, haReserveCount: 0 as const,
      vsanFttPolicy: 'mirror-1' as const,
      vsanCompressionFactor: 1.0 as const,
      vsanSlackPercent: 25,
      vsanVmSwapEnabled: false,
      storageGrowthPercent: 100,
    };
    const result = computeScenarioResult(cluster, scenario);
    expect(result.diskLimitedCount).toBe(6);

    // Without growth: should be 3
    const noGrowth = { ...scenario, cpuGrowthPercent: 0, memoryGrowthPercent: 0, storageGrowthPercent: 0 };
    const noGrowthResult = computeScenarioResult(cluster, noGrowth);
    expect(noGrowthResult.diskLimitedCount).toBe(3);
  });

  it('absent growth fields produce same result as explicitly setting all to 0', () => {
    const cluster = { totalVcpus: 1000, totalVms: 100, totalPcores: 250 };
    const baseScenario = {
      id: '00000000-0000-0000-0000-000000000g05',
      name: 'No-Growth',
      socketsPerServer: 2, coresPerSocket: 20,
      ramPerServerGb: 512, diskPerServerGb: 10000,
      targetVcpuToPCoreRatio: 4, ramPerVmGb: 8, diskPerVmGb: 50,
      headroomPercent: 20, haReserveCount: 0 as const,
    };
    const zeroGrowth = {
      ...baseScenario,
      cpuGrowthPercent: 0,
      memoryGrowthPercent: 0,
      storageGrowthPercent: 0,
    };
    const absentResult = computeScenarioResult(cluster, baseScenario);
    const zeroResult = computeScenarioResult(cluster, zeroGrowth);
    expect(absentResult.cpuLimitedCount).toBe(zeroResult.cpuLimitedCount);
    expect(absentResult.ramLimitedCount).toBe(zeroResult.ramLimitedCount);
    expect(absentResult.diskLimitedCount).toBe(zeroResult.diskLimitedCount);
    expect(absentResult.finalCount).toBe(zeroResult.finalCount);
    expect(absentResult.limitingResource).toBe(zeroResult.limitingResource);
  });

  it('existing CPU-limited fixture produces unchanged results (regression guard)', () => {
    // This is the same CPU_LIMITED test from CALC-05 — must still pass
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(result.cpuLimitedCount).toBe(24);
    expect(result.ramLimitedCount).toBe(1);
    expect(result.diskLimitedCount).toBe(1);
    expect(result.finalCount).toBe(24);
    expect(result.limitingResource).toBe('cpu');
  });
});

export { CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO, DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO };
