/**
 * ImportPreviewModal tests for SCOPE-02
 * Tests scope selector rendering and selection behavior
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportPreviewModal } from '../ImportPreviewModal'
import type { ClusterImportResult } from '@/lib/utils/import'

// Mock stores
vi.mock('@/store/useClusterStore', () => ({
  useClusterStore: vi.fn((selector) => selector({ setCurrentCluster: vi.fn() })),
}))

vi.mock('@/store/useScenariosStore', () => ({
  useScenariosStore: vi.fn((selector) =>
    selector({ setScenarios: vi.fn(), seedFromCluster: vi.fn() })
  ),
}))

// Mock aggregateScopes
vi.mock('@/lib/utils/import/scopeAggregator', () => ({
  aggregateScopes: vi.fn(() => ({
    totalVcpus: 50,
    totalVms: 25,
    totalDiskGb: 500,
    avgRamPerVmGb: 8,
    vmCount: 25,
    warnings: [],
  })),
}))

// Build fixtures
const SCOPE_A_DATA = {
  totalVcpus: 80,
  totalVms: 40,
  totalDiskGb: 800,
  avgRamPerVmGb: 8,
  vmCount: 40,
  warnings: [],
}

const SCOPE_B_DATA = {
  totalVcpus: 40,
  totalVms: 20,
  totalDiskGb: 400,
  avgRamPerVmGb: 10,
  vmCount: 20,
  warnings: [],
}

const rawByScope = new Map([
  ['DC1||CL-A', SCOPE_A_DATA],
  ['DC1||CL-B', SCOPE_B_DATA],
])

const MULTI_SCOPE_RESULT: ClusterImportResult = {
  totalVcpus: 120,
  totalVms: 60,
  totalDiskGb: 1200,
  avgRamPerVmGb: 8.67,
  sourceFormat: 'rvtools',
  vmCount: 60,
  warnings: [],
  detectedScopes: ['DC1||CL-A', 'DC1||CL-B'],
  scopeLabels: { 'DC1||CL-A': 'CL-A (DC1)', 'DC1||CL-B': 'CL-B (DC1)' },
  rawByScope,
}

const SINGLE_SCOPE_RESULT: ClusterImportResult = {
  totalVcpus: 80,
  totalVms: 40,
  totalDiskGb: 800,
  avgRamPerVmGb: 8,
  sourceFormat: 'rvtools',
  vmCount: 40,
  warnings: [],
  detectedScopes: ['__all__'],
  scopeLabels: { __all__: 'All' },
  rawByScope: new Map([['__all__', SCOPE_A_DATA]]),
}

const NO_SCOPE_RESULT: ClusterImportResult = {
  totalVcpus: 80,
  totalVms: 40,
  totalDiskGb: 800,
  avgRamPerVmGb: 8,
  sourceFormat: 'liveoptics-csv',
  vmCount: 40,
  warnings: [],
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
}

describe('ImportPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: multi-scope renders checkboxes', () => {
    it('renders "Filter by cluster" heading when detectedScopes has 2 entries', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)
      expect(screen.getByText('Filter by cluster')).toBeInTheDocument()
    })

    it('renders 2 checkboxes for 2 detected scopes', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })

    it('renders scope labels as checkbox labels', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)
      expect(screen.getByText('CL-A (DC1)')).toBeInTheDocument()
      expect(screen.getByText('CL-B (DC1)')).toBeInTheDocument()
    })
  })

  describe('Test 2: all checkboxes checked by default', () => {
    it('all scope checkboxes are checked on open', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked()
      })
    })
  })

  describe('Test 3: single-scope renders no scope selector', () => {
    it('does not render scope selector when detectedScopes has 1 entry', () => {
      render(<ImportPreviewModal result={SINGLE_SCOPE_RESULT} {...defaultProps} />)
      expect(screen.queryByText('Filter by cluster')).not.toBeInTheDocument()
    })

    it('does not render checkboxes when detectedScopes is absent', () => {
      render(<ImportPreviewModal result={NO_SCOPE_RESULT} {...defaultProps} />)
      expect(screen.queryByText('Filter by cluster')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    })
  })

  describe('Test 4: unchecking scope calls aggregateScopes', () => {
    it('calls aggregateScopes with reduced selectedKeys when a scope is unchecked', () => {
      const { aggregateScopes } = vi.mocked(
        await import('@/lib/utils/import/scopeAggregator')
      )
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)

      // Uncheck the first checkbox (CL-A)
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      // Should call aggregateScopes with only the remaining scope
      expect(aggregateScopes).toHaveBeenCalledWith(
        rawByScope,
        expect.arrayContaining(['DC1||CL-B'])
      )
    })
  })

  describe('Test 5: Apply with subset passes re-aggregated data to setCurrentCluster', () => {
    it('clicking Apply passes aggregateScopes result to setCurrentCluster', async () => {
      const { aggregateScopes } = vi.mocked(
        await import('@/lib/utils/import/scopeAggregator')
      )
      const { useClusterStore } = await import('@/store/useClusterStore')
      const mockSetCurrentCluster = vi.fn()
      vi.mocked(useClusterStore).mockImplementation((selector) =>
        selector({ setCurrentCluster: mockSetCurrentCluster })
      )

      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)

      // Uncheck first scope
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      // Click Apply
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      const aggregated = aggregateScopes(rawByScope, ['DC1||CL-B'])
      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({ totalVcpus: aggregated.totalVcpus })
      )
    })
  })

  describe('Test 6: single-cluster import Apply flow unchanged', () => {
    it('Apply without detectedScopes uses result directly', async () => {
      const { useClusterStore } = await import('@/store/useClusterStore')
      const mockSetCurrentCluster = vi.fn()
      vi.mocked(useClusterStore).mockImplementation((selector) =>
        selector({ setCurrentCluster: mockSetCurrentCluster })
      )

      render(<ImportPreviewModal result={NO_SCOPE_RESULT} {...defaultProps} />)
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({ totalVcpus: 80, totalVms: 40 })
      )
    })
  })
})
