# Cluster Sizer — Project Overview

## Purpose

Client-side-only static web application for presales engineers to size a refreshed cluster based on existing cluster metrics. Goes from "current cluster stats" to "proposed refreshed cluster" entirely in the browser — no backend, no API, no auth.

## Status

**Greenfield** — only planning docs exist. No source code scaffolded yet.

- `docs/prd.md` — full product requirements document
- `docs/constitution.md` — engineering constitution (coding standards)
- `CLAUDE.md` — Claude Code guidance

## Tech Stack (planned)

- React + TypeScript
- Vite (build tool)
- Static deployment (GitHub Pages or internal server)
- No backend; all state in-memory React + optional localStorage

## Core Domain Entities

1. **OldCluster** — current environment (vCPUs, pCores, VMs, RAM, disk, server config)
2. **Scenario** — target server config + sizing assumptions (vCPU:pCore ratio, headroom %, utilization targets)
3. **ScenarioResult** (derived) — server counts per constraint, limiting resource, utilization

## Key Sizing Formulas

- CPU-limited = `ceil((totalVcpus × headroom) / targetVcpuToPCoreRatio / coresPerServer)`
- RAM-limited = `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)`
- Disk-limited = `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)`
- Final server count = `max(cpu, ram, disk)`
- Limiting resource = constraint that drove the max

## UX Flow (3 steps)

1. Enter Current Cluster (inputs + derived metric preview)
2. Define Target Scenarios (min. 2, side-by-side cards)
3. Review & Export (comparison table + copy/download)
