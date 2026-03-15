import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'

// Mock recharts -- ResponsiveContainer collapses to 0px in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ name, children }: { name: string; children?: React.ReactNode }) => <span data-testid="bar-series">{name}{children}</span>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => <div data-testid="legend" />,
  LabelList: ({ dataKey }: { dataKey: string }) => <span data-testid="label-list">{dataKey}</span>,
  ReferenceLine: () => null,
}))

vi.mock('@/hooks/useVsanBreakdowns', () => ({
  useVsanBreakdowns: vi.fn(),
}))

import { CapacityStackedChart } from '../CapacityStackedChart'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns'
import type { VsanCapacityBreakdown } from '@/types/breakdown'

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
  headroomPercent: 20,
  haReserveCount: 0 as const,
}

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
}

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] })
  })
  vi.mocked(useVsanBreakdowns).mockReturnValue([])
})

describe('CapacityStackedChart', () => {
  it('returns null when scenarios store is empty', () => {
    const { container } = render(<CapacityStackedChart />)
    expect(container.firstChild).toBeNull()
  })

  it('renders chart heading "Capacity Breakdown" when breakdowns exist', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown])
    render(<CapacityStackedChart />)
    expect(screen.getByText(/Capacity Breakdown/)).toBeInTheDocument()
  })

  it('renders Download PNG button with correct aria-label', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown])
    render(<CapacityStackedChart />)
    expect(screen.getByRole('button', { name: /download.*capacity.*chart.*png/i })).toBeInTheDocument()
  })

  it('Download PNG button is clickable without error', async () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown])
    render(<CapacityStackedChart />)
    const btn = screen.getByRole('button', { name: /download.*capacity.*chart.*png/i })
    await userEvent.click(btn)
  })

  it('renders one chart section per scenario', () => {
    const scenario2 = { ...baseScenario, id: 's2', name: 'Scenario B' }
    const breakdown2: VsanCapacityBreakdown = { ...baseBreakdown, scenarioId: 's2' }
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario, scenario2] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown, breakdown2])
    render(<CapacityStackedChart />)
    expect(screen.getByText(/Capacity Breakdown -- Scenario A/)).toBeInTheDocument()
    expect(screen.getByText(/Capacity Breakdown -- Scenario B/)).toBeInTheDocument()
  })

  it('renders bar series for Required, Spare, and Excess segments', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown])
    render(<CapacityStackedChart />)
    const barSeries = screen.getAllByTestId('bar-series')
    const names = barSeries.map((el) => el.textContent)
    expect(names.some((n) => n?.includes('Required'))).toBe(true)
    expect(names.some((n) => n?.includes('Spare'))).toBe(true)
    expect(names.some((n) => n?.includes('Excess'))).toBe(true)
  })

  it('renders legend labels', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useVsanBreakdowns).mockReturnValue([baseBreakdown])
    render(<CapacityStackedChart />)
    // Legend labels appear alongside bar series names
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Spare').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Excess').length).toBeGreaterThanOrEqual(1)
  })
})
