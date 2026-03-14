// VALIDATION.md: cross-cutting — useScenariosResults returns correct ScenarioResult[]
// Uses @testing-library/react renderHook
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScenariosResults } from '../useScenariosResults';
import { useClusterStore } from '../../store/useClusterStore';
import { useScenariosStore } from '../../store/useScenariosStore';
import { computeScenarioResult } from '../../lib/sizing/constraints';

// CPU-limited fixture (from Plan 02 constraints.test.ts)
// totalVcpus=3200, totalVms=100, totalPcores=800
// sockets=2, coresPerSocket=20 (40 pCores/server), ram=1024GB/server, disk=50000GB/server
// ratio=4, ramPerVm=2GB, diskPerVm=10GB, headroom=20%, haReserve=false
// Expected: finalCount=24, limitingResource='cpu'
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

// Stub crypto.randomUUID so createDefaultScenario generates predictable IDs in tests
vi.stubGlobal('crypto', {
  randomUUID: () => 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
});

// Reset stores between tests to avoid cross-test contamination
beforeEach(() => {
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } });
  useScenariosStore.setState({ scenarios: [] });
});

describe('useScenariosResults', () => {
  it('returns empty array when no scenarios in store', () => {
    const { result } = renderHook(() => useScenariosResults());
    expect(result.current).toEqual([]);
  });

  it('returns one ScenarioResult per scenario in store', () => {
    // Set up one scenario
    act(() => {
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosResults());
    expect(result.current).toHaveLength(1);
  });

  it('result matches computeScenarioResult(cluster, scenario) for CPU-limited fixture', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosResults());
    const expected = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(expected);
  });

  it('result returns finalCount=24 for CPU-limited fixture', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosResults());
    expect(result.current[0]!.finalCount).toBe(24);
  });

  it('result updates when cluster store changes', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosResults());
    const initialCount = result.current[0]!.finalCount;

    act(() => {
      useClusterStore.getState().setCurrentCluster(CPU_LIMITED_CLUSTER);
    });

    expect(result.current[0]!.finalCount).not.toBe(initialCount);
    expect(result.current[0]!.finalCount).toBe(24);
  });

  it('result updates when scenarios store changes', () => {
    act(() => {
      useClusterStore.setState({ currentCluster: CPU_LIMITED_CLUSTER });
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosResults());
    expect(result.current).toHaveLength(1);

    act(() => {
      useScenariosStore.getState().addScenario();
    });

    expect(result.current).toHaveLength(2);
  });
});

describe('useScenariosStore', () => {
  it('addScenario appends a new scenario with default values', () => {
    const { result } = renderHook(() => useScenariosStore());
    const initialLength = result.current.scenarios.length;

    act(() => {
      result.current.addScenario();
    });

    expect(result.current.scenarios).toHaveLength(initialLength + 1);
  });

  it('removeScenario removes scenario by id', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosStore());
    expect(result.current.scenarios).toHaveLength(1);

    act(() => {
      result.current.removeScenario(CPU_LIMITED_SCENARIO.id);
    });

    expect(result.current.scenarios).toHaveLength(0);
  });

  it('updateScenario merges partial update', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosStore());

    act(() => {
      result.current.updateScenario(CPU_LIMITED_SCENARIO.id, { name: 'Updated Name' });
    });

    expect(result.current.scenarios[0]!.name).toBe('Updated Name');
    expect(result.current.scenarios[0]!.socketsPerServer).toBe(2); // unchanged
  });

  it('duplicateScenario creates a copy with new id and "(copy)" name suffix', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [CPU_LIMITED_SCENARIO] });
    });

    const { result } = renderHook(() => useScenariosStore());

    act(() => {
      result.current.duplicateScenario(CPU_LIMITED_SCENARIO.id);
    });

    expect(result.current.scenarios).toHaveLength(2);
    const copy = result.current.scenarios[1]!;
    expect(copy.id).not.toBe(CPU_LIMITED_SCENARIO.id);
    expect(copy.name).toBe('CPU-Limited (copy)');
  });
});

describe('useClusterStore', () => {
  it('setCurrentCluster updates currentCluster', () => {
    const { result } = renderHook(() => useClusterStore());

    act(() => {
      result.current.setCurrentCluster(CPU_LIMITED_CLUSTER);
    });

    expect(result.current.currentCluster.totalVcpus).toBe(3200);
  });

  it('resetCluster resets to zero state', () => {
    const { result } = renderHook(() => useClusterStore());

    act(() => {
      result.current.setCurrentCluster(CPU_LIMITED_CLUSTER);
    });

    act(() => {
      result.current.resetCluster();
    });

    expect(result.current.currentCluster.totalVcpus).toBe(0);
  });
});
