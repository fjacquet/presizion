# Presizion — Cluster Refresh Sizing Tool

![Build](https://github.com/fjacquet/cluster-sizer/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-254%2B%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

Presizion is a client-side web application for presales engineers to size a refreshed compute cluster based on existing cluster metrics. Enter your current environment, define target server scenarios, and instantly compare how many servers you need — no backend, no API, all calculations run in the browser.

## Live

> Deploy to GitHub Pages or any static web host — the build output is plain HTML/JS/CSS.

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run test      # run all tests
```

## Features

- **3-step wizard**: enter current cluster → define target scenarios → compare & export
- **Import from file**: paste LiveOptics or RVTools exports (CSV/XLSX) to auto-fill Step 1
- **Side-by-side comparison**: servers required, total pCores, vCPU:pCore ratio, utilization %
- **Overflow warnings**: utilization cells flag `⚠` when a disk-limited scenario pushes CPU/RAM above 100%
- **Multiple sizing modes**: vCPU:pCore ratio or SPECrate2017 Int Base
- **Dark mode**: system-aware with manual toggle
- **Export**: copy table to clipboard or download as CSV/JSON

## Docs

- [User Guide](docs/userguide.md)
- [Product Requirements](docs/prd.md)
- [Architecture Decision Records](docs/adr/)
