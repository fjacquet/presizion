/**
 * Formula display string generators — unit tests
 * Requirement: CALC-07 (Phase 1 plan 04 — carried to Phase 4)
 *
 * Per STATE.md decision: display functions accept headroomPercent (not factor).
 * Conversion to multiplicative factor (1 + percent/100) is internal to display module.
 */
import { describe, expect, it } from 'vitest';
import { computeScenarioResult } from '../constraints';
import {
  cpuFormulaString,
  diskFormulaString,
  ramFormulaString,
  specintFormulaString,
} from '../display';

describe('display: formula string generators', () => {
  describe('CALC-07: cpuFormulaString', () => {
    it('returns a human-readable formula string with substituted values for CPU constraint', () => {
      const result = cpuFormulaString({
        totalVcpus: 2000,
        growthPercent: 0,
        safetyPercent: 20,
        targetVcpuToPCoreRatio: 4,
        coresPerServer: 48,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes ceil(), totalVcpus, headroomPercent, targetVcpuToPCoreRatio, and coresPerServer in the string', () => {
      const result = cpuFormulaString({
        totalVcpus: 2000,
        growthPercent: 0,
        safetyPercent: 20,
        targetVcpuToPCoreRatio: 4,
        coresPerServer: 48,
      });
      expect(result).toContain('ceil');
      expect(result).toContain('2000');
      expect(result).toContain('20%');
      expect(result).toContain('4');
      expect(result).toContain('48');
    });
  });

  describe('CALC-07: ramFormulaString', () => {
    it('returns a human-readable formula string with substituted values for RAM constraint', () => {
      const result = ramFormulaString({
        totalVms: 300,
        ramPerVmGb: 16,
        growthPercent: 0,
        safetyPercent: 20,
        ramPerServerGb: 512,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes ceil(), totalVms, ramPerVmGb, headroomPercent, and ramPerServerGb in the string', () => {
      const result = ramFormulaString({
        totalVms: 300,
        ramPerVmGb: 16,
        growthPercent: 0,
        safetyPercent: 20,
        ramPerServerGb: 512,
      });
      expect(result).toContain('ceil');
      expect(result).toContain('300');
      expect(result).toContain('16');
      expect(result).toContain('20%');
      expect(result).toContain('512');
    });
  });

  describe('CALC-07: diskFormulaString', () => {
    it('returns a human-readable formula string with substituted values for disk constraint', () => {
      const result = diskFormulaString({
        totalVms: 300,
        diskPerVmGb: 100,
        growthPercent: 0,
        safetyPercent: 20,
        diskPerServerGb: 20000,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes ceil(), totalVms, diskPerVmGb, headroomPercent, and diskPerServerGb in the string', () => {
      const result = diskFormulaString({
        totalVms: 300,
        diskPerVmGb: 100,
        growthPercent: 0,
        safetyPercent: 20,
        diskPerServerGb: 20000,
      });
      expect(result).toContain('ceil');
      expect(result).toContain('300');
      expect(result).toContain('100');
      expect(result).toContain('20%');
      expect(result).toContain('20000');
    });
  });
});

describe('specintFormulaString (PERF-04 display)', () => {
  it('formats: ceil(10 servers × 1200 SPECrate2017_int_base × 1.20 / 2400 SPECrate2017_int_base)', () => {
    const result = specintFormulaString({
      existingServers: 10,
      specintPerServer: 1200,
      safetyPercent: 20,
      targetSpecint: 2400,
    });
    expect(result).toBe(
      'ceil(10 servers × 1200 SPECrate2017_int_base × 1.20 / 2400 SPECrate2017_int_base)',
    );
  });
});

describe('ramFormulaString with utilization (TD-04)', () => {
  it('includes utilization factor when ramUtilizationPercent is not 100: contains 80%, ceil, 300, 16, 512', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      growthPercent: 0,
      safetyPercent: 20,
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
      growthPercent: 0,
      safetyPercent: 20,
      ramPerServerGb: 512,
      ramUtilizationPercent: 80,
    });
    expect(result).toBe('ceil(300 × 80% × 16 GB × 120% / 512 GB)');
  });

  it('omits utilization factor when ramUtilizationPercent=100 (treated as no-op)', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      growthPercent: 0,
      safetyPercent: 20,
      ramPerServerGb: 512,
      ramUtilizationPercent: 100,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% / 512 GB)');
  });

  it('omits utilization factor when ramUtilizationPercent is absent (existing behavior unchanged)', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      growthPercent: 0,
      safetyPercent: 20,
      ramPerServerGb: 512,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% / 512 GB)');
  });
});

describe('Growth annotations (GROW-04)', () => {
  it('cpuFormulaString with growthPercent=20: output contains growth annotation', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      safetyPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
      growthPercent: 20,
    });
    expect(result).toBe('ceil(2000 × 120% × +20% growth / 4 / 48)');
  });

  it('cpuFormulaString with growthPercent=0: output unchanged (no growth annotation)', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      safetyPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
      growthPercent: 0,
    });
    expect(result).toBe('ceil(2000 × 120% / 4 / 48)');
  });

  it('cpuFormulaString without growthPercent: output unchanged (no growth annotation)', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      safetyPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
    });
    expect(result).toBe('ceil(2000 × 120% / 4 / 48)');
  });

  it('ramFormulaString with growthPercent=30: output contains growth annotation', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      safetyPercent: 20,
      ramPerServerGb: 512,
      growthPercent: 30,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% × +30% growth / 512 GB)');
  });

  it('ramFormulaString with growthPercent=0: output unchanged', () => {
    const result = ramFormulaString({
      totalVms: 300,
      ramPerVmGb: 16,
      safetyPercent: 20,
      ramPerServerGb: 512,
      growthPercent: 0,
    });
    expect(result).toBe('ceil(300 × 16 GB × 120% / 512 GB)');
  });

  it('diskFormulaString with growthPercent=50: output contains growth annotation', () => {
    const result = diskFormulaString({
      totalVms: 300,
      diskPerVmGb: 100,
      safetyPercent: 20,
      diskPerServerGb: 20000,
      growthPercent: 50,
    });
    expect(result).toBe('ceil(300 × 100 GB × 120% × +50% growth / 20000 GB)');
  });

  it('diskFormulaString with growthPercent=0: output unchanged', () => {
    const result = diskFormulaString({
      totalVms: 300,
      diskPerVmGb: 100,
      safetyPercent: 20,
      diskPerServerGb: 20000,
      growthPercent: 0,
    });
    expect(result).toBe('ceil(300 × 100 GB × 120% / 20000 GB)');
  });
});

describe('cpuFormulaString — pure density cap (no utilization factor)', () => {
  it('never renders a utilization factor: ceil(2000 × 120% / 4 / 48)', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      growthPercent: 0,
      safetyPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
    });
    expect(result).toBe('ceil(2000 × 120% / 4 / 48)');
  });
});

// Regression: the displayed CPU formula must equal the number it sits next to.
// Evaluates the rendered string's arithmetic for the growth=0 case and compares
// it to computeScenarioResult's cpuLimitedCount. Before the fix, util≠100 made
// the string evaluate to a different (smaller) number than the count shown.
describe('cpuFormulaString — displayed value equals computed count (regression)', () => {
  function evalCpuFormula(s: string): number {
    // "ceil(3200 × 120% / 4 / 40)" -> 3200 * 1.20 / 4 / 40 -> Math.ceil
    const inner = s.replace(/^ceil\(/, '').replace(/\)$/, '');
    const parts = inner.split(' / ');
    const factorPart = parts[0] ?? '';
    const divisors = parts.slice(1);
    const pieces = factorPart.split(' × ').map((p) => p.trim());
    let value = Number(pieces[0]);
    for (const p of pieces.slice(1)) {
      const pct = p.match(/^([\d.]+)%$/);
      if (pct) value *= Number(pct[1]) / 100;
    }
    for (const d of divisors) value /= Number(d);
    return Math.ceil(value);
  }

  it('util≠100, growth=0: rendered CPU formula evaluates to cpuLimitedCount', () => {
    const cluster = {
      totalVcpus: 3200,
      totalVms: 100,
      totalPcores: 800,
      cpuUtilizationPercent: 10,
    };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'CPU-Limited',
      socketsPerServer: 2,
      coresPerSocket: 20,
      ramPerServerGb: 1024,
      diskPerServerGb: 50000,
      targetVcpuToPCoreRatio: 4,
      ramPerVmGb: 2,
      diskPerVmGb: 10,
      growthPercent: 0,
      safetyPercent: 20,
      haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(cluster, scenario);
    const formula = cpuFormulaString({
      totalVcpus: cluster.totalVcpus,
      safetyPercent: scenario.safetyPercent,
      growthPercent: scenario.growthPercent,
      targetVcpuToPCoreRatio: scenario.targetVcpuToPCoreRatio,
      coresPerServer: scenario.socketsPerServer * scenario.coresPerSocket,
      applySafety: false, // vCPU mode: safety excluded from CPU (ratio is the headroom)
    });
    expect(evalCpuFormula(formula)).toBe(result.cpuLimitedCount); // 20, not 3
  });
});
