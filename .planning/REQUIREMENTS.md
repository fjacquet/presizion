# Requirements: Presizion

**Defined:** 2026-03-24
**Core Value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.

## v2.5 Requirements

Requirements for PPTX Export Overhaul & UX Polish milestone.

### Slide Consolidation

- [x] **MERGE-01**: Assumptions + Server Config + Growth tables merged into single "Sizing Parameters" slide
- [ ] **MERGE-02**: Per-scenario capacity breakdown table merged into capacity chart slide
- [ ] **MERGE-03**: Final "Scenario Comparison" slide removed (duplicate of As-Is vs To-Be)

### Visual Polish

- [x] **VISUAL-01**: Content slide master includes colored left sidebar accent strip
- [x] **VISUAL-02**: Utilization cells color-coded (green/amber/red thresholds)
- [x] **VISUAL-03**: Section headers use dark background bands
- [x] **VISUAL-04**: KPI callout boxes use rounded-rectangle shape backgrounds

### UX

- [x] **UX-01**: Default scenario name changed from "New Scenario" to "To-Be"

## Future Requirements

None planned.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native pptxgenjs charts replacing Recharts captures | Would require duplicating all chart logic; image captures work well |
| Custom font embedding | Calibri is universally available on PowerPoint |
| Animated slide transitions | Adds complexity with no presales value |
| Template/theme selection UI | Single professional theme is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MERGE-01 | Phase 33 | Complete |
| MERGE-02 | Phase 33 | Pending |
| MERGE-03 | Phase 33 | Pending |
| VISUAL-01 | Phase 32 | Complete |
| VISUAL-02 | Phase 32 | Complete |
| VISUAL-03 | Phase 32 | Complete |
| VISUAL-04 | Phase 32 | Complete |
| UX-01 | Phase 32 | Complete |

**Coverage:**
- v2.5 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — traceability mapped to Phases 32-33*
