/**
 * TDD tests for computeVsanBreakdown.
 *
 * Every test asserts the CAP-06 invariant:
 *   required + spare + excess === total (within floating-point tolerance)
 */
import { describe, it, expect } from 'vitest';
import type { OldCluster, Scenario } from '../../../types/cluster';
import type { ScenarioResult } from '../../../types/results';
import type { VsanCapacityBreakdown, ResourceBreakdown, StorageBreakdown } from '../../../types/breakdown';
import { computeVsanBreakdown } from '../vsanBreakdown';

const TOLERANCE = 0.000001;

/** Helper to assert the CAP-06 invariant on a ResourceBreakdown */
function assertInvariant(bd: ResourceBreakdown, label: string): void {
  expect(bd.required + bd.spare + bd.excess).toBeCloseTo(bd.total, 5);
}

/** Helper to assert the storage invariant (same as resource invariant) */
function assertStorageInvariant(bd: StorageBreakdown, label: string): void {
  expect(bd.required + bd.spare + bd.excess).toBeCloseTo(bd.total, 5);
}

// =====================================================================
// Shared test fixtures
// =====================================================================

function makeCluster(overrides: Partial<OldCluster> = {}): OldCluster {
  return {
    totalVcpus: 200,
    totalPcores: 96,
    totalVms: 100,
    totalDiskGb: 5000,
    socketsPerServer: 2,
    coresPerSocket: 24,
    ramPerServerGb: 512,
    existingServerCount: 4,
    cpuUtilizationPercent: 100,
    ramUtilizationPercent: 100,
    cpuFrequencyGhz: 2.5,
    ...overrides,
  };
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    socketsPerServer: 2,
    coresPerSocket: 24,
    ramPerServerGb: 512,
    diskPerServerGb: 10000,
    targetVcpuToPCoreRatio: 4,
    ramPerVmGb: 16,
    diskPerVmGb: 50,
    headroomPercent: 0,
    haReserveCount: 0,
    targetCpuFrequencyGhz: 2.5,
    targetCpuUtilizationPercent: 100,
    targetRamUtilizationPercent: 100,
    ...overrides,
  };
}

function makeResult(overrides: Partial<ScenarioResult> = {}): ScenarioResult {
  return {
    cpuLimitedCount: 2,
    ramLimitedCount: 2,
    diskLimitedCount: 1,
    rawCount: 2,
    requiredCount: 2,
    finalCount: 4,
    limitingResource: 'cpu',
    haReserveCount: 0,
    haReserveApplied: false,
    achievedVcpuToPCoreRatio: 1.04,
    vmsPerServer: 25,
    cpuUtilizationPercent: 50,
    ramUtilizationPercent: 50,
    diskUtilizationPercent: 12.5,
    ...overrides,
  };
}

// =====================================================================
// Test cases
// =====================================================================

describe('computeVsanBreakdown', () => {
  // ------------------------------------------------------------------
  // 1. CPU Breakdown (CAP-01) — no vSAN
  // ------------------------------------------------------------------
  it('computes CPU breakdown without vSAN (CAP-01)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario();
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // vmsRequired = 200 vCPUs * 2.5 GHz = 500 GHz
    expect(bd.cpu.vmsRequired).toBeCloseTo(500, 2);
    // No vSAN
    expect(bd.cpu.vsanConsumption).toBe(0);
    // required = 500
    expect(bd.cpu.required).toBeCloseTo(500, 2);
    // total = 4 * 48 * 2.5 = 480
    expect(bd.cpu.total).toBeCloseTo(480, 2);
    // haReserve = 48 * 2.5 = 120 (one node)
    expect(bd.cpu.haReserve).toBeCloseTo(120, 2);
    // reservedMaxUtil = 0 (100% util => no reserve)
    expect(bd.cpu.reservedMaxUtil).toBeCloseTo(0, 2);
    // spare = 0 + 120 = 120
    expect(bd.cpu.spare).toBeCloseTo(120, 2);
    // excess = 480 - 500 - 120 = -140
    expect(bd.cpu.excess).toBeCloseTo(-140, 2);

    assertInvariant(bd.cpu, 'cpu');
  });

  // ------------------------------------------------------------------
  // 2. CPU Breakdown with vSAN (CAP-01 + CAP-04)
  // ------------------------------------------------------------------
  it('computes CPU breakdown with vSAN overhead (CAP-01 + CAP-04)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({
      vsanFttPolicy: 'mirror-1',
      vsanCpuOverheadPercent: 10,
    });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // vsanConsumption = 4 * 48 * 2.5 * 0.10 = 48 GHz
    expect(bd.cpu.vsanConsumption).toBeCloseTo(48, 2);
    // required = 500 + 48 = 548
    expect(bd.cpu.required).toBeCloseTo(548, 2);

    assertInvariant(bd.cpu, 'cpu-vsan');
  });

  // ------------------------------------------------------------------
  // 3. Memory Breakdown (CAP-02) — no vSAN
  // ------------------------------------------------------------------
  it('computes Memory breakdown without vSAN (CAP-02)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario();
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // vmsRequired = 100 * 16 = 1600 GiB
    expect(bd.memory.vmsRequired).toBeCloseTo(1600, 2);
    expect(bd.memory.vsanConsumption).toBe(0);
    expect(bd.memory.required).toBeCloseTo(1600, 2);
    // total = 4 * 512 = 2048
    expect(bd.memory.total).toBeCloseTo(2048, 2);
    // haReserve = 512 (one node)
    expect(bd.memory.haReserve).toBeCloseTo(512, 2);
    // reservedMaxUtil = 0 (100% util)
    expect(bd.memory.reservedMaxUtil).toBeCloseTo(0, 2);
    // spare = 512
    expect(bd.memory.spare).toBeCloseTo(512, 2);
    // excess = 2048 - 1600 - 512 = -64
    expect(bd.memory.excess).toBeCloseTo(-64, 2);

    assertInvariant(bd.memory, 'memory');
  });

  // ------------------------------------------------------------------
  // 4. Memory Breakdown with vSAN (CAP-02)
  // ------------------------------------------------------------------
  it('computes Memory breakdown with vSAN overhead (CAP-02)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({
      vsanFttPolicy: 'mirror-1',
      vsanMemoryPerHostGb: 6,
    });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // vsanConsumption = 4 * 6 = 24 GiB
    expect(bd.memory.vsanConsumption).toBeCloseTo(24, 2);
    // required = 1600 + 24 = 1624
    expect(bd.memory.required).toBeCloseTo(1624, 2);

    assertInvariant(bd.memory, 'memory-vsan');
  });

  // ------------------------------------------------------------------
  // 5. Max Utilization Reserve (CAP-05)
  // ------------------------------------------------------------------
  it('computes reservedMaxUtil correctly (CAP-05)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({ targetCpuUtilizationPercent: 80 });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // required = 500 (same as before)
    // reservedMaxUtil = 500 / 0.80 * (1 - 0.80) = 500 / 0.80 * 0.20 = 125
    expect(bd.cpu.reservedMaxUtil).toBeCloseTo(125, 2);
    // spare = 125 + 120 = 245
    expect(bd.cpu.spare).toBeCloseTo(245, 2);

    assertInvariant(bd.cpu, 'cpu-maxutil');
  });

  // ------------------------------------------------------------------
  // 6. Storage Breakdown non-vSAN (CAP-03)
  // ------------------------------------------------------------------
  it('computes Storage breakdown without vSAN (CAP-03)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario();
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // usableRequired = 100 * 50 = 5000 GiB
    expect(bd.storage.usableRequired).toBeCloseTo(5000, 2);
    // rawRequired = 5000 (no FTT)
    expect(bd.storage.rawRequired).toBeCloseTo(5000, 2);
    // required = 5000
    expect(bd.storage.required).toBeCloseTo(5000, 2);
    // total = 4 * 10000 = 40000
    expect(bd.storage.total).toBeCloseTo(40000, 2);
    // haReserve = 40000 / 4 = 10000
    expect(bd.storage.haReserve).toBeCloseTo(10000, 2);
    // fttOverhead = 0
    expect(bd.storage.fttOverhead).toBe(0);
    // slackSpace = 0
    expect(bd.storage.slackSpace).toBe(0);
    // spare = 0 + 10000 = 10000
    expect(bd.storage.spare).toBeCloseTo(10000, 2);
    // excess = 40000 - 5000 - 10000 = 25000
    expect(bd.storage.excess).toBeCloseTo(25000, 2);

    assertInvariant(bd.storage, 'storage-non-vsan');
  });

  // ------------------------------------------------------------------
  // 7. Storage Breakdown vSAN (CAP-03)
  // ------------------------------------------------------------------
  it('computes Storage breakdown with vSAN (CAP-03)', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({
      vsanFttPolicy: 'mirror-1',
      vsanCompressionFactor: 1.0,
      vsanSlackPercent: 25,
    });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // usableRequired = 100 * 50 = 5000
    expect(bd.storage.usableRequired).toBeCloseTo(5000, 2);
    // effectiveUsable = 5000 / 1.0 = 5000
    // afterFtt = 5000 * 2.0 = 10000
    // fttOverhead = 10000 - 5000 = 5000
    expect(bd.storage.fttOverhead).toBeCloseTo(5000, 2);
    // metadata = 5000 * 0.02 = 100
    expect(bd.storage.metadataOverhead).toBeCloseTo(100, 2);
    // rawBeforeSlack = 10000 + 100 = 10100
    // rawRequired = 10100 / 0.75 = 13466.67
    expect(bd.storage.rawRequired).toBeCloseTo(13466.67, 1);
    // slackSpace = 13466.67 - 10100 = 3366.67
    expect(bd.storage.slackSpace).toBeCloseTo(3366.67, 1);
    // required = rawBeforeSlack = 10100
    expect(bd.storage.required).toBeCloseTo(10100, 2);
    // total = 40000
    expect(bd.storage.total).toBeCloseTo(40000, 2);
    // haReserve = 40000 / 4 = 10000
    expect(bd.storage.haReserve).toBeCloseTo(10000, 2);
    // spare = slackSpace + haReserve = 3366.67 + 10000 = 13366.67
    expect(bd.storage.spare).toBeCloseTo(13366.67, 1);
    // excess = 40000 - 10100 - 13366.67 = 16533.33
    expect(bd.storage.excess).toBeCloseTo(16533.33, 1);

    assertStorageInvariant(bd.storage, 'storage-vsan');
  });

  // ------------------------------------------------------------------
  // 8. Non-vSAN fallback (all vSAN fields zero)
  // ------------------------------------------------------------------
  it('produces zeroed vSAN fields for non-vSAN scenario', () => {
    const cluster = makeCluster();
    const scenario = makeScenario(); // no vsanFttPolicy
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    expect(bd.cpu.vsanConsumption).toBe(0);
    expect(bd.memory.vsanConsumption).toBe(0);
    expect(bd.storage.fttOverhead).toBe(0);
    expect(bd.storage.slackSpace).toBe(0);
    expect(bd.storage.swapOverhead).toBe(0);
    expect(bd.storage.metadataOverhead).toBe(0);

    assertInvariant(bd.cpu, 'cpu-nonvsan');
    assertInvariant(bd.memory, 'memory-nonvsan');
    assertStorageInvariant(bd.storage, 'storage-nonvsan');
  });

  // ------------------------------------------------------------------
  // 9. Disaggregated layout (storage all zeros)
  // ------------------------------------------------------------------
  it('produces zeroed storage breakdown for disaggregated layout', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({ diskPerServerGb: 0 });
    const result = makeResult({ finalCount: 4, diskLimitedCount: 0 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    expect(bd.storage.usableRequired).toBe(0);
    expect(bd.storage.required).toBe(0);
    expect(bd.storage.total).toBe(0);
    expect(bd.storage.haReserve).toBe(0);
    expect(bd.storage.spare).toBe(0);
    expect(bd.storage.excess).toBe(0);

    // invariant still holds: 0 + 0 + 0 = 0
    assertStorageInvariant(bd.storage, 'storage-disagg');
  });

  // ------------------------------------------------------------------
  // 10. minNodesByConstraint mapping
  // ------------------------------------------------------------------
  it('maps minNodesByConstraint from ScenarioResult', () => {
    const cluster = makeCluster();
    const scenario = makeScenario();
    const result = makeResult({
      cpuLimitedCount: 3,
      ramLimitedCount: 2,
      diskLimitedCount: 1,
      haReserveCount: 1,
      finalCount: 4,
      vmsPerServer: 25,
    });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    expect(bd.minNodesByConstraint.cpu).toBe(3);
    expect(bd.minNodesByConstraint.memory).toBe(2);
    expect(bd.minNodesByConstraint.storage).toBe(1);
    expect(bd.minNodesByConstraint.ftha).toBe(1);
    expect(bd.minNodesByConstraint.vms).toBe(4); // ceil(100 / 25)
  });

  // ------------------------------------------------------------------
  // 11. scenarioId is passed through
  // ------------------------------------------------------------------
  it('passes scenarioId from scenario.id', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({ id: 'my-scenario-42' });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    expect(bd.scenarioId).toBe('my-scenario-42');
  });

  // ------------------------------------------------------------------
  // 12. Memory with max util reserve (CAP-05)
  // ------------------------------------------------------------------
  it('computes memory reservedMaxUtil with targetRamUtilizationPercent < 100', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({ targetRamUtilizationPercent: 80 });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // required = 1600
    // reservedMaxUtil = 1600 / 0.80 * (1 - 0.80) = 1600 / 0.80 * 0.20 = 400
    expect(bd.memory.reservedMaxUtil).toBeCloseTo(400, 2);

    assertInvariant(bd.memory, 'memory-maxutil');
  });

  // ------------------------------------------------------------------
  // 13. Swap overhead in storage breakdown
  // ------------------------------------------------------------------
  it('includes swap overhead in vSAN storage breakdown', () => {
    const cluster = makeCluster();
    const scenario = makeScenario({
      vsanFttPolicy: 'mirror-1',
      vsanVmSwapEnabled: true,
      vsanCompressionFactor: 1.0,
      vsanSlackPercent: 25,
    });
    const result = makeResult({ finalCount: 4 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    // swapOverhead = totalVms * ramPerVmGb = 100 * 16 = 1600 GiB
    expect(bd.storage.swapOverhead).toBeCloseTo(1600, 2);
    // usableRequired = 5000
    // With swap: effectiveUsable = 5000 + 1600 = 6600 (after compression at 1.0x)
    // afterFtt = 6600 * 2.0 = 13200
    // fttOverhead = 13200 - 6600 = 6600
    // metadata = 5000 * 0.02 = 100
    // rawBeforeSlack = 13200 + 100 = 13300
    expect(bd.storage.required).toBeCloseTo(13300, 1);

    assertStorageInvariant(bd.storage, 'storage-swap');
  });

  // ------------------------------------------------------------------
  // 14. Invariant holds with extreme values (CAP-06)
  // ------------------------------------------------------------------
  it('invariant holds with very small cluster (1 node)', () => {
    const cluster = makeCluster({ totalVcpus: 10, totalVms: 5 });
    const scenario = makeScenario();
    const result = makeResult({ finalCount: 1, vmsPerServer: 5 });

    const bd = computeVsanBreakdown(cluster, scenario, result);

    assertInvariant(bd.cpu, 'cpu-small');
    assertInvariant(bd.memory, 'memory-small');
    assertStorageInvariant(bd.storage, 'storage-small');
  });
});
