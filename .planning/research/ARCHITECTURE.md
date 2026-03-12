# Architecture Research

**Domain:** Client-side static React + TypeScript calculation/wizard app
**Researched:** 2026-03-12
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client-Only)                        │
├─────────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  WizardShell │  │  StepIndicator  │  │   ExportToolbar      │   │
│  │  (routing,   │  │  (progress,     │  │   (copy/download     │   │
│  │   nav)       │  │   nav buttons)  │  │    triggers)         │   │
│  └──────┬───────┘  └────────┬────────┘  └──────────┬───────────┘   │
│         │                   │                       │               │
├─────────┴───────────────────┴───────────────────────┴───────────────┤
│  STEP LAYER                                                          │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  Step 1:         │  │  Step 2:         │  │  Step 3:          │   │
│  │  CurrentCluster  │  │  Scenarios       │  │  ReviewExport     │   │
│  │  Form            │  │  (tabs/cards)    │  │  (comparison)     │   │
│  └──────┬───────────┘  └────────┬─────────┘  └──────┬───────────┘   │
│         │                       │                    │               │
├─────────┴───────────────────────┴────────────────────┴───────────────┤
│  STATE LAYER  (Zustand store)                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  useWizardStore  │  │  currentCluster  │  │  scenarios[]      │  │
│  │  (step, nav)     │  │  (OldCluster)    │  │  (Scenario[])     │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  CALCULATION LAYER  (pure TypeScript, no React)                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  src/lib/sizing/                                               │  │
│  │  ├── formulas.ts     (pure math functions)                     │  │
│  │  ├── constraints.ts  (CPU/RAM/disk server-count functions)     │  │
│  │  ├── derived.ts      (derived cluster metrics)                 │  │
│  │  └── defaults.ts     (industry-standard assumption constants)  │  │
│  └────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  EXPORT LAYER  (pure TypeScript utilities)                           │
│  ┌────────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  clipboard.ts      │  │  csvExport.ts  │  │  jsonExport.ts   │   │
│  │  (Clipboard API)   │  │  (Blob/URL)    │  │  (Blob/URL)      │   │
│  └────────────────────┘  └────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                          GitHub Pages (static hosting)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `WizardShell` | Renders active step, controls step progression, blocks advancing on validation failure | Single stateful component reading from `useWizardStore` |
| `StepIndicator` | Shows current step number, labels, clickable back-navigation | Pure presentational, receives step index as prop |
| `Step1CurrentCluster` | Form for entering OldCluster data; shows derived preview metrics | React Hook Form + Zod schema; reads/writes store on submit |
| `Step2Scenarios` | Tabbed/card interface for defining 2+ Scenario entries; shows per-scenario live results | Per-scenario form card; results computed via `useMemo` calling sizing lib |
| `Step3ReviewExport` | Side-by-side comparison table; export buttons | Reads scenarios + ScenarioResults from store; triggers export utilities |
| `ScenarioCard` | Encapsulates one scenario's form and live output summary | Receives scenario ID; localizes Hook Form state; writes to store on change |
| `DerivedMetricsPanel` | Read-only display of auto-computed values with formula tooltips | Pure display; accepts computed values + formula strings as props |
| `ExportToolbar` | "Copy summary" and "Download JSON/CSV" buttons | Calls export utilities from `src/lib/export/` |
| `sizing/formulas.ts` | Pure math: server count per constraint, utilization, VM density | Zero React imports; fully unit-testable |
| `sizing/defaults.ts` | Constants: 4:1 vCPU:pCore, 20% headroom, etc. | Exported const object; single source of truth |

## Recommended Project Structure

```
src/
├── components/
│   ├── wizard/
│   │   ├── WizardShell.tsx       # Step routing, nav guards, layout
│   │   └── StepIndicator.tsx     # Progress bar / numbered steps
│   ├── steps/
│   │   ├── Step1CurrentCluster/
│   │   │   ├── Step1CurrentCluster.tsx
│   │   │   ├── CurrentClusterForm.tsx
│   │   │   └── DerivedMetricsPanel.tsx
│   │   ├── Step2Scenarios/
│   │   │   ├── Step2Scenarios.tsx
│   │   │   ├── ScenarioCard.tsx
│   │   │   └── ScenarioResults.tsx
│   │   └── Step3ReviewExport/
│   │       ├── Step3ReviewExport.tsx
│   │       ├── ComparisonTable.tsx
│   │       └── ExportToolbar.tsx
│   └── ui/                       # Generic reusable UI (input, tooltip, badge)
│       ├── FormField.tsx
│       ├── Tooltip.tsx
│       └── StatusBadge.tsx
├── hooks/
│   ├── useWizardNavigation.ts    # Step advance/retreat + validation gate
│   └── useScenariosResults.ts    # Derives ScenarioResult[] from store state
├── lib/
│   ├── sizing/
│   │   ├── formulas.ts           # Pure sizing math (CPU/RAM/disk constraints)
│   │   ├── derived.ts            # OldCluster derived metrics
│   │   ├── constraints.ts        # server count per resource, limiting resource
│   │   └── defaults.ts           # Industry-standard defaults & constants
│   └── export/
│       ├── clipboard.ts          # Clipboard API wrapper
│       ├── csvExport.ts          # Blob + URL.createObjectURL CSV download
│       └── jsonExport.ts         # JSON download
├── store/
│   ├── useWizardStore.ts         # Zustand: currentStep, navigation
│   ├── useClusterStore.ts        # Zustand: OldCluster input values
│   └── useScenariosStore.ts      # Zustand: Scenario[] + CRUD (add/dup/remove)
├── types/
│   ├── cluster.ts                # OldCluster, Scenario interfaces
│   └── results.ts                # ScenarioResult interface
├── schemas/
│   ├── currentClusterSchema.ts   # Zod schema for Step 1 validation
│   └── scenarioSchema.ts         # Zod schema for Step 2 validation
├── App.tsx
└── main.tsx
```

### Structure Rationale

- **`lib/sizing/`:** Completely decoupled from React. Pure TypeScript functions accept data, return numbers. Independently unit-testable. The constitution mandates formulas live here — this enforces that.
- **`store/`:** Three narrow Zustand slices (wizard nav, cluster data, scenarios) rather than one fat store. Each slice changes independently; components subscribe to only what they need.
- **`steps/`:** Colocates each wizard step's sub-components. Prevents cross-step component leakage and makes each step a self-contained unit.
- **`schemas/`:** Zod schemas separated from components so they can be imported by both the React Hook Form resolver and any export/validation utilities without circular dependencies.
- **`hooks/`:** Custom hooks that encapsulate store + lib interactions, preventing components from directly calling sizing lib functions (keeps components thin).
- **`ui/`:** Generic components (FormField, Tooltip, StatusBadge) that carry no business logic, enabling consistent UI patterns across all steps.

## Architectural Patterns

### Pattern 1: Pure Calculation Layer (Library Isolation)

**What:** All sizing math lives in `src/lib/sizing/` as pure TypeScript functions. No React hooks, no JSX, no side effects. Every function signature is `(inputs: InputType) => OutputType`.

**When to use:** Always. This is non-negotiable per the project constitution and the correctness requirement ("outputs must match reference spreadsheet").

**Trade-offs:** Requires discipline to not add React dependencies into lib files. Pays off massively in testability — the most critical business logic can be verified with plain `vitest` unit tests, no component rendering required.

**Example:**
```typescript
// src/lib/sizing/formulas.ts
export interface CpuConstraintInput {
  totalVcpus: number;
  growthHeadroomPercent: number;
  targetVcpuToPCoreRatio: number;
  coresPerServer: number;
}

export function serverCountByCpu(input: CpuConstraintInput): number {
  const requiredVcpus = input.totalVcpus * (1 + input.growthHeadroomPercent / 100);
  const requiredPcores = requiredVcpus / input.targetVcpuToPCoreRatio;
  return Math.ceil(requiredPcores / input.coresPerServer);
}
```

### Pattern 2: Zustand Slices + Derived Results in Custom Hooks

**What:** Store holds raw inputs only (OldCluster, Scenario[]). Derived `ScenarioResult[]` are computed on-the-fly in `useScenariosResults()` hook, which calls sizing lib functions. No derived data persisted in the store.

**When to use:** When derived values are always computable from inputs without async operations. Avoids cache invalidation bugs that arise from storing both inputs and derived state.

**Trade-offs:** Re-computation on every render. Acceptable here because calculations are O(n) arithmetic with n <= 10 scenarios and the <200 ms constraint is easily met. With React 19 compiler or selective `useMemo`, this is not a concern.

**Example:**
```typescript
// src/hooks/useScenariosResults.ts
import { useScenariosStore } from '../store/useScenariosStore';
import { useClusterStore } from '../store/useClusterStore';
import { computeScenarioResult } from '../lib/sizing/constraints';

export function useScenariosResults() {
  const { scenarios } = useScenariosStore();
  const { currentCluster } = useClusterStore();
  return scenarios.map(scenario =>
    computeScenarioResult(currentCluster, scenario)
  );
}
```

### Pattern 3: React Hook Form + Zod Per Step, Store on Valid Submit

**What:** Each wizard step uses a local React Hook Form instance with a Zod resolver for validation. On successful step completion, validated data is written to the Zustand store. The store is the canonical source of truth between steps, not the form state.

**When to use:** Multi-step forms where validation must happen per-step before advancing. Keeps form error state local (no global error store). Zustand holds the clean, validated snapshot.

**Trade-offs:** Two copies of data exist briefly (form state + store state). This is intentional — it means navigating backwards re-populates the form from the store's last-saved values cleanly.

**Example:**
```typescript
// src/components/steps/Step1CurrentCluster/CurrentClusterForm.tsx
const form = useForm<CurrentClusterFormData>({
  resolver: zodResolver(currentClusterSchema),
  defaultValues: useClusterStore.getState().currentCluster,
});

const onSubmit = (data: CurrentClusterFormData) => {
  useClusterStore.getState().setCurrentCluster(data);
  useWizardStore.getState().advance();
};
```

### Pattern 4: Export as Pure Utility Functions

**What:** Export functions (`clipboard.ts`, `csvExport.ts`, `jsonExport.ts`) accept plain data and trigger browser APIs. No React state, no hooks. Called directly from button `onClick` handlers in `ExportToolbar`.

**When to use:** When exports are one-shot operations triggered by user action. No need to hook into React's render cycle.

**Trade-offs:** Clipboard API requires async handling. Wrap in a small `useClipboard` hook to expose loading/success state to UI without polluting export utilities with React.

## Data Flow

### Wizard Navigation Flow

```
User clicks "Next"
    ↓
WizardShell → useWizardNavigation.canAdvance()
    ↓ (calls RHF trigger() for current step validation)
[INVALID] → display inline errors (RHF manages), stay on step
[VALID]   → RHF handleSubmit → writes to Zustand store → step index +1
    ↓
WizardShell re-renders active step component
```

### Real-Time Calculation Flow

```
User changes input in ScenarioCard form
    ↓
React Hook Form (local form state updates, re-renders ScenarioCard)
    ↓
ScenarioCard calls useWatch() or onChange → writes to useScenariosStore
    ↓
useScenariosResults() hook re-runs (subscribed components re-render)
    ↓
ScenarioResults component displays updated server counts
    ↓
ComparisonTable (Step 3) also updates if visible
```

Note: For the scenarios step, live recalculation is more valuable than waiting for step submission. Write to store on each valid field change using `mode: 'onChange'` for the scenario form.

### Export Flow

```
User clicks "Copy Summary"
    ↓
ExportToolbar onClick → buildSummaryText(currentCluster, scenarios, results)
    ↓ (pure function, no React)
navigator.clipboard.writeText(text)
    ↓
useClipboard hook updates success state → UI shows confirmation
```

```
User clicks "Download CSV"
    ↓
ExportToolbar onClick → buildCsvRows(currentCluster, scenarios, results)
    ↓ (pure function)
csvExport(rows, 'cluster-sizing.csv')
    ↓ (Blob + URL.createObjectURL + programmatic <a> click)
Browser triggers file download
```

### State Ownership Summary

| Data | Owner | When Written | When Read |
|------|-------|--------------|-----------|
| Current step index | `useWizardStore` | Nav advance/retreat | `WizardShell`, `StepIndicator` |
| OldCluster fields | `useClusterStore` | Step 1 submit | `useScenariosResults`, Step 1 defaults, export |
| Scenario[] raw inputs | `useScenariosStore` | Each scenario field change | `useScenariosResults`, Step 3, export |
| ScenarioResult[] | Computed (not stored) | N/A | Derived in `useScenariosResults` hook |
| Form validation errors | React Hook Form (local) | Per-field validation | Active step form only |

## Suggested Build Order (Phase Dependencies)

Building in this order ensures each phase produces a runnable app:

1. **Data types and sizing library first** — `types/`, `schemas/`, `lib/sizing/`. No React. Fully testable. This is the correctness foundation that everything else depends on.

2. **Zustand stores** — `useClusterStore`, `useScenariosStore`, `useWizardStore`. Pure state with no UI. Can be verified with unit tests.

3. **Custom hooks** — `useScenariosResults`, `useWizardNavigation`. Wire stores to sizing lib. Test by calling hooks in isolation.

4. **Step 1 form** — The most complex form (most fields, derived metrics panel). Proves the RHF + Zod + store write pipeline end-to-end.

5. **Step 2 scenario cards** — Builds on Step 1 patterns. Add `ScenarioCard` with live recalculation preview. Add/duplicate/remove scenario actions.

6. **Step 3 comparison and export** — Purely reads from store and results hook. Add `ComparisonTable`, `ExportToolbar`, and all export utilities.

7. **WizardShell and StepIndicator** — Wire steps together with navigation guards. This can be a thin shell built early but fully tested only when all steps exist.

8. **Polish** — `ui/` components (Tooltip, StatusBadge), visual indicators, formula display in `DerivedMetricsPanel`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single-user static app (current scope) | Current architecture is correct. No changes needed. |
| Adding localStorage persistence (v1.1) | Add Zustand `persist` middleware to `useClusterStore` and `useScenariosStore`. Zero architectural change — middleware wraps existing store. |
| Adding a server SKU library (future) | Add a `src/lib/skus/` module with typed SKU definitions. Scenarios select from the library instead of entering raw values. Still client-side. |
| Adding async data loading (vCenter import) | Introduce `useQuery` from TanStack Query as a data-fetching layer. Does not affect calculation layer or export layer. |

### Scaling Priority

1. **First pressure point:** If sizing lib grows complex (many workload profiles, conditional formulas), split `formulas.ts` into subdirectory with one file per constraint type. The module boundary is already in place.
2. **Second pressure point:** If scenario count grows beyond ~10, `useScenariosResults` should be wrapped in `useMemo` with explicit dependency array. Profile before adding.

## Anti-Patterns

### Anti-Pattern 1: Storing Derived ScenarioResults in Zustand

**What people do:** Save computed `ScenarioResult[]` into the Zustand store alongside the raw inputs.

**Why it's wrong:** Creates two sources of truth that can diverge. When an input changes, you must remember to invalidate the cached result. This is the root cause of "stale calculation" bugs that are hard to reproduce.

**Do this instead:** Compute results synchronously in `useScenariosResults()`. For a client-side app with simple arithmetic, this is instant. If profiling reveals a bottleneck (it won't), add `useMemo` as a targeted fix.

### Anti-Pattern 2: Formula Logic Scattered in Components

**What people do:** Put `Math.ceil(totalVcpus / (vcpuRatio * coresPerServer))` inline in a component's render function or `useEffect`.

**Why it's wrong:** Untestable without rendering a component. When the formula needs to change, engineers must hunt through JSX files. Formula accuracy — the app's primary acceptance criterion — cannot be verified in isolation.

**Do this instead:** All formula logic lives exclusively in `src/lib/sizing/`. Components receive results as props or via hooks. This is explicitly required by the project constitution.

### Anti-Pattern 3: One Giant Zustand Store

**What people do:** Create a single `useAppStore` with wizard navigation, cluster data, scenarios, and form errors all mixed together.

**Why it's wrong:** Components that only need the current step index will re-render when a scenario field changes. Form error state pollutes global state, making debugging harder. Testing individual store slices becomes impossible.

**Do this instead:** Three narrow slices: `useWizardStore` (navigation only), `useClusterStore` (OldCluster only), `useScenariosStore` (Scenario[] CRUD). Each component subscribes to the slice it actually needs.

### Anti-Pattern 4: Validating on Every Keystroke in Step 2

**What people do:** Use `mode: 'onChange'` globally and trigger full Zod schema validation on every character typed in scenario fields.

**Why it's wrong:** With a complex schema (Zod with `.refine()` constraints), synchronous validation on every keystroke can cause input lag for fast typists.

**Do this instead:** Use `mode: 'onBlur'` for schema validation (show errors when field loses focus). Write raw values to the store on `onChange` for live calculation preview — but skip schema validation on each keystroke. The live calculations can tolerate partially invalid state (show "--" or "N/A" when inputs are incomplete).

### Anti-Pattern 5: Using React State for Export Content

**What people do:** `const [csvContent, setCsvContent] = useState('')` and compute CSV in a `useEffect`.

**Why it's wrong:** Export is a one-shot imperative action, not a reactive data flow. Using effects for imperative operations makes the code harder to reason about and introduces timing bugs.

**Do this instead:** Call pure `buildCsvRows(currentCluster, scenarios, results)` synchronously inside the button click handler, then pass the result directly to the download utility. No state, no effects.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub Pages | Static file deployment via CI | Output of `vite build`; no server-side code whatsoever |
| Browser Clipboard API | `navigator.clipboard.writeText()` in `src/lib/export/clipboard.ts` | Requires HTTPS context; GitHub Pages satisfies this |
| Browser File Download | `URL.createObjectURL(blob)` + programmatic anchor click | Works in all modern browsers; no library needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Components → Zustand | Direct store subscription via Zustand hooks | Components never call sizing lib directly |
| Hooks → Sizing lib | Direct function calls (synchronous) | `useScenariosResults` is the sole gateway |
| Sizing lib → Types | Import-only dependency | `lib/sizing/` imports from `types/`; never the reverse |
| Components → Export lib | Direct function call in onClick handler | No intermediate hook needed for simple exports |
| Schemas → Types | Zod infers TypeScript types from schemas | `z.infer<typeof currentClusterSchema>` = `OldCluster` |

## Sources

- [React multi-step wizard patterns — claritydev.net](https://claritydev.net/blog/build-a-multistep-form-with-react-hook-form)
- [React Hook Form + Zustand + Zod pipeline — buildwithmatija.com](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)
- [Building reusable multi-step forms with RHF and Zod — LogRocket](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/)
- [React state management in 2025 — developerway.com](https://www.developerway.com/posts/react-state-management-2025)
- [React folder structure guidance — Robin Wieruch](https://www.robinwieruch.de/react-folder-structure/)
- [Implementing CSV export without external libraries — DEV Community](https://dev.to/graciesharma/implementing-csv-data-export-in-react-without-external-libraries-3030)
- [React anti-patterns 2025 — jsdev.space](https://jsdev.space/react-anti-patterns-2025/)
- [Zustand TypeScript guide — tillitsdone.com](https://tillitsdone.com/blogs/zustand-typescript-guide-2024/)
- Project constitution: `/docs/constitution.md`
- Project PRD: `/docs/prd.md`

---
*Architecture research for: Cluster Refresh Sizing Tool — client-side React + TypeScript wizard with real-time sizing calculations*
*Researched: 2026-03-12*
