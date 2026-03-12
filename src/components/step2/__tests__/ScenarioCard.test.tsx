/**
 * ScenarioCard — Nyquist Wave 0 test stubs
 * Requirements: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05
 *
 * Implement these after ScenarioCard.tsx is created in Plan 03.
 */
import { describe, it } from 'vitest'

describe('Step2Scenarios / ScenarioCard', () => {
  describe('SCEN-01: add scenario', () => {
    it.todo('Add Scenario button is visible in Step 2')
    it.todo('clicking Add Scenario creates a new scenario card')
    it.todo('new scenario card has a unique id (not duplicate)')
  })

  describe('SCEN-02: server config fields', () => {
    it.todo('renders sockets per server field')
    it.todo('renders cores per socket field')
    it.todo('renders RAM per server GB field')
    it.todo('renders usable disk per server GB field')
    it.todo('displays total cores (sockets × cores/socket) as derived read-only metric')
  })

  describe('SCEN-03: sizing assumption fields', () => {
    it.todo('renders target vCPU:pCore ratio field')
    it.todo('renders RAM per VM GB field')
    it.todo('renders disk per VM GB field')
    it.todo('renders growth headroom % field')
    it.todo('renders N+1 HA reserve Switch toggle')
    it.todo('Switch toggle changes haReserveEnabled in store when toggled')
  })

  describe('SCEN-04: default pre-population', () => {
    it.todo('new ScenarioCard pre-fills targetVcpuToPCoreRatio with DEFAULT_VCPU_TO_PCORE_RATIO (4)')
    it.todo('new ScenarioCard pre-fills headroomPercent with DEFAULT_HEADROOM_PERCENT (20)')
    it.todo('new ScenarioCard pre-fills haReserveEnabled with false')
  })

  describe('SCEN-05: duplicate scenario', () => {
    it.todo('Duplicate button is visible per scenario card')
    it.todo('clicking Duplicate creates an independent copy (editing copy does not change original)')
    it.todo('duplicate scenario name has (copy) suffix')
  })
})
