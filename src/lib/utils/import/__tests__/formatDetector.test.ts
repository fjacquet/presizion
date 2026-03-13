import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectFormat } from '../formatDetector'
import { ImportError } from '../fileValidation'

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}))

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}))

import * as XLSX from 'xlsx'
import JSZip from 'jszip'

function rvtoolsWorkbook() {
  return { SheetNames: ['vInfo', 'vHost'], Sheets: { vInfo: {}, vHost: {} } }
}

function liveopticWorkbook() {
  return { SheetNames: ['VMs', 'Summary'], Sheets: { VMs: {}, Summary: {} } }
}

function unknownWorkbook() {
  return { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }
}

beforeEach(() => {
  vi.mocked(XLSX.read).mockReturnValue(rvtoolsWorkbook() as unknown as ReturnType<typeof XLSX.read>)
})

describe('formatDetector', () => {
  it('detects RVTools xlsx by vInfo sheet name', async () => {
    vi.mocked(XLSX.read).mockReturnValue(rvtoolsWorkbook() as unknown as ReturnType<typeof XLSX.read>)
    const result = await detectFormat(new ArrayBuffer(0), 'export.xlsx')
    expect(result.format).toBe('rvtools')
  })

  it('detects LiveOptics xlsx by VMs sheet name', async () => {
    vi.mocked(XLSX.read).mockReturnValue(liveopticWorkbook() as unknown as ReturnType<typeof XLSX.read>)
    const result = await detectFormat(new ArrayBuffer(0), 'export.xlsx')
    expect(result.format).toBe('liveoptics-xlsx')
  })

  it('detects LiveOptics csv by VM Name header', async () => {
    const csv = 'VM Name,Virtual CPU\nweb-01,4'
    const buf = new TextEncoder().encode(csv).buffer
    const result = await detectFormat(buf, 'export.csv')
    expect(result.format).toBe('liveoptics-csv')
  })

  it('extracts inner xlsx from zip and re-detects format', async () => {
    const innerBuf = new ArrayBuffer(8)
    const mockEntry = { dir: false, name: 'RVTools_export.xlsx', async: vi.fn().mockResolvedValue(innerBuf) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(JSZip.loadAsync).mockResolvedValue({ files: { 'RVTools_export.xlsx': mockEntry } } as any)
    vi.mocked(XLSX.read).mockReturnValue(rvtoolsWorkbook() as unknown as ReturnType<typeof XLSX.read>)
    const result = await detectFormat(new ArrayBuffer(0), 'export.zip')
    expect(result.format).toBe('rvtools')
  })

  it('throws ImportError for xlsx with unknown sheet names', async () => {
    vi.mocked(XLSX.read).mockReturnValue(unknownWorkbook() as unknown as ReturnType<typeof XLSX.read>)
    await expect(detectFormat(new ArrayBuffer(0), 'unknown.xlsx')).rejects.toThrow(ImportError)
  })
})
