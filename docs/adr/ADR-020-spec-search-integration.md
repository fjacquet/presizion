# ADR-020: SPEC Search Integration via Static JSON API

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.2

## Context

Presales engineers need SPECrate2017_int_base scores to size clusters in SPECrate mode. Previously they had to manually search spec.org, copy the value, and paste it into Presizion. The companion project spec-search (fjacquet/spec-search) publishes 619 per-processor JSON files on GitHub Pages with all SPEC CPU2017 benchmark results.

## Decision

Presizion fetches SPECrate results directly from the spec-search GitHub Pages static JSON API (`fjacquet.github.io/spec-search/data/processors/{slug}.json`) rather than embedding benchmark data or requiring a backend API.

The CPU model string from import is converted to a URL-safe slug using the same algorithm as spec-search's `convert_csv.py`: lowercase, replace non-alphanumeric with hyphens, strip edges.

Results are filtered to `benchmark === 'CINT2017rate'` and displayed in a reusable `SpecResultsPanel` component. Users click a result to auto-fill `specintPerServer`.

## Rationale

- No new backend needed -- static JSON on GitHub Pages, same-origin CORS
- Slug algorithm mirrors spec-search exactly -- guaranteed filename match
- Per-processor files are small (~2-20KB) -- fast fetch, no pagination
- Graceful degradation -- if API unavailable, manual entry still works
- Reusable panel shared between Step 1 (existing CPU) and Step 2 (target CPU)

## Consequences

- Presizion depends on spec-search GitHub Pages being available (soft dependency -- manual entry is fallback)
- Slug algorithm must stay in sync with spec-search; if spec-search changes slug format, Presizion lookups will 404
- SPEC data freshness depends on spec-search pipeline updates (currently manual CSV refresh)
