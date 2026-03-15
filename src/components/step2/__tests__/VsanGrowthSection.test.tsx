/**
 * VsanGrowthSection — Tests for FORM-01 through FORM-04
 * Requirements: FORM-01, FORM-02, FORM-03, FORM-04
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ScenarioCard } from '../ScenarioCard'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import { createDefaultScenario } from '@/lib/sizing/defaults'

// Reset stores between tests to avoid cross-test contamination
beforeEach(() => {
  const defaultScenario = createDefaultScenario()
  useScenariosStore.setState({ scenarios: [defaultScenario] })
  useClusterStore.setState({ currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 } })
  useWizardStore.setState({ currentStep: 2, sizingMode: 'vcpu', layoutMode: 'hci' })
})

describe('FORM-01: Collapsible vSAN & Growth section', () => {
  it('vSAN & Growth section toggle button is visible in ScenarioCard', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    expect(screen.getByRole('button', { name: /vsan & growth/i })).toBeInTheDocument()
  })

  it('section content is NOT visible when collapsed (default state)', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    // The toggle should indicate collapsed state
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Growth fields should not be visible
    expect(screen.queryByText(/cpu growth %/i)).not.toBeInTheDocument()
  })

  it('clicking toggle reveals the section content', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/cpu growth %/i)).toBeInTheDocument()
  })

  it('clicking toggle again hides the section content', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    // Open
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    // Close
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/cpu growth %/i)).not.toBeInTheDocument()
  })
})

describe('FORM-02: vSAN sub-section fields (HCI mode)', () => {
  it('FTT Policy dropdown is visible when section is open and layoutMode is hci', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/ftt policy/i)).toBeInTheDocument()
  })

  it('Compression Factor dropdown is visible', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/compression factor/i)).toBeInTheDocument()
  })

  it('Slack Space %, CPU Overhead %, Memory/Host GB inputs are visible', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/slack space %/i)).toBeInTheDocument()
    expect(screen.getByText(/cpu overhead %/i)).toBeInTheDocument()
    expect(screen.getByText(/memory\/host gb/i)).toBeInTheDocument()
  })

  it('VM Swap toggle is visible', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/vm swap on vsan/i)).toBeInTheDocument()
  })
})

describe('FORM-03: Growth sub-section fields', () => {
  it('CPU Growth %, Memory Growth %, Storage Growth % inputs are visible when section is open', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/cpu growth %/i)).toBeInTheDocument()
    expect(screen.getByText(/memory growth %/i)).toBeInTheDocument()
    expect(screen.getByText(/storage growth %/i)).toBeInTheDocument()
  })
})

describe('FORM-04: vSAN visibility based on layoutMode', () => {
  it('vSAN fields (FTT, Compression, etc.) are NOT visible when layoutMode is disaggregated', async () => {
    act(() => {
      useWizardStore.setState({ layoutMode: 'disaggregated' })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.queryByText(/ftt policy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/compression factor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/slack space %/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cpu overhead %/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/memory\/host gb/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/vm swap on vsan/i)).not.toBeInTheDocument()
  })

  it('Growth fields ARE visible when layoutMode is disaggregated', async () => {
    act(() => {
      useWizardStore.setState({ layoutMode: 'disaggregated' })
    })
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(screen.getByText(/cpu growth %/i)).toBeInTheDocument()
    expect(screen.getByText(/memory growth %/i)).toBeInTheDocument()
    expect(screen.getByText(/storage growth %/i)).toBeInTheDocument()
  })
})

describe('Live update: vSAN fields wire through form.watch', () => {
  it('changing FTT policy dropdown updates the Zustand store', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!
    render(<ScenarioCard scenarioId={scenario.id} />)

    // Open the vSAN & Growth section
    const toggle = screen.getByRole('button', { name: /vsan & growth/i })
    await act(async () => {
      fireEvent.click(toggle)
    })

    // Find and change the FTT policy select
    const fttSelect = screen.getByTestId(`select-vsanFttPolicy-${scenario.id}`)
    await act(async () => {
      fireEvent.change(fttSelect, { target: { value: 'mirror-1' } })
    })

    await waitFor(() => {
      const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id)
      expect(updated?.vsanFttPolicy).toBe('mirror-1')
    })
  })
})
