import { create } from 'zustand';

/**
 * Controls which CPU/performance formula drives CALC-01.
 * - 'vcpu':       vCPU:pCore ratio hard cap (default)
 * - 'specint':    SPECrate2017 benchmark score comparison
 * - 'aggressive': Observed CPU utilization drives density; ratio cap bypassed
 * - 'ghz':        Clock-frequency × utilization drives demand and capacity
 */
export type SizingMode = 'vcpu' | 'specint' | 'aggressive' | 'ghz';

/**
 * Controls whether disk capacity is a per-server sizing constraint.
 * - 'hci':           Hyperconverged — disk lives inside the compute nodes (disk constraint active)
 * - 'disaggregated': External storage (SAN/NAS) — disk constraint excluded from server count
 */
export type LayoutMode = 'hci' | 'disaggregated';

/**
 * Wizard navigation, sizing mode, and layout mode state.
 * Controls the 3-step wizard flow: Step 1 (cluster input), Step 2 (scenarios), Step 3 (results).
 */
interface WizardStore {
  /** Current active step in the wizard (1–3) */
  currentStep: 1 | 2 | 3;
  /** CPU/performance formula selection */
  sizingMode: SizingMode;
  /** Disk constraint inclusion */
  layoutMode: LayoutMode;
  /** Navigate directly to a specific step */
  goToStep: (step: 1 | 2 | 3) => void;
  /** Advance to next step (clamped at 3) */
  nextStep: () => void;
  /** Go back to previous step (clamped at 1) */
  prevStep: () => void;
  /** Switch between sizing modes */
  setSizingMode: (mode: SizingMode) => void;
  /** Switch between layout modes */
  setLayoutMode: (mode: LayoutMode) => void;
}

export const useWizardStore = create<WizardStore>((set) => ({
  currentStep: 1,
  sizingMode: 'vcpu',
  layoutMode: 'hci',

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

  setSizingMode: (mode) => set({ sizingMode: mode }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
}));
