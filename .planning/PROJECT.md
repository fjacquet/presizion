# Cluster Refresh Sizing Tool

## What This Is

A client-side-only static web application that helps presales engineers and solution architects quickly size a refreshed server cluster from existing environment metrics. It takes real cluster data (vCPUs, pCores, VMs, RAM, disk, server config) and produces one or more target cluster proposals — entirely in the browser, with no backend or external integrations.

## Core Value

The sizing math must be correct: given the same inputs, the tool must produce server counts that match what a reference spreadsheet would calculate, with transparent formulas behind every number.

## Requirements

## Current Milestone: v1.1 — SPECint, Utilization & Enhanced Export

**Goal:** Add performance-based sizing via SPECint delta, right-sizing from observed cluster utilization, and enhanced export (JSON download + print/PDF layout).

**Target features:**

- SPECint-based sizing mode (alternative to vCPU mode, mutually exclusive)
- Observed CPU % and RAM % utilization inputs for right-sizing to actual consumption
- JSON export of all inputs and outputs
- Print-optimized layout for PDF hardcopy via browser print

---

### Validated

- ✓ User can enter current cluster metrics and define scenarios — v1.0 / Phase 2
- ✓ App calculates server counts (CPU/RAM/disk constraints) with live updates — v1.0 / Phase 1–2
- ✓ Side-by-side comparison table with utilization color-coding — v1.0 / Phase 3
- ✓ Clipboard copy and CSV download — v1.0 / Phase 3
- ✓ 3-step wizard with validation guards and beforeunload warning — v1.0 / Phase 2–3
- ✓ GitHub Pages deployment with dark mode support — v1.0 / Phase 4
- ✓ Inline formula display for all key outputs — v1.0 / Phase 4

### Active

- [ ] User can switch between vCPU-based and SPECint-based sizing mode (mutually exclusive, global)
- [ ] In SPECint mode, user enters SPECint score for existing and target servers; CPU constraint uses delta formula
- [ ] User can enter observed current CPU % and RAM % utilization; formulas scale to actual consumption
- [ ] User can download a JSON file of all inputs and outputs
- [ ] App provides a print-optimized layout for PDF hardcopy via browser print

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
