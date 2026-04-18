# VM Drop Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users exclude individual source VMs (by glob, exact name, power state, or per-row override) before the scope aggregate becomes `OldCluster`, persisting rules (not row data) across sessions, JSON exports, and shared URLs.

**Architecture:** Pure engine in `src/lib/utils/import/exclusions.ts` applies an `ExclusionRules` object to session-only `vmRowsByScope: Map<string, VmRow[]>` held on `useImportStore`, re-aggregating VM-derived fields (`totalVcpus`, `totalVms`, `totalDiskGb`, `avgRamPerVmGb`, `vmCount`) while preserving ESX host fields from the original `rawByScope`. A new persisted Zustand store `useExclusionsStore` holds the rules; a shared `<VmExclusionPanel/>` renders them inside the Import Preview modal and as a Step 1 collapsible. JSON schema bumps to v2, URL hash to v=2, both backward-compatible.

**Tech Stack:** React 19 + TS strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), Zustand v5 (`persist` middleware), Zod v4, Vitest 4 + RTL, recharts 3, existing `@e965/xlsx` parser, Sonner toasts. No new runtime dependency — virtualization is hand-rolled (windowed `map()` over a sliced array).

**Spec:** `docs/superpowers/specs/2026-04-17-vm-drop-selection-design.md`

---

## File Inventory

**New files:**
- `src/types/exclusions.ts` — `ExclusionRules`, `EMPTY_RULES`
- `src/lib/utils/import/exclusions.ts` — `compileNamePattern`, `isExcluded`, `applyExclusions`, `aggregateVmRows`, `ExclusionStats`
- `src/lib/utils/import/__tests__/exclusions.test.ts`
- `src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts`
- `src/lib/utils/import/__tests__/rvtoolsParser.exclusions.test.ts`
- `src/store/useExclusionsStore.ts`
- `src/store/__tests__/useExclusionsStore.test.ts`
- `src/hooks/useRecomputeCluster.ts` — single source of truth for applying rules → aggregate → `setCurrentCluster`
- `src/components/exclusions/VmExclusionPanel.tsx`
- `src/components/exclusions/ExclusionSummaryCard.tsx`
- `src/components/exclusions/VirtualizedVmList.tsx`
- `src/components/exclusions/__tests__/VmExclusionPanel.test.tsx`
- `src/components/exclusions/__tests__/VirtualizedVmList.test.tsx`
- `src/components/exclusions/__tests__/ExclusionSummaryCard.test.tsx`
- `src/lib/utils/__tests__/persistence.exclusions.test.ts`
- `docs/adr/ADR-021-vm-exclusion-rules-persistence.md`

**Modified files:**
- `src/lib/utils/import/index.ts` — add `VmRow`, extend `ClusterImportResult` with `vmRowsByScope`
- `src/lib/utils/import/columnResolver.ts` — add `power_state` aliases to `LIVEOPTICS_ALIASES` and `RVTOOLS_ALIASES`
- `src/lib/utils/import/liveopticParser.ts` — emit `vmRowsByScope` from `aggregate()`
- `src/lib/utils/import/rvtoolsParser.ts` — emit `vmRowsByScope` from vInfo loop
- `src/lib/utils/import/jsonParser.ts` — accept optional top-level `exclusions` block, expose via `JsonImportResult`
- `src/store/useImportStore.ts` — add session-only `vmRowsByScope`; replace inline aggregator body in `setActiveScope` with a call to `recomputeCluster()`
- `src/lib/utils/persistence.ts` — bump schema to v2 with optional `exclusions`; migrate v1 → v2
- `src/lib/utils/export.ts` — include `exclusions` block in `buildJsonContent`
- `src/main.tsx` — hydrate exclusions from hash/localStorage on boot
- `src/components/step1/ImportPreviewModal.tsx` — add step-2 (exclusions) before Apply
- `src/components/step1/Step1CurrentCluster.tsx` — render `<ExclusionSummaryCard/>`
- `docs/adr/` index, `docs/prd.md`, `docs/architecture.md`, `docs/state-management.md`, `docs/import-export.md`, `docs/userguide.md`, `docs/testing.md`, `README.md`, `CHANGELOG.md`

---

## Task 1: Types and constants

**Files:**
- Create: `src/types/exclusions.ts`

- [ ] **Step 1: Write the type module**

```ts
// src/types/exclusions.ts
export interface ExclusionRules {
  readonly namePattern: string
  readonly exactNames: readonly string[]
  readonly excludePoweredOff: boolean
  readonly manuallyExcluded: readonly string[]
  readonly manuallyIncluded: readonly string[]
}

export const EMPTY_RULES: ExclusionRules = {
  namePattern: '',
  exactNames: [],
  excludePoweredOff: false,
  manuallyExcluded: [],
  manuallyIncluded: [],
}

export type PowerState = 'poweredOn' | 'poweredOff' | 'suspended' | 'unknown'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: clean (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/exclusions.ts
git commit -m "feat(exclusions): add ExclusionRules type and EMPTY_RULES constant"
```

---

## Task 2: Extend `ClusterImportResult` with `VmRow` and `vmRowsByScope`

**Files:**
- Modify: `src/lib/utils/import/index.ts`

- [ ] **Step 1: Add `VmRow` type and extend the result**

Add at the top of the file (before the existing `ScopeData` line), keeping existing exports intact:

```ts
import type { PowerState } from '@/types/exclusions'

export interface VmRow {
  readonly name: string
  readonly scopeKey: string
  readonly vcpus: number
  readonly ramMib: number
  readonly diskMib: number
  readonly powerState?: PowerState
}
```

Extend `ClusterImportResult` — add the last optional field:

```ts
export interface ClusterImportResult {
  // ... existing fields unchanged ...
  cpuModel?: string
  detectedScopes?: string[]
  scopeLabels?: Record<string, string>
  rawByScope?: Map<string, ScopeData>
  /** Per-scope raw VM rows, session-only. Never persisted. Undefined for JSON imports. */
  vmRowsByScope?: Map<string, VmRow[]>
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: clean. `ScopeData = Omit<ClusterImportResult, ...>` still excludes the new field because `vmRowsByScope` is NOT included in the Omit list — add it:

```ts
export type ScopeData = Omit<ClusterImportResult, 'sourceFormat' | 'detectedScopes' | 'scopeLabels' | 'rawByScope' | 'vmRowsByScope'>
```

- [ ] **Step 3: Re-run typecheck, then commit**

```bash
git add src/lib/utils/import/index.ts
git commit -m "feat(exclusions): add VmRow and vmRowsByScope to ClusterImportResult"
```

---

## Task 3: Exclusion engine — `compileNamePattern`

**Files:**
- Create: `src/lib/utils/import/exclusions.ts`
- Create: `src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 1: Write failing tests for `compileNamePattern`**

```ts
// src/lib/utils/import/__tests__/exclusions.test.ts
import { describe, it, expect } from 'vitest'
import { compileNamePattern } from '../exclusions'

describe('compileNamePattern', () => {
  it('returns null for empty string', () => {
    expect(compileNamePattern('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(compileNamePattern('   ,  \n  ')).toBeNull()
  })

  it('compiles a single literal glob', () => {
    const re = compileNamePattern('test-*')
    expect(re).not.toBeNull()
    expect(re!.test('test-web01')).toBe(true)
    expect(re!.test('prod-web01')).toBe(false)
  })

  it('expands ? to a single-char wildcard', () => {
    const re = compileNamePattern('dev-??-*')!
    expect(re.test('dev-01-web')).toBe(true)
    expect(re.test('dev-1-web')).toBe(false)
  })

  it('matches any of a comma-separated list', () => {
    const re = compileNamePattern('test-*, stage-*')!
    expect(re.test('test-a')).toBe(true)
    expect(re.test('stage-b')).toBe(true)
    expect(re.test('prod-c')).toBe(false)
  })

  it('escapes regex metachars outside * and ?', () => {
    const re = compileNamePattern('web.prod+*')!
    expect(re.test('web.prod+01')).toBe(true)
    // "." must match only a literal dot, not any char
    expect(re.test('webXprod+01')).toBe(false)
  })

  it('is case-insensitive', () => {
    const re = compileNamePattern('TEST-*')!
    expect(re.test('test-01')).toBe(true)
  })

  it('anchors the whole string (no partial matches)', () => {
    const re = compileNamePattern('db-*')!
    expect(re.test('db-01')).toBe(true)
    expect(re.test('app-db-01')).toBe(false)
  })

  it('trims whitespace in comma list', () => {
    const re = compileNamePattern('  test-*  ,  dev-*  ')!
    expect(re.test('test-a')).toBe(true)
    expect(re.test('dev-a')).toBe(true)
  })

  it('ignores empty entries in comma list', () => {
    const re = compileNamePattern('test-*, , stage-*')!
    expect(re.test('test-a')).toBe(true)
    expect(re.test('stage-a')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: All tests FAIL — module not found.

- [ ] **Step 3: Implement `compileNamePattern`**

Create `src/lib/utils/import/exclusions.ts`:

```ts
import type { ExclusionRules } from '@/types/exclusions'
import type { VmRow, ScopeData } from './index'

/**
 * Compile a comma-separated glob list to a single anchored, case-insensitive RegExp.
 * Supports only `*` (→ `.*`) and `?` (→ `.`). All other regex metachars are escaped.
 * Returns null if no non-empty globs remain after trimming.
 * ReDoS-safe: produced regex has no nested quantifiers.
 */
export function compileNamePattern(pattern: string): RegExp | null {
  const globs = pattern
    .split(',')
    .map((g) => g.trim())
    .filter((g) => g.length > 0)
  if (globs.length === 0) return null

  const alternatives = globs.map(globToRegexSource)
  return new RegExp(`^(?:${alternatives.join('|')})$`, 'i')
}

function globToRegexSource(glob: string): string {
  let out = ''
  for (const ch of glob) {
    if (ch === '*') out += '.*'
    else if (ch === '?') out += '.'
    else out += escapeRegex(ch)
  }
  return out
}

function escapeRegex(ch: string): string {
  return /[.\\+^$()|[\]{}]/.test(ch) ? `\\${ch}` : ch
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/import/exclusions.ts src/lib/utils/import/__tests__/exclusions.test.ts
git commit -m "feat(exclusions): compileNamePattern with glob-to-regex translator"
```

---

## Task 4: Exclusion engine — `isExcluded` short-circuit order

**Files:**
- Modify: `src/lib/utils/import/exclusions.ts`
- Modify: `src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 1: Append failing tests for `isExcluded`**

Append to the existing test file:

```ts
import { isExcluded, compileNamePattern } from '../exclusions'
import type { VmRow } from '../index'
import { EMPTY_RULES } from '@/types/exclusions'

function row(name: string, extra: Partial<VmRow> = {}): VmRow {
  return { name, scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 40960, ...extra }
}

describe('isExcluded', () => {
  it('returns false when no rules match', () => {
    expect(isExcluded(row('web01'), EMPTY_RULES, null)).toBe(false)
  })

  it('excludes on pattern match', () => {
    const re = compileNamePattern('test-*')
    const rules = { ...EMPTY_RULES, namePattern: 'test-*' }
    expect(isExcluded(row('test-a'), rules, re)).toBe(true)
  })

  it('excludes on exact name match', () => {
    const rules = { ...EMPTY_RULES, exactNames: ['lab-vm'] }
    expect(isExcluded(row('lab-vm'), rules, null)).toBe(true)
    expect(isExcluded(row('prod-vm'), rules, null)).toBe(false)
  })

  it('excludes powered-off VMs when the flag is set', () => {
    const rules = { ...EMPTY_RULES, excludePoweredOff: true }
    expect(isExcluded(row('a', { powerState: 'poweredOff' }), rules, null)).toBe(true)
    expect(isExcluded(row('b', { powerState: 'poweredOn' }), rules, null)).toBe(false)
    expect(isExcluded(row('c'), rules, null)).toBe(false) // undefined → not excluded
  })

  it('manuallyIncluded overrides a pattern match', () => {
    const re = compileNamePattern('test-*')
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', manuallyIncluded: ['test-keep'] }
    expect(isExcluded(row('test-keep'), rules, re)).toBe(false)
    expect(isExcluded(row('test-other'), rules, re)).toBe(true)
  })

  it('manuallyIncluded overrides powered-off exclusion', () => {
    const rules = { ...EMPTY_RULES, excludePoweredOff: true, manuallyIncluded: ['keep'] }
    expect(isExcluded(row('keep', { powerState: 'poweredOff' }), rules, null)).toBe(false)
  })

  it('manuallyExcluded wins over no-rule match', () => {
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['drop'] }
    expect(isExcluded(row('drop'), rules, null)).toBe(true)
  })

  it('manuallyIncluded beats manuallyExcluded when both listed', () => {
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['x'], manuallyIncluded: ['x'] }
    expect(isExcluded(row('x'), rules, null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: new tests FAIL — `isExcluded` not exported.

- [ ] **Step 3: Implement `isExcluded`**

Append to `src/lib/utils/import/exclusions.ts`:

```ts
/**
 * Decide whether a VM row is excluded.
 * Short-circuit order (first match wins):
 *   1. manuallyIncluded → false (override wins over every rule)
 *   2. manuallyExcluded → true
 *   3. compiled name pattern → true
 *   4. exactNames includes row.name → true
 *   5. excludePoweredOff && row.powerState === 'poweredOff' → true
 *   else false
 */
export function isExcluded(
  row: VmRow,
  rules: ExclusionRules,
  compiled: RegExp | null,
): boolean {
  if (rules.manuallyIncluded.includes(row.name)) return false
  if (rules.manuallyExcluded.includes(row.name)) return true
  if (compiled !== null && compiled.test(row.name)) return true
  if (rules.exactNames.includes(row.name)) return true
  if (rules.excludePoweredOff && row.powerState === 'poweredOff') return true
  return false
}
```

- [ ] **Step 4: Run — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/import/exclusions.ts src/lib/utils/import/__tests__/exclusions.test.ts
git commit -m "feat(exclusions): isExcluded with override-wins short-circuit"
```

---

## Task 5: Exclusion engine — `applyExclusions` + stats

**Files:**
- Modify: `src/lib/utils/import/exclusions.ts`
- Modify: `src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { applyExclusions } from '../exclusions'

describe('applyExclusions', () => {
  const rows = (names: string[], extra: Partial<VmRow> = {}): VmRow[] =>
    names.map((n) => row(n, extra))

  it('returns input unchanged and zero stats when rules are empty', () => {
    const input = new Map<string, VmRow[]>([
      ['s1', rows(['a', 'b'])],
      ['s2', rows(['c'])],
    ])
    const { filteredByScope, stats } = applyExclusions(input, EMPTY_RULES)
    expect([...filteredByScope.get('s1')!].map((r) => r.name)).toEqual(['a', 'b'])
    expect([...filteredByScope.get('s2')!].map((r) => r.name)).toEqual(['c'])
    expect(stats.totalVms).toBe(3)
    expect(stats.excludedCount).toBe(0)
    expect(stats.excludedByRule).toEqual({ namePattern: 0, powerState: 0, manual: 0 })
  })

  it('preserves scope structure when all rows in a scope are excluded', () => {
    const input = new Map<string, VmRow[]>([
      ['s1', rows(['test-a', 'test-b'])],
      ['s2', rows(['prod-a'])],
    ])
    const rules = { ...EMPTY_RULES, namePattern: 'test-*' }
    const { filteredByScope, stats } = applyExclusions(input, rules)
    expect(filteredByScope.get('s1')).toEqual([])
    expect(filteredByScope.get('s2')!.map((r) => r.name)).toEqual(['prod-a'])
    expect(stats.totalVms).toBe(3)
    expect(stats.excludedCount).toBe(2)
    expect(stats.excludedByRule.namePattern).toBe(2)
  })

  it('attributes exclusions to the first matching rule in order', () => {
    // A row matching both pattern and manuallyExcluded counts as manual (override wins before pattern)
    const input = new Map<string, VmRow[]>([
      ['s1', rows(['test-a', 'test-b'])],
    ])
    const rules = {
      ...EMPTY_RULES,
      namePattern: 'test-*',
      manuallyExcluded: ['test-a'],
    }
    const { stats } = applyExclusions(input, rules)
    expect(stats.excludedByRule.manual).toBe(1)
    expect(stats.excludedByRule.namePattern).toBe(1)
  })

  it('counts power-state exclusions separately', () => {
    const input = new Map<string, VmRow[]>([
      ['s1', [row('a', { powerState: 'poweredOff' }), row('b', { powerState: 'poweredOn' })]],
    ])
    const rules = { ...EMPTY_RULES, excludePoweredOff: true }
    const { stats } = applyExclusions(input, rules)
    expect(stats.excludedByRule.powerState).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: new tests FAIL.

- [ ] **Step 3: Implement `applyExclusions`**

Append to `src/lib/utils/import/exclusions.ts`:

```ts
export interface ExclusionStats {
  readonly totalVms: number
  readonly excludedCount: number
  readonly excludedByRule: {
    readonly namePattern: number
    readonly powerState: number
    readonly manual: number
  }
}

/**
 * Apply rules to each scope and return filtered rows plus per-rule exclusion counts.
 * A row is attributed to the first matching rule in short-circuit order:
 *   manual (includes/excludes) → namePattern → exactNames (counted as namePattern) → powerState.
 */
export function applyExclusions(
  vmRowsByScope: Map<string, VmRow[]>,
  rules: ExclusionRules,
): { filteredByScope: Map<string, VmRow[]>; stats: ExclusionStats } {
  const compiled = compileNamePattern(rules.namePattern)
  const filteredByScope = new Map<string, VmRow[]>()

  let totalVms = 0
  let byPattern = 0
  let byPower = 0
  let byManual = 0

  for (const [scopeKey, rows] of vmRowsByScope) {
    const kept: VmRow[] = []
    for (const row of rows) {
      totalVms++
      if (rules.manuallyIncluded.includes(row.name)) {
        kept.push(row)
        continue
      }
      if (rules.manuallyExcluded.includes(row.name)) {
        byManual++
        continue
      }
      if (compiled !== null && compiled.test(row.name)) {
        byPattern++
        continue
      }
      if (rules.exactNames.includes(row.name)) {
        byPattern++
        continue
      }
      if (rules.excludePoweredOff && row.powerState === 'poweredOff') {
        byPower++
        continue
      }
      kept.push(row)
    }
    filteredByScope.set(scopeKey, kept)
  }

  return {
    filteredByScope,
    stats: {
      totalVms,
      excludedCount: byPattern + byPower + byManual,
      excludedByRule: { namePattern: byPattern, powerState: byPower, manual: byManual },
    },
  }
}
```

- [ ] **Step 4: Run — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/import/exclusions.ts src/lib/utils/import/__tests__/exclusions.test.ts
git commit -m "feat(exclusions): applyExclusions with per-rule stats attribution"
```

---

## Task 6: Exclusion engine — `aggregateVmRows`

**Files:**
- Modify: `src/lib/utils/import/exclusions.ts`
- Modify: `src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { aggregateVmRows } from '../exclusions'

describe('aggregateVmRows', () => {
  it('returns zeros for empty array', () => {
    expect(aggregateVmRows([])).toEqual({
      totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0,
    })
  })

  it('sums vcpus and disk, averages RAM', () => {
    const input: VmRow[] = [
      { name: 'a', scopeKey: 's', vcpus: 4, ramMib: 8192, diskMib: 102400 },
      { name: 'b', scopeKey: 's', vcpus: 2, ramMib: 4096, diskMib: 51200 },
    ]
    const out = aggregateVmRows(input)
    expect(out.totalVcpus).toBe(6)
    expect(out.totalVms).toBe(2)
    expect(out.vmCount).toBe(2)
    // Disk: (102400 + 51200) MiB = 150 GB (rounded to 1 decimal)
    expect(out.totalDiskGb).toBe(150)
    // RAM: (8192 + 4096) / 2 / 1024 = 6 GB
    expect(out.avgRamPerVmGb).toBe(6)
  })

  it('rounds disk and RAM to 1 decimal', () => {
    const input: VmRow[] = [
      { name: 'a', scopeKey: 's', vcpus: 1, ramMib: 1000, diskMib: 1536 },
    ]
    const out = aggregateVmRows(input)
    expect(out.totalDiskGb).toBe(1.5)
    expect(out.avgRamPerVmGb).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 3: Implement `aggregateVmRows`**

Append to `src/lib/utils/import/exclusions.ts`:

```ts
/**
 * Re-aggregate VM-derived fields from a row array.
 * Returns only the VM-derived subset; ESX host fields (socketsPerServer, totalPcores,
 * ramPerServerGb, cpuUtilizationPercent, etc.) are unaffected by exclusions and must be
 * merged back from the original rawByScope at the call site.
 *
 * Parity target: the per-scope `aggregate()` output in liveopticParser/rvtoolsParser
 * for identical input rows.
 */
export function aggregateVmRows(
  rows: readonly VmRow[],
): Pick<ScopeData, 'totalVcpus' | 'totalVms' | 'totalDiskGb' | 'avgRamPerVmGb' | 'vmCount'> {
  if (rows.length === 0) {
    return { totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0 }
  }
  let totalVcpus = 0
  let totalMemMib = 0
  let totalDiskMib = 0
  for (const r of rows) {
    totalVcpus += r.vcpus
    totalMemMib += r.ramMib
    totalDiskMib += r.diskMib
  }
  const vmCount = rows.length
  return {
    totalVcpus,
    totalVms: vmCount,
    totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
    avgRamPerVmGb: Math.round((totalMemMib / vmCount / 1024) * 10) / 10,
    vmCount,
  }
}
```

- [ ] **Step 4: Run — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/exclusions.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/import/exclusions.ts src/lib/utils/import/__tests__/exclusions.test.ts
git commit -m "feat(exclusions): aggregateVmRows for VM-derived ScopeData fields"
```

---

## Task 7: LiveOptics parser emits `vmRowsByScope`

**Files:**
- Modify: `src/lib/utils/import/columnResolver.ts`
- Modify: `src/lib/utils/import/liveopticParser.ts`
- Create: `src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts`

- [ ] **Step 1: Add `power_state` alias**

Edit `LIVEOPTICS_ALIASES` in `columnResolver.ts`:

```ts
export const LIVEOPTICS_ALIASES: ColumnAliasMap = {
  vm_name: ['VM Name'],
  num_cpus: ['Virtual CPU', 'vCPU', 'CPUs'],
  memory_mib: ['Provisioned Memory (MiB)', 'Memory (MiB)', 'Memory MB'],
  provisioned_mib: ['Virtual Disk Size (MiB)'],
  is_template: ['Template'],
  power_state: ['Power State', 'Power', 'PowerState'],
}
```

- [ ] **Step 2: Write failing test asserting `vmRowsByScope` is emitted**

Create `src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseLiveoptics } from '../liveopticParser'

function csvBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

describe('parseLiveoptics — vmRowsByScope', () => {
  it('emits one VmRow per non-template VM, scoped by datacenter||cluster', async () => {
    const csv = [
      'VM Name,Virtual CPU,Provisioned Memory (MiB),Virtual Disk Size (MiB),Template,Cluster,Datacenter,Power State',
      'web01,4,8192,102400,false,prod-cl,dc1,poweredOn',
      'tmpl01,4,8192,102400,true,prod-cl,dc1,poweredOff',
      'db01,8,16384,204800,false,prod-cl,dc1,poweredOff',
      'lab01,2,4096,51200,false,lab-cl,dc1,poweredOn',
    ].join('\n')
    const result = await parseLiveoptics(csvBuffer(csv), 'liveoptics-csv')
    expect(result.vmRowsByScope).toBeDefined()
    const prod = result.vmRowsByScope!.get('dc1||prod-cl')
    expect(prod).toBeDefined()
    expect(prod!.map((r) => r.name)).toEqual(['web01', 'db01'])
    expect(prod![0]).toMatchObject({
      name: 'web01', vcpus: 4, ramMib: 8192, diskMib: 102400, powerState: 'poweredOn',
    })
    expect(prod![1]!.powerState).toBe('poweredOff')
    const lab = result.vmRowsByScope!.get('dc1||lab-cl')
    expect(lab!.map((r) => r.name)).toEqual(['lab01'])
  })

  it('leaves powerState undefined when the column is missing', async () => {
    const csv = [
      'VM Name,Virtual CPU,Provisioned Memory (MiB),Virtual Disk Size (MiB),Template,Cluster,Datacenter',
      'web01,4,8192,102400,false,cl1,dc1',
    ].join('\n')
    const result = await parseLiveoptics(csvBuffer(csv), 'liveoptics-csv')
    const row = result.vmRowsByScope!.get('dc1||cl1')![0]!
    expect(row.powerState).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts`
Expected: `result.vmRowsByScope` is undefined.

- [ ] **Step 4: Emit `vmRowsByScope` from `aggregate()`**

Edit `src/lib/utils/import/liveopticParser.ts`:

- After `import { ImportError } from './fileValidation'`, add:

```ts
import type { VmRow } from './index'
import type { PowerState } from '@/types/exclusions'

function parsePowerState(raw: string): PowerState | undefined {
  const s = raw.toLowerCase().replace(/\s+/g, '')
  if (s === 'poweredon' || s === 'on') return 'poweredOn'
  if (s === 'poweredoff' || s === 'off') return 'poweredOff'
  if (s === 'suspended') return 'suspended'
  if (s === '') return undefined
  return 'unknown'
}
```

- In `aggregate()`, declare a per-scope row collector before the loop (alongside `scopeMap`):

```ts
const vmRowsByScope = new Map<string, VmRow[]>()
const hasPowerStateCol = colMap['power_state'] !== undefined
```

- Inside the `for (const row of rows)` loop, right before the `existing = scopeMap.get(...)` block (so template rows are excluded), append:

```ts
const vmName = str(row, colMap['vm_name'])
const powerStateRaw = hasPowerStateCol ? str(row, colMap['power_state']) : ''
const powerState = hasPowerStateCol ? parsePowerState(powerStateRaw) : undefined
const vmRow: VmRow = {
  name: vmName,
  scopeKey,
  vcpus: cpus,
  ramMib: mem,
  diskMib: disk,
  ...(powerState !== undefined && { powerState }),
}
const existingRows = vmRowsByScope.get(scopeKey) ?? []
existingRows.push(vmRow)
vmRowsByScope.set(scopeKey, existingRows)
```

- Return `vmRowsByScope` on the result:

```ts
return {
  result: {
    totalVcpus,
    totalVms: vmCount,
    totalDiskGb: Math.round((totalDiskMib / 1024) * 10) / 10,
    avgRamPerVmGb: vmCount > 0 ? Math.round((totalMemMib / vmCount / 1024) * 10) / 10 : 0,
    vmCount,
    warnings,
    detectedScopes,
    scopeLabels,
    rawByScope,
    vmRowsByScope,
  },
  hostToCluster,
}
```

Also update the early-return empty shape at the top of `aggregate()` to include `vmRowsByScope: new Map()`.

- [ ] **Step 5: Run parser test suite — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/liveopticParser`
Expected: all existing parser tests still pass AND the new two tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/import/columnResolver.ts src/lib/utils/import/liveopticParser.ts src/lib/utils/import/__tests__/liveopticParser.exclusions.test.ts
git commit -m "feat(exclusions): liveoptics parser emits vmRowsByScope with power state"
```

---

## Task 8: RVTools parser emits `vmRowsByScope`

**Files:**
- Modify: `src/lib/utils/import/columnResolver.ts`
- Modify: `src/lib/utils/import/rvtoolsParser.ts`
- Create: `src/lib/utils/import/__tests__/rvtoolsParser.exclusions.test.ts`

- [ ] **Step 1: Add `power_state` alias for RVTools**

```ts
export const RVTOOLS_ALIASES: ColumnAliasMap = {
  vm_name: ['VM', 'VM Name'],
  num_cpus: ['CPUs', 'Num CPUs', 'vCPUs'],
  memory_mib: ['Memory', 'Memory MB', 'Memory MiB'],
  provisioned_mib: ['Provisioned MB', 'Provisioned MiB'],
  is_template: ['Template'],
  power_state: ['Powerstate', 'Power State', 'Power'],
}
```

- [ ] **Step 2: Write failing test**

Create `src/lib/utils/import/__tests__/rvtoolsParser.exclusions.test.ts`. Use the same `@e965/xlsx` module the parser imports to build a fixture workbook; the existing `rvtoolsParser.test.ts` in the repo already contains a helper you can mirror. Minimum assertion:

```ts
import { describe, it, expect } from 'vitest'
import * as XLSX from '@e965/xlsx'
import { parseRvtools } from '../rvtoolsParser'

function buildXlsx(vInfo: Record<string, unknown>[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vInfo), 'vInfo')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return out
}

describe('parseRvtools — vmRowsByScope', () => {
  it('emits one VmRow per non-template VM with powerState', async () => {
    const buf = buildXlsx([
      { VM: 'web01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOn' },
      { VM: 'tmpl01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: true, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOff' },
      { VM: 'db01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOff' },
    ])
    const result = await parseRvtools(buf)
    const prod = result.vmRowsByScope!.get('dc1||prod-cl')!
    expect(prod.map((r) => r.name)).toEqual(['web01', 'db01'])
    expect(prod[0]!.powerState).toBe('poweredOn')
    expect(prod[1]!.powerState).toBe('poweredOff')
  })

  it('leaves powerState undefined when Powerstate column is absent', async () => {
    const buf = buildXlsx([
      { VM: 'web01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'cl1', Datacenter: 'dc1' },
    ])
    const result = await parseRvtools(buf)
    const row = result.vmRowsByScope!.get('dc1||cl1')![0]!
    expect(row.powerState).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/rvtoolsParser.exclusions.test.ts`

- [ ] **Step 4: Implement row emission in `parseRvtools`**

In `src/lib/utils/import/rvtoolsParser.ts`:

- Add imports at top:

```ts
import type { VmRow } from './index'
import type { PowerState } from '@/types/exclusions'

function parsePowerState(raw: string): PowerState | undefined {
  const s = raw.toLowerCase().replace(/\s+/g, '')
  if (s === 'poweredon' || s === 'on') return 'poweredOn'
  if (s === 'poweredoff' || s === 'off') return 'poweredOff'
  if (s === 'suspended') return 'suspended'
  if (s === '') return undefined
  return 'unknown'
}
```

- Before the `for (const row of rows)` loop declare:

```ts
const vmRowsByScope = new Map<string, VmRow[]>()
const hasPowerStateCol = colMap['power_state'] !== undefined
```

- Inside the loop, after the `if (isTruthy(row, colMap['is_template'])) continue` and after scopeKey is computed, append (before the `existing = scopeMap.get...` block):

```ts
const vmName = str(row, colMap['vm_name'])
const powerStateRaw = hasPowerStateCol ? str(row, colMap['power_state']) : ''
const powerState = hasPowerStateCol ? parsePowerState(powerStateRaw) : undefined
const vmRow: VmRow = {
  name: vmName,
  scopeKey,
  vcpus: cpus,
  ramMib: mem,
  diskMib: disk,
  ...(powerState !== undefined && { powerState }),
}
const existingRows = vmRowsByScope.get(scopeKey) ?? []
existingRows.push(vmRow)
vmRowsByScope.set(scopeKey, existingRows)
```

- Add `vmRowsByScope` to the final `result` object before the vHost block:

```ts
const result: Omit<ClusterImportResult, 'sourceFormat'> = {
  // ... existing fields ...
  rawByScope,
  vmRowsByScope,
}
```

- Update the early empty-rows return path to include `vmRowsByScope: new Map()`.

- [ ] **Step 5: Run parser suite — expect all pass**

Run: `rtk npx vitest run src/lib/utils/import/__tests__/rvtoolsParser`

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/import/columnResolver.ts src/lib/utils/import/rvtoolsParser.ts src/lib/utils/import/__tests__/rvtoolsParser.exclusions.test.ts
git commit -m "feat(exclusions): rvtools parser emits vmRowsByScope with power state"
```

---

## Task 9: `useExclusionsStore` (persisted)

**Files:**
- Create: `src/store/useExclusionsStore.ts`
- Create: `src/store/__tests__/useExclusionsStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/store/__tests__/useExclusionsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useExclusionsStore } from '../useExclusionsStore'
import { EMPTY_RULES } from '@/types/exclusions'

const STORAGE_KEY = 'presizion-exclusions-v1'

describe('useExclusionsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useExclusionsStore.getState().reset()
  })

  it('starts with EMPTY_RULES', () => {
    expect(useExclusionsStore.getState().rules).toEqual(EMPTY_RULES)
  })

  it('setRules partially merges', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    expect(useExclusionsStore.getState().rules.namePattern).toBe('test-*')
    expect(useExclusionsStore.getState().rules.excludePoweredOff).toBe(false)
  })

  it('toggleManual adds a name to manuallyExcluded and removes from manuallyIncluded', () => {
    useExclusionsStore.getState().setRules({ manuallyIncluded: ['vm-a'] })
    useExclusionsStore.getState().toggleManual('vm-a', 'excluded')
    const rules = useExclusionsStore.getState().rules
    expect(rules.manuallyExcluded).toContain('vm-a')
    expect(rules.manuallyIncluded).not.toContain('vm-a')
  })

  it('toggleManual removes the entry when it already matches the target state', () => {
    useExclusionsStore.getState().setRules({ manuallyExcluded: ['vm-a'] })
    useExclusionsStore.getState().toggleManual('vm-a', 'excluded')
    expect(useExclusionsStore.getState().rules.manuallyExcluded).not.toContain('vm-a')
  })

  it('reset restores EMPTY_RULES', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*', manuallyExcluded: ['x'] })
    useExclusionsStore.getState().reset()
    expect(useExclusionsStore.getState().rules).toEqual(EMPTY_RULES)
  })

  it('persists to localStorage under presizion-exclusions-v1', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).state.rules.namePattern).toBe('test-*')
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/store/__tests__/useExclusionsStore.test.ts`

- [ ] **Step 3: Implement the store**

```ts
// src/store/useExclusionsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExclusionRules } from '@/types/exclusions'
import { EMPTY_RULES } from '@/types/exclusions'

interface ExclusionsState {
  rules: ExclusionRules
  setRules: (partial: Partial<ExclusionRules>) => void
  toggleManual: (vmName: string, kind: 'excluded' | 'included') => void
  reset: () => void
}

export const useExclusionsStore = create<ExclusionsState>()(
  persist(
    (set, get) => ({
      rules: EMPTY_RULES,
      setRules: (partial) => {
        set({ rules: { ...get().rules, ...partial } })
      },
      toggleManual: (vmName, kind) => {
        const rules = get().rules
        const listKey = kind === 'excluded' ? 'manuallyExcluded' : 'manuallyIncluded'
        const otherKey = kind === 'excluded' ? 'manuallyIncluded' : 'manuallyExcluded'
        const list = rules[listKey]
        const other = rules[otherKey]
        const isOn = list.includes(vmName)
        set({
          rules: {
            ...rules,
            [listKey]: isOn ? list.filter((n) => n !== vmName) : [...list, vmName],
            [otherKey]: other.filter((n) => n !== vmName),
          },
        })
      },
      reset: () => set({ rules: EMPTY_RULES }),
    }),
    {
      name: 'presizion-exclusions-v1',
      version: 1,
      migrate: (persistedState, version) => {
        if (version !== 1) return { rules: EMPTY_RULES }
        return persistedState as ExclusionsState
      },
    },
  ),
)
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `rtk npx vitest run src/store/__tests__/useExclusionsStore.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/store/useExclusionsStore.ts src/store/__tests__/useExclusionsStore.test.ts
git commit -m "feat(exclusions): add persisted useExclusionsStore with migration"
```

---

## Task 10: `useImportStore` carries session-only `vmRowsByScope` + `recomputeCluster()`

**Files:**
- Modify: `src/store/useImportStore.ts`
- Create: `src/hooks/useRecomputeCluster.ts`

- [ ] **Step 1: Add `vmRowsByScope` to `useImportStore` state**

Replace the file contents of `src/store/useImportStore.ts`:

```ts
import { create } from 'zustand'
import type { OldCluster } from '../types/cluster'
import type { ScopeData, VmRow } from '@/lib/utils/import'
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator'
import { useClusterStore } from './useClusterStore'
import { useExclusionsStore } from './useExclusionsStore'
import { applyExclusions, aggregateVmRows } from '@/lib/utils/import/exclusions'

interface ImportState {
  rawByScope: Map<string, ScopeData> | null
  vmRowsByScope: Map<string, VmRow[]> | null
  scopeLabels: Record<string, string>
  activeScope: string[]
  scopeOptions: string[]
  setImportBuffer: (
    rawByScope: Map<string, ScopeData>,
    scopeLabels: Record<string, string>,
    activeScope: string[],
    vmRowsByScope?: Map<string, VmRow[]> | undefined,
  ) => void
  setActiveScope: (scope: string[]) => void
  recomputeCluster: () => void
  clearImport: () => void
}

export const useImportStore = create<ImportState>((set, get) => ({
  rawByScope: null,
  vmRowsByScope: null,
  scopeLabels: {},
  activeScope: [],
  scopeOptions: [],

  setImportBuffer: (rawByScope, scopeLabels, activeScope, vmRowsByScope) => {
    set({
      rawByScope,
      vmRowsByScope: vmRowsByScope ?? null,
      scopeLabels,
      activeScope,
      scopeOptions: [...rawByScope.keys()],
    })
    get().recomputeCluster()
  },

  setActiveScope: (scope) => {
    if (get().rawByScope == null) return
    set({ activeScope: scope })
    get().recomputeCluster()
  },

  recomputeCluster: () => {
    const { rawByScope, vmRowsByScope, activeScope } = get()
    if (rawByScope == null) return

    // Re-aggregate VM-derived fields from filtered rows when we have them this session.
    let effectiveRawByScope = rawByScope
    if (vmRowsByScope != null) {
      const rules = useExclusionsStore.getState().rules
      const { filteredByScope } = applyExclusions(vmRowsByScope, rules)
      effectiveRawByScope = new Map(rawByScope)
      for (const [key, original] of rawByScope) {
        const filteredRows = filteredByScope.get(key) ?? []
        const vmDerived = aggregateVmRows(filteredRows)
        // Preserve ESX host fields; overwrite VM-derived fields only.
        effectiveRawByScope.set(key, { ...original, ...vmDerived })
      }
    }

    const aggregate = aggregateScopes(effectiveRawByScope, activeScope)
    const cluster: OldCluster = {
      totalVcpus: aggregate.totalVcpus,
      totalPcores: aggregate.totalPcores ?? 0,
      totalVms: aggregate.totalVms,
      ...(aggregate.totalDiskGb != null && { totalDiskGb: aggregate.totalDiskGb }),
      ...(aggregate.existingServerCount != null && { existingServerCount: aggregate.existingServerCount }),
      ...(aggregate.socketsPerServer != null && { socketsPerServer: aggregate.socketsPerServer }),
      ...(aggregate.coresPerSocket != null && { coresPerSocket: aggregate.coresPerSocket }),
      ...(aggregate.ramPerServerGb != null && { ramPerServerGb: aggregate.ramPerServerGb }),
      ...(aggregate.cpuUtilizationPercent != null && { cpuUtilizationPercent: aggregate.cpuUtilizationPercent }),
      ...(aggregate.ramUtilizationPercent != null && { ramUtilizationPercent: aggregate.ramUtilizationPercent }),
      ...(aggregate.avgRamPerVmGb != null && { avgRamPerVmGb: aggregate.avgRamPerVmGb }),
      ...(aggregate.cpuModel != null && { cpuModel: aggregate.cpuModel }),
      ...(aggregate.cpuFrequencyGhz != null && { cpuFrequencyGhz: aggregate.cpuFrequencyGhz }),
    }
    useClusterStore.getState().setCurrentCluster(cluster)
  },

  clearImport: () => set({
    rawByScope: null,
    vmRowsByScope: null,
    scopeLabels: {},
    activeScope: [],
    scopeOptions: [],
  }),
}))
```

- [ ] **Step 2: Create `useRecomputeCluster` hook**

```ts
// src/hooks/useRecomputeCluster.ts
import { useEffect } from 'react'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'

/**
 * Subscribes to rule changes and re-runs the exclusion → aggregate → setCurrentCluster
 * pipeline on the import store. Call once near the top of the app so rule edits
 * in the UI propagate immediately to Step 1's current cluster snapshot.
 */
export function useRecomputeCluster(): void {
  useEffect(() => {
    return useExclusionsStore.subscribe(() => {
      useImportStore.getState().recomputeCluster()
    })
  }, [])
}
```

- [ ] **Step 3: Typecheck + run import store tests**

```bash
rtk npx tsc -b --noEmit
rtk npx vitest run src/store
```
Expected: clean. (Existing `useImportStore.test.ts` — if any — should still pass because `setActiveScope` and `clearImport` keep their contracts.)

- [ ] **Step 4: Commit**

```bash
git add src/store/useImportStore.ts src/hooks/useRecomputeCluster.ts
git commit -m "feat(exclusions): import store carries vmRowsByScope, recomputeCluster hook"
```

---

## Task 11: JSON schema v2 — read and write

**Files:**
- Modify: `src/lib/utils/export.ts`
- Modify: `src/lib/utils/import/jsonParser.ts`
- Create: `src/lib/utils/__tests__/persistence.exclusions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/utils/__tests__/persistence.exclusions.test.ts
import { describe, it, expect } from 'vitest'
import { buildJsonContent } from '../export'
import { parsePresizionJson } from '../import/jsonParser'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import { EMPTY_RULES } from '@/types/exclusions'

const cluster: OldCluster = { totalVcpus: 100, totalPcores: 50, totalVms: 20 }
const scenarios: Scenario[] = []
const results: ScenarioResult[] = []

function toBuffer(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer
}

describe('JSON schema v2 exclusions round-trip', () => {
  it('emits schemaVersion 2 with exclusions block when rules non-empty', () => {
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', excludePoweredOff: true }
    const json = buildJsonContent(cluster, scenarios, results, rules)
    const parsed = JSON.parse(json)
    expect(parsed.schemaVersion).toBe('2')
    expect(parsed.exclusions).toEqual(rules)
  })

  it('omits exclusions block when rules are EMPTY_RULES', () => {
    const json = buildJsonContent(cluster, scenarios, results, EMPTY_RULES)
    expect(JSON.parse(json).exclusions).toBeUndefined()
  })

  it('reads exclusions back from a v2 export', () => {
    const rules = { ...EMPTY_RULES, exactNames: ['lab-a', 'lab-b'] }
    const json = buildJsonContent(cluster, scenarios, results, rules)
    const result = parsePresizionJson(toBuffer(json))
    expect(result.exclusions).toEqual(rules)
  })

  it('v1 files parse with exclusions undefined (no error)', () => {
    const v1 = JSON.stringify({
      schemaVersion: '1.1',
      currentCluster: { totalVcpus: 10, totalPcores: 5, totalVms: 2 },
      scenarios: [],
    })
    const result = parsePresizionJson(toBuffer(v1))
    expect(result.exclusions).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/__tests__/persistence.exclusions.test.ts`

- [ ] **Step 3: Extend `buildJsonContent` to accept rules**

Edit `src/lib/utils/export.ts`:

```ts
import type { ExclusionRules } from '@/types/exclusions'
import { EMPTY_RULES } from '@/types/exclusions'

export function buildJsonContent(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  exclusions: ExclusionRules = EMPTY_RULES,
): string {
  const isEmpty =
    exclusions.namePattern === '' &&
    exclusions.exactNames.length === 0 &&
    !exclusions.excludePoweredOff &&
    exclusions.manuallyExcluded.length === 0 &&
    exclusions.manuallyIncluded.length === 0

  const payload = {
    schemaVersion: '2',
    generatedAt: new Date().toISOString(),
    currentCluster: normaliseCluster(cluster),
    scenarios: scenarios.map((s, i) => ({ ...s, result: results[i] ?? null })),
    ...(isEmpty ? {} : { exclusions }),
  }
  return JSON.stringify(payload, null, 2)
}
```

Find all existing callers of `buildJsonContent` (`rtk grep -rn "buildJsonContent("` in `src/`) and pass the exclusions rules at each site. Callers that don't have the store handy pass nothing (defaults to `EMPTY_RULES`).

- [ ] **Step 4: Parse `exclusions` in `parsePresizionJson`**

Edit `src/lib/utils/import/jsonParser.ts`:

- Extend result:

```ts
import type { ExclusionRules } from '@/types/exclusions'

export interface JsonImportResult {
  sourceFormat: 'presizion-json'
  cluster: OldCluster
  scenarios: Scenario[]
  exclusions?: ExclusionRules
}
```

- Inside `parsePresizionJson`, after the `parsedScenarios` array is built, append:

```ts
const exclusions = parseExclusionsBlock((parsed as Record<string, unknown>).exclusions)

return {
  sourceFormat: 'presizion-json',
  cluster,
  scenarios: parsedScenarios,
  ...(exclusions !== undefined && { exclusions }),
}
```

- Add the helper at the bottom of the file:

```ts
function parseExclusionsBlock(raw: unknown): ExclusionRules | undefined {
  if (raw == null || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const stringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  return {
    namePattern: typeof r.namePattern === 'string' ? r.namePattern : '',
    exactNames: stringArray(r.exactNames),
    excludePoweredOff: r.excludePoweredOff === true,
    manuallyExcluded: stringArray(r.manuallyExcluded),
    manuallyIncluded: stringArray(r.manuallyIncluded),
  }
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
rtk npx vitest run src/lib/utils/__tests__/persistence.exclusions.test.ts
rtk npx vitest run src/lib/utils/__tests__/export.test.ts
```

If `export.test.ts` has a `schemaVersion: '1.1'` assertion, update it to `'2'`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/export.ts src/lib/utils/import/jsonParser.ts src/lib/utils/__tests__/persistence.exclusions.test.ts
git commit -m "feat(exclusions): JSON schema v2 with optional exclusions block"
```

---

## Task 12: URL hash v2 with truncation

**Files:**
- Modify: `src/lib/utils/persistence.ts`
- Modify: `src/lib/utils/__tests__/persistence.exclusions.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { encodeSessionToHash, decodeSessionFromHash } from '../persistence'

describe('URL hash v2 — exclusions', () => {
  const session = {
    cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20 },
    scenarios: [],
    sizingMode: 'vcpu' as const,
    layoutMode: 'hci' as const,
  }

  it('round-trips empty exclusions', () => {
    const hash = encodeSessionToHash({ ...session, exclusions: EMPTY_RULES })
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions).toEqual(EMPTY_RULES)
  })

  it('round-trips populated exclusions', () => {
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', excludePoweredOff: true }
    const hash = encodeSessionToHash({ ...session, exclusions: rules })
    expect(decodeSessionFromHash(hash)!.exclusions).toEqual(rules)
  })

  it('drops manuallyExcluded first when over 8 KB', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `vm-${i}`)
    const rules = { ...EMPTY_RULES, manuallyExcluded: huge, exactNames: ['keep'] }
    const hash = encodeSessionToHash({ ...session, exclusions: rules })
    expect(hash.length).toBeLessThanOrEqual(8192)
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions!.manuallyExcluded).toEqual([])
    expect(decoded.exclusions!.exactNames).toEqual(['keep'])
    expect(decoded.truncated).toBe(true)
  })

  it('drops exactNames next when still over 8 KB without manuallyExcluded', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `lab-${i}`)
    const rules = { ...EMPTY_RULES, exactNames: huge, namePattern: 'test-*' }
    const hash = encodeSessionToHash({ ...session, exclusions: rules })
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions!.namePattern).toBe('test-*')
    expect(decoded.exclusions!.exactNames).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/lib/utils/__tests__/persistence.exclusions.test.ts`

- [ ] **Step 3: Extend `SessionData` and encoder/decoder**

Edit `src/lib/utils/persistence.ts`:

```ts
import type { ExclusionRules } from '@/types/exclusions'

const HASH_MAX_BYTES = 8192

export interface SessionData {
  cluster: OldCluster
  scenarios: Scenario[]
  sizingMode: SizingMode
  layoutMode: LayoutMode
  exclusions?: ExclusionRules
  /** Set by decodeSessionFromHash when hash-size truncation dropped rules. */
  truncated?: boolean
}
```

Extend the Zod schema:

```ts
const exclusionsSchema = z.object({
  namePattern: z.string().default(''),
  exactNames: z.array(z.string()).default([]),
  excludePoweredOff: z.boolean().default(false),
  manuallyExcluded: z.array(z.string()).default([]),
  manuallyIncluded: z.array(z.string()).default([]),
}).optional()

const sessionSchema = z.object({
  cluster: currentClusterSchema,
  scenarios: z.array(scenarioSchema),
  sizingMode: z.enum(['vcpu', 'specint', 'aggressive', 'ghz']).default('vcpu'),
  layoutMode: z.enum(['hci', 'disaggregated']).default('hci'),
  exclusions: exclusionsSchema,
  truncated: z.boolean().optional(),
})
```

Replace `encodeSessionToHash`:

```ts
export function encodeSessionToHash(data: SessionData): string {
  // Order: try full → drop manuallyExcluded → drop exactNames → drop exclusions entirely
  const attempts: Array<(d: SessionData) => SessionData> = [
    (d) => d,
    (d) => d.exclusions
      ? { ...d, exclusions: { ...d.exclusions, manuallyExcluded: [] } }
      : d,
    (d) => d.exclusions
      ? { ...d, exclusions: { ...d.exclusions, manuallyExcluded: [], exactNames: [] } }
      : d,
    (d) => { const { exclusions: _, ...rest } = d; return rest as SessionData },
  ]
  for (const transform of attempts) {
    const encoded = encodeInner(transform(data))
    if (encoded.length <= HASH_MAX_BYTES) return encoded
  }
  // Last resort: return whatever the most-trimmed attempt produced
  return encodeInner(attempts[attempts.length - 1]!(data))
}

function encodeInner(data: SessionData): string {
  const json = serializeSession(data)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
```

Patch `decodeSessionFromHash` to surface a `truncated` flag when the decoded exclusions diverge from what the encoder would roundtrip — pragmatically: mark `truncated` when `decoded.exclusions` is present but either `manuallyExcluded` or `exactNames` is empty while `manuallyIncluded`/`namePattern`/`excludePoweredOff` indicate a trimmed payload. Simpler and sufficient for the test above:

```ts
export function decodeSessionFromHash(hash: string): SessionData | null {
  try {
    const stripped = hash.startsWith('#') ? hash.slice(1) : hash
    if (!stripped) return null
    const base64 = stripped.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const data = deserializeSession(json)
    if (data == null) return data
    // The encoder keeps `truncated` only when it explicitly trimmed; re-assert here
    // so callers can display a toast without having to re-derive truth.
    return data
  } catch {
    return null
  }
}
```

Re-encode callers: the tests above assert `decoded.truncated === true` after a large payload. To satisfy that, have `encodeSessionToHash` serialize `truncated: true` into the payload on any attempt beyond the first:

```ts
for (let i = 0; i < attempts.length; i++) {
  const transform = attempts[i]!
  const trimmed = transform(data)
  const payload: SessionData = i === 0 ? trimmed : { ...trimmed, truncated: true }
  const encoded = encodeInner(payload)
  if (encoded.length <= HASH_MAX_BYTES) return encoded
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
rtk npx vitest run src/lib/utils/__tests__/persistence.exclusions.test.ts
rtk npx vitest run src/lib/utils/__tests__/persistence.test.ts
```

If `persistence.test.ts` asserts exact byte-for-byte encoder output, update expectations to include the new optional field.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/persistence.ts src/lib/utils/__tests__/persistence.exclusions.test.ts
git commit -m "feat(exclusions): URL hash v2 with truncation order + decoder flag"
```

---

## Task 13: Boot — hydrate exclusions from hash/localStorage

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Hydrate rules on boot and show truncation toast**

Edit `src/main.tsx`:

```ts
import { loadFromLocalStorage, decodeSessionFromHash, saveToLocalStorage } from './lib/utils/persistence'
import { useClusterStore } from './store/useClusterStore'
import { useScenariosStore } from './store/useScenariosStore'
import { useWizardStore } from './store/useWizardStore'
import { useExclusionsStore } from './store/useExclusionsStore'
import { toast } from 'sonner'

const hashSession = decodeSessionFromHash(window.location.hash)
const saved = hashSession ?? loadFromLocalStorage()

if (saved) {
  useClusterStore.getState().setCurrentCluster(saved.cluster)
  useScenariosStore.getState().setScenarios(saved.scenarios)
  useWizardStore.getState().setSizingMode(saved.sizingMode)
  useWizardStore.getState().setLayoutMode(saved.layoutMode)
  if (saved.exclusions) {
    useExclusionsStore.getState().setRules(saved.exclusions)
  }
  if (saved.truncated) {
    // Defer until after React mounts so Sonner's Toaster exists.
    queueMicrotask(() => {
      toast.warning(
        'Some exclusion rules were trimmed from the shared URL due to size. Re-import the source file to reproduce exact per-VM selections.',
      )
    })
  }
}

if (hashSession) {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

const saveSession = () => {
  saveToLocalStorage({
    cluster: useClusterStore.getState().currentCluster,
    scenarios: useScenariosStore.getState().scenarios,
    sizingMode: useWizardStore.getState().sizingMode,
    layoutMode: useWizardStore.getState().layoutMode,
    exclusions: useExclusionsStore.getState().rules,
  })
}
useClusterStore.subscribe(saveSession)
useScenariosStore.subscribe(saveSession)
useWizardStore.subscribe(saveSession)
useExclusionsStore.subscribe(saveSession)
```

- [ ] **Step 2: Update `encodeSessionToHash` callers to include rules**

Find callers (`rtk grep -rn "encodeSessionToHash(" src/`) and pass `exclusions: useExclusionsStore.getState().rules` in each payload.

- [ ] **Step 3: Typecheck + run test suite**

```bash
rtk npx tsc -b --noEmit
rtk npm run test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/components/step3/Step3ReviewExport.tsx
git commit -m "feat(exclusions): hydrate rules on boot, surface URL-hash truncation toast"
```

---

## Task 14: `<VirtualizedVmList/>` — lean windowed list

**Files:**
- Create: `src/components/exclusions/VirtualizedVmList.tsx`
- Create: `src/components/exclusions/__tests__/VirtualizedVmList.test.tsx`

A minimal windowed list with fixed row height, container-scroll buffer of `overscan` rows. No external library.

- [ ] **Step 1: Write failing test for rendered-row subset**

```tsx
// src/components/exclusions/__tests__/VirtualizedVmList.test.tsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VirtualizedVmList } from '../VirtualizedVmList'
import type { VmRow } from '@/lib/utils/import'

const rows: VmRow[] = Array.from({ length: 2000 }, (_, i) => ({
  name: `vm-${i}`, scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 40960,
}))

describe('VirtualizedVmList', () => {
  it('renders fewer DOM rows than input', () => {
    render(
      <VirtualizedVmList
        rows={rows}
        excludedNames={new Set()}
        onToggle={() => {}}
        height={400}
        rowHeight={32}
      />
    )
    const rendered = screen.getAllByRole('checkbox')
    expect(rendered.length).toBeLessThan(100) // ~12 visible + overscan
    expect(rendered.length).toBeGreaterThan(0)
  })

  it('marks row as excluded when the name is in excludedNames', () => {
    render(
      <VirtualizedVmList
        rows={rows.slice(0, 10)}
        excludedNames={new Set(['vm-3'])}
        onToggle={() => {}}
        height={400}
        rowHeight={32}
      />
    )
    const cb = screen.getByRole('checkbox', { name: /vm-3/ }) as HTMLInputElement
    expect(cb.checked).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/components/exclusions/__tests__/VirtualizedVmList.test.tsx`

- [ ] **Step 3: Implement `VirtualizedVmList`**

```tsx
// src/components/exclusions/VirtualizedVmList.tsx
import { useRef, useState, useMemo } from 'react'
import type { VmRow } from '@/lib/utils/import'
import { Checkbox } from '@/components/ui/checkbox'

interface VirtualizedVmListProps {
  readonly rows: readonly VmRow[]
  readonly excludedNames: ReadonlySet<string>
  readonly onToggle: (name: string) => void
  readonly height: number
  readonly rowHeight: number
  readonly overscan?: number
}

export function VirtualizedVmList({
  rows,
  excludedNames,
  onToggle,
  height,
  rowHeight,
  overscan = 6,
}: VirtualizedVmListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const { start, end, padTop, padBottom } = useMemo(() => {
    const visible = Math.ceil(height / rowHeight)
    const s = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const e = Math.min(rows.length, s + visible + overscan * 2)
    return {
      start: s,
      end: e,
      padTop: s * rowHeight,
      padBottom: (rows.length - e) * rowHeight,
    }
  }, [scrollTop, height, rowHeight, overscan, rows.length])

  const slice = rows.slice(start, end)

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="overflow-y-auto border rounded"
      style={{ height }}
      role="list"
    >
      <div style={{ height: padTop }} aria-hidden />
      {slice.map((row) => (
        <label
          key={row.name}
          className="flex items-center gap-2 px-2 text-sm"
          style={{ height: rowHeight }}
          role="listitem"
        >
          <Checkbox
            checked={excludedNames.has(row.name)}
            onCheckedChange={() => onToggle(row.name)}
            aria-label={row.name}
          />
          <span className="truncate">{row.name}</span>
          {row.powerState === 'poweredOff' && (
            <span className="text-xs text-muted-foreground">(off)</span>
          )}
        </label>
      ))}
      <div style={{ height: padBottom }} aria-hidden />
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `rtk npx vitest run src/components/exclusions/__tests__/VirtualizedVmList.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/exclusions/VirtualizedVmList.tsx src/components/exclusions/__tests__/VirtualizedVmList.test.tsx
git commit -m "feat(exclusions): hand-rolled virtualized VM list"
```

---

## Task 15: `<VmExclusionPanel/>` shared component

**Files:**
- Create: `src/components/exclusions/VmExclusionPanel.tsx`
- Create: `src/components/exclusions/__tests__/VmExclusionPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/exclusions/__tests__/VmExclusionPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { VmExclusionPanel } from '../VmExclusionPanel'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import type { VmRow } from '@/lib/utils/import'

const rows: VmRow[] = [
  { name: 'web01', scopeKey: 's1', vcpus: 4, ramMib: 8192, diskMib: 102400, powerState: 'poweredOn' },
  { name: 'test-a', scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 51200, powerState: 'poweredOn' },
  { name: 'test-b', scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 51200, powerState: 'poweredOff' },
]

describe('VmExclusionPanel', () => {
  beforeEach(() => {
    useExclusionsStore.getState().reset()
  })

  it('shows 0 excluded with empty rules', () => {
    render(<VmExclusionPanel rows={rows} />)
    expect(screen.getByText(/Excluded: 0 of 3/)).toBeInTheDocument()
  })

  it('updates counts live when namePattern changes', () => {
    render(<VmExclusionPanel rows={rows} />)
    const input = screen.getByLabelText(/Name patterns/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test-*' } })
    expect(screen.getByText(/Excluded: 2 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/2 by name pattern/)).toBeInTheDocument()
  })

  it('disables power-state toggle when no row has powerState', () => {
    const rowsNoPower = rows.map((r) => ({ ...r, powerState: undefined }))
    render(<VmExclusionPanel rows={rowsNoPower} />)
    const cb = screen.getByRole('checkbox', { name: /Exclude powered-off/i })
    expect(cb).toBeDisabled()
  })

  it('round-trips a per-row tick between exclude and include', () => {
    render(<VmExclusionPanel rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: /Review 3 VMs individually/i }))
    const webCb = screen.getByRole('checkbox', { name: 'web01' }) as HTMLInputElement
    expect(webCb.checked).toBe(false)
    fireEvent.click(webCb)
    expect(useExclusionsStore.getState().rules.manuallyExcluded).toContain('web01')
    fireEvent.click(webCb)
    expect(useExclusionsStore.getState().rules.manuallyExcluded).not.toContain('web01')
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/components/exclusions/__tests__/VmExclusionPanel.test.tsx`

- [ ] **Step 3: Implement `VmExclusionPanel`**

```tsx
// src/components/exclusions/VmExclusionPanel.tsx
import { useMemo, useState } from 'react'
import type { VmRow } from '@/lib/utils/import'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { applyExclusions } from '@/lib/utils/import/exclusions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { VirtualizedVmList } from './VirtualizedVmList'

interface VmExclusionPanelProps {
  readonly rows: readonly VmRow[]
}

export function VmExclusionPanel({ rows }: VmExclusionPanelProps) {
  const rules = useExclusionsStore((s) => s.rules)
  const setRules = useExclusionsStore((s) => s.setRules)
  const toggleManual = useExclusionsStore((s) => s.toggleManual)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showOnlyExcluded, setShowOnlyExcluded] = useState(false)

  const hasPowerState = rows.some((r) => r.powerState !== undefined)

  const { filtered, stats } = useMemo(() => {
    const grouped = new Map<string, VmRow[]>([['__all__', [...rows]]])
    const { filteredByScope, stats } = applyExclusions(grouped, rules)
    return { filtered: filteredByScope.get('__all__') ?? [], stats }
  }, [rows, rules])

  const excludedNames = useMemo(() => {
    const keep = new Set(filtered.map((r) => r.name))
    return new Set(rows.filter((r) => !keep.has(r.name)).map((r) => r.name))
  }, [rows, filtered])

  const listedRows = useMemo(() => {
    let list = rows
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (showOnlyExcluded) list = list.filter((r) => excludedNames.has(r.name))
    return list
  }, [rows, search, showOnlyExcluded, excludedNames])

  const handleRowToggle = (name: string) => {
    const kind = excludedNames.has(name) ? 'included' : 'excluded'
    toggleManual(name, kind)
  }

  return (
    <div className="space-y-3 border rounded-md p-3">
      <h3 className="text-sm font-medium">VM Exclusions</h3>

      <div className="grid gap-2">
        <label className="text-xs font-medium">
          Name patterns
          <Input
            aria-label="Name patterns"
            value={rules.namePattern}
            onChange={(e) => setRules({ namePattern: e.target.value })}
            placeholder="test-*, dev-??-*"
          />
        </label>
        <label className="text-xs font-medium">
          Exact names
          <Textarea
            aria-label="Exact names"
            value={rules.exactNames.join('\n')}
            onChange={(e) => setRules({
              exactNames: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            })}
            rows={3}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label="Exclude powered-off VMs"
            checked={rules.excludePoweredOff}
            disabled={!hasPowerState}
            onCheckedChange={(c) => setRules({ excludePoweredOff: c === true })}
          />
          Exclude powered-off VMs
          {!hasPowerState && (
            <span className="text-xs text-muted-foreground">
              (power state not available in source file)
            </span>
          )}
        </label>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setReviewOpen((v) => !v)}
      >
        {reviewOpen ? 'Hide' : 'Review'} {rows.length} VMs individually
      </Button>

      {reviewOpen && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search VM names"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-1 text-xs">
              <Checkbox
                checked={showOnlyExcluded}
                onCheckedChange={(c) => setShowOnlyExcluded(c === true)}
              />
              Excluded only
            </label>
          </div>
          <VirtualizedVmList
            rows={listedRows}
            excludedNames={excludedNames}
            onToggle={handleRowToggle}
            height={240}
            rowHeight={32}
          />
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Excluded: {stats.excludedCount} of {stats.totalVms} VMs</p>
        <ul className="list-disc pl-5">
          <li>{stats.excludedByRule.namePattern} by name pattern</li>
          <li>{stats.excludedByRule.powerState} powered-off</li>
          <li>{stats.excludedByRule.manual} manual</li>
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `rtk npx vitest run src/components/exclusions/__tests__/VmExclusionPanel.test.tsx`

If the `textarea` / `input` shadcn component paths differ, confirm via `rtk ls src/components/ui/`. Create a `Textarea` wrapper if one does not yet exist (copy the standard shadcn pattern already used by other inputs).

- [ ] **Step 5: Commit**

```bash
git add src/components/exclusions/VmExclusionPanel.tsx src/components/exclusions/__tests__/VmExclusionPanel.test.tsx
git commit -m "feat(exclusions): VmExclusionPanel with live stats and per-row overrides"
```

---

## Task 16: `<ExclusionSummaryCard/>` for Step 1

**Files:**
- Create: `src/components/exclusions/ExclusionSummaryCard.tsx`
- Create: `src/components/exclusions/__tests__/ExclusionSummaryCard.test.tsx`
- Modify: `src/components/step1/Step1CurrentCluster.tsx`

- [ ] **Step 1: Failing test — read-only badges when no vmRows this session**

```tsx
// src/components/exclusions/__tests__/ExclusionSummaryCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ExclusionSummaryCard } from '../ExclusionSummaryCard'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'

describe('ExclusionSummaryCard', () => {
  beforeEach(() => {
    useExclusionsStore.getState().reset()
    useImportStore.getState().clearImport()
  })

  it('renders nothing when no rules and no session rows', () => {
    const { container } = render(<ExclusionSummaryCard />)
    expect(container.firstChild).toBeNull()
  })

  it('shows read-only badges when rules exist but no vmRowsByScope this session', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    render(<ExclusionSummaryCard />)
    expect(screen.getByText(/Pattern/i)).toBeInTheDocument()
    expect(screen.getByText(/Re-import to edit/i)).toBeInTheDocument()
  })

  it('shows Edit button when vmRowsByScope is present', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    // Inject minimal session rows
    useImportStore.setState({
      rawByScope: new Map(),
      vmRowsByScope: new Map([['__all__', [{ name: 'a', scopeKey: '__all__', vcpus: 1, ramMib: 1024, diskMib: 1024 }]]]),
      activeScope: ['__all__'],
    })
    render(<ExclusionSummaryCard />)
    expect(screen.getByRole('button', { name: /Edit exclusions/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect failures**

Run: `rtk npx vitest run src/components/exclusions/__tests__/ExclusionSummaryCard.test.tsx`

- [ ] **Step 3: Implement `ExclusionSummaryCard`**

```tsx
// src/components/exclusions/ExclusionSummaryCard.tsx
import { useState, useMemo } from 'react'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@base-ui/react/dialog'
import { VmExclusionPanel } from './VmExclusionPanel'

export function ExclusionSummaryCard() {
  const rules = useExclusionsStore((s) => s.rules)
  const vmRowsByScope = useImportStore((s) => s.vmRowsByScope)
  const activeScope = useImportStore((s) => s.activeScope)
  const [open, setOpen] = useState(false)

  const hasAnyRule =
    rules.namePattern !== '' ||
    rules.exactNames.length > 0 ||
    rules.excludePoweredOff ||
    rules.manuallyExcluded.length > 0 ||
    rules.manuallyIncluded.length > 0

  const activeRows = useMemo(() => {
    if (vmRowsByScope == null) return null
    const scopes = activeScope.length > 0 ? activeScope : [...vmRowsByScope.keys()]
    return scopes.flatMap((k) => vmRowsByScope.get(k) ?? [])
  }, [vmRowsByScope, activeScope])

  if (!hasAnyRule && activeRows == null) return null

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">VM Exclusions</h3>
        {activeRows != null ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Edit exclusions
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Re-import source file to edit</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {rules.namePattern && <Badge variant="outline">Pattern: {rules.namePattern}</Badge>}
        {rules.exactNames.length > 0 && (
          <Badge variant="outline">Exact names: {rules.exactNames.length}</Badge>
        )}
        {rules.excludePoweredOff && <Badge variant="outline">Powered-off</Badge>}
        {rules.manuallyExcluded.length > 0 && (
          <Badge variant="outline">Manual excludes: {rules.manuallyExcluded.length}</Badge>
        )}
        {rules.manuallyIncluded.length > 0 && (
          <Badge variant="outline">Manual keeps: {rules.manuallyIncluded.length}</Badge>
        )}
      </div>
      {open && activeRows != null && (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6 w-full max-w-lg">
              <Dialog.Title className="text-lg font-semibold mb-2">Edit VM Exclusions</Dialog.Title>
              <VmExclusionPanel rows={activeRows} />
              <div className="flex justify-end mt-3">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Insert the card on Step 1**

Edit `src/components/step1/Step1CurrentCluster.tsx`:

```tsx
import { CurrentClusterForm } from './CurrentClusterForm'
import { DerivedMetricsPanel } from './DerivedMetricsPanel'
import { FileImportButton } from './FileImportButton'
import { ScopeBadge } from './ScopeBadge'
import { ExclusionSummaryCard } from '@/components/exclusions/ExclusionSummaryCard'
import { useRecomputeCluster } from '@/hooks/useRecomputeCluster'
import { useWizardStore } from '@/store/useWizardStore'

export function Step1CurrentCluster() {
  const nextStep = useWizardStore((s) => s.nextStep)
  useRecomputeCluster()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 1: Enter Current Cluster</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your existing cluster metrics. Required fields are marked.
          </p>
        </div>
        <FileImportButton />
      </div>
      <ScopeBadge />
      <ExclusionSummaryCard />
      <CurrentClusterForm onNext={nextStep} />
      <DerivedMetricsPanel />
    </div>
  )
}
```

- [ ] **Step 5: Run suite — expect all pass**

```bash
rtk npm run test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/exclusions/ExclusionSummaryCard.tsx src/components/exclusions/__tests__/ExclusionSummaryCard.test.tsx src/components/step1/Step1CurrentCluster.tsx
git commit -m "feat(exclusions): Step 1 summary card with edit dialog"
```

---

## Task 17: Import Preview modal — step-2 exclusions

**Files:**
- Modify: `src/components/step1/ImportPreviewModal.tsx`
- Modify: `src/components/step1/__tests__/ImportPreviewModal.test.tsx`

- [ ] **Step 1: Add failing test for 2-step nav**

Append to the existing `ImportPreviewModal.test.tsx`:

```tsx
it('shows a second step with VmExclusionPanel after clicking Next in multi-VM imports', () => {
  const result = {
    sourceFormat: 'liveoptics-csv' as const,
    // ... minimal valid multi-scope result with vmRowsByScope ...
    totalVcpus: 4, totalVms: 2, totalDiskGb: 10, avgRamPerVmGb: 4, vmCount: 2,
    warnings: [], detectedScopes: ['s1'], scopeLabels: { s1: 'S1' },
    rawByScope: new Map([['s1', {
      totalVcpus: 4, totalVms: 2, totalDiskGb: 10, avgRamPerVmGb: 4, vmCount: 2, warnings: [],
    }]]),
    vmRowsByScope: new Map([['s1', [
      { name: 'a', scopeKey: 's1', vcpus: 2, ramMib: 2048, diskMib: 5120 },
      { name: 'b', scopeKey: 's1', vcpus: 2, ramMib: 2048, diskMib: 5120 },
    ]]]),
  }
  render(<ImportPreviewModal result={result} open onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Next/i }))
  expect(screen.getByText(/VM Exclusions/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect failure**

Run: `rtk npx vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx`

- [ ] **Step 3: Add a step state to the modal**

In `ImportPreviewModal.tsx`:

- Add `import { VmExclusionPanel } from '@/components/exclusions/VmExclusionPanel'`.
- Add `const [step, setStep] = useState<'scope' | 'exclusions'>('scope')`.
- Reset step on new `result`: in the `if (prevResult !== result)` block, call `setStep('scope')`.
- Compute `canShowExclusions = !isJson && 'vmRowsByScope' in result && result.vmRowsByScope != null`.
- In `handleApply`, pass `vmRowsByScope` to `setImportBuffer`:

```ts
if (result.rawByScope != null && result.detectedScopes != null && result.scopeLabels != null) {
  setImportBuffer(
    result.rawByScope,
    result.scopeLabels,
    selectedScopes,
    'vmRowsByScope' in result ? result.vmRowsByScope : undefined,
  )
}
```

- Replace the `sharedContent` rendering with a step-aware block:

```tsx
const exclusionRows = useMemo(() => {
  if (!canShowExclusions) return []
  const map = result.vmRowsByScope!
  const keys = selectedScopes.length > 0 ? selectedScopes : [...map.keys()]
  return keys.flatMap((k) => map.get(k) ?? [])
}, [canShowExclusions, result, selectedScopes])

// render:
{step === 'scope' ? sharedContent : <VmExclusionPanel rows={exclusionRows} />}
```

- Update the footer buttons to reflect step state (desktop + drawer variants):

```tsx
<div className="flex gap-3 justify-end">
  <Button variant="outline" onClick={onClose}>Cancel</Button>
  {step === 'scope' && canShowExclusions ? (
    <Button onClick={() => setStep('exclusions')}>Next</Button>
  ) : step === 'exclusions' ? (
    <>
      <Button variant="outline" onClick={() => setStep('scope')}>Back</Button>
      <Button onClick={handleApply}>Apply</Button>
    </>
  ) : (
    <Button onClick={handleApply}>Apply</Button>
  )}
</div>
```

- [ ] **Step 4: Run tests**

```bash
rtk npx vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/step1/ImportPreviewModal.tsx src/components/step1/__tests__/ImportPreviewModal.test.tsx
git commit -m "feat(exclusions): import preview modal adds exclusions step"
```

---

## Task 18: End-to-end smoke — full sizing suite + manual browser check

- [ ] **Step 1: Full suite + build**

```bash
rtk npm run lint
rtk npm run test
rtk npm run build
```
Expected: lint clean, all tests pass (target ~720+ tests), production build succeeds.

- [ ] **Step 2: Dev server manual verification**

```bash
rtk npm run dev
```

Verify in-browser:

1. Import the LiveOptics fixture `public/sample-data/…xlsx` (or the project's known-good file). Modal shows step 1 (scope).
2. Click **Next** → VM Exclusions panel. Type `test-*` in Name patterns; watch excluded count update live.
3. Open **Review N VMs individually**; tick a row; confirm counter shifts from "name pattern" → "manual" as expected.
4. Click **Apply**; land on Step 1 — confirm the summary card shows your rules as badges plus an **Edit exclusions** button.
5. Change scope (if multi-scope file) and confirm derived metrics update.
6. Advance to Step 3. Verify:
   - CSV export round-trips current numbers.
   - JSON export contains `"schemaVersion": "2"` and the `exclusions` block.
   - **Share URL** → open in a private window; confirm aggregate matches and badges appear read-only with the "Re-import to edit" hint.
   - PDF export renders.
   - PPTX export renders in both `hci` and `disaggregated` layout modes.
7. Reload the page. Rules remain (badges), but `Edit exclusions` is replaced by **Re-import to edit** (session rows are gone).
8. Import a file **without** a power-state column. Confirm the "Exclude powered-off VMs" toggle is disabled with the tooltip.
9. In Exclusions, toggle **everything** until the cluster hits zero VMs. Confirm Step 1 still renders and Step 3 shows the expected guard UI (no crash).

- [ ] **Step 3: If anything fails in Step 2, open a follow-up task rather than modifying scope inline.** No commit for a clean pass.

---

## Task 19: ADR + docs updates

**Files:**
- Create: `docs/adr/ADR-021-vm-exclusion-rules-persistence.md`
- Modify: `CHANGELOG.md`, `docs/prd.md`, `docs/architecture.md`, `docs/state-management.md`, `docs/import-export.md`, `docs/userguide.md`, `docs/testing.md`, `README.md`

- [ ] **Step 1: Write ADR-021**

```markdown
# ADR-021: VM exclusion rules persist, raw rows do not

## Status
Accepted — 2026-04-17

## Context
Issue #13 requires letting users exclude individual VMs from the sizing
calculation. Possible approaches ranged from storing filtered aggregates
(no round-trip) to persisting every VM row (no URL-hash support at scale).

## Decision
Persist only the `ExclusionRules` object (globs + exact names + flags +
manual overrides) in localStorage, JSON exports, and URL hashes.
Raw per-VM rows stay session-only on `useImportStore`, discarded on
reload. Post-reload the rules UI is read-only; users re-import to edit.

## Rationale
- URL hashes have an ~8 KB ceiling; VM rows at enterprise scale exceed it
  by orders of magnitude.
- Rules express intent and are forward-compatible with re-imports of a
  fresher source file — e.g. after a month, re-importing applies the
  same `test-*` pattern without manual recreation.
- Aggregates already reflect the post-exclusion snapshot, so sharing or
  reload still reproduces the sizing numbers.

## Consequences
- (+) Small persisted payload; scales to clusters of any size.
- (+) Rules can be shared and re-applied to a newer source file.
- (-) Users who reload mid-session cannot tweak per-row overrides
      without re-importing.
- (-) `manuallyExcluded` / `manuallyIncluded` lists grow with user
      input; URL hash encoder truncates them when over budget.

## Related decisions
- Glob-over-regex for `namePattern` — ReDoS-safe by construction.
- JSON schema v2 adds an optional `exclusions` block; v1 files migrate
  in by injecting `EMPTY_RULES`.
```

- [ ] **Step 2: Update docs**

For each doc, append a brief section (≤150 words each):

- `docs/prd.md` — add to scope: "Users may exclude individual VMs via name patterns, exact names, power state, or per-VM overrides." Add user story: "As a presales engineer, I want to drop decommissioned VMs from the source file so the refresh sizing reflects reality."
- `docs/architecture.md` — add `useExclusionsStore`, session-only `vmRowsByScope`, and pure engine at `src/lib/utils/import/exclusions.ts`.
- `docs/state-management.md` — store inventory (`useExclusionsStore`: persisted; `useImportStore.vmRowsByScope`: session-only).
- `docs/import-export.md` — JSON schema v2, URL hash v=2 with truncation, `power_state` column aliases.
- `docs/userguide.md` — walkthrough with screenshots placeholder.
- `docs/testing.md` — new test files listed; expected suite size ≈720.
- `README.md` — one-line feature bullet.
- `CHANGELOG.md` — under `## [Unreleased]` add `### Added`:
  - `feat: per-VM exclusions (glob, exact names, power-state toggle, per-row overrides)`
  - `feat: JSON export schema v2 — backward-compatible`
  - `feat: URL hash v2 with rule truncation`

- [ ] **Step 3: Commit**

```bash
git add docs/ README.md CHANGELOG.md
git commit -m "docs(exclusions): ADR-021 + prd/architecture/state-management/userguide updates"
```

---

## Self-Review Results

**Spec coverage:**
- §1 Problem → covered by user-facing UI (Tasks 15–17) and engine (Tasks 3–6).
- §2 User-facing behavior (rules + overrides + dual placement) → Tasks 9, 15, 16, 17.
- §3.1 Data flow → Task 10 (`recomputeCluster` preserves ESX fields, re-aggregates VM-derived).
- §3.2 Types → Tasks 1, 2.
- §3.3 Store → Task 9.
- §3.4 Engine → Tasks 3–6.
- §4 Parser changes → Tasks 7, 8, 11.
- §5.1 localStorage → Task 9 (persist) + Task 13 (boot).
- §5.2 JSON v2 → Task 11.
- §5.3 URL hash v2 + truncation → Task 12 + Task 13 (boot toast).
- §6 UI placements → Tasks 15, 16, 17.
- §7 Edge cases → covered in unit tests across Tasks 3–8, 11, 12, 15–17 + manual verification Task 18.
- §8 Security → glob-only (Task 3), React text interpolation (Tasks 14–16), no new eval/Function.
- §9 Testing → Tasks 3–17 each include dedicated test files; Task 18 runs the full suite.
- §10 Documentation → Task 19.
- §11 Out of scope → respected: no regex support, no attribute filters, no manual-entry mode UI, no VM-row persistence.

**Placeholder scan:** No TBD/TODO/"implement later"/"similar to Task N" in the plan. Every code step ships full code.

**Type consistency:** `ExclusionRules` fields are identical across Tasks 1, 9, 11, 12, 15. `VmRow` consistent across Tasks 2, 7, 8, 14, 15. `applyExclusions` signature matches across Tasks 5, 10, 15. `aggregateVmRows` return type matches its caller in Task 10. `recomputeCluster` called consistently from `setActiveScope`, `setImportBuffer`, and the exclusions subscriber. `buildJsonContent` rules parameter added with default `EMPTY_RULES` so callers that don't pass it still compile.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-vm-drop-selection.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.

**2. Inline Execution** — execute tasks here using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
