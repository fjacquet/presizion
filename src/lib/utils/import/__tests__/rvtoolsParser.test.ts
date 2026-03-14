import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseRvtools } from '../rvtoolsParser'

const MOCK_ROWS = [
  { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false },
  { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false },
  { VM: 'template-vm', CPUs: 2, Memory: 4096, 'Provisioned MB': 10240, Template: true },
]

vi.mock('@e965/xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}))

import * as XLSX from '@e965/xlsx'

const MOCK_SHEET = {}
const MOCK_VHOST_SHEET = {}
const MOCK_WORKBOOK = { Sheets: { vInfo: MOCK_SHEET }, SheetNames: ['vInfo'] }
const MOCK_WORKBOOK_WITH_VHOST = {
  Sheets: { vInfo: MOCK_SHEET, vHost: MOCK_VHOST_SHEET },
  SheetNames: ['vInfo', 'vHost'],
}

const MOCK_VHOST_ROWS = [
  { Host: 'esxi-01', 'CPU Model': 'Intel Xeon Gold 6526Y', 'Speed MHz': 2400 },
  { Host: 'esxi-02', 'CPU Model': 'Intel Xeon Gold 6526Y', 'Speed MHz': 2400 },
]

beforeEach(() => {
  vi.mocked(XLSX.read).mockReturnValue(MOCK_WORKBOOK as unknown as ReturnType<typeof XLSX.read>)
  vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(MOCK_ROWS)
})

describe('rvtoolsParser', () => {
  it('aggregates totalVcpus from num_cpus column', async () => {
    const result = await parseRvtools(new ArrayBuffer(0))
    expect(result.totalVcpus).toBe(12) // 4 + 8 (template excluded)
  })

  it('counts only non-template VMs in vmCount', async () => {
    const result = await parseRvtools(new ArrayBuffer(0))
    expect(result.vmCount).toBe(2)
    expect(result.totalVms).toBe(2)
  })

  it('computes totalDiskGb as sum of provisioned_mib / 1024', async () => {
    const result = await parseRvtools(new ArrayBuffer(0))
    // (102400 + 204800) / 1024 = 300
    expect(result.totalDiskGb).toBe(300)
  })

  it('computes avgRamPerVmGb as sum of memory_mib / vmCount / 1024', async () => {
    const result = await parseRvtools(new ArrayBuffer(0))
    // (8192 + 16384) / 2 / 1024 = 12
    expect(result.avgRamPerVmGb).toBe(12)
  })

  it('returns zero totalDiskGb when provisioned_mib column is absent', async () => {
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { VM: 'web-01', CPUs: 4, Memory: 8192, Template: false },
    ])
    const result = await parseRvtools(new ArrayBuffer(0))
    expect(result.totalDiskGb).toBe(0)
  })

  it('handles secondary column alias for num_cpus (Num CPUs)', async () => {
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { 'VM Name': 'web-01', 'Num CPUs': 6, Memory: 8192, Template: false },
    ])
    const result = await parseRvtools(new ArrayBuffer(0))
    expect(result.totalVcpus).toBe(6)
  })

  describe('vHost sheet — cpuModel and cpuFrequencyGhz extraction', () => {
    beforeEach(() => {
      vi.mocked(XLSX.read).mockReturnValue(MOCK_WORKBOOK_WITH_VHOST as unknown as ReturnType<typeof XLSX.read>)
      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === MOCK_VHOST_SHEET) return MOCK_VHOST_ROWS
        return MOCK_ROWS
      })
    })

    it('extracts cpuModel from first vHost row CPU Model column', async () => {
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.cpuModel).toBe('Intel Xeon Gold 6526Y')
    })

    it('extracts cpuFrequencyGhz as average Speed MHz / 1000 (1 decimal)', async () => {
      const result = await parseRvtools(new ArrayBuffer(0))
      // 2400 MHz → 2.4 GHz
      expect(result.cpuFrequencyGhz).toBe(2.4)
    })

    it('returns undefined cpuModel and cpuFrequencyGhz when vHost sheet is absent', async () => {
      vi.mocked(XLSX.read).mockReturnValue(MOCK_WORKBOOK as unknown as ReturnType<typeof XLSX.read>)
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(MOCK_ROWS)
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.cpuModel).toBeUndefined()
      expect(result.cpuFrequencyGhz).toBeUndefined()
    })

    it('averages Speed MHz across all hosts when values differ', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === MOCK_VHOST_SHEET) return [
          { Host: 'esxi-01', 'CPU Model': 'Xeon Silver', 'Speed MHz': 2000 },
          { Host: 'esxi-02', 'CPU Model': 'Xeon Silver', 'Speed MHz': 3000 },
        ]
        return MOCK_ROWS
      })
      const result = await parseRvtools(new ArrayBuffer(0))
      // avg(2000, 3000) = 2500 MHz → 2.5 GHz
      expect(result.cpuFrequencyGhz).toBe(2.5)
    })
  })

  describe('scope detection', () => {
    it('single-cluster file produces detectedScopes with one entry', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A' },
        { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'CL-A' },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.detectedScopes).toHaveLength(1)
      expect(result.detectedScopes).toContain('CL-A')
    })

    it('multi-cluster file produces detectedScopes with one key per cluster', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A' },
        { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'CL-B' },
        { VM: 'app-01', CPUs: 2, Memory: 4096, 'Provisioned MB': 51200, Template: false, Cluster: 'CL-A' },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.detectedScopes).toHaveLength(2)
      expect(result.detectedScopes).toContain('CL-A')
      expect(result.detectedScopes).toContain('CL-B')
    })

    it('rawByScope contains independent vcpu totals per cluster', async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A' },
        { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'CL-B' },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.rawByScope?.get('CL-A')?.totalVcpus).toBe(4)
      expect(result.rawByScope?.get('CL-B')?.totalVcpus).toBe(8)
    })

    it("file with no cluster column produces detectedScopes: ['__all__'] and scopeLabels: { __all__: 'All' }", async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.detectedScopes).toEqual(['__all__'])
      expect(result.scopeLabels).toEqual({ __all__: 'All' })
    })

    it("file with both Cluster and Datacenter columns uses '${dc}||${cluster}' scope key", async () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A', Datacenter: 'DC1' },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.detectedScopes).toContain('DC1||CL-A')
    })
  })

  describe('per-scope vHost config', () => {
    const VHOST_SHEET_2 = {}

    function setupMultiClusterVHost() {
      const vInfoRows = [
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A', Host: 'esxi-01' },
        { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'CL-A', Host: 'esxi-02' },
        { VM: 'app-01', CPUs: 2, Memory: 4096, 'Provisioned MB': 51200, Template: false, Cluster: 'CL-B', Host: 'esxi-03' },
      ]
      // vHost rows with # CPU (sockets), # Cores, Memory Size (MB)
      const vHostRows = [
        { Host: 'esxi-01', '# CPU': 2, '# Cores': 48, 'CPU Model': 'Xeon Gold A', 'Speed MHz': 2400, 'Memory Size': 262144, Cluster: 'CL-A' },
        { Host: 'esxi-02', '# CPU': 2, '# Cores': 48, 'CPU Model': 'Xeon Gold A', 'Speed MHz': 2400, 'Memory Size': 262144, Cluster: 'CL-A' },
        { Host: 'esxi-03', '# CPU': 4, '# Cores': 96, 'CPU Model': 'Xeon Plat B', 'Speed MHz': 3200, 'Memory Size': 524288, Cluster: 'CL-B' },
      ]

      vi.mocked(XLSX.read).mockReturnValue({
        Sheets: { vInfo: MOCK_SHEET, vHost: VHOST_SHEET_2 },
        SheetNames: ['vInfo', 'vHost'],
      } as unknown as ReturnType<typeof XLSX.read>)

      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === VHOST_SHEET_2) return vHostRows
        return vInfoRows
      })
    }

    it('vHost sheet with sockets/cores/memory -> rawByScope CL-A gets host config', async () => {
      setupMultiClusterVHost()
      const result = await parseRvtools(new ArrayBuffer(0))
      const scopeA = result.rawByScope?.get('CL-A')
      expect(scopeA?.existingServerCount).toBe(2)
      expect(scopeA?.totalPcores).toBe(96) // 48 + 48
      expect(scopeA?.socketsPerServer).toBe(2)
      expect(scopeA?.coresPerSocket).toBe(24) // 48 / 2
      // 262144 MB = 256 GB
      expect(scopeA?.ramPerServerGb).toBe(256)
    })

    it('vHost with multi-cluster -> each scope has its own host config', async () => {
      setupMultiClusterVHost()
      const result = await parseRvtools(new ArrayBuffer(0))
      const scopeB = result.rawByScope?.get('CL-B')
      expect(scopeB?.existingServerCount).toBe(1)
      expect(scopeB?.totalPcores).toBe(96)
      expect(scopeB?.socketsPerServer).toBe(4)
      expect(scopeB?.coresPerSocket).toBe(24) // 96 / 4
      // 524288 MB = 512 GB
      expect(scopeB?.ramPerServerGb).toBe(512)
    })

    it('vHost absent -> no host config on any scope', async () => {
      // Default MOCK_WORKBOOK has no vHost sheet
      vi.mocked(XLSX.read).mockReturnValue(MOCK_WORKBOOK as unknown as ReturnType<typeof XLSX.read>)
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A' },
      ])
      const result = await parseRvtools(new ArrayBuffer(0))
      const scopeA = result.rawByScope?.get('CL-A')
      expect(scopeA?.existingServerCount).toBeUndefined()
      expect(scopeA?.totalPcores).toBeUndefined()
    })

    it('vHost host-to-cluster mapping from vInfo Host column when vHost has no Cluster column', async () => {
      const vInfoRows = [
        { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'CL-A', Host: 'esxi-01' },
        { VM: 'app-01', CPUs: 2, Memory: 4096, 'Provisioned MB': 51200, Template: false, Cluster: 'CL-B', Host: 'esxi-02' },
      ]
      const vHostRows = [
        { Host: 'esxi-01', '# CPU': 2, '# Cores': 48, 'CPU Model': 'Xeon Gold', 'Speed MHz': 2400, 'Memory Size': 262144 },
        { Host: 'esxi-02', '# CPU': 4, '# Cores': 96, 'CPU Model': 'Xeon Plat', 'Speed MHz': 3200, 'Memory Size': 524288 },
      ]

      vi.mocked(XLSX.read).mockReturnValue({
        Sheets: { vInfo: MOCK_SHEET, vHost: VHOST_SHEET_2 },
        SheetNames: ['vInfo', 'vHost'],
      } as unknown as ReturnType<typeof XLSX.read>)

      vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((sheet) => {
        if (sheet === VHOST_SHEET_2) return vHostRows
        return vInfoRows
      })

      const result = await parseRvtools(new ArrayBuffer(0))
      expect(result.rawByScope?.get('CL-A')?.existingServerCount).toBe(1)
      expect(result.rawByScope?.get('CL-A')?.totalPcores).toBe(48)
      expect(result.rawByScope?.get('CL-B')?.existingServerCount).toBe(1)
      expect(result.rawByScope?.get('CL-B')?.totalPcores).toBe(96)
    })
  })
})
