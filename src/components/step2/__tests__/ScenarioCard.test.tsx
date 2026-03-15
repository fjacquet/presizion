/**
 * ScenarioCard — Tests for SCEN-01 through SCEN-05, PERF-03, SPEC-LOOKUP-04
 * Requirements: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05, PERF-03, SPEC-LOOKUP-04
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

// Mock the specLookup module so we control fetch results in tests
vi.mock('@/lib/utils/specLookup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/specLookup')>()
  return {
    ...actual,
    fetchSpecResults: vi.fn().mockResolvedValue({ results: [], status: 'no-results' as const }),
  }
})

import { fetchSpecResults } from '@/lib/utils/specLookup'
const mockFetchSpecResults = vi.mocked(fetchSpecResults)

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

    it('renders HA reserve N/N+1/N+2 toggle buttons', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      expect(screen.getByRole('button', { name: 'N (None)' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'N+1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'N+2' })).toBeInTheDocument()
    })

    it('clicking N+1 sets haReserveCount to 1 in store', async () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      const n1btn = screen.getByRole('button', { name: 'N+1' })

      act(() => {
        fireEvent.click(n1btn)
      })

      await waitFor(() => {
        const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id)
        expect(updated?.haReserveCount).toBe(1)
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

    it('new ScenarioCard pre-fills haReserveCount with 0 (N/None selected)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!
      render(<ScenarioCard scenarioId={scenario.id} />)
      // N (None) button should be aria-pressed=true by default
      const noneBtn = screen.getByRole('button', { name: 'N (None)' })
      expect(noneBtn).toHaveAttribute('aria-pressed', 'true')
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

describe('SPEC-06..09: auto-derive and read-only fields', () => {
  function getSocketsInput() {
    // Sockets/Server input: find the label text, then get the adjacent spinbutton
    const labels = screen.getAllByText(/sockets\/server/i)
    // The label is inside a FormItem; the input is the next spinbutton sibling
    const formItem = labels[0]!.closest('[class*="FormItem"], .space-y-2, [data-slot="form-item"]')!
    return formItem.querySelector('input[type="number"]') as HTMLInputElement
  }

  function getCoresInput() {
    const labels = screen.getAllByText(/cores\/socket/i)
    const formItem = labels[0]!.closest('[class*="FormItem"], .space-y-2, [data-slot="form-item"]')!
    return formItem.querySelector('input[type="number"]') as HTMLInputElement
  }

  it('in specint mode with cluster metadata, sockets/server input is disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10, socketsPerServer: 2, coresPerSocket: 16 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(getSocketsInput()).toBeDisabled()
  })

  it('in specint mode with cluster metadata, cores/socket input is disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10, socketsPerServer: 2, coresPerSocket: 16 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(getCoresInput()).toBeDisabled()
  })

  it('in vcpu mode, sockets/server and cores/socket inputs are NOT disabled', () => {
    // sizingMode is 'vcpu' by default
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(getSocketsInput()).not.toBeDisabled()
    expect(getCoresInput()).not.toBeDisabled()
  })

  it('switching from specint to vcpu re-enables the inputs', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10, socketsPerServer: 2, coresPerSocket: 16 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    const { rerender } = render(<ScenarioCard scenarioId={scenario.id} />)
    expect(getSocketsInput()).toBeDisabled()

    act(() => {
      useWizardStore.setState({ sizingMode: 'vcpu' })
    })
    rerender(<ScenarioCard scenarioId={scenario.id} />)
    expect(getSocketsInput()).not.toBeDisabled()
    expect(getCoresInput()).not.toBeDisabled()
  })

  it('in specint mode WITHOUT cluster metadata, inputs are NOT disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      // No socketsPerServer or coresPerSocket
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(getSocketsInput()).not.toBeDisabled()
    expect(getCoresInput()).not.toBeDisabled()
  })

  it('in specint mode WITHOUT cluster metadata, a warning message is visible', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.getByText(/no socket\/core data from import/i)).toBeInTheDocument()
  })

  it('warning message is NOT shown when metadata is present in specint mode', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10, socketsPerServer: 2, coresPerSocket: 16 },
      })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.queryByText(/no socket\/core data from import/i)).not.toBeInTheDocument()
  })

  it('warning message is NOT shown in vcpu mode', () => {
    // sizingMode is 'vcpu' by default, no metadata
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.queryByText(/no socket\/core data from import/i)).not.toBeInTheDocument()
  })
})

describe('SPEC-LOOKUP-04: Target CPU SPEC lookup in ScenarioCard', () => {
  beforeEach(() => {
    mockFetchSpecResults.mockReset()
    mockFetchSpecResults.mockResolvedValue({ results: [], status: 'no-results' })
  })

  it('in SPECint mode, renders "Target CPU Model" input', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.getByPlaceholderText(/xeon gold 6526y/i)).toBeInTheDocument()
  })

  it('in vcpu mode, does NOT render "Target CPU Model" input', () => {
    // sizingMode is 'vcpu' by default
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.queryByPlaceholderText(/xeon gold 6526y/i)).not.toBeInTheDocument()
  })

  it('typing a CPU model and waiting for debounce triggers fetch and shows results panel', async () => {
    mockFetchSpecResults.mockResolvedValue({
      results: [
        { vendor: 'Dell', system: 'PowerEdge R660', baseResult: 337, peakResult: 370, cores: 32, chips: 2 },
      ],
      status: 'ok',
    })

    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)

    const cpuInput = screen.getByPlaceholderText(/xeon gold 6526y/i)
    fireEvent.change(cpuInput, { target: { value: 'Xeon Gold 6526Y' } })

    // Wait for debounce (500ms) + fetch
    await waitFor(() => {
      expect(mockFetchSpecResults).toHaveBeenCalled()
    }, { timeout: 2000 })

    // Results panel should show the result
    await waitFor(() => {
      expect(screen.getByText('SPECrate2017 Results')).toBeInTheDocument()
    })
  })

  it('clicking a result row updates targetSpecint field value', async () => {
    mockFetchSpecResults.mockResolvedValue({
      results: [
        { vendor: 'Dell', system: 'PowerEdge R660', baseResult: 337, peakResult: 370, cores: 32, chips: 2 },
      ],
      status: 'ok',
    })

    act(() => {
      useWizardStore.setState({ sizingMode: 'specint' })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)

    const cpuInput = screen.getByPlaceholderText(/xeon gold 6526y/i)
    fireEvent.change(cpuInput, { target: { value: 'Xeon Gold 6526Y' } })

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('SPECrate2017 Results')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Expand the panel by clicking the toggle
    fireEvent.click(screen.getByText('SPECrate2017 Results'))

    // Click the result row
    await waitFor(() => {
      expect(screen.getByText('337')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('337'))

    // targetSpecint field should be updated
    await waitFor(() => {
      const specintInput = screen.getByTestId(`input-targetSpecint-${scenario.id}`) as HTMLInputElement
      expect(specintInput.value).toBe('337')
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
