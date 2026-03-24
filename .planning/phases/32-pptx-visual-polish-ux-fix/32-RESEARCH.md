# Phase 32: PPTX Visual Polish & UX Fix - Research

**Researched:** 2026-03-24
**Domain:** pptxgenjs 3.12.0 — slide masters, shape API, text-with-shape, table cell styling; React/Zustand default state
**Confidence:** HIGH

## Summary

Phase 32 makes targeted, surgical edits to two files: `src/lib/utils/exportPptx.ts` (~874 lines) and `src/lib/sizing/defaults.ts` (72 lines). All five requirements (VISUAL-01 through VISUAL-04, UX-01) are self-contained and non-overlapping; they can be implemented in one commit or split into two (as the plan structure suggests).

The pptxgenjs 3.12.0 API (already installed) provides every primitive needed: `{ rect: ShapeProps }` in the `defineSlideMaster` objects array for the accent strip (VISUAL-01), `fill` + `color` on table cell options for header bands (VISUAL-03), `addText` with `shape: pptx.shapes.ROUNDED_RECTANGLE` and `rectRadius` for KPI boxes (VISUAL-04), and rich `TextRun` arrays (TextProps[]) on table cells for colored-circle utilization indicators (VISUAL-02). No new dependencies are required.

The UX-01 change is a single-character string substitution in `defaults.ts:59` — "New Scenario" becomes "To-Be" — with zero test updates required because no test asserts that specific string value.

**Primary recommendation:** Implement UX-01 first (trivial, builds confidence the test suite stays green), then tackle the four VISUAL items as a batch on `exportPptx.ts`. The mock in `exportPptx.test.ts` must be extended with `addShape` before any `slide.addShape(...)` calls are introduced.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Accent strip (VISUAL-01)**
- Navy (#1E3A5F) vertical strip on the left edge of every content slide (not the title slide)
- Width: 0.3 inches
- Full height of the slide (0 to 7.5 inches on LAYOUT_WIDE)
- Implemented via `{ rect: ShapeProps }` in the CONTENT_SLIDE master `objects` array (NOT per-slide)
- Matches the title slide background color for visual cohesion

**Utilization color-coding (VISUAL-02)**
- Applies to utilization % rows only (CPU Util %, RAM Util %, Disk Util %)
- Thresholds: green <70%, amber 70-85%, red >85% (VMware best practices)
- Style: colored circle icon (●) prepended via colored TextRun — cell background unchanged
- Colors: Green #22C55E, Amber #F59E0B, Red #EF4444

**KPI callout boxes (VISUAL-04)**
- Rounded rectangles with `rectRadius: 0.3` using `addText` with `shape: pptx.shapes.ROUNDED_RECTANGLE`
- Fill: light blue-gray (#E8EDF2)
- Value text: navy (#1E3A5F), 44pt bold
- Label text: gray (#6B7280), 11pt
- Replaces the current plain-text `addKpiCallout` function

**Section header bands (VISUAL-03)**
- Table header rows switch from brand blue (#3B82F6) to navy (#1E3A5F)
- Applies to top header rows of ALL tables in every slide
- Slide title text switches to navy (#1E3A5F) (was brand blue)
- No sub-category bands — keep it clean

**Default scenario name (UX-01)**
- Change `name: 'New Scenario'` to `name: 'To-Be'` in `src/lib/sizing/defaults.ts:59`
- Update any tests that assert the default name

### Claude's Discretion
- Exact positioning offsets for accent strip vs content area (may need to shift content right by 0.15-0.3")
- Whether to add the accent strip to the slide master definition or per-slide (master is cleaner but may conflict with title slide)
- Footer text positioning adjustment to account for accent strip

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VISUAL-01 | Content slide master includes colored left sidebar accent strip | `{ rect: ShapeProps }` in `defineSlideMaster` objects array — confirmed in pptxgenjs 3.12.0 type defs |
| VISUAL-02 | Utilization cells color-coded (green/amber/red thresholds) | `TextProps[]` (array of TextRun objects) accepted by table cell `text` property — enables colored circle + value text |
| VISUAL-03 | Section headers use dark background bands | `headerCell()` helper at line 52 — change fill from `BLUE` to `NAVY`; change `TITLE_OPTS` color from `BLUE` to `NAVY` |
| VISUAL-04 | KPI callout boxes use rounded-rectangle shape backgrounds | `addText(text, { shape: pptx.shapes.ROUNDED_RECTANGLE, rectRadius: 0.3, fill: {...} })` — confirmed in `TextPropsOptions` type |
| UX-01 | Default scenario name changed from "New Scenario" to "To-Be" | `defaults.ts:59` single-line edit; no tests assert this string |
</phase_requirements>

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pptxgenjs | 3.12.0 | PPTX generation | Already in use; provides all needed shape/color APIs |
| TypeScript | strict | Type safety | Project standard; `SHAPE_NAME` enum provides type-safe shape references |
| Vitest + jsdom | existing | Unit testing | Project test framework; mock must be extended for `addShape` |

**No installation required.**

**Version verification:** `npm view pptxgenjs version` → 3.12.0 (verified from installed package.json)

## Architecture Patterns

### Recommended Change Locations

```
src/
  lib/
    sizing/
      defaults.ts           # UX-01: line 59, name: 'New Scenario' → 'To-Be'
    utils/
      exportPptx.ts         # VISUAL-01..04: master, helpers, KPI function
      __tests__/
        exportPptx.test.ts  # Extend mock with addShape
```

### Pattern 1: Accent Strip via Slide Master Object (VISUAL-01)

**What:** Add a `{ rect: ShapeProps }` entry to the `CONTENT_SLIDE` master's `objects` array. This propagates the strip to every slide using that master without per-slide code.

**When to use:** When a design element must appear on all content slides uniformly.

**Implementation:**
```typescript
// Source: pptxgenjs types/index.d.ts — SlideMasterProps.objects allows { rect: ShapeProps }
pptx.defineSlideMaster({
  title: 'CONTENT_SLIDE',
  background: { color: WHITE },
  objects: [
    // Accent strip: navy vertical bar, full height, 0.3" wide
    { rect: { x: 0, y: 0, w: 0.3, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.65, y: 0.2, w: 11.85, h: 0.6 }, text: '' } },
  ],
})
```

**Content offset:** Because the strip is 0.3" wide, all content (tables, text, images) placed at `x: 0.5` intrinsically clears the strip. The title placeholder must shift from `x: 0.5` to `x: 0.65` (0.5 + 0.15 safety margin). Tables starting at `x: 0.5` already clear the strip edge.

**Footer positioning:** The footer at `x: 0.5` also clears the strip — no adjustment needed.

### Pattern 2: Table Header Color Update (VISUAL-03)

**What:** Two changes — `headerCell()` fill color and `TITLE_OPTS` color — convert all blue headers to navy.

```typescript
// BEFORE
const TITLE_OPTS = { placeholder: 'title', fontSize: 22, bold: true, color: BLUE, fontFace: FONT } as const
function headerCell(text: string) {
  return { text, options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, fontFace: FONT } }
}

// AFTER
const TITLE_OPTS = { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT } as const
function headerCell(text: string) {
  return { text, options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10, fontFace: FONT } }
}
```

**Cascading effect:** Because every slide's title addText uses `TITLE_OPTS` or inline `color: BLUE`, updating `TITLE_OPTS` and `headerCell()` automatically applies the navy color everywhere. Inline blue title calls (lines 208, 257, 418, 563, 622, 674, 815) must each be changed too.

**Scope:** Approximately 20 touch-points in `exportPptx.ts`. Some titles use `TITLE_OPTS` spread (`{ ...TITLE_OPTS }`), others inline. All must change.

### Pattern 3: Colored-Circle Utilization Indicator (VISUAL-02)

**What:** pptxgenjs table cells accept `text: TextProps[]` (an array of TextRun objects), allowing mixed-color runs within one cell. We prepend a colored bullet to utilization values.

```typescript
// Source: pptxgenjs types/index.d.ts — TableCell.text can be string | TextProps[]
const UTIL_GREEN  = '22C55E'
const UTIL_AMBER  = 'F59E0B'
const UTIL_RED    = 'EF4444'

function utilColorDot(pct: number): string {
  if (pct < 70) return UTIL_GREEN
  if (pct <= 85) return UTIL_AMBER
  return UTIL_RED
}

function utilCell(pct: number, rowIdx: number) {
  const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
  const dotColor  = utilColorDot(pct)
  return {
    text: [
      { text: '● ', options: { color: dotColor, fontSize: 10, fontFace: FONT } },
      { text: `${pct.toFixed(1)}%`, options: { color: DARK,    fontSize: 10, fontFace: FONT } },
    ] as TextProps[],
    options: { fill: { color: fillColor } },
  }
}
```

**Application scope:** The utilization rows appear in:
1. Slide 2 (Executive Summary) — `summaryDataRows`: `cpuUtilizationPercent`, `ramUtilizationPercent` columns
2. Slide 3 (As-Is vs To-Be) — `compMetrics` rows with labels `'CPU Util %'`, `'RAM Util %'`
3. Final Scenario Comparison slide — metrics labeled `'CPU Util %'`, `'RAM Util %'`, `'Disk Util %'`

The As-Is values (from `cluster.cpuUtilizationPercent` etc.) may be `undefined` — guard with `?? null` before calling `utilCell`.

### Pattern 4: KPI Callout with Shape Background (VISUAL-04)

**What:** `addText` accepts `shape: pptx.shapes.ROUNDED_RECTANGLE` in `TextPropsOptions`, rendering text inside a shape boundary. The `fill` prop colors the shape background. `rectRadius` (0.0–1.0) controls corner rounding.

```typescript
// Source: pptxgenjs types/index.d.ts — TextPropsOptions.shape, .rectRadius, .fill
const KPI_FILL  = 'E8EDF2'
const KPI_TEXT  = NAVY          // '1E3A5F'
const KPI_LABEL = GRAY          // '6B7280'

function addKpiCallout(
  slide: { addText: (t: string, o: Record<string, unknown>) => void },
  items: Array<{ value: string; label: string }>,
  y = 0.9,
) {
  // pptx.shapes must be accessed after lazy-load; pass the shapes object in
  // OR use the string literal 'roundRect' (the SHAPE_NAME enum value)
  const colW = 12.33 / items.length
  items.forEach((item, i) => {
    const x = 0.5 + i * colW
    // Value box with shape background
    slide.addText(item.value, {
      x, y, w: colW * 0.85, h: 0.75,
      shape: 'roundRect' as SHAPE_NAME,   // pptx.shapes.ROUNDED_RECTANGLE === 'roundRect'
      rectRadius: 0.1,                    // 0.0-1.0 per pptxgenjs docs
      fill: { color: KPI_FILL },
      fontSize: 44, bold: true, color: KPI_TEXT, fontFace: FONT, align: 'center', valign: 'middle',
    })
    // Label below box (plain text, no shape)
    slide.addText(item.label, {
      x, y: y + 0.8, w: colW, h: 0.3,
      fontSize: 11, color: KPI_LABEL, fontFace: FONT, align: 'center',
    })
  })
}
```

**Note on shape string:** `pptx.shapes.ROUNDED_RECTANGLE` equals the string `'roundRect'`. Since `addKpiCallout` receives the slide object (not `pptx`), using the literal string avoids needing to pass the `pptx` instance. TypeScript requires casting `as SHAPE_NAME`.

**rectRadius range:** The type definition states 0.0–1.0. The CONTEXT.md specifies `0.3` which is within range. A value of `0.1` gives a subtler rounding; `0.3` gives a notably rounded rectangle. The planner should use `0.1` (subtle) or `0.3` (prominent) per CONTEXT.md decision of `0.3`.

### Pattern 5: UX-01 Default Name Change

**What:** Single string substitution in `createDefaultScenario()`.

```typescript
// defaults.ts:59 — BEFORE
name: 'New Scenario',
// AFTER
name: 'To-Be',
```

**Test impact:** Zero. Grep across all `src/**/*.test.*` files shows no assertion on the string `'New Scenario'`. The seed.test.ts uses `createDefaultScenario()` only to populate store state, never asserting `.name`.

### Anti-Patterns to Avoid

- **Adding accent strip per-slide:** Verbose, error-prone, and misses slides added in Phase 33. Use the master.
- **Using `addShape` on the slide for the KPI background + `addText` separately:** This approach requires pixel-perfect z-ordering. The `shape` prop on `addText` is the correct single-call approach.
- **Forgetting to add `addShape` to the test mock:** The mock slide object in `exportPptx.test.ts` has no `addShape` method. If any per-slide `addShape` calls are added (e.g., for per-slide accent strips), the mock must be extended. For the master-based approach (VISUAL-01), `addShape` is called on the master definition, which uses `defineSlideMaster` (already mocked with `vi.fn()`), not on slide objects.
- **Changing `BLUE` constant to `NAVY`:** Do NOT rename the constant. Keep `BLUE = '3B82F6'` (still used in footers, legend items) and `NAVY = '1E3A5F'` (already defined at line 63). Change the values passed to functions, not the constant names.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rounded-rect shape background for text | Custom SVG or two-layer approach | `addText` with `shape: 'roundRect'` | pptxgenjs handles z-ordering, fill, and OOXML encoding internally |
| Accent strip on every slide | Per-slide `addShape` calls | `{ rect: ShapeProps }` in slide master `objects` | Master propagates automatically; Phase 33 additions get it for free |
| Color threshold calculation | Inline ternary in each cell | `utilColorDot(pct)` helper function | One place to update thresholds if requirements change |

**Key insight:** pptxgenjs 3.12.0 already encodes all OOXML shape primitives. The visual effects in this phase require configuration, not custom code.

## Common Pitfalls

### Pitfall 1: Content X-coordinate overlap with accent strip
**What goes wrong:** The accent strip occupies `x: 0..0.3`. All slide content (tables, addText, addImage) must start at `x >= 0.3`. Most existing content starts at `x: 0.5` which is safe. But the title placeholder is defined in the master at `x: 0.5` — it needs updating to `x: 0.65` to provide a visible gap.
**Why it happens:** Master placeholder `x: 0.5` puts the title left edge 0.2" over the strip edge — visually fine, but a gap of at least 0.1–0.15" beyond the strip improves clarity.
**How to avoid:** When changing the master, update placeholder `x` from `0.5` to `0.65`.
**Warning signs:** Title text appears to start inside the colored strip when previewing the file.

### Pitfall 2: `rectRadius` value out of type spec range
**What goes wrong:** CONTEXT.md specifies `rectRadius: 0.3`. The type definition says 0.0–1.0, so 0.3 is valid. A common mistake is treating this as inches; it is a proportion (0 = square corner, 1 = fully rounded).
**How to avoid:** Use `rectRadius: 0.1` for subtle or `rectRadius: 0.3` per CONTEXT.md. Both are in range.

### Pitfall 3: Utilization value undefined for As-Is column
**What goes wrong:** `cluster.cpuUtilizationPercent` and `cluster.ramUtilizationPercent` are optional fields (`| undefined`) on `OldCluster`. Passing `undefined` to `utilCell` would produce `NaN%`.
**Why it happens:** As-Is data may not include utilization metrics (manual entry path).
**How to avoid:** In `compMetrics` rows for utilization labels, guard:
```typescript
{
  label: 'CPU Util %',
  asIs: cluster.cpuUtilizationPercent !== undefined
    ? utilCellAsis(cluster.cpuUtilizationPercent, rowIdx)
    : plainCell('--', rowIdx),
  scenarioValues: results.map(r => utilCell(r.cpuUtilizationPercent, rowIdx)),
}
```
Or simply keep As-Is utilization as plain text (the CONTEXT.md says color-coding applies to "utilization value" rows — the As-Is side is known data from the old cluster, so it's reasonable to color it too if available, but guarding undefined is essential).

### Pitfall 4: Missing `addShape` in test mock
**What goes wrong:** The mock slide returned by `mockAddSlide` in `exportPptx.test.ts` only has `addText`, `addTable`, `addImage`. If VISUAL-04 is implemented using per-slide `addShape` (NOT recommended), tests throw "slide.addShape is not a function".
**How to avoid:** For VISUAL-01 (master-level rect), `addShape` is never called on a slide object — no mock change needed. For VISUAL-04 (KPI box via `addText` with `shape` prop), `addText` is already mocked — no change needed. Only if the planner opts for a per-slide `addShape` approach does the mock need extending.

### Pitfall 5: `as const` on `TITLE_OPTS` prevents update
**What goes wrong:** `TITLE_OPTS` is declared `as const`. It cannot be mutated, but it CAN be redeclared with a different value:
```typescript
// This works — re-declare, don't mutate
const TITLE_OPTS = { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT } as const
```
**How to avoid:** This is not a runtime pitfall — just change the `color: BLUE` to `color: NAVY` in the constant declaration.

## Code Examples

Verified patterns from pptxgenjs 3.12.0 type definitions:

### Slide master with rect object (VISUAL-01)
```typescript
// Source: pptxgenjs types/index.d.ts — SlideMasterProps.objects: Array<{ rect: ShapeProps }>
pptx.defineSlideMaster({
  title: 'CONTENT_SLIDE',
  background: { color: WHITE },
  objects: [
    { rect: { x: 0, y: 0, w: 0.3, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.65, y: 0.2, w: 11.85, h: 0.6 }, text: '' } },
  ],
})
```

### addText with shape background (VISUAL-04)
```typescript
// Source: pptxgenjs types/index.d.ts — TextPropsOptions.shape (SHAPE_NAME), .rectRadius, .fill
slide.addText(item.value, {
  x: 0.65 + i * colW, y: 0.9, w: colW * 0.85, h: 0.75,
  shape: 'roundRect',       // === pptx.shapes.ROUNDED_RECTANGLE
  rectRadius: 0.3,           // 0.0-1.0 per type docs
  fill: { color: 'E8EDF2' },
  fontSize: 44, bold: true, color: NAVY, fontFace: FONT,
  align: 'center', valign: 'middle',
})
```

### TextProps[] for colored-dot utilization cell (VISUAL-02)
```typescript
// Source: pptxgenjs types/index.d.ts — TableCell.text accepts string | TextProps[]
{
  text: [
    { text: '● ', options: { color: dotColor, fontSize: 10, fontFace: FONT } },
    { text: `${pct.toFixed(1)}%`, options: { color: DARK, fontSize: 10, fontFace: FONT } },
  ],
  options: { fill: { color: rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE } },
}
```

### Navy header cell (VISUAL-03)
```typescript
// Update headerCell() helper — already used across all table slides
function headerCell(text: string) {
  return { text, options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10, fontFace: FONT } }
}
// Update TITLE_OPTS const
const TITLE_OPTS = { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT } as const
```

### UX-01 — default scenario name (defaults.ts:59)
```typescript
// BEFORE
name: 'New Scenario',
// AFTER
name: 'To-Be',
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plain-text KPI numbers | Text inside ROUNDED_RECTANGLE shape | Phase 32 | Boxes give visual hierarchy on Executive Summary slide |
| BLUE (#3B82F6) header fills | NAVY (#1E3A5F) header fills | Phase 32 | Stronger contrast, cohesive with title slide background |
| No accent strip | 0.3" navy sidebar on CONTENT_SLIDE master | Phase 32 | Corporate presales look |
| Plain utilization percentages | Colored-dot + value TextRun | Phase 32 | At-a-glance threshold awareness |
| "New Scenario" default name | "To-Be" default name | Phase 32 | Matches standard presales terminology |

**Deprecated/outdated in this phase:**
- `color: BLUE` in `TITLE_OPTS` and `headerCell()` — replaced with `color: NAVY` / `fill: { color: NAVY }`
- `addKpiCallout()` plain-text implementation (lines 79–95) — replaced with shape-background version

## Open Questions

1. **`line` property on master rect: required or optional?**
   - What we know: `ShapeProps.line` is optional. Without it, the rect may render with a thin default border in some PowerPoint versions.
   - What's unclear: Whether omitting `line` causes visible artifact with pptxgenjs 3.12.0.
   - Recommendation: Specify `line: { color: NAVY }` explicitly to suppress any default border styling.

2. **KPI label as separate `addText` vs multi-block single `addText`**
   - What we know: The current implementation uses two `addText` calls per KPI item (value + label). The CONTEXT.md pattern shows the same two-call approach.
   - What's unclear: Whether a single `addText` with `TextProps[]` (stacked runs) inside a shape gives better layout control.
   - Recommendation: Keep the two-call approach (value box with shape, label as plain text) — it gives independent positioning of value vs label.

3. **Utilization color-coding: As-Is column in comparison table**
   - What we know: CONTEXT.md says "Applies to utilization % rows only (CPU Util %, RAM Util %, Disk Util %)". The As-Is column contains cluster metrics that may be undefined.
   - What's unclear: Whether the As-Is utilization cells should also receive color-dot treatment or stay as plain text.
   - Recommendation: Apply color-coding to As-Is utilization cells when the value is defined (non-undefined); render `'--'` as plain text otherwise. This is consistent with the requirement.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `/Users/fjacquet/Projects/cluster-sizer/vitest.config.ts` |
| Quick run command | `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Default scenario name is "To-Be" | unit | `rtk vitest run src/lib/sizing/__tests__/defaults.test.ts` | ❌ Wave 0 |
| VISUAL-01 | Accent strip present via master | unit (mock verification) | `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ |
| VISUAL-02 | Utilization cells use TextProps[] with colored dot | unit (mock call inspection) | `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ |
| VISUAL-03 | Header cells use NAVY fill | unit (mock call inspection) | `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ |
| VISUAL-04 | KPI addText called with shape: 'roundRect' | unit (mock call inspection) | `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ |

### Sampling Rate

- **Per task commit:** `rtk vitest run src/lib/utils/__tests__/exportPptx.test.ts src/lib/sizing/__tests__/defaults.test.ts`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/sizing/__tests__/defaults.test.ts` — covers UX-01 (asserts `createDefaultScenario().name === 'To-Be'`)

*(Note: exportPptx.test.ts exists but the mock slide lacks `addShape`. If the implementation uses per-slide `addShape`, the mock must add `addShape: vi.fn().mockReturnThis()`. For master-level rect and `addText`-with-shape approach (recommended), no mock change is needed.)*

## Sources

### Primary (HIGH confidence)

- `/Users/fjacquet/Projects/cluster-sizer/node_modules/pptxgenjs/types/index.d.ts` — `SlideMasterProps.objects`, `ShapeProps.fill`, `TextPropsOptions.shape`, `TextPropsOptions.rectRadius`, `SHAPE_NAME.ROUNDED_RECTANGLE = 'roundRect'`, `Slide.addShape` signature
- `/Users/fjacquet/Projects/cluster-sizer/src/lib/utils/exportPptx.ts` — All existing slide structure, helper functions, color constants, master definitions
- `/Users/fjacquet/Projects/cluster-sizer/src/lib/sizing/defaults.ts` — `createDefaultScenario()` at line 56, `name: 'New Scenario'` at line 59
- `/Users/fjacquet/Projects/cluster-sizer/src/lib/utils/__tests__/exportPptx.test.ts` — Mock structure, existing test coverage

### Secondary (MEDIUM confidence)

- pptxgenjs 3.12.0 installed package — confirms API is stable at this version; `shapes.ROUNDED_RECTANGLE = 'roundRect'` verified

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pptxgenjs 3.12.0 types read directly from installed package
- Architecture: HIGH — source files read in full; all change points identified with line numbers
- Pitfalls: HIGH — derived from direct code analysis, not speculation
- Test coverage: HIGH — test file read in full; gaps identified precisely

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable library; pptxgenjs 3.x API is not fast-moving)
