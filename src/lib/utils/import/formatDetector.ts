import { ImportError } from './fileValidation'
import type { ClusterImportResult } from './index'

export type DetectedFormat = ClusterImportResult['sourceFormat']

export interface DetectionResult {
  format: DetectedFormat
  resolvedBuffer: ArrayBuffer
}

async function detectXlsx(buffer: ArrayBuffer): Promise<DetectionResult> {
  const XLSX = await import('@e965/xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  if (wb.SheetNames.includes('vInfo')) return { format: 'rvtools', resolvedBuffer: buffer }
  if (wb.SheetNames.includes('VMs')) return { format: 'liveoptics-xlsx', resolvedBuffer: buffer }
  throw new ImportError(
    `Unrecognised xlsx format. Expected a sheet named "vInfo" (RVTools) or "VMs" (LiveOptics). Found: ${wb.SheetNames.join(', ')}`,
  )
}

async function detectZip(buffer: ArrayBuffer): Promise<DetectionResult> {
  const JSZip = (await import('jszip')).default
  const XLSX = await import('@e965/xlsx')
  const zip = await JSZip.loadAsync(buffer)

  const xlsxEntries = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.toLowerCase().endsWith('.xlsx'),
  )
  if (xlsxEntries.length === 0) throw new ImportError('No .xlsx file found inside the zip archive.')

  // Rank xlsx files: prefer ESX-level data (VMWARE type) > VM-only (GENERAL type) > unknown (AIR/other)
  let bestBuffer: ArrayBuffer | null = null
  let bestScore = -1

  for (const entry of xlsxEntries) {
    const buf = await entry.async('arraybuffer')
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const score = wb.SheetNames.includes('vInfo') ? 3         // RVTools
      : wb.SheetNames.includes('ESX Hosts') ? 2               // LiveOptics VMWARE
      : wb.SheetNames.includes('VMs') ? 1                     // LiveOptics GENERAL
      : 0                                                      // AIR or unknown
    if (score > bestScore) { bestScore = score; bestBuffer = buf }
  }

  if (!bestBuffer || bestScore === 0) {
    throw new ImportError('No suitable xlsx found in zip. Expected RVTools (vInfo sheet) or LiveOptics (VMs or ESX Hosts sheet).')
  }
  return detectXlsx(bestBuffer)
}

function detectCsv(buffer: ArrayBuffer): DetectionResult {
  const sample = new TextDecoder().decode(buffer.slice(0, 2048))
  const firstLine = sample.split('\n')[0] ?? ''
  if (firstLine.includes('VM Name') || firstLine.includes('VM OS')) {
    return { format: 'liveoptics-csv', resolvedBuffer: buffer }
  }
  throw new ImportError('Unrecognised CSV format. Expected LiveOptics CSV with "VM Name" header.')
}

export async function detectFormat(
  buffer: ArrayBuffer,
  filename: string,
): Promise<DetectionResult> {
  const ext = '.' + (filename.split('.').pop() ?? '').toLowerCase()
  if (ext === '.zip') return detectZip(buffer)
  if (ext === '.xlsx') return detectXlsx(buffer)
  if (ext === '.csv') return detectCsv(buffer)
  throw new ImportError(`Unsupported extension "${ext}"`)
}
