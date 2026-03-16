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
    const specintBtn = screen.getByRole('button', { name: /specrate2017/i })
    expect(specintBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders SPECint button with aria-pressed=true when sizingMode is specint', () => {
    useWizardStore.setState({ sizingMode: 'specint' })
    render(<SizingModeToggle />)
    const specintBtn = screen.getByRole('button', { name: /specrate2017/i })
    expect(specintBtn).toHaveAttribute('aria-pressed', 'true')
    const vcpuBtn = screen.getByRole('button', { name: /vcpu/i })
    expect(vcpuBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking SPECint button calls setSizingMode with specint', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'vcpu', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /specrate2017/i }))
    expect(setSizingMode).toHaveBeenCalledWith('specint')
  })

  it('clicking vCPU button calls setSizingMode with vcpu', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'specint', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /vcpu/i }))
    expect(setSizingMode).toHaveBeenCalledWith('vcpu')
  })

  describe('Phase 28: Mobile foundation', () => {
    it('NAV-03: sizing mode group has flex-wrap class', () => {
      render(<SizingModeToggle />)
      const group = screen.getByRole('group', { name: /sizing mode/i })
      expect(group.className).toMatch(/flex-wrap/)
    })

    it('MOBILE-03: mode buttons have min-h-[44px] touch target', () => {
      render(<SizingModeToggle />)
      const vcpuBtn = screen.getByRole('button', { name: /vcpu/i })
      expect(vcpuBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('NAV-03: layout mode group has flex-wrap class', () => {
      render(<SizingModeToggle />)
      const group = screen.getByRole('group', { name: /layout mode/i })
      expect(group.className).toMatch(/flex-wrap/)
    })
  })
})
