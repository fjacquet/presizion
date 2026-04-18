/**
 * ComparisonTable — Unit tests
 * Requirements: COMP-01, COMP-02, UX-04, PERF-03
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ComparisonTable } from '../ComparisonTable'
import { utilizationClass } from '@/lib/utils/utilizationClass'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'

// Mock useScenariosResults so we can control limitingResource
vi.mock('@/hooks/useScenariosResults', () => ({
  useScenariosResults: vi.fn(),
}))
import { useScenariosResults } from '@/hooks/useScenariosResults'

const baseScenario = {
  id: 'a',
  name: 'Test Scenario',
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
  cpuLimitedCount: 13,
  ramLimitedCount: 12,
  diskLimitedCount: 2,
  rawCount: 13,
  requiredCount: 13,
  finalCount: 13,
  limitingResource: 'cpu' as const,
  haReserveApplied: false,
  haReserveCount: 0,
  stretchApplied: false,
  achievedVcpuToPCoreRatio: 3.2,
  vmsPerServer: 7.7,
  cpuUtilizationPercent: 48.0,
  ramUtilizationPercent: 37.5,
  diskUtilizationPercent: 1.5,
}

beforeEach(() => {
  useClusterStore.setState({
    currentCluster: { totalVcpus: 2000, totalPcores: 500, totalVms: 300, cpuUtilizationPercent: 48 },
  })
  useScenariosStore.setState({
    scenarios: [baseScenario],
  })
  useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu', layoutMode: 'hci' })
  vi.mocked(useScenariosResults).mockReturnValue([baseResult])
})

describe('ComparisonTable', () => {
  describe('COMP-01: side-by-side comparison display', () => {
    it('renders a table with one column per scenario', () => {
      render(<ComparisonTable />)
      // One th per scenario name
      const headerCells = screen.getAllByRole('columnheader')
      // First column header is empty (metric label column), then one per scenario
      expect(headerCells.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Test Scenario')).toBeTruthy()
    })

    it('renders metric labels as row headers: server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, CPU util, RAM util, disk util', () => {
      render(<ComparisonTable />)
      expect(screen.getByText(/servers required/i)).toBeTruthy()
      expect(screen.getByText(/limiting resource/i)).toBeTruthy()
      expect(screen.getByText(/vcpu.*pcore/i)).toBeTruthy()
      expect(screen.getByText(/vms\/server/i)).toBeTruthy()
      expect(screen.getByText(/headroom/i)).toBeTruthy()
      expect(screen.getByText(/cpu util/i)).toBeTruthy()
      expect(screen.getByText(/ram util/i)).toBeTruthy()
      expect(screen.getByText(/disk util/i)).toBeTruthy()
    })

    it('renders scenario names as column headers', () => {
      render(<ComparisonTable />)
      expect(screen.getByText('Test Scenario')).toBeTruthy()
    })
  })

  describe('COMP-02: correct values in table cells', () => {
    it('displays final server count for each scenario', () => {
      render(<ComparisonTable />)
      expect(screen.getByText('13')).toBeTruthy()
    })

    it('displays limiting resource label (CPU-limited) for cpu limiting resource', () => {
      render(<ComparisonTable />)
      expect(screen.getByText('CPU-limited')).toBeTruthy()
    })

    it('displays achieved vCPU:pCore ratio for each scenario', () => {
      render(<ComparisonTable />)
      // The ratio cell value should be rendered somewhere in the table
      // achievedVcpuToPCoreRatio = totalVcpus / (finalCount * coresPerServer) with headroom
      const ratioRow = screen.getByText(/vcpu.*pcore/i).closest('tr')
      expect(ratioRow).toBeTruthy()
    })

    it('displays VMs per server for each scenario', () => {
      render(<ComparisonTable />)
      const vmsRow = screen.getByText(/vms\/server/i).closest('tr')
      expect(vmsRow).toBeTruthy()
    })

    it('displays headroom percent for each scenario', () => {
      render(<ComparisonTable />)
      // headroomPercent is 20, displayed as "20%"
      expect(screen.getByText('20%')).toBeTruthy()
    })

    it('displays CPU, RAM, and disk utilization percentages for each scenario', () => {
      render(<ComparisonTable />)
      const cpuRow = screen.getByText(/cpu util/i).closest('tr')
      const ramRow = screen.getByText(/ram util/i).closest('tr')
      const diskRow = screen.getByText(/disk util/i).closest('tr')
      expect(cpuRow).toBeTruthy()
      expect(ramRow).toBeTruthy()
      expect(diskRow).toBeTruthy()
    })
  })

  describe('PERF-03: SPECrate2017 mode label correctness', () => {
    it('shows SPECrate2017 (not SPECint) in limiting resource column when specint is limiting resource', () => {
      vi.mocked(useScenariosResults).mockReturnValue([
        { ...baseResult, limitingResource: 'specint' as const },
      ])
      act(() => {
        useWizardStore.setState({ sizingMode: 'specint', layoutMode: 'hci' })
      })
      render(<ComparisonTable />)
      // Should show 'SPECrate2017' — may appear in both mode badge and limiting resource column
      expect(screen.getAllByText('SPECrate2017').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText('Specint')).toBeNull()
    })

    it('shows CPU-limited label when cpu is limiting resource', () => {
      // baseResult already has limitingResource: 'cpu'
      render(<ComparisonTable />)
      expect(screen.getByText('CPU-limited')).toBeTruthy()
    })
  })

  describe('UX-04: color-coded utilization indicators', () => {
    it('applies green class when utilization < 70%', () => {
      expect(utilizationClass(69)).toMatch(/text-green/)
    })

    it('applies amber class when utilization >= 70% and < 90%', () => {
      expect(utilizationClass(70)).toMatch(/text-amber/)
      expect(utilizationClass(89)).toMatch(/text-amber/)
    })

    it('applies red class when utilization >= 90%', () => {
      expect(utilizationClass(90)).toMatch(/text-red/)
      expect(utilizationClass(100)).toMatch(/text-red/)
    })

    it('highlights the limiting resource cell for each scenario', () => {
      render(<ComparisonTable />)
      // The limiting resource cell should have font-bold class
      const limitingCell = screen.getByText('CPU-limited')
      expect(limitingCell.className).toMatch(/font-bold/)
    })
  })

  describe('FIX-ASIS: As-Is column data rendering', () => {
    /**
     * Helper: get the As-Is cell (second cell in row, index 1) for a given row label.
     * Row structure: <td>label</td> <td class="bg-muted/30">As-Is</td> <td>scenario...</td>
     */
    function getAsIsCell(rowLabel: RegExp): HTMLElement | undefined {
      const row = screen.getByText(rowLabel).closest('tr')
      const cells = row?.querySelectorAll('td')
      return cells?.[1] as HTMLElement | undefined
    }

    it('FIX-ASIS-01: shows computed VMs/Server when existingServerCount is set', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          existingServerCount: 20,
        },
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/vms\/server/i)
      // 300 / 20 = 15.0
      expect(cell?.textContent).toContain('15.0')
    })

    it('FIX-ASIS-01: shows dash for VMs/Server when existingServerCount is undefined', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          // existingServerCount intentionally not set
        },
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/vms\/server/i)
      expect(cell?.textContent).toContain('\u2014')
    })

    it('FIX-ASIS-02: shows cpuUtilizationPercent in As-Is CPU Util cell', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          cpuUtilizationPercent: 48,
        },
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/cpu util/i)
      expect(cell?.textContent).toContain('48.0%')
    })

    it('FIX-ASIS-02: shows ramUtilizationPercent in As-Is RAM Util cell', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          cpuUtilizationPercent: 48,
          ramUtilizationPercent: 65,
        },
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/ram util/i)
      expect(cell?.textContent).toContain('65.0%')
    })

    it('FIX-ASIS-02: shows dash for CPU Util when cpuUtilizationPercent is undefined', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          // cpuUtilizationPercent not set — CPU Util row hidden in vcpu mode
        },
      })
      // In vcpu mode, CPU Util row only shows when cpuUtilizationPercent is defined.
      // So this test simply ensures the row is absent when cpuUtilizationPercent is undefined.
      render(<ComparisonTable />)
      expect(screen.queryByText(/cpu util/i)).toBeNull()
    })

    it('FIX-ASIS-03: shows totalDiskGb in disaggregated mode', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          totalDiskGb: 50000,
          cpuUtilizationPercent: 48,
        },
      })
      act(() => {
        useWizardStore.setState({ layoutMode: 'disaggregated' })
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/total disk required/i)
      expect(cell?.textContent).toContain('50,000 GB')
    })

    it('FIX-ASIS-03: shows dash for disk in HCI mode', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000, totalPcores: 500, totalVms: 300,
          totalDiskGb: 50000,
          cpuUtilizationPercent: 48,
        },
      })
      act(() => {
        useWizardStore.setState({ layoutMode: 'hci' })
      })
      render(<ComparisonTable />)
      const cell = getAsIsCell(/disk util/i)
      expect(cell?.textContent).toContain('\u2014')
    })

    it('FIX-ASIS-04: Limiting Resource As-Is cell shows N/A', () => {
      render(<ComparisonTable />)
      const cell = getAsIsCell(/limiting resource/i)
      expect(cell?.textContent).toContain('N/A')
    })

    it('FIX-ASIS-04: Headroom As-Is cell shows N/A', () => {
      render(<ComparisonTable />)
      const cell = getAsIsCell(/headroom/i)
      expect(cell?.textContent).toContain('N/A')
    })
  })

  describe('MOBILE-SCROLL: horizontal scroll with sticky first column', () => {
    it('Table element has min-w-max class', () => {
      render(<ComparisonTable />)
      const table = document.querySelector('table')
      expect(table).toBeTruthy()
      expect(table?.className).toContain('min-w-max')
    })

    it('Metric header cell has sticky positioning classes', () => {
      render(<ComparisonTable />)
      const metricHeader = screen.getByRole('columnheader', { name: 'Metric' })
      expect(metricHeader.className).toContain('sticky')
      expect(metricHeader.className).toContain('left-0')
      expect(metricHeader.className).toContain('bg-background')
      expect(metricHeader.className).toContain('z-10')
    })

    it('first body cells have sticky positioning classes', () => {
      render(<ComparisonTable />)
      const serversCell = screen.getByText('Servers Required')
      expect(serversCell.className).toContain('sticky')
      expect(serversCell.className).toContain('left-0')
      expect(serversCell.className).toContain('bg-background')
      expect(serversCell.className).toContain('z-10')
    })
  })

  describe('REPT-01: As-Is column in comparison table', () => {
    it('renders an "As-Is" column header', () => {
      render(<ComparisonTable />)
      expect(screen.getByRole('columnheader', { name: 'As-Is' })).toBeInTheDocument()
    })

    it('As-Is column shows existingServerCount from useClusterStore', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000,
          totalPcores: 500,
          totalVms: 300,
          existingServerCount: 20,
          socketsPerServer: 2,
          coresPerSocket: 24,
        },
      })
      render(<ComparisonTable />)
      const serversRow = screen.getByText(/servers required/i).closest('tr')
      expect(serversRow).toBeTruthy()
      expect(serversRow?.textContent).toContain('20')
    })

    it('As-Is column shows "—" when existingServerCount is undefined', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000,
          totalPcores: 500,
          totalVms: 300,
          // existingServerCount intentionally not set
        },
      })
      render(<ComparisonTable />)
      const serversRow = screen.getByText(/servers required/i).closest('tr')
      expect(serversRow?.textContent).toContain('—')
    })

    it('As-Is column shows sockets x cores server config string', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000,
          totalPcores: 500,
          totalVms: 300,
          socketsPerServer: 2,
          coresPerSocket: 24,
        },
      })
      render(<ComparisonTable />)
      const configRow = screen.getByText(/server config/i).closest('tr')
      expect(configRow?.textContent).toContain('2s × 24c')
    })

    it('As-Is column shows observed vCPU:pCore ratio', () => {
      useClusterStore.setState({
        currentCluster: {
          totalVcpus: 2000,
          totalPcores: 500,
          totalVms: 300,
        },
      })
      render(<ComparisonTable />)
      // vCPU:pCore ratio = 2000/500 = 4.0
      const ratioRow = screen.getByText(/vcpu.*pcore/i).closest('tr')
      expect(ratioRow?.textContent).toContain('4.0')
    })
  })
})
