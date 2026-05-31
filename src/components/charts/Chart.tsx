import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts/types/dist/shared';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { CSSProperties } from 'react';
import { MIDNIGHT_EXECUTIVE_DARK, MIDNIGHT_EXECUTIVE_LIGHT } from '@/theme/echartsTheme';
import { useResolvedTheme } from './useResolvedTheme';

// Tree-shaken registry — ONLY what the 4 step-3 charts use. The full `echarts`
// barrel (~1 MB) is forbidden; always import from echarts/core + subpaths.
// SVG renderer only (scalable download; PPTX rasterizes via chartImage.ts).
echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  SVGRenderer,
]);

echarts.registerTheme('midnight-executive', MIDNIGHT_EXECUTIVE_LIGHT);
echarts.registerTheme('midnight-executive-dark', MIDNIGHT_EXECUTIVE_DARK);

export type EChartsInstance = echarts.ECharts;

export interface ChartProps {
  option: EChartsOption;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  /** Receives the live instance for SVG download / PPTX capture. */
  onReady?: (instance: EChartsInstance) => void;
}

export function Chart({ option, style, className, ariaLabel, onReady }: ChartProps) {
  // ECharts fixes theme at init — remount on theme change by keying the node.
  const resolved = useResolvedTheme();
  const theme = resolved === 'dark' ? 'midnight-executive-dark' : 'midnight-executive';
  return (
    <ReactEChartsCore
      key={theme}
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      opts={{ renderer: 'svg' }}
      theme={theme}
      className={className}
      style={style ?? { height: '100%', width: '100%' }}
      aria-label={ariaLabel}
      {...(onReady ? { onChartReady: onReady } : {})}
    />
  );
}
