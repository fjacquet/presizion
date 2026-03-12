/**
 * Formula display string functions — unit stubs
 * Requirement: CALC-07 (carried from Phase 1 plan 04)
 *
 * These stubs are Wave 0 placeholders. Plan 04-03 fills them with real tests.
 * Using it.todo (not it.skip) so Vitest counts as pending, not failing.
 */
import { describe, it } from 'vitest'

describe('display: formula string generators', () => {
  describe('CALC-07: cpuFormulaString', () => {
    it.todo('returns a human-readable formula string with substituted values for CPU constraint')
    it.todo('includes ceil(), totalVcpus, headroomPercent, targetVcpuToPCoreRatio, and coresPerServer in the string')
  })

  describe('CALC-07: ramFormulaString', () => {
    it.todo('returns a human-readable formula string with substituted values for RAM constraint')
    it.todo('includes ceil(), totalVms, ramPerVmGb, headroomPercent, and ramPerServerGb in the string')
  })

  describe('CALC-07: diskFormulaString', () => {
    it.todo('returns a human-readable formula string with substituted values for disk constraint')
    it.todo('includes ceil(), totalVms, diskPerVmGb, headroomPercent, and diskPerServerGb in the string')
  })
})
