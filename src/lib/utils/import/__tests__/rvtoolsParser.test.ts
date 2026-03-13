import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseRvtools } from '../rvtoolsParser'

const MOCK_ROWS = [
  { VM: 'web-01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false },
  { VM: 'db-01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false },
  { VM: 'template-vm', CPUs: 2, Memory: 4096, 'Provisioned MB': 10240, Template: true },
]

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}))

import * as XLSX from 'xlsx'

const MOCK_SHEET = {}
const MOCK_WORKBOOK = { Sheets: { vInfo: MOCK_SHEET }, SheetNames: ['vInfo'] }

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
})
