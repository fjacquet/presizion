/** Executive Summary slide — KPI row + scenario summary table. */
import type PptxGenJS from 'pptxgenjs';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { PPTX_COLORS } from '../primitives/colors';
import { headerCell, plainCell, utilCell } from './_cells';
import { addFooter, addHeader, addKpiRow, M } from './_layout';

interface SummarySlideData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
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
    headerCell('Scenario', 11),
    headerCell('Servers', 11),
    headerCell('Limiting Resource', 11),
    headerCell('CPU Util %', 11),
    headerCell('RAM Util %', 11),
  ];

  const dataRows = scenarios.map((scenario, i) => {
    const r = results[i];
    return [
      plainCell(scenario.name, i),
      plainCell(r ? String(r.finalCount) : '-', i, true),
      plainCell(r ? r.limitingResource : '-', i),
      r ? utilCell(r.cpuUtilizationPercent, i) : plainCell('-', i, true),
      r ? utilCell(r.ramUtilizationPercent, i) : plainCell('-', i, true),
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
