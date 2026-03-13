import type { ClusterImportResult } from './index'
import {
  LIVEOPTICS_ALIASES,
  LIVEOPTICS_ESX_HOSTS_ALIASES,
  LIVEOPTICS_ESX_PERF_ALIASES,
  resolveColumns,
} from './columnResolver'
import { ImportError } from './fileValidation'

const REQUIRED = new Set(['vm_name', 'num_cpus'])

interface VmRow {
  [key: string]: unknown
}

function num(row: VmRow, col: string | undefined): number {
  if (!col) return 0
  const v = row[col]
  return typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0
}

function isTruthy(row: VmRow, col: string | undefined): boolean {
  if (!col) return false
  const v = row[col]
  return v === true || v === 'TRUE' || v === 'true' || v === 1
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = wb.Sheets['VMs']
  if (!sheet) throw new ImportError('VMs sheet not found in LiveOptics xlsx.')

  const rows = XLSX.utils.sheet_to_json<VmRow>(sheet, { defval: null })
  const base = aggregate(rows)

  // ESX Hosts sheet → server count, sockets, cores/socket, RAM/server, totalPcores
  const hostsSheet = wb.Sheets['ESX Hosts']
  if (hostsSheet) {
    const hostRows = XLSX.utils.sheet_to_json<VmRow>(hostsSheet, { defval: '' })
    const firstRow = hostRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), LIVEOPTICS_ESX_HOSTS_ALIASES, new Set())
      const hosts = hostRows.filter((r) => String(r[cols['host_name'] ?? ''] ?? '').trim() !== '')
      const firstHost = hosts[0]
      if (firstHost && hosts.length > 0) {
        const sockets = num(firstHost, cols['cpu_sockets'])
        const coresFirst = num(firstHost, cols['cpu_cores'])
        const socketCounts = new Set(hosts.map((h) => num(h, cols['cpu_sockets'])))
        if (socketCounts.size > 1) base.warnings.push('Mixed CPU socket counts detected — using first host as representative.')
        base.existingServerCount = hosts.length
        base.totalPcores = hosts.reduce((s, h) => s + num(h, cols['cpu_cores']), 0)
        base.socketsPerServer = sockets || undefined
        base.coresPerSocket = sockets > 0 ? Math.round(coresFirst / sockets) || undefined : undefined
        base.ramPerServerGb = Math.round(num(firstHost, cols['memory_kib']) / 1024 / 1024) || undefined
      }
    }
  }

  // ESX Performance sheet → average CPU + RAM utilization across hosts
  const perfSheet = wb.Sheets['ESX Performance']
  if (perfSheet) {
    const perfRows = XLSX.utils.sheet_to_json<VmRow>(perfSheet, { defval: '' })
    const firstRow = perfRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), LIVEOPTICS_ESX_PERF_ALIASES, new Set())
      const valid = perfRows.filter((r) => String(r[cols['host_name'] ?? ''] ?? '').trim() !== '')
      if (valid.length > 0) {
        base.cpuUtilizationPercent = Math.round(valid.reduce((s, r) => s + num(r, cols['avg_cpu_pct']), 0) / valid.length)
        base.ramUtilizationPercent = Math.round(valid.reduce((s, r) => s + num(r, cols['avg_mem_pct']), 0) / valid.length)
      }
    }
  }

  return base
}

function parseCsvBuffer(buffer: ArrayBuffer): Omit<ClusterImportResult, 'sourceFormat'> {
  const text = new TextDecoder().decode(buffer)
  const lines = text.split('\n').filter((l) => l.trim())
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: VmRow[] = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: VmRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? null })
    return row
  })
  return aggregate(rows)
}

function aggregate(rows: VmRow[]): Omit<ClusterImportResult, 'sourceFormat'> {
  if (rows.length === 0) return { totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [] }

  const headers = Object.keys(rows[0] ?? {})
  const colMap = resolveColumns(headers, LIVEOPTICS_ALIASES, REQUIRED)

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

  if (vmCount === 0) warnings.push('No non-template VMs found.')

  return {
    totalVcpus,
    totalVms: vmCount,
    totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
    avgRamPerVmGb: vmCount > 0 ? Math.round((totalMemMib / vmCount / 1024) * 10) / 10 : 0,
    vmCount,
    warnings,
  }
}

export async function parseLiveoptics(
  buffer: ArrayBuffer,
  format: 'liveoptics-xlsx' | 'liveoptics-csv',
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  if (format === 'liveoptics-xlsx') return parseXlsx(buffer)
  return parseCsvBuffer(buffer)
}
