import { describe, expect, it } from 'vitest';
import type { OldCluster } from '@/types/cluster';
import { deriveClusterMetrics } from '../derivedMetrics';

const base: OldCluster = { totalVcpus: 0, totalPcores: 0, totalVms: 0 };

describe('deriveClusterMetrics', () => {
  it('computes ratios when inputs are present', () => {
    const m = deriveClusterMetrics({
      ...base,
      totalVcpus: 512,
      totalPcores: 128,
      totalVms: 200,
      totalDiskGb: 10000,
      totalRamGb: 3200,
    });
    expect(m.vcpuToPcoreRatio).toBe(4);
    expect(m.avgVcpuPerVm).toBe(512 / 200);
    expect(m.avgDiskPerVmGb).toBe(50);
    expect(m.avgRamPerVmGb).toBe(16); // 3200 / 200
  });

  it('returns null when divisors are zero or disk/ram is absent', () => {
    const m = deriveClusterMetrics({ ...base, totalVcpus: 100 });
    expect(m.vcpuToPcoreRatio).toBeNull(); // pcores = 0
    expect(m.avgVcpuPerVm).toBeNull(); // vms = 0
    expect(m.avgDiskPerVmGb).toBeNull(); // disk absent
    expect(m.avgRamPerVmGb).toBeNull(); // ram absent
  });
});
