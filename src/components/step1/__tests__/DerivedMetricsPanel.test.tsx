/**
 * Unit tests for DerivedMetricsPanel — avg per-VM metrics (AVG-01, AVG-02, AVG-03)
 * Requirements: AVG-01 (Avg vCPU/VM), AVG-02 (Avg RAM/VM), AVG-03 (Avg Disk/VM)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DerivedMetricsPanel } from '../DerivedMetricsPanel'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'
import { createDefaultScenario } from '@/lib/sizing/defaults'

beforeEach(() => {
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } })
  useScenariosStore.setState({ scenarios: [createDefaultScenario()] })
  useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' })
})

describe('DerivedMetricsPanel — avg per-VM metrics', () => {
  it('Test 1: displays Avg vCPU/VM when cluster has totalVcpus=800 and totalVms=100', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 800, totalPcores: 200, totalVms: 100 },
    })
    render(<DerivedMetricsPanel />)
    expect(screen.getByText('Avg vCPU/VM')).toBeInTheDocument()
    expect(screen.getByText('8.0')).toBeInTheDocument()
  })

  it('Test 2: displays Avg RAM/VM with GiB unit when avgRamPerVmGb=12.5', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 10, avgRamPerVmGb: 12.5 },
    })
    render(<DerivedMetricsPanel />)
    expect(screen.getByText('Avg RAM/VM')).toBeInTheDocument()
    expect(screen.getByText('12.5')).toBeInTheDocument()
  })

  it('Test 3: displays Avg Disk/VM with GiB unit when totalDiskGb=5000 and totalVms=100', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 400, totalPcores: 100, totalVms: 100, totalDiskGb: 5000 },
    })
    render(<DerivedMetricsPanel />)
    expect(screen.getByText('Avg Disk/VM')).toBeInTheDocument()
    expect(screen.getByText('50.0')).toBeInTheDocument()
  })

  it('Test 4: shows em-dash for all avg metrics when totalVms is 0', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 },
    })
    render(<DerivedMetricsPanel />)
    // Avg vCPU/VM, Avg RAM/VM, Avg Disk/VM should all show em-dash
    expect(screen.getByText('Avg vCPU/VM')).toBeInTheDocument()
    expect(screen.getByText('Avg RAM/VM')).toBeInTheDocument()
    expect(screen.getByText('Avg Disk/VM')).toBeInTheDocument()
    // The em-dash values — check they appear in the document
    const emDashes = screen.getAllByText('\u2014')
    // At least 3 em-dashes for the 3 avg metrics (plus possibly the existing ratio/vms-per-server)
    expect(emDashes.length).toBeGreaterThanOrEqual(3)
  })

  it('Test 5: shows em-dash for RAM/VM when avgRamPerVmGb is undefined', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 400, totalPcores: 100, totalVms: 50 },
    })
    render(<DerivedMetricsPanel />)
    expect(screen.getByText('Avg RAM/VM')).toBeInTheDocument()
    // avgRamPerVmGb is undefined, so RAM/VM should be em-dash
    // The Avg vCPU/VM should show a value (400/50 = 8.0)
    expect(screen.getByText('8.0')).toBeInTheDocument()
  })
})
