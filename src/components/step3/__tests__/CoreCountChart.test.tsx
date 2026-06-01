import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the ECharts <Chart> wrapper — jsdom can't render canvas/svg charts.
vi.mock('@/components/charts/Chart', () => ({
  Chart: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div data-testid="chart" role="img" aria-label={ariaLabel} />
  ),
}));

import { useScenariosStore } from '@/store/useScenariosStore';
import { CoreCountChart } from '../CoreCountChart';

vi.mock('@/hooks/useScenariosResults', () => ({
  useScenariosResults: vi.fn(),
}));

import { useScenariosResults } from '@/hooks/useScenariosResults';
import type { SingleVmFit } from '@/lib/sizing/singleVmFit';

const UNKNOWN_SINGLE_VM_FIT: SingleVmFit = {
  vcpu: 'unknown',
  ram: 'unknown',
  overall: 'unknown',
  coresPerServer: 0,
  logicalCpus: 0,
  usableRamGb: 0,
};

const baseScenario = {
  id: 's1',
  name: 'Scenario A',
  socketsPerServer: 2,
  coresPerSocket: 24,
  ramPerServerGb: 512,
  diskPerServerGb: 20000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 16,
  diskPerVmGb: 100,
  growthPercent: 0,
  safetyPercent: 20,
  haReserveCount: 0 as const,
};

const baseResult = {
  cpuLimitedCount: 10,
  ramLimitedCount: 8,
  diskLimitedCount: 3,
  rawCount: 10,
  requiredCount: 10,
  finalCount: 10,
  limitingResource: 'cpu' as const,
  haReserveCount: 0,
  haReserveApplied: false,
  stretchApplied: false,
  achievedVcpuToPCoreRatio: 4,
  vmsPerServer: 20,
  cpuUtilizationPercent: 80,
  ramUtilizationPercent: 60,
  diskUtilizationPercent: 15,
  singleVmFit: UNKNOWN_SINGLE_VM_FIT,
};

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] });
  });
  vi.mocked(useScenariosResults).mockReturnValue([]);
});

describe('CoreCountChart', () => {
  it('renders nothing with empty store', () => {
    const { container } = render(<CoreCountChart />);
    expect(container.firstChild).toBeNull();
  });

  it('renders heading and chart when results exist', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useScenariosResults).mockReturnValue([baseResult]);
    render(<CoreCountChart />);
    expect(screen.getByText('Total Physical Cores per Scenario')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('Download SVG button is present', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useScenariosResults).mockReturnValue([baseResult]);
    render(<CoreCountChart />);
    expect(screen.getByRole('button', { name: /download.*svg/i })).toBeInTheDocument();
  });
});
