# Presizion B3 — PPTX Rebuild (Arial/Midnight) + PDF Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the jsPDF export entirely (vatlas parity, locked decision) and rebuild the PowerPoint export into a vatlas-shaped `pptx/` module — Arial body/headings, Consolas metrics, Midnight Executive palette, low text density.

**Architecture:** Part A removes PDF cleanly (independent, do first). Part B decomposes the 720-line monolithic `exportPptx.ts` into a vatlas-style module: `pptx/primitives/colors.ts` (`PPTX_COLORS`, no-`#` hex), `pptx/theme.ts` (`SLIDE` geometry + `PPTX_THEME` fonts), `pptx/format.ts` (number/util helpers), `pptx/slides/_layout.ts` (shared header/KPI/footer helpers), `pptx/slides/*.ts` (one builder per slide), and `pptx/builder.ts` (`buildDeck(pptx, data)` composition root). `exportPptx.ts` shrinks to a thin wrapper: lazy-load pptxgenjs → capture charts → `buildDeck` → `writeFile`, keeping its public signature so `Step3ReviewExport` is unaffected.

**Tech Stack:** pptxgenjs (lazy-loaded), Vitest.

**Depends on:** B1 (brand hex values). Independent of B2.

---

## Spec coverage

Covers the "PPTX rebuild" section + the resolved "PDF export" open question:
- Drop `jspdf`/`jspdf-autotable`/`exportPdf.ts` (decision: **drop**) → Task A
- `pptx/theme.ts` (SLIDE + `PPTX_THEME`), `pptx/primitives/colors.ts` (`PPTX_COLORS`), `pptx/format.ts`, `pptx/slides/*` → Tasks B1–B5
- Title 28 / heading 20 / body 12 / muted 11 Arial; metric 12 Consolas bold; `LAYOUT_WIDE` 13.333×7.5; low text density → Task B2, B4

Out of scope: web restyle (B2), Recharts→ECharts (C). Charts are still captured from the live Recharts DOM via the existing `chartCapture` util.

---

## PART A — Drop PDF export

### Task A1: Remove PDF wiring from Step 3 (TDD via the existing test)

**Files:**
- Modify: `src/components/step3/Step3ReviewExport.tsx`
- Modify: `src/components/step3/__tests__/Step3ReviewExport.test.tsx`

- [ ] **Step 1: Delete the PDF iOS-guard test block first**

In `src/components/step3/__tests__/Step3ReviewExport.test.tsx`:
- Remove the `vi.mock('@/lib/utils/exportPdf', …)` block (lines ~13–15).
- In the `describe('REVIEW-04: iOS Safari PDF/PPTX guards', …)` block, delete the `it('pre-opens window.open on iOS before calling exportPdf', …)` test (the one importing `@/lib/utils/exportPdf` and clicking `/export pdf/i`). Keep any PPTX-specific iOS guard test.

- [ ] **Step 2: Run the test file to confirm it still parses + passes**

Run: `npm run test -- Step3ReviewExport`
Expected: PASS (no reference to the removed PDF mock).

- [ ] **Step 3: Remove PDF from the component**

In `src/components/step3/Step3ReviewExport.tsx`:
- Delete `import { exportPdf } from '@/lib/utils/exportPdf';` (line 25).
- Delete the `pdfLoading` state (line 49) and the entire `handleExportPdf` function (lines 109–133).
- Delete both "Export PDF" `<Button>` blocks (mobile drawer + desktop toolbar).
- Update the file header comment: drop `PDF-01, PDF-05` from the requirements line.

- [ ] **Step 4: Verify build + test**

Run: `npm run build && npm run test -- Step3ReviewExport`
Expected: green; no unused-import / undefined-symbol errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/step3/Step3ReviewExport.tsx src/components/step3/__tests__/Step3ReviewExport.test.tsx
git commit -m "feat(export): remove PDF export button + handlers from Step 3"
```

---

### Task A2: Delete the PDF module + dependencies

**Files:**
- Delete: `src/lib/utils/exportPdf.ts`, `src/lib/utils/__tests__/exportPdf.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Confirm nothing else imports the PDF module**

Run:
```bash
grep -rln "exportPdf\|jspdf" src --include="*.ts" --include="*.tsx" | grep -v "utils/exportPdf.ts\|__tests__/exportPdf.test.ts"
```
Expected: no output (Task A1 removed the only consumer).

- [ ] **Step 2: Delete the files and dependencies**

```bash
git rm src/lib/utils/exportPdf.ts src/lib/utils/__tests__/exportPdf.test.ts
npm uninstall jspdf jspdf-autotable
```

- [ ] **Step 3: Verify build, test, and that jspdf is gone from the bundle graph**

Run:
```bash
npm run build && npm run test
grep -rn "jspdf" src package.json
```
Expected: build + suite green; grep returns nothing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(export): drop jspdf + jspdf-autotable (vatlas parity)"
```

---

## PART B — Rebuild PPTX as a vatlas-shaped module

### Task B1: `pptx/primitives/colors.ts` — the Midnight palette (no `#`)

**Files:**
- Create: `src/lib/utils/pptx/primitives/colors.ts`

- [ ] **Step 1: Create the palette module**

```ts
/**
 * Midnight Executive palette for pptxgenjs (sub-project B).
 *
 * pptxgenjs convention: hex WITHOUT the leading `#`. Values mirror the
 * sRGB-hex form of `src/index.css` `@theme` tokens and `chartColors.ts` —
 * the single brand source shared with the web app and the ECharts theme (C).
 * Gold is the factual threshold marker only, never a verdict.
 */
export const PPTX_COLORS = {
  primary500: '3245b7',
  primary300: '819ae9',
  primary200: 'b0c2f9',
  surface200: 'd4d8de',
  surface700: '232933',
  surface800: '11161f',
  accent: 'f9b935',
  ink: '0f172a',
  inkMuted: '475569',
  paper: 'ffffff',
  pageBg: 'f8fafc',
  hairline: 'e2e8f0',
  /** Utilization status bands (match @theme util-low/mid/high). */
  utilLow: '4aa342',
  utilMid: 'ef8700',
  utilHigh: 'df202e',
} as const;

export type PptxColor = (typeof PPTX_COLORS)[keyof typeof PPTX_COLORS];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/pptx/primitives/colors.ts
git commit -m "feat(pptx): add Midnight Executive PPTX_COLORS palette module"
```

---

### Task B2: `pptx/theme.ts` — slide geometry + font theme

**Files:**
- Create: `src/lib/utils/pptx/theme.ts`

- [ ] **Step 1: Create the theme module**

```ts
/**
 * Midnight Executive PPTX theme — Arial body/headings, Consolas metrics,
 * 16:9 wide deck on the shipped sRGB-hex palette. Pure const module (no
 * React, no DOM), shaped like vatlas's pptx/theme.ts. Low text density:
 * the deck presents; the on-screen Step 3 review carries the detail.
 */
import { PPTX_COLORS } from './primitives/colors';

export const SLIDE = {
  /** pptxgenjs LAYOUT_WIDE = 13.333 × 7.5 in (16:9). */
  w: 13.333,
  h: 7.5,
  margin: 0.5,
} as const;

export const PPTX_THEME = {
  layout: 'LAYOUT_WIDE',
  bg: PPTX_COLORS.paper,
  title: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 28, bold: true },
  heading: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 20, bold: true },
  body: { color: PPTX_COLORS.ink, fontFace: 'Arial', fontSize: 12 },
  muted: { color: PPTX_COLORS.inkMuted, fontFace: 'Arial', fontSize: 11 },
  /** Metric values: Consolas, tabular — mirrors the on-screen idiom. */
  metric: { color: PPTX_COLORS.ink, fontFace: 'Consolas', fontSize: 12, bold: true },
  /** Table header fill (brand) + white text. */
  tableHeader: { fill: PPTX_COLORS.primary500, color: PPTX_COLORS.paper },
  series: [PPTX_COLORS.primary500, PPTX_COLORS.primary300, PPTX_COLORS.primary200],
  flagFill: PPTX_COLORS.accent,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/pptx/theme.ts
git commit -m "feat(pptx): add Arial/Consolas Midnight PPTX_THEME + SLIDE geometry"
```

---

### Task B3: `pptx/format.ts` — number + utilization helpers (TDD)

**Files:**
- Create: `src/lib/utils/pptx/format.ts`
- Test: `src/lib/utils/pptx/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/pptx/__tests__/format.test.ts`:

```ts
import { expect, it } from 'vitest';
import { PPTX_COLORS } from '../primitives/colors';
import { f1, utilBandColor } from '../format';

it('f1 formats to one decimal place', () => {
  expect(f1(74.36)).toBe('74.4');
  expect(f1(10)).toBe('10.0');
});

it('utilBandColor maps utilization % to status bands', () => {
  expect(utilBandColor(50)).toBe(PPTX_COLORS.utilLow); // < 70 green
  expect(utilBandColor(80)).toBe(PPTX_COLORS.utilMid); // 70–85 orange
  expect(utilBandColor(95)).toBe(PPTX_COLORS.utilHigh); // > 85 red
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- pptx/format`
Expected: FAIL — `../format` does not exist.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/utils/pptx/format.ts`:

```ts
/**
 * Number + utilization formatting for the PPTX deck. Single-locale for now;
 * sub-project E adds i18n. Thresholds match the on-screen util color coding.
 */
import { PPTX_COLORS } from './primitives/colors';

/** Format a number to one decimal place. */
export function f1(n: number): string {
  return n.toFixed(1);
}

/** Utilization % → status-band hex (no `#`): <70 low, ≤85 mid, else high. */
export function utilBandColor(pct: number): string {
  if (pct < 70) return PPTX_COLORS.utilLow;
  if (pct <= 85) return PPTX_COLORS.utilMid;
  return PPTX_COLORS.utilHigh;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- pptx/format`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/pptx/format.ts src/lib/utils/pptx/__tests__/format.test.ts
git commit -m "feat(pptx): add f1 + utilBandColor format helpers"
```

---

### Task B4: `pptx/slides/_layout.ts` + slide builders

**Files:**
- Create: `src/lib/utils/pptx/slides/_layout.ts`
- Create: `src/lib/utils/pptx/slides/titleSlide.ts`
- Create: `src/lib/utils/pptx/slides/summarySlide.ts`
- Create: `src/lib/utils/pptx/slides/comparisonSlide.ts`
- Create: `src/lib/utils/pptx/slides/scenarioChartSlide.ts`

These port the **content** of the old `exportPptx.ts` (executive summary, As-Is vs To-Be comparison rows, per-scenario capacity + min-nodes chart slides) into per-slide modules, swapping every old constant per this table:

| Old constant (`exportPptx.ts`) | New source |
|---|---|
| `FONT = 'Calibri'` | `PPTX_THEME.body.fontFace` = `'Arial'` (metrics → `'Consolas'`) |
| `NAVY = '1E3A5F'` (title bg, headers) | `PPTX_COLORS.primary500` for table headers; title slide uses `paper` bg + `ink` text |
| `BLUE = '3B82F6'` | `PPTX_COLORS.primary500` |
| `GREEN/AMBER` (legend) | `PPTX_COLORS.primary300` / `PPTX_COLORS.accent` |
| `GRAY = '6B7280'` (muted) | `PPTX_COLORS.inkMuted` |
| `LIGHT_GRAY = 'F3F4F6'` (row stripe) | `PPTX_COLORS.pageBg` |
| `KPI_FILL = 'E8EDF2'` | `PPTX_COLORS.surface200` |
| `UTIL_GREEN/AMBER/RED` | `utilBandColor()` from `format.ts` |
| KPI value `fontSize: 44` | `28` (low density) |

- [ ] **Step 1: Create `_layout.ts` shared helpers**

```ts
/** Shared slide geometry + header/KPI/footer helpers (vatlas _layout shape). */
import type PptxGenJS from 'pptxgenjs';
import { SLIDE } from '../theme';
import { PPTX_COLORS } from '../primitives/colors';

export const M = SLIDE.margin;

type Slide = ReturnType<PptxGenJS['addSlide']>;

/** Title header with a brand accent strip; returns the y below the header. */
export function addHeader(s: Slide, title: string): number {
  s.addText('', { x: 0, y: 0, w: 0.18, h: SLIDE.h, fill: { color: PPTX_COLORS.primary500 } });
  s.addText(title, {
    x: M,
    y: 0.3,
    w: SLIDE.w - 2 * M,
    h: 0.6,
    fontFace: 'Arial',
    fontSize: 20,
    bold: true,
    color: PPTX_COLORS.ink,
    margin: 0,
  });
  return 1.1;
}

/** Row of KPI callouts (value + label). Returns the y below the row. */
export function addKpiRow(
  s: Slide,
  items: ReadonlyArray<{ value: string; label: string }>,
  y: number,
): number {
  const colW = (SLIDE.w - 2 * M) / items.length;
  items.forEach((item, i) => {
    const x = M + i * colW;
    s.addText(item.value, {
      x,
      y,
      w: colW * 0.9,
      h: 0.6,
      shape: 'roundRect',
      rectRadius: 0.06,
      fill: { color: PPTX_COLORS.surface200 },
      fontFace: 'Consolas',
      fontSize: 22,
      bold: true,
      color: PPTX_COLORS.ink,
      align: 'center',
      valign: 'middle',
    });
    s.addText(item.label, {
      x,
      y: y + 0.65,
      w: colW * 0.9,
      h: 0.3,
      fontFace: 'Arial',
      fontSize: 11,
      color: PPTX_COLORS.inkMuted,
      align: 'center',
    });
  });
  return y + 1.1;
}

/** Footer: product mark + date + slide number. */
export function addFooter(s: Slide, date: string, num: number): void {
  s.addText(
    [
      { text: 'Presizion', options: { bold: true, color: PPTX_COLORS.primary500, fontSize: 8, fontFace: 'Arial' } },
      { text: `  |  ${date}  |  Slide ${num}`, options: { color: PPTX_COLORS.inkMuted, fontSize: 8, fontFace: 'Arial' } },
    ],
    { x: M, y: SLIDE.h - 0.45, w: SLIDE.w - 2 * M, h: 0.3 },
  );
}
```

- [ ] **Step 2: Create the four slide builders**

Port the corresponding sections of the old `exportPptx.ts` into:
- `titleSlide.ts` → `addTitleSlide(pptx, { cluster, scenarioCount, date, logoDataUrl })`: paper bg, `ink` 28pt Arial title "Cluster Sizing Report", `inkMuted` 12pt subtitle with VM/vCPU/pCore/scenario counts, optional logo via `getLogoDataUrl()` (keep `logoDataUrl.ts`).
- `summarySlide.ts` → `addSummarySlide(pptx, { cluster, scenarios, results }, date, num)`: `addHeader` + `addKpiRow` (As-Is servers / target servers / CPU% / RAM%) + the executive-summary table using `PPTX_THEME.tableHeader` for the header row, `pageBg`/`paper` row stripes, and `utilBandColor()` dot cells.
- `comparisonSlide.ts` → `addComparisonSlide(pptx, { cluster, scenarios, results, breakdowns }, date, num)`: the full As-Is vs To-Be metric table (port the `compMetrics` array verbatim — it is the spec's authoritative comparison; only swap colors/fonts).
- `scenarioChartSlide.ts` → `addScenarioChartSlides(pptx, { scenarios, results, breakdowns, charts }, date, startNum)`: per-scenario capacity + min-nodes chart slides (only when a captured chart image exists), using `f1()` and the new palette.

Each slide builder takes a `pptx` instance and uses `addHeader/addKpiRow/addFooter`. Metric/number cells use `fontFace: 'Consolas'`; labels/headings use `'Arial'`.

- [ ] **Step 3: Build check (modules compile in isolation)**

Run: `npm run build`
Expected: success (the builder/wrapper wiring lands in B5; these modules are import-clean).

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/pptx/slides
git commit -m "feat(pptx): add _layout helpers + title/summary/comparison/scenario slide builders"
```

---

### Task B5: `pptx/builder.ts` + rewire `exportPptx.ts` (TDD on the existing test)

**Files:**
- Create: `src/lib/utils/pptx/builder.ts`
- Rewrite: `src/lib/utils/exportPptx.ts`
- Rewrite: `src/lib/utils/__tests__/exportPptx.test.ts`

- [ ] **Step 1: Flip the test palette/font expectations to red**

In `src/lib/utils/__tests__/exportPptx.test.ts`, update the visual assertions to the Midnight palette + Arial (keep the slide-count and structural assertions):
- The "navy accent strip" test: expect the CONTENT accent fill to be `PPTX_COLORS.primary500` i.e. `'3245b7'` (was `'1E3A5F'`). If slide-masters are no longer used (per-slide `addHeader` strip instead), replace this test with one asserting `mockAddText` was called with `fill: { color: '3245b7' }` for the strip.
- The "navy fill in table header" test: expect header fills to **contain `'3245b7'`** and **not contain `'1E3A5F'`** or `'3B82F6'`.
- The KPI test: expect `fill` `{ color: 'd4d8de' }` (surface200) instead of `'E8EDF2'`.
- Add a font assertion: at least one `mockAddText` call uses `fontFace: 'Arial'`, and at least one uses `fontFace: 'Consolas'`; **none** uses `'Calibri'`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- exportPptx`
Expected: FAIL — current module still emits `1E3A5F` / `Calibri`.

- [ ] **Step 3: Create `builder.ts` composition root**

```ts
/** PPTX deck composition root — emits slides in a fixed order onto a passed
 *  pptx instance. Pure-ish: no lazy import, no writeFile (that is the
 *  exportPptx wrapper's job), so the deck structure is unit-testable. */
import type PptxGenJS from 'pptxgenjs';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import type { ScenarioCharts } from './chartTypes';
import { addComparisonSlide } from './slides/comparisonSlide';
import { addScenarioChartSlides } from './slides/scenarioChartSlide';
import { addSummarySlide } from './slides/summarySlide';
import { addTitleSlide } from './slides/titleSlide';

export interface DeckData {
  cluster: OldCluster;
  scenarios: readonly Scenario[];
  results: readonly ScenarioResult[];
  breakdowns: readonly VsanCapacityBreakdown[];
  charts: readonly ScenarioCharts[];
  date: string;
  logoDataUrl?: string;
}

export function buildDeck(pptx: PptxGenJS, d: DeckData): void {
  pptx.layout = 'LAYOUT_WIDE';
  let num = 0;
  addTitleSlide(pptx, d);
  num++;
  addSummarySlide(pptx, d, d.date, ++num);
  addComparisonSlide(pptx, d, d.date, ++num);
  addScenarioChartSlides(pptx, d, d.date, num);
}
```

(Define `ScenarioCharts` in a small `pptx/chartTypes.ts` re-exporting the existing capture shape from `chartCapture`.)

- [ ] **Step 4: Shrink `exportPptx.ts` to a thin wrapper**

Rewrite `src/lib/utils/exportPptx.ts` to keep its exact public signature `exportPptx(cluster, scenarios, results, breakdowns, chartRefs)`:

```ts
import { chartRefToDataUrl } from '@/lib/utils/chartCapture';
import { getLogoDataUrl } from '@/lib/utils/logoDataUrl';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import { buildDeck } from './pptx/builder';
import type { ScenarioCharts } from './pptx/chartTypes';

async function captureAllCharts(
  scenarios: readonly Scenario[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<readonly ScenarioCharts[]> {
  return Promise.all(
    scenarios.map(async (s) => ({
      capacity: await chartRefToDataUrl(chartRefs[`capacity-${s.id}`] ?? null),
      minnodes: await chartRefToDataUrl(chartRefs[`minnodes-${s.id}`] ?? null),
    })),
  );
}

export async function exportPptx(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const charts = await captureAllCharts(scenarios, chartRefs);
  const logoDataUrl = (await getLogoDataUrl().catch(() => undefined)) ?? undefined;
  const pptx = new PptxGenJS();
  pptx.author = 'Presizion';
  pptx.title = 'Cluster Sizing Report';
  buildDeck(pptx, {
    cluster,
    scenarios,
    results,
    breakdowns,
    charts,
    date: new Date().toLocaleDateString(),
    ...(logoDataUrl ? { logoDataUrl } : {}),
  });
  await pptx.writeFile({ fileName: 'presizion-sizing-report.pptx' });
}
```

(Note `exactOptionalPropertyTypes`: spread `logoDataUrl` conditionally rather than assigning `undefined`.)

- [ ] **Step 5: Run to verify the updated test passes**

Run: `npm run test -- exportPptx`
Expected: PASS — headers now `3245b7`, KPI fill `d4d8de`, fonts Arial/Consolas, no Calibri; slide-count assertions still hold (Title + Summary + Comparison = 3 without charts).

- [ ] **Step 6: Full suite + build + lint**

Run:
```bash
npm run build && npm run test && npx biome check .
```
Expected: all green; Biome no new errors.

- [ ] **Step 7: Manual export verification**

`npm run dev` → Step 3 → Export PPTX. Open the `.pptx`:
- Title/headings render in **Arial**, metric values in **Consolas**.
- Table headers + accent strips are brand navy (`#3245b7`); KPI fills `#d4d8de`; utilization dots green/orange/red.
- Deck opens without a "Repair" prompt; charts (if present on screen) appear.

- [ ] **Step 8: Commit**

```bash
git add src/lib/utils/pptx/builder.ts src/lib/utils/pptx/chartTypes.ts src/lib/utils/exportPptx.ts src/lib/utils/__tests__/exportPptx.test.ts
git commit -m "feat(pptx): rebuild deck via vatlas-shaped pptx/ module (Arial/Midnight)"
```

---

## Self-review

- **Spec coverage:** PDF dropped with deps (A1–A2); `pptx/primitives/colors.ts` (B1), `pptx/theme.ts` with Arial 28/20/12/11 + Consolas 12 (B2), `pptx/format.ts` (B3), `pptx/slides/*` + `_layout.ts` (B4), `pptx/builder.ts` composition + thin wrapper (B5). LAYOUT_WIDE 13.333×7.5 in `SLIDE`. Low density via reduced KPI font + presentational tables.
- **Placeholder scan:** colors/theme/format/_layout/builder/wrapper are full code; the four slide builders are a verbatim content-port with an explicit old→new constant table (no "style appropriately" placeholders — every constant has a named replacement).
- **Type consistency:** `exportPptx` keeps its 5-arg signature; `ScenarioCharts` (capacity/minnodes) is the same shape the old module used and is centralized in `pptx/chartTypes.ts`; `buildDeck` consumes `DeckData`; `exactOptionalPropertyTypes` honored via conditional spread of `logoDataUrl`.
- **Ordering:** Part A is independent and first; Part B depends only on B1's hex values. Charts remain Recharts captures — coordinate the chart *image* palette with sub-project C, not here.
