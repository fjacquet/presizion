# Project Research Summary

**Project:** Cluster Refresh Sizing Tool (cluster-sizer)
**Domain:** Client-side static web app — presales infrastructure sizing calculator
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

The cluster-sizer is a presales capacity planning tool that calculates how many servers are needed to refresh a virtualized cluster. Research confirms this is a well-understood problem domain with established competitors (Nutanix Sizer, WintelGuy, vSphere Community Calculator), but none of the existing tools combines formula transparency, multi-scenario comparison with cloning, and a copy-paste-ready text output — all three of which are required for the presales workflow. The recommended approach is a 100% client-side React 19 + TypeScript application deployed to GitHub Pages, with no backend, no authentication, and no external data dependencies. The architecture pattern is a 3-step wizard with a strictly isolated calculation layer (`src/lib/sizing/`), three narrow Zustand state slices, and React Hook Form + Zod per step.

The most critical design decision is to keep all sizing math in pure TypeScript functions that have zero React dependencies. This is both a testability requirement (the formulas must be validated against a reference spreadsheet) and a maintainability requirement (presales engineers must be able to defend every number in a customer meeting). The formula transparency panel — showing formula strings and concrete parameter values — is a hard requirement, not a polish item. Shipping without it produces a black box that presales engineers cannot use.

The primary risks are numerical: floating-point drift in chained intermediate calculations can shift server counts by ±1 on boundary inputs, and the NaN cascade from empty form fields corrupts all downstream outputs silently. Both must be addressed in the foundational phase, before any UI is built. The secondary risk is scope creep — pre-defined hardware SKU catalogs, TCO pricing, backend user accounts, and real-time vCenter integration are all commonly requested and all wrong for this tool's charter.

## Key Findings

### Recommended Stack

The stack is modern, stable, and verified against npm registry as of March 2026. The combination of React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, and shadcn/ui v4 represents a cohesive toolchain where each component has been validated for compatibility with the others. The key compatibility constraint is that Vite 7 requires Node.js 20.19+ or 22.12+; Tailwind v4 with shadcn v4 is the required pairing (shadcn v3 does not support Tailwind v4); and Vitest major version must track Vite major version.

State management uses Zustand v5 (not React Context) because the scenario data is accessed across many subtrees and Context would trigger full subtree re-renders — unacceptable given the <200ms recalculation budget. Form management uses React Hook Form v7 (not Formik) because uncontrolled inputs prevent per-keystroke full-form re-renders. Zod v4 provides schema validation and TypeScript type inference from a single schema definition.

**Core technologies:**

- React 19.2.4: UI rendering — native `use()` hook, improved concurrent rendering, no server features needed
- TypeScript 5.9.3: Static typing — strict mode required; sizing formulas are safety-critical
- Vite 7.3.1: Build tooling — produces pure static assets, trivial GitHub Pages deployment via `base` config
- React Hook Form 7.71.2: Form state — uncontrolled inputs, re-renders only changed field, integrates with shadcn Form primitive
- Zod v4: Schema validation — 14x faster than v3, `z.infer<>` eliminates double-declaring types
- Zustand 5.0.11: Global state — 3KB, no provider wrap, uses `useSyncExternalStore`; three narrow slices
- shadcn/ui v4 + Tailwind CSS v4: Component library — copy-owned components, full ARIA compliance, CSS-first config
- papaparse 5.5.3: CSV export — RFC 4180 compliant, no backend required
- Vitest 4.0.18: Unit testing — reuses Vite config, Jest-compatible API

### Expected Features

The MVP feature set is defined by what presales engineers need to replace a reference spreadsheet for a standard cluster refresh. The key competitive insight is that multi-scenario comparison with scenario duplication and a copy-paste text summary are gaps in all existing tools — these are the primary differentiators.

**Must have (table stakes) — v1:**

- Current environment input form (VMs, vCPUs, RAM, disk, existing server config) — raw material for all calculations
- Derived metric auto-calculation (vCPU:pCore ratio, RAM/VM, VMs/server) with <200ms re-render
- Target server configuration input (cores/socket, sockets, RAM, disk) per scenario
- Server count output per constraint (CPU-limited, RAM-limited, disk-limited, final max)
- Limiting-resource identification — identifies which constraint drives the count with callout text
- Per-server utilization and VM density at final server count — the presales sanity check
- Configurable sizing assumptions (vCPU:pCore overcommit, RAM headroom %, disk headroom %) with industry defaults (4:1, 20%, 20%)
- Inline formula display with concrete parameter values — presales engineers must defend every number
- Input validation with inline error messages — prevents nonsense output
- Side-by-side scenario comparison (at minimum 2 simultaneous scenarios)
- Scenario duplication — reduces re-entry friction for scenario variants
- Plain-text summary for copy-paste into slides or email
- JSON and CSV download — auditable record of inputs and outputs

**Should have (competitive) — v1.x after validation:**

- N+1 HA-aware server count toggle (separate from utilization headroom)
- Growth buffer input (% VM growth over N months)
- localStorage persistence
- Shareable URL (state encoded in URL hash)
- Printable / PDF-ready layout (CSS @media print)

**Defer (v2+):**

- Assumption-sensitivity delta table
- More than 3 simultaneous scenarios
- Workload profile presets (VDI-heavy, DB-heavy)
- Dark mode / theming

**Anti-features to reject regardless of request:**

- Pre-defined hardware SKU catalog (goes stale, kills vendor-neutral positioning)
- TCO / pricing / BOM output (price data changes constantly, wrong product category)
- Backend user accounts (turns static tool into a web app requiring auth and GDPR compliance)
- Real-time vCenter / CloudIQ integration (presales engineers lack production API access)
- Per-VM workload modeling (requires data that doesn't exist in presales)

### Architecture Approach

The architecture is a 3-step wizard (Current Environment → Scenarios → Review and Export) built on three strictly separated layers: a Presentation Layer (WizardShell, step components, ExportToolbar), a State Layer (three narrow Zustand slices for wizard navigation, cluster data, and scenarios), and a Calculation Layer (`src/lib/sizing/` — pure TypeScript, zero React imports). Derived results (`ScenarioResult[]`) are never stored in Zustand; they are computed on-demand in the `useScenariosResults()` hook which calls the sizing library. This prevents cache invalidation bugs and is fast enough given the O(n) arithmetic with n ≤ 10 scenarios.

**Major components:**

1. `WizardShell` + `StepIndicator` — step routing, navigation guards, progress display
2. `Step1CurrentCluster` (form + `DerivedMetricsPanel`) — current environment input with live derived metrics
3. `Step2Scenarios` (tabbed `ScenarioCard` instances + `ScenarioResults`) — per-scenario server config input with live calculation preview
4. `Step3ReviewExport` (`ComparisonTable` + `ExportToolbar`) — side-by-side comparison and export triggers
5. `src/lib/sizing/` (`formulas.ts`, `constraints.ts`, `derived.ts`, `defaults.ts`) — all sizing math, fully unit-testable
6. `src/lib/export/` (`clipboard.ts`, `csvExport.ts`, `jsonExport.ts`) — pure export utilities, no React
7. `src/store/` (3 Zustand slices), `src/hooks/` (`useScenariosResults`, `useWizardNavigation`), `src/schemas/` (Zod schemas)

**Key architectural rules:**

- Components never call sizing lib functions directly — only through hooks
- Sizing lib never imports from React — fully decoupled and unit-testable
- Export utilities are pure functions called from click handlers — not reactive state
- Scenario duplication uses a `createEmptyScenario()` factory to prevent uncontrolled input bugs
- Mode `onBlur` for Zod validation, `onChange` for live store writes in Step 2

### Critical Pitfalls

1. **Floating-point drift in sizing formulas** — Chain intermediate arithmetic at full precision; apply `Math.ceil` only at the final output. Add unit tests with reference spreadsheet fixture inputs verified within 0.001 tolerance. Never use `Math.round` for server count (always `Math.ceil`). Address in Phase 1 before any UI is built.

2. **NaN cascade from empty numeric inputs** — `<input type="number">` returns `""` (a string) when empty; `parseFloat("") === NaN` silently poisons all downstream calculations. Implement a `parseNumericInput(raw: string): number | null` helper and pass all form values through it before calling sizing functions. Use `z.preprocess` with explicit empty-string-to-undefined conversion, not `z.coerce.number()`. Address in the same PR as the first numeric input field.

3. **Hyperthreading double-counting** — OS tools report logical CPUs (threads), not physical cores. A user who copies from Task Manager will enter 2x the real core count, halving the calculated server count. Label inputs explicitly as "Physical cores (NOT hyperthreaded logical CPUs)" and add a defensive validator: warn if `pCores > sockets × 32`.

4. **HA headroom omission** — A server count that fills capacity 100% with no fault tolerance will fail at deployment. Treat HA reserve as a separate, explicit formula parameter (default: 1 host), not part of the utilization headroom percentage. Show `required_raw` and `required_with_ha` separately in the results panel. Address simultaneously with initial formula implementation.

5. **Uncontrolled-to-controlled input flip** — TypeScript optional properties initialize to `undefined`, causing React's "changing uncontrolled input to controlled" warning and silent state loss when scenarios are duplicated. Define a `createEmptyScenario()` factory with `Required<ScenarioInput>` return type; use it everywhere a new scenario is created.

6. **Multi-step cross-step validation gap** — Per-step Zod validation does not catch logical inconsistencies across steps when the user navigates back and changes Step 1 values. Keep all state in Zustand, run full sizing calculation on every state change, and display derived warnings (not blocking errors) in a persistent panel visible at all steps.

## Implications for Roadmap

The research unanimously points to a bottom-up build order: math first, state second, UI third. The sizing library is the correctness foundation; every UI component is just a way to collect inputs and display outputs from the library. Building UI before the math is tested is the primary source of bugs in this domain.

### Phase 1: Foundation — Data Types, Sizing Library, and State

**Rationale:** Architecture research explicitly places types, schemas, sizing lib, and Zustand stores as the first build order. Pitfalls research confirms that floating-point drift, NaN cascade, and HA headroom omission must be caught before any UI exists. These are the correctness-critical units.
**Delivers:** A fully unit-tested calculation engine that matches the reference spreadsheet. All TypeScript interfaces. Three Zustand slices. Zod schemas. No UI yet — but the entire business logic can be verified.
**Addresses:** All P1 calculation features (server count per constraint, utilization, VM density, configurable assumptions, derived metrics)
**Avoids:** Floating-point drift (unit tests against fixtures), NaN cascade (parseNumericInput helper), HA headroom omission (first-class formula parameter), inline formulas in components (lib isolation enforced from day one)

### Phase 2: Input Forms — Step 1 and Step 2 with Live Calculation

**Rationale:** Step 1 (current cluster input) establishes the React Hook Form + Zod + Zustand write pipeline that all subsequent steps reuse. Step 2 (scenario cards) builds on Step 1's patterns and adds the live recalculation flow. The DerivedMetricsPanel proves formula transparency in the UI.
**Delivers:** A working 2-step data entry experience with live server count outputs visible in ScenarioCards. Per-field validation. Formula display panels.
**Uses:** react-hook-form + Zod resolver, shadcn Form/Input/Card primitives, useScenariosResults hook
**Implements:** Step1CurrentCluster, CurrentClusterForm, DerivedMetricsPanel, Step2Scenarios, ScenarioCard, ScenarioResults
**Avoids:** Uncontrolled-to-controlled flip (createEmptyScenario factory), validation mode anti-pattern (onBlur for Zod, onChange for store writes), hyperthreading mislabeling (input labels and defensive validator)

### Phase 3: Comparison, Export, and Wizard Shell

**Rationale:** Step 3 is purely read-only against the store and the results hook — no new form patterns. The WizardShell wraps all steps and adds navigation guards. Export utilities are pure functions with no React dependencies. This phase completes the MVP.
**Delivers:** Side-by-side comparison table, copy-to-clipboard plain-text summary, JSON and CSV download, full 3-step wizard navigation with step indicator. Complete MVP.
**Uses:** papaparse for CSV, Clipboard API wrapper, Blob/URL.createObjectURL for file downloads
**Implements:** Step3ReviewExport, ComparisonTable, ExportToolbar, WizardShell, StepIndicator, all export utilities
**Avoids:** Export as reactive state (pure function in onClick), Blob URL memory leak (revokeObjectURL), multi-step cross-step validation gap (holistic validation at export), CSV injection (field value sanitization)

### Phase 4: GitHub Pages Deployment and Polish

**Rationale:** Deployment is straightforward but has one non-obvious pitfall (missing `base` path in vite.config.ts) that causes a blank page. UI polish (formula tooltips, binding-constraint callout text, step counter, copy-to-clipboard feedback) is deferred from previous phases to avoid scope creep during foundation work.
**Delivers:** Publicly accessible tool on GitHub Pages. StatusBadge for limiting resource. Inline formula tooltips. Clipboard success/failure toast.
**Avoids:** GitHub Pages blank page (base path config verified with `vite build && npx serve dist`), missing clipboard feedback (useClipboard hook with success/error state)

### Phase 5: v1.x Enhancements (Post-Validation)

**Rationale:** These features add real value but require validation that users actually need them. Ship the MVP, observe how presales engineers use the tool, then add.
**Delivers:** N+1 HA toggle, growth buffer input, localStorage persistence, shareable URL (hash state), printable layout
**Uses:** Zustand `persist` middleware (zero architectural change), URL hash encoding, CSS @media print

### Phase Ordering Rationale

- **Math before UI:** The sizing library must be correct before any component depends on it. Bugs discovered after UI exists require hunting through component files; bugs in an isolated pure-function module are trivial to fix.
- **Step 1 before Step 2 before Step 3:** The data flows Step 1 → Step 2 → Step 3. The OldCluster data set in Step 1 is a required input for scenario calculations in Step 2, which produces the results displayed in Step 3.
- **Foundation pitfalls must be addressed in Phase 1:** NaN cascade, floating-point drift, and HA omission have HIGH recovery costs if discovered after the UI is built. Fixing them before UI eliminates that risk entirely.
- **Export deferred to Phase 3:** Export utilities read from the same store and results hook as the comparison table — they add no new state concerns and are naturally grouped with the final-step UI.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 5 (Shareable URL):** URL hash state encoding/decoding strategy and size limits for large scenario sets need validation before implementation
- **Phase 5 (localStorage persistence):** Zustand persist middleware has schema migration concerns if the state shape evolves; migration strategy needs design

Phases with standard, well-documented patterns (skip research-phase):

- **Phase 1 (Sizing library):** Pure TypeScript math with Vitest — textbook unit testing, no novel patterns
- **Phase 2 (React Hook Form + Zod + Zustand):** Multiple high-quality reference implementations exist; the exact pipeline is documented in detail in ARCHITECTURE.md
- **Phase 3 (Export utilities):** Clipboard API, Blob download, and papaparse are all well-documented with no gotchas beyond what PITFALLS.md already captures
- **Phase 4 (GitHub Pages deployment):** One-line Vite config change; well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry March 2026; compatibility matrix explicitly validated (React 19 + RTL v16, Vite 7 + Vitest 4, Tailwind v4 + shadcn v4, Zod v4 + resolvers v3) |
| Features | HIGH | Core sizing features verified against 4 production tools (Nutanix Sizer, WintelGuy, vSphere Calculator, Dell EIPT); competitive gaps confirmed by direct tool analysis |
| Architecture | HIGH | Patterns sourced from multiple production React multi-step form guides; wizard + pure calc layer + Zustand slices is a well-established combination |
| Pitfalls | HIGH (formulas), MEDIUM (UX) | Formula pitfalls (floating-point, NaN, hyperthreading, HA) sourced from primary references and production bug reports; UX pitfalls from community sources corroborated by multiple guides |

**Overall confidence:** HIGH

### Gaps to Address

- **Reference spreadsheet fixture values:** The calculation engine needs at least 3 known input/output pairs from the reference spreadsheet to write accurate unit test fixtures. These must be provided or verified by the project owner before Phase 1 can be completed.
- **Exact vCPU:pCore default:** Industry consensus is 4:1 for general workloads. If the project has a specific customer segment (VDI-heavy, database-heavy), the default may need adjustment. Validate with project owner before shipping.
- **Scenario count maximum:** Research recommends 2-3 simultaneous scenarios for MVP. If the target users regularly compare 4+ options, the UI layout needs re-evaluation. Validate with one presales engineer before finalizing the Step 2 layout.
- **N+1 in MVP vs v1.x:** The pitfalls research recommends HA reserve as a first-class formula parameter from Phase 1. The features research defers the N+1 toggle to v1.x. Resolve this tension: the HA reserve value should be in the formula from day one (even if hardcoded to 1), but the UI toggle exposing it to users can be deferred.

## Sources

### Primary (HIGH confidence)

- npm registry — all version numbers verified March 2026
- <https://vite.dev/guide/static-deploy> — GitHub Pages base path configuration
- <https://ui.shadcn.com/docs/tailwind-v4> — shadcn Tailwind v4 support status
- <https://zod.dev/v4> — Zod v4 release notes, performance benchmarks, migration guide
- <https://react-hook-form.com/> — controlled vs. uncontrolled performance rationale
- <https://zustand.docs.pmnd.rs/> — Zustand v5 useSyncExternalStore notes
- <https://www.papaparse.com/docs> — unparse() API for CSV export
- React issues #7779 and #1549 — controlled/uncontrolled input behavior
- Zod discussions #2814 and #2461 — coerce.number() empty-string-to-zero behavior

### Secondary (MEDIUM confidence)

- Nutanix Sizer product page — feature competitive analysis
- WintelGuy vmcalc.pl — live tool analysis, feature gaps
- vSphere Cluster Calculator user guide — feature gaps
- VMware vCPU-to-pCPU ratio guidelines 2025 — default ratio validation
- claritydev.net — React multi-step wizard patterns
- buildwithmatija.com — React Hook Form + Zustand + Zod pipeline
- LogRocket — multi-step form patterns
- Robin Wieruch — JavaScript rounding errors
- Broadcom Community — CPU overcommit hyperthreading mistake

### Tertiary (LOW confidence, corroborated)

- WebSearch — recharts vs Chart.js for React TypeScript (multiple sources agree)
- WebSearch — Zustand vs Jotai vs Context 2025 (multiple sources agree)

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
