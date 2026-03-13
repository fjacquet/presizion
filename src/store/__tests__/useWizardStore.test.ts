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

  it('setSizingMode("specint") updates sizingMode to specint', () => {
    useWizardStore.getState().setSizingMode('specint');
    expect(useWizardStore.getState().sizingMode).toBe('specint');
  });

  it('setSizingMode("vcpu") switches back to vcpu from specint', () => {
    useWizardStore.setState({ sizingMode: 'specint' });
    useWizardStore.getState().setSizingMode('vcpu');
    expect(useWizardStore.getState().sizingMode).toBe('vcpu');
  });
});
