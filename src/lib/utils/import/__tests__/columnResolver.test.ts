import { describe, it, expect } from 'vitest'
import { resolveColumns, RVTOOLS_ALIASES, LIVEOPTICS_ALIASES } from '../columnResolver'
import { ImportError } from '../fileValidation'

describe('columnResolver', () => {
  it('resolveColumns maps primary alias for RVTools num_cpus', () => {
    const result = resolveColumns(['CPUs', 'VM', 'Template'], RVTOOLS_ALIASES, new Set())
    expect(result['num_cpus']).toBe('CPUs')
  })

  it('resolveColumns maps secondary alias for RVTools memory_mib', () => {
    const result = resolveColumns(['Memory MB'], RVTOOLS_ALIASES, new Set())
    expect(result['memory_mib']).toBe('Memory MB')
  })

  it('resolveColumns trims whitespace from headers', () => {
    const result = resolveColumns(['  CPUs  ', '  VM  '], RVTOOLS_ALIASES, new Set())
    expect(result['num_cpus']).toBe('CPUs')
    expect(result['vm_name']).toBe('VM')
  })

  it('resolveColumns throws ImportError listing missing required columns', () => {
    expect(() =>
      resolveColumns(['VM'], RVTOOLS_ALIASES, new Set(['num_cpus'])),
    ).toThrow(ImportError)
  })

  it('RVTOOLS_ALIASES contains all expected canonical keys', () => {
    expect(Object.keys(RVTOOLS_ALIASES)).toEqual(
      expect.arrayContaining(['vm_name', 'num_cpus', 'memory_mib', 'provisioned_mib', 'is_template']),
    )
  })

  it('LIVEOPTICS_ALIASES contains all expected canonical keys', () => {
    expect(Object.keys(LIVEOPTICS_ALIASES)).toEqual(
      expect.arrayContaining(['vm_name', 'num_cpus', 'memory_mib', 'provisioned_mib', 'is_template']),
    )
  })
})
