import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SPEC_SEARCH_API_URL, SPEC_SEARCH_WEB_URL } from '../../config'
import {
  cpuModelToSlug,
  fetchSpecResults,
  type SpecResult,
  type SpecLookupResult,
} from '../specLookup'

/* ------------------------------------------------------------------ */
/*  Config constants                                                   */
/* ------------------------------------------------------------------ */
describe('SPEC Search config constants', () => {
  it('exports SPEC_SEARCH_API_URL', () => {
    expect(SPEC_SEARCH_API_URL).toBe('https://fjacquet.github.io/spec-search')
  })

  it('exports SPEC_SEARCH_WEB_URL', () => {
    expect(SPEC_SEARCH_WEB_URL).toBe('https://fjacquet.github.io/spec-search')
  })
})

/* ------------------------------------------------------------------ */
/*  cpuModelToSlug                                                     */
/* ------------------------------------------------------------------ */
describe('cpuModelToSlug', () => {
  it('converts Intel Xeon Gold with clock speed', () => {
    expect(cpuModelToSlug('Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz')).toBe(
      'intel-xeon-gold-6526y'
    )
  })

  it('converts AMD EPYC with core count', () => {
    expect(cpuModelToSlug('AMD EPYC 9654 96-Core Processor')).toBe(
      'amd-epyc-9654'
    )
  })

  it('strips (R) and + from Platinum models', () => {
    expect(cpuModelToSlug('Intel(R) Xeon(R) Platinum 8480+')).toBe(
      'intel-xeon-platinum-8480'
    )
  })

  it('returns empty string for empty input', () => {
    expect(cpuModelToSlug('')).toBe('')
  })

  it('trims whitespace and normalizes', () => {
    expect(cpuModelToSlug('  Intel Xeon E5-2680 v4  ')).toBe(
      'intel-xeon-e5-2680-v4'
    )
  })

  it('handles model with (TM) marker', () => {
    expect(cpuModelToSlug('Intel(TM) Xeon(TM) Silver 4310')).toBe(
      'intel-xeon-silver-4310'
    )
  })
})

/* ------------------------------------------------------------------ */
/*  fetchSpecResults                                                   */
/* ------------------------------------------------------------------ */
describe('fetchSpecResults', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('returns parsed CINT2017rate results for a valid slug', async () => {
    const mockResponse = {
      processor: 'intel-xeon-gold-6526y',
      results: [
        {
          benchmark: 'CINT2017rate',
          vendor: 'Dell Inc.',
          system: 'PowerEdge R760',
          baseResult: 320,
          peakResult: 350,
          cores: 16,
          chips: 2,
        },
        {
          benchmark: 'CFP2017rate',
          vendor: 'Dell Inc.',
          system: 'PowerEdge R760',
          baseResult: 400,
          peakResult: 420,
          cores: 16,
          chips: 2,
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await fetchSpecResults('intel-xeon-gold-6526y')

    expect(result.status).toBe('ok')
    expect(result.results).toHaveLength(1)
    expect(result.results[0].vendor).toBe('Dell Inc.')
    expect(result.results[0].benchmark).toBeUndefined()
  })

  it('returns empty array with error status on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchSpecResults('invalid-slug')

    expect(result.status).toBe('error')
    expect(result.results).toEqual([])
  })

  it('returns empty array with error status on non-200 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    const result = await fetchSpecResults('nonexistent-cpu')

    expect(result.status).toBe('error')
    expect(result.results).toEqual([])
  })

  it('returns no-results status when 200 but no CINT2017rate matches', async () => {
    const mockResponse = {
      processor: 'some-cpu',
      results: [
        {
          benchmark: 'CFP2017rate',
          vendor: 'HP',
          system: 'ProLiant',
          baseResult: 100,
          peakResult: 110,
          cores: 8,
          chips: 1,
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await fetchSpecResults('some-cpu')

    expect(result.status).toBe('no-results')
    expect(result.results).toEqual([])
  })

  it('returns no-results when results array is empty', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ processor: 'x', results: [] }),
    })

    const result = await fetchSpecResults('empty-cpu')

    expect(result.status).toBe('no-results')
    expect(result.results).toEqual([])
  })
})
