/**
 * WizardShell — Nyquist Wave 0 test stubs
 * Requirements: UX-01, UX-02
 *
 * Implement these after WizardShell.tsx and StepIndicator.tsx are created in Plan 04.
 */
import { describe, it } from 'vitest'

describe('WizardShell', () => {
  describe('UX-01: 3-step wizard shell', () => {
    it.todo('renders StepIndicator with 3 steps')
    it.todo('renders Step 1 component when wizard currentStep is 1')
    it.todo('renders Step 2 component when wizard currentStep is 2')
    it.todo('StepIndicator highlights the active step')
    it.todo('Back button is not rendered on Step 1')
    it.todo('Back button is rendered on Step 2')
  })

  describe('UX-02: navigation guard', () => {
    it.todo('Next button does not advance step when Step 1 required fields are empty')
    it.todo('Next button advances to Step 2 when Step 1 required fields are valid')
    it.todo('Back button from Step 2 returns to Step 1 without validation')
  })
})
