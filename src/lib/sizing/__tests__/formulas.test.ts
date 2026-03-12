// VALIDATION.md: CALC-01 (CPU-limited), CALC-02 (RAM-limited), CALC-03 (disk-limited)
// Imported functions will come from src/lib/sizing/formulas.ts (Plan 02)
import { describe, it, expect } from 'vitest';
import { serverCountByCpu, serverCountByRam, serverCountByDisk } from '../formulas';

// === Fixture constants (manually verified against formula spec) ===

// CPU-limited fixture: totalVcpus=3200, headroomFactor=1.20, ratio=4, coresPerServer=40
// Expected: ceil(3200 * 1.20 / 4 / 40) = ceil(24) = 24
const F1 = { totalVcpus: 3200, growthHeadroomFactor: 1.20, targetVcpuToPCoreRatio: 4, coresPerServer: 40, expectedCpuCount: 24 };

// RAM-limited fixture: totalVms=500, ramPerVmGb=16, headroomFactor=1.20, ramPerServerGb=512
// Expected: ceil(500 * 16 * 1.20 / 512) = ceil(9600 / 512) = ceil(18.75) = 19
const F2 = { totalVms: 500, ramPerVmGb: 16, growthHeadroomFactor: 1.20, ramPerServerGb: 512, expectedRamCount: 19 };

// Disk-limited fixture: totalVms=200, diskPerVmGb=500, headroomFactor=1.20, diskPerServerGb=10000
// Expected: ceil(200 * 500 * 1.20 / 10000) = ceil(120000 / 10000) = ceil(12) = 12
const F3 = { totalVms: 200, diskPerVmGb: 500, growthHeadroomFactor: 1.20, diskPerServerGb: 10000, expectedDiskCount: 12 };

// Boundary fixture (floating-point safety): result must not drift due to FP imprecision
// ceil(3200 * 1.20 / 4 / 40) = exactly 24 — test tolerance < 0.001
const BOUNDARY = { totalVcpus: 3200, growthHeadroomFactor: 1.20, targetVcpuToPCoreRatio: 4, coresPerServer: 40, expectedExact: 24 };

describe('serverCountByCpu', () => {
  it('returns correct count for CPU-limited fixture (F1)', () => {
    expect(serverCountByCpu(F1.totalVcpus, F1.growthHeadroomFactor, F1.targetVcpuToPCoreRatio, F1.coresPerServer)).toBe(F1.expectedCpuCount);
  });
  it('boundary: result is exactly 24, not 23 or 25 (FP safety)', () => {
    const result = serverCountByCpu(BOUNDARY.totalVcpus, BOUNDARY.growthHeadroomFactor, BOUNDARY.targetVcpuToPCoreRatio, BOUNDARY.coresPerServer);
    expect(Math.abs(result - BOUNDARY.expectedExact)).toBeLessThan(0.001);
    expect(result).toBe(BOUNDARY.expectedExact);
  });
  it('headroom factor 1.0 (0% headroom) does not over-provision', () => {
    // ceil(160 * 1.0 / 1.0 / 4 / 40) — but per formula: totalVcpus=160, factor=1.0, ratio=4, coresPerServer=40
    // = ceil(160 * 1.0 / 4 / 40) = ceil(1) = 1
    expect(serverCountByCpu(160, 1.0, 4, 40)).toBe(1);
  });
});

describe('serverCountByRam', () => {
  it('returns correct count for RAM-limited fixture (F2)', () => {
    expect(serverCountByRam(F2.totalVms, F2.ramPerVmGb, F2.growthHeadroomFactor, F2.ramPerServerGb)).toBe(F2.expectedRamCount);
  });
  it('fractional result rounds up to next integer (Math.ceil)', () => {
    // ceil(100 * 8 * 1.20 / 1000) = ceil(0.96) = 1
    expect(serverCountByRam(100, 8, 1.20, 1000)).toBe(1);
  });
});

describe('serverCountByDisk', () => {
  it('returns correct count for disk-limited fixture (F3)', () => {
    expect(serverCountByDisk(F3.totalVms, F3.diskPerVmGb, F3.growthHeadroomFactor, F3.diskPerServerGb)).toBe(F3.expectedDiskCount);
  });
  it('fractional result rounds up to next integer (Math.ceil)', () => {
    // ceil(100 * 100 * 1.20 / 50000) = ceil(0.24) = 1
    expect(serverCountByDisk(100, 100, 1.20, 50000)).toBe(1);
  });
});

export { F1, F2, F3, BOUNDARY };
