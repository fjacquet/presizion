import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock the specLookup module before importing hook
vi.mock('@/lib/utils/specLookup', () => ({
  cpuModelToSlug: vi.fn((model: string) => (model ? `slug-${model.toLowerCase()}` : '')),
  fetchSpecResults: vi.fn(),
}))

import { useSpecLookup } from '../useSpecLookup'
import { cpuModelToSlug, fetchSpecResults } from '@/lib/utils/specLookup'

const mockFetch = vi.mocked(fetchSpecResults)
const mockSlug = vi.mocked(cpuModelToSlug)

const SAMPLE_RESULTS = [
  { vendor: 'Dell', system: 'PowerEdge R660', baseResult: 337, peakResult: 400, cores: 32, chips: 2 },
  { vendor: 'HPE', system: 'ProLiant DL360', baseResult: 320, peakResult: 385, cores: 32, chips: 2 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({ results: SAMPLE_RESULTS, status: 'ok' })
})

describe('useSpecLookup', () => {
  it('returns empty results and no-results status when cpuModel is undefined', () => {
    const { result } = renderHook(() => useSpecLookup(undefined))
    expect(result.current.results).toEqual([])
    expect(result.current.status).toBe('no-results')
    expect(result.current.isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns empty results and no-results status when cpuModel is empty string', () => {
    const { result } = renderHook(() => useSpecLookup(''))
    expect(result.current.results).toEqual([])
    expect(result.current.status).toBe('no-results')
    expect(result.current.isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sets isLoading=true during fetch', async () => {
    // Use a deferred promise to control timing
    let resolvePromise!: (value: unknown) => void
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve as (value: unknown) => void
      })
    )

    const { result } = renderHook(() => useSpecLookup('Intel Xeon Gold 6526Y'))

    // Should be loading while fetch is pending
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Resolve and verify loading ends
    await act(async () => {
      resolvePromise({ results: SAMPLE_RESULTS, status: 'ok' })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('fetches results when cpuModel is a non-empty string', async () => {
    const { result } = renderHook(() => useSpecLookup('Intel Xeon Gold 6526Y'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.results).toEqual(SAMPLE_RESULTS)
      expect(result.current.status).toBe('ok')
    })

    expect(mockSlug).toHaveBeenCalledWith('Intel Xeon Gold 6526Y')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('does not fetch when cpuModelToSlug returns empty string', () => {
    mockSlug.mockReturnValueOnce('')
    const { result } = renderHook(() => useSpecLookup('   '))

    expect(result.current.results).toEqual([])
    expect(result.current.status).toBe('no-results')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('re-fetches when cpuModel changes', async () => {
    const { result, rerender } = renderHook(
      ({ model }: { model: string | undefined }) => useSpecLookup(model),
      { initialProps: { model: 'Intel Xeon Gold 6526Y' } }
    )

    await waitFor(() => {
      expect(result.current.results).toEqual(SAMPLE_RESULTS)
    })

    mockFetch.mockResolvedValueOnce({ results: [], status: 'no-results' })
    rerender({ model: 'AMD EPYC 9554' })

    await waitFor(() => {
      expect(result.current.status).toBe('no-results')
      expect(result.current.results).toEqual([])
    })
  })
})
