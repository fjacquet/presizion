import { describe, it, beforeEach } from 'vitest';
import { useWizardStore } from '../useWizardStore';

describe('useWizardStore — sizingMode (PERF-01)', () => {
  beforeEach(() => {
    useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' });
  });

  it.todo('sizingMode defaults to vcpu');
  it.todo('setSizingMode("specint") updates sizingMode to specint');
  it.todo('setSizingMode("vcpu") switches back to vcpu from specint');
});
