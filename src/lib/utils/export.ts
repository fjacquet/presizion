import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'

/**
 * RFC 4180-compliant CSV field escape.
 * Wraps in double-quotes if the stringified value contains comma, double-quote, or newline.
 * Doubles any internal double-quote characters.
 *
 * Exported for unit testing of the escape logic.
 */
export function csvEscape(value: string | number | boolean): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Builds RFC 4180-compliant CSV content from cluster sizing results.
 * Produces one header row and one data row per scenario.
 *
 * @param _cluster - The existing cluster metrics (reserved for future use — cluster data in clipboard only)
 * @param scenarios - The target scenarios being compared
 * @param results - The computed ScenarioResult for each scenario (parallel array)
 * @returns CSV string with header row + one row per scenario
 */
export function buildCsvContent(
  _cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
): string {
  const headers = [
    'Name',
    'Sockets/Server',
    'Cores/Socket',
    'RAM/Server (GB)',
    'Disk/Server (GB)',
    'vCPU:pCore Ratio',
    'RAM/VM (GB)',
    'Disk/VM (GB)',
    'Headroom (%)',
    'N+1 HA',
    'CPU-limited',
    'RAM-limited',
    'Disk-limited',
    'Final Count',
    'Limiting Resource',
    'Achieved vCPU:pCore',
    'VMs/Server',
    'CPU util (%)',
    'RAM util (%)',
    'Disk util (%)',
  ]

  const rows: string[] = [headers.map(csvEscape).join(',')]

  scenarios.forEach((scenario, i) => {
    const result = results[i]
    if (!result) return

    const cells = [
      scenario.name,
      scenario.socketsPerServer,
      scenario.coresPerSocket,
      scenario.ramPerServerGb,
      scenario.diskPerServerGb,
      scenario.targetVcpuToPCoreRatio,
      scenario.ramPerVmGb,
      scenario.diskPerVmGb,
      scenario.headroomPercent,
      scenario.haReserveCount === 0 ? 'None' : `N+${scenario.haReserveCount}`,
      result.cpuLimitedCount,
      result.ramLimitedCount,
      result.diskLimitedCount,
      result.finalCount,
      result.limitingResource,
      `${result.achievedVcpuToPCoreRatio.toFixed(2)}:1`,
      result.vmsPerServer.toFixed(2),
      result.cpuUtilizationPercent.toFixed(1),
      result.ramUtilizationPercent.toFixed(1),
      result.diskUtilizationPercent.toFixed(1),
    ]

    rows.push(cells.map(csvEscape).join(','))
  })

  return rows.join('\n')
}

/**
 * Triggers a browser CSV file download.
 * Creates a Blob, generates an object URL, simulates an anchor click, then revokes the URL.
 *
 * @param filename - The suggested filename for the download (e.g., 'cluster-sizing.csv')
 * @param csv - The CSV string content to download
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Builds a pretty-printed JSON string from cluster sizing results.
 * Undefined optional fields are replaced with null (not omitted) via replacer function.
 *
 * JSON schema version 1.1:
 * - schemaVersion: "1.1"
 * - generatedAt: ISO timestamp
 * - currentCluster: OldCluster object (undefined fields → null)
 * - scenarios: array of scenario + interleaved result
 *
 * @param cluster - The existing cluster metrics
 * @param scenarios - The target scenarios being compared
 * @param results - The computed ScenarioResult for each scenario (parallel array)
 * @returns Pretty-printed JSON string
 */
/**
 * Normalise an OldCluster so all optional fields are explicitly present (null if absent).
 * This ensures JSON.stringify produces "existingServerCount": null rather than omitting the key.
 */
function normaliseCluster(
  cluster: OldCluster,
): Record<string, string | number | boolean | null> {
  return {
    totalVcpus: cluster.totalVcpus,
    totalPcores: cluster.totalPcores,
    totalVms: cluster.totalVms,
    totalDiskGb: cluster.totalDiskGb ?? null,
    socketsPerServer: cluster.socketsPerServer ?? null,
    coresPerSocket: cluster.coresPerSocket ?? null,
    ramPerServerGb: cluster.ramPerServerGb ?? null,
    existingServerCount: cluster.existingServerCount ?? null,
    specintPerServer: cluster.specintPerServer ?? null,
    cpuUtilizationPercent: cluster.cpuUtilizationPercent ?? null,
    ramUtilizationPercent: cluster.ramUtilizationPercent ?? null,
  }
}

export function buildJsonContent(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
): string {
  const payload = {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    currentCluster: normaliseCluster(cluster),
    scenarios: scenarios.map((s, i) => ({ ...s, result: results[i] ?? null })),
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Triggers a browser JSON file download.
 * Creates a Blob, generates an object URL, simulates an anchor click, then revokes the URL.
 *
 * @param filename - The suggested filename for the download (e.g., 'cluster-sizing.json')
 * @param json - The JSON string content to download
 */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
