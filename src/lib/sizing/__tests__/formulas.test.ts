// VALIDATION.md: CALC-01 (CPU-limited), CALC-02 (RAM-limited), CALC-03 (disk-limited)
// Imported functions will come from src/lib/sizing/formulas.ts (Plan 02)
import { describe, it, expect } from 'vitest';
import { serverCountByCpu, serverCountByRam, serverCountByDisk, serverCountBySpecint, serverCountByCpuAggressive, serverCountByGhz } from '../formulas';

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

describe('serverCountBySpecint (PERF-04)', () => {
  it('ceil(10 × 1200 × 1.20 / 2400) = 6 — standard specint fixture', () => {
    // ceil((10 * 1200 * 1.20) / 2400) = ceil(14400 / 2400) = ceil(6) = 6
    expect(serverCountBySpecint(10, 1200, 1.20, 2400)).toBe(6);
  });
  it('returns 0 when targetSPECint is 0 — zero-guard', () => {
    expect(serverCountBySpecint(10, 1200, 1.20, 0)).toBe(0);
  });
  it('returns 0 when existingServers is 0', () => {
    expect(serverCountBySpecint(0, 1200, 1.20, 2400)).toBe(0);
  });
});

describe('serverCountByCpu — ratio is a hard cap (CALC-01)', () => {
  it('cpuUtilPct has no effect on server count — ratio is enforced on assigned vCPUs', () => {
    // The ratio cap: ceil(1000 × 1.20 / 4 / 40) = ceil(7.5) = 8
    // cpuUtil=60% must NOT reduce this to 5 (that would violate 4:1 assignment density)
    expect(serverCountByCpu(1000, 1.20, 4, 40)).toBe(8);
  });
  it('ratio hard cap: ceil(3200 × 1.20 / 4 / 40) = 24 — unchanged from original', () => {
    expect(serverCountByCpu(3200, 1.20, 4, 40)).toBe(24);
  });
});

describe('serverCountByRam with ramUtilPct (UTIL-03)', () => {
  it('ceil(500 × 16 × (80/100) × 1.20 / 512) = 15 — utilization scaling', () => {
    // ceil(500 * 16 * (80/100) * 1.20 / 512) = ceil(500 * 16 * 0.80 * 1.20 / 512) = ceil(7680 / 512) = ceil(15) = 15
    expect(serverCountByRam(500, 16, 1.20, 512, 80)).toBe(15);
  });
  it('ramUtilPct=100 produces same result as current signature — regression', () => {
    // ceil(500 * 16 * 1.0 * 1.20 / 512) = ceil(9600 / 512) = ceil(18.75) = 19
    expect(serverCountByRam(500, 16, 1.20, 512, 100)).toBe(19);
    // Default (no 5th arg) should also give 19
    expect(serverCountByRam(500, 16, 1.20, 512)).toBe(19);
  });
});

describe('serverCountByCpuAggressive (CALC-01-AGG)', () => {
  it('1000 vCPUs, 60% util, 20% headroom, 40 cores/server = ceil(1000×0.6×1.2/40) = 18', () => {
    expect(serverCountByCpuAggressive(1000, 60, 1.20, 40)).toBe(18);
  });
  it('100% util = same as raw vCPU ceiling without ratio: ceil(1000×1.0×1.2/40) = 30', () => {
    expect(serverCountByCpuAggressive(1000, 100, 1.20, 40)).toBe(30);
  });
  it('50% util: ceil(1000×0.5×1.2/40) = ceil(15) = 15', () => {
    expect(serverCountByCpuAggressive(1000, 50, 1.20, 40)).toBe(15);
  });
});

describe('serverCountByGhz (CALC-01-GHZ)', () => {
  // demand = 200 × 2.4 × 0.70 = 336 GHz; capacity = 40 × 3.0 × 0.80 = 96 GHz/server
  // servers = ceil(336 × 1.2 / 96) = ceil(403.2 / 96) = ceil(4.2) = 5
  it('200 pCores × 2.4GHz × 70% util × 1.2 headroom / (40c × 3.0GHz × 80% target) = 5', () => {
    expect(serverCountByGhz(200, 2.4, 70, 1.20, 3.0, 40, 80)).toBe(5);
  });
  it('targetCpuUtilPct default (100%): ceil(200×2.4×0.70×1.2 / (40×3.0×1.0)) = ceil(403.2/120) = 4', () => {
    expect(serverCountByGhz(200, 2.4, 70, 1.20, 3.0, 40)).toBe(4);
  });
  it('returns 0 when existingFreqGhz = 0 (zero-guard)', () => {
    expect(serverCountByGhz(200, 0, 70, 1.20, 3.0, 40)).toBe(0);
  });
  it('returns 0 when targetCpuFrequencyGhz = 0 (zero-guard)', () => {
    expect(serverCountByGhz(200, 2.4, 70, 1.20, 0, 40)).toBe(0);
  });
  it('same freq old/new with 100% util = ceil(pCores × headroom / coresPerServer): ceil(200×1.2/40)=6', () => {
    expect(serverCountByGhz(200, 2.4, 100, 1.20, 2.4, 40)).toBe(6);
  });
});

export { F1, F2, F3, BOUNDARY };
