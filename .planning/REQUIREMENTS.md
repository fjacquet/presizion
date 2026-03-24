# Requirements: Presizion

**Defined:** 2026-03-24
**Core Value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.

## v2.5 Requirements

Requirements for PPTX Export Overhaul & UX Polish milestone.

### Slide Consolidation

- [ ] **MERGE-01**: Assumptions + Server Config + Growth tables merged into single "Sizing Parameters" slide
- [ ] **MERGE-02**: Per-scenario capacity breakdown table merged into capacity chart slide
- [ ] **MERGE-03**: Final "Scenario Comparison" slide removed (duplicate of As-Is vs To-Be)

### Visual Polish

- [ ] **VISUAL-01**: Content slide master includes colored left sidebar accent strip
- [ ] **VISUAL-02**: Utilization cells color-coded (green/amber/red thresholds)
- [ ] **VISUAL-03**: Section headers use dark background bands
- [ ] **VISUAL-04**: KPI callout boxes use rounded-rectangle shape backgrounds

### UX

- [ ] **UX-01**: Default scenario name changed from "New Scenario" to "To-Be"

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
| MERGE-01 | TBD | Pending |
| MERGE-02 | TBD | Pending |
| MERGE-03 | TBD | Pending |
| VISUAL-01 | TBD | Pending |
| VISUAL-02 | TBD | Pending |
| VISUAL-03 | TBD | Pending |
| VISUAL-04 | TBD | Pending |
| UX-01 | TBD | Pending |

**Coverage:**
- v2.5 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8 ⚠️

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after initial definition*
