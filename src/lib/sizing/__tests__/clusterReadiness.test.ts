import { isClusterSizingReady } from '../clusterReadiness'
import type { OldCluster } from '../../../types/cluster'

const ready: OldCluster = {
  totalVcpus: 10, totalPcores: 4, totalVms: 5,
  cpuUtilizationPercent: 55, ramUtilizationPercent: 60,
}

it('is ready only when both utilizations are present', () => {
  expect(isClusterSizingReady(ready)).toBe(true)
  const { cpuUtilizationPercent: _c, ...noCpu } = ready
  expect(isClusterSizingReady(noCpu)).toBe(false)
  const { ramUtilizationPercent: _r, ...noRam } = ready
  expect(isClusterSizingReady(noRam)).toBe(false)
})
