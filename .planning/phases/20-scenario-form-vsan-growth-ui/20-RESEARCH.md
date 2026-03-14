# Phase 20: Scenario Form — vSAN & Growth UI - Research

**Researched:** 2026-03-14
**Domain:** React form UI (react-hook-form + Zod + Zustand) — adding collapsible form sections to an existing ScenarioCard
**Confidence:** HIGH

---

## Summary

Phase 20 is a pure UI task. The backend math (vSAN formulas, growth factors) is entirely complete in Phases 18-19. All Scenario interface fields (`vsanFttPolicy`, `vsanCompressionFactor`, `vsanSlackPercent`, `vsanCpuOverheadPercent`, `vsanMemoryPerHostGb`, `vsanVmSwapEnabled`, `cpuGrowthPercent`, `memoryGrowthPercent`, `storageGrowthPercent`) are already defined in `src/types/cluster.ts`. The `computeScenarioResult` function in `constraints.ts` already reads all these fields. The only work is:

1. Extend `scenarioSchema` (Zod) to accept and validate the new optional fields.
2. Add a collapsible "vSAN & Growth" section to `ScenarioCard.tsx` using local `useState` for open/closed state.
3. Wire form fields to the existing `form.watch` → `updateScenario` reactive loop already in place.

No new store actions, no new hooks, no new calculation logic — the existing architecture already handles everything when the fields are present.

**Primary recommendation:** Use a local `useState(false)` open/close toggle in `ScenarioCard` (no Radix Collapsible needed) and a `<select>` / native `<select>` for FTT policy and compression factor dropdowns, keeping the component within the ≤150-line limit by extracting a `VsanGrowthSection` sub-component.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FORM-01 | ScenarioCard includes a collapsible "vSAN & Growth" section (collapsed by default) | Local `useState(false)` open/close; chevron icon from lucide-react |
| FORM-02 | vSAN section contains: FTT policy dropdown, Compression factor dropdown, Slack space %, vSAN CPU overhead %, vSAN memory per host GB, VM swap toggle | All types/constants already exist in `vsanConstants.ts`; `FTT_POLICY_MAP` + `COMPRESSION_FACTOR_LABELS` provide labels; Switch component available at `src/components/ui/switch.tsx` |
| FORM-03 | Growth section contains: CPU Growth %, Memory Growth %, Storage Growth % | Plain numeric Input fields; same `optionalPositiveNumber`-style Zod preprocess |
| FORM-04 | vSAN section only visible when `layoutMode === 'hci'` (hidden in disaggregated mode) | `layoutMode` already read from `useWizardStore` in `ScenarioCard`; same conditional pattern as `diskPerServerGb` field |
</phase_requirements>

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.71.2 | Form state + validation | Already drives ScenarioCard; `form.watch` reactive loop is the live-update mechanism |
| zod | ^4.3.6 | Schema validation | `scenarioSchema` in `src/schemas/scenarioSchema.ts` already defines all form fields |
| @hookform/resolvers | ^5.2.2 | Zod adapter | Already wired via `zodResolver` in ScenarioCard |
| zustand | ^5.0.11 | Global state | `updateScenario` already called on every valid form change |
| lucide-react | ^0.577.0 | Icons | `ChevronDown`/`ChevronUp` for collapsible toggle; `Info` already used |

### UI Primitives (already in project)

| Component | File | Use in Phase 20 |
|-----------|------|-----------------|
| `Input` | `src/components/ui/input.tsx` | Slack %, CPU overhead %, memory GB, growth % inputs |
| `Switch` | `src/components/ui/switch.tsx` | VM swap toggle (base-ui Switch primitive) |
| `Label` | `src/components/ui/label.tsx` | Field labels for Switch |
| `Button` | `src/components/ui/button.tsx` | Collapsible toggle header button |
| `Separator` | `src/components/ui/separator.tsx` | Visual separation from existing sections |

### No New Dependencies Required

All needed primitives exist. A native `<select>` element (styled with Tailwind) is sufficient for FTT policy and compression dropdowns, since no `Select` shadcn component exists in the project's `src/components/ui/`. Alternatively, a thin custom select wrapper using a native `<select>` with consistent Tailwind classes matches the existing input aesthetic.

**Installation:** None required.

---

## Architecture Patterns

### Pattern 1: Collapsible Section via Local useState

**What:** A `<button>` header with a chevron icon toggles a `boolean` state. The section content renders conditionally.

**When to use:** When collapse state is local to one card instance, does not need to survive rerenders of siblings, and no external control is needed.

**Why not Radix Collapsible:** The project has no `@radix-ui/react-collapsible` installed. Base-UI (`@base-ui/react`) does not expose a Collapsible primitive in the currently used version. Adding a dependency for a toggle that `useState` handles in 5 lines is over-engineering.

```tsx
// Pattern used in ScenarioCard for the new section
const [vsanOpen, setVsanOpen] = useState(false)

<div className="border-t pt-4">
  <button
    type="button"
    onClick={() => setVsanOpen((o) => !o)}
    className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-0"
    aria-expanded={vsanOpen}
  >
    vSAN &amp; Growth
    <ChevronDown className={cn('h-4 w-4 transition-transform', vsanOpen && 'rotate-180')} />
  </button>
  {vsanOpen && (
    <div className="mt-3 space-y-4">
      {/* vSAN sub-section — HCI only */}
      {layoutMode === 'hci' && ( ... )}
      {/* Growth sub-section — always visible */}
      ...
    </div>
  )}
</div>
```

### Pattern 2: Reactive Form → Store Update (existing, unchanged)

The existing `form.watch` subscription in `ScenarioCard` already handles all fields:

```tsx
// Already in ScenarioCard.tsx — no change needed
useEffect(() => {
  const subscription = form.watch((values) => {
    const result = scenarioSchema.safeParse(values)
    if (result.success) {
      updateScenarioRef.current(scenarioIdRef.current, result.data as Partial<Scenario>)
    }
  })
  return () => subscription.unsubscribe()
}, [form])
```

Adding new fields to `scenarioSchema` and including them in the form automatically routes through this loop. No additional wiring needed.

### Pattern 3: Native Select for FTT Policy and Compression

**What:** A `<select>` element styled with the same border/rounded/bg classes as `<Input>`.

**Why:** No shadcn `Select` component exists in `src/components/ui/`. The `FTT_POLICY_MAP` and `COMPRESSION_FACTOR_LABELS` objects already provide all option values and labels. Using `<Controller>` from react-hook-form wraps the native select cleanly.

```tsx
// Source: src/lib/sizing/vsanConstants.ts — FTT_POLICY_MAP already exports these labels
import { FTT_POLICY_MAP, COMPRESSION_FACTOR_LABELS } from '@/lib/sizing/vsanConstants'
import type { VsanFttPolicy, VsanCompressionFactor } from '@/lib/sizing/vsanConstants'

<Controller
  control={form.control}
  name="vsanFttPolicy"
  render={({ field }) => (
    <FormItem>
      <FormLabel>FTT Policy</FormLabel>
      <FormControl>
        <select
          {...field}
          value={field.value ?? ''}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">None (legacy sizing)</option>
          {(Object.keys(FTT_POLICY_MAP) as VsanFttPolicy[]).map((key) => (
            <option key={key} value={key}>{FTT_POLICY_MAP[key].label}</option>
          ))}
        </select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Pattern 4: Switch for VM Swap Toggle

**What:** Use the existing `Switch` component (base-ui primitive) with a `Label`. Wire via `Controller`.

```tsx
// src/components/ui/switch.tsx — base-ui Switch with data-checked/data-unchecked
<Controller
  control={form.control}
  name="vsanVmSwapEnabled"
  render={({ field }) => (
    <div className="flex items-center gap-2">
      <Switch
        id={`${scenarioId}-vmswap`}
        checked={field.value ?? false}
        onCheckedChange={field.onChange}
      />
      <Label htmlFor={`${scenarioId}-vmswap`}>Enable VM Swap on vSAN</Label>
    </div>
  )}
/>
```

Note: `Switch` from base-ui uses `onCheckedChange` (not `onChange`). The existing `switch.tsx` wraps `SwitchPrimitive.Root` from `@base-ui/react/switch`.

### Pattern 5: Sub-component Extraction to Stay Within 150-Line Limit

`ScenarioCard.tsx` is already 499 lines. Adding ~80 more lines inline would push it further. Extract to a co-located sub-component:

```
src/components/step2/
  ScenarioCard.tsx           # existing, import VsanGrowthSection
  VsanGrowthSection.tsx      # new: collapsible section (vSAN + growth fields)
```

`VsanGrowthSection` receives:
- `form: UseFormReturn<ScenarioInput>` — for `FormField` / `Controller`
- `scenarioId: string` — for input IDs
- `layoutMode: LayoutMode` — for HCI vs disaggregated conditional
- `open: boolean` + `onToggle: () => void` — controlled by ScenarioCard's `useState`

### Recommended Project Structure Changes

```
src/components/step2/
  ScenarioCard.tsx            # modified: import + render VsanGrowthSection
  VsanGrowthSection.tsx       # new: collapsible vSAN & Growth fields
  __tests__/
    ScenarioCard.test.tsx     # existing; add FORM-01..04 tests
```

### Anti-Patterns to Avoid

- **Inline all 80+ lines in ScenarioCard:** Violates ≤150-line single-responsibility principle. Extract to sub-component.
- **Re-implementing the store update:** Do NOT add a separate `onChange` handler that calls `updateScenario` directly. The existing `form.watch` subscription handles all fields automatically once they are in the schema.
- **Using `z.coerce.number()`:** The project uses `z.preprocess(numericPreprocess, ...)` throughout `scenarioSchema`. Consistency required — see existing `optionalPositiveNumber` definition.
- **Registering vSAN fields only when visible:** All optional fields must be registered in the schema unconditionally. Hidden fields are unregistered from the form DOM but still in the schema as optional, which is correct.
- **Adding vSAN fields to the schema as required:** They must be optional (`z.optional()`) per the VSAN-12 decision (absent = legacy path).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FTT policy option list | Hardcoded option strings in JSX | `FTT_POLICY_MAP` from `vsanConstants.ts` | Already the source of truth for labels, multipliers, min-nodes |
| Compression option list | Hardcoded option strings in JSX | `COMPRESSION_FACTOR_LABELS` from `vsanConstants.ts` | Type-safe, already enumerated |
| Default placeholder values | Magic numbers in component | `VSAN_DEFAULT_SLACK_PERCENT`, `VSAN_DEFAULT_CPU_OVERHEAD_PCT`, `VSAN_DEFAULT_MEMORY_PER_HOST_GB` | Already re-exported from `defaults.ts` for this exact purpose (comment: "for Phase 20 form use") |
| Live update wiring | Additional `onChange` → `updateScenario` calls | Existing `form.watch` subscription | Already handles any schema-registered field |
| Collapsible primitive | Radix Collapsible install | `useState` + conditional render | 5 lines vs new dependency |

**Key insight:** The Scenario type, all vSAN constants/types, and the entire calculation pipeline are ready. Phase 20 is purely additive to the form schema and JSX.

---

## Common Pitfalls

### Pitfall 1: Zod Schema Missing New Fields

**What goes wrong:** New fields render in the form but `scenarioSchema.safeParse` drops them because they are not in the schema. The `form.watch` → `updateScenario` path then never writes them to the store. Server count never changes when vSAN fields are edited.

**Why it happens:** `scenarioSchema` is the gatekeeper. Fields not in the schema are silently stripped by `safeParse`.

**How to avoid:** Add all 9 new optional fields to `scenarioSchema` before adding the form inputs. Test schema first with unit tests.

**Warning signs:** Editing a vSAN field has no effect on `ScenarioResults`. `useScenariosStore.getState().scenarios[0].vsanFttPolicy` remains `undefined` after form edit.

### Pitfall 2: Switch onCheckedChange vs onChange

**What goes wrong:** Using `onChange` directly on the base-ui `Switch` throws a type error or produces `undefined` values. The Switch fires `onCheckedChange: (checked: boolean) => void`, not a standard DOM event.

**Why it happens:** base-ui Switch does not emit a native DOM change event; it fires a checked-state boolean.

**How to avoid:** Use `Controller` and map `field.onChange` to `onCheckedChange`. See Pattern 4 above.

### Pitfall 3: vsanFttPolicy is Optional — "None" Selection

**What goes wrong:** When user selects "None" (legacy path), the field value should become `undefined` in the store, not the empty string `""`. If the schema coerces `""` to a valid string, the vSAN path is erroneously triggered.

**Why it happens:** `<select>` emits `""` for an empty `<option value="">` selection. The Zod schema must handle `""` → `undefined`.

**How to avoid:** In the schema, use `z.preprocess((v) => (v === '' ? undefined : v), z.enum([...]).optional())` for `vsanFttPolicy`. Same for `vsanCompressionFactor`.

### Pitfall 4: VsanCompressionFactor is a Numeric Union, Not a String

**What goes wrong:** `VsanCompressionFactor` is typed as `1.0 | 1.3 | 1.5 | 2.0 | 3.0` (numbers). A `<select>` emits strings. The schema must convert the string to a number.

**Why it happens:** HTML select values are always strings; the Zod schema must use `numericPreprocess` before validating against the numeric union.

**How to avoid:** `z.preprocess(numericPreprocess, z.union([z.literal(1.0), z.literal(1.3), z.literal(1.5), z.literal(2.0), z.literal(3.0)]).optional())`.

### Pitfall 5: ScenarioCard Line Count Explosion

**What goes wrong:** Adding 80+ lines inline makes the component exceed 150-line limit and becomes hard to test.

**Why it happens:** The component already has conditional sections for GHz mode, SPECint mode, advanced fields — another conditional block makes it unwieldy.

**How to avoid:** Extract `VsanGrowthSection.tsx` as a separate component. Keep `ScenarioCard` as the orchestrator.

### Pitfall 6: Form defaultValues Missing New Fields

**What goes wrong:** The `useForm` `defaultValues` is set to `scenario as ScenarioInput`. If `ScenarioInput` now includes the new optional fields (from schema update) but the existing `Scenario` object (created by `createDefaultScenario`) does not include them, react-hook-form may treat them as uncontrolled → controlled transitions.

**Why it happens:** `createDefaultScenario` returns an object without the new optional fields. react-hook-form is fine with `undefined` for optional fields in `defaultValues`, but the schema must correctly type them as optional.

**How to avoid:** `createDefaultScenario` does NOT need updating (optional fields default to `undefined`, which is correct). The `ScenarioInput` type will automatically include the new optional fields once added to `scenarioSchema`. No form init changes required.

---

## Code Examples

### scenarioSchema Extension (Zod)

```typescript
// src/schemas/scenarioSchema.ts — additions
import {
  DEFAULT_VCPU_TO_PCORE_RATIO,
  DEFAULT_HEADROOM_PERCENT,
  DEFAULT_HA_RESERVE_COUNT,
  DEFAULT_TARGET_CPU_UTILIZATION_PERCENT,
  DEFAULT_TARGET_RAM_UTILIZATION_PERCENT,
  VSAN_DEFAULT_SLACK_PERCENT,
  VSAN_DEFAULT_CPU_OVERHEAD_PCT,
  VSAN_DEFAULT_MEMORY_PER_HOST_GB,
} from '../lib/sizing/defaults';

// Numeric string → VsanFttPolicy (empty string → undefined for "None" option)
const vsanFttPolicyField = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.enum(['mirror-1', 'mirror-2', 'mirror-3', 'raid5', 'raid6']).optional(),
);

// Numeric string → VsanCompressionFactor
const vsanCompressionFactorField = z.preprocess(
  numericPreprocess,
  z.union([
    z.literal(1.0), z.literal(1.3), z.literal(1.5), z.literal(2.0), z.literal(3.0),
  ]).optional(),
);

// In scenarioSchema z.object({...}), add:
vsanFttPolicy: vsanFttPolicyField,
vsanCompressionFactor: vsanCompressionFactorField,
vsanSlackPercent: z.preprocess(numericPreprocess, z.number().min(0).max(100).optional())
  .default(VSAN_DEFAULT_SLACK_PERCENT),
vsanCpuOverheadPercent: z.preprocess(numericPreprocess, z.number().min(0).max(100).optional())
  .default(VSAN_DEFAULT_CPU_OVERHEAD_PCT),
vsanMemoryPerHostGb: z.preprocess(numericPreprocess, z.number().min(0).optional())
  .default(VSAN_DEFAULT_MEMORY_PER_HOST_GB),
vsanVmSwapEnabled: z.boolean().optional().default(false),
cpuGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
memoryGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
storageGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
```

### VsanGrowthSection Component Skeleton

```tsx
// src/components/step2/VsanGrowthSection.tsx
import { Controller, type UseFormReturn } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FTT_POLICY_MAP, COMPRESSION_FACTOR_LABELS } from '@/lib/sizing/vsanConstants'
import type { VsanFttPolicy, VsanCompressionFactor } from '@/lib/sizing/vsanConstants'
import type { ScenarioInput } from '@/schemas/scenarioSchema'
import type { LayoutMode } from '@/store/useWizardStore'

interface VsanGrowthSectionProps {
  form: UseFormReturn<ScenarioInput>
  scenarioId: string
  layoutMode: LayoutMode
  open: boolean
  onToggle: () => void
}

export function VsanGrowthSection({ form, scenarioId, layoutMode, open, onToggle }: VsanGrowthSectionProps) {
  return (
    <div className="border-t pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wide"
        aria-expanded={open}
        aria-controls={`${scenarioId}-vsan-growth`}
      >
        vSAN &amp; Growth
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={`${scenarioId}-vsan-growth`} className="mt-3 space-y-4">
          {/* vSAN sub-section — HCI only (FORM-04) */}
          {layoutMode === 'hci' && (
            <section>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                vSAN Storage
              </h5>
              {/* FTT policy, compression, slack %, cpu overhead %, memory/host, vm swap */}
            </section>
          )}

          {/* Growth sub-section — always visible (FORM-03) */}
          <section>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Growth Projections
            </h5>
            <div className="grid grid-cols-3 gap-4">
              {/* cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent */}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
```

### Integrating VsanGrowthSection into ScenarioCard

```tsx
// In ScenarioCard.tsx — add near top of component body:
const [vsanGrowthOpen, setVsanGrowthOpen] = useState(false)

// In the JSX, at the end of <CardContent>, after the existing Advanced section:
<VsanGrowthSection
  form={form}
  scenarioId={scenarioId}
  layoutMode={layoutMode}
  open={vsanGrowthOpen}
  onToggle={() => setVsanGrowthOpen((o) => !o)}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod 3.x `z.coerce.number()` | `z.preprocess(numericPreprocess, z.number())` | Phase 1-4 | Empty string emits ZodError (no silent 0); established pattern must be followed |
| Inline conditional renders | Sub-component extraction | Phase 1+ | Components ≤150 lines; single responsibility per file |
| Radix UI primitives | base-ui/react primitives | v1.3 (Phase 11) | Switch uses `@base-ui/react/switch`, not `@radix-ui/react-switch` |

**Deprecated/outdated:**
- `@radix-ui/react-*` packages: The project migrated to `@base-ui/react` during branding/tech-debt phase. No Radix primitives are in `package.json`. Do not install Radix components.

---

## Open Questions

1. **`vsanSlackPercent`, `vsanCpuOverheadPercent`, `vsanMemoryPerHostGb` — default in schema vs absent in store**
   - What we know: `defaults.ts` re-exports `VSAN_DEFAULT_SLACK_PERCENT=25`, `VSAN_DEFAULT_CPU_OVERHEAD_PCT=10`, `VSAN_DEFAULT_MEMORY_PER_HOST_GB=6` specifically "for Phase 20 form use".
   - What's unclear: Whether the schema should `.default()` these values (so the store always has a non-undefined value) or keep them optional (so absent = legacy path per VSAN-12).
   - Recommendation: Apply `.default()` only when `vsanFttPolicy` is set — but Zod cannot do conditional defaults cleanly. The simplest approach: keep them optional in the schema, and provide placeholder values in the Input fields using the exported defaults as `placeholder` attributes. `constraints.ts` already null-coalesces these (`scenario.vsanSlackPercent ?? VSAN_DEFAULT_SLACK_PERCENT`), so absent values work correctly.

2. **Whether to show default values in the inputs when vsanFttPolicy first selected**
   - What we know: Inputs are rendered always (within the open section) but are `undefined` until the user types.
   - What's unclear: Whether UX should pre-populate defaults when FTT policy is first chosen.
   - Recommendation: Use `placeholder` to show defaults. Pre-population is a nice-to-have but not required by FORM-02.

---

## Sources

### Primary (HIGH confidence)

- Source inspection of `src/types/cluster.ts` — confirms all 9 fields on Scenario interface
- Source inspection of `src/lib/sizing/vsanConstants.ts` — confirms `FTT_POLICY_MAP`, `COMPRESSION_FACTOR_LABELS`, all defaults
- Source inspection of `src/lib/sizing/defaults.ts` — confirms re-export of vSAN defaults for Phase 20
- Source inspection of `src/lib/sizing/constraints.ts` — confirms `computeScenarioResult` already consumes all vSAN/growth fields
- Source inspection of `src/schemas/scenarioSchema.ts` — confirms `numericPreprocess` pattern, `optionalPositiveNumber` helper
- Source inspection of `src/components/step2/ScenarioCard.tsx` — confirms `form.watch` reactive loop, `layoutMode` read from store, existing conditional renders
- Source inspection of `src/components/ui/switch.tsx` — confirms base-ui Switch API (`onCheckedChange`, not `onChange`)
- Source inspection of `package.json` — confirms `@base-ui/react` not `@radix-ui`, no existing Select component

### Secondary (MEDIUM confidence)

- Zod v4 docs pattern: `z.preprocess` with `z.enum()` for string-typed union validated against finite set
- react-hook-form v7 `Controller` pattern for non-standard inputs (Switch, native select)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; no new deps needed
- Architecture: HIGH — patterns observed directly from existing ScenarioCard code
- Pitfalls: HIGH — identified from schema + type inspection, not speculation

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable stack)
