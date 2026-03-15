# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cluster Refresh Sizing Web Application** — a client-side-only static web app for presales engineers to size a refreshed cluster based on existing cluster metrics. No backend, no API; all calculations run in the browser.

## Tech Stack

- **Framework**: React 19 + TypeScript strict (Vite 8 for build)
- **UI**: Tailwind v4 + shadcn/ui (base-ui primitives) + Recharts 2.15 + Sonner (toast)
- **State**: Zustand v5 (5 stores) + localStorage persistence + URL hash sharing
- **Import**: xlsx@0.18.5 (locked MIT — do not upgrade) + jszip
- **Deployment**: GitHub Pages at `/presizion/` — pure static files, no backend
- **Testing**: Vitest + React Testing Library (596 tests)
- **Export**: jsPDF + jspdf-autotable + pptxgenjs (all lazy-loaded)

## Project Structure

```text
src/
  components/
    step1/          # CurrentClusterForm, FileImportButton, ImportPreviewModal, ScopeBadge
    step2/          # ScenarioCard, ScenarioResults
    step3/          # ComparisonTable, SizingChart, CoreCountChart, Step3ReviewExport
    wizard/         # WizardShell, SizingModeToggle, ThemeToggle
    ui/             # shadcn/ui components (button, dialog, tooltip, badge, etc.)
  hooks/            # useScenariosResults (derive-on-read)
  lib/
    sizing/         # formulas.ts, constraints.ts, defaults.ts, display.ts, chartColors.ts
    utils/          # export.ts, clipboard.ts, persistence.ts, downloadChartPng.ts
      import/       # index.ts, liveopticParser.ts, rvtoolsParser.ts, jsonParser.ts,
                    # columnResolver.ts, scopeAggregator.ts, fileValidation.ts
  store/            # useClusterStore, useScenariosStore, useWizardStore, useThemeStore, useImportStore
  schemas/          # Zod schemas (currentCluster, scenario, session)
  types/            # cluster.ts, results.ts
```

## Common Commands

```bash
npm run dev         # Start dev server
npm run build       # Production build (tsc -b && vite build)
npm run test        # Run Vitest tests
npm run lint        # ESLint check
```

## Architecture: Core Data Flow

Three entities drive all calculations:

1. **OldCluster** — current environment metrics (vCPUs, pCores, VMs, RAM, disk, server config)
2. **Scenario** — target server config + sizing assumptions (vCPU:pCore ratio, headroom %, utilization targets)
3. **ScenarioResult** (derived) — server counts per constraint, limiting resource, per-server utilization

All sizing formulas must live in `src/lib/sizing/` — never inline in components. The UI is purely presentational over these pure functions.

## 3-Step Wizard Flow

1. **Enter Current Cluster** — file import (RVTools/LiveOptics) or manual input, scope filtering, derived metrics, SPECrate lookup link
2. **Define Target Scenarios** — scenario cards with server config + sizing assumptions + HA reserve + advanced options (VM override, min servers)
3. **Review & Export** — As-Is vs scenario comparison table, server count chart, constraint breakdown chart, core count chart, CSV/JSON/PNG/URL/Print export

## Key Sizing Logic (4 modes)

- **vCPU mode**: `ceil(totalVcpus × headroom / ratio / coresPerServer)`
- **SPECint mode**: `ceil(existingServers × existingSpecint × headroom / targetSpecint)`
- **Aggressive mode**: `ceil(totalVcpus × cpuUtil% × headroom / coresPerServer)`
- **GHz mode**: `ceil(totalPcores × oldGhz × cpuUtil% × headroom / (coresPerServer × newGhz × targetUtil%))`
- **RAM-limited**: `ceil(effectiveVms × ramUtil% × ramPerVm × headroom / ramPerServer)`
- **Disk-limited**: `ceil(effectiveVms × diskPerVm × headroom / diskPerServer)` (0 in disaggregated mode)
- **Final server count** = `max(cpuLimited, ramLimited, diskLimited) + haReserveCount`
- **Limiting resource** = whichever constraint drove the max (cpu/specint/ghz/ram/disk)

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

<!-- rtk-instructions v2 -->
## RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
| -------- | -------- | --------------- |
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->