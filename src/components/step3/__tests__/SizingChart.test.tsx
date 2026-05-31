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
import { useWizardStore } from '@/store/useWizardStore';
import { SizingChart } from '../SizingChart';

vi.mock('@/hooks/useScenariosResults', () => ({
  useScenariosResults: vi.fn(),
}));

import { useScenariosResults } from '@/hooks/useScenariosResults';

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
};

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] });
    useWizardStore.setState({ sizingMode: 'vcpu' });
  });
  vi.mocked(useScenariosResults).mockReturnValue([]);
});

describe('SizingChart', () => {
  it('renders nothing with empty store', () => {
    const { container } = render(<SizingChart />);
    expect(container.firstChild).toBeNull();
  });

  it('renders both chart headings when results exist', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useScenariosResults).mockReturnValue([baseResult]);
    render(<SizingChart />);
    expect(screen.getByText('Server Count Comparison')).toBeInTheDocument();
    expect(screen.getByText('Constraint Breakdown per Scenario')).toBeInTheDocument();
  });

  it('renders two charts', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useScenariosResults).mockReturnValue([baseResult]);
    render(<SizingChart />);
    expect(screen.getAllByTestId('chart')).toHaveLength(2);
  });

  it('both charts have Download SVG buttons', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useScenariosResults).mockReturnValue([baseResult]);
    render(<SizingChart />);
    const buttons = screen.getAllByRole('button', { name: /download.*svg/i });
    expect(buttons).toHaveLength(2);
  });
});
