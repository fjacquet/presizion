// VALIDATION.md: CALC-01 (CPU-limited), CALC-02 (RAM-limited), CALC-03 (disk-limited)
// Imported functions will come from src/lib/sizing/formulas.ts (Plan 02)
import { describe, it } from 'vitest';

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
  it.todo('returns correct count for CPU-limited fixture (F1)');
  it.todo('boundary: result is exactly 24, not 23 or 25 (FP safety)');
  it.todo('headroom factor 1.0 (0% headroom) does not over-provision');
});

describe('serverCountByRam', () => {
  it.todo('returns correct count for RAM-limited fixture (F2)');
  it.todo('fractional result rounds up to next integer (Math.ceil)');
});

describe('serverCountByDisk', () => {
  it.todo('returns correct count for disk-limited fixture (F3)');
  it.todo('fractional result rounds up to next integer (Math.ceil)');
});

export { F1, F2, F3, BOUNDARY };
