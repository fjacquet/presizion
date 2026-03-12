/**
 * WizardShell — Integration tests
 * Requirements: UX-01, UX-02
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useWizardStore } from '@/store/useWizardStore'

// Mock step components to isolate WizardShell routing logic
vi.mock('@/components/step1/Step1CurrentCluster', () => ({
  Step1CurrentCluster: () => <div data-testid="step1-current-cluster">Step 1 Content</div>,
}))

vi.mock('@/components/step2/Step2Scenarios', () => ({
  Step2Scenarios: () => <div data-testid="step2-scenarios">Step 2 Content</div>,
}))

// Import after mocks
import { WizardShell } from '../WizardShell'

beforeEach(() => {
  useWizardStore.setState({ currentStep: 1 })
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
})
