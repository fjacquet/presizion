# Requirements — v2.2 SPEC Search Integration

*Defined: 2026-03-15*

## SPEC Lookup (SPEC-LOOKUP)

- **SPEC-LOOKUP-01**: When a CPU model is detected from import, Presizion auto-fetches matching SPECrate2017 results from the spec-search GitHub Pages API (`fjacquet.github.io/spec-search/data/processors/{slug}.json`)
- **SPEC-LOOKUP-02**: Matching results are displayed in a results panel showing: vendor, system name, base score (SPECrate2017_int_base), cores, chips
- **SPEC-LOOKUP-03**: User can click a result to auto-fill `specintPerServer` in Step 1 with the selected base score
- **SPEC-LOOKUP-04**: The lookup also works for target scenario CPU — user can search/select a SPECrate score for the target server in Step 2
- **SPEC-LOOKUP-05**: The "Look up SPECrate" button now opens the spec-search web UI (pre-filtered by CPU model) instead of spec.org
- **SPEC-LOOKUP-06**: The spec-search API base URL is configurable in `src/lib/config.ts`
- **SPEC-LOOKUP-07**: Lookup handles gracefully when API is unavailable or CPU model has no matches (shows fallback message, manual entry still works)
- **SPEC-LOOKUP-08**: CPU model slug is derived from the detected model string (e.g., "Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz" -> "intel-xeon-gold-6526y")

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEC-LOOKUP-01 | Phase 25 | Complete |
| SPEC-LOOKUP-05 | Phase 25 | Pending |
| SPEC-LOOKUP-06 | Phase 25 | Complete |
| SPEC-LOOKUP-07 | Phase 25 | Complete |
| SPEC-LOOKUP-08 | Phase 25 | Complete |
| SPEC-LOOKUP-02 | Phase 26 | Pending |
| SPEC-LOOKUP-03 | Phase 26 | Pending |
| SPEC-LOOKUP-04 | Phase 26 | Pending |

**Coverage:**
- v2.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
