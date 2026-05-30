/** Executive Summary slide — KPI row + scenario summary table. */
import type PptxGenJS from 'pptxgenjs';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { utilBandColor } from '../format';
import { PPTX_COLORS } from '../primitives/colors';
import { PPTX_THEME } from '../theme';
import { addFooter, addHeader, addKpiRow, M } from './_layout';

interface SummarySlideData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
}

function headerCell(text: string) {
  return {
    text,
    options: {
      bold: true,
      fill: { color: PPTX_THEME.tableHeader.fill },
      color: PPTX_THEME.tableHeader.color,
      fontSize: 11,
      fontFace: 'Arial',
    },
  };
}

/** Util cell with a colored band dot prefix (Consolas value). */
function utilCell(pct: number, fillColor: string) {
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

function plainCell(text: string, fillColor: string, mono = false) {
  return {
    text,
    options: {
      fill: { color: fillColor },
      fontSize: 10,
      fontFace: mono ? 'Consolas' : 'Arial',
    },
  };
}

export function addSummarySlide(
  pptx: PptxGenJS,
  d: SummarySlideData,
  date: string,
  num: number,
): void {
  const { cluster, scenarios, results } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  const headerBottom = addHeader(s, 'Executive Summary');

  // KPI callouts for key numbers (low density)
  const bestResult = results[0];
  let tableY = headerBottom + 0.1;
  if (bestResult) {
    tableY = addKpiRow(
      s,
      [
        { value: String(cluster.existingServerCount ?? '?'), label: 'As-Is Servers' },
        {
          value: String(bestResult.finalCount),
          label: `${scenarios[0]?.name ?? 'Target'} Servers`,
        },
        { value: `${bestResult.cpuUtilizationPercent.toFixed(0)}%`, label: 'CPU Utilization' },
        { value: `${bestResult.ramUtilizationPercent.toFixed(0)}%`, label: 'RAM Utilization' },
      ],
      tableY,
    );
    tableY += 0.2;
  }

  const headerRow = [
    headerCell('Scenario'),
    headerCell('Servers'),
    headerCell('Limiting Resource'),
    headerCell('CPU Util %'),
    headerCell('RAM Util %'),
  ];

  const dataRows = scenarios.map((scenario, i) => {
    const r = results[i];
    const fillColor = i % 2 === 0 ? PPTX_COLORS.pageBg : PPTX_COLORS.paper;
    return [
      plainCell(scenario.name, fillColor),
      plainCell(r ? String(r.finalCount) : '-', fillColor, true),
      plainCell(r ? r.limitingResource : '-', fillColor),
      r ? utilCell(r.cpuUtilizationPercent, fillColor) : plainCell('-', fillColor, true),
      r ? utilCell(r.ramUtilizationPercent, fillColor) : plainCell('-', fillColor, true),
    ];
  });

  s.addTable([headerRow, ...dataRows], {
    x: M,
    y: tableY,
    w: 12,
    colW: [4, 2, 2.5, 1.75, 1.75],
    border: { pt: 0.5, color: PPTX_COLORS.hairline },
  });

  addFooter(s, date, num);
}
