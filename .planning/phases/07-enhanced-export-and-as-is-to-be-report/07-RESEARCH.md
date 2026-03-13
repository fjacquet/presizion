# Phase 7: Enhanced Export and As-Is/To-Be Report - Research

**Researched:** 2026-03-13
**Domain:** Browser file download, CSS @media print, React table column injection, form field visibility
**Confidence:** HIGH

## Summary

Phase 7 is a pure front-end phase with four discrete tasks that build on top of the existing, fully-passing v1.1 codebase (222 tests green). The work splits cleanly into two export features (EXPO-03 JSON download, EXPO-04 print CSS) and two report-clarity features (REPT-01 As-Is column, REPT-02 server count unconditional). No new npm dependencies are needed — all techniques are available in the current stack (React 19, TypeScript strict, Tailwind v4, Zustand v5, Vitest 4).

The hardest part of this phase is EXPO-04 (print CSS) because Tailwind v4 requires a specific pattern to preserve utility-class color in print and to inject `@media print` rules that override the layout. Color-coding (`text-green-*`, `text-amber-*`, `text-red-*`) uses forced-colors-aware CSS custom properties via Tailwind's dark-mode mechanism, and print media must not clobber them. The remaining three requirements are straightforward extensions of existing patterns.

**Primary recommendation:** Wave 0 adds test stubs for all four requirements. Then implement in two parallel waves: (Wave 2a) `buildJsonContent` + `downloadJson` in `export.ts` and the As-Is column in `ComparisonTable.tsx`; (Wave 2b) `@media print` block in `index.css` and the unconditional `existingServerCount` in `CurrentClusterForm.tsx`. Both wave 2 plans can be executed in parallel because they touch different files.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPO-03 | User can download a JSON file containing all inputs and outputs for all scenarios | `buildJsonContent` follows same signature as `buildCsvContent`; `downloadJson` follows same Blob/anchor pattern as `downloadCsv` |
| EXPO-04 | App provides a print-optimized stylesheet; browser print / Save as PDF produces a clean layout | Pure `@media print` block in `index.css`; `print:hidden` Tailwind utilities; `-webkit-print-color-adjust: exact` for color preservation |
| REPT-01 | Step 3 comparison table includes an "As-Is" reference column showing current cluster metrics | `ComparisonTable` already reads `useClusterStore`; inject a leading column derived from `OldCluster` values |
| REPT-02 | `existingServerCount` shown in Step 1 unconditionally; `totalPcores` becomes optional/auto-derived | Move `existingServerCount` field out of the SPECint-mode guard in `CurrentClusterForm.tsx`; add auto-derive logic when count + sockets + cores all present |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 | All new code; strict mode required | Already in project; no change |
| React 19 | ^19.2.4 | Component rendering for table and form changes | Already in project |
| Tailwind v4 | ^4.2.1 | `print:hidden`, `print:block`, `@media print` in CSS | Already in project |
| Vitest | ^4.1.0 | Unit tests for all new functions | Already in project |
| @testing-library/react | ^16.3.2 | Component tests for ComparisonTable and CurrentClusterForm | Already in project |

### No New Dependencies Required

All four requirements are implementable with existing stack. `JSON.stringify` (built-in) handles serialization. `Blob` + `URL.createObjectURL` (already used in `downloadCsv`) handles file download. `@media print` CSS (built-in browser mechanism) handles print layout.

**Installation:**

```bash
# No new packages — existing stack is sufficient
```

---

## Architecture Patterns

### Recommended File Changes

```
src/
  lib/utils/
    export.ts               # ADD: buildJsonContent(), downloadJson()
    __tests__/
      export.test.ts        # ADD: tests for buildJsonContent, downloadJson
  components/
    step3/
      ComparisonTable.tsx   # MODIFY: inject As-Is reference column (REPT-01)
      __tests__/
        ComparisonTable.test.tsx  # ADD: As-Is column tests
    step1/
      CurrentClusterForm.tsx      # MODIFY: unconditional existingServerCount, auto-derive totalPcores (REPT-02)
      __tests__/
        CurrentClusterForm.test.tsx  # ADD: REPT-02 tests
  index.css                 # ADD: @media print block (EXPO-04)
```

### Pattern 1: JSON Download (EXPO-03) — Same as CSV pattern

**What:** Build a JSON string from cluster + scenarios + results, then trigger Blob download.
**When to use:** Adding "Download JSON" button to `Step3ReviewExport`.
**Example:**

```typescript
// Following the existing downloadCsv pattern in src/lib/utils/export.ts
export function buildJsonContent(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
): string {
  const payload = {
    currentCluster: cluster,
    scenarios: scenarios.map((s, i) => ({
      ...s,
      result: results[i] ?? null,
    })),
    generatedAt: new Date().toISOString(),
  }
  return JSON.stringify(payload, null, 2)
}

export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

**Key decision:** Scenarios and results are interleaved in the JSON (same index) to make the file human-readable without cross-referencing. Field names use the application's internal TypeScript names verbatim (no renaming).

### Pattern 2: Print CSS (EXPO-04) — @media print in index.css

**What:** A `@media print` block that hides non-report UI and forces single-column layout.
**When to use:** Added to `index.css`; no component changes required beyond adding `print:hidden` classes to buttons/chrome in JSX.

**Key rules for `@media print`:**

| Problem | Solution |
|---------|----------|
| Buttons/wizard chrome visible | `@apply print:hidden` in Tailwind or `display:none` in CSS block |
| Overflow-x-auto clips table at print width | `overflow: visible !important` on `.overflow-x-auto` wrapper |
| Color-coded cells lose color in print | `-webkit-print-color-adjust: exact; print-color-adjust: exact` on root or table |
| Tailwind dark: variants still apply | Print CSS uses `@media print` which overrides dark-mode; explicit reset needed if class is `.dark` |
| Table columns truncated on A4 width | `table-layout: auto; width: 100%` in print; reduce font size if needed |
| `#root` has fixed max-width 1126px with border-inline | Override to `max-width: 100%; border: none` in print block |

**Example `@media print` block structure (add to `index.css`):**

```css
@media print {
  /* Remove page chrome */
  .wizard-nav,
  .print-hidden {
    display: none !important;
  }

  /* Allow full-width printing */
  #root {
    max-width: 100%;
    border: none;
  }

  /* Preserve color coding in print */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Remove overflow clipping so table is not truncated */
  .overflow-x-auto {
    overflow: visible !important;
  }

  /* Prevent table from spanning multiple pages awkwardly */
  table {
    page-break-inside: avoid;
  }
}
```

**Tailwind v4 approach:** Add `print:hidden` classes directly to JSX elements (buttons, step indicator, wizard chrome). Tailwind v4 supports `print:` variant natively — no configuration needed.

**Color preservation:** The existing utilization colors use `text-green-600 dark:text-green-400` etc. The `print-color-adjust: exact` property forces browsers to print background colors and text colors exactly. Without this, browsers strip colors by default in print preview. Confidence: HIGH (MDN verified).

### Pattern 3: As-Is Reference Column (REPT-01)

**What:** Prepend a fixed "As-Is" column to `ComparisonTable` with current-cluster metrics.
**When to use:** Always visible in Step 3; data sourced from `useClusterStore`.

**ComparisonTable already calls `useClusterStore`** — confirmed in `ComparisonTable.test.tsx` line 8, the store is imported and used in `beforeEach` setup. However, looking at the actual `ComparisonTable.tsx`, the store is NOT currently read there — only `useScenariosStore` and `useScenariosResults` are used. `useClusterStore` must be added.

**As-Is column values to compute:**

```typescript
// Derived from OldCluster fields
const asIs = {
  serverCount: cluster.existingServerCount ?? '—',
  serverConfig: (cluster.socketsPerServer && cluster.coresPerSocket)
    ? `${cluster.socketsPerServer}s × ${cluster.coresPerSocket}c`
    : '—',
  totalPcores: cluster.totalPcores,  // always present (required field)
  vcpuToPCoreRatio: cluster.totalPcores > 0
    ? (cluster.totalVcpus / cluster.totalPcores).toFixed(1)
    : '—',
}
```

**Table structure change:** The header row gains a new `<TableHead>` after the "Metric" column but before the first scenario column. Each data row gains a new `<TableCell>` at the same position.

**Anti-pattern:** Do NOT add As-Is data to `ScenarioResult` type — that type is for computed results, not source data. Read directly from `useClusterStore` in `ComparisonTable`.

### Pattern 4: Unconditional existingServerCount + Auto-derive totalPcores (REPT-02)

**What:** Move `existingServerCount` field out of the SPECint guard in `CurrentClusterForm.tsx`; add reactive logic to auto-derive `totalPcores` from `existingServerCount × socketsPerServer × coresPerSocket`.

**Current code (to change):**

```typescript
// In CurrentClusterForm.tsx (lines 181-191):
{sizingMode === 'specint' && (
  <section>
    ...
    <NumericFormField ... name="existingServerCount" ... />
    <NumericFormField ... name="specintPerServer" ... />
  </section>
)}
```

**After change:**

- `existingServerCount` moves to the "Existing Server Config" section (always visible, optional)
- `specintPerServer` stays in the SPECint-only section
- Auto-derive `totalPcores` when `existingServerCount`, `socketsPerServer`, and `coresPerSocket` are all numeric and > 0

**Auto-derive approach (using existing `form.watch()` pattern):**

```typescript
// In CurrentClusterForm's useEffect or via form.watch subscription:
const watched = form.watch()
useEffect(() => {
  const { existingServerCount, socketsPerServer, coresPerSocket, totalPcores } = watched
  // Auto-derive only if user hasn't manually entered totalPcores
  if (existingServerCount && socketsPerServer && coresPerSocket) {
    const derived = existingServerCount * socketsPerServer * coresPerSocket
    // Only set if current totalPcores value is 0 or matches a previous auto-derive
    // Use a ref to track if totalPcores was last set by auto-derive
    form.setValue('totalPcores', derived, { shouldValidate: true })
  }
}, [watched, form])
```

**Key consideration:** Auto-derive must not override an explicitly entered `totalPcores`. Use a `useRef` boolean flag `isPcoresUserSet` that is set `true` when the `totalPcores` field fires an `onChange` event directly, and `false` when reset. Auto-derive only fires when the flag is `false`.

**Alternative simpler approach:** Display the derived value as a read-only preview alongside the `totalPcores` input (not replacing it). The user can see the derived number but still enter an override. This avoids the override-detection complexity. Given the `## Claude's Discretion` intent in REPT-02 ("auto-derived when... all provided"), the simplest safe implementation is to set `totalPcores` automatically when derived and the current value is 0 (default).

### Anti-Patterns to Avoid

- **Storing OldCluster-derived As-Is values in ScenarioResult:** The result type is for computed output, not source metrics. Read current cluster data directly from store.
- **Using `JSON.stringify(state)` (full Zustand state dump):** Export only the domain data (`OldCluster`, `Scenario[]`, `ScenarioResult[]`). Internal Zustand store methods and IDs should not leak into the export file.
- **`@media print` in a separate CSS file:** Adding to `index.css` is consistent with existing project patterns and the `@media (prefers-color-scheme: dark)` block already there.
- **Removing wizard chrome from the DOM in print:** Use CSS `display:none` / `print:hidden`, never conditional rendering based on a print state — there is no reliable `useIsPrinting()` hook in the browser.
- **Auto-deriving `totalPcores` when user has already entered it:** Use a guard condition (value is 0, or use `isDirty` from react-hook-form).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization | Custom serializer | `JSON.stringify(payload, null, 2)` | Built-in, handles all numeric types without truncation |
| File download trigger | XHR or fetch | `Blob + URL.createObjectURL + anchor.click()` | Already proven in `downloadCsv`; works in all target browsers |
| Print detection | `window.matchMedia('print')` state | `@media print` CSS rules | CSS is more reliable; JS-based detection is unreliable for "Save as PDF" |
| Color-in-print | Inline styles | `print-color-adjust: exact` | Standard CSS property; MDN documented |
| totalPcores derivation | Separate calculation module | Inline `useEffect` computation | Simple multiplication; doesn't warrant a new function in `formulas.ts` |

---

## Common Pitfalls

### Pitfall 1: Browser Strips Colors in Print Preview

**What goes wrong:** `text-green-600` / `text-amber-600` / `text-red-600` classes render as black text in print preview, destroying the utilization color coding.
**Why it happens:** Browsers default to "Simplified" print mode which strips background colors and some text colors to save ink.
**How to avoid:** Add `print-color-adjust: exact; -webkit-print-color-adjust: exact` to the print CSS block (on `*` or the table element). The `-webkit-` prefix is required for Safari/Chrome.
**Warning signs:** Print preview shows all utilization cells as black text.

### Pitfall 2: `overflow-x-auto` Wrapper Clips Print

**What goes wrong:** The `ComparisonTable` is wrapped in `<div className="overflow-x-auto rounded-md border">`. In print mode this clips the table, causing the rightmost scenario columns to be cut off.
**Why it happens:** `overflow: auto` applies even in print, and the print viewport is narrower than the screen.
**How to avoid:** Add `@media print { .overflow-x-auto { overflow: visible !important; } }` to the print block.
**Warning signs:** Rightmost columns in print preview are invisible or scrollable.

### Pitfall 3: JSON `undefined` Fields Are Dropped

**What goes wrong:** `OldCluster` has many optional fields typed as `number | undefined`. When `JSON.stringify` encounters `undefined`, it silently omits the key. The resulting JSON is missing optional fields entirely rather than showing `null`.
**Why it happens:** `JSON.stringify` spec: `undefined` values in objects are omitted.
**How to avoid:** In `buildJsonContent`, explicitly replace `undefined` with `null` for optional numeric fields, or use a replacer function: `JSON.stringify(payload, (k, v) => v === undefined ? null : v, 2)`.
**Warning signs:** Downloaded JSON file lacks `existingServerCount`, `cpuUtilizationPercent`, etc. even when not entered.

### Pitfall 4: `totalPcores` Auto-Derive Creates Infinite useEffect Loop

**What goes wrong:** `form.setValue('totalPcores', derived)` triggers a re-render which causes `watched` to update which triggers the `useEffect` again.
**Why it happens:** `form.watch()` returns a new object on every call; `watched` as a dependency causes continuous re-firing.
**How to avoid:** The existing project decision (STATE.md, Phase 02-input-forms P02): "form.watch(callback) subscription (not useEffect+watched-dep) to avoid infinite Zustand setState loop in ScenarioCard". Apply the same pattern here — use `form.watch((data, { name }) => { if (name && ['existingServerCount', 'socketsPerServer', 'coresPerSocket'].includes(name)) { ... } })` callback form to react only when the relevant fields change.
**Warning signs:** Browser console shows "Maximum update depth exceeded" or high CPU usage when typing.

### Pitfall 5: As-Is Column Breaks Existing Tests

**What goes wrong:** Adding a leading column to `ComparisonTable` shifts the column count, breaking tests that assert `columnheader` count or column positions.
**Why it happens:** Tests in `ComparisonTable.test.tsx` use `screen.getAllByRole('columnheader')` and positional selectors.
**How to avoid:** Update existing tests when adding the As-Is column. The test already uses `toBeGreaterThanOrEqual(1)` for column count, which is safe. But test setup uses `useClusterStore.setState(...)` — the As-Is column data will render, so tests should set `currentCluster` with meaningful values.
**Warning signs:** `ComparisonTable.test.tsx` fails with `Expected 2 columns, got 3`.

### Pitfall 6: Print CSS Overrides Dark Mode in Screen View

**What goes wrong:** Placing CSS rules outside `@media print` accidentally overrides the dark-mode styles globally.
**Why it happens:** CSS specificity; rules added to `index.css` without media query scope apply to all contexts.
**How to avoid:** All print rules must be inside a single `@media print { }` block. Test both light and dark mode screen rendering after adding print CSS.

---

## Code Examples

Verified patterns from existing codebase:

### Existing downloadCsv Pattern (to replicate for JSON)

```typescript
// src/lib/utils/export.ts — downloadCsv (lines 98-108)
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
// JSON equivalent: type = 'application/json;charset=utf-8;'
```

### Existing form.watch() Callback Pattern (safe, no infinite loop)

```typescript
// Pattern from STATE.md decision [Phase 02-input-forms P02]:
// "form.watch(callback) subscription (not useEffect+watched-dep)"
form.watch((data, { name }) => {
  if (name && ['existingServerCount', 'socketsPerServer', 'coresPerSocket'].includes(name)) {
    const { existingServerCount, socketsPerServer, coresPerSocket } = data
    if (existingServerCount && socketsPerServer && coresPerSocket) {
      const derived = existingServerCount * socketsPerServer * coresPerSocket
      const currentPcores = form.getValues('totalPcores')
      if (!currentPcores || currentPcores === 0) {
        form.setValue('totalPcores', derived, { shouldValidate: true })
      }
    }
  }
})
```

### ComparisonTable Column Extension Pattern

```typescript
// In ComparisonTable.tsx — add useClusterStore read:
const currentCluster = useClusterStore((state) => state.currentCluster)

// In <TableHeader>:
<TableHead className="font-semibold text-center bg-muted/30">As-Is</TableHead>
{scenarios.map((scenario) => (
  <TableHead ...>{scenario.name}</TableHead>
))}

// In each <TableRow>, add leading cell before scenario cells:
// Row 1: Servers Required
<TableCell className="text-center">
  {currentCluster.existingServerCount ?? '—'}
</TableCell>
{results.map((result, i) => <TableCell ...>{result.finalCount}</TableCell>)}
```

### Print CSS (Tailwind v4 compatible)

```css
/* Add to src/index.css */
@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #root {
    max-width: 100%;
    border: none;
    width: 100%;
  }
  .overflow-x-auto {
    overflow: visible !important;
  }
  /* Elements with print:hidden in JSX need no CSS rule */
  /* Tailwind v4 print: variant compiles to @media print { display:none } natively */
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `color-adjust: exact` | `print-color-adjust: exact` | CSS 2022 | Old property still works but new is spec-compliant |
| Manual `data:` URI download | `Blob + URL.createObjectURL` | ~2015 | Used by existing `downloadCsv` — maintain this pattern |
| `window.print()` listener for print detection | `@media print` CSS | Always | CSS approach is more reliable |

**Deprecated/outdated:**

- `color-adjust: exact` (without `print-`): Still works but unprefixed `print-color-adjust: exact` is now spec. Use both for safety.

---

## Open Questions

1. **Auto-derive totalPcores: override behavior when user has set a manual value**
   - What we know: `form.getValues('totalPcores')` can detect current value; `form.formState.dirtyFields` can detect if user has touched the field
   - What's unclear: Should auto-derive fire after user clears `totalPcores` back to 0?
   - Recommendation: Auto-derive only when `totalPcores` is 0 (default). If user entered a non-zero value, respect it. Simple and predictable.

2. **JSON field ordering / schema documentation**
   - What we know: `JSON.stringify` preserves object key insertion order
   - What's unclear: Should the JSON file document the schema version for future compatibility?
   - Recommendation: Add `"schemaVersion": "1.1"` as a top-level field in the JSON payload. Adds no complexity and aids future import features (IMPORT-01, IMPORT-02 in v1.2).

3. **As-Is column: what to show for rows where no As-Is value exists**
   - What we know: Utilization rows (CPU util, RAM util, Disk util) are per-scenario results — no As-Is equivalent
   - What's unclear: Should the As-Is cell for utilization rows show the observed `cpuUtilizationPercent` from OldCluster?
   - Recommendation: Show `cluster.cpuUtilizationPercent` for CPU util row, `cluster.ramUtilizationPercent` for RAM util row, and `—` for disk util row (no disk utilization input exists). REPT-01 requirement lists four specific fields; stay within scope.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `rtk vitest run` |
| Full suite command | `rtk vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPO-03 | `buildJsonContent` returns valid pretty-printed JSON with all inputs + outputs | unit | `rtk vitest run src/lib/utils/__tests__/export.test.ts` | ❌ Wave 0 |
| EXPO-03 | `downloadJson` calls `URL.createObjectURL` with a Blob of type `application/json` | unit | `rtk vitest run src/lib/utils/__tests__/export.test.ts` | ❌ Wave 0 |
| EXPO-03 | JSON output contains no `undefined` values (optional fields → `null`) | unit | `rtk vitest run src/lib/utils/__tests__/export.test.ts` | ❌ Wave 0 |
| EXPO-04 | `@media print` block hides `.print-hidden` elements | manual/visual | n/a — print CSS not automatable in jsdom | manual only |
| EXPO-04 | `print-color-adjust: exact` is present in index.css | unit (string check) | `rtk vitest run src/__tests__/printCss.test.ts` | ❌ Wave 0 |
| REPT-01 | ComparisonTable renders "As-Is" column header | component | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` | ✅ (file exists, add tests) |
| REPT-01 | As-Is column shows `existingServerCount` from OldCluster | component | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` | ✅ (file exists, add tests) |
| REPT-01 | As-Is column shows `—` when `existingServerCount` is undefined | component | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` | ✅ (file exists, add tests) |
| REPT-02 | `existingServerCount` field renders when `sizingMode === 'vcpu'` | component | `rtk vitest run src/components/step1/__tests__/CurrentClusterForm.test.tsx` | ✅ (file exists, add tests) |
| REPT-02 | `totalPcores` is auto-derived when count + sockets + cores are all provided | component | `rtk vitest run src/components/step1/__tests__/CurrentClusterForm.test.tsx` | ✅ (file exists, add tests) |

### Sampling Rate

- **Per task commit:** `rtk vitest run`
- **Per wave merge:** `rtk vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/utils/__tests__/export.test.ts` — add EXPO-03 test stubs (`it.todo`) to existing file (covers EXPO-03)
- [ ] `src/__tests__/printCss.test.ts` — new file, checks `index.css` string for `print-color-adjust` (covers EXPO-04 automatable portion)
- [ ] `src/components/step3/__tests__/ComparisonTable.test.tsx` — add REPT-01 `it.todo` stubs to existing describe blocks
- [ ] `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — add REPT-02 `it.todo` stubs to existing describe blocks

---

## Sources

### Primary (HIGH confidence)

- MDN Web Docs: `print-color-adjust` — <https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust>
- MDN Web Docs: `@media print` — <https://developer.mozilla.org/en-US/docs/Web/CSS/@media>
- MDN Web Docs: `URL.createObjectURL` — <https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL>
- MDN Web Docs: `JSON.stringify` undefined behavior — <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description>
- Existing codebase: `src/lib/utils/export.ts` — `downloadCsv` pattern (confirmed working, 222 tests pass)
- Existing codebase: `src/components/step1/CurrentClusterForm.tsx` — `form.watch()` callback pattern
- Tailwind v4 docs (verified via project usage): `print:` variant supported natively

### Secondary (MEDIUM confidence)

- Tailwind CSS v4 print variant — inferred from project's Tailwind v4 usage; `print:hidden` class compiles to `@media print { display: none }`

### Tertiary (LOW confidence)

- None — all findings are verified from codebase inspection or official MDN docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — All libraries already installed, no new deps needed
- Architecture: HIGH — Four discrete, well-bounded changes; patterns verified from existing code
- Pitfalls: HIGH — Based on direct inspection of existing CSS, form patterns, and test structure
- JSON download: HIGH — Identical pattern to existing `downloadCsv`
- Print CSS: HIGH — MDN-verified properties; Tailwind v4 print: variant confirmed

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable domain — CSS @media print and Blob download APIs are not fast-moving)
