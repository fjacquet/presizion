/**
 * VsanSection — vSAN settings inside the Advanced disclosure of ScenarioCard.
 * Requirements: FORM-01, FORM-02, FORM-04 (growth fields removed in the
 * two-knob model; growth/safety now live in Sizing Assumptions).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultScenario } from '@/lib/sizing/defaults';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import { ScenarioCard } from '../ScenarioCard';

// Reset stores between tests to avoid cross-test contamination
beforeEach(() => {
  const defaultScenario = createDefaultScenario();
  useScenariosStore.setState({ scenarios: [defaultScenario] });
  useClusterStore.setState({ currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 } });
  useWizardStore.setState({ currentStep: 2, sizingMode: 'vcpu', layoutMode: 'hci' });
});

function openAdvanced() {
  const toggle = screen.getByRole('button', { name: /advanced/i });
  act(() => {
    fireEvent.click(toggle);
  });
  return toggle;
}

describe('FORM-01: Advanced disclosure', () => {
  it('Advanced toggle button is visible in ScenarioCard', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument();
  });

  it('vSAN content is NOT visible when collapsed (default state)', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    const toggle = screen.getByRole('button', { name: /advanced/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/vsan settings/i)).not.toBeInTheDocument();
  });

  it('clicking the toggle reveals the Advanced content', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    const toggle = openAdvanced();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/vsan settings/i)).toBeInTheDocument();
  });

  it('clicking the toggle again hides the Advanced content', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    const toggle = openAdvanced();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    act(() => {
      fireEvent.click(toggle);
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/vsan settings/i)).not.toBeInTheDocument();
  });
});

describe('FORM-02: vSAN sub-section fields (HCI mode)', () => {
  it('FTT Policy dropdown is visible when Advanced is open and layoutMode is hci', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();
    expect(screen.getByText(/ftt policy/i)).toBeInTheDocument();
  });

  it('Compression Factor dropdown is visible', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();
    expect(screen.getByText(/compression factor/i)).toBeInTheDocument();
  });

  it('Slack Space %, CPU Overhead %, Memory/Host GB inputs are visible', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();
    expect(screen.getByText(/slack space %/i)).toBeInTheDocument();
    expect(screen.getByText(/cpu overhead %/i)).toBeInTheDocument();
    expect(screen.getByText(/memory\/host gb/i)).toBeInTheDocument();
  });

  it('VM Swap toggle is visible', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();
    expect(screen.getByText(/vm swap on vsan/i)).toBeInTheDocument();
  });
});

describe('Growth fields removed (two-knob model)', () => {
  it('per-resource CPU/Memory/Storage growth fields no longer exist', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();
    expect(screen.queryByText(/cpu growth %/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/memory growth %/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/storage growth %/i)).not.toBeInTheDocument();
  });
});

describe('FORM-04: vSAN visibility based on layoutMode', () => {
  it('vSAN fields are NOT visible when layoutMode is disaggregated', () => {
    act(() => {
      useWizardStore.setState({ layoutMode: 'disaggregated' });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();

    expect(screen.queryByText(/vsan settings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ftt policy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/compression factor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/slack space %/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cpu overhead %/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vm swap on vsan/i)).not.toBeInTheDocument();
  });
});

describe('Live update: vSAN fields wire through form.watch', () => {
  it('changing FTT policy dropdown updates the Zustand store', async () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    openAdvanced();

    const fttSelect = screen.getByTestId(`select-vsanFttPolicy-${scenario.id}`);
    await act(async () => {
      fireEvent.change(fttSelect, { target: { value: 'mirror-1' } });
    });

    await waitFor(() => {
      const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id);
      expect(updated?.vsanFttPolicy).toBe('mirror-1');
    });
  });
});
