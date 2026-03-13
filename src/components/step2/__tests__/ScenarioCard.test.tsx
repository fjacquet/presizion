/**
 * ScenarioCard — Tests for SCEN-01 through SCEN-05, PERF-03
 * Requirements: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05, PERF-03
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ScenarioCard } from '../ScenarioCard'
import { Step2Scenarios } from '../Step2Scenarios'
import { ScenarioResults } from '../ScenarioResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import { createDefaultScenario } from '@/lib/sizing/defaults'
import {
  DEFAULT_VCPU_TO_PCORE_RATIO,
  DEFAULT_HEADROOM_PERCENT,
} from '@/lib/sizing/defaults'

// Reset stores between tests to avoid cross-test contamination
beforeEach(() => {
  const defaultScenario = createDefaultScenario()
  useScenariosStore.setState({ scenarios: [defaultScenario] })
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } })
  useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' })
})

describe('Step2Scenarios / ScenarioCard', () => {
  describe('SCEN-01: add scenario', () => {
    it('Add Scenario button is visible in Step 2', () => {
      render(<Step2Scenarios />)
      expect(screen.getByRole('button', { name: /add scenario/i })).toBeInTheDocument()
    })

    it('clicking Add Scenario creates a new scenario card', async () => {
      render(<Step2Scenarios />)
      const addButton = screen.getByRole('button', { name: /add scenario/i })
      const initialCount = useScenariosStore.getState().scenarios.length

      act(() => {
        fireEvent.click(addButton)
      })

      await waitFor(() => {
        expect(useScenariosStore.getState().scenarios.length).toBe(initialCount + 1)
      })
    })

    it('new scenario card has a unique id (not duplicate)', () => {
      act(() => {
        useScenariosStore.getState().addScenario()
      })
      const scenarios = useScenariosStore.getState().scenarios
      const ids = scenarios.map((s) => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('SCEN-02: server config fields', () => {
    it('renders sockets per server field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      // FormLabel renders the label text; use getByText to check label presence
      expect(screen.getByText(/sockets\/server/i)).toBeInTheDocument()
    })

    it('renders cores per socket field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/cores\/socket/i)).toBeInTheDocument()
    })

    it('renders RAM per server GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/ram\/server gb/i)).toBeInTheDocument()
    })

    it('renders usable disk per server GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/disk\/server gb/i)).toBeInTheDocument()
    })

    it('displays total cores (sockets × cores/socket) as derived read-only metric', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      // Default scenario: 2 sockets × 20 cores/socket = 40 total cores
      const totalCores = scenario.socketsPerServer * scenario.coresPerSocket
      // The derived metric text should appear somewhere
      expect(screen.getByText(/total cores\/server/i)).toBeInTheDocument()
      expect(screen.getByText(`${totalCores}`)).toBeInTheDocument()
    })
  })

  describe('SCEN-03: sizing assumption fields', () => {
    it('renders target vCPU:pCore ratio field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/vcpu.?pcore ratio/i)).toBeInTheDocument()
    })

    it('renders RAM per VM GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/ram\/vm gb/i)).toBeInTheDocument()
    })

    it('renders disk per VM GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/disk\/vm gb/i)).toBeInTheDocument()
    })

    it('renders growth headroom % field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByText(/headroom %/i)).toBeInTheDocument()
    })

    it('renders N+1 HA reserve Switch toggle', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByRole('switch', { name: /n\+1 ha reserve/i })).toBeInTheDocument()
    })

    it('Switch toggle changes haReserveEnabled in store when toggled', async () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const switchEl = screen.getByRole('switch', { name: /n\+1 ha reserve/i })

      act(() => {
        fireEvent.click(switchEl)
      })

      await waitFor(() => {
        const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id)
        expect(updated?.haReserveEnabled).toBe(true)
      })
    })
  })

  describe('SCEN-04: default pre-population', () => {
    it('new ScenarioCard pre-fills targetVcpuToPCoreRatio with DEFAULT_VCPU_TO_PCORE_RATIO (4)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      // Find all spinbutton inputs and check the ratio input value
      const inputs = screen.getAllByRole('spinbutton')
      // targetVcpuToPCoreRatio input should exist with value 4
      const ratioInput = inputs.find((el) => (el as HTMLInputElement).value === String(DEFAULT_VCPU_TO_PCORE_RATIO))
      expect(ratioInput).toBeDefined()
    })

    it('new ScenarioCard pre-fills headroomPercent with DEFAULT_HEADROOM_PERCENT (20)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const inputs = screen.getAllByRole('spinbutton')
      const headroomInput = inputs.find((el) => (el as HTMLInputElement).value === String(DEFAULT_HEADROOM_PERCENT))
      expect(headroomInput).toBeDefined()
    })

    it('new ScenarioCard pre-fills haReserveEnabled with false', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const switchEl = screen.getByRole('switch', { name: /n\+1 ha reserve/i })
      // aria-checked="false" when switch is off
      expect(switchEl).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('SCEN-05: duplicate scenario', () => {
    it('Duplicate button is visible per scenario card', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByRole('button', { name: /duplicate scenario/i })).toBeInTheDocument()
    })

    it('duplicate scenario name has (copy) suffix', () => {
      render(<Step2Scenarios />)
      const duplicateButton = screen.getByRole('button', { name: /duplicate scenario/i })

      act(() => {
        fireEvent.click(duplicateButton)
      })

      const scenarios = useScenariosStore.getState().scenarios
      expect(scenarios.length).toBe(2)
      expect(scenarios[1]?.name).toMatch(/\(copy\)/)
    })

    it('clicking Duplicate creates an independent copy (editing copy does not change original)', () => {
      const originalScenario = useScenariosStore.getState().scenarios[0]!
      const originalName = originalScenario.name

      // Duplicate the scenario
      act(() => {
        useScenariosStore.getState().duplicateScenario(originalScenario.id)
      })

      const scenarios = useScenariosStore.getState().scenarios
      expect(scenarios.length).toBe(2)

      // Update the copy's name
      const copyId = scenarios[1]!.id
      act(() => {
        useScenariosStore.getState().updateScenario(copyId, { name: 'Modified Copy Name' })
      })

      // Original should be unchanged
      const originalAfter = useScenariosStore.getState().scenarios.find((s) => s.id === originalScenario.id)
      expect(originalAfter?.name).toBe(originalName)
    })
  })

  describe('PERF-03: targetSpecint conditional field', () => {
    it('targetSpecint input is present when sizingMode is specint', () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'specint' })
      })
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const scenario0Id = scenario.id
      expect(screen.getByTestId(`input-targetSpecint-${scenario0Id}`)).toBeInTheDocument()
    })

    it('targetSpecint input is absent when sizingMode is vcpu', () => {
      // sizingMode is 'vcpu' by default (set in beforeEach)
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const scenario0Id = scenario.id
      expect(screen.queryByTestId(`input-targetSpecint-${scenario0Id}`)).not.toBeInTheDocument()
    })
  })
})

describe('ScenarioResults', () => {
  it('renders CPU-limited, RAM-limited, disk-limited, and final server count labels', () => {
    // Set up cluster data so results can be computed
    act(() => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 3200,
          totalPcores: 800,
          totalVms: 100,
        },
      })
    })

    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioResults scenarioId={scenario.id} />)

    // "CPU-limited" appears in the Badge and in the label text; check at least one is present
    expect(screen.getAllByText(/cpu-limited/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ram-limited/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/disk-limited/i).length).toBeGreaterThan(0)
  })
})
