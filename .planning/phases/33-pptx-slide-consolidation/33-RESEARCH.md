# Phase 33: PPTX Slide Consolidation - Research

**Researched:** 2026-03-24
**Domain:** pptxgenjs slide layout, table positioning, slide deletion
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MERGE-01 | Assumptions + Server Config + Growth tables merged into single "Sizing Parameters" slide | Section tables already share the same `assumptionsColW` width variable; growth table is conditional; server config table uses same header pattern — all three can be stacked vertically or arranged in a two-column layout on one slide |
| MERGE-02 | Per-scenario capacity breakdown table merged into capacity chart slide | Capacity chart slide (lines 758-808) already renders both image AND an absolute-values table; the separate `bdSlide` block (lines 706-756) is the duplicate that must be removed |
| MERGE-03 | Final "Scenario Comparison" slide removed | The `compSlide` block (lines 849-905) is a standalone slide duplicating data already in Slide 3 "As-Is vs To-Be Comparison" — simply delete that block |
</phase_requirements>

## Summary

Phase 33 is a pure consolidation refactor inside a single file: `src/lib/utils/exportPptx.ts` (~912 lines). The current deck has three structural redundancies that must be eliminated.

The current slide sequence for a single-scenario export with growth is:

1. Title
2. Executive Summary
3. As-Is vs To-Be Comparison (the authoritative comparison table)
4. Sizing Assumptions (general params + optional vSAN sub-table)
5. Growth Projections (separate slide, conditional)
6. Per-Scenario Server Configuration (separate slide)
7. Capacity Breakdown Table — `bdSlide` (per scenario, separate)
8. Capacity Breakdown Chart + table — `capSlide` (per scenario, with embedded table)
9. Min Nodes Chart — `mnSlide` (per scenario)
10. Scenario Comparison — `compSlide` (final slide, duplicates slide 3)

After consolidation the sequence should be:

1. Title
2. Executive Summary
3. As-Is vs To-Be Comparison
4. Sizing Parameters (merged: Assumptions + Server Config + optional Growth)
5. Capacity Breakdown Chart + table — `capSlide` (per scenario, no separate breakdown slide)
6. Min Nodes Chart — `mnSlide` (per scenario)

Slides removed: Sizing Assumptions (#4), Growth Projections (#5 conditional), Per-Scenario Server Configuration (#6), Capacity Breakdown Table (#7 per scenario), Scenario Comparison (#10 final). Slide count reduction = at least 3 for a single scenario with no growth.

**Primary recommendation:** Three targeted edits inside `exportPptx.ts`: (a) merge three table blocks onto one "Sizing Parameters" slide, (b) delete the standalone `bdSlide` block (chart slide already has the table), (c) delete the `compSlide` block at end of file.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pptxgenjs | already installed | Slide creation, `addTable`, `addImage`, `addText` | Project dependency; all slide masters and helpers already established in Phase 32 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | already installed | Test framework | Verify slide count assertions and mock call inspection |

No new dependencies are required. All needed APIs (`addTable`, `addSlide`, `addText`, positioning options) are already used in the file.

## Architecture Patterns

### Current Slide Structure (lines in exportPptx.ts)

```
Lines 211-233:  Slide 1 — Title
Lines 235-282:  Slide 2 — Executive Summary
Lines 284-448:  Slide 3 — As-Is vs To-Be Comparison
Lines 450-588:  Slide 4 — Sizing Assumptions (general + optional vSAN sub-table)
Lines 597-651:  Slide 5 — Growth Projections (conditional: `if (hasGrowth)`)
Lines 654-697:  Slide 6 — Per-Scenario Server Configuration
Lines 699-845:  Per-scenario loop:
                  Lines 706-756: bdSlide — Capacity Breakdown TABLE (standalone)
                  Lines 758-808: capSlide — Capacity Breakdown CHART + table (contains duplicate table)
                  Lines 810-844: mnSlide — Min Nodes Chart
Lines 847-905:  Final: compSlide — Scenario Comparison (duplicate of slide 3)
```

### Target Slide Structure After Phase 33

```
Lines 211-233:  Slide 1 — Title (unchanged)
Lines 235-282:  Slide 2 — Executive Summary (unchanged)
Lines 284-448:  Slide 3 — As-Is vs To-Be Comparison (unchanged)
Lines NEW:      Slide 4 — Sizing Parameters (merged: Assumptions + Server Config + Growth)
Lines in loop:  Per-scenario:
                  capSlide — Capacity Breakdown CHART + table (unchanged, already has table)
                  mnSlide  — Min Nodes Chart (unchanged)
DELETED:        compSlide — Scenario Comparison
```

### Pattern 1: Vertical Table Stacking on One Slide (MERGE-01)

**What:** Place multiple `addTable` calls on a single slide with computed `y` offsets so tables stack without overlap.

**When to use:** When three related tables (Assumptions, Server Config, Growth) all fit on one slide by stacking.

**Approach:** Create one slide titled "Sizing Parameters", then call `addTable` three times with increasing `y` values. The general assumptions table starts at `y: 1.2`, server config table starts at `y: 1.2 + assumptionsRowCount * rowHeight + gap`, and the growth table (if present) follows. This is the exact same technique already used for the vSAN sub-table on the Assumptions slide (line 576-587: `const vsanTableY = 1.2 + (generalAssumptions.length + 1) * 0.35 + 0.3`).

**Row height approximation:** Each pptxgenjs table row renders at approximately `0.32-0.35"` by default (consistent with existing code's `0.35` constant). With header, Assumptions has 6 rows = ~2.1", Server Config has 6 rows = ~2.1", total = ~4.5" which fits on a 7.5" slide with title and footer.

**Example (pattern already in file):**
```typescript
// Source: exportPptx.ts line 576-587 (existing vSAN sub-table positioning)
const vsanTableY = 1.2 + (generalAssumptions.length + 1) * 0.35 + 0.3
assumptionsSlide.addTable([vsanHeader, ...vsanDataRows], { x: 0.5, y: vsanTableY, ... })
```

**Growth conditional:** The growth table block already lives inside `if (hasGrowth)`. Move that entire conditional to add a third `addTable` call on the same slide (not a new slide). Add a section label row (using GRAY header) before each sub-table to visually separate them.

### Pattern 2: Remove Redundant bdSlide (MERGE-02)

**What:** Delete the `bdSlide` block entirely (lines 706-756). The `capSlide` block (lines 758-808) already contains an identical absolute-values table (`capTableHeader` + `capTableRows`). When `charts?.capacity` is null (e.g., in tests), neither the chart slide nor the old breakdown slide was meaningful — the test mock returns null for chart data and the existing test expects `>= 4 slides` (which will still pass with slide 3 gone because the breakdown table was conditional on `if (bd)`).

**Test impact:** The existing test `'creates multiple slides'` expects `>= 4` slides. After removing `bdSlide` and `compSlide`, a single-scenario export (no chart, since mock returns null) produces: Title + ExecutiveSummary + AsIsVsToBeComparison + SizingParameters = 4 slides. This satisfies `>= 4`. No test change needed for the count assertion, but the test description comment `'Title + Summary + Breakdown table (1 scenario) + Comparison = at least 4 slides'` should be updated to reflect the new structure.

### Pattern 3: Delete Final compSlide (MERGE-03)

**What:** Delete lines 847-905 entirely. The `compSlide` contains a table (`finalMetrics`) that duplicates data already present in `comparisonSlide` (Slide 3). No logic needs to move — the data is redundant.

**Side effect:** `addFooter` increments `_slideNum` module-level counter. After removing `bdSlide` and `compSlide`, the slide counter decrements accordingly. This is not a problem since `_slideNum` resets to 0 at the start of each `exportPptx` call (line 189).

### Anti-Patterns to Avoid

- **Adding a new sub-table header row as a `headerCell()`:** Use `_grayHeaderCell()` (already defined, line 60-61) for section dividers within the merged "Sizing Parameters" slide. It uses GRAY fill to visually separate the three sections from the NAVY-fill main header row.
- **Changing `addFooter` call order:** `addFooter` increments `_slideNum`. Only call it once per slide, after all content is added to that slide.
- **Moving growth content but leaving the old `growthSlide` variable:** The `growthSlide` variable and its `pptx.addSlide()` call must be removed entirely — currently this creates a slide even if the tables are moved.
- **Forgetting the `addFooter(assumptionsSlide, dateStr)` at line 652:** This call is currently after the growth slide conditional. When merging, the new "Sizing Parameters" slide must also call `addFooter` exactly once, after all tables (including the conditional growth table).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table vertical offset calculation | Custom height measurement function | Multiply row count by `0.35` (established constant) | Already proven in existing vSAN sub-table positioning; pptxgenjs does not expose rendered table height |
| Section separators between tables | Horizontal rule shape | Section label row using `_grayHeaderCell()` | Consistent with existing header style; simpler than addShape |

**Key insight:** The entire implementation is deletion + repositioning of already-written code blocks. No new pptxgenjs APIs are needed.

## Common Pitfalls

### Pitfall 1: Growth Slide Variable Scope

**What goes wrong:** The `hasGrowth` check creates a `growthSlide` variable. If you move the table content to the merged slide but leave `const growthSlide = pptx.addSlide(...)`, an extra blank slide is still created.

**Why it happens:** `pptx.addSlide()` has the side effect of immediately adding a slide. The slide exists once the call is made regardless of whether content is added.

**How to avoid:** Remove `const growthSlide = pptx.addSlide(...)` entirely. Reference the shared `sizingParamsSlide` variable instead within the `if (hasGrowth)` block.

**Warning signs:** Slide count does not decrease by expected amount after the merge.

### Pitfall 2: addFooter Double-Call

**What goes wrong:** The current code calls `addFooter(assumptionsSlide, dateStr)` at line 652 (after the growth conditional), but the growth slide block also needs no footer call on the merged slide. If footer is called twice on the same slide, `_slideNum` increments twice and the slide number display is wrong.

**How to avoid:** The merged "Sizing Parameters" slide must have exactly one `addFooter` call, placed after all table additions including the conditional growth section.

### Pitfall 3: Y Position Overflow

**What goes wrong:** If all three tables are placed on one slide without proper offset calculation, tables overlap or extend off-slide (below y=7.5").

**Why it happens:** General assumptions (5 rows + header = ~2.1"), server config (5 rows + header = ~2.1") stacked = ~4.5" of tables. Starting at y=1.2", ending at ~5.7", leaving ~1.3" for footer — sufficient. Adding a 3-row growth table (~1.0") would push to ~6.7" — still within bounds but tight. Optional: use `fontSize: 9` if needed to tighten rows.

**How to avoid:** Use the established `rowHeight = 0.35` constant. Calculate: `tableY = startY + (rowCount + 1) * rowHeight + gap`. For the merged slide: assumptions ends at `1.2 + 6 * 0.35 = 3.3"`, server config starts at `3.3 + 0.3 = 3.6"`, ends at `3.6 + 6 * 0.35 = 5.7"`, growth (if present) starts at `5.7 + 0.3 = 6.0"`, ends at `6.0 + 4 * 0.35 = 7.4"` — right at the limit. With growth, use `rowHeight = 0.32` or consider omitting growth section label row.

### Pitfall 4: Test Count Assertion Mismatch

**What goes wrong:** The test `'creates multiple slides'` at line 143 expects `>= 4`. After removing bdSlide + compSlide, the mock (which returns null for chart data) produces exactly 4 slides. If an accidental off-by-one occurs, the test fails.

**How to avoid:** Count manually: Title(1) + ExecutiveSummary(2) + AsIsVsToBeComparison(3) + SizingParameters(4). When `chartRefToDataUrl` returns null (test mock), `capSlide` and `mnSlide` are NOT created (gated by `if (charts?.capacity)`). So 4 slides total = exactly `>= 4`. The assertion holds.

## Code Examples

### Existing vSAN sub-table Y offset pattern (re-use for MERGE-01)
```typescript
// Source: exportPptx.ts lines 576-587
const vsanTableY = 1.2 + (generalAssumptions.length + 1) * 0.35 + 0.3
assumptionsSlide.addTable(
  [vsanHeader, ...vsanDataRows],
  {
    x: 0.5,
    y: vsanTableY,
    w: 12,
    colW: [3, ...scenarios.map(() => assumptionsColW)],
    border: { pt: 0.5, color: 'CFCFCF' },
  },
)
```

### Section label row using gray header (existing helper)
```typescript
// Source: exportPptx.ts lines 60-63 (_grayHeaderCell definition)
function _grayHeaderCell(text: string) {
  return { text, options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10, fontFace: FONT } }
}
// Usage: add a merged section header row spanning all columns
const sectionRow = [
  _grayHeaderCell('Server Configuration'),
  ...scenarios.map(() => ({ text: '', options: { fill: { color: GRAY } } }))
]
```

### Removing the standalone bdSlide (MERGE-02)
The block to delete entirely (lines 706-756):
```typescript
// DELETE this entire block:
if (bd) {
  const bdSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  bdSlide.addText(`Capacity Breakdown -- ${scenario.name}`, { ... })
  // ... table build ...
  bdSlide.addTable([bdHeaderRow, ...bdDataRows], { ... })
  addFooter(bdSlide, dateStr)
}
// The capSlide block (lines 758-808) already contains an identical table.
```

### Removing the final compSlide (MERGE-03)
The block to delete entirely (lines 847-905):
```typescript
// DELETE this entire block:
const compSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
compSlide.addText('Scenario Comparison', { ... })
// ... table build ...
compSlide.addTable([finalCompHeader, ...finalCompRows], { ... })
addFooter(compSlide, dateStr)
// Slide 3 "As-Is vs To-Be Comparison" (lines 284-448) already covers this content.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Growth on separate slide | Growth on same "Sizing Parameters" slide | Phase 33 | -1 to -2 slides per export |
| Standalone capacity breakdown table slide | Breakdown table embedded in chart slide | Phase 33 | -1 slide per scenario |
| Final "Scenario Comparison" slide | Removed (As-Is vs To-Be is authoritative) | Phase 33 | -1 slide always |

**Baseline slide count (single scenario, with growth, no charts):** 7 slides
**After consolidation:** 4 slides — reduction of 3, satisfying success criterion 4.

**Baseline slide count (single scenario, with growth, with charts):** 10 slides
**After consolidation:** 6 slides — reduction of 4.

## Open Questions

1. **Section separators inside "Sizing Parameters" slide**
   - What we know: Three tables will stack; visual separation is needed
   - What's unclear: Whether to use section label rows (gray header row with merged column) or just whitespace (Y gap)
   - Recommendation: Use section label row with `_grayHeaderCell` for "Server Configuration" header; growth section labeled "Growth Projections". The assumptions table already has its own GRAY-fill header with "Parameter" label so it serves as its own section start.

2. **Overflow behavior with many scenarios (3+)**
   - What we know: `assumptionsColW = (12 - 3) / scenarios.length` — column widths shrink with more scenarios
   - What's unclear: At 4+ scenarios, font size 10 may crowd cells in the merged slide
   - Recommendation: Planner may opt to add `fontSize: 9` fallback if `scenarios.length > 3`, but this is Claude's discretion and not required by MERGE-01.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MERGE-01 | Single "Sizing Parameters" slide — no separate Assumptions/Server Config/Growth slides | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ (new test needed) |
| MERGE-02 | No standalone capacity breakdown table slide — table appears on chart slide only | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ (new test needed) |
| MERGE-03 | No "Scenario Comparison" slide — only "As-Is vs To-Be Comparison" | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ (new test needed) |
| Count | Total slide count decreases by >= 3 for single-scenario export | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ (update existing count test) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
New test cases that must be added to the existing `exportPptx.test.ts`:

- [ ] `it('creates a "Sizing Parameters" slide title, not "Sizing Assumptions" or "Server Configuration"')` — covers MERGE-01
- [ ] `it('does not create a standalone capacity breakdown table slide when chart is null')` — covers MERGE-02 (verify slide count when breakdown present but chart null)
- [ ] `it('does not create a "Scenario Comparison" slide')` — covers MERGE-03; verify no `mockAddText` call with text "Scenario Comparison"
- [ ] Update comment in existing `'creates multiple slides'` test to reflect new slide sequence

All new tests belong in the existing `src/lib/utils/__tests__/exportPptx.test.ts` file using the existing mock infrastructure.

## Sources

### Primary (HIGH confidence)
- Direct file read of `src/lib/utils/exportPptx.ts` (lines 1-912) — full current slide structure
- Direct file read of `src/lib/utils/__tests__/exportPptx.test.ts` (lines 1-239) — existing test patterns
- Direct file read of `.planning/REQUIREMENTS.md` — MERGE-01/02/03 definitions

### Secondary (MEDIUM confidence)
- `.planning/phases/32-pptx-visual-polish-ux-fix/32-CONTEXT.md` — established patterns (NAVY constant, master definition, `addFooter` behavior)
- `.planning/STATE.md` — confirmed Phase 32 complete, no pending todos blocking Phase 33

### Tertiary (LOW confidence)
- None — all research based on direct code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by reading all 912 lines of the target file
- Architecture: HIGH — current slide sequence confirmed line by line
- Pitfalls: HIGH — derived from existing code patterns and confirmed test behavior
- Test strategy: HIGH — existing mock infrastructure confirmed working (10 tests pass)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable codebase, single-file scope)
