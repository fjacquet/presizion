/** Title slide — paper background, Arial 28pt title, muted subtitle, optional logo. */
import type PptxGenJS from 'pptxgenjs';
import type { OldCluster, Scenario } from '@/types/cluster';
import { PPTX_COLORS } from '../primitives/colors';
import { SLIDE } from '../theme';
import { M } from './_layout';

interface TitleSlideData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  date: string;
  logoDataUrl?: string;
}

export function addTitleSlide(pptx: PptxGenJS, d: TitleSlideData): void {
  const s = pptx.addSlide();
  s.background = { color: PPTX_COLORS.paper };

  // Brand accent strip
  s.addText('', { x: 0, y: 0, w: 0.18, h: SLIDE.h, fill: { color: PPTX_COLORS.primary500 } });

  if (d.logoDataUrl) {
    s.addImage({ data: d.logoDataUrl, x: M, y: 0.8, w: 4, h: 1 });
  }

  s.addText('Cluster Sizing Report', {
    x: M,
    y: 2.2,
    w: SLIDE.w - 2 * M,
    h: 1.2,
    fontFace: 'Arial',
    fontSize: 28,
    bold: true,
    color: PPTX_COLORS.ink,
  });

  const scenarioCount = d.scenarios.length;
  s.addText(
    `${d.cluster.totalVms} VMs  |  ${d.cluster.totalVcpus} vCPUs  |  ${d.cluster.totalPcores} pCores  |  ${scenarioCount} scenario${scenarioCount > 1 ? 's' : ''}`,
    {
      x: M,
      y: 3.5,
      w: SLIDE.w - 2 * M,
      h: 0.6,
      fontFace: 'Arial',
      fontSize: 12,
      color: PPTX_COLORS.inkMuted,
    },
  );

  s.addText(d.date, {
    x: M,
    y: 4.2,
    w: SLIDE.w - 2 * M,
    h: 0.4,
    fontFace: 'Arial',
    fontSize: 11,
    color: PPTX_COLORS.inkMuted,
  });
}
