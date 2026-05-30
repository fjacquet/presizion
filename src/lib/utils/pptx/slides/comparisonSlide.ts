/** As-Is vs To-Be Comparison slide — full metric table (ported verbatim). */

import type PptxGenJS from 'pptxgenjs';
import { FTT_POLICY_MAP } from '@/lib/sizing/vsanConstants';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { utilBandColor } from '../format';
import { PPTX_COLORS } from '../primitives/colors';
import { PPTX_THEME } from '../theme';
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

/** Util cell with a colored band dot prefix (Consolas value). */
function utilCell(pct: number, fillColor: string): TableCellObj {
  return {
    text: [
      { text: '● ', options: { color: utilBandColor(pct), fontSize: 10, fontFace: 'Arial' } },
      {
        text: `${pct.toFixed(1)}%`,
        options: { color: PPTX_COLORS.ink, fontSize: 10, fontFace: 'Consolas' },
      },
    ],
    options: { fill: { color: fillColor } },
  };
}

function plainCell(text: string, fillColor: string): TableCellObj {
  return {
    text,
    options: { fill: { color: fillColor }, fontSize: 10, fontFace: 'Arial' },
  };
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
    {
      text: 'Metric',
      options: {
        bold: true,
        fill: { color: PPTX_THEME.tableHeader.fill },
        color: PPTX_THEME.tableHeader.color,
        fontSize: 10,
        fontFace: 'Arial',
      },
    },
    {
      text: 'As-Is',
      options: {
        bold: true,
        fill: { color: PPTX_THEME.tableHeader.fill },
        color: PPTX_THEME.tableHeader.color,
        fontSize: 10,
        fontFace: 'Arial',
      },
    },
    ...scenarios.map((scenario) => ({
      text: scenario.name,
      options: {
        bold: true,
        fill: { color: PPTX_THEME.tableHeader.fill },
        color: PPTX_THEME.tableHeader.color,
        fontSize: 10,
        fontFace: 'Arial',
      },
    })),
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
      label: 'CPU Util %',
      asIs:
        cluster.cpuUtilizationPercent !== undefined
          ? utilCell(cluster.cpuUtilizationPercent, PPTX_COLORS.pageBg)
          : plainCell('--', PPTX_COLORS.pageBg),
      scenarioValues: results.map((r) => utilCell(r.cpuUtilizationPercent, PPTX_COLORS.pageBg)),
    },
    {
      label: 'RAM Util %',
      asIs:
        cluster.ramUtilizationPercent !== undefined
          ? utilCell(cluster.ramUtilizationPercent, PPTX_COLORS.paper)
          : plainCell('--', PPTX_COLORS.paper),
      scenarioValues: results.map((r) => utilCell(r.ramUtilizationPercent, PPTX_COLORS.paper)),
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
