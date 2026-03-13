import { ImportError } from './fileValidation'
import type { ClusterImportResult } from './index'

export type DetectedFormat = ClusterImportResult['sourceFormat']

export interface DetectionResult {
  format: DetectedFormat
  resolvedBuffer: ArrayBuffer
}

async function detectXlsx(buffer: ArrayBuffer): Promise<DetectionResult> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  if (wb.SheetNames.includes('vInfo')) return { format: 'rvtools', resolvedBuffer: buffer }
  if (wb.SheetNames.includes('VMs')) return { format: 'liveoptics-xlsx', resolvedBuffer: buffer }
  throw new ImportError(
    `Unrecognised xlsx format. Expected a sheet named "vInfo" (RVTools) or "VMs" (LiveOptics). Found: ${wb.SheetNames.join(', ')}`,
  )
}

async function detectZip(buffer: ArrayBuffer): Promise<DetectionResult> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const xlsxEntry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.toLowerCase().endsWith('.xlsx'),
  )
  if (!xlsxEntry) {
    throw new ImportError('No .xlsx file found inside the zip archive.')
  }
  const innerBuffer = await xlsxEntry.async('arraybuffer')
  return detectXlsx(innerBuffer)
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
