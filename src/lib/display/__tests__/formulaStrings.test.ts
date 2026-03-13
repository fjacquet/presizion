// VALIDATION.md: CALC-07 — formula display strings for inline UI rendering
// Imported functions will come from src/lib/display/formulaStrings.ts (Plan 04)
import { describe, it, expect } from 'vitest';
import { getCpuFormulaString, getRamFormulaString, getDiskFormulaString, getSpecintFormulaString } from '../formulaStrings';

// The display module returns a human-readable formula string showing
// both the formula template and the substituted values.
// Example: getCpuFormulaString({totalVcpus:3200, headroomPercent:20, ratio:4, coresPerServer:40})
//   → "ceil(3200 × 1.20 / 4 / 40) = 24 servers"

describe('getCpuFormulaString', () => {
  it('returns formula string with substituted values for CPU constraint', () => {
    const result = getCpuFormulaString({
      totalVcpus: 3200,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 40,
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('3200');
    expect(result).toContain('1.20');
    expect(result).toContain('4');
    expect(result).toContain('40');
    expect(result).toContain('ceil');
  });

  it('string contains the computed result', () => {
    const result = getCpuFormulaString({
      totalVcpus: 3200,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 40,
    });
    // ceil(3200 * 1.20 / 4 / 40) = ceil(24) = 24
    expect(result).toContain('24');
  });
});

describe('getRamFormulaString', () => {
  it('returns formula string with substituted values for RAM constraint', () => {
    const result = getRamFormulaString({
      totalVms: 500,
      ramPerVmGb: 16,
      headroomPercent: 20,
      ramPerServerGb: 512,
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('500');
    expect(result).toContain('16');
    expect(result).toContain('1.20');
    expect(result).toContain('512');
    expect(result).toContain('ceil');
    // ceil(500 * 16 * 1.20 / 512) = ceil(18.75) = 19
    expect(result).toContain('19');
  });
});

describe('getDiskFormulaString', () => {
  it('returns formula string with substituted values for disk constraint', () => {
    const result = getDiskFormulaString({
      totalVms: 200,
      diskPerVmGb: 500,
      headroomPercent: 20,
      diskPerServerGb: 10000,
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('200');
    expect(result).toContain('500');
    expect(result).toContain('1.20');
    expect(result).toContain('10000');
    expect(result).toContain('ceil');
    // ceil(200 * 500 * 1.20 / 10000) = ceil(12) = 12
    expect(result).toContain('12');
  });
});

describe('getSpecintFormulaString (PERF-04)', () => {
  it('returns formula string with specint values and computed result', () => {
    // ceil(10 * 1200 * 1.20 / 2400) = ceil(6) = 6
    const result = getSpecintFormulaString({
      existingServers: 10,
      specintPerServer: 1200,
      headroomPercent: 20,
      targetSpecint: 2400,
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('10');
    expect(result).toContain('1200');
    expect(result).toContain('1.20');
    expect(result).toContain('2400');
    expect(result).toContain('SPECint');
    expect(result).toContain('6');
  });
});

describe('getCpuFormulaString with utilization (UTIL-03)', () => {
  it('includes utilization percentage when cpuUtilizationPercent is not 100', () => {
    const result = getCpuFormulaString({
      totalVcpus: 1000,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 40,
      cpuUtilizationPercent: 60,
    });
    expect(result).toContain('60%');
    expect(result).toContain('ceil');
    // ceil(1000 * (60/100) * 1.20 / 4 / 40) = ceil(4.5) = 5
    expect(result).toContain('5');
  });
  it('omits utilization when cpuUtilizationPercent is absent (backward compat)', () => {
    const result = getCpuFormulaString({
      totalVcpus: 3200,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 40,
    });
    // Should NOT contain a separate utilization percentage line
    expect(result).not.toContain('100%');
    // Should contain the result: 24
    expect(result).toContain('24');
  });
});
