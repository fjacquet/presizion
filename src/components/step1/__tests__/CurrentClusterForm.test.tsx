/**
 * CurrentClusterForm — Nyquist Wave 0 test stubs
 * Requirements: INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
 *
 * Implement these after CurrentClusterForm.tsx is created in Plan 02.
 */
import { describe, it } from 'vitest'

describe('CurrentClusterForm', () => {
  describe('INPUT-01: average VM configuration fields', () => {
    it.todo('renders vCPUs per VM field')
    it.todo('renders RAM GB per VM field')
    it.todo('renders disk GB per VM field')
  })

  describe('INPUT-02: cluster totals fields', () => {
    it.todo('renders total vCPUs field')
    it.todo('renders total pCores field')
    it.todo('renders total VMs field')
    it.todo('renders total disk GB field (optional)')
    it.todo('shows inline error when required cluster total field is empty on blur')
  })

  describe('INPUT-04: derived metrics panel', () => {
    it.todo('DerivedMetricsPanel renders vCPU:pCore ratio when cluster store has valid values')
    it.todo('DerivedMetricsPanel shows em dash when pCores is zero')
    it.todo('DerivedMetricsPanel re-renders when cluster store updates')
  })

  describe('INPUT-05: validation and navigation guard', () => {
    it.todo('Next button is enabled (not disabled) before interaction')
    it.todo('clicking Next with empty required fields shows validation errors')
    it.todo('clicking Next with all required fields valid advances wizard step')
  })

  describe('UX-03: tooltips on key fields', () => {
    it.todo('Info icon is present next to Total vCPUs label')
    it.todo('tooltip content is visible on Info icon focus')
  })
})
