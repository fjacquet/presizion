# Phase 32: PPTX Visual Polish & UX Fix - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform PPTX content slides from plain white backgrounds to professional presales presentation styling. Add visual accent strip, utilization color-coding, dark header bands, and KPI shape backgrounds. Fix default scenario name from "New Scenario" to "To-Be". No slide restructuring (that's Phase 33).

</domain>

<decisions>
## Implementation Decisions

### Accent strip
- Navy (#1E3A5F) vertical strip on the left edge of every content slide (not the title slide)
- Medium width: 0.3 inches
- Full height of the slide (0 to 7.5" on LAYOUT_WIDE)
- Implemented via `addShape(pptx.shapes.RECTANGLE, ...)` on the CONTENT_SLIDE master or on each slide
- Matches the title slide background color for visual cohesion

### Utilization color-coding
- Applies to utilization % rows only (CPU Util %, RAM Util %, Disk Util %) — not server counts or ratios
- Thresholds: green <70%, amber 70-85%, red >85% (aligned with VMware best practices)
- Style: colored circle icon (●) prepended to the value text, using colored TextRun — cell background stays unchanged
- Green: #22C55E, Amber: #F59E0B, Red: #EF4444

### KPI callout boxes
- Rounded rectangles with `rectRadius: 0.3` using `addText` with `shape: pptx.shapes.ROUNDED_RECTANGLE`
- Fill: light blue-gray (#E8EDF2)
- Value text: navy (#1E3A5F), 44pt bold
- Label text: gray (#6B7280), 11pt
- Replaces the current plain-text `addKpiCallout` function

### Section header bands
- Table header rows switch from brand blue (#3B82F6) to navy (#1E3A5F) — stronger contrast
- Applies to top header rows of all tables (Scenario, Metric, Parameter, Resource, etc.)
- No sub-category bands within tables — keep it clean
- Slide title text also switches to navy (#1E3A5F) for cohesion (was brand blue)

### Default scenario name (UX-01)
- Change `name: 'New Scenario'` to `name: 'To-Be'` in `src/lib/sizing/defaults.ts:59`
- Update any tests that assert the default name

### Claude's Discretion
- Exact positioning offsets for accent strip vs content area (may need to shift content right by 0.15-0.3")
- Whether to add the accent strip to the slide master definition or per-slide (master is cleaner but may conflict with title slide)
- Footer text positioning adjustment to account for accent strip

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PPTX export
- `src/lib/utils/exportPptx.ts` — The ~870-line file being modified; contains all slide definitions, masters, helpers, color constants
- `src/lib/sizing/defaults.ts` — Contains `createDefaultScenario()` with the `name` field to change

### pptxgenjs API
- Context7 docs (`/gitbrent/pptxgenjs`) — `addShape` with RECTANGLE/ROUNDED_RECTANGLE, slide master `objects` array for persistent shapes, `rectRadius` for rounded corners

### Testing
- `src/lib/utils/__tests__/exportPptx.test.ts` — Existing PPTX export tests
- `src/store/__tests__/useScenariosStore.seed.test.ts` — Tests that may reference default scenario name

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `addKpiCallout()` helper (exportPptx.ts:79-95) — currently plain text, will be replaced with shape-based version
- `headerCell()` / `dataCell()` helpers (exportPptx.ts:52-61) — already handle fill colors, need navy color update
- Color constants (BLUE, GREEN, AMBER, DARK, NAVY, etc.) already defined at top of file

### Established Patterns
- Slide masters defined via `pptx.defineSlideMaster()` with `objects` array — can add rect shape here
- All slides use `{ masterName: 'CONTENT_SLIDE' }` — single master update propagates everywhere
- `TITLE_OPTS` and `SUBTITLE_OPTS` const objects for consistent text styling

### Integration Points
- `CONTENT_SLIDE` master definition (line 172-178) — add accent strip shape here
- `headerCell()` function (line 52-54) — change BLUE to NAVY
- `TITLE_OPTS` const (line 48) — change color from BLUE to NAVY
- `addKpiCallout()` function (line 79-95) — rewrite to use `addText` with ROUNDED_RECTANGLE shape
- `createDefaultScenario()` in defaults.ts line 59 — change name string

</code_context>

<specifics>
## Specific Ideas

- Navy (#1E3A5F) is the unifying dark color — accent strip, header bands, slide titles, KPI text all use it
- Utilization icons use the existing app color palette (GREEN/AMBER + Tailwind red-500)
- The accent strip + navy headers create a "Dell presales" corporate feel without being heavy-handed
- KPI boxes with light blue-gray fill create visual hierarchy on the Executive Summary slide

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 32-pptx-visual-polish-ux-fix*
*Context gathered: 2026-03-24*
