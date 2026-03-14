import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'

/**
 * Builds a human-readable plain-text summary of the cluster sizing results.
 * Suitable for pasting into emails, slides, or tickets.
 *
 * @param cluster - The existing cluster metrics
 * @param scenarios - The target scenarios being compared
 * @param results - The computed ScenarioResult for each scenario (parallel array)
 * @returns Multi-line plain text string
 */
export function buildSummaryText(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
): string {
  const lines: string[] = [
    'CLUSTER REFRESH SIZING REPORT',
    '==============================',
    'Current Cluster',
    `  Total vCPUs:  ${cluster.totalVcpus}`,
    `  Total pCores: ${cluster.totalPcores}`,
    `  Total VMs:    ${cluster.totalVms}`,
  ]

  if (cluster.totalDiskGb !== undefined) {
    lines.push(`  Total Disk:   ${cluster.totalDiskGb} GB`)
  }

  scenarios.forEach((scenario, i) => {
    const result = results[i]
    if (!result) return
    lines.push(
      '',
      `Scenario: ${scenario.name}`,
      `  Sockets/Server: ${scenario.socketsPerServer} | Cores/Socket: ${scenario.coresPerSocket} | RAM/Server: ${scenario.ramPerServerGb} GB | Disk/Server: ${scenario.diskPerServerGb} GB`,
      `  vCPU:pCore Ratio: ${scenario.targetVcpuToPCoreRatio} | Headroom: ${scenario.headroomPercent}% | HA Reserve: ${scenario.haReserveCount === 0 ? 'None' : `N+${scenario.haReserveCount}`}`,
      '',
      '  Results:',
      `    CPU-limited:  ${result.cpuLimitedCount} servers`,
      `    RAM-limited:  ${result.ramLimitedCount} servers`,
      `    Disk-limited: ${result.diskLimitedCount} servers`,
      `    → Required:   ${result.finalCount} servers (${result.limitingResource}-limited)`,
      `    CPU util: ${result.cpuUtilizationPercent.toFixed(1)}% | RAM util: ${result.ramUtilizationPercent.toFixed(1)}% | Disk util: ${result.diskUtilizationPercent.toFixed(1)}%`,
    )
  })

  return lines.join('\n')
}

/**
 * Copies text to the system clipboard using the Clipboard API.
 *
 * @param text - The text to copy
 * @returns Promise that resolves when the text has been copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
