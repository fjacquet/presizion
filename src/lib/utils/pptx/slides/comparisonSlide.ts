/** As-Is vs To-Be Comparison slide — full metric table (ported verbatim). */

import type PptxGenJS from 'pptxgenjs';
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
}

type TableCellObj = {
  text: string | Array<{ text: string; options?: Record<string, unknown> }>;
  options: Record<string, unknown>;
};

interface CompMetric {
  readonly label: string;
  readonly asIs: string | TableCellObj;
  readonly scenarioValues: readonly (string | TableCellObj)[];
}

export function addComparisonSlide(
  pptx: PptxGenJS,
  d: ComparisonSlideData,
  date: string,
  num: number,
): void {
  const { cluster, scenarios, results } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  addHeader(s, 'As-Is vs To-Be Comparison');

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
    headerCell('Metric'),
    headerCell('As-Is'),
    ...scenarios.map((scenario) => headerCell(scenario.name)),
  ];

  // --- Sizing results section ---
  const compMetrics: CompMetric[] = [
    {
      label: 'Servers',
      asIs: cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '--',
      scenarioValues: results.map((r) => String(r.finalCount)),
    },
    {
      label: 'Limiting Resource',
      asIs: 'N/A',
      scenarioValues: results.map((r) => r.limitingResource),
    },
    {
      label: 'VMs/Server',
      asIs: asIsVmsPerServer,
      scenarioValues: results.map((r) => r.vmsPerServer.toFixed(1)),
    },
    {
      label: 'vCPU:pCore Ratio',
      asIs: asIsRatio,
      scenarioValues: results.map((r) => `${r.achievedVcpuToPCoreRatio.toFixed(1)}:1`),
    },
    {
      // Row index 4 in this metric list → even → page-bg fill.
      label: 'CPU Util %',
      asIs:
        cluster.cpuUtilizationPercent !== undefined
          ? utilCell(cluster.cpuUtilizationPercent, 4)
          : plainCell('--', 4),
      scenarioValues: results.map((r) => utilCell(r.cpuUtilizationPercent, 4)),
    },
    {
      // Row index 5 in this metric list → odd → paper fill.
      label: 'RAM Util %',
      asIs:
        cluster.ramUtilizationPercent !== undefined
          ? utilCell(cluster.ramUtilizationPercent, 5)
          : plainCell('--', 5),
      scenarioValues: results.map((r) => utilCell(r.ramUtilizationPercent, 5)),
    },
    {
      label: 'Total Disk',
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
      label: 'Sockets / Server',
      asIs: cluster.socketsPerServer !== undefined ? String(cluster.socketsPerServer) : '--',
      scenarioValues: scenarios.map((scenario) => String(scenario.socketsPerServer)),
    },
    {
      label: 'Cores / Socket',
      asIs: cluster.coresPerSocket !== undefined ? String(cluster.coresPerSocket) : '--',
      scenarioValues: scenarios.map((scenario) => String(scenario.coresPerSocket)),
    },
    {
      label: 'Total Cores / Server',
      asIs:
        cluster.socketsPerServer !== undefined && cluster.coresPerSocket !== undefined
          ? String(cluster.socketsPerServer * cluster.coresPerSocket)
          : '--',
      scenarioValues: scenarios.map((scenario) =>
        String(scenario.socketsPerServer * scenario.coresPerSocket),
      ),
    },
    {
      label: 'RAM / Server (GB)',
      asIs: cluster.ramPerServerGb !== undefined ? cluster.ramPerServerGb.toLocaleString() : '--',
      scenarioValues: scenarios.map((scenario) => scenario.ramPerServerGb.toLocaleString()),
    },
    {
      label: 'Disk / Server (GB)',
      asIs: '--',
      scenarioValues: scenarios.map((scenario) => scenario.diskPerServerGb.toLocaleString()),
    },
    // --- Sizing assumptions section ---
    {
      label: 'Safety %',
      asIs: 'N/A',
      scenarioValues: scenarios.map((scenario) => `${scenario.safetyPercent}%`),
    },
    {
      label: 'HA Reserve',
      asIs: 'N/A',
      scenarioValues: scenarios.map((scenario) =>
        scenario.haReserveCount === 0 ? 'None' : `N+${scenario.haReserveCount}`,
      ),
    },
    {
      label: 'Avg vCPU/VM',
      asIs: avgVcpuPerVm,
      scenarioValues: scenarios.map(() => avgVcpuPerVm),
    },
    {
      label: 'Avg RAM/VM (GiB)',
      asIs: avgRamPerVm,
      scenarioValues: scenarios.map((scenario) => scenario.ramPerVmGb.toFixed(1)),
    },
    {
      label: 'Avg Disk/VM (GiB)',
      asIs: avgDiskPerVm,
      scenarioValues: scenarios.map((scenario) => scenario.diskPerVmGb.toFixed(1)),
    },
  ];

  // --- vSAN settings (conditional) ---
  const hasVsan = scenarios.some((scenario) => scenario.vsanFttPolicy !== undefined);
  if (hasVsan) {
    compMetrics.push(
      {
        label: 'FTT Policy',
        asIs: 'N/A',
        scenarioValues: scenarios.map((scenario) =>
          scenario.vsanFttPolicy ? FTT_POLICY_MAP[scenario.vsanFttPolicy].label : 'N/A',
        ),
      },
      {
        label: 'Compression Factor',
        asIs: 'N/A',
        scenarioValues: scenarios.map((scenario) =>
          scenario.vsanCompressionFactor !== undefined
            ? `${scenario.vsanCompressionFactor}x`
            : '1.0x',
        ),
      },
      {
        label: 'Slack %',
        asIs: 'N/A',
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
      label: 'Growth %',
      asIs: 'N/A',
      scenarioValues: scenarios.map((scenario) => `${scenario.growthPercent ?? 0}%`),
    });
  }

  const compDataRows = compMetrics.map((mtr, rowIdx) => {
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
