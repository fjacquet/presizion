import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../useWizardStore';

describe('useWizardStore — sizingMode (PERF-01)', () => {
  beforeEach(() => {
    useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' });
  });

  it('sizingMode defaults to vcpu', () => {
    const state = useWizardStore.getState();
    expect(state.sizingMode).toBe('vcpu');
  });

  it('only allows vcpu and performance modes', () => {
    const { setSizingMode } = useWizardStore.getState();
    setSizingMode('performance');
    expect(useWizardStore.getState().sizingMode).toBe('performance');
    setSizingMode('vcpu');
    expect(useWizardStore.getState().sizingMode).toBe('vcpu');
  });
});
