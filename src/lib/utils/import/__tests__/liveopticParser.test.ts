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
})
