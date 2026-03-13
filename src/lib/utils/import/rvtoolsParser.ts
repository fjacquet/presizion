import type { ClusterImportResult } from './index'
import { RVTOOLS_ALIASES, resolveColumns } from './columnResolver'

const REQUIRED = new Set(['vm_name', 'num_cpus'])

interface VInfoRow {
  [key: string]: unknown
}

function num(row: VInfoRow, col: string | undefined): number {
  if (!col) return 0
  const v = row[col]
  return typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0
}

function isTruthy(row: VInfoRow, col: string | undefined): boolean {
  if (!col) return false
  const v = row[col]
  return v === true || v === 'TRUE' || v === 'true' || v === 1
}

export async function parseRvtools(
  buffer: ArrayBuffer,
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  const XLSX = await import('@e965/xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = wb.Sheets['vInfo']
  if (!sheet) throw new Error('vInfo sheet not found')

  const rows = XLSX.utils.sheet_to_json<VInfoRow>(sheet, { defval: null })
  if (rows.length === 0) return { totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [] }

  const headers = Object.keys(rows[0] ?? {})
  const colMap = resolveColumns(headers, RVTOOLS_ALIASES, REQUIRED)

  let totalVcpus = 0
  let totalMemMib = 0
  let totalDiskMib = 0
  let vmCount = 0
  const warnings: string[] = []

  for (const row of rows) {
    if (isTruthy(row, colMap['is_template'])) continue
    vmCount++
    totalVcpus += num(row, colMap['num_cpus'])
    totalMemMib += num(row, colMap['memory_mib'])
    totalDiskMib += num(row, colMap['provisioned_mib'])
  }

  if (vmCount === 0) warnings.push('No non-template VMs found in vInfo sheet.')

  return {
    totalVcpus,
    totalVms: vmCount,
    totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
    avgRamPerVmGb: vmCount > 0 ? Math.round((totalMemMib / vmCount / 1024) * 10) / 10 : 0,
    vmCount,
    warnings,
  }
}
