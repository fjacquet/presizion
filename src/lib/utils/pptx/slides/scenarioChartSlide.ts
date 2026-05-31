/** Per-scenario chart slides — capacity breakdown + min-nodes (when captured). */
import type PptxGenJS from 'pptxgenjs';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import type { ScenarioCharts } from '../chartTypes';
import { f1 } from '../format';
import { PPTX_COLORS } from '../primitives/colors';
import { dataCell, headerCell } from './_cells';
import { addFooter, addHeader, M } from './_layout';

interface ScenarioChartSlidesData {
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  breakdowns: readonly VsanCapacityBreakdown[];
  charts: readonly ScenarioCharts[];
  /** When false (disaggregated layout), the storage capacity row is omitted. */
  showStorage: boolean;
}

/** Strip `data:` prefix so pptxgenjs accepts it as `data`. */
function toPptxData(dataUrl: string): string {
  return dataUrl.replace(/^data:/, '');
}

/**
 * Emits per-scenario capacity + min-nodes chart slides. Returns the last slide
 * number used. `startNum` is the number of the slide preceding the first chart
 * slide (i.e. the comparison slide), so the first chart slide is `startNum + 1`.
 */
export function addScenarioChartSlides(
  pptx: PptxGenJS,
  d: ScenarioChartSlidesData,
  date: string,
  startNum: number,
): number {
  const { scenarios, breakdowns, charts, showStorage } = d;
  let num = startNum;

  scenarios.forEach((scenario, i) => {
    const bd = breakdowns[i];
    const sc = charts[i];

    // -- Capacity Chart slide (1 per scenario, includes breakdown table) --
    if (sc?.capacity && bd) {
      const s = pptx.addSlide();
      s.background = { color: PPTX_COLORS.paper };
      addHeader(s, `Capacity Breakdown — ${scenario.name}`);

      // Legend: colored squares + labels
      const legendItems = [
        { label: 'Required', color: PPTX_COLORS.primary500 },
        { label: 'Spare', color: PPTX_COLORS.primary300 },
        { label: 'Excess', color: PPTX_COLORS.accent },
      ];
      legendItems.forEach((item, li) => {
        const lx = M + li * 2.2;
        s.addText('', { x: lx, y: 1.15, w: 0.2, h: 0.2, fill: { color: item.color } });
        s.addText(item.label, {
          x: lx + 0.25,
          y: 1.13,
          w: 1.5,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: PPTX_COLORS.ink,
        });
      });

      // Chart image
      const imgW = 11.5;
      const imgH = (sc.capacity.height / sc.capacity.width) * imgW;
      s.addImage({
        data: toPptxData(sc.capacity.dataUrl),
        x: 0.7,
        y: 1.5,
        w: imgW,
        h: Math.min(imgH, 3.5),
      });

      // Absolute values table below chart
      const tableY = 1.5 + Math.min(imgH, 3.5) + 0.2;
      const capTableHeader = [
        headerCell('Resource'),
        headerCell('Required'),
        headerCell('Spare'),
        headerCell('Excess'),
        headerCell('Total'),
      ];
      const capTableSource: string[][] = [
        ['CPU GHz', f1(bd.cpu.required), f1(bd.cpu.spare), f1(bd.cpu.excess), f1(bd.cpu.total)],
        [
          'Memory GiB',
          f1(bd.memory.required),
          f1(bd.memory.spare),
          f1(bd.memory.excess),
          f1(bd.memory.total),
        ],
      ];
      // Disaggregated layout hides storage on the web — mirror that by omitting
      // the storage row. HCI (showStorage=true) keeps it for byte-identical output.
      if (showStorage) {
        capTableSource.push([
          'Raw Storage TiB',
          f1(bd.storage.required / 1024),
          f1(bd.storage.spare / 1024),
          f1(bd.storage.excess / 1024),
          f1(bd.storage.total / 1024),
        ]);
      }
      const capTableRows = capTableSource.map((cells, ri) =>
        cells.map((c, ci) => dataCell(c, ri, ci === 0)),
      );

      s.addTable([capTableHeader, ...capTableRows], {
        x: M,
        y: tableY,
        w: 12,
        colW: [3, 2.25, 2.25, 2.25, 2.25],
        border: { pt: 0.5, color: PPTX_COLORS.hairline },
      });
      addFooter(s, date, ++num);
    }

    // -- Min Nodes Chart slide (1 per scenario) --
    if (sc?.minnodes && bd) {
      const s = pptx.addSlide();
      s.background = { color: PPTX_COLORS.paper };
      addHeader(s, `Minimum Nodes per Constraint — ${scenario.name}`);

      s.addText('The binding constraint determines the minimum cluster size.', {
        x: M,
        y: 1.05,
        w: 12,
        h: 0.3,
        fontSize: 11,
        fontFace: 'Arial',
        color: PPTX_COLORS.inkMuted,
      });

      // Chart image
      const imgW = 11.5;
      const imgH = (sc.minnodes.height / sc.minnodes.width) * imgW;
      s.addImage({
        data: toPptxData(sc.minnodes.dataUrl),
        x: 0.7,
        y: 1.5,
        w: imgW,
        h: Math.min(imgH, 3.5),
      });

      // Constraint table below
      const tableY = 1.5 + Math.min(imgH, 3.5) + 0.2;
      const mnHeader = [headerCell('Constraint'), headerCell('Min Nodes'), headerCell('Binding?')];
      const constraints = Object.entries(bd.minNodesByConstraint);
      const maxNodes = Math.max(...constraints.map(([, v]) => v));
      const mnRows = constraints.map(([key, nodes], ri) => [
        dataCell(key.charAt(0).toUpperCase() + key.slice(1), ri, true),
        dataCell(String(nodes), ri),
        dataCell(nodes === maxNodes && nodes > 0 ? 'Yes' : '', ri, nodes === maxNodes && nodes > 0),
      ]);

      s.addTable([mnHeader, ...mnRows], {
        x: M,
        y: tableY,
        w: 8,
        colW: [3, 2.5, 2.5],
        border: { pt: 0.5, color: PPTX_COLORS.hairline },
      });
      addFooter(s, date, ++num);
    }
  });

  return num;
}
