# Phase 3 Research: Comparison, Export, and Wizard Shell

**Phase requirements:** COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05

---

## 1. Comparison Table (COMP-01, COMP-02, UX-04)

### Decision: Plain shadcn Table primitives — NOT @tanstack/react-table

The comparison view is a **transposed, static table** (metrics = rows, scenarios = columns). TanStack Table adds sorting, filtering, and pagination — all unnecessary for this use case. Use shadcn Table primitives directly:

```bash
npx shadcn@latest add table
```

Imports: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` from `@/components/ui/table`.

### Table orientation

Scenarios as **columns**, metrics as **rows**. This makes side-by-side comparison natural when the user adds 2–4 scenarios.

```
| Metric            | Scenario A | Scenario B |
|-------------------|-----------|-----------|
| Servers required  | 24        | 18        |
| Limiting resource | CPU       | RAM       |
| CPU util %        | 85%       | 60%       |
```

### UX-04: Color coding

Use a pure function that maps utilization to a Tailwind className:

```typescript
export function utilizationClass(pct: number): string {
  if (pct >= 90) return 'text-red-600 font-semibold'
  if (pct >= 70) return 'text-amber-600'
  return 'text-green-600'
}
```

Apply to CPU/RAM/disk utilization cells only. Badge for limitingResource can use the same thresholds if desired, but a simple text label is sufficient.

### Component location

`src/components/step3/ComparisonTable.tsx` — consumes `useScenariosResults()` and `useClusterStore()` directly (no props for data).

---

## 2. Step 2 → Step 3 Navigation (missing from Phase 2)

Phase 2's WizardShell has no "Next" button for Step 2. Step 2 has no validation guard (all scenario fields are pre-filled with defaults and the schema has defaults), so WizardShell can own this button directly.

**Fix:** Add a generic "Next" button in WizardShell for `currentStep === 2`:

```tsx
{currentStep === 2 && (
  <div className="mt-8 pt-4 border-t flex justify-between">
    <Button variant="outline" onClick={prevStep}>Back</Button>
    <Button onClick={nextStep}>Next: Review & Export</Button>
  </div>
)}
```

This modifies `src/components/wizard/WizardShell.tsx` only — no changes to Step2Scenarios.

---

## 3. Clipboard Export (EXPO-01)

### API

```typescript
await navigator.clipboard.writeText(text)
```

- Returns `Promise<void>`; only available on HTTPS or localhost
- jsdom does NOT provide `navigator.clipboard` — must mock in tests

### Plain-text summary format

```
CLUSTER REFRESH SIZING REPORT
==============================
Current Cluster
  Total vCPUs: 2000
  Total pCores: 500
  Total VMs: 300

Scenario: Enterprise 2-socket
  Sockets/Server: 2 | Cores/Socket: 48 | RAM/Server: 1024 GB
  vCPU:pCore Ratio: 4 | Headroom: 20% | N+1 HA: Off

  Results:
    CPU-limited:  24 servers
    RAM-limited:  19 servers
    Disk-limited: 12 servers
    → Required:   24 servers (CPU-limited)
    CPU util: 85% | RAM util: 60% | Disk util: 35%
```

### Location

`src/lib/utils/clipboard.ts` — pure function `buildSummaryText(cluster, scenarios, results): string` + `copyToClipboard(text): Promise<void>`.

### Test mock

```typescript
// In test setup
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
  })
})
```

---

## 4. CSV Export (EXPO-02)

### RFC 4180 compliance

- Fields containing commas, double-quotes, or newlines MUST be wrapped in double-quotes
- Double-quotes inside a quoted field are escaped by doubling: `"` → `""`
- First row is a header row

```typescript
function csvEscape(value: string | number | boolean): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
```

### Client-side download pattern

```typescript
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

### CSV structure

One header row + one data row per scenario:

```
Metric,Scenario A,Scenario B
Servers Required,24,18
Limiting Resource,cpu,ram
...
```

OR: one row per scenario with all columns (easier to import into spreadsheet). Use the row-per-scenario layout:

```
Name,Sockets/Server,Cores/Socket,...,CPU-limited,RAM-limited,Disk-limited,Final,Limiting Resource,CPU util %,...
```

### Location

`src/lib/utils/export.ts` — `buildCsvContent(cluster, scenarios, results): string` + `downloadCsv()`.

### Test mock

```typescript
beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockReturnValue('blob:mock'),
    revokeObjectURL: vi.fn()
  })
})
```

For anchor click: spy on `document.createElement` and capture the created element, or simply verify `URL.createObjectURL` was called.

---

## 5. beforeunload Guard (UX-05)

### Modern browser behavior

The browser shows its own generic "Leave site?" dialog — you cannot customize the message. The handler MUST:

1. Call `event.preventDefault()` (Chrome/Firefox)
2. Set `event.returnValue = ''` (legacy browsers including some Safari versions)

```typescript
const handler = (e: BeforeUnloadEvent) => {
  e.preventDefault()
  e.returnValue = ''
}
```

### Dirty detection

A user has "entered data" when either:

- `useClusterStore`: `totalVcpus > 0 || totalPcores > 0 || totalVms > 0`
- `useScenariosStore`: any scenario has been modified from its defaults (name changed, or any field differs from `createDefaultScenario()`)

Simple approximation: register the listener as soon as `currentStep > 1` (they must have submitted Step 1 to get there).

### React hook

Create `src/hooks/useBeforeUnload.ts`:

```typescript
import { useEffect } from 'react'

export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled])
}
```

Wire into `WizardShell` with `enabled={currentStep > 1}`.

### Test approach

jsdom does not fire `beforeunload` on navigation, so test the listener registration:

```typescript
const addEventSpy = vi.spyOn(window, 'addEventListener')
// ... render WizardShell with step > 1
expect(addEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
```

---

## 6. Step3ReviewExport Component Architecture

### Structure

```
src/components/step3/
  Step3ReviewExport.tsx      — container: ComparisonTable + export buttons
  ComparisonTable.tsx        — the data table
  __tests__/
    Step3ReviewExport.test.tsx
```

### Export buttons

```tsx
<div className="flex gap-3">
  <Button variant="outline" onClick={handleCopy}>
    <Copy className="h-4 w-4 mr-2" /> Copy Summary
  </Button>
  <Button variant="outline" onClick={handleDownloadCsv}>
    <Download className="h-4 w-4 mr-2" /> Download CSV
  </Button>
</div>
```

Wire `WizardShell` to render `<Step3ReviewExport />` when `currentStep === 3`.

---

## 7. Plan Wave Structure

### Wave 0 — 03-01 (no dependencies)

Install `table` shadcn component. Create Nyquist Wave 0 test stubs for all 6 Phase 3 requirements.

### Wave 1 — 03-02 and 03-03 (parallel, both depend on 03-01)

**03-02:** `src/lib/utils/clipboard.ts`, `src/lib/utils/export.ts`, `src/components/step3/ComparisonTable.tsx`, `src/components/step3/Step3ReviewExport.tsx` — satisfies COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04.

**03-03:** `src/hooks/useBeforeUnload.ts`, update `src/components/wizard/WizardShell.tsx` (Step 2 Next button + Step 3 routing + beforeunload) — satisfies UX-05 + completes wizard navigation.

---

## Validation Architecture

### Test framework

- Vitest ^4 + jsdom + @testing-library/react
- Command: `npm test` (all tests) or `npm test -- src/components/step3` (scoped)

### Auto-testable requirements

| Requirement | Test approach |
|-------------|---------------|
| COMP-01 | Render Step3ReviewExport; assert all metric row labels and scenario columns render |
| COMP-02 | Render with known data; assert correct server count values in cells |
| EXPO-01 | Mock `navigator.clipboard.writeText`; click Copy; assert it was called with non-empty string |
| EXPO-02 | Mock `URL.createObjectURL`; click Download CSV; assert `createObjectURL` called with Blob |
| UX-04 | Set utilization to known values; check className on cells matches green/amber/red |
| UX-05 | Spy on `window.addEventListener`; render WizardShell at step > 1; assert `beforeunload` registered |

### Manual verification only

- **EXPO-01 text accuracy**: Exact clipboard text format is best validated by human eye — assert `writeText` is called but not exact string content
- **EXPO-02 file download**: jsdom cannot open file picker — verify `URL.createObjectURL` was called and anchor click occurred; actual file content verified in utility unit test
- **UX-05 browser prompt**: jsdom doesn't show browser dialogs — verify listener registered only

### Nyquist sampling

- After each task: `npm test -- [scoped path]` — must exit 0
- After all Wave 1 plans: `npm test` + `npx tsc --noEmit` + `npm run build`
