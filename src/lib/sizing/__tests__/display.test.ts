/**
 * Formula display string generators — unit tests
 * Requirement: CALC-07 (Phase 1 plan 04 — carried to Phase 4)
 *
 * Per STATE.md decision: display functions accept headroomPercent (not factor).
 * Conversion to multiplicative factor (1 + percent/100) is internal to display module.
 */
import { describe, it, expect } from 'vitest'
import { cpuFormulaString, ramFormulaString, diskFormulaString, specintFormulaString } from '../display'

describe('display: formula string generators', () => {
  describe('CALC-07: cpuFormulaString', () => {
    it('returns a human-readable formula string with substituted values for CPU constraint', () => {
      const result = cpuFormulaString({
        totalVcpus: 2000,
        headroomPercent: 20,
        targetVcpuToPCoreRatio: 4,
        coresPerServer: 48,
      })
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('includes ceil(), totalVcpus, headroomPercent, targetVcpuToPCoreRatio, and coresPerServer in the string', () => {
      const result = cpuFormulaString({
        totalVcpus: 2000,
        headroomPercent: 20,
        targetVcpuToPCoreRatio: 4,
        coresPerServer: 48,
      })
      expect(result).toContain('ceil')
      expect(result).toContain('2000')
      expect(result).toContain('20%')
      expect(result).toContain('4')
      expect(result).toContain('48')
    })
  })

  describe('CALC-07: ramFormulaString', () => {
    it('returns a human-readable formula string with substituted values for RAM constraint', () => {
      const result = ramFormulaString({
        totalVms: 300,
        ramPerVmGb: 16,
        headroomPercent: 20,
        ramPerServerGb: 512,
      })
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('includes ceil(), totalVms, ramPerVmGb, headroomPercent, and ramPerServerGb in the string', () => {
      const result = ramFormulaString({
        totalVms: 300,
        ramPerVmGb: 16,
        headroomPercent: 20,
        ramPerServerGb: 512,
      })
      expect(result).toContain('ceil')
      expect(result).toContain('300')
      expect(result).toContain('16')
      expect(result).toContain('20%')
      expect(result).toContain('512')
    })
  })

  describe('CALC-07: diskFormulaString', () => {
    it('returns a human-readable formula string with substituted values for disk constraint', () => {
      const result = diskFormulaString({
        totalVms: 300,
        diskPerVmGb: 100,
        headroomPercent: 20,
        diskPerServerGb: 20000,
      })
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('includes ceil(), totalVms, diskPerVmGb, headroomPercent, and diskPerServerGb in the string', () => {
      const result = diskFormulaString({
        totalVms: 300,
        diskPerVmGb: 100,
        headroomPercent: 20,
        diskPerServerGb: 20000,
      })
      expect(result).toContain('ceil')
      expect(result).toContain('300')
      expect(result).toContain('100')
      expect(result).toContain('20%')
      expect(result).toContain('20000')
    })
  })
})

describe('specintFormulaString (PERF-04 display)', () => {
  it('formats: ceil(10 servers × 1200 SPECrate2017_int_base × 1.20 / 2400 SPECrate2017_int_base)', () => {
    const result = specintFormulaString({
      existingServers: 10,
      specintPerServer: 1200,
      headroomPercent: 20,
      targetSpecint: 2400,
    });
    expect(result).toBe('ceil(10 servers × 1200 SPECrate2017_int_base × 1.20 / 2400 SPECrate2017_int_base)');
  });
});

describe('ramFormulaString with utilization (TD-04)', () => {
  it('includes utilization factor when ramUtilizationPercent is not 100: contains 80%, ceil, 300, 16, 512', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      headroomPercent: 20,
      ramPerServerGb: 512,
      ramUtilizationPercent: 80,
    });
    expect(result).toContain('80%');
    expect(result).toContain('ceil');
    expect(result).toContain('300');
    expect(result).toContain('16');
    expect(result).toContain('512');
  });

  it('exact format with ramUtilizationPercent=80: ceil(300 × 80% × 16 GB × 120% / 512 GB)', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      headroomPercent: 20,
      ramPerServerGb: 512,
      ramUtilizationPercent: 80,
    });
    expect(result).toBe('ceil(300 × 80% × 16 GB × 120% / 512 GB)');
  });

  it('omits utilization factor when ramUtilizationPercent=100 (treated as no-op)', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      headroomPercent: 20,
      ramPerServerGb: 512,
      ramUtilizationPercent: 100,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% / 512 GB)');
  });

  it('omits utilization factor when ramUtilizationPercent is absent (existing behavior unchanged)', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      headroomPercent: 20,
      ramPerServerGb: 512,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% / 512 GB)');
  });
});

describe('cpuFormulaString with utilization (UTIL-03 display)', () => {
  it('includes utilization factor when cpuUtilizationPercent is not 100: ceil(2000 × 70% × 120% / 4 / 48)', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
      cpuUtilizationPercent: 70,
    });
    expect(result).toContain('70%');
    expect(result).toContain('ceil');
    expect(result).toContain('2000');
  });
  it('omits utilization factor when cpuUtilizationPercent is absent', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      headroomPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
    });
    // Should not contain a separate utilization percentage (only the headroom)
    expect(result).toBe('ceil(2000 × 120% / 4 / 48)');
  });
});
