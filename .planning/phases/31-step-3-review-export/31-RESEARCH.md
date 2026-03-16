# Phase 31: Step 3 Review & Export - Research

**Researched:** 2026-03-16
**Domain:** Mobile-responsive Step 3 (comparison table, charts, export buttons, iOS export compatibility)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVIEW-01 | Comparison table scrolls horizontally with a sticky first column ("Metric") at 390px | CSS `position: sticky; left: 0` on first-column `<TableCell>`, `overflow-x-auto` wrapper confirmed on current `<div>`, `min-w-max` missing from `<Table>` |
| REVIEW-02 | Chart heights are responsive — shorter on mobile (e.g., h-48) vs desktop (h-72) | All 4 charts use hardcoded `height={280–300}` on `ResponsiveContainer`; need `<div className="h-48 sm:h-72">` wrapper + `height="100%"` |
| REVIEW-03 | Export actions presented as a bottom sheet (shadcn Drawer) on mobile instead of a button row | `drawer.tsx` already exists (vaul 1.1.2); `useIsMobile` pattern established in Phase 29; current button row is `flex gap-3` with 6 buttons — ~330px minimum width, overflows at 390px |
| REVIEW-04 | iOS Safari PDF export uses fallback strategy (open in new tab) since blob download is broken | `exportPdf.ts` uses `doc.save()` which calls `location.href = blobUrl` — broken on iOS; need `window.open(blobUrl)` path behind iOS detection |
| REVIEW-05 | Chart PNG download continues to work on mobile (canvas rendering) | `downloadChartPng.ts` uses hardcoded `scale = 2`; mobile works but `devicePixelRatio` is not read; `canvas.toBlob` + anchor click also broken on iOS |
| REVIEW-06 | Core count chart and capacity stacked chart are readable at 390px width | `CapacityStackedChart` has `margin={{ left: 120 }}` — leaves only 270px for bars at 390px; `MinNodesChart` has `margin={{ left: 90 }}` — also tight; both need left margin audit |
</phase_requirements>

## Summary

Phase 31 completes the v2.4 mobile UX milestone by making Step 3 (Review & Export) usable on a 390px phone. The work splits into four distinct domains: (1) table scroll with sticky column, (2) chart height responsiveness, (3) export button bottom-sheet drawer, and (4) iOS Safari download workaround for PDF.

The comparison table already has `overflow-x-auto` on its wrapper div, but the inner `<Table>` lacks `min-w-max`, causing the browser to compress columns into the viewport instead of allowing scroll. The sticky first column requires `position: sticky; left: 0` plus an explicit background on the `<TableCell>`. All four charts use hardcoded pixel heights on `ResponsiveContainer` — the established Phase 28/30 pattern of a `<div className="h-48 sm:h-72">` wrapper fixes this without modifying chart internals. The Drawer component (vaul) is already installed and the `useIsMobile` pattern is established from Phase 29; the export button row at `flex gap-3` with 6 buttons overflows 390px and needs to be replaced with a Drawer trigger + Drawer containing all actions on mobile. The iOS PDF fallback requires detecting iOS Safari and calling `window.open(blobUrl)` instead of `doc.save()`, with a toast message guiding the user to save via the share sheet.

**Primary recommendation:** Address all six requirements as two plans — Plan 01 for table + charts (REVIEW-01, REVIEW-02, REVIEW-05, REVIEW-06), Plan 02 for export drawer + iOS fallback (REVIEW-03, REVIEW-04).

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| vaul (via shadcn Drawer) | 1.1.2 | Bottom sheet / drawer primitive | Already installed (Phase 29); `drawer.tsx` exists in `src/components/ui/` |
| Recharts | 2.15 | Chart rendering | All 4 charts use `ResponsiveContainer`; height fix is CSS-only |
| Tailwind v4 | current | Responsive classes | `h-48 sm:h-72` pattern, `sticky left-0` |
| jsPDF | current | PDF generation | `doc.save()` needs iOS fallback via `doc.output('bloburi')` + `window.open()` |

### No New Dependencies
The requirements do NOT require any new npm packages. The Drawer is already installed. iOS detection uses `navigator.userAgent` (no library needed).

## Architecture Patterns

### Recommended File Changes

```
src/components/step3/
├── ComparisonTable.tsx      # modify: sticky first column + min-w-max on Table
├── Step3ReviewExport.tsx    # modify: bottom sheet drawer for mobile export + useIsMobile
├── SizingChart.tsx          # modify: h-48 sm:h-72 wrapper div + height="100%"
├── CoreCountChart.tsx       # modify: same height pattern
├── CapacityStackedChart.tsx # modify: same height pattern + left-margin audit
└── MinNodesChart.tsx        # modify: same height pattern + left-margin audit
src/lib/utils/
└── exportPdf.ts             # modify: iOS detection + window.open() fallback
```

### Pattern 1: Sticky First Column in Scrollable Table
**What:** `overflow-x-auto` wrapper already present; inner `<Table>` needs `min-w-max`; first `<TableCell>` and `<TableHead>` in each row need `sticky left-0 bg-background z-10`.
**When to use:** REVIEW-01.
**Key detail:** Background MUST be explicit (`bg-background`) or the cell becomes transparent during scroll, showing the scrolling content behind the label.

```tsx
// ComparisonTable.tsx — current state
<div className="overflow-x-auto rounded-md border">
  <Table>           {/* missing: min-w-max */}
    <TableHeader>
      <TableRow>
        <TableHead className="w-48 font-semibold">Metric</TableHead>  {/* missing: sticky left-0 bg-background z-10 */}

// After change:
<div className="overflow-x-auto rounded-md border">
  <Table className="min-w-max">
    <TableHeader>
      <TableRow>
        <TableHead className="w-48 font-semibold sticky left-0 bg-background z-10">Metric</TableHead>
```

Every `<TableCell>` that is the first column in `<TableBody>` rows also needs the same sticky classes.

### Pattern 2: Responsive Chart Height
**What:** Wrap each `<div ref={...}>` in an outer `<div className="h-48 sm:h-72">` and change `height={N}` to `height="100%"` on `ResponsiveContainer`.
**When to use:** REVIEW-02, REVIEW-06 — all 4 chart components.
**Key detail:** The ref must stay on the inner div (the one containing the SVG) for `downloadChartPng` to work. The outer div is the sizing container only.

```tsx
// Before (SizingChart, CoreCountChart pattern):
<div ref={comparisonRef}>
  <ResponsiveContainer width="100%" height={300}>

// After:
<div className="h-48 sm:h-72">
  <div ref={comparisonRef}>
    <ResponsiveContainer width="100%" height="100%">
```

**CapacityStackedChart special case:** This is a horizontal bar chart with `layout="vertical"`. Its height is data-driven (220px for 4 rows, 130px for 2 rows). On mobile the left margin of `120px` consumes 31% of a 390px viewport. Reduce to `margin={{ left: 80, right: 20 }}` on mobile, OR reduce `YAxis width` to `80` and shorten the category labels. The `showStorage ? 220 : 130` heights are already compact — keep them but wrap in `<div className="min-h-[130px]">` to prevent collapse.

**MinNodesChart special case:** Also horizontal layout with `margin={{ left: 90, right: 60 }}`. The right 60px is for `LabelList position="right"` labels. At 390px this leaves only 240px for bars. Acceptable as-is if `height={220}` is preserved for readability.

### Pattern 3: Bottom Sheet Export Drawer
**What:** On mobile (`< 640px`), replace the `flex gap-3` button row in `Step3ReviewExport` with a single "Export" trigger button that opens a Drawer. On desktop, keep the existing button row unchanged.
**When to use:** REVIEW-03.
**Key detail:** The `useIsMobile` hook (matchMedia `max-width: 639px`) is established from Phase 29 — copy the same pattern. The Drawer already has full component parts: `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerFooter`, `DrawerClose`.

```tsx
// Step3ReviewExport.tsx — useIsMobile already exists in Phase 29 codebase
// In Step3, define or import the same hook.

// Mobile path: single button triggers Drawer
{isMobile ? (
  <Drawer>
    <DrawerTrigger asChild>
      <Button variant="outline" className="print:hidden">Export / Share</Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Export Results</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-3 p-4">
        <Button variant="outline" onClick={() => { void handleCopy() }}>
          {copied ? 'Copied!' : 'Copy Summary'}
        </Button>
        {/* ... all 6 export buttons stacked vertically */}
      </div>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
) : (
  // existing flex gap-3 button row unchanged
  <div className="flex gap-3 mb-6 print:hidden"> ... </div>
)}
```

### Pattern 4: iOS Safari PDF Fallback
**What:** Detect iOS Safari; if detected, use `doc.output('bloburi')` + `window.open()` with a toast; otherwise use `doc.save()`.
**When to use:** REVIEW-04 — `exportPdf.ts`.
**Key detail:** iOS Safari cannot download blob URLs via anchor click. `window.open(blobUrl)` opens the PDF inline in Safari's built-in viewer; the user can then use the share sheet to save to Files.

```ts
// exportPdf.ts — at the end of the function, replace doc.save() with:
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
if (isIOS) {
  const blobUri = doc.output('bloburi') as string
  window.open(blobUri, '_blank')
  // Toast shown from caller (Step3ReviewExport) — exportPdf throws nothing here
} else {
  doc.save('presizion-sizing-report.pdf')
}
```

The caller `Step3ReviewExport.handleExportPdf()` already shows a toast on error. For iOS, a separate informational toast should be shown: "PDF opened in new tab — tap Share then Save to Files."

**PPTX note:** `exportPptx.ts` uses `pptxgenjs` `writeFile()` which also uses FileSaver.js internally — also broken on iOS. Show a toast: "PPTX download is not supported in Safari. Use Chrome or a desktop browser." Do NOT call `writeFile()` on iOS; the PPTX state loading is expensive and will fail silently.

### Pattern 5: PNG Download on Mobile (devicePixelRatio)
**What:** `downloadChartPng.ts` uses `const scale = 2` (hardcoded). On mobile this is fine for 2x screens; for 3x iPhone 14/15 screens, images look slightly softer but are functional. Canvas blob download (anchor click) works on iOS Safari for images (unlike PDF). No change required for REVIEW-05 unless explicit 3x support is requested.
**Key finding:** The current `scale = 2` approach does work on mobile. Canvas `toBlob` + anchor `.click()` for PNG is supported on iOS Safari. REVIEW-05 passes as-is unless retina sharpness becomes a concern.

**Optional enhancement (not required for REVIEW-05):**
```ts
// downloadChartPng.ts — optional improvement, not blocking:
const scale = Math.min(window.devicePixelRatio ?? 2, 2)  // cap at 2 for memory safety
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet for export | Custom CSS-only slide-up panel | `Drawer` from `vaul` (already installed) | Animation, focus trap, scroll lock, aria-role — all handled |
| iOS Safari detection | Complex UA parsing | `navigator.userAgent` regex `/iphone|ipad|ipod/i` | Simple, sufficient, no library needed |
| Responsive chart sizing | JavaScript ResizeObserver hooks | CSS `h-48 sm:h-72` wrapper div | Lighter, no JS overhead, established pattern from ARCHITECTURE.md |
| Sticky column scrolling | JavaScript scroll-position tracking | CSS `position: sticky; left: 0` | Native CSS, zero JS, no scroll jank |

## Common Pitfalls

### Pitfall 1: Transparent Sticky Column Background (M-6 variant)
**What goes wrong:** `sticky left-0` cells scroll content behind the label, making metric names unreadable.
**Why it happens:** `position: sticky` does not create a stacking context or add a background — the cell is transparent by default.
**How to avoid:** Add `bg-background z-10` to every sticky cell. Since shadcn uses CSS variables, `bg-background` correctly tracks light/dark mode.
**Warning signs:** When scrolling the table, scenario column text shows through the Metric column.

### Pitfall 2: `min-w-max` Missing — Table Compresses Instead of Scrolling
**What goes wrong:** `overflow-x-auto` wrapper present but table still compresses all columns into 390px.
**Why it happens:** Without an explicit minimum width, the browser distributes available space equally across columns.
**How to avoid:** Add `className="min-w-max"` to `<Table>`. This tells the browser to use the natural minimum content width for the table.
**Warning signs:** At 390px, columns are narrower than their content and text wraps or gets clipped.

### Pitfall 3: Recharts `height="100%"` Without Defined Parent Height
**What goes wrong:** Setting `height="100%"` on `ResponsiveContainer` but the parent div has no explicit height → chart renders at 0px or a default tiny size.
**Why it happens:** `height: 100%` requires the parent to have a defined height. Without it, the browser cannot calculate the percentage.
**How to avoid:** The outer `<div className="h-48 sm:h-72">` provides the explicit height. The ref div between outer div and `ResponsiveContainer` should have `height: 100%` (Tailwind class `h-full`) so the measurement chain is unbroken.

```tsx
// Correct nesting:
<div className="h-48 sm:h-72">       {/* sizing div — has explicit height */}
  <div ref={chartRef} className="h-full">  {/* ref div — must be h-full */}
    <ResponsiveContainer width="100%" height="100%">
```

### Pitfall 4: iOS `window.open` Blocked by Popup Blocker
**What goes wrong:** `window.open(blobUri)` is called from within an async handler (after `await Promise.all(capturePromises)`). iOS Safari blocks popups not directly triggered by user gesture.
**Why it happens:** iOS counts async awaits as breaking the user gesture chain. The `window.open()` call after `await` is no longer considered "from a user gesture."
**How to avoid:** Move the `window.open()` call to be synchronous if possible, OR open the tab first (getting a window reference) before the async work, then set its location after.

```ts
// Pattern to avoid popup blocking on iOS:
// Option A: Open window synchronously in the export handler before any await
const iosWindow = isIOS ? window.open('about:blank', '_blank') : null

// ... async PDF generation ...

if (iosWindow) {
  const blobUri = doc.output('bloburi') as string
  iosWindow.location.href = blobUri
} else {
  doc.save('presizion-sizing-report.pdf')
}
```

**Warning signs:** Tapping Export PDF on iOS shows nothing — no new tab, no error. The popup was silently blocked.

### Pitfall 5: Drawer `max-h-[80vh]` Clips Export Buttons
**What goes wrong:** The default `DrawerContent` has `max-h-[80vh]` (see `drawer.tsx` line 57). With 6 export buttons + header + close button, the drawer may need to scroll on small phones.
**Why it happens:** The default drawer content height is capped at 80% of viewport height.
**How to avoid:** Add `overflow-y-auto` inside `DrawerContent` so the button list scrolls if it overflows. With 6 buttons at ~44px each (264px) + header (~64px) + footer (~64px) = ~392px total, this is ~59% of an iPhone 14 viewport height (664px). Safe with `max-h-[80vh]`, but add `overflow-y-auto` defensively.

### Pitfall 6: CapacityStackedChart Left Margin at 390px
**What goes wrong:** `margin={{ left: 120 }}` leaves 270px for bars at 390px total width. With the YAxis at 110px width (line 204 of CapacityStackedChart), the chart area is ~160px at 390px — very tight but readable.
**How to avoid:** Reduce `left` margin or `YAxis width`. Change `margin={{ left: 120, right: 40 }}` to `margin={{ left: 80, right: 20 }}` and `YAxis width={70}` on mobile. Use the outer div approach: `<div className="sm:ml-10">` or adjust margins inline based on container width.
**Alternative:** Accept 160px bar area as sufficient for 3–4 bars and do not change chart margins — focus on height responsiveness only.

## Code Examples

Verified patterns from source code analysis:

### Current Table Structure (ComparisonTable.tsx lines 61–63)
```tsx
// Current — wrapper has overflow-x-auto but Table lacks min-w-max and cells lack sticky
<div className="overflow-x-auto rounded-md border">
  <Table>
    <TableHead className="w-48 font-semibold">Metric</TableHead>
```

### Fixed Table Structure
```tsx
<div className="overflow-x-auto rounded-md border">
  <Table className="min-w-max">
    <TableHead className="w-36 font-semibold sticky left-0 bg-background z-10">Metric</TableHead>
    // ... in TableBody rows:
    <TableCell className="font-medium sticky left-0 bg-background z-10">Servers Required</TableCell>
```

### Current Chart Pattern (SizingChart.tsx line 77)
```tsx
// Current — hardcoded 300px height
<div ref={comparisonRef}>
  <ResponsiveContainer width="100%" height={300}>
```

### Fixed Chart Pattern
```tsx
// Fixed — responsive via parent div
<div className="h-48 sm:h-72">
  <div ref={comparisonRef} className="h-full">
    <ResponsiveContainer width="100%" height="100%">
```

### Current Export Buttons (Step3ReviewExport.tsx lines 123–142)
```tsx
// Current — 6 buttons in flex row, overflows 390px
<div className="flex gap-3 mb-6 print:hidden">
  <Button variant="outline" ...>Copy Summary</Button>
  <Button variant="outline" ...>Download CSV</Button>
  <Button variant="outline" ...>Download JSON</Button>
  <Button variant="outline" ...>Share</Button>
  <Button variant="outline" ...>Export PDF</Button>
  <Button variant="outline" ...>Export PPTX</Button>
</div>
```

### iOS PDF Fallback (exportPdf.ts lines 661–662)
```ts
// Current — broken on iOS
doc.save('presizion-sizing-report.pdf')

// Fixed — iOS branch
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
if (isIOS) {
  // Must open synchronously before any await — open before the async work
  // (see Pitfall 4 for the pre-open pattern)
  const blobUri = doc.output('bloburi') as string
  window.open(blobUri, '_blank')
} else {
  doc.save('presizion-sizing-report.pdf')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed pixel heights on charts | CSS responsive height via parent div | Phase 28 ARCHITECTURE.md recommendation | Established pattern — just not yet applied to Step 3 |
| Flat button row on mobile | Bottom sheet Drawer | Phase 29 introduced Drawer component | Drawer already available; pattern from ImportPreviewModal |
| `doc.save()` for all browsers | `window.open(blobUri)` for iOS | M-8 research finding | Required for usable PDF export on iPhone |
| `position: relative` table | CSS sticky first column | CSS L3 sticky positioning | Native browser support, no JS needed |

**Deprecated/outdated:**
- `height={N}` directly on `ResponsiveContainer` for mobile use: always wrap in a sized div instead

## Open Questions

1. **CapacityStackedChart margin on mobile**
   - What we know: `margin={{ left: 120 }}` gives 270px of bar area at 390px — measurably tight but readable
   - What's unclear: Whether presales engineers find this acceptable or if Y-axis labels need to be shortened
   - Recommendation: Start with height-only fix (REVIEW-02); if layout testing shows unreadable bars at 390px, add a `text-xs` class to YAxis tick and reduce `width` to `80`

2. **PPTX on iOS**
   - What we know: PPTX blob download is broken on iOS Safari (M-8); only show a toast
   - What's unclear: Whether `pptxgenjs` has a `getBlob()` path that could work via `window.open()`
   - Recommendation: Show toast "PPTX download is not supported in Safari. Use Chrome or a desktop browser." and skip the export call entirely on iOS to avoid the expensive generation

3. **useIsMobile hook location**
   - What we know: Phase 29 defined `useIsMobile` inline inside `ImportPreviewModal.tsx`
   - What's unclear: Whether to extract to `src/hooks/useIsMobile.ts` for reuse in Step3ReviewExport, or define a second inline copy
   - Recommendation: Extract to `src/hooks/useIsMobile.ts` since Phase 31 is the second consumer — DRY principle applies

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `rtk vitest run src/components/step3` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVIEW-01 | ComparisonTable has `min-w-max` on `<Table>` and `sticky left-0 bg-background` on first column cells | unit | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` | existing |
| REVIEW-02 | Chart wrapper divs have `h-48 sm:h-72` classes and `ResponsiveContainer height="100%"` | unit | `rtk vitest run src/components/step3/__tests__/SizingChart.test.tsx` | existing |
| REVIEW-03 | On mobile, Step3ReviewExport renders a Drawer trigger; on desktop, renders the flat button row | unit | `rtk vitest run src/components/step3/__tests__/Step3ReviewExport.test.tsx` | existing |
| REVIEW-04 | `exportPdf` calls `window.open` on iOS user agent and `doc.save` on non-iOS | unit | `rtk vitest run src/lib/utils/__tests__/exportPdf.test.ts` | no — Wave 0 |
| REVIEW-05 | PNG download anchor click fires on mobile (canvas `toBlob` + anchor) | unit (smoke) | `rtk vitest run src/components/step3/__tests__/SizingChart.test.tsx` | existing |
| REVIEW-06 | CapacityStackedChart and MinNodesChart render without layout errors at narrow container | unit | `rtk vitest run src/components/step3/__tests__/CapacityStackedChart.test.tsx` | existing |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/components/step3`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/utils/__tests__/exportPdf.test.ts` — covers REVIEW-04 iOS detection logic
  - Must mock `navigator.userAgent` and verify `window.open` is called for iOS, `doc.save` for non-iOS

*(All other test files already exist; they need new test cases but not new files)*

## Sources

### Primary (HIGH confidence)
- Source code inspection: `src/components/step3/ComparisonTable.tsx` — direct read, confirmed `overflow-x-auto` wrapper exists, `<Table>` lacks `min-w-max`, no sticky classes on cells
- Source code inspection: `src/components/step3/SizingChart.tsx` — confirmed `height={300}` and `height={280}` hardcoded on `ResponsiveContainer`
- Source code inspection: `src/components/step3/CoreCountChart.tsx` — confirmed `height={280}` hardcoded
- Source code inspection: `src/components/step3/CapacityStackedChart.tsx` — confirmed `height={220}` and `height={130}` + `margin={{ left: 120 }}`
- Source code inspection: `src/components/step3/MinNodesChart.tsx` — confirmed `height={220}` + `margin={{ left: 90, right: 60 }}`
- Source code inspection: `src/components/step3/Step3ReviewExport.tsx` — confirmed 6 buttons in `flex gap-3` div, no mobile-responsive handling
- Source code inspection: `src/lib/utils/exportPdf.ts` — confirmed `doc.save()` on line 662, no iOS detection
- Source code inspection: `src/lib/utils/downloadChartPng.ts` — confirmed `const scale = 2` hardcoded, `canvas.toBlob` + anchor click pattern
- Source code inspection: `src/components/ui/drawer.tsx` — confirmed Drawer component installed (vaul 1.1.2), all subcomponents available
- `.planning/research/PITFALLS.md` (M-6, M-7, M-8, M-9) — HIGH confidence, verified against source
- `.planning/research/ARCHITECTURE.md` (Pattern 3: Responsive Chart Height, Anti-Pattern 3: min-w-max) — HIGH confidence

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` (Bottom sheet export drawer, horizontal scroll table) — verified against NN/G research cited in file
- `.planning/STATE.md` decisions — project-specific context, HIGH confidence for this project

### Tertiary (LOW confidence)
- iOS `window.open()` popup-blocking behavior with async handlers — documented pattern from community sources; requires physical device testing to confirm

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components are in the codebase; no new dependencies
- Architecture: HIGH — direct source code analysis of every file listed; patterns established in prior phases
- Pitfalls: HIGH for CSS/JS pitfalls (verified against source); MEDIUM for iOS popup blocking (requires device test)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack — no fast-moving dependencies)
