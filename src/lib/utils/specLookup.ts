/**
 * SPEC Lookup Service — slug derivation + fetch for SPECrate2017 results.
 *
 * Converts CPU model strings to URL-safe slugs matching the spec-search
 * GitHub Pages API, then fetches and filters CINT2017rate benchmark data.
 */

import { SPEC_SEARCH_API_URL } from '../config'

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

/* ------------------------------------------------------------------ */
/*  Slug Derivation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Convert a CPU model string to a URL-safe slug matching the spec-search
 * API convention (derived from convert_csv.py).
 *
 * Algorithm:
 *  1. Lowercase
 *  2. Strip noise: (r), (tm), cpu, processor, clock patterns, core-count patterns
 *  3. Replace non-alphanumeric sequences with a single hyphen
 *  4. Trim leading/trailing hyphens
 */
export function cpuModelToSlug(model: string): string {
  if (!model.trim()) return ''

  let slug = model.toLowerCase()

  // Strip trademarked noise
  slug = slug.replace(/\(r\)/g, '')
  slug = slug.replace(/\(tm\)/g, '')

  // Strip "cpu" and "processor" keywords
  slug = slug.replace(/\bcpu\b/g, '')
  slug = slug.replace(/\bprocessor\b/g, '')

  // Strip clock speed patterns like "@ 2.40ghz" or "2.40 ghz"
  slug = slug.replace(/@?\s*\d+(\.\d+)?\s*ghz/g, '')

  // Strip core-count patterns like "96-core"
  slug = slug.replace(/\d+-core/g, '')

  // Replace all non-alphanumeric sequences with a single hyphen
  slug = slug.replace(/[^a-z0-9]+/g, '-')

  // Trim leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '')

  return slug
}

/* ------------------------------------------------------------------ */
/*  Fetch Service                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fetch SPECrate2017 CINT benchmark results for a given CPU slug.
 *
 * - On success with matches: `{ results: [...], status: 'ok' }`
 * - On 200 but no CINT2017rate matches: `{ results: [], status: 'no-results' }`
 * - On network error or non-200: `{ results: [], status: 'error' }`
 */
export async function fetchSpecResults(slug: string): Promise<SpecLookupResult> {
  try {
    const url = `${SPEC_SEARCH_API_URL}/data/processors/${slug}.json`
    const response = await fetch(url)

    if (!response.ok) {
      return { results: [], status: 'error' }
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

    return { results: filtered, status: 'ok' }
  } catch {
    return { results: [], status: 'error' }
  }
}
