import { describe, expect, it } from 'vitest';
import { createDefaultScenario, DEFAULT_GROWTH_PERCENT, DEFAULT_SAFETY_PERCENT } from '../defaults';

describe('createDefaultScenario', () => {
  it('returns name "To-Be"', () => {
    const scenario = createDefaultScenario();
    expect(scenario.name).toBe('To-Be');
  });

  it('returns a valid non-empty UUID for id', () => {
    const scenario = createDefaultScenario();
    expect(scenario.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('returns an object with all required Scenario fields', () => {
    const scenario = createDefaultScenario();
    expect(scenario).toHaveProperty('socketsPerServer');
    expect(scenario).toHaveProperty('coresPerSocket');
    expect(scenario).toHaveProperty('ramPerServerGb');
    expect(scenario).toHaveProperty('diskPerServerGb');
    expect(scenario).toHaveProperty('targetVcpuToPCoreRatio');
    expect(scenario).toHaveProperty('ramPerVmGb');
    expect(scenario).toHaveProperty('diskPerVmGb');
    expect(scenario).toHaveProperty('growthPercent');
    expect(scenario).toHaveProperty('safetyPercent');
    expect(scenario).toHaveProperty('haReserveCount');
    expect(scenario).toHaveProperty('targetSpecint');
  });

  it('produces different id values on successive calls', () => {
    const a = createDefaultScenario();
    const b = createDefaultScenario();
    expect(a.id).not.toBe(b.id);
  });
});

it('seeds new buffer model defaults', () => {
  expect(DEFAULT_GROWTH_PERCENT).toBe(0);
  expect(DEFAULT_SAFETY_PERCENT).toBe(20);
  const s = createDefaultScenario();
  expect(s.growthPercent).toBe(0);
  expect(s.safetyPercent).toBe(20);
  expect('headroomPercent' in s).toBe(false);
  expect('targetCpuUtilizationPercent' in s).toBe(false);
  expect('cpuGrowthPercent' in s).toBe(false);
  expect('targetVmCount' in s).toBe(false);
});
