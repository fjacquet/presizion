# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cluster Refresh Sizing Web Application** — a client-side-only static web app for presales engineers to size a refreshed cluster based on existing cluster metrics. No backend, no API; all calculations run in the browser.

## Planned Tech Stack

- **Framework**: React + TypeScript (Vite for build)
- **Deployment**: Static files (GitHub Pages or internal web server)
- **State**: In-memory React state + optional localStorage persistence
- **No external dependencies** for calculations — pure client-side logic

## Project Structure (target)

```
src/
  components/       # UI components, co-located with tests and CSS
  hooks/            # Custom hooks (useScenario, useLocalStorage, etc.)
  lib/
    sizing/         # Core sizing formulas — all calculations centralized here
    utils/          # Download, CSV/JSON export helpers
  pages/
    Home/           # Main 3-step wizard
```

## Common Commands (once scaffolded)

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run test        # Run tests
npm run lint        # ESLint check
```

## Architecture: Core Data Flow

Three entities drive all calculations:

1. **OldCluster** — current environment metrics (vCPUs, pCores, VMs, RAM, disk, server config)
2. **Scenario** — target server config + sizing assumptions (vCPU:pCore ratio, headroom %, utilization targets)
3. **ScenarioResult** (derived) — server counts per constraint, limiting resource, per-server utilization

All sizing formulas must live in `src/lib/sizing/` — never inline in components. The UI is purely presentational over these pure functions.

## 3-Step Wizard Flow

1. **Enter Current Cluster** — form inputs + derived metric preview
2. **Define Target Scenarios** — at least 2 scenarios (tabbed/cards), each with server config + assumptions
3. **Review & Export** — side-by-side comparison table + copy/download

## Key Sizing Logic

- **CPU-limited servers** = `ceil((totalVcpus × headroom) / targetVcpuToPCoreRatio / coresPerServer)`
- **RAM-limited servers** = `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)`
- **Disk-limited servers** = `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)`
- **Final server count** = `max(cpuLimited, ramLimited, diskLimited)`
- **Limiting resource** = whichever constraint drove the final count

## Engineering Principles (from constitution)

- **Functional first**: pure functions, no mutation of props/state, immutable updates
- **No `any`** in TypeScript; use `strict: true`
- **Interfaces** for object shapes; **type aliases** for unions/functions
- Components: function components only, one per file, ≤150 lines, single responsibility
- Hooks: `useSomething` naming, only at top level (never inside conditions/loops)
- State: keep as local as possible; lift only when siblings need shared data
- Commit style: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## What to Centralize

- All sizing formulas and constants → `src/lib/sizing/`
- All export logic (CSV, JSON, copy-to-clipboard) → `src/lib/utils/`
- Shared UI patterns → `src/components/common/`
