/**
 * Midnight Executive ECharts theme — light + dark (sub-project C).
 *
 * Pure data module (no React/DOM). zrender (ECharts' renderer) parses only
 * hex/rgb(a)/hsl(a)/named — an `oklch()` string silently falls back to black —
 * so every value here is the sRGB-hex mirror of the `src/index.css` @theme
 * tokens. The brand series reuses `chartColors.ts` (single source); axis/grid
 * text use Tailwind slate hexes (never pure black/white).
 *
 * Registered once at module load by `<Chart>`:
 *   echarts.registerTheme('midnight-executive', MIDNIGHT_EXECUTIVE_LIGHT)
 *   echarts.registerTheme('midnight-executive-dark', MIDNIGHT_EXECUTIVE_DARK)
 */
import { CHART_COLORS } from '@/lib/sizing/chartColors';

const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';
const SLATE_200 = '#e2e8f0';
const SURFACE_700 = '#232933';
const SURFACE_800 = '#11161f';

/** Non-series semantic colors used directly by option builders. */
export const STATUS_COLORS = {
  /** As-Is reference bar/line + non-binding constraint bars (slate-400). */
  asIs: SLATE_400,
  nonBinding: SLATE_400,
  /** Binding constraint + primary series (brand primary-500). */
  binding: CHART_COLORS[0],
  /** Capacity stack segments. */
  required: CHART_COLORS[0],
  spare: CHART_COLORS[1],
  excess: CHART_COLORS[2],
} as const;

export interface MidnightEChartsTheme {
  readonly color: readonly string[];
  readonly backgroundColor: string;
  readonly textStyle: { readonly color: string };
  readonly categoryAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } };
    readonly splitLine: { readonly lineStyle: { readonly color: string } };
    readonly axisLabel: { readonly color: string };
  };
  readonly valueAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } };
    readonly splitLine: { readonly lineStyle: { readonly color: string } };
    readonly axisLabel: { readonly color: string };
  };
  readonly tooltip: {
    readonly backgroundColor: string;
    readonly borderColor: string;
    readonly textStyle: { readonly color: string };
  };
}

export const MIDNIGHT_EXECUTIVE_LIGHT: MidnightEChartsTheme = {
  color: [...CHART_COLORS],
  backgroundColor: 'transparent',
  textStyle: { color: SLATE_500 },
  categoryAxis: {
    axisLine: { lineStyle: { color: SLATE_500 } },
    splitLine: { lineStyle: { color: SLATE_200 } },
    axisLabel: { color: SLATE_500 },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: SLATE_500 } },
    splitLine: { lineStyle: { color: SLATE_200 } },
    axisLabel: { color: SLATE_500 },
  },
  tooltip: { backgroundColor: '#ffffff', borderColor: SLATE_200, textStyle: { color: SLATE_500 } },
};

export const MIDNIGHT_EXECUTIVE_DARK: MidnightEChartsTheme = {
  color: [...CHART_COLORS],
  backgroundColor: 'transparent',
  textStyle: { color: SLATE_400 },
  categoryAxis: {
    axisLine: { lineStyle: { color: SLATE_400 } },
    splitLine: { lineStyle: { color: SURFACE_700 } },
    axisLabel: { color: SLATE_400 },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: SLATE_400 } },
    splitLine: { lineStyle: { color: SURFACE_700 } },
    axisLabel: { color: SLATE_400 },
  },
  tooltip: {
    backgroundColor: SURFACE_800,
    borderColor: SURFACE_700,
    textStyle: { color: SLATE_400 },
  },
};
