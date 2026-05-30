/**
 * ScenarioCard — Tests for SCEN-01 through SCEN-05, PERF-03, SPEC-LOOKUP-04
 * Requirements: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05, PERF-03, SPEC-LOOKUP-04
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultScenario,
  DEFAULT_SAFETY_PERCENT,
  DEFAULT_VCPU_TO_PCORE_RATIO,
} from '@/lib/sizing/defaults';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import { ScenarioCard } from '../ScenarioCard';
import { ScenarioResults } from '../ScenarioResults';
import { Step2Scenarios } from '../Step2Scenarios';

// Mock the specLookup module so we control fetch results in tests
vi.mock('@/lib/utils/specLookup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/specLookup')>();
  return {
    ...actual,
    fetchSpecResults: vi.fn().mockResolvedValue({ results: [], status: 'no-results' as const }),
  };
});

import { fetchSpecResults } from '@/lib/utils/specLookup';

const mockFetchSpecResults = vi.mocked(fetchSpecResults);

/**
 * Default scenario with targetSpecint stripped so the "I have SPEC scores"
 * opt-in checkbox starts UNCHECKED (deterministic for SPEC tests). Omit the key
 * entirely (never assign undefined) to satisfy exactOptionalPropertyTypes.
 */
function scenarioWithoutSpec() {
  const { targetSpecint: _omit, ...rest } = createDefaultScenario();
  void _omit;
  return rest;
}

// Reset stores between tests to avoid cross-test contamination
beforeEach(() => {
  useScenariosStore.setState({ scenarios: [scenarioWithoutSpec()] });
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } });
  useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' });
});

describe('Step2Scenarios / ScenarioCard', () => {
  describe('SCEN-01: add scenario', () => {
    it('Add Scenario button is visible in Step 2', () => {
      render(<Step2Scenarios />);
      expect(screen.getByRole('button', { name: /add scenario/i })).toBeInTheDocument();
    });

    it('clicking Add Scenario creates a new scenario card', async () => {
      render(<Step2Scenarios />);
      const addButton = screen.getByRole('button', { name: /add scenario/i });
      const initialCount = useScenariosStore.getState().scenarios.length;

      act(() => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(useScenariosStore.getState().scenarios.length).toBe(initialCount + 1);
      });
    });

    it('new scenario card has a unique id (not duplicate)', () => {
      act(() => {
        useScenariosStore.getState().addScenario();
      });
      const scenarios = useScenariosStore.getState().scenarios;
      const ids = scenarios.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('SCEN-02: server config fields', () => {
    it('renders sockets per server field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/sockets\/server/i)).toBeInTheDocument();
    });

    it('renders cores per socket field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/cores\/socket/i)).toBeInTheDocument();
    });

    it('renders RAM per server GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/ram\/server gb/i)).toBeInTheDocument();
    });

    it('renders usable disk per server GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/disk\/server gb/i)).toBeInTheDocument();
    });

    it('displays total cores (sockets × cores/socket) as derived read-only metric', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      // Default scenario: 2 sockets × 20 cores/socket = 40 total cores
      const totalCores = scenario.socketsPerServer * scenario.coresPerSocket;
      expect(screen.getByText(/total cores\/server/i)).toBeInTheDocument();
      expect(screen.getByText(`${totalCores}`)).toBeInTheDocument();
    });
  });

  describe('SCEN-03: sizing assumption fields', () => {
    it('renders target vCPU:pCore ratio field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/vcpu.?pcore ratio/i)).toBeInTheDocument();
    });

    it('renders RAM per VM GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/ram\/vm gb/i)).toBeInTheDocument();
    });

    it('renders disk per VM GB field', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/disk\/vm gb/i)).toBeInTheDocument();
    });

    it('shows Growth % and Safety % and hides target-util/VM-count', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByText(/Growth %/)).toBeInTheDocument();
      expect(screen.getByText(/Safety buffer %/)).toBeInTheDocument();
      expect(screen.queryByText(/Target CPU Util/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Target RAM Util/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Target VM Count/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Headroom/)).not.toBeInTheDocument();
    });

    it('renders HA reserve N/N+1/N+2 toggle buttons', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByRole('button', { name: 'N (None)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'N+1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'N+2' })).toBeInTheDocument();
    });

    it('clicking N+1 sets haReserveCount to 1 in store', async () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      const n1btn = screen.getByRole('button', { name: 'N+1' });

      act(() => {
        fireEvent.click(n1btn);
      });

      await waitFor(() => {
        const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id);
        expect(updated?.haReserveCount).toBe(1);
      });
    });
  });

  describe('SCEN-04: default pre-population', () => {
    it('new ScenarioCard pre-fills targetVcpuToPCoreRatio with DEFAULT_VCPU_TO_PCORE_RATIO (4)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      const inputs = screen.getAllByRole('spinbutton');
      const ratioInput = inputs.find(
        (el) => (el as HTMLInputElement).value === String(DEFAULT_VCPU_TO_PCORE_RATIO),
      );
      expect(ratioInput).toBeDefined();
    });

    it('new ScenarioCard pre-fills safetyPercent with DEFAULT_SAFETY_PERCENT (20)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      const inputs = screen.getAllByRole('spinbutton');
      const safetyInput = inputs.find(
        (el) => (el as HTMLInputElement).value === String(DEFAULT_SAFETY_PERCENT),
      );
      expect(safetyInput).toBeDefined();
    });

    it('new ScenarioCard pre-fills haReserveCount with 0 (N/None selected)', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      const noneBtn = screen.getByRole('button', { name: 'N (None)' });
      expect(noneBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('SCEN-05: duplicate scenario', () => {
    it('Duplicate button is visible per scenario card', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByRole('button', { name: /duplicate scenario/i })).toBeInTheDocument();
    });

    it('duplicate scenario name has (copy) suffix', () => {
      render(<Step2Scenarios />);
      const duplicateButton = screen.getByRole('button', { name: /duplicate scenario/i });

      act(() => {
        fireEvent.click(duplicateButton);
      });

      const scenarios = useScenariosStore.getState().scenarios;
      expect(scenarios.length).toBe(2);
      expect(scenarios[1]?.name).toMatch(/\(copy\)/);
    });

    it('clicking Duplicate creates an independent copy (editing copy does not change original)', () => {
      const originalScenario = useScenariosStore.getState().scenarios[0]!;
      const originalName = originalScenario.name;

      act(() => {
        useScenariosStore.getState().duplicateScenario(originalScenario.id);
      });

      const scenarios = useScenariosStore.getState().scenarios;
      expect(scenarios.length).toBe(2);

      const copyId = scenarios[1]?.id;
      if (!copyId) throw new Error('expected a duplicated scenario');
      act(() => {
        useScenariosStore.getState().updateScenario(copyId, { name: 'Modified Copy Name' });
      });

      const originalAfter = useScenariosStore
        .getState()
        .scenarios.find((s) => s.id === originalScenario.id);
      expect(originalAfter?.name).toBe(originalName);
    });
  });

  describe('PERF-03: targetSpecint conditional field', () => {
    it('targetSpecint input is present when SPEC scores enabled in performance mode', () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'performance' });
      });
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);

      // Opt in to SPEC scores
      fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));

      expect(screen.getByTestId(`input-targetSpecint-${scenario.id}`)).toBeInTheDocument();
    });

    it('targetSpecint input is absent before opting in to SPEC scores', () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'performance' });
      });
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.queryByTestId(`input-targetSpecint-${scenario.id}`)).not.toBeInTheDocument();
    });

    it('targetSpecint input is absent in vcpu mode', () => {
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.queryByTestId(`input-targetSpecint-${scenario.id}`)).not.toBeInTheDocument();
    });

    it('New CPU Frequency (GHz) input is present in performance mode', () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'performance' });
      });
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);
      expect(screen.getByTestId(`input-targetCpuFrequencyGhz-${scenario.id}`)).toBeInTheDocument();
    });

    it('unchecking SPEC scores clears targetSpecint from the store', async () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'performance' });
      });
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);

      const specCheckbox = screen.getByRole('checkbox', { name: /i have spec scores/i });

      // Check: enable SPEC scores
      act(() => {
        fireEvent.click(specCheckbox);
      });

      // Type a value into targetSpecint
      await waitFor(() => {
        expect(screen.getByTestId(`input-targetSpecint-${scenario.id}`)).toBeInTheDocument();
      });

      act(() => {
        fireEvent.change(screen.getByTestId(`input-targetSpecint-${scenario.id}`), {
          target: { value: '250' },
        });
      });

      await waitFor(() => {
        const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id);
        expect(updated?.targetSpecint).toBe(250);
      });

      // Uncheck: disable SPEC scores
      act(() => {
        fireEvent.click(specCheckbox);
      });

      await waitFor(() => {
        const updated = useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id);
        expect(updated?.targetSpecint).toBeUndefined();
      });
    });

    it('switching away from performance mode clears targetSpecint (no stale SPEC re-activation)', async () => {
      act(() => {
        useWizardStore.setState({ sizingMode: 'performance' });
      });
      const scenario = useScenariosStore.getState().scenarios[0]!;
      render(<ScenarioCard scenarioId={scenario.id} />);

      // Enable SPEC and set a score
      act(() => {
        fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
      });
      await waitFor(() => {
        expect(screen.getByTestId(`input-targetSpecint-${scenario.id}`)).toBeInTheDocument();
      });
      act(() => {
        fireEvent.change(screen.getByTestId(`input-targetSpecint-${scenario.id}`), {
          target: { value: '500' },
        });
      });
      await waitFor(() => {
        expect(
          useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id)?.targetSpecint,
        ).toBe(500);
      });

      // Switch to vcpu mode WITHOUT unchecking — the effect must clear targetSpecint,
      // otherwise constraints.ts (targetSpecint > 0 → SPEC) would silently re-activate
      // SPEC sizing on re-entry to performance mode.
      act(() => {
        useWizardStore.setState({ sizingMode: 'vcpu' });
      });
      await waitFor(() => {
        expect(
          useScenariosStore.getState().scenarios.find((s) => s.id === scenario.id)?.targetSpecint,
        ).toBeUndefined();
      });
    });
  });
});

describe('SPEC-06..09: auto-derive and read-only fields (performance + SPEC)', () => {
  function getSocketsInput() {
    const labels = screen.getAllByText(/sockets\/server/i);
    const formItem = labels[0]!.closest(
      '[class*="FormItem"], .space-y-2, [data-slot="form-item"]',
    )!;
    return formItem.querySelector('input[type="number"]') as HTMLInputElement;
  }

  function getCoresInput() {
    const labels = screen.getAllByText(/cores\/socket/i);
    const formItem = labels[0]!.closest(
      '[class*="FormItem"], .space-y-2, [data-slot="form-item"]',
    )!;
    return formItem.querySelector('input[type="number"]') as HTMLInputElement;
  }

  it('in performance+SPEC mode with cluster metadata, sockets/server input is disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 100,
          totalPcores: 50,
          totalVms: 10,
          socketsPerServer: 2,
          coresPerSocket: 16,
        },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(getSocketsInput()).toBeDisabled();
  });

  it('in performance+SPEC mode with cluster metadata, cores/socket input is disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 100,
          totalPcores: 50,
          totalVms: 10,
          socketsPerServer: 2,
          coresPerSocket: 16,
        },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(getCoresInput()).toBeDisabled();
  });

  it('in vcpu mode, sockets/server and cores/socket inputs are NOT disabled', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    expect(getSocketsInput()).not.toBeDisabled();
    expect(getCoresInput()).not.toBeDisabled();
  });

  it('in performance mode WITHOUT SPEC opt-in, inputs are NOT disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 100,
          totalPcores: 50,
          totalVms: 10,
          socketsPerServer: 2,
          coresPerSocket: 16,
        },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    expect(getSocketsInput()).not.toBeDisabled();
    expect(getCoresInput()).not.toBeDisabled();
  });

  it('in performance+SPEC mode WITHOUT cluster metadata, inputs are NOT disabled', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(getSocketsInput()).not.toBeDisabled();
    expect(getCoresInput()).not.toBeDisabled();
  });

  it('in performance+SPEC mode WITHOUT cluster metadata, a warning message is visible', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10 },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(screen.getByText(/no socket\/core data from import/i)).toBeInTheDocument();
  });

  it('warning message is NOT shown when metadata is present in performance+SPEC mode', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 100,
          totalPcores: 50,
          totalVms: 10,
          socketsPerServer: 2,
          coresPerSocket: 16,
        },
      });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(screen.queryByText(/no socket\/core data from import/i)).not.toBeInTheDocument();
  });

  it('warning message is NOT shown in vcpu mode', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    expect(screen.queryByText(/no socket\/core data from import/i)).not.toBeInTheDocument();
  });
});

describe('SPEC-LOOKUP-04: Target CPU SPEC lookup in ScenarioCard', () => {
  beforeEach(() => {
    mockFetchSpecResults.mockReset();
    mockFetchSpecResults.mockResolvedValue({ results: [], status: 'no-results' });
  });

  it('in performance mode with SPEC enabled, renders "Target CPU Model" input', () => {
    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));
    expect(screen.getByPlaceholderText(/xeon gold 6526y/i)).toBeInTheDocument();
  });

  it('in vcpu mode, renders "Look up target CPU" search for auto-filling cores/sockets', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    expect(screen.getByPlaceholderText(/xeon gold 6526y/i)).toBeInTheDocument();
    expect(screen.getByText(/look up target cpu/i)).toBeInTheDocument();
  });

  it('typing a CPU model and waiting for debounce triggers fetch and shows results panel', async () => {
    mockFetchSpecResults.mockResolvedValue({
      results: [
        {
          vendor: 'Dell',
          system: 'PowerEdge R660',
          baseResult: 337,
          peakResult: 370,
          cores: 32,
          chips: 2,
        },
      ],
      status: 'ok',
    });

    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));

    const cpuInput = screen.getByPlaceholderText(/xeon gold 6526y/i);
    fireEvent.change(cpuInput, { target: { value: 'Xeon Gold 6526Y' } });

    await waitFor(
      () => {
        expect(mockFetchSpecResults).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    await waitFor(() => {
      expect(screen.getByText('SPECrate2017 Results')).toBeInTheDocument();
    });
  });

  it('clicking a result row updates targetSpecint field value', async () => {
    mockFetchSpecResults.mockResolvedValue({
      results: [
        {
          vendor: 'Dell',
          system: 'PowerEdge R660',
          baseResult: 337,
          peakResult: 370,
          cores: 32,
          chips: 2,
        },
      ],
      status: 'ok',
    });

    act(() => {
      useWizardStore.setState({ sizingMode: 'performance' });
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioCard scenarioId={scenario.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /i have spec scores/i }));

    const cpuInput = screen.getByPlaceholderText(/xeon gold 6526y/i);
    fireEvent.change(cpuInput, { target: { value: 'Xeon Gold 6526Y' } });

    await waitFor(
      () => {
        expect(screen.getByText('SPECrate2017 Results')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByText('SPECrate2017 Results'));

    await waitFor(() => {
      expect(screen.getByText('337')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('337'));

    await waitFor(() => {
      const specintInput = screen.getByTestId(
        `input-targetSpecint-${scenario.id}`,
      ) as HTMLInputElement;
      expect(specintInput.value).toBe('337');
    });
  });
});

describe('ScenarioResults', () => {
  it('renders CPU-limited, RAM-limited, disk-limited, and final server count labels', () => {
    act(() => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 3200,
          totalPcores: 800,
          totalVms: 100,
        },
      });
    });

    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioResults scenarioId={scenario.id} />);

    expect(screen.getAllByText(/cpu-limited/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ram-limited/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/disk-limited/i).length).toBeGreaterThan(0);
  });
});
