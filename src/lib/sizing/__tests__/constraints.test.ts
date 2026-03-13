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
  headroomPercent: 20, haReserveEnabled: false,
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
  headroomPercent: 20, haReserveEnabled: false,
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
  headroomPercent: 20, haReserveEnabled: false,
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

  describe('CALC-04: N+1 HA reserve', () => {
    it('haReserveEnabled=false: finalCount equals rawCount', () => {
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
      expect(result.finalCount).toBe(result.rawCount);
      expect(result.haReserveApplied).toBe(false);
    });
    it('haReserveEnabled=true: finalCount equals rawCount + 1', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveEnabled: true };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.finalCount).toBe(result.rawCount + 1);
      expect(result.haReserveApplied).toBe(true);
    });
    it('HA adds exactly 1 (not a percentage) to final count', () => {
      const haScenario = { ...CPU_LIMITED_SCENARIO, haReserveEnabled: true };
      const result = computeScenarioResult(CPU_LIMITED_CLUSTER, haScenario);
      expect(result.finalCount).toBe(25);
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

describe('computeScenarioResult — SPECint mode (PERF-04, PERF-05)', () => {
  it.todo('sizingMode=specint: cpuLimitedCount=ceil(10×1200×1.20/2400)=6, limitingResource=specint');
  it.todo('sizingMode=vcpu explicit: same result as default (regression)');
  it.todo('limitingResource=specint only when specint count exceeds ram and disk');
  it.todo('combined: specint mode ignores cpuUtilizationPercent (utilization is vcpu-mode only)');
});

describe('computeScenarioResult — utilization scaling (UTIL-03)', () => {
  it.todo('cpuUtilizationPercent=60: cpuLimitedCount = ceil(1000×0.60×1.20/4/40)=5');
  it.todo('ramUtilizationPercent=80: ramLimitedCount = ceil(500×16×0.80×1.20/512)=15');
  it.todo('utilization=100 on both: same result as no utilization fields (regression)');
});

export { CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO, DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO };
