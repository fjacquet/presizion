# Cluster Refresh Sizing Tool

## What This Is

A client-side-only static web application that helps presales engineers and solution architects quickly size a refreshed server cluster from existing environment metrics. It takes real cluster data (vCPUs, pCores, VMs, RAM, disk, server config) and produces one or more target cluster proposals — entirely in the browser, with no backend or external integrations.

## Core Value

The sizing math must be correct: given the same inputs, the tool must produce server counts that match what a reference spreadsheet would calculate, with transparent formulas behind every number.

## Requirements

## Current Milestone: v1.2 — Visualization, File Import & Tech Debt

**Goal:** Add graphical sizing charts, client-side RVTools/LiveOptics file import, and resolve v1.1 display tech debt items.

**Target features:**

- Bar/comparison charts in Step 3 showing server counts and constraint breakdown across scenarios
- RVTools (.xlsx) and LiveOptics (.zip) drag-and-drop file upload → auto-fill Step 1 cluster inputs
- Three tech debt display fixes (formula string, SPECint duplicate row, dead code removal)

---

### Validated

- ✓ User can enter current cluster metrics and define scenarios — v1.0 / Phase 2
- ✓ App calculates server counts (CPU/RAM/disk constraints) with live updates — v1.0 / Phase 1–2
- ✓ Side-by-side comparison table with utilization color-coding — v1.0 / Phase 3
- ✓ Clipboard copy, CSV download, JSON download — v1.0–1.1 / Phase 3, 7
- ✓ 3-step wizard with validation guards and beforeunload warning — v1.0 / Phase 2–3
- ✓ GitHub Pages deployment with dark mode support — v1.0 / Phase 4
- ✓ Inline formula display for all key outputs — v1.0 / Phase 4
- ✓ SPECint-based sizing mode (global toggle, delta formula) — v1.1 / Phase 5–6
- ✓ CPU & RAM utilization % inputs for right-sizing — v1.1 / Phase 5–6
- ✓ As-Is reference column in Step 3 (server count, config, pCores, ratio) — v1.1 / Phase 7
- ✓ Print/PDF-optimized layout — v1.1 / Phase 7

### Active

- [ ] User can view a bar/comparison chart in Step 3 comparing server counts across scenarios
- [ ] Chart shows per-constraint breakdown (CPU/RAM/disk or SPECint) per scenario
- [ ] User can download chart as PNG for use in external reports
- [ ] User can upload an RVTools .xlsx file; app auto-fills Step 1 cluster inputs
- [ ] User can upload a LiveOptics .zip file; app auto-fills Step 1 cluster inputs
- [ ] After upload, user reviews and confirms extracted data before form population
- [ ] Step 2 CPU formula display string shows utilization factor (× N%) when utilization % entered
- [ ] In SPECint mode, Step 2 results panel shows only the SPECint row (not a duplicate CPU row)

### Out of Scope

- Backend, server-side storage, or authentication — client-side only by design
- Pre-defined server SKU library — users define every server config manually
- TCO/ROI or pricing/BOM calculations — capacity sizing only in v1
- Per-VM-level modeling — aggregate calculations only
- Integration with vCenter, CloudIQ, or any external system
- PWA / offline capability — basic static hosting is sufficient
- Localization / i18n — English only for v1
- localStorage persistence — nice-to-have, deferred; app starts fresh each session in v1

## Context

- **Target users**: Presales / Systems Engineers and Solution Architects at Dell (or similar), working from Excel extracts or summary slides of existing environments.
- **Deployment**: GitHub Pages (static assets, zero infrastructure).
- **Reference**: `docs/prd.md` — full product requirements document with functional requirements, data model, and acceptance criteria.
- **Engineering standards**: `docs/constitution.md` — KISS/DRY/YAGNI, functional React + TypeScript, strict TS, formulas centralized in `src/lib/sizing/`.

## Constraints

- **Tech stack**: React + TypeScript, Vite build — no server-side code whatsoever
- **Deployment**: GitHub Pages — output must be pure static files
- **Correctness**: Formula outputs must match reference spreadsheet calculations (within rounding); this is the acceptance criterion for every sizing feature
- **Performance**: Calculations must re-render in <200ms on input change; initial load <2s

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No pre-defined server SKUs | Avoids maintaining a hardware catalog; users input their own specs | — Pending |
| Industry defaults for ratios | 4:1 vCPU:pCore, 20% headroom are widely accepted starting points | — Pending |
| localStorage deferred to v1.1 | Not blocking the core workflow; adds complexity for minimal benefit in v1 | — Pending |
| GitHub Pages deployment | Zero infra, easy sharing, matches static-only constraint | — Pending |

---
*Last updated: 2026-03-12 after initialization*
