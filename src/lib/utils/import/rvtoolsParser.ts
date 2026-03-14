import type { ClusterImportResult, ScopeData } from './index'
import { RVTOOLS_ALIASES, RVTOOLS_VHOST_ALIASES, CLUSTER_ALIASES, DATACENTER_ALIASES, resolveColumns } from './columnResolver'

const REQUIRED = new Set(['vm_name', 'num_cpus'])

/** Host column aliases on vInfo sheet for host-to-cluster mapping */
const VINFO_HOST_ALIASES: Record<string, string[]> = {
  host_name: ['Host', 'Host Name', 'ESX Host'],
}

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

function str(row: VInfoRow, col: string | undefined): string {
  if (!col) return ''
  const v = row[col]
  return v == null ? '' : String(v).trim()
}

function buildScopeLabel(scopeKey: string): string {
  if (scopeKey === '__all__') return 'All'
  if (scopeKey.includes('||')) {
    const [dc, cluster] = scopeKey.split('||')
    return `${cluster} (${dc})`
  }
  return scopeKey
}

interface ScopeAccum {
  totalVcpus: number
  totalMemMib: number
  totalDiskMib: number
  vmCount: number
}

/** Compute ESX fields for a group of vHost rows */
function computeVhostEsxFields(hosts: VInfoRow[], cols: Record<string, string | undefined>): Partial<ScopeData> {
  if (hosts.length === 0) return {}
  const firstHost = hosts[0]!
  const sockets = num(firstHost, cols['cpu_sockets'])
  const coresTotal = num(firstHost, cols['cpu_cores_total'])
  const fields: Partial<ScopeData> = {
    existingServerCount: hosts.length,
    totalPcores: hosts.reduce((s, h) => s + num(h, cols['cpu_cores_total']), 0),
  }
  if (sockets) fields.socketsPerServer = sockets
  const derivedCores = sockets > 0 ? Math.round(coresTotal / sockets) : 0
  if (derivedCores) fields.coresPerSocket = derivedCores
  // RVTools vHost Memory is in MB -> divide by 1024 to get GB
  const memMb = num(firstHost, cols['memory_mb'])
  const ramGb = Math.round(memMb / 1024)
  if (ramGb) fields.ramPerServerGb = ramGb
  const model = str(firstHost, cols['cpu_model'])
  if (model) fields.cpuModel = model
  const speedMhz = num(firstHost, cols['cpu_speed_mhz'])
  if (speedMhz > 0) fields.cpuFrequencyGhz = Math.round(speedMhz / 100) / 10
  return fields
}

export async function parseRvtools(
  buffer: ArrayBuffer,
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  const XLSX = await import('@e965/xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = wb.Sheets['vInfo']
  if (!sheet) throw new Error('vInfo sheet not found')

  const rows = XLSX.utils.sheet_to_json<VInfoRow>(sheet, { defval: null })
  if (rows.length === 0) return {
    totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [],
    detectedScopes: ['__all__'], scopeLabels: { __all__: 'All' }, rawByScope: new Map(),
  }

  const headers = Object.keys(rows[0] ?? {})
  const colMap = resolveColumns(headers, RVTOOLS_ALIASES, REQUIRED)
  const colMapCluster = resolveColumns(headers, CLUSTER_ALIASES, new Set())
  const colMapDc = resolveColumns(headers, DATACENTER_ALIASES, new Set())
  const colMapHost = resolveColumns(headers, VINFO_HOST_ALIASES, new Set())

  let totalVcpus = 0
  let totalMemMib = 0
  let totalDiskMib = 0
  let vmCount = 0
  const warnings: string[] = []

  const scopeMap = new Map<string, ScopeAccum>()
  const hostToCluster = new Map<string, string>()

  for (const row of rows) {
    if (isTruthy(row, colMap['is_template'])) continue
    vmCount++
    const cpus = num(row, colMap['num_cpus'])
    const mem = num(row, colMap['memory_mib'])
    const disk = num(row, colMap['provisioned_mib'])
    totalVcpus += cpus
    totalMemMib += mem
    totalDiskMib += disk

    const cluster = str(row, colMapCluster['cluster_name'])
    const dc = str(row, colMapDc['datacenter_name'])
    const scopeKey = dc && cluster ? `${dc}||${cluster}` : cluster ? cluster : '__all__'

    // Build host-to-cluster mapping from vInfo rows
    const hostName = str(row, colMapHost['host_name'])
    if (hostName && scopeKey !== '__all__') {
      hostToCluster.set(hostName, scopeKey)
    }

    const existing = scopeMap.get(scopeKey) ?? { totalVcpus: 0, totalMemMib: 0, totalDiskMib: 0, vmCount: 0 }
    scopeMap.set(scopeKey, {
      totalVcpus: existing.totalVcpus + cpus,
      totalMemMib: existing.totalMemMib + mem,
      totalDiskMib: existing.totalDiskMib + disk,
      vmCount: existing.vmCount + 1,
    })
  }

  if (vmCount === 0) warnings.push('No non-template VMs found in vInfo sheet.')

  const detectedScopes = [...scopeMap.keys()]
  const scopeLabels: Record<string, string> = {}
  const rawByScope = new Map<string, ScopeData>()

  for (const [key, accum] of scopeMap.entries()) {
    scopeLabels[key] = buildScopeLabel(key)
    rawByScope.set(key, {
      totalVcpus: accum.totalVcpus,
      totalVms: accum.vmCount,
      totalDiskGb: Math.round((accum.totalDiskMib / 1024) * 10) / 10,
      avgRamPerVmGb: accum.vmCount > 0 ? Math.round((accum.totalMemMib / accum.vmCount / 1024) * 10) / 10 : 0,
      vmCount: accum.vmCount,
      warnings: [],
    })
  }

  const result: Omit<ClusterImportResult, 'sourceFormat'> = {
    totalVcpus,
    totalVms: vmCount,
    totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
    avgRamPerVmGb: vmCount > 0 ? Math.round((totalMemMib / vmCount / 1024) * 10) / 10 : 0,
    vmCount,
    warnings,
    detectedScopes,
    scopeLabels,
    rawByScope,
  }

  // vHost sheet -- extract per-scope host config (sockets, cores, RAM, model, frequency)
  const vHostSheet = wb.Sheets['vHost']
  if (vHostSheet) {
    const hostRows = XLSX.utils.sheet_to_json<VInfoRow>(vHostSheet, { defval: '' })
    const firstRow = hostRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), RVTOOLS_VHOST_ALIASES, new Set())
      const vHostClusterCols = resolveColumns(Object.keys(firstRow), CLUSTER_ALIASES, new Set())

      // Global cpuModel and cpuFrequencyGhz for backward compat
      const firstHost = hostRows.find((r) => str(r, cols['host_name']) !== '') ?? firstRow
      const model = str(firstHost, cols['cpu_model'])
      if (model) result.cpuModel = model
      const validSpeeds = hostRows.filter((r) => num(r, cols['cpu_speed_mhz']) > 0)
      if (validSpeeds.length > 0) {
        const avgMhz = validSpeeds.reduce((s, r) => s + num(r, cols['cpu_speed_mhz']), 0) / validSpeeds.length
        result.cpuFrequencyGhz = Math.round(avgMhz / 100) / 10
      }

      // Group vHost rows by scope key for per-scope ESX fields
      const validHosts = hostRows.filter((r) => str(r, cols['host_name']) !== '')
      if (validHosts.length > 0) {
        const hostsByScopeKey = new Map<string, VInfoRow[]>()
        const vHostClusterCol = vHostClusterCols['cluster_name']

        for (const host of validHosts) {
          const hostName = str(host, cols['host_name'])
          let scopeKey: string | undefined

          // Priority 1: Cluster column on vHost
          if (vHostClusterCol) {
            const cluster = str(host, vHostClusterCol)
            if (cluster) scopeKey = cluster
          }

          // Priority 2: hostToCluster map from vInfo
          if (!scopeKey && hostName && hostToCluster.has(hostName)) {
            scopeKey = hostToCluster.get(hostName)!
          }

          // Priority 3: fallback
          if (!scopeKey) {
            scopeKey = '__all__'
          }

          const existing = hostsByScopeKey.get(scopeKey) ?? []
          existing.push(host)
          hostsByScopeKey.set(scopeKey, existing)
        }

        // Check if we have cpu_sockets or cpu_cores_total columns -- only then compute per-scope ESX
        const hasSockets = cols['cpu_sockets'] !== undefined
        const hasCores = cols['cpu_cores_total'] !== undefined
        if (hasSockets || hasCores) {
          // Global ESX fields on result for backward compat
          const globalEsx = computeVhostEsxFields(validHosts, cols)
          Object.assign(result, globalEsx)

          // Per-scope ESX fields
          for (const [scopeKey, scopeHosts] of hostsByScopeKey.entries()) {
            const esxFields = computeVhostEsxFields(scopeHosts, cols)
            const existing = rawByScope.get(scopeKey)
            if (existing) {
              rawByScope.set(scopeKey, { ...existing, ...esxFields })
            }
          }
        }
      }
    }
  }

  return result
}
