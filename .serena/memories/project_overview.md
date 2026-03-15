# Presizion (cluster-sizer)

## Purpose
Client-side-only static web app for presales engineers to size refreshed server clusters from existing environment metrics. No backend, no API — all calculations run in the browser. Deployed on GitHub Pages at `/presizion/`.

## Tech Stack
- **Framework:** React 19 + TypeScript strict (Vite 8 for build)
- **UI:** Tailwind v4 + shadcn/ui (base-ui primitives) + Recharts 2.15 + Sonner (toast)
- **State:** Zustand v5 (5 stores: cluster, scenarios, wizard, theme, import) + localStorage persistence + URL hash sharing
- **Import:** xlsx@0.18.5 (locked MIT — do NOT upgrade) + jszip
- **Export:** jsPDF + jspdf-autotable + pptxgenjs (all lazy-loaded)
- **Testing:** Vitest + React Testing Library (596 tests)
- **Deployment:** GitHub Pages via GitHub Actions

## Current Version: v2.2 (596 tests, 26 phases shipped)

## Key Architecture Patterns
- **Derive-on-read:** `useScenariosResults` and `useVsanBreakdowns` hooks compute on render, never stored in Zustand
- **Sizing formulas centralized:** `src/lib/sizing/` (formulas.ts, constraints.ts, vsanFormulas.ts, vsanBreakdown.ts, vsanConstants.ts)
- **Import parsers:** `src/lib/utils/import/` (liveopticParser, rvtoolsParser, jsonParser, columnResolver, scopeAggregator)
- **External URLs:** centralized in `src/lib/config.ts`
- **Scope keys:** format `dc||cluster` or `dc||__standalone__` for clusterless hosts

## Project Structure
```
src/
  components/
    step1/     # CurrentClusterForm, FileImportButton, ImportPreviewModal, ScopeBadge, DerivedMetricsPanel
    step2/     # ScenarioCard, ScenarioResults, VsanGrowthSection
    step3/     # ComparisonTable, SizingChart, CoreCountChart, CapacityStackedChart, MinNodesChart, Step3ReviewExport
    wizard/    # WizardShell, StepIndicator, SizingModeToggle, ThemeToggle
    common/    # SpecResultsPanel
    ui/        # shadcn/ui components
  hooks/       # useScenariosResults, useVsanBreakdowns, useSpecLookup
  lib/
    sizing/    # formulas, constraints, vsan*, display, defaults, chartColors
    utils/     # export, clipboard, persistence, downloadChartPng, chartCapture, exportPdf, exportPptx, specLookup, logoDataUrl, config
      import/  # parsers, columnResolver, scopeAggregator, fileValidation
  store/       # useClusterStore, useScenariosStore, useWizardStore, useThemeStore, useImportStore
  schemas/     # Zod schemas (currentCluster, scenario, session)
  types/       # cluster.ts, results.ts, breakdown.ts
```

## Companion Project
- **spec-search** (fjacquet/spec-search): SPEC CPU2017 benchmark explorer. GitHub Pages serves per-processor JSON files used by Presizion for auto-lookup.
