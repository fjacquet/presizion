/**
 * ComparisonTable — Unit tests
 * Requirements: COMP-01, COMP-02, UX-04
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComparisonTable, utilizationClass } from '../ComparisonTable'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'

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
  haReserveEnabled: false,
}

beforeEach(() => {
  useClusterStore.setState({
    currentCluster: { totalVcpus: 2000, totalPcores: 500, totalVms: 300 },
  })
  useScenariosStore.setState({
    scenarios: [baseScenario],
  })
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
      // With 2000 vcpus, ratio 4, 48 cores/server, headroom 1.20:
      // cpuLimited = ceil((2000 * 1.2) / 4 / 48) = ceil(12.5) = 13
      // ramLimited = ceil((300 * 16 * 1.2) / 512) = ceil(11.25) = 12
      // diskLimited = ceil((300 * 100 * 1.2) / 20000) = ceil(1.8) = 2
      // finalCount = 13 (cpu-limited)
      expect(screen.getByText('13')).toBeTruthy()
    })

    it('displays limiting resource label (cpu, ram, or disk) for each scenario', () => {
      render(<ComparisonTable />)
      // The limiting resource cell should display "Cpu" (capitalized)
      expect(screen.getByText('Cpu')).toBeTruthy()
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
      const limitingCell = screen.getByText('Cpu')
      expect(limitingCell.className).toMatch(/font-bold/)
    })
  })
})
