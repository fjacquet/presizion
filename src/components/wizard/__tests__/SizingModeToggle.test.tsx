/**
 * SizingModeToggle — Unit tests
 * Requirements: PERF-02, PERF-03
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SizingModeToggle } from '../SizingModeToggle'
import { useWizardStore } from '@/store/useWizardStore'

/** Returns the actual ModeBtn (the one with aria-pressed) from among matched buttons. */
function getModeBtn(container: HTMLElement, name: string | RegExp): HTMLElement {
  const all = within(container).getAllByRole('button', { name })
  const btn = all.find((el) => el.hasAttribute('aria-pressed'))
  if (!btn) throw new Error(`No button with aria-pressed found for: ${String(name)}`)
  return btn
}

describe('SizingModeToggle', () => {
  beforeEach(() => {
    useWizardStore.setState({ sizingMode: 'vcpu' })
  })

  it('renders only vCPU and Performance modes', () => {
    render(<SizingModeToggle />)
    expect(screen.getByText('vCPU')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.queryByText('Aggressive')).not.toBeInTheDocument()
    expect(screen.queryByText('GHz')).not.toBeInTheDocument()
    expect(screen.queryByText('SPECrate2017')).not.toBeInTheDocument()
  })

  it('renders vCPU button with aria-pressed=true when sizingMode is vcpu', () => {
    useWizardStore.setState({ sizingMode: 'vcpu' })
    render(<SizingModeToggle />)
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i })
    const vcpuBtn = getModeBtn(sizingGroup, /vcpu/i)
    expect(vcpuBtn).toHaveAttribute('aria-pressed', 'true')
    const perfBtn = getModeBtn(sizingGroup, 'Performance')
    expect(perfBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders Performance button with aria-pressed=true when sizingMode is performance', () => {
    useWizardStore.setState({ sizingMode: 'performance' })
    render(<SizingModeToggle />)
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i })
    const perfBtn = getModeBtn(sizingGroup, 'Performance')
    expect(perfBtn).toHaveAttribute('aria-pressed', 'true')
    const vcpuBtn = getModeBtn(sizingGroup, /vcpu/i)
    expect(vcpuBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Performance button calls setSizingMode with performance', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'vcpu', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByText('Performance'))
    expect(setSizingMode).toHaveBeenCalledWith('performance')
  })

  it('clicking vCPU button calls setSizingMode with vcpu', () => {
    const setSizingMode = vi.fn()
    useWizardStore.setState({ sizingMode: 'performance', setSizingMode })
    render(<SizingModeToggle />)
    fireEvent.click(screen.getByText('vCPU'))
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
      const sizingGroup = screen.getByRole('group', { name: /sizing mode/i })
      const vcpuBtn = getModeBtn(sizingGroup, /vcpu/i)
      expect(vcpuBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('NAV-03: layout mode group has flex-wrap class', () => {
      render(<SizingModeToggle />)
      const group = screen.getByRole('group', { name: /layout mode/i })
      expect(group.className).toMatch(/flex-wrap/)
    })
  })
})
