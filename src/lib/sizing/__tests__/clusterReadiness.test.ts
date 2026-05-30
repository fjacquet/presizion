import { expect, it } from 'vitest';
import type { OldCluster } from '../../../types/cluster';
import { isClusterSizingReady } from '../clusterReadiness';

const ready: OldCluster = {
  totalVcpus: 10,
  totalPcores: 4,
  totalVms: 5,
  cpuUtilizationPercent: 55,
  ramUtilizationPercent: 60,
};

it('is ready only when both utilizations are present', () => {
  expect(isClusterSizingReady(ready)).toBe(true);
  const { cpuUtilizationPercent: _c, ...noCpu } = ready;
  void _c;
  expect(isClusterSizingReady(noCpu)).toBe(false);
  const { ramUtilizationPercent: _r, ...noRam } = ready;
  void _r;
  expect(isClusterSizingReady(noRam)).toBe(false);
});
