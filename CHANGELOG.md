# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed

- SPECint metric label corrected to `SPECrate2017_int_base` across all UI labels, tooltips, and formula strings (ADR-005).
- Default target server updated to Dell PowerEdge R660, 2x Intel Xeon Gold 6526Y (32 pCores, `SPECrate2017_int_base` = 337 per spec.org).

---

## [2.0.0] — 2026-03-15

### Added

- vSAN-aware storage sizing: FTT policies (Mirror FTT=1/2/3, RAID-5, RAID-6), raw vs usable storage, metadata overhead, slack space (25% default).
- vSAN CPU overhead (10% default) and memory overhead per host (6 GB default).
- Compression/dedup factor: None, Pessimistic (1.3:1), Conservative (1.5:1), Moderate (2:1), Optimistic (3:1).
- Capacity breakdown tables: Required / Reserved / HA Reserve / Spare / Excess / Total for CPU, Memory, Storage.
- Stacked horizontal capacity bar charts (normalized to 100%, per-segment percentage labels).
- Min-nodes-per-constraint horizontal bar chart with binding constraint highlight.
- Growth projections per resource (CPU %, Memory %, Storage %) with compound pre-multiplication.
- Collapsible "vSAN & Growth" section in ScenarioCard (HCI mode only for vSAN, always for growth).
- VM swap overhead toggle (default OFF, sparse swap assumed).
- PDF report export (jsPDF + jspdf-autotable, lazy-loaded).
- PPTX presentation export (pptxgenjs, lazy-loaded).
- PNG download includes legend + absolute values table below chart.

---

## [1.4.0] — 2026-03-14

### Fixed

- LiveOptics import: ESX host config (RAM/server, sockets, cores) now scoped per cluster (was reading global first host).
- ImportPreviewModal reads scope-filtered data instead of global result.
- VM override: RAM/Disk formula display shows overridden VM count.
- Chart redesigned: Server Count Comparison with As-Is bar + Constraint Breakdown (split from single confusing chart).

### Added

- SPECrate lookup link: copies CPU model number to clipboard, opens SPEC advanced query form.
- SPECrate auto-derive: socket/core fields read-only in SPECrate mode when import metadata available.
- Reset button with confirmation dialog (clears all stores + localStorage, preserves theme).
- Chart legends, data labels on bars, professional CHART_COLORS palette.
- CoreCountChart PNG download.
- CPU Description column alias for LiveOptics ESX Hosts.

---

## [1.3.0] — 2026-03-14

### Added

- Presizion branding: SVG wordmark logo + custom favicon.
- Manual light/dark/system theme toggle with localStorage persistence.
- Multi-cluster import scope filter: detect clusters/datacenters, select subset before populating form.
- Persistent scope badge in Step 1 with live re-aggregation on scope change.
- localStorage session auto-restore on page load.
- Shareable URL hash encoding (base64url) for full session state.
- RAM formula display shows utilization factor when applicable.

---

## [1.2.0] — 2026-03-13

### Added

- **File import** — single "Import from file" button accepts four formats:
  - **RVTools xlsx** — extracts vCPU, VM count, disk totals from the `vInfo` sheet.
  - **LiveOptics xlsx** — extracts VM inventory (VMs sheet) + server configuration (ESX Hosts sheet) + average CPU/RAM utilization (ESX Performance sheet).
  - **LiveOptics ZIP** — intelligently selects the richest xlsx inside the archive (VMWARE file preferred over GENERAL; AIR files skipped).
  - **Presizion JSON** — full session restore: re-imports a previously exported Presizion JSON file, restoring both current cluster data and all scenario configurations.
- **Import preview modal** — shows extracted data for user review before applying; warns when pCores could not be derived.
- **Lazy IT seeding** — after any non-JSON import, all existing scenarios automatically inherit `ramPerVmGb` and `diskPerVmGb` derived from the imported cluster. New scenarios added after import also pre-fill these values.
- **Server config fields in Step 1** — `existingServerCount`, `socketsPerServer`, `coresPerSocket`, `ramPerServerGb` are now populated from LiveOptics ESX Hosts sheet and surfaced in the form.
- **Auto-derive totalPcores** — when `existingServerCount`, `socketsPerServer`, and `coresPerSocket` are all provided (manually or via import), `totalPcores` is automatically calculated.
- **Error boundary + loading skeleton** — prevents blank white page on unexpected render errors; provides visual feedback during initial app hydration.

### Fixed

- `form.watch()` polling caused infinite re-render loop (React error #185); replaced with `form.watch(callback)` subscription pattern.
- Store→form sync in `CurrentClusterForm` now includes all new server config fields and `specintPerServer`, so JSON session import correctly restores all fields.

---

## [1.1.0] — 2026-03-13

### Added

- **SPECrate2017 sizing mode** — global toggle between vCPU-ratio and `SPECrate2017_int_base`-based sizing. In SPECrate mode, the CPU constraint uses:
  `ceil(existingServers × oldScore × headroomFactor / targetScore)`
  Default target score: 337 (Dell R660, 2× Xeon Gold 6526Y).
- **Observed utilization inputs** — optional CPU % and RAM % fields in Step 1 scale effective demand to actual consumption rather than installed capacity, enabling right-sizing (ADR-004).
  Formula with utilization: `ceil(totalVcpus × utilPct% × headroom% / ratio / cores)`.
- **JSON download** — exports all inputs, scenario configs, and outputs as a pretty-printed JSON file (EXPO-03). Can be re-imported as a session restore (v1.2).
- **Print / PDF layout** — `@media print` stylesheet hides wizard chrome; Step 3 comparison table renders cleanly on A4/Letter paper. Use browser Print → Save as PDF (EXPO-04).
- **As-Is reference column** — Step 3 comparison table includes the existing cluster as a baseline column showing servers, server config, total pCores, and current vCPU:pCore ratio (REPT-01).
- **Formula display** — each constraint in Step 2 results shows the exact formula and input values used, so users can validate the math (CALC-07).
- **Clipboard feedback** — Copy Summary button shows "Copied!" confirmation for 2 seconds (UX-05).

### Changed

- `existingServerCount` is always shown in Step 1 (was previously only shown in SPECrate mode).
- `totalPcores` can now be left at 0 and will be auto-derived from server count × sockets × cores when the server config fields are filled.

---

## [1.0.0] — 2026-03-12

### Added

- **3-step wizard** — Enter Current Cluster → Define Target Scenarios → Review & Export.
- **Step 1: Current cluster form** — input fields for total vCPUs, total pCores, total VMs, total disk, and optional server configuration. Live derived metrics panel shows vCPU:pCore ratio, VMs/server estimates.
- **Step 2: Scenario cards** — tabbed cards, each with target server config (sockets, cores/socket, RAM, disk) and sizing assumptions (vCPU:pCore ratio, RAM/VM, disk/VM, headroom %, N+1 HA reserve). Results panel updates live.
- **Step 3: Comparison table** — side-by-side table comparing server count, server config, total pCores, limiting resource, vCPU:pCore ratio, VMs/server, headroom, CPU/RAM/disk utilization across all scenarios.
- **Core sizing formulas** (centralized in `src/lib/sizing/`):
  - CPU-limited: `ceil((totalVcpus × headroom) / vcpuToPcoreRatio / coresPerServer)`
  - RAM-limited: `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)`
  - Disk-limited: `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)`
  - Final count = max(CPU, RAM, disk). Limiting resource identified.
- **N+1 HA reserve** — optional per-scenario toggle adds one server to the final count.
- **Scenario management** — add, duplicate, rename, and remove scenarios. Minimum of one scenario always present.
- **Export** — Copy Summary (Markdown text to clipboard) and CSV download.
- **Dark mode** — respects OS preference; anti-flash inline script prevents white flash on load (ADR-003).
- **Inline tooltips** — info icons on all fields in Steps 1 and 2, explaining each value and typical ranges.
- **GitHub Actions deployment** — static build deploys to GitHub Pages at `/presizion/`.
- **254 unit tests** covering formulas, components, hooks, and stores.
