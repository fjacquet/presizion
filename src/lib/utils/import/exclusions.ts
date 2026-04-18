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
 * A row is attributed to the first matching rule in short-circuit order.
 */
export function applyExclusions(
  vmRowsByScope: Map<string, VmRow[]>,
  rules: ExclusionRules,
): { filteredByScope: Map<string, VmRow[]>; stats: ExclusionStats } {
  const compiled = compileNamePattern(rules.namePattern)
  const includedSet = new Set(rules.manuallyIncluded)
  const excludedSet = new Set(rules.manuallyExcluded)
  const exactSet = new Set(rules.exactNames)
  const filteredByScope = new Map<string, VmRow[]>()

  let totalVms = 0
  let byPattern = 0
  let byPower = 0
  let byManual = 0

  for (const [scopeKey, rows] of vmRowsByScope) {
    const kept: VmRow[] = []
    for (const row of rows) {
      totalVms++
      if (includedSet.has(row.name)) {
        kept.push(row)
        continue
      }
      if (excludedSet.has(row.name)) {
        byManual++
        continue
      }
      if (compiled !== null && compiled.test(row.name)) {
        byPattern++
        continue
      }
      if (exactSet.has(row.name)) {
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

/**
 * Re-aggregate VM-derived fields from a row array.
 * Returns only the VM-derived subset; ESX host fields must be merged back from rawByScope.
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
