# Presizion Simplification & vatlas Alignment — Design

**Date:** 2026-05-30
**Status:** Approved (sub-project A); B–E scoped, to be brainstormed individually
**Author:** Frederic Jacquet (with Claude Code)

## Problem

Presizion has accumulated YAGNI complexity. The scenario card exposes ~7 overlapping
buffer/growth fields, 4 sizing modes (three of which need data a presales engineer
rarely has), and several heavy advanced sections. The headroom concept is hard to use
because it presumes knowledge of real system utilization. The tool should be opinionated,
honest about unknowns, and visually/architecturally consistent with the sibling **vatlas**
project.

## Appetite

**Cut + consolidate.** Remove true YAGNI, merge redundant concepts into one coherent
model, keep a few advanced options behind a clear gate. Not a gentle reskin; not a
ground-up rewrite.

## Decomposition

This effort is too large for one spec. It splits into five independently shippable
sub-projects, each leaving presizion working and each getting its own brainstorm →
spec → plan → build cycle. Only **A** is fully designed here.

| # | Sub-project | Scope | Order rationale |
|---|---|---|---|
| **A** | Feature simplification | Modes 4→2, buffers 7→2, utilization required, smart seeding, advanced disclosure, schema migration | **First** — deletes fields/modes so every later step has less surface |
| **D** | Biome migration | ESLint → Biome (match vatlas) | Early — one reformat commit, later work follows Biome style |
| **B** | Visual style + Arial PPTX | Midnight Executive palette on web; **drop shadcn/ui → plain Tailwind** (`@theme` tokens + `@layer` component classes, vatlas idiom); rebuild PPTX export (Arial body / Consolas metrics); **preserve auto dark mode** | Independent; high visible payoff |
| **C** | Charts → ECharts | Recharts → ECharts + shared `echartsTheme` | After A (fewer/cleaner chart inputs) |
| **E** | i18n scaffold | i18next, locales **en/fr/de/it** (Swiss market), externalize strings | **Last** — stabilize string surface first |

### Cross-cutting principles (apply to B–E when reached)

- **Trust Tailwind fully:** design tokens via `@theme`, utility-first markup, shared
  patterns as `@layer components`, Tailwind's `@custom-variant dark` for theming. No
  parallel theming system, no scattered hex values, no magic numbers.
- **Drop shadcn/ui** in favor of vatlas's plain-Tailwind + `.panel`/`.label` approach.
- **Auto dark mode is the default** and follows the OS (`prefers-color-scheme` +
  FOUC-before-paint), with a manual toggle on top.
- **PPTX = Arial** body / Consolas metrics, Midnight Executive palette.
- **Locales:** en/fr/de/it everywhere strings are externalized.

---

## Sub-project A — Feature Simplification (full design)

### A1 · Sizing modes: 4 → 2

`SizingMode` becomes `'vcpu' | 'performance'`.

- **vcpu** (default): unchanged. `serverCountByCpu` — the vCPU:pCore ratio is the hard
  assignment-density cap.
- **performance** (merges the old `ghz` + `specint` modes): **GHz-primary, SPEC-optional.**
  - Default path: GHz ratio — old CPU frequency (from import) vs new CPU frequency
    (input) via `serverCountByGhz`.
  - Optional override: an "I have SPEC scores" toggle swaps in `serverCountBySpecint`
    (old + new SPECrate2017 scores).
  - Rationale: both express the refresh truth — newer/faster CPUs do more per core, so
    fewer are needed. GHz is the intuitive default; SPEC is the precise override.
- **Deleted:** `aggressive` mode and `serverCountByCpuAggressive` (+ its tests).
- `SizingModeToggle` renders 2 options. Mode is **not** auto-selected from data.

### A2 · Buffers: 7 fields → 2

**Removed `Scenario` fields:** `targetCpuUtilizationPercent`, `targetRamUtilizationPercent`,
`cpuGrowthPercent`, `memoryGrowthPercent`, `storageGrowthPercent`, `targetVmCount`.

**New two-knob model:**

- `growthPercent` — future workload growth (default `0`).
- `safetyPercent` — operational buffer, "don't run hot" (default `20`; replaces
  `headroomPercent`).

**Demand factor** applied uniformly across all constraint formulas:

```
demandFactor = (1 + growthPercent/100) × (1 + safetyPercent/100)
```

The target-util *division* terms are removed from the formulas entirely.

**Utilization is an OUTPUT, never a scenario input.** The `ScenarioResult` still computes
achieved CPU/RAM/disk utilization for display — you don't enter usage, the tool shows you
the resulting utilization.

### A3 · Utilization = required, blocking Step 1 input (the headroom fix)

Observed CPU and RAM utilization (% of allocated actually consumed) is an **explicit,
required** Step 1 input — **no 100% default**.

- Seeded from the import when LiveOptics/RVTools carries it.
- When absent, the user **must** enter a measured or explicitly estimated value before
  sizing runs (blocking validation). No silent assumption.
- Domain guidance shown inline: "Most environments run well below 100%. Stretch clusters
  often run <50% per site." When `isStretchCluster` is detected, the guidance/validation
  messaging reflects the lower expectation.
- Why blocking: defaulting to 100% over-sizes the cluster (RAM right-sizing and GHz CPU
  demand both scale by utilization), producing too many servers and a non-competitive
  offer. This is the core correctness fix behind the whole simplification.
- Note: both CPU and RAM utilization are required for an honest result. RAM utilization
  always affects the count; CPU utilization drives the count in `performance` mode and
  feeds the displayed achieved-utilization metric in `vcpu` mode. Requiring both keeps
  the output truthful regardless of mode.

### A4 · Smart seeding into Step 2

On entering Step 2, the first scenario is seeded from collected Step 1 figures rather than
dropping the user on bare defaults:

- From data: `ramPerVmGb`, `diskPerVmGb`, `socketsPerServer`, `coresPerSocket` (from
  import metadata), a sensible target server.
- Recommended defaults: `4:1` vCPU:pCore ratio, `0%` growth, `20%` safety.
- A one-line rationale banner: *"Seeded from your import: 4:1 mixed-workload ratio, 0%
  growth, 20% safety — adjust as needed."*
- Mode and layout keep their existing defaults (not auto-selected).

### A5 · Advanced disclosure

- **Core scenario card:** name · target server config (sockets/cores/RAM/disk) · ratio
  (or GHz/SPEC inputs by mode) · Growth % · Safety % · HA reserve.
- **Collapsed "Advanced" section:** vSAN settings, min-server pin.
- **Stretch cluster:** stays auto-detected from import and auto-doubles the count;
  surfaced as a read-only badge — no manual knob.
- Kept (not cut): vSAN, min-pin, stretch, HA reserve — all behind the disclosure or
  auto-driven, none deleted.

### A6 · Cleanup & migration

- Delete dropped fields from `Scenario` (`types/cluster.ts`), `scenarioSchema`,
  `defaults.ts`, the `TOOLTIPS` map, and remove `serverCountByCpuAggressive` + its tests.
- Update `constraints.ts` for the 2-mode selection and the `(1+growth)×(1+safety)` factor;
  remove target-util divisions; keep utilization outputs.
- **Persisted-session migration:** the localStorage + URL-hash schema changes shape.
  Bump the session schema version and map legacy scenarios forward:
  - `headroomPercent` → `safetyPercent`
  - dropped fields ignored
  - missing `growthPercent` → `0`
  So existing shared URLs and saved sessions still load.

### Data model (after A)

```ts
type SizingMode = 'vcpu' | 'performance'

interface Scenario {
  readonly id: string
  readonly name: string
  readonly socketsPerServer: number
  readonly coresPerSocket: number
  readonly ramPerServerGb: number
  readonly diskPerServerGb: number
  readonly targetVcpuToPCoreRatio: number   // vcpu mode
  readonly ramPerVmGb: number
  readonly diskPerVmGb: number
  readonly growthPercent: number            // NEW — default 0
  readonly safetyPercent: number            // RENAMED from headroomPercent — default 20
  readonly haReserveCount: 0 | 1 | 2
  // performance mode
  readonly targetCpuFrequencyGhz?: number   // GHz primary
  readonly targetSpecint?: number           // SPEC optional override
  // advanced (behind disclosure)
  readonly minServerCount?: number
  readonly vsanFttPolicy?: VsanFttPolicy
  readonly vsanCompressionFactor?: VsanCompressionFactor
  readonly vsanSlackPercent?: number
  readonly vsanCpuOverheadPercent?: number
  readonly vsanMemoryPerHostGb?: number
  readonly vsanVmSwapEnabled?: boolean
}

interface OldCluster {
  // ... existing demand fields ...
  readonly cpuUtilizationPercent: number    // now REQUIRED (was optional, defaulted 100)
  readonly ramUtilizationPercent: number    // now REQUIRED (was optional, defaulted 100)
  readonly isStretchCluster?: boolean
}
```

### Testing

- Remove `serverCountByCpuAggressive` tests; remove specint/ghz-as-separate-mode tests,
  fold into `performance`-mode tests.
- New tests: 2-mode selection, `(1+growth)×(1+safety)` demand factor, required-utilization
  blocking validation, smart-seeding output, legacy→new session migration.
- Keep the existing util-as-output assertions.

### Out of scope for A (handled in B–E)

Visual restyle, shadcn removal, ECharts, Biome, i18n. A is logic + form + schema only and
must leave the app shippable.

## Open questions

None blocking. B–E each get their own brainstorm before implementation.
