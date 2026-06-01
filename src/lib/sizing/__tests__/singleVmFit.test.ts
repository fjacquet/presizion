import { describe, expect, it } from 'vitest';
import type { OldCluster, Scenario } from '../../../types/cluster';
import { createDefaultScenario } from '../defaults';
import { assessSingleVmFit, SMT_THREADS_PER_CORE } from '../singleVmFit';

// Host: 2 x 16 = 32 cores, 64 logical (SMT 2), 512 GiB nameplate, no vSAN.
const HOST: Scenario = {
  ...createDefaultScenario(),
  socketsPerServer: 2,
  coresPerSocket: 16,
  ramPerServerGb: 512,
};

function clusterWith(largestVmVcpus?: number, largestVmRamGb?: number): OldCluster {
  return {
    totalVcpus: 0,
    totalPcores: 0,
    totalVms: 0,
    ...(largestVmVcpus !== undefined && { largestVmVcpus }),
    ...(largestVmRamGb !== undefined && { largestVmRamGb }),
  };
}

describe('SMT_THREADS_PER_CORE', () => {
  it('is 2 (x86 standard)', () => {
    expect(SMT_THREADS_PER_CORE).toBe(2);
  });
});

describe('assessSingleVmFit — vCPU dimension', () => {
  it('ok when largest vCPU <= physical cores', () => {
    expect(assessSingleVmFit(clusterWith(32, 8), HOST).vcpu).toBe('ok');
  });
  it('warn when largest vCPU is between cores and logical CPUs (relies on SMT)', () => {
    expect(assessSingleVmFit(clusterWith(48, 8), HOST).vcpu).toBe('warn');
  });
  it('fail when largest vCPU exceeds logical CPUs', () => {
    expect(assessSingleVmFit(clusterWith(96, 8), HOST).vcpu).toBe('fail');
  });
  it('unknown when no largest-vCPU data', () => {
    expect(assessSingleVmFit(clusterWith(undefined, 8), HOST).vcpu).toBe('unknown');
  });
});

describe('assessSingleVmFit — RAM dimension', () => {
  it('ok when largest RAM <= usable (no vSAN -> usable === nameplate)', () => {
    expect(assessSingleVmFit(clusterWith(8, 512), HOST).ram).toBe('ok');
  });
  it('fail when largest RAM exceeds nameplate', () => {
    expect(assessSingleVmFit(clusterWith(8, 768), HOST).ram).toBe('fail');
  });
  it('warn when largest RAM is between usable and nameplate (vSAN overhead)', () => {
    const vsanHost: Scenario = { ...HOST, vsanFttPolicy: 'mirror-1', vsanMemoryPerHostGb: 6 };
    expect(assessSingleVmFit(clusterWith(8, 510), vsanHost).ram).toBe('warn');
    expect(assessSingleVmFit(clusterWith(8, 510), vsanHost).usableRamGb).toBe(506);
  });
  it('unknown when no largest-RAM data', () => {
    expect(assessSingleVmFit(clusterWith(8, undefined), HOST).ram).toBe('unknown');
  });
});

describe('assessSingleVmFit — overall', () => {
  it('overall is the worst of the two known dimensions', () => {
    expect(assessSingleVmFit(clusterWith(48, 768), HOST).overall).toBe('fail');
  });
  it('overall ignores an unknown dimension', () => {
    expect(assessSingleVmFit(clusterWith(48, undefined), HOST).overall).toBe('warn');
  });
  it('overall is unknown when both dimensions are unknown', () => {
    expect(assessSingleVmFit(clusterWith(undefined, undefined), HOST).overall).toBe('unknown');
  });
  it('echoes the host geometry and largest-VM numbers for UI copy', () => {
    const fit = assessSingleVmFit(clusterWith(48, 256), HOST);
    expect(fit.coresPerServer).toBe(32);
    expect(fit.logicalCpus).toBe(64);
    expect(fit.largestVmVcpus).toBe(48);
    expect(fit.largestVmRamGb).toBe(256);
  });
});

describe('assessSingleVmFit — degenerate host config (no division, only compares)', () => {
  const ZERO_HOST: Scenario = {
    ...createDefaultScenario(),
    socketsPerServer: 0,
    coresPerSocket: 0,
    ramPerServerGb: 0,
  };

  it('fails a positive largest VM against a zero-core / zero-RAM host', () => {
    const fit = assessSingleVmFit(clusterWith(8, 16), ZERO_HOST);
    expect(fit.vcpu).toBe('fail');
    expect(fit.ram).toBe('fail');
    expect(fit.overall).toBe('fail');
  });

  it('treats a zero-sized largest VM as ok (0 <= 0), never NaN', () => {
    const fit = assessSingleVmFit(clusterWith(0, 0), ZERO_HOST);
    expect(fit.vcpu).toBe('ok');
    expect(fit.ram).toBe('ok');
    expect(fit.coresPerServer).toBe(0);
    expect(fit.logicalCpus).toBe(0);
    expect(fit.usableRamGb).toBe(0);
  });
});
