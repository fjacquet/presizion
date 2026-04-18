import type { ClusterImportResult, ScopeData, VmRow as ScopedVmRow } from './index'
import {
  LIVEOPTICS_ALIASES,
  LIVEOPTICS_ESX_HOSTS_ALIASES,
  LIVEOPTICS_ESX_PERF_ALIASES,
  CLUSTER_ALIASES,
  DATACENTER_ALIASES,
  resolveColumns,
} from './columnResolver'
import { ImportError } from './fileValidation'
import { parsePowerState, num, isTruthy, str, buildScopeLabel, appendToMap, type ParsedRow } from './parserHelpers'

const REQUIRED = new Set(['vm_name', 'num_cpus'])

type VmRow = ParsedRow

interface ScopeAccum {
  totalVcpus: number
  totalMemMib: number
  totalDiskMib: number
  vmCount: number
}

/** Host aliases used to resolve ESX Host column on VMs sheet */
const VM_HOST_ALIASES: Record<string, string[]> = {
  esx_host: ['ESX Host', 'Host Name', 'Host'],
}

type AggregateResult = Omit<ClusterImportResult, 'sourceFormat'>

interface AggregateOutput {
  result: AggregateResult
  hostToCluster: Map<string, string>
}

/** Compute ESX fields for a group of hosts and return a partial ScopeData */
function computeEsxFields(hosts: VmRow[], cols: Record<string, string | undefined>): Partial<ScopeData> {
  if (hosts.length === 0) return {}
  const firstHost = hosts[0]!
  const sockets = num(firstHost, cols['cpu_sockets'])
  const coresFirst = num(firstHost, cols['cpu_cores'])
  const fields: Partial<ScopeData> = {
    existingServerCount: hosts.length,
    totalPcores: hosts.reduce((s, h) => s + num(h, cols['cpu_cores']), 0),
  }
  if (sockets) fields.socketsPerServer = sockets
  const derivedCores = sockets > 0 ? Math.round(coresFirst / sockets) : 0
  if (derivedCores) fields.coresPerSocket = derivedCores
  const ramGb = Math.round(num(firstHost, cols['memory_kib']) / 1024 / 1024)
  if (ramGb) fields.ramPerServerGb = ramGb
  const model = str(firstHost, cols['cpu_model'])
  if (model) fields.cpuModel = model
  const speedGhz = num(firstHost, cols['cpu_speed_ghz'])
  const speedMhz = num(firstHost, cols['cpu_speed_mhz'])
  if (speedGhz > 0) fields.cpuFrequencyGhz = Math.round(speedGhz * 10) / 10
  else if (speedMhz > 0) fields.cpuFrequencyGhz = Math.round(speedMhz / 100) / 10
  return fields
}

async function parseXlsx(buffer: ArrayBuffer): Promise<AggregateResult> {
  const XLSX = await import('@e965/xlsx')
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = wb.Sheets['VMs']
  if (!sheet) throw new ImportError('VMs sheet not found in LiveOptics xlsx.')

  const rows = XLSX.utils.sheet_to_json<VmRow>(sheet, { defval: null })
  const { result: base, hostToCluster } = aggregate(rows)

  // ESX Hosts sheet -> per-scope host config + global backward compat
  const hostsSheet = wb.Sheets['ESX Hosts']
  if (hostsSheet) {
    const hostRows = XLSX.utils.sheet_to_json<VmRow>(hostsSheet, { defval: '' })
    const firstRow = hostRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), LIVEOPTICS_ESX_HOSTS_ALIASES, new Set())
      const hosts = hostRows.filter((r) => String(r[cols['host_name'] ?? ''] ?? '').trim() !== '')

      if (hosts.length > 0) {
        // Global ESX fields on base for backward compat
        const globalEsx = computeEsxFields(hosts, cols)
        Object.assign(base, globalEsx)
        const socketCounts = new Set(hosts.map((h) => num(h, cols['cpu_sockets'])))
        if (socketCounts.size > 1) base.warnings.push('Mixed CPU socket counts detected \u2014 using first host as representative.')

        // Group hosts by scope key
        const hostsByScopeKey = new Map<string, VmRow[]>()
        const clusterCol = cols['cluster_name']
        let usedFallback = false

        // Build datacenter column resolver for ESX Hosts to match dc||cluster scope keys
        const esxDcCols = resolveColumns(Object.keys(firstRow), DATACENTER_ALIASES, new Set())

        for (const host of hosts) {
          const hostName = str(host, cols['host_name'])
          let scopeKey: string | undefined

          // Priority 1: hostToCluster map from VMs (always has correct dc||cluster format)
          if (hostName && hostToCluster.has(hostName)) {
            scopeKey = hostToCluster.get(hostName)!
          }

          // Priority 2: Direct Cluster column on ESX Hosts (may lack DC prefix)
          if (!scopeKey && clusterCol) {
            const cluster = str(host, clusterCol)
            if (cluster) {
              const dc = str(host, esxDcCols['datacenter_name'])
              scopeKey = dc ? `${dc}||${cluster}` : cluster
            }
          }

          // Priority 3: fallback to __all__
          if (!scopeKey) {
            scopeKey = '__all__'
            usedFallback = true
          }

          appendToMap(hostsByScopeKey, scopeKey, host)
        }

        if (usedFallback && base.rawByScope && !base.rawByScope.has('__all__')) {
          // ESX data can't be mapped to individual scopes
          base.warnings.push('Host-to-cluster mapping unavailable; ESX host config applied globally.')
        }

        // Merge per-scope ESX fields into rawByScope
        if (base.rawByScope) {
          for (const [scopeKey, scopeHosts] of hostsByScopeKey.entries()) {
            const esxFields = computeEsxFields(scopeHosts, cols)
            const existing = base.rawByScope.get(scopeKey)
            if (existing) {
              base.rawByScope.set(scopeKey, { ...existing, ...esxFields })
            }
          }
        }
      }
    }
  }

  // ESX Performance sheet -> per-scope CPU/RAM utilization + global backward compat
  const perfSheet = wb.Sheets['ESX Performance']
  if (perfSheet) {
    const perfRows = XLSX.utils.sheet_to_json<VmRow>(perfSheet, { defval: '' })
    const firstRow = perfRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), LIVEOPTICS_ESX_PERF_ALIASES, new Set())
      const valid = perfRows.filter((r) => String(r[cols['host_name'] ?? ''] ?? '').trim() !== '')

      if (valid.length > 0) {
        // Global averages for backward compat
        base.cpuUtilizationPercent = Math.round(valid.reduce((s, r) => s + num(r, cols['avg_cpu_pct']), 0) / valid.length)
        base.ramUtilizationPercent = Math.round(valid.reduce((s, r) => s + num(r, cols['avg_mem_pct']), 0) / valid.length)

        // Group perf rows by scope key using hostToCluster or Cluster column from ESX Hosts
        if (base.rawByScope) {
          // Build host->scope mapping: prefer hostToCluster from VMs (correct dc||cluster format)
          const hostsSheetRef = wb.Sheets['ESX Hosts']
          let hostScopeMap = new Map<string, string>(hostToCluster)

          if (hostsSheetRef) {
            const hostRows2 = XLSX.utils.sheet_to_json<VmRow>(hostsSheetRef, { defval: '' })
            if (hostRows2[0]) {
              const hostCols = resolveColumns(Object.keys(hostRows2[0]), LIVEOPTICS_ESX_HOSTS_ALIASES, new Set())
              const perfDcCols = resolveColumns(Object.keys(hostRows2[0]), DATACENTER_ALIASES, new Set())
              const clusterCol2 = hostCols['cluster_name']
              for (const hr of hostRows2) {
                const hn = str(hr, hostCols['host_name'])
                if (!hn || hostScopeMap.has(hn)) continue
                // Only use ESX Hosts cluster as fallback when hostToCluster doesn't have this host
                if (clusterCol2) {
                  const cl = str(hr, clusterCol2)
                  if (cl) {
                    const dc = str(hr, perfDcCols['datacenter_name'])
                    hostScopeMap.set(hn, dc ? `${dc}||${cl}` : cl)
                  }
                }
              }
            }
          } else {
            hostScopeMap = hostToCluster
          }

          const perfByScopeKey = new Map<string, VmRow[]>()
          for (const row of valid) {
            const hostName = str(row, cols['host_name'])
            const scopeKey = hostScopeMap.get(hostName) ?? '__all__'
            appendToMap(perfByScopeKey, scopeKey, row)
          }

          for (const [scopeKey, scopePerfRows] of perfByScopeKey.entries()) {
            const existing = base.rawByScope.get(scopeKey)
            if (existing && scopePerfRows.length > 0) {
              const avgCpu = Math.round(scopePerfRows.reduce((s, r) => s + num(r, cols['avg_cpu_pct']), 0) / scopePerfRows.length)
              const avgRam = Math.round(scopePerfRows.reduce((s, r) => s + num(r, cols['avg_mem_pct']), 0) / scopePerfRows.length)
              base.rawByScope.set(scopeKey, {
                ...existing,
                cpuUtilizationPercent: avgCpu,
                ramUtilizationPercent: avgRam,
              })
            }
          }
        }
      }
    }
  }

  return base
}

function parseCsvBuffer(buffer: ArrayBuffer): AggregateResult {
  const text = new TextDecoder().decode(buffer)
  const lines = text.split('\n').filter((l) => l.trim())
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: VmRow[] = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: VmRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? null })
    return row
  })
  return aggregate(rows).result
}

function aggregate(rows: VmRow[]): AggregateOutput {
  if (rows.length === 0) return {
    result: {
      totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [],
      detectedScopes: ['__all__'], scopeLabels: { __all__: 'All' }, rawByScope: new Map(),
      vmRowsByScope: new Map(),
    },
    hostToCluster: new Map(),
  }

  const headers = Object.keys(rows[0] ?? {})
  const colMap = resolveColumns(headers, LIVEOPTICS_ALIASES, REQUIRED)
  const colMapCluster = resolveColumns(headers, CLUSTER_ALIASES, new Set())
  const colMapDc = resolveColumns(headers, DATACENTER_ALIASES, new Set())

  // Resolve ESX Host column on VMs for host-to-cluster mapping
  const colMapVmHost = resolveColumns(headers, VM_HOST_ALIASES, new Set())

  let totalVcpus = 0
  let totalMemMib = 0
  let totalDiskMib = 0
  let vmCount = 0
  const warnings: string[] = []

  const scopeMap = new Map<string, ScopeAccum>()
  const hostToCluster = new Map<string, string>()
  const vmRowsByScope = new Map<string, ScopedVmRow[]>()
  const hasPowerStateCol = colMap['power_state'] !== undefined

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
    const scopeKey = dc && cluster ? `${dc}||${cluster}` : cluster ? cluster : dc ? `${dc}||__standalone__` : '__all__'

    // Build host-to-cluster map from VM rows
    const vmHost = str(row, colMapVmHost['esx_host'])
    if (vmHost && scopeKey !== '__all__') {
      hostToCluster.set(vmHost, scopeKey)
    }

    const vmName = str(row, colMap['vm_name'])
    const powerStateRaw = hasPowerStateCol ? str(row, colMap['power_state']) : ''
    const powerState = hasPowerStateCol ? parsePowerState(powerStateRaw) : undefined
    const vmRow: ScopedVmRow = {
      name: vmName,
      scopeKey,
      vcpus: cpus,
      ramMib: mem,
      diskMib: disk,
      ...(powerState !== undefined && { powerState }),
    }
    appendToMap(vmRowsByScope, scopeKey, vmRow)

    const existing = scopeMap.get(scopeKey) ?? { totalVcpus: 0, totalMemMib: 0, totalDiskMib: 0, vmCount: 0 }
    scopeMap.set(scopeKey, {
      totalVcpus: existing.totalVcpus + cpus,
      totalMemMib: existing.totalMemMib + mem,
      totalDiskMib: existing.totalDiskMib + disk,
      vmCount: existing.vmCount + 1,
    })
  }

  if (vmCount === 0) warnings.push('No non-template VMs found.')

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

  return {
    result: {
      totalVcpus,
      totalVms: vmCount,
      totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
      avgRamPerVmGb: vmCount > 0 ? Math.round((totalMemMib / vmCount / 1024) * 10) / 10 : 0,
      vmCount,
      warnings,
      detectedScopes,
      scopeLabels,
      rawByScope,
      vmRowsByScope,
    },
    hostToCluster,
  }
}

export async function parseLiveoptics(
  buffer: ArrayBuffer,
  format: 'liveoptics-xlsx' | 'liveoptics-csv',
): Promise<Omit<ClusterImportResult, 'sourceFormat'>> {
  if (format === 'liveoptics-xlsx') return parseXlsx(buffer)
  return parseCsvBuffer(buffer)
}
