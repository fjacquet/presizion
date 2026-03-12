# Phase 2: Input Forms - Research

**Researched:** 2026-03-12
**Domain:** React Hook Form v7 + Zod v4 + shadcn/ui v4 + Tailwind CSS v4 on Vite 8
**Confidence:** HIGH (stack patterns), MEDIUM (Vite 8 + Tailwind workaround)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INPUT-01 | User can enter average VM configuration (vCPUs/VM, RAM GB/VM, disk GB/VM) | `currentClusterSchema` already has these fields; RHF `register()` + shadcn Input components handle capture |
| INPUT-02 | User can enter cluster totals (total vCPUs, pCores, VMs, disk GB) | Same schema; required fields already validated with `z.preprocess` |
| INPUT-03 | User can enter existing server config (sockets, cores/socket, RAM/server, optional count) | Optional fields in `currentClusterSchema`; no server count field exists yet — add `serverCount?: number` |
| INPUT-04 | App auto-calculates and displays derived metrics: vCPU:pCore ratio, cores/server, VMs/server by CPU and RAM | `useScenariosResults` + `computeScenarioResult` already derive these; `DerivedMetricsPanel` must read from store and display live; no new math required |
| INPUT-05 | All numeric inputs validate non-negative with inline errors; user cannot advance without valid required fields | `currentClusterSchema` + `scenarioSchema` ready; `form.trigger(fieldNames)` before `nextStep()` blocks navigation |
| SCEN-01 | User can define any number of target scenarios | `useScenariosStore.addScenario()` already exists; UI needs "Add Scenario" button wired to it |
| SCEN-02 | Each scenario includes server config with auto-calculated total cores | All fields in `Scenario` type; `socketsPerServer × coresPerSocket` displayed as derived metric per card |
| SCEN-03 | Each scenario's sizing assumptions include vCPU:pCore ratio, RAM/VM, disk/VM, headroom %, N+1 toggle | All in `scenarioSchema`; haReserveEnabled is a boolean Switch, headroomPercent is a constrained number |
| SCEN-04 | Sizing assumptions pre-filled with editable industry defaults | `createDefaultScenario()` in `defaults.ts` provides all defaults; RHF `defaultValues` reads from store |
| SCEN-05 | User can duplicate a scenario | `useScenariosStore.duplicateScenario(id)` already exists; UI needs "Duplicate" button per card |
| UX-01 | 3-step wizard: Step 1 → Step 2 → Step 3 | `useWizardStore` exists; `WizardShell` + `StepIndicator` components needed |
| UX-02 | Navigation blocked until current step inputs are valid | `form.trigger(stepFields)` pattern; `formState.isValid` used to disable/enable Next button |
| UX-03 | Key fields display inline tooltips/info icons | shadcn `Tooltip` component wrapping an info icon (lucide `Info`); tooltip content as constants |
</phase_requirements>

---

## Summary

Phase 2 builds on a complete Phase 1 foundation: all types, schemas, stores, the sizing library, and the `useScenariosResults` hook are ready and unit-tested. The task is entirely UI assembly — wiring React Hook Form to the existing Zod schemas, writing values to the existing Zustand stores, and rendering results from the existing hooks. No new math or state logic is needed.

The integration pipeline is: user types in a shadcn `Input` → RHF validates on blur using `zodResolver(currentClusterSchema)` → on valid input, `useEffect` watching form values writes to `useClusterStore.setCurrentCluster()` → `useScenariosResults()` derives results automatically → `DerivedMetricsPanel` and `ScenarioResults` re-render. The `<200ms` recalculation budget is trivially met because the entire pipeline is synchronous in-process arithmetic on n ≤ 10 scenarios.

The one infrastructure gap is the UI dependency stack: Tailwind CSS v4, shadcn/ui v4, `react-hook-form` v7, and `@hookform/resolvers` v5 are not yet installed. There is also a compatibility issue: `@tailwindcss/vite` v4.2.1 declares peer deps `vite: ^5.2.0 || ^6 || ^7` — it does not officially support Vite 8 (which is what the project currently runs). The recommended workaround is to install `@tailwindcss/postcss` instead of `@tailwindcss/vite` and configure it via Vite's `css.postcss` option.

**Primary recommendation:** Install the UI stack using `@tailwindcss/postcss` (not `@tailwindcss/vite`) to remain compatible with Vite 8. Initialize shadcn/ui with `npx shadcn@latest init`, then add the 7 required components. Wire RHF + Zod + Zustand following the two-mode pattern: `mode: 'onBlur'` for Zod error display, `useEffect` on watched values to write valid data to the store.

---

## Standard Stack

### Core (all must be installed — none are present in package.json yet)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.71.2 | Form state, uncontrolled inputs, validation trigger | Uncontrolled inputs prevent per-keystroke full re-renders; integrates with shadcn Form primitive |
| @hookform/resolvers | 5.2.2 | Connects Zod schemas to RHF | v5.1.0+ supports both Zod v3 and v4 with automatic runtime detection |
| tailwindcss | 4.2.1 | Utility-first CSS | Required by shadcn/ui v4; CSS-first config (no tailwind.config.js) |
| @tailwindcss/postcss | 4.2.1 | Tailwind as PostCSS plugin | **Required for Vite 8** — `@tailwindcss/vite` does not declare Vite 8 in peerDeps |
| shadcn/ui (via CLI) | latest | Copy-owned accessible components | ARIA-compliant, Tailwind v4 ready, React 19 compatible, all components updated |
| tw-animate-css | latest | Animation utilities | Replaces `tailwindcss-animate` for Tailwind v4 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.0 | Icon set | Info icons for UX-03 tooltips; already shadcn dependency |
| class-variance-authority | 0.7.1 | Component variant management | Installed by shadcn init; used internally by components |
| clsx + tailwind-merge | latest | Conditional class merging | shadcn `cn()` utility; used in all component class calculations |

### Tailwind v4 + Vite 8 Compatibility

**CRITICAL:** `@tailwindcss/vite@4.2.1` peer deps are `vite: '^5.2.0 || ^6 || ^7'`. The project uses Vite 8. Use PostCSS approach:

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

Then configure in `vite.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react()],
})
```

### Form Stack Installation

```bash
# UI dependencies
npm install -D tailwindcss @tailwindcss/postcss postcss tw-animate-css

# Form validation
npm install react-hook-form @hookform/resolvers

# Initialize shadcn/ui (interactive — sets up components.json, CSS vars, path aliases)
npx shadcn@latest init

# Add required components
npx shadcn@latest add form input label button card tabs tooltip switch badge separator
```

### Path Alias (required by shadcn)

`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`vite.config.ts` must include:
```typescript
import path from 'path'
resolve: { aliases: { '@': path.resolve(__dirname, './src') } }
```

---

## Architecture Patterns

### Component Structure for Phase 2

```
src/
├── components/
│   ├── ui/                     # shadcn copy-owned components (do NOT edit)
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   ├── switch.tsx
│   │   └── ...
│   ├── wizard/
│   │   ├── WizardShell.tsx     # Step routing shell — reads useWizardStore
│   │   └── StepIndicator.tsx   # Visual 1-2-3 progress indicator
│   ├── step1/
│   │   ├── Step1CurrentCluster.tsx      # Container: form + derived panel
│   │   ├── CurrentClusterForm.tsx       # RHF form wired to currentClusterSchema
│   │   └── DerivedMetricsPanel.tsx      # Read-only display of useScenariosResults derived fields
│   └── step2/
│       ├── Step2Scenarios.tsx           # Container: list of ScenarioCards + Add button
│       ├── ScenarioCard.tsx             # Per-scenario: RHF form wired to scenarioSchema
│       └── ScenarioResults.tsx          # Per-scenario: live server count display from useScenariosResults
├── hooks/
│   ├── useScenariosResults.ts  # EXISTING — Phase 1 output
│   └── useWizardNavigation.ts  # NEW — wraps useWizardStore + form.trigger() guard
├── store/                      # EXISTING — all three slices from Phase 1
├── schemas/                    # EXISTING — currentClusterSchema, scenarioSchema
└── lib/                        # EXISTING — sizing, display
```

### Pattern 1: RHF + Zod + Zustand Two-Mode Pipeline

**What:** Use `mode: 'onBlur'` for Zod error display (so errors appear after the user leaves a field, not mid-typing) AND `useEffect` watching form values to write valid data to the Zustand store for live recalculation.

**When to use:** All form fields in Step 1 and Step 2.

```typescript
// Source: react-hook-form.com/docs/useform + zustand.docs.pmnd.rs
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { currentClusterSchema, type CurrentClusterInput } from '@/schemas/currentClusterSchema'
import { useClusterStore } from '@/store/useClusterStore'

function CurrentClusterForm() {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)

  const form = useForm<CurrentClusterInput>({
    resolver: zodResolver(currentClusterSchema),
    mode: 'onBlur',         // Show Zod errors after field blur
    defaultValues: {
      totalVcpus: 0,
      totalPcores: 0,
      totalVms: 0,
    },
  })

  // Watch all values; write to store whenever the form is valid
  const watchedValues = form.watch()
  useEffect(() => {
    if (form.formState.isValid) {
      // zodResolver has already validated — safe to write to store
      setCurrentCluster(form.getValues() as Parameters<typeof setCurrentCluster>[0])
    }
  }, [watchedValues, form.formState.isValid, setCurrentCluster])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="totalVcpus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total vCPUs</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />  {/* Auto-renders Zod error message */}
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
```

**Key constraint:** The existing `z.preprocess` (not `z.coerce.number`) in the schemas handles the empty-string-to-NaN problem. Input fields must use `type="number"` and `register()` must NOT use `valueAsNumber: true` (that conflicts with z.preprocess). Use the Controller pattern via shadcn FormField instead.

### Pattern 2: Navigation Guard with form.trigger()

**What:** Before advancing from Step 1 to Step 2, trigger validation on all required fields. Block navigation if any required field is invalid.

**When to use:** In `useWizardNavigation` hook, called from WizardShell's "Next" button handler.

```typescript
// Source: react-hook-form.com/docs/useform/trigger
// STEP 1 REQUIRED FIELDS: totalVcpus, totalPcores, totalVms
const STEP1_REQUIRED_FIELDS: (keyof CurrentClusterInput)[] = [
  'totalVcpus', 'totalPcores', 'totalVms'
]

async function handleNextStep(form: UseFormReturn<CurrentClusterInput>) {
  const isValid = await form.trigger(STEP1_REQUIRED_FIELDS)
  if (!isValid) return  // Errors are now visible inline
  useWizardStore.getState().nextStep()
}
```

**UX-02 implementation note:** The "Next" button should be enabled (not greyed out) so the user can click it and see errors. Disabling it before any interaction is worse UX — users don't know why they're blocked. Use `trigger()` on click, not `disabled={!formState.isValid}`.

### Pattern 3: Scenario Card per-scenario RHF form

**What:** Each ScenarioCard has its own RHF form instance. Changes write directly to `useScenariosStore.updateScenario(id, partial)` on every valid field change (not just on submit), enabling live recalculation.

**When to use:** Step 2 ScenarioCard components.

```typescript
// One form per scenario; defaultValues pre-populated from store
const scenario = useScenariosStore((s) => s.scenarios.find(sc => sc.id === id))
const updateScenario = useScenariosStore((s) => s.updateScenario)

const form = useForm<ScenarioInput>({
  resolver: zodResolver(scenarioSchema),
  mode: 'onBlur',
  defaultValues: scenario,  // Pre-populated with createDefaultScenario() values
})

// Write valid partial updates to store on every change
const watched = form.watch()
useEffect(() => {
  const result = scenarioSchema.safeParse(form.getValues())
  if (result.success) {
    updateScenario(id, result.data)
  }
}, [watched])
```

**SCEN-04 compliance:** `createDefaultScenario()` provides all defaults; `defaultValues: scenario` pre-populates every new scenario form from those defaults.

**SCEN-05 compliance:** "Duplicate" button calls `useScenariosStore.duplicateScenario(id)` — this already copies the entire Scenario object with a new UUID. The duplicated scenario's form is initialized from the copied values.

### Pattern 4: DerivedMetricsPanel (read-only)

**What:** A panel below Step 1 form that shows vCPU:pCore ratio, cores per server, VMs/server by CPU, VMs/server by RAM. Updates automatically via `useScenariosResults`.

**When to use:** Rendered in `Step1CurrentCluster`, always visible below the form.

```typescript
// DerivedMetricsPanel reads from the first scenario's result (or global cluster state)
// No form inputs — display only
function DerivedMetricsPanel() {
  const results = useScenariosResults()        // Array of ScenarioResult
  const cluster = useClusterStore(s => s.currentCluster)

  // Derived metrics that come from cluster alone (INPUT-04)
  const vcpuToPcoreRatio = cluster.totalPcores > 0
    ? (cluster.totalVcpus / cluster.totalPcores).toFixed(2)
    : '—'

  // Results-based metrics come from results[0] (first scenario) or are aggregated
  const firstResult = results[0]
  const vmsPerServerByCpu = firstResult ? firstResult.vmsPerServer.toFixed(1) : '—'

  return (/* display grid */)
}
```

**INPUT-04 note:** The requirement says vCPU:pCore ratio should be "user-overridable" — this means it should also appear as an input in Step 1. Add a `vcpuToPcoreRatioOverride?: number` field to `currentClusterSchema` (optional, defaults to auto-calculated). The sizing library already handles the ratio via the `targetVcpuToPCoreRatio` field on each Scenario.

### Pattern 5: Number Input with z.preprocess (CRITICAL)

**What:** The project already uses `z.preprocess` (not `z.coerce.number`) in both schemas. This is correct and must be preserved.

**The problem avoided:** HTML `<input type="number">` returns a string when the field is empty. `z.coerce.number("")` returns `0`, silently poisoning all calculations. `z.preprocess` with `numericPreprocess` returns `undefined` on empty input, triggering a ZodError instead.

**The correct pattern with shadcn FormField:**

```typescript
// Source: shadcn/ui Form docs + Phase 1 schema pattern
// Use Controller (via FormField) — NOT register() with valueAsNumber
<FormField
  control={form.control}
  name="totalVcpus"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Total vCPUs</FormLabel>
      <FormControl>
        {/* Pass string value directly — z.preprocess handles conversion */}
        <Input
          type="number"
          min={0}
          {...field}
          onChange={(e) => field.onChange(e.target.value)} // Pass raw string
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Do NOT use:** `register('totalVcpus', { valueAsNumber: true })` — this conflicts with `z.preprocess` expecting a string input.

### Pattern 6: Tooltip for UX-03

**What:** An info icon next to field labels showing what the field means and typical ranges.

```typescript
// Source: ui.shadcn.com/docs/components/radix/tooltip
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

function FieldLabelWithTooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <FormLabel className="flex items-center gap-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{tip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </FormLabel>
  )
}
```

### Anti-Patterns to Avoid

- **`z.coerce.number()` in schemas:** The project uses `z.preprocess` — do not change this; coerce silently converts empty strings to `0`.
- **`register('field', { valueAsNumber: true })`:** Conflicts with z.preprocess; use Controller/FormField pattern.
- **Storing ScenarioResult in Zustand:** Never. Results are derived on demand in `useScenariosResults`. Phase 1 decision — do not break this.
- **One shared RHF form for all scenarios:** Each ScenarioCard needs its own `useForm` instance; shared form causes field name collisions.
- **`disabled={!formState.isValid}` on Next button:** Hides errors. Use `trigger()` on click to surface errors.
- **Calling sizing lib directly in components:** All calls go through `useScenariosResults` hook. Components never import from `src/lib/sizing/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form field validation + error display | Custom validation hooks + error state | `react-hook-form` + `zodResolver` + shadcn `FormMessage` | Edge cases: async validation, touched state, partial revalidation |
| Accessible form inputs with labels | Custom label+input composition | shadcn `FormField` + `FormItem` + `FormControl` | ARIA `aria-describedby`, `aria-invalid` linkage is non-trivial |
| Info tooltips | `title` attribute or custom tooltip div | shadcn `Tooltip` + `TooltipProvider` | Keyboard accessible, properly positioned, handles viewport overflow |
| Toggle switch for boolean | Custom checkbox or div | shadcn `Switch` | ARIA `role="switch"`, keyboard support, accessible checked state |
| Tab navigation for scenarios | Custom tab state + CSS | shadcn `Tabs` + `TabsList` + `TabsContent` | ARIA `role="tablist"`, keyboard navigation (arrow keys), focus management |
| Card layout per scenario | Div + CSS | shadcn `Card` + `CardHeader` + `CardContent` | Consistent padding, border, shadow; matches shadcn design token system |
| Step indicator | CSS counter or custom component | Build a simple `StepIndicator` component | Simple enough that shadcn has no equivalent; 10–20 lines |

**Key insight:** shadcn components are copy-owned — they live in `src/components/ui/`. This means they can be customized if needed (e.g., adding `data-testid` attributes for testing) without fighting a third-party component API.

---

## Common Pitfalls

### Pitfall 1: @tailwindcss/vite Does Not Support Vite 8

**What goes wrong:** Running `npm install @tailwindcss/vite` will succeed (npm installs it), but it produces a peer dependency warning. The Vite plugin may fail at build time or produce incorrect CSS minification due to LightningCSS conflicts between Vite 8's built-in LightningCSS and Tailwind's own LightningCSS.

**Why it happens:** `@tailwindcss/vite@4.2.1` declares `peerDependencies: { vite: "^5.2.0 || ^6 || ^7" }`. Vite 8 is not in range. The underlying issue is that both Vite 8 and Tailwind v4 use LightningCSS with incompatible configuration options.

**How to avoid:** Install `@tailwindcss/postcss` instead and wire it via `vite.config.ts`'s `css.postcss.plugins` array. This is confirmed working with Vite 8.

**Warning signs:** Peer dependency warnings during `npm install`; blank or un-styled page in dev mode; CSS minification errors in `vite build`.

### Pitfall 2: shadcn init Requires Path Alias Before Running

**What goes wrong:** `npx shadcn@latest init` fails or generates broken import paths if `@` alias is not configured in `tsconfig.json` and `vite.config.ts` before running the init command.

**Why it happens:** shadcn reads `tsconfig.json` during init to determine the `@/` path resolution. If the alias is absent, components are generated with incorrect imports.

**How to avoid:** Configure both files before running `npx shadcn@latest init`:
1. `tsconfig.json`: add `"baseUrl": ".", "paths": { "@/*": ["./src/*"] }`
2. `vite.config.ts`: add `resolve: { alias: { '@': path.resolve(__dirname, './src') } }`

### Pitfall 3: useWatch Execution Order

**What goes wrong:** If you call `form.setValue()` before the `useWatch()` subscription is in place (e.g., from a parent `useEffect`), the watched value update is missed.

**Why it happens:** RHF's `useWatch` subscribes on mount. Values set before mount are not observed by the hook.

**How to avoid:** Use `form.watch()` callback variant (deprecated but still functional) or `useWatch` with `defaultValue` from the store. For the Zustand sync pattern, use `form.watch()` to get the live snapshot: `const values = form.watch(); useEffect(() => { ... }, [values])`.

### Pitfall 4: Number Input Returning String Through z.preprocess

**What goes wrong:** `<input type="number">` returns a string `""` when empty. If `onChange` is intercepted to call `Number(e.target.value)` or `parseFloat()`, the `z.preprocess` guard (which detects `""` and returns `undefined`) is bypassed, letting `NaN` into the store.

**Why it happens:** Mismatched handling between HTML input event and Zod preprocessor.

**How to avoid:** In FormField's `render`, pass `e.target.value` (the raw string) to `field.onChange`, not `e.target.valueAsNumber` or `Number(e.target.value)`. The Zod preprocessor handles the conversion.

### Pitfall 5: ScenarioCard Form Reinitializing on Scenario Duplicate

**What goes wrong:** After calling `duplicateScenario(id)`, the new ScenarioCard's RHF form initializes with stale `defaultValues` from the original scenario's form state rather than the duplicated Scenario from the store.

**Why it happens:** React may re-render the duplicate card with the same `defaultValues` reference.

**How to avoid:** The `key` prop on ScenarioCard must be the scenario `id`. React unmounts and remounts the component on key change, forcing a fresh `useForm` initialization from the new scenario's data in the store.

```typescript
{scenarios.map(scenario => (
  <ScenarioCard key={scenario.id} scenarioId={scenario.id} />
))}
```

### Pitfall 6: Hyperthreading Mislabeling (INPUT-03)

**What goes wrong:** A user copies "Logical processors" from Windows Task Manager, entering 2× the actual physical core count. This halves the calculated server count.

**Why it happens:** OS tools report logical CPUs (vThreads), not physical cores. The field label is ambiguous.

**How to avoid:** Label the field explicitly as "Physical cores per socket (NOT hyperthreaded logical CPUs)". Add a UX-03 tooltip: "Use the physical core count from the server spec sheet, not the logical processor count reported by the OS. Hyperthreading doubles the reported count." Add a defensive hint (not a blocking error): warn if `coresPerSocket > 32` (unlikely in real hardware).

---

## Code Examples

### Complete CurrentClusterForm skeleton

```typescript
// Source: react-hook-form.com docs + shadcn/ui Form component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { currentClusterSchema, type CurrentClusterInput } from '@/schemas/currentClusterSchema'
import { useClusterStore } from '@/store/useClusterStore'

export function CurrentClusterForm({ onNext }: { onNext: () => void }) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)

  const form = useForm<CurrentClusterInput>({
    resolver: zodResolver(currentClusterSchema),
    mode: 'onBlur',
    defaultValues: { totalVcpus: 0, totalPcores: 0, totalVms: 0 },
  })

  const watched = form.watch()
  useEffect(() => {
    if (form.formState.isValid) {
      setCurrentCluster(form.getValues() as OldCluster)
    }
  }, [watched, form.formState.isValid])

  async function handleNext() {
    const isValid = await form.trigger(['totalVcpus', 'totalPcores', 'totalVms'])
    if (isValid) onNext()
  }

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField control={form.control} name="totalVcpus" render={({ field }) => (
          <FormItem>
            <FieldLabelWithTooltip label="Total vCPUs" tip="Sum of all vCPU reservations across all VMs in the cluster" />
            <FormControl>
              <Input type="number" min={0} {...field} onChange={(e) => field.onChange(e.target.value)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {/* ... other fields ... */}
        <Button type="button" onClick={handleNext}>Next: Define Scenarios</Button>
      </form>
    </Form>
  )
}
```

### WizardShell skeleton

```typescript
// Source: useWizardStore (Phase 1)
import { useWizardStore } from '@/store/useWizardStore'
import { Step1CurrentCluster } from './step1/Step1CurrentCluster'
import { Step2Scenarios } from './step2/Step2Scenarios'
// Step3 is Phase 3

export function WizardShell() {
  const { currentStep, nextStep, prevStep } = useWizardStore()

  return (
    <div>
      <StepIndicator currentStep={currentStep} totalSteps={3} />
      {currentStep === 1 && <Step1CurrentCluster />}
      {currentStep === 2 && <Step2Scenarios />}
    </div>
  )
}
```

### scenarioSchema `haReserveEnabled` Switch binding

```typescript
// Source: react-hook-form.com/docs/usecontroller/controller (Controller for non-text inputs)
<FormField
  control={form.control}
  name="haReserveEnabled"
  render={({ field }) => (
    <FormItem className="flex items-center gap-2">
      <FormLabel>N+1 HA Reserve</FormLabel>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwindcss/vite` plugin | `@tailwindcss/postcss` for Vite 8 | Vite 8 release (2025) | Must configure via `css.postcss` not Vite plugins array |
| `@hookform/resolvers` v3 (Zod v3 only) | v5 with auto-detection for Zod v3 and v4 | resolvers v5.1.0 (2025) | Import path `@hookform/resolvers/zod` unchanged |
| `tailwindcss-animate` | `tw-animate-css` | shadcn Tailwind v4 migration | Different import; same animation utilities |
| `tailwind.config.js` | No config file — `@import "tailwindcss"` in CSS | Tailwind v4 release (2024) | CSS-first configuration; `@theme` directive replaces JS config |
| shadcn FormField wraps `register()` | shadcn FormField wraps `Controller` (via `<Field>` pattern) | shadcn v4 update | Controller pattern is now preferred for shadcn forms |

**Deprecated/outdated:**
- `tailwindcss-animate`: replaced by `tw-animate-css` for Tailwind v4 projects
- `z.coerce.number()` for form inputs: produces silent `0` from empty string; use `z.preprocess` (already done in Phase 1)
- `watch(callback)` overload in RHF: deprecated; use `form.watch()` in `useEffect` deps instead

---

## Open Questions

1. **INPUT-04: vCPU:pCore override field in Step 1**
   - What we know: `OldCluster` type has `totalVcpus` and `totalPcores` — the ratio is auto-calculated
   - What's unclear: The requirement says "user-overridable" — does this mean an editable field in Step 1 that overrides the auto-calculated ratio for display purposes only, or does it feed into scenario calculations?
   - Recommendation: The per-scenario `targetVcpuToPCoreRatio` already allows override per scenario. The Step 1 derived metric should show auto-calculated ratio as read-only with a note that it can be overridden per scenario. This keeps Step 1 focused on observed data and Step 2 focused on assumptions.

2. **Number of tabs vs. scroll in Step 2**
   - What we know: shadcn `Tabs` supports arbitrary tab count; `useScenariosStore` supports unlimited scenarios
   - What's unclear: With 4+ scenarios, tabs overflow on mobile screens
   - Recommendation: Cap scenario count display at 4 visible tabs with overflow scroll on the TabsList; no hard limit on scenario creation. This is a CSS concern not an architecture concern.

3. **Vite 8 vs. Tailwind compatibility long-term**
   - What we know: `@tailwindcss/postcss` works today as a workaround; `@tailwindcss/vite` v4 does not officially support Vite 8
   - What's unclear: Will the Tailwind team add Vite 8 support soon?
   - Recommendation: Use `@tailwindcss/postcss` for this phase. If `@tailwindcss/vite` releases Vite 8 support before Phase 4, switch then. The config change is one line.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (exists — `environment: 'jsdom'`, `globals: true`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (all unit tests; no e2e) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPUT-01 | CurrentClusterForm renders vCPUs/RAM/disk fields | unit (RTL) | `npm test -- --reporter=verbose src/components/step1` | ❌ Wave 0 |
| INPUT-02 | Required fields (totalVcpus, totalPcores, totalVms) reject empty input | unit (RTL) | `npm test -- --reporter=verbose src/components/step1` | ❌ Wave 0 |
| INPUT-03 | Optional server config fields accept valid values and pass undefined when empty | unit (schema) | `npm test -- src/schemas` | ✅ (partial — schemas.test.ts covers this) |
| INPUT-04 | DerivedMetricsPanel updates within 200ms when store values change | unit (RTL) | `npm test -- src/components/step1` | ❌ Wave 0 |
| INPUT-05 | Next button triggers validation; step does not advance with invalid required fields | unit (RTL) | `npm test -- src/components/wizard` | ❌ Wave 0 |
| SCEN-01 | "Add Scenario" button calls addScenario; new card appears | unit (RTL) | `npm test -- src/components/step2` | ❌ Wave 0 |
| SCEN-02 | ScenarioCard renders all server config fields | unit (RTL) | `npm test -- src/components/step2` | ❌ Wave 0 |
| SCEN-03 | ScenarioCard renders sizing assumption fields including haReserveEnabled Switch | unit (RTL) | `npm test -- src/components/step2` | ❌ Wave 0 |
| SCEN-04 | New ScenarioCard pre-fills with defaults from createDefaultScenario() | unit (RTL) | `npm test -- src/components/step2` | ❌ Wave 0 |
| SCEN-05 | "Duplicate" button creates independent copy; editing copy does not affect original | unit (RTL + store) | `npm test -- src/components/step2` | ❌ Wave 0 |
| UX-01 | WizardShell renders StepIndicator and correct step component at each step | unit (RTL) | `npm test -- src/components/wizard` | ❌ Wave 0 |
| UX-02 | Navigation guard blocks step advance when Step 1 required fields invalid | unit (RTL) | `npm test -- src/components/wizard` | ❌ Wave 0 |
| UX-03 | Tooltip content renders on Info icon focus/hover for at least one field | unit (RTL) | `npm test -- src/components/step1` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (Vitest runs in < 5 seconds for unit tests)
- **Per wave merge:** `npm test` full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — covers INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
- [ ] `src/components/step2/__tests__/ScenarioCard.test.tsx` — covers SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05
- [ ] `src/components/wizard/__tests__/WizardShell.test.tsx` — covers UX-01, UX-02
- [ ] Framework install: `npm install react-hook-form @hookform/resolvers` (required before any component tests)
- [ ] Tailwind + shadcn install: `npm install -D tailwindcss @tailwindcss/postcss postcss && npx shadcn@latest init`

---

## Sources

### Primary (HIGH confidence)

- npm registry (March 2026) — all version numbers verified: react-hook-form@7.71.2, @hookform/resolvers@5.2.2, tailwindcss@4.2.1, @tailwindcss/postcss@4.2.1, @tailwindcss/vite@4.2.1
- https://react-hook-form.com/docs/useform — mode option, trigger(), watch(), resolver
- https://react-hook-form.com/docs/usewatch — useWatch API, execution order warning
- https://ui.shadcn.com/docs/installation/vite — shadcn Vite init command
- https://ui.shadcn.com/docs/installation/manual — manual shadcn install packages
- https://ui.shadcn.com/docs/tailwind-v4 — Tailwind v4 migration status
- Phase 1 source code (examined directly) — confirms existing Zod schemas, Zustand stores, types, hooks, and defaults

### Secondary (MEDIUM confidence)

- https://github.com/tailwindlabs/tailwindcss/discussions/19624 — @tailwindcss/vite Vite 8 incompatibility, PostCSS workaround confirmed
- https://github.com/react-hook-form/resolvers — resolvers v5 Zod v4 support announcement
- https://github.com/react-hook-form/react-hook-form/discussions/4028 — multi-step form trigger() pattern
- WebSearch (cross-verified): number input string-vs-number issue; Controller pattern fix

### Tertiary (LOW confidence)

- WebSearch: tab overflow handling patterns for mobile (not officially documented; common community pattern)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry March 2026; peer dependency matrix checked
- Architecture: HIGH — patterns derived from Phase 1 source code (actual codebase) + official RHF and shadcn docs
- Vite 8 + Tailwind workaround: MEDIUM — confirmed via GitHub discussion, not official Tailwind docs (issue open, not resolved)
- Pitfalls: HIGH — number input / z.preprocess issue is directly confirmed by Phase 1 schema code; other pitfalls from official sources

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable stack; Tailwind/Vite 8 compatibility may resolve sooner)
