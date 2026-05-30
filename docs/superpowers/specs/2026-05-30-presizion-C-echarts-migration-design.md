# Sub-project C — Charts: Recharts → ECharts — Design

**Date:** 2026-05-30
**Status:** Scoped; to be planned after A (and coordinated with B on palette)
**Parent:** `2026-05-30-presizion-simplification-design.md`

## Goal

Replace Recharts with **ECharts** + `echarts-for-react`, driven by a shared
`echartsTheme` ported from vatlas, so charts are visually identical across both tools.

## Why after A

A reduces the data feeding the charts (modes 4→2, buffers 7→2). Migrating charts after
the data model settles avoids re-touching chart inputs twice.

## Current state (Recharts)

Charts in `src/components/step3/`: `SizingChart`, `CoreCountChart`,
`CapacityStackedChart`, `MinNodesChart`. Color via `src/lib/sizing/chartColors.ts`.
PNG export via `src/lib/utils/downloadChartPng.ts` + `chartCapture.ts` (DOM capture).
Deps: `recharts@^3.8.1`.

## Approach

1. Add deps `echarts@^6`, `echarts-for-react@^3`; remove `recharts`.
2. Port vatlas `src/theme/echartsTheme.ts` (Midnight Executive light + dark, registered
   once as `midnight-executive` / `midnight-executive-dark`). Tokens emitted as sRGB hex
   (zrender can't parse `oklch`). Reuses B's palette — single source of truth.
3. Build a thin `<Chart>` wrapper that registers the themes and selects light/dark from
   `useThemeStore` (respecting auto mode).
4. Re-implement each chart as an ECharts `option` object:
   - SizingChart (bar — servers per scenario)
   - CoreCountChart (bar — cores)
   - CapacityStackedChart (stacked bar — constraint breakdown)
   - MinNodesChart (bar/line — limiting constraint)
5. Replace PNG export with ECharts' native `getDataURL()` / `getConnectedDataURL()`,
   retiring the DOM-capture path (`chartCapture.ts`, `downloadChartPng.ts`) where the
   ECharts API supersedes it.

   > **Validated (context7, Apache ECharts docs):** an instance exposes
   > `getDataURL({ type: 'png', pixelRatio, backgroundColor, excludeComponents })`
   > → base64 PNG (canvas renderer); multiple charts registered via `echarts.connect`
   > export together with `getConnectedDataURL(...)`. `excludeComponents: ['toolbox']`
   > drops chrome from the image. Use `pixelRatio: 2` + token `backgroundColor` for a
   > crisp, theme-correct export. Confirms the DOM-capture path is fully replaceable.

## Files touched

`package.json`, new `src/theme/echartsTheme.ts` + `<Chart>` wrapper, the 4 step3 chart
components, `src/lib/sizing/chartColors.ts` (fold into theme tokens),
`src/lib/utils/downloadChartPng.ts` + `chartCapture.ts` (replace), `Step3ReviewExport`.

## Open questions (resolve during C planning)

- **PNG export path:** confirm `getDataURL` covers all current export call sites
  (single chart vs combined). If charts must export together, use
  `echarts.connect` + `getConnectedDataURL`.
- **Chart inventory after A:** verify all 4 charts still make sense once buffers/modes
  shrink (e.g. does the constraint-breakdown chart change shape?).
- **Dark-mode re-render:** ensure theme switch re-inits the instance (ECharts theme is
  set at init) — wrapper must key/re-create on theme change.
- **Bundle size:** import ECharts modularly (`echarts/core` + needed charts/components)
  vs full build — check against any bundle budget.

## Testing / verification

- Each chart renders in light + dark with correct series colors.
- PNG export produces a non-empty image matching on-screen.
- `npm run build` / `test` green; bundle size acceptable.

## Out of scope

Sizing logic (A); web component restyle / shadcn removal (B); i18n (E). Palette is
shared with B — coordinate, don't duplicate.
