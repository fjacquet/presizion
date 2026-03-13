import type { ClusterImportResult } from './index'

export async function parseLiveoptics(
  _buffer: ArrayBuffer,
  _format: 'liveoptics-xlsx' | 'liveoptics-csv',
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  throw new Error('not implemented')
}
