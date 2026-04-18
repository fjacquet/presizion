# Presizion -- Cluster Refresh Sizing Tool

![Build](https://github.com/fjacquet/cluster-sizer/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-596%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

Presizion is a client-side web application for presales engineers to size a refreshed compute cluster based on existing cluster metrics. Enter your current environment, define target server scenarios, and instantly compare how many servers you need -- with vSAN-aware storage sizing, capacity breakdown charts, and growth projections. No backend, no API; all calculations run in the browser.

## Live

> Deploy to GitHub Pages or any static web host -- the build output is plain HTML/JS/CSS.

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build -> dist/
npm run test      # run all tests (596 tests)
```

## Features

- **3-step wizard**: enter current cluster, define target scenarios, compare and export
- **vSAN-aware storage sizing**: FTT policies (Mirror FTT=1/2/3, RAID-5, RAID-6), raw vs usable storage, metadata overhead, configurable slack space
- **vSAN overhead deduction**: CPU overhead (10% default), memory overhead per host (6 GB default)
- **Compression/dedup factors**: None, Pessimistic (1.3:1), Conservative (1.5:1), Moderate (2:1), Optimistic (3:1)
- **Capacity breakdown tables**: Required / Reserved / HA Reserve / Spare / Excess / Total for CPU, Memory, Storage
- **Stacked capacity bar charts**: normalized horizontal bars with per-segment percentage labels
- **Growth projections**: per-resource compound growth rates (CPU %, Memory %, Storage %)
- **Import from file**: RVTools (.xlsx), LiveOptics (.zip/.xlsx/.csv), or Presizion JSON session restore -- with multi-cluster scope filter
- **Per-VM exclusions**: drop decommissioned or test VMs from sizing via glob patterns, exact names, power-state toggle, or per-row overrides (rules persist; rows stay session-only — see [ADR-021](docs/adr/ADR-021-vm-exclusion-rules-persistence.md))
- **Side-by-side comparison**: servers required, total pCores, vCPU:pCore ratio, utilization percentages
- **Multiple sizing modes**: vCPU:pCore ratio or SPECrate2017 Int Base with auto-derive and SPEC lookup link
- **Export**: clipboard copy, CSV, JSON, PNG (charts with legend), PDF report (jsPDF), PPTX presentation (pptxgenjs), print layout, shareable URL
- **Dark mode**: light/dark/system toggle with localStorage persistence
- **Session persistence**: localStorage auto-restore and base64url shareable URL hash

## Tech Stack

React 19, TypeScript (strict), Vite, Tailwind v4, shadcn/ui, Zustand v5, Recharts, Zod, jsPDF + jspdf-autotable, pptxgenjs, Vitest (596 tests).

## Docs

- [User Guide](docs/userguide.md)
- [Product Requirements](docs/prd.md)
- [Architecture Decision Records](docs/adr/)
