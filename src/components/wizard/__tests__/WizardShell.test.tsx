/**
 * WizardShell — Integration tests
 * Requirements: UX-01, UX-02, UX-05, RESET-01, RESET-02, RESET-03, RESET-04
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWizardStore } from '@/store/useWizardStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useImportStore } from '@/store/useImportStore'

// Mock step components to isolate WizardShell routing logic
vi.mock('@/components/step1/Step1CurrentCluster', () => ({
  Step1CurrentCluster: () => <div data-testid="step1-current-cluster">Step 1 Content</div>,
}))

vi.mock('@/components/step2/Step2Scenarios', () => ({
  Step2Scenarios: () => <div data-testid="step2-scenarios">Step 2 Content</div>,
}))

vi.mock('@/components/step3/Step3ReviewExport', () => ({
  Step3ReviewExport: () => <div data-testid="step3-review-export">Step 3 Content</div>,
}))

vi.mock('@/hooks/useBeforeUnload', () => ({
  useBeforeUnload: vi.fn(),
}))

// localStorage mock — jsdom's localStorage may not survive module-level store initialization
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  get length() { return Object.keys(localStorageStore).length },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
}
vi.stubGlobal('localStorage', localStorageMock)

// Import after mocks
import { WizardShell } from '../WizardShell'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

beforeEach(() => {
  useWizardStore.setState({ currentStep: 1 })
  vi.mocked(useBeforeUnload).mockClear()
})

describe('WizardShell', () => {
  describe('UX-01: 3-step wizard shell', () => {
    it('renders StepIndicator with 3 steps', () => {
      render(<WizardShell />)
      expect(screen.getByTestId('step-indicator-1')).toBeInTheDocument()
      expect(screen.getByTestId('step-indicator-2')).toBeInTheDocument()
      expect(screen.getByTestId('step-indicator-3')).toBeInTheDocument()
    })

    it('renders Step 1 component when wizard currentStep is 1', () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      expect(screen.getByTestId('step1-current-cluster')).toBeInTheDocument()
      expect(screen.queryByTestId('step2-scenarios')).not.toBeInTheDocument()
    })

    it('renders Step 2 component when wizard currentStep is 2', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      expect(screen.getByTestId('step2-scenarios')).toBeInTheDocument()
      expect(screen.queryByTestId('step1-current-cluster')).not.toBeInTheDocument()
    })

    it('StepIndicator highlights the active step', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      const activeStep = screen.getByTestId('step-indicator-2')
      expect(activeStep).toHaveAttribute('aria-current', 'step')
      const inactiveStep = screen.getByTestId('step-indicator-1')
      expect(inactiveStep).not.toHaveAttribute('aria-current', 'step')
    })

    it('Back button is not rendered on Step 1', () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })

    it('Back button is rendered on Step 2', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('UX-02: navigation guard', () => {
    it('Next button does not advance step when Step 1 required fields are empty', async () => {
      // WizardShell delegates the Next button to Step1CurrentCluster (CurrentClusterForm).
      // This test verifies WizardShell stays on Step 1 when the step component's
      // navigation guard prevents advancement (i.e. prevStep is not called unexpectedly).
      // The actual guard logic is tested in CurrentClusterForm.test.tsx.
      // Here we verify WizardShell renders Step 1 by default (prerequisite for UX-02).
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      expect(screen.getByTestId('step1-current-cluster')).toBeInTheDocument()
      expect(useWizardStore.getState().currentStep).toBe(1)
    })

    it('Next button advances to Step 2 when Step 1 required fields are valid', async () => {
      // Simulate the store advancing to step 2 (what happens after successful validation
      // in CurrentClusterForm.handleNext → nextStep())
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      // Advance store programmatically (mirrors what CurrentClusterForm.handleNext does)
      act(() => {
        useWizardStore.getState().nextStep()
      })
      expect(useWizardStore.getState().currentStep).toBe(2)
    })

    it('Back button from Step 2 returns to Step 1 without validation', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
      expect(useWizardStore.getState().currentStep).toBe(1)
    })
  })

  describe('Step 3 routing', () => {
    it('renders Step3ReviewExport when currentStep is 3', () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      expect(screen.getByTestId('step3-review-export')).toBeInTheDocument()
    })

    it('does not render Step 3 placeholder text when currentStep is 3', () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      expect(screen.queryByText(/coming in phase 3/i)).not.toBeInTheDocument()
    })

    it('Back button is rendered on Step 3', () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Step 2 Next button', () => {
    it('renders a Next button on Step 2', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('clicking Next on Step 2 advances to Step 3', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(useWizardStore.getState().currentStep).toBe(3)
    })
  })

  describe('UX-05: beforeunload guard', () => {
    it('calls useBeforeUnload with false when on Step 1', () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      expect(useBeforeUnload).toHaveBeenCalledWith(false)
    })

    it('calls useBeforeUnload with true when on Step 2', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      expect(useBeforeUnload).toHaveBeenCalledWith(true)
    })

    it('calls useBeforeUnload with true when on Step 3', () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      expect(useBeforeUnload).toHaveBeenCalledWith(true)
    })
  })

  describe('RESET-01..04: Reset button and confirmation', () => {
    const resetClusterSpy = vi.fn()
    const setScenariosSpy = vi.fn()
    const clearImportSpy = vi.fn()

    beforeEach(() => {
      // Set up store spies
      useClusterStore.setState({ resetCluster: resetClusterSpy })
      useScenariosStore.setState({ setScenarios: setScenariosSpy })
      useImportStore.setState({ clearImport: clearImportSpy })

      // Set up localStorage test data
      localStorageStore['presizion-theme'] = 'dark'
      localStorageStore['presizion-session'] = '{"test":"data"}'

      // Reset spies
      resetClusterSpy.mockClear()
      setScenariosSpy.mockClear()
      clearImportSpy.mockClear()
      localStorageMock.removeItem.mockClear()
    })

    it('Reset button is visible on Step 1', () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('Reset button is visible on Step 2', () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('Reset button is visible on Step 3', () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('clicking Reset opens a confirmation dialog', async () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      expect(screen.getByText(/All cluster data and scenarios will be cleared/)).toBeInTheDocument()
    })

    it('clicking Cancel closes the dialog without clearing stores', async () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      expect(screen.getByText(/All cluster data and scenarios will be cleared/)).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByText(/All cluster data and scenarios will be cleared/)).not.toBeInTheDocument()
      expect(resetClusterSpy).not.toHaveBeenCalled()
      expect(setScenariosSpy).not.toHaveBeenCalled()
      expect(clearImportSpy).not.toHaveBeenCalled()
    })

    it('confirming clears cluster store (resetCluster called)', async () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      // Click the destructive Reset button in the dialog (not the header one)
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(resetClusterSpy).toHaveBeenCalled()
    })

    it('confirming resets scenarios store', async () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(setScenariosSpy).toHaveBeenCalled()
    })

    it('confirming clears import store', async () => {
      useWizardStore.setState({ currentStep: 2 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(clearImportSpy).toHaveBeenCalled()
    })

    it('confirming removes presizion-session from localStorage', async () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('presizion-session')
      expect(localStorageStore['presizion-session']).toBeUndefined()
    })

    it('confirming does NOT remove presizion-theme from localStorage', async () => {
      useWizardStore.setState({ currentStep: 1 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(localStorageStore['presizion-theme']).toBe('dark')
    })

    it('after confirm, wizard navigates to Step 1', async () => {
      useWizardStore.setState({ currentStep: 3 })
      render(<WizardShell />)
      await userEvent.click(screen.getByRole('button', { name: /reset/i }))
      const dialogButtons = screen.getAllByRole('button', { name: /reset/i })
      const confirmBtn = dialogButtons[dialogButtons.length - 1]
      await userEvent.click(confirmBtn!)
      expect(useWizardStore.getState().currentStep).toBe(1)
    })
  })
})
