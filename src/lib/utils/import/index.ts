export interface ClusterImportResult {
  totalVcpus: number
  totalVms: number
  totalDiskGb: number
  avgRamPerVmGb: number
  sourceFormat: 'rvtools' | 'liveoptics-xlsx' | 'liveoptics-csv'
  vmCount: number
  warnings: string[]
}

export { ImportError } from './fileValidation'

import { validateFile, checkMagicBytes } from './fileValidation'
import { detectFormat } from './formatDetector'
import { parseRvtools } from './rvtoolsParser'
import { parseLiveoptics } from './liveopticParser'

export async function importFile(file: File): Promise<ClusterImportResult> {
  validateFile(file)
  const buffer = await file.arrayBuffer()
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
  if (ext !== '.csv') checkMagicBytes(buffer, ext)

  const { format, resolvedBuffer } = await detectFormat(buffer, file.name)

  const partial =
    format === 'rvtools'
      ? await parseRvtools(resolvedBuffer)
      : await parseLiveoptics(resolvedBuffer, format)

  return { ...partial, sourceFormat: format }
}
