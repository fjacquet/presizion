# Retrospective: Cluster Refresh Sizing Tool

---

## Milestone: v1.2 — Visualization, File Import & Tech Debt

**Shipped:** 2026-03-13
**Phases:** 10 | **Plans:** 29
**Timeline:** 2 days (2026-03-12 → 2026-03-13)

### What Was Built

1. Complete sizing engine — CPU/RAM/disk formulas + SPECint mode + utilization right-sizing, 254 Vitest tests
2. 3-step wizard — React + Tailwind v4 + shadcn/ui with live calculations, inline formula display, dark mode, GitHub Pages
3. As-Is/To-Be comparison report — side-by-side comparison table, color-coded utilization, As-Is reference column, CSV/JSON/clipboard/print-PDF export
4. SPECint sizing mode — global toggle, conditional UI fields, delta formula correctly wired
5. Bar chart — Recharts BarChart with SPECint label awareness and PNG download
6. File import — RVTools + LiveOptics detection, column alias maps ported from Python, ImportPreviewModal confirm step

### What Worked

- **Math before UI** — establishing the sizing engine in Phase 1 with reference fixtures before any component was written eliminated formula regressions entirely. Zero formula bugs in 10 phases.
- **Wave 0 it.todo stubs (Nyquist pattern)** — writing test stubs before implementation created accurate leading indicators and ensured test coverage was never an afterthought.
- **derive-on-read** — never storing ScenarioResult in Zustand (useScenariosResults derives on demand) eliminated stale-state bugs that would otherwise have required careful invalidation.
- **z.preprocess for Zod** — treating empty string as a validation error (not coercing to 0) at the form boundary prevented NaN from ever reaching formula functions.
- **GSD framework discipline** — math-before-UI ordering, per-plan commits, VERIFICATION.md gating provided clear checkpoints and made it easy to resume across context resets.

### What Was Inefficient

- **Phases 8-10 as informal sprint** — implementing charts and file import outside GSD framework created documentation debt that required a full backfill phase (Phase 8). Future sprints should use the GSD framework even under time pressure.
- **ResizeObserver jsdom issue** — Recharts' dependency on ResizeObserver caused test failures that required a test-setup.ts stub. Should be in standard jsdom mock setup from the start.
- **@base-ui/react/dialog import confusion** — `{ Dialog }` not `* as Dialog` — took debugging iteration. Should document base-ui import patterns in CLAUDE.md.
- **exactOptionalPropertyTypes** — required conditional spreads instead of simple optional field assignment in several places. The pattern `...(val !== undefined && { key: val })` is verbose but necessary.
- **Dead code (parseNumericInput.ts)** — lived in the codebase from Phase 1 through Phase 7. Should have been deleted when superseded by z.preprocess in Phase 1 itself.

### Patterns Established

- **Column alias maps for file parsers** — `RVTOOLS_ALIASES` and `LIVEOPTICS_ALIASES` objects with `resolveColumns()` first-match resolution. Portable pattern for any future file format.
- **Dynamic import for large dependencies** — `importFile()` using `await import('xlsx')` and `await import('jszip')` inside the function body. Vite auto-splits to lazy chunk; pattern should be used for any dependency >200KB.
- **Recharts mocking in jsdom** — mock the entire recharts module with functional stubs (BarChart/Bar/etc. render children + data-testid attributes). ResizeObserver stub in test-setup.ts.
- **useEffect store→form sync** — value-equality guard before form.reset() prevents infinite loops after external store updates (import Apply, future features).

### Key Lessons

1. Use GSD framework for every phase, even accelerated sprints — the documentation backfill cost more time than scaffolding would have.
2. Add ResizeObserver mock to test-setup.ts at project init when using charting libraries.
3. Lock third-party library versions that have licensing implications (xlsx@0.18.5) in CLAUDE.md constraints.
4. Dead code should be deleted as soon as it is superseded, not at end of milestone.
5. Import pattern quirks for non-standard packages (base-ui) should be documented immediately after discovery.

### Cost Observations

- **Sessions:** Multiple sessions across 2 days (context compaction occurred)
- **Model:** claude-sonnet-4-6 throughout
- **Notable:** Context compaction during v1.2 implementation sprint required state reconstruction but caused no code quality issues due to GSD SUMMARY.md files providing full phase context

---

## Cross-Milestone Trends

| Metric | v1.2 |
|--------|------|
| Phases | 10 (cumulative) |
| Plans | 29 |
| Tests at completion | 254 |
| LOC (src/) | ~6,445 |
| Formula regressions | 0 |
| Phase duration avg | < 1 day |
| GSD framework compliance | Phases 1-7: full; Phases 8-10: informal |
