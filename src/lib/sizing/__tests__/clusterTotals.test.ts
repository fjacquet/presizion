import { describe, expect, it } from 'vitest';
import type { OldCluster } from '@/types/cluster';
import { asIsRamGb } from '../clusterTotals';

const base: OldCluster = { totalVcpus: 0, totalPcores: 0, totalVms: 0 };

describe('asIsRamGb', () => {
  it('prefers the explicit cluster total when present', () => {
    // totalRamGb wins even if server-hardware data is also present.
    const cluster = { ...base, totalRamGb: 4096, existingServerCount: 4, ramPerServerGb: 512 };
    expect(asIsRamGb(cluster)).toBe(4096);
  });

  it('falls back to existingServerCount × ramPerServerGb when totalRamGb is absent', () => {
    const cluster = { ...base, existingServerCount: 4, ramPerServerGb: 512 };
    expect(asIsRamGb(cluster)).toBe(2048);
  });

  it('returns undefined when neither total nor server RAM data is available', () => {
    expect(asIsRamGb(base)).toBeUndefined();
    expect(asIsRamGb({ ...base, ramPerServerGb: 512 })).toBeUndefined(); // no server count
  });
});
