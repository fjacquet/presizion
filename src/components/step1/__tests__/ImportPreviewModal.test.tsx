/**
 * ImportPreviewModal tests for SCOPE-02 and SCOPE-04
 * Tests scope selector rendering, selection behavior, and import buffer wiring
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportPreviewModal } from '../ImportPreviewModal'
import type { ClusterImportResult } from '@/lib/utils/import'
import type { JsonImportResult } from '@/lib/utils/import'
import * as scopeAggregatorModule from '@/lib/utils/import/scopeAggregator'
import * as clusterStoreModule from '@/store/useClusterStore'

// Mock stores
const mockSetCurrentCluster = vi.fn()
const mockSeedFromCluster = vi.fn()
const mockSetScenarios = vi.fn()
const mockSetImportBuffer = vi.fn()

vi.mock('@/store/useClusterStore', () => ({
  useClusterStore: vi.fn((selector) => selector({ setCurrentCluster: mockSetCurrentCluster })),
}))

vi.mock('@/store/useScenariosStore', () => ({
  useScenariosStore: vi.fn((selector) =>
    selector({ setScenarios: mockSetScenarios, seedFromCluster: mockSeedFromCluster })
  ),
}))

vi.mock('@/store/useImportStore', () => ({
  useImportStore: vi.fn((selector) => selector({ setImportBuffer: mockSetImportBuffer })),
}))

// Mock aggregateScopes
const AGGREGATED_RESULT = {
  totalVcpus: 40,
  totalVms: 20,
  totalDiskGb: 400,
  avgRamPerVmGb: 10,
  vmCount: 20,
  warnings: [],
}

vi.mock('@/lib/utils/import/scopeAggregator', () => ({
  aggregateScopes: vi.fn(() => AGGREGATED_RESULT),
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
    // Re-bind mocks after clearAllMocks
    vi.mocked(clusterStoreModule.useClusterStore).mockImplementation((selector) =>
      selector({ setCurrentCluster: mockSetCurrentCluster })
    )
    vi.mocked(scopeAggregatorModule.aggregateScopes).mockReturnValue(AGGREGATED_RESULT)
  })

  // Note: useImportStore mock re-binding is not needed because it uses the
  // module-level mockSetImportBuffer variable (not cleared by clearAllMocks binding)

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
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)

      // Uncheck the first checkbox (CL-A)
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      // Should call aggregateScopes with only the remaining scope
      expect(scopeAggregatorModule.aggregateScopes).toHaveBeenCalledWith(
        rawByScope,
        expect.arrayContaining(['DC1||CL-B'])
      )
    })
  })

  describe('Test 5: Apply with subset passes re-aggregated data to setCurrentCluster', () => {
    it('clicking Apply passes aggregateScopes result to setCurrentCluster', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)

      // Uncheck first scope
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      // Click Apply
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({ totalVcpus: AGGREGATED_RESULT.totalVcpus })
      )
    })
  })

  describe('Test 6: single-cluster import Apply flow unchanged', () => {
    it('Apply without detectedScopes uses result directly', () => {
      render(<ImportPreviewModal result={NO_SCOPE_RESULT} {...defaultProps} />)
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({ totalVcpus: 80, totalVms: 40 })
      )
    })
  })

  describe('Test 7 (SCOPE-04): Apply on multi-scope result calls setImportBuffer', () => {
    it('clicking Apply with a multi-scope result calls setImportBuffer with rawByScope, scopeLabels, selectedScopes', () => {
      render(<ImportPreviewModal result={MULTI_SCOPE_RESULT} {...defaultProps} />)
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      expect(mockSetImportBuffer).toHaveBeenCalledOnce()
      expect(mockSetImportBuffer).toHaveBeenCalledWith(
        rawByScope,
        MULTI_SCOPE_RESULT.scopeLabels,
        expect.arrayContaining(['DC1||CL-A', 'DC1||CL-B'])
      )
    })
  })

  describe('Test 8 (SCOPE-04): Apply on JSON import does NOT call setImportBuffer', () => {
    it('clicking Apply with a JSON import result does not call setImportBuffer', () => {
      const JSON_RESULT: JsonImportResult = {
        sourceFormat: 'presizion-json',
        cluster: { totalVcpus: 80, totalPcores: 40, totalVms: 30 },
        scenarios: [],
        warnings: [],
      }
      render(<ImportPreviewModal result={JSON_RESULT} {...defaultProps} />)
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      fireEvent.click(applyBtn)

      expect(mockSetImportBuffer).not.toHaveBeenCalled()
    })
  })
})
