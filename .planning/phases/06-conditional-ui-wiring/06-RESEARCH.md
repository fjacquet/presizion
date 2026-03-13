# Phase 6: Conditional UI Wiring - Research

**Researched:** 2026-03-13
**Domain:** React conditional rendering, react-hook-form conditional validation, Zustand selector patterns
**Confidence:** HIGH

## Summary

Phase 6 wires the SPECint and utilization fields — already present in the Zod schemas and formula engine (Phase 5) — into the existing React components. The schema fields `specintPerServer` (OldCluster), `targetSpecint` (Scenario), `cpuUtilizationPercent`, and `ramUtilizationPercent` exist but are not yet rendered in the form UI. The `sizingMode` toggle lives in `useWizardStore` and `setSizingMode` is already implemented. The core engineering challenge is conditional validation: when `sizingMode === 'specint'`, `specintPerServer` and `targetSpecint` must block the "Next" navigation if empty.

The project uses react-hook-form v7 with zodResolver for form validation, Zustand v5 for global state, and Tailwind v4 for styling. All of these are stable and well-understood from prior phases. The key pattern is reading `sizingMode` from `useWizardStore` inside the form components to toggle both field visibility and validation trigger targets. Conditional rendering uses a simple `{sizingMode === 'specint' && <field />}` pattern; conditional validation extends the existing `handleNext` trigger list.

**Primary recommendation:** Add a `SizingModeToggle` component consumed by `WizardShell` (or the header area), read `sizingMode` from `useWizardStore` in `CurrentClusterForm` and `ScenarioCard`, conditionally render the new fields, and extend `handleNext` / Step 2 "Next" guard to include SPECint fields when mode is active.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-02 | In SPECint mode, Step 1 shows an additional field: SPECint benchmark score for the existing server model | Schema already has `specintPerServer: optionalPositiveNumber` in `currentClusterSchema`; field just needs conditional rendering and conditional required-validation trigger |
| PERF-03 | In SPECint mode, each scenario shows an additional field: SPECint benchmark score for the target server model | Schema already has `targetSpecint: optionalPositiveNumber` in `scenarioSchema`; same conditional rendering pattern as PERF-02 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.71.2 | Form state, validation, watch | Already used in all forms; `form.trigger()` enables imperative conditional validation |
| zod | ^4.3.6 | Schema validation | Already used; schemas already have all new fields |
| zustand | ^5.0.11 | Global sizing mode state | `useWizardStore` already owns `sizingMode` + `setSizingMode` |
| tailwindcss | ^4.2.1 | Conditional class rendering | `hidden`/`block` or JSX `&&` for field visibility |
| vitest | ^4.1.0 | Test framework | Already configured; 205 tests passing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | ^16.3.2 | Component tests | All conditional-rendering tests |
| lucide-react | ^0.577.0 | Info icons on new fields | Already used in TOOLTIPS pattern in CurrentClusterForm |
| shadcn Switch | installed | Toggle UI for mode selection | Already used for haReserveEnabled in ScenarioCard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `sizingMode === 'specint' && <field>` | CSS `display:none` | JSX conditional is cleaner and avoids validating hidden fields with zodResolver |
| `form.trigger(['specintPerServer'])` in handleNext | `z.superRefine` | Imperative trigger matches existing pattern in handleNext; superRefine would require schema restructure |
| Mode toggle in WizardShell header | Floating button / separate settings page | Header placement is most discoverable; matches PERF-01 intent of global mode |

## Architecture Patterns

### Recommended Project Structure

No new files required for the toggle logic. Changes are additive within existing components:

```
src/
  components/
    wizard/
      SizingModeToggle.tsx    # NEW: vCPU / SPECint toggle buttons
    step1/
      CurrentClusterForm.tsx  # MODIFIED: add SPECint + utilization fields, conditional render
    step2/
      ScenarioCard.tsx        # MODIFIED: add targetSpecint field, conditional render
      ScenarioResults.tsx     # MODIFIED: add SPECint formula row when mode active
    step3/
      ComparisonTable.tsx     # ALREADY WORKS: limitingResource already handles 'specint'
    wizard/
      WizardShell.tsx         # MODIFIED: render SizingModeToggle in header
```

### Pattern 1: Reading sizingMode in Form Components

**What:** Components that need to show/hide fields read `sizingMode` from `useWizardStore` via a selector.
**When to use:** Any component that conditionally renders based on global mode.

```typescript
// Source: existing pattern in useScenariosResults.ts
const sizingMode = useWizardStore((s) => s.sizingMode)
// Then in JSX:
{sizingMode === 'specint' && (
  <NumericFormField
    control={form.control}
    name="specintPerServer"
    label="SPECint/Server (existing)"
    testId="input-specintPerServer"
    optional
  />
)}
```

**Confidence:** HIGH — identical to how `useScenariosResults` already reads `sizingMode`.

### Pattern 2: Conditional Validation Trigger in handleNext

**What:** `handleNext` in `CurrentClusterForm` currently triggers `['totalVcpus', 'totalPcores', 'totalVms']`. When SPECint mode is active, `specintPerServer` must also be validated.
**When to use:** Any step-advance guard that has mode-dependent required fields.

```typescript
// Source: existing handleNext pattern in CurrentClusterForm.tsx
async function handleNext() {
  const alwaysRequired: Array<keyof CurrentClusterInput> = ['totalVcpus', 'totalPcores', 'totalVms']
  const modeRequired: Array<keyof CurrentClusterInput> =
    sizingMode === 'specint' ? ['specintPerServer'] : []
  const isValid = await form.trigger([...alwaysRequired, ...modeRequired])
  if (isValid) onNext()
}
```

**Note:** `specintPerServer` is declared `optionalPositiveNumber` in the schema. This is intentional — when mode is `vcpu`, an empty value is fine. When mode is `specint`, `form.trigger(['specintPerServer'])` will call the validator which allows `undefined`. To block navigation, the check must be: trigger passes AND value is defined. Alternatively, add a `.refine()` at schema level or simply check `form.getValues('specintPerServer') !== undefined` after trigger. The simplest approach: after trigger, check the form value is truthy.

**Confidence:** HIGH — `form.trigger()` is documented react-hook-form API for imperative validation.

### Pattern 3: SizingModeToggle Component

**What:** A small UI component rendering two buttons (vCPU / SPECint) that calls `setSizingMode` from `useWizardStore`.
**When to use:** Placed in WizardShell header so it is visible on all 3 steps.

```typescript
// Pattern — uses same shadcn Button pattern already in the codebase
import { useWizardStore } from '@/store/useWizardStore'
import type { SizingMode } from '@/store/useWizardStore'

export function SizingModeToggle() {
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const setSizingMode = useWizardStore((s) => s.setSizingMode)

  return (
    <div className="flex gap-1 text-sm" role="group" aria-label="Sizing mode">
      <button
        type="button"
        onClick={() => setSizingMode('vcpu')}
        aria-pressed={sizingMode === 'vcpu'}
        className={sizingMode === 'vcpu' ? 'font-semibold underline' : 'text-muted-foreground'}
      >
        vCPU
      </button>
      <span>/</span>
      <button
        type="button"
        onClick={() => setSizingMode('specint')}
        aria-pressed={sizingMode === 'specint'}
        className={sizingMode === 'specint' ? 'font-semibold underline' : 'text-muted-foreground'}
      >
        SPECint
      </button>
    </div>
  )
}
```

**Confidence:** HIGH — straightforward Zustand write + aria-pressed pattern.

### Pattern 4: SPECint Formula Row in ScenarioResults

**What:** When `sizingMode === 'specint'`, ScenarioResults should show the `specintFormulaString` and the `cpuLimitedCount` as the SPECint-limited count.
**When to use:** Already prepared — `RESOURCE_LABELS` in `ScenarioResults.tsx` already maps `specint` to `'SPECint-limited'`. The formula function `specintFormulaString` is exported from `display.ts`.

```typescript
// Source: src/lib/sizing/display.ts — already exports specintFormulaString
import { specintFormulaString } from '@/lib/sizing/display'

// In ScenarioResults render — conditional SPECint formula row
{sizingMode === 'specint' && currentCluster.existingServerCount && currentCluster.specintPerServer && scenario.targetSpecint && (
  <div>
    <span className="text-muted-foreground">SPECint-limited: </span>
    <span className="font-medium tabular-nums">{result.cpuLimitedCount}</span>
    <div className="text-xs text-muted-foreground font-mono mt-0.5">
      {specintFormulaString({
        existingServers: currentCluster.existingServerCount,
        specintPerServer: currentCluster.specintPerServer,
        headroomPercent: scenario.headroomPercent,
        targetSpecint: scenario.targetSpecint,
      })}
    </div>
  </div>
)}
```

**Confidence:** HIGH — `specintFormulaString` and `SpecintFormulaParams` are already exported from `display.ts`.

### Pattern 5: Utilization Fields in CurrentClusterForm

**What:** `cpuUtilizationPercent` and `ramUtilizationPercent` are in the schema as `optionalPercent`. They should be rendered unconditionally (UTIL-01 and UTIL-02 are already complete per REQUIREMENTS.md) but the form currently does not render them. Rendering them makes results update live (UTIL-03 already implemented in formula engine).

**Note from requirements:** UTIL-01, UTIL-02, UTIL-03 are marked `[x]` complete. But the UI is not yet showing these fields — Phase 5 added the formula engine side. Phase 6 success criterion 4 confirms these fields must appear in Step 1.

```typescript
// In CurrentClusterForm — new "Utilization" section
<section>
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
    Current Utilization (optional)
  </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <NumericFormField
      control={form.control}
      name="cpuUtilizationPercent"
      label="CPU Utilization %"
      testId="input-cpuUtilizationPercent"
      optional
    />
    <NumericFormField
      control={form.control}
      name="ramUtilizationPercent"
      label="RAM Utilization %"
      testId="input-ramUtilizationPercent"
      optional
    />
  </div>
</section>
```

**Confidence:** HIGH — schema fields exist, TOOLTIPS record in CurrentClusterForm already has entries for both (`cpuUtilizationPercent` and `ramUtilizationPercent`), live update already works via `form.watch()` → `setCurrentCluster` → `useScenariosResults` derive-on-read chain.

### Anti-Patterns to Avoid

- **Storing sizingMode in component local state:** Mode is global and must persist across steps. Always read from `useWizardStore`.
- **Making specintPerServer required in the Zod schema:** The field must remain `optionalPositiveNumber` so vCPU mode works without it. Gate on `sizingMode` in `handleNext`.
- **Calling `form.trigger()` on SPECint fields when in vCPU mode:** Triggering validation on empty optional fields in vCPU mode will produce no error (schema allows undefined), but it creates unnecessary re-renders. Only trigger when `sizingMode === 'specint'`.
- **Rendering SPECint fields with `display:none`:** Fields hidden via CSS are still registered with react-hook-form and their values appear in `form.getValues()`. Use JSX conditional (`&&`) to unmount them, which removes the field from form state.
- **Forgetting `existingServerCount` is also needed for SPECint formula:** `specintFormulaString` needs `existingServers`, which comes from `currentCluster.existingServerCount`. This field is already in the schema and form but currently not rendered. It should be rendered (or at minimum checked for existence) when SPECint mode is active.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle UI | Custom CSS radio button group | shadcn Button with `aria-pressed` or two standard `<button>` elements | Existing pattern in codebase; no new component needed |
| Conditional required validation | Custom validator logic | `form.trigger()` + value check in `handleNext` | RHF's trigger is the documented imperative validation API |
| Mode-dependent formula display | Custom string builder | `specintFormulaString` from `display.ts` | Already implemented in Phase 5 with full test coverage |
| SPECint result label | Custom label map | `RESOURCE_LABELS['specint']` already in `ScenarioResults.tsx` | Already returns `'SPECint-limited'` |

## Common Pitfalls

### Pitfall 1: ComparisonTable `capitalize()` mis-formats 'specint'

**What goes wrong:** `ComparisonTable.tsx` uses `capitalize(result.limitingResource)` which would render "Specint" not "SPECint".
**Why it happens:** `capitalize()` only uppercases the first character.
**How to avoid:** Replace `capitalize(result.limitingResource)` with a `RESOURCE_LABELS` lookup (same map as `ScenarioResults`) or add a special case for `'specint'` → `'SPECint'`.
**Warning signs:** ComparisonTable test shows "Specint" in the limiting resource column.

### Pitfall 2: Form default values don't include new fields

**What goes wrong:** `CurrentClusterForm` `defaultValues` object does not include `specintPerServer`, `cpuUtilizationPercent`, or `ramUtilizationPercent`. RHF will treat them as uncontrolled if not in `defaultValues`.
**Why it happens:** `defaultValues` was set when schema was simpler.
**How to avoid:** Add `specintPerServer: undefined, cpuUtilizationPercent: undefined, ramUtilizationPercent: undefined` to the `defaultValues` object in `useForm`.

### Pitfall 3: Utilization fields sync to Zustand only when form isValid

**What goes wrong:** `CurrentClusterForm` only syncs to store when `form.formState.isValid`. Optional utilization fields don't affect `isValid` (the form can be valid without them), but if a user enters a value then clears it, the store keeps the old value.
**Why it happens:** The current sync is: `if (form.formState.isValid) setCurrentCluster(form.getValues() as OldCluster)`.
**How to avoid:** This is acceptable — utilization fields are optional, and clearing them sets the value to `undefined` in the next valid sync. Verify behavior with tests; the schema's `optionalPercent` returns `undefined` for empty strings, so the store value will be `undefined` on next valid sync.

### Pitfall 4: ScenarioCard targetSpecint field not watched by useScenariosResults

**What goes wrong:** ScenarioCard already subscribes to `form.watch()` and calls `updateScenario` via `scenarioSchema.safeParse`. The `targetSpecint` field is in `scenarioSchema` as `optionalPositiveNumber`. If the value is a valid positive number, safeParse will succeed and the store will be updated. If `targetSpecint` is typed then cleared, the store will retain the old value until the next valid parse.
**Why it happens:** `form.watch()` fires on every change; `safeParse` only updates store on success.
**How to avoid:** Test that clearing `targetSpecint` back to empty does not cause formula engine to use stale data. Since `targetSpecint` defaults to `undefined` in the store (via `createDefaultScenario` which doesn't set it), and `computeScenarioResult` uses `scenario.targetSpecint ?? 0`, the formula defaults to 0 (produces 0 servers) when no value is set — acceptable behavior.

### Pitfall 5: SPECint field validation blocks Step 2 Next button

**What goes wrong:** Step 2 does not have a "Next" guard in `ScenarioCard` — it uses WizardShell's `nextStep` button directly. Unlike Step 1 (which has `handleNext` in `CurrentClusterForm`), Step 2 navigation is a plain `onClick={nextStep}`. If PERF-03 requires blocking advance when `targetSpecint` is empty in SPECint mode, the guard must be in `Step2Scenarios` (or `WizardShell` for the Step 2 Next button), not in `ScenarioCard`.
**How to avoid:** Implement the Step 2 validation guard in `Step2Scenarios` using `useScenariosStore` + `useWizardStore` to check all scenarios have `targetSpecint` when mode is `specint`. Pass an `onNext` prop to `Step2Scenarios` similar to `CurrentClusterForm`.

## Code Examples

Verified patterns from existing codebase:

### Reading sizingMode in a component

```typescript
// Source: src/hooks/useScenariosResults.ts (existing pattern)
import { useWizardStore } from '@/store/useWizardStore'
const sizingMode = useWizardStore((state) => state.sizingMode)
```

### Imperative form trigger (existing pattern in CurrentClusterForm)

```typescript
// Source: src/components/step1/CurrentClusterForm.tsx
async function handleNext() {
  const isValid = await form.trigger(['totalVcpus', 'totalPcores', 'totalVms'])
  if (isValid) onNext()
}
```

### Zustand write action (existing pattern)

```typescript
// Source: src/store/useWizardStore.ts
setSizingMode: (mode) => set({ sizingMode: mode }),
```

### specintFormulaString (Phase 5 output, already available)

```typescript
// Source: src/lib/sizing/display.ts
export function specintFormulaString(params: SpecintFormulaParams): string {
  const { existingServers, specintPerServer, headroomPercent, targetSpecint } = params
  const headroomFactor = (1 + headroomPercent / 100).toFixed(2)
  return `ceil(${existingServers} servers × ${specintPerServer} SPECint × ${headroomFactor} / ${targetSpecint} SPECint)`
}
```

### RESOURCE_LABELS map (existing in ScenarioResults, already handles 'specint')

```typescript
// Source: src/components/step2/ScenarioResults.tsx
const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU-limited',
  ram: 'RAM-limited',
  disk: 'Disk-limited',
  specint: 'SPECint-limited',
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All fields always visible | Conditional rendering via `sizingMode` selector | Phase 6 | Users only see relevant fields |
| vCPU-only formula display | Mode-conditional formula row in ScenarioResults | Phase 6 | SPECint formula visible when active |
| No utilization inputs in UI | CPU/RAM util % fields in Step 1 (optional) | Phase 6 | Live right-sizing feedback |

**Deprecated/outdated:**

- `capitalize(result.limitingResource)` in ComparisonTable: unsafe for 'specint'; should use RESOURCE_LABELS lookup

## Open Questions

1. **Where exactly is the mode toggle placed?**
   - What we know: PERF-01 says "visible and accessible in the wizard"; WizardShell header is the natural location
   - What's unclear: Whether it appears on all 3 steps or only Step 1
   - Recommendation: Place in WizardShell header (always visible); planner can choose Step 1 only if desired

2. **Does switching mode to vCPU clear SPECint field values?**
   - What we know: Zustand store retains values; switching mode hides fields but doesn't reset them
   - What's unclear: Whether stored SPECint values should be wiped on mode switch
   - Recommendation: Do NOT clear values on mode switch — user may be toggling back and forth to compare; retaining values is less surprising

3. **existingServerCount field visibility**
   - What we know: `existingServerCount` is optional in the schema and form, already in TOOLTIPS, but not currently rendered in CurrentClusterForm. It is needed for SPECint formula (`specintFormulaString` requires `existingServers`)
   - What's unclear: Should `existingServerCount` be rendered only in SPECint mode (alongside `specintPerServer`) or always?
   - Recommendation: Render `existingServerCount` conditionally with `specintPerServer` in SPECint mode, since it is only relevant to SPECint calculations. This keeps Step 1 uncluttered in vCPU mode.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `rtk vitest run` |
| Full suite command | `rtk vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-02 | SPECint field appears in Step 1 when mode is 'specint' | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| PERF-02 | SPECint field hidden in Step 1 when mode is 'vcpu' | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| PERF-02 | Next blocked when SPECint mode active + specintPerServer empty | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| PERF-03 | targetSpecint field appears in ScenarioCard when mode is 'specint' | unit (component) | `rtk vitest run src/components/step2/__tests__/` | ✅ (extend existing) |
| PERF-03 | targetSpecint field hidden when mode is 'vcpu' | unit (component) | `rtk vitest run src/components/step2/__tests__/` | ✅ (extend existing) |
| PERF-03 (SC-3) | ScenarioResults shows 'SPECint-limited' badge when specint is bottleneck | unit (component) | `rtk vitest run src/components/step2/__tests__/` | ✅ (extend existing) |
| PERF-03 (SC-3) | ComparisonTable shows 'SPECint' (not 'Specint') in limiting resource row | unit (component) | `rtk vitest run src/components/step3/__tests__/` | ❌ Wave 0 |
| SC-4 | CPU utilization % field renders in Step 1 | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| SC-4 | Entering CPU util % updates ScenarioResults live | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| SC-4 | RAM utilization % field renders in Step 1 | unit (component) | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend existing) |
| PERF-02 | Mode toggle visible and accessible | unit (component) | `rtk vitest run src/components/wizard/__tests__/` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `rtk vitest run`
- **Per wave merge:** `rtk vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/wizard/__tests__/SizingModeToggle.test.tsx` — covers mode toggle visibility, aria-pressed state, setSizingMode calls
- [ ] `src/components/step3/__tests__/ComparisonTable.test.tsx` — covers 'SPECint' label in limiting resource row when specint mode active

*(Existing test files for CurrentClusterForm, ScenarioCard, and ScenarioResults will be extended in-place — no new files needed for those.)*

## Sources

### Primary (HIGH confidence)

- Direct code reading: `src/store/useWizardStore.ts` — `SizingMode` type, `sizingMode` state, `setSizingMode` action
- Direct code reading: `src/schemas/currentClusterSchema.ts` — `specintPerServer`, `cpuUtilizationPercent`, `ramUtilizationPercent` already present
- Direct code reading: `src/schemas/scenarioSchema.ts` — `targetSpecint` already present as `optionalPositiveNumber`
- Direct code reading: `src/lib/sizing/display.ts` — `specintFormulaString` and `SpecintFormulaParams` exported
- Direct code reading: `src/components/step2/ScenarioResults.tsx` — `RESOURCE_LABELS` already maps `'specint'` to `'SPECint-limited'`
- Direct code reading: `src/components/step1/CurrentClusterForm.tsx` — `TOOLTIPS` already has entries for all new fields
- Direct code reading: `src/hooks/useScenariosResults.ts` — already reads `sizingMode` from `useWizardStore`
- Vitest run: 205 tests passing, 0 failures — safe baseline to extend

### Secondary (MEDIUM confidence)

- react-hook-form v7 docs: `form.trigger(fields)` is the standard imperative validation API for partial field triggering
- Zustand v5 docs: selector pattern `useStore((s) => s.field)` is stable and idiomatic

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and in active use; no new dependencies
- Architecture: HIGH — all schema fields, formula functions, and store actions already exist; work is additive UI wiring
- Pitfalls: HIGH — identified from direct code inspection of existing component patterns

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack; Zustand/RHF APIs are stable)
