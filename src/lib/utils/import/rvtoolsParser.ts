import type { ClusterImportResult, ScopeData, VmRow as ScopedVmRow } from './index'
import { RVTOOLS_ALIASES, RVTOOLS_VHOST_ALIASES, RVTOOLS_VSAN_ALIASES, CLUSTER_ALIASES, DATACENTER_ALIASES, resolveColumns } from './columnResolver'
import { parsePowerState, num, isTruthy, str, buildScopeLabel, appendToMap, type ParsedRow } from './parserHelpers'
import { analyzeStretchCluster } from './stretchClusterDetector'

const REQUIRED = new Set(['vm_name', 'num_cpus'])

/** Host column aliases on vInfo sheet for host-to-cluster mapping */
const VINFO_HOST_ALIASES: Record<string, string[]> = {
  host_name: ['Host', 'Host Name', 'ESX Host'],
}

type VInfoRow = ParsedRow

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
    vmRowsByScope: new Map(),
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

    // Build host-to-cluster mapping from vInfo rows
    const hostName = str(row, colMapHost['host_name'])
    if (hostName && scopeKey !== '__all__') {
      hostToCluster.set(hostName, scopeKey)
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
    vmRowsByScope,
  }

  // vHost sheet -- extract per-scope host config (sockets, cores, RAM, model, frequency)
  const vHostSheet = wb.Sheets['vHost']
  if (vHostSheet) {
    const hostRows = XLSX.utils.sheet_to_json<VInfoRow>(vHostSheet, { defval: '' })
    const firstRow = hostRows[0]
    if (firstRow) {
      const cols = resolveColumns(Object.keys(firstRow), RVTOOLS_VHOST_ALIASES, new Set())
      const vHostClusterCols = resolveColumns(Object.keys(firstRow), CLUSTER_ALIASES, new Set())
      const vHostDcCols = resolveColumns(Object.keys(firstRow), DATACENTER_ALIASES, new Set())

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
        const vHostDcCol = vHostDcCols['datacenter_name']

        for (const host of validHosts) {
          const hostName = str(host, cols['host_name'])
          let scopeKey: string | undefined

          // Priority 1: Datacenter+Cluster columns on vHost (must match the
          // composite key produced by vInfo when both DC and Cluster exist)
          if (vHostClusterCol) {
            const cluster = str(host, vHostClusterCol)
            const dc = vHostDcCol ? str(host, vHostDcCol) : ''
            if (cluster) scopeKey = dc ? `${dc}||${cluster}` : cluster
          }

          // Priority 2: hostToCluster map from vInfo
          if (!scopeKey && hostName && hostToCluster.has(hostName)) {
            scopeKey = hostToCluster.get(hostName)!
          }

          // Priority 3: fallback
          if (!scopeKey) {
            scopeKey = '__all__'
          }

          appendToMap(hostsByScopeKey, scopeKey, host)
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

  // vSAN sheet — explicit stretch signals (optional sheet)
  const vSanSheet = wb.Sheets['vSAN']
  const vsanByCluster = new Map<string, { stretched?: boolean; faultDomains: Set<string> }>()
  if (vSanSheet) {
    const vsanRows = XLSX.utils.sheet_to_json<VInfoRow>(vSanSheet, { defval: '' })
    const firstVsan = vsanRows[0]
    if (firstVsan) {
      const vsanCols = resolveColumns(Object.keys(firstVsan), RVTOOLS_VSAN_ALIASES, new Set())
      for (const row of vsanRows) {
        const cluster = str(row, vsanCols['cluster_name'])
        if (!cluster) continue
        const entry = vsanByCluster.get(cluster) ?? { faultDomains: new Set<string>() }
        const stretchedRaw = vsanCols['stretched'] ? str(row, vsanCols['stretched']) : ''
        if (stretchedRaw && /^(true|yes|1|enabled)$/i.test(stretchedRaw.trim())) {
          entry.stretched = true
        }
        const fd = vsanCols['fault_domain'] ? str(row, vsanCols['fault_domain']) : ''
        if (fd) entry.faultDomains.add(fd)
        vsanByCluster.set(cluster, entry)
      }
    }
  }

  // Build datacenter distribution per cluster name (heuristic fallback)
  // Same cluster name seen in ≥2 DCs → candidate for stretched
  const dcSetByClusterName = new Map<string, Set<string>>()
  for (const key of scopeMap.keys()) {
    const parts = key.split('||')
    if (parts.length === 2) {
      const [dc, cluster] = parts as [string, string]
      if (cluster && cluster !== '__standalone__') {
        const set = dcSetByClusterName.get(cluster) ?? new Set<string>()
        set.add(dc)
        dcSetByClusterName.set(cluster, set)
      }
    }
  }

  // Run detector per scope and write isStretchCluster / stretchSignals into rawByScope
  const globalSignals: string[] = []
  let anyStretch = false
  for (const [scopeKey, scope] of rawByScope.entries()) {
    const parts = scopeKey.split('||')
    const clusterName = parts.length === 2 ? parts[1]! : scopeKey
    const vsanEntry = vsanByCluster.get(clusterName)
    const dcSet = dcSetByClusterName.get(clusterName)

    const hostCountByDc = dcSet && dcSet.size === 2
      ? new Map(Array.from(dcSet).map((dc) => [dc, rawByScope.get(`${dc}||${clusterName}`)?.existingServerCount ?? 0]))
      : undefined

    const analysis = analyzeStretchCluster({
      scopeKey,
      scopeLabel: scopeLabels[scopeKey] ?? scopeKey,
      ...(vsanEntry?.stretched !== undefined && { explicitStretchFromVsan: vsanEntry.stretched }),
      ...(vsanEntry && vsanEntry.faultDomains.size > 0 && { faultDomainCount: vsanEntry.faultDomains.size }),
      ...(hostCountByDc && { hostCountByDc }),
    })

    if (analysis.isStretchCluster) {
      rawByScope.set(scopeKey, {
        ...scope,
        isStretchCluster: true,
        stretchSignals: [...analysis.signals],
      })
      anyStretch = true
      for (const s of analysis.signals) if (!globalSignals.includes(s)) globalSignals.push(s)
    }
  }

  if (anyStretch) {
    result.isStretchCluster = true
    result.stretchSignals = globalSignals
  }

  return result
}
