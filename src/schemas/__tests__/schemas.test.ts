// Tests for Zod validation schemas: currentClusterSchema and scenarioSchema
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROWTH_PERCENT,
  DEFAULT_SAFETY_PERCENT,
  DEFAULT_VCPU_TO_PCORE_RATIO,
} from '../../lib/sizing/defaults';
import { currentClusterSchema } from '../currentClusterSchema';
import { scenarioSchema } from '../scenarioSchema';

describe('currentClusterSchema', () => {
  it('throws ZodError when required numeric field is empty string', () => {
    expect(() =>
      currentClusterSchema.parse({ totalVcpus: '', totalPcores: 50, totalVms: 20 }),
    ).toThrow();
  });

  it('throws ZodError when required numeric field is undefined', () => {
    expect(() => currentClusterSchema.parse({ totalPcores: 50, totalVms: 20 })).toThrow();
  });

  it('parses valid required fields successfully', () => {
    const result = currentClusterSchema.parse({
      totalVcpus: 100,
      totalPcores: 50,
      totalVms: 20,
    });
    expect(result.totalVcpus).toBe(100);
    expect(result.totalPcores).toBe(50);
    expect(result.totalVms).toBe(20);
  });

  it('parses numeric strings for required fields', () => {
    const result = currentClusterSchema.parse({
      totalVcpus: '100',
      totalPcores: '50',
      totalVms: '20',
    });
    expect(result.totalVcpus).toBe(100);
  });

  it('optional fields are absent when not provided', () => {
    const result = currentClusterSchema.parse({
      totalVcpus: 100,
      totalPcores: 50,
      totalVms: 20,
    });
    expect(result.totalDiskGb).toBeUndefined();
    expect(result.socketsPerServer).toBeUndefined();
  });

  it('parses optional numeric fields when provided', () => {
    const result = currentClusterSchema.parse({
      totalVcpus: 100,
      totalPcores: 50,
      totalVms: 20,
      totalDiskGb: 5000,
      socketsPerServer: 2,
    });
    expect(result.totalDiskGb).toBe(5000);
    expect(result.socketsPerServer).toBe(2);
  });

  it('throws ZodError for negative required fields', () => {
    expect(() =>
      currentClusterSchema.parse({ totalVcpus: -1, totalPcores: 50, totalVms: 20 }),
    ).toThrow();
  });
});

// Valid RFC 4122 v4 UUID for test fixtures
const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const SCENARIO_BASE = {
  id: VALID_UUID,
  name: 'Test',
  socketsPerServer: 2,
  coresPerSocket: 20,
  ramPerServerGb: 512,
  diskPerServerGb: 10000,
  ramPerVmGb: 4,
  diskPerVmGb: 50,
};

describe('scenarioSchema', () => {
  it('applies DEFAULT_VCPU_TO_PCORE_RATIO as default for targetVcpuToPCoreRatio', () => {
    const result = scenarioSchema.parse(SCENARIO_BASE);
    expect(result.targetVcpuToPCoreRatio).toBe(DEFAULT_VCPU_TO_PCORE_RATIO);
  });

  it('applies DEFAULT_GROWTH_PERCENT as default for growthPercent', () => {
    const result = scenarioSchema.parse(SCENARIO_BASE);
    expect(result.growthPercent).toBe(DEFAULT_GROWTH_PERCENT);
  });

  it('applies DEFAULT_SAFETY_PERCENT as default for safetyPercent', () => {
    const result = scenarioSchema.parse(SCENARIO_BASE);
    expect(result.safetyPercent).toBe(DEFAULT_SAFETY_PERCENT);
  });

  it('accepts growth/safety and defaults them', () => {
    const parsed = scenarioSchema.parse({
      id: crypto.randomUUID(),
      name: 'X',
      socketsPerServer: 2,
      coresPerSocket: 16,
      ramPerServerGb: 512,
      diskPerServerGb: 10000,
      ramPerVmGb: 4,
      diskPerVmGb: 50,
    });
    expect(parsed.growthPercent).toBe(0);
    expect(parsed.safetyPercent).toBe(20);
    expect('headroomPercent' in parsed).toBe(false);
  });

  it('throws ZodError when socketsPerServer is negative', () => {
    expect(() => scenarioSchema.parse({ ...SCENARIO_BASE, socketsPerServer: -1 })).toThrow();
  });

  it('throws ZodError when name is empty string', () => {
    expect(() => scenarioSchema.parse({ ...SCENARIO_BASE, name: '' })).toThrow();
  });

  it('parses valid scenario with all required fields', () => {
    const result = scenarioSchema.parse({
      ...SCENARIO_BASE,
      name: 'Valid Scenario',
      targetVcpuToPCoreRatio: 4,
      growthPercent: 10,
      safetyPercent: 20,
      haReserveCount: 0 as const,
    });
    expect(result.name).toBe('Valid Scenario');
    expect(result.socketsPerServer).toBe(2);
  });
});

describe('currentClusterSchema — utilization fields (UTIL-01, UTIL-02)', () => {
  const BASE = { totalVcpus: 100, totalPcores: 50, totalVms: 20 };

  it('accepts cpuUtilizationPercent: 70', () => {
    const result = currentClusterSchema.parse({ ...BASE, cpuUtilizationPercent: 70 });
    expect(result.cpuUtilizationPercent).toBe(70);
  });

  it('rejects cpuUtilizationPercent: -5 (below 0)', () => {
    expect(() => currentClusterSchema.parse({ ...BASE, cpuUtilizationPercent: -5 })).toThrow();
  });

  it('rejects cpuUtilizationPercent: 110 (above 100)', () => {
    expect(() => currentClusterSchema.parse({ ...BASE, cpuUtilizationPercent: 110 })).toThrow();
  });

  it('accepts cpuUtilizationPercent absent (field is optional)', () => {
    const result = currentClusterSchema.parse(BASE);
    expect(result.cpuUtilizationPercent).toBeUndefined();
  });

  it('accepts ramUtilizationPercent: 80', () => {
    const result = currentClusterSchema.parse({ ...BASE, ramUtilizationPercent: 80 });
    expect(result.ramUtilizationPercent).toBe(80);
  });

  it('rejects ramUtilizationPercent: 110 (above 100)', () => {
    expect(() => currentClusterSchema.parse({ ...BASE, ramUtilizationPercent: 110 })).toThrow();
  });
});

describe('currentClusterSchema — SPECint fields (PERF-01)', () => {
  const BASE = { totalVcpus: 100, totalPcores: 50, totalVms: 20 };

  it('accepts existingServerCount: 10', () => {
    const result = currentClusterSchema.parse({ ...BASE, existingServerCount: 10 });
    expect(result.existingServerCount).toBe(10);
  });

  it('accepts specintPerServer: 1200', () => {
    const result = currentClusterSchema.parse({ ...BASE, specintPerServer: 1200 });
    expect(result.specintPerServer).toBe(1200);
  });

  it('rejects specintPerServer: -100 (must be positive)', () => {
    expect(() => currentClusterSchema.parse({ ...BASE, specintPerServer: -100 })).toThrow();
  });

  it('accepts all SPECint fields absent (all optional)', () => {
    const result = currentClusterSchema.parse(BASE);
    expect(result.existingServerCount).toBeUndefined();
    expect(result.specintPerServer).toBeUndefined();
  });
});

const SCENARIO_BASE_FULL = {
  id: VALID_UUID,
  name: 'Test',
  socketsPerServer: 2,
  coresPerSocket: 20,
  ramPerServerGb: 512,
  diskPerServerGb: 10000,
  ramPerVmGb: 4,
  diskPerVmGb: 50,
};

describe('scenarioSchema — targetSpecint (PERF-03)', () => {
  it('accepts targetSpecint: 2400', () => {
    const result = scenarioSchema.parse({ ...SCENARIO_BASE_FULL, targetSpecint: 2400 });
    expect(result.targetSpecint).toBe(2400);
  });

  it('rejects targetSpecint: 0 (must be positive)', () => {
    expect(() => scenarioSchema.parse({ ...SCENARIO_BASE_FULL, targetSpecint: 0 })).toThrow();
  });

  it('accepts targetSpecint absent (optional field)', () => {
    const result = scenarioSchema.parse(SCENARIO_BASE_FULL);
    expect(result.targetSpecint).toBeUndefined();
  });
});
