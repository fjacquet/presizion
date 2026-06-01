import i18n from '@/i18n';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';

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
  const t = i18n.t.bind(i18n);
  const lines: string[] = [
    t('export:clipboard.reportTitle'),
    t('export:clipboard.divider'),
    t('export:clipboard.currentCluster'),
    `  ${t('export:clipboard.totalVcpus')}:  ${cluster.totalVcpus}`,
    `  ${t('export:clipboard.totalPcores')}: ${cluster.totalPcores}`,
    `  ${t('export:clipboard.totalVms')}:    ${cluster.totalVms}`,
  ];

  if (cluster.totalDiskGb !== undefined) {
    lines.push(
      `  ${t('export:clipboard.totalDisk')}:   ${cluster.totalDiskGb} ${t('export:clipboard.totalDiskUnit')}`,
    );
  }

  scenarios.forEach((scenario, i) => {
    const result = results[i];
    if (!result) return;
    const haLabel =
      scenario.haReserveCount === 0 ? t('export:clipboard.none') : `N+${scenario.haReserveCount}`;
    lines.push(
      '',
      `${t('export:clipboard.scenarioLabel')}: ${scenario.name}`,
      `  ${t('export:clipboard.socketsServer')}: ${scenario.socketsPerServer} | ${t('export:clipboard.coresSocket')}: ${scenario.coresPerSocket} | ${t('export:clipboard.ramServer')}: ${scenario.ramPerServerGb} ${t('export:clipboard.ramUnit')} | ${t('export:clipboard.diskServer')}: ${scenario.diskPerServerGb} ${t('export:clipboard.diskUnit')}`,
      `  ${t('export:clipboard.vcpuRatio')}: ${scenario.targetVcpuToPCoreRatio} | ${t('export:clipboard.growth')}: ${scenario.growthPercent}% | ${t('export:clipboard.safety')}: ${scenario.safetyPercent}% | ${t('export:clipboard.haReserve')}: ${haLabel}`,
      '',
      `  ${t('export:clipboard.results')}:`,
      `    ${t('export:clipboard.cpuLimited')}:  ${result.cpuLimitedCount} ${t('export:clipboard.servers')}`,
      `    ${t('export:clipboard.ramLimited')}:  ${result.ramLimitedCount} ${t('export:clipboard.servers')}`,
      `    ${t('export:clipboard.diskLimited')}: ${result.diskLimitedCount} ${t('export:clipboard.servers')}`,
      `    → ${t('export:clipboard.required')}:   ${result.finalCount} ${t('export:clipboard.servers')} (${result.limitingResource}-limited)`,
      `    ${t('export:clipboard.cpuUtil')}: ${result.cpuUtilizationPercent.toFixed(1)}% | ${t('export:clipboard.ramUtil')}: ${result.ramUtilizationPercent.toFixed(1)}% | ${t('export:clipboard.diskUtil')}: ${result.diskUtilizationPercent.toFixed(1)}%`,
    );
  });

  return lines.join('\n');
}

/**
 * Copies text to the system clipboard using the Clipboard API.
 *
 * @param text - The text to copy
 * @returns Promise that resolves when the text has been copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
