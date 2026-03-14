/**
 * useVsanBreakdowns hook tests (GROW-04 / CAP-06)
 *
 * Mirrors useScenariosResults.test.ts pattern: renderHook + store setup.
 * Verifies derive-on-read behavior for VsanCapacityBreakdown[].
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVsanBreakdowns } from '../useVsanBreakdowns';
import { useClusterStore } from '../../store/useClusterStore';
import { useScenariosStore } from '../../store/useScenariosStore';

// CPU-limited fixture (from useScenariosResults.test.ts)
const CPU_LIMITED_CLUSTER = { totalVcpus: 3200, totalVms: 100, totalPcores: 800 };
const CPU_LIMITED_SCENARIO = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
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

// Stub crypto.randomUUID for deterministic IDs in addScenario
vi.stubGlobal('crypto', {
  randomUUID: () => 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
});

// Reset stores between tests
beforeEach(() => {
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } });
  useScenariosStore.setState({ scenarios: [] });
});

describe('useVsanBreakdowns', () => {
  it('returns empty array when no scenarios in store', () => {
    const { result } = renderHook(() => useVsanBreakdowns());
    expect(result.current).toEqual([]);
  });

  it('returns one VsanCapacityBreakdown per scenario', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useVsanBreakdowns());
    expect(result.current).toHaveLength(1);
  });

  it('each breakdown has cpu, memory, storage, minNodesByConstraint properties', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useVsanBreakdowns());
    const breakdown = result.current[0]!;
    expect(breakdown).toHaveProperty('cpu');
    expect(breakdown).toHaveProperty('memory');
    expect(breakdown).toHaveProperty('storage');
    expect(breakdown).toHaveProperty('minNodesByConstraint');
  });

  it('breakdown.cpu.total > 0 when cluster has valid data', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useVsanBreakdowns());
    const breakdown = result.current[0]!;
    expect(breakdown.cpu.total).toBeGreaterThan(0);
  });

  it('breakdown invariant: cpu.required + cpu.spare + cpu.excess is close to cpu.total', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useVsanBreakdowns());
    const cpu = result.current[0]!.cpu;
    // CAP-06 invariant: required + spare + excess === total
    expect(cpu.required + cpu.spare + cpu.excess).toBeCloseTo(cpu.total, 5);
  });

  it('result updates when scenarios store changes (addScenario increases array length)', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useVsanBreakdowns());
    expect(result.current).toHaveLength(1);

    act(() => {
      useScenariosStore.getState().addScenario();
    });

    expect(result.current).toHaveLength(2);
  });
});
