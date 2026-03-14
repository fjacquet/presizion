import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../useWizardStore';
import { computeScenarioResult } from '../../lib/sizing/constraints';

const SPECINT_CLUSTER = {
  totalVcpus: 400,
  totalPcores: 200,
  totalVms: 50,
  existingServerCount: 10,
  specintPerServer: 1200,
};

const SPECINT_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000010',
  name: 'SPECint Mode',
  socketsPerServer: 2,
  coresPerSocket: 20,
  ramPerServerGb: 1024,
  diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 2,
  diskPerVmGb: 10,
  headroomPercent: 20,
  haReserveCount: 0 as const,
  targetSpecint: 2400,
};

describe('useScenariosResults — sizingMode integration (PERF-04, PERF-05)', () => {
  beforeEach(() => {
    useWizardStore.setState({ sizingMode: 'vcpu' });
  });

  it('returns SPECint-limited result when sizingMode is specint and specint constraint drives count', () => {
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'specint');
    expect(result.limitingResource).toBe('specint');
    expect(result.cpuLimitedCount).toBe(6);
  });

  it('returns cpu-limited result unchanged when sizingMode is vcpu (regression)', () => {
    const CPU_LIMITED_CLUSTER = { totalVcpus: 3200, totalVms: 100, totalPcores: 800 };
    const CPU_LIMITED_SCENARIO = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'CPU-Limited',
      socketsPerServer: 2,
      coresPerSocket: 20,
      ramPerServerGb: 1024,
      diskPerServerGb: 50000,
      targetVcpuToPCoreRatio: 4,
      ramPerVmGb: 2,
      diskPerVmGb: 10,
      headroomPercent: 20,
      haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, 'vcpu');
    expect(result.finalCount).toBe(24);
    expect(result.limitingResource).toBe('cpu');
  });

  it('limitingResource is specint when specint mode and specint count is highest', () => {
    const result = computeScenarioResult(SPECINT_CLUSTER, SPECINT_SCENARIO, 'specint');
    expect(result.limitingResource).toBe('specint');
  });
});
