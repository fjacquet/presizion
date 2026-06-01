/**
 * ScenarioResults — single-VM fit banner (non-blocking).
 * amber when overall === 'warn', red when overall === 'fail', nothing for ok/unknown.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultScenario } from '@/lib/sizing/defaults';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import { ScenarioResults } from '../ScenarioResults';

// 2 sockets x 16 cores = 32 physical cores -> 64 logical CPUs, 512 GiB RAM/host.
function fitScenario() {
  return {
    ...createDefaultScenario(),
    socketsPerServer: 2,
    coresPerSocket: 16,
    ramPerServerGb: 512,
  };
}

beforeEach(() => {
  useScenariosStore.setState({ scenarios: [fitScenario()] });
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } });
  useWizardStore.setState({ currentStep: 2, sizingMode: 'vcpu', layoutMode: 'hci' });
});

describe('ScenarioResults — single-VM fit banner', () => {
  it('renders a FAIL banner when the largest VM cannot run on a single host', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0, largestVmVcpus: 999 },
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.getByText(/cannot run on a single host/i)).toBeInTheDocument();
  });

  it('renders a WARN banner when the largest VM relies on SMT / spans NUMA', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0, largestVmVcpus: 48 },
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.getByText(/rely on SMT/i)).toBeInTheDocument();
  });

  it('renders NO banner when the largest VM fits comfortably (ok)', () => {
    useClusterStore.setState({
      currentCluster: {
        totalVcpus: 0,
        totalPcores: 0,
        totalVms: 0,
        largestVmVcpus: 16,
        largestVmRamGb: 128,
      },
    });
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.queryByText(/single host|rely on SMT/i)).toBeNull();
  });

  it('renders NO banner when there is no largest-VM data (unknown)', () => {
    const scenario = useScenariosStore.getState().scenarios[0]!;
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.queryByText(/single host|rely on SMT/i)).toBeNull();
  });
});
