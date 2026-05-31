import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the ECharts <Chart> wrapper — jsdom can't render svg charts.
vi.mock('@/components/charts/Chart', () => ({
  Chart: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div data-testid="chart" role="img" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/hooks/useVsanBreakdowns', () => ({
  useVsanBreakdowns: vi.fn(),
}));

import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns';
import { useScenariosStore } from '@/store/useScenariosStore';
import type { VsanCapacityBreakdown } from '@/types/breakdown';
import { CapacityStackedChart } from '../CapacityStackedChart';

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

const baseBreakdown: VsanCapacityBreakdown = {
  scenarioId: 's1',
  cpu: {
    vmsRequired: 500,
    vsanConsumption: 100,
    required: 600,
    reservedMaxUtil: 150,
    haReserve: 50,
    spare: 200,
    excess: 200,
    total: 1000,
  },
  memory: {
    vmsRequired: 400,
    vsanConsumption: 50,
    required: 450,
    reservedMaxUtil: 100,
    haReserve: 50,
    spare: 150,
    excess: 400,
    total: 1000,
  },
  storage: {
    vmsRequired: 3000,
    vsanConsumption: 500,
    required: 3500,
    reservedMaxUtil: 500,
    haReserve: 500,
    spare: 1000,
    excess: 500,
    total: 5000,
    usableRequired: 3000,
    swapOverhead: 100,
    metadataOverhead: 200,
    fttOverhead: 700,
    rawRequired: 4000,
    slackSpace: 500,
  },
  minNodesByConstraint: { cpu: 8, memory: 5, storage: 6, ftha: 3, vms: 4 },
};

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] });
  });
  vi.mocked(useVsanBreakdowns).mockReturnValue([]);
});

describe('CapacityStackedChart', () => {
  it('returns null when scenarios store is empty', () => {
    const { container } = render(<CapacityStackedChart />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chart heading "Capacity Breakdown" + a chart when breakdowns exist', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown]);
    render(<CapacityStackedChart />);
    expect(screen.getByText(/Capacity Breakdown/)).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('renders Download SVG button with correct aria-label', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown]);
    render(<CapacityStackedChart />);
    expect(
      screen.getByRole('button', { name: /download.*capacity.*chart.*svg/i }),
    ).toBeInTheDocument();
  });

  it('renders one chart section per scenario', () => {
    const scenario2 = { ...baseScenario, id: 's2', name: 'Scenario B' };
    const breakdown2: VsanCapacityBreakdown = { ...baseBreakdown, scenarioId: 's2' };
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario, scenario2] });
    });
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown, breakdown2]);
    render(<CapacityStackedChart />);
    expect(screen.getByText(/Capacity Breakdown -- Scenario A/)).toBeInTheDocument();
    expect(screen.getByText(/Capacity Breakdown -- Scenario B/)).toBeInTheDocument();
    expect(screen.getAllByTestId('chart')).toHaveLength(2);
  });

  it('renders the on-screen Required/Spare/Excess legend row', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] });
    });
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown]);
    render(<CapacityStackedChart />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Spare')).toBeInTheDocument();
    expect(screen.getByText('Excess')).toBeInTheDocument();
  });
});
