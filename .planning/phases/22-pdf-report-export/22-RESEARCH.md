# Phase 22: PDF Report Export - Research

**Researched:** 2026-03-15
**Domain:** Client-side PDF generation (jsPDF + jspdf-autotable), SVG-to-canvas chart embedding
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PDF-01 | User can export a professional PDF report from Step 3 | Button wired in Step3ReviewExport.tsx alongside existing export buttons |
| PDF-02 | PDF includes: title page with project info, executive summary table, capacity breakdown tables (CPU/Memory/Storage), stacked capacity chart images, comparison table | jsPDF text/addImage + jspdf-autotable cover all content types; chart images via SVG→canvas→dataURL reusing existing downloadChartPng pipeline logic |
| PDF-03 | PDF is generated client-side using jsPDF + jspdf-autotable (lazy-loaded) | Dynamic `import('jspdf')` + `import('jspdf-autotable')` pattern verified in codebase (same as XLSX/JSZip) |
| PDF-04 | Charts are embedded as PNG images (SVG → canvas → data URL) | XMLSerializer + canvas + Image.onload pattern already implemented in downloadChartPng.ts; adapt to return dataURL instead of triggering download |
| PDF-05 | PDF export button appears alongside existing export buttons in Step 3 | Step3ReviewExport.tsx has a clear button row that can accept a new "Export PDF" Button |
</phase_requirements>

---

## Summary

Phase 22 adds client-side PDF report generation using jsPDF ^4.2.0 + jspdf-autotable ^5.0.7. The decision to use these libraries is already locked in STACK.md with versions confirmed. Both packages must be lazy-loaded via dynamic `import()` to keep the initial bundle from growing by ~350KB; this exact pattern is already used in the codebase for XLSX and JSZip imports.

The chart embedding pipeline (SVG → canvas → PNG data URL) is already 90% implemented in `src/lib/utils/downloadChartPng.ts`. That function serializes SVG, draws it on a canvas, and triggers a download. For PDF embedding, the same logic is needed but the final step changes from `canvas.toBlob(download)` to `canvas.toDataURL('image/png')` fed into `doc.addImage()`. The critical implementation insight is that this must be wrapped in a Promise that resolves once `img.onload` fires — the same asynchronous pattern already present in the file.

The new `exportPdf.ts` utility function takes `OldCluster`, `Scenario[]`, `ScenarioResult[]`, `VsanCapacityBreakdown[]`, and `Record<string, HTMLDivElement | null>` (chart refs) as arguments, constructs the full PDF document imperatively, and triggers a save — all without any React rendering or server calls.

**Primary recommendation:** Single async function `exportPdf(cluster, scenarios, results, breakdowns, chartRefs)` in `src/lib/utils/exportPdf.ts`. It lazy-loads jsPDF and jspdf-autotable, captures chart images sequentially (async), builds all pages imperatively, then calls `doc.save()`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jspdf | ^4.2.0 | PDF document creation, text, images, pages | Already decided in STACK.md; ~300KB lazy-loaded; browser-native only |
| jspdf-autotable | ^5.0.7 | Structured table rendering in PDF with auto-pagination | Companion plugin; correct version for jsPDF 4.x; ~50KB |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (browser) XMLSerializer | built-in | Serialize SVG elements to string for canvas drawing | Already used in downloadChartPng.ts |
| (browser) HTMLCanvasElement | built-in | Convert SVG to rasterized PNG data URL | Same pipeline as existing chart PNG download |

### Alternatives Considered (Already Rejected in STACK.md)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF | @react-pdf/renderer | ~450KB gzip, doubles with Vite workers; rejected |
| jsPDF | html2canvas + jsPDF | DOM screenshot = blurry text, non-selectable; rejected |
| jsPDF | puppeteer/playwright | Requires backend; violates client-side-only constraint |

**Installation:**
```bash
npm install jspdf@^4.2.0 jspdf-autotable@^5.0.7
```

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New file follows the existing utils pattern:

```
src/
└── lib/
    └── utils/
        ├── exportPdf.ts          # NEW: lazy-loads jsPDF, builds full PDF
        ├── downloadChartPng.ts   # EXISTING: reuse SVG→canvas logic
        ├── export.ts             # EXISTING: CSV/JSON exports
        └── __tests__/
            └── exportPdf.test.ts # NEW: unit tests for PDF builder
```

The `exportPdf.ts` utility is called from `Step3ReviewExport.tsx` via a button handler. No new components needed.

### Pattern 1: Dynamic Import of jsPDF (Lazy Load)

**What:** Import jsPDF and jspdf-autotable only at the moment the user clicks "Export PDF".
**When to use:** Always — never statically import these 350KB libraries.
**Example:**
```typescript
// Source: codebase pattern from src/lib/utils/import/formatDetector.ts
// Same pattern established for @e965/xlsx and jszip

export async function exportPdf(/* args */): Promise<void> {
  // Lazy-load both libraries simultaneously
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  // ... build PDF content ...
  doc.save('presizion-report.pdf')
}
```

### Pattern 2: SVG Chart to Data URL (for PDF embedding)

**What:** Serialize chart SVG → draw on canvas → return PNG data URL. Reuse the XMLSerializer pipeline from `downloadChartPng.ts`.
**When to use:** For each chart ref before building PDF content.
**Example:**
```typescript
// Source: adapted from src/lib/utils/downloadChartPng.ts

function chartRefToDataUrl(
  container: HTMLDivElement | null,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const svg = container?.querySelector('svg')
    if (!svg) { resolve(null); return }

    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const w = svg.clientWidth
      const h = svg.clientHeight
      const canvas = document.createElement('canvas')
      canvas.width = w * 2   // 2x for retina
      canvas.height = h * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}
```

### Pattern 3: jspdf-autotable v5 Usage

**What:** Standalone function call (not prototype method) — the v5 API.
**When to use:** All table rendering.
**Example:**
```typescript
// Source: jspdf-autotable GitHub README + v5 breaking change docs

import { autoTable } from 'jspdf-autotable'  // function, not plugin

autoTable(doc, {
  head: [['Resource', 'Required', 'Spare', 'Excess', 'Total']],
  body: [
    ['CPU GHz', '480.0', '120.0', '200.0', '800.0'],
    // ...
  ],
  startY: currentY,
  theme: 'grid',
  headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
  styles: { fontSize: 9 },
  margin: { left: 14, right: 14 },
})

// Get Y position after table for subsequent content
const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY + 40
```

### Pattern 4: Page Management with Y-cursor Tracking

**What:** Track a `y` cursor variable and call `doc.addPage()` when content would overflow.
**When to use:** Every time adding content that has variable height.
**Example:**
```typescript
// Standard jsPDF pattern

const PAGE_H = doc.internal.pageSize.getHeight()  // 297mm for A4
const PAGE_W = doc.internal.pageSize.getWidth()   // 210mm for A4
const MARGIN = 14
let y = MARGIN

function ensureSpace(needed: number): void {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage()
    y = MARGIN
  }
}

// After autoTable, get updated y:
y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 10
```

### Pattern 5: addImage for PDF Chart Embedding

**What:** Place a PNG data URL into the PDF at a specific position, scaled to fit page width.
**When to use:** After obtaining a chart data URL via Pattern 2.
**Example:**
```typescript
// Source: jsPDF official addImage docs

if (imgData) {
  const maxW = PAGE_W - 2 * MARGIN
  const scale = maxW / imgData.width
  const imgH = imgData.height * scale

  ensureSpace(imgH + 6)
  doc.addImage(
    imgData.dataUrl,
    'PNG',
    MARGIN,
    y,
    maxW,
    imgH,
    `chart-${index}`,  // alias prevents blank pages for repeated images
    'FAST',
  )
  y += imgH + 6
}
```

### Anti-Patterns to Avoid

- **Static import of jsPDF:** Adds 350KB to initial bundle. Always use dynamic `import()`.
- **Using `doc.autoTable()` instance method:** This is the v3/v4 prototype-patch API. v5 uses `autoTable(doc, opts)` as a standalone function import.
- **Drawing charts synchronously:** SVG→canvas conversion is async (img.onload). Missing await causes blank images in PDF.
- **Missing image alias in addImage:** The 7th parameter (alias) is required when adding multiple chart images; omitting it can cause blank pages.
- **html2canvas for chart capture:** Blurry, non-selectable text, cross-origin issues. Use XMLSerializer pipeline (already implemented in project).
- **Calling `doc.save()` before all async chart captures complete:** Collect all image Promises first, then build PDF, then save.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table rendering in PDF | Custom cell layout with doc.text() loops | jspdf-autotable | Auto-pagination, column widths, header repeat, theme |
| Chart to image | New SVG serializer | Adapt downloadChartPng.ts | Already handles XMLSerializer, canvas, blob URL lifecycle |
| PDF page overflow | Manual page-break calculations | jspdf-autotable `pageBreak: 'auto'` | Built-in auto-pagination for tables |
| Font embedding | Custom font file handling | jsPDF built-in fonts (helvetica) | Standard fonts available without file loading |

**Key insight:** The most dangerous hand-roll in this domain is table layout — jspdf-autotable handles the surprisingly complex cases of cells that overflow pages, repeated headers, and column sizing.

---

## Common Pitfalls

### Pitfall 1: Async Image Capture Race Condition

**What goes wrong:** `doc.save()` is called before SVG→canvas `img.onload` fires, producing a PDF with blank chart areas.
**Why it happens:** XMLSerializer + Image loading is async; if the caller uses `void captureChart()` instead of `await`, the save happens before the image is ready.
**How to avoid:** Wrap the entire `img.onload` callback in a Promise (see Pattern 2). Use `await Promise.all([...])` to capture all charts before building PDF content.
**Warning signs:** PDF downloads but chart areas are white/blank.

### Pitfall 2: jspdf-autotable v5 Breaking Change — Import Pattern

**What goes wrong:** `doc.autoTable(...)` throws "doc.autoTable is not a function".
**Why it happens:** jspdf-autotable v5 removed the automatic prototype patching in non-browser-detected environments, and the recommended import is now `import { autoTable } from 'jspdf-autotable'` then `autoTable(doc, options)`.
**How to avoid:** Always use the function form. Do not use `applyPlugin(jsPDF)` unless Node.js testing requires it.
**Warning signs:** TypeScript error "Property 'autoTable' does not exist on type 'jsPDF'".

### Pitfall 3: lastAutoTable Type is Not on jsPDF Instance

**What goes wrong:** TypeScript error accessing `doc.lastAutoTable.finalY` because the types aren't automatically augmented.
**Why it happens:** jspdf-autotable v5 uses the function import pattern; the `lastAutoTable` property is added at runtime but not in the type definition of jsPDF.
**How to avoid:** Cast: `(doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback`.
**Warning signs:** TypeScript compiler error on `doc.lastAutoTable`.

### Pitfall 4: Image Alias Required for Multiple Charts

**What goes wrong:** Second or subsequent chart images render as blank in the PDF.
**Why it happens:** jsPDF caches images by content hash; when the same logical image is added without an alias, the cache lookup can conflict.
**How to avoid:** Always pass a unique string as the 7th parameter to `addImage()`: e.g., `'capacity-chart-0'`, `'minnodes-chart-0'`.
**Warning signs:** First chart appears, subsequent ones are blank.

### Pitfall 5: Charts Not Mounted When PDF Export Triggered

**What goes wrong:** `container?.querySelector('svg')` returns null because charts haven't rendered (e.g., page not scrolled into view, lazy section not expanded).
**Why it happens:** Recharts uses `ResponsiveContainer` which renders only when mounted and visible in the DOM.
**How to avoid:** Charts in Step 3 are always rendered (not lazy-mounted). Refs are populated via `ref={(el) => { refs.current[id] = el }}`. The existing CapacityStackedChart and MinNodesChart components already follow this pattern. `exportPdf` receives these refs as parameters — it should handle null gracefully (skip the chart, don't abort the whole PDF).
**Warning signs:** PDF renders but some chart images are missing.

### Pitfall 6: jsPDF Units vs Page Size

**What goes wrong:** Text/images positioned off-page or overlapping because unit mismatch.
**Why it happens:** jsPDF supports multiple unit systems (mm, pt, px, in). Default is mm for A4. If pixel values from chart refs are passed directly to `addImage`, they will be interpreted as mm.
**How to avoid:** Decide on `unit: 'mm'` in the jsPDF constructor. Convert chart pixel dimensions to mm: `const mmPerPx = 25.4 / 96` for standard screen resolution. A4 = 210mm × 297mm.
**Warning signs:** Images appear tiny or enormous relative to text.

---

## Code Examples

Verified patterns from official sources:

### Complete exportPdf Skeleton

```typescript
// src/lib/utils/exportPdf.ts
// Source: jsPDF GitHub + jspdf-autotable GitHub + codebase import pattern

import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { VsanCapacityBreakdown } from '@/types/breakdown'

export async function exportPdf(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<void> {
  // 1. Lazy-load both libraries
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  // 2. Capture all chart images BEFORE building PDF
  const capturedImages = await Promise.all(
    scenarios.map(async (s) => {
      const capacityImg = await chartRefToDataUrl(chartRefs[`capacity-${s.id}`] ?? null)
      const minNodesImg = await chartRefToDataUrl(chartRefs[`minnodes-${s.id}`] ?? null)
      return { capacityImg, minNodesImg }
    })
  )

  // 3. Create document
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PAGE_W = doc.internal.pageSize.getWidth()
  const PAGE_H = doc.internal.pageSize.getHeight()
  const MARGIN = 14
  let y = MARGIN

  // 4. Title page
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Presizion — Cluster Sizing Report', PAGE_W / 2, 60, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_W / 2, 75, { align: 'center' })
  doc.addPage()
  y = MARGIN

  // 5. Executive summary table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', MARGIN, y)
  y += 8

  autoTable(doc, {
    head: [['Scenario', 'Servers Required', 'Limiting Resource', 'CPU Util %', 'RAM Util %']],
    body: scenarios.map((s, i) => [
      s.name,
      String(results[i]?.finalCount ?? '-'),
      results[i]?.limitingResource ?? '-',
      `${results[i]?.cpuUtilizationPercent.toFixed(1) ?? '-'}%`,
      `${results[i]?.ramUtilizationPercent.toFixed(1) ?? '-'}%`,
    ]),
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: MARGIN, right: MARGIN },
  })
  y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20

  // 6. Per-scenario: capacity tables + charts (loop)
  // ... (see plan for detailed structure)

  // 7. Save
  doc.save('presizion-sizing-report.pdf')
}
```

### autoTable with Breakdown Data

```typescript
// Capacity breakdown table for one scenario
// Source: jspdf-autotable GitHub examples

autoTable(doc, {
  head: [['Resource', 'Required', 'Spare', 'Excess', 'Total Configured']],
  body: [
    ['CPU GHz',
      bd.cpu.required.toFixed(1),
      bd.cpu.spare.toFixed(1),
      bd.cpu.excess.toFixed(1),
      bd.cpu.total.toFixed(1),
    ],
    ['Memory GiB',
      bd.memory.required.toFixed(1),
      bd.memory.spare.toFixed(1),
      bd.memory.excess.toFixed(1),
      bd.memory.total.toFixed(1),
    ],
    ['Raw Storage TiB',
      (bd.storage.required / 1024).toFixed(2),
      (bd.storage.spare / 1024).toFixed(2),
      (bd.storage.excess / 1024).toFixed(2),
      (bd.storage.total / 1024).toFixed(2),
    ],
  ],
  startY: y,
  theme: 'striped',
  headStyles: { fillColor: [107, 114, 128] },
  styles: { fontSize: 9, cellPadding: 3 },
  columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
  margin: { left: MARGIN, right: MARGIN },
})
```

### Chart Ref Key Convention

The existing CapacityStackedChart and MinNodesChart use `refs.current[scenarioId]`. The PDF builder needs the refs passed as a flat `Record<string, HTMLDivElement | null>`. The chart key naming convention must be established:

```typescript
// In Step3ReviewExport.tsx, create a combined refs object:
const capacityRefs = useRef<Record<string, HTMLDivElement | null>>({})
const minNodesRefs = useRef<Record<string, HTMLDivElement | null>>({})

// Pass to exportPdf:
await exportPdf(cluster, scenarios, results, breakdowns, {
  ...Object.fromEntries(
    Object.entries(capacityRefs.current).map(([k, v]) => [`capacity-${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(minNodesRefs.current).map(([k, v]) => [`minnodes-${k}`, v])
  ),
})
```

**Alternative:** Pass `capacityRefs` and `minNodesRefs` as separate parameters to avoid the prefix convention. This is cleaner and avoids string parsing.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `doc.autoTable({...})` prototype method | `autoTable(doc, {...})` function import | jspdf-autotable v5.0.0 | Breaking: must update import pattern |
| `import { autoTable } from 'jspdf-autotable'` patches prototype | No automatic patching in Node.js | v5 | Unit tests may need manual `applyPlugin` |
| Static import of jsPDF | Dynamic `import('jspdf')` in async function | jsPDF v2+ / Vite | 350KB kept out of initial bundle |

**Deprecated/outdated:**
- `doc.autoTable(options)` — prototype method; replaced by standalone function in v5
- `applyPlugin(jsPDF)` — only needed for Node.js test environments, not browser code

---

## Open Questions

1. **Chart ref access from Step3ReviewExport**
   - What we know: CapacityStackedChart and MinNodesChart each maintain internal `refs = useRef<Record<string, HTMLDivElement | null>>({})` — these refs are not currently exposed to the parent.
   - What's unclear: Best approach — (a) lift refs up to Step3ReviewExport and pass down as props, or (b) use `document.querySelectorAll` as a fallback, or (c) expose refs via a callback prop.
   - Recommendation: Option (a) — lift refs to Step3ReviewExport and pass down. Matches the project's controlled component pattern (Phase 20 decision: "Controlled collapse state in ScenarioCard (open/onToggle props)"). Both chart components already accept `scenario.id` keyed refs internally; refactoring to accept `externalRefs` prop is minimal.

2. **Page title / project name field**
   - What we know: No "project name" field exists in any current store.
   - What's unclear: Should the PDF title use a static "Presizion Report" or allow user input?
   - Recommendation: Use static "Presizion — Cluster Sizing Report" with generation date. Per CLAUDE.md spirit of "simplest viable approach" — don't add a new form field. Can be enhanced later.

3. **Units for mm vs px chart image scaling**
   - What we know: `doc.internal.pageSize.getWidth()` returns mm when unit is 'mm'. Chart containers return `clientWidth/clientHeight` in CSS pixels.
   - What's unclear: The correct conversion factor for the deployment environment (different screen DPI = different pixel density).
   - Recommendation: Use `25.4/96` as mm-per-px (standard 96dpi CSS reference pixel). This gives consistent sizing regardless of device DPI since CSS pixels are device-independent by spec. Chart canvas is rendered at 2x (already done in downloadChartPng), so pass the chart's logical pixel dimensions (not canvas.width) to scale correctly.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Sources

### Primary (HIGH confidence)
- jsPDF GitHub (github.com/parallax/jsPDF) — addImage signature, constructor options, text/setFont/setFontSize API
- jspdf-autotable GitHub (github.com/simonbengtsson/jsPDF-AutoTable) — v5 import pattern, autoTable function signature, startY/finalY/headStyles
- jsdocs.io/package/jspdf-autotable — HookProps/HookData types, finalY access pattern
- artskydj.github.io/jsPDF/docs/module-addImage.html — addImage parameter types (string | HTMLImageElement | HTMLCanvasElement | Uint8Array)
- `src/lib/utils/downloadChartPng.ts` — existing XMLSerializer SVG→canvas pipeline (verified in codebase)
- `src/lib/utils/import/formatDetector.ts` — established `await import('...')` lazy-load pattern (verified in codebase)

### Secondary (MEDIUM confidence)
- dev.to/ramonak: Export multiple charts to PDF with React and jsPDF — image alias requirement, async capture pattern
- medium.com/@elelad: Lazy Loading of NPM Packages Using Dynamic Import — bundle size impact measurement (133KB → 479KB without lazy load)

### Tertiary (LOW confidence)
- Various Stack Overflow / GitHub issues confirming v5 breaking change on autoTable prototype method

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions locked in STACK.md, confirmed on npm
- Architecture: HIGH — dynamic import pattern verified in codebase; jsPDF API verified from official docs
- Pitfalls: HIGH (async race, image alias) — verified from official docs and multiple sources; MEDIUM (unit scaling) — standard CSS spec reference
- Chart ref extraction: MEDIUM — pattern decision (lift vs query), no prior art in this codebase for this specific case

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable libraries; jsPDF 4.x and jspdf-autotable 5.x are relatively stable)
