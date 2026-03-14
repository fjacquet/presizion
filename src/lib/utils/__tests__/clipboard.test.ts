/**
 * clipboard utils — Unit tests
 * Requirements: EXPO-01
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSummaryText, copyToClipboard } from '../clipboard'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'

const cluster: OldCluster = {
  totalVcpus: 2000,
  totalPcores: 500,
  totalVms: 300,
  totalDiskGb: 50000,
}

const scenario: Scenario = {
  id: 'test-scenario-1',
  name: 'Enterprise 2-socket',
  socketsPerServer: 2,
  coresPerSocket: 24,
  ramPerServerGb: 1024,
  diskPerServerGb: 20000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 16,
  diskPerVmGb: 100,
  headroomPercent: 20,
  haReserveCount: 0 as const,
}

const result: ScenarioResult = {
  cpuLimitedCount: 24,
  ramLimitedCount: 19,
  diskLimitedCount: 12,
  rawCount: 24,
  requiredCount: 24,
  finalCount: 24,
  limitingResource: 'cpu',
  haReserveCount: 0,
  haReserveApplied: false,
  achievedVcpuToPCoreRatio: 4.0,
  vmsPerServer: 12.5,
  cpuUtilizationPercent: 85.0,
  ramUtilizationPercent: 60.0,
  diskUtilizationPercent: 35.0,
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

describe('buildSummaryText', () => {
  it('returns a non-empty string given valid cluster and scenario inputs', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text.length).toBeGreaterThan(0)
  })

  it('includes total vCPUs in the output text', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text).toContain('2000')
  })

  it('includes total VMs in the output text', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text).toContain('300')
  })

  it('includes scenario name in the output text', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text).toContain('Enterprise 2-socket')
  })

  it('includes final server count in the output text', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text).toContain('24')
  })

  it('includes limiting resource in the output text', () => {
    const text = buildSummaryText(cluster, [scenario], [result])
    expect(text).toContain('cpu')
  })
})

describe('copyToClipboard', () => {
  it('calls navigator.clipboard.writeText with the provided text', async () => {
    await copyToClipboard('hello world')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world')
  })

  it('returns a Promise that resolves without error', async () => {
    await expect(copyToClipboard('test')).resolves.toBeUndefined()
  })
})
