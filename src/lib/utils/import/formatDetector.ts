import type { ClusterImportResult } from './index'

export type DetectedFormat = ClusterImportResult['sourceFormat']

export interface DetectionResult {
  format: DetectedFormat
  resolvedBuffer: ArrayBuffer
}

export async function detectFormat(
  _buffer: ArrayBuffer,
  _filename: string,
): Promise<DetectionResult> {
  throw new Error('not implemented')
}
