import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseLiveoptics } from '../liveopticParser'

const MOCK_ROWS = [
  { 'VM Name': 'web-01', 'Virtual CPU': 4, 'Provisioned Memory (MiB)': 8192, 'Virtual Disk Size (MiB)': 102400, Template: false },
  { 'VM Name': 'db-01', 'Virtual CPU': 8, 'Provisioned Memory (MiB)': 16384, 'Virtual Disk Size (MiB)': 204800, Template: false },
  { 'VM Name': 'tmpl', 'Virtual CPU': 2, 'Provisioned Memory (MiB)': 4096, 'Virtual Disk Size (MiB)': 10240, Template: true },
]

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}))

import * as XLSX from 'xlsx'

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
})
