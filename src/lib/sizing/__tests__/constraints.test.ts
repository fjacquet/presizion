// VALIDATION.md: CALC-04 (N+1 HA), CALC-05 (max constraint + limiting resource), CALC-06 (utilization metrics)
// Imported function will come from src/lib/sizing/constraints.ts (Plan 02)
import { describe, it, expect } from 'vitest';
import { computeScenarioResult } from '../constraints';

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

export { CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO, DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO };
