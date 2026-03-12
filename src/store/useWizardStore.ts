import { create } from 'zustand';

/**
 * Wizard navigation state.
 * Controls the 3-step wizard flow: Step 1 (cluster input), Step 2 (scenarios), Step 3 (results).
 */
interface WizardStore {
  /** Current active step in the wizard (1–3) */
  currentStep: 1 | 2 | 3;
  /** Navigate directly to a specific step */
  goToStep: (step: 1 | 2 | 3) => void;
  /** Advance to next step (clamped at 3) */
  nextStep: () => void;
  /** Go back to previous step (clamped at 1) */
  prevStep: () => void;
}

export const useWizardStore = create<WizardStore>((set) => ({
  currentStep: 1,

  goToStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({
      currentStep:
        state.currentStep < 3 ? ((state.currentStep + 1) as 1 | 2 | 3) : state.currentStep,
    })),

  prevStep: () =>
    set((state) => ({
      currentStep:
        state.currentStep > 1 ? ((state.currentStep - 1) as 1 | 2 | 3) : state.currentStep,
    })),
}));
