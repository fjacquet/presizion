/**
 * Shared As-Is vs To-Be comparison table builders.
 *
 * The metric list is split into two groups so the deck can show a condensed
 * "sizing results" table on the merged executive slide and move the verbose
 * server-config / sizing-assumptions rows to a Configuration appendix:
 *   - buildSizingMetrics  → servers, limiting resource, density, util, disk
 *   - buildConfigMetrics  → server config + assumptions + vSAN + growth + VM cap
 *
 * Both groups render through the same renderComparisonTable() so cell styling,
 * alternating fills, and disaggregated storage-row filtering stay identical.
 */

import type PptxGenJS from 'pptxgenjs';
import i18n from '@/i18n';
import { FTT_POLICY_MAP } from '@/lib/sizing/vsanConstants';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { PPTX_COLORS } from '../primitives/colors';
import { headerCell, plainCell, utilCell } from './_cells';
import { M } from './_layout';

type Slide = ReturnType<PptxGenJS['addSlide']>;

export interface ComparisonData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  /** When false (disaggregated layout), storage/disk rows are omitted. */
  showStorage: boolean;
}

/** A single comparison cell: plain text or a colored utilization dot (null = "--"). */
type CellSpec = { readonly text: string } | { readonly util: number | null };

export interface CompMetric {
  /** Internal stable key used for storage-row filtering. */
  readonly key: string;
  readonly label: string;
  readonly asIs: CellSpec;
  readonly scenarioValues: readonly CellSpec[];
}

/** Internal keys hidden in disaggregated (no-storage) layout. */
const STORAGE_ROW_KEYS = new Set(['totalDisk', 'diskPerServer', 'avgDiskPerVm']);

/** Number of rows a metric list renders after storage filtering (for layout fit checks). */
export function countVisibleMetrics(metrics: readonly CompMetric[], showStorage: boolean): number {
  return showStorage ? metrics.length : metrics.filter((m) => !STORAGE_ROW_KEYS.has(m.key)).length;
}

function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(key, opts ?? {});
}

/** Brand header row: Metric | As-Is | <one column per scenario>. */
function comparisonHeaderRow(scenarios: readonly Scenario[], fontSize: number) {
  return [
    headerCell(t('pptx:comparison.colMetric'), fontSize),
    headerCell(t('pptx:comparison.colAsIs'), fontSize),
    ...scenarios.map((scenario) => headerCell(scenario.name, fontSize)),
  ];
}

function cell(spec: CellSpec, rowIdx: number, fontSize: number) {
  if ('util' in spec) {
    return spec.util == null ? plainCell('--', rowIdx) : utilCell(spec.util, rowIdx);
  }
  const fill = rowIdx % 2 === 0 ? PPTX_COLORS.pageBg : PPTX_COLORS.paper;
  return {
    text: spec.text,
    options: { fill: { color: fill }, fontSize, fontFace: 'Consolas' },
  };
}

function toRow(metric: CompMetric, rowIdx: number, fontSize: number) {
  const fill = rowIdx % 2 === 0 ? PPTX_COLORS.pageBg : PPTX_COLORS.paper;
  return [
    {
      text: metric.label,
      options: { bold: true, fill: { color: fill }, fontSize, fontFace: 'Arial' },
    },
    cell(metric.asIs, rowIdx, fontSize),
    ...metric.scenarioValues.map((v) => cell(v, rowIdx, fontSize)),
  ];
}

/**
 * Renders a comparison table (header + data rows) onto the slide at y.
 * Returns the number of data rows rendered (after storage filtering) so callers
 * can stack a second table below it without overlapping. `fontSize` lets a
 * secondary (e.g. configuration) table render slightly smaller for hierarchy.
 */
export function renderComparisonTable(
  s: Slide,
  metrics: readonly CompMetric[],
  y: number,
  scenarios: readonly Scenario[],
  showStorage: boolean,
  fontSize = 10,
): number {
  const visible = showStorage ? metrics : metrics.filter((m) => !STORAGE_ROW_KEYS.has(m.key));
  const dataRows = visible.map((m, rowIdx) => toRow(m, rowIdx, fontSize));
  const scenarioW = scenarios.length > 0 ? (12 - 2.5 - 2) / scenarios.length : 2;
  s.addTable([comparisonHeaderRow(scenarios, fontSize), ...dataRows], {
    x: M,
    y,
    w: 12,
    colW: [2.5, 2, ...scenarios.map(() => scenarioW)],
    border: { pt: 0.5, color: PPTX_COLORS.hairline },
  });
  return visible.length;
}

/** Condensed "sizing results" rows for the merged executive slide. */
export function buildSizingMetrics(d: ComparisonData): CompMetric[] {
  const { cluster, scenarios, results } = d;

  const asIsRatio =
    cluster.totalPcores > 0 ? `${(cluster.totalVcpus / cluster.totalPcores).toFixed(1)}:1` : '--';
  const asIsVmsPerServer =
    cluster.existingServerCount && cluster.existingServerCount > 0
      ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
      : '--';
  const asIsTotalDisk =
    cluster.totalDiskGb !== undefined ? `${(cluster.totalDiskGb / 1024).toFixed(1)} TiB` : '--';

  return [
    {
      key: 'servers',
      label: t('pptx:comparison.rowServers'),
      asIs: {
        text:
          cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '--',
      },
      scenarioValues: results.map((r) => ({ text: String(r.finalCount) })),
    },
    {
      key: 'limitingResource',
      label: t('pptx:comparison.rowLimitingResource'),
      asIs: { text: t('pptx:comparison.valueNA') },
      scenarioValues: results.map((r) => ({ text: r.limitingResource })),
    },
    {
      key: 'vmsPerServer',
      label: t('pptx:comparison.rowVmsPerServer'),
      asIs: { text: asIsVmsPerServer },
      scenarioValues: results.map((r) => ({ text: r.vmsPerServer.toFixed(1) })),
    },
    {
      key: 'vcpuRatio',
      label: t('pptx:comparison.rowVcpuRatio'),
      asIs: { text: asIsRatio },
      scenarioValues: results.map((r) => ({ text: `${r.achievedVcpuToPCoreRatio.toFixed(1)}:1` })),
    },
    {
      key: 'cpuUtil',
      label: t('pptx:comparison.rowCpuUtil'),
      asIs: { util: cluster.cpuUtilizationPercent ?? null },
      scenarioValues: results.map((r) => ({ util: r.cpuUtilizationPercent })),
    },
    {
      key: 'ramUtil',
      label: t('pptx:comparison.rowRamUtil'),
      asIs: { util: cluster.ramUtilizationPercent ?? null },
      scenarioValues: results.map((r) => ({ util: r.ramUtilizationPercent })),
    },
    {
      key: 'totalDisk',
      label: t('pptx:comparison.rowTotalDisk'),
      asIs: { text: asIsTotalDisk },
      scenarioValues: results.map((r, idx) => {
        const scenario = scenarios[idx];
        return {
          text: scenario
            ? `${((r.finalCount * scenario.diskPerServerGb) / 1024).toFixed(1)} TiB`
            : '--',
        };
      }),
    },
  ];
}

/** Verbose server-config + sizing-assumptions rows for the Configuration appendix. */
export function buildConfigMetrics(d: ComparisonData): CompMetric[] {
  const { cluster, scenarios } = d;

  const avgVcpuPerVm =
    cluster.totalVms > 0 ? (cluster.totalVcpus / cluster.totalVms).toFixed(1) : '--';
  const avgRamPerVm = cluster.avgRamPerVmGb != null ? cluster.avgRamPerVmGb.toFixed(1) : '--';
  const avgDiskPerVm =
    cluster.totalDiskGb != null && cluster.totalVms > 0
      ? (cluster.totalDiskGb / cluster.totalVms).toFixed(1)
      : '--';
  const na = t('pptx:comparison.valueNA');

  const metrics: CompMetric[] = [
    {
      key: 'socketsPerServer',
      label: t('pptx:comparison.rowSocketsPerServer'),
      asIs: {
        text: cluster.socketsPerServer !== undefined ? String(cluster.socketsPerServer) : '--',
      },
      scenarioValues: scenarios.map((s) => ({ text: String(s.socketsPerServer) })),
    },
    {
      key: 'coresPerSocket',
      label: t('pptx:comparison.rowCoresPerSocket'),
      asIs: { text: cluster.coresPerSocket !== undefined ? String(cluster.coresPerSocket) : '--' },
      scenarioValues: scenarios.map((s) => ({ text: String(s.coresPerSocket) })),
    },
    {
      key: 'totalCoresPerServer',
      label: t('pptx:comparison.rowTotalCoresPerServer'),
      asIs: {
        text:
          cluster.socketsPerServer !== undefined && cluster.coresPerSocket !== undefined
            ? String(cluster.socketsPerServer * cluster.coresPerSocket)
            : '--',
      },
      scenarioValues: scenarios.map((s) => ({
        text: String(s.socketsPerServer * s.coresPerSocket),
      })),
    },
    {
      key: 'ramPerServer',
      label: t('pptx:comparison.rowRamPerServer'),
      asIs: {
        text: cluster.ramPerServerGb !== undefined ? cluster.ramPerServerGb.toLocaleString() : '--',
      },
      scenarioValues: scenarios.map((s) => ({ text: s.ramPerServerGb.toLocaleString() })),
    },
    {
      key: 'diskPerServer',
      label: t('pptx:comparison.rowDiskPerServer'),
      asIs: { text: '--' },
      scenarioValues: scenarios.map((s) => ({ text: s.diskPerServerGb.toLocaleString() })),
    },
    {
      key: 'safetyPct',
      label: t('pptx:comparison.rowSafetyPct'),
      asIs: { text: na },
      scenarioValues: scenarios.map((s) => ({ text: `${s.safetyPercent}%` })),
    },
    {
      key: 'haReserve',
      label: t('pptx:comparison.rowHaReserve'),
      asIs: { text: na },
      scenarioValues: scenarios.map((s) => ({
        text: s.haReserveCount === 0 ? t('pptx:comparison.valueNone') : `N+${s.haReserveCount}`,
      })),
    },
    {
      key: 'avgVcpuPerVm',
      label: t('pptx:comparison.rowAvgVcpuPerVm'),
      asIs: { text: avgVcpuPerVm },
      scenarioValues: scenarios.map(() => ({ text: avgVcpuPerVm })),
    },
    {
      key: 'avgRamPerVm',
      label: t('pptx:comparison.rowAvgRamPerVm'),
      asIs: { text: avgRamPerVm },
      scenarioValues: scenarios.map((s) => ({ text: s.ramPerVmGb.toFixed(1) })),
    },
    {
      key: 'avgDiskPerVm',
      label: t('pptx:comparison.rowAvgDiskPerVm'),
      asIs: { text: avgDiskPerVm },
      scenarioValues: scenarios.map((s) => ({ text: s.diskPerVmGb.toFixed(1) })),
    },
  ];

  // Max VMs / host (only when at least one scenario sets the cap)
  if (scenarios.some((s) => (s.maxVmsPerHost ?? 0) > 0)) {
    metrics.push({
      key: 'maxVmsPerHost',
      label: t('pptx:comparison.rowMaxVmsPerHost'),
      asIs: { text: na },
      scenarioValues: scenarios.map((s) => ({
        text: (s.maxVmsPerHost ?? 0) > 0 ? String(s.maxVmsPerHost) : na,
      })),
    });
  }

  // vSAN settings (only when at least one scenario uses vSAN)
  if (scenarios.some((s) => s.vsanFttPolicy !== undefined)) {
    metrics.push(
      {
        key: 'fttPolicy',
        label: t('pptx:comparison.rowFttPolicy'),
        asIs: { text: na },
        scenarioValues: scenarios.map((s) => ({
          text: s.vsanFttPolicy ? FTT_POLICY_MAP[s.vsanFttPolicy].label : na,
        })),
      },
      {
        key: 'compressionFactor',
        label: t('pptx:comparison.rowCompressionFactor'),
        asIs: { text: na },
        scenarioValues: scenarios.map((s) => ({
          text: s.vsanCompressionFactor !== undefined ? `${s.vsanCompressionFactor}x` : '1.0x',
        })),
      },
      {
        key: 'slackPct',
        label: t('pptx:comparison.rowSlackPct'),
        asIs: { text: na },
        scenarioValues: scenarios.map((s) => ({
          text: s.vsanSlackPercent !== undefined ? `${s.vsanSlackPercent}%` : '25%',
        })),
      },
    );
  }

  // Growth projection (only when at least one scenario has growth)
  if (scenarios.some((s) => s.growthPercent !== undefined && s.growthPercent > 0)) {
    metrics.push({
      key: 'growthPct',
      label: t('pptx:comparison.rowGrowthPct'),
      asIs: { text: na },
      scenarioValues: scenarios.map((s) => ({ text: `${s.growthPercent ?? 0}%` })),
    });
  }

  return metrics;
}
