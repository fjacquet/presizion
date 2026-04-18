import { describe, it, expect } from 'vitest'
import {
  compileNamePattern,
  isExcluded,
  applyExclusions,
  aggregateVmRows,
} from '../exclusions'
import type { VmRow } from '../index'
import { EMPTY_RULES } from '@/types/exclusions'

function row(name: string, extra: Partial<VmRow> = {}): VmRow {
  return { name, scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 40960, ...extra }
}

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
    expect(isExcluded(row('c'), rules, null)).toBe(false)
  })

  it('manuallyIncluded overrides a pattern match', () => {
    const re = compileNamePattern('test-*')
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', manuallyIncluded: ['s1::test-keep'] }
    expect(isExcluded(row('test-keep'), rules, re)).toBe(false)
    expect(isExcluded(row('test-other'), rules, re)).toBe(true)
  })

  it('manuallyIncluded overrides powered-off exclusion', () => {
    const rules = { ...EMPTY_RULES, excludePoweredOff: true, manuallyIncluded: ['s1::keep'] }
    expect(isExcluded(row('keep', { powerState: 'poweredOff' }), rules, null)).toBe(false)
  })

  it('manuallyExcluded wins over no-rule match', () => {
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['s1::drop'] }
    expect(isExcluded(row('drop'), rules, null)).toBe(true)
  })

  it('manuallyIncluded beats manuallyExcluded when both listed', () => {
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['s1::x'], manuallyIncluded: ['s1::x'] }
    expect(isExcluded(row('x'), rules, null)).toBe(false)
  })

  it('manual override targets only the matching scope', () => {
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['dcA::dup'] }
    expect(isExcluded(row('dup', { scopeKey: 'dcA' }), rules, null)).toBe(true)
    expect(isExcluded(row('dup', { scopeKey: 'dcB' }), rules, null)).toBe(false)
  })
})

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
    expect(stats.excludedByRule).toEqual({ namePattern: 0, exactNames: 0, powerState: 0, manual: 0 })
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
    const input = new Map<string, VmRow[]>([
      ['s1', rows(['test-a', 'test-b'])],
    ])
    const rules = {
      ...EMPTY_RULES,
      namePattern: 'test-*',
      manuallyExcluded: ['s1::test-a'],
    }
    const { stats } = applyExclusions(input, rules)
    expect(stats.excludedByRule.manual).toBe(1)
    expect(stats.excludedByRule.namePattern).toBe(1)
  })

  it('counts exact-name exclusions separately from name pattern', () => {
    const input = new Map<string, VmRow[]>([
      ['s1', rows(['lab-vm', 'test-a'])],
    ])
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', exactNames: ['lab-vm'] }
    const { stats } = applyExclusions(input, rules)
    expect(stats.excludedByRule.exactNames).toBe(1)
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

  it('manual override keyed by scope::name only hits the matching row', () => {
    const input = new Map<string, VmRow[]>([
      ['dcA', [row('dup', { scopeKey: 'dcA' })]],
      ['dcB', [row('dup', { scopeKey: 'dcB' })]],
    ])
    const rules = { ...EMPTY_RULES, manuallyExcluded: ['dcA::dup'] }
    const { filteredByScope, stats } = applyExclusions(input, rules)
    expect(filteredByScope.get('dcA')).toEqual([])
    expect(filteredByScope.get('dcB')!.map((r) => r.name)).toEqual(['dup'])
    expect(stats.excludedByRule.manual).toBe(1)
  })
})

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
    expect(out.totalDiskGb).toBe(150)
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
