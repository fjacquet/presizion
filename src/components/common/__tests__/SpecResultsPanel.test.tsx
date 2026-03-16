import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpecResultsPanel } from '../SpecResultsPanel'
import type { SpecResult } from '@/lib/utils/specLookup'

const SAMPLE_RESULTS: SpecResult[] = [
  { vendor: 'Dell', system: 'PowerEdge R660', baseResult: 337, peakResult: 400, cores: 32, chips: 2 },
  { vendor: 'HPE', system: 'ProLiant DL360', baseResult: 320, peakResult: 385, cores: 32, chips: 2 },
]

describe('SpecResultsPanel', () => {
  it('renders a collapsible section with heading "SPECrate2017 Results"', () => {
    render(
      <SpecResultsPanel results={SAMPLE_RESULTS} status="ok" isLoading={false} onSelect={vi.fn()} />
    )
    expect(screen.getByText('SPECrate2017 Results')).toBeInTheDocument()
  })

  it('renders a table with columns: Vendor, System, Base Score, Cores, Chips', () => {
    render(
      <SpecResultsPanel results={SAMPLE_RESULTS} status="ok" isLoading={false} onSelect={vi.fn()} />
    )
    // Open the collapsible
    fireEvent.click(screen.getByText('SPECrate2017 Results'))

    expect(screen.getByText('Vendor')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Base Score')).toBeInTheDocument()
    expect(screen.getByText('Cores')).toBeInTheDocument()
    expect(screen.getByText('Chips')).toBeInTheDocument()
  })

  it('renders result rows with data', () => {
    render(
      <SpecResultsPanel results={SAMPLE_RESULTS} status="ok" isLoading={false} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))

    expect(screen.getByText('Dell')).toBeInTheDocument()
    expect(screen.getByText('PowerEdge R660')).toBeInTheDocument()
    expect(screen.getByText('337')).toBeInTheDocument()
    expect(screen.getByText('HPE')).toBeInTheDocument()
    expect(screen.getByText('ProLiant DL360')).toBeInTheDocument()
    expect(screen.getByText('320')).toBeInTheDocument()
  })

  it('calls onSelect with baseResult when a row is clicked', () => {
    const onSelect = vi.fn()
    render(
      <SpecResultsPanel results={SAMPLE_RESULTS} status="ok" isLoading={false} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))

    // Click the row containing Dell
    fireEvent.click(screen.getByText('Dell'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ baseResult: 337 }))
  })

  it('highlights the selected row', () => {
    render(
      <SpecResultsPanel
        results={SAMPLE_RESULTS}
        status="ok"
        isLoading={false}
        onSelect={vi.fn()}
        selectedScore={337}
      />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))

    // The row with Dell (baseResult=337) should have the highlight class
    const dellRow = screen.getByText('Dell').closest('tr')
    expect(dellRow?.className).toContain('bg-primary/10')
  })

  it('shows "No SPECrate2017 results found" when status is no-results', () => {
    render(
      <SpecResultsPanel results={[]} status="no-results" isLoading={false} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))
    expect(screen.getByText(/no specrate2017 results found/i)).toBeInTheDocument()
  })

  it('shows error message when status is error', () => {
    render(
      <SpecResultsPanel results={[]} status="error" isLoading={false} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))
    expect(screen.getByText(/could not fetch spec results/i)).toBeInTheDocument()
  })

  it('shows loading indicator when isLoading is true', () => {
    render(
      <SpecResultsPanel results={[]} status="ok" isLoading={true} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders table with min-w-max class for horizontal scroll', () => {
    render(
      <SpecResultsPanel results={SAMPLE_RESULTS} status="ok" isLoading={false} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('SPECrate2017 Results'))
    const table = document.querySelector('table')
    expect(table?.className).toContain('min-w-max')
  })
})
