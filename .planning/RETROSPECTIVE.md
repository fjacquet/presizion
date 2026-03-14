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

## Milestone: v1.3 — Scope, Persistence & Branding

**Shipped:** 2026-03-14
**Phases:** 5 (11-15) | **Plans:** 10
**Timeline:** 1 day (2026-03-13 → 2026-03-14)

### What Was Built

1. **Presizion branding** — SVG wordmark (geometric P mark + wordmark, #3B82F6/#475569), custom favicon replacing Vite default, wired into WizardShell header
2. **RAM formula display parity** — `ramUtilizationPercent` added to `RamFormulaParams`, conditional `× N%` factor in `ramFormulaString`, matches CPU pattern (TD-04 resolved)
3. **Dark mode toggle** — `useThemeStore` (Zustand + localStorage), Sun/Moon `ThemeToggle` in header, OS fallback on first visit, anti-flash script in index.html
4. **Multi-cluster import scope filter** — parser scope detection in RVTools + LiveOptics, `scopeAggregator.ts`, ImportPreviewModal scope selector with live re-aggregation preview
5. **Persistent scope badge** — `useImportStore` for import buffer, `ScopeBadge` in Step 1 with edit dialog that re-aggregates on scope change
6. **Session persistence + Share** — `persistence.ts` (serialize/deserialize/localStorage/base64url hash), boot restore (hash priority > localStorage), Share button with "Link Copied!" feedback

### What Worked

- **GSD framework for all 5 phases** — full framework compliance throughout; no documentation backfill needed (contrast with v1.2 Phases 8-10 informal sprint)
- **Separation of import state** — `useImportStore` holding the raw import buffer independently of wizard state made scope re-aggregation clean with no refactoring of existing stores
- **Zod validation in persistence** — deserializing from localStorage/URL through Zod schemas prevented corrupted or stale state from reaching the UI; silent null returns on bad data were the right pattern
- **history.replaceState after hash restore** — clears the hash from the address bar immediately after loading, so subsequent refreshes use localStorage naturally
- **Wave structure (persist utility → URL hash)** — splitting plan 15-01 (utility layer) from 15-02 (URL + Share) meant the executor could build on a stable foundation in wave 2 with no circular dependencies

### What Was Inefficient

- **Phase 09/10 confusion on plan-phase** — initial `/gsd:plan-phase 09` call required workflow clarification; `roadmap get-phase` returning `found: false` despite ROADMAP.md having the phase caused confusion. Phase directory creation needed manual intervention.
- **Zod v4 UUID regex strictness** — test fixtures using `00000000-0000-0000-0000-000000000001` (invalid variant bits) silently failed Zod v4 validation. Required fixing to RFC 4122 compliant UUIDs (`a0eebc99-...`). Should be in standard fixture conventions.
- **REQUIREMENTS.md missing THEME-01/02/03** — dark mode requirements were referenced in ROADMAP.md but absent from REQUIREMENTS.md traceability table. Minor documentation gap.

### Patterns Established

- **`history.replaceState(null, '', location.pathname + location.search)` after hash restore** — clean URL hash clearing without page reload; reusable pattern for any hash-based feature
- **Synchronous boot restore before `createRoot`** — call store `getState().set*` imperatively before React mounts; initial render has restored state, zero flash
- **Zustand `store.subscribe` for auto-save** — no middleware required, plain subscribe fires on every state change, filter via `saveToLocalStorage` with try/catch for SecurityError
- **Scope aggregation via import buffer** — store raw parsed data in `useImportStore.importBuffer`; re-aggregation is a pure function over (buffer, selectedClusters); no re-parse needed

### Key Lessons

1. **Zod v4 UUID validation** — test fixtures must use RFC 4122 compliant UUIDs (check variant bits); add to project fixture conventions
2. **`roadmap get-phase` tool gap** — gsd-tools CLI doesn't reliably find phases by number when the phase is in progress (not yet in directory); document workaround (manual mkdir)
3. **GSD framework discipline pays off** — all 5 phases completed cleanly with no backfill; contrast with v1.2 informal sprint that required Phase 8 backfill

### Cost Observations

- **Sessions:** 1 day, multiple context resets handled by GSD state
- **Model:** claude-sonnet-4-6 throughout (planner, executor, verifier agents)
- **Notable:** Wave-based parallel execution worked cleanly for all phases; verifier scored 7/7 on phase 15 with 378 tests passing

---

## Cross-Milestone Trends

| Metric | v1.2 | v1.3 |
|--------|------|------|
| Phases | 10 (cumulative) | 5 (incremental) |
| Plans | 29 | 10 |
| Tests at completion | 254 | 378 |
| LOC (src/) | ~6,445 | ~10,118 |
| Formula regressions | 0 | 0 |
| Phase duration avg | < 1 day | < 1 day |
| GSD framework compliance | Phases 1-7: full; 8-10: informal | Phases 11-15: full |
