/**
 * useImportStore tests for Phase 14 (SCOPE-04)
 * Tests import buffer persistence and re-aggregation logic
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ScopeData } from '@/lib/utils/import'

// Mock modules — factories must not reference outer variables (hoisting)
vi.mock('@/lib/utils/import/scopeAggregator', () => ({
  aggregateScopes: vi.fn(),
}))

vi.mock('@/store/useClusterStore', () => ({
  useClusterStore: {
    getState: vi.fn(() => ({ setCurrentCluster: vi.fn() })),
  },
}))

// Import mocked modules and the store AFTER mocks are registered
import * as scopeAggregatorModule from '@/lib/utils/import/scopeAggregator'
import * as clusterStoreModule from '@/store/useClusterStore'
import { useImportStore } from '../useImportStore'

// Fixtures
const SCOPE_A: ScopeData = {
  totalVcpus: 80,
  totalVms: 40,
  totalDiskGb: 800,
  avgRamPerVmGb: 8,
  vmCount: 40,
  warnings: [],
}

const SCOPE_B: ScopeData = {
  totalVcpus: 40,
  totalVms: 20,
  totalDiskGb: 400,
  avgRamPerVmGb: 10,
  vmCount: 20,
  warnings: [],
}

const rawByScope = new Map<string, ScopeData>([
  ['CL-A', SCOPE_A],
  ['CL-B', SCOPE_B],
])

const scopeLabels: Record<string, string> = { 'CL-A': 'Cluster A', 'CL-B': 'Cluster B' }
const activeScope = ['CL-A', 'CL-B']

const AGGREGATE_RESULT: ScopeData = {
  totalVcpus: 120,
  totalVms: 60,
  totalDiskGb: 1200,
  avgRamPerVmGb: 8.67,
  vmCount: 60,
  warnings: [],
}

describe('useImportStore', () => {
  let mockSetCurrentCluster: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up fresh mockSetCurrentCluster per test
    mockSetCurrentCluster = vi.fn()
    vi.mocked(clusterStoreModule.useClusterStore.getState).mockReturnValue({
      setCurrentCluster: mockSetCurrentCluster,
    })
    vi.mocked(scopeAggregatorModule.aggregateScopes).mockReturnValue(AGGREGATE_RESULT)
    // Reset store to initial state between tests
    useImportStore.setState({
      rawByScope: null,
      scopeLabels: {},
      activeScope: [],
      scopeOptions: [],
    })
  })

  describe('Test 1: Initial state', () => {
    it('has rawByScope=null, scopeOptions=[], activeScope=[], scopeLabels={}', () => {
      const state = useImportStore.getState()
      expect(state.rawByScope).toBeNull()
      expect(state.scopeOptions).toEqual([])
      expect(state.activeScope).toEqual([])
      expect(state.scopeLabels).toEqual({})
    })
  })

  describe('Test 2: setImportBuffer', () => {
    it('stores rawByScope, scopeLabels, activeScope, and derives scopeOptions from map keys', () => {
      useImportStore.getState().setImportBuffer(rawByScope, scopeLabels, activeScope)
      const state = useImportStore.getState()
      expect(state.rawByScope).toBe(rawByScope)
      expect(state.scopeLabels).toEqual(scopeLabels)
      expect(state.activeScope).toEqual(activeScope)
      expect(state.scopeOptions).toEqual(['CL-A', 'CL-B'])
    })
  })

  describe('Test 3: setActiveScope calls aggregateScopes and updates cluster', () => {
    it('calls aggregateScopes(rawByScope, newKeys) and calls setCurrentCluster with result', () => {
      useImportStore.getState().setImportBuffer(rawByScope, scopeLabels, activeScope)
      useImportStore.getState().setActiveScope(['CL-A'])

      expect(scopeAggregatorModule.aggregateScopes).toHaveBeenCalledWith(rawByScope, ['CL-A'])
      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({
          totalVcpus: AGGREGATE_RESULT.totalVcpus,
          totalVms: AGGREGATE_RESULT.totalVms,
        })
      )
    })
  })

  describe('Test 4: setActiveScope with empty array', () => {
    it('calls aggregateScopes with [] and updates cluster to zeros', () => {
      const zeroResult: ScopeData = {
        totalVcpus: 0, totalVms: 0, totalDiskGb: 0, avgRamPerVmGb: 0, vmCount: 0, warnings: [],
      }
      vi.mocked(scopeAggregatorModule.aggregateScopes).mockReturnValueOnce(zeroResult)

      useImportStore.getState().setImportBuffer(rawByScope, scopeLabels, activeScope)
      useImportStore.getState().setActiveScope([])

      expect(scopeAggregatorModule.aggregateScopes).toHaveBeenCalledWith(rawByScope, [])
      expect(mockSetCurrentCluster).toHaveBeenCalledWith(
        expect.objectContaining({ totalVcpus: 0, totalVms: 0 })
      )
    })
  })

  describe('Test 5: clearImport resets to initial state', () => {
    it('resets all fields to null/empty after clearImport', () => {
      useImportStore.getState().setImportBuffer(rawByScope, scopeLabels, activeScope)
      useImportStore.getState().clearImport()
      const state = useImportStore.getState()
      expect(state.rawByScope).toBeNull()
      expect(state.scopeOptions).toEqual([])
      expect(state.activeScope).toEqual([])
      expect(state.scopeLabels).toEqual({})
    })
  })

  describe('Test 6: setActiveScope does nothing when rawByScope is null', () => {
    it('does not crash and does not call aggregateScopes or setCurrentCluster', () => {
      expect(useImportStore.getState().rawByScope).toBeNull()
      expect(() => useImportStore.getState().setActiveScope(['CL-A'])).not.toThrow()
      expect(scopeAggregatorModule.aggregateScopes).not.toHaveBeenCalled()
      expect(mockSetCurrentCluster).not.toHaveBeenCalled()
    })
  })
})
