/**
 * SPEC Lookup Service -- slug derivation + fetch for SPECrate2017 results.
 *
 * Converts CPU model strings to URL-safe slugs matching the spec-search
 * GitHub Pages API, then fetches and filters CINT2017rate benchmark data.
 * Falls back to facets.json for partial model name matching.
 * Dell vendor results are sorted first (presales tool preference).
 */

import { SPEC_SEARCH_CPU2017_DATA_URL } from '../config'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SpecResult {
  vendor: string
  system: string
  baseResult: number
  peakResult: number
  cores: number
  chips: number
}

export interface SpecLookupResult {
  results: SpecResult[]
  status: 'ok' | 'no-results' | 'error'
}

/** Shape of a single result entry from the spec-search API */
interface RawSpecEntry {
  benchmark: string
  vendor: string
  system: string
  baseResult: number
  peakResult: number
  cores: number
  chips: number
}

/** Shape of the spec-search API JSON response */
interface RawSpecResponse {
  processor: string
  results: RawSpecEntry[]
}

/** Shape of the facets.json response */
interface FacetsResponse {
  processors: string[]
}

/* ------------------------------------------------------------------ */
/*  Slug Derivation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Convert a CPU model string to a URL-safe slug matching the spec-search
 * API convention (derived from convert_csv.py).
 */
export function cpuModelToSlug(model: string): string {
  if (!model.trim()) return ''

  let slug = model.toLowerCase()
  slug = slug.replace(/\(r\)/g, '')
  slug = slug.replace(/\(tm\)/g, '')
  slug = slug.replace(/\bcpu\b/g, '')
  slug = slug.replace(/\bprocessor\b/g, '')
  slug = slug.replace(/@?\s*\d+(\.\d+)?\s*ghz/g, '')
  slug = slug.replace(/\d+-core/g, '')
  slug = slug.replace(/[^a-z0-9]+/g, '-')
  slug = slug.replace(/^-+|-+$/g, '')

  return slug
}

/* ------------------------------------------------------------------ */
/*  Facets cache (fetched once, reused for partial matching)           */
/* ------------------------------------------------------------------ */

let cachedProcessors: string[] | null = null

async function getProcessorList(): Promise<string[]> {
  if (cachedProcessors) return cachedProcessors
  try {
    const res = await fetch(`${SPEC_SEARCH_CPU2017_DATA_URL}/facets.json`)
    if (!res.ok) return []
    const data: FacetsResponse = await res.json()
    cachedProcessors = data.processors ?? []
    return cachedProcessors
  } catch {
    return []
  }
}

/** Sort Dell vendor results first, then by baseResult descending */
function sortDellFirst(results: SpecResult[]): SpecResult[] {
  return [...results].sort((a, b) => {
    const aIsDell = a.vendor.toLowerCase().includes('dell') ? 0 : 1
    const bIsDell = b.vendor.toLowerCase().includes('dell') ? 0 : 1
    if (aIsDell !== bIsDell) return aIsDell - bIsDell
    return b.baseResult - a.baseResult
  })
}

/* ------------------------------------------------------------------ */
/*  Fetch Service                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fetch SPECrate2017 CINT benchmark results for a given CPU model or slug.
 *
 * Strategy:
 * 1. Try exact slug: `processors/{slug}.json`
 * 2. If 404, search facets.json for processor names containing the input
 * 3. Fetch the best matching processor's JSON
 * 4. Dell vendor results sorted first
 */
export async function fetchSpecResults(input: string): Promise<SpecLookupResult> {
  const slug = cpuModelToSlug(input)
  if (!slug) return { results: [], status: 'no-results' }

  // Attempt 1: exact slug
  const exactResult = await fetchBySlug(slug)
  if (exactResult.status === 'ok') return exactResult

  // Attempt 2: partial match via facets
  const processors = await getProcessorList()
  const inputLower = input.toLowerCase()
  const matches = processors.filter(p => p.toLowerCase().includes(inputLower))

  if (matches.length === 0) {
    // Try matching the slug against processor slugs
    const slugMatches = processors.filter(p => cpuModelToSlug(p).includes(slug))
    if (slugMatches.length > 0) {
      const bestSlug = cpuModelToSlug(slugMatches[0]!)
      return fetchBySlug(bestSlug)
    }
    return { results: [], status: 'no-results' }
  }

  // Fetch the first match
  const bestMatch = matches[0]!
  const matchSlug = cpuModelToSlug(bestMatch)
  return fetchBySlug(matchSlug)
}

/** Fetch and filter results for a specific processor slug */
async function fetchBySlug(slug: string): Promise<SpecLookupResult> {
  try {
    const url = `${SPEC_SEARCH_CPU2017_DATA_URL}/processors/${slug}.json`
    const response = await fetch(url)

    if (!response.ok) {
      return { results: [], status: response.status === 404 ? 'no-results' : 'error' }
    }

    const data: RawSpecResponse = await response.json()

    const filtered: SpecResult[] = data.results
      .filter((entry) => entry.benchmark === 'CINT2017rate')
      .map(({ vendor, system, baseResult, peakResult, cores, chips }) => ({
        vendor,
        system,
        baseResult,
        peakResult,
        cores,
        chips,
      }))

    if (filtered.length === 0) {
      return { results: [], status: 'no-results' }
    }

    return { results: sortDellFirst(filtered), status: 'ok' }
  } catch {
    return { results: [], status: 'error' }
  }
}
