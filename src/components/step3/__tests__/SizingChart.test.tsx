import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'

// Mock recharts — ResponsiveContainer collapses to 0px in jsdom
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
  Cell: () => null,
}))

import { SizingChart } from '../SizingChart'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'

vi.mock('@/hooks/useScenariosResults', () => ({
  useScenariosResults: vi.fn(),
}))
import { useScenariosResults } from '@/hooks/useScenariosResults'

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
  achievedVcpuToPCoreRatio: 4,
  vmsPerServer: 20,
  cpuUtilizationPercent: 80,
  ramUtilizationPercent: 60,
  diskUtilizationPercent: 15,
}

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] })
    useWizardStore.setState({ sizingMode: 'vcpu' })
  })
  vi.mocked(useScenariosResults).mockReturnValue([])
})

describe('SizingChart', () => {
  it('renders without crashing with empty store', () => {
    const { container } = render(<SizingChart />)
    expect(container.firstChild).toBeNull()
  })

  it('renders bar chart container when results exist', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    expect(screen.getByText('Server Count Comparison')).toBeInTheDocument()
  })

  it('renders bar series for comparison and constraint charts', () => {
    const scenario2 = { ...baseScenario, id: 's2', name: 'Scenario B' }
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario, scenario2] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult, { ...baseResult, cpuLimitedCount: 5 }])
    render(<SizingChart />)
    // 1 Bar series for comparison chart + 3 for constraint chart (cpu, ram, disk)
    const bars = screen.getAllByTestId('bar-series')
    expect(bars).toHaveLength(4)
  })

  it('shows SPECint bar label when sizingMode is specint', () => {
    act(() => {
      useScenariosStore.setState({ scenarios: [baseScenario] })
      useWizardStore.setState({ sizingMode: 'specint' })
    })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    expect(screen.getByText('SPECint-limited')).toBeInTheDocument()
  })

  it('both charts have download PNG buttons', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    const buttons = screen.getAllByRole('button', { name: /download.*png/i })
    expect(buttons).toHaveLength(2)
  })

  it('download PNG button triggers download attempt', async () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    const buttons = screen.getAllByRole('button', { name: /download.*png/i })
    // Clicking should not throw (SVG not rendered in jsdom, so it's a no-op)
    await userEvent.click(buttons[0]!)
  })

  it('always renders Legend even with single scenario', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    // Two charts = two legends (comparison + constraint)
    const legends = screen.getAllByTestId('legend')
    expect(legends.length).toBeGreaterThanOrEqual(1)
  })

  it('renders LabelList elements for data labels', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<SizingChart />)
    const labels = screen.getAllByTestId('label-list')
    // At minimum cpu + ram; disk also in HCI mode (default)
    expect(labels.length).toBeGreaterThanOrEqual(2)
  })
})
