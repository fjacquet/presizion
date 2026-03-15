# Cluster Refresh Sizing Tool

## What This Is

A client-side-only static web application that helps presales engineers and solution architects quickly size a refreshed server cluster from existing environment metrics. Users enter current cluster data (vCPUs, pCores, VMs, RAM, disk, server config), define one or more target scenarios, and receive server count recommendations with per-constraint breakdowns — entirely in the browser, with no backend or external integrations.

v2.1 shipped with scope aggregation fixes (standalone routing, weighted RAM, host count display) and average VM metrics in derived panel.

## Current Milestone: v2.2 SPEC Search Integration

**Goal:** Integrate spec-search (fjacquet.github.io/spec-search) to auto-lookup SPECrate2017 benchmark scores from detected CPU models, eliminating manual SPEC website searches.

**Target features:**
- Auto-lookup detected CPU model against spec-search static JSON API on GitHub Pages
- Show matching SPECrate results (vendor, system, base score, cores, chips) in a results panel
- One-click auto-fill of specintPerServer from selected result
- Replace spec.org link with spec-search link (pre-filtered by CPU model)
- Works for both existing cluster CPU and target scenario CPU

## Core Value

The sizing math must be correct: given the same inputs, the tool must produce server counts that match what a reference spreadsheet would calculate, with transparent formulas behind every number.

## Current State (v2.1 — Shipped 2026-03-15)

- **Codebase:** 541 Vitest tests
- **Tech stack:** React 19 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui + Zustand v5 + Recharts 2.15 + Sonner + jsPDF + pptxgenjs
- **Deployment:** GitHub Pages at `/presizion/`
- **Sizing modes:** vCPU, SPECint, Aggressive, GHz + vSAN-aware storage (FTT, compression, overhead)
- **Export formats:** Clipboard, CSV, JSON, PNG (chart + table), PDF report, PPTX presentation, Print, Shareable URL
- **File import:** RVTools .xlsx, LiveOptics .zip/.xlsx/.csv → scope filter → auto-fills Step 1
- **Branding:** Presizion SVG wordmark + custom favicon
- **Theming:** Light/dark/system toggle with localStorage persistence
- **Persistence:** localStorage auto-restore + base64url shareable URL hash

## Requirements

### Validated

- ✓ User can enter current cluster metrics and define scenarios — v1.0 / Phase 2
- ✓ App calculates server counts (CPU/RAM/disk constraints) with live updates — v1.0 / Phase 1–2
- ✓ Side-by-side comparison table with utilization color-coding — v1.0 / Phase 3
- ✓ Clipboard copy and CSV download — v1.0 / Phase 3
- ✓ 3-step wizard with validation guards and beforeunload warning — v1.0 / Phase 2–3
- ✓ GitHub Pages deployment with dark mode support — v1.0 / Phase 4
- ✓ Inline formula display for all key outputs — v1.0 / Phase 4
- ✓ SPECint-based sizing mode (global toggle, delta formula) — v1.1 / Phase 5–6
- ✓ CPU & RAM utilization % inputs for right-sizing — v1.1 / Phase 5–6
- ✓ As-Is reference column in Step 3 (server count, config, pCores, ratio) — v1.1 / Phase 7
- ✓ Print/PDF-optimized layout — v1.1 / Phase 7
- ✓ JSON download export — v1.1 / Phase 7
### Validated (full history in milestones archive)

- ✓ User can enter current cluster metrics and define scenarios — v1.0 / Phase 2
- ✓ App calculates server counts (CPU/RAM/disk constraints) with live updates — v1.0 / Phase 1–2
- ✓ Side-by-side comparison table with utilization color-coding — v1.0 / Phase 3
- ✓ Clipboard copy and CSV download — v1.0 / Phase 3
- ✓ 3-step wizard with validation guards and beforeunload warning — v1.0 / Phase 2–3
- ✓ GitHub Pages deployment with dark mode support — v1.0 / Phase 4
- ✓ Inline formula display for all key outputs — v1.0 / Phase 4
- ✓ SPECint-based sizing mode (global toggle, delta formula) — v1.1 / Phase 5–6
- ✓ CPU & RAM utilization % inputs for right-sizing — v1.1 / Phase 5–6
- ✓ As-Is reference column in Step 3 (server count, config, pCores, ratio) — v1.1 / Phase 7
- ✓ Print/PDF-optimized layout — v1.1 / Phase 7
- ✓ JSON download export — v1.1 / Phase 7
- ✓ Bar chart comparing CPU/RAM/disk-limited counts per scenario — v1.2 / Phase 9
- ✓ Chart PNG download for use in external reports — v1.2 / Phase 9
- ✓ RVTools .xlsx file import → auto-fill Step 1 — v1.2 / Phase 10
- ✓ LiveOptics .zip/.xlsx/.csv file import → auto-fill Step 1 — v1.2 / Phase 10
- ✓ Import preview/confirm modal before form population — v1.2 / Phase 10
- ✓ Presizion logo + custom favicon — v1.3 / Phase 11
- ✓ RAM formula display shows utilization factor (× N%) — v1.3 / Phase 11
- ✓ Manual light/dark/system theme toggle with localStorage persistence — v1.3 / Phase 12
- ✓ Multi-cluster import scope filter (detect clusters, select subset) — v1.3 / Phase 13
- ✓ Persistent scope badge in Step 1 with live re-aggregation — v1.3 / Phase 14
- ✓ localStorage session auto-restore on page load — v1.3 / Phase 15
- ✓ Shareable URL hash encoding full session state — v1.3 / Phase 15

- ✓ Per-cluster ESX host config scoping in LiveOptics/RVTools imports — v1.4 / Phase 16
- ✓ VM override propagation to RAM/disk formulas (confirmed correct, tests added) — v1.4 / Phase 16
- ✓ As-Is column populated with VMs/Server, util %, total disk — v1.4 / Phase 16
- ✓ Chart legends, data labels, professional palette, PNG download for all charts — v1.4 / Phase 17
- ✓ SPECrate mode: auto-derive socket/core from import metadata — v1.4 / Phase 17
- ✓ SPECrate lookup link with clipboard copy of CPU model number — v1.4 / Phase 17
- ✓ Reset button with confirmation dialog — v1.4 / Phase 17

- ✓ vSAN-aware storage sizing (FTT, raw/usable, metadata, slack, compression) — v2.0 / Phase 18
- ✓ Capacity breakdown tables (Required/Reserved/HA/Spare/Excess/Total) — v2.0 / Phase 19
- ✓ Growth projections per resource (compound pre-multiply) — v2.0 / Phase 19
- ✓ Collapsible vSAN & Growth form section — v2.0 / Phase 20
- ✓ Stacked capacity bar charts + min-nodes chart — v2.0 / Phase 21
- ✓ Professional PDF + PPTX report export — v2.0 / Phase 22

- ✓ Scope "All" aggregates named clusters, standalone routing, weighted RAM, host count display — v2.1 / Phase 23
- ✓ Average per-VM metrics (vCPU, RAM, Disk) in derived panel + seeding verification — v2.1 / Phase 24

### Active (v2.2)

- [ ] Auto-lookup CPU model against spec-search GitHub Pages API
- [ ] Show matching SPECrate results with vendor/system/score/cores
- [ ] One-click auto-fill specintPerServer from selected result
- [ ] Replace spec.org link with spec-search pre-filtered link

### Out of Scope

- Backend, server-side storage, or authentication — client-side only by design
- Pre-defined server SKU library — users define every server config manually
- TCO/ROI or pricing/BOM calculations — capacity sizing only
- Per-VM-level modeling — aggregate calculations only
- Integration with vCenter, CloudIQ, or any external system
- PWA / offline capability — basic static hosting is sufficient
- Localization / i18n — English only

## Context

- **Target users**: Presales / Systems Engineers and Solution Architects at Dell (or similar), working from Excel extracts or summary slides of existing environments.
- **Deployment**: GitHub Pages (static assets, zero infrastructure) at `/presizion/`.
- **Engineering standards**: `docs/constitution.md` — KISS/DRY/YAGNI, functional React + TypeScript, strict TS, formulas centralized in `src/lib/sizing/`.
- **File import source**: Column alias maps and format detection logic ported from store-predict Python parsers.

## Constraints

- **Tech stack**: React + TypeScript, Vite build — no server-side code whatsoever
- **Deployment**: GitHub Pages — output must be pure static files
- **Correctness**: Formula outputs must match reference spreadsheet calculations (within rounding); this is the acceptance criterion for every sizing feature
- **Performance**: Calculations must re-render in <200ms on input change; initial load <2s
- **SheetJS version**: xlsx@0.18.5 locked (last MIT-licensed version) — do not upgrade

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No pre-defined server SKUs | Avoids maintaining a hardware catalog; users input their own specs | ✓ Good — no SKU maintenance burden |
| Industry defaults for ratios | 4:1 vCPU:pCore, 20% headroom are widely accepted starting points | ✓ Good — users rarely change defaults |
| localStorage delivered in v1.3 | Shipped as PERS-01/02/03 — Zustand subscribe + Zod validation + base64url URL hash | ✓ Good — clean implementation, 22 tests |
| Zod v4 UUID strictness | v4 uses stricter RFC 4122 regex — test fixtures must use valid UUIDs | ✓ Required — fixed during v1.3 |
| history.replaceState after hash restore | Clears hash from address bar so refresh falls back to localStorage | ✓ Good — expected UX behavior |
| useImportStore for scope state | Separates import buffer from wizard state — enables re-aggregation without re-import | ✓ Good — clean separation |
| GitHub Pages deployment | Zero infra, easy sharing, matches static-only constraint | ✓ Good — works perfectly |
| Math before UI (Phase 1 first) | Sizing library correctness established before any component depends on it | ✓ Good — zero formula regressions |
| z.preprocess for numeric Zod fields | Empty string inputs produce ZodError, protecting form validation | ✓ Good — no NaN leaks to formulas |
| derive-on-read (no result in Zustand) | useScenariosResults derives on demand — no stale result state | ✓ Good — no sync bugs |
| Dynamic import() for xlsx/jszip | Vite code-splits both to lazy chunk (~900KB SheetJS deferred) | ✓ Good — no impact on initial load |
| xlsx@0.18.5 locked | Last MIT-licensed SheetJS version — licensing constraint | ✓ Required — do not upgrade |
| Recharts 2.15.x | React 19 compatible, widely used, low bundle overhead | ✓ Good — no compatibility issues |
| Wave 0 it.todo stubs (Nyquist) | TDD leading indicators before implementation; forces test writing | ✓ Good — zero skipped stubs at completion |
| Phases 8-10 as informal sprint | Accelerated delivery; documentation backfilled in Phase 8 | ⚠️ Revisit — use GSD framework for all future phases |

---
*Last updated: 2026-03-15 after v2.2 milestone start*
