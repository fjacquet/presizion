export interface ClusterImportResult {
  totalVcpus: number
  totalVms: number
  totalDiskGb: number
  avgRamPerVmGb: number
  sourceFormat: 'rvtools' | 'liveoptics-xlsx' | 'liveoptics-csv'
  vmCount: number
  warnings: string[]
  // Populated when ESX-level sheets are available (LiveOptics xlsx, RVTools with vHost)
  totalPcores?: number
  existingServerCount?: number
  socketsPerServer?: number
  coresPerSocket?: number
  ramPerServerGb?: number
  cpuUtilizationPercent?: number
  ramUtilizationPercent?: number
}

export { ImportError } from './fileValidation'
export type { JsonImportResult } from './jsonParser'

import { validateFile, checkMagicBytes } from './fileValidation'
import { detectFormat } from './formatDetector'
import { parseRvtools } from './rvtoolsParser'
import { parseLiveoptics } from './liveopticParser'
import { parsePresizionJson } from './jsonParser'
import type { JsonImportResult } from './jsonParser'

export type AnyImportResult = ClusterImportResult | JsonImportResult

export async function importFile(file: File): Promise<AnyImportResult> {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()

  if (ext === '.json') {
    const buffer = await file.arrayBuffer()
    return parsePresizionJson(buffer)
  }

  validateFile(file)
  const buffer = await file.arrayBuffer()
  if (ext !== '.csv') checkMagicBytes(buffer, ext)

  const { format, resolvedBuffer } = await detectFormat(buffer, file.name)

  const partial =
    format === 'rvtools'
      ? await parseRvtools(resolvedBuffer)
      : await parseLiveoptics(resolvedBuffer, format)

  return { ...partial, sourceFormat: format }
}
