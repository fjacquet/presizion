# VM Drop Selection — Design Spec

- **Issue:** [#13 Drop selection](https://github.com/fjacquet/presizion/issues/13)
- **Date:** 2026-04-17
- **Status:** Approved for implementation planning

## 1. Problem

Presales engineers sizing a refreshed cluster sometimes need to exclude a
subset of source VMs from the calculation — decommissioned workloads, lab
VMs, powered-off services, test machines. Today the only filter is at the
scope (cluster) level. Individual VMs cannot be ignored short of editing
the source file by hand.

This spec adds per-VM exclusions on top of the existing scope filter,
applied transparently before `aggregateScopes` hands an `OldCluster` to
the rest of the app.

## 2. User-facing behavior

Exclusions are expressed as **rules**:

- **Name pattern** — comma-separated globs (e.g. `test-*,dev-??-*`).
- **Exact names** — newline-separated list pasted in by the user.
- **Power state toggle** — exclude VMs with `powerState === 'poweredOff'`.
  Disabled with a tooltip when the source lacks the column.
- **Manual overrides** — per-VM checkboxes in a virtualized review list.
  A manually excluded VM is always excluded; a manually included VM is
  never excluded even if a rule matches it.

Rules are global (one set per session). They apply to every scope the
user selects and recompute live.

The UI appears in two places:

1. As a second step inside the existing Import Preview modal (scope
   selection → VM exclusions → confirm).
2. As a collapsible card on Step 1 of the wizard, so users can adjust
   exclusions after confirming the import without re-uploading the file.

## 3. Architecture

### 3.1 Data flow

```
importFile()                        [existing]
  └→ parser
      ├→ rawByScope: Map<scope, ScopeData>          [existing]
      ├→ vmRowsByScope: Map<scope, VmRow[]>         [NEW, session-only]
      └→ detectedScopes, scopeLabels                [existing]

useImportStore             [extended with vmRowsByScope, session-only]
useExclusionsStore         [NEW, persisted to localStorage]

On any rule change or scope change:
  1. Read vmRowsByScope (if this session has it)
  2. applyExclusions(vmRowsByScope, rules) → filteredByScope + stats
  3. For each scope key, aggregateVmRows(filteredByScope[key]) produces
     the VM-derived fields (totalVcpus, totalVms, totalDiskGb,
     avgRamPerVmGb, vmCount). Merge with the ESX-derived fields from
     the original rawByScope.get(key) (socketsPerServer, totalPcores,
     ramPerServerGb, cpuUtilizationPercent, etc.) — those come from
     separate sheets (ESX Hosts, ESX Performance) and are not affected
     by VM exclusions.
  4. aggregateScopes(rawByScope', activeScope) → OldCluster
  5. useClusterStore.setCurrentCluster(...)

If no vmRowsByScope this session (post-reload, or .presizion.json loaded):
  - Skip steps 1–3
  - aggregateScopes operates on the persisted rawByScope
  - Rules UI shown as read-only badges; "Re-import to edit" hint
```

### 3.2 New types

`src/types/exclusions.ts`:

```ts
export interface ExclusionRules {
  namePattern: string
  exactNames: string[]
  excludePoweredOff: boolean
  manuallyExcluded: string[]
  manuallyIncluded: string[]
}

export const EMPTY_RULES: ExclusionRules = {
  namePattern: '',
  exactNames: [],
  excludePoweredOff: false,
  manuallyExcluded: [],
  manuallyIncluded: [],
}
```

`src/lib/utils/import/index.ts` (extended):

```ts
export interface VmRow {
  name: string
  scopeKey: string
  vcpus: number
  ramMib: number
  diskMib: number
  powerState?: 'poweredOn' | 'poweredOff' | 'suspended' | 'unknown'
}

export interface ClusterImportResult {
  // ... existing fields ...
  vmRowsByScope?: Map<string, VmRow[]>
}
```

### 3.3 New store

`src/store/useExclusionsStore.ts`:

```ts
interface ExclusionsState {
  rules: ExclusionRules
  setRules: (partial: Partial<ExclusionRules>) => void
  toggleManual: (vmName: string, kind: 'excluded' | 'included') => void
  reset: () => void
}
// Zustand persist, version: 1, localStorage key: 'presizion-exclusions-v1'.
// Unknown version → reset to EMPTY_RULES + toast.
```

### 3.4 Exclusion engine

`src/lib/utils/import/exclusions.ts` — pure functions, no React or
Zustand imports.

```ts
export function compileNamePattern(pattern: string): RegExp | null
// Comma-split, trim, escape regex metachars except `*` (→ `.*`) and
// `?` (→ `.`). Empty → null. Case-insensitive match. ReDoS-safe by
// construction (no nested quantifiers possible).

export function isExcluded(
  row: VmRow,
  rules: ExclusionRules,
  compiled: RegExp | null,
): boolean
// Short-circuits in order:
//   1. rules.manuallyIncluded.includes(row.name) → false (override wins)
//   2. rules.manuallyExcluded.includes(row.name) → true
//   3. compiled && compiled.test(row.name) → true
//   4. rules.exactNames.includes(row.name) → true
//   5. rules.excludePoweredOff && row.powerState === 'poweredOff' → true
//   else false

export interface ExclusionStats {
  totalVms: number
  excludedCount: number
  excludedByRule: { namePattern: number; powerState: number; manual: number }
}

export function applyExclusions(
  vmRowsByScope: Map<string, VmRow[]>,
  rules: ExclusionRules,
): { filteredByScope: Map<string, VmRow[]>; stats: ExclusionStats }

export function aggregateVmRows(rows: VmRow[]): Pick<
  ScopeData,
  'totalVcpus' | 'totalVms' | 'totalDiskGb' | 'avgRamPerVmGb' | 'vmCount'
>
// Only rebuilds the VM-derived fields. ESX host fields
// (socketsPerServer, totalPcores, ramPerServerGb, cpuUtilizationPercent,
// cpuFrequencyGhz, cpuModel, existingServerCount) come from the ESX
// Hosts / ESX Performance sheets and are unaffected by exclusions;
// they are merged back from the original rawByScope at the call site.
```

## 4. Parser changes

Minimal, per-parser:

| Parser | Change |
|---|---|
| `liveopticParser.ts` | Add `Power State` aliases. During `aggregate()`, push a `VmRow` per accepted (non-template) row into a `vmRowsByScope` map. Return it on `ClusterImportResult`. |
| `rvtoolsParser.ts` | Add `Powerstate` aliases on `vInfo`. Same push-per-row pattern. |
| `jsonParser.ts` | No change to the parser itself; v2 schema adds an optional `exclusions` block that the caller routes into `useExclusionsStore`. `vmRowsByScope` is always undefined for JSON imports. |

`ScopeData` and the rest of the existing shape are unchanged.

## 5. Persistence

### 5.1 localStorage

- `useExclusionsStore` persisted via Zustand middleware.
- `vmRowsByScope` **never** persisted — session-only state on
  `useImportStore`. Cleared on reload and on `clearImport()`.

### 5.2 JSON export

Extend `src/schemas/session.ts` to v2:

```ts
{
  version: 2,
  cluster: { ... },              // already post-exclusion aggregate
  scenarios: [ ... ],
  exclusions?: ExclusionRules    // optional; v1 files parse as EMPTY_RULES
}
```

v1 → v2 migration: inject `exclusions: undefined` (no data loss). v1
aggregates already reflect whatever filtering the user did at the
source level; the rules are orthogonal.

### 5.3 URL hash share

Extend the current hash scheme with an `exclusions` field:

```
#v=2&cluster=...&scenarios=...&exclusions=<base64(json(rules))>
```

If the encoded hash exceeds ~8 KB, truncate in this order:
`manuallyExcluded` → `exactNames`. Never truncate `namePattern`,
`excludePoweredOff`, `manuallyIncluded`. Recipient sees a toast when
truncation occurred, pointing them at the source file to reproduce
exactly.

Recipients load the persisted `cluster` aggregate (already
post-exclusion), see rules as read-only badges, and can plan
scenarios normally.

## 6. UI

### 6.1 `<VmExclusionPanel/>` (shared)

Single component used by both placements. Layout:

```
┌─ VM Exclusions ─────────────────────────────────┐
│ Name patterns  [test-*, dev-??-*           ]    │
│ Exact names    [                           ]    │
│                                                 │
│ [x] Exclude powered-off VMs                     │  (disabled + tooltip
│                                                 │   if no powerState)
│ ▼ Review 123 VMs individually (collapsed)       │
│   [search           ]  Show: all | excluded     │
│   (virtualized list; per-row checkbox)          │
│                                                 │
│ Excluded: 47 of 542 VMs                         │
│   · 35 by name pattern                          │
│   · 10 powered-off                              │
│   ·  2 manual                                   │
└─────────────────────────────────────────────────┘
```

- Virtualized list so ~5k rows remain interactive.
- Per-row tick writes either `manuallyExcluded` or `manuallyIncluded`
  depending on whether the row was already rule-excluded.

### 6.2 Placements

- **Import Preview modal** — becomes two-step: (1) scope, (2) exclusions.
  Back/Next/Confirm buttons.
- **Step 1 wizard** — `<ExclusionSummaryCard/>` below the cluster form.
  When `vmRowsByScope` is in session: summary + "Edit exclusions" button
  opens the panel in a dialog. When not: read-only rule badges + hint.

### 6.3 Manual-entry mode

Both placements hidden. The store keeps its rules but they're inert
until a file import populates `vmRowsByScope`.

## 7. Error handling & edge cases

| Case | Behavior |
|---|---|
| No rules set | `applyExclusions` returns rows unchanged, stats report 0. |
| All VMs excluded | `OldCluster` receives zero totals; existing sizing guards handle it. Warning callout rendered above Step 1 results. |
| Source lacks power state | Toggle disabled with tooltip. |
| `exactNames` name not in import | Silently ignored. |
| Manual-entry mode | UI hidden; store inert. |
| Post-reload | Rules frozen; UI shows "Re-import to edit" hint. |
| Scope change | `recomputeCluster` re-runs; rules are global and auto-reapply. |
| Glob compile | Empty → null. Whitespace stripped. Regex metachars escaped except `*` and `?`. |
| URL truncation | Drop `manuallyExcluded`, then `exactNames`. Toast on recipient. |
| JSON v1 → v2 | Migration injects `EMPTY_RULES`. |
| localStorage version drift | Unknown version → reset + toast. |

## 8. Security notes

- No user-facing regex. Glob-only grammar; no nested quantifiers means
  ReDoS is impossible by construction.
- Glob → regex via whitelist translator (explicit metachar escaping),
  not string interpolation.
- No `eval`, no `Function` constructor, no raw-HTML injection APIs —
  all rendering goes through React text interpolation.
- VM names rendered as React children (XSS-safe by default).
- Exclusion data is never transmitted; everything stays client-side.

## 9. Testing

### 9.1 New unit tests

- `src/lib/utils/import/__tests__/exclusions.test.ts`
  - `compileNamePattern`: empty, single glob, comma list, `?`
    wildcard, metachar escaping, whitespace trimming.
  - `isExcluded`: each rule in isolation, override precedence,
    short-circuit order.
  - `applyExclusions`: stats correctness, scope structure preserved,
    empty-rules identity.
  - `aggregateVmRows`: parity with existing parser `aggregate()` for
    identical input rows.

- `src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts`
  and RVTools equivalent:
  - `vmRowsByScope` shape and scope-key alignment with `rawByScope`.
  - Power-state column absent → `powerState === undefined`.

- `src/store/__tests__/useExclusionsStore.test.ts`
  - `setRules` partial merge, `toggleManual` semantics, `reset`,
    version-bump fallback.

- `src/components/__tests__/VmExclusionPanel.test.tsx`
  - Empty rules → 0 excluded.
  - Live count updates with pattern.
  - Power-state toggle disabled when no row has the field.
  - Per-row tick round-trips between include/exclude.
  - 5k-row virtualized list stays responsive.

- `src/lib/utils/__tests__/persistence.exclusions.test.ts`
  - JSON v1 → v2 migration.
  - URL hash round-trip; truncation path.

### 9.2 Updated tests

- `ImportPreviewModal.test.tsx` — add step-2 nav assertions.
- `exportJson.test.ts` — v2 schema round-trip.
- `persistence.test.ts` — localStorage key coverage.

### 9.3 Manual verification (in the impl plan)

- Dev server + LiveOptics xlsx, RVTools xlsx, CSV, JSON round-trip.
- Scope change after exclusions → totals recompute.
- Reload mid-session → rules frozen, badges visible.
- URL share to a fresh browser → reproduces aggregate.
- PPTX export after exclusions (aggregated + disaggregated modes).
- `npm run lint`, `tsc -b`, `npm run build` clean.

Target suite size: ~720–730 tests (from the current 665).

## 10. Documentation

### 10.1 New

- `docs/adr/ADR-021-vm-exclusion-rules-persistence.md` — captures the
  rules-only persistence decision, glob-over-regex rationale, and the
  post-reload frozen-rules behavior.

### 10.2 Updated

- `CHANGELOG.md` — `[Unreleased] ### Added` entry.
- `docs/prd.md` — VM exclusions in scope + user stories.
- `docs/architecture.md` — `useExclusionsStore`, `exclusions.ts`,
  `vmRowsByScope` session state.
- `docs/state-management.md` — store inventory addition + persistence
  rules.
- `docs/import-export.md` — JSON v2 schema, URL hash v2 format,
  power-state column aliases.
- `docs/userguide.md` — end-user walkthrough.
- `docs/testing.md` — new test files.
- `README.md` — one-line feature bullet.

## 11. Out of scope

- No VM exclusions for manual-entry mode (no VM list to exclude from).
- No regex support for name matching (glob only; avoids ReDoS).
- No attribute-based exclusions beyond name and power state (no
  resource-threshold filters, no folder/tag filters — explicitly
  rejected per Q2 answer).
- No persistence of the per-VM rows themselves — only rules travel
  across sessions, JSON files, and URL shares.

## 12. References

- Issue [#13](https://github.com/fjacquet/presizion/issues/13)
- Current import pipeline: `src/lib/utils/import/`
- Scope aggregation: `src/lib/utils/import/scopeAggregator.ts`
- Session schema: `src/schemas/session.ts`
- Import store: `src/store/useImportStore.ts`
