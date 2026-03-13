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

export async function importFile(_file: File): Promise<ClusterImportResult> {
  throw new Error('not implemented')
}
