import type { ClusterImportResult } from './index'

export async function parseRvtools(
  _buffer: ArrayBuffer,
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  throw new Error('not implemented')
}
