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

  it('sums totalPcores across two scopes (additive)', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, totalPcores: 64, existingServerCount: 4, socketsPerServer: 2, coresPerSocket: 8, ramPerServerGb: 256 })],
      ['CL-B', makeScope({ vmCount: 3, totalPcores: 96, existingServerCount: 6, socketsPerServer: 2, coresPerSocket: 8, ramPerServerGb: 256 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.totalPcores).toBe(160) // 64 + 96
  })

  it('sums existingServerCount across two scopes (additive)', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, totalPcores: 64, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, totalPcores: 96, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.existingServerCount).toBe(10) // 4 + 6
  })

  it('same ramPerServerGb across scopes -> no warning', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, ramPerServerGb: 256, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, ramPerServerGb: 256, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.ramPerServerGb).toBe(256)
    expect(result.warnings.some((w) => w.includes('Heterogeneous RAM'))).toBe(false)
  })

  it('different ramPerServerGb across scopes -> warning with "Heterogeneous RAM"', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, ramPerServerGb: 256, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, ramPerServerGb: 512, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.ramPerServerGb).toBe(256) // first scope value
    expect(result.warnings.some((w) => w.includes('Heterogeneous RAM'))).toBe(true)
  })

  it('weighted average cpuUtilizationPercent by existingServerCount', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, cpuUtilizationPercent: 40, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, cpuUtilizationPercent: 60, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    // (40*4 + 60*6)/(4+6) = (160 + 360)/10 = 52
    expect(result.cpuUtilizationPercent).toBe(52)
  })

  it('weighted average ramUtilizationPercent by existingServerCount', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, ramUtilizationPercent: 50, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, ramUtilizationPercent: 70, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    // (50*4 + 70*6)/(4+6) = (200 + 420)/10 = 62
    expect(result.ramUtilizationPercent).toBe(62)
  })

  it('single scope selected -> all ESX fields copied unchanged', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, totalPcores: 64, existingServerCount: 4, socketsPerServer: 2, coresPerSocket: 8, ramPerServerGb: 256, cpuUtilizationPercent: 40, ramUtilizationPercent: 50 })],
      ['CL-B', makeScope({ vmCount: 3, totalPcores: 96, existingServerCount: 6, socketsPerServer: 4, coresPerSocket: 12, ramPerServerGb: 512 })],
    ])
    const result = aggregateScopes(map, ['CL-A'])
    expect(result.totalPcores).toBe(64)
    expect(result.existingServerCount).toBe(4)
    expect(result.socketsPerServer).toBe(2)
    expect(result.coresPerSocket).toBe(8)
    expect(result.ramPerServerGb).toBe(256)
    expect(result.cpuUtilizationPercent).toBe(40)
    expect(result.ramUtilizationPercent).toBe(50)
  })

  it('socketsPerServer and coresPerSocket use representative from first scope', () => {
    const map = new Map<string, ScopeEntry>([
      ['CL-A', makeScope({ vmCount: 2, socketsPerServer: 2, coresPerSocket: 8, existingServerCount: 4 })],
      ['CL-B', makeScope({ vmCount: 3, socketsPerServer: 4, coresPerSocket: 12, existingServerCount: 6 })],
    ])
    const result = aggregateScopes(map, ['CL-A', 'CL-B'])
    expect(result.socketsPerServer).toBe(2) // first scope
    expect(result.coresPerSocket).toBe(8) // first scope
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
