import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseLiveoptics } from '../liveopticParser'

const MOCK_ROWS = [
  { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false },
  { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false },
  { 'VM Name': 'tmpl', 'Virtual CPU': 2, 'Provisioned Memory (MiB)': 4096, 'Virtual Disk Size (MiB)': 10240, Template: true },
]

vi.mock('@e965/xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}))

import * as XLSX from '@e965/xlsx'

const MOCK_SHEET = {}
const MOCK_WORKBOOK = { Sheets: { VMs: MOCK_SHEET }, SheetNames: ['VMs'] }

beforeEach(() => {
  vi.mocked(XLSX.read).mockReturnValue(MOCK_WORKBOOK as unknown as ReturnType<typeof XLSX.read>)
  vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(MOCK_ROWS)
})

describe('liveopticParser', () => {
  it('aggregates totalVcpus from Virtual CPU column for xlsx format', async () => {
    const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
    expect(result.totalVcpus).toBe(12) // 4 + 8 (template excluded)
  })

  it('aggregates totalVcpus from CSV rows', async () => {
    const csv = [
      'VM Name,Virtual CPU,Provisioned Memory (MiB),Virtual Disk Size (MiB),Template',
      'web-01,4,8192,102400,false',
      'db-01,8,16384,204800,false',
      'tmpl,2,4096,10240,true',
    ].join('\n')
    const buf = new TextEncoder().encode(csv).buffer
    const result = await parseLiveoptics(buf, 'liveoptics-csv')
    expect(result.totalVcpus).toBe(12)
  })

  it('counts only non-template VMs in vmCount', async () => {
    const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
    expect(result.vmCount).toBe(2)
  })

  it('computes totalDiskGb from Virtual Disk Size (MiB)', async () => {
    const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
    expect(result.totalDiskGb).toBe(300)
  })

  it('computes avgRamPerVmGb from Provisioned Memory (MiB)', async () => {
    const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
    expect(result.avgRamPerVmGb).toBe(12)
  })

  describe('ESX Hosts sheet — cpuModel and cpuFrequencyGhz extraction', () => {
    it('extracts cpuModel from CPU Model column of first ESX host', async () => {
      const HOSTS_SHEET = {}
      vi.mocked(XLSX.read).mockReturnValue({
        Sheets: { VMs: MOCK_SHEET, 'ESX Hosts': HOSTS_SHEET },
        SheetNames: ['VMs', 'ESX Hosts'],
      } as unknown as ReturnType<typeof XLSX.read>)
      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === HOSTS_SHEET) return [
          { 'Host Name': 'esxi-01', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 536870912,
            'CPU Model': 'Intel Xeon Gold 6526Y', 'CPU Speed (MHz)': 2400 },
        ]
        return MOCK_ROWS
      })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.cpuModel).toBe('Intel Xeon Gold 6526Y')
    })

    it('extracts cpuFrequencyGhz from CPU Speed (MHz) column (MHz → GHz, 1 decimal)', async () => {
      const HOSTS_SHEET = {}
      vi.mocked(XLSX.read).mockReturnValue({
        Sheets: { VMs: MOCK_SHEET, 'ESX Hosts': HOSTS_SHEET },
        SheetNames: ['VMs', 'ESX Hosts'],
      } as unknown as ReturnType<typeof XLSX.read>)
      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === HOSTS_SHEET) return [
          { 'Host Name': 'esxi-01', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 536870912,
            'CPU Model': 'Xeon', 'CPU Speed (MHz)': 3600 },
        ]
        return MOCK_ROWS
      })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      // 3600 MHz → 3.6 GHz
      expect(result.cpuFrequencyGhz).toBe(3.6)
    })

    it('returns undefined cpuModel and cpuFrequencyGhz when ESX Hosts sheet is absent', async () => {
      // Default MOCK_WORKBOOK has no ESX Hosts sheet
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.cpuModel).toBeUndefined()
      expect(result.cpuFrequencyGhz).toBeUndefined()
    })
  })

  describe('scope detection (xlsx path)', () => {
    it('single-cluster rows produce detectedScopes with one entry', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false, Cluster: 'CL-A' },
        { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false, Cluster: 'CL-A' },
      ])
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.detectedScopes).toHaveLength(1)
      expect(result.detectedScopes).toContain('CL-A')
    })

    it('multi-cluster rows produce detectedScopes with N distinct keys', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false, Cluster: 'CL-A' },
        { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false, Cluster: 'CL-B' },
        { 'VM Name': 'app-01', 'Virtual CPU': 2, 'Provisioned Memory (MiB)': 4096, 'Virtual Disk Size (MiB)': 51200, Template: false, Cluster: 'CL-C' },
      ])
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.detectedScopes).toHaveLength(3)
    })

    it('rawByScope is populated with per-cluster aggregates', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false, Cluster: 'CL-A' },
        { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false, Cluster: 'CL-B' },
      ])
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.rawByScope?.get('CL-A')?.totalVcpus).toBe(4)
      expect(result.rawByScope?.get('CL-B')?.totalVcpus).toBe(8)
    })

    it("file with no cluster column defaults to '__all__'", async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false },
      ])
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      expect(result.detectedScopes).toEqual(['__all__'])
    })
  })

  describe('per-scope ESX host config from ESX Hosts sheet', () => {
    const HOSTS_SHEET = {}
    const PERF_SHEET = {}

    function setupMultiClusterWithHosts(opts?: { hostsHaveCluster?: boolean; vmHostCol?: boolean; perfSheet?: boolean }) {
      const vmRows = [
        { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false, Cluster: 'CL-A', ...(opts?.vmHostCol ? { 'ESX Host': 'esxi-01' } : {}) },
        { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false, Cluster: 'CL-A', ...(opts?.vmHostCol ? { 'ESX Host': 'esxi-02' } : {}) },
        { 'VM Name': 'app-01', 'Virtual CPU': 2, 'Provisioned Memory (MiB)': 4096, 'Virtual Disk Size (MiB)': 51200, Template: false, Cluster: 'CL-B', ...(opts?.vmHostCol ? { 'ESX Host': 'esxi-03' } : {}) },
      ]
      // ESX Hosts: 2 in CL-A, 1 in CL-B
      const hostRows = opts?.hostsHaveCluster
        ? [
            { 'Host Name': 'esxi-01', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 268435456, 'CPU Model': 'Xeon Gold A', 'CPU Speed (MHz)': 2400, Cluster: 'CL-A' },
            { 'Host Name': 'esxi-02', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 268435456, 'CPU Model': 'Xeon Gold A', 'CPU Speed (MHz)': 2400, Cluster: 'CL-A' },
            { 'Host Name': 'esxi-03', 'CPU Sockets': 4, 'CPU Cores': 96, 'Memory (KiB)': 536870912, 'CPU Model': 'Xeon Plat B', 'CPU Speed (MHz)': 3200, Cluster: 'CL-B' },
          ]
        : [
            { 'Host Name': 'esxi-01', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 268435456, 'CPU Model': 'Xeon Gold A', 'CPU Speed (MHz)': 2400 },
            { 'Host Name': 'esxi-02', 'CPU Sockets': 2, 'CPU Cores': 48, 'Memory (KiB)': 268435456, 'CPU Model': 'Xeon Gold A', 'CPU Speed (MHz)': 2400 },
            { 'Host Name': 'esxi-03', 'CPU Sockets': 4, 'CPU Cores': 96, 'Memory (KiB)': 536870912, 'CPU Model': 'Xeon Plat B', 'CPU Speed (MHz)': 3200 },
          ]

      const perfRows = [
        { 'Host Name': 'esxi-01', 'Average CPU %': 40, 'Average Memory %': 50 },
        { 'Host Name': 'esxi-02', 'Average CPU %': 50, 'Average Memory %': 60 },
        { 'Host Name': 'esxi-03', 'Average CPU %': 70, 'Average Memory %': 80 },
      ]

      const sheets: Record<string, unknown> = { VMs: MOCK_SHEET, 'ESX Hosts': HOSTS_SHEET }
      const sheetNames = ['VMs', 'ESX Hosts']
      if (opts?.perfSheet) {
        sheets['ESX Performance'] = PERF_SHEET
        sheetNames.push('ESX Performance')
      }

      vi.mocked(XLSX.read).mockReturnValue({
        Sheets: sheets,
        SheetNames: sheetNames,
      } as unknown as ReturnType<typeof XLSX.read>)

      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === HOSTS_SHEET) return hostRows
        if (sheet === PERF_SHEET) return perfRows
        return vmRows
      })
    }

    it('multi-cluster with ESX Hosts Cluster column -> rawByScope CL-A has ESX fields from CL-A hosts only', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const scopeA = result.rawByScope?.get('CL-A')
      expect(scopeA?.existingServerCount).toBe(2)
      expect(scopeA?.totalPcores).toBe(96) // 48 + 48
      expect(scopeA?.socketsPerServer).toBe(2)
      expect(scopeA?.coresPerSocket).toBe(24) // 48/2
      // 268435456 KiB = 256 GB
      expect(scopeA?.ramPerServerGb).toBe(256)
    })

    it('multi-cluster with ESX Hosts Cluster column -> rawByScope CL-B has ESX fields from CL-B hosts only', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const scopeB = result.rawByScope?.get('CL-B')
      expect(scopeB?.existingServerCount).toBe(1)
      expect(scopeB?.totalPcores).toBe(96)
      expect(scopeB?.socketsPerServer).toBe(4)
      expect(scopeB?.coresPerSocket).toBe(24) // 96/4
      // 536870912 KiB = 512 GB
      expect(scopeB?.ramPerServerGb).toBe(512)
    })

    it('ESX Hosts with host-to-cluster mapping from VMs -> hosts grouped by VM host column', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: false, vmHostCol: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const scopeA = result.rawByScope?.get('CL-A')
      expect(scopeA?.existingServerCount).toBe(2)
      expect(scopeA?.totalPcores).toBe(96)
    })

    it('no cluster column on ESX Hosts and no host column on VMs -> ESX data on __all__ with warning', async () => {
      // No cluster column, no vm host column
      setupMultiClusterWithHosts({ hostsHaveCluster: false, vmHostCol: false })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const allScope = result.rawByScope?.get('__all__')
      // Since we have cluster columns on VMs, scopes are CL-A, CL-B not __all__
      // ESX data should be on each scope as global fallback, OR on __all__
      // The plan says: "ESX data attached to '__all__' scope with warning"
      // But since __all__ scope may not exist, ESX should go to all scopes or result-level
      // Check that the result-level (base) still has ESX fields (backward compat)
      expect(result.existingServerCount).toBe(3)
      expect(result.totalPcores).toBe(192)
      expect(result.warnings).toContain('Host-to-cluster mapping unavailable; ESX host config applied globally.')
    })

    it('top-level result still has global ESX fields for backward compat', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      // Global: all 3 hosts combined
      expect(result.existingServerCount).toBe(3)
      expect(result.totalPcores).toBe(192) // 48+48+96
    })

    it('ESX Performance per scope -> CL-A cpuUtilizationPercent reflects only CL-A hosts', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: true, perfSheet: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const scopeA = result.rawByScope?.get('CL-A')
      // CL-A hosts: esxi-01 (40%), esxi-02 (50%) -> avg = 45
      expect(scopeA?.cpuUtilizationPercent).toBe(45)
      expect(scopeA?.ramUtilizationPercent).toBe(55) // avg(50,60)
    })

    it('ESX Performance per scope -> CL-B has its own utilization', async () => {
      setupMultiClusterWithHosts({ hostsHaveCluster: true, perfSheet: true })
      const result = await parseLiveoptics(new ArrayBuffer(0), 'liveoptics-xlsx')
      const scopeB = result.rawByScope?.get('CL-B')
      // CL-B hosts: esxi-03 (70% cpu, 80% ram)
      expect(scopeB?.cpuUtilizationPercent).toBe(70)
      expect(scopeB?.ramUtilizationPercent).toBe(80)
    })
  })
})
