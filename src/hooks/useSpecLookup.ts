import { useState, useEffect } from 'react'
import { fetchSpecResults, type SpecResult, type SpecLookupResult } from '@/lib/utils/specLookup'

interface UseSpecLookupReturn {
  results: SpecResult[]
  status: SpecLookupResult['status']
  isLoading: boolean
}

/**
 * Custom hook that auto-fetches SPECrate2017 benchmark results when cpuModel changes.
 *
 * - Derives a slug via cpuModelToSlug, skips fetch if slug is empty
 * - Returns { results, status, isLoading }
 */
export function useSpecLookup(cpuModel: string | undefined): UseSpecLookupReturn {
  const [results, setResults] = useState<SpecResult[]>([])
  const [status, setStatus] = useState<SpecLookupResult['status']>('no-results')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!cpuModel) return

    let cancelled = false

    fetchSpecResults(cpuModel).then((result) => {
      if (!cancelled) {
        setResults(result.results)
        setStatus(result.status)
        setIsLoading(false)
      }
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync reset before async fetch is intentional
    setIsLoading(true)

    return () => {
      cancelled = true
    }
  }, [cpuModel])

  return { results, status, isLoading }
}
