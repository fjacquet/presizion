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
}))

import { CoreCountChart } from '../CoreCountChart'
import { useScenariosStore } from '@/store/useScenariosStore'

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
  stretchApplied: false,
  achievedVcpuToPCoreRatio: 4,
  vmsPerServer: 20,
  cpuUtilizationPercent: 80,
  ramUtilizationPercent: 60,
  diskUtilizationPercent: 15,
}

beforeEach(() => {
  act(() => {
    useScenariosStore.setState({ scenarios: [] })
  })
  vi.mocked(useScenariosResults).mockReturnValue([])
})

describe('CoreCountChart', () => {
  it('renders without crashing with empty store', () => {
    const { container } = render(<CoreCountChart />)
    expect(container.firstChild).toBeNull()
  })

  it('renders chart when results exist', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<CoreCountChart />)
    expect(screen.getByText('Total Physical Cores per Scenario')).toBeInTheDocument()
  })

  it('Download PNG button is present', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<CoreCountChart />)
    expect(screen.getByRole('button', { name: /download.*chart.*png/i })).toBeInTheDocument()
  })

  it('Download PNG button clickable without error', async () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<CoreCountChart />)
    const btn = screen.getByRole('button', { name: /download.*chart.*png/i })
    await userEvent.click(btn)
  })

  it('always renders Legend even with single scenario', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<CoreCountChart />)
    expect(screen.getByTestId('legend')).toBeInTheDocument()
  })

  it('renders LabelList for data labels', () => {
    act(() => { useScenariosStore.setState({ scenarios: [baseScenario] }) })
    vi.mocked(useScenariosResults).mockReturnValue([baseResult])
    render(<CoreCountChart />)
    expect(screen.getByTestId('label-list')).toBeInTheDocument()
  })
})
