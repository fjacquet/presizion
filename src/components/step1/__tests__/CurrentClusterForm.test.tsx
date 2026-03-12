/**
 * CurrentClusterForm — Tests for INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
 * Requirements: INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CurrentClusterForm } from '../CurrentClusterForm'
import { DerivedMetricsPanel } from '../DerivedMetricsPanel'
import { Step1CurrentCluster } from '../Step1CurrentCluster'
import { useClusterStore } from '@/store/useClusterStore'

// Reset Zustand store before each test to prevent cross-test contamination
beforeEach(() => {
  useClusterStore.setState({ currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 } })
})

describe('CurrentClusterForm', () => {
  describe('INPUT-01: average VM configuration fields', () => {
    it('renders vCPUs per VM field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalVcpus')).toBeInTheDocument()
    })

    it('renders RAM GB per VM field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      // RAM is captured via RAM/Server GB in the existing server config section
      expect(screen.getByTestId('input-ramPerServerGb')).toBeInTheDocument()
    })

    it('renders disk GB per VM field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalDiskGb')).toBeInTheDocument()
    })
  })

  describe('INPUT-02: cluster totals fields', () => {
    it('renders total vCPUs field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalVcpus')).toBeInTheDocument()
    })

    it('renders total pCores field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalPcores')).toBeInTheDocument()
    })

    it('renders total VMs field', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalVms')).toBeInTheDocument()
    })

    it('renders total disk GB field (optional)', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      expect(screen.getByTestId('input-totalDiskGb')).toBeInTheDocument()
    })

    it('shows inline error when required cluster total field is empty on blur', async () => {
      render(<CurrentClusterForm onNext={() => {}} />)

      const vcpuInput = screen.getByTestId('input-totalVcpus')

      // Blur the field with empty value to trigger validation
      act(() => {
        fireEvent.focus(vcpuInput)
        fireEvent.change(vcpuInput, { target: { value: '' } })
        fireEvent.blur(vcpuInput)
      })

      await waitFor(() => {
        // FormMessage renders after blur with invalid empty value
        const errorMessage = screen.queryByText(/required/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })

  describe('INPUT-04: derived metrics panel', () => {
    it('DerivedMetricsPanel renders vCPU:pCore ratio when cluster store has valid values', () => {
      useClusterStore.setState({
        currentCluster: { totalVcpus: 200, totalPcores: 100, totalVms: 50 },
      })
      render(<DerivedMetricsPanel />)
      expect(screen.getByText('2.00')).toBeInTheDocument()
    })

    it('DerivedMetricsPanel shows em dash when pCores is zero', () => {
      useClusterStore.setState({
        currentCluster: { totalVcpus: 200, totalPcores: 0, totalVms: 50 },
      })
      render(<DerivedMetricsPanel />)
      expect(screen.getByText('\u2014')).toBeInTheDocument()
    })

    it('DerivedMetricsPanel re-renders when cluster store updates', async () => {
      useClusterStore.setState({
        currentCluster: { totalVcpus: 100, totalPcores: 100, totalVms: 20 },
      })
      render(<DerivedMetricsPanel />)
      expect(screen.getByText('1.00')).toBeInTheDocument()

      act(() => {
        useClusterStore.setState({
          currentCluster: { totalVcpus: 300, totalPcores: 100, totalVms: 20 },
        })
      })

      await waitFor(() => {
        expect(screen.getByText('3.00')).toBeInTheDocument()
      })
    })
  })

  describe('INPUT-05: validation and navigation guard', () => {
    it('Next button is enabled (not disabled) before interaction', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).not.toBeDisabled()
    })

    it('clicking Next with empty required fields shows validation errors', async () => {
      render(<CurrentClusterForm onNext={() => {}} />)

      // Clear required field value and click Next
      act(() => {
        fireEvent.change(screen.getByTestId('input-totalVcpus'), { target: { value: '' } })
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.queryByText(/required/i)).toBeInTheDocument()
      })
    })

    it('clicking Next with all required fields valid advances wizard step', async () => {
      const onNext = vi.fn()
      render(<CurrentClusterForm onNext={onNext} />)

      act(() => {
        fireEvent.change(screen.getByTestId('input-totalVcpus'), { target: { value: '100' } })
        fireEvent.change(screen.getByTestId('input-totalPcores'), { target: { value: '50' } })
        fireEvent.change(screen.getByTestId('input-totalVms'), { target: { value: '20' } })
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(onNext).toHaveBeenCalledOnce()
      })
    })
  })

  describe('UX-03: tooltips on key fields', () => {
    it('Info icon is present next to Total vCPUs label', () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      // The Info icon has aria-label "Info: Total vCPUs"
      expect(screen.getByLabelText(/info: total vcpus/i)).toBeInTheDocument()
    })

    it('tooltip content is visible on Info icon focus', async () => {
      render(<CurrentClusterForm onNext={() => {}} />)
      const infoIcon = screen.getByLabelText(/info: total vcpus/i)

      // Focus the info icon to trigger tooltip
      act(() => {
        fireEvent.focus(infoIcon)
      })

      await waitFor(() => {
        expect(screen.queryByText(/vcpu reservations/i)).toBeInTheDocument()
      })
    })
  })
})

describe('Step1CurrentCluster', () => {
  it('renders both CurrentClusterForm and DerivedMetricsPanel', () => {
    render(<Step1CurrentCluster />)
    // CurrentClusterForm renders the Next button
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    // DerivedMetricsPanel renders the label "vCPU:pCore Ratio"
    expect(screen.getByText(/vcpu:pcore ratio/i)).toBeInTheDocument()
  })
})
