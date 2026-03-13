/**
 * SizingModeToggle — Unit tests
 * Requirements: PERF-02, PERF-03
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SizingModeToggle } from '../SizingModeToggle'
import { useWizardStore } from '@/store/useWizardStore'

describe('SizingModeToggle', () => {
  beforeEach(() => {
    useWizardStore.setState({ sizingMode: 'vcpu' })
  })

  it('renders vCPU button with aria-pressed=true when sizingMode is vcpu', () => {
    useWizardStore.setState({ sizingMode: 'vcpu' })
    render(<SizingModeToggle />)
    const vcpuBtn = screen.getByRole('button', { name: /vcpu/i })
    expect(vcpuBtn).toHaveAttribute('aria-pressed', 'true')
    const specintBtn = screen.getByRole('button', { name: /specint/i })
    expect(specintBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders SPECint button with aria-pressed=true when sizingMode is specint', () => {
    useWizardStore.setState({ sizingMode: 'specint' })
    render(<SizingModeToggle />)
    const specintBtn = screen.getByRole('button', { name: /specint/i })
    expect(specintBtn).toHaveAttribute('aria-pressed', 'true')
    const vcpuBtn = screen.getByRole('button', { name: /vcpu/i })
    expect(vcpuBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking SPECint button calls setSizingMode with specint', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'vcpu', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /specint/i }))
    expect(setSizingMode).toHaveBeenCalledWith('specint')
  })

  it('clicking vCPU button calls setSizingMode with vcpu', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'specint', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /vcpu/i }))
    expect(setSizingMode).toHaveBeenCalledWith('vcpu')
  })
})
