# Cluster Refresh Sizing Tool

## What This Is

A client-side-only static web application that helps presales engineers and solution architects quickly size a refreshed server cluster from existing environment metrics. It takes real cluster data (vCPUs, pCores, VMs, RAM, disk, server config) and produces one or more target cluster proposals — entirely in the browser, with no backend or external integrations.

## Core Value

The sizing math must be correct: given the same inputs, the tool must produce server counts that match what a reference spreadsheet would calculate, with transparent formulas behind every number.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can enter current cluster metrics (VM averages, totals, existing server config) via manual form
- [ ] App auto-calculates derived metrics (vCPU:pCore ratio, VMs/server by CPU and RAM)
- [ ] User can define at least 2 target scenarios with custom server configs and sizing assumptions
- [ ] App calculates required server count per constraint (CPU, RAM, disk) for each scenario
- [ ] App identifies the limiting resource and final server count (max of constraints)
- [ ] App computes per-server utilization and VM density for each scenario
- [ ] App displays side-by-side scenario comparison with key metrics
- [ ] All sizing assumptions ship with sensible industry defaults (e.g., 4:1 vCPU:pCore, 20% headroom)
- [ ] User can copy a plain-text summary suitable for email or slides
- [ ] User can download a JSON/CSV file of all inputs and outputs
- [ ] All form fields have inline validation (non-negative, range checks) with clear error messages
- [ ] Each key output shows the formula and parameters used to derive it
- [ ] User can duplicate a scenario to quickly create a variant

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
