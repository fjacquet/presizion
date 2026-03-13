/**
 * Formula display string generators — unit tests
 * Requirement: CALC-07 (Phase 1 plan 04 — carried to Phase 4)
 *
 * Per STATE.md decision: display functions accept headroomPercent (not factor).
 * Conversion to multiplicative factor (1 + percent/100) is internal to display module.
 */
import { describe, it, expect } from 'vitest'
import { cpuFormulaString, ramFormulaString, diskFormulaString } from '../display'

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
  it.todo('formats: ceil(10 servers × 1200 SPECint × 1.20 / 2400 SPECint)');
});

describe('cpuFormulaString with utilization (UTIL-03 display)', () => {
  it.todo('includes utilization factor when cpuUtilizationPercent is not 100: ceil(2000 × 70% × 120% / 4 / 48)');
  it.todo('omits utilization factor when cpuUtilizationPercent is absent');
});
