# Presizion (cluster-sizer)

## Purpose
Client-side-only static web app for presales engineers to size refreshed server clusters from existing environment metrics. No backend, no API — all calculations run in the browser. Deployed on GitHub Pages at `/presizion/`.

## Tech Stack
- **Framework:** React 19 + TypeScript strict (Vite 8 for build)
- **UI:** Tailwind v4 + shadcn/ui (base-ui primitives) + **ECharts 6** (recharts fully removed) + Sonner (toast)
- **i18n:** i18next + react-i18next + i18next-browser-languagedetector
- **State:** Zustand v5 (**6 stores**: cluster, scenarios, wizard, theme, import, exclusions) + localStorage persistence + URL hash sharing
- **Import:** xlsx@0.18.5 (locked MIT — do NOT upgrade) + jszip
- **Export:** jsPDF + jspdf-autotable + pptxgenjs (all lazy-loaded)
- **Testing:** Vitest + React Testing Library (~796 test cases across 73 test files)
- **Lint/format:** Biome (`biome.json`) — replaces ESLint. Run as `npx biome check .` (NOT `rtk lint`, which mis-parses Biome output). a11y rules are `warn`.
- **Deployment:** GitHub Pages via GitHub Actions

## Current State (2026-06)
- On `main`. "Precision Cockpit" UI look-and-feel shipped (drag-and-drop import dropzone, dark-mode fixes, disaggregated layout default).
- Simplification roadmap sub-projects: A + D (biome) done; C (ECharts migration) done; E (i18n) done; B (visual/PPTX) largely landed via Precision Cockpit.
- package.json version is `0.0.0` (not a meaningful release tag).

## Key Architecture Patterns
- **Derive-on-read:** `useScenariosResults` and `useVsanBreakdowns` hooks compute on render, never stored in Zustand
- **Sizing formulas centralized:** `src/lib/sizing/` (formulas.ts, constraints.ts, display.ts, defaults.ts, clusterTotals.ts, clusterReadiness.ts, vsanFormulas.ts, vsanBreakdown.ts, vsanConstants.ts, chartColors.ts, chartOptions/)
  - vCPU mode = pure assignment-density cap; CPU utilization does NOT affect the count (only the CALC-06 output metric). RAM utilization DOES right-size the RAM count.
  - Stretch cluster: workload doubled (`stretchPairedCount = rawCount × 2`); HA reserve is per-site → `finalCount = (rawCount + haReserve) × 2`.
- **Import parsers:** `src/lib/utils/import/` (liveopticParser, rvtoolsParser, jsonParser, columnResolver, scopeAggregator, fileValidation)
- **External URLs:** centralized in `src/lib/config.ts`
- **Scope keys:** format `dc||cluster` or `dc||__standalone__` for clusterless hosts

## Project Structure
```
src/
  components/
    step1/     # CurrentClusterForm, FileImportButton/dropzone, ImportPreviewModal, ScopeBadge, DerivedMetricsPanel
    step2/     # ScenarioCard, ScenarioResults, VsanGrowthSection
    step3/     # ComparisonTable, SizingChart, CoreCountChart, CapacityStackedChart, MinNodesChart, Step3ReviewExport
    wizard/    # WizardShell, StepIndicator, SizingModeToggle, ThemeToggle
    common/    # SpecResultsPanel
    ui/        # shadcn/ui components
  hooks/       # useScenariosResults, useVsanBreakdowns, useSpecLookup
  lib/
    sizing/    # formulas, constraints, display, defaults, vsan*, chartColors, chartOptions/
    utils/     # export, clipboard, persistence, downloadChartPng, chartCapture, exportPdf, exportPptx, specLookup, logoDataUrl, config
      import/  # parsers, columnResolver, scopeAggregator, fileValidation
  store/       # useClusterStore, useScenariosStore, useWizardStore, useThemeStore, useImportStore, useExclusionsStore
  schemas/     # Zod schemas (currentCluster, scenario, session)
  types/       # cluster.ts, results.ts, breakdown.ts
```

## Knowledge Graph
This repo has a `code-review-graph` MCP knowledge graph — prefer it (semantic_search_nodes, query_graph, get_impact_radius, detect_changes) over Grep/Glob for structural exploration.

## Companion Project
- **spec-search** (fjacquet/spec-search): SPEC CPU2017 benchmark explorer. GitHub Pages serves per-processor JSON files used by Presizion for auto-lookup.
