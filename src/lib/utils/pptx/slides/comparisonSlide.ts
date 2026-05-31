/** As-Is vs To-Be Comparison slide — full metric table (ported verbatim). */

import type PptxGenJS from 'pptxgenjs';
import i18n from '@/i18n';
import { FTT_POLICY_MAP } from '@/lib/sizing/vsanConstants';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { PPTX_COLORS } from '../primitives/colors';
import { headerCell, plainCell, utilCell } from './_cells';
import { addFooter, addHeader, M } from './_layout';

interface ComparisonSlideData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  breakdowns: readonly VsanCapacityBreakdown[];
  /** When false (disaggregated layout), storage/disk rows are omitted. */
  showStorage: boolean;
}

type TableCellObj = {
  text: string | Array<{ text: string; options?: Record<string, unknown> }>;
  options: Record<string, unknown>;
};

interface CompMetric {
  /** Internal stable key used for storage-row filtering. */
  readonly key: string;
  readonly label: string;
  readonly asIs: string | TableCellObj;
  readonly scenarioValues: readonly (string | TableCellObj)[];
}

/** Set of internal keys whose rows are hidden in disaggregated (no-storage) layout. */
const STORAGE_ROW_KEYS = new Set(['totalDisk', 'diskPerServer', 'avgDiskPerVm']);

export function addComparisonSlide(
  pptx: PptxGenJS,
  d: ComparisonSlideData,
  date: string,
  num: number,
): void {
  const t = i18n.t.bind(i18n);
  const { cluster, scenarios, results, showStorage } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  addHeader(s, t('pptx:slide.comparison'));

  const asIsRatio =
    cluster.totalPcores > 0 ? `${(cluster.totalVcpus / cluster.totalPcores).toFixed(1)}:1` : '--';

  const asIsVmsPerServer =
    cluster.existingServerCount && cluster.existingServerCount > 0
      ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
      : '--';

  const asIsTotalDisk =
    cluster.totalDiskGb !== undefined ? `${(cluster.totalDiskGb / 1024).toFixed(1)} TiB` : '--';

  const avgVcpuPerVm =
    cluster.totalVms > 0 ? (cluster.totalVcpus / cluster.totalVms).toFixed(1) : '--';

  const avgRamPerVm = cluster.avgRamPerVmGb != null ? cluster.avgRamPerVmGb.toFixed(1) : '--';

  const avgDiskPerVm =
    cluster.totalDiskGb != null && cluster.totalVms > 0
      ? (cluster.totalDiskGb / cluster.totalVms).toFixed(1)
      : '--';

  const compHeaderRow = [
    headerCell(t('pptx:comparison.colMetric')),
    headerCell(t('pptx:comparison.colAsIs')),
    ...scenarios.map((scenario) => headerCell(scenario.name)),
  ];

  // --- Sizing results section ---
  const compMetrics: CompMetric[] = [
    {
      key: 'servers',
      label: t('pptx:comparison.rowServers'),
      asIs: cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '--',
      scenarioValues: results.map((r) => String(r.finalCount)),
    },
    {
      key: 'limitingResource',
      label: t('pptx:comparison.rowLimitingResource'),
      asIs: t('pptx:comparison.valueNA'),
      scenarioValues: results.map((r) => r.limitingResource),
    },
    {
      key: 'vmsPerServer',
      label: t('pptx:comparison.rowVmsPerServer'),
      asIs: asIsVmsPerServer,
      scenarioValues: results.map((r) => r.vmsPerServer.toFixed(1)),
    },
    {
      key: 'vcpuRatio',
      label: t('pptx:comparison.rowVcpuRatio'),
      asIs: asIsRatio,
      scenarioValues: results.map((r) => `${r.achievedVcpuToPCoreRatio.toFixed(1)}:1`),
    },
    {
      // Row index 4 in this metric list → even → page-bg fill.
      key: 'cpuUtil',
      label: t('pptx:comparison.rowCpuUtil'),
      asIs:
        cluster.cpuUtilizationPercent !== undefined
          ? utilCell(cluster.cpuUtilizationPercent, 4)
          : plainCell('--', 4),
      scenarioValues: results.map((r) => utilCell(r.cpuUtilizationPercent, 4)),
    },
    {
      // Row index 5 in this metric list → odd → paper fill.
      key: 'ramUtil',
      label: t('pptx:comparison.rowRamUtil'),
      asIs:
        cluster.ramUtilizationPercent !== undefined
          ? utilCell(cluster.ramUtilizationPercent, 5)
          : plainCell('--', 5),
      scenarioValues: results.map((r) => utilCell(r.ramUtilizationPercent, 5)),
    },
    {
      key: 'totalDisk',
      label: t('pptx:comparison.rowTotalDisk'),
      asIs: asIsTotalDisk,
      scenarioValues: results.map((r, idx) => {
        const scenario = scenarios[idx];
        return scenario
          ? `${((r.finalCount * scenario.diskPerServerGb) / 1024).toFixed(1)} TiB`
          : '--';
      }),
    },
    // --- Server configuration section ---
    {
      key: 'socketsPerServer',
      label: t('pptx:comparison.rowSocketsPerServer'),
      asIs: cluster.socketsPerServer !== undefined ? String(cluster.socketsPerServer) : '--',
      scenarioValues: scenarios.map((scenario) => String(scenario.socketsPerServer)),
    },
    {
      key: 'coresPerSocket',
      label: t('pptx:comparison.rowCoresPerSocket'),
      asIs: cluster.coresPerSocket !== undefined ? String(cluster.coresPerSocket) : '--',
      scenarioValues: scenarios.map((scenario) => String(scenario.coresPerSocket)),
    },
    {
      key: 'totalCoresPerServer',
      label: t('pptx:comparison.rowTotalCoresPerServer'),
      asIs:
        cluster.socketsPerServer !== undefined && cluster.coresPerSocket !== undefined
          ? String(cluster.socketsPerServer * cluster.coresPerSocket)
          : '--',
      scenarioValues: scenarios.map((scenario) =>
        String(scenario.socketsPerServer * scenario.coresPerSocket),
      ),
    },
    {
      key: 'ramPerServer',
      label: t('pptx:comparison.rowRamPerServer'),
      asIs: cluster.ramPerServerGb !== undefined ? cluster.ramPerServerGb.toLocaleString() : '--',
      scenarioValues: scenarios.map((scenario) => scenario.ramPerServerGb.toLocaleString()),
    },
    {
      key: 'diskPerServer',
      label: t('pptx:comparison.rowDiskPerServer'),
      asIs: '--',
      scenarioValues: scenarios.map((scenario) => scenario.diskPerServerGb.toLocaleString()),
    },
    // --- Sizing assumptions section ---
    {
      key: 'safetyPct',
      label: t('pptx:comparison.rowSafetyPct'),
      asIs: t('pptx:comparison.valueNA'),
      scenarioValues: scenarios.map((scenario) => `${scenario.safetyPercent}%`),
    },
    {
      key: 'haReserve',
      label: t('pptx:comparison.rowHaReserve'),
      asIs: t('pptx:comparison.valueNA'),
      scenarioValues: scenarios.map((scenario) =>
        scenario.haReserveCount === 0
          ? t('pptx:comparison.valueNone')
          : `N+${scenario.haReserveCount}`,
      ),
    },
    {
      key: 'avgVcpuPerVm',
      label: t('pptx:comparison.rowAvgVcpuPerVm'),
      asIs: avgVcpuPerVm,
      scenarioValues: scenarios.map(() => avgVcpuPerVm),
    },
    {
      key: 'avgRamPerVm',
      label: t('pptx:comparison.rowAvgRamPerVm'),
      asIs: avgRamPerVm,
      scenarioValues: scenarios.map((scenario) => scenario.ramPerVmGb.toFixed(1)),
    },
    {
      key: 'avgDiskPerVm',
      label: t('pptx:comparison.rowAvgDiskPerVm'),
      asIs: avgDiskPerVm,
      scenarioValues: scenarios.map((scenario) => scenario.diskPerVmGb.toFixed(1)),
    },
  ];

  // --- vSAN settings (conditional) ---
  const hasVsan = scenarios.some((scenario) => scenario.vsanFttPolicy !== undefined);
  if (hasVsan) {
    compMetrics.push(
      {
        key: 'fttPolicy',
        label: t('pptx:comparison.rowFttPolicy'),
        asIs: t('pptx:comparison.valueNA'),
        scenarioValues: scenarios.map((scenario) =>
          scenario.vsanFttPolicy
            ? FTT_POLICY_MAP[scenario.vsanFttPolicy].label
            : t('pptx:comparison.valueNA'),
        ),
      },
      {
        key: 'compressionFactor',
        label: t('pptx:comparison.rowCompressionFactor'),
        asIs: t('pptx:comparison.valueNA'),
        scenarioValues: scenarios.map((scenario) =>
          scenario.vsanCompressionFactor !== undefined
            ? `${scenario.vsanCompressionFactor}x`
            : '1.0x',
        ),
      },
      {
        key: 'slackPct',
        label: t('pptx:comparison.rowSlackPct'),
        asIs: t('pptx:comparison.valueNA'),
        scenarioValues: scenarios.map((scenario) =>
          scenario.vsanSlackPercent !== undefined ? `${scenario.vsanSlackPercent}%` : '25%',
        ),
      },
    );
  }

  // --- Growth projection (conditional) ---
  const hasGrowth = scenarios.some(
    (scenario) => scenario.growthPercent !== undefined && scenario.growthPercent > 0,
  );
  if (hasGrowth) {
    compMetrics.push({
      key: 'growthPct',
      label: t('pptx:comparison.rowGrowthPct'),
      asIs: t('pptx:comparison.valueNA'),
      scenarioValues: scenarios.map((scenario) => `${scenario.growthPercent ?? 0}%`),
    });
  }

  // In disaggregated layout, storage/disk is hidden on the web — mirror that here
  // by dropping the storage/disk rows. HCI (showStorage=true) is untouched.
  const visibleMetrics = showStorage
    ? compMetrics
    : compMetrics.filter((mtr) => !STORAGE_ROW_KEYS.has(mtr.key));

  const compDataRows = visibleMetrics.map((mtr, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? PPTX_COLORS.pageBg : PPTX_COLORS.paper;
    const asIsCell =
      typeof mtr.asIs === 'string'
        ? {
            text: mtr.asIs,
            options: { fill: { color: fillColor }, fontSize: 10, fontFace: 'Consolas' },
          }
        : mtr.asIs;
    return [
      {
        text: mtr.label,
        options: { bold: true, fill: { color: fillColor }, fontSize: 10, fontFace: 'Arial' },
      },
      asIsCell,
      ...mtr.scenarioValues.map((v) =>
        typeof v === 'string'
          ? { text: v, options: { fill: { color: fillColor }, fontSize: 10, fontFace: 'Consolas' } }
          : v,
      ),
    ];
  });

  const compScenarioW = scenarios.length > 0 ? (12 - 2.5 - 2) / scenarios.length : 2;
  s.addTable([compHeaderRow, ...compDataRows], {
    x: M,
    y: 1.2,
    w: 12,
    colW: [2.5, 2, ...scenarios.map(() => compScenarioW)],
    border: { pt: 0.5, color: PPTX_COLORS.hairline },
  });

  addFooter(s, date, num);
}
