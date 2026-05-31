/** Executive Summary slide — KPI row + scenario summary table. */

import type PptxGenJS from 'pptxgenjs';
import i18n from '@/i18n';
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
  const t = i18n.t.bind(i18n);
  const { cluster, scenarios, results } = d;
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };
  const headerBottom = addHeader(s, t('pptx:slide.executiveSummary'));

  // KPI callouts for key numbers (low density)
  const bestResult = results[0];
  let tableY = headerBottom + 0.1;
  if (bestResult) {
    tableY = addKpiRow(
      s,
      [
        { value: String(cluster.existingServerCount ?? '?'), label: t('pptx:kpi.asIsServers') },
        {
          value: String(bestResult.finalCount),
          label: t('pptx:kpi.targetServers', { name: scenarios[0]?.name ?? 'Target' }),
        },
        {
          value: `${bestResult.cpuUtilizationPercent.toFixed(0)}%`,
          label: t('pptx:kpi.cpuUtilization'),
        },
        {
          value: `${bestResult.ramUtilizationPercent.toFixed(0)}%`,
          label: t('pptx:kpi.ramUtilization'),
        },
      ],
      tableY,
    );
    tableY += 0.2;
  }

  const headerRow = [
    headerCell(t('pptx:summary.colScenario'), 11),
    headerCell(t('pptx:summary.colServers'), 11),
    headerCell(t('pptx:summary.colLimitingResource'), 11),
    headerCell(t('pptx:summary.colCpuUtil'), 11),
    headerCell(t('pptx:summary.colRamUtil'), 11),
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
