import { describe, it, expect } from 'vitest'
import { aggregateScopes } from '../scopeAggregator'
import type { ClusterImportResult } from '../index'

type ScopeEntry = Omit<ClusterImportResult, 'sourceFormat' | 'detectedScopes' | 'scopeLabels' | 'rawByScope'>

function makeScope(overrides: Partial<ScopeEntry> = {}): ScopeEntry {
  return {
    totalVcpus: 0,
    totalVms: 0,
    totalDiskGb: 0,
    avgRamPerVmGb: 0,
    vmCount: 0,
    warnings: [],
    ...overrides,
  }
}

describe('aggregateScopes', () => {
  it('sums totalVcpus across two scopes', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ totalVcpus: 10, vmCount: 2 })],
      ['CL-B', makeScope({ totalVcpus: 20, vmCount: 3 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.totalVcpus).toBe(30)
  })

  it('sums totalVms across two scopes', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ totalVms: 5, vmCount: 5 })],
      ['CL-B', makeScope({ totalVms: 7, vmCount: 7 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.totalVms).toBe(12)
  })

  it('sums totalDiskGb across two scopes', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ totalDiskGb: 100, vmCount: 2 })],
      ['CL-B', makeScope({ totalDiskGb: 200, vmCount: 3 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.totalDiskGb).toBe(300)
  })

  it('computes avgRamPerVmGb as weighted average across scopes', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ avgRamPerVmGb: 8, vmCount: 2 })],
      ['CL-B', makeScope({ avgRamPerVmGb: 16, vmCount: 2 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    // (8 * 2 + 16 * 2) / 4 = 12
    expect(result.avgRamPerVmGb).toBe(12)
  })

  it('returns single scope data unchanged when only one scope selected', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ totalVcpus: 42, totalVms: 10, totalDiskGb: 500, avgRamPerVmGb: 16, vmCount: 10 })],
      ['CL-B', makeScope({ totalVcpus: 100, vmCount: 5 })],
    ])
    const result = aggregateScopes(map, ['CL-A'])
    expect(result.totalVcpus).toBe(42)
    expect(result.totalVms).toBe(10)
    expect(result.totalDiskGb).toBe(500)
    expect(result.avgRamPerVmGb).toBe(16)
  })

  it('returns zeroed result when selectedKeys is empty', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ totalVcpus: 10, vmCount: 2 })],
    ])
    const result = aggregateScopes(map, [])
    expect(result.totalVcpus).toBe(0)
    expect(result.totalVms).toBe(0)
    expect(result.totalDiskGb).toBe(0)
    expect(result.avgRamPerVmGb).toBe(0)
    expect(result.vmCount).toBe(0)
    expect(result.warnings).toEqual([])
  })

  it('copies ESX fields from first scope that has them defined', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, totalPcores: 64, existingServerCount: 4, socketsPerServer: 2, coresPerSocket: 8, ramPerServerGb: 256 })],
      ['CL-B', makeScope({ vmCount: 3 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.totalPcores).toBe(64)
    expect(result.existingServerCount).toBe(4)
    expect(result.socketsPerServer).toBe(2)
    expect(result.coresPerSocket).toBe(8)
    expect(result.ramPerServerGb).toBe(256)
  })

  it('flattens warnings from all selected scopes', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 1, warnings: ['Warning A1', 'Warning A2'] })],
      ['CL-B', makeScope({ vmCount: 1, warnings: ['Warning B1'] })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.warnings).toContain('Warning A1')
    expect(result.warnings).toContain('Warning A2')
    expect(result.warnings).toContain('Warning B1')
    expect(result.warnings).toHaveLength(3)
  })
})
