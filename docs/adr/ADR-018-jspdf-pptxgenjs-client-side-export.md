# ADR-018: jsPDF + pptxgenjs for Client-Side Report Export

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.0

## Context

Presales engineers need to export sizing results as PDF reports and PowerPoint slides for customer presentations. The application is fully client-side with no backend, so export must happen in the browser.

Three approaches were evaluated:

1. **@react-pdf/renderer**: React-based PDF generation. Rejected due to ~450 KB bundle size, web worker compatibility issues, and limited table layout support requiring extensive workarounds.
2. **Server-side rendering**: Rejected as it contradicts the architecture (no backend).
3. **jsPDF + jspdf-autotable for PDF, pptxgenjs for PPTX**: Lightweight, well-maintained libraries with good table support. Combined lazy-loaded size is ~400 KB.

## Decision

PDF export uses jsPDF with the jspdf-autotable plugin. PPTX export uses pptxgenjs. Both libraries are lazy-loaded via dynamic `import()` so they are excluded from the initial bundle. This follows the same pattern already used for xlsx and jszip in the spreadsheet export path.

## Rationale

- **Bundle size**: jsPDF (~280 KB) + pptxgenjs (~120 KB) lazy-loaded is comparable to @react-pdf/renderer alone, but supports both PDF and PPTX.
- **No web worker issues**: jsPDF runs on the main thread without worker complications. Generation time for typical sizing reports (2-5 pages) is under 500 ms.
- **Table support**: jspdf-autotable provides automatic pagination, column sizing, and styled headers out of the box, matching the comparison table layout.
- **Proven pattern**: The codebase already lazy-loads xlsx and jszip for spreadsheet export. Adding jsPDF and pptxgenjs follows the identical dynamic import pattern with no architectural changes.
- **PPTX for presentations**: Presales engineers frequently paste sizing results into slide decks. Native PPTX generation eliminates the screenshot-and-paste workflow.

## Consequences

- Two new production dependencies: jspdf (with jspdf-autotable) and pptxgenjs
- Export functions live in `src/lib/utils/` alongside existing CSV/JSON/XLSX export helpers
- Chart images are captured via canvas `toDataURL()` and embedded in both PDF and PPTX outputs
- Initial page load is unaffected; libraries load only when the user clicks Export
- PDF and PPTX templates (layout, branding, page structure) are defined in dedicated modules for maintainability
