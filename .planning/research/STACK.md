# Stack Research — v2.0 vSAN-Aware Sizing Engine

**Researched:** 2026-03-14
**Confidence:** HIGH

## New Dependencies

| Package | Version | Purpose | Size Impact | Load Strategy |
|---------|---------|---------|-------------|---------------|
| jspdf | ^4.2.0 | PDF report generation (browser-side) | ~300KB | Dynamic import() |
| jspdf-autotable | ^5.0.7 | Table rendering in PDF | ~50KB | Dynamic import() |

**Total new bundle impact:** ~350KB, lazy-loaded only on PDF export click.

## Rejected Alternatives

| Package | Reason for Rejection |
|---------|---------------------|
| @react-pdf/renderer | ~450KB gzipped, doubles with Vite web workers. Unacceptable for secondary export feature on GitHub Pages with 2s load constraint |
| html2canvas + jsPDF | DOM screenshot approach -- blurry text, non-selectable, inconsistent across browsers |
| puppeteer/playwright | Requires backend -- violates client-side-only constraint |

## No Changes Needed

| Existing Package | v2.0 Usage |
|-----------------|------------|
| Recharts 2.15 | Stacked horizontal bars via `layout="vertical"` + `stackId` on `<Bar>`. No upgrade needed |
| Zustand v5 | May add 1 new store (vsanConfig) or extend scenario. No upgrade needed |
| Vitest | No changes |
| xlsx@0.18.5 | Locked. No changes |

## vSAN Constants (Pure TypeScript, No Dependencies)

New file: `src/lib/sizing/vsanConstants.ts`

FTT multipliers (raw = usable * multiplier):
- Mirror FTT=1: 2.0x
- Mirror FTT=2: 3.0x
- Mirror FTT=3: 4.0x
- RAID-5 (3+1): 1.33x
- RAID-6 (4+2): 1.5x

Compression/dedup savings tiers:
- None: 1.0 (no reduction)
- Pessimistic: 1.3:1 (23% savings)
- Conservative: 1.5:1 (33% savings)
- Moderate: 2:1 (50% savings)
- Optimistic: 3:1 (66% savings)

vSAN overhead defaults:
- ESA CPU overhead: ~10%
- vSAN memory per host: 6 GB (configurable, ESA formula not published by VMware)
- Slack space: 25% for vSAN operations
- VM metadata overhead: ~2%

## Integration Points

1. **jsPDF + jspdf-autotable** -- Dynamic import in `src/lib/utils/exportPdf.ts`, same pattern as xlsx/jszip
2. **vsanConstants.ts** -- Pure constants file, imported by formulas and UI
3. **Recharts stacked bars** -- Existing SizingChart extended with `layout="vertical"` for horizontal stacked bars
4. **vSAN memory overhead** -- Exposed as user-editable field with 6 GB/host default

## Sources

- jsPDF npm, jspdf-autotable npm
- VMware vSphere 6.7 vSAN Planning docs (FTT multipliers)
- VMware VCF blog (RAID-5/6 performance with ESA)
- VMware vSAN 8 capacity overheads blog (ESA memory)
